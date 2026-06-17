/**
 * Error Handler Middleware
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function setupExpressErrorHandler(app: any): void {
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('[Error]', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method
    });
    next(err);
  });
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
