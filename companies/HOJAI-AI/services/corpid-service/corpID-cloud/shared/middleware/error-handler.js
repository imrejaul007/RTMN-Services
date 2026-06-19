/**
 * CorpID Cloud - Error Handler Middleware
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

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
 * Common error factories
 */
export const Errors = {
  badRequest: (message = 'Bad request') =>
    new AppError(message, 400, 'BAD_REQUEST'),

  unauthorized: (message = 'Authentication required') =>
    new AppError(message, 401, 'UNAUTHORIZED'),

  forbidden: (message = 'Access denied') =>
    new AppError(message, 403, 'FORBIDDEN'),

  notFound: (message = 'Resource not found') =>
    new AppError(message, 404, 'NOT_FOUND'),

  conflict: (message = 'Resource already exists') =>
    new AppError(message, 409, 'CONFLICT'),

  validation: (message = 'Validation failed', details = []) => {
    const error = new AppError(message, 400, 'VALIDATION_ERROR');
    error.details = details;
    return error;
  },

  rateLimit: (message = 'Too many requests') =>
    new AppError(message, 429, 'RATE_LIMIT'),

  internal: (message = 'Internal server error') =>
    new AppError(message, 500, 'INTERNAL_ERROR'),

  serviceUnavailable: (message = 'Service unavailable') =>
    new AppError(message, 503, 'SERVICE_UNAVAILABLE')
};

/**
 * Not found handler - catches 404s
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    }
  });
}

/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
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
    if (err.errors) {
      details = Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }));
    }
  } else if (err.code === 11000) {
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
    organizationId: req.user?.organizationId,
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

export default {
  AppError,
  Errors,
  notFoundHandler,
  errorHandler,
  asyncHandler
};
