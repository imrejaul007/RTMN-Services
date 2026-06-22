// ============================================================================
// SUTAR Contract OS - Tenant-Aware Store Wrapper (ADR-0009 Phase 1)
// ============================================================================
//
// Contract OS holds two module-level Maps keyed by id:
//   contracts: Map<contractId, Contract>
//   templates: Map<templateId, Template>
//
// For multi-tenancy we partition these Maps by companyId. Two tenants
// must NEVER see each other's contracts or templates.
//
// Strategy: every read/write routes through TenantBucket<T>.for(req),
// which returns the per-companyId Map. Routes never touch the raw Maps.
//
// Falls back to a 'default' bucket when no tenant is on the request, so
// existing tests that call services directly (without an Express req)
// continue to work without modification.

import type { Request } from 'express';

const DEFAULT_TENANT = 'default';

function resolveTenant(req: Request | undefined | null): string {
  if (!req) return DEFAULT_TENANT;
  const t = (req as any).tenant;
  if (t && typeof t.companyId === 'string' && t.companyId) return t.companyId;
  return DEFAULT_TENANT;
}

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

  totals(): { tenantCount: number; totalEntries: number } {
    let entries = 0;
    for (const m of this.buckets.values()) entries += m.size;
    return { tenantCount: this.buckets.size, totalEntries: entries };
  }
}

export class TenantRouter {
  contracts = new TenantBucket<any>();
  templates = new TenantBucket<any>();

  resetTenant(req: Request): boolean {
    const a = this.contracts.resetTenant(req);
    const b = this.templates.resetTenant(req);
    return a || b;
  }

  resetAll(): number {
    return this.contracts.resetAll() + this.templates.resetAll();
  }

  totals(): { tenantCount: number; totalEntries: number } {
    const seen = new Set<string>();
    let total = 0;
    for (const bucket of [this.contracts, this.templates]) {
      for (const t of bucket.listTenants()) {
        seen.add(t.companyId);
        total += t.size;
      }
    }
    return { tenantCount: seen.size, totalEntries: total };
  }
}

export const tenantStores = new TenantRouter();

export { resolveTenant, DEFAULT_TENANT };