/**
 * Auth middleware — dual mode (matches mission-planner / partner-graph).
 *
 *   1. JWT (HS256): `Authorization: Bearer <token>`. Sets req.user.tenantId.
 *   2. Internal token: `x-internal-token: <token>` + `X-Tenant-Id: <tenant>`.
 *
 * Both modes verify signature/secret. We do NOT pull in @rtmn/shared's
 * jwt verifier because the env-var-at-request-time pattern keeps tests
 * simple (tests swap JWT_SECRET in beforeAll and tokens are re-signed).
 */

import jwt from 'jsonwebtoken';

export const JWT_SECRET = () => process.env.JWT_SECRET || 'dev-secret-change-me';
export const INTERNAL_TOKEN = () =>
  process.env.COMMERCE_RUNTIME_INTERNAL_TOKEN || 'cr-internal-dev-token';

let _jwtLib = null;
async function getJwt() {
  if (_jwtLib) return _jwtLib;
  try {
    _jwtLib = (await import('jsonwebtoken')).default;
  } catch {
    _jwtLib = jwt;
  }
  return _jwtLib;
}

function decodeUnsafe(token) {
  // Decodes without verifying — used as a last-resort fallback when the
  // tenant id is in a payload we generated locally. NEVER trust the
  // result for authorization decisions.
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * requireAuth — 401 if no valid token; sets req.user = { tenantId, sub, raw }.
 * Accepts JWT (Authorization: Bearer) OR internal token (x-internal-token + X-Tenant-Id).
 */
export function requireAuth(req, res, next) {
  // Try internal token first
  const internalToken = req.get('x-internal-token');
  if (internalToken) {
    if (internalToken !== INTERNAL_TOKEN()) {
      return res.status(401).json({ error: 'invalid internal token' });
    }
    const tenantId = req.get('x-tenant-id');
    if (!tenantId) {
      return res.status(400).json({ error: 'X-Tenant-Id required with internal token' });
    }
    req.user = { tenantId, sub: 'internal', raw: { internal: true } };
    return next();
  }

  const header = req.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!m) return res.status(401).json({ error: 'missing or malformed Authorization header' });
  const token = m[1].trim();

  const lib = jwt;
  try {
    const payload = lib.verify(token, JWT_SECRET());
    if (!payload || !payload.tenantId) {
      return res.status(401).json({ error: 'token missing tenantId claim' });
    }
    req.user = { tenantId: payload.tenantId, sub: payload.sub || null, raw: payload };
    return next();
  } catch (err) {
    return res.status(401).json({ error: `invalid token: ${err.message}` });
  }
}

/**
 * optionalAuth — like requireAuth but doesn't 401; sets req.user if valid.
 */
export function optionalAuth(req, _res, next) {
  const header = req.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!m) return next();
  const token = m[1].trim();
  try {
    const payload = jwt.verify(token, JWT_SECRET());
    if (payload && payload.tenantId) {
      req.user = { tenantId: payload.tenantId, sub: payload.sub || null, raw: payload };
    }
  } catch {
    /* ignore */
  }
  return next();
}

/**
 * tenantFrom — extracts tenantId in priority order:
 *   1. req.user.tenantId (if auth ran)
 *   2. X-Tenant-Id header (for internal callers)
 *   3. req.body.tenantId (test convenience; only if explicitly enabled)
 */
export function tenantFrom(req) {
  if (req.user && req.user.tenantId) return req.user.tenantId;
  const headerTenant = req.get('x-tenant-id');
  if (headerTenant) return headerTenant;
  return null;
}

/**
 * internalTokenAuth — allows internal callers (Hub, tests) to bypass JWT.
 * Requires both x-internal-token match AND X-Tenant-Id header.
 */
export function internalTokenAuth(req, res, next) {
  const token = req.get('x-internal-token');
  if (!token || token !== INTERNAL_TOKEN()) {
    return res.status(401).json({ error: 'invalid internal token' });
  }
  const tenantId = req.get('x-tenant-id');
  if (!tenantId) {
    return res.status(400).json({ error: 'X-Tenant-Id required with internal token' });
  }
  req.user = { tenantId, sub: 'internal', raw: { internal: true } };
  return next();
}

export function getInternalToken() {
  return INTERNAL_TOKEN();
}

/**
 * Issue a test JWT (used by tests; production callers should mint tokens
 * via CorpID or another identity service).
 */
export async function issueToken({ tenantId, sub = 'test', expiresInSec = 3600 }) {
  const lib = await getJwt();
  return lib.sign({ tenantId, sub }, JWT_SECRET(), { expiresIn: expiresInSec });
}

export { decodeUnsafe };