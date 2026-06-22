/**
 * RTMN Tenant Helper for SUTAR Stub Services (ADR-0009 Phase 1)
 *
 * Drop-in helper that adds tenant context middleware + a /whoami endpoint
 * to a SUTAR stub service. Each stub imports `applyTenantContext` once and
 * calls it on the express app. Public paths (e.g. /health, /ready) stay
 * reachable; everything else under /api/ requires a tenant.
 *
 * Tenant resolution is delegated to @rtmn/shared/auth (createTenantContext),
 * so the behavior is consistent across real and stub services.
 *
 * For stubs that hold in-memory data, the helper also exposes:
 *   - tkey(req, id)  -> `${companyId}::${id}` (or `default::${id}`)
 *   - getTenantId(req) -> resolved companyId
 *
 * Usage:
 *   const { applyTenantContext, tkey, getTenantId } = require('../../sutar-shared/tenant');
 *   applyTenantContext(app, { serviceName: 'sutar-agent-id', publicPathPatterns: [/^\/health$/] });
 */

const { createTenantContext, getTenant } = require('@rtmn/shared/auth');

const DEFAULT_TENANT = 'default';
const SEP = '::';

function getTenantId(req) {
  const t = getTenant(req);
  if (t && typeof t.companyId === 'string' && t.companyId) return t.companyId;
  return DEFAULT_TENANT;
}

function tkey(req, id) {
  return `${getTenantId(req)}${SEP}${id}`;
}

function untkey(stored, req) {
  if (!stored || typeof stored !== 'string') return stored;
  const prefix = `${getTenantId(req)}${SEP}`;
  if (stored.startsWith(prefix)) return stored.slice(prefix.length);
  const idx = stored.indexOf(SEP);
  if (idx > 0) return stored.slice(idx + SEP.length);
  return stored;
}

/**
 * Mount the tenant middleware on /api/ and add a /api/v1/admin/tenant/whoami
 * endpoint. Returns the tkey/getTenantId helpers for use by routes.
 *
 * @param {import('express').Express} app
 * @param {object} options
 * @param {string} options.serviceName            Name for log/audit
 * @param {string[]} [options.publicPaths]       Paths that bypass tenant
 * @param {RegExp[]} [options.publicPathPatterns]  Regex patterns that bypass tenant
 * @returns {{ getTenantId, tkey, untkey }}
 */
function applyTenantContext(app, options = {}) {
  const {
    serviceName = 'sutar-stub',
    publicPaths = [],
    publicPathPatterns = [],
  } = options;

  const tenantMiddleware = createTenantContext({
    publicPaths,
    publicPathPatterns,
  });
  app.use('/api/', tenantMiddleware);

  // Tenant whoami endpoint (admin/diagnostic)
  app.get('/api/v1/admin/tenant/whoami', (req, res) => {
    res.json({
      success: true,
      data: {
        service: serviceName,
        tenant: getTenant(req) || null,
        tenantId: getTenantId(req),
      },
      timestamp: new Date().toISOString(),
    });
  });

  return { getTenantId, tkey, untkey };
}

module.exports = { applyTenantContext, getTenantId, tkey, untkey, DEFAULT_TENANT };