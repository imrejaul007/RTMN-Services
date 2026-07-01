/**
 * Revenue Intelligence OS - Test Suite
 *
 * Tests: Revenue Streams, Demand Forecasting, Pricing, RevOps
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Data stores
const mockRevenueStreams = new Map();
const mockForecasts = new Map();
const mockPricingRules = new Map();
const mockPromotions = new Map();

let idCounter = 1;
const generateId = () => `rev_${String(idCounter++).padStart(6, '0')}`;

interface RevenueStream {
  id: string;
  name: string;
  type: 'subscription' | 'one-time' | 'usage' | 'transaction' | 'service';
  amount: number;
  currency: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  customerId?: string;
  status: 'active' | 'churned' | 'paused';
  startDate: string;
  endDate?: string;
  createdAt: string;
}

interface Forecast {
  id: string;
  period: 'weekly' | 'monthly' | 'quarterly';
  startDate: string;
  endDate: string;
  predicted: number;
  actual?: number;
  confidence: number;
  factors: { name: string; impact: number }[];
}

interface PricingRule {
  id: string;
  name: string;
  type: 'base' | 'volume' | 'tiered' | 'dynamic' | 'promotional';
  conditions: any;
  adjustment: { type: 'percentage' | 'fixed'; value: number };
  priority: number;
  isActive: boolean;
}

interface Promotion {
  id: string;
  name: string;
  type: 'discount' | 'bundle' | 'loyalty' | 'referral';
  discount?: { type: 'percentage' | 'fixed'; value: number };
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'expired';
  redemptions: number;
  revenueImpact?: number;
}

const revenueService = {
  // Revenue Streams
  createRevenueStream(data: Partial<RevenueStream>): RevenueStream {
    const stream: RevenueStream = {
      id: generateId(),
      name: data.name || '',
      type: data.type || 'subscription',
      amount: data.amount || 0,
      currency: data.currency || 'INR',
      frequency: data.frequency || 'monthly',
      customerId: data.customerId,
      status: data.status || 'active',
      startDate: data.startDate || new Date().toISOString(),
      endDate: data.endDate,
      createdAt: new Date().toISOString(),
    };
    mockRevenueStreams.set(stream.id, stream);
    return stream;
  },

  listRevenueStreams(filters?: { type?: RevenueStream['type']; status?: RevenueStream['status'] }): RevenueStream[] {
    let streams = Array.from(mockRevenueStreams.values());
    if (filters?.type) streams = streams.filter(s => s.type === filters.type);
    if (filters?.status) streams = streams.filter(s => s.status === filters.status);
    return streams;
  },

  calculateMRR(): { total: number; byType: Record<string, number>; byStatus: Record<string, number> } {
    const streams = Array.from(mockRevenueStreams.values()).filter(s => s.status === 'active');
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    let total = 0;
    streams.forEach(stream => {
      let monthlyAmount = stream.amount;
      if (stream.frequency === 'yearly') monthlyAmount = stream.amount / 12;
      if (stream.frequency === 'quarterly') monthlyAmount = stream.amount / 3;
      if (stream.frequency === 'weekly') monthlyAmount = stream.amount * 4.33;

      total += monthlyAmount;
      byType[stream.type] = (byType[stream.type] || 0) + monthlyAmount;
      byStatus[stream.status] = (byStatus[stream.status] || 0) + monthlyAmount;
    });

    return { total, byType, byStatus };
  },

  // Forecasting
  createForecast(data: Partial<Forecast>): Forecast {
    const forecast: Forecast = {
      id: generateId(),
      period: data.period || 'monthly',
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      predicted: data.predicted || 0,
      actual: data.actual,
      confidence: data.confidence || 0.8,
      factors: data.factors || [],
    };
    mockForecasts.set(forecast.id, forecast);
    return forecast;
  },

  updateForecastActual(id: string, actual: number): Forecast | undefined {
    const forecast = mockForecasts.get(id);
    if (!forecast) return undefined;
    forecast.actual = actual;
    mockForecasts.set(id, forecast);
    return forecast;
  },

  getForecastAccuracy(): number {
    const forecasts = Array.from(mockForecasts.values()).filter(f => f.actual !== undefined);
    if (forecasts.length === 0) return 0;

    const totalError = forecasts.reduce((sum, f) => {
      const error = Math.abs(f.predicted - (f.actual || 0)) / (f.predicted || 1);
      return sum + error;
    }, 0);

    return (1 - totalError / forecasts.length) * 100;
  },

  // Pricing
  createPricingRule(data: Partial<PricingRule>): PricingRule {
    const rule: PricingRule = {
      id: generateId(),
      name: data.name || '',
      type: data.type || 'base',
      conditions: data.conditions || {},
      adjustment: data.adjustment || { type: 'percentage', value: 0 },
      priority: data.priority || 0,
      isActive: data.isActive !== false,
    };
    mockPricingRules.set(rule.id, rule);
    return rule;
  },

  applyPricingRules(basePrice: number, context: any): { finalPrice: number; appliedRules: string[] } {
    const rules = Array.from(mockPricingRules.values())
      .filter(r => r.isActive)
      .sort((a, b) => b.priority - a.priority);

    let finalPrice = basePrice;
    const appliedRules: string[] = [];

    rules.forEach(rule => {
      if (rule.adjustment.type === 'percentage') {
        finalPrice *= (1 - rule.adjustment.value / 100);
      } else {
        finalPrice -= rule.adjustment.value;
      }
      appliedRules.push(rule.name);
    });

    return { finalPrice: Math.max(0, finalPrice), appliedRules };
  },

  // Promotions
  createPromotion(data: Partial<Promotion>): Promotion {
    const promotion: Promotion = {
      id: generateId(),
      name: data.name || '',
      type: data.type || 'discount',
      discount: data.discount,
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      status: data.status || 'draft',
      redemptions: data.redemptions || 0,
      revenueImpact: data.revenueImpact,
    };
    mockPromotions.set(promotion.id, promotion);
    return promotion;
  },

  calculatePromotionROI(promotionId: string): { cost: number; revenue: number; roi: number } | null {
    const promotion = mockPromotions.get(promotionId);
    if (!promotion || promotion.revenueImpact === undefined) return null;

    const cost = promotion.redemptions * (promotion.discount?.value || 0);
    const revenue = promotion.revenueImpact;
    const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;

    return { cost, revenue, roi };
  },

  // Revenue Dashboard
  getRevenueDashboard(): any {
    const streams = Array.from(mockRevenueStreams.values());
    const forecasts = Array.from(mockForecasts.values());
    const promotions = Array.from(mockPromotions.values());
    const mrr = this.calculateMRR();

    return {
      revenue: {
        mrr: mrr.total,
        arr: mrr.total * 12,
        byType: mrr.byType,
        activeStreams: streams.filter(s => s.status === 'active').length,
        churnedStreams: streams.filter(s => s.status === 'churned').length,
      },
      forecasting: {
        total: forecasts.length,
        accuracy: this.getForecastAccuracy(),
        avgConfidence: forecasts.length > 0
          ? forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length
          : 0,
      },
      promotions: {
        active: promotions.filter(p => p.status === 'active').length,
        totalRedemptions: promotions.reduce((sum, p) => sum + p.redemptions, 0),
        avgROI: this.calculateAvgPromotionROI(),
      },
    };
  },

  calculateAvgPromotionROI(): number {
    const promotions = Array.from(mockPromotions.values()).filter(p => p.revenueImpact !== undefined);
    if (promotions.length === 0) return 0;

    return promotions.reduce((sum, p) => {
      const cost = p.redemptions * (p.discount?.value || 0);
      const roi = cost > 0 ? ((p.revenueImpact || 0) - cost) / cost : 0;
      return sum + roi;
    }, 0) / promotions.length * 100;
  },

  reset() {
    mockRevenueStreams.clear();
    mockForecasts.clear();
    mockPricingRules.clear();
    mockPromotions.clear();
    idCounter = 1;
  },
};

describe('Revenue Intelligence OS - Revenue Streams', () => {
  beforeEach(() => revenueService.reset());

  describe('createRevenueStream', () => {
    it('should create subscription stream', () => {
      const stream = revenueService.createRevenueStream({
        name: 'Premium Plan',
        type: 'subscription',
        amount: 999,
        frequency: 'monthly',
        customerId: 'cust_123',
      });

      expect(stream.id).toBeDefined();
      expect(stream.name).toBe('Premium Plan');
      expect(stream.type).toBe('subscription');
      expect(stream.amount).toBe(999);
      expect(stream.frequency).toBe('monthly');
      expect(stream.status).toBe('active');
    });

    it('should create all stream types', () => {
      const types: RevenueStream['type'][] = ['subscription', 'one-time', 'usage', 'transaction', 'service'];
      types.forEach(type => {
        const stream = revenueService.createRevenueStream({ name: type, type, amount: 100 });
        expect(stream.type).toBe(type);
      });
    });
  });

  describe('calculateMRR', () => {
    it('should normalize to monthly', () => {
      revenueService.createRevenueStream({ name: 'Monthly', type: 'subscription', amount: 1000, frequency: 'monthly' });
      revenueService.createRevenueStream({ name: 'Yearly', type: 'subscription', amount: 12000, frequency: 'yearly' });
      revenueService.createRevenueStream({ name: 'Quarterly', type: 'subscription', amount: 3000, frequency: 'quarterly' });

      const mrr = revenueService.calculateMRR();
      // Monthly: 1000
      // Yearly: 12000/12 = 1000
      // Quarterly: 3000/3 = 1000
      expect(mrr.total).toBe(3000);
      expect(mrr.byType['subscription']).toBe(3000);
    });

    it('should only count active streams', () => {
      revenueService.createRevenueStream({ name: 'Active', type: 'subscription', amount: 1000, status: 'active' });
      revenueService.createRevenueStream({ name: 'Churned', type: 'subscription', amount: 5000, status: 'churned' });

      const mrr = revenueService.calculateMRR();
      expect(mrr.total).toBe(1000);
    });
  });
});

describe('Revenue Intelligence OS - Forecasting', () => {
  beforeEach(() => revenueService.reset());

  describe('createForecast', () => {
    it('should create with confidence', () => {
      const forecast = revenueService.createForecast({
        period: 'monthly',
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        predicted: 5000000,
        confidence: 0.92,
        factors: [
          { name: 'seasonality', impact: 0.15 },
          { name: 'market_trend', impact: 0.1 },
        ],
      });

      expect(forecast.predicted).toBe(5000000);
      expect(forecast.confidence).toBe(0.92);
      expect(forecast.factors).toHaveLength(2);
    });
  });

  describe('updateForecastActual', () => {
    it('should track actual vs predicted', () => {
      const forecast = revenueService.createForecast({
        period: 'monthly',
        predicted: 5000000,
      });

      const updated = revenueService.updateForecastActual(forecast.id, 4800000);
      expect(updated?.actual).toBe(4800000);
    });
  });

  describe('getForecastAccuracy', () => {
    it('should calculate accuracy percentage', () => {
      revenueService.createForecast({ period: 'monthly', predicted: 1000000, actual: 950000 });
      revenueService.createForecast({ period: 'monthly', predicted: 2000000, actual: 2100000 });

      const accuracy = revenueService.getForecastAccuracy();
      // (1 - (0.05 + 0.05) / 2) * 100 = 95%
      expect(accuracy).toBe(95);
    });

    it('should return 0 when no actuals', () => {
      revenueService.createForecast({ period: 'monthly', predicted: 1000000 });
      expect(revenueService.getForecastAccuracy()).toBe(0);
    });
  });
});

describe('Revenue Intelligence OS - Pricing', () => {
  beforeEach(() => revenueService.reset());

  describe('createPricingRule', () => {
    it('should create percentage discount', () => {
      const rule = revenueService.createPricingRule({
        name: 'Summer Sale',
        type: 'promotional',
        adjustment: { type: 'percentage', value: 20 },
        priority: 10,
      });

      expect(rule.adjustment.type).toBe('percentage');
      expect(rule.adjustment.value).toBe(20);
    });

    it('should create fixed discount', () => {
      const rule = revenueService.createPricingRule({
        name: '₹100 Off',
        type: 'promotional',
        adjustment: { type: 'fixed', value: 100 },
      });

      expect(rule.adjustment.type).toBe('fixed');
      expect(rule.adjustment.value).toBe(100);
    });
  });

  describe('applyPricingRules', () => {
    it('should apply single rule', () => {
      revenueService.createPricingRule({
        name: '10% Off',
        adjustment: { type: 'percentage', value: 10 },
        priority: 1,
      });

      const result = revenueService.applyPricingRules(1000, {});
      expect(result.finalPrice).toBe(900);
      expect(result.appliedRules).toContain('10% Off');
    });

    it('should apply multiple rules by priority', () => {
      revenueService.createPricingRule({
        name: '5% Off',
        adjustment: { type: 'percentage', value: 5 },
        priority: 1,
      });
      revenueService.createPricingRule({
        name: '₹50 Off',
        adjustment: { type: 'fixed', value: 50 },
        priority: 2,
      });

      const result = revenueService.applyPricingRules(1000, {});
      // First 5% off: 1000 * 0.95 = 950
      // Then ₹50 off: 950 - 50 = 900
      expect(result.finalPrice).toBe(900);
      expect(result.appliedRules).toHaveLength(2);
    });

    it('should not go below zero', () => {
      revenueService.createPricingRule({
        name: 'Super Sale',
        adjustment: { type: 'percentage', value: 150 }, // More than 100%
        priority: 1,
      });

      const result = revenueService.applyPricingRules(100, {});
      expect(result.finalPrice).toBe(0);
    });
  });
});

describe('Revenue Intelligence OS - Promotions', () => {
  beforeEach(() => revenueService.reset());

  describe('createPromotion', () => {
    it('should create discount promotion', () => {
      const promo = revenueService.createPromotion({
        name: 'Summer Sale',
        type: 'discount',
        discount: { type: 'percentage', value: 25 },
        startDate: '2026-06-01',
        endDate: '2026-08-31',
        status: 'active',
      });

      expect(promo.discount?.value).toBe(25);
      expect(promo.status).toBe('active');
    });
  });

  describe('calculatePromotionROI', () => {
    it('should calculate ROI correctly', () => {
      const promo = revenueService.createPromotion({
        name: 'Test Promo',
        discount: { type: 'fixed', value: 100 },
        redemptions: 100,
        revenueImpact: 15000,
      });

      const roi = revenueService.calculatePromotionROI(promo.id);
      // Cost = 100 * 100 = 10000
      // Revenue = 15000
      // ROI = (15000 - 10000) / 10000 * 100 = 50%
      expect(roi?.cost).toBe(10000);
      expect(roi?.revenue).toBe(15000);
      expect(roi?.roi).toBe(50);
    });

    it('should return null for invalid promotion', () => {
      const result = revenueService.calculatePromotionROI('invalid_id');
      expect(result).toBeNull();
    });
  });
});

describe('Revenue Intelligence OS - Dashboard', () => {
  beforeEach(() => revenueService.reset());

  it('should aggregate all metrics', () => {
    // Revenue streams
    revenueService.createRevenueStream({ name: 'S1', type: 'subscription', amount: 1000, status: 'active' });
    revenueService.createRevenueStream({ name: 'S2', type: 'subscription', amount: 2000, status: 'active' });
    revenueService.createRevenueStream({ name: 'S3', type: 'one-time', amount: 5000, status: 'churned' });

    // Forecasts
    revenueService.createForecast({ period: 'monthly', predicted: 3000000, actual: 2800000, confidence: 0.9 });

    // Promotions
    revenueService.createPromotion({ name: 'P1', status: 'active', redemptions: 50, revenueImpact: 5000 });

    const dashboard = revenueService.getRevenueDashboard();

    expect(dashboard.revenue.mrr).toBe(3000); // 1000 + 2000
    expect(dashboard.revenue.arr).toBe(36000); // 3000 * 12
    expect(dashboard.revenue.activeStreams).toBe(2);
    expect(dashboard.revenue.churnedStreams).toBe(1);

    expect(dashboard.forecasting.total).toBe(1);
    expect(dashboard.forecasting.avgConfidence).toBe(0.9);

    expect(dashboard.promotions.active).toBe(1);
  });
});
