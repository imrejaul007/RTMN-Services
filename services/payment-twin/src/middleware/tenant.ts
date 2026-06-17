import { Request, Response, NextFunction } from 'express';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      requestId?: string;
    }
  }
}

/**
 * Middleware to extract tenant ID from request headers
 * Falls back to default tenant if not provided
 */
export function tenantMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const tenantId = req.headers['x-tenant-id'] as string;
  req.tenantId = tenantId || process.env.DEFAULT_TENANT || 'rtmn';
  next();
}

/**
 * Middleware to generate or extract request ID
 */
export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.requestId = (req.headers['x-request-id'] as string) || generateRequestId();
  next();
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * CORS middleware configuration
 */
export function corsMiddleware() {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-ID',
      'X-Request-ID',
      'X-API-Key',
    ],
  };
}
