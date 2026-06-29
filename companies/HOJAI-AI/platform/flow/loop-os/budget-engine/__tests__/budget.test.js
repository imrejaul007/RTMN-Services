/**
 * Budget Engine - Vitest Tests
 */

import { describe, it, expect } from 'vitest';

process.env.HOJAI_API_KEY = 'test-key';
process.env.PORT = '4734';

describe('Budget Engine - Health', () => {
  it('should return healthy status', async () => {
    const res = await fetch('http://localhost:4734/health');
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('budget-engine');
  });
});

describe('Budget Engine - Budget CRUD', () => {
  const auth = { headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' } };

  it('should create budget', async () => {
    const res = await fetch('http://localhost:4734/api/budgets', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        twinId: 'agent-test-001',
        dailyTokens: 500000,
        monthlyTokens: 15000000
      })
    });
    const data = await res.json();
    expect(data.twinId).toBe('agent-test-001');
    expect(data.limits.dailyTokens).toBe(500000);
  });

  it('should check budget before action', async () => {
    const res = await fetch('http://localhost:4734/api/budgets/agent-test-001/check', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ tokens: 1000, spend: 0.5 })
    });
    const data = await res.json();
    expect(data.allowed).toBe(true);
  });

  it('should deduct from budget', async () => {
    const res = await fetch('http://localhost:4734/api/budgets/agent-test-001/deduct', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ tokens: 1000, spend: 0.5 })
    });
    const data = await res.json();
    expect(data.deducted).toBe(true);
  });

  it('should get remaining quota', async () => {
    const res = await fetch('http://localhost:4734/api/budgets/agent-test-001/remaining');
    const data = await res.json();
    expect(data.daily.tokens.remaining).toBeDefined();
  });
});

describe('Budget Engine - Allocations', () => {
  const auth = { headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' } };

  it('should create allocation', async () => {
    const res = await fetch('http://localhost:4734/api/allocations', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        twinId: 'agent-test-001',
        category: 'marketing',
        amount: 1000
      })
    });
    const data = await res.json();
    expect(data.id).toBeDefined();
  });
});
