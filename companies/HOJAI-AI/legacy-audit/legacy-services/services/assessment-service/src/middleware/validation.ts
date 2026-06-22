import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { logger } from '../utils/logger';

/**
 * Validation error response format
 */
interface ValidationError {
  field: string;
  message: string;
}

/**
 * Standard API error response
 */
interface ApiError {
  success: false;
  error: string;
  details?: ValidationError[];
}

/**
 * Creates a validation middleware for request body
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: ValidationError[] = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        logger.warn('Request body validation failed', { errors });

        const response: ApiError = {
          success: false,
          error: 'Validation error',
          details: errors
        };

        return res.status(400).json(response);
      }
      next(error);
    }
  };
};

/**
 * Creates a validation middleware for request params
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: ValidationError[] = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        logger.warn('Request params validation failed', { errors });

        const response: ApiError = {
          success: false,
          error: 'Invalid parameters',
          details: errors
        };

        return res.status(400).json(response);
      }
      next(error);
    }
  };
};

/**
 * Creates a validation middleware for query parameters
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: ValidationError[] = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        logger.warn('Request query validation failed', { errors });

        const response: ApiError = {
          success: false,
          error: 'Invalid query parameters',
          details: errors
        };

        return res.status(400).json(response);
      }
      next(error);
    }
  };
};

/**
 * Common validation schemas
 */
export const schemas = {
  // UUID schema
  uuid: z.string().uuid({ message: 'Invalid UUID format' }),

  // Patient ID (alphanumeric with dashes)
  patientId: z.string().min(1).max(100),

  // Assessment ID format: ASM-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  assessmentId: z.string().regex(/^ASM-[a-f0-9-]+$/i, 'Invalid assessment ID format'),

  // Template ID format: TMPL-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  templateId: z.string().regex(/^TMPL-[a-f0-9-]+$/i, 'Invalid template ID format'),

  // Pagination
  pagination: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    skip: z.coerce.number().int().min(0).default(0)
  }),

  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    days: z.coerce.number().int().min(1).max(365).optional()
  }),

  // MongoDB ObjectId
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format')
};

/**
 * Error handler middleware
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack
  });

  // Don't expose internal errors in production
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(500).json({
    success: false,
    error: isProduction ? 'Internal server error' : err.message
  });
};

/**
 * Not found handler middleware
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`
  });
};

/**
 * Async handler wrapper to catch promise rejections
 */
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default {
  validateBody,
  validateParams,
  validateQuery,
  schemas,
  errorHandler,
  notFoundHandler,
  asyncHandler
};
