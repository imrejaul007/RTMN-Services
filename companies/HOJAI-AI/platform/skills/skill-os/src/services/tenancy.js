/**
 * SkillOS — Tenant isolation
 *
 * SkillOS now supports per-tenant data isolation for installs, transactions,
 * and audit. Catalog data (skills, assets, categories) remains globally visible.
 *
 * Tenant resolution order (first match wins):
 *   1. req.tenant.companyId   (set by requireAuth middleware in prod)
 *   2. req.body.tenantId      (for explicit override in dev / tests)
 *   3. req.query.tenantId     (for GETs)
 *   4. 'global'              (no tenant — dev fallback or admin)
 *
 * Per-tenant data lives in the same PersistentMap / MongoDB collection as
 * global data, but each record carries a `tenantId` field. Reads filter by it;
 * writes stamp it. The catalog (skills, assets) does NOT carry tenantId
 * because they are global by default; only installs and transactions do.
 *
 * The integration tests continue to use 'global' because they run with
 * SKILLOS_REQUIRE_AUTH=false, which causes the auth middleware to leave
 * req.tenant undefined.
 */

export const GLOBAL = 'global';

/**
 * Resolve the tenantId for a request.
 *
 * @param {object} req — Express request
 * @param {object} [opts]
 * @param {boolean} [opts.allowQuery] — If true, also look at req.query.tenantId (for GETs)
 * @returns {{ tenantId: string, isGlobal: boolean }}
 */
export function tenantScope(req, opts = {}) {
  const fromAuth = req?.tenant?.companyId;
  const fromBody = req?.body?.tenantId;
  const fromQuery = (opts.allowQuery || req?.method === 'GET') ? req?.query?.tenantId : null;
  const tenantId = fromAuth || fromBody || fromQuery || GLOBAL;
  return { tenantId, isGlobal: tenantId === GLOBAL };
}

/**
 * Filter a list of records by tenant scope.
 *
 * Rules:
 *   - Global records (no tenantId) are visible to all tenants
 *   - Per-tenant records are visible only to that tenant
 *   - The 'global' scope (admin/dev) sees everything
 */
export function filterByTenant(records, scope) {
  if (!Array.isArray(records)) return records;
  if (scope.isGlobal) return records;
  return records.filter((r) => !r.tenantId || r.tenantId === scope.tenantId);
}

/**
 * Stamp a record with the current tenant.
 * For per-tenant data (installs, transactions, audit).
 * No-op if record is null.
 */
export function stampTenant(record, scope) {
  if (!record) return record;
  if (scope.isGlobal) return record; // no stamp needed
  record.tenantId = scope.tenantId;
  return record;
}

/**
 * Validate a tenant identifier.
 * Tenant IDs are opaque strings — we just check they're non-empty and
 * not absurdly long. Real validation (existence in CorpID) happens elsewhere.
 */
export function isValidTenantId(id) {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128;
}

/**
 * Express middleware that requires a tenant on the request.
 * Use on routes that must be per-tenant (e.g. install for a tenant).
 */
export function requireTenant(opts = {}) {
  return (req, res, next) => {
    const scope = tenantScope(req, { allowQuery: true });
    if (scope.isGlobal && !opts.allowGlobal) {
      return res.status(400).json({
        success: false,
        error: 'TENANT_REQUIRED',
        message: 'This endpoint requires a tenantId (in body, query, or auth context)',
      });
    }
    req.tenantScope = scope;
    next();
  };
}
