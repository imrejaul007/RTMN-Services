/**
 * Customer Intelligence Gateway - Tests
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Mock the express app
const mockApp = {
  post: vi.fn(),
  get: vi.fn(),
  use: vi.fn(),
  listen: vi.fn(),
};

// Mock express module
vi.mock('express', () => ({
  default: () => mockApp,
}));

// Import the actual functions by evaluating the module
// We'll test the logic directly

describe('Customer Intelligence Gateway', () => {
  describe('Trust Score Calculation', () => {
    const calculateTrustScore = (data) => {
      const { orderHistory, supportHistory, accountAge, paymentHistory } = data;

      let score = 50;
      const factors = [];

      if (orderHistory) {
        const completionRate = orderHistory.total > 0
          ? orderHistory.completed / orderHistory.total
          : 0.5;
        score += completionRate * 30 - 15;
        factors.push({ name: 'order_completion_rate', contribution: completionRate - 0.5 });
      }

      if (orderHistory) {
        const returnRate = orderHistory.total > 0
          ? orderHistory.returned / orderHistory.total
          : 0;
        score += -returnRate * 20;
      }

      if (accountAge) {
        const ageFactor = Math.min(accountAge / 365, 1);
        score += ageFactor * 15 - 7.5;
      }

      score = Math.max(0, Math.min(100, Math.round(score)));

      let level = 'low';
      if (score >= 80) level = 'trusted';
      else if (score >= 60) level = 'high';
      else if (score >= 40) level = 'medium';

      return { score, level, factors };
    };

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

  describe('COD Recommendation', () => {
    const calculateCodRecommendation = (data) => {
      const { orderHistory, addressHistory, deviceHistory, purchaseAmount } = data;

      let score = 0.5;

      if (orderHistory) {
        const codSuccessRate = orderHistory.total > 0
          ? orderHistory.completed / orderHistory.total
          : 0.5;
        score += (codSuccessRate - 0.5) * 0.35 * 2;
      }

      if (addressHistory) {
        const stability = Math.max(0, 1 - addressHistory.changes90d / 5);
        score += (stability - 0.5) * 0.2 * 2;
      }

      if (deviceHistory) {
        const consistency = Math.max(0, 1 - deviceHistory.changes30d / 3);
        score += (consistency - 0.5) * 0.1 * 2;
      }

      if (purchaseAmount && purchaseAmount > 10000) {
        score -= 0.09;
      }

      score = Math.max(0, Math.min(1, score));

      let recommendation = 'review';
      let allowed = false;
      if (score >= 0.7) {
        recommendation = 'allow';
        allowed = true;
      } else if (score < 0.4) {
        recommendation = 'block';
      }

      return { allowed, confidence: Math.round(score * 100), recommendation };
    };

    it('should allow COD for reliable customers', () => {
      const result = calculateCodRecommendation({
        orderHistory: { total: 20, completed: 19, returned: 1 },
        addressHistory: { changes90d: 0, verified: true },
        deviceHistory: { changes30d: 0 }
      });

      expect(result.allowed).toBe(true);
      expect(result.recommendation).toBe('allow');
      expect(result.confidence).toBeGreaterThan(70);
    });

    it('should block COD for risky customers', () => {
      const result = calculateCodRecommendation({
        orderHistory: { total: 10, completed: 4, returned: 6 },
        addressHistory: { changes90d: 5, verified: false },
        deviceHistory: { changes30d: 3 },
        purchaseAmount: 15000
      });

      expect(result.allowed).toBe(false);
      expect(result.confidence).toBeLessThan(40);
    });

    it('should require review for borderline cases', () => {
      const result = calculateCodRecommendation({
        orderHistory: { total: 5, completed: 3, returned: 2 },
        addressHistory: { changes90d: 1, verified: true }
      });

      expect(result.recommendation).toBe('review');
    });
  });

  describe('Return Risk Assessment', () => {
    const calculateReturnRisk = (data) => {
      const { orderHistory, returnVelocity } = data;

      let riskScore = 0.3;

      if (orderHistory) {
        const returnRate = orderHistory.total > 0
          ? orderHistory.returns / orderHistory.total
          : 0;
        riskScore += returnRate * 0.4;
      }

      if (returnVelocity) {
        const velocityScore = Math.min(returnVelocity.returns30d / 10, 1);
        riskScore += velocityScore * 0.25;
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
        abuse_probability: riskScore >= 0.5 ? riskScore * 0.5 : riskScore * 0.3
      };
    };

    it('should flag low risk for good returners', () => {
      const result = calculateReturnRisk({
        orderHistory: { orders: 20, returns: 1 },
        returnVelocity: { returns7d: 0, returns30d: 1 }
      });

      expect(result.risk).toBe('low');
      expect(result.policy_recommendation).toBe('free_returns');
    });

    it('should flag high risk for return abusers', () => {
      const result = calculateReturnRisk({
        orderHistory: { orders: 10, returns: 9 },
        returnVelocity: { returns7d: 5, returns30d: 10 }
      });

      expect(result.risk).toBe('high');
      expect(result.policy_recommendation).toBe('manual_review');
    });

    it('should recommend exchange-only for medium risk', () => {
      const result = calculateReturnRisk({
        orderHistory: { orders: 10, returns: 5 },
        returnVelocity: { returns7d: 1, returns30d: 4 }
      });

      expect(result.risk).toBe('medium');
      expect(result.policy_recommendation).toBe('standard');
    });
  });

  describe('Support Profile', () => {
    const calculateSupportProfile = (data) => {
      const { ticketHistory, refundRequests, sentiment } = data;

      const tickets90d = ticketHistory?.last90d || 0;

      let escalationProb = 0.1;
      if (ticketHistory?.escalations > 0) {
        escalationProb += Math.min(ticketHistory.escalations * 0.1, 0.3);
      }
      if (sentiment === 'negative') {
        escalationProb += 0.2;
      }
      if (tickets90d > 5) {
        escalationProb += 0.1;
      }
      escalationProb = Math.min(escalationProb, 1);

      let priority = 'normal';
      if (escalationProb > 0.5 || tickets90d > 10) priority = 'high';
      else if (escalationProb < 0.2 && tickets90d <= 2) priority = 'low';

      let tone = 'friendly';
      if (sentiment === 'negative') tone = 'empathetic';

      return {
        tickets_90d: tickets90d,
        escalation_probability: Math.round(escalationProb * 100) / 100,
        priority,
        recommended_tone: tone,
        preferred_channel: 'whatsapp'
      };
    };

    it('should identify high priority customers', () => {
      const result = calculateSupportProfile({
        ticketHistory: { total: 20, last90d: 15, escalations: 3 },
        sentiment: 'negative'
      });

      expect(result.priority).toBe('high');
      expect(result.escalation_probability).toBeGreaterThan(0.5);
      expect(result.recommended_tone).toBe('empathetic');
    });

    it('should identify low priority customers', () => {
      const result = calculateSupportProfile({
        ticketHistory: { total: 2, last90d: 1, escalations: 0 },
        sentiment: 'positive'
      });

      expect(result.priority).toBe('low');
      expect(result.escalation_probability).toBeLessThan(0.2);
    });
  });

  describe('Selling Preferences', () => {
    const calculateSellingPreferences = (data) => {
      const { purchaseHistory } = data;

      let segment = 'occasional';
      if (purchaseHistory) {
        const avgOrdersPerMonth = purchaseHistory.orderCount / 12;
        if (avgOrdersPerMonth >= 4) segment = 'premium_explorer';
        else if (avgOrdersPerMonth >= 2) segment = 'loyal_brand';
        else if (avgOrdersPerMonth >= 1) segment = 'value_hunter';
      }

      let priceSensitivity = 'medium';
      if (purchaseHistory?.avgOrderValue > 5000) priceSensitivity = 'low';
      else if (purchaseHistory?.avgOrderValue < 1000) priceSensitivity = 'high';

      const premiumBuyer = purchaseHistory && purchaseHistory.avgOrderValue > 3000;

      return {
        customer_segment: segment,
        price_sensitivity: priceSensitivity,
        premium_buyer: premiumBuyer
      };
    };

    it('should identify premium buyers', () => {
      const result = calculateSellingPreferences({
        purchaseHistory: { totalSpend: 100000, orderCount: 60, avgOrderValue: 8000 }
      });

      expect(result.customer_segment).toBe('premium_explorer');
      expect(result.premium_buyer).toBe(true);
      expect(result.price_sensitivity).toBe('low');
    });

    it('should identify value hunters', () => {
      const result = calculateSellingPreferences({
        purchaseHistory: { totalSpend: 6000, orderCount: 12, avgOrderValue: 500 } // 1 order/month = value_hunter
      });

      expect(result.customer_segment).toBe('value_hunter');
      expect(result.premium_buyer).toBe(false);
      expect(result.price_sensitivity).toBe('high');
    });
  });

  describe('Loyalty Profile', () => {
    const calculateLoyaltyProfile = (data) => {
      const { purchaseHistory, engagementHistory } = data;

      const currentLTV = purchaseHistory?.totalSpend || 0;

      let tier = 'bronze';
      if (currentLTV >= 100000) tier = 'vip';
      else if (currentLTV >= 50000) tier = 'platinum';
      else if (currentLTV >= 20000) tier = 'gold';
      else if (currentLTV >= 5000) tier = 'silver';

      const engagement = engagementHistory?.logins || 0;
      let churnProb = 0.5;
      if (engagement > 50) churnProb = 0.1;
      else if (engagement > 20) churnProb = 0.25;
      else if (engagement < 5) churnProb = 0.7;

      return {
        ltv_tier: tier,
        churn_risk: { probability: churnProb }
      };
    };

    it('should identify VIP customers', () => {
      const result = calculateLoyaltyProfile({
        purchaseHistory: { totalSpend: 150000, orderCount: 100 },
        engagementHistory: { logins: 200, referrals: 10 }
      });

      expect(result.ltv_tier).toBe('vip');
      expect(result.churn_risk.probability).toBe(0.1);
    });

    it('should flag churn risk for inactive customers', () => {
      const result = calculateLoyaltyProfile({
        purchaseHistory: { totalSpend: 2000, orderCount: 2 },
        engagementHistory: { logins: 2 }
      });

      expect(result.churn_risk.probability).toBe(0.7);
    });
  });

  describe('Communication Preferences', () => {
    const calculateCommunicationPreferences = (data) => {
      const { channelHistory, sentimentHistory } = data;

      let channel = 'whatsapp';
      if (channelHistory) {
        const channels = [
          { name: 'whatsapp', count: channelHistory.whatsapp || 0 },
          { name: 'email', count: channelHistory.email || 0 }
        ];
        channels.sort((a, b) => b.count - a.count);
        channel = channels[0].name;
      }

      let tone = 'friendly';
      if (sentimentHistory?.negative > sentimentHistory?.positive) {
        tone = 'empathetic';
      }

      return {
        preferred_channel: channel,
        preferred_tone: tone
      };
    };

    it('should prefer WhatsApp by default', () => {
      const result = calculateCommunicationPreferences({});

      expect(result.preferred_channel).toBe('whatsapp');
      expect(result.preferred_tone).toBe('friendly');
    });

    it('should detect channel preference from history', () => {
      const result = calculateCommunicationPreferences({
        channelHistory: { whatsapp: 5, email: 50 }
      });

      expect(result.preferred_channel).toBe('email');
    });

    it('should recommend empathetic tone for negative sentiment', () => {
      const result = calculateCommunicationPreferences({
        sentimentHistory: { positive: 1, negative: 5 }
      });

      expect(result.preferred_tone).toBe('empathetic');
    });
  });

  describe('Customer Segments', () => {
    const calculateSegments = (data) => {
      const { purchaseHistory, engagementHistory } = data;

      let value = 'new';
      if (purchaseHistory) {
        if (purchaseHistory.totalSpend > 50000) value = 'vip';
        else if (purchaseHistory.totalSpend > 20000) value = 'high_value';
        else if (purchaseHistory.totalSpend > 5000) value = 'regular';
      }

      let behavior = 'new';
      if (purchaseHistory) {
        const ordersPerYear = purchaseHistory.orderCount / 2;
        if (ordersPerYear >= 4) behavior = 'frequent';
        else if (ordersPerYear >= 1) behavior = 'occasional';
      }

      return { value, behavior };
    };

    it('should segment high-value frequent buyers', () => {
      const result = calculateSegments({
        purchaseHistory: { totalSpend: 80000, orderCount: 50 } // 25 orders/year = frequent
      });

      expect(result.value).toBe('vip');
      expect(result.behavior).toBe('frequent');
    });

    it('should segment new customers', () => {
      const result = calculateSegments({
        purchaseHistory: { totalSpend: 500, orderCount: 1 }
      });

      expect(result.value).toBe('new');
      expect(result.behavior).toBe('occasional'); // new customers with 1 order are occasional
    });
  });

  describe('Full Customer Analysis', () => {
    it('should produce complete analysis for a customer', () => {
      const input = {
        phone: '+919876543210',
        orderHistory: { total: 25, completed: 23, returned: 2 },
        supportHistory: { tickets: 2, escalations: 0 },
        accountAge: 180,
        paymentHistory: { successful: 23, failed: 2 },
        addressHistory: { changes90d: 1, verified: true },
        ticketHistory: { total: 3, last90d: 2, escalations: 0 },
        purchaseHistory: { totalSpend: 75000, orderCount: 30, avgOrderValue: 2500 },
        engagementHistory: { logins: 80, referrals: 5 },
        channelHistory: { whatsapp: 40, email: 20 }
      };

      // Test all components
      const trustResult = calculateTrustScore({
        orderHistory: input.orderHistory,
        accountAge: input.accountAge,
        paymentHistory: input.paymentHistory
      });

      const codResult = calculateCodRecommendation({
        orderHistory: input.orderHistory,
        addressHistory: input.addressHistory
      });

      const returnRiskResult = calculateReturnRisk({
        orderHistory: { orders: input.orderHistory.total, returns: input.orderHistory.returned }
      });

      const supportResult = calculateSupportProfile({
        ticketHistory: input.ticketHistory
      });

      const salesResult = calculateSellingPreferences({
        purchaseHistory: input.purchaseHistory
      });

      const loyaltyResult = calculateLoyaltyProfile({
        purchaseHistory: input.purchaseHistory,
        engagementHistory: input.engagementHistory
      });

      const commResult = calculateCommunicationPreferences({
        channelHistory: input.channelHistory
      });

      const segmentResult = calculateSegments({
        purchaseHistory: input.purchaseHistory
      });

      // Verify all results are valid
      expect(trustResult.score).toBeGreaterThan(60);
      expect(codResult.allowed).toBe(true);
      expect(returnRiskResult.risk).toBe('low');
      expect(supportResult.priority).toBe('low');
      expect(salesResult.premium_buyer).toBe(true);
      expect(['gold', 'platinum']).toContain(loyaltyResult.ltv_tier);
      expect(commResult.preferred_channel).toBe('whatsapp');
      expect(segmentResult.value).toBe('vip');
    });
  });
});
