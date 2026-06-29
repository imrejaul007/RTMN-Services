import { describe, it, expect } from 'vitest';

describe('Subscription Billing', () => {
  describe('Plans API', () => {
    it('should list all plans', async () => {
      const res = await fetch('http://localhost:5494/api/plans');
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.plans.length).toBeGreaterThan(0);
    });

    it('should include default plans', async () => {
      const res = await fetch('http://localhost:5494/api/plans');
      const data = await res.json();
      const planIds = data.plans.map(p => p.id);
      expect(planIds).toContain('free');
      expect(planIds).toContain('pro');
    });
  });

  describe('Subscriptions API', () => {
    it('should create subscription', async () => {
      const res = await fetch('http://localhost:5494/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test' },
        body: JSON.stringify({
          customerId: 'cust_123',
          planId: 'pro'
        })
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.subscription.id).toBeDefined();
      expect(data.subscription.status).toBe('active');
    });

    it('should list subscriptions', async () => {
      const res = await fetch('http://localhost:5494/api/subscriptions', {
        headers: { 'X-API-Key': 'test' }
      });
      expect(res.ok).toBe(true);
    });
  });

  describe('Usage API', () => {
    it('should track usage', async () => {
      const res = await fetch('http://localhost:5494/api/subscriptions/sub_123/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test' },
        body: JSON.stringify({
          metric: 'api_calls',
          value: 100
        })
      });
      expect(res.status).toBe(200);
    });
  });

  describe('Invoices API', () => {
    it('should create invoice', async () => {
      const res = await fetch('http://localhost:5494/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test' },
        body: JSON.stringify({
          subscriptionId: 'sub_123',
          items: [{ description: 'Pro Plan', amount: 2999 }]
        })
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.invoice.number).toBeDefined();
    });
  });
});
