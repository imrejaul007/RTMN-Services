import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createLogger } from '../utils/logger';

const logger = createLogger('error-handler');

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'AppError';
  }
}

/**
 * Handles validation errors from Zod
 */
function handleZodError(error: ZodError): ErrorResponse {
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }))
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Handles Mongoose validation errors
 */
function handleMongooseValidationError(error: any): ErrorResponse {
  const errors = Object.keys(error.errors || {}).map(key => ({
    field: key,
    message: error.errors[key].message
  }));

  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Database validation failed',
      details: errors
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Handles Mongoose cast errors (invalid ObjectId, etc.)
 */
function handleMongooseCastError(error: any): ErrorResponse {
  return {
    success: false,
    error: {
      code: 'INVALID_ID',
      message: `Invalid ${error.path}: ${error.value}`
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Handle AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json(handleZodError(err));
    return;
  }

  // Handle Mongoose errors
  if (err.name === 'ValidationError') {
    res.status(400).json(handleMongooseValidationError(err));
    return;
  }

  if (err.name === 'CastError') {
    res.status(400).json(handleMongooseCastError(err));
    return;
  }

  // Handle duplicate key errors
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue || {})[0];
    res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_KEY',
        message: `${field} already exists`
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Default to 500 Internal Server Error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * 404 handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Async handler wrapper to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
