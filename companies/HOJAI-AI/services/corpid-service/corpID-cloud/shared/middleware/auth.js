/**
 * CorpID Cloud - Authentication Middleware
 * JWT-based authentication and session validation
 */

import jwt from 'jsonwebtoken';
import { authAudit } from '../utils/logger.js';

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'corpID-cloud-secret-change-in-production';
const JWT_ISSUER = 'corpID-cloud';

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, { issuer: JWT_ISSUER });
  } catch (error) {
    return null;
  }
}

/**
 * Generate JWT token
 */
export function generateToken(payload, options = {}) {
  const {
    expiresIn = '1h',
    type = 'access'
  } = options;

  return jwt.sign(
    {
      ...payload,
      type,
      iss: JWT_ISSUER
    },
    JWT_SECRET,
    { expiresIn }
  );
}

/**
 * Generate access token
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
 * Generate refresh token
 */
export function generateRefreshToken(user) {
  return generateToken({
    sub: user.id,
    type: 'refresh'
  }, { expiresIn: '7d', type: 'refresh' });
}

// ============ MIDDLEWARE ============

/**
 * Require authentication - returns 401 if not authenticated
 */
export function requireAuth() {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      authAudit('unauthorized_no_token', req, 'denied');
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please provide a valid Bearer token.'
        }
      });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      authAudit('unauthorized_invalid_token', req, 'denied');
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token. Please login again.'
        }
      });
    }

    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_TYPE',
          message: 'Invalid token type. Access token required.'
        }
      });
    }

    // Attach user to request
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
 * Optional authentication - continues even if not authenticated
 */
export function optionalAuth() {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);

    if (decoded && decoded.type === 'access') {
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
 * Require specific role(s)
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      authAudit('forbidden_role', req, 'denied', {
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
        }
      });
    }

    next();
  };
}

/**
 * Require superadmin or org-admin role
 */
export function requireAdmin() {
  return requireRole('superadmin', 'org-owner', 'org-admin');
}

/**
 * Require superadmin only
 */
export function requireSuperadmin() {
  return requireRole('superadmin');
}

/**
 * Require business/organization scope
 */
export function requireBusinessScope(paramName = 'organizationId') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    // Superadmin bypasses scope check
    if (req.user.role === 'superadmin') {
      return next();
    }

    const requestedOrg = req.params[paramName] ||
                        req.body[paramName] ||
                        req.query[paramName] ||
                        req.user.organizationId;

    if (requestedOrg && requestedOrg !== req.user.organizationId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'BUSINESS_SCOPE',
          message: 'Access denied to this organization'
        }
      });
    }

    next();
  };
}

/**
 * Validate API key
 */
export function requireAPIKey() {
  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'] ||
                   req.query.api_key ||
                   req.headers['x-corpid-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'API_KEY_REQUIRED',
          message: 'API key required. Include X-API-Key header.'
        }
      });
    }

    // API key validation would be implemented here
    // For now, we'll skip and let services implement their own
    req.apiKey = apiKey;
    next();
  };
}

export default {
  verifyToken,
  generateToken,
  generateAccessToken,
  generateRefreshToken,
  requireAuth,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireSuperadmin,
  requireBusinessScope,
  requireAPIKey
};
