/**
 * @rez/testing - Testing Utilities
 *
 * Features:
 * - Jest/Vitest configuration
 * - Common test utilities
 * - Mock factories
 * - Database fixtures
 * - API testing helpers
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import request from 'supertest';
import { Express } from 'express';

const execAsync = promisify(exec);

// Re-export test framework
export { describe, it, expect, test, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// ============================================
// Database Setup/Teardown
// ============================================

export const setup = {
  /**
   * Setup test database
   */
  async testDatabase(uri?: string): Promise<void> {
    const mongoUri = uri ?? process.env.MONGODB_TEST_URI ?? 'mongodb://localhost:27017/test';
    process.env.MONGODB_URI = mongoUri;
    // Initialize connection here if needed
  },

  /**
   * Setup Redis test client
   */
  async redis(): Promise<void> {
    const redisUrl = process.env.REDIS_TEST_URL ?? 'redis://localhost:6379/15';
    process.env.REDIS_URL = redisUrl;
  },

  /**
   * Clear all test data
   */
  async clearData(): Promise<void> {
    // Clear MongoDB collections
    // Clear Redis keys
  },
};

export const teardown = {
  /**
   * Close test database connection
   */
  async testDatabase(): Promise<void> {
    // Close MongoDB connection
  },

  /**
   * Close Redis connection
   */
  async redis(): Promise<void> {
    // Close Redis connection
  },
};

// ============================================
// Fixtures
// ============================================

export const fixtures = {
  /**
   * Create test user
   */
  createUser(overrides = {}) {
    return {
      id: `user_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Create test order
   */
  createOrder(overrides = {}) {
    return {
      id: `order_${Date.now()}`,
      userId: 'user_123',
      total: 99.99,
      status: 'pending',
      items: [
        { id: 'item_1', name: 'Product', price: 49.99, quantity: 2 },
      ],
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Create test payment
   */
  createPayment(overrides = {}) {
    return {
      id: `payment_${Date.now()}`,
      orderId: 'order_123',
      amount: 99.99,
      method: 'card',
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  },
};

// ============================================
// API Testing Helpers
// ============================================

export function createTestClient(app: Express) {
  const agent = request.agent(app);

  return {
    /**
     * GET request
     */
    get(path: string) {
      return agent.get(path);
    },

    /**
     * POST request
     */
    post(path: string) {
      return agent.post(path);
    },

    /**
     * PUT request
     */
    put(path: string) {
      return agent.put(path);
    },

    /**
     * PATCH request
     */
    patch(path: string) {
      return agent.patch(path);
    },

    /**
     * DELETE request
     */
    delete(path: string) {
      return agent.delete(path);
    },

    /**
     * Set authorization header
     */
    auth(token: string) {
      agent.set('Authorization', `Bearer ${token}`);
      return this;
    },

    /**
     * Set request ID
     */
    withRequestId(requestId: string) {
      agent.set('X-Request-ID', requestId);
      return this;
    },
  };
}

// ============================================
// Mock Helpers
// ============================================

export const mocks = {
  /**
   * Create async mock function
   */
  createAsyncFn<T = unknown>(returnValue?: T, error?: Error) {
    return vi.fn().mockImplementation(async () => {
      if (error) throw error;
      return returnValue;
    });
  },

  /**
   * Create mock with delay
   */
  createDelayedFn<T = unknown>(returnValue: T, delayMs = 100) {
    return vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return returnValue;
    });
  },
};

// ============================================
// Assertions
// ============================================

export const assert = {
  /**
   * Assert response has success format
   */
  isSuccess(response: { body: { success?: boolean; data?: unknown } }) {
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  },

  /**
   * Assert response has error format
   */
  isError(response: { body: { success?: boolean; error?: { code: string; message: string } } }, code?: string) {
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    if (code) {
      expect(response.body.error.code).toBe(code);
    }
  },

  /**
   * Assert object has required keys
   */
  hasKeys(obj: Record<string, unknown>, keys: string[]) {
    keys.forEach(key => {
      expect(obj).toHaveProperty(key);
    });
  },
};

// ============================================
// Test Data Generators
// ============================================

export const generators = {
  /**
   * Generate random email
   */
  email(): string {
    return `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
  },

  /**
   * Generate random phone
   */
  phone(): string {
    return `+91${Math.floor(6000000000 + Math.random() * 3999999999)}`;
  },

  /**
   * Generate UUID
   */
  uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },
};

export default {
  setup,
  teardown,
  fixtures,
  createTestClient,
  mocks,
  assert,
  generators,
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'testing',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
