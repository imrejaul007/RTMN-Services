/**
 * COD Intelligence Service - Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Scoring function extracted for testing
function calculateCodScore(data) {
  const { orderHistory, addressHistory, deviceHistory, purchaseAmount, accountAge } = data;

  let score = 0.5;
  const factors = [];
  const reasons = [];

  // COD Success Rate
  if (orderHistory) {
    const codSuccessRate = orderHistory.total > 0
      ? orderHistory.completed / orderHistory.total
      : 0.5;
    score += (codSuccessRate - 0.5) * 0.35 * 2;
    factors.push({ name: 'cod_success_rate', impact: 0.35 });
    if (codSuccessRate >= 0.95) reasons.push('Excellent COD completion history');
  }

  // Address Stability
  if (addressHistory) {
    const stability = Math.max(0, 1 - addressHistory.changes90d / 5);
    score += (stability - 0.5) * 0.2 * 2;
    factors.push({ name: 'address_stability', impact: 0.2 });
  }

  // Device Consistency
  if (deviceHistory) {
    const consistency = Math.max(0, 1 - deviceHistory.changes30d / 3);
    score += (consistency - 0.5) * 0.1 * 2;
    factors.push({ name: 'device_consistency', impact: 0.1 });
  }

  // Order Value Risk
  if (purchaseAmount && purchaseAmount > 10000) {
    score -= 0.09;
    reasons.push('High-value order');
  }

  // Account Age
  if (accountAge && accountAge >= 180) {
    score += 0.05;
  }

  score = Math.max(0, Math.min(1, score));

  let recommendation;
  let allowed;
  if (score >= 0.7) {
    recommendation = 'allow';
    allowed = true;
  } else if (score >= 0.4) {
    recommendation = 'review';
    allowed = score >= 0.5;
  } else {
    recommendation = 'block';
    allowed = false;
  }

  return { allowed, confidence: Math.round(score * 100), recommendation, reasons };
}

describe('COD Intelligence Service', () => {
  describe('calculateCodScore', () => {
    it('should allow COD for reliable customers', () => {
      const result = calculateCodScore({
        orderHistory: { total: 20, completed: 19 },
        addressHistory: { changes90d: 0, verified: true },
        deviceHistory: { changes30d: 0 },
        accountAge: 200
      });

      expect(result.allowed).toBe(true);
      expect(result.recommendation).toBe('allow');
      expect(result.confidence).toBeGreaterThan(70);
    });

    it('should block COD for high-risk customers', () => {
      const result = calculateCodScore({
        orderHistory: { total: 10, completed: 3 },
        addressHistory: { changes90d: 5, verified: false },
        deviceHistory: { changes30d: 3 },
        purchaseAmount: 15000,
        accountAge: 15
      });

      expect(result.allowed).toBe(false);
      expect(result.confidence).toBeLessThan(40);
    });

    it('should require review for borderline cases', () => {
      const result = calculateCodScore({
        orderHistory: { total: 5, completed: 3 },
        addressHistory: { changes90d: 2, verified: true }
      });

      expect(result.recommendation).toBe('review');
    });

    it('should penalize high-value orders', () => {
      const lowValue = calculateCodScore({
        orderHistory: { total: 10, completed: 10 },
        purchaseAmount: 5000
      });

      const highValue = calculateCodScore({
        orderHistory: { total: 10, completed: 10 },
        purchaseAmount: 15000
      });

      expect(highValue.confidence).toBeLessThan(lowValue.confidence);
    });

    it('should reward stable addresses', () => {
      const stable = calculateCodScore({
        orderHistory: { total: 10, completed: 10 },
        addressHistory: { changes90d: 0 }
      });

      const unstable = calculateCodScore({
        orderHistory: { total: 10, completed: 10 },
        addressHistory: { changes90d: 4 }
      });

      expect(stable.confidence).toBeGreaterThan(unstable.confidence);
    });

    it('should handle missing data gracefully', () => {
      const result = calculateCodScore({});

      expect(result.confidence).toBe(50);
      expect(result.recommendation).toBe('review');
    });

    it('should include confidence in response', () => {
      const result = calculateCodScore({
        orderHistory: { total: 10, completed: 10 }
      });

      expect(result).toHaveProperty('confidence');
      expect(typeof result.confidence).toBe('number');
    });

    it('should add reasons for high-value orders', () => {
      const result = calculateCodScore({
        orderHistory: { total: 10, completed: 10 },
        purchaseAmount: 15000
      });

      expect(result.reasons).toContain('High-value order');
    });
  });
});
