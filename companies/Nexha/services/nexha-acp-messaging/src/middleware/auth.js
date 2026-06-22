/**
 * Auth middleware — JWT (CorpID) + internal service token.
 *
 * Mirrors the pattern in nexha-business-directory so all Nexha services
 * have a consistent auth surface. Internal callers (SUTAR agents, Hub,
 * batch jobs) MUST supply x-tenant-id (or tenantId in body) because the
 * internal path doesn't imply a tenant — that's intentional.
 */

import jwt from 'jsonwebtoken';

function getInternalToken() {
  return process.env.INTERNAL_SERVICE_TOKEN || '';
}

function getJwtPublicKey() {
  return process.env.JWT_PUBLIC_KEY || '';
}

function parseBearer(req) {
  const h = req.headers.authorization || req.headers.Authorization;
  if (typeof h !== 'string') return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function tryInternal(req) {
  const token = req.headers['x-internal-token'];
  if (typeof token !== 'string') return false;
  const expected = getInternalToken();
  if (!expected) return false;
  // Constant-time compare to avoid timing attacks.
  if (token.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}

function tryJwt(req) {
  if (!getJwtPublicKey()) return null;
  const bearer = parseBearer(req);
  if (!bearer) return null;
  try {
    return jwt.verify(bearer, getJwtPublicKey(), { algorithms: ['RS256'] });
  } catch {
    return null;
  }
}

/**
 * Require auth. Sets req.user = { tenantId, userId, organizationId, roles, internal? }.
 * Returns 401 on missing/invalid auth.
 */
export function requireAuth(req, res, next) {
  if (tryInternal(req)) {
    req.user = {
      tenantId: null,            // internal callers must supply tenant via header/body
      userId: 'internal',
      organizationId: null,
      roles: ['internal'],
      internal: true,
    };
    return next();
  }
  const claims = tryJwt(req);
  if (claims) {
    req.user = {
      tenantId: claims.tenantId || claims.organizationId || null,
      userId: claims.sub || claims.userId || 'unknown',
      organizationId: claims.organizationId || null,
      roles: claims.roles || ['user'],
      internal: false,
    };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized', code: 'ACP_AUTH_REQUIRED' });
}

/**
 * Optional auth. Doesn't reject — just populates req.user if a valid token is present.
 */
export function optionalAuth(req, res, next) {
  if (tryInternal(req)) {
    req.user = { tenantId: null, userId: 'internal', organizationId: null, roles: ['internal'], internal: true };
    return next();
  }
  const claims = tryJwt(req);
  if (claims) {
    req.user = {
      tenantId: claims.tenantId || claims.organizationId || null,
      userId: claims.sub || claims.userId || 'unknown',
      organizationId: claims.organizationId || null,
      roles: claims.roles || ['user'],
      internal: false,
    };
  } else {
    req.user = null;
  }
  return next();
}

/**
 * Extract the tenantId from the auth context, header, or body.
 * Internal callers MUST supply via header or body — auth path returns null.
 */
export function tenantFrom(req, body = {}) {
  if (req.user && req.user.tenantId) return req.user.tenantId;
  const hdr = req.headers['x-tenant-id'];
  if (typeof hdr === 'string' && hdr) return hdr;
  if (body && typeof body.tenantId === 'string' && body.tenantId) return body.tenantId;
  return null;
}