/**
 * Shared Authentication Middleware for RTMN Department OS
 *
 * This middleware provides standardized JWT authentication for all Department OS services.
 * It validates tokens using CorpID service or a shared secret.
 *
 * Usage:
 *   const { authMiddleware, requireRole } = require('./shared/auth-middleware');
 *   app.use('/api', authMiddleware);
 *
 * Environment Variables:
 *   - AUTH_MODE: 'jwt' | 'apikey' | 'none' (default: 'jwt')
 *   - JWT_SECRET: Secret for JWT validation (required for jwt mode)
 *   - CORPID_URL: CorpID service URL (default: http://localhost:4702)
 *   - SERVICE_NAME: Name of this service for logging
 */

const jwt = require('jsonwebtoken');

// Default configuration
const config = {
  mode: process.env.AUTH_MODE || 'jwt',
  jwtSecret: process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'rtmn-shared-secret-change-in-production',
  corpIdUrl: process.env.CORPID_URL || 'http://localhost:4702',
  serviceName: process.env.SERVICE_NAME || 'department-os',
  issuer: process.env.JWT_ISSUER || 'rtmn-auth',
};

/**
 * Parse Authorization header
 */
function parseAuthHeader(authHeader) {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Validate JWT token
 */
function validateJWT(token) {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      issuer: config.issuer,
      algorithms: ['HS256', 'RS256'],
    });
    return { valid: true, payload: decoded };
  } catch (error) {
    // Try without issuer verification for backwards compatibility
    try {
      const decoded = jwt.verify(token, config.jwtSecret, {
        algorithms: ['HS256', 'RS256'],
      });
      return { valid: true, payload: decoded };
    } catch {
      return { valid: false, error: error.message };
    }
  }
}

/**
 * API Key authentication
 */
function validateAPIKey(apiKey) {
  const validKey = process.env.VALID_API_KEYS || '';
  const keys = validKey.split(',').map(k => k.trim()).filter(Boolean);
  return keys.includes(apiKey);
}

/**
 * Extract user info from request
 */
function extractUserInfo(req, decoded) {
  return {
    userId: decoded.userId || decoded.sub || decoded.id,
    email: decoded.email,
    name: decoded.name || `${decoded.firstName || ''} ${decoded.lastName || ''}`.trim(),
    roles: decoded.roles || decoded.role ? [decoded.role].flat() : [],
    tenantId: decoded.tenantId || decoded.tenant_id || 'default',
    permissions: decoded.permissions || [],
    sessionId: decoded.sessionId || decoded.sid,
    exp: decoded.exp,
    iat: decoded.iat,
  };
}

/**
 * Main authentication middleware
 *
 * @param {Object} options - Configuration options
 * @param {string[]} options.exclude - Paths to exclude from auth
 * @param {string[]} options.requiredRoles - Roles that must be present
 * @param {boolean} options.optional - Don't fail if no token (default: false)
 */
function authMiddleware(options = {}) {
  const {
    exclude = ['/health', '/ready', '/api/health', '/api/ready'],
    requiredRoles = [],
    optional = false,
  } = options;

  return (req, res, next) => {
    // Skip excluded paths
    const path = req.path || req.url.split('?')[0];
    if (exclude.some(p => path.startsWith(p))) {
      return next();
    }

    // No auth mode
    if (config.mode === 'none') {
      req.user = { userId: 'anonymous', roles: ['guest'] };
      return next();
    }

    // API Key mode
    if (config.mode === 'apikey') {
      const apiKey = req.headers['x-api-key'] || req.headers['api-key'];
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'API key required' },
        });
      }

      if (!validateAPIKey(apiKey)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Invalid API key' },
        });
      }

      req.user = { userId: 'api-user', roles: ['api'] };
      return next();
    }

    // JWT mode (default)
    const token = parseAuthHeader(req.headers.authorization);

    if (!token) {
      if (optional) {
        req.user = null;
        return next();
      }
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const result = validateJWT(token);

    if (!result.valid) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        details: process.env.NODE_ENV !== 'production' ? result.error : undefined,
      });
    }

    const user = extractUserInfo(req, result.payload);
    req.user = user;

    // Check required roles
    if (requiredRoles.length > 0) {
      const hasRole = requiredRoles.some(role => user.roles.includes(role));
      if (!hasRole) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Required role: ${requiredRoles.join(' or ')}`,
          },
          userRoles: user.roles,
        });
      }
    }

    next();
  };
}

/**
 * Role-based access control middleware factory
 *
 * @param {string[]} roles - Allowed roles
 */
function requireRole(...roles) {
  return authMiddleware({ requiredRoles: roles });
}

/**
 * Tenant isolation middleware
 * Ensures users can only access their own tenant's data
 */
function requireTenant(options = {}) {
  const {
    paramName = 'tenantId',
    headerName = 'x-tenant-id',
    required = true,
  } = options;

  return (req, res, next) => {
    // Get tenant from params, body, or header
    const tenantFromParam = req.params[paramName];
    const tenantFromHeader = req.headers[headerName.toLowerCase()];
    const tenantFromBody = req.body && req.body[paramName];
    const tenantFromQuery = req.query[paramName];

    const tenant = tenantFromParam || tenantFromHeader || tenantFromBody || tenantFromQuery;

    if (!tenant && required) {
      // Check if user has tenant in their token
      if (req.user && req.user.tenantId) {
        req.tenantId = req.user.tenantId;
        return next();
      }
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Tenant ID required' },
      });
    }

    req.tenantId = tenant || req.user?.tenantId || 'default';
    next();
  };
}

/**
 * Permission check middleware
 *
 * @param {string} permission - Required permission
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const hasPermission = req.user.permissions.includes(permission) ||
                         req.user.roles.includes('admin') ||
                         req.user.roles.includes('superadmin');

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Permission required: ${permission}`,
        },
      });
    }

    next();
  };
}

/**
 * Generate a JWT token (for testing)
 */
function generateToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, config.jwtSecret, {
    issuer: config.issuer,
    expiresIn,
  });
}

/**
 * Verify a token without throwing
 */
function verifyToken(token) {
  return validateJWT(token);
}

module.exports = {
  authMiddleware,
  requireRole,
  requireTenant,
  requirePermission,
  generateToken,
  verifyToken,
  config,
};
