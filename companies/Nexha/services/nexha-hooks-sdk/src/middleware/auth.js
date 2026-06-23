/**
 * Auth middleware — dual mode (JWT or internal token).
 *
 * 1. JWT (Authorization: Bearer <token>) — requires 'hooks:admin' role,
 *    must include tenantId claim.
 * 2. Internal token (x-internal-token + x-tenant-id) — for Hub-to-service calls.
 *
 * Token env vars:
 *   HOOKS_SDK_JWT_SECRET  (defaults to 'dev-shared-secret')
 *   HOOKS_SDK_INTERNAL_TOKEN (defaults to 'dev-internal-token')
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

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const internalToken = req.headers['x-internal-token'];
  const jwtSecret = process.env.HOOKS_SDK_JWT_SECRET || 'dev-shared-secret';
  const expectedInternal = process.env.HOOKS_SDK_INTERNAL_TOKEN || 'dev-internal-token';

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
      roles: ['hooks:admin'],
      kind: 'internal',
    };
    return next();
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    let claims;
    try {
      claims = jwt.verify(token, jwtSecret);
    } catch (err) {
      return next(new AuthError(`invalid jwt: ${err.message}`, 401));
    }
    if (!claims.tenantId) {
      return next(new AuthError('jwt missing tenantId claim', 401));
    }
    const roles = claims.roles || [];
    if (!roles.includes('hooks:admin')) {
      return next(new AuthError('hooks:admin role required', 403));
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
