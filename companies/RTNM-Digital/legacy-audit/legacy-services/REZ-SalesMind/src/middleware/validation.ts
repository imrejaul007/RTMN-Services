/**
 * Validation Middleware - Input validation for all routes
 */

import { Request, Response, NextFunction } from 'express';

type ParamType = 'body' | 'queryParams' | 'params';

interface ValidationRule {
  param: ParamType;
  fields: string[];
}

export function validateRequest(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    for (const rule of rules) {
      const paramMap: Record<ParamType, unknown> = {
        body: req.body,
        queryParams: req.query,
        params: req.params
      };
      const data = paramMap[rule.param] as Record<string, unknown> | undefined;

      for (const field of rule.fields) {
        const value = data?.[field];
        if (value === undefined || value === null || value === '') {
          errors.push(`${field} is required in ${rule.param}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
}

/**
 * Email validation helper
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Phone validation helper (basic)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-+()]{7,20}$/;
  return phoneRegex.test(phone);
}

/**
 * Sanitize string input - prevent injection
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}
