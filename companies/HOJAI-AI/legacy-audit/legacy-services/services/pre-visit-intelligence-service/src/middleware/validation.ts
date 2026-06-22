import { Request, Response, NextFunction, RequestHandler } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { logger } from '../utils/logger';

// ============================================================================
// CUSTOM ERROR TYPES
// ============================================================================

export class ValidationError extends Error {
  public statusCode: number;
  public errors: z.ZodError['errors'];

  constructor(message: string, errors: z.ZodError['errors'] = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.errors = errors;
  }
}

export class NotFoundError extends Error {
  public statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class UnauthorizedError extends Error {
  public statusCode: number;

  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

export class ForbiddenError extends Error {
  public statusCode: number;

  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

export class ConflictError extends Error {
  public statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

// ============================================================================
// ZOD VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Validate request body against a Zod schema
 */
export function validateRequest<T extends ZodSchema>(schema: T): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = await schema.parseAsync(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Request validation failed', {
          errors: error.errors,
          path: req.path,
          method: req.method
        });

        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Request body validation failed',
          details: formatZodErrors(error)
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Validate request params against a Zod schema
 */
export function validateParams<T extends ZodSchema>(schema: T): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedParams = await schema.parseAsync(req.params);
      req.params = validatedParams as Record<string, string>;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Params validation failed', {
          errors: error.errors,
          path: req.path,
          method: req.method
        });

        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'URL parameters validation failed',
          details: formatZodErrors(error)
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Validate request query against a Zod schema
 */
export function validateQuery<T extends ZodSchema>(schema: T): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedQuery = await schema.parseAsync(req.query);
      req.query = validatedQuery as Record<string, string>;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Query validation failed', {
          errors: error.errors,
          path: req.path,
          method: req.method
        });

        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Query parameters validation failed',
          details: formatZodErrors(error)
        });
        return;
      }
      next(error);
    }
  };
}

// ============================================================================
// ERROR FORMATTERS
// ============================================================================

/**
 * Format Zod errors for response
 */
function formatZodErrors(error: z.ZodError): {
  field: string;
  message: string;
  code: string;
}[] {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }));
}

/**
 * Format Zod errors for response (alternative format)
 */
export function formatZodErrorsDetailed(error: z.ZodError): {
  field: string;
  message: string;
  expected?: string;
  received?: string;
  code: string;
}[] {
  return error.errors.map(err => {
    const formatted: {
      field: string;
      message: string;
      expected?: string;
      received?: string;
      code: string;
    } = {
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    };

    // Add expected/received for type errors
    if (err.code === 'invalid_type') {
      formatted.expected = String(err.expected);
      formatted.received = String(err.received);
    }

    return formatted;
  });
}

// ============================================================================
// AUTH VALIDATION
// ============================================================================

/**
 * Validate authorization header
 */
export function validateAuth(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authorization header is required'
      });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid authorization format. Use: Bearer <token>'
      });
      return;
    }

    const token = authHeader.substring(7);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Token is required'
      });
      return;
    }

    // Token validation would be done here (JWT verification, etc.)
    // For now, we just pass the request through
    (req as Request & { userId?: string }).userId = token;

    next();
  };
}

/**
 * Validate API key header
 */
export function validateApiKey(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'API key is required'
      });
      return;
    }

    // API key validation would be done here
    // For now, we just pass the request through
    next();
  };
}

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize string input to prevent injection
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 10000); // Limit length
}

/**
 * Sanitize request body strings
 */
export function sanitizeBody(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    next();
  };
}

/**
 * Recursively sanitize object values
 */
function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string'
          ? sanitizeString(item)
          : typeof item === 'object' && item !== null
            ? sanitizeObject(item as Record<string, unknown>)
            : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// ============================================================================
// RATE LIMITING HELPERS
// ============================================================================

/**
 * Check rate limit headers
 */
export function getRateLimitInfo(res: Response): {
  limit: number;
  remaining: number;
  reset: number;
} | null {
  const limit = res.getHeader('x-ratelimit-limit');
  const remaining = res.getHeader('x-ratelimit-remaining');
  const reset = res.getHeader('x-ratelimit-reset');

  if (limit && remaining && reset) {
    return {
      limit: parseInt(String(limit)),
      remaining: parseInt(String(remaining)),
      reset: parseInt(String(reset))
    };
  }

  return null;
}

// ============================================================================
// COMMON VALIDATION SCHEMAS
// ============================================================================

export const commonSchemas = {
  // ID validation
  id: z.string().min(1, 'ID is required').max(100, 'ID too long'),

  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20)
  }),

  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }),

  // UUID
  uuid: z.string().uuid('Invalid UUID format'),

  // Email
  email: z.string().email('Invalid email format'),

  // Pagination response
  paginatedResponse: <T extends z.ZodTypeAny>(dataSchema: T) =>
    z.object({
      data: z.array(dataSchema),
      pagination: z.object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
        totalPages: z.number()
      })
    })
};

// ============================================================================
// ERROR HANDLER
// ============================================================================

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });

  // Handle known error types
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.name,
      message: err.message,
      errors: err.errors
    });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.name,
      message: err.message
    });
    return;
  }

  if (err instanceof UnauthorizedError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.name,
      message: err.message
    });
    return;
  }

  if (err instanceof ForbiddenError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.name,
      message: err.message
    });
    return;
  }

  if (err instanceof ConflictError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.name,
      message: err.message
    });
    return;
  }

  // Handle Zod errors
  if (err instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Request validation failed',
      details: formatZodErrors(err)
    });
    return;
  }

  // Handle mongoose validation errors
  if (err.name === 'ValidationError' && 'errors' in err) {
    res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Database validation failed',
      details: err
    });
    return;
  }

  // Handle mongoose cast errors (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Invalid data format'
    });
    return;
  }

  // Handle unknown errors
  const statusCode = (err as { statusCode?: number }).statusCode || 500;
  const message = statusCode === 500
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: 'ServerError',
    message
  });
}

// ============================================================================
// ASYNC HANDLER
// ============================================================================

/**
 * Wrapper for async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  validateRequest,
  validateParams,
  validateQuery,
  validateAuth,
  validateApiKey,
  sanitizeBody,
  errorHandler,
  asyncHandler,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  commonSchemas
};
