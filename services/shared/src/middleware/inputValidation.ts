/**
 * Input Validation Middleware
 * Simple validation without external dependencies
 */
import { Request, Response, NextFunction } from 'express';

// Validation error class
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Schema type definition
interface FieldSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'email' | 'uuid' | 'url';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
  default?: any;
}

interface Schema {
  [key: string]: FieldSchema;
}

// Validation result
interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string; code: string }>;
  data: any;
}

/**
 * Validate request body against schema
 */
export function validateBody(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validateObject(req.body, schema);

    if (!result.valid) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: result.errors
      });
      return;
    }

    // Replace body with validated/transformed data
    req.body = result.data;
    next();
  };
}

/**
 * Validate request query against schema
 */
export function validateQuery(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validateObject(req.query, schema);

    if (!result.valid) {
      res.status(400).json({
        success: false,
        error: 'Query validation failed',
        code: 'VALIDATION_ERROR',
        details: result.errors
      });
      return;
    }

    req.query = result.data;
    next();
  };
}

/**
 * Validate request params against schema
 */
export function validateParams(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validateObject(req.params, schema);

    if (!result.valid) {
      res.status(400).json({
        success: false,
        error: 'Parameter validation failed',
        code: 'VALIDATION_ERROR',
        details: result.errors
      });
      return;
    }

    next();
  };
}

/**
 * Core validation function
 */
function validateObject(data: any, schema: Schema): ValidationResult {
  const errors: Array<{ field: string; message: string; code: string }> = [];
  const validated: any = {};

  for (const [field, fieldSchema] of Object.entries(schema)) {
    const value = data?.[field];

    // Check required
    if (fieldSchema.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field,
        message: `${field} is required`,
        code: 'REQUIRED_FIELD'
      });
      continue;
    }

    // Skip validation for optional empty fields
    if (value === undefined || value === null || value === '') {
      if (fieldSchema.default !== undefined) {
        validated[field] = fieldSchema.default;
      }
      continue;
    }

    // Type validation
    let isValid = true;
    let errorMsg = '';

    switch (fieldSchema.type) {
      case 'string':
        if (typeof value !== 'string') {
          isValid = false;
          errorMsg = `${field} must be a string`;
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          isValid = false;
          errorMsg = `${field} must be a number`;
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          isValid = false;
          errorMsg = `${field} must be a boolean`;
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          isValid = false;
          errorMsg = `${field} must be an object`;
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          isValid = false;
          errorMsg = `${field} must be an array`;
        }
        break;

      case 'email':
        if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          isValid = false;
          errorMsg = `${field} must be a valid email`;
        }
        break;

      case 'uuid':
        if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
          isValid = false;
          errorMsg = `${field} must be a valid UUID`;
        }
        break;

      case 'url':
        if (typeof value !== 'string') {
          try {
            new URL(value);
          } catch {
            isValid = false;
            errorMsg = `${field} must be a valid URL`;
          }
        }
        break;
    }

    if (!isValid) {
      errors.push({ field, message: errorMsg, code: 'INVALID_TYPE' });
      continue;
    }

    // Min/max for strings and numbers
    if (typeof value === 'string') {
      if (fieldSchema.min !== undefined && value.length < fieldSchema.min) {
        errors.push({ field, message: `${field} must be at least ${fieldSchema.min} characters`, code: 'TOO_SHORT' });
        continue;
      }
      if (fieldSchema.max !== undefined && value.length > fieldSchema.max) {
        errors.push({ field, message: `${field} must be at most ${fieldSchema.max} characters`, code: 'TOO_LONG' });
        continue;
      }
    }

    if (typeof value === 'number') {
      if (fieldSchema.min !== undefined && value < fieldSchema.min) {
        errors.push({ field, message: `${field} must be at least ${fieldSchema.min}`, code: 'TOO_SMALL' });
        continue;
      }
      if (fieldSchema.max !== undefined && value > fieldSchema.max) {
        errors.push({ field, message: `${field} must be at most ${fieldSchema.max}`, code: 'TOO_LARGE' });
        continue;
      }
    }

    // Pattern validation
    if (fieldSchema.pattern && typeof value === 'string' && !fieldSchema.pattern.test(value)) {
      errors.push({ field, message: `${field} has invalid format`, code: 'INVALID_FORMAT' });
      continue;
    }

    // Enum validation
    if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
      errors.push({ field, message: `${field} must be one of: ${fieldSchema.enum.join(', ')}`, code: 'INVALID_ENUM' });
      continue;
    }

    // Custom validation
    if (fieldSchema.custom) {
      const result = fieldSchema.custom(value);
      if (result !== true) {
        const msg = typeof result === 'string' ? result : `${field} is invalid`;
        errors.push({ field, message: msg, code: 'CUSTOM_VALIDATION' });
        continue;
      }
    }

    validated[field] = value;
  }

  return {
    valid: errors.length === 0,
    errors,
    data: validated
  };
}

// Common schemas factory
export const schemas = {
  id: { type: 'uuid' as const, required: true },
  email: { type: 'email' as const, required: true },
  pagination: {
    page: { type: 'number' as const, min: 1, default: 1 },
    limit: { type: 'number' as const, min: 1, max: 100, default: 20 }
  },
  uuid: (required = true) => ({ type: 'uuid' as const, required }),
  string: (min?: number, max?: number) => ({
    type: 'string' as const,
    ...(min !== undefined && { min }),
    ...(max !== undefined && { max })
  })
};

export default { validateBody, validateQuery, validateParams, ValidationError, schemas };
