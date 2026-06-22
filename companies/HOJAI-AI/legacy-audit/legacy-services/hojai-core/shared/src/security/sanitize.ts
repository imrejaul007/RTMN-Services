/**
 * HOJAI AI - Input Sanitization Middleware
 * 
 * XSS prevention, SQL injection prevention, and general input sanitization
 */

import { Request, Response, NextFunction } from 'express';

// ============================================
// XSS PREVENTION
// ============================================

export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#96;');
}

export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

export function escapeJs(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E');
}

// ============================================
// SQL INJECTION PREVENTION
// ============================================

export function escapeSQL(input: string): string {
  return input
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');
}

export function escapeSQLLike(input: string): string {
  return input
    .replace(/[%_]/g, '\\$&')
    .replace(/'/g, "''");
}

// ============================================
// NO SQL INJECTION
// ============================================

const mongodbOperators = /\$[\w]+\b/g;

export function sanitizeMongoQuery(query: any): any {
  if (typeof query === 'string') {
    // Check for dangerous operators
    if (mongodbOperators.test(query)) {
      return null;
    }
    return query;
  }

  if (Array.isArray(query)) {
    return query.map(sanitizeMongoQuery);
  }

  if (query && typeof query === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(query)) {
      // Block $where operator (can execute arbitrary JS)
      if (key === '$where' || key === '$function' || key === '$code') {
        continue;
      }
      sanitized[key] = sanitizeMongoQuery(value);
    }
    return sanitized;
  }

  return query;
}

// ============================================
// GENERAL INPUT SANITIZATION
// ============================================

export function trimWhitespace(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export function removeControlChars(input: string): string {
  return input.replace(/[\x00-\x1F\x7F]/g, '');
}

export function normalizeLineBreaks(input: string): string {
  return input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

// ============================================
// SANITIZATION MIDDLEWARE
// ============================================

export function sanitizeInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize body (deep clone to avoid mutation issues)
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  next();
}

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeHtml(trimWhitespace(removeControlChars(obj)));
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize keys
      const sanitizedKey = sanitizeHtml(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

// ============================================
// VALIDATION HELPERS
// ============================================

export const validators = {
  isEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  isUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  isAlphanumeric(input: string): boolean {
    return /^[a-zA-Z0-9]+$/.test(input);
  },

  isNumeric(input: string): boolean {
    return /^\d+$/.test(input);
  },

  isAlpha(input: string): boolean {
    return /^[a-zA-Z]+$/.test(input);
  },

  minLength(input: string, min: number): boolean {
    return input.length >= min;
  },

  maxLength(input: string, max: number): boolean {
    return input.length <= max;
  },
};

export default {
  sanitizeHtml,
  stripHtml,
  escapeSQL,
  escapeSQLLike,
  sanitizeMongoQuery,
  sanitizeInput,
  validators,
};
