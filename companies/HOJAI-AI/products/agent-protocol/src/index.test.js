/**
 * Unit tests for Agent Protocol
 */
import { describe, it, expect } from 'vitest';

function parseACPMsg(msg) {
  return {
    type: msg.type,
    from: msg.from,
    to: msg.to,
    payload: msg.payload || {},
    timestamp: msg.timestamp || new Date().toISOString()
  };
}

function routeNegotiation(msg, state) {
  if (msg.type === 'QUERY') return 'quote';
  if (msg.type === 'QUOTE' && state === 'awaiting_quote') return 'accept';
  if (msg.type === 'COUNTER') return 'negotiate';
  if (msg.type === 'ACCEPT') return 'contract';
  return 'unknown';
}

function calculateTrustScore(metrics) {
  const weights = { transactions: 0.3, fulfillment: 0.4, responseTime: 0.3 };
  const score = (
    (metrics.transactionRate || 0) * weights.transactions +
    (metrics.fulfillmentRate || 0) * weights.fulfillment +
    (1 - Math.min(1, (metrics.avgResponseTime || 0) / 3600)) * weights.responseTime
  );
  return Math.round(score * 100);
}

describe('Agent Protocol', () => {
  it('should parse ACP messages', () => {
    const msg = { type: 'QUERY', from: 'buyer', to: 'seller', payload: { query: 'price' } };
    const parsed = parseACPMsg(msg);
    expect(parsed.type).toBe('QUERY');
    expect(parsed.from).toBe('buyer');
    expect(parsed.payload.query).toBe('price');
  });

  it('should add timestamp if missing', () => {
    const msg = { type: 'QUOTE', from: 'seller', to: 'buyer' };
    const parsed = parseACPMsg(msg);
    expect(parsed.timestamp).toBeDefined();
  });

  it('should route negotiation states', () => {
    expect(routeNegotiation({ type: 'QUERY' }, {})).toBe('quote');
    expect(routeNegotiation({ type: 'QUOTE' }, { state: 'awaiting_quote' })).toBe('accept');
    expect(routeNegotiation({ type: 'COUNTER' }, {})).toBe('negotiate');
    expect(routeNegotiation({ type: 'ACCEPT' }, {})).toBe('contract');
  });

  it('should calculate trust score', () => {
    expect(calculateTrustScore({ transactionRate: 0.9, fulfillmentRate: 0.95, avgResponseTime: 300 }))
      .toBeGreaterThan(80);
  });

  it('should penalize low fulfillment', () => {
    const low = calculateTrustScore({ transactionRate: 0.9, fulfillmentRate: 0.5, avgResponseTime: 0 });
    const high = calculateTrustScore({ transactionRate: 0.9, fulfillmentRate: 0.95, avgResponseTime: 0 });
    expect(low).toBeLessThan(high);
  });
});
