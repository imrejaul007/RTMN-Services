import { describe, it, expect, beforeEach, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234')
}));

// Mock fs/promises
const mockCartsData = {};
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(async (path) => {
      const match = path.match(/siteos-carts-(.+)\.json$/);
      if (match) {
        const companyId = match[1];
        if (mockCartsData[companyId]) {
          return JSON.stringify(mockCartsData[companyId]);
        }
      }
      const error = new Error('File not found');
      error.code = 'ENOENT';
      throw error;
    }),
    writeFile: vi.fn(async (path, data) => {
      const match = path.match(/siteos-carts-(.+)\.json$/);
      if (match) {
        const companyId = match[1];
        mockCartsData[companyId] = JSON.parse(data);
      }
    })
  }
}));

// Import app after mocks
const { app, TAX_RATE, CART_TTL_HOURS, VALID_COUPONS } = await import('../../src/index.js');
import express from 'express';

// Create test app
const createTestApp = () => {
  const testApp = express();
  testApp.use(express.json());
  testApp.use((req, res, next) => {
    req.headers['x-api-key'] = req.headers['x-api-key'] || 'test-api-key-12345678';
    next();
  });
  // Mount routes manually for testing
  return testApp;
};

// Simple HTTP test helper
const createMockReq = (overrides = {}) => ({
  params: {},
  body: {},
  headers: {
    'x-api-key': 'test-api-key-12345678',
    'x-company-id': 'test-company',
    'x-customer-id': 'test-customer'
  },
  ...overrides
});

const createMockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('Cart Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockCartsData).forEach(key => delete mockCartsData[key]);
  });

  describe('Configuration', () => {
    it('should have correct TAX_RATE', () => {
      expect(TAX_RATE).toBe(0.18);
    });

    it('should have correct CART_TTL_HOURS', () => {
      expect(CART_TTL_HOURS).toBe(24);
    });

    it('should have valid coupon codes', () => {
      expect(VALID_COUPONS.SAVE10).toBeDefined();
      expect(VALID_COUPONS.SAVE20).toBeDefined();
      expect(VALID_COUPONS.FLAT50).toBeDefined();
      expect(VALID_COUPONS.FLAT100).toBeDefined();
      expect(VALID_COUPONS.WELCOME).toBeDefined();
    });
  });

  describe('Cart Schema', () => {
    it('should have valid coupon structure', () => {
      const coupon = VALID_COUPONS.SAVE10;
      expect(coupon).toHaveProperty('type', 'percentage');
      expect(coupon).toHaveProperty('value', 10);
      expect(coupon).toHaveProperty('description');
    });
  });

  describe('requireAuth Middleware', () => {
    it('should reject requests without API key', async () => {
      const { requireAuth } = await import('../../src/index.js');
      const req = createMockReq({ headers: {} });
      const res = createMockRes();
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'API key required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid API key', async () => {
      const { requireAuth } = await import('../../src/index.js');
      const req = createMockReq({ headers: { 'x-api-key': 'short' } });
      const res = createMockRes();
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid API key' });
    });

    it('should accept requests with valid API key', async () => {
      const { requireAuth } = await import('../../src/index.js');
      const req = createMockReq({ headers: { 'x-api-key': 'valid-api-key-12345678' } });
      const res = createMockRes();
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.apiKey).toBe('valid-api-key-12345678');
    });
  });

  describe('Coupon Validation', () => {
    it('should validate percentage coupon correctly', async () => {
      const { validateCoupon } = await import('../../src/index.js');
      const result = validateCoupon('SAVE10', 1000);
      expect(result.valid).toBe(true);
      expect(result.discount).toBe(100); // 10% of 1000
    });

    it('should validate fixed coupon correctly', async () => {
      const { validateCoupon } = await import('../../src/index.js');
      const result = validateCoupon('FLAT50', 1000);
      expect(result.valid).toBe(true);
      expect(result.discount).toBe(50);
    });

    it('should reject invalid coupon codes', async () => {
      const { validateCoupon } = await import('../../src/index.js');
      const result = validateCoupon('INVALID', 1000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid coupon code');
    });

    it('should cap discount at subtotal', async () => {
      const { validateCoupon } = await import('../../src/index.js');
      const result = validateCoupon('FLAT100', 50); // Cart is only 50
      expect(result.valid).toBe(true);
      expect(result.discount).toBe(50); // Capped at subtotal
    });

    it('should handle case-insensitive coupon codes', async () => {
      const { validateCoupon } = await import('../../src/index.js');
      const result = validateCoupon('save10', 1000);
      expect(result.valid).toBe(true);
      expect(result.discount).toBe(100);
    });
  });

  describe('Totals Calculation', () => {
    it('should calculate totals correctly with items', async () => {
      const { calculateTotals } = await import('../../src/index.js');
      const cart = {
        items: [
          { price: 100, quantity: 2 },
          { price: 50, quantity: 3 }
        ],
        discount: 0
      };

      const totals = calculateTotals(cart);

      expect(totals.subtotal).toBe(350); // 200 + 150
      expect(totals.tax).toBe(63); // 18% of 350
      expect(totals.total).toBe(413); // 350 + 63
    });

    it('should apply discount correctly', async () => {
      const { calculateTotals } = await import('../../src/index.js');
      const cart = {
        items: [
          { price: 100, quantity: 10 }
        ],
        discount: 50
      };

      const totals = calculateTotals(cart);

      expect(totals.subtotal).toBe(1000);
      expect(totals.tax).toBe(171); // 18% of (1000 - 50)
      expect(totals.total).toBe(1121); // 950 + 171
    });
  });

  describe('Cart Creation', () => {
    it('should create a new cart with correct structure', async () => {
      const { createCart } = await import('../../src/index.js');
      const cart = createCart('session-123', 'company-456', 'customer-789');

      expect(cart.sessionId).toBe('session-123');
      expect(cart.companyId).toBe('company-456');
      expect(cart.customerId).toBe('customer-789');
      expect(cart.items).toEqual([]);
      expect(cart.couponCode).toBeNull();
      expect(cart.discount).toBe(0);
      expect(cart.subtotal).toBe(0);
      expect(cart.tax).toBe(0);
      expect(cart.total).toBe(0);
      expect(cart.createdAt).toBeDefined();
      expect(cart.updatedAt).toBeDefined();
    });
  });

  describe('Item Schema', () => {
    it('should have correct item structure', async () => {
      const { createCart } = await import('../../src/index.js');
      const cart = createCart('session-123', 'company-456', 'customer-789');

      const item = {
        id: 'item-uuid',
        productId: 'product-123',
        variantId: 'variant-456',
        name: 'Test Product',
        price: 99.99,
        quantity: 2,
        image: 'https://example.com/image.jpg'
      };

      cart.items.push(item);

      expect(cart.items[0]).toHaveProperty('id');
      expect(cart.items[0]).toHaveProperty('productId');
      expect(cart.items[0]).toHaveProperty('variantId');
      expect(cart.items[0]).toHaveProperty('name');
      expect(cart.items[0]).toHaveProperty('price');
      expect(cart.items[0]).toHaveProperty('quantity');
      expect(cart.items[0]).toHaveProperty('image');
    });
  });
});
