import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      requestId?: string;
    }
  }
}

export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Extract tenant ID from header, query param, or body
  const tenantId =
    req.headers['x-tenant-id'] as string ||
    req.query.tenantId as string ||
    req.body?.tenantId;

  if (tenantId) {
    req.tenantId = tenantId;
  }

  next();
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId =
    req.headers['x-request-id'] as string ||
    `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}
