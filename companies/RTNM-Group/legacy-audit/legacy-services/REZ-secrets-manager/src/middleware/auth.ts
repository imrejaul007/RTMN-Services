import { Request, Response, NextFunction } from 'express';
import { accessControlService } from '../services';
import { createLogger } from '../utils/logger';

const logger = createLogger('auth-middleware');

export interface AuthenticatedRequest extends Request {
  serviceId?: string;
  serviceName?: string;
  permissions?: string[];
  isAdmin?: boolean;
}

/**
 * Extracts service ID from request headers or API key
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check for internal service token first
    const internalToken = req.headers['x-internal-token'] as string;
    const serviceToken = req.headers['x-service-token'] as string;
    const apiKey = req.headers['x-api-key'] as string;

    // Internal token for service-to-service communication
    if (internalToken) {
      const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;

      if (expectedToken && internalToken === expectedToken) {
        req.serviceId = 'internal';
        req.serviceName = 'internal-service';
        req.permissions = ['*'];
        req.isAdmin = true;
        return next();
      }
    }

    // API key authentication
    if (apiKey) {
      const result = await accessControlService.authenticateService(apiKey);

      if (result.success && result.service) {
        req.serviceId = result.service.serviceId;
        req.serviceName = result.service.serviceName;
        req.permissions = result.service.permissions;
        req.isAdmin = result.service.permissions.includes('*');
        return next();
      }
    }

    // Service token (legacy format)
    if (serviceToken) {
      const serviceId = req.headers['x-service-id'] as string;
      if (serviceId) {
        const service = await accessControlService.getService(serviceId);
        if (service && service.isActive) {
          req.serviceId = service.serviceId;
          req.serviceName = service.serviceName;
          req.permissions = service.permissions;
          req.isAdmin = service.permissions.includes('*');
          return next();
        }
      }
    }

    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing authentication'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Authentication error', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
      },
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Middleware to require admin permissions
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.isAdmin) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin privileges required'
      },
      timestamp: new Date().toISOString()
    });
    return;
  }
  next();
}

/**
 * Middleware to require specific permission
 */
export function requirePermission(permission: string) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.permissions) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!req.permissions.includes('*') && !req.permissions.includes(permission)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Permission "${permission}" required`
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
}

/**
 * Extracts client IP from request
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}
