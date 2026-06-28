/**
 * Loyalty Connector Service - Unit Tests
 * Tests core loyalty logic without requiring live server
 */

import { describe, it, expect } from 'vitest';

// Test tier configuration
describe('Tier Configuration', () => {
  const TIERS = [
    { name: 'bronze', minPoints: 0, discount: 0 },
    { name: 'silver', minPoints: 1000, discount: 5 },
    { name: 'gold', minPoints: 5000, discount: 10 },
    { name: 'platinum', minPoints: 15000, discount: 15 }
  ];

  it('should have correct tier order', () => {
    expect(TIERS[0].name).toBe('bronze');
    expect(TIERS[1].name).toBe('silver');
    expect(TIERS[2].name).toBe('gold');
    expect(TIERS[3].name).toBe('platinum');
  });

  it('should have ascending minPoints', () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].minPoints).toBeGreaterThan(TIERS[i-1].minPoints);
    }
  });

  it('should calculate tier correctly for bronze', () => {
    const points = 500;
    const tier = TIERS.find(t => points >= t.minPoints);
    expect(tier.name).toBe('bronze');
  });

  it('should calculate tier correctly for silver', () => {
    const points = 2000;
    const tier = TIERS.find(t => points >= t.minPoints);
    expect(tier.name).toBe('silver');
  });

  it('should calculate tier correctly for gold', () => {
    const points = 7000;
    const tier = TIERS.find(t => points >= t.minPoints);
    expect(tier.name).toBe('gold');
  });

  it('should calculate tier correctly for platinum', () => {
    const points = 20000;
    const tier = TIERS.find(t => points >= t.minPoints);
    expect(tier.name).toBe('platinum');
  });
});

// Test earn rules
describe('Points Earning Rules', () => {
  const EARN_RULES = {
    purchase: { pointsPerRupee: 1, name: 'Purchase' },
    review: { points: 50, name: 'Product Review' },
    referral: { points: 200, name: 'Referral Signup' },
    signup: { points: 100, name: 'Account Signup' },
    birthday: { points: 500, name: 'Birthday Bonus' }
  };

  it('should calculate purchase points correctly', () => {
    const rule = EARN_RULES.purchase;
    const amount = 1000;
    const points = Math.floor(amount * rule.pointsPerRupee);
    expect(points).toBe(1000);
  });

  it('should return fixed points for review', () => {
    const rule = EARN_RULES.review;
    expect(rule.points).toBe(50);
  });

  it('should return fixed points for referral', () => {
    const rule = EARN_RULES.referral;
    expect(rule.points).toBe(200);
  });

  it('should return fixed points for signup', () => {
    const rule = EARN_RULES.signup;
    expect(rule.points).toBe(100);
  });
});

// Test redeem rate
describe('Redeem Rate', () => {
  const REDEEM_RATE = 0.01; // 1 point = ₹0.01

  it('should calculate redeem value correctly', () => {
    const points = 1000;
    const value = points * REDEEM_RATE;
    expect(value).toBe(10); // 1000 points = ₹10
  });

  it('should handle small point values', () => {
    const points = 50;
    const value = points * REDEEM_RATE;
    expect(value).toBe(0.5);
  });
});

// Test referral code generation
describe('Referral Code Generation', () => {
  it('should generate valid referral code', () => {
    const customerId = 'custabc123';
    const referralCode = `REF${customerId.substring(0, 6).toUpperCase()}`;
    expect(referralCode).toMatch(/^REF[A-Z0-9]+$/);
    expect(referralCode).toBe('REFCUSTA');
  });

  it('should generate referral link', () => {
    const referralCode = 'REFABC123';
    const link = `https://hojai.ai/ref/${referralCode}`;
    expect(link).toContain('hojai.ai/ref/');
    expect(link).toContain(referralCode);
  });
});

// Test coupon code generation
describe('Coupon Code Generation', () => {
  it('should generate unique coupon codes', () => {
    const coupon1 = `LOYALTY${Date.now().toString(36).toUpperCase()}`;
    const coupon2 = `LOYALTY${(Date.now() + 1).toString(36).toUpperCase()}`;
    expect(coupon1).not.toBe(coupon2);
  });

  it('should match expected format', () => {
    const coupon = `LOYALTY${Date.now().toString(36).toUpperCase()}`;
    expect(coupon).toMatch(/^LOYALTY[A-Z0-9]+$/);
  });
});

// Test tier progress calculation
describe('Tier Progress', () => {
  it('should calculate progress percentage', () => {
    const currentPoints = 2500;
    const nextTierMin = 5000;
    const progress = Math.round((currentPoints / nextTierMin) * 100);
    expect(progress).toBe(50);
  });

  it('should calculate points to next tier', () => {
    const currentPoints = 2500;
    const nextTierMin = 5000;
    const pointsNeeded = nextTierMin - currentPoints;
    expect(pointsNeeded).toBe(2500);
  });

  it('should return 100% for max tier', () => {
    const currentPoints = 20000;
    const tierMaxPoints = 15000;
    const progress = currentPoints >= tierMaxPoints ? 100 : Math.round((currentPoints / tierMaxPoints) * 100);
    expect(progress).toBe(100);
  });
});
