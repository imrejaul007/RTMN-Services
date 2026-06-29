/**
 * Creator Economy Service
 *
 * Partner ecosystem with revenue sharing.
 */

import { v4 as uuidv4 } from 'uuid';
import { Partner, RevenueShare, Certification, PartnerReferral, PartnerType } from './types';

// ============================================
// In-Memory Stores
// ============================================

const partners = new Map<string, Partner>();
const revenueShares = new Map<string, RevenueShare>();
const certifications = new Map<string, Certification>();
const referrals = new Map<string, PartnerReferral>();

// ============================================
// Revenue Share Config
// ============================================

const REVENUE_SHARE_CONFIG: Record<string, { share: number; description: string }> = {
  company_creation: { share: 20, description: '20% of first year subscription' },
  subscription: { share: 10, description: '10% recurring monthly' },
  transaction: { share: 2, description: '2% per transaction' },
  referral: { share: 500, description: '₹500 per referral' },
};

// ============================================
// Partner Tiers
// ============================================

const PARTNER_TIERS = {
  bronze: { minEarnings: 0, benefits: ['Basic support', '10% revenue share'] },
  silver: { minEarnings: 50000, benefits: ['Priority support', '15% revenue share', 'Training access'] },
  gold: { minEarnings: 200000, benefits: ['Dedicated support', '20% revenue share', 'Early access', 'Co-marketing'] },
  platinum: { minEarnings: 1000000, benefits: ['Executive support', '25% revenue share', 'Early access', 'Joint ventures'] },
};

// ============================================
// Creator Economy Service
// ============================================

export class CreatorEconomy {
  /**
   * Register a partner
   */
  registerPartner(params: {
    name: string;
    type: PartnerType;
    email: string;
    phone?: string;
    companyId?: string;
  }): Partner {
    const partner: Partner = {
      id: `partner_${uuidv4().slice(0, 8)}`,
      name: params.name,
      type: params.type,
      email: params.email,
      phone: params.phone,
      companyId: params.companyId,
      status: 'pending',
      tier: 'bronze',
      revenueShare: 10, // Default
      totalEarnings: 0,
      createdAt: new Date().toISOString(),
    };

    partners.set(partner.id, partner);
    return partner;
  }

  /**
   * Activate partner
   */
  activatePartner(partnerId: string): Partner | null {
    const partner = partners.get(partnerId);
    if (!partner) return null;
    partner.status = 'active';
    return partner;
  }

  /**
   * Get partner
   */
  getPartner(partnerId: string): Partner | null {
    return partners.get(partnerId) || null;
  }

  /**
   * List partners
   */
  listPartners(filter?: { type?: PartnerType; status?: string }): Partner[] {
    let list = Array.from(partners.values());

    if (filter?.type) list = list.filter(p => p.type === filter.type);
    if (filter?.status) list = list.filter(p => p.status === filter.status);

    return list.sort((a, b) => b.totalEarnings - a.totalEarnings);
  }

  /**
   * Record revenue share
   */
  recordRevenueShare(params: {
    partnerId: string;
    source: RevenueShare['source'];
    amount: number;
    companyId?: string;
    transactionId?: string;
  }): RevenueShare {
    const config = REVENUE_SHARE_CONFIG[params.source];
    const shareAmount = (params.amount * config.share) / 100;

    const revenueShare: RevenueShare = {
      id: `rev_${uuidv4().slice(0, 8)}`,
      partnerId: params.partnerId,
      source: params.source,
      amount: params.amount,
      companyId: params.companyId,
      transactionId: params.transactionId,
      sharePercentage: config.share,
      shareAmount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    revenueShares.set(revenueShare.id, revenueShare);

    // Update partner earnings
    const partner = partners.get(params.partnerId);
    if (partner) {
      partner.totalEarnings += shareAmount;
      this.updatePartnerTier(partner);
    }

    return revenueShare;
  }

  /**
   * Pay out revenue share
   */
  payRevenueShare(revenueShareId: string): RevenueShare | null {
    const revenueShare = revenueShares.get(revenueShareId);
    if (!revenueShare) return null;

    revenueShare.status = 'paid';
    return revenueShare;
  }

  /**
   * Get partner earnings
   */
  getPartnerEarnings(partnerId: string): {
    total: number;
    pending: number;
    paid: number;
    history: RevenueShare[];
  } {
    const partner = partners.get(partnerId);
    if (!partner) return { total: 0, pending: 0, paid: 0, history: [] };

    const history = Array.from(revenueShares.values())
      .filter(r => r.partnerId === partnerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      total: partner.totalEarnings,
      pending: history.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.shareAmount, 0),
      paid: history.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.shareAmount, 0),
      history,
    };
  }

  /**
   * Update partner tier based on earnings
   */
  private updatePartnerTier(partner: Partner): void {
    const earnings = partner.totalEarnings;

    if (earnings >= PARTNER_TIERS.platinum.minEarnings) {
      partner.tier = 'platinum';
      partner.revenueShare = 25;
    } else if (earnings >= PARTNER_TIERS.gold.minEarnings) {
      partner.tier = 'gold';
      partner.revenueShare = 20;
    } else if (earnings >= PARTNER_TIERS.silver.minEarnings) {
      partner.tier = 'silver';
      partner.revenueShare = 15;
    } else {
      partner.tier = 'bronze';
      partner.revenueShare = 10;
    }
  }

  /**
   * Issue certification
   */
  issueCertification(params: {
    partnerId: string;
    type: Certification['type'];
    name: string;
    score: number;
  }): Certification {
    const cert: Certification = {
      id: `cert_${uuidv4().slice(0, 8)}`,
      partnerId: params.partnerId,
      type: params.type,
      name: params.name,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      status: 'active',
      score: params.score,
    };

    certifications.set(cert.id, cert);
    return cert;
  }

  /**
   * Get partner certifications
   */
  getPartnerCertifications(partnerId: string): Certification[] {
    return Array.from(certifications.values())
      .filter(c => c.partnerId === partnerId);
  }

  /**
   * Create referral
   */
  createReferral(referrerId: string, refereeId: string): PartnerReferral {
    const referral: PartnerReferral = {
      id: `ref_${uuidv4().slice(0, 8)}`,
      referrerId,
      refereeId,
      reward: 500,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    referrals.set(referral.id, referral);

    // Record reward for referrer
    this.recordRevenueShare({
      partnerId: referrerId,
      source: 'referral',
      amount: 500,
    });

    return referral;
  }

  /**
   * Get referral stats
   */
  getReferralStats(partnerId: string): {
    totalReferrals: number;
    completedReferrals: number;
    totalRewards: number;
  } {
    const partnerReferrals = Array.from(referrals.values())
      .filter(r => r.referrerId === partnerId);

    return {
      totalReferrals: partnerReferrals.length,
      completedReferrals: partnerReferrals.filter(r => r.status === 'completed').length,
      totalRewards: partnerReferrals
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + r.reward, 0),
    };
  }

  /**
   * Get partner benefits
   */
  getPartnerBenefits(partnerId: string): string[] {
    const partner = partners.get(partnerId);
    if (!partner) return [];

    const tier = PARTNER_TIERS[partner.tier];
    return tier.benefits;
  }
}

export const creatorEconomy = new CreatorEconomy();