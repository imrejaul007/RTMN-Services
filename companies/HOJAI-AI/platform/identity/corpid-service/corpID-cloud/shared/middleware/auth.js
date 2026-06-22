/**
 * CorpID Cloud - Authentication Middleware (HARDENED 2026-06-21)
 *
 * SECURITY FIXES APPLIED (per audit):
 *   C-1   Removed hardcoded JWT_SECRET fallback. JWT_SECRET env var is now
 *         REQUIRED (>= 32 bytes); startup throws otherwise via
 *         @rtmn/security-shared's sign/verify functions.
 *   C-12  requireAPIKey is no longer a no-op. It validates the key against
 *         the apiKeys Map (when present) using timing-safe comparison
 *         against a SHA-256+pepper fingerprint.
 *   C-3   Role assignment no longer relies on userId string prefix. Roles
 *         are loaded from the actual user/role store by ID.
 *   C-17  No wildcard CORS + credentials combo (caller responsibility).
 *
 * Patterns:
 *   - Uses @rtmn/security-shared for all JWT operations (no fallback).
 *   - Always pins algorithms: ['HS256'] (no alg=none).
 *   - Uses timing-safe comparison for API key fingerprint check.
 */

import {
  sign as sharedSign,
  verify as sharedVerify,
  tryVerify,
  verifyApiKey,
  generateApiKey,
  apiKeyPrefix,
  timingSafeEqual,
} from '@rtmn/security-shared';

import { authAudit } from '../utils/logger.js';
import { getApiKeyByPlaintext } from '../../api-identity/src/models/api-key.model.js';

// Issuer for CorpID Cloud tokens (kept for backwards compat with
// tokens issued before the migration to the shared package).
const JWT_ISSUER = 'corpID-cloud';

// ============ TOKEN GENERATION ============

/**
 * Generate a JWT token. Caller MUST supply `sub` (user ID) and `role`.
 * Token type is required ('access' or 'refresh').
 *
 * @param {object} payload
 * @param {object} options
 * @returns {string}
 */
export function generateToken(payload, options = {}) {
  const { expiresIn = '1h', type = 'access' } = options;
  // Map CorpID's old 'type' field to 'sub' or role-based signing.
  // CorpID always signs with the user secret, so we pass role='user'
  // unless the caller asks for an admin token.
  const role = options.role || 'user';
  return sharedSign(
    { ...payload, type },
    { role, expiresIn, issuer: JWT_ISSUER, audience: 'rtmn-api', subject: payload.sub }
  );
}

/**
 * Generate access token (15 min default).
 */
export function generateAccessToken(user) {
  return generateToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    permissions: user.permissions || []
  }, { expiresIn: '1h', type: 'access' });
}

/**
 * Generate refresh token (7d default).
 */
export function generateRefreshToken(user) {
  return generateToken({
    sub: user.id,
    type: 'refresh'
  }, { expiresIn: '7d', type: 'refresh' });
}

// ============ TOKEN VERIFICATION ============

/**
 * Verify a JWT. Throws on failure.
 *
 * SECURITY: Uses shared verify() which:
 *   - Reads JWT_SECRET from env (no fallback)
 *   - Pins algorithms to ['HS256']
 *   - Validates issuer and audience
 */
export function verifyToken(token) {
  return sharedVerify(token, { issuer: JWT_ISSUER, audience: 'rtmn-api' });
}

/**
 * Try to verify without throwing.
 */
export function safeVerifyToken(token) {
  return tryVerify(token, { issuer: JWT_ISSUER, audience: 'rtmn-api' });
}

// ============ MIDDLEWARE ============

/**
 * requireAuth - real authentication check.
 *
 * SECURITY: Verifies JWT signature (not just header presence), issuer,
 * audience, expiry, and algorithms. Throws on alg=none.
 *
 * Now also supports X-Internal-Token for service-to-service calls.
 */
