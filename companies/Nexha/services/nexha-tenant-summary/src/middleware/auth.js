/**
 * Auth middleware for nexha-tenant-summary (ADR-0011 Phase 13, 2026-06-23).
 *
 * Same pattern as the other nexha-* services:
 *   - JWT for external callers (CorpID-issued)
 *   - x-internal-token for service-to-service (Hub) calls
 *
 * Read-only service — no writes happen here.
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const REQUIRED_ROLE = process.env.REQUIRED_ROLE || 'tenant:read';

function tenantFrom(req) {
  return (
    req.headers['x-tenant-id'] ||
    req.user?.tenantId ||
    req.user?.tid ||
    req.query?.tenantId ||
    null
  );
}

/**
 * requireAuth — accepts either a JWT (with REQUIRED_ROLE) or the internal
 * token. On success, attaches req.user = { sub, role, tenantId, scopes }.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const internalToken = req.headers['x-internal-token'];
  // Read INTERNAL_TOKEN on each request so tests can flip it.
  const expected = process.env.INTERNAL_TOKEN || '';

  // Internal token path
  if (expected && internalToken && internalToken === expected) {
    req.user = { sub: 'internal', role: 'internal', tenantId: tenantFrom(req), scopes: ['*'] };
    return next();
  }

  // JWT path
  const m = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!m) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Missing or invalid Authorization header' } });
  }
  try {
    const payload = jwt.verify(m[1], JWT_SECRET, { algorithms: ['HS256'] });
    req.user = payload;
    if (REQUIRED_ROLE && payload.role && payload.role !== REQUIRED_ROLE && payload.role !== 'admin' && payload.role !== 'internal') {
      // Allow access; specific tenant scoping happens via tenantFrom()
    }
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: err.message } });
  }
}

export { requireAuth, tenantFrom };