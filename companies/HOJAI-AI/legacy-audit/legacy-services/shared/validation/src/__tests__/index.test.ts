/**
 * @rez/validation - Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  schemas,
  email,
  phone,
  uuid,
  password,
  pagination,
  userSchemas,
  authSchemas,
  createSchema,
} from '../index';

// ============================================
// Primitive Schemas Tests
// ============================================

describe('Email Schema', () => {
  it('should validate correct email', () => {
    const result = email.safeParse('test@example.com');
    expect(result.success).toBe(true);
  });

  it('should reject email without @', () => {
    const result = email.safeParse('testexample.com');
    expect(result.success).toBe(false);
  });

  it('should reject email without domain', () => {
    const result = email.safeParse('test@');
    expect(result.success).toBe(false);
  });
});

describe('Phone Schema', () => {
  it('should validate Indian phone with +91', () => {
    const result = phone.safeParse('+919876543210');
    expect(result.success).toBe(true);
  });

  it('should validate Indian phone without +91', () => {
    const result = phone.safeParse('9876543210');
    expect(result.success).toBe(true);
  });

  it('should validate phone with dashes', () => {
    const result = phone.safeParse('+91-9876543210');
    expect(result.success).toBe(true);
  });

  it('should reject invalid phone', () => {
    const result = phone.safeParse('12345');
    expect(result.success).toBe(false);
  });
});

describe('UUID Schema', () => {
  it('should validate correct UUID', () => {
    const result = uuid.safeParse('550e8400-e29b-41d4-a716-446655440000');
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const result = uuid.safeParse('not-a-uuid');
    expect(result.success).toBe(false);
  });
});

describe('Password Schema', () => {
  it('should validate strong password', () => {
    const result = password.safeParse('Password123!');
    expect(result.success).toBe(true);
  });

  it('should reject password without uppercase', () => {
    const result = password.safeParse('password123!');
    expect(result.success).toBe(false);
  });

  it('should reject password without lowercase', () => {
    const result = password.safeParse('PASSWORD123!');
    expect(result.success).toBe(false);
  });

  it('should reject password without number', () => {
    const result = password.safeParse('Password!');
    expect(result.success).toBe(false);
  });

  it('should reject password without special char', () => {
    const result = password.safeParse('Password123');
    expect(result.success).toBe(false);
  });

  it('should reject password shorter than 8 chars', () => {
    const result = password.safeParse('Pass1!');
    expect(result.success).toBe(false);
  });
});

// ============================================
// Pagination Schema Tests
// ============================================

describe('Pagination Schema', () => {
  it('should use defaults when not provided', () => {
    const result = pagination.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('should accept valid pagination', () => {
    const result = pagination.safeParse({ page: 2, limit: 50 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it('should coerce string to number', () => {
    const result = pagination.safeParse({ page: '2', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it('should reject page less than 1', () => {
    const result = pagination.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject limit greater than 100', () => {
    const result = pagination.safeParse({ limit: 200 });
    expect(result.success).toBe(false);
  });
});

// ============================================
// User Schemas Tests
// ============================================

describe('User Schemas', () => {
  describe('create schema', () => {
    it('should validate correct user data', () => {
      const result = userSchemas.create.safeParse({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.success).toBe(true);
    });

    it('should allow optional phone', () => {
      const result = userSchemas.create.safeParse({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+919876543210',
      });

      expect(result.success).toBe(true);
    });

    it('should allow optional role', () => {
      const result = userSchemas.create.safeParse({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'admin',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = userSchemas.create.safeParse({
        email: 'not-an-email',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.success).toBe(false);
    });

    it('should reject weak password', () => {
      const result = userSchemas.create.safeParse({
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const result = userSchemas.create.safeParse({
        email: 'test@example.com',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('update schema', () => {
    it('should allow partial updates', () => {
      const result = userSchemas.update.safeParse({
        firstName: 'Jane',
      });

      expect(result.success).toBe(true);
    });

    it('should allow empty object', () => {
      const result = userSchemas.update.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate phone if provided', () => {
      const result = userSchemas.update.safeParse({
        phone: 'invalid',
      });

      expect(result.success).toBe(false);
    });
  });
});

// ============================================
// Auth Schemas Tests
// ============================================

describe('Auth Schemas', () => {
  describe('login schema', () => {
    it('should validate correct login data', () => {
      const result = authSchemas.login.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = authSchemas.login.safeParse({
        email: 'not-an-email',
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const result = authSchemas.login.safeParse({
        email: 'test@example.com',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('register schema', () => {
    it('should validate correct registration', () => {
      const result = authSchemas.register.safeParse({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.success).toBe(true);
    });

    it('should require strong password', () => {
      const result = authSchemas.register.safeParse({
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('token refresh schema', () => {
    it('should validate refresh token', () => {
      const result = authSchemas.tokenRefresh.safeParse({
        refreshToken: 'some-token',
      });

      expect(result.success).toBe(true);
    });

    it('should reject empty token', () => {
      const result = authSchemas.tokenRefresh.safeParse({
        refreshToken: '',
      });

      expect(result.success).toBe(false);
    });
  });
});

// ============================================
// Schema Factory Tests
// ============================================

describe('Schema Factory', () => {
  it('should create custom schema', () => {
    const customSchema = createSchema({
      name: email,
      value: password,
    });

    const result = customSchema.safeParse({
      name: 'test@example.com',
      value: 'Password123!',
    });

    expect(result.success).toBe(true);
  });

 it('should reject invalid data', () => {
    const customSchema = createSchema({
      name: email,
      value: password,
    });

    const result = customSchema.safeParse({
      name: 'not-an-email',
      value: 'weak',
    });

    expect(result.success).toBe(false);
  });
});
