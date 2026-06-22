/**
 * Hojai Model Registry - Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  tenantId?: string;
  userId?: string;
  clientType?: 'internal' | 'external';
}

/**
 * Simple API key authentication for service-to-service calls
 * In production, this should validate against a proper auth service
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const apiKey = req.headers['x-api-key'] as string | undefined;
  const internalToken = req.headers['x-internal-token'] as string | undefined;

  // Allow health checks without auth
  if (req.path === '/health' || req.path === '/') {
    next();
    return;
  }

  // Check for internal service token
  if (internalToken) {
    // In production, validate against INTERNAL_SERVICE_TOKENS_JSON
    const validToken = process.env.INTERNAL_SERVICE_TOKEN || 'internal-dev-token';
    if (internalToken === validToken) {
      req.clientType = 'internal';
      next();
      return;
    }
  }

  // Check for API key
  if (apiKey) {
    // In production, validate against registered API keys
    req.clientType = 'external';
    next();
    return;
  }

  // No auth provided - allow in development mode
  if (process.env.NODE_ENV !== 'production') {
    req.clientType = 'internal';
    next();
    return;
  }

  res.status(401).json({
    error: 'Unauthorized',
    message: 'API key or internal token required',
    statusCode: 401,
    timestamp: new Date().toISOString(),
  });
}
