/**
 * RTMN TwinOS Shared - Validation Middleware
 * Provides input validation schemas and middleware
 */

import { body, param, query, validationResult } from 'express-validator';

/**
 * Process validation results and return errors if any
 */
export function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
          value: err.value
        }))
      }
    });
  }

  next();
}

// ============ COMMON VALIDATORS ============

export const validators = {
  // UUID validator
  uuid: (field, location = 'param') => {
    const validator = location === 'param' ? param : location === 'body' ? body : query;
    return validator(field)
      .isUUID(4)
      .withMessage(`${field} must be a valid UUID`);
  },

  // String validators
  string: (field, options = {}) => {
    const { min, max, optional = false } = options;
    let v = body(field);
    if (optional) v = v.optional();
    v = v.isString().withMessage(`${field} must be a string`);
    if (min !== undefined) v = v.isLength({ min }).withMessage(`${field} must be at least ${min} characters`);
    if (max !== undefined) v = v.isLength({ max }).withMessage(`${field} must be at most ${max} characters`);
    return v;
  },

  // Email validator
  email: (field, optional = false) => {
    let v = body(field);
    if (optional) v = v.optional();
    return v.isEmail().withMessage(`${field} must be a valid email`);
  },

  // Numeric validators
  positiveNumber: (field, optional = false) => {
    let v = body(field);
    if (optional) v = v.optional();
    return v.isFloat({ min: 0 }).withMessage(`${field} must be a positive number`);
  },

  integer: (field, options = {}) => {
    const { min, max, optional = false } = options;
    let v = body(field);
    if (optional) v = v.optional();
    v = v.isInt({ min: min ?? 0 }).withMessage(`${field} must be an integer`);
    if (max !== undefined) v = v.isInt({ max }).withMessage(`${field} must be at most ${max}`);
    return v;
  },

  // Enum validator
  enum: (field, values, optional = false) => {
    let v = body(field);
    if (optional) v = v.optional();
    return v.isIn(values).withMessage(`${field} must be one of: ${values.join(', ')}`);
  },

  // Boolean validator
  boolean: (field, optional = false) => {
    let v = body(field);
    if (optional) v = v.optional();
    return v.isBoolean().withMessage(`${field} must be a boolean`);
  },

  // Date validator
  date: (field, optional = false) => {
    let v = body(field);
    if (optional) v = v.optional();
    return v.isISO8601().withMessage(`${field} must be a valid ISO 8601 date`);
  },

  // URL validator
  url: (field, optional = false) => {
    let v = body(field);
    if (optional) v = v.optional();
    return v.isURL().withMessage(`${field} must be a valid URL`);
  },

  // Array validator
  array: (field, options = {}) => {
    const { min, max, optional = false, itemsType } = options;
    let v = body(field);
    if (optional) v = v.optional();
    v = v.isArray().withMessage(`${field} must be an array`);
    if (min !== undefined) v = v.isLength({ min }).withMessage(`${field} must have at least ${min} items`);
    if (max !== undefined) v = v.isLength({ max }).withMessage(`${field} must have at most ${max} items`);
    return v;
  },

  // Object validator
  object: (field, optional = false) => {
    let v = body(field);
    if (optional) v = v.optional();
    return v.isObject().withMessage(`${field} must be an object`);
  },

  // Pagination validators
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100')
      .toInt()
  ],

  // Search validator
  search: () => [
    query('q')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Search query must be at most 200 characters')
      .trim()
  ]
};

// ============ TWIN-SPECIFIC VALIDATORS ============

export const twinValidators = {
  // Base twin validators
  createTwin: [
    body('id')
      .notEmpty()
      .withMessage('Twin ID is required')
      .isLength({ min: 3, max: 100 })
      .withMessage('Twin ID must be 3-100 characters')
      .matches(/^[a-z0-9-_.]+$/)
      .withMessage('Twin ID must be lowercase alphanumeric with hyphens, underscores, or dots'),
    body('name')
      .notEmpty()
      .withMessage('Twin name is required')
      .isLength({ min: 1, max: 200 })
      .withMessage('Twin name must be 1-200 characters'),
    body('type')
      .optional()
      .isIn(['entity', 'event', 'metric', 'document', 'relationship', 'catalog', 'order', 'resource', 'workforce', 'transaction', 'service'])
      .withMessage('Invalid twin type'),
    body('category')
      .optional()
      .isIn(['foundation', 'commerce', 'healthcare', 'hospitality', 'manufacturing', 'finance', 'hr', 'marketing', 'operations', 'ai', 'personal'])
      .withMessage('Invalid twin category'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object'),
    validate
  ],

  updateTwin: [
    body('name')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('Twin name must be 1-200 characters'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object'),
    body('status')
      .optional()
      .isIn(['active', 'inactive', 'archived'])
      .withMessage('Invalid status'),
    validate
  ],

  updateTwinState: [
    body('data')
      .notEmpty()
      .withMessage('State data is required')
      .isObject()
      .withMessage('State data must be an object'),
    body('version')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Version must be a positive integer'),
    validate
  ]
};

// ============ USER/AUTH VALIDATORS ============

export const authValidators = {
  register: [
    body('email')
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    body('businessId')
      .notEmpty()
      .withMessage('Business ID is required')
      .isLength({ min: 3, max: 50 })
      .withMessage('Business ID must be 3-50 characters'),
    body('businessName')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Business name must be at most 200 characters'),
    body('role')
      .optional()
      .isIn(['owner', 'admin', 'manager', 'user'])
      .withMessage('Invalid role'),
    validate
  ],

  login: [
    body('email')
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    validate
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .notEmpty()
      .withMessage('New password is required')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    validate
  ]
};

// ============ SANITIZATION HELPERS ============

export function sanitizeObject(obj, allowedFields) {
  const sanitized = {};
  for (const field of allowedFields) {
    if (obj[field] !== undefined) {
      sanitized[field] = obj[field];
    }
  }
  return sanitized;
}

export function preventPrototypePollution(obj, depth = 0) {
  // Safety limit
  if (depth > 50) return obj;

  // Handle primitives
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  // Handle special objects - pass through
  if (obj instanceof Date) return obj;
  if (obj instanceof Map || obj instanceof Set) return obj;
  if (Buffer.isBuffer(obj)) return obj;
  if (typeof obj.then === 'function') return obj; // Promise

  // Handle arrays
  if (Array.isArray(obj)) {
    const safe = [];
    for (let i = 0; i < Math.min(obj.length, 1000); i++) {
      safe.push(preventPrototypePollution(obj[i], depth + 1));
    }
    return safe;
  }

  // Handle plain objects
  const dangerous = ['__proto__', 'constructor', 'prototype'];
  const sanitized = {};

  for (const key of Object.keys(obj)) {
    if (!dangerous.includes(key)) {
      try {
        sanitized[key] = preventPrototypePollution(obj[key], depth + 1);
      } catch (e) {
        // Skip problematic values
      }
    }
  }

  return sanitized;
}

export function sanitizeSearchInput(input) {
  if (typeof input !== 'string') return '';
  // Remove special characters that could be used for injection
  return input.replace(/[<>'"]/g, '').trim().slice(0, 200);
}

export default {
  validate,
  validators,
  twinValidators,
  authValidators,
  sanitizeObject,
  preventPrototypePollution,
  sanitizeSearchInput
};
