// ============================================
// HOJAI AI - Validation Utility
// ============================================

import { z, ZodError, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

// Validation error response interface
export interface ValidationErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.parse(req.body);
      req.body = result;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        logger.warn('Validation error', {
          path: req.path,
          errors: details
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details
          }
        } as ValidationErrorResponse);
        return;
      }

      logger.error('Unexpected validation error', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected validation error occurred'
        }
      } as ValidationErrorResponse);
    }
  };
}

/**
 * Validate request query against a Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.parse(req.query);
      req.query = result as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        logger.warn('Query validation error', {
          path: req.path,
          errors: details
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Query validation failed',
            details
          }
        } as ValidationErrorResponse);
        return;
      }

      logger.error('Unexpected validation error', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected validation error occurred'
        }
      } as ValidationErrorResponse);
    }
  };
}

/**
 * Validate request params against a Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.parse(req.params);
      req.params = result as typeof req.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        logger.warn('Params validation error', {
          path: req.path,
          errors: details
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Params validation failed',
            details
          }
        } as ValidationErrorResponse);
        return;
      }

      logger.error('Unexpected validation error', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected validation error occurred'
        }
      } as ValidationErrorResponse);
    }
  };
}

/**
 * Validate UUID format
 */
export const UUIDSchema = z.string().uuid();

/**
 * Validate email format
 */
export const EmailSchema = z.string().email();

/**
 * Validate URL format
 */
export const URLSchema = z.string().url();

/**
 * Validate ISO date string
 */
export const DateSchema = z.string().datetime();

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['asc', 'desc']).optional(),
  sortBy: z.string().optional()
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

/**
 * Get pagination options from query
 */
export function getPaginationOptions(query: PaginationInput): {
  skip: number;
  limit: number;
  sort: Record<string, 1 | -1>;
} {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  let sort: Record<string, 1 | -1> = { createdAt: -1 };
  if (query.sortBy) {
    sort = { [query.sortBy]: query.sort === 'asc' ? 1 : -1 };
  }

  return { skip, limit, sort };
}

/**
 * Format pagination response
 */
export function formatPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): {
  success: true;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
} {
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  };
}
