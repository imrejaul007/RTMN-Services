import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { logger } from '../utils/logger';

export class ValidationError extends Error {
  public statusCode: number;
  public errors: z.ZodError;

  constructor(errors: z.ZodError) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.errors = errors;
  }
}

export interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    roles?: string[];
  };
}

function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
}

export const validationMiddleware = {
  /**
   * Validate request body against a Zod schema
   */
  validateBody: (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const validated = schema.parse(req.body);
        req.body = validated;
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.warn('Request validation failed', {
            errors: formatZodErrors(error),
            path: req.path,
            method: req.method
          });

          res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: formatZodErrors(error)
          });
          return;
        }
        next(error);
      }
    };
  },

  /**
   * Validate query parameters against a Zod schema
   */
  validateQuery: (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const validated = schema.parse(req.query);
        req.query = validated;
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.warn('Query validation failed', {
            errors: formatZodErrors(error),
            path: req.path
          });

          res.status(400).json({
            success: false,
            error: 'Query validation failed',
            details: formatZodErrors(error)
          });
          return;
        }
        next(error);
      }
    };
  },

  /**
   * Validate URL parameters against a Zod schema
   */
  validateParams: (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const validated = schema.parse(req.params);
        req.params = validated;
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.warn('Params validation failed', {
            errors: formatZodErrors(error),
            path: req.path
          });

          res.status(400).json({
            success: false,
            error: 'Params validation failed',
            details: formatZodErrors(error)
          });
          return;
        }
        next(error);
      }
    };
  },

  /**
   * Generic validation function
   */
  validate: (data: unknown, schema: ZodSchema): z.infer<typeof schema> => {
    return schema.parse(data);
  },

  /**
   * Safe parse that returns errors instead of throwing
   */
  safeValidate: <T>(data: unknown, schema: ZodSchema<T>): { success: true; data: T } | { success: false; errors: z.ZodError } => {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, errors: result.error };
  }
};

/**
 * Common validation schemas
 */
export const schemas = {
  // ID validation
  mongoId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),

  // Pagination
  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20)
  }),

  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }),

  // Family link
  familyLink: z.object({
    ownerId: z.string().min(1),
    familyMemberId: z.string().min(1),
    familyMemberName: z.string().min(1),
    relationship: z.string().min(1),
    permissions: z.object({
      permissions: z.array(z.string()),
      canManageBookings: z.boolean().optional(),
      canManagePrescriptions: z.boolean().optional(),
      canViewMedicalRecords: z.boolean().optional(),
      canAccessBilling: z.boolean().optional(),
      canCreateSupportTickets: z.boolean().optional(),
      canResolveIssues: z.boolean().optional(),
      emergencyAccess: z.boolean().optional()
    })
  }),

  // Delegation scope
  delegationScope: z.object({
    services: z.array(z.string()).min(1),
    actions: z.array(z.string()).min(1),
    resourceTypes: z.array(z.string()).min(1),
    timeBound: z.boolean().optional(),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional()
  }),

  // Notification
  notification: z.object({
    recipientId: z.string().min(1),
    type: z.string(),
    title: z.string().min(1),
    message: z.string().min(1),
    data: z.record(z.unknown()).optional()
  }),

  // Emergency access
  emergencyAccess: z.object({
    customerId: z.string().min(1),
    grantedTo: z.array(z.string()).min(1),
    accessLevel: z.enum(['view_only', 'limited_manage', 'full_access']),
    reason: z.string().min(1),
    expiresAt: z.string().datetime().optional()
  })
};

/**
 * Error handling middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  if (error instanceof ValidationError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      details: formatZodErrors(error.errors)
    });
    return;
  }

  if (error instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: formatZodErrors(error)
    });
    return;
  }

  // Handle specific error types
  if (error.name === 'MongoServerError' && (error as any).code === 11000) {
    res.status(409).json({
      success: false,
      error: 'Duplicate entry',
      message: 'A record with this data already exists'
    });
    return;
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

/**
 * Not found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.path
  });
};
