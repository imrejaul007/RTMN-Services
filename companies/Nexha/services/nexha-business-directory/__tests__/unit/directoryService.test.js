/**
 * Directory service tests — covers company + agent CRUD,
 * capability search, trust linkage, and tenant isolation.
 *
 * Uses mongodb-memory-server (no real MongoDB required).
 */

import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { connectTestDb, disconnectTestDb, clearTestDb } from '../helpers/db.js';
import * as svc from '../../src/services/directoryService.js';

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

// ─────────────────────────────────────────────────────────────────
// Companies
// ─────────────────────────────────────────────────────────────────

describe('registerCompany', () => {
  it('creates a company with the given fields', async () => {
    const co = await svc.registerCompany({
      tenantId: 't-1',
      name: 'Acme',
      capabilities: ['logistics', 'wholesale'],
      contact: { email: 'ops@acme.example' },
    });
    expect(co.companyId).toMatch(/^co-/);
    expect(co.tenantId).toBe('t-1');
    expect(co.name).toBe('Acme');
    expect(co.capabilities).toEqual(['logistics', 'wholesale']);
    expect(co.status).toBe('ACTIVE');
    expect(co.contact.email).toBe('ops@acme.example');
  });

  it('is idempotent on (tenantId, name) — re-posting updates', async () => {
    const a = await svc.registerCompany({ tenantId: 't-1', name: 'Acme', capabilities: ['a'] });
    const b = await svc.registerCompany({
      tenantId: 't-1',
      name: 'Acme',
      capabilities: ['a', 'b', 'c'],
      description: 'now bigger',
    });
    expect(b.companyId).toBe(a.companyId);
    expect(b.capabilities).toEqual(['a', 'b', 'c']);
    expect(b.description).toBe('now bigger');
  });

  it('keeps separate records for different tenants with the same name', async () => {
    const a = await svc.registerCompany({ tenantId: 't-1', name: 'Acme' });
    const b = await svc.registerCompany({ tenantId: 't-2', name: 'Acme' });
    expect(a.companyId).not.toBe(b.companyId);
  });

  it('rejects missing tenantId', async () => {
    await expect(svc.registerCompany({ name: 'Acme' })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('rejects missing name', async () => {
    await expect(svc.registerCompany({ tenantId: 't-1' })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('normalises capabilities (trim, lowercase, dedupe, max 50)', async () => {
    const co = await svc.registerCompany({
      tenantId: 't-1',
      name: 'Acme',
      capabilities: ['  Logistics ', 'LOGISTICS', 'wholesale', ...Array.from({ length: 60 }, (_, i) => `cap-${i}`)],
    });
    // First two collapse to one. 60 fresh caps + 'wholesale' = 61 raw → capped at 50.
    expect(co.capabilities.length).toBeLessThanOrEqual(50);
    expect(co.capabilities).toContain('logistics');
    expect(co.capabilities).toContain('wholesale');
  });
});

describe('getCompany / updateCompany / deleteCompany', () => {
  it('returns the company by id', async () => {
    const co = await svc.registerCompany({ tenantId: 't-1', name: 'Acme' });
    const found = await svc.getCompany(co.companyId);
    expect(found?.companyId).toBe(co.companyId);
  });

  it('returns null for missing ids', async () => {
    expect(await svc.getCompany('co-missing')).toBeNull();
    expect(await svc.getCompany('')).toBeNull();
    expect(await svc.getCompany(null)).toBeNull();
  });

  it('updates allowed fields', async () => {
    const co = await svc.registerCompany({ tenantId: 't-1', name: 'Acme' });
    const updated = await svc.updateCompany(co.companyId, 't-1', {
      description: 'updated',
      verificationLevel: 2,
      trustEntityId: 'tr-99',
    });
    expect(updated.description).toBe('updated');
    expect(updated.verificationLevel).toBe(2);
    expect(updated.trustEntityId).toBe('tr-99');
  });

  it('updates ignore unrecognised fields', async () => {
    const co = await svc.registerCompany({ tenantId: 't-1', name: 'Acme' });
    const updated = await svc.updateCompany(co.companyId, 't-1', {
      companyId: 'INJECTED', // should be ignored
      notAField: 'whatever',
      description: 'ok',
    });
    expect(updated.companyId).toBe(co.companyId);
    expect(updated.notAField).toBeUndefined();
    expect(updated.description).toBe('ok');
  });

  it('update refuses cross-tenant access', async () => {
    const co = await svc.registerCompany({ tenantId: 't-1', name: 'Acme' });
    const updated = await svc.updateCompany(co.companyId, 't-2', { description: 'hijack' });
    expect(updated).toBeNull();
    const stillThere = await svc.getCompany(co.companyId);
    expect(stillThere.description).toBeNull();
  });

  it('delete cascades to agents and is tenant-scoped', async () => {
    const co = await svc.registerCompany({ tenantId: 't-1', name: 'Acme' });
    await svc.registerAgent(co.companyId, { tenantId: 't-1', agentId: 'a-1' });
    await svc.registerAgent(co.companyId, { tenantId: 't-1', agentId: 'a-2' });
    const wrong = await svc.deleteCompany(co.companyId, 't-2');
    expect(wrong).toBe(false);
    const ok = await svc.deleteCompany(co.companyId, 't-1');
    expect(ok).toBe(true);
    expect(await svc.getCompany(co.companyId)).toBeNull();
    expect(await svc.listCompanyAgents(co.companyId)).toMatchObject({ total: 0 });
  });
});

// ─────────────────────────────────────────────────────────────────
// Agents
// ─────────────────────────────────────────────────────────────────

describe('registerAgent', () => {
  it('registers an agent under an existing company', async () => {
    const co = await svc.registerCompany({ tenantId: 't-1', name: 'Acme' });
    const ag = await svc.registerAgent(co.companyId, {
      tenantId: 't-1',
      agentId: 'a-1',
      type: 'AGENT',
      capabilities: ['negotiate'],
    });
    expect(ag.agentId).toBe('a-1');
    expect(ag.companyId).toBe(co.companyId);
    expect(ag.tenantId).toBe('t-1');
    expect(ag.capabilities).toEqual(['negotiate']);
  });

  it('is idempotent on agentId', async () => {
    const co = await svc.registerCompany({ tenantId: 't-1', name: 'Acme' });
    const a = await svc.registerAgent(co.companyId, { tenantId: 't-1', agentId: 'a-1', capabilities: ['x'] });
    const b = await svc.registerAgent(co.companyId, { tenantId: 't-1', agentId: 'a-1', capabilities: ['x', 'y'] });
    expect(b.agentId).toBe(a.agentId);
    expect(b.capabilities).toEqual(['x', 'y']);
  });

  it('rejects when the parent company does not exist', async () => {
    await expect(
      svc.registerAgent('co-missing', { tenantId: 't-1', agentId: 'a-1' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects tenantId mismatch with parent company', async () => {
    const co = await svc.registerCompany({ tenantId: 't-1', name: 'Acme' });
    await expect(
      svc.registerAgent(co.companyId, { tenantId: 't-2', agentId: 'a-1' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('maintains denormalised agentCount on the company', async () => {
    const co = await svc.registerCompany({ tenantId: 't-1', name: 'Acme' });
    await svc.registerAgent(co.companyId, { tenantId: 't-1', agentId: 'a-1' });
    await svc.registerAgent(co.companyId, { tenantId: 't-1', agentId: 'a-2' });
    const refreshed = await svc.getCompany(co.companyId);
    expect(refreshed.agentCount).toBe(2);
  });

  it('defaults type to AGENT and rejects invalid types', async () => {
    const co = await svc.registerCompany({ tenantId: 't-1', name: 'Acme' });
    const ag = await svc.registerAgent(co.companyId, { tenantId: 't-1', agentId: 'a-1', type: 'INVALID' });
    expect(ag.type).toBe('AGENT');
  });

  it('accepts the supported agent types', async () => {
    const co = await svc.registerCompany({ tenantId: 't-1', name: 'Acme' });
    for (const t of ['AGENT', 'HUMAN', 'HYBRID', 'SERVICE']) {
      const ag = await svc.registerAgent(co.companyId, {
        tenantId: 't-1', agentId: `a-${t}`, type: t,
      });
      expect(ag.type).toBe(t);
    }
  });
});

describe('listCompanyAgents / listAgents', () => {
  it('lists agents scoped to one company', async () => {
    const co1 = await svc.registerCompany({ tenantId: 't-1', name: 'Acme' });
    const co2 = await svc.registerCompany({ tenantId: 't-1', name: 'Globex' });
    await svc.registerAgent(co1.companyId, { tenantId: 't-1', agentId: 'a-1' });
    await svc.registerAgent(co1.companyId, { tenantId: 't-1', agentId: 'a-2' });
    await svc.registerAgent(co2.companyId, { tenantId: 't-1', agentId: 'a-3' });
    const out = await svc.listCompanyAgents(co1.companyId);
    expect(out.total).toBe(2);
    expect(out.items.map((a) => a.agentId).sort()).toEqual(['a-1', 'a-2']);
  });

  it('caps limit at 200, defaults to 50', async () => {
    const co = await svc.registerCompany({ tenantId: 't-1', name: 'Acme' });
    for (let i = 0; i < 5; i++) {
      await svc.registerAgent(co.companyId, { tenantId: 't-1', agentId: `a-${i}` });
    }
    const capped = await svc.listCompanyAgents(co.companyId, { limit: 9999 });
    expect(capped.items.length).toBeLessThanOrEqual(200);
    const defaultLimit = await svc.listCompanyAgents(co.companyId);
    expect(defaultLimit.limit).toBe(50);
  });

  it('listAgents filters by capability', async () => {
    const co = await svc.registerCompany({ tenantId: 't-1', name: 'Acme' });
    await svc.registerAgent(co.companyId, {
      tenantId: 't-1', agentId: 'a-1', capabilities: ['negotiate'],
    });
    await svc.registerAgent(co.companyId, {
      tenantId: 't-1', agentId: 'a-2', capabilities: ['invoice'],
    });
    const out = await svc.listAgents({ tenantId: 't-1', capability: 'negotiate' });
    expect(out.items.map((a) => a.agentId)).toEqual(['a-1']);
  });
});

// ─────────────────────────────────────────────────────────────────
// Search & linkage
// ─────────────────────────────────────────────────────────────────

describe('searchCapabilities', () => {
  it('finds companies by capability', async () => {
    await svc.registerCompany({ tenantId: 't-1', name: 'Acme', capabilities: ['logistics'] });
    await svc.registerCompany({ tenantId: 't-1', name: 'Globex', capabilities: ['wholesale'] });
    await svc.registerCompany({ tenantId: 't-1', name: 'Initech', capabilities: ['logistics', 'import'] });
    const out = await svc.searchCapabilities({ capabilities: ['logistics'] });
    expect(out.total).toBe(2);
    expect(out.items.map((c) => c.name).sort()).toEqual(['Acme', 'Initech']);
  });

  it('combines capability + free-text query', async () => {
    await svc.registerCompany({
      tenantId: 't-1', name: 'Acme Logistics', capabilities: ['logistics'],
      description: 'fast delivery',
    });
    await svc.registerCompany({
      tenantId: 't-1', name: 'Globex', capabilities: ['logistics'],
      description: 'wholesale supplier',
    });
    const out = await svc.searchCapabilities({
      capabilities: ['logistics'],
      q: 'fast',
    });
    expect(out.total).toBe(1);
    expect(out.items[0].name).toBe('Acme Logistics');
  });

  it('excludes SUSPENDED companies', async () => {
    await svc.registerCompany({ tenantId: 't-1', name: 'Acme', capabilities: ['logistics'], status: 'SUSPENDED' });
    const out = await svc.searchCapabilities({ capabilities: ['logistics'] });
    expect(out.total).toBe(0);
  });

  it('caps limit at 100', async () => {
    const out = await svc.searchCapabilities({ capabilities: ['x'], limit: 9999 });
    expect(out.limit).toBe(100);
  });

  it('returns empty when no companies match', async () => {
    const out = await svc.searchCapabilities({ capabilities: ['unknown'] });
    expect(out.total).toBe(0);
    expect(out.items).toEqual([]);
  });
});

describe('getTrustLinkage', () => {
  it('returns linkage for the requested ids', async () => {
    const a = await svc.registerCompany({ tenantId: 't-1', name: 'Acme', trustEntityId: 'tr-1' });
    const b = await svc.registerCompany({ tenantId: 't-1', name: 'Globex', trustEntityId: null });
    const out = await svc.getTrustLinkage([a.companyId, b.companyId, 'co-missing']);
    expect(out[a.companyId]).toEqual({ trustEntityId: 'tr-1', verificationLevel: 0 });
    expect(out[b.companyId]).toEqual({ trustEntityId: null, verificationLevel: 0 });
    expect(out['co-missing']).toBeUndefined();
  });

  it('handles empty input', async () => {
    expect(await svc.getTrustLinkage([])).toEqual({});
    expect(await svc.getTrustLinkage(null)).toEqual({});
  });

  it('caps at 200 ids', async () => {
    const ids = Array.from({ length: 300 }, (_, i) => `co-${i}`);
    const out = await svc.getTrustLinkage(ids);
    expect(Object.keys(out).length).toBe(0); // none exist
  });
});

// ─────────────────────────────────────────────────────────────────
// Tenant isolation (cross-company)
// ─────────────────────────────────────────────────────────────────

describe('tenant isolation', () => {
  it('two tenants can hold companies with the same name', async () => {
    const a = await svc.registerCompany({ tenantId: 't-1', name: 'Acme' });
    const b = await svc.registerCompany({ tenantId: 't-2', name: 'Acme' });
    expect(a.companyId).not.toBe(b.companyId);
    const out = await svc.listCompanies({ tenantId: 't-1' });
    expect(out.items.map((c) => c.name)).toEqual(['Acme']);
    const out2 = await svc.listCompanies({ tenantId: 't-2' });
    expect(out2.items.map((c) => c.name)).toEqual(['Acme']);
  });

  it('update on the wrong tenant returns null', async () => {
    const co = await svc.registerCompany({ tenantId: 't-1', name: 'Acme' });
    expect(await svc.updateCompany(co.companyId, 't-2', { description: 'no' })).toBeNull();
    const still = await svc.getCompany(co.companyId);
    expect(still.description).toBeNull();
  });
});
