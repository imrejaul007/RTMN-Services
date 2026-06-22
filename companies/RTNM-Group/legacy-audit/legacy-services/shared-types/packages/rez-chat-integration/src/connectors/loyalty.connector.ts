// ── Loyalty Connector ──────────────────────────────────────────────────────────────
// Connects to karma/loyalty services

import axios, { AxiosInstance } from 'axios';

export interface LoyaltyProfile {
  userId: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  lifetimePoints: number;
  memberSince: string;
  benefits: string[];
  nextTier: {
    name: string;
    pointsRequired: number;
    pointsRemaining: number;
  } | null;
}

export interface ExpiringReward {
  id: string;
  type: 'discount' | 'cashback' | 'free_delivery' | 'buy_x_get_y';
  title: string;
  description: string;
  value: number;
  expiresAt: string;
  daysUntilExpiry: number;
  minOrderValue?: number;
  merchantId?: string;
  merchantName?: string;
}

export interface TierBenefit {
  tier: string;
  title: string;
  benefits: string[];
  perks: Array<{
    name: string;
    description: string;
    icon: string;
  }>;
}

export class LoyaltyConnector {
  private client: AxiosInstance;

  constructor(config?: { baseUrl?: string; apiKey?: string }) {
    const baseURL = config?.baseUrl || process.env.LOYALTY_SERVICE_URL || process.env.KARMA_SERVICE_URL || 'https://rez-karma-loyalty.onrender.com';
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(config?.apiKey && { 'x-api-key': config.apiKey }),
      },
    });
  }

  /**
   * Get loyalty profile
   */
  async getProfile(userId: string): Promise<LoyaltyProfile | null> {
    try {
      const response = await this.client.get('/v1/karma/profile', {
        params: { userId },
      });

      const data = response.data;

      return {
        userId,
        tier: data.tier || 'bronze',
        points: data.points || data.karma || 0,
        lifetimePoints: data.lifetimePoints || data.totalPoints || 0,
        memberSince: data.memberSince || data.createdAt,
        benefits: data.benefits || this.getTierBenefits(data.tier || 'bronze'),
        nextTier: data.nextTier ? {
          name: data.nextTier.name,
          pointsRequired: data.nextTier.pointsRequired,
          pointsRemaining: data.nextTier.pointsRemaining,
        } : this.calculateNextTier(data.tier || 'bronze', data.points || 0),
      };
    } catch (error: any) {
      console.error('[LoyaltyConnector] Get profile error:', error.message);
      return {
        userId,
        tier: 'bronze',
        points: 0,
        lifetimePoints: 0,
        memberSince: new Date().toISOString(),
        benefits: this.getTierBenefits('bronze'),
        nextTier: {
          name: 'Silver',
          pointsRequired: 1000,
          pointsRemaining: 1000,
        },
      };
    }
  }

  /**
   * Get expiring rewards
   */
  async getExpiringRewards(userId: string, daysAhead?: number): Promise<ExpiringReward[]> {
    try {
      const response = await this.client.get('/v1/karma/rewards', {
        params: { userId, days: daysAhead || 7 },
      });

      const rewards = response.data.rewards || response.data || [];

      return rewards.map((r: any) => ({
        id: r.id || r._id,
        type: r.type || 'discount',
        title: r.title || r.name || 'Reward',
        description: r.description || '',
        value: r.value || r.discount || 0,
        expiresAt: r.expiresAt || r.expiryDate,
        daysUntilExpiry: r.daysUntilExpiry || this.calculateDaysUntil(r.expiresAt),
        minOrderValue: r.minOrderValue,
        merchantId: r.merchantId,
        merchantName: r.merchantName,
      }));
    } catch (error: any) {
      console.error('[LoyaltyConnector] Get rewards error:', error.message);
      return [];
    }
  }

  /**
   * Get tier benefits
   */
  async getTierBenefits(tier: string): Promise<TierBenefit> {
    const benefits: Record<string, TierBenefit> = {
      bronze: {
        tier: 'bronze',
        title: 'Bronze Member',
        benefits: ['Earn 1 point per ₹10 spent', 'Birthday reward', 'Exclusive deals'],
        perks: [
          { name: 'Points Earning', description: 'Earn 1 point per ₹10', icon: '⭐' },
          { name: 'Birthday Reward', description: 'Special offer on your birthday', icon: '🎂' },
          { name: 'Member Deals', description: 'Access to Bronze tier deals', icon: '🏷️' },
        ],
      },
      silver: {
        tier: 'silver',
        title: 'Silver Member',
        benefits: ['Earn 1.5 points per ₹10', 'Priority support', 'Early access to sales'],
        perks: [
          { name: 'Enhanced Earning', description: 'Earn 1.5 points per ₹10', icon: '⭐' },
          { name: 'Priority Support', description: 'Faster response times', icon: '🎧' },
          { name: 'Early Access', description: 'Shop sales before others', icon: '⏰' },
        ],
      },
      gold: {
        tier: 'gold',
        title: 'Gold Member',
        benefits: ['Earn 2 points per ₹10', 'Free delivery', 'Exclusive events'],
        perks: [
          { name: 'Premium Earning', description: 'Earn 2 points per ₹10', icon: '⭐' },
          { name: 'Free Delivery', description: 'On all orders above ₹299', icon: '🚚' },
          { name: 'Gold Events', description: 'Invites to exclusive events', icon: '🎉' },
        ],
      },
      platinum: {
        tier: 'platinum',
        title: 'Platinum Member',
        benefits: ['Earn 3 points per ₹10', 'Personal concierge', 'Highest cashback'],
        perks: [
          { name: 'Maximum Earning', description: 'Earn 3 points per ₹10', icon: '💎' },
          { name: 'Concierge', description: 'Personal assistance 24/7', icon: '👤' },
          { name: 'Platinum Deals', description: 'Exclusive platinum-only offers', icon: '🏆' },
        ],
      },
    };

    return benefits[tier] || benefits.bronze;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private calculateNextTier(currentTier: string, points: number): {
    name: string;
    pointsRequired: number;
    pointsRemaining: number;
  } | null {
    const tierThresholds: Record<string, { next: string; threshold: number }> = {
      bronze: { next: 'Silver', threshold: 1000 },
      silver: { next: 'Gold', threshold: 5000 },
      gold: { next: 'Platinum', threshold: 20000 },
      platinum: { next: '', threshold: 0 },
    };

    const next = tierThresholds[currentTier];
    if (!next.next) return null;

    return {
      name: next.next,
      pointsRequired: next.threshold,
      pointsRemaining: Math.max(0, next.threshold - points),
    };
  }

  private calculateDaysUntil(dateStr: string): number {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  private getTierBenefits(tier: string): string[] {
    const benefitMap: Record<string, string[]> = {
      bronze: ['Earn 1 point per ₹10 spent', 'Birthday reward', 'Member deals'],
      silver: ['Earn 1.5 points per ₹10', 'Priority support', 'Early access'],
      gold: ['Earn 2 points per ₹10', 'Free delivery', 'Exclusive events'],
      platinum: ['Earn 3 points per ₹10', 'Personal concierge', 'Highest cashback'],
    };
    return benefitMap[tier] || benefitMap.bronze;
  }
}
