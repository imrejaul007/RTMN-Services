/**
 * Loyalty Intelligence - Tests
 */

import { describe, it, expect } from 'vitest';

function calculateLoyaltyProfile(data) {
  const { purchaseHistory, engagementHistory } = data;

  const currentLTV = purchaseHistory?.totalSpend || 0;

  let tier = 'bronze';
  if (currentLTV >= 100000) tier = 'vip';
  else if (currentLTV >= 50000) tier = 'platinum';
  else if (currentLTV >= 20000) tier = 'gold';
  else if (currentLTV >= 5000) tier = 'silver';

  const engagement = engagementHistory?.logins || 0;
  let churnProb = 0.5;
  if (engagement > 50) churnProb = 0.1;
  else if (engagement < 5) churnProb = 0.7;

  return { ltv_tier: tier, churn_risk: { probability: churnProb } };
}

describe('Loyalty Intelligence', () => {
  it('should identify VIP customers', () => {
    const result = calculateLoyaltyProfile({
      purchaseHistory: { totalSpend: 150000, orderCount: 100 },
      engagementHistory: { logins: 200 }
    });

    expect(result.ltv_tier).toBe('vip');
    expect(result.churn_risk.probability).toBe(0.1);
  });

  it('should identify churn risk', () => {
    const result = calculateLoyaltyProfile({
      purchaseHistory: { totalSpend: 2000, orderCount: 2 },
      engagementHistory: { logins: 2 }
    });

    expect(result.churn_risk.probability).toBe(0.7);
  });
});
