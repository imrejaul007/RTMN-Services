// ============================================================================
// SUTAR Economy OS - Tenant Key Helper (ADR-0009 Phase 1)
// ============================================================================
//
// The economy OS services use module-level stores keyed by entityId:
//   karmaStore[entityId]
//   balanceStore[entityId]
//   transactionStore[transactionId]
//   invoiceStore[billingId]
//   escrowStore[escrowId]
//   earningStore[earningId]
//   paymentStore[paymentId]
//   paymentMethodStore[methodId]
//   redemptionStore[redemptionId]
//
// For multi-tenancy we need every read/write to be partitioned by
// companyId. Two tenants with the same entityId should NOT see each
// other's data.
//
// Strategy: instead of modifying every service (which would break the
// existing 105 unit tests that call services directly), this helper
// returns a tenant-prefixed key. Routes call it before invoking a service,
// and the route layer is the only place tenant context flows in.
//
// Falls back to 'default::' when no tenant is on the request, so existing
// in-memory state and tests continue to work without modification.
// Existing unit tests do NOT go through Express, so they continue using
// the raw entityId and don't see tenant prefixing.

import type { Request } from 'express';

const DEFAULT_TENANT = 'default';
const SEP = '::';

function resolveTenant(req: Request | undefined | null): string {
  if (!req) return DEFAULT_TENANT;
  const t = (req as any).tenant;
  if (t && typeof t.companyId === 'string' && t.companyId) return t.companyId;
  return DEFAULT_TENANT;
}

/**
 * Build a tenant-prefixed storage key from a logical id.
 * Example: tkey(req, 'user-123') -> 'acme::user-123'
 */
export function tkey(req: Request | undefined | null, id: string): string {
  return `${resolveTenant(req)}${SEP}${id}`;
}

/**
 * Strip the tenant prefix from a stored key, returning the original id.
 * Used when the service returns a stored key and the caller needs the
 * logical id (e.g. for echoing it back to the API client).
 */
export function untkey(stored: string, req?: Request | undefined | null): string {
  if (!stored || typeof stored !== 'string') return stored;
  const tenant = resolveTenant(req);
  const prefix = `${tenant}${SEP}`;
  if (stored.startsWith(prefix)) return stored.slice(prefix.length);
  // Try to strip any tenant prefix we recognize
  const idx = stored.indexOf(SEP);
  if (idx > 0) return stored.slice(idx + SEP.length);
  return stored;
}

/**
 * Resolve and return the companyId for a request, defaulting to 'default'.
 */
export function getCompanyId(req: Request | undefined | null): string {
  return resolveTenant(req);
}

/**
 * Filter a list of records (each containing some id) to those that belong
 * to the current tenant. The idGetter extracts the stored key, and the
 * helper returns records whose key carries the tenant prefix.
 */
export function filterByTenant<T>(req: Request | undefined | null, records: T[], idGetter: (r: T) => string): T[] {
  const tenant = resolveTenant(req);
  return records.filter((r) => {
    const stored = idGetter(r);
    return typeof stored === 'string' && stored.startsWith(`${tenant}${SEP}`);
  });
}

export { resolveTenant, DEFAULT_TENANT };