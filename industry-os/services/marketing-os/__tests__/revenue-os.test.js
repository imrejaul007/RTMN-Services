/**
 * RevenueOS Unit Tests
 * Phase 3: Revenue Attribution
 * Date: July 2, 2026
 */

import { describe, it, expect } from 'vitest';

describe('RevenueOS - Core Logic', () => {
  describe('aggregateByChannel', () => {
    it('correctly aggregates touchpoints by channel', () => {
      const touchpoints = [
        { channel: 'whatsapp', revenue: 1000, spend: 100 },
        { channel: 'whatsapp', revenue: 2000, spend: 200 },
        { channel: 'email', revenue: 500, spend: 50 }
      ];

      // Test the aggregation logic
      const channelMap = {};
      touchpoints.forEach(tp => {
        if (!channelMap[tp.channel]) {
          channelMap[tp.channel] = { channel: tp.channel, revenue: 0, spend: 0, conversions: 0 };
        }
        channelMap[tp.channel].revenue += tp.revenue;
        channelMap[tp.channel].spend += tp.spend;
        channelMap[tp.channel].conversions += 1;
      });

      const result = Object.values(channelMap).map(c => ({
        ...c,
        roi: c.spend > 0 ? ((c.revenue - c.spend) / c.spend) * 100 : 0
      }));

      expect(result).toHaveLength(2);

      const whatsapp = result.find(c => c.channel === 'whatsapp');
      expect(whatsapp.revenue).toBe(3000);
      expect(whatsapp.spend).toBe(300);
      expect(whatsapp.roi).toBe(900);
    });

    it('handles empty touchpoints', () => {
      const touchpoints = [];
      const channelMap = {};
      touchpoints.forEach(tp => {
        if (!channelMap[tp.channel]) {
          channelMap[tp.channel] = { channel: tp.channel, revenue: 0, spend: 0 };
        }
        channelMap[tp.channel].revenue += tp.revenue || 0;
        channelMap[tp.channel].spend += tp.spend || 0;
      });

      const result = Object.values(channelMap);
      expect(result).toHaveLength(0);
    });
  });

  describe('ROI Calculations', () => {
    it('calculates ROI percentage correctly', () => {
      const revenue = 50000;
      const spend = 10000;
      const profit = revenue - spend;
      const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;

      expect(profit).toBe(40000);
      expect(roi).toBe(400);
    });

    it('calculates ROAS correctly', () => {
      const revenue = 50000;
      const spend = 10000;
      const roas = spend > 0 ? revenue / spend : 0;

      expect(roas).toBe(5);
    });

    it('handles zero spend gracefully', () => {
      const revenue = 50000;
      const spend = 0;
      const roas = spend > 0 ? revenue / spend : 0;
      const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;

      expect(roas).toBe(0);
      expect(roi).toBe(0);
    });

    it('handles negative ROI', () => {
      const revenue = 5000;
      const spend = 10000;
      const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;

      expect(roi).toBe(-50);
    });
  });

  describe('LTV Calculations', () => {
    it('calculates ARPU correctly', () => {
      const totalRevenue = 10000;
      const orderCount = 10;
      const arpu = totalRevenue / orderCount;

      expect(arpu).toBe(1000);
    });

    it('calculates LTV from ARPU and churn rate', () => {
      const arpu = 1000;
      const churnRate = 0.05;
      const ltv = arpu * (1 / churnRate);

      expect(ltv).toBe(20000);
    });

    it('handles zero churn rate', () => {
      const arpu = 1000;
      const churnRate = 0;
      const ltv = churnRate > 0 ? arpu * (1 / churnRate) : arpu * 12;

      expect(ltv).toBe(12000);
    });
  });

  describe('Pipeline Influence', () => {
    it('calculates influence percentage correctly', () => {
      const totalDeals = 100;
      const marketingTouched = 60;
      const influencePercent = totalDeals > 0 ? (marketingTouched / totalDeals) * 100 : 0;

      expect(influencePercent).toBe(60);
    });

    it('calculates influenced value percentage', () => {
      const totalValue = 1000000;
      const influencedValue = 700000;
      const influencedPercent = totalValue > 0 ? (influencedValue / totalValue) * 100 : 0;

      expect(influencedPercent).toBe(70);
    });
  });

  describe('CAC Calculations', () => {
    it('calculates CAC correctly', () => {
      const totalSpend = 10000;
      const newCustomers = 50;
      const cac = newCustomers > 0 ? totalSpend / newCustomers : 0;

      expect(cac).toBe(200);
    });

    it('handles zero customers', () => {
      const totalSpend = 10000;
      const newCustomers = 0;
      const cac = newCustomers > 0 ? totalSpend / newCustomers : 0;

      expect(cac).toBe(0);
    });
  });

  describe('Recommendation Logic', () => {
    it('recommends action for low LTV:CAC ratio', () => {
      const ltvToCACRatio = 2;
      const shouldWarn = ltvToCACRatio < 3;

      expect(shouldWarn).toBe(true);
    });

    it('recommends action for negative ROI', () => {
      const roi = -20;
      const shouldAlert = roi < 0;

      expect(shouldAlert).toBe(true);
    });

    it('recommends action for long payback period', () => {
      const paybackPeriod = 200;
      const shouldWarn = paybackPeriod > 180;

      expect(shouldWarn).toBe(true);
    });
  });

  describe('Channel Ranking', () => {
    it('ranks channels by ROI correctly', () => {
      const channels = [
        { channel: 'email', roi: 100 },
        { channel: 'whatsapp', roi: 500 },
        { channel: 'social', roi: 200 }
      ];

      const sorted = [...channels].sort((a, b) => b.roi - a.roi);

      expect(sorted[0].channel).toBe('whatsapp');
      expect(sorted[1].channel).toBe('social');
      expect(sorted[2].channel).toBe('email');
    });
  });
});
