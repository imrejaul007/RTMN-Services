/**
 * Auth middleware — dual mode.
 *
 *   1. JWT (HS256): Authorization: Bearer <token>. Sets req.user.tenantId.
 *   2. Internal token: x-internal-token: <token> + X-Tenant-Id: <tenant>.
 *
 * For this service, JWT requires `industry:admin` role (admin of the
 * industry-tenant-instances service). Internal token bypasses that.
 *
 * Phase 10 (2026-06-22).
 */

import jwt from 'jsonwebtoken';

export const JWT_SECRET = () => process.env.JWT_SECRET || 'dev-secret-change-me';
export const INTERNAL_TOKEN = () =>
  process.env.INDUSTRY_TENANT_INSTANCES_INTERNAL_TOKEN || 'iti-internal-dev-token';

/**
 * requireAuth — 401 if no valid token; 403 if JWT but missing industry:admin role.
 */
export function requireAuth(req, res, next) {
  const internalToken = req.get('x-internal-token');
  if (internalToken) {
    if (internalToken !== INTERNAL_TOKEN()) {
      return res.status(401).json({ error: 'invalid internal token' });
    }
    const tenantId = req.get('x-tenant-id');
    if (!tenantId) {
      return res.status(400).json({ error: 'X-Tenant-Id required with internal token' });
    }
    req.user = { tenantId, sub: 'internal', raw: { internal: true, role: 'admin' } };
    return next();
  }

  const header = req.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!m) return res.status(401).json({ error: 'missing or malformed Authorization header' });
  const token = m[1].trim();
  try {
    const payload = jwt.verify(token, JWT_SECRET());
    if (!payload || !payload.tenantId) {
      return res.status(401).json({ error: 'token missing tenantId claim' });
    }
    if (!payload.roles || !Array.isArray(payload.roles) || !payload.roles.includes('industry:admin')) {
      return res.status(403).json({ error: 'requires industry:admin role' });
    }
    req.user = { tenantId: payload.tenantId, sub: payload.sub || null, raw: payload };
    return next();
  } catch (err) {
    return res.status(401).json({ error: `invalid token: ${err.message}` });
  }
}

export function tenantFrom(req) {
  if (req.user && req.user.tenantId) return req.user.tenantId;
  const headerTenant = req.get('x-tenant-id');
  if (headerTenant) return headerTenant;
  return null;
}

export function getInternalToken() {
  return INTERNAL_TOKEN();
}

export async function issueToken({
  tenantId = 't_admin',
  sub = 'admin',
  roles = ['industry:admin'],
  expiresInSec = 3600,
}) {
  return jwt.sign({ tenantId, sub, roles }, JWT_SECRET(), { expiresIn: expiresInSec });
}