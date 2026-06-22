/**
 * HR Recruiter Agent - Authentication Middleware
 * Service-to-service authentication and authorization
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import type { ApiResponse } from '../types';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      tenantId?: string;
      roles?: string[];
      isInternal?: boolean;
    }
  }
}

// Valid internal service tokens (in production, use secrets manager)
const INTERNAL_SERVICE_TOKENS = new Map<string, string>();

// Initialize with environment variable if available
if (process.env.INTERNAL_SERVICE_TOKENS_JSON) {
  try {
    const tokens = JSON.parse(process.env.INTERNAL_SERVICE_TOKENS_JSON);
    for (const [service, token] of Object.entries(tokens)) {
      INTERNAL_SERVICE_TOKENS.set(service, token as string);
    }
  } catch (error) {
    console.warn('Failed to parse INTERNAL_SERVICE_TOKENS_JSON');
  }
}

/**
 * Validate internal service token using timing-safe comparison
 */
function validateInternalToken(token: string): boolean {
  // Check against configured tokens
  for (const [, validToken] of INTERNAL_SERVICE_TOKENS) {
    if (timingSafeEqual(token, validToken)) {
      return true;
    }
  }
  return false;
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Internal service authentication middleware
 * Used for service-to-service communication
 */
export function internalAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-internal-token'] as string;

  if (!token) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing internal service token',
      },
    };
    res.status(401).json(response);
    return;
  }

  if (!validateInternalToken(token)) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Invalid internal service token',
      },
    };
    res.status(403).json(response);
    return;
  }

  req.isInternal = true;
  next();
}

/**
 * User authentication middleware
 * Validates user JWT token
 */
export function userAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing authorization header',
      },
    };
    res.status(401).json(response);
    return;
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid authorization header format',
      },
    };
    res.status(401).json(response);
    return;
  }

  // In production, validate JWT token here
  // For now, we'll use a simplified validation
  try {
    // Decode token (simplified - in production use proper JWT validation)
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      // JWT format detected - decode payload
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());

      req.userId = payload.userId || payload.sub;
      req.tenantId = payload.tenantId || 'default';
      req.roles = payload.roles || [];
    } else {
      // Simple API key format
      req.userId = token;
      req.tenantId = req.headers['x-tenant-id'] as string || 'default';
    }

    next();
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid token',
      },
    };
    res.status(401).json(response);
    return;
  }
}

/**
 * Combined auth middleware
 * Accepts either internal service token or user JWT
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const internalToken = req.headers['x-internal-token'] as string;

  if (internalToken) {
    return internalAuth(req, res, next);
  }

  return userAuth(req, res, next);
}

/**
 * Role-based authorization middleware
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.roles || req.roles.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'No roles assigned to user',
        },
      };
      res.status(403).json(response);
      return;
    }

    const hasRole = req.roles.some(role => allowedRoles.includes(role));

    if (!hasRole) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Required role: ${allowedRoles.join(' or ')}`,
        },
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
}

/**
 * Tenant isolation middleware
 */
export function tenantIsolation(req: Request, res: Response, next: NextFunction): void {
  const tenantId = req.headers['x-tenant-id'] as string || req.tenantId;

  if (!tenantId) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'TENANT_REQUIRED',
        message: 'Tenant ID is required',
      },
    };
    res.status(400).json(response);
    return;
  }

  req.tenantId = tenantId;
  next();
}

/**
 * Optional auth - doesn't fail if no token provided
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const internalToken = req.headers['x-internal-token'] as string;
  const authHeader = req.headers.authorization;

  if (internalToken) {
    return internalAuth(req, res, next);
  }

  if (authHeader) {
    return userAuth(req, res, next);
  }

  // No auth provided, continue without user context
  next();
}
