import { Request, Response, NextFunction } from 'express';

// Tenant ID middleware
export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.headers['x-tenant-id'] as string;

  if (!tenantId) {
    // For development, use default tenant
    if (process.env.NODE_ENV === 'development') {
      (req as any).tenantId = 'default';
      next();
    } else {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'X-Tenant-ID header is required'
      });
    }
    return;
  }

  (req as any).tenantId = tenantId;
  next();
}

// API Key middleware
export function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    // Skip if no API key configured
    next();
    return;
  }

  if (!apiKey || apiKey !== validApiKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    });
    return;
  }

  next();
}

// Rate limiting middleware (simple in-memory implementation)
const rateLimitStore: Map<string, { count: number; resetAt: number }> = new Map();

export function rateLimitMiddleware(
  windowMs: number = 60000,
  maxRequests: number = 100
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = (req as any).tenantId || req.ip || 'unknown';
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + windowMs };
      rateLimitStore.set(key, record);
      next();
      return;
    }

    record.count++;

    if (record.count > maxRequests) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((record.resetAt - now) / 1000)
      });
      return;
    }

    next();
  };
}

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });

  next();
}

// Error handler middleware
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: err.name || 'Error',
    message,
    status,
    timestamp: new Date().toISOString(),
    path: req.path
  });
}

// Multi-tenant data isolation middleware
export function tenantIsolation(tenantField: string = 'tenantId') {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenantId = (req as any).tenantId;

    if (tenantId && req.body && typeof req.body === 'object') {
      // Ensure tenant ID is set in request body
      if (!req.body[tenantField]) {
        req.body[tenantField] = tenantId;
      }

      // Verify tenant ID matches for security
      if (req.body[tenantField] !== tenantId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Tenant ID mismatch'
        });
        return;
      }
    }

    next();
  };
}

export default {
  tenantMiddleware,
  apiKeyMiddleware,
  rateLimitMiddleware,
  requestLogger,
  errorHandler,
  tenantIsolation
};
