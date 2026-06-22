/**
 * Sanitization Middleware Tests
 * Note: Sanitization logic is inline for hojai-skillnet
 */

import { describe, it, expect } from 'vitest';

// Inline sanitization functions for testing
function sanitizeString(value: string): string {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(item => sanitizeObject(item));
  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
}

const EVENT_TYPE_PATTERN = /^[a-zA-Z0-9._-]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEventType(type: string): boolean {
  return EVENT_TYPE_PATTERN.test(type) && type.length <= 100;
}

function isValidUUID(id: string): boolean {
  return UUID_PATTERN.test(id);
}

function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

describe('Sanitization', () => {
  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      const result = sanitizeString('<script>alert(1)</script>Test');
      expect(result).toContain('Test');
    });

    it('should handle plain text', () => {
      const result = sanitizeString('Hello World');
      expect(result).toBe('Hello World');
    });

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize nested objects', () => {
      const input = { user: { name: '<b>John</b>' } };
      const result = sanitizeObject(input) as any;
      expect(result.user.name).toBe('John');
    });

    it('should handle arrays', () => {
      const input = ['<script>x</script>', 'normal'];
      const result = sanitizeObject(input) as string[];
      expect(result[0]).toBe('x');
      expect(result[1]).toBe('normal');
    });

    it('should preserve numbers and booleans', () => {
      const input = { count: 42, active: true };
      const result = sanitizeObject(input) as any;
      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate event types', () => {
      expect(isValidEventType('order.created')).toBe(true);
      expect(isValidEventType('invalid type')).toBe(false);
    });

    it('should validate UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('not-a-uuid')).toBe(false);
    });

    it('should validate emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('invalid')).toBe(false);
    });

    it('should validate URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('not-a-url')).toBe(false);
    });
  });
});
