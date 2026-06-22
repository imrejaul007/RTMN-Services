// ============================================
// HOJAI AI - SDR Agent Authentication Middleware
// ============================================

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';

// Extend Express Request to include tenant context
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      userId?: string;
      userRoles?: string[];
      correlationId?: string;
    }
  }
}

// Environment configuration
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'dev-internal-token';
const INTERNAL_SERVICE_TOKENS_JSON = process.env.INTERNAL_SERVICE_TOKENS_JSON || '{}';

interface ServiceTokens {
  [serviceName: string]: string;
}

function getServiceTokens(): ServiceTokens {
  try {
    return JSON.parse(INTERNAL_SERVICE_TOKENS_JSON);
  } catch {
    return {};
  }
}

/**
 * Require internal service authentication
 * Used for service-to-service communication
 */
export function requireInternalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const internalToken = req.headers['x-internal-token'] as string;

  // Check Authorization header
  if (authHeader) {
    const [type, token] = authHeader.split(' ');

    if (type === 'Bearer' && token) {
      // Verify token against configured tokens
      const serviceTokens = getServiceTokens();
      const isValid = Object.values(serviceTokens).includes(token) || token === INTERNAL_SERVICE_TOKEN;

      if (isValid) {
        // Extract tenant from token or use default
        const tenantId = extractTenantFromToken(token) || 'default';
        req.tenantId = tenantId;
        req.userId = 'internal-service';
        req.correlationId = generateCorrelationId();

        logger.debug('Internal auth successful', { tenantId: req.tenantId });
        return next();
      }
    }
  }

  // Check X-Internal-Token header
  if (internalToken) {
    const serviceTokens = getServiceTokens();
    const isValid = Object.values(serviceTokens).includes(internalToken) || internalToken === INTERNAL_SERVICE_TOKEN;

    if (isValid) {
      const tenantId = extractTenantFromToken(internalToken) || 'default';
      req.tenantId = tenantId;
      req.userId = 'internal-service';
      req.correlationId = generateCorrelationId();

      return next();
    }
  }

  logger.warn('Unauthorized internal access attempt', {
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Invalid or missing authentication token'
    }
  });
}

/**
 * Optional tenant extraction from headers
 * Does not block if no tenant is provided
 */
export function extractTenant(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const tenantId = req.headers['x-tenant-id'] as string;

  if (tenantId) {
    // Validate tenant ID format
    if (!isValidTenantId(tenantId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TENANT',
          message: 'Invalid tenant ID format'
        }
      });
      return;
    }

    req.tenantId = tenantId;
  } else {
    // Default tenant for development
    req.tenantId = 'default';
  }

  req.correlationId = generateCorrelationId();
  next();
}

/**
 * Require specific tenant (fail if not provided)
 */
export function requireTenant(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const tenantId = req.headers['x-tenant-id'] as string;

  if (!tenantId) {
    res.status(400).json({
      success: false,
      error: {
        code: 'TENANT_REQUIRED',
        message: 'X-Tenant-Id header is required'
      }
    });
    return;
  }

  if (!isValidTenantId(tenantId)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_TENANT',
        message: 'Invalid tenant ID format'
      }
    });
    return;
  }

  req.tenantId = tenantId;
  req.correlationId = generateCorrelationId();
  next();
}

/**
 * Require user authentication (end-user)
 */
export function requireUserAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authorization header required'
      }
    });
    return;
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_AUTH',
        message: 'Invalid authorization format. Use: Bearer <token>'
      }
    });
    return;
  }

  // In production, verify JWT and extract user info
  // For now, we'll simulate verification
  try {
    const userPayload = verifyUserToken(token);

    req.userId = userPayload.userId;
    req.tenantId = userPayload.tenantId;
    req.userRoles = userPayload.roles;
    req.correlationId = generateCorrelationId();

    next();
  } catch (error) {
    logger.warn('User authentication failed', { error });
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      }
    });
  }
}

/**
 * Role-based access control
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userRoles || req.userRoles.length === 0) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'No roles assigned'
        }
      });
      return;
    }

    const hasRole = roles.some(role => req.userRoles!.includes(role));

    if (!hasRole) {
      logger.warn('Access denied - insufficient role', {
        userId: req.userId,
        requiredRoles: roles,
        userRoles: req.userRoles
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Required role: ${roles.join(' or ')}`
        }
      });
      return;
    }

    next();
  };
}

/**
 * Rate limiting middleware
 */
export function rateLimitByTenant(
  windowMs: number = 60 * 1000,
  max: number = 100
) {
  const requests = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantId = req.tenantId || req.ip || 'unknown';
    const now = Date.now();

    let record = requests.get(tenantId);

    if (!record || record.resetAt < now) {
      record = { count: 0, resetAt: now + windowMs };
      requests.set(tenantId, record);
    }

    record.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

    if (record.count > max) {
      logger.warn('Rate limit exceeded', { tenantId, count: record.count, limit: max });
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((record.resetAt - now) / 1000)
        }
      });
      return;
    }

    next();
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Validate tenant ID format
 * Must be alphanumeric with optional hyphens/underscores
 */
function isValidTenantId(tenantId: string): boolean {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(tenantId);
}

/**
 * Extract tenant from service token
 * Format: tenant:token or just token
 */
function extractTenantFromToken(token: string): string | null {
  const parts = token.split(':');
  if (parts.length >= 2 && isValidTenantId(parts[0])) {
    return parts[0];
  }
  return null;
}

/**
 * Generate correlation ID for request tracing
 */
function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Verify user JWT token
 * In production, use proper JWT verification
 */
interface UserPayload {
  userId: string;
  tenantId: string;
  roles: string[];
}

function verifyUserToken(token: string): UserPayload {
  // In production, verify JWT signature and expiration
  // For development, we'll decode without verification (NOT FOR PRODUCTION)
  try {
    // Simple base64 decode for development
    // In production: jwt.verify(token, secret)
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());

    if (!payload.userId) {
      throw new Error('Invalid token payload');
    }

    return {
      userId: payload.userId,
      tenantId: payload.tenantId || 'default',
      roles: payload.roles || []
    };
  } catch {
    throw new Error('Invalid token');
  }
}

export default {
  requireInternalAuth,
  extractTenant,
  requireTenant,
  requireUserAuth,
  requireRole,
  rateLimitByTenant
};
