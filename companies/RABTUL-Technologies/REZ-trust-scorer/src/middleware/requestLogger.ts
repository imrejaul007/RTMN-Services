import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, path, ip } = req;
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const logFn = statusCode >= 500 ? logger.error : statusCode >= 400 ? logger.warn : logger.info;
    logFn(`${method} ${path} ${statusCode} ${duration}ms - ${ip}`);
  });
  next();
}