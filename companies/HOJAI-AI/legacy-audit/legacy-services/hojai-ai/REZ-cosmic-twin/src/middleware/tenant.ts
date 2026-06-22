import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export interface TenantContext {
  tenantId: string;
  userId?: string;
}

/**
 * Extract tenant ID from request headers
 * Supports multiple header formats for flexibility
 */
function extractTenantId(req: Request): string | undefined {
  // Standard header
  const headerTenant = req.headers['x-tenant-id'];
  if (typeof headerTenant === 'string') {
    return headerTenant;
  }

  // Array (multiple values - take first)
  if (Array.isArray(headerTenant)) {
    return headerTenant[0] as string;
  }

  // Alternative header
  const altTenant = req.headers['tenant-id'];
  if (typeof altTenant === 'string') {
    return altTenant;
  }

  // From auth token or JWT (if decoded)
  const decodedTenant = (req as Request & { user?: { tenantId?: string } }).user?.tenantId;
  if (decodedTenant) {
    return decodedTenant;
  }

  return undefined;
}

/**
 * Extract user ID from request headers or auth
 */
function extractUserId(req: Request): string | undefined {
  const headerUser = req.headers['x-user-id'];
  if (typeof headerUser === 'string') {
    return headerUser;
  }

  const authUser = (req as Request & { user?: { id?: string; userId?: string } }).user?.id ||
                   (req as Request & { user?: { id?: string; userId?: string } }).user?.userId;
  if (authUser) {
    return authUser;
  }

  return undefined;
}

/**
 * Middleware to extract and attach tenant context to request
 */
export function tenantMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const tenantId = extractTenantId(req);
  const userId = extractUserId(req);

  // Attach tenant context to request
  (req as Request & { tenantContext?: TenantContext }).tenantContext = {
    tenantId: tenantId || 'default',
    userId,
  };

  // Log tenant context for debugging (in development only)
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Tenant context', { tenantId, userId, path: req.path });
  }

  next();
}

/**
 * Middleware to require tenant ID (strict mode)
 * Returns 400 if no tenant ID is provided
 */
export function requireTenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  const tenantId = extractTenantId(req);

  if (!tenantId) {
    res.status(400).json({
      error: 'Missing required header',
      message: 'x-tenant-id header is required',
    });
    return;
  }

  (req as Request & { tenantContext?: TenantContext }).tenantContext = {
    tenantId,
    userId: extractUserId(req),
  };

  next();
}

/**
 * Helper to get tenant context from request
 */
export function getTenantContext(req: Request): TenantContext {
  return (req as Request & { tenantContext?: TenantContext }).tenantContext || {
    tenantId: 'default',
  };
}

/**
 * Helper to get tenant ID from request
 */
export function getTenantId(req: Request): string {
  return getTenantContext(req).tenantId;
}

/**
 * Helper to get user ID from request
 */
export function getUserId(req: Request): string | undefined {
  return getTenantContext(req).userId;
}
