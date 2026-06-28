/**
 * Error Handler Middleware
 * Centralized error handling for Express
 */

import { logger } from '../utils/logger.js';

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
 * Not found handler (404)
 */
export function notFoundHandler(req, res, next) {
  const error = new AppError(
    `Route not found: ${req.method} ${req.path}`,
    404,
    'NOT_FOUND'
  );
  next(error);
}

/**
 * Global error handler
 */
export function errorHandler(err, req, res, next) {
  // Log the error
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    statusCode: err.statusCode || 500
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Build error response
  const errorResponse = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message
    }
  };

  // Include stack trace in development
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    errorResponse.error.stack = err.stack.split('\n').slice(0, 5);
  }

  // Include validation errors if present
  if (err.errors) {
    errorResponse.error.errors = err.errors;
  }

  // Include request ID for debugging
  errorResponse.requestId = req.headers['x-request-id'] || generateRequestId();

  res.status(statusCode).json(errorResponse);
}

/**
 * Async handler wrapper to catch async errors
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Generate a unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validation error helper
 */
export function validationError(message, errors = []) {
  const error = new AppError(message, 400, 'VALIDATION_ERROR');
  error.errors = errors;
  return error;
}

/**
 * Authentication error helper
 */
export function authError(message = 'Authentication required') {
  return new AppError(message, 401, 'AUTHENTICATION_REQUIRED');
}

/**
 * Authorization error helper
 */
export function forbiddenError(message = 'Access denied') {
  return new AppError(message, 403, 'FORBIDDEN');
}

/**
 * Not found error helper
 */
export function notFoundError(resource = 'Resource') {
  return new AppError(`${resource} not found`, 404, 'NOT_FOUND');
}