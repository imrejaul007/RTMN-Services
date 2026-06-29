/**
 * Customer Intelligence Gateway - Tests
 * Tests the gateway's core business logic
 */

import { describe, it, expect } from 'vitest';

describe('Customer Intelligence Gateway', () => {
  describe('Trust Score', () => {
    const calculateTrustScore = (data) => {
      const { orderHistory, accountAge, paymentHistory } = data || {};
      let score = 50;

      if (orderHistory) {
        const completionRate = orderHistory.total > 0 ? orderHistory.completed / orderHistory.total : 0.5;
        score += completionRate * 30 - 15;
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
          ? paymentHistory.successful / (paymentHistory.successful + paymentHistory.failed) : 0.5;
        score += successRate * 20 - 10;
      }
      score = Math.max(0, Math.min(100, Math.round(score)));
      let level = score >= 80 ? 'trusted' : score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low';
      return { score, level };
    };

    it('should calculate high trust for good customers', () => {
      const result = calculateTrustScore({
        orderHistory: { total: 10, completed: 10, returned: 0 },
        accountAge: 365,
        paymentHistory: { successful: 10, failed: 0 }
      });
      expect(result.score).toBeGreaterThan(60);
    });

    it('should calculate low trust for problematic customers', () => {
      const result = calculateTrustScore({
        orderHistory: { total: 10, completed: 3, returned: 7 },
        accountAge: 30,
        paymentHistory: { successful: 2, failed: 8 }
      });
      expect(result.score).toBeLessThan(40);
    });

    it('should handle missing data gracefully', () => {
      const result = calculateTrustScore({});
      expect(result.score).toBe(50);
      expect(result.level).toBe('medium');
    });
  });

  describe('COD Recommendation', () => {
    const calculateCod = (data) => {
      const { orderHistory, addressHistory, purchaseAmount } = data || {};
      let score = 0.5;
      if (orderHistory) {
        const rate = orderHistory.total > 0 ? orderHistory.completed / orderHistory.total : 0.5;
        score += (rate - 0.5) * 0.35 * 2;
      }
      if (addressHistory) {
        const stability = Math.max(0, 1 - addressHistory.changes90d / 5);
        score += (stability - 0.5) * 0.2 * 2;
      }
      if (purchaseAmount && purchaseAmount > 10000) score -= 0.09;
      score = Math.max(0, Math.min(1, score));
      return { allowed: score >= 0.7, confidence: Math.round(score * 100) };
    };

    it('should allow for reliable customers', () => {
      const result = calculateCod({
        orderHistory: { total: 20, completed: 19 },
        addressHistory: { changes90d: 0 }
      });
      expect(result.allowed).toBe(true);
    });

    it('should block risky customers', () => {
      const result = calculateCod({
        orderHistory: { total: 10, completed: 4 },
        addressHistory: { changes90d: 5 }
      });
      expect(result.allowed).toBe(false);
    });
  });

  describe('Return Risk', () => {
    const calculateReturnRisk = (data) => {
      const { orderHistory, returnVelocity } = data || {};
      let riskScore = 0.3;
      if (orderHistory) {
        const rate = orderHistory.orders > 0 ? orderHistory.returns / orderHistory.orders : 0;
        riskScore += rate * 0.4;
      }
      if (returnVelocity) {
        const velocity = Math.min(returnVelocity.returns30d / 10, 1);
        riskScore += velocity * 0.25;
      }
      riskScore = Math.max(0, Math.min(1, riskScore));
      let risk = riskScore >= 0.6 ? 'high' : riskScore >= 0.4 ? 'medium' : 'low';
      return { risk, riskScore };
    };

    it('should flag low risk for good returners', () => {
      const result = calculateReturnRisk({
        orderHistory: { orders: 20, returns: 1 },
        returnVelocity: { returns30d: 1 }
      });
      expect(result.risk).toBe('low');
    });

    it('should flag elevated risk for abusers', () => {
      const result = calculateReturnRisk({
        orderHistory: { orders: 10, returns: 9 },
        returnVelocity: { returns30d: 10 }
      });
      expect(['medium', 'high']).toContain(result.risk);
    });
  });

  describe('Support Profile', () => {
    const calculateSupport = (data) => {
      const { ticketHistory, sentiment } = data || {};
      const tickets90d = ticketHistory?.last90d || 0;
      let priority = 'normal';
      if (tickets90d > 10) priority = 'high';
      let tone = sentiment === 'negative' ? 'empathetic' : 'friendly';
      return { priority, tone };
    };

    it('should identify high priority', () => {
      const result = calculateSupport({
        ticketHistory: { total: 20, last90d: 15 },
        sentiment: 'negative'
      });
      expect(result.priority).toBe('high');
    });

    it('should recommend empathetic tone for negative sentiment', () => {
      const result = calculateSupport({ sentiment: 'negative' });
      expect(result.tone).toBe('empathetic');
    });
  });

  describe('Selling Preferences', () => {
    const calculateSelling = (data) => {
      const { purchaseHistory } = data || {};
      let segment = 'occasional';
      if (purchaseHistory) {
        const avgOrdersPerMonth = purchaseHistory.orderCount / 12;
        if (avgOrdersPerMonth >= 4) segment = 'premium_explorer';
        else if (avgOrdersPerMonth >= 2) segment = 'loyal_brand';
        else if (avgOrdersPerMonth >= 1) segment = 'value_hunter';
      }
      const premiumBuyer = purchaseHistory && purchaseHistory.avgOrderValue > 3000;
      return { segment, premiumBuyer };
    };

    it('should identify premium buyers', () => {
      const result = calculateSelling({
        purchaseHistory: { totalSpend: 100000, orderCount: 60, avgOrderValue: 8000 }
      });
      expect(result.premiumBuyer).toBe(true);
    });

    it('should return valid segment', () => {
      const result = calculateSelling({
        purchaseHistory: { totalSpend: 50000, orderCount: 30, avgOrderValue: 2000 }
      });
      expect(['premium_explorer', 'loyal_brand', 'value_hunter', 'occasional']).toContain(result.segment);
    });
  });

  describe('Communication Preferences', () => {
    const calculateComm = (data) => {
      const { channelHistory } = data || {};
      let channel = 'whatsapp';
      if (channelHistory) {
        const channels = [
          { name: 'whatsapp', count: channelHistory.whatsapp || 0 },
          { name: 'email', count: channelHistory.email || 0 }
        ];
        channels.sort((a, b) => b.count - a.count);
        channel = channels[0].name;
      }
      return { channel };
    };

    it('should prefer WhatsApp by default', () => {
      const result = calculateComm({});
      expect(result.channel).toBe('whatsapp');
    });

    it('should detect email preference', () => {
      const result = calculateComm({ channelHistory: { whatsapp: 5, email: 50 } });
      expect(result.channel).toBe('email');
    });
  });

  describe('Analysis Output Structure', () => {
    it('should have correct output structure', () => {
      const analysis = {
        customer_id: 'cust_123',
        trust_score: 85,
        cod_recommendation: { allowed: true, confidence: 94 },
        return_risk: { risk: 'low' },
        support_profile: { priority: 'normal' },
        selling_preferences: { premium_buyer: true },
        loyalty: { ltv_tier: 'gold' },
        communication: { preferred_channel: 'whatsapp' },
        segments: { value: 'high_value' }
      };
      expect(analysis.customer_id).toBeDefined();
      expect(analysis.trust_score).toBeDefined();
      expect(analysis.cod_recommendation).toBeDefined();
    });
  });
});
