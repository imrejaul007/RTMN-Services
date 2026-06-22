// ============================================================================
// SUTAR Decision Engine - Per-Tenant Engine Registry (ADR-0009 Phase 1)
// ============================================================================
//
// The DecisionEngine class is stateless except for its per-instance stats
// counter. Now that we have multi-tenancy, every tenant needs its own
// stats counter so that:
//   - "show me my decisions this hour" doesn't leak across companies
//   - one tenant's traffic can't inflate another tenant's KPIs
//   - resetting stats for one tenant doesn't wipe another's data
//
// This registry holds DecisionEngine instances keyed by companyId. It's a
// thin Map<companyId, { engine, createdAt, lastUsedAt }> with lazy creation.
// Instances are NOT auto-evicted today; for production, swap in an LRU.

import { DecisionEngine } from './decisionEngine.js';

export interface TenantEntry {
  engine: DecisionEngine;
  createdAt: string;
  lastUsedAt: string;
  requestCount: number;
}

export class TenantDecisionRegistry {
  private tenants = new Map<string, TenantEntry>();
  private simulationOsUrl: string;
  private simulationOsTimeout: number;

  constructor(simulationOsUrl?: string, simulationOsTimeout?: number) {
    this.simulationOsUrl = simulationOsUrl ?? process.env.SIMULATION_OS_URL ?? 'http://localhost:4241';
    this.simulationOsTimeout = simulationOsTimeout ?? 5000;
  }

  /**
   * Get (or lazily create) the DecisionEngine for a given companyId.
   * `defaultCompanyId` is the fallback when no tenant is on the request;
   * it's the "global" / un-tenant-scoped bucket used in dev or pre-tenant
   * migrations.
   */
  for(companyId: string): TenantEntry {
    const key = companyId || 'default';
    let entry = this.tenants.get(key);
    if (!entry) {
      entry = {
        engine: new DecisionEngine(this.simulationOsUrl, this.simulationOsTimeout),
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        requestCount: 0,
      };
      this.tenants.set(key, entry);
    }
    entry.lastUsedAt = new Date().toISOString();
    entry.requestCount++;
    return entry;
  }

  /** List all known tenants. Useful for the admin API and tests. */
  list(): Array<{ companyId: string; createdAt: string; lastUsedAt: string; requestCount: number }> {
    return Array.from(this.tenants.entries()).map(([companyId, e]) => ({
      companyId,
      createdAt: e.createdAt,
      lastUsedAt: e.lastUsedAt,
      requestCount: e.requestCount,
    }));
  }

  /** Stats snapshot across all tenants (for /api/v1/stats when no tenant). */
  totals(): { tenantCount: number; totalRequestCount: number } {
    let totalRequests = 0;
    for (const e of this.tenants.values()) totalRequests += e.requestCount;
    return { tenantCount: this.tenants.size, totalRequestCount: totalRequests };
  }

  /** Reset a single tenant's engine (re-instantiate). */
  resetTenant(companyId: string): boolean {
    return this.tenants.delete(companyId);
  }

  /** Reset every tenant (used by /api/v1/stats/reset when no tenant on req). */
  resetAll(): number {
    const n = this.tenants.size;
    this.tenants.clear();
    return n;
  }

  /** Number of currently-tracked tenants. */
  size(): number {
    return this.tenants.size;
  }
}
