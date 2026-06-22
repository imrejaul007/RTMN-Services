/**
 * Hojai Core - Input Sanitization Middleware
 * Version: 1.0.0 | Date: June 12, 2026
 * Purpose: XSS prevention and input sanitization
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Sanitize a string value to prevent XSS
 * Removes HTML tags and encodes special characters
 */
export function sanitizeString(value: string): string {
  if (typeof value !== 'string') return value;

  return value
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Encode HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize an object recursively
 */
export function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  // Primitives (number, boolean, etc.)
  return obj;
}

/**
 * Allowed event type pattern (alphanumeric, dots, hyphens, underscores)
 */
const EVENT_TYPE_PATTERN = /^[a-zA-Z0-9._-]+$/;

/**
 * Validate event type format
 */
export function isValidEventType(type: string): boolean {
  return EVENT_TYPE_PATTERN.test(type) && type.length <= 100;
}

/**
 * Validate UUID format
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Input sanitization middleware
 * Sanitizes request body, query, and params
 */
export function sanitizeInput(options?: {
  sanitizeBody?: boolean;
  sanitizeQuery?: boolean;
  sanitizeParams?: boolean;
  maxBodySize?: number;
}) {
  const {
    sanitizeBody = true,
    sanitizeQuery = true,
    sanitizeParams = true,
    maxBodySize = 10000
  } = options || {};

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check body size
    if (req.body) {
      const bodyStr = JSON.stringify(req.body);
      if (bodyStr.length > maxBodySize) {
        res.status(413).json({
          success: false,
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: `Request body exceeds maximum size of ${maxBodySize} characters`
          }
        });
        return;
      }

      if (sanitizeBody && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body) as typeof req.body;
      }
    }

    if (sanitizeQuery && req.query) {
      req.query = sanitizeObject(req.query) as typeof req.query;
    }

    if (sanitizeParams && req.params) {
      req.params = sanitizeObject(req.params) as typeof req.params;
    }

    next();
  };
}

/**
 * Validate request body against schema
 */
export function validateBody<T extends Record<string, unknown>>(
  schema: {
    [K in keyof T]: {
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      min?: number;
      max?: number;
      pattern?: RegExp;
      custom?: (value: unknown) => boolean | string;
    }
  }
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Array<{ field: string; message: string }> = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      // Check required
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }

      // Skip validation if not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Check type
      if (typeof value !== rules.type) {
        errors.push({ field, message: `${field} must be of type ${rules.type}` });
        continue;
      }

      // String validations
      if (rules.type === 'string') {
        if (rules.minLength !== undefined && value.length < rules.minLength) {
          errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
        }
        if (rules.maxLength !== undefined && value.length > rules.maxLength) {
          errors.push({ field, message: `${field} must be at most ${rules.maxLength} characters` });
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push({ field, message: `${field} has invalid format` });
        }
      }

      // Number validations
      if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push({ field, message: `${field} must be at least ${rules.min}` });
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push({ field, message: `${field} must be at most ${rules.max}` });
        }
      }

      // Custom validation
      if (rules.custom) {
        const result = rules.custom(value);
        if (result !== true) {
          errors.push({ field, message: typeof result === 'string' ? result : `${field} is invalid` });
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors
        }
      });
      return;
    }

    next();
  };
}

/**
 * Rate limit by tenant for sensitive operations
 */
export function tenantRateLimit(options?: {
  windowMs?: number;
  maxRequests?: number;
}) {
  const windowMs = options?.windowMs || 60 * 1000;
  const maxRequests = options?.maxRequests || 100;
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantId = req.headers['x-tenant-id'] as string || 'anonymous';
    const now = Date.now();

    let record = requests.get(tenantId);

    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      requests.set(tenantId, record);
    }

    record.count++;

    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          retryAfter
        }
      });
      return;
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (maxRequests - record.count).toString());
    res.setHeader('X-RateLimit-Reset', record.resetTime.toString());

    next();
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  sanitizeString,
  sanitizeObject,
  sanitizeInput,
  validateBody,
  tenantRateLimit,
  isValidEventType,
  isValidUUID,
  isValidEmail,
  isValidUrl
};
