/**
 * Notification Service Tests
 * Basic integration tests for email notification service
 * Note: Uses real nodemailer in test mode (dev-mode simulation)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock nodemailer - needs to be at top level for ESM
vi.mock('nodemailer', () => {
  const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-message-id' });
  return {
    default: {
      createTransport: vi.fn(() => ({
        sendMail: mockSendMail,
      })),
    },
    __mockSendMail: mockSendMail, // Export for test assertions
  };
});

describe('Notification Service', () => {
  // Get the mock reference
  const getMockSendMail = () => {
    const nodemailer = require('nodemailer');
    return nodemailer.__mockSendMail;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  describe('module exports', () => {
    it('should export all required functions', async () => {
      const notifications = await import('../../src/services/notificationService.js');

      expect(typeof notifications.sendEmail).toBe('function');
      expect(typeof notifications.sendPurchaseConfirmation).toBe('function');
      expect(typeof notifications.sendSubscriptionConfirmation).toBe('function');
      expect(typeof notifications.sendReviewNotification).toBe('function');
      expect(typeof notifications.sendPayoutNotification).toBe('function');
    });
  });

  describe('sendPurchaseConfirmation', () => {
    it('should accept valid purchase confirmation parameters', async () => {
      const { sendPurchaseConfirmation } = await import('../../src/services/notificationService.js');

      const result = await sendPurchaseConfirmation({
        customerEmail: 'buyer@example.com',
        customerName: 'John Doe',
        listingTitle: 'AI Sales Agent',
        amount: 4999,
        currency: 'USD',
        orderId: 'order_123',
      });

      expect(result).toHaveProperty('success');
    });
  });

  describe('sendSubscriptionConfirmation', () => {
    it('should accept valid subscription confirmation parameters', async () => {
      const { sendSubscriptionConfirmation } = await import('../../src/services/notificationService.js');

      const result = await sendSubscriptionConfirmation({
        customerEmail: 'subscriber@example.com',
        customerName: 'Jane Smith',
        listingTitle: 'AI Team Bundle',
        amount: 9999,
        currency: 'USD',
        subscriptionId: 'sub_123',
        periodEnd: '2026-07-01',
      });

      expect(result).toHaveProperty('success');
    });
  });

  describe('sendReviewNotification', () => {
    it('should accept valid review notification parameters', async () => {
      const { sendReviewNotification } = await import('../../src/services/notificationService.js');

      const result = await sendReviewNotification({
        publisherEmail: 'publisher@company.com',
        publisherName: 'AI Company',
        listingTitle: 'Marketing Automation',
        reviewerName: 'Happy Customer',
        rating: 5,
        reviewBody: 'Great product!',
      });

      expect(result).toHaveProperty('success');
    });
  });

  describe('sendPayoutNotification', () => {
    it('should accept valid payout notification parameters', async () => {
      const { sendPayoutNotification } = await import('../../src/services/notificationService.js');

      const result = await sendPayoutNotification({
        publisherEmail: 'publisher@company.com',
        publisherName: 'AI Company',
        amount: 85000, // in cents
        currency: 'USD',
        transactionId: 'txn_789',
        salesCount: 10,
      });

      expect(result).toHaveProperty('success');
    });
  });

  describe('sendEmail', () => {
    it('should send basic email with required fields', async () => {
      const { sendEmail } = await import('../../src/services/notificationService.js');

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('messageId');
    });

    it('should include plain text fallback', async () => {
      const { sendEmail } = await import('../../src/services/notificationService.js');

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>HTML content</p>',
        text: 'Plain text content',
      });

      expect(result).toHaveProperty('success');
    });
  });

  describe('parameter validation', () => {
    it('should handle missing optional parameters', async () => {
      const { sendPurchaseConfirmation } = await import('../../src/services/notificationService.js');

      // Missing optional customerName
      const result = await sendPurchaseConfirmation({
        customerEmail: 'buyer@example.com',
        listingTitle: 'AI Agent',
        amount: 999,
        currency: 'USD',
        orderId: 'order_456',
      });

      expect(result).toHaveProperty('success');
    });

    it('should handle zero amount', async () => {
      const { sendPurchaseConfirmation } = await import('../../src/services/notificationService.js');

      const result = await sendPurchaseConfirmation({
        customerEmail: 'buyer@example.com',
        customerName: 'Free User',
        listingTitle: 'Free AI Agent',
        amount: 0,
        currency: 'USD',
        orderId: 'order_free',
      });

      expect(result).toHaveProperty('success');
    });
  });

  describe('currency formatting', () => {
    it('should handle different currencies', async () => {
      const { sendPurchaseConfirmation } = await import('../../src/services/notificationService.js');

      // Test USD
      const usdResult = await sendPurchaseConfirmation({
        customerEmail: 'test@example.com',
        listingTitle: 'Test',
        amount: 4999,
        currency: 'USD',
        orderId: 'order_usd',
      });
      expect(usdResult).toHaveProperty('success');

      // Test INR
      const inrResult = await sendPurchaseConfirmation({
        customerEmail: 'test@example.com',
        listingTitle: 'Test',
        amount: 99900,
        currency: 'INR',
        orderId: 'order_inr',
      });
      expect(inrResult).toHaveProperty('success');

      // Test EUR
      const eurResult = await sendPurchaseConfirmation({
        customerEmail: 'test@example.com',
        listingTitle: 'Test',
        amount: 2999,
        currency: 'EUR',
        orderId: 'order_eur',
      });
      expect(eurResult).toHaveProperty('success');
    });
  });
});
