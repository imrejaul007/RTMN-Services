/**
 * Auth middleware — dual mode (JWT or internal token).
 *
 * 1. JWT (Authorization: Bearer <token>) — requires 'provisioning:admin' role,
 *    must include tenantId claim.
 * 2. Internal token (x-internal-token + x-tenant-id) — for Hub-to-service calls.
 *
 * Token env vars:
 *   PROVISIONING_ENGINE_JWT_SECRET  (defaults to 'dev-shared-secret')
 *   PROVISIONING_ENGINE_INTERNAL_TOKEN (defaults to 'dev-internal-token')
 */

import jwt from 'jsonwebtoken';

export class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export class TenantMismatchError extends Error {
  constructor(message = 'tenant mismatch', status = 403) {
    super(message);
    this.name = 'TenantMismatchError';
    this.status = status;
  }
}

function verifyJwt(token, secret) {
  try {
    return jwt.verify(token, secret);
  } catch (err) {
    throw new AuthError(`invalid jwt: ${err.message}`, 401);
  }
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const internalToken = req.headers['x-internal-token'];
  const jwtSecret =
    process.env.PROVISIONING_ENGINE_JWT_SECRET || 'dev-shared-secret';
  const expectedInternal =
    process.env.PROVISIONING_ENGINE_INTERNAL_TOKEN || 'dev-internal-token';

  // Internal token path
  if (internalToken) {
    if (internalToken !== expectedInternal) {
      return next(new AuthError('invalid internal token', 401));
    }
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return next(new AuthError('x-tenant-id required with internal token', 400));
    }
    req.user = {
      tenantId,
      roles: ['provisioning:admin'],
      kind: 'internal',
    };
    return next();
  }

  // JWT path
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    const claims = verifyJwt(token, jwtSecret);
    if (!claims.tenantId) {
      return next(new AuthError('jwt missing tenantId claim', 401));
    }
    const roles = claims.roles || [];
    if (!roles.includes('provisioning:admin')) {
      return next(new AuthError('provisioning:admin role required', 403));
    }
    req.user = {
      tenantId: claims.tenantId,
      roles,
      kind: 'jwt',
      subject: claims.sub,
    };
    return next();
  }

  return next(new AuthError('missing credentials', 401));
}

/**
 * Enforce that the entity's tenantId matches req.user.tenantId.
 * Internal tokens may pass any tenant; JWT tokens must match.
 */
export function requireTenantMatch(entity, req) {
  if (req.user.kind === 'internal') return;
  if (entity.tenantId !== req.user.tenantId) {
    throw new TenantMismatchError();
  }
}
