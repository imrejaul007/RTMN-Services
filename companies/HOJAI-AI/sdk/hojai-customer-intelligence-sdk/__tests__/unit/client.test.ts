/**
 * Customer Intelligence SDK - Client Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerIntelligenceSDK } from '../../src/index.js';

describe('CustomerIntelligenceSDK', () => {
  let sdk: CustomerIntelligenceSDK;

  beforeEach(() => {
    sdk = new CustomerIntelligenceSDK({
      gatewayUrl: 'http://localhost:4896',
      debug: false,
    });
  });

  describe('constructor', () => {
    it('should create SDK with default configuration', () => {
      expect(sdk).toBeDefined();
    });

    it('should initialize all modules', () => {
      expect(sdk.identity).toBeDefined();
      expect(sdk.trust).toBeDefined();
      expect(sdk.cod).toBeDefined();
      expect(sdk.returns).toBeDefined();
      expect(sdk.support).toBeDefined();
      expect(sdk.sales).toBeDefined();
      expect(sdk.twin).toBeDefined();
      expect(sdk.recommendations).toBeDefined();
      expect(sdk.graph).toBeDefined();
      expect(sdk.risk).toBeDefined();
      expect(sdk.loyalty).toBeDefined();
      expect(sdk.communication).toBeDefined();
      expect(sdk.usage).toBeDefined();
    });
  });

  describe('analyze', () => {
    it('should return full customer analysis', async () => {
      const mockResponse = {
        customer_id: 'cust_123',
        trust_score: 87,
        trust_level: 'high',
        cod_recommendation: {
          allowed: true,
          confidence: 94,
          recommendation: 'allow',
          factors: [],
          reasons: [],
        },
        return_risk: {
          risk: 'low',
          abuse_probability: 0.04,
          policy_recommendation: 'free_returns',
          factors: [],
          confidence: 0.9,
        },
        support_profile: {
          tickets_90d: 2,
          refund_rate: 0.1,
          sentiment: 'neutral',
          escalation_probability: 0.12,
          priority: 'normal',
          recommended_tone: 'friendly',
          preferred_channel: 'whatsapp',
          recommended_agent: 'ai',
          likely_resolution: 'apology',
          wait_time_tolerance: 'medium',
        },
        selling_preferences: {
          customer_segment: 'premium_explorer',
          segment_description: 'Premium buyer who explores new products',
          price_sensitivity: 'low',
          discount_responsiveness: 0.3,
          premium_buyer: true,
          preferred_categories: ['electronics'],
          buying_frequency: 'monthly',
          next_best_offer: 'membership_upgrade',
          recommended_channel: 'whatsapp',
          recommended_time: 'evening',
          upsell_opportunities: [],
        },
        loyalty: {
          ltv: { current: 45000, predicted_1yr: 60000, predicted_3yr: 180000 },
          ltv_tier: 'gold',
          churn_risk: { probability: 0.15, level: 'low', factors: ['frequent buyer'] },
          retention_recommendations: [],
          upsell_opportunities: [],
          membership_benefits: [],
        },
        communication: {
          preferred_channel: 'whatsapp',
          secondary_channel: 'email',
          preferred_tone: 'friendly',
          best_time: 'evening',
          language: 'english',
          personalization: {
            greeting_style: 'casual',
            emoji_usage: 'medium',
            personalization_level: 'standard',
          },
        },
        risk: {
          fraud_probability: 0.02,
          fraud_level: 'low',
          churn_probability: 0.15,
          churn_level: 'low',
        },
        segments: {
          value: 'high_value',
          behavior: 'frequent',
          demographic: 'young_professional',
          engagement: 'highly_engaged',
        },
        analyzed_at: new Date().toISOString(),
        confidence: 0.95,
      };

      // Mock the internal post call
      vi.spyOn(sdk as any, 'post').mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const result = await sdk.analyze({ phone: '+919876543210' });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.customer_id).toBe('cust_123');
      expect(result.data?.trust_score).toBe(87);
      expect(result.data?.cod_recommendation.allowed).toBe(true);
      expect(result.data?.selling_preferences.premium_buyer).toBe(true);
    });
  });

  describe('trust module', () => {
    it('should calculate trust score', async () => {
      const mockResponse = {
        score: 85,
        level: 'high',
        badge: 'trusted',
        factors: [
          { name: 'order_completion', contribution: 0.3, value: '95%', description: 'High completion rate' },
        ],
        calculated_at: new Date().toISOString(),
      };

      vi.spyOn(sdk.trust as any, 'post').mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const result = await sdk.trust.score({
        orderHistory: { total: 10, completed: 9, cancelled: 0, returned: 1 },
        accountAge: 365,
      });

      expect(result.success).toBe(true);
      expect(result.data?.score).toBe(85);
      expect(result.data?.badge).toBe('trusted');
    });
  });

  describe('cod module', () => {
    it('should recommend COD allowance', async () => {
      const mockResponse = {
        allowed: true,
        confidence: 94,
        recommendation: 'allow',
        factors: [
          { name: 'cod_success_rate', impact: 0.35, value: '98%', description: 'High COD success' },
        ],
        reasons: ['High order completion history'],
      };

      vi.spyOn(sdk.cod as any, 'post').mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const result = await sdk.cod.recommend({
        orderHistory: { total: 10, completed: 9, returned: 1 },
      });

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(true);
      expect(result.data?.recommendation).toBe('allow');
    });

    it('should block high-risk customers', async () => {
      const mockResponse = {
        allowed: false,
        confidence: 92,
        recommendation: 'block',
        factors: [
          { name: 'cod_success_rate', impact: 0.35, value: '40%', description: 'Low COD success' },
        ],
        reasons: ['Low order completion history'],
      };

      vi.spyOn(sdk.cod as any, 'post').mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const result = await sdk.cod.recommend({
        orderHistory: { total: 10, completed: 4, returned: 6 },
      });

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(false);
      expect(result.data?.recommendation).toBe('block');
    });
  });

  describe('returns module', () => {
    it('should assess return risk', async () => {
      const mockResponse = {
        risk: 'low',
        abuse_probability: 0.04,
        policy_recommendation: 'free_returns',
        factors: ['low return rate', 'consistent sizing purchases'],
        confidence: 0.9,
      };

      vi.spyOn(sdk.returns as any, 'post').mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const result = await sdk.returns.risk({
        orderHistory: { orders: 20, returns: 1 },
      });

      expect(result.success).toBe(true);
      expect(result.data?.risk).toBe('low');
      expect(result.data?.policy_recommendation).toBe('free_returns');
    });

    it('should recommend manual review for suspicious patterns', async () => {
      const mockResponse = {
        risk: 'high',
        abuse_probability: 0.72,
        policy_recommendation: 'manual_review',
        factors: ['high return rate', 'repeated size exchanges'],
        confidence: 0.85,
      };

      vi.spyOn(sdk.returns as any, 'post').mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const result = await sdk.returns.risk({
        orderHistory: { orders: 10, returns: 8, returnReasons: ['size too small', 'size too big'] },
        returnVelocity: { returns7d: 3, returns30d: 7 },
      });

      expect(result.success).toBe(true);
      expect(result.data?.risk).toBe('high');
      expect(result.data?.policy_recommendation).toBe('manual_review');
    });
  });

  describe('support module', () => {
    it('should generate support profile', async () => {
      const mockResponse = {
        tickets_90d: 2,
        refund_rate: 0.1,
        sentiment: 'neutral',
        escalation_probability: 0.12,
        priority: 'normal',
        recommended_tone: 'friendly',
        preferred_channel: 'whatsapp',
        recommended_agent: 'ai',
        likely_resolution: 'apology',
        wait_time_tolerance: 'medium',
      };

      vi.spyOn(sdk.support as any, 'post').mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const result = await sdk.support.profile({
        ticketHistory: { total: 5, last90d: 2, escalations: 0 },
      });

      expect(result.success).toBe(true);
      expect(result.data?.tickets_90d).toBe(2);
      expect(result.data?.preferred_channel).toBe('whatsapp');
    });
  });

  describe('sales module', () => {
    it('should generate selling preferences', async () => {
      const mockResponse = {
        customer_segment: 'premium_explorer',
        segment_description: 'Premium buyer who explores new products',
        price_sensitivity: 'low',
        discount_responsiveness: 0.3,
        premium_buyer: true,
        preferred_categories: ['electronics', 'fashion'],
        buying_frequency: 'monthly',
        next_best_offer: 'membership_upgrade',
        recommended_channel: 'whatsapp',
        recommended_time: 'evening',
        upsell_opportunities: ['premium subscription'],
      };

      vi.spyOn(sdk.sales as any, 'post').mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const result = await sdk.sales.preferences({
        purchaseHistory: { totalSpend: 50000, orderCount: 20, avgOrderValue: 2500, categories: ['electronics'] },
      });

      expect(result.success).toBe(true);
      expect(result.data?.premium_buyer).toBe(true);
      expect(result.data?.next_best_offer).toBe('membership_upgrade');
    });
  });

  describe('loyalty module', () => {
    it('should generate loyalty profile', async () => {
      const mockResponse = {
        ltv: { current: 45000, predicted_1yr: 60000, predicted_3yr: 180000 },
        ltv_tier: 'gold',
        churn_risk: { probability: 0.15, level: 'low', factors: ['frequent buyer'] },
        retention_recommendations: ['exclusive offers', 'early access'],
        upsell_opportunities: ['premium membership'],
        membership_benefits: ['free shipping', 'priority support'],
      };

      vi.spyOn(sdk.loyalty as any, 'post').mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const result = await sdk.loyalty.profile({
        purchaseHistory: { orders: 50, totalSpend: 50000 },
        engagementHistory: { logins: 100, referrals: 5, reviews: 10 },
      });

      expect(result.success).toBe(true);
      expect(result.data?.ltv.current).toBe(45000);
      expect(result.data?.ltv_tier).toBe('gold');
    });
  });

  describe('communication module', () => {
    it('should generate communication preferences', async () => {
      const mockResponse = {
        preferred_channel: 'whatsapp',
        secondary_channel: 'email',
        preferred_tone: 'friendly',
        best_time: 'evening',
        language: 'english',
        personalization: {
          greeting_style: 'casual',
          emoji_usage: 'medium',
          personalization_level: 'standard',
        },
      };

      vi.spyOn(sdk.communication as any, 'post').mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const result = await sdk.communication.preferences({
        interactionHistory: { opens: 80, clicks: 20, responses: 15 },
        channelHistory: { whatsapp: 50, email: 30, sms: 10, push: 10 },
      });

      expect(result.success).toBe(true);
      expect(result.data?.preferred_channel).toBe('whatsapp');
      expect(result.data?.preferred_tone).toBe('friendly');
    });
  });

  describe('risk module', () => {
    it('should return risk scores', async () => {
      const mockResponse = {
        fraud_probability: 0.02,
        fraud_level: 'low',
        churn_probability: 0.15,
        churn_level: 'low',
        credit_score: 720,
        credit_decision: 'approve',
      };

      vi.spyOn(sdk.risk as any, 'post').mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const result = await sdk.risk.scores('cust_123');

      expect(result.success).toBe(true);
      expect(result.data?.fraud_probability).toBe(0.02);
      expect(result.data?.fraud_level).toBe('low');
    });
  });

  describe('health check', () => {
    it('should return health status', async () => {
      const mockResponse = {
        status: 'healthy',
        services: {
          gateway: true,
          trust: true,
          cod: true,
          returns: true,
          support: true,
          sales: true,
        },
        timestamp: new Date().toISOString(),
      };

      vi.spyOn(sdk as any, 'get').mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const result = await sdk.health();

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('healthy');
    });
  });
});
