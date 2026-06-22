/**
 * @rez/security - Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import {
  createToken,
  verifyToken,
  generateToken,
  generateUUID,
  hash,
  secureCompare,
  maskPII,
 z,
} from '../index';

// ============================================
// Token Tests
// ============================================

describe('Token Functions', () => {
  const secret = 'test-secret-key-minimum-32-chars!';

  describe('createToken', () => {
    it('should create a valid JWT token', () => {
      const payload = { userId: 'user_123', role: 'admin' };
      const token = createToken(payload, secret);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include payload in token', () => {
      const payload = { userId: 'user_123', role: 'admin' };
      const token = createToken(payload, secret);
      const decoded = verifyToken(token, secret);

      expect(decoded?.userId).toBe('user_123');
      expect(decoded?.role).toBe('admin');
    });

    it('should include expiration claim', () => {
      const payload = { userId: 'user_123' };
      const token = createToken(payload, secret, '1h');
      const decoded = verifyToken(token, secret);

      expect(decoded?.exp).toBeDefined();
      expect(decoded?.iat).toBeDefined();
      expect(decoded?.exp).toBeGreaterThan(decoded?.iat!);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const payload = { userId: 'user_123' };
      const token = createToken(payload, secret);
      const decoded = verifyToken(token, secret);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe('user_123');
    });

    it('should return null for invalid token', () => {
      const decoded = verifyToken('invalid.token.here', secret);
      expect(decoded).toBeNull();
    });

    it('should return null for tampered token', () => {
      const payload = { userId: 'user_123' };
      const token = createToken(payload, secret);
      const [h, d, s] = token.split('.');
      const tampered = `${h}.${d}.${s}x`;

      expect(verifyToken(tampered, secret)).toBeNull();
    });

    it('should return null for expired token', () => {
      // Create an expired token by manipulating the payload after creation
      // We'll create a token and then tamper with it to have an expired time
      const payload = { userId: 'user_123' };
      const token = createToken(payload, secret, '1h');

      // Manually create an expired token by base64 encoding a payload with expired exp
      const expiredPayload = {
        userId: 'user_123',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
      };
      const expiredData = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const sig = crypto.createHmac('sha256', secret).update(`${header}.${expiredData}`).digest('base64url');
      const expiredToken = `${header}.${expiredData}.${sig}`;

      const decoded = verifyToken(expiredToken, secret);
      expect(decoded).toBeNull();
    });

    it('should return null for wrong secret', () => {
      const payload = { userId: 'user_123' };
      const token = createToken(payload, secret);
      const decoded = verifyToken(token, 'wrong-secret');

      expect(decoded).toBeNull();
    });
  });
});

// ============================================
// Token Generation Tests
// ============================================

describe('Token Generation', () => {
  describe('generateToken', () => {
    it('should generate token of default length', () => {
      const token = generateToken();
      expect(token.length).toBeGreaterThan(30);
    });

    it('should generate token of specified length', () => {
      const token = generateToken(16);
      expect(token.length).toBe(22); // base64url of 16 bytes
    });

    it('should generate unique tokens', () => {
      const token1 = generateToken();
      const token2 = generateToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateUUID', () => {
    it('should generate valid UUID v4', () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });
});

// ============================================
// Hashing Tests
// ============================================

describe('Hash Functions', () => {
  describe('hash', () => {
    it('should hash data consistently', () => {
      const data = 'test-data';
      const hash1 = hash(data);
      const hash2 = hash(data);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different data', () => {
      const hash1 = hash('data1');
      const hash2 = hash('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce base64url output', () => {
      const hashValue = hash('test');
      expect(hashValue).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('secureCompare', () => {
    it('should return true for equal strings', () => {
      expect(secureCompare('test', 'test')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(secureCompare('test', 'different')).toBe(false);
    });

    it('should return false for different lengths', () => {
      expect(secureCompare('short', 'longerstring')).toBe(false);
    });
  });
});

// ============================================
// PII Masking Tests
// ============================================

describe('PII Masking', () => {
  describe('maskPII', () => {
    it('should mask email addresses', () => {
      const data = { email: 'john.doe@example.com' };
      const masked = maskPII(data);

      expect(masked.email).toBe('jo***@example.com');
    });

    it('should mask phone numbers', () => {
      const data = { phone: '+919876543210' };
      const masked = maskPII(data);

      expect(masked.phone).toContain('***');
    });

    it('should mask passwords', () => {
      const data = { password: 'secret123' };
      const masked = maskPII(data);

      expect(masked.password).toBe('[REDACTED]');
    });

    it('should mask tokens', () => {
      const data = { token: 'abc123xyz' };
      const masked = maskPII(data);

      expect(masked.token).toBe('[REDACTED]');
    });

    it('should mask apiKey fields', () => {
      const data = { apiKey: 'sk-1234567890' };
      const masked = maskPII(data);

      expect(masked.apiKey).toBe('[REDACTED]');
    });

    it('should preserve non-PII fields', () => {
      const data = { name: 'John', age: 30, city: 'Mumbai' };
      const masked = maskPII(data);

      expect(masked.name).toBe('John');
      expect(masked.age).toBe(30);
      expect(masked.city).toBe('Mumbai');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          email: 'john@example.com',
          name: 'John',
        },
      };
      const masked = maskPII(data);

      expect(masked.user.email).toBe('jo***@example.com');
      expect(masked.user.name).toBe('John');
    });

    it('should handle arrays', () => {
      const data = {
        users: [
          { email: 'john@example.com' },
          { email: 'jane@example.com' },
        ],
      };
      const masked = maskPII(data);

      expect(masked.users[0].email).toBe('jo***@example.com');
      expect(masked.users[1].email).toBe('ja***@example.com');
    });
  });
});

// ============================================
// Validation Schemas Tests
// ============================================

describe('Zod Schemas', () => {
  describe('email validation', () => {
    it('should validate correct email', () => {
      const result = z.string().email().safeParse('test@example.com');
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = z.string().email().safeParse('not-an-email');
      expect(result.success).toBe(false);
    });
  });

  describe('password validation', () => {
    it('should validate strong password', () => {
      const result = z.string()
        .min(8)
        .regex(/[A-Z]/)
        .regex(/[a-z]/)
        .regex(/[0-9]/)
        .regex(/[^A-Za-z0-9]/)
        .safeParse('Password123!');

      expect(result.success).toBe(true);
    });

    it('should reject weak password (too short)', () => {
      const result = z.string().min(8).safeParse('Pass1!');
      expect(result.success).toBe(false);
    });
  });

  describe('phone validation', () => {
    it('should validate Indian phone numbers', () => {
      const phoneSchema = z.string().regex(/^(\+91)?[\s-]?[6-9]\d{9}$/);
      const result = phoneSchema.safeParse('+919876543210');
      expect(result.success).toBe(true);
    });

    it('should reject invalid phone', () => {
      const phoneSchema = z.string().regex(/^(\+91)?[\s-]?[6-9]\d{9}$/);
      const result = phoneSchema.safeParse('12345');
      expect(result.success).toBe(false);
    });
  });

  describe('uuid validation', () => {
    it('should validate correct UUID', () => {
      const result = z.string().uuid().safeParse('550e8400-e29b-41d4-a716-446655440000');
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = z.string().uuid().safeParse('not-a-uuid');
      expect(result.success).toBe(false);
    });
  });
});
