/**
 * Loyalty Intelligence Tests
 */

import { describe, it, expect } from 'vitest';

function calculateLoyaltyProfile(data) {
  const { purchaseHistory, engagementHistory, subscriptionStatus } = data || {};

  const currentLTV = purchaseHistory?.totalSpend || 0;
  const avgOrderValue = purchaseHistory?.avgOrderValue || currentLTV / Math.max(purchaseHistory?.orderCount || 1, 1);
  const ordersPerYear = purchaseHistory?.orderCount / 2 || 0;
  const yearlySpend = ordersPerYear * avgOrderValue;

  const predicted1yr = currentLTV + yearlySpend;
  const predicted3yr = currentLTV + (yearlySpend * 3);

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

  const churnLevel = churnProb > 0.5 ? 'high' : churnProb > 0.3 ? 'medium' : 'low';

  const retentionRecs = [];
  if (churnProb > 0.3) retentionRecs.push('win-back_offer', 'personalized_reachout');
  if (tier === 'gold' || tier === 'platinum') retentionRecs.push('exclusive_previews', 'vip_support');
  retentionRecs.push('loyalty_points', 'early_access');

  const benefits = [];
  if (tier === 'vip') benefits.push('free_shipping', 'priority_support', 'exclusive_access', 'personal_shopper');
  else if (tier === 'platinum') benefits.push('free_shipping', 'priority_support', 'early_access');
  else if (tier === 'gold') benefits.push('free_shipping', 'birthday_discount');
  else benefits.push('loyalty_points');

  const upsellOpp = [];
  if (tier !== 'vip') upsellOpp.push('membership_upgrade');
  if (subscriptionStatus === 'none') upsellOpp.push('premium_subscription');
  upsellOpp.push('referral_program');

  return {
    ltv: {
      current: currentLTV,
      predicted_1yr: Math.round(predicted1yr),
      predicted_3yr: Math.round(predicted3yr)
    },
    ltv_tier: tier,
    churn_risk: {
      probability: Math.round(churnProb * 100) / 100,
      level: churnLevel,
    },
    retention_recommendations: retentionRecs,
    upsell_opportunities: upsellOpp,
    membership_benefits: benefits
  };
}

