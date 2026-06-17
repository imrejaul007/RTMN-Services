import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log request
  logger.debug('Incoming request:', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip
  });

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('Request completed:', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
}
