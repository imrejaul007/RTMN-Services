/**
 * Creator Economy Tests
 */

import { describe, it, expect } from 'vitest';
import { creatorEconomy } from '../creator-economy';

describe('CreatorEconomy', () => {
  it('should register partner', () => {
    const partner = creatorEconomy.registerPartner({
      name: 'Test Partner',
      type: 'developer',
      email: 'test@example.com',
    });
    expect(partner.id).toBeDefined();
    expect(partner.tier).toBe('bronze');
  });

  it('should activate partner', () => {
    const partner = creatorEconomy.activatePartner('partner_test');
    expect(partner?.status).toBe('active');
  });

  it('should record revenue share', () => {
    const share = creatorEconomy.recordRevenueShare({
      partnerId: 'partner_test',
      source: 'company_creation',
      amount: 100000,
      companyId: 'company_created',
    });
    expect(share.sharePercentage).toBe(20);
  });

  it('should issue certification', () => {
    const cert = creatorEconomy.issueCertification({
      partnerId: 'partner_test',
      type: 'developer',
      name: 'Full Stack Developer',
      score: 95,
    });
    expect(cert.score).toBe(95);
  });

  it('should create referral', () => {
    const ref = creatorEconomy.createReferral('partner_a', 'partner_b');
    expect(ref.reward).toBe(500);
  });
});
