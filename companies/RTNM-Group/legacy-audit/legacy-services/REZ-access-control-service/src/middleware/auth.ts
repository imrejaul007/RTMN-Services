import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';

/**
 * Internal Service Authentication Middleware
 * Authenticates requests from internal services using a shared token
 */

interface ServiceAuthConfig {
  validTokens: Map<string, { service: string; permissions: string[] }>;
}

const config: ServiceAuthConfig = {
  validTokens: new Map()
};

// Initialize tokens from environment
function initializeTokens(): void {
  const tokensJson = process.env.INTERNAL_SERVICE_TOKENS_JSON;
  if (tokensJson) {
    try {
      const tokens = JSON.parse(tokensJson);
      for (const [service, token] of Object.entries(tokens)) {
        config.validTokens.set(token as string, {
          service,
          permissions: getServicePermissions(service)
        });
      }
      logger.info(`Loaded ${config.validTokens.size} internal service tokens`);
    } catch (error) {
      logger.error('Failed to parse INTERNAL_SERVICE_TOKENS_JSON:', error);
    }
  }
}

function getServicePermissions(service: string): string[] {
  // Define permissions per service
  const permissions: Record<string, string[]> = {
    'admin-panel': ['read', 'write', 'delete'],
    'payment-service': ['read', 'write'],
    'identity-service': ['read', 'write'],
    'capital-service': ['read', 'write'],
    'bnpl-service': ['read', 'write'],
    'ops-center': ['read'],
    'trust-platform': ['read'],
  };
  return permissions[service] || ['read'];
}

// Initialize on module load
initializeTokens();

export interface AuthenticatedRequest extends Request {
  serviceId?: string;
  servicePermissions?: string[];
}

/**
 * Authenticate internal service requests
 */
export function internalServiceAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = req.headers['x-internal-token'] as string;

  if (!token) {
    logger.warn('Missing internal service token', {
      path: req.path,
      ip: req.ip
    });
    res.status(401).json({
      error: 'Unauthorized',
      code: 'MISSING_TOKEN',
      message: 'X-Internal-Token header is required'
    });
    return;
  }

  const serviceInfo = config.validTokens.get(token);

  if (!serviceInfo) {
    logger.warn('Invalid internal service token', {
      path: req.path,
      ip: req.ip
    });
    res.status(401).json({
      error: 'Unauthorized',
      code: 'INVALID_TOKEN',
      message: 'Invalid service token'
    });
    return;
  }

  // Attach service info to request
  const authReq = req as AuthenticatedRequest;
  authReq.serviceId = serviceInfo.service;
  authReq.servicePermissions = serviceInfo.permissions;

  logger.debug('Internal service authenticated', {
    service: serviceInfo.service,
    path: req.path
  });

  next();
}

/**
 * Require specific permissions for an endpoint
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    const permissions = authReq.servicePermissions || [];

    if (!permissions.includes(permission)) {
      logger.warn('Insufficient permissions', {
        service: authReq.serviceId,
        required: permission,
        available: permissions
      });
      res.status(403).json({
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Required permission: ${permission}`
      });
      return;
    }

    next();
  };
}

/**
 * Generate a new service token (for setup/admin use)
 */
export function generateServiceToken(service: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  config.validTokens.set(token, {
    service,
    permissions: getServicePermissions(service)
  });
  return token;
}
