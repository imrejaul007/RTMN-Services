/**
 * Sales Intelligence Tests
 */

import { describe, it, expect } from 'vitest';

// Pure function tests
function calculateSellingPreferences(data) {
  const { purchaseHistory, browsingHistory, responseHistory } = data || {};

  let segment = 'occasional';
  let segmentDesc = 'Occasional shopper';

  if (purchaseHistory) {
    const avgOrdersPerMonth = purchaseHistory.orderCount / 12;
    if (avgOrdersPerMonth >= 4) {
      segment = 'premium_explorer';
      segmentDesc = 'High-frequency premium buyer who explores new products';
    } else if (avgOrdersPerMonth >= 2) {
      segment = 'loyal_brand';
      segmentDesc = 'Regular buyer with brand loyalty';
    } else if (avgOrdersPerMonth >= 1) {
      segment = 'value_hunter';
      segmentDesc = 'Value-conscious shopper looking for deals';
    }
  }

  let priceSensitivity = 'medium';
  if (purchaseHistory?.avgOrderValue > 5000) priceSensitivity = 'low';
  else if (purchaseHistory?.avgOrderValue < 1000) priceSensitivity = 'high';

  let discountResponsiveness = 0.5;
  if (responseHistory) {
    const responseRate = responseHistory.offerAcceptances / (responseHistory.campaignClicks || 1);
    discountResponsiveness = Math.min(responseRate, 1);
  }

  const premiumBuyer = purchaseHistory && purchaseHistory.avgOrderValue > 3000;
  const categories = purchaseHistory?.categories || ['general'];

  let frequency = 'occasional';
  if (purchaseHistory) {
    const ordersPerMonth = purchaseHistory.orderCount / 12;
    if (ordersPerMonth >= 4) frequency = 'weekly';
    else if (ordersPerMonth >= 1) frequency = 'monthly';
  }

  let nextOffer = 'membership_upgrade';
  if (premiumBuyer) nextOffer = 'premium_subscription';
  else if (discountResponsiveness > 0.6) nextOffer = 'loyalty_discount';
  else nextOffer = 'personalized_recommendation';

  const upsells = [];
  if (premiumBuyer) upsells.push('premium_subscription', 'exclusive_access');
  if (discountResponsiveness > 0.5) upsells.push('bulk_discount', 'loyalty_points');

  return {
    customer_segment: segment,
    segment_description: segmentDesc,
    price_sensitivity: priceSensitivity,
    discount_responsiveness: Math.round(discountResponsiveness * 100) / 100,
    premium_buyer: premiumBuyer,
    preferred_categories: categories,
    buying_frequency: frequency,
    next_best_offer: nextOffer,
    recommended_channel: 'whatsapp',
    recommended_time: 'evening',
    upsell_opportunities: upsells
  };
}

