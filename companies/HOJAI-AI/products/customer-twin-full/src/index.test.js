/**
 * Unit tests for Customer Twin Full
 */
import { describe, it, expect } from 'vitest';

function calculateLTV(purchases, avgOrderValue) {
  return purchases * (avgOrderValue || 500);
}

function calculateChurnRisk(lastPurchaseDate, thresholdDays = 30) {
  if (!lastPurchaseDate) return 90;
  const days = Math.floor((Date.now() - new Date(lastPurchaseDate).getTime()) / 86400000);
  if (days > 90) return 90;
  if (days > 60) return 70;
  if (days > 30) return 40;
  return 10;
}

function calculatePurchaseProbability(behavior) {
  const events = (behavior.pageViews || 0) + (behavior.searches || 0);
  const purchases = behavior.purchases || 0;
  if (purchases > 0) return Math.min(95, 50 + events);
  return Math.max(5, events * 5);
}

function segmentCustomer(profile) {
  const ltv = profile.predictive?.ltv || 0;
  const churn = profile.predictive?.churnRisk || 50;
  if (ltv >= 50000 && churn < 30) return 'vip';
  if (ltv >= 10000 && churn < 50) return 'loyal';
  if (churn >= 70) return 'at_risk';
  if (ltv < 1000) return 'new';
  return 'standard';
}

describe('Customer Twin Full', () => {
  it('should calculate LTV', () => {
    expect(calculateLTV(5, 1000)).toBe(5000);
    expect(calculateLTV(0, 500)).toBe(0);
    expect(calculateLTV(3)).toBe(1500); // default avgOrderValue
  });

  it('should calculate churn risk based on recency', () => {
    const today = new Date();
    const recent = new Date(today.getTime() - 7 * 86400000).toISOString();
    const old = new Date(today.getTime() - 60 * 86400000).toISOString();

    expect(calculateChurnRisk(recent)).toBe(10);
    expect(calculateChurnRisk(old)).toBe(70);
    expect(calculateChurnRisk(null)).toBe(90);
  });

  it('should calculate purchase probability', () => {
    expect(calculatePurchaseProbability({ pageViews: 10, purchases: 0 })).toBe(50);
    expect(calculatePurchaseProbability({ pageViews: 20, purchases: 0 })).toBe(95);
    expect(calculatePurchaseProbability({ pageViews: 2, purchases: 1 })).toBe(60);
  });

  it('should segment customers', () => {
    expect(segmentCustomer({ predictive: { ltv: 60000, churnRisk: 20 } })).toBe('vip');
    expect(segmentCustomer({ predictive: { ltv: 5000, churnRisk: 80 } })).toBe('at_risk');
    expect(segmentCustomer({ predictive: { ltv: 500 } })).toBe('new');
  });
});
