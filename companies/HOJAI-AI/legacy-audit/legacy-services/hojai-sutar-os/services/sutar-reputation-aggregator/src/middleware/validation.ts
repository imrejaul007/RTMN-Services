import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Validation Schemas
export const entityIdSchema = z.string().min(1).max(100);

export const reviewInputSchema = z.object({
  entityId: z.string().min(1, 'Entity ID is required').max(100),
  userId: z.string().min(1, 'User ID is required').max(100),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  content: z.string().min(1, 'Content is required').max(5000, 'Content must be at most 5000 characters'),
  source: z.enum(['manual', 'automated', 'imported', 'api']).optional(),
  verified: z.boolean().optional(),
  tags: z.array(z.string().max(50)).max(10, 'Maximum 10 tags allowed').optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const reviewFiltersSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'flagged']).optional(),
  minRating: z.number().min(1).max(5).optional(),
  maxRating: z.number().min(1).max(5).optional(),
  source: z.enum(['manual', 'automated', 'imported', 'api']).optional(),
  verified: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const historyQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(500).optional(),
  metricType: z.enum(['reputation', 'rating', 'sentiment', 'trust']).optional(),
});

export const metricTypeSchema = z.enum(['reputation', 'rating', 'sentiment', 'trust']);

export const entityTypeSchema = z.enum(['user', 'product', 'service', 'organization', 'content']);

// Validation middleware factory
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        timestamp: new Date().toISOString(),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        timestamp: new Date().toISOString(),
      });
      return;
    }
    req.query = result.data as typeof req.query;
    next();
  };
}

export function validateParams(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next();
  };
}

// Request type augmentation
declare global {
  namespace Express {
    interface Request {
      validatedParams?: Record<string, unknown>;
      validatedQuery?: Record<string, unknown>;
    }
  }
}
