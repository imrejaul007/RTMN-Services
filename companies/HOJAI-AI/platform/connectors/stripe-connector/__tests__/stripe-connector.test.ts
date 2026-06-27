import { describe, it, expect } from 'vitest';

// Stripe Connector Constants
const PAYMENT_STATUSES = ['succeeded', 'pending', 'failed'];
const SUBSCRIPTION_STATUSES = ['active', 'past_due', 'cancelled', 'trialing', 'incomplete'];
const CURRENCIES = ['usd', 'eur', 'gbp', 'inr', 'jpy', 'cad', 'aud'];
const INTERVALS = ['month', 'year', 'week', 'day'];

describe('Stripe Connector', () => {
  describe('Payment Statuses', () => {
    it('should have all payment statuses', () => {
      expect(PAYMENT_STATUSES).toContain('succeeded');
      expect(PAYMENT_STATUSES).toContain('pending');
      expect(PAYMENT_STATUSES).toContain('failed');
    });
  });

  describe('Subscription Statuses', () => {
    it('should have all subscription statuses', () => {
      expect(SUBSCRIPTION_STATUSES).toContain('active');
      expect(SUBSCRIPTION_STATUSES).toContain('past_due');
      expect(SUBSCRIPTION_STATUSES).toContain('cancelled');
    });
  });

  describe('Currency Support', () => {
    it('should support major currencies', () => {
      expect(CURRENCIES).toContain('usd');
      expect(CURRENCIES).toContain('eur');
      expect(CURRENCIES).toContain('inr');
    });
  });

  describe('Interval Types', () => {
    it('should have all interval types', () => {
      expect(INTERVALS).toContain('month');
      expect(INTERVALS).toContain('year');
    });
  });

  describe('Customer Validation', () => {
    const validateCustomer = (customer: {
      email?: string;
      name?: string;
      balance?: number;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!customer.email) errors.push('email is required');
      if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
        errors.push('invalid email format');
      }
      if (customer.balance !== undefined && customer.balance < -1000000) {
        errors.push('balance too low');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct customer', () => {
      const result = validateCustomer({
        email: 'customer@example.com',
        name: 'John Doe',
        balance: 0
      });
      expect(result.valid).toBe(true);
    });

    it('should require email', () => {
      const result = validateCustomer({ name: 'John' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('email is required');
    });

    it('should validate email format', () => {
      const result = validateCustomer({ email: 'not-an-email' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('invalid email format');
    });

    it('should reject excessive negative balance', () => {
      const result = validateCustomer({
        email: 'test@example.com',
        balance: -2000000
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('balance too low');
    });
  });

  describe('Payment Validation', () => {
    const validatePayment = (payment: {
      amount?: number;
      currency?: string;
      customer?: string;
      status?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!payment.amount) errors.push('amount is required');
      if (payment.amount !== undefined && payment.amount <= 0) {
        errors.push('amount must be positive');
      }
      if (payment.amount !== undefined && payment.amount > 999999999) {
        errors.push('amount exceeds maximum');
      }
      if (!payment.customer) errors.push('customer is required');
      if (payment.currency && !CURRENCIES.includes(payment.currency)) {
        errors.push(`unsupported currency: ${payment.currency}`);
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct payment', () => {
      const result = validatePayment({
        amount: 1000,
        currency: 'usd',
        customer: 'cus_123'
      });
      expect(result.valid).toBe(true);
    });

    it('should require amount and customer', () => {
      const result = validatePayment({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('amount is required');
      expect(result.errors).toContain('customer is required');
    });

    it('should reject zero or negative amounts', () => {
      const result = validatePayment({
        amount: 0,
        customer: 'cus_123'
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('amount must be positive');
    });

    it('should reject excessive amounts', () => {
      const result = validatePayment({
        amount: 1000000000,
        customer: 'cus_123'
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('amount exceeds maximum');
    });

    it('should reject unsupported currencies', () => {
      const result = validatePayment({
        amount: 100,
        customer: 'cus_123',
        currency: 'btc'
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('Subscription Validation', () => {
    const validateSubscription = (sub: {
      customer?: string;
      plan?: string;
      status?: string;
      amount?: number;
      interval?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!sub.customer) errors.push('customer is required');
      if (!sub.plan) errors.push('plan is required');
      if (sub.status && !SUBSCRIPTION_STATUSES.includes(sub.status)) {
        errors.push(`invalid status: ${sub.status}`);
      }
      if (sub.amount !== undefined && sub.amount < 0) {
        errors.push('amount cannot be negative');
      }
      if (sub.interval && !INTERVALS.includes(sub.interval)) {
        errors.push(`invalid interval: ${sub.interval}`);
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct subscription', () => {
      const result = validateSubscription({
        customer: 'cus_123',
        plan: 'pro',
        status: 'active',
        amount: 9900,
        interval: 'month'
      });
      expect(result.valid).toBe(true);
    });

    it('should require customer and plan', () => {
      const result = validateSubscription({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('customer is required');
      expect(result.errors).toContain('plan is required');
    });
  });

  describe('Payment Filtering', () => {
    const filterPayments = (
      payments: Array<{ status: string; customer: string; amount: number }>,
      filters: { status?: string; customer?: string; minAmount?: number }
    ) => {
      let filtered = [...payments];

      if (filters.status) {
        filtered = filtered.filter(p => p.status === filters.status);
      }
      if (filters.customer) {
        filtered = filtered.filter(p => p.customer === filters.customer);
      }
      if (filters.minAmount !== undefined) {
        filtered = filtered.filter(p => p.amount >= filters.minAmount!);
      }

      return filtered;
    };

    it('should filter by status', () => {
      const payments = [
        { status: 'succeeded', customer: 'cus_1', amount: 100 },
        { status: 'failed', customer: 'cus_2', amount: 200 }
      ];
      const result = filterPayments(payments, { status: 'succeeded' });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('succeeded');
    });

    it('should filter by minimum amount', () => {
      const payments = [
        { status: 'succeeded', customer: 'cus_1', amount: 50 },
        { status: 'succeeded', customer: 'cus_2', amount: 200 }
      ];
      const result = filterPayments(payments, { minAmount: 100 });
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(200);
    });
  });

  describe('Revenue Calculation', () => {
    const calculateRevenue = (payments: Array<{
      amount: number;
      currency: string;
      status: string;
    }>, targetCurrency = 'usd'): number => {
      const rates: Record<string, number> = { usd: 1, eur: 1.1, gbp: 1.25, inr: 0.012 };

      return payments
        .filter(p => p.status === 'succeeded')
        .reduce((sum, p) => {
          const rate = rates[p.currency] || 1;
          return sum + (p.amount * rate);
        }, 0);
    };

    it('should sum successful payments', () => {
      const payments = [
        { amount: 1000, currency: 'usd', status: 'succeeded' },
        { amount: 500, currency: 'usd', status: 'failed' },
        { amount: 2000, currency: 'usd', status: 'succeeded' }
      ];
      const revenue = calculateRevenue(payments);
      expect(revenue).toBe(3000);
    });

    it('should convert currencies', () => {
      const payments = [
        { amount: 1000, currency: 'usd', status: 'succeeded' },
        { amount: 1000, currency: 'eur', status: 'succeeded' }
      ];
      const revenue = calculateRevenue(payments);
      expect(revenue).toBeGreaterThan(2000); // EUR converted at 1.1x
    });
  });

  describe('Subscription Analytics', () => {
    const analyzeSubscriptions = (subscriptions: Array<{
      status: string;
      amount: number;
      interval: string;
    }>) => {
      const active = subscriptions.filter(s => s.status === 'active');
      const mrr = active
        .filter(s => s.interval === 'month')
        .reduce((sum, s) => sum + s.amount, 0);
      const arr = active
        .filter(s => s.interval === 'year')
        .reduce((sum, s) => sum + s.amount, 0) * 12;

      return {
        total: subscriptions.length,
        active: active.length,
        churned: subscriptions.filter(s => s.status === 'cancelled').length,
        mrr,
        arr: mrr + arr
      };
    };

    it('should calculate MRR and ARR', () => {
      const subs = [
        { status: 'active', amount: 9900, interval: 'month' },
        { status: 'active', amount: 99000, interval: 'year' },
        { status: 'cancelled', amount: 9900, interval: 'month' }
      ];
      const analytics = analyzeSubscriptions(subs);
      expect(analytics.mrr).toBe(9900);
      expect(analytics.arr).toBe(9900 + 99000); // monthly + annualized yearly
      expect(analytics.active).toBe(2);
      expect(analytics.churned).toBe(1);
    });
  });

  describe('Invoice Generation', () => {
    const generateInvoiceNumber = (customerId: string, index: number): string => {
      const date = new Date().toISOString().slice(0, 7).replace('-', '');
      return `INV-${customerId.slice(-4)}-${date}-${String(index).padStart(4, '0')}`;
    };

    it('should generate formatted invoice numbers', () => {
      const invoice = generateInvoiceNumber('cus_abc123', 42);
      expect(invoice).toMatch(/^INV-[a-z0-9]+-\d{6}-\d{4}$/);
      expect(invoice).toContain('abc1');
    });
  });

  describe('Payment Intent', () => {
    const createPaymentIntent = (amount: number, currency: string): {
      id: string;
      amount: number;
      currency: string;
      status: string;
    } => {
      return {
        id: `pi_${Date.now()}`,
        amount,
        currency,
        status: 'requires_payment_method'
      };
    };

    it('should create payment intent with correct properties', () => {
      const intent = createPaymentIntent(1000, 'usd');
      expect(intent.amount).toBe(1000);
      expect(intent.currency).toBe('usd');
      expect(intent.status).toBe('requires_payment_method');
      expect(intent.id).toMatch(/^pi_\d+$/);
    });
  });
});