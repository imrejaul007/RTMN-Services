/**
 * Common Express middleware for Genie services
 */

import { Request, Response, NextFunction } from 'express';

export function requestLogger(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${serviceName}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
  };
}

export function errorHandler(serviceName: string) {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(`[${serviceName}] Error:`, err.message, err.stack);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL', message: err.message },
      meta: { timestamp: new Date().toISOString(), service: serviceName },
    });
  };
}

export function internalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;

  if (token && expected && token === expected) {
    return next();
  }

  const authHeader = req.headers.authorization?.replace('Bearer ', '');
  if (authHeader) {
    // JWT validation would go here
    return next();
  }

  // For health checks, allow without auth
  if (req.path === '/health' || req.path === '/ready') {
    return next();
  }

  res.status(401).json({
    success: false,
    error: { code: 'UNAUTHORIZED', message: 'No token provided' },
  });
}

export function gracefulShutdown(server: any, serviceName: string) {
  process.on('SIGTERM', () => {
    console.log(`[${serviceName}] SIGTERM received, shutting down gracefully`);
    server.close(() => {
      console.log(`[${serviceName}] Closed`);
      process.exit(0);
    });
  });
  process.on('SIGINT', () => {
    console.log(`[${serviceName}] SIGINT received, shutting down gracefully`);
    server.close(() => {
      console.log(`[${serviceName}] Closed`);
      process.exit(0);
    });
  });
}