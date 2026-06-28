/**
 * Unit tests for Agent Reputation
 */
import { describe, it, expect } from 'vitest';

function calculateReputation(metrics) {
  const weights = { transactions: 0.3, fulfillment: 0.4, responseTime: 0.3 };
  const score = (
    (metrics.transactionRate || 0) * weights.transactions +
    (metrics.fulfillmentRate || 0) * weights.fulfillment +
    (1 - Math.min(1, (metrics.avgResponseTime || 0) / 3600)) * weights.responseTime
  );
  return Math.round(score * 100);
}

function getBadge(score) {
  if (score >= 90) return 'platinum';
  if (score >= 80) return 'gold';
  if (score >= 70) return 'silver';
  if (score >= 50) return 'bronze';
  if (score >= 30) return 'iron';
  return 'restricted';
}

function shouldDecay(reputation, lastUpdate, decayRate = 0.01) {
  const daysSince = (Date.now() - new Date(lastUpdate).getTime()) / 86400000;
  return Math.round(reputation * Math.pow(1 - decayRate, daysSince));
}

describe('Agent Reputation', () => {
  it('should calculate high reputation', () => {
    const rep = calculateReputation({
      transactionRate: 0.95, fulfillmentRate: 0.98, avgResponseTime: 300
    });
    expect(rep).toBeGreaterThanOrEqual(85);
  });

  it('should calculate low reputation', () => {
    const rep = calculateReputation({
      transactionRate: 0.5, fulfillmentRate: 0.5, avgResponseTime: 7200
    });
    expect(rep).toBeLessThan(60);
  });

  it('should return correct badge', () => {
    expect(getBadge(95)).toBe('platinum');
    expect(getBadge(85)).toBe('gold');
    expect(getBadge(75)).toBe('silver');
    expect(getBadge(55)).toBe('bronze');
    expect(getBadge(35)).toBe('iron');
    expect(getBadge(15)).toBe('restricted');
  });

  it('should decay reputation over time', () => {
    const original = 100;
    const decayed = shouldDecay(original, new Date(Date.now() - 7 * 86400000).toISOString(), 0.01);
    expect(decayed).toBeLessThan(original);
  });
});
