/**
 * Auth middleware for nexha-business-directory (ADR-0009 Phase 3).
 *
 * Three modes:
 *   1. dev bypass (DIRECTORY_REQUIRE_AUTH=false) — every call is
 *      internal service with tenantId='dev'.
 *   2. internal service call — x-internal-token matches
 *      INTERNAL_SERVICE_TOKEN. Sets req.user = { role: 'service',
 *      internal: true, tenantId: 'system' }.
 *   3. user-facing — JWT verified against CorpID's secret. Tenant
 *      is resolved from req.user.organizationId or the JWT claim
 *      'tenantId'.
 *
 * Read-only public endpoints (`/health`, `/api/v1/capabilities`,
 * `/api/v1/companies`) may be reached without auth when
 * DIRECTORY_ALLOW_PUBLIC=true (default true for the public read API).
 * The directory client (from HOJAI-AI shared) uses the internal
 * token path; the do-app uses the JWT path.
 */

import jwt from 'jsonwebtoken';

const REQUIRE_AUTH = (process.env.DIRECTORY_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';
const ALLOW_PUBLIC = (process.env.DIRECTORY_ALLOW_PUBLIC ?? 'true').toLowerCase() !== 'false';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || null;
const JWT_SECRET = process.env.JWT_SECRET || process.env.CORPID_JWT_SECRET || 'dev-only-secret';

function devBypass(req, _res, next) {
  req.user = { id: 'dev-bypass', role: 'service', internal: true, tenantId: 'dev' };
  req.isInternalCall = true;
  next();
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function tryInternalToken(req, token) {
  if (!INTERNAL_TOKEN) return false;
  if (!timingSafeEqual(String(token), INTERNAL_TOKEN)) return false;
  // Internal callers don't have an implicit tenant — they must
  // supply one via X-Tenant-Id header or the request body.
  req.user = { id: 'system', role: 'service', internal: true, tenantId: null, organizationId: null };
  req.isInternalCall = true;
  return true;
}

function tryJwt(req, token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISSUER || 'rtmn-corpid',
      audience: process.env.JWT_AUDIENCE || 'rtmn-api',
    });
    req.user = {
      id: decoded.sub || decoded.userId,
      role: decoded.role || 'user',
      organizationId: decoded.organizationId,
      tenantId: decoded.tenantId || decoded.organizationId || null,
      permissions: decoded.permissions || [],
      internal: false,
    };
    return true;
  } catch {
    return false;
  }
}

/**
 * Strict auth — requires a valid token OR a JWT. Used for mutations.
 */
export function requireAuth(req, res, next) {
  if (!REQUIRE_AUTH) return devBypass(req, res, next);

  const internalToken = req.headers['x-internal-token'];
  if (internalToken && tryInternalToken(req, internalToken)) return next();

  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.substring(7).trim();
    if (tryJwt(req, token)) return next();
  }

  return res.status(401).json({
    success: false,
    error: { code: 'UNAUTHORIZED', message: 'Valid token required' },
  });
}

/**
 * Optional auth — sets req.user if a valid token is present, but
 * doesn't reject anonymous calls. Used by the public read endpoints
 * when DIRECTORY_ALLOW_PUBLIC=true so internal callers get the
 * full payload while anonymous callers still get the public view.
 */
export function optionalAuth(req, _res, next) {
  if (!REQUIRE_AUTH) return devBypass(req, _res, next);

  const internalToken = req.headers['x-internal-token'];
  if (internalToken && tryInternalToken(req, internalToken)) return next();

  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.substring(7).trim();
    if (tryJwt(req, token)) return next();
  }

  // Anonymous — still allow if public read API is enabled.
  if (ALLOW_PUBLIC) {
    req.user = null;
    return next();
  }

  return _res.status(401).json({
    success: false,
    error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
  });
}

/**
 * Resolve the tenant id for the current request. Order:
 *   1. req.user.tenantId (from JWT claim)
 *   2. req.user.organizationId (fallback for JWTs without tenantId)
 *   3. X-Tenant-Id header (for service-to-service calls with internal token)
 *   4. req.body.tenantId (for service-to-service calls posting a body)
 *   5. null
 *
 * For internal calls (no JWT), the caller is expected to provide
 * the tenant via header or body. The internal token alone doesn't
 * grant access to any specific tenant's data.
 */
export function tenantFrom(req) {
  if (req.user?.tenantId) return req.user.tenantId;
  if (req.user?.organizationId) return req.user.organizationId;
  const hdr = req.headers['x-tenant-id'];
  if (typeof hdr === 'string' && hdr.trim()) return hdr.trim();
  if (req.body && typeof req.body === 'object' && typeof req.body.tenantId === 'string' && req.body.tenantId.trim()) {
    return req.body.tenantId.trim();
  }
  return null;
}

export const _testing = { tryInternalToken, tryJwt, timingSafeEqual };
