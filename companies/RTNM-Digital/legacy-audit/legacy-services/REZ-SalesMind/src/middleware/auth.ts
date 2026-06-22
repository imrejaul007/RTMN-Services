/**
 * Authentication Middleware - Service-to-service auth
 */

import { Request, Response, NextFunction } from 'express';

const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

/**
 * Validate internal service token
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for health checks
  if (req.path === '/health' || req.path.startsWith('/health/')) {
    return next();
  }

  // Skip auth for status endpoint (it performs real checks)
  if (req.path === '/api/ecosystem/status') {
    return next();
  }

  // Get token from header
  const token = req.headers['x-internal-token'] as string;

  // If no token configured, allow all requests (development mode)
  if (!INTERNAL_TOKEN) {
    console.warn('WARNING: INTERNAL_SERVICE_TOKEN not set - auth disabled');
    return next();
  }

  // Validate token
  if (!token || token !== INTERNAL_TOKEN) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing X-Internal-Token header'
    });
    return;
  }

  next();
}
