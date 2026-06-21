/**
 * @rtmn/security-shared — Authentication Middleware
 *
 * Replaces the broken `requireAuth` middleware in every system with one
 * that ACTUALLY VERIFIES the JWT signature, issuer, audience, and
 * algorithms. This is the single most important fix in the audit — the
 * audit found multiple services that only checked for the presence of a
 * `Bearer` header without verifying the signature.
 */

import { verify, tryVerify } from '../auth/jwt.js';
import { timingSafeEqual } from '../utils/crypto.js';

const DEFAULT_ISSUER = 'rtmn-corpid';
const DEFAULT_AUDIENCE = 'rtmn-api';

/**
 * Middleware factory. Returns Express middleware that:
 *  1. Extracts Bearer token from Authorization header
 *  2. Verifies the JWT signature, issuer, audience, and expiry
 *  3. Checks the X-Internal-Token header for service-to-service calls
 *  4. Attaches the decoded user to req.user
 *  5. Returns 401 on any failure with a uniform error message
 *
 * @param {object} [options]
 * @param {string} [options.issuer='rtmn-corpid']
 * @param {string} [options.audience='rtmn-api']
 * @param {string} [options.role] - if set, requires this role in the JWT
 * @param {string[]} [options.allowedRoles] - alternative to `role`: any of these roles
 * @param {string} [options.internalTokenEnvVar='INTERNAL_SERVICE_TOKEN'] - env var name for service token
 * @returns {Function} Express middleware
 */
export function requireAuth(options = {}) {
  const {
    issuer = DEFAULT_ISSUER,
    audience = DEFAULT_AUDIENCE,
    role,
    allowedRoles,
    internalTokenEnvVar = 'INTERNAL_SERVICE_TOKEN',
  } = options;

  return (req, res, next) => {
    // 1. Service-to-service: check X-Internal-Token FIRST.
    //    Uses timing-safe compare. The env var MUST be set (no fallback).
    const internalToken = req.headers['x-internal-token'];
    const expectedInternal = process.env[internalTokenEnvVar];
    if (internalToken && expectedInternal) {
      if (timingSafeEqual(internalToken, expectedInternal)) {
        req.isInternalCall = true;
        req.user = { id: 'system', role: 'service', internal: true };
        return next();
      }
      // If a token was presented but doesn't match, reject — don't fall
      // through to JWT verification (would let a misconfigured caller in).
      return res.status(401).json({
        success: false,
        error: 'Invalid internal token',
      });
    }

    // 2. User-facing: extract Bearer token
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    const token = auth.substring(7).trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // 3. Verify — this WILL throw on alg=none, expired, bad signature,
    //    bad issuer, or bad audience.
    let payload;
    try {
      payload = verify(token, { issuer, audience });
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    // 4. Optional role check
    if (role && payload.role !== role) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role',
      });
    }
    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role',
      });
    }

    // 5. Attach user
    req.user = {
      id: payload.sub || payload.userId,
      userId: payload.sub || payload.userId,
      role: payload.role || 'user',
      email: payload.email,
      organizationId: payload.organizationId,
      merchantId: payload.merchantId,
      sessionId: payload.sessionId,
      permissions: payload.permissions || [],
      ...payload,
    };
    next();
  };
}

/**
 * Optional auth — if a valid token is present, attach req.user. If not,
 * continue without error. Useful for routes that work for both anonymous
 * and authenticated users.
 */
export function optionalAuth(options = {}) {
  const middleware = requireAuth(options);
  return (req, res, next) => {
    // If no Authorization header at all, skip without error
    if (!req.headers.authorization && !req.headers['x-internal-token']) {
      return next();
    }
    return middleware(req, res, next);
  };
}

/**
 * Role-based access control. Use after requireAuth to require a specific
 * role. Returns 403 if the user's role doesn't match.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient role' });
    }
    next();
  };
}

/**
 * Permission-based access control. Use after requireAuth to require a
 * specific permission. Returns 403 if the user doesn't have it.
 */
export function requirePermission(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const userPerms = req.user.permissions || [];
    const hasAll = requiredPermissions.every(p => userPerms.includes(p));
    if (!hasAll) {
      return res.status(403).json({ success: false, error: 'Insufficient permission' });
    }
    next();
  };
}

/**
 * Resource ownership check. Use after requireAuth to ensure req.user is
 * the owner of the resource identified by the URL param.
 *
 *   router.get('/users/:id/orders',
 *     requireAuth(),
 *     requireOwnership({ param: 'id', allowAdmin: true })
 *   )
 *
 * @param {object} options
 * @param {string} options.param - URL param holding the owner ID
 * @param {string} [options.userIdField='id'] - req.user field to compare
 * @param {boolean} [options.allowAdmin=false] - allow admin role to bypass
 * @param {string[]} [options.adminRoles=['admin', 'superadmin']]
 */
export function requireOwnership(options = {}) {
  const {
    param = 'id',
    userIdField = 'id',
    allowAdmin = false,
    adminRoles = ['admin', 'superadmin'],
  } = options;
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    if (allowAdmin && adminRoles.includes(req.user.role)) {
      return next();
    }
    const resourceOwnerId = req.params[param];
    const userId = req.user[userIdField];
    if (resourceOwnerId !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  };
}
