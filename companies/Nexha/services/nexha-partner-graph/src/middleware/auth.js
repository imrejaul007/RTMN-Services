/**
 * Auth middleware — JWT (CorpID) + internal service token.
 *
 * Mirrors the pattern in nexha-business-directory and nexha-mission-planner.
 * Internal callers MUST supply x-tenant-id (or tenantId in body) because
 * the internal path doesn't imply a tenant — that's intentional.
 *
 * Env vars are read at request time (not at module load) so tests can
 * swap them with `beforeAll`.
 */

export function getInternalToken() { return process.env.INTERNAL_SERVICE_TOKEN || ''; }
function getJwtSecret() { return process.env.JWT_SECRET || ''; }

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
  if (token.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}

function tryJwt(req) {
  if (!getJwtSecret()) return null;
  const bearer = parseBearer(req);
  if (!bearer) return null;
  try {
    const parts = bearer.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  if (tryInternal(req)) {
    req.user = { tenantId: null, userId: 'internal', organizationId: null, roles: ['internal'], internal: true };
    return next();
  }
  const claims = tryJwt(req);
  if (claims) {
    if (claims.exp && claims.exp * 1000 < Date.now()) {
      return res.status(401).json({ error: 'Unauthorized', code: 'PARTNER_TOKEN_EXPIRED' });
    }
    req.user = {
      tenantId: claims.tenantId || claims.organizationId || null,
      userId: claims.sub || claims.userId || 'unknown',
      organizationId: claims.organizationId || null,
      roles: claims.roles || ['user'],
      internal: false,
    };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized', code: 'PARTNER_AUTH_REQUIRED' });
}

export function optionalAuth(req, res, next) {
  if (tryInternal(req)) {
    req.user = { tenantId: null, userId: 'internal', organizationId: null, roles: ['internal'], internal: true };
    return next();
  }
  const claims = tryJwt(req);
  if (claims && (!claims.exp || claims.exp * 1000 >= Date.now())) {
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

export function tenantFrom(req, body = {}) {
  if (req.user && req.user.tenantId) return req.user.tenantId;
  const hdr = req.headers['x-tenant-id'];
  if (typeof hdr === 'string' && hdr) return hdr;
  if (body && typeof body.tenantId === 'string' && body.tenantId) return body.tenantId;
  return null;
}