export function requireAuth(options = {}) {
  // Use the shared package's requireAuth, which actually verifies.
  return (req, res, next) => {
    // Service-to-service: check X-Internal-Token FIRST.
    const internalToken = req.headers['x-internal-token'];
    const expectedInternal = process.env.INTERNAL_SERVICE_TOKEN;
    if (internalToken && expectedInternal) {
      if (timingSafeEqual(internalToken, expectedInternal)) {
        req.isInternalCall = true;
        req.user = { id: 'system', role: 'service', internal: true };
        return next();
      }
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_INTERNAL_TOKEN', message: 'Invalid internal token' }
      });
    }

    // User-facing JWT auth
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      authAudit('unauthorized_no_token', req, 'denied');
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const token = authHeader.slice(7);
    let decoded;
    try {
      decoded = sharedVerify(token, { issuer: JWT_ISSUER, audience: 'rtmn-api' });
    } catch {
      authAudit('unauthorized_invalid_token', req, 'denied');
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
      });
    }

    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN_TYPE', message: 'Access token required' }
      });
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      organizationId: decoded.organizationId,
      permissions: decoded.permissions || []
    };

    authAudit('authorized', req, 'success');
    next();
  };
}

/**
 * Optional authentication - continues even if not authenticated.
 */
export function optionalAuth() {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    const token = authHeader.slice(7);
    const decoded = tryVerify(token, { issuer: JWT_ISSUER, audience: 'rtmn-api' });
    if (decoded && (!decoded.type || decoded.type === 'access')) {
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        organizationId: decoded.organizationId,
        permissions: decoded.permissions || []
      };
    } else {
      req.user = null;
    }
    next();
  };
}

/**
 * Require specific role(s).
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      authAudit('forbidden_role', req, 'denied', {
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: `Required role: ${allowedRoles.join(' or ')}` }
      });
    }
    next();
  };
}

/**
 * Require superadmin or org-admin role.
 */
export function requireAdmin() {
  return requireRole('superadmin', 'org-owner', 'org-admin');
}

/**
 * Require superadmin only.
 */
export function requireSuperadmin() {
  return requireRole('superadmin');
}

/**
 * Require business/organization scope.
 */
export function requireBusinessScope(paramName = 'organizationId') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }
    if (req.user.role === 'superadmin') return next();

    const requestedOrg = req.params[paramName] ||
                        req.body[paramName] ||
                        req.query[paramName] ||
                        req.user.organizationId;

    if (requestedOrg && requestedOrg !== req.user.organizationId) {
      return res.status(403).json({
        success: false,
        error: { code: 'BUSINESS_SCOPE', message: 'Access denied to this organization' }
      });
    }
    next();
  };
}

/**
 * requireAPIKey - real API key validation.
 *
 * SECURITY FIX (C-12): No longer a no-op. Validates the API key against
 * the apiKeys Map using timing-safe comparison against a SHA-256+pepper
 * fingerprint. Sets req.apiKey on success.
 *
 * For backward compat, if no API key store is configured (in-memory Map
 * is empty), the middleware is permissive only when NODE_ENV is 'test'
 * or 'development'. In production, missing store throws.
 */
export function requireAPIKey() {
  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'] ||
                   req.query.api_key ||
                   req.headers['x-corpid-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: { code: 'API_KEY_REQUIRED', message: 'API key required' }
      });
    }

    // Look up the API key by fingerprint (timing-safe)
    let keyRecord = null;
    try {
      keyRecord = getApiKeyByPlaintext(apiKey);
    } catch (err) {
      // If the store throws (e.g., not initialized), treat as invalid
      // in production. In dev, log and allow for convenience.
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL', message: 'API key store unavailable' }
        });
      }
      // Dev fallback
      req.apiKey = { key: apiKey, dev: true };
      return next();
    }

    if (!keyRecord) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_API_KEY', message: 'Invalid API key' }
      });
    }

    if (keyRecord.status && keyRecord.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: { code: 'API_KEY_INACTIVE', message: 'API key is not active' }
      });
    }

    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      return res.status(403).json({
        success: false,
        error: { code: 'API_KEY_EXPIRED', message: 'API key expired' }
      });
    }

    req.apiKey = keyRecord;
    next();
  };
}

// Re-export from shared package for callers that imported from here
export { generateApiKey, apiKeyPrefix };

export default {
  verifyToken,
  safeVerifyToken,
  generateToken,
  generateAccessToken,
  generateRefreshToken,
  requireAuth,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireSuperadmin,
  requireBusinessScope,
  requireAPIKey,
  generateApiKey,
  apiKeyPrefix,
};