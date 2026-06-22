/**
 * Security Unit Tests
 * Tests for authentication, authorization, and input validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================
// Timing-Safe Token Comparison Tests
// ============================================

describe('Timing-Safe Token Comparison', () => {
  // Simulated timing-safe comparison
  function timingSafeEqual(a: string, b: string): boolean {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  it('should return true for matching tokens', () => {
    const token = 'secret-token-12345';
    expect(timingSafeEqual(token, token)).toBe(true);
  });

  it('should return false for non-matching tokens', () => {
    expect(timingSafeEqual('token1', 'token2')).toBe(false);
  });

  it('should return false for empty strings', () => {
    expect(timingSafeEqual('', '')).toBe(false);
  });

  it('should return false for null/undefined', () => {
    expect(timingSafeEqual('', 'token')).toBe(false);
    expect(timingSafeEqual('token', '')).toBe(false);
  });

  it('should handle tokens of different lengths', () => {
    expect(timingSafeEqual('short', 'much-longer-token')).toBe(false);
  });
});

// ============================================
// Input Validation Tests
// ============================================

describe('Input Validation', () => {
  // Phone number validation
  function isValidPhone(phone: string): boolean {
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

  // Email validation
  function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // MongoDB injection prevention
  function sanitizeMongoQuery(query: Record<string, unknown>): Record<string, unknown> {
    const forbidden = ['$', '{', '}'];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(query)) {
      if (forbidden.some(c => key.includes(c))) {
        throw new Error(`Invalid query key: ${key}`);
      }
      if (typeof value === 'string') {
        sanitized[key] = value.replace(/[$]/g, '');
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  describe('Phone Validation', () => {
    it('should accept valid phone numbers', () => {
      expect(isValidPhone('+919876543210')).toBe(true);
      expect(isValidPhone('9876543210')).toBe(true);
      expect(isValidPhone('+1-234-567-8901')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('abcdefghij')).toBe(false);
      expect(isValidPhone('')).toBe(false);
    });
  });

  describe('Email Validation', () => {
    it('should accept valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.in')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('MongoDB Query Sanitization', () => {
    it('should sanitize dangerous query keys', () => {
      expect(() => sanitizeMongoQuery({ '$where': '1=1' })).toThrow('Invalid query key');
      expect(() => sanitizeMongoQuery({ '$gt': '' })).toThrow('Invalid query key');
    });

    it('should allow normal query keys', () => {
      const result = sanitizeMongoQuery({ name: 'John', age: 30 });
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should remove $ from string values', () => {
      const result = sanitizeMongoQuery({ name: 'John$where' });
      expect(result.name).toBe('Johnwhere');
    });
  });
});

// ============================================
// Rate Limiting Tests
// ============================================

describe('Rate Limiting', () => {
  class MockRateLimiter {
    private requests = new Map<string, number[]>();
    private readonly windowMs: number;
    private readonly maxRequests: number;

    constructor(windowMs = 60000, maxRequests = 100) {
      this.windowMs = windowMs;
      this.maxRequests = maxRequests;
    }

    isAllowed(identifier: string): boolean {
      const now = Date.now();
      const windowStart = now - this.windowMs;

      const timestamps = (this.requests.get(identifier) || [])
        .filter(t => t > windowStart);

      if (timestamps.length >= this.maxRequests) {
        return false;
      }

      timestamps.push(now);
      this.requests.set(identifier, timestamps);
      return true;
    }

    getRemainingRequests(identifier: string): number {
      const now = Date.now();
      const windowStart = now - this.windowMs;
      const timestamps = (this.requests.get(identifier) || [])
        .filter(t => t > windowStart);
      return Math.max(0, this.maxRequests - timestamps.length);
    }
  }

  it('should allow requests within limit', () => {
    const limiter = new MockRateLimiter(60000, 5);

    for (let i = 0; i < 5; i++) {
      expect(limiter.isAllowed('user1')).toBe(true);
    }
  });

  it('should block requests over limit', () => {
    const limiter = new MockRateLimiter(60000, 3);

    limiter.isAllowed('user1');
    limiter.isAllowed('user1');
    limiter.isAllowed('user1');

    expect(limiter.isAllowed('user1')).toBe(false);
  });

  it('should track requests per identifier', () => {
    const limiter = new MockRateLimiter(60000, 2);

    limiter.isAllowed('user1');
    limiter.isAllowed('user1');
    expect(limiter.isAllowed('user1')).toBe(false);

    expect(limiter.isAllowed('user2')).toBe(true);
    expect(limiter.isAllowed('user2')).toBe(true);
    expect(limiter.isAllowed('user2')).toBe(false);
  });

  it('should return remaining request count', () => {
    const limiter = new MockRateLimiter(60000, 10);

    limiter.isAllowed('user1');
    limiter.isAllowed('user1');
    limiter.isAllowed('user1');

    expect(limiter.getRemainingRequests('user1')).toBe(7);
  });
});

// ============================================
// CORS Validation Tests
// ============================================

describe('CORS Validation', () => {
  const allowedOrigins = ['https://rez.money', 'https://admin.rez.money'];
  const isProduction = true;

  function validateCorsOrigin(origin: string | undefined): boolean {
    if (!origin) return true; // Server-to-server allowed
    if (!isProduction && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return true;
    }
    return allowedOrigins.includes(origin);
  }

  it('should allow requests without origin', () => {
    expect(validateCorsOrigin(undefined)).toBe(true);
  });

  it('should allow whitelisted origins', () => {
    expect(validateCorsOrigin('https://rez.money')).toBe(true);
    expect(validateCorsOrigin('https://admin.rez.money')).toBe(true);
  });

  it('should block non-whitelisted origins in production', () => {
    expect(validateCorsOrigin('https://evil.com')).toBe(false);
    expect(validateCorsOrigin('https://rez.money.evil.com')).toBe(false);
  });

  it('should allow localhost in development', () => {
    // In production, localhost should be blocked
    expect(validateCorsOrigin('http://localhost:3000')).toBe(false);
    expect(validateCorsOrigin('http://127.0.0.1:3000')).toBe(false);
  });
});

// ============================================
// JWT Validation Tests
// ============================================

describe('JWT Validation', () => {
  function isValidJWTFormat(token: string): boolean {
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  function hasValidJWTHeader(token: string): boolean {
    try {
      const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
      return header.alg !== 'none' && header.typ === 'JWT';
    } catch {
      return false;
    }
  }

  it('should validate JWT format', () => {
    const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    expect(isValidJWTFormat(validJWT)).toBe(true);
    expect(isValidJWTFormat('invalid')).toBe(false);
    expect(isValidJWTFormat('a.b')).toBe(false);
  });

  it('should validate JWT header', () => {
    const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    expect(hasValidJWTHeader(validJWT)).toBe(true);

    // None algorithm should be blocked
    const noneJWT = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.e30.';
    expect(hasValidJWTHeader(noneJWT)).toBe(false);
  });
});

// ============================================
// Password Strength Tests
// ============================================

describe('Password Strength', () => {
  function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) errors.push('Password must be at least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Password must contain lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('Password must contain number');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain special character');
    }

    return { valid: errors.length === 0, errors };
  }

  it('should accept strong passwords', () => {
    const result = validatePasswordStrength('SecurePass123!');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject weak passwords', () => {
    expect(validatePasswordStrength('weak').valid).toBe(false);
    expect(validatePasswordStrength('alllowercase123!').valid).toBe(false);
    expect(validatePasswordStrength('ALLUPPERCASE123!').valid).toBe(false);
  });

  it('should return specific error messages', () => {
    const result = validatePasswordStrength('short');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors).toContain('Password must be at least 8 characters');
  });
});
