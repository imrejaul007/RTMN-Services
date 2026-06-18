/**
 * RTMN TwinOS Shared - Authentication Middleware
 * Provides JWT-based authentication and role-based access control
 */

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// In-memory session store (replace with Redis in production)
const sessions = new Map();
const REFRESH_TOKENS = new Map();

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'rtmn-twin-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '7d';
const TOKEN_ISSUER = 'rtmn-twinos';

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 12);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password, hash) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}

/**
 * Generate access token
 */
export function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      type: 'access'
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: TOKEN_ISSUER,
      jwtid: uuidv4()
    }
  );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(user) {
  const token = jwt.sign(
    {
      sub: user.id,
      type: 'refresh'
    },
    JWT_SECRET,
    {
      expiresIn: REFRESH_EXPIRES_IN,
      issuer: TOKEN_ISSUER
    }
  );

  // Store refresh token with metadata
  REFRESH_TOKENS.set(token, {
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
  });

  return token;
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokens(user) {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
    expiresIn: JWT_EXPIRES_IN
  };
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, { issuer: TOKEN_ISSUER });
  } catch (error) {
    return null;
  }
}

/**
 * Authentication middleware - requires valid JWT
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'No token provided'
      }
    });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      }
    });
  }

  if (decoded.type !== 'access') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN_TYPE',
        message: 'Invalid token type'
      }
    });
  }

  // Attach user info to request
  req.user = {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
    businessId: decoded.businessId
  };

  next();
}

/**
 * Optional authentication - attaches user if token present
 */
export function optionalAuth(req, res, next) {
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
      businessId: decoded.businessId
    };
  } else {
    req.user = null;
  }

  next();
}

/**
 * Role-based access control middleware factory
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
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Required role: ${allowedRoles.join(' or ')}`
        }
      });
    }

    next();
  };
}

/**
 * Business scope validation - ensure user can only access their business data
 */
export function requireBusiness(businessIdParam = 'businessId') {
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

    // Admins can access any business
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      return next();
    }

    const requestedBusiness = req.params[businessIdParam] || req.body[businessIdParam] || req.query[businessIdParam];

    if (requestedBusiness && requestedBusiness !== req.user.businessId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'BUSINESS_SCOPE',
          message: 'Access denied to this business'
        }
      });
    }

    // Auto-assign business ID from user context
    if (!requestedBusiness) {
      req.businessId = req.user.businessId;
    }

    next();
  };
}

/**
 * Refresh token endpoint handler
 */
export async function refreshTokens(req, res) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_TOKEN',
        message: 'Refresh token required'
      }
    });
  }

  // Verify refresh token
  const decoded = verifyToken(refreshToken);

  if (!decoded || decoded.type !== 'refresh') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid refresh token'
      }
    });
  }

  // Check if refresh token is in store
  const tokenData = REFRESH_TOKENS.get(refreshToken);

  if (!tokenData || tokenData.expiresAt < Date.now()) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'EXPIRED_REFRESH_TOKEN',
        message: 'Refresh token expired or revoked'
      }
    });
  }

  // Revoke old refresh token
  REFRESH_TOKENS.delete(refreshToken);

  // Generate new tokens
  const user = {
    id: decoded.sub,
    email: tokenData.email,
    role: tokenData.role,
    businessId: tokenData.businessId
  };

  const tokens = generateTokens(user);

  res.json({
    success: true,
    ...tokens
  });
}

/**
 * Revoke all sessions for a user
 */
export function revokeUserSessions(userId) {
  for (const [token, data] of REFRESH_TOKENS.entries()) {
    if (data.userId === userId) {
      REFRESH_TOKENS.delete(token);
    }
  }
}

/**
 * Get current user info from token
 */
export function getCurrentUser(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  return verifyToken(token);
}

export default {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyToken,
  requireAuth,
  optionalAuth,
  requireRole,
  requireBusiness,
  refreshTokens,
  revokeUserSessions,
  getCurrentUser
};
