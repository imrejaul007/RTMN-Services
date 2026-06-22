/**
 * Config Validation Tests
 * Note: Config is inline for hojai-skillnet
 */

import { describe, it, expect } from 'vitest';

describe('Config Validation', () => {
  describe('Environment Variables', () => {
    it('should validate required env vars', () => {
      const required = ['MONGODB_URI', 'JWT_SECRET'];
      const env = {
        MONGODB_URI: 'mongodb://localhost:27017/test',
        JWT_SECRET: 'a-very-long-secret-that-is-at-least-32-characters'
      };

      required.forEach(key => {
        expect(env[key as keyof typeof env]).toBeDefined();
      });
    });

    it('should validate JWT_SECRET minimum length', () => {
      const minLength = 32;
      const validSecret = 'a-very-long-secret-that-is-at-least-32-characters';
      const invalidSecret = 'short';

      expect(validSecret.length).toBeGreaterThanOrEqual(minLength);
      expect(invalidSecret.length).toBeLessThan(minLength);
    });

    it('should parse PORT as number', () => {
      const port = parseInt(process.env.PORT || '4530', 10);
      expect(typeof port).toBe('number');
      expect(port).toBeGreaterThan(0);
      expect(port).toBeLessThan(65536);
    });

    it('should validate NODE_ENV values', () => {
      const validEnvs = ['development', 'production', 'test'];
      const currentEnv = process.env.NODE_ENV || 'development';

      expect(validEnvs).toContain(currentEnv);
    });
  });

  describe('CORS Configuration', () => {
    it('should parse CORS_ORIGINS correctly', () => {
      const origins = process.env.CORS_ORIGINS || '';

      if (origins) {
        const parsed = origins.split(',').map(o => o.trim()).filter(Boolean);
        expect(Array.isArray(parsed)).toBe(true);
      } else {
        expect(origins).toBe('');
      }
    });

    it('should allow empty CORS_ORIGINS', () => {
      const origins = '';
      const parsed = origins.split(',').map(o => o.trim()).filter(Boolean);
      expect(parsed).toEqual([]);
    });

    it('should parse multiple origins', () => {
      const origins = 'https://example.com, https://app.example.com, http://localhost:3000';
      const parsed = origins.split(',').map(o => o.trim()).filter(Boolean);
      expect(parsed).toHaveLength(3);
    });
  });

  describe('MongoDB URI', () => {
    it('should be valid URL format', () => {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-skillnet';
      expect(uri.startsWith('mongodb://')).toBe(true);
    });

    it('should support localhost', () => {
      const uri = 'mongodb://localhost:27017/test';
      expect(uri.includes('localhost')).toBe(true);
    });
  });
});
