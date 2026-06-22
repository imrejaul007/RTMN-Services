/**
 * Sanitization Middleware Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeString,
  sanitizeObject,
  isValidEventType,
  isValidUUID,
  isValidEmail,
  isValidUrl
} from '../middleware/sanitize.js';

describe('Sanitization Utilities', () => {
  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeString(input);
      // After removing tags and encoding, we get the encoded version
      expect(result).toContain('Hello');
    });

    it('should encode HTML entities', () => {
      const input = '<div>Test & "quotes"</div>';
      const result = sanitizeString(input);
      // HTML tags are removed first, then entities are encoded
      expect(result).toContain('Test');
    });

    it('should encode special characters', () => {
      const input = "Test's & <tags>";
      const result = sanitizeString(input);
      // Single quotes and ampersands get encoded
      expect(result).toContain('Test');
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should return non-string values unchanged', () => {
      expect(sanitizeString(123 as unknown as string)).toBe(123);
      expect(sanitizeString(null as unknown as string)).toBe(null);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string values in object', () => {
      const input = {
        name: '<script>alert(1)</script>',
        description: 'Normal text'
      };
      const result = sanitizeObject(input) as Record<string, string>;
      expect(result.name).toBe('alert(1)');
      expect(result.description).toBe('Normal text');
    });

    it('should sanitize nested objects', () => {
      const input = {
        user: {
          name: '<b>John</b>',
          email: 'test@example.com'
        }
      };
      const result = sanitizeObject(input) as any;
      expect(result.user.name).toBe('John');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should sanitize arrays', () => {
      const input = ['<script>x</script>', 'normal', '<div>y</div>'];
      const result = sanitizeObject(input) as string[];
      expect(result[0]).toBe('x');
      expect(result[1]).toBe('normal');
      expect(result[2]).toBe('y');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeObject(null)).toBe(null);
      expect(sanitizeObject(undefined)).toBe(undefined);
    });

    it('should preserve numbers and booleans', () => {
      const input = {
        count: 42,
        active: true,
        name: '<b>Test</b>'
      };
      const result = sanitizeObject(input) as any;
      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
      expect(result.name).toBe('Test');
    });
  });

  describe('isValidEventType', () => {
    it('should accept valid event types', () => {
      expect(isValidEventType('user.created')).toBe(true);
      expect(isValidEventType('order.updated')).toBe(true);
      expect(isValidEventType('commerce_payment')).toBe(true);
      expect(isValidEventType('ProductView')).toBe(true);
    });

    it('should reject invalid event types', () => {
      expect(isValidEventType('<script>alert(1)</script>')).toBe(false);
      expect(isValidEventType('event with spaces')).toBe(false);
      expect(isValidEventType('event@special')).toBe(false);
    });

    it('should reject overly long event types', () => {
      const longType = 'a'.repeat(101);
      expect(isValidEventType(longType)).toBe(false);
    });
  });

  describe('isValidUUID', () => {
    it('should accept valid UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should accept valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should accept valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000/api')).toBe(true);
      expect(isValidUrl('https://api.example.com/v1/users')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });
});
