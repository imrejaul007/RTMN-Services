// ============================================================================
// Request Logger Middleware
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, path, query, body } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    logger.info(`${method} ${path} ${status} ${duration}ms`);
  });

  next();
};
