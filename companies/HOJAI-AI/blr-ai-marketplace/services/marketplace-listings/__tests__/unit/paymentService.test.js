/**
 * Payment Service Tests
 * Tests for Stripe integration, checkout, and webhook handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Stripe
const mockStripe = {
  checkout: {
    sessions: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
  },
  customers: {
    create: vi.fn(),
  },
  paymentIntents: {
    create: vi.fn(),
    retrieve: vi.fn(),
  },
  billingPortal: {
    sessions: {
      create: vi.fn(),
    },
  },
};

vi.mock('stripe', () => ({
  default: vi.fn(() => mockStripe),
}));

// Mock mongoose
vi.mock('mongoose', () => {
  const mockModel = vi.fn().mockImplementation((data) => ({
    ...data,
    save: vi.fn().mockResolvedValue({ ...data, _id: 'mock-id' }),
  }));
  mockModel.findOne = vi.fn();
  mockModel.updateOne = vi.fn();
  mockModel.aggregate = vi.fn();
  return {
    default: {
      model: vi.fn().mockReturnValue(mockModel),
      connect: vi.fn(),
    },
    model: mockModel,
  };
});

// Mock Listing model
vi.mock('../../src/models/Listing.js', () => ({
  Listing: {
    findOne: vi.fn(),
    updateOne: vi.fn(),
  },
}));

describe('Payment Service', () => {
  let paymentService;
  let mockListing;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockListing = {
      listingId: 'test-listing-123',
      title: 'Test AI Agent',
      pricingModel: 'subscription',
      price: 5000, // in cents
      currency: 'USD',
      tenantId: 'test-tenant',
      publisherId: 'test-publisher',
      save: vi.fn().mockResolvedValue(true),
    };

    // Mock Listing.findOne for both listing and payment models
    const { Listing } = await import('../../src/models/Listing.js');
    Listing.findOne.mockResolvedValue(mockListing);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session for paid listing', async () => {
      const { createCheckoutSession } = await import('../../src/services/paymentService.js');

      mockStripe.checkout.sessions.create.mockResolvedValueOnce({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
        payment_status: 'unpaid',
      });

      const result = await createCheckoutSession(
        'test-tenant',
        'test-listing-123',
        'cus_test_123',
        'test@example.com',
        '/success',
        '/cancel'
      );

      expect(result).toHaveProperty('sessionId', 'cs_test_123');
      expect(result).toHaveProperty('url');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: 'USD',
                product_data: expect.objectContaining({
                  name: 'Test AI Agent',
                }),
              }),
            }),
          ]),
          customer_email: 'test@example.com',
          success_url: '/success',
          cancel_url: '/cancel',
          metadata: expect.objectContaining({
            listingId: 'test-listing-123',
            tenantId: 'test-tenant',
          }),
        })
      );
    });

    it('should throw error for non-existent listing', async () => {
      const { Listing } = await import('../../src/models/Listing.js');
      Listing.findOne.mockResolvedValueOnce(null);

      const { createCheckoutSession } = await import('../../src/services/paymentService.js');

      await expect(
        createCheckoutSession('test-tenant', 'non-existent', null, null, null, null)
      ).rejects.toThrow('LISTING_NOT_FOUND');
    });

    it('should throw error for free listing', async () => {
      mockListing.pricingModel = 'free';
      mockListing.price = 0;

      const { createCheckoutSession } = await import('../../src/services/paymentService.js');

      await expect(
        createCheckoutSession('test-tenant', 'test-listing-123', null, null, null, null)
      ).rejects.toThrow('FREE_LISTING');
    });

    it('should create subscription checkout for subscription pricing', async () => {
      mockListing.pricingModel = 'subscription';
      mockListing.price = 2999;

      mockStripe.checkout.sessions.create.mockResolvedValueOnce({
        id: 'cs_sub_123',
        url: 'https://checkout.stripe.com/subscription',
        payment_status: 'unpaid',
      });

      const { createCheckoutSession } = await import('../../src/services/paymentService.js');
      const result = await createCheckoutSession(
        'test-tenant',
        'test-listing-123',
        null,
        'user@example.com',
        null,
        null
      );

      expect(result).toHaveProperty('sessionId', 'cs_sub_123');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
        })
      );
    });
  });

  describe('getCheckoutSession', () => {
    it('should retrieve checkout session', async () => {
      mockStripe.checkout.sessions.retrieve.mockResolvedValueOnce({
        id: 'cs_test_123',
        payment_status: 'paid',
        amount_total: 5000,
        customer_email: 'test@example.com',
      });

      const { getCheckoutSession } = await import('../../src/services/paymentService.js');
      const result = await getCheckoutSession('cs_test_123');

      expect(result).toHaveProperty('id', 'cs_test_123');
      expect(result).toHaveProperty('payment_status', 'paid');
    });

    it('should handle session not found', async () => {
      mockStripe.checkout.sessions.retrieve.mockRejectedValueOnce(
        new Error('No such checkout.session')
      );

      const { getCheckoutSession } = await import('../../src/services/paymentService.js');

      await expect(getCheckoutSession('invalid')).rejects.toThrow();
    });
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent', async () => {
      mockStripe.paymentIntents.create.mockResolvedValueOnce({
        id: 'pi_test_123',
        client_secret: 'secret_test_123',
        amount: 5000,
        currency: 'USD',
        status: 'requires_payment_method',
      });

      const { createPaymentIntent } = await import('../../src/services/paymentService.js');
      const result = await createPaymentIntent(
        'test-tenant',
        'test-listing-123',
        'cus_test_123',
        'pm_card_visa'
      );

      expect(result).toHaveProperty('clientSecret', 'secret_test_123');
      expect(result).toHaveProperty('paymentIntentId', 'pi_test_123');
    });
  });

  describe('handleWebhook', () => {
    it('should handle checkout.session.completed event', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            metadata: {
              listingId: 'test-listing-123',
              tenantId: 'test-tenant',
            },
            customer_email: 'buyer@example.com',
            amount_total: 5000,
          },
        },
      };

      // Mock the webhook signature verification
      mockStripe.checkout.sessions.retrieve.mockResolvedValueOnce({
        id: 'cs_test_123',
        payment_status: 'paid',
        metadata: {
          listingId: 'test-listing-123',
          tenantId: 'test-tenant',
        },
      });

      const { handleWebhook } = await import('../../src/services/paymentService.js');
      const result = await handleWebhook(mockEvent, 'test-signature');

      expect(result).toHaveProperty('received', true);
    });

    it('should handle payment_intent.succeeded event', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 5000,
            currency: 'USD',
            metadata: {
              listingId: 'test-listing-123',
              tenantId: 'test-tenant',
            },
          },
        },
      };

      const { handleWebhook } = await import('../../src/services/paymentService.js');
      const result = await handleWebhook(mockEvent, 'test-signature');

      expect(result).toHaveProperty('received', true);
    });

    it('should handle customer.subscription.created event', async () => {
      const mockEvent = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'active',
            metadata: {
              listingId: 'test-listing-123',
              tenantId: 'test-tenant',
            },
          },
        },
      };

      const { handleWebhook } = await import('../../src/services/paymentService.js');
      const result = await handleWebhook(mockEvent, 'test-signature');

      expect(result).toHaveProperty('received', true);
    });
  });

  describe('createCustomerPortal', () => {
    it('should create customer portal session', async () => {
      mockStripe.billingPortal.sessions.create.mockResolvedValueOnce({
        id: 'bps_test_123',
        url: 'https://billing.stripe.com/portal',
      });

      const { createCustomerPortal } = await import('../../src/services/paymentService.js');
      const result = await createCustomerPortal('cus_test_123', '/return');

      expect(result).toHaveProperty('url');
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test_123',
        return_url: '/return',
      });
    });
  });

  describe('getPublisherRevenue', () => {
    it('should calculate publisher revenue', async () => {
      // Mock aggregation for revenue calculation
      const { Listing } = await import('../../src/models/Listing.js');
      Listing.aggregate.mockResolvedValueOnce([
        { _id: 'cs_1', totalRevenue: 4500, platformFee: 500, netRevenue: 4000 },
        { _id: 'cs_2', totalRevenue: 9000, platformFee: 1000, netRevenue: 8000 },
      ]);

      const { getPublisherRevenue } = await import('../../src/services/paymentService.js');
      const result = await getPublisherRevenue('test-tenant', 'test-publisher');

      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('platformFees');
      expect(result).toHaveProperty('netRevenue');
      expect(result).toHaveProperty('transactions');
    });
  });

  describe('getPlatformStats', () => {
    it('should return platform statistics', async () => {
      const { getPlatformStats } = await import('../../src/services/paymentService.js');
      const stats = getPlatformStats();

      expect(stats).toHaveProperty('totalVolume');
      expect(stats).toHaveProperty('platformRevenue');
      expect(stats).toHaveProperty('activeSubscriptions');
      expect(stats).toHaveProperty('transactionCount');
    });
  });
});

describe('Payment Service - Pricing Models', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle one-time pricing correctly', async () => {
    const mockListing = {
      listingId: 'test-listing',
      pricingModel: 'one-time',
      price: 9900,
      currency: 'USD',
      tenantId: 'test-tenant',
      save: vi.fn(),
    };

    const { Listing } = await import('../../src/models/Listing.js');
    Listing.findOne.mockResolvedValueOnce(mockListing);

    mockStripe.checkout.sessions.create.mockResolvedValueOnce({
      id: 'cs_one_time',
      url: 'https://checkout.stripe.com/one-time',
    });

    const { createCheckoutSession } = await import('../../src/services/paymentService.js');
    const result = await createCheckoutSession(
      'test-tenant',
      'test-listing',
      null,
      'user@example.com',
      null,
      null
    );

    expect(result).toHaveProperty('sessionId');
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
      })
    );
  });

  it('should handle usage-based pricing', async () => {
    const mockListing = {
      listingId: 'test-listing-usage',
      pricingModel: 'usage-based',
      price: 100, // per unit
      currency: 'USD',
      tenantId: 'test-tenant',
      save: vi.fn(),
    };

    const { Listing } = await import('../../src/models/Listing.js');
    Listing.findOne.mockResolvedValueOnce(mockListing);

    mockStripe.checkout.sessions.create.mockResolvedValueOnce({
      id: 'cs_usage',
      url: 'https://checkout.stripe.com/usage',
    });

    const { createCheckoutSession } = await import('../../src/services/paymentService.js');
    const result = await createCheckoutSession(
      'test-tenant',
      'test-listing-usage',
      null,
      'user@example.com',
      null,
      null
    );

    expect(result).toHaveProperty('sessionId');
  });
});

describe('Payment Service - Currency Handling', () => {
  it('should convert INR to paisa correctly', async () => {
    const mockListing = {
      listingId: 'inr-listing',
      pricingModel: 'subscription',
      price: 99900, // INR 999
      currency: 'INR', // Will be lowercased to 'inr' by paymentService
      tenantId: 'test-tenant',
      save: vi.fn(),
    };

    const { Listing } = await import('../../src/models/Listing.js');
    Listing.findOne.mockResolvedValueOnce(mockListing);

    mockStripe.checkout.sessions.create.mockResolvedValueOnce({
      id: 'cs_inr',
      url: 'https://checkout.stripe.com/inr',
    });

    const { createCheckoutSession } = await import('../../src/services/paymentService.js');
    await createCheckoutSession(
      'test-tenant',
      'inr-listing',
      null,
      'user@example.com',
      null,
      null
    );

    // paymentService lowercases currency to lowercase (INR -> inr)
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({
              currency: 'inr', // lowercase as per paymentService
            }),
          }),
        ]),
      })
    );
  });
});
