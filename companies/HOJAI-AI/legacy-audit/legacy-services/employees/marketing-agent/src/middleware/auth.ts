// ============================================
// HOJAI AI - Authentication Middleware
// ============================================

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      userId?: string;
      roles?: string[];
    }
  }
}

/**
 * Internal service authentication middleware
 * Validates X-Internal-Token header for service-to-service communication
 */
export function requireInternalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const internalToken = req.headers['x-internal-token'] as string;

  if (!internalToken) {
    logger.warn('Missing internal token', {
      path: req.path,
      ip: req.ip
    });

    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Internal token is required'
      }
    });
    return;
  }

  const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;

  if (!expectedToken) {
    logger.error('INTERNAL_SERVICE_TOKEN not configured');
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIGURATION_ERROR',
        message: 'Server authentication not configured'
      }
    });
    return;
  }

  // Timing-safe comparison to prevent timing attacks
  const tokenBuffer = Buffer.from(internalToken);
  const expectedBuffer = Buffer.from(expectedToken);

  if (tokenBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(tokenBuffer, expectedBuffer)) {
    logger.warn('Invalid internal token', {
      path: req.path,
      ip: req.ip
    });

    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid internal token'
      }
    });
    return;
  }

  // Extract tenant ID from header if present
  req.tenantId = (req.headers['x-tenant-id'] as string) || 'default';
  req.userId = req.headers['x-user-id'] as string;
  req.roles = req.headers['x-roles']
    ? (req.headers['x-roles'] as string).split(',')
    : [];

  next();
}

/**
 * Optional internal auth - sets tenant context if token is valid
 */
export function optionalInternalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const internalToken = req.headers['x-internal-token'] as string;

  if (!internalToken) {
    // No auth provided, continue without tenant context
    req.tenantId = 'default';
    next();
    return;
  }

  const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;

  if (!expectedToken) {
    req.tenantId = 'default';
    next();
    return;
  }

  // Timing-safe comparison
  try {
    const tokenBuffer = Buffer.from(internalToken);
    const expectedBuffer = Buffer.from(expectedToken);

    if (tokenBuffer.length === expectedBuffer.length &&
        crypto.timingSafeEqual(tokenBuffer, expectedBuffer)) {
      req.tenantId = (req.headers['x-tenant-id'] as string) || 'default';
      req.userId = req.headers['x-user-id'] as string;
      req.roles = req.headers['x-roles']
        ? (req.headers['x-roles'] as string).split(',')
        : [];
    } else {
      req.tenantId = 'default';
    }
  } catch {
    req.tenantId = 'default';
  }

  next();
}

/**
 * Validate tenant ID format
 */
export function requireTenantId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.tenantId) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_TENANT',
        message: 'Tenant ID is required'
      }
    });
    return;
  }

  // Basic format validation (alphanumeric, dashes, underscores)
  const tenantIdPattern = /^[a-zA-Z0-9_-]+$/;
  if (!tenantIdPattern.test(req.tenantId)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_TENANT',
        message: 'Invalid tenant ID format'
      }
    });
    return;
  }

  next();
}

/**
 * Rate limiting by tenant
 */
export function createTenantRateLimiter(
  maxRequests: number,
  windowMs: number
) {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantId = req.tenantId || 'anonymous';
    const now = Date.now();

    let tenantData = requestCounts.get(tenantId);

    if (!tenantData || now > tenantData.resetTime) {
      tenantData = {
        count: 0,
        resetTime: now + windowMs
      };
      requestCounts.set(tenantId, tenantData);
    }

    tenantData.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - tenantData.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(tenantData.resetTime / 1000));

    if (tenantData.count > maxRequests) {
      logger.warn('Rate limit exceeded', {
        tenantId,
        path: req.path,
        count: tenantData.count
      });

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil((tenantData.resetTime - now) / 1000)
        }
      });
      return;
    }

    next();
  };
}
