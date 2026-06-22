/**
 * SUTAR Trust Engine - Tenant Store Unit Tests (ADR-0009 Phase 1)
 *
 * Covers the per-tenant Map bucket  layer:
 *   - for(req) returns the bucket for the tenant on req
 *   - Two tenants get isolated buckets
 *   - 'default' bucket for no-tenant requests
 *   - list() returns all values in the tenant's bucket
 *   - clear() / resetTenant / resetAll
 *   - totals() aggregates across tenants
 *   - TenantRouter combines multiple typed buckets
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Request } from 'express';
import { TenantBucket, TenantRouter, tenantStores, resolveTenant } from '../../src/services/tenantStore.js';

function mockReq(companyId?: string): Request {
  return { tenant: companyId ? { companyId, source: 'test' } : undefined } as any;
}

describe('TenantBucket', () => {
  let bucket: TenantBucket<{ v: number }>;

  beforeEach(() => {
    bucket = new TenantBucket<{ v: number }>();
  });

  it('returns the same bucket for repeated calls with the same tenant', () => {
    const r = mockReq('BIZ_ACME');
    const b1 = bucket.for(r);
    const b2 = bucket.for(r);
    expect(b1).toBe(b2);
  });

  it('returns different buckets for different tenants', () => {
    const b1 = bucket.for(mockReq('BIZ_ACME'));
    const b2 = bucket.for(mockReq('BIZ_BETA'));
    expect(b1).not.toBe(b2);
  });

  it('falls back to "default" bucket when no tenant', () => {
    const b1 = bucket.for(mockReq());
    const b2 = bucket.for(mockReq('default'));
    expect(b1).toBe(b2);
  });

  it('list() returns all values in the tenant bucket', () => {
    const r = mockReq('A');
    const m = bucket.for(r);
    m.set('x', { v: 1 });
    m.set('y', { v: 2 });
    expect(bucket.list(r)).toEqual([{ v: 1 }, { v: 2 }]);
  });

  it('resetTenant clears only that tenant', () => {
    bucket.for(mockReq('A')).set('x', { v: 1 });
    bucket.for(mockReq('B')).set('y', { v: 2 });
    expect(bucket.resetTenant(mockReq('A'))).toBe(true);
    expect(bucket.list(mockReq('A'))).toEqual([]);
    expect(bucket.list(mockReq('B'))).toEqual([{ v: 2 }]);
  });

  it('resetAll clears every tenant', () => {
    bucket.for(mockReq('A')).set('x', { v: 1 });
    bucket.for(mockReq('B')).set('y', { v: 2 });
    expect(bucket.resetAll()).toBe(2);
    expect(bucket.list(mockReq('A'))).toEqual([]);
    expect(bucket.list(mockReq('B'))).toEqual([]);
  });

  it('totals returns aggregate counts', () => {
    bucket.for(mockReq('A')).set('x', { v: 1 });
    bucket.for(mockReq('A')).set('y', { v: 2 });
    bucket.for(mockReq('B')).set('z', { v: 3 });
    const t = bucket.totals();
    expect(t.tenantCount).toBe(2);
    expect(t.totalEntries).toBe(3);
  });

  it('listTenants returns one row per known tenant', () => {
    bucket.for(mockReq('A')).set('x', { v: 1 });
    bucket.for(mockReq('B')).set('y', { v: 2 });
    bucket.for(mockReq('B')).set('z', { v: 3 });
    const list = bucket.listTenants();
    expect(list).toHaveLength(2);
    const a = list.find(t => t.companyId === 'A');
    const b = list.find(t => t.companyId === 'B');
    expect(a?.size).toBe(1);
    expect(b?.size).toBe(2);
  });
});

describe('TenantRouter', () => {
  let router: TenantRouter;

  beforeEach(() => {
    router = new TenantRouter();
  });

  it('exposes six typed buckets', () => {
    expect(router.trustScore).toBeInstanceOf(TenantBucket);
    expect(router.reputation).toBeInstanceOf(TenantBucket);
    expect(router.creditScore).toBeInstanceOf(TenantBucket);
    expect(router.creditReport).toBeInstanceOf(TenantBucket);
    expect(router.verification).toBeInstanceOf(TenantBucket);
    expect(router.verificationKyc).toBeInstanceOf(TenantBucket);
  });

  it('resetAll clears every typed bucket', () => {
    router.trustScore.for(mockReq('A')).set('x', {});
    router.reputation.for(mockReq('B')).set('y', {});
    router.creditScore.for(mockReq('C')).set('z', {});
    const n = router.resetAll();
    expect(n).toBe(3);
    expect(router.trustScore.list(mockReq('A'))).toEqual([]);
    expect(router.reputation.list(mockReq('B'))).toEqual([]);
    expect(router.creditScore.list(mockReq('C'))).toEqual([]);
  });

  it('resetTenant clears every typed bucket for that tenant only', () => {
    router.trustScore.for(mockReq('A')).set('x', {});
    router.reputation.for(mockReq('A')).set('y', {});
    router.trustScore.for(mockReq('B')).set('z', {});
    const changed = router.resetTenant(mockReq('A'));
    expect(changed).toBe(true);
    expect(router.trustScore.list(mockReq('A'))).toEqual([]);
    expect(router.reputation.list(mockReq('A'))).toEqual([]);
    expect(router.trustScore.list(mockReq('B'))).toEqual([{}]);
  });

  it('totals() counts unique tenants across all buckets', () => {
    router.trustScore.for(mockReq('A')).set('x', {});
    router.reputation.for(mockReq('B')).set('y', {});
    router.creditScore.for(mockReq('A')).set('z', {}); // A appears in two buckets
    const t = router.totals();
    expect(t.tenantCount).toBe(2); // A and B, not 3
    expect(t.totalEntries).toBe(3);
  });
});

describe('resolveTenant helper', () => {
  it('returns companyId from req.tenant', () => {
    expect(resolveTenant(mockReq('BIZ_X'))).toBe('BIZ_X');
  });

  it('returns "default" when no tenant', () => {
    expect(resolveTenant(mockReq())).toBe('default');
  });

  it('returns "default" for empty companyId', () => {
    expect(resolveTenant(mockReq(''))).toBe('default');
  });
});

describe('Module-level tenantStores singleton', () => {
  beforeEach(() => {
    tenantStores.resetAll();
  });

  it('is a TenantRouter instance', () => {
    expect(tenantStores).toBeInstanceOf(TenantRouter);
  });

  it('supports the typical admin-tenant workflow', () => {
    const req = mockReq('BIZ_ADMIN_TEST');
    tenantStores.trustScore.for(req).set('entity_1', { v: 100 });
    tenantStores.reputation.for(req).set('entity_1', { score: 80 });
    expect(tenantStores.totals().tenantCount).toBe(1);
    expect(tenantStores.totals().totalEntries).toBe(2);
  });
});