import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.warn(`[${err.code}] ${err.message}`);
    res.status(err.statusCode).json({
      success: false,
      error: err.code,
      message: err.message,
      details: err.details,
    });
    return;
  }

  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'An internal error occurred',
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
}
