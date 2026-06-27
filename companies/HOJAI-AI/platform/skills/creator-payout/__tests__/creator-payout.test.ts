import { describe, it, expect } from 'vitest';

// Creator Payout Constants
const PAYOUT_STATUSES = ['pending', 'processing', 'completed', 'failed'];
const REVENUE_TIERS = [
  { min: 0, max: 1000, split: 0.6 },
  { min: 1000, max: 5000, split: 0.7 },
  { min: 5000, max: Infinity, split: 0.8 }
];

describe('Creator Payout', () => {
  describe('Payout Statuses', () => {
    it('should have all payout statuses', () => {
      expect(PAYOUT_STATUSES).toContain('pending');
      expect(PAYOUT_STATUSES).toContain('processing');
      expect(PAYOUT_STATUSES).toContain('completed');
      expect(PAYOUT_STATUSES).toContain('failed');
    });
  });

  describe('Revenue Tiers', () => {
    it('should have progressive split rates', () => {
      expect(REVENUE_TIERS[0].split).toBeLessThan(REVENUE_TIERS[1].split);
      expect(REVENUE_TIERS[1].split).toBeLessThan(REVENUE_TIERS[2].split);
    });
  });

  describe('Earnings Calculation', () => {
    const calculateEarnings = (totalRevenue: number, split: number): number => {
      return Math.round(totalRevenue * split * 100) / 100;
    };

    it('should calculate creator earnings', () => {
      expect(calculateEarnings(1000, 0.6)).toBe(600);
      expect(calculateEarnings(5000, 0.7)).toBe(3500);
    });
  });

  describe('Tier Lookup', () => {
    const getTierSplit = (totalEarnings: number): number => {
      for (const tier of REVENUE_TIERS) {
        if (totalEarnings >= tier.min && totalEarnings < tier.max) {
          return tier.split;
        }
      }
      return 0.6;
    };

    it('should return correct split for each tier', () => {
      expect(getTierSplit(500)).toBe(0.6);
      expect(getTierSplit(3000)).toBe(0.7);
      expect(getTierSplit(10000)).toBe(0.8);
    });
  });

  describe('Payout Validation', () => {
    const validatePayout = (payout: { creatorId?: string; amount?: number; status?: string }) => {
      const errors: string[] = [];
      if (!payout.creatorId) errors.push('creatorId required');
      if (!payout.amount || payout.amount <= 0) errors.push('valid amount required');
      if (payout.status && !PAYOUT_STATUSES.includes(payout.status)) errors.push('invalid status');
      return { valid: errors.length === 0, errors };
    };

    it('should validate payout data', () => {
      expect(validatePayout({ creatorId: 'c1', amount: 100, status: 'pending' }).valid).toBe(true);
      expect(validatePayout({}).valid).toBe(false);
    });
  });

  describe('Balance Calculation', () => {
    const calculateBalance = (earnings: number, pending: number, paid: number) => {
      return { available: earnings - pending - paid, pending, total: earnings };
    };

    it('should calculate creator balance', () => {
      const balance = calculateBalance(1000, 200, 300);
      expect(balance.available).toBe(500);
      expect(balance.pending).toBe(200);
      expect(balance.total).toBe(1000);
    });
  });
});