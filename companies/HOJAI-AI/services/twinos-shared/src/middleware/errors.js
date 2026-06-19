/**
 * RTMN TwinOS Shared - Error Handling Middleware
 * Provides consistent error handling and logging
 */

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'twinos' },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
    })
  ]
});

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error types
 */
export const Errors = {
  BAD_REQUEST: (message = 'Bad request') => new AppError(message, 400, 'BAD_REQUEST'),
  UNAUTHORIZED: (message = 'Authentication required') => new AppError(message, 401, 'UNAUTHORIZED'),
  FORBIDDEN: (message = 'Access denied') => new AppError(message, 403, 'FORBIDDEN'),
  NOT_FOUND: (message = 'Resource not found') => new AppError(message, 404, 'NOT_FOUND'),
  CONFLICT: (message = 'Resource already exists') => new AppError(message, 409, 'CONFLICT'),
  VALIDATION: (message = 'Validation failed', details = []) => {
    const err = new AppError(message, 400, 'VALIDATION_ERROR');
    err.details = details;
    return err;
  },
  RATE_LIMIT: (message = 'Too many requests') => new AppError(message, 429, 'RATE_LIMIT'),
  INTERNAL: (message = 'Internal server error') => new AppError(message, 500, 'INTERNAL_ERROR'),
  SERVICE_UNAVAILABLE: (message = 'Service unavailable') => new AppError(message, 503, 'SERVICE_UNAVAILABLE')
};

/**
 * Not found handler - catches 404s
 */
export function notFoundHandler(req, res, next) {
  const error = Errors.NOT_FOUND(`Route ${req.method} ${req.path} not found`);
  next(error);
}

/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
  // Generate error ID for tracking
  const errorId = uuidv4();

  // Default values
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || [];

  // Handle specific error types
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token has expired';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    // Handle Mongoose validation errors
    if (err.errors) {
      details = Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }));
    }
  } else if (err.code === '11000') {
    // MongoDB duplicate key error
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    message = 'Resource already exists';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid ID format';
  }

  // Log the error
  const logData = {
    errorId,
    method: req.method,
    path: req.path,
    statusCode,
    code,
    message,
    userId: req.user?.id,
    businessId: req.user?.businessId,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  };

  if (statusCode >= 500) {
    logger.error('Server error', logData);
  } else if (statusCode >= 400) {
    logger.warn('Client error', logData);
  }

  // Send response
  const response = {
    success: false,
    error: {
      code,
      message,
      ...(details.length > 0 && { details }),
      ...(process.env.NODE_ENV !== 'production' && { errorId })
    }
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * Async handler wrapper - catches async errors
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Request ID middleware - adds unique ID to each request
 */
export function requestId(req, res, next) {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
}

/**
 * Request logging middleware
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
  });

  next();
}

export { logger };

export default {
  AppError,
  Errors,
  notFoundHandler,
  errorHandler,
  asyncHandler,
  requestId,
  requestLogger,
  logger
};
