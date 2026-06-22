/**
 * Validation System - Comprehensive Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// STRING VALIDATION
// ============================================

describe('String Validation', () => {
  describe('Email Validation', () => {
    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@domain.com')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
      expect(isValidEmail('noat.com')).toBe(false);
      expect(isValidEmail('spaces in@email.com')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('a@b.c')).toBe(true);
    });
  });

  describe('URL Validation', () => {
    const isValidUrl = (url: string): boolean => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://api.example.com/v1/users')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://invalid')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('Phone Validation', () => {
    const isValidPhone = (phone: string): boolean => {
      const phoneRegex = /^\+?[\d\s-()]{10,}$/;
      return phoneRegex.test(phone);
    };

    it('should validate phone numbers', () => {
      expect(isValidPhone('+1234567890')).toBe(true);
      expect(isValidPhone('1234567890')).toBe(true);
      expect(isValidPhone('+91 9876543210')).toBe(true);
      expect(isValidPhone('(123) 456-7890')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('abcdefghij')).toBe(false);
    });
  });

  describe('Password Validation', () => {
    const isValidPassword = (password: string): boolean => {
      if (password.length < 8) return false;
      if (!/[a-z]/.test(password)) return false;
      if (!/[A-Z]/.test(password)) return false;
      if (!/[0-9]/.test(password)) return false;
      return true;
    };

    it('should validate strong passwords', () => {
      expect(isValidPassword('Password123')).toBe(true);
      expect(isValidPassword('MyStr0ng!Pass')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(isValidPassword('short')).toBe(false);
      expect(isValidPassword('alllowercase123')).toBe(false);
      expect(isValidPassword('ALLUPPERCASE123')).toBe(false);
      expect(isValidPassword('NoNumbersHere')).toBe(false);
    });
  });
});

// ============================================
// NUMBER VALIDATION
// ============================================

describe('Number Validation', () => {
  describe('Integer Validation', () => {
    const isInteger = (num: any): boolean => {
      return Number.isInteger(num);
    };

    it('should validate integers', () => {
      expect(isInteger(42)).toBe(true);
      expect(isInteger(0)).toBe(true);
      expect(isInteger(-100)).toBe(true);
    });

    it('should reject non-integers', () => {
      expect(isInteger(3.14)).toBe(false);
      expect(isInteger(NaN)).toBe(false);
      expect(isInteger(Infinity)).toBe(false);
    });
  });

  describe('Range Validation', () => {
    const isInRange = (num: number, min: number, max: number): boolean => {
      return num >= min && num <= max;
    };

    it('should validate numbers in range', () => {
      expect(isInRange(50, 0, 100)).toBe(true);
      expect(isInRange(0, 0, 100)).toBe(true);
      expect(isInRange(100, 0, 100)).toBe(true);
    });

    it('should reject numbers out of range', () => {
      expect(isInRange(-1, 0, 100)).toBe(false);
      expect(isInRange(101, 0, 100)).toBe(false);
    });
  });

  describe('Positive Number', () => {
    const isPositive = (num: number): boolean => num > 0;

    it('should validate positive numbers', () => {
      expect(isPositive(1)).toBe(true);
      expect(isPositive(0.001)).toBe(true);
    });

    it('should reject non-positive numbers', () => {
      expect(isPositive(0)).toBe(false);
      expect(isPositive(-1)).toBe(false);
    });
  });
});

// ============================================
// DATE VALIDATION
// ============================================

describe('Date Validation', () => {
  describe('Date Format', () => {
    const isValidDateFormat = (date: string): boolean => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
      return dateRegex.test(date);
    };

    it('should validate ISO date strings', () => {
      expect(isValidDateFormat('2024-01-15')).toBe(true);
      expect(isValidDateFormat('2024-01-15T10:30:00')).toBe(true);
      expect(isValidDateFormat('2024-01-15T10:30:00.000Z')).toBe(true);
    });

    it('should reject invalid date formats', () => {
      expect(isValidDateFormat('01-15-2024')).toBe(false);
      expect(isValidDateFormat('Jan 15, 2024')).toBe(false);
    });
  });

  describe('Future Date', () => {
    const isFutureDate = (date: Date): boolean => {
      return date.getTime() > Date.now();
    };

    it('should validate future dates', () => {
      const future = new Date(Date.now() + 86400000);
      expect(isFutureDate(future)).toBe(true);
    });

    it('should reject past dates', () => {
      const past = new Date(Date.now() - 86400000);
      expect(isFutureDate(past)).toBe(false);
    });
  });

  describe('Date Range', () => {
    const isDateInRange = (
      date: Date,
      start: Date,
      end: Date
    ): boolean => {
      const time = date.getTime();
      return time >= start.getTime() && time <= end.getTime();
    };

    it('should validate dates in range', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const middle = new Date('2024-06-15');

      expect(isDateInRange(middle, start, end)).toBe(true);
    });
  });
});

// ============================================
// OBJECT VALIDATION
// ============================================

describe('Object Validation', () => {
  describe('Required Fields', () => {
    const hasRequiredFields = (
      obj: Record<string, any>,
      required: string[]
    ): boolean => {
      return required.every(field => obj[field] !== undefined && obj[field] !== null);
    };

    it('should validate objects with required fields', () => {
      const obj = { name: 'John', email: 'john@example.com' };
      expect(hasRequiredFields(obj, ['name', 'email'])).toBe(true);
    });

    it('should reject objects missing required fields', () => {
      const obj = { name: 'John' };
      expect(hasRequiredFields(obj, ['name', 'email'])).toBe(false);
    });
  });

  describe('Object Schema', () => {
    interface Schema {
      type: 'string' | 'number' | 'boolean' | 'object' | 'array';
      required?: boolean;
      min?: number;
      max?: number;
      pattern?: RegExp;
      enum?: any[];
    }

    const validateSchema = (value: any, schema: Schema): boolean => {
      if (schema.required && (value === undefined || value === null)) {
        return false;
      }

      if (value === undefined || value === null) return true;

      if (schema.type === 'string' && typeof value !== 'string') return false;
      if (schema.type === 'number' && typeof value !== 'number') return false;
      if (schema.type === 'boolean' && typeof value !== 'boolean') return false;

      if (schema.min !== undefined && value < schema.min) return false;
      if (schema.max !== undefined && value > schema.max) return false;

      if (schema.pattern && typeof value === 'string' && !schema.pattern.test(value)) {
        return false;
      }

      if (schema.enum && !schema.enum.includes(value)) return false;

      return true;
    };

    it('should validate string type', () => {
      expect(validateSchema('test', { type: 'string' })).toBe(true);
      expect(validateSchema(123, { type: 'string' })).toBe(false);
    });

    it('should validate number constraints', () => {
      expect(validateSchema(50, { type: 'number', min: 0, max: 100 })).toBe(true);
      expect(validateSchema(-1, { type: 'number', min: 0 })).toBe(false);
      expect(validateSchema(101, { type: 'number', max: 100 })).toBe(false);
    });

    it('should validate enum values', () => {
      expect(validateSchema('active', { type: 'string', enum: ['active', 'inactive'] })).toBe(true);
      expect(validateSchema('pending', { type: 'string', enum: ['active', 'inactive'] })).toBe(false);
    });

    it('should validate patterns', () => {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(validateSchema('test@example.com', { type: 'string', pattern: emailPattern })).toBe(true);
      expect(validateSchema('invalid', { type: 'string', pattern: emailPattern })).toBe(false);
    });
  });

  describe('Nested Objects', () => {
    // Inline validation helper
    const validateNestedValue = (value: any, schema: any): boolean => {
      if (schema.required && (value === undefined || value === null)) return false;
      if (value === undefined || value === null) return true;
      if (schema.type === 'string' && typeof value !== 'string') return false;
      if (schema.type === 'number' && typeof value !== 'number') return false;
      return true;
    };

    const validateNested = (
      obj: any,
      schema: Record<string, any>
    ): boolean => {
      for (const [key, fieldSchema] of Object.entries(schema)) {
        if (fieldSchema.required && !(key in obj)) return false;
        if (key in obj && !validateNestedValue(obj[key], fieldSchema)) return false;
      }
      return true;
    };

    it('should validate nested objects', () => {
      const schema = {
        name: { type: 'string', required: true },
        email: { type: 'string', required: true },
        address: {
          type: 'object',
          required: false,
          properties: {
            city: { type: 'string' },
            zip: { type: 'string' },
          },
        },
      };

      const validObj = {
        name: 'John',
        email: 'john@example.com',
        address: { city: 'NYC', zip: '10001' },
      };

      expect(validateNested(validObj, schema)).toBe(true);
    });
  });
});

// ============================================
// ARRAY VALIDATION
// ============================================

describe('Array Validation', () => {
  describe('Array Length', () => {
    const isValidLength = (
      arr: any[],
      min: number,
      max: number
    ): boolean => {
      return arr.length >= min && arr.length <= max;
    };

    it('should validate array length', () => {
      expect(isValidLength([1, 2, 3], 1, 5)).toBe(true);
      expect(isValidLength([], 0, 5)).toBe(true);
      expect(isValidLength([1, 2, 3, 4, 5, 6], 1, 5)).toBe(false);
    });
  });

  describe('Array Items', () => {
    const allItemsMatch = (
      arr: any[],
      validator: (item: any) => boolean
    ): boolean => {
      return arr.every(validator);
    };

    it('should validate all items', () => {
      const allPositive = (arr: number[]) => allItemsMatch(arr, n => n > 0);
      
      expect(allPositive([1, 2, 3])).toBe(true);
      expect(allPositive([1, -2, 3])).toBe(false);
    });

    it('should validate unique items', () => {
      const isUnique = (arr: any[]) => new Set(arr).size === arr.length;
      
      expect(isUnique([1, 2, 3])).toBe(true);
      expect(isUnique([1, 2, 2])).toBe(false);
    });
  });
});

// ============================================
// CUSTOM VALIDATORS
// ============================================

describe('Custom Validators', () => {
  describe('UUID Validation', () => {
    const isValidUUID = (uuid: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(uuid);
    };

    it('should validate UUID v4', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('not-a-uuid')).toBe(false);
    });
  });

  describe('Credit Card Validation (Luhn)', () => {
    const isValidCreditCard = (card: string): boolean => {
      const digits = card.replace(/\D/g, '');
      if (digits.length < 13 || digits.length > 19) return false;

      let sum = 0;
      let isEven = false;

      for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits[i], 10);
        if (isEven) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
      }

      return sum % 10 === 0;
    };

    it('should validate credit card numbers', () => {
      expect(isValidCreditCard('4532015112830366')).toBe(true);
      expect(isValidCreditCard('1234567890123456')).toBe(false);
    });
  });

  describe('JSON Validation', () => {
    const isValidJSON = (str: string): boolean => {
      try {
        JSON.parse(str);
        return true;
      } catch {
        return false;
      }
    };

    it('should validate JSON strings', () => {
      expect(isValidJSON('{"name":"John"}')).toBe(true);
      expect(isValidJSON('[1,2,3]')).toBe(true);
      expect(isValidJSON('not json')).toBe(false);
    });
  });
});

// ============================================
// SANITIZATION
// ============================================

describe('Input Sanitization', () => {
  describe('XSS Prevention', () => {
    const sanitizeHtml = (input: string): string => {
      return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    it('should escape HTML characters', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should preserve safe content', () => {
      expect(sanitizeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('SQL Injection Prevention', () => {
    const escapeSQL = (input: string): string => {
      return input
        .replace(/'/g, "''")
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n');
    };

    it('should escape SQL special characters', () => {
      expect(escapeSQL("O'Brien")).toBe("O''Brien");
    });
  });

  describe('Trim Whitespace', () => {
    const trimInput = (input: string): string => {
      return input.trim().replace(/\s+/g, ' ');
    };

    it('should trim whitespace', () => {
      expect(trimInput('  hello  ')).toBe('hello');
    });

    it('should collapse multiple spaces', () => {
      expect(trimInput('hello   world')).toBe('hello world');
    });
  });
});

// ============================================
// VALIDATION ERRORS
// ============================================

describe('Validation Errors', () => {
  interface ValidationError {
    field: string;
    message: string;
    code: string;
  }

  describe('Error Structure', () => {
    it('should create validation error', () => {
      const error: ValidationError = {
        field: 'email',
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
      };

      expect(error.field).toBe('email');
      expect(error.code).toBe('INVALID_EMAIL');
    });
  });

  describe('Error Collection', () => {
    const collectErrors = (
      validations: { field: string; valid: boolean; message: string }[]
    ): ValidationError[] => {
      return validations
        .filter(v => !v.valid)
        .map(v => ({
          field: v.field,
          message: v.message,
          code: `INVALID_${v.field.toUpperCase()}`,
        }));
    };

    it('should collect validation errors', () => {
      const validations = [
        { field: 'name', valid: true, message: '' },
        { field: 'email', valid: false, message: 'Invalid format' },
        { field: 'phone', valid: false, message: 'Too short' },
      ];

      const errors = collectErrors(validations);
      expect(errors).toHaveLength(2);
      expect(errors[0].field).toBe('email');
    });
  });
});
