/**
 * Return Risk Engine - Tests
 */

import { describe, it, expect } from 'vitest';

function calculateReturnRisk(data) {
  const { orderHistory, returnVelocity, itemValues } = data;

  let riskScore = 0.3;
  const factors = [];

  if (orderHistory) {
    const returnRate = orderHistory.orders > 0
      ? orderHistory.returns / orderHistory.orders
      : 0;
    riskScore += returnRate * 0.4;
    factors.push(`Return rate: ${Math.round(returnRate * 100)}%`);
  }

  if (returnVelocity) {
    const velocityScore = Math.min(returnVelocity.returns30d / 10, 1);
    riskScore += velocityScore * 0.25;
  }

  if (itemValues) {
    const ratio = itemValues.avgOrderValue > 0
      ? itemValues.avgReturnValue / itemValues.avgOrderValue
      : 0;
    if (ratio > 0.8) riskScore += 0.15;
  }

  riskScore = Math.max(0, Math.min(1, riskScore));

  let risk = 'low';
  let policy = 'free_returns';

  if (riskScore >= 0.6) {
    risk = 'high';
    policy = 'manual_review';
  } else if (riskScore >= 0.4) {
    risk = 'medium';
    policy = 'standard';
  }

  return {
    risk,
    policy_recommendation: policy,
    abuse_probability: riskScore >= 0.5 ? riskScore * 0.6 : riskScore * 0.3
  };
}

describe('Return Risk Engine', () => {
  describe('calculateReturnRisk', () => {
    it('should flag low risk for good customers', () => {
      const result = calculateReturnRisk({
        orderHistory: { orders: 20, returns: 1 },
        returnVelocity: { returns7d: 0, returns30d: 1 }
      });

      expect(result.risk).toBe('low');
      expect(result.policy_recommendation).toBe('free_returns');
    });

    it('should flag high risk for return abusers', () => {
      const result = calculateReturnRisk({
        orderHistory: { orders: 10, returns: 8 },
        returnVelocity: { returns7d: 3, returns30d: 8 }
      });

      expect(result.risk).toBe('high');
      expect(result.policy_recommendation).toBe('manual_review');
    });

    it('should recommend standard policy for medium risk', () => {
      const result = calculateReturnRisk({
        orderHistory: { orders: 10, returns: 5 },
        returnVelocity: { returns7d: 1, returns30d: 4 }
      });

      expect(result.risk).toBe('medium');
      expect(result.policy_recommendation).toBe('standard');
    });

    it('should detect high-value return patterns', () => {
      const result = calculateReturnRisk({
        orderHistory: { orders: 10, returns: 3 },
        itemValues: { avgOrderValue: 5000, avgReturnValue: 4500 }
      });

      expect(result.risk).not.toBe('low');
    });

    it('should handle missing data gracefully', () => {
      const result = calculateReturnRisk({});

      expect(result.risk).toBe('low');
      expect(result.policy_recommendation).toBe('free_returns');
    });

    it('should return abuse probability', () => {
      const result = calculateReturnRisk({
        orderHistory: { orders: 10, returns: 8 }
      });

      expect(result.abuse_probability).toBeGreaterThan(0);
      expect(result.abuse_probability).toBeLessThanOrEqual(1);
    });
  });
});
