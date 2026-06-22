// ============================================================================
// SUTAR Trust Engine - Tenant-Aware Store Wrapper (ADR-0009 Phase 1)
// ============================================================================
//
// The trust engine's services hold data in module-level Maps:
//   trustScoreStore    -> Map<entityId, ITrustScore>
//   reputationStore    -> Map<entityId, IReputation>
//   creditScoreStore   -> Map<entityId, ICreditScore>
//   creditReportStore  -> Map<entityId, ICreditReport>
//   verificationStore  -> Map<entityId, IVerification>
//
// For multi-tenancy we need every read/write to be partitioned by
// companyId. Two tenants with the same entityId should NOT see each
// other's data.
//
// Instead of modifying every service (which would break the existing 13
// unit tests), this module provides per-tenant Map<entityId, T> buckets
// keyed by companyId. Routes look up the bucket via `for(companyId)` and
// then operate on it as if it were the original singleton's store.
//
// Falls back to a 'default' bucket when no tenant is on the request, so
// the existing in-memory state and tests continue to work without
// modification.

import type { Request } from 'express';

const DEFAULT_TENANT = 'default';

function resolveTenant(req: Request): string {
  // Lazy import to avoid a circular dependency at module load time.
  const t = (req as any).tenant;
  if (t && typeof t.companyId === 'string' && t.companyId) return t.companyId;
  return DEFAULT_TENANT;
}

/**
 * TenantBucket<T> wraps a Map<entityId, T> per companyId. Operations
 * delegate to the bucket for the resolved tenant. When a tenant has never
 * been seen, an empty Map is created on first access.
 */
export class TenantBucket<T> {
  private buckets = new Map<string, Map<string, T>>();

  for(req: Request): Map<string, T> {
    const key = resolveTenant(req);
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = new Map();
      this.buckets.set(key, bucket);
    }
    return bucket;
  }

  list(req: Request): T[] {
    return Array.from(this.for(req).values());
  }

  clear(req: Request): void {
    this.buckets.delete(resolveTenant(req));
  }

  listTenants(): Array<{ companyId: string; size: number }> {
    return Array.from(this.buckets.entries()).map(([companyId, m]) => ({ companyId, size: m.size }));
  }

  resetAll(): number {
    const n = this.buckets.size;
    this.buckets.clear();
    return n;
  }

  resetTenant(req: Request): boolean {
    return this.buckets.delete(resolveTenant(req));
  }

  /** Stats for the admin endpoint */
  totals(): { tenantCount: number; totalEntries: number } {
    let entries = 0;
    for (const m of this.buckets.values()) entries += m.size;
    return { tenantCount: this.buckets.size, totalEntries: entries };
  }
}

/**
 * TenantRouter — convenience wrapper that holds multiple typed buckets and
 * exposes them by name. Lets the index.ts routes do:
 *   const { trustScore, reputation, credit, verification } = tenantStores;
 *   const bucket = tenantStores.trustScore.for(req);
 */
export class TenantRouter {
  trustScore = new TenantBucket<any>();
  reputation = new TenantBucket<any>();
  creditScore = new TenantBucket<any>();
  creditReport = new TenantBucket<any>();
  verification = new TenantBucket<any>();
  verificationKyc = new TenantBucket<any>();

  resetTenant(req: Request): boolean {
    let changed = false;
    changed = this.trustScore.resetTenant(req) || changed;
    changed = this.reputation.resetTenant(req) || changed;
    changed = this.creditScore.resetTenant(req) || changed;
    changed = this.creditReport.resetTenant(req) || changed;
    changed = this.verification.resetTenant(req) || changed;
    changed = this.verificationKyc.resetTenant(req) || changed;
    return changed;
  }

  resetAll(): number {
    let n = 0;
    n += this.trustScore.resetAll();
    n += this.reputation.resetAll();
    n += this.creditScore.resetAll();
    n += this.creditReport.resetAll();
    n += this.verification.resetAll();
    n += this.verificationKyc.resetAll();
    return n;
  }

  totals(): { tenantCount: number; totalEntries: number } {
    // Use the largest bucket count to estimate tenant count
    let tenantCount = 0;
    let totalEntries = 0;
    const seenTenants = new Set<string>();
    for (const bucket of [this.trustScore, this.reputation, this.creditScore, this.creditReport, this.verification, this.verificationKyc]) {
      for (const t of bucket.listTenants()) {
        seenTenants.add(t.companyId);
        totalEntries += t.size;
      }
    }
    return { tenantCount: seenTenants.size, totalEntries };
  }
}

export const tenantStores = new TenantRouter();

export { resolveTenant, DEFAULT_TENANT };