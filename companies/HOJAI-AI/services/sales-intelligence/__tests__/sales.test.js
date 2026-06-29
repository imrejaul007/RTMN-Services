/**
 * Sales Intelligence - Tests
 */

import { describe, it, expect } from 'vitest';

function calculateSellingPreferences(data) {
  const { purchaseHistory } = data;

  let segment = 'occasional';
  if (purchaseHistory) {
    const avgOrdersPerMonth = purchaseHistory.orderCount / 12;
    if (avgOrdersPerMonth >= 4) segment = 'premium_explorer';
    else if (avgOrdersPerMonth >= 2) segment = 'loyal_brand';
  }

  const premiumBuyer = purchaseHistory && purchaseHistory.avgOrderValue > 3000;

  return { customer_segment: segment, premium_buyer: premiumBuyer };
}

describe('Sales Intelligence', () => {
  it('should identify premium buyers', () => {
    const result = calculateSellingPreferences({
      purchaseHistory: { totalSpend: 100000, orderCount: 60, avgOrderValue: 8000 }
    });

    expect(result.customer_segment).toBe('premium_explorer');
    expect(result.premium_buyer).toBe(true);
  });

  it('should identify occasional shoppers', () => {
    const result = calculateSellingPreferences({
      purchaseHistory: { totalSpend: 5000, orderCount: 5, avgOrderValue: 1000 }
    });

    expect(result.customer_segment).toBe('occasional');
    expect(result.premium_buyer).toBe(false);
  });
});
