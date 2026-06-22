import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

export interface TenantContext {
  tenantId: string;
  userId: string;
  email?: string;
  roles?: string[];
}

export interface AuthenticatedRequest extends Request {
  tenant?: TenantContext;
  requestId?: string;
}

// Extend Express Request to include tenant context
declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
      requestId?: string;
    }
  }
}

/**
 * Extract tenant information from JWT token
 */
export function extractTenantFromToken(authHeader: string | undefined): TenantContext | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'default-secret';

    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;

    return {
      tenantId: decoded.tenantId || decoded.tenant_id || 'default',
      userId: decoded.userId || decoded.user_id || decoded.sub || 'anonymous',
      email: decoded.email,
      roles: decoded.roles || []
    };
  } catch (error) {
    logger.warn('Failed to verify JWT token', { error });
    return null;
  }
}

/**
 * Tenant middleware - extracts tenant context from request
 */
export function tenantMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Extract tenant from Authorization header
  const tenantContext = extractTenantFromToken(req.headers.authorization);

  if (tenantContext) {
    req.tenant = tenantContext;
    logger.debug('Tenant context set', { tenantId: tenantContext.tenantId });
  }

  next();
}

/**
 * Require tenant middleware - ensures tenant context exists
 */
export function requireTenant(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.tenant) {
    res.status(401).json({
      success: false,
      error: 'Tenant context required',
      code: 'TENANT_REQUIRED'
    });
    return;
  }

  next();
}

/**
 * Require specific role middleware
 */
export function requireRole(role: string) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.tenant) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const roles = req.tenant.roles || [];
    if (!roles.includes(role) && !roles.includes('admin')) {
      res.status(403).json({
        success: false,
        error: `Role '${role}' required`,
        code: 'ROLE_REQUIRED'
      });
      return;
    }

    next();
  };
}

/**
 * Optional tenant middleware - sets tenant if available but doesn't require it
 */
export function optionalTenant(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const tenantContext = extractTenantFromToken(req.headers.authorization);

  if (tenantContext) {
    req.tenant = tenantContext;
  }

  next();
}

/**
 * Request ID middleware - generates unique request ID
 */
export function requestIdMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string ||
                    `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}

/**
 * Combined auth middleware for API routes
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  requestIdMiddleware(req, res, () => {
    tenantMiddleware(req, res, () => {
      // For now, allow requests without tenant (will be rejected by specific routes if needed)
      next();
    });
  });
}

export default {
  extractTenantFromToken,
  tenantMiddleware,
  requireTenant,
  requireRole,
  optionalTenant,
  requestIdMiddleware,
  authMiddleware
};
