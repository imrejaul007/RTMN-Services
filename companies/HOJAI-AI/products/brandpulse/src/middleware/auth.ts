import { Request, Response, NextFunction } from 'express';

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

export interface AuthRequest extends Request {
  tenantId?: string;
  userId?: string;
  apiKey?: string;
}

/**
 * API Key authentication middleware
 */
export function apiKeyAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;
  const authHeader = req.headers['authorization'] as string;

  // Check API key in header
  if (apiKey) {
    if (apiKey === process.env.API_KEY) {
      req.apiKey = apiKey;
      next();
      return;
    }
  }

  // Check Bearer token
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token === process.env.API_KEY) {
      req.apiKey = token;
      next();
      return;
    }
  }

  res.status(401).json({
    success: false,
    error: 'Invalid or missing API key'
  });
}

/**
 * Internal service authentication
 */
export function internalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers['x-internal-token'] as string;

  if (token === process.env.INTERNAL_SERVICE_TOKEN) {
    next();
    return;
  }

  // Also accept API key for internal calls
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey === process.env.API_KEY) {
    next();
    return;
  }

  res.status(401).json({
    success: false,
    error: 'Unauthorized'
  });
}

/**
 * Optional authentication - doesn't fail if no auth
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;
  const internalToken = req.headers['x-internal-token'] as string;

  if (apiKey === process.env.API_KEY || internalToken === process.env.INTERNAL_SERVICE_TOKEN) {
    req.apiKey = apiKey;
    next();
    return;
  }

  // Continue without auth
  next();
}

/**
 * Tenant extraction middleware
 */
export function extractTenant(req: AuthRequest, res: Response, next: NextFunction): void {
  const tenantId = req.headers['x-tenant-id'] as string;

  if (tenantId) {
    req.tenantId = tenantId;
  }

  next();
}

/**
 * Rate limiting middleware
 */
export function rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  const requests = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const record = requests.get(key);

    if (!record || now > record.resetAt) {
      requests.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (record.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((record.resetAt - now) / 1000)
      });
      return;
    }

    record.count++;
    next();
  };
}