describe('Sales Intelligence', () => {
  describe('Customer Segmentation', () => {
    it('should default to occasional shopper', () => {
      const result = calculateSellingPreferences({});
      expect(result.customer_segment).toBe('occasional');
    });

    it('should detect premium explorer (>4 orders/month)', () => {
      const result = calculateSellingPreferences({
        purchaseHistory: { orderCount: 60, avgOrderValue: 6000 }
      });
      expect(result.customer_segment).toBe('premium_explorer');
    });

    it('should detect loyal brand (2-4 orders/month)', () => {
      const result = calculateSellingPreferences({
        purchaseHistory: { orderCount: 30, avgOrderValue: 2000 }
      });
      expect(result.customer_segment).toBe('loyal_brand');
    });

    it('should detect value hunter (1-2 orders/month)', () => {
      const result = calculateSellingPreferences({
        purchaseHistory: { orderCount: 15, avgOrderValue: 500 }
      });
      expect(result.customer_segment).toBe('value_hunter');
    });
  });

  describe('Price Sensitivity', () => {
    it('should detect low price sensitivity (>5000)', () => {
      const result = calculateSellingPreferences({
        purchaseHistory: { orderCount: 12, avgOrderValue: 6000 }
      });
      expect(result.price_sensitivity).toBe('low');
    });

    it('should detect high price sensitivity (<1000)', () => {
      const result = calculateSellingPreferences({
        purchaseHistory: { orderCount: 12, avgOrderValue: 500 }
      });
      expect(result.price_sensitivity).toBe('high');
    });

    it('should default to medium price sensitivity', () => {
      const result = calculateSellingPreferences({
        purchaseHistory: { orderCount: 12, avgOrderValue: 2500 }
      });
      expect(result.price_sensitivity).toBe('medium');
    });
  });

  describe('Premium Buyer Detection', () => {
    it('should detect premium buyer (>3000 avg order)', () => {
      const result = calculateSellingPreferences({
        purchaseHistory: { orderCount: 12, avgOrderValue: 4000 }
      });
      expect(result.premium_buyer).toBe(true);
    });

    it('should detect non-premium buyer (<3000 avg order)', () => {
      const result = calculateSellingPreferences({
        purchaseHistory: { orderCount: 12, avgOrderValue: 2000 }
      });
      expect(result.premium_buyer).toBe(false);
    });
  });

  describe('Buying Frequency', () => {
    it('should detect weekly buyers (>=4 orders/month)', () => {
      const result = calculateSellingPreferences({
        purchaseHistory: { orderCount: 60 }
      });
      expect(result.buying_frequency).toBe('weekly');
    });

    it('should detect monthly buyers (>=1 orders/month)', () => {
      const result = calculateSellingPreferences({
        purchaseHistory: { orderCount: 20 }
      });
      expect(result.buying_frequency).toBe('monthly');
    });

    it('should default to occasional', () => {
      const result = calculateSellingPreferences({
        purchaseHistory: { orderCount: 5 }
      });
      expect(result.buying_frequency).toBe('occasional');
    });
  });

  describe('Next Best Offer', () => {
    it('should recommend premium subscription for premium buyers', () => {
      const result = calculateSellingPreferences({
        purchaseHistory: { orderCount: 12, avgOrderValue: 4000 }
      });
      expect(result.next_best_offer).toBe('premium_subscription');
    });

    it('should recommend loyalty discount for high discount responsiveness', () => {
      const result = calculateSellingPreferences({
        purchaseHistory: { orderCount: 12, avgOrderValue: 1000 },
        responseHistory: { offerAcceptances: 8, campaignClicks: 10 }
      });
      expect(result.next_best_offer).toBe('loyalty_discount');
    });

    it('should recommend personalized recommendation otherwise', () => {
      const result = calculateSellingPreferences({
        purchaseHistory: { orderCount: 12, avgOrderValue: 2000 },
        responseHistory: { offerAcceptances: 2, campaignClicks: 10 }
      });
      expect(result.next_best_offer).toBe('personalized_recommendation');
    });
  });

  describe('Upsell Opportunities', () => {
    it('should suggest premium upsells for premium buyers', () => {
      const result = calculateSellingPreferences({
        purchaseHistory: { orderCount: 12, avgOrderValue: 4000 }
      });
      expect(result.upsell_opportunities).toContain('premium_subscription');
      expect(result.upsell_opportunities).toContain('exclusive_access');
    });

    it('should suggest discount upsells for discount-responsive customers', () => {
      const result = calculateSellingPreferences({
        purchaseHistory: { orderCount: 12, avgOrderValue: 2000 },
        responseHistory: { offerAcceptances: 6, campaignClicks: 10 }
      });
      expect(result.upsell_opportunities).toContain('bulk_discount');
      expect(result.upsell_opportunities).toContain('loyalty_points');
    });
  });

  describe('Channel & Timing', () => {
    it('should recommend whatsapp channel', () => {
      const result = calculateSellingPreferences({});
      expect(result.recommended_channel).toBe('whatsapp');
    });

    it('should recommend evening time', () => {
      const result = calculateSellingPreferences({});
      expect(result.recommended_time).toBe('evening');
    });
  });
});
