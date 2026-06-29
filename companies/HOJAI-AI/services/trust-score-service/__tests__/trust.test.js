/**
 * Trust Score Service - Tests
 */

import { describe, it, expect } from 'vitest';

// Test the scoring algorithm
function calculateTrustScore(data) {
  const { orderHistory, accountAge, paymentHistory } = data;

  let score = 50;
  const factors = [];

  if (orderHistory) {
    const completionRate = orderHistory.total > 0 ? orderHistory.completed / orderHistory.total : 0.5;
    score += completionRate * 30 - 15;
    factors.push({ name: 'order_completion', contribution: completionRate });
  }

  if (orderHistory) {
    const returnRate = orderHistory.total > 0 ? orderHistory.returned / orderHistory.total : 0;
    score += -returnRate * 20;
  }

  if (accountAge) {
    const ageFactor = Math.min(accountAge / 365, 1);
    score += ageFactor * 15 - 7.5;
  }

  if (paymentHistory) {
    const successRate = paymentHistory.successful + paymentHistory.failed > 0
      ? paymentHistory.successful / (paymentHistory.successful + paymentHistory.failed)
      : 0.5;
    score += successRate * 20 - 10;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let level = 'low';
  if (score >= 80) level = 'trusted';
  else if (score >= 60) level = 'high';
  else if (score >= 40) level = 'medium';

  return { score, level };
}

describe('Trust Score Service', () => {
  it('should calculate high trust for good customers', () => {
    const result = calculateTrustScore({
      orderHistory: { total: 10, completed: 10, returned: 0 },
      accountAge: 365,
      paymentHistory: { successful: 10, failed: 0 }
    });

    expect(result.score).toBeGreaterThan(60);
    expect(['high', 'trusted']).toContain(result.level);
  });

  it('should calculate low trust for problematic customers', () => {
    const result = calculateTrustScore({
      orderHistory: { total: 10, completed: 3, returned: 7 },
      accountAge: 30,
      paymentHistory: { successful: 2, failed: 8 }
    });

    expect(result.score).toBeLessThan(40);
    expect(result.level).toBe('low');
  });

  it('should handle missing data gracefully', () => {
    const result = calculateTrustScore({});
    expect(result.score).toBe(50);
    expect(result.level).toBe('medium');
  });
});
