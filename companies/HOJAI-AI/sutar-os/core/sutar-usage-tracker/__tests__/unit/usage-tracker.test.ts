/**
 * SUTAR OS — Usage Tracker Tests
 */
import { describe, it, expect } from 'vitest';

describe('Usage Tracker — Cost Calculation', () => {
  const PRICING = {
    token: 0.00003,
    outputToken: 0.00009,
    apiCall: 0.001,
    computeMinute: 0.05,
    storageGB: 0.10,
    networkGB: 0.05,
  };

  function calculateCost(event) {
    const q = event.quantity || 0;
    switch (event.type) {
      case 'input_token': return q * PRICING.token;
      case 'output_token': return q * PRICING.outputToken;
      case 'api_call': return q * PRICING.apiCall;
      case 'compute_minute': return q * PRICING.computeMinute;
      case 'storage_gb': return q * PRICING.storageGB;
      case 'network_gb': return q * PRICING.networkGB;
      default: return 0;
    }
  }

  it('calculates input token cost', () => {
    // 1M tokens * $0.00003 = $0.03
    expect(calculateCost({ type: 'input_token', quantity: 1000000 })).toBeCloseTo(0.03, 4);
  });

  it('calculates output token cost', () => {
    // 1M tokens * $0.00009 = $0.09
    expect(calculateCost({ type: 'output_token', quantity: 1000000 })).toBeCloseTo(0.09, 4);
  });

  it('calculates API call cost', () => {
    expect(calculateCost({ type: 'api_call', quantity: 1000 })).toBeCloseTo(1.0, 4);
  });

  it('calculates compute minute cost', () => {
    expect(calculateCost({ type: 'compute_minute', quantity: 60 })).toBeCloseTo(3.0, 4);
  });

  it('calculates storage cost', () => {
    expect(calculateCost({ type: 'storage_gb', quantity: 100 })).toBeCloseTo(10.0, 4);
  });

  it('calculates network cost', () => {
    expect(calculateCost({ type: 'network_gb', quantity: 100 })).toBeCloseTo(5.0, 4);
  });

  it('returns 0 for unknown type', () => {
    expect(calculateCost({ type: 'unknown', quantity: 1000 })).toBe(0);
  });

  it('handles zero quantity', () => {
    expect(calculateCost({ type: 'input_token', quantity: 0 })).toBe(0);
  });
});

describe('Usage Tracker — Quota Checking', () => {
  function checkQuota(quotas, used, type, quantity) {
    const quota = quotas[type];
    if (!quota) return { exceeded: false, remaining: null };
    const wouldBe = used + quantity;
    return { exceeded: wouldBe > quota.limit, remaining: Math.max(0, quota.limit - used), limit: quota.limit, used };
  }

  it('returns not exceeded when no quota', () => {
    const result = checkQuota({}, 0, 'input_token', 1000);
    expect(result.exceeded).toBe(false);
    expect(result.remaining).toBeNull();
  });

  it('returns not exceeded when under limit', () => {
    const quotas = { input_token: { limit: 1000000 } };
    const result = checkQuota(quotas, 500000, 'input_token', 400000);
    expect(result.exceeded).toBe(false);
    expect(result.remaining).toBe(500000);
  });

  it('returns exceeded when over limit', () => {
    const quotas = { input_token: { limit: 1000000 } };
    const result = checkQuota(quotas, 800000, 'input_token', 300000);
    expect(result.exceeded).toBe(true);
  });

  it('returns exact at limit as not exceeded', () => {
    const quotas = { input_token: { limit: 1000000 } };
    const result = checkQuota(quotas, 900000, 'input_token', 100000);
    expect(result.exceeded).toBe(false);
  });
});

describe('Usage Tracker — Usage Summary', () => {
  function summarizeUsage(events, tenantId) {
    const byType = {};
    for (const e of events.filter(ev => ev.tenantId === tenantId)) {
      if (!byType[e.type]) byType[e.type] = { quantity: 0, cost: 0, events: 0 };
      byType[e.type].quantity += e.quantity || 0;
      byType[e.type].cost += e.cost || 0;
      byType[e.type].events++;
    }
    const totalCost = Object.values(byType).reduce((s, v) => s + v.cost, 0);
    return { byType, totalCost };
  }

  it('aggregates by type', () => {
    const events = [
      { tenantId: 'tenant-1', type: 'input_token', quantity: 100, cost: 0.003 },
      { tenantId: 'tenant-1', type: 'input_token', quantity: 200, cost: 0.006 },
      { tenantId: 'tenant-1', type: 'api_call', quantity: 50, cost: 0.05 },
      { tenantId: 'tenant-2', type: 'input_token', quantity: 1000, cost: 0.03 },
    ];
    const result = summarizeUsage(events, 'tenant-1');
    expect(result.byType.input_token.quantity).toBe(300);
    expect(result.byType.input_token.events).toBe(2);
    expect(result.byType.api_call.events).toBe(1);
  });

  it('filters by tenant', () => {
    const events = [
      { tenantId: 'tenant-1', type: 'input_token', quantity: 100, cost: 0.003 },
      { tenantId: 'tenant-2', type: 'input_token', quantity: 500, cost: 0.015 },
    ];
    const result = summarizeUsage(events, 'tenant-1');
    expect(result.byType.input_token.quantity).toBe(100);
    expect(result.totalCost).toBeCloseTo(0.003, 4);
  });

  it('calculates total cost', () => {
    const events = [
      { tenantId: 't1', type: 'input_token', quantity: 100, cost: 0.003 },
      { tenantId: 't1', type: 'api_call', quantity: 10, cost: 0.01 },
    ];
    const result = summarizeUsage(events, 't1');
    expect(result.totalCost).toBeCloseTo(0.013, 4);
  });
});
