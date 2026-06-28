/**
 * Unit tests for DO App Integration
 */
import { describe, it, expect } from 'vitest';

function calculateCommission(orderValue, rate = 0.05) {
  return Math.round(orderValue * rate * 100) / 100;
}

function routeOrder(order, merchants) {
  for (const merchant of merchants) {
    if (merchant.categories?.includes(order.category)) {
      return { merchantId: merchant.id, status: 'routed', reason: 'category_match' };
    }
  }
  return { merchantId: null, status: 'no_match', reason: 'no_merchant' };
}

function calculateDeliveryETA(distance, avgSpeed = 30) {
  return Math.round((distance / avgSpeed) * 60); // minutes
}

describe('DO App Integration', () => {
  it('should calculate commission', () => {
    expect(calculateCommission(1000, 0.05)).toBe(50);
    expect(calculateCommission(1000)).toBe(50);
    expect(calculateCommission(500, 0.10)).toBe(50);
  });

  it('should route orders to matching merchants', () => {
    const order = { id: 'o1', category: 'food' };
    const merchants = [
      { id: 'm1', categories: ['grocery'] },
      { id: 'm2', categories: ['food', 'drinks'] }
    ];
    const result = routeOrder(order, merchants);
    expect(result.merchantId).toBe('m2');
    expect(result.status).toBe('routed');
  });

  it('should handle no matching merchant', () => {
    const order = { id: 'o1', category: 'unknown' };
    const merchants = [{ id: 'm1', categories: ['food'] }];
    const result = routeOrder(order, merchants);
    expect(result.status).toBe('no_match');
  });

  it('should calculate delivery ETA', () => {
    expect(calculateDeliveryETA(15, 30)).toBe(30); // 15km at 30km/h = 30min
    expect(calculateDeliveryETA(30, 30)).toBe(60);
  });
});
