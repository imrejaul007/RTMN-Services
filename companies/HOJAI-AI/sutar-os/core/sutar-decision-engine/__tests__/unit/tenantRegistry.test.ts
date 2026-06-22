/**
 * SUTAR Decision Engine - Tenant Registry Unit Tests (ADR-0009 Phase 1)
 *
 * Covers:
 *   - Lazy creation of DecisionEngine per companyId
 *   - Separate stats counters per tenant
 *   - list() / totals() admin surface
 *   - resetTenant / resetAll
 *   - 'default' bucket for no-tenant requests
 *   - Repeated for() returns the same engine instance for same tenant
 *   - Different tenants get different engine instances
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TenantDecisionRegistry } from '../../src/services/tenantRegistry.js';
import { DecisionOutcome, DecisionType, type DecisionContext } from '../../src/types/index.js';

describe('TenantDecisionRegistry', () => {
  let registry: TenantDecisionRegistry;

  beforeEach(() => {
    registry = new TenantDecisionRegistry();
  });

  it('lazily creates a DecisionEngine for a new companyId', () => {
    expect(registry.size()).toBe(0);
    const entry = registry.for('BIZ_ACME');
    expect(entry.engine).toBeDefined();
    expect(entry.requestCount).toBe(1);
    expect(registry.size()).toBe(1);
  });

  it('returns the same engine instance for the same companyId', () => {
    const e1 = registry.for('BIZ_ACME');
    const e2 = registry.for('BIZ_ACME');
    expect(e1.engine).toBe(e2.engine);
    expect(e2.requestCount).toBe(2); // increments per call
  });

  it('returns different engine instances for different tenants', () => {
    const a = registry.for('BIZ_ACME');
    const b = registry.for('BIZ_BETA');
    expect(a.engine).not.toBe(b.engine);
    expect(registry.size()).toBe(2);
  });

  it('tracks per-tenant request counts independently', () => {
    registry.for('BIZ_ACME');
    registry.for('BIZ_ACME');
    registry.for('BIZ_ACME');
    registry.for('BIZ_BETA');

    const all = registry.list();
    const acme = all.find(t => t.companyId === 'BIZ_ACME')!;
    const beta = all.find(t => t.companyId === 'BIZ_BETA')!;
    expect(acme.requestCount).toBe(3);
    expect(beta.requestCount).toBe(1);
  });

  it('isolates stats counters per tenant', async () => {
    const vipCtx: DecisionContext = {
      decisionType: DecisionType.OFFER,
      customerTier: 'vip',
      riskScore: 5,
      amount: 50,
      accountAge: 365,
    };

    const acme = registry.for('BIZ_ACME').engine;
    const beta = registry.for('BIZ_BETA').engine;

    await acme.makeDecision({ context: vipCtx });
    await acme.makeDecision({ context: vipCtx });
    await acme.makeDecision({ context: vipCtx });
    await beta.makeDecision({ context: vipCtx });

    expect(acme.getStats().totalDecisions).toBe(3);
    expect(beta.getStats().totalDecisions).toBe(1);
  });

  it('falls back to "default" bucket when companyId is empty', () => {
    const e1 = registry.for('');
    const e2 = registry.for('default');
    // Both empty and 'default' map to the same bucket
    expect(e1.engine).toBe(e2.engine);
  });

  it('list() returns a snapshot of all tenants', () => {
    registry.for('BIZ_ACME');
    registry.for('BIZ_BETA');
    const list = registry.list();
    expect(list).toHaveLength(2);
    expect(list.map(t => t.companyId).sort()).toEqual(['BIZ_ACME', 'BIZ_BETA']);
    for (const t of list) {
      expect(t.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(t.lastUsedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it('totals() returns aggregate counts', () => {
    registry.for('A');
    registry.for('A');
    registry.for('B');
    const t = registry.totals();
    expect(t.tenantCount).toBe(2);
    expect(t.totalRequestCount).toBe(3);
  });

  it('resetTenant removes a single tenant', () => {
    registry.for('A');
    registry.for('B');
    expect(registry.resetTenant('A')).toBe(true);
    expect(registry.size()).toBe(1);
    expect(registry.list()[0].companyId).toBe('B');
  });

  it('resetTenant returns false for unknown tenant', () => {
    expect(registry.resetTenant('NONEXISTENT')).toBe(false);
  });

  it('resetAll clears every tenant', () => {
    registry.for('A');
    registry.for('B');
    registry.for('C');
    const n = registry.resetAll();
    expect(n).toBe(3);
    expect(registry.size()).toBe(0);
  });

  it('updates lastUsedAt on each access', async () => {
    const e1 = registry.for('A');
    const firstUsedAt = e1.lastUsedAt;
    // wait a few ms
    await new Promise(r => setTimeout(r, 5));
    const e2 = registry.for('A');
    expect(new Date(e2.lastUsedAt).getTime()).toBeGreaterThanOrEqual(new Date(firstUsedAt).getTime());
  });

  it('a reset tenant re-creates the engine from scratch (stats start at 0)', async () => {
    const vipCtx: DecisionContext = {
      decisionType: DecisionType.OFFER,
      customerTier: 'vip',
      riskScore: 5,
      amount: 50,
      accountAge: 365,
    };
    const entry = registry.for('A');
    await entry.engine.makeDecision({ context: vipCtx });
    expect(entry.engine.getStats().totalDecisions).toBe(1);

    registry.resetTenant('A');
    const fresh = registry.for('A');
    expect(fresh.engine.getStats().totalDecisions).toBe(0);
    expect(fresh.requestCount).toBe(1);
  });
});