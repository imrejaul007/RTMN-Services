/**
 * RTMN Shared Errors Module
 *
 * Typed error classes for consistent error handling across all HOJAI AI services.
 *
 * Usage:
 *   import { NotFoundError, ValidationError } from '@rtmn/shared/lib/errors';
 *
 *   if (!user) throw new NotFoundError('User not found');
 *
 *   // In Express error handler:
 *   app.use((err, req, res, next) => {
 *     if (err instanceof AppError) {
 *       return res.status(err.statusCode).json({ error: err.code, message: err.message });
 *     }
 *     res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong' });
 *   });
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid input', details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT');
  }
}

/**
 * Express error handler middleware. Use after all routes:
 *   app.use(errorMiddleware);
 */
export function errorMiddleware(logger = null) {
  return (err, req, res, next) => {
    if (res.headersSent) return next(err);

    const isAppError = err instanceof AppError;
    const statusCode = isAppError ? err.statusCode : (err.statusCode || 500);
    const code = isAppError ? err.code : 'INTERNAL_ERROR';
    const message = isAppError ? err.message : (err.message || 'An unexpected error occurred');

    if (logger) {
      if (statusCode >= 500) {
        logger.error({ err, method: req.method, path: req.path }, 'Server error');
      } else if (statusCode >= 400) {
        logger.warn({ code, method: req.method, path: req.path, statusCode }, 'Client error');
      }
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        ...(err.details && { details: err.details }),
        ...(process.env.NODE_ENV !== 'production' && statusCode >= 500 && { stack: err.stack })
      }
    });
  };
}

/**
 * Async route wrapper. Catches rejected promises and passes to error middleware:
 *   app.get('/x', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  errorMiddleware,
  asyncHandler,
};
