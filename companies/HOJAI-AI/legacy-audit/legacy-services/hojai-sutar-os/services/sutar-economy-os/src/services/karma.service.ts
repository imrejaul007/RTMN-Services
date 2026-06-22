/**
 * SUTAR Economy OS - Karma Service
 * Layer 10: Karma points tier-based system
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  KarmaTier,
  KarmaAction,
  IKarma,
  IKarmaHistory,
  IKarmaTierInfo,
  EarnKarmaRequest,
  SpendKarmaRequest,
  KarmaBalanceResponse
} from '../types/index.js';

// ============================================
// Tier Configuration
// ============================================

export const KARMA_TIERS: Record<KarmaTier, IKarmaTierInfo> = {
  bronze: {
    tier: 'bronze',
    name: 'Bronze',
    minPoints: 0,
    maxPoints: 999,
    benefits: [
      'Basic access to platform features',
      'Standard transaction limits',
      'Community support access',
      '5% bonus on earnings'
    ],
    multiplier: 1.0
  },
  silver: {
    tier: 'silver',
    name: 'Silver',
    minPoints: 1000,
    maxPoints: 4999,
    benefits: [
      'Enhanced transaction limits',
      'Priority email support',
      '10% bonus on earnings',
      'Access to silver-only promotions',
      'Monthly performance reports'
    ],
    multiplier: 1.1
  },
  gold: {
    tier: 'gold',
    name: 'Gold',
    minPoints: 5000,
    maxPoints: 19999,
    benefits: [
      'Higher transaction limits',
      'Priority support with faster response',
      '15% bonus on earnings',
      'Access to gold-only promotions',
      'Weekly performance reports',
      'Featured in community highlights',
      'Early access to new features'
    ],
    multiplier: 1.25
  },
  platinum: {
    tier: 'platinum',
    name: 'Platinum',
    minPoints: 20000,
    maxPoints: 49999,
    benefits: [
      'Significantly higher transaction limits',
      'Dedicated support agent',
      '20% bonus on earnings',
      'Exclusive platinum promotions',
      'Daily performance reports',
      'Featured placement in leaderboards',
      'Beta feature access',
      'Premium analytics dashboard',
      'Custom notification preferences'
    ],
    multiplier: 1.5
  },
  diamond: {
    tier: 'diamond',
    name: 'Diamond',
    minPoints: 50000,
    maxPoints: null,
    benefits: [
      'Unlimited transaction limits',
      '24/7 concierge support',
      '25% bonus on earnings',
      'VIP-only promotions and events',
      'Real-time performance dashboard',
      'Top placement in all leaderboards',
      'Exclusive beta access',
      'Custom integration support',
      'Personal account manager',
      'White-glove onboarding service',
      'Revenue sharing opportunities'
    ],
    multiplier: 2.0
  }
};

// ============================================
// Karma Point Configuration
// ============================================

export const KARMA_POINT_CONFIG: Record<KarmaAction, { basePoints: number; description: string }> = {
  contract_signed: { basePoints: 500, description: 'Points earned for signing a contract' },
  negotiation_completed: { basePoints: 200, description: 'Points earned for completing a negotiation' },
  decision_made: { basePoints: 50, description: 'Points earned for making a decision' },
  referral: { basePoints: 300, description: 'Points earned for referring a new user' },
  contribution: { basePoints: 100, description: 'Points earned for platform contribution' },
  milestone: { basePoints: 250, description: 'Points earned for reaching a milestone' },
  streak: { basePoints: 25, description: 'Points earned for daily activity streak' },
  bonus: { basePoints: 1000, description: 'Bonus points for exceptional performance' },
  penalty: { basePoints: -100, description: 'Points deducted for violations' },
  refund: { basePoints: -50, description: 'Points adjusted for refunds' }
};

// ============================================
// In-Memory Storage (replace with MongoDB)
// ============================================

interface KarmaStore {
  [entityId: string]: IKarma;
}

interface KarmaHistoryStore {
  [historyId: string]: IKarmaHistory;
}

const karmaStore: KarmaStore = {};
const karmaHistoryStore: KarmaHistoryStore = {};

// ============================================
// Tier Calculation
// ============================================

export function calculateTier(points: number): KarmaTier {
  if (points >= 50000) return 'diamond';
  if (points >= 20000) return 'platinum';
  if (points >= 5000) return 'gold';
  if (points >= 1000) return 'silver';
  return 'bronze';
}

export function getTierInfo(tier: KarmaTier): IKarmaTierInfo {
  return KARMA_TIERS[tier];
}

export function getTierProgress(points: number): { currentTier: KarmaTier; nextTier: KarmaTier | null; pointsToNextTier: number | null; progressPercent: number } {
  const currentTier = calculateTier(points);
  const tierInfo = KARMA_TIERS[currentTier];

  if (currentTier === 'diamond') {
    return {
      currentTier,
      nextTier: null,
      pointsToNextTier: null,
      progressPercent: 100
    };
  }

  const tierOrder: KarmaTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
  const currentIndex = tierOrder.indexOf(currentTier);
  const nextTier = tierOrder[currentIndex + 1];
  const nextTierInfo = KARMA_TIERS[nextTier];
  const pointsToNextTier = nextTierInfo.minPoints - points;
  const tierRange = (tierInfo.maxPoints ?? 0) - tierInfo.minPoints;
  const pointsInTier = points - tierInfo.minPoints;
  const progressPercent = Math.min(100, Math.round((pointsInTier / tierRange) * 100));

  return {
    currentTier,
    nextTier,
    pointsToNextTier,
    progressPercent
  };
}

// ============================================
// Karma Service Class
// ============================================

export class KarmaService {
  /**
   * Get or create karma record for an entity
   */
  async getOrCreateKarma(entityId: string, entityType: 'user' | 'business' | 'agent'): Promise<IKarma> {
    if (karmaStore[entityId]) {
      return karmaStore[entityId];
    }

    const karma: IKarma = {
      entityId,
      entityType,
      points: 0,
      tier: 'bronze',
      lifetimePoints: 0,
      spentPoints: 0,
      availablePoints: 0,
      streakDays: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    karmaStore[entityId] = karma;
    return karma;
  }

  /**
   * Get karma balance for an entity
   */
  async getKarmaBalance(entityId: string): Promise<KarmaBalanceResponse | null> {
    const karma = karmaStore[entityId];
    if (!karma) {
      return null;
    }

    const tierInfo = getTierInfo(karma.tier);
    const progress = getTierProgress(karma.points);

    return {
      entityId: karma.entityId,
      entityType: karma.entityType,
      points: karma.points,
      availablePoints: karma.availablePoints,
      tier: karma.tier,
      tierInfo: {
        ...tierInfo,
        benefits: [
          ...tierInfo.benefits,
          `Progress to ${progress.nextTier ?? 'Diamond'}: ${progress.progressPercent}%`
        ]
      },
      lifetimePoints: karma.lifetimePoints,
      streakDays: karma.streakDays,
      lastEarnedAt: karma.lastEarnedAt?.toISOString(),
      lastSpentAt: karma.lastSpentAt?.toISOString()
    };
  }

  /**
   * Get tier information for an entity
   */
  async getTierInfo(entityId: string): Promise<{ tier: KarmaTier; tierInfo: IKarmaTierInfo; progress: ReturnType<typeof getTierProgress> } | null> {
    const karma = karmaStore[entityId];
    if (!karma) {
      return null;
    }

    const tierInfo = getTierInfo(karma.tier);
    const progress = getTierProgress(karma.points);

    return {
      tier: karma.tier,
      tierInfo,
      progress
    };
  }

  /**
   * Earn karma points
   */
  async earnKarma(request: EarnKarmaRequest): Promise<IKarmaHistory> {
    const { entityId, entityType, action, points, reason, referenceId, metadata } = request;

    // Get or create karma record
    const karma = await this.getOrCreateKarma(entityId, entityType);

    // Calculate points based on action and tier
    const actionConfig = KARMA_POINT_CONFIG[action];
    const basePoints = points ?? actionConfig.basePoints;
    const tierMultiplier = KARMA_TIERS[karma.tier].multiplier;
    const earnedPoints = Math.round(basePoints * tierMultiplier);

    // Update karma record
    const pointsBefore = karma.points;
    const tierBefore = karma.tier;

    karma.points += earnedPoints;
    karma.lifetimePoints += earnedPoints;
    karma.availablePoints += earnedPoints;
    karma.lastEarnedAt = new Date();
    karma.updatedAt = new Date();

    // Update tier if necessary
    const newTier = calculateTier(karma.points);
    karma.tier = newTier;

    // Update streak
    await this.updateStreak(entityId);

    // Create history record
    const history: IKarmaHistory = {
      historyId: uuidv4(),
      entityId,
      entityType,
      action,
      points: earnedPoints,
      pointsBefore,
      pointsAfter: karma.points,
      tier: karma.tier,
      tierBefore,
      tierAfter: newTier,
      reason: reason || actionConfig.description,
      metadata,
      sourceService: 'sutar-economy-os',
      referenceId,
      createdAt: new Date()
    };

    karmaStore[entityId] = karma;
    karmaHistoryStore[history.historyId] = history;

    return history;
  }

  /**
   * Spend karma points
   */
  async spendKarma(request: SpendKarmaRequest): Promise<IKarmaHistory> {
    const { entityId, points, reason, referenceId, metadata } = request;

    const karma = karmaStore[entityId];
    if (!karma) {
      throw new Error(`Karma record not found for entity: ${entityId}`);
    }

    if (karma.availablePoints < points) {
      throw new Error(`Insufficient karma points. Available: ${karma.availablePoints}, Required: ${points}`);
    }

    const pointsBefore = karma.points;
    const availableBefore = karma.availablePoints;
    const tierBefore = karma.tier;

    // Deduct points
    karma.points -= points;
    karma.availablePoints -= points;
    karma.spentPoints += points;
    karma.lastSpentAt = new Date();
    karma.updatedAt = new Date();

    // Update tier if necessary
    const newTier = calculateTier(karma.points);
    karma.tier = newTier;

    // Create history record
    const history: IKarmaHistory = {
      historyId: uuidv4(),
      entityId,
      entityType: karma.entityType,
      action: 'penalty', // Using penalty as spending action
      points: -points,
      pointsBefore,
      pointsAfter: karma.points,
      tier: karma.tier,
      tierBefore,
      tierAfter: newTier,
      reason,
      metadata: { ...metadata, availableBefore, availableAfter: karma.availablePoints },
      sourceService: 'sutar-economy-os',
      referenceId,
      createdAt: new Date()
    };

    karmaStore[entityId] = karma;
    karmaHistoryStore[history.historyId] = history;

    return history;
  }

  /**
   * Get karma history for an entity
   */
  async getKarmaHistory(
    entityId: string,
    options: {
      page?: number;
      limit?: number;
      action?: KarmaAction;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ history: IKarmaHistory[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page = 1, limit = 20, action, startDate, endDate } = options;

    let history = Object.values(karmaHistoryStore)
      .filter(h => h.entityId === entityId)
      .filter(h => !action || h.action === action)
      .filter(h => !startDate || h.createdAt >= startDate)
      .filter(h => !endDate || h.createdAt <= endDate)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = history.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    history = history.slice(startIndex, startIndex + limit);

    return {
      history,
      total,
      page,
      limit,
      totalPages
    };
  }

  /**
   * Update daily streak
   */
  async updateStreak(entityId: string): Promise<number> {
    const karma = karmaStore[entityId];
    if (!karma) {
      return 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (karma.lastActivityDate) {
      const lastActivity = new Date(karma.lastActivityDate);
      lastActivity.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        // Consecutive day - increment streak
        karma.streakDays += 1;
      } else if (daysDiff > 1) {
        // Streak broken - reset
        karma.streakDays = 1;
      }
      // daysDiff === 0 means same day, no change
    } else {
      // First activity
      karma.streakDays = 1;
    }

    karma.lastActivityDate = new Date();
    karmaStore[entityId] = karma;

    return karma.streakDays;
  }

  /**
   * Get streak bonus multiplier
   */
  getStreakMultiplier(streakDays: number): number {
    if (streakDays >= 30) return 1.5;
    if (streakDays >= 14) return 1.25;
    if (streakDays >= 7) return 1.15;
    if (streakDays >= 3) return 1.1;
    return 1.0;
  }

  /**
   * Get all entities sorted by karma points
   */
  async getLeaderboard(limit: number = 10): Promise<Array<{ rank: number; entityId: string; entityType: string; points: number; tier: KarmaTier }>> {
    const entities = Object.values(karmaStore)
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);

    return entities.map((karma, index) => ({
      rank: index + 1,
      entityId: karma.entityId,
      entityType: karma.entityType,
      points: karma.points,
      tier: karma.tier
    }));
  }

  /**
   * Apply karma adjustment (admin function)
   */
  async adjustKarma(entityId: string, points: number, reason: string, adminId: string): Promise<IKarmaHistory> {
    const karma = karmaStore[entityId];
    if (!karma) {
      throw new Error(`Karma record not found for entity: ${entityId}`);
    }

    const pointsBefore = karma.points;
    const tierBefore = karma.tier;

    karma.points += points;
    karma.availablePoints = Math.max(0, karma.availablePoints + points);
    if (points > 0) {
      karma.lifetimePoints += points;
    }
    karma.updatedAt = new Date();

    const newTier = calculateTier(karma.points);
    karma.tier = newTier;

    const history: IKarmaHistory = {
      historyId: uuidv4(),
      entityId,
      entityType: karma.entityType,
      action: points > 0 ? 'bonus' : 'penalty',
      points,
      pointsBefore,
      pointsAfter: karma.points,
      tier: karma.tier,
      tierBefore,
      tierAfter: newTier,
      reason: `[ADMIN: ${adminId}] ${reason}`,
      metadata: { adminId, adjustment: true },
      sourceService: 'sutar-economy-os',
      createdAt: new Date()
    };

    karmaStore[entityId] = karma;
    karmaHistoryStore[history.historyId] = history;

    return history;
  }

  /**
   * Get tier statistics
   */
  async getTierStatistics(): Promise<Record<KarmaTier, { count: number; totalPoints: number; avgPoints: number }>> {
    const stats: Record<KarmaTier, { count: number; totalPoints: number; avgPoints: number }> = {
      bronze: { count: 0, totalPoints: 0, avgPoints: 0 },
      silver: { count: 0, totalPoints: 0, avgPoints: 0 },
      gold: { count: 0, totalPoints: 0, avgPoints: 0 },
      platinum: { count: 0, totalPoints: 0, avgPoints: 0 },
      diamond: { count: 0, totalPoints: 0, avgPoints: 0 }
    };

    for (const karma of Object.values(karmaStore)) {
      stats[karma.tier].count += 1;
      stats[karma.tier].totalPoints += karma.points;
    }

    for (const tier of Object.keys(stats) as KarmaTier[]) {
      if (stats[tier].count > 0) {
        stats[tier].avgPoints = Math.round(stats[tier].totalPoints / stats[tier].count);
      }
    }

    return stats;
  }

  /**
   * Calculate estimated value of karma points
   */
  calculateKarmaValue(points: number, currency: string = 'USD'): number {
    // Example conversion rate: 100 karma points = $1
    const conversionRate: Record<string, number> = {
      USD: 0.01,
      EUR: 0.009,
      GBP: 0.008,
      INR: 0.83
    };

    const rate = conversionRate[currency] || 0.01;
    return Math.round(points * rate * 100) / 100;
  }

  /**
   * Get available redemption options for karma points
   */
  getRedemptionOptions(tier: KarmaTier): Array<{ id: string; name: string; description: string; pointsRequired: number; value: number; currency: string }> {
    const baseOptions = [
      { id: 'voucher-10', name: '$10 Platform Voucher', description: 'Redeem for $10 off any transaction', pointsRequired: 1000, value: 10, currency: 'USD' },
      { id: 'voucher-25', name: '$25 Platform Voucher', description: 'Redeem for $25 off any transaction', pointsRequired: 2000, value: 25, currency: 'USD' },
      { id: 'voucher-50', name: '$50 Platform Voucher', description: 'Redeem for $50 off any transaction', pointsRequired: 4000, value: 50, currency: 'USD' },
      { id: 'priority-support', name: 'Priority Support Pass', description: '30 days of priority support access', pointsRequired: 500, value: 5, currency: 'USD' },
      { id: 'featured-listing', name: 'Featured Listing', description: '24-hour featured placement', pointsRequired: 2000, value: 20, currency: 'USD' }
    ];

    // Add tier-specific options
    const tierOptions: Record<KarmaTier, Array<{ id: string; name: string; description: string; pointsRequired: number; value: number; currency: string }>> = {
      bronze: [],
      silver: [
        { id: 'silver-badge', name: 'Silver Badge', description: 'Exclusive silver profile badge', pointsRequired: 500, value: 5, currency: 'USD' }
      ],
      gold: [
        { id: 'gold-badge', name: 'Gold Badge', description: 'Exclusive gold profile badge', pointsRequired: 1000, value: 10, currency: 'USD' },
        { id: 'early-access', name: 'Early Access Pass', description: '7-day early access to new features', pointsRequired: 1500, value: 15, currency: 'USD' }
      ],
      platinum: [
        { id: 'platinum-badge', name: 'Platinum Badge', description: 'Exclusive platinum profile badge', pointsRequired: 2000, value: 20, currency: 'USD' },
        { id: 'concierge-trial', name: 'Concierge Trial', description: '7-day concierge service trial', pointsRequired: 3000, value: 30, currency: 'USD' }
      ],
      diamond: [
        { id: 'diamond-badge', name: 'Diamond Badge', description: 'Exclusive diamond profile badge', pointsRequired: 5000, value: 50, currency: 'USD' },
        { id: 'vip-event', name: 'VIP Event Access', description: 'Invitation to exclusive VIP events', pointsRequired: 10000, value: 100, currency: 'USD' },
        { id: 'lifetime-concierge', name: 'Lifetime Concierge', description: 'Permanent concierge service access', pointsRequired: 25000, value: 250, currency: 'USD' }
      ]
    };

    return [...baseOptions, ...tierOptions[tier]];
  }
}

// Export singleton instance
export const karmaService = new KarmaService();
