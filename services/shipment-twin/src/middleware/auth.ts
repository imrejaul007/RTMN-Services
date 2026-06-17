import { Request, Response, NextFunction } from 'express';
import { AppError, UnauthorizedError } from '../utils/errors';

export interface AuthenticatedRequest extends Request {
  tenantId?: string;
  userId?: string;
  roles?: string[];
}

// Simple API key authentication for service-to-service communication
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check for API key in header
    const apiKey = req.headers['x-api-key'] as string;
    const authHeader = req.headers.authorization;

    if (apiKey) {
      // Validate API key format (simplified for demo)
      // In production, validate against stored keys
      req.tenantId = req.headers['x-tenant-id'] as string || 'default';
      next();
      return;
    }

    if (authHeader?.startsWith('Bearer ')) {
      // In production, validate JWT token
      // For now, extract tenant from token payload
      const token = authHeader.substring(7);
      // TODO: Validate JWT and extract claims
      req.tenantId = 'default';
      next();
      return;
    }

    // Allow unauthenticated access for health checks and public endpoints
    if (req.path === '/health' || req.path === '/healthz') {
      next();
      return;
    }

    // For development, allow access with tenant header
    if (process.env.NODE_ENV !== 'production') {
      req.tenantId = req.headers['x-tenant-id'] as string || 'default';
      next();
      return;
    }

    throw new UnauthorizedError('Authentication required');
  } catch (error) {
    next(error);
  }
};

// Tenant isolation middleware
export const requireTenant = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.tenantId) {
    next(new UnauthorizedError('Tenant ID required'));
    return;
  }
  next();
};

// Role-based access control
export const requireRole = (...roles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.roles || !req.roles.some((role) => roles.includes(role))) {
      next(new AppError(403, 'Insufficient permissions'));
      return;
    }
    next();
  };
};
