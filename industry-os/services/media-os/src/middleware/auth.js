/**
 * Media OS - Authentication Middleware
 * JWT authentication with CorpID integration
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../config/database');

/**
 * JWT Authentication Middleware
 * Validates JWT token and attaches user to request
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'NO_TOKEN',
    });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // Attach user info to request
    req.user = {
      id: decoded.sub || decoded.userId,
      email: decoded.email,
      role: decoded.role || 'viewer',
      businessId: decoded.businessId,
      corpid: decoded.corpid,
      permissions: decoded.permissions || [],
      industry: decoded.industry || 'media',
    };

    req.session = {
      token,
      userId: req.user.id,
      businessId: req.user.businessId,
      industry: req.user.industry,
      createdAt: decoded.iat * 1000,
      expiresAt: decoded.exp * 1000,
    };

    next();
  } catch (error) {
    logger.warn('JWT verification failed', {
      error: error.message,
      ip: req.ip,
      path: req.path,
    });

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_FAILED',
    });
  }
}

/**
 * Optional Authentication
 * Attaches user if token present, continues without user if not
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = {
      id: decoded.sub || decoded.userId,
      email: decoded.email,
      role: decoded.role || 'viewer',
      businessId: decoded.businessId,
      corpid: decoded.corpid,
      permissions: decoded.permissions || [],
    };
    next();
  } catch (error) {
    req.user = null;
    next();
  }
}

/**
 * Role-based Authorization
 * Checks if user has required role
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_USER',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed', {
        userId: req.user.id,
        role: req.user.role,
        required: allowedRoles,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'INSUFFICIENT_PERMISSION',
        required: allowedRoles,
      });
    }

    next();
  };
}

/**
 * Permission-based Authorization
 * Checks if user has specific permission
 */
function hasPermission(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_USER',
      });
    }

    const hasAllPermissions = requiredPermissions.every(
      perm => req.user.permissions.includes(perm)
    );

    if (!hasAllPermissions) {
      logger.warn('Permission check failed', {
        userId: req.user.id,
        permissions: req.user.permissions,
        required: requiredPermissions,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'MISSING_PERMISSION',
        required: requiredPermissions,
      });
    }

    next();
  };
}

/**
 * CorpID Verification Middleware
 * Verifies user identity through CorpID service
 */
async function verifyWithCorpID(req, res, next) {
  if (!req.user?.corpid) {
    // Skip CorpID verification if no corpid in token
    return next();
  }

  try {
    const axios = require('axios');
    const response = await axios.get(`${config.RTMN_SERVICES.CORPID}/api/verify/${req.user.corpid}`, {
      headers: {
        'Authorization': req.headers.authorization,
      },
      timeout: 5000,
    });

    if (response.data.verified) {
      req.user.corpidData = response.data;
      next();
    } else {
      return res.status(403).json({
        success: false,
        error: 'CorpID verification failed',
        code: 'CORPID_NOT_VERIFIED',
      });
    }
  } catch (error) {
    logger.error('CorpID verification error', {
      error: error.message,
      corpid: req.user.corpid,
    });

    // Continue without CorpID verification if service unavailable
    next();
  }
}

/**
 * Generate JWT Token
 */
function generateToken(payload, expiresIn = config.JWT_EXPIRES_IN) {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn });
}

/**
 * Generate Refresh Token
 */
function generateRefreshToken(payload) {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    config.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

/**
 * Verify Refresh Token
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    if (decoded.type !== 'refresh') {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  hasPermission,
  verifyWithCorpID,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
};
