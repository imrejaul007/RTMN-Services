/**
 * LoopOS Budget Engine - Vitest Tests
 */

import { describe, it, expect } from 'vitest';

const API = 'http://localhost:4734';
const API_KEY = 'test-key';

describe('Budget Engine API', () => {
  let twinId = `test-agent-${Date.now()}`;

  it('GET /health returns healthy status', async () => {
    const res = await fetch(`${API}/health`);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('POST /api/budgets creates budget', async () => {
    const res = await fetch(`${API}/api/budgets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        twinId,
        dailyTokens: 500000,
        monthlyTokens: 15000000,
        dailySpend: 100,
        monthlySpend: 3000
      })
    });
    const data = await res.json();
    expect(data.twinId).toBe(twinId);
    expect(data.limits.dailyTokens).toBe(500000);
  });

  it('GET /api/budgets lists budgets', async () => {
    const res = await fetch(`${API}/api/budgets`);
    const data = await res.json();
    expect(data.budgets).toBeInstanceOf(Array);
  });

  it('GET /api/budgets/:twinId gets specific budget', async () => {
    const res = await fetch(`${API}/api/budgets/${twinId}`);
    const data = await res.json();
    expect(data.twinId).toBe(twinId);
  });

  it('POST /api/budgets/:twinId/check verifies budget', async () => {
    const res = await fetch(`${API}/api/budgets/${twinId}/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        tokens: 1000,
        spend: 0.50
      })
    });
    const data = await res.json();
    expect(data.allowed).toBeDefined();
  });

  it('POST /api/budgets/:twinId/deduct records usage', async () => {
    const res = await fetch(`${API}/api/budgets/${twinId}/deduct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        tokens: 5000,
        spend: 2.50
      })
    });
    const data = await res.json();
    expect(data.deducted).toBe(true);
  });

  it('GET /api/budgets/:twinId/remaining gets remaining quota', async () => {
    const res = await fetch(`${API}/api/budgets/${twinId}/remaining`);
    const data = await res.json();
    expect(data.daily).toBeDefined();
    expect(data.monthly).toBeDefined();
  });

  it('GET /api/budgets/:twinId/usage gets usage stats', async () => {
    const res = await fetch(`${API}/api/budgets/${twinId}/usage`);
    const data = await res.json();
    expect(data.period).toBeDefined();
  });

  it('POST /api/budgets/:twinId/reset resets budget', async () => {
    const res = await fetch(`${API}/api/budgets/${twinId}/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({ period: 'daily' })
    });
    expect([200, 201]).toContain(res.status);
  });

  it('PUT /api/budgets/:twinId updates budget', async () => {
    const res = await fetch(`${API}/api/budgets/${twinId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        limits: { dailySpend: 150 }
      })
    });
    const data = await res.json();
    expect(data.limits.dailySpend).toBe(150);
  });

  it('enforces budget limits', async () => {
    // Create agent with very low budget
    const lowBudgetAgent = `low-budget-${Date.now()}`;
    await fetch(`${API}/api/budgets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        twinId: lowBudgetAgent,
        dailySpend: 0.01,
        dailyTokens: 100
      })
    });

    // Try to deduct more than budget
    const res = await fetch(`${API}/api/budgets/${lowBudgetAgent}/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        spend: 100, // Way over budget
        tokens: 1000000
      })
    });
    const data = await res.json();
    expect(data.allowed).toBe(false);
    expect(data.reason).toBeDefined();
  });
});
