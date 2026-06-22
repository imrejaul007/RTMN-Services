import { Request, Response, NextFunction } from 'express';

/**
 * Authentication middleware for internal service calls
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-internal-token'] as string;

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Missing X-Internal-Token header',
      timestamp: new Date()
    });
    return;
  }

  const validToken = process.env.INTERNAL_SERVICE_TOKEN;
  if (!validToken || token !== validToken) {
    res.status(403).json({
      success: false,
      error: 'Invalid internal service token',
      timestamp: new Date()
    });
    return;
  }

  next();
}

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    console.log(
      JSON.stringify({
        type: 'request',
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        ip: req.ip,
        timestamp: new Date().toISOString()
      })
    );
  });

  next();
}

/**
 * CORS middleware for dashboard access
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  // Allow localhost and REZ domains in development
  const allowedOrigins = [
    'http://localhost',
    'http://127.0.0.1',
    'https://rez.money',
    'https://admin.rez.money'
  ];

  if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Internal-Token');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
}

/**
 * Error handling middleware
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  console.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    timestamp: new Date()
  });
}
