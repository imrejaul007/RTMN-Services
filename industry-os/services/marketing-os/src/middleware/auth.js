/**
 * Marketing OS - JWT Authentication Middleware
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../config/logger');

/**
 * Generate JWT token
 */
function generateToken(user) {
  const payload = {
    id: user.id || user._id,
    email: user.email,
    role: user.role || 'user',
    organizationId: user.organizationId,
    permissions: user.permissions || [],
  };

  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  return jwt.verify(token, config.JWT_SECRET);
}

/**
 * Authentication middleware
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    req.userId = decoded.id;
    req.organizationId = decoded.organizationId;
    next();
  } catch (error) {
    logger.warn('Authentication failed', { error: error.message });

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  }
}

/**
 * Authorization middleware - check role
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Authorization failed', {
        userId: req.userId,
        userRole: req.user.role,
        requiredRoles: roles,
      });

      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'FORBIDDEN',
      });
    }

    next();
  };
}

/**
 * Authorization middleware - check permission
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const permissions = req.user.permissions || [];

    // Admin has all permissions
    if (req.user.role === 'admin' || permissions.includes('all')) {
      return next();
    }

    if (!permissions.includes(permission)) {
      logger.warn('Permission denied', {
        userId: req.userId,
        permission,
        userPermissions: permissions,
      });

      return res.status(403).json({
        success: false,
        error: 'Permission denied',
        code: 'PERMISSION_DENIED',
        required: permission,
      });
    }

    next();
  };
}

/**
 * Optional authentication - continues even without token
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    req.userId = decoded.id;
    req.organizationId = decoded.organizationId;
  } catch (error) {
    // Continue without authentication
  }

  next();
}

/**
 * Rate limiting by user
 */
function rateLimitByUser(limit = 100, windowMs = 60000) {
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.userId || req.ip;
    const now = Date.now();

    // Clean old entries
    if (requests.has(userId)) {
      const userRequests = requests.get(userId);
      requests.set(
        userId,
        userRequests.filter(time => now - time < windowMs)
      );
    }

    const userRequests = requests.get(userId) || [];

    if (userRequests.length >= limit) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    userRequests.push(now);
    requests.set(userId, userRequests);

    next();
  };
}

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  requirePermission,
  optionalAuth,
  rateLimitByUser,
};
