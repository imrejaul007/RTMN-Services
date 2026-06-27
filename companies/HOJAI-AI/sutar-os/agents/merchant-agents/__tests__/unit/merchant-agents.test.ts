/**
 * Merchant Agents Service Unit Tests
 * Business AI agents for autonomous commerce, negotiation, orders, and pricing
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@rtmn/shared/lib/persistent-map', () => ({
  PersistentMap: class {
    constructor(name) { this._name = name; this._data = new Map(); }
    get(k) { return this._data.get(k); }
    set(k, v) { this._data.set(k, v); return this; }
    delete(k) { return this._data.delete(k); }
    has(k) { return this._data.has(k); }
    get size() { return this._data.size; }
    values() { return this._data.values(); }
  },
}));

vi.mock('@rtmn/shared/security', () => ({ setupSecurity: vi.fn(), strictLimiter: (r, h, n) => n }));
vi.mock('@rtmn/shared/lib/env', () => ({ requireEnv: vi.fn() }));
vi.mock('@rtmn/shared/auth', () => ({ requireAuth: (r, h, n) => n }));
vi.mock('@rtmn/shared/lib/shutdown', () => ({ installGracefulShutdown: vi.fn() }));
vi.mock('./rez-intel-client', () => ({ default: { checkRezIntelHealth: vi.fn().mockResolvedValue(false), REZ_INTEL_ENABLED: false, REZ_INTEL_URL: '' } }));
vi.mock('./whatsapp-client', () => ({ default: { WHATSAPP_ENABLED: false, WHATSAPP_OS_URL: '', WHATSAPP_TIMEOUT: 5000 } }));
vi.mock('./voice-client', () => ({ default: { VOICE_ENABLED: false, VOICE_OS_URL: '', VOICE_TIMEOUT: 5000 } }));

// Mock uuid globally
vi.stubGlobal('uuid', { v4: () => 'test-uuid-123' });

const {
  INDUSTRIES,
  INDUSTRY_TEMPLATES,
  createMerchantAI,
  handleQuery,
  generateQuote,
  handleCounterOffer,
  processOrder,
  findMatchingProduct,
  trackOrder,
} = await import('../../src/index.js');

describe('Merchant Agents Service', () => {

  // =========================================================================
  // Constants
  // =========================================================================
  describe('Industry Types', () => {
    it('should define all 21 industry types', () => {
      expect(Object.keys(INDUSTRIES).length).toBe(21);
      expect(INDUSTRIES.RESTAURANT).toBe('restaurant');
      expect(INDUSTRIES.HOTEL).toBe('hotel');
      expect(INDUSTRIES.HEALTHCARE).toBe('healthcare');
      expect(INDUSTRIES.RETAIL).toBe('retail');
      expect(INDUSTRIES.TRAVEL).toBe('travel');
    });
  });

  describe('Industry Templates', () => {
    it('should define Restaurant template with correct rules', () => {
      const tpl = INDUSTRY_TEMPLATES[INDUSTRIES.RESTAURANT];
      expect(tpl.capabilities).toContain('reservation');
      expect(tpl.capabilities).toContain('delivery');
      expect(tpl.rules.minOrderValue).toBe(15);
      expect(tpl.rules.maxDiscount).toBe(0.15);
      expect(tpl.rules.acceptReturns).toBe(false);
    });

    it('should define Hotel template with correct rules', () => {
      const tpl = INDUSTRY_TEMPLATES[INDUSTRIES.HOTEL];
      expect(tpl.capabilities).toContain('booking');
      expect(tpl.capabilities).toContain('check_in');
      expect(tpl.rules.minOrderValue).toBe(50);
      expect(tpl.rules.acceptReturns).toBe(false);
    });

    it('should define Retail template with returns enabled', () => {
      const tpl = INDUSTRY_TEMPLATES[INDUSTRIES.RETAIL];
      expect(tpl.rules.acceptReturns).toBe(true);
      expect(tpl.rules.returnDays).toBe(30);
      expect(tpl.rules.freeShippingThreshold).toBe(50);
    });

    it('should define Healthcare template with no returns', () => {
      const tpl = INDUSTRY_TEMPLATES[INDUSTRIES.HEALTHCARE];
      expect(tpl.rules.acceptReturns).toBe(false);
      expect(tpl.rules.autoAcceptThreshold).toBe(0.05);
    });
  });

  // =========================================================================
  // Merchant AI Creation
  // =========================================================================
  describe('createMerchantAI', () => {
    it('should create merchant with default values', () => {
      const merchant = createMerchantAI({
        businessId: 'biz-001',
        businessName: 'Test Restaurant',
        industry: INDUSTRIES.RESTAURANT,
      });

      expect(merchant.id).toBeDefined();
      expect(merchant.businessName).toBe('Test Restaurant');
      expect(merchant.industry).toBe('restaurant');
      expect(merchant.type).toBe('merchant');
      expect(merchant.status).toBe('online');
      expect(merchant.rules.maxDiscount).toBe(0.15); // Restaurant default
      expect(merchant.pricing.strategy).toBe('dynamic');
    });

    it('should create merchant with custom rules', () => {
      const merchant = createMerchantAI({
        businessId: 'biz-002',
        businessName: 'Custom Shop',
        industry: INDUSTRIES.RETAIL,
        rules: {
          minOrderValue: 100,
          maxDiscount: 0.50,
          autoAcceptThreshold: 0.10,
        },
      });

      expect(merchant.rules.minOrderValue).toBe(100);
      expect(merchant.rules.maxDiscount).toBe(0.50);
      expect(merchant.rules.autoAcceptThreshold).toBe(0.10);
    });

    it('should create merchant with custom AI personality', () => {
      const merchant = createMerchantAI({
        businessId: 'biz-003',
        businessName: 'Premium Hotel',
        industry: INDUSTRIES.HOTEL,
        personality: 'formal',
        aiName: 'Concierge AI',
      });

      expect(merchant.ai.personality).toBe('formal');
      expect(merchant.ai.name).toBe('Concierge AI');
    });

    it('should create merchant with catalog', () => {
      const catalog = [
        { id: 'prod-1', name: 'Burger', price: 10, description: 'Delicious burger' },
        { id: 'prod-2', name: 'Pizza', price: 15, description: 'Fresh pizza' },
      ];

      const merchant = createMerchantAI({
        businessId: 'biz-004',
        businessName: 'Food Court',
        industry: INDUSTRIES.RESTAURANT,
        catalog,
      });

      expect(merchant.catalog.length).toBe(2);
      expect(merchant.catalog[0].name).toBe('Burger');
    });

    it('should set tier correctly', () => {
      const basic = createMerchantAI({ businessId: 'b1', businessName: 'Basic', industry: 'retail', tier: 'basic' });
      const pro = createMerchantAI({ businessId: 'b2', businessName: 'Pro', industry: 'retail', tier: 'pro' });
      const enterprise = createMerchantAI({ businessId: 'b3', businessName: 'Enterprise', industry: 'retail', tier: 'enterprise' });

      expect(basic.tier).toBe('basic');
      expect(pro.tier).toBe('pro');
      expect(enterprise.tier).toBe('enterprise');
    });
  });

  // =========================================================================
  // Query Handling
  // =========================================================================
  describe('handleQuery', () => {
    it('should return QUERY_RECEIVED with match when product found', () => {
      const merchant = createMerchantAI({
        businessId: 'biz-q1',
        businessName: 'Test Shop',
        industry: INDUSTRIES.RETAIL,
        catalog: [
          { id: 'p1', name: 'Laptop', description: 'Gaming laptop', price: 999 },
        ],
      });

      const query = {
        sender: 'genie-1',
        negotiationId: 'neg-123',
        intent: 'laptop',
      };

      const response = handleQuery(merchant.id, query);

      expect(response.type).toBe('QUERY_RECEIVED');
      expect(response.match).toBeDefined();
      expect(response.match.name).toBe('Laptop');
      expect(response.action).toBe('generate_quote');
    });

    it('should request more info when no product match', () => {
      const merchant = createMerchantAI({
        businessId: 'biz-q2',
        businessName: 'Empty Shop',
        industry: INDUSTRIES.RETAIL,
        catalog: [],
      });

      const query = {
        sender: 'genie-1',
        intent: 'nonexistent product xyz',
      };

      const response = handleQuery(merchant.id, query);

      expect(response.action).toBe('request_more_info');
      expect(response.match).toBeUndefined();
    });

    it('should throw when merchant not found', () => {
      expect(() => handleQuery('nonexistent-id', { intent: 'test' })).toThrow('Merchant not found');
    });
  });

  // =========================================================================
  // Quote Generation
  // =========================================================================
  describe('generateQuote', () => {
    it('should generate quote with base price', () => {
      const merchant = createMerchantAI({
        businessId: 'biz-quote1',
        businessName: 'Quote Shop',
        industry: INDUSTRIES.RETAIL,
        pricing: { margins: { min: 0.10, target: 0.25, max: 0.40 } },
      });

      const query = {
        sender: 'genie-1',
        negotiationId: 'neg-456',
        intent: 'gadget',
        constraints: { quantity: 1 },
      };

      const product = { name: 'Smartphone', price: 500, description: 'Latest model' };

      const quote = generateQuote(merchant.id, query, product);

      expect(quote.type).toBe('QUOTE');
      expect(quote.sender).toContain('retail-');
      expect(quote.receiver).toBe('genie-1');
      expect(quote.negotiationId).toBe('neg-456');
      expect(quote.offer.product).toBe('Smartphone');
      expect(quote.offer.price).toBeGreaterThan(0);
      expect(quote.negotiableFields).toContain('price');
    });

    it('should apply quantity discount for bulk orders', () => {
      const merchant = createMerchantAI({
        businessId: 'biz-quote2',
        businessName: 'Bulk Shop',
        industry: INDUSTRIES.RETAIL,
      });

      const query = {
        sender: 'genie-1',
        intent: 'widget',
        constraints: { quantity: 100 }, // Bulk order
      };

      const quote = generateQuote(merchant.id, query, { name: 'Widget', price: 100 });

      expect(quote.offer.quantity).toBe(100);
      // Bulk discount should have been applied
      expect(quote.offer.price).toBeLessThan(100 * 1.3); // Less than base with margin
    });

    it('should apply urgent surcharge', () => {
      const merchant = createMerchantAI({
        businessId: 'biz-quote3',
        businessName: 'Fast Shop',
        industry: INDUSTRIES.RETAIL,
      });

      const normalQuery = {
        sender: 'genie-1',
        intent: 'item',
        constraints: { quantity: 1 },
        context: { urgency: 'normal' },
      };
      const urgentQuery = {
        sender: 'genie-1',
        intent: 'item',
        constraints: { quantity: 1 },
        context: { urgency: 'urgent' },
      };

      const normalQuote = generateQuote(merchant.id, normalQuery, { name: 'Item', price: 100 });
      const urgentQuote = generateQuote(merchant.id, urgentQuery, { name: 'Item', price: 100 });

      expect(urgentQuote.offer.price).toBeGreaterThan(normalQuote.offer.price);
    });
  });

  // =========================================================================
  // Counter Offer Handling
  // =========================================================================
  describe('handleCounterOffer', () => {
    it('should auto-accept when within autoAcceptThreshold', () => {
      const merchant = createMerchantAI({
        businessId: 'biz-counter1',
        businessName: 'Flexible Shop',
        industry: INDUSTRIES.RETAIL,
        rules: { maxDiscount: 0.20, autoAcceptThreshold: 0.10 },
      });

      const counter = {
        counterOffer: {
          originalPrice: 100,
          price: 94, // Within 10% threshold
        },
        reasoning: 'Acceptable offer',
      };

      const result = handleCounterOffer(merchant.id, 'neg-789', counter);

      expect(result.type).toBe('ACCEPT');
    });

    it('should counter when outside auto-accept but within max discount', () => {
      const merchant = createMerchantAI({
        businessId: 'biz-counter2',
        businessName: 'Negotiable Shop',
        industry: INDUSTRIES.RETAIL,
        rules: { maxDiscount: 0.30, autoAcceptThreshold: 0.05 },
      });

      const counter = {
        counterOffer: {
          originalPrice: 100,
          price: 80, // Below threshold but above min
        },
        reasoning: 'Counter offer',
      };

      const result = handleCounterOffer(merchant.id, 'neg-790', counter);

      expect(result.type).toBe('COUNTER');
      expect(result.counterOffer).toBeDefined();
      expect(result.remainingRounds).toBeGreaterThanOrEqual(0);
    });

    it('should reject when below minimum price', () => {
      const merchant = createMerchantAI({
        businessId: 'biz-counter3',
        businessName: 'Strict Shop',
        industry: INDUSTRIES.RETAIL,
        rules: { maxDiscount: 0.20 }, // 20% max = 80 is min
      });

      const counter = {
        counterOffer: {
          originalPrice: 100,
          price: 50, // Way below minimum
        },
      };

      const result = handleCounterOffer(merchant.id, 'neg-791', counter);

      expect(result.type).toBe('REJECT');
      expect(result.reason).toContain('Cannot go below');
    });
  });

  // =========================================================================
  // Order Processing
  // =========================================================================
  describe('processOrder', () => {
    it('should create order with fulfillment steps', () => {
      const merchant = createMerchantAI({
        businessId: 'biz-order1',
        businessName: 'Order Shop',
        industry: INDUSTRIES.RETAIL,
      });

      const orderDetails = {
        sender: 'genie-1',
        orderDetails: {
          items: [
            { name: 'Item 1', quantity: 2, price: 50 },
          ],
          total: 100,
        },
      };

      const order = processOrder(merchant.id, orderDetails);

      expect(order.id).toMatch(/^ORD-/);
      expect(order.merchantId).toBe(merchant.id);
      expect(order.buyerAgent).toBe('genie-1');
      expect(order.status).toBe('confirmed');
      expect(order.fulfillment.steps.length).toBe(4);
      expect(order.fulfillment.status).toBe('pending');
    });

    it('should update merchant stats on order', () => {
      const merchant = createMerchantAI({
        businessId: 'biz-order2',
        businessName: 'Stats Shop',
        industry: INDUSTRIES.RETAIL,
      });

      const initialOrders = merchant.stats.totalOrders;

      processOrder(merchant.id, {
        sender: 'genie-1',
        orderDetails: { items: [], total: 500 },
      });

      // Stats updated would be reflected in the store
      expect(merchant.stats.totalOrders).toBe(initialOrders + 1);
      expect(merchant.stats.revenue).toBe(500);
    });
  });

  // =========================================================================
  // Product Matching
  // =========================================================================
  describe('findMatchingProduct', () => {
    it('should match product by name keywords', () => {
      const merchant = createMerchantAI({
        businessId: 'biz-match1',
        businessName: 'Match Shop',
        industry: INDUSTRIES.RETAIL,
        catalog: [
          { id: 'p1', name: 'Wireless Bluetooth Headphones', description: 'Premium audio', price: 199 },
          { id: 'p2', name: 'Laptop Stand', description: 'Ergonomic stand', price: 49 },
        ],
      });

      const match = findMatchingProduct(merchant, 'bluetooth headphones');

      expect(match).toBeDefined();
      expect(match.id).toBe('p1');
    });

    it('should match by description keywords', () => {
      const merchant = createMerchantAI({
        businessId: 'biz-match2',
        businessName: 'Match Shop 2',
        industry: INDUSTRIES.RETAIL,
        catalog: [
          { id: 'p1', name: 'Product X', description: 'Organic cotton t-shirt', price: 29 },
        ],
      });

      const match = findMatchingProduct(merchant, 'cotton shirt');

      expect(match).toBeDefined();
      expect(match.id).toBe('p1');
    });

    it('should return null when no match', () => {
      const merchant = createMerchantAI({
        businessId: 'biz-match3',
        businessName: 'Match Shop 3',
        industry: INDUSTRIES.RETAIL,
        catalog: [
          { id: 'p1', name: 'Laptop', description: 'Computer', price: 999 },
        ],
      });

      const match = findMatchingProduct(merchant, 'banana');

      expect(match).toBeNull();
    });
  });

  // =========================================================================
  // Order Tracking
  // =========================================================================
  describe('trackOrder', () => {
    it('should return order tracking info', () => {
      const merchant = createMerchantAI({
        businessId: 'biz-track1',
        businessName: 'Track Shop',
        industry: INDUSTRIES.RETAIL,
      });

      const order = processOrder(merchant.id, {
        sender: 'genie-1',
        orderDetails: { items: [], total: 100 },
      });

      const tracking = trackOrder(merchant.id, order.id);

      expect(tracking.orderId).toBe(order.id);
      expect(tracking.status).toBe('pending');
      expect(tracking.milestones).toBeDefined();
      expect(tracking.estimatedDelivery).toBeDefined();
    });

    it('should throw when order not found', () => {
      const merchant = createMerchantAI({
        businessId: 'biz-track2',
        businessName: 'Track Shop 2',
        industry: INDUSTRIES.RETAIL,
      });

      expect(() => trackOrder(merchant.id, 'nonexistent-order')).toThrow('Order not found');
    });
  });
});
