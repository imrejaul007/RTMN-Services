/**
 * Validation Utilities Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock validateBody middleware
const mockValidateBody = (schema: any) => {
  return (req: any, res: any, next: any) => {
    const errors: Array<{ field: string; message: string }> = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }

      if (value !== undefined && value !== null) {
        if (typeof value !== rules.type) {
          errors.push({ field, message: `${field} must be of type ${rules.type}` });
        }

        if (rules.type === 'string' && rules.minLength && value.length < rules.minLength) {
          errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
        }

        if (rules.type === 'string' && rules.maxLength && value.length > rules.maxLength) {
          errors.push({ field, message: `${field} must be at most ${rules.maxLength} characters` });
        }

        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push({ field, message: `${field} has invalid format` });
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: errors }
      });
      return;
    }

    next();
  };
};

describe('Validation Utilities', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockReq = { body: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    mockNext = vi.fn();
  });

  describe('validateBody', () => {
    it('should pass validation with valid data', () => {
      const schema = {
        name: { type: 'string', required: true },
        email: { type: 'string', required: true }
      };

      mockReq.body = {
        name: 'John',
        email: 'john@example.com'
      };

      const middleware = mockValidateBody(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should fail validation for missing required field', () => {
      const schema = {
        name: { type: 'string', required: true }
      };

      mockReq.body = {};

      const middleware = mockValidateBody(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR'
          })
        })
      );
    });

    it('should fail validation for wrong type', () => {
      const schema = {
        name: { type: 'string', required: true }
      };

      mockReq.body = { name: 123 };

      const middleware = mockValidateBody(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should validate string minLength', () => {
      const schema = {
        name: { type: 'string', minLength: 3 }
      };

      mockReq.body = { name: 'ab' };

      const middleware = mockValidateBody(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should validate string maxLength', () => {
      const schema = {
        name: { type: 'string', maxLength: 5 }
      };

      mockReq.body = { name: 'abcdef' };

      const middleware = mockValidateBody(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should validate string pattern', () => {
      const schema = {
        email: { type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
      };

      mockReq.body = { email: 'invalid-email' };

      const middleware = mockValidateBody(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should allow optional empty fields', () => {
      const schema = {
        name: { type: 'string' }
      };

      mockReq.body = {};

      const middleware = mockValidateBody(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate multiple fields', () => {
      const schema = {
        name: { type: 'string', required: true, minLength: 2 },
        age: { type: 'number', required: true },
        email: { type: 'string', required: true }
      };

      mockReq.body = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com'
      };

      const middleware = mockValidateBody(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle empty string as missing for required', () => {
      const schema = {
        name: { type: 'string', required: true }
      };

      mockReq.body = { name: '' };

      const middleware = mockValidateBody(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});

describe('UUID Validation', () => {
  const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  it('should accept valid UUIDs', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    expect(isValidUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
  });

  it('should reject invalid UUIDs', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
    expect(isValidUUID('')).toBe(false);
    expect(isValidUUID('12345678-1234-1234-1234-123456789012')).toBe(false); // version 4
  });
});

describe('Email Validation', () => {
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  it('should accept valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    expect(isValidEmail('user+tag@example.com')).toBe(true);
    expect(isValidEmail('user@sub.domain.com')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('test@')).toBe(false);
    expect(isValidEmail('test')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('URL Validation', () => {
  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  };

  it('should accept valid URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://localhost:3000/api')).toBe(true);
    expect(isValidUrl('https://api.example.com/v1/users')).toBe(true);
    expect(isValidUrl('https://example.com/path?query=value')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('ftp://example.com')).toBe(false);
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });
});
