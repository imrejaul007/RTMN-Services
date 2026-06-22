import { Request, Response, NextFunction } from 'express';

/**
 * Tenant Context Interface
 */
export interface TenantContext {
  tenantId: string;
  userId?: string;
  userName?: string;
}

/**
 * Extend Express Request to include tenant context
 */
declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

/**
 * Tenant Middleware - Extracts tenant information from headers
 *
 * Required headers:
 * - X-Tenant-Id: The tenant identifier
 *
 * Optional headers:
 * - X-User-Id: The user identifier
 * - X-User-Name: The user's name
 */
export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  const tenantId = req.headers['x-tenant-id'] as string;
  const userId = req.headers['x-user-id'] as string | undefined;
  const userName = req.headers['x-user-name'] as string | undefined;

  // If no tenant ID is provided, use default
  const resolvedTenantId = tenantId || process.env.DEFAULT_TENANT_ID || 'rez-system';

  req.tenantContext = {
    tenantId: resolvedTenantId,
    userId,
    userName,
  };

  next();
}

/**
 * Tenant Validation Middleware
 * Ensures tenant context is present
 */
export function requireTenant(req: Request, res: Response, next: NextFunction): void {
  if (!req.tenantContext?.tenantId) {
    res.status(400).json({
      success: false,
      error: 'Tenant ID is required',
      message: 'Please provide X-Tenant-Id header',
    });
    return;
  }

  next();
}

/**
 * Optional Tenant Middleware
 * Extracts tenant if present, but doesn't require it
 */
export function optionalTenant(req: Request, res: Response, next: NextFunction): void {
  const tenantId = req.headers['x-tenant-id'] as string;

  if (tenantId) {
    req.tenantContext = {
      tenantId,
      userId: req.headers['x-user-id'] as string | undefined,
      userName: req.headers['x-user-name'] as string | undefined,
    };
  }

  next();
}

/**
 * Get tenant context helper
 */
export function getTenantContext(req: Request): TenantContext {
  return req.tenantContext || {
    tenantId: process.env.DEFAULT_TENANT_ID || 'rez-system',
  };
}
