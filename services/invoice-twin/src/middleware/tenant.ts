import { Request, Response, NextFunction } from 'express';

/**
 * Multi-tenant middleware
 * Extracts tenantId from x-tenant-id header
 * Returns 400 if tenantId is required but not provided
 */
export const tenantMiddleware = (required: boolean = true) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (required && !tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID is required',
        hint: 'Include x-tenant-id header in your request',
      });
      return;
    }

    req.tenantId = tenantId;
    next();
  };
};

/**
 * Request validation middleware
 * Validates required body fields
 */
export const validateBody = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing = fields.filter(field => !req.body[field]);

    if (missing.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        fields: missing,
      });
      return;
    }

    next();
  };
};

/**
 * Query parameter validation middleware
 */
export const validateQuery = (validParams: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const queryKeys = Object.keys(req.query);
    const invalid = queryKeys.filter(key => !validParams.includes(key));

    if (invalid.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        invalid: invalid,
        valid: validParams,
      });
      return;
    }

    next();
  };
};

/**
 * Error handler middleware
 * Formats errors consistently
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', err.message);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: err.message,
    });
    return;
  }

  // Mongoose duplicate key error
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    res.status(409).json({
      success: false,
      error: 'Duplicate Entry',
      message: 'A record with this identifier already exists',
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid token',
    });
    return;
  }

  // Default error
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
};

export default {
  tenantMiddleware,
  validateBody,
  validateQuery,
  errorHandler,
};