describe('Loyalty Intelligence', () => {
  describe('LTV Tier Calculation', () => {
    it('should default to bronze tier', () => {
      const result = calculateLoyaltyProfile({});
      expect(result.ltv_tier).toBe('bronze');
    });

    it('should calculate silver tier (5000+)', () => {
      const result = calculateLoyaltyProfile({ purchaseHistory: { totalSpend: 10000 } });
      expect(result.ltv_tier).toBe('silver');
    });

    it('should calculate gold tier (20000+)', () => {
      const result = calculateLoyaltyProfile({ purchaseHistory: { totalSpend: 25000 } });
      expect(result.ltv_tier).toBe('gold');
    });

    it('should calculate platinum tier (50000+)', () => {
      const result = calculateLoyaltyProfile({ purchaseHistory: { totalSpend: 60000 } });
      expect(result.ltv_tier).toBe('platinum');
    });

    it('should calculate VIP tier (100000+)', () => {
      const result = calculateLoyaltyProfile({ purchaseHistory: { totalSpend: 150000 } });
      expect(result.ltv_tier).toBe('vip');
    });
  });

  describe('LTV Prediction', () => {
    it('should include current LTV', () => {
      const result = calculateLoyaltyProfile({ purchaseHistory: { totalSpend: 50000 } });
      expect(result.ltv.current).toBe(50000);
    });

    it('should predict 1yr LTV', () => {
      const result = calculateLoyaltyProfile({ purchaseHistory: { totalSpend: 10000 } });
      expect(result.ltv.predicted_1yr).toBeGreaterThan(result.ltv.current);
    });

    it('should predict 3yr LTV', () => {
      const result = calculateLoyaltyProfile({ purchaseHistory: { totalSpend: 10000 } });
      expect(result.ltv.predicted_3yr).toBeGreaterThan(result.ltv.predicted_1yr);
    });
  });

  describe('Churn Risk', () => {
    it('should default to 0.5 churn probability', () => {
      const result = calculateLoyaltyProfile({});
      expect(result.churn_risk.probability).toBe(0.5);
    });

    it('should decrease with high engagement (>50)', () => {
      const result = calculateLoyaltyProfile({ engagementHistory: { logins: 60 } });
      expect(result.churn_risk.probability).toBe(0.1);
    });

    it('should decrease with medium engagement (>20)', () => {
      const result = calculateLoyaltyProfile({ engagementHistory: { logins: 30 } });
      expect(result.churn_risk.probability).toBe(0.25);
    });

    it('should increase with low engagement (<5)', () => {
      const result = calculateLoyaltyProfile({ engagementHistory: { logins: 2 } });
      expect(result.churn_risk.probability).toBe(0.7);
    });

    it('should label high churn (>0.5) as high risk', () => {
      const result = calculateLoyaltyProfile({ engagementHistory: { logins: 2 } });
      expect(result.churn_risk.level).toBe('high');
    });

    it('should label medium churn (0.3-0.5) as medium risk', () => {
      const result = calculateLoyaltyProfile({ engagementHistory: { logins: 30 } });
      expect(result.churn_risk.level).toBe('medium');
    });

    it('should label low churn (<0.3) as low risk', () => {
      const result = calculateLoyaltyProfile({ engagementHistory: { logins: 60 } });
      expect(result.churn_risk.level).toBe('low');
    });
  });

  describe('Retention Recommendations', () => {
    it('should always suggest loyalty points and early access', () => {
      const result = calculateLoyaltyProfile({});
      expect(result.retention_recommendations).toContain('loyalty_points');
      expect(result.retention_recommendations).toContain('early_access');
    });

    it('should suggest win-back for at-risk customers', () => {
      const result = calculateLoyaltyProfile({ engagementHistory: { logins: 10 } });
      expect(result.retention_recommendations).toContain('win-back_offer');
    });

    it('should suggest premium perks for high tiers', () => {
      const result = calculateLoyaltyProfile({ purchaseHistory: { totalSpend: 25000 } });
      expect(result.retention_recommendations).toContain('exclusive_previews');
    });
  });

  describe('Membership Benefits', () => {
    it('should give loyalty points to bronze', () => {
      const result = calculateLoyaltyProfile({});
      expect(result.membership_benefits).toContain('loyalty_points');
    });

    it('should give free shipping to gold+', () => {
      const result = calculateLoyaltyProfile({ purchaseHistory: { totalSpend: 25000 } });
      expect(result.membership_benefits).toContain('free_shipping');
      expect(result.membership_benefits).toContain('birthday_discount');
    });

    it('should give VIP benefits to platinum+', () => {
      const result = calculateLoyaltyProfile({ purchaseHistory: { totalSpend: 60000 } });
      expect(result.membership_benefits).toContain('priority_support');
      expect(result.membership_benefits).toContain('early_access');
    });

    it('should give extra VIP benefits to top tier', () => {
      const result = calculateLoyaltyProfile({ purchaseHistory: { totalSpend: 150000 } });
      expect(result.membership_benefits).toContain('personal_shopper');
    });
  });

  describe('Upsell Opportunities', () => {
    it('should always suggest referral program', () => {
      const result = calculateLoyaltyProfile({});
      expect(result.upsell_opportunities).toContain('referral_program');
    });

    it('should suggest membership upgrade for non-VIP', () => {
      const result = calculateLoyaltyProfile({ purchaseHistory: { totalSpend: 50000 } });
      expect(result.upsell_opportunities).toContain('membership_upgrade');
    });

    it('should not suggest upgrade for VIP', () => {
      const result = calculateLoyaltyProfile({ purchaseHistory: { totalSpend: 150000 } });
      expect(result.upsell_opportunities).not.toContain('membership_upgrade');
    });

    it('should suggest subscription for non-subscribers', () => {
      const result = calculateLoyaltyProfile({ subscriptionStatus: 'none' });
      expect(result.upsell_opportunities).toContain('premium_subscription');
    });
  });
});
