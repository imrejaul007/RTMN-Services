/**
 * @rez/testing - Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fixtures,
  mocks,
  assert,
  generators,
  createTestClient,
} from '../index';

// ============================================
// Fixtures Tests
// ============================================

describe('Fixtures', () => {
  describe('createUser', () => {
    it('should create user with defaults', () => {
      const user = fixtures.createUser();

      expect(user.id).toBeDefined();
      expect(user.email).toContain('@example.com');
      expect(user.firstName).toBe('Test');
      expect(user.lastName).toBe('User');
      expect(user.role).toBe('user');
      expect(user.createdAt).toBeDefined();
    });

    it('should create user with overrides', () => {
      const user = fixtures.createUser({
        email: 'custom@example.com',
        firstName: 'Custom',
        role: 'admin',
      });

      expect(user.email).toBe('custom@example.com');
      expect(user.firstName).toBe('Custom');
      expect(user.role).toBe('admin');
    });
  });

  describe('createOrder', () => {
    it('should create order with defaults', () => {
      const order = fixtures.createOrder();

      expect(order.id).toBeDefined();
      expect(order.userId).toBe('user_123');
      expect(order.total).toBe(99.99);
      expect(order.status).toBe('pending');
      expect(order.items).toHaveLength(1);
      expect(order.createdAt).toBeDefined();
    });

    it('should create order with overrides', () => {
      const order = fixtures.createOrder({
        total: 199.99,
        status: 'completed',
      });

      expect(order.total).toBe(199.99);
      expect(order.status).toBe('completed');
    });
  });

  describe('createPayment', () => {
    it('should create payment with defaults', () => {
      const payment = fixtures.createPayment();

      expect(payment.id).toBeDefined();
      expect(payment.orderId).toBe('order_123');
      expect(payment.amount).toBe(99.99);
      expect(payment.method).toBe('card');
      expect(payment.status).toBe('pending');
    });

    it('should create payment with overrides', () => {
      const payment = fixtures.createPayment({
        method: 'upi',
        status: 'completed',
      });

      expect(payment.method).toBe('upi');
      expect(payment.status).toBe('completed');
    });
  });
});

// ============================================
// Generators Tests
// ============================================

describe('Generators', () => {
  describe('email', () => {
    it('should generate email', () => {
      const email = generators.email();
      expect(email).toContain('@example.com');
    });

    it('should generate unique emails', () => {
      const email1 = generators.email();
      const email2 = generators.email();
      expect(email1).not.toBe(email2);
    });
  });

  describe('phone', () => {
    it('should generate Indian phone number', () => {
      const phone = generators.phone();
      expect(phone).toMatch(/^\+91/);
    });
  });

  describe('uuid', () => {
    it('should generate valid UUID', () => {
      const uuid = generators.uuid();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generators.uuid();
      const uuid2 = generators.uuid();
      expect(uuid1).not.toBe(uuid2);
    });
  });
});

// ============================================
// Mock Tests
// ============================================

describe('Mocks', () => {
  describe('createAsyncFn', () => {
    it('should return specified value', async () => {
      const mockFn = mocks.createAsyncFn('test-value');
      const result = await mockFn();

      expect(result).toBe('test-value');
    });

    it('should throw error if specified', async () => {
      const error = new Error('test error');
      const mockFn = mocks.createAsyncFn(undefined, error);

      await expect(mockFn()).rejects.toThrow('test error');
    });
  });

  describe('createDelayedFn', () => {
    it('should return value after delay', async () => {
      const mockFn = mocks.createDelayedFn('test-value', 50);
      const start = Date.now();
      const result = await mockFn();
      const elapsed = Date.now() - start;

      expect(result).toBe('test-value');
      expect(elapsed).toBeGreaterThanOrEqual(50);
    });
  });
});

// ============================================
// Assert Tests
// ============================================

describe('Assert', () => {
  describe('isSuccess', () => {
    it('should pass for success response', () => {
      const response = {
        body: {
          success: true,
          data: { id: '123' },
        },
      };

      expect(() => assert.isSuccess(response)).not.toThrow();
    });

    it('should throw for error response', () => {
      const response = {
        body: {
          success: false,
          error: { code: 'ERROR', message: 'Error' },
        },
      };

      expect(() => assert.isSuccess(response)).toThrow();
    });
  });

  describe('isError', () => {
    it('should pass for error response', () => {
      const response = {
        body: {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Not found' },
        },
      };

      expect(() => assert.isError(response)).not.toThrow();
    });

    it('should throw for success response', () => {
      const response = {
        body: {
          success: true,
          data: {},
        },
      };

      expect(() => assert.isError(response)).toThrow();
    });

    it('should check error code if specified', () => {
      const response = {
        body: {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Not found' },
        },
      };

      expect(() => assert.isError(response, 'NOT_FOUND')).not.toThrow();
      expect(() => assert.isError(response, 'WRONG_CODE')).toThrow();
    });
  });

  describe('hasKeys', () => {
    it('should pass when object has all keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(() => assert.hasKeys(obj, ['a', 'b', 'c'])).not.toThrow();
    });

    it('should throw when object is missing keys', () => {
      const obj = { a: 1 };
      expect(() => assert.hasKeys(obj, ['a', 'b'])).toThrow();
    });
  });
});
