import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/index.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const requestId = (req as Request & { requestId?: string }).requestId || 'unknown';

  console.error(`[Error] ${err.message}`, {
    requestId,
    path: req.path,
    method: req.method,
    statusCode,
    stack: err.stack,
    code: err.code,
  });

  const response: ApiResponse = {
    success: false,
    error: statusCode === 500 ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString(),
  };

  // Include details in non-production environments
  if (process.env.NODE_ENV !== 'production' && err.details) {
    (response as ApiResponse & { details: unknown }).details = err.details;
  }

  res.status(statusCode).json(response);
}

export function notFoundHandler(req: Request, res: Response): void {
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(response);
}

export function createError(message: string, statusCode: number, code?: string, details?: unknown): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

export const Errors = {
  notFound: (resource: string) => createError(`${resource} not found`, 404, 'NOT_FOUND'),
  badRequest: (message: string, details?: unknown) => createError(message, 400, 'BAD_REQUEST', details),
  unauthorized: (message: string = 'Unauthorized') => createError(message, 401, 'UNAUTHORIZED'),
  forbidden: (message: string = 'Forbidden') => createError(message, 403, 'FORBIDDEN'),
  internal: (message: string = 'Internal server error') => createError(message, 500, 'INTERNAL_ERROR'),
  serviceUnavailable: (message: string = 'Service unavailable') => createError(message, 503, 'SERVICE_UNAVAILABLE'),
};
