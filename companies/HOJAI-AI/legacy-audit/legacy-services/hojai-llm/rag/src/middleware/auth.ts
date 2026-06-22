/**
 * HOJAI RAG Service - Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import config from '../config';
import { UnauthorizedError } from './error';

interface AuthenticatedRequest extends Request {
  serviceId?: string;
  tenantId?: string;
}

/**
 * Internal service authentication
 * Validates X-Internal-Token header for service-to-service calls
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  // Skip auth for health endpoints
  if (req.path === '/health' || req.path === '/') {
    return next();
  }

  const internalToken = req.headers['x-internal-token'] as string | undefined;

  // If no token required (development mode)
  if (!config.internalServiceToken) {
    return next();
  }

  // Validate token
  if (!internalToken) {
    return next(new UnauthorizedError('Missing X-Internal-Token header'));
  }

  if (internalToken !== config.internalServiceToken) {
    return next(new UnauthorizedError('Invalid service token'));
  }

  // Extract service info from headers
  req.serviceId = req.headers['x-service-id'] as string | undefined;
  req.tenantId = req.headers['x-tenant-id'] as string | undefined;

  return next();
}

/**
 * Optional auth - doesn't fail if no token present
 */
export function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const internalToken = req.headers['x-internal-token'] as string | undefined;

  if (internalToken && config.internalServiceToken) {
    if (internalToken === config.internalServiceToken) {
      req.serviceId = req.headers['x-service-id'] as string | undefined;
      req.tenantId = req.headers['x-tenant-id'] as string | undefined;
    }
  }

  return next();
}
