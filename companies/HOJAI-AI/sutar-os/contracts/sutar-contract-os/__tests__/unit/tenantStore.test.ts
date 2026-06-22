// ============================================================================
// SUTAR Contract OS - Tenant Store Tests (ADR-0009 Phase 1)
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { TenantBucket, TenantRouter, resolveTenant } from '../../src/services/tenantStore.js';
import type { Request } from 'express';

function fakeReq(companyId?: string): Partial<Request> {
  if (!companyId) return {};
  return { tenant: { companyId, source: 'jwt' } } as any;
}

describe('Contract OS — TenantBucket', () => {
  let bucket: TenantBucket<any>;

  beforeEach(() => {
    bucket = new TenantBucket<any>();
  });

  it('creates a new bucket on first access for a tenant', () => {
    const b = bucket.for(fakeReq('acme') as Request);
    expect(b).toBeInstanceOf(Map);
    expect(b.size).toBe(0);
  });

  it('returns the same bucket for repeated requests from same tenant', () => {
    const b1 = bucket.for(fakeReq('acme') as Request);
    b1.set('c1', { id: 'c1' });
    const b2 = bucket.for(fakeReq('acme') as Request);
    expect(b2).toBe(b1);
    expect(b2.size).toBe(1);
  });

  it('isolates data between tenants', () => {
    const a = bucket.for(fakeReq('acme') as Request);
    const b = bucket.for(fakeReq('beta') as Request);
    a.set('shared-id', 'A-data');
    b.set('shared-id', 'B-data');
    expect(a.get('shared-id')).toBe('A-data');
    expect(b.get('shared-id')).toBe('B-data');
  });

  it('falls back to default tenant when no tenant on req', () => {
    const b = bucket.for({} as Request);
    b.set('x', 1);
    expect(bucket.for(fakeReq('default') as Request).get('x')).toBe(1);
    expect(bucket.for(undefined as any).get('x')).toBe(1);
  });

  it('list() returns values from the tenant bucket only', () => {
    bucket.for(fakeReq('acme') as Request).set('a', { v: 1 });
    bucket.for(fakeReq('acme') as Request).set('b', { v: 2 });
    bucket.for(fakeReq('beta') as Request).set('c', { v: 3 });
    expect(bucket.list(fakeReq('acme') as Request)).toHaveLength(2);
    expect(bucket.list(fakeReq('beta') as Request)).toHaveLength(1);
  });

  it('clear() removes only the calling tenant bucket', () => {
    bucket.for(fakeReq('acme') as Request).set('a', 1);
    bucket.for(fakeReq('beta') as Request).set('b', 2);
    bucket.clear(fakeReq('acme') as Request);
    expect(bucket.for(fakeReq('acme') as Request).size).toBe(0);
    expect(bucket.for(fakeReq('beta') as Request).size).toBe(1);
  });

  it('resetTenant() removes a tenant bucket', () => {
    bucket.for(fakeReq('acme') as Request).set('a', 1);
    expect(bucket.resetTenant(fakeReq('acme') as Request)).toBe(true);
    expect(bucket.resetTenant(fakeReq('acme') as Request)).toBe(false);
  });

  it('resetAll() removes every tenant bucket', () => {
    bucket.for(fakeReq('acme') as Request).set('a', 1);
    bucket.for(fakeReq('beta') as Request).set('b', 2);
    bucket.for(fakeReq('gamma') as Request).set('c', 3);
    const n = bucket.resetAll();
    expect(n).toBe(3);
    expect(bucket.totals().tenantCount).toBe(0);
  });

  it('totals() reports tenantCount and totalEntries', () => {
    bucket.for(fakeReq('acme') as Request).set('a', 1);
    bucket.for(fakeReq('acme') as Request).set('b', 2);
    bucket.for(fakeReq('beta') as Request).set('c', 3);
    const t = bucket.totals();
    expect(t.tenantCount).toBe(2);
    expect(t.totalEntries).toBe(3);
  });

  it('listTenants() reports per-tenant sizes', () => {
    bucket.for(fakeReq('acme') as Request).set('a', 1);
    bucket.for(fakeReq('beta') as Request).set('b', 2);
    bucket.for(fakeReq('beta') as Request).set('c', 3);
    const tenants = bucket.listTenants();
    const acme = tenants.find(t => t.companyId === 'acme');
    const beta = tenants.find(t => t.companyId === 'beta');
    expect(acme?.size).toBe(1);
    expect(beta?.size).toBe(2);
  });
});

describe('Contract OS — TenantRouter', () => {
  let router: TenantRouter;

  beforeEach(() => {
    router = new TenantRouter();
  });

  it('exposes contracts and templates buckets', () => {
    expect(router.contracts).toBeInstanceOf(TenantBucket);
    expect(router.templates).toBeInstanceOf(TenantBucket);
  });

  it('isolates contracts and templates independently', () => {
    const req = fakeReq('acme') as Request;
    router.contracts.for(req).set('c1', { name: 'contract-1' });
    router.templates.for(req).set('t1', { name: 'template-1' });
    expect(router.contracts.for(req).size).toBe(1);
    expect(router.templates.for(req).size).toBe(1);
  });

  it('resetTenant() resets both contracts and templates for the tenant', () => {
    const req = fakeReq('acme') as Request;
    router.contracts.for(req).set('c1', 1);
    router.templates.for(req).set('t1', 1);
    router.resetTenant(req);
    expect(router.contracts.for(req).size).toBe(0);
    expect(router.templates.for(req).size).toBe(0);
  });

  it('resetAll() returns the total number of tenant buckets cleared', () => {
    router.contracts.for(fakeReq('a') as Request).set('x', 1);
    router.templates.for(fakeReq('b') as Request).set('y', 1);
    const n = router.resetAll();
    expect(n).toBe(2);
  });

  it('totals() aggregates across both buckets', () => {
    router.contracts.for(fakeReq('a') as Request).set('x', 1);
    router.contracts.for(fakeReq('a') as Request).set('y', 2);
    router.templates.for(fakeReq('b') as Request).set('z', 1);
    const t = router.totals();
    expect(t.tenantCount).toBe(2);
    expect(t.totalEntries).toBe(3);
  });
});

describe('Contract OS — resolveTenant', () => {
  it('returns the tenant companyId from the request', () => {
    expect(resolveTenant(fakeReq('acme') as Request)).toBe('acme');
  });

  it('returns "default" when no tenant', () => {
    expect(resolveTenant({} as Request)).toBe('default');
  });
});