/**
 * Cosmic OS - Middleware
 */

import { Request, Response, NextFunction } from 'express';
import config from '../config';

// Request ID middleware
export function requestId(req: Request, _res: Response, next: NextFunction) {
  (req as any).id = `cosmic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  next();
}

// Logging middleware
export function logger(req: Request, _res: Response, next: NextFunction) {
  const start = Date.now();

  _res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${_res.statusCode} ${duration}ms`);
  });

  next();
}

// Error handler
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('Error:', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}

// Health check
export function healthCheck(_req: Request, res: Response) {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'cosmic-os',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}
