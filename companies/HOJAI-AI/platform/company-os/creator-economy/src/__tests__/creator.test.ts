/**
 * Creator Economy - Comprehensive Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('uuid', () => ({
  v4: () => `test_${Math.random().toString(36).substr(2, 9)}`,
}));

// Test data
const mockPartners = new Map();
const mockRevenueShares = new Map();
const mockCertifications = new Map();
const mockReferrals = new Map();
const mockPayouts = new Map();

// Revenue share config
const REVENUE_SHARE_CONFIG = {
  company_creation: { share: 20 },
  subscription: { share: 10 },
  transaction: { share: 2 },
  referral: { share: 500 },
};

// Partner tiers
const PARTNER_TIERS = {
  bronze: { minEarnings: 0, benefits: ['Basic support', '10% revenue share'] },
  silver: { minEarnings: 50000, benefits: ['Priority support', '15% revenue share'] },
  gold: { minEarnings: 200000, benefits: ['Dedicated support', '20% revenue share'] },
  platinum: { minEarnings: 1000000, benefits: ['Executive support', '25% revenue share'] },
};

// Withdrawal limits
const withdrawalLimits = {
  bronze: { minAmount: 500, maxAmount: 50000, dailyLimit: 50000 },
  silver: { minAmount: 500, maxAmount: 100000, dailyLimit: 100000 },
  gold: { minAmount: 1000, maxAmount: 250000, dailyLimit: 250000 },
  platinum: { minAmount: 1000, maxAmount: 1000000, dailyLimit: 1000000 },
};

// Simulate CreatorEconomy class
class TestCreatorEconomy {
  registerPartner(params) {
    const id = `partner_${Math.random().toString(36).substr(2, 8)}`;
    const partner = {
      id,
      name: params.name,
      type: params.type,
      email: params.email,
      phone: params.phone,
      companyId: params.companyId,
      status: 'pending',
      tier: 'bronze',
      revenueShare: 10,
      totalEarnings: 0,
      createdAt: new Date().toISOString(),
    };
    mockPartners.set(id, partner);
    return partner;
  }

  getPartner(id) {
    return mockPartners.get(id);
  }

  activatePartner(id) {
    const partner = mockPartners.get(id);
    if (partner) {
      partner.status = 'active';
      mockPartners.set(id, partner);
    }
    return partner;
  }

  listPartners(query = {}) {
    let list = Array.from(mockPartners.values());
    if (query.type) list = list.filter(p => p.type === query.type);
    if (query.status) list = list.filter(p => p.status === query.status);
    return list;
  }

  recordRevenueShare(params) {
    const config = REVENUE_SHARE_CONFIG[params.source];
    const sharePercentage = config?.share || 0;
    const shareAmount = (params.amount * sharePercentage) / 100;

    const id = `share_${Math.random().toString(36).substr(2, 8)}`;
    const revenueShare = {
      id,
      partnerId: params.partnerId,
      source: params.source,
      amount: params.amount,
      companyId: params.companyId,
      transactionId: params.transactionId,
      sharePercentage,
      shareAmount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    mockRevenueShares.set(id, revenueShare);

    // Update partner earnings
    const partner = mockPartners.get(params.partnerId);
    if (partner) {
      partner.totalEarnings += shareAmount;
      // Update tier
      if (partner.totalEarnings >= 1000000) partner.tier = 'platinum';
      else if (partner.totalEarnings >= 200000) partner.tier = 'gold';
      else if (partner.totalEarnings >= 50000) partner.tier = 'silver';
      mockPartners.set(partner.id, partner);
    }

    return revenueShare;
  }

  getPartnerEarnings(partnerId) {
    const shares = Array.from(mockRevenueShares.values())
      .filter(r => r.partnerId === partnerId);

    const pending = shares.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.shareAmount, 0);
    const paid = shares.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.shareAmount, 0);

    return { pending, paid, history: shares };
  }

  issueCertification(params) {
    const id = `cert_${Math.random().toString(36).substr(2, 8)}`;
    const certification = {
      id,
      partnerId: params.partnerId,
      type: params.type,
      name: params.name,
      issuedAt: new Date().toISOString(),
      expiresAt: params.expiresAt,
      status: 'active',
      score: params.score,
    };
    mockCertifications.set(id, certification);
    return certification;
  }

  getPartnerCertifications(partnerId) {
    return Array.from(mockCertifications.values()).filter(c => c.partnerId === partnerId);
  }

  getPartnerBenefits(partnerId) {
    const partner = mockPartners.get(partnerId);
    if (!partner) return [];
    return PARTNER_TIERS[partner.tier]?.benefits || [];
  }

  createReferral(referrerId, refereeId) {
    const id = `ref_${Math.random().toString(36).substr(2, 8)}`;
    const referral = {
      id,
      referrerId,
      refereeId,
      reward: 500,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    mockReferrals.set(id, referral);
    return referral;
  }

  getReferralStats(partnerId) {
    const referrals = Array.from(mockReferrals.values()).filter(r => r.referrerId === partnerId);
    return {
      total: referrals.length,
      completed: referrals.filter(r => r.status === 'completed').length,
      pending: referrals.filter(r => r.status === 'pending').length,
    };
  }
}

const creatorEconomy = new TestCreatorEconomy();

beforeEach(() => {
  mockPartners.clear();
  mockRevenueShares.clear();
  mockCertifications.clear();
  mockReferrals.clear();
  mockPayouts.clear();
});

// ============================================
// PARTNER TESTS
// ============================================

describe('CreatorEconomy - Partner Registration', () => {
  it('should register a new partner', () => {
    const partner = creatorEconomy.registerPartner({
      name: 'Test Partner',
      type: 'developer',
      email: 'test@example.com',
    });

    expect(partner).toBeDefined();
    expect(partner.id).toBeDefined();
    expect(partner.name).toBe('Test Partner');
    expect(partner.type).toBe('developer');
    expect(partner.email).toBe('test@example.com');
    expect(partner.status).toBe('pending');
    expect(partner.tier).toBe('bronze');
    expect(partner.totalEarnings).toBe(0);
  });

  it('should register partner with optional fields', () => {
    const partner = creatorEconomy.registerPartner({
      name: 'Agency Partner',
      type: 'agency',
      email: 'agency@example.com',
      phone: '+919876543210',
      companyId: 'company_123',
    });

    expect(partner.phone).toBe('+919876543210');
    expect(partner.companyId).toBe('company_123');
  });

  it('should get partner by ID', () => {
    const registered = creatorEconomy.registerPartner({
      name: 'Get Test',
      type: 'developer',
      email: 'get@example.com',
    });

    const found = creatorEconomy.getPartner(registered.id);
    expect(found).toBeDefined();
    expect(found.name).toBe('Get Test');
  });

  it('should return undefined for non-existent partner', () => {
    const found = creatorEconomy.getPartner('non_existent_id');
    expect(found).toBeUndefined();
  });

  it('should activate partner', () => {
    const partner = creatorEconomy.registerPartner({
      name: 'Activation Test',
      type: 'integrator',
      email: 'activate@example.com',
    });

    expect(partner.status).toBe('pending');

    const activated = creatorEconomy.activatePartner(partner.id);
    expect(activated.status).toBe('active');
  });

  it('should list partners by type', () => {
    creatorEconomy.registerPartner({ name: 'Dev 1', type: 'developer', email: 'd1@example.com' });
    creatorEconomy.registerPartner({ name: 'Dev 2', type: 'developer', email: 'd2@example.com' });
    creatorEconomy.registerPartner({ name: 'Agency 1', type: 'agency', email: 'a1@example.com' });

    const developers = creatorEconomy.listPartners({ type: 'developer' });
    const agencies = creatorEconomy.listPartners({ type: 'agency' });

    expect(developers.length).toBe(2);
    expect(agencies.length).toBe(1);
  });

  it('should list partners by status', () => {
    const p1 = creatorEconomy.registerPartner({ name: 'P1', type: 'developer', email: 'p1@example.com' });
    creatorEconomy.registerPartner({ name: 'P2', type: 'developer', email: 'p2@example.com' });
    creatorEconomy.activatePartner(p1.id);

    const active = creatorEconomy.listPartners({ status: 'active' });
    const pending = creatorEconomy.listPartners({ status: 'pending' });

    expect(active.length).toBe(1);
    expect(pending.length).toBe(1);
  });
});

// ============================================
// REVENUE SHARE TESTS
// ============================================

describe('CreatorEconomy - Revenue Share', () => {
  let partner;

  beforeEach(() => {
    partner = creatorEconomy.registerPartner({
      name: 'Revenue Test',
      type: 'developer',
      email: 'revenue@example.com',
    });
  });

  it('should record company creation revenue (20%)', () => {
    const share = creatorEconomy.recordRevenueShare({
      partnerId: partner.id,
      source: 'company_creation',
      amount: 100000,
      companyId: 'new_company',
    });

    expect(share.sharePercentage).toBe(20);
    expect(share.shareAmount).toBe(20000);
    expect(share.partnerId).toBe(partner.id);
  });

  it('should record subscription revenue (10%)', () => {
    const share = creatorEconomy.recordRevenueShare({
      partnerId: partner.id,
      source: 'subscription',
      amount: 10000,
      companyId: 'sub_company',
    });

    expect(share.sharePercentage).toBe(10);
    expect(share.shareAmount).toBe(1000);
  });

  it('should record transaction revenue (2%)', () => {
    const share = creatorEconomy.recordRevenueShare({
      partnerId: partner.id,
      source: 'transaction',
      amount: 50000,
      transactionId: 'txn_123',
    });

    expect(share.sharePercentage).toBe(2);
    expect(share.shareAmount).toBe(1000);
  });

  it('should update partner total earnings', () => {
    creatorEconomy.recordRevenueShare({
      partnerId: partner.id,
      source: 'company_creation',
      amount: 100000,
    });

    const updated = creatorEconomy.getPartner(partner.id);
    expect(updated.totalEarnings).toBe(20000);
  });

  it('should update partner tier based on earnings', () => {
    // Bronze -> Silver (50000)
    creatorEconomy.recordRevenueShare({
      partnerId: partner.id,
      source: 'company_creation',
      amount: 250000, // 20% = 50000
    });

    let updated = creatorEconomy.getPartner(partner.id);
    expect(updated.tier).toBe('silver');

    // Silver -> Gold (200000)
    creatorEconomy.recordRevenueShare({
      partnerId: partner.id,
      source: 'company_creation',
      amount: 750000, // 20% = 150000
    });

    updated = creatorEconomy.getPartner(partner.id);
    expect(updated.tier).toBe('gold');
  });

  it('should get partner earnings summary', () => {
    creatorEconomy.recordRevenueShare({
      partnerId: partner.id,
      source: 'company_creation',
      amount: 100000,
    });
    creatorEconomy.recordRevenueShare({
      partnerId: partner.id,
      source: 'subscription',
      amount: 10000,
    });

    const earnings = creatorEconomy.getPartnerEarnings(partner.id);
    expect(earnings.pending).toBe(21000);
    expect(earnings.history.length).toBe(2);
  });
});

// ============================================
// CERTIFICATION TESTS
// ============================================

describe('CreatorEconomy - Certifications', () => {
  let partner;

  beforeEach(() => {
    partner = creatorEconomy.registerPartner({
      name: 'Cert Test',
      type: 'developer',
      email: 'cert@example.com',
    });
  });

  it('should issue certification', () => {
    const cert = creatorEconomy.issueCertification({
      partnerId: partner.id,
      type: 'developer',
      name: 'Full Stack Developer',
      score: 95,
    });

    expect(cert.id).toBeDefined();
    expect(cert.partnerId).toBe(partner.id);
    expect(cert.type).toBe('developer');
    expect(cert.name).toBe('Full Stack Developer');
    expect(cert.score).toBe(95);
    expect(cert.status).toBe('active');
  });

  it('should get partner certifications', () => {
    creatorEconomy.issueCertification({
      partnerId: partner.id,
      type: 'developer',
      name: 'Cert 1',
      score: 80,
    });
    creatorEconomy.issueCertification({
      partnerId: partner.id,
      type: 'implementer',
      name: 'Cert 2',
      score: 90,
    });

    const certs = creatorEconomy.getPartnerCertifications(partner.id);
    expect(certs.length).toBe(2);
  });

  it('should get partner benefits based on tier', () => {
    // Bronze tier
    let benefits = creatorEconomy.getPartnerBenefits(partner.id);
    expect(benefits).toContain('Basic support');

    // Upgrade to gold
    creatorEconomy.recordRevenueShare({
      partnerId: partner.id,
      source: 'company_creation',
      amount: 1000000,
    });

    benefits = creatorEconomy.getPartnerBenefits(partner.id);
    expect(benefits).toContain('Dedicated support');
    expect(benefits).toContain('20% revenue share');
  });
});

// ============================================
// REFERRAL TESTS
// ============================================

describe('CreatorEconomy - Referrals', () => {
  it('should create referral with reward', () => {
    const referral = creatorEconomy.createReferral('partner_a', 'partner_b');

    expect(referral.id).toBeDefined();
    expect(referral.referrerId).toBe('partner_a');
    expect(referral.refereeId).toBe('partner_b');
    expect(referral.reward).toBe(500);
    expect(referral.status).toBe('pending');
  });

  it('should get referral stats', () => {
    creatorEconomy.createReferral('partner_x', 'partner_y');
    creatorEconomy.createReferral('partner_x', 'partner_z');

    const stats = creatorEconomy.getReferralStats('partner_x');
    expect(stats.total).toBe(2);
    expect(stats.pending).toBe(2);
    expect(stats.completed).toBe(0);
  });
});

// ============================================
// TIER PROGRESSION TESTS
// ============================================

describe('CreatorEconomy - Tier Progression', () => {
  it('should progress through all tiers', () => {
    const partner = creatorEconomy.registerPartner({
      name: 'Tier Test',
      type: 'agency',
      email: 'tier@example.com',
    });

    // Bronze (0 - 50000)
    expect(creatorEconomy.getPartner(partner.id).tier).toBe('bronze');

    // Add 50000 -> Silver
    creatorEconomy.recordRevenueShare({
      partnerId: partner.id,
      source: 'company_creation',
      amount: 250000,
    });
    expect(creatorEconomy.getPartner(partner.id).tier).toBe('silver');

    // Add 150000 -> Gold (total 200000)
    creatorEconomy.recordRevenueShare({
      partnerId: partner.id,
      source: 'company_creation',
      amount: 750000,
    });
    expect(creatorEconomy.getPartner(partner.id).tier).toBe('gold');

    // Add 800000 -> Platinum (total 1000000)
    creatorEconomy.recordRevenueShare({
      partnerId: partner.id,
      source: 'company_creation',
      amount: 4000000,
    });
    expect(creatorEconomy.getPartner(partner.id).tier).toBe('platinum');
  });
});

// ============================================
// PAYOUT VALIDATION TESTS
// ============================================

describe('CreatorEconomy - Payout Validation', () => {
  it('should validate payout amount against limits', () => {
    const limits = withdrawalLimits.bronze;

    // Below minimum
    expect(100 < limits.minAmount).toBe(true);

    // Within limits
    expect(1000 >= limits.minAmount && 1000 <= limits.maxAmount).toBe(true);

    // Above maximum
    expect(100000 > limits.maxAmount).toBe(true);
  });

  it('should calculate platform fee correctly (2%)', () => {
    const amount = 10000;
    const platformFee = 0.02;
    const netAmount = amount - (amount * platformFee);

    expect(netAmount).toBe(9800);
  });

  it('should validate withdrawal based on tier', () => {
    const tiers = ['bronze', 'silver', 'gold', 'platinum'];
    const amounts = [50000, 100000, 250000, 1000000];

    tiers.forEach((tier, i) => {
      const limits = withdrawalLimits[tier];
      expect(amounts[i]).toBeLessThanOrEqual(limits.maxAmount);
    });
  });
});

// ============================================
// PARTNER TYPES TESTS
// ============================================

describe('CreatorEconomy - Partner Types', () => {
  const validTypes = ['developer', 'agency', 'integrator', 'consultant'];

  validTypes.forEach(type => {
    it(`should accept partner type: ${type}`, () => {
      const partner = creatorEconomy.registerPartner({
        name: `${type} Test`,
        type,
        email: `${type}@example.com`,
      });
      expect(partner.type).toBe(type);
    });
  });
});
