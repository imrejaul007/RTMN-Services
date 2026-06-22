import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { logger } from '../utils/logger';

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: unknown;
}

/**
 * Validate request body against Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodErrors(error);
        logger.warn('Request validation failed', { path: req.path, errors });
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Validate query parameters against Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodErrors(error);
        logger.warn('Query validation failed', { path: req.path, errors });
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: errors
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Validate route parameters against Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodErrors(error);
        logger.warn('Params validation failed', { path: req.path, errors });
        res.status(400).json({
          success: false,
          error: 'Invalid route parameters',
          details: errors
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Format Zod errors into our standard format
 */
function formatZodErrors(error: ZodError): ValidationError[] {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }));
}

/**
 * Validate customer ID format
 */
export function isValidCustomerId(customerId: string): boolean {
  // Accept alphanumeric, hyphens, underscores, between 1-100 chars
  const customerIdRegex = /^[a-zA-Z0-9_-]{1,100}$/;
  return customerIdRegex.test(customerId);
}

/**
 * Validate company ID format
 */
export function isValidCompanyId(companyId: string): boolean {
  // Accept alphanumeric, hyphens, underscores, between 1-50 chars
  const companyIdRegex = /^[a-z0-9-]{1,50}$/;
  return companyIdRegex.test(companyId);
}

/**
 * Validate event type
 */
export function isValidEventType(eventType: string): boolean {
  const validTypes = [
    'page_view',
    'click',
    'purchase',
    'signup',
    'login',
    'logout',
    'search',
    'form_submit',
    'support_ticket',
    'review',
    'referral',
    'subscription',
    'payment',
    'refund',
    'feedback',
    'nps_survey',
    'cart_add',
    'cart_remove',
    'checkout_start',
    'checkout_complete',
    'wishlist_add',
    'share',
    'download',
    'video_play',
    'api_call',
    'error',
    'custom'
  ];
  return validTypes.includes(eventType.toLowerCase());
}

/**
 * Validate channel type
 */
export function isValidChannel(channel: string): boolean {
  const validChannels = [
    'web',
    'mobile_app',
    'whatsapp',
    'email',
    'sms',
    'call',
    'social',
    'pos',
    'api',
    'facebook',
    'instagram',
    'twitter',
    'linkedin',
    'telegram',
    'slack'
  ];
  return validChannels.includes(channel.toLowerCase());
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML
    .substring(0, 1000); // Limit length
}

/**
 * Validate date range
 */
export function isValidDateRange(startDate?: Date, endDate?: Date): boolean {
  if (!startDate && !endDate) return true;
  if (startDate && endDate) {
    return startDate <= endDate;
  }
  return true;
}

// ============================================================================
// SCHEMAS
// ============================================================================

export const customerIdParamSchema = z.object({
  customerId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/)
});

export const companyIdParamSchema = z.object({
  companyId: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/)
});

export const eventQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(1000).optional().default(100),
  offset: z.coerce.number().min(0).optional().default(0)
});

export const trackEventBodySchema = z.object({
  companyId: z.string().min(1).max(50),
  companyName: z.string().max(200).optional(),
  eventType: z.string().min(1).max(50),
  channel: z.string().max(20).optional().default('web'),
  metadata: z.record(z.unknown()).optional(),
  properties: z.record(z.unknown()).optional(),
  sessionId: z.string().max(100).optional(),
  userAgent: z.string().max(500).optional(),
  ipAddress: z.string().max(45).optional(), // IPv6 max length
  referralSource: z.string().max(200).optional(),
  utmParameters: z.record(z.string()).optional(),
  timestamp: z.string().datetime().optional()
});

export const exportQuerySchema = z.object({
  format: z.enum(['json', 'csv', 'html', 'pdf']).optional().default('json'),
  includeEvents: z.coerce.boolean().optional().default(true),
  includeMilestones: z.coerce.boolean().optional().default(true),
  includeAnalytics: z.coerce.boolean().optional().default(true),
  includePatterns: z.coerce.boolean().optional().default(true)
});

export const shareQuerySchema = z.object({
  accessLevel: z.enum(['summary', 'full', 'events_only']).optional().default('summary'),
  expiresInHours: z.coerce.number().min(1).max(168).optional().default(24)
});

export const companyRegisterSchema = z.object({
  companyId: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  displayName: z.string().max(200).optional(),
  type: z.enum(['core_platform', 'vertical_company', 'ai_service', 'merchant', 'consumer']).optional(),
  description: z.string().max(500).optional(),
  website: z.string().url().optional(),
  logo: z.string().url().optional(),
  eventTypes: z.array(z.string()).optional(),
  channels: z.array(z.string()).optional(),
  priority: z.number().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional()
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Custom application error
 */
export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'AppError';
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Validation error
 */
export class ValidationAppError extends AppError {
  constructor(errors: ValidationError[]) {
    super('Validation failed', 400, 'VALIDATION_ERROR', errors);
  }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

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
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      details: err.details
    });
    return;
  }

  // Handle Mongoose errors
  if (err.name === 'MongoServerError') {
    if ((err as any).code === 11000) {
      res.status(409).json({
        success: false,
        error: 'Duplicate entry',
        code: 'DUPLICATE_ERROR'
      });
      return;
    }
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
}

/**
 * Async handler wrapper
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
