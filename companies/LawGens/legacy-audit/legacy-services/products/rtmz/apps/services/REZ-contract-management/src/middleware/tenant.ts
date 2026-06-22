import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface TenantContext {
  tenantId: string;
  userId?: string;
  userEmail?: string;
  userRoles?: string[];
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const tenantId = req.headers['x-tenant-id'] as string;

  if (!tenantId) {
    res.status(400).json({
      success: false,
      error: 'X-Tenant-ID header is required'
    });
    return;
  }

  if (!isValidTenantId(tenantId)) {
    res.status(400).json({
      success: false,
      error: 'Invalid tenant ID format'
    });
    return;
  }

  req.tenantContext = {
    tenantId: tenantId.trim(),
    userId: req.headers['x-user-id'] as string,
    userEmail: req.headers['x-user-email'] as string,
    userRoles: req.headers['x-user-roles']
      ? (req.headers['x-user-roles'] as string).split(',').map(r => r.trim())
      : undefined
  };

  logger.debug('Tenant context set', {
    tenantId,
    userId: req.tenantContext.userId,
    path: req.path
  });

  next();
};

export const optionalTenantMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const tenantId = req.headers['x-tenant-id'] as string;

  if (tenantId && isValidTenantId(tenantId)) {
    req.tenantContext = {
      tenantId: tenantId.trim(),
      userId: req.headers['x-user-id'] as string,
      userEmail: req.headers['x-user-email'] as string,
      userRoles: req.headers['x-user-roles']
        ? (req.headers['x-user-roles'] as string).split(',').map(r => r.trim())
        : undefined
    };
  }

  next();
};

function isValidTenantId(tenantId: string): boolean {
  if (!tenantId || typeof tenantId !== 'string') {
    return false;
  }

  const trimmed = tenantId.trim();

  if (trimmed.length < 1 || trimmed.length > 100) {
    return false;
  }

  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(trimmed);
}

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.tenantContext) {
      res.status(401).json({
        success: false,
        error: 'Tenant context not set'
      });
      return;
    }

    const userRoles = req.tenantContext.userRoles || [];

    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole && !userRoles.includes('admin')) {
      logger.warn('Access denied - insufficient role', {
        tenantId: req.tenantContext.tenantId,
        userId: req.tenantContext.userId,
        requiredRoles: roles,
        userRoles
      });

      res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

export const getTenantId = (req: Request): string | null => {
  return req.tenantContext?.tenantId || null;
};

export const getUserId = (req: Request): string | null => {
  return req.tenantContext?.userId || null;
};
