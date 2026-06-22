/**
 * SUTAR Economy OS - Redemption Service
 * Layer 10: Convert karma points to rewards
 */

import { v4 as uuidv4 } from 'uuid';
import { karmaService } from './karma.service.js';
import type { KarmaTier } from '../types/index.js';

// ============================================
// Types
// ============================================

export type RedemptionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type RewardType = 'voucher' | 'feature_access' | 'badge' | 'service' | 'cash';

export interface RedemptionOption {
  optionId: string;
  name: string;
  description: string;
  type: RewardType;
  pointsCost: number;
  value: number;
  currency: string;
  tierRequired: KarmaTier;
  available: boolean;
  maxRedemptions?: number;
  currentRedemptions?: number;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface Redemption {
  redemptionId: string;
  entityId: string;
  optionId: string;
  optionName: string;
  type: RewardType;
  pointsSpent: number;
  value: number;
  currency: string;
  status: RedemptionStatus;
  voucherCode?: string;
  redeemedAt?: Date;
  expiresAt?: Date;
  usedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface RedemptionCode {
  code: string;
  redemptionId: string;
  entityId: string;
  optionName: string;
  value: number;
  currency: string;
  isUsed: boolean;
  expiresAt?: Date;
  usedAt?: Date;
  createdAt: Date;
}

// ============================================
// In-Memory Storage
// ============================================

interface RedemptionOptionStore {
  [optionId: string]: RedemptionOption;
}

interface RedemptionStore {
  [redemptionId: string]: Redemption;
}

interface RedemptionCodeStore {
  [code: string]: RedemptionCode;
}

const redemptionOptionStore: RedemptionOptionStore = {};
const redemptionStore: RedemptionStore = {};
const redemptionCodeStore: RedemptionCodeStore = {};

// ============================================
// Redemption Service Class
// ============================================

export class RedemptionService {
  constructor() {
    this.initializeDefaultOptions();
  }

  /**
   * Initialize default redemption options
   */
  private initializeDefaultOptions(): void {
    const defaultOptions: Omit<RedemptionOption, 'optionId'>[] = [
      // Vouchers
      {
        name: '$5 Platform Voucher',
        description: 'Redeem for $5 off any transaction on the platform',
        type: 'voucher',
        pointsCost: 500,
        value: 5,
        currency: 'USD',
        tierRequired: 'bronze',
        available: true
      },
      {
        name: '$10 Platform Voucher',
        description: 'Redeem for $10 off any transaction on the platform',
        type: 'voucher',
        pointsCost: 1000,
        value: 10,
        currency: 'USD',
        tierRequired: 'bronze',
        available: true
      },
      {
        name: '$25 Platform Voucher',
        description: 'Redeem for $25 off any transaction on the platform',
        type: 'voucher',
        pointsCost: 2000,
        value: 25,
        currency: 'USD',
        tierRequired: 'silver',
        available: true
      },
      {
        name: '$50 Platform Voucher',
        description: 'Redeem for $50 off any transaction on the platform',
        type: 'voucher',
        pointsCost: 4000,
        value: 50,
        currency: 'USD',
        tierRequired: 'gold',
        available: true
      },
      {
        name: '$100 Platform Voucher',
        description: 'Redeem for $100 off any transaction on the platform',
        type: 'voucher',
        pointsCost: 8000,
        value: 100,
        currency: 'USD',
        tierRequired: 'platinum',
        available: true
      },
      // Feature Access
      {
        name: 'Priority Support Pass (7 days)',
        description: 'Get priority support access for 7 days',
        type: 'feature_access',
        pointsCost: 300,
        value: 7,
        currency: 'USD',
        tierRequired: 'bronze',
        available: true
      },
      {
        name: 'Priority Support Pass (30 days)',
        description: 'Get priority support access for 30 days',
        type: 'feature_access',
        pointsCost: 1000,
        value: 20,
        currency: 'USD',
        tierRequired: 'silver',
        available: true
      },
      {
        name: 'Featured Listing (24 hours)',
        description: 'Get your listing featured for 24 hours',
        type: 'feature_access',
        pointsCost: 500,
        value: 10,
        currency: 'USD',
        tierRequired: 'bronze',
        available: true
      },
      {
        name: 'Featured Listing (7 days)',
        description: 'Get your listing featured for 7 days',
        type: 'feature_access',
        pointsCost: 2000,
        value: 35,
        currency: 'USD',
        tierRequired: 'gold',
        available: true
      },
      {
        name: 'Analytics Dashboard Access (30 days)',
        description: 'Access premium analytics dashboard for 30 days',
        type: 'feature_access',
        pointsCost: 1500,
        value: 25,
        currency: 'USD',
        tierRequired: 'silver',
        available: true
      },
      // Badges
      {
        name: 'Silver Badge',
        description: 'Exclusive silver profile badge',
        type: 'badge',
        pointsCost: 500,
        value: 5,
        currency: 'USD',
        tierRequired: 'bronze',
        available: true
      },
      {
        name: 'Gold Badge',
        description: 'Exclusive gold profile badge',
        type: 'badge',
        pointsCost: 1000,
        value: 10,
        currency: 'USD',
        tierRequired: 'silver',
        available: true
      },
      {
        name: 'Platinum Badge',
        description: 'Exclusive platinum profile badge',
        type: 'badge',
        pointsCost: 2000,
        value: 20,
        currency: 'USD',
        tierRequired: 'gold',
        available: true
      },
      {
        name: 'Diamond Badge',
        description: 'Exclusive diamond profile badge',
        type: 'badge',
        pointsCost: 5000,
        value: 50,
        currency: 'USD',
        tierRequired: 'platinum',
        available: true
      },
      // Services
      {
        name: 'Profile Verification',
        description: 'Get your profile verified',
        type: 'service',
        pointsCost: 1000,
        value: 15,
        currency: 'USD',
        tierRequired: 'silver',
        available: true
      },
      {
        name: 'Custom Profile Theme',
        description: 'Unlock custom profile theme options',
        type: 'service',
        pointsCost: 2000,
        value: 25,
        currency: 'USD',
        tierRequired: 'gold',
        available: true
      },
      // Tier-specific
      {
        name: 'Early Access Pass',
        description: '7-day early access to new features',
        type: 'feature_access',
        pointsCost: 1500,
        value: 15,
        currency: 'USD',
        tierRequired: 'gold',
        available: true
      },
      {
        name: 'Concierge Trial (7 days)',
        description: '7-day concierge service trial',
        type: 'service',
        pointsCost: 3000,
        value: 30,
        currency: 'USD',
        tierRequired: 'platinum',
        available: true
      },
      {
        name: 'VIP Event Invitation',
        description: 'Invitation to exclusive VIP events',
        type: 'service',
        pointsCost: 10000,
        value: 100,
        currency: 'USD',
        tierRequired: 'diamond',
        available: true
      },
      {
        name: 'Lifetime Concierge',
        description: 'Permanent concierge service access',
        type: 'service',
        pointsCost: 25000,
        value: 250,
        currency: 'USD',
        tierRequired: 'diamond',
        available: true
      }
    ];

    for (const option of defaultOptions) {
      const optionWithId: RedemptionOption = {
        ...option,
        optionId: uuidv4()
      };
      redemptionOptionStore[optionWithId.optionId] = optionWithId;
    }
  }

  /**
   * Get available redemption options for entity
   */
  async getAvailableOptions(entityId: string): Promise<RedemptionOption[]> {
    const karmaBalance = await karmaService.getKarmaBalance(entityId);
    if (!karmaBalance) {
      return [];
    }

    const entityTierIndex = ['bronze', 'silver', 'gold', 'platinum', 'diamond'].indexOf(karmaBalance.tier);

    return Object.values(redemptionOptionStore)
      .filter(option => {
        if (!option.available) return false;
        if (option.expiresAt && option.expiresAt < new Date()) return false;
        if (option.maxRedemptions && option.currentRedemptions !== undefined && option.currentRedemptions >= option.maxRedemptions) return false;

        const requiredTierIndex = ['bronze', 'silver', 'gold', 'platinum', 'diamond'].indexOf(option.tierRequired);
        return entityTierIndex >= requiredTierIndex;
      })
      .map(option => ({
        ...option,
        pointsCost: Math.round(option.pointsCost * karmaBalance.tierInfo.multiplier)
      }));
  }

  /**
   * Get option by ID
   */
  async getOption(optionId: string): Promise<RedemptionOption | null> {
    return redemptionOptionStore[optionId] || null;
  }

  /**
   * Redeem karma points
   */
  async redeemPoints(
    entityId: string,
    optionId: string,
    quantity: number = 1
  ): Promise<Redemption> {
    const option = redemptionOptionStore[optionId];
    if (!option) {
      throw new Error('Redemption option not found');
    }

    if (!option.available) {
      throw new Error('This option is no longer available');
    }

    const karmaBalance = await karmaService.getKarmaBalance(entityId);
    if (!karmaBalance) {
      throw new Error('Karma record not found');
    }

    const entityTierIndex = ['bronze', 'silver', 'gold', 'platinum', 'diamond'].indexOf(karmaBalance.tier);
    const requiredTierIndex = ['bronze', 'silver', 'gold', 'platinum', 'diamond'].indexOf(option.tierRequired);
    if (entityTierIndex < requiredTierIndex) {
      throw new Error(`This option requires ${option.tierRequired} tier or higher`);
    }

    const totalPointsCost = option.pointsCost * quantity;

    if (option.maxRedemptions && option.currentRedemptions !== undefined) {
      if (option.currentRedemptions + quantity > option.maxRedemptions) {
        throw new Error(`Maximum redemptions exceeded. Available: ${option.maxRedemptions - option.currentRedemptions}`);
      }
    }

    await karmaService.spendKarma({
      entityId,
      points: totalPointsCost,
      reason: `Redeemed: ${option.name}`,
      metadata: { optionId, optionName: option.name }
    });

    const redemption: Redemption = {
      redemptionId: uuidv4(),
      entityId,
      optionId,
      optionName: option.name,
      type: option.type,
      pointsSpent: totalPointsCost,
      value: option.value * quantity,
      currency: option.currency,
      status: 'completed',
      redeemedAt: new Date(),
      metadata: option.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (option.type === 'voucher') {
      redemption.voucherCode = this.generateVoucherCode();
      redemption.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }

    redemptionStore[redemption.redemptionId] = redemption;

    option.currentRedemptions = (option.currentRedemptions || 0) + quantity;
    redemptionOptionStore[optionId] = option;

    if (option.type === 'voucher' && redemption.voucherCode) {
      redemptionCodeStore[redemption.voucherCode] = {
        code: redemption.voucherCode,
        redemptionId: redemption.redemptionId,
        entityId,
        optionName: option.name,
        value: option.value,
        currency: option.currency,
        isUsed: false,
        expiresAt: redemption.expiresAt,
        createdAt: new Date()
      };
    }

    return redemption;
  }

  /**
   * Generate voucher code
   */
  private generateVoucherCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'SR-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Get redemption by ID
   */
  async getRedemption(redemptionId: string): Promise<Redemption | null> {
    return redemptionStore[redemptionId] || null;
  }

  /**
   * Get redemptions for entity
   */
  async getRedemptions(
    entityId: string,
    options: {
      page?: number;
      limit?: number;
      status?: RedemptionStatus;
      type?: RewardType;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    redemptions: Redemption[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    totalPointsSpent: number;
    totalValueRedeemed: number;
  }> {
    const { page = 1, limit = 20, status, type, startDate, endDate } = options;

    let redemptions = Object.values(redemptionStore)
      .filter(r => r.entityId === entityId)
      .filter(r => !status || r.status === status)
      .filter(r => !type || r.type === type)
      .filter(r => !startDate || r.createdAt >= startDate)
      .filter(r => !endDate || r.createdAt <= endDate)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = redemptions.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    redemptions = redemptions.slice(startIndex, startIndex + limit);

    const allRedemptions = Object.values(redemptionStore).filter(r => r.entityId === entityId);
    const totalPointsSpent = allRedemptions.reduce((sum, r) => sum + r.pointsSpent, 0);
    const totalValueRedeemed = allRedemptions.reduce((sum, r) => sum + r.value, 0);

    return {
      redemptions,
      total,
      page,
      limit,
      totalPages,
      totalPointsSpent,
      totalValueRedeemed
    };
  }

  /**
   * Use voucher code
   */
  async useVoucherCode(code: string): Promise<{ success: boolean; redemption: Redemption | null; error?: string }> {
    const voucherCode = redemptionCodeStore[code];

    if (!voucherCode) {
      return { success: false, redemption: null, error: 'Invalid voucher code' };
    }

    if (voucherCode.isUsed) {
      return { success: false, redemption: null, error: 'Voucher code already used' };
    }

    if (voucherCode.expiresAt && voucherCode.expiresAt < new Date()) {
      return { success: false, redemption: null, error: 'Voucher code has expired' };
    }

    voucherCode.isUsed = true;
    voucherCode.usedAt = new Date();
    redemptionCodeStore[code] = voucherCode;

    const redemption = redemptionStore[voucherCode.redemptionId];
    if (redemption) {
      redemption.usedAt = new Date();
      redemption.status = 'completed';
      redemption.updatedAt = new Date();
      redemptionStore[redemption.redemptionId] = redemption;
    }

    return { success: true, redemption };
  }

  /**
   * Validate voucher code
   */
  async validateVoucherCode(code: string): Promise<{ valid: boolean; value?: number; currency?: string; error?: string }> {
    const voucherCode = redemptionCodeStore[code];

    if (!voucherCode) {
      return { valid: false, error: 'Invalid voucher code' };
    }

    if (voucherCode.isUsed) {
      return { valid: false, error: 'Voucher code already used' };
    }

    if (voucherCode.expiresAt && voucherCode.expiresAt < new Date()) {
      return { valid: false, error: 'Voucher code has expired' };
    }

    return {
      valid: true,
      value: voucherCode.value,
      currency: voucherCode.currency
    };
  }

  /**
   * Get redemption statistics
   */
  async getRedemptionStatistics(entityId: string): Promise<{
    totalRedemptions: number;
    totalPointsSpent: number;
    totalValueRedeemed: number;
    averageValuePerPoint: number;
    byType: Record<RewardType, { count: number; pointsSpent: number; value: number }>;
    recentRedemptions: Redemption[];
    activeVouchers: Redemption[];
  }> {
    const redemptions = Object.values(redemptionStore).filter(r => r.entityId === entityId);

    const stats = {
      totalRedemptions: redemptions.length,
      totalPointsSpent: redemptions.reduce((sum, r) => sum + r.pointsSpent, 0),
      totalValueRedeemed: redemptions.reduce((sum, r) => sum + r.value, 0),
      averageValuePerPoint: 0,
      byType: {
        voucher: { count: 0, pointsSpent: 0, value: 0 },
        feature_access: { count: 0, pointsSpent: 0, value: 0 },
        badge: { count: 0, pointsSpent: 0, value: 0 },
        service: { count: 0, pointsSpent: 0, value: 0 },
        cash: { count: 0, pointsSpent: 0, value: 0 }
      } as Record<RewardType, { count: number; pointsSpent: number; value: number }>,
      recentRedemptions: redemptions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5),
      activeVouchers: redemptions.filter(r => r.type === 'voucher' && r.voucherCode && !r.usedAt)
    };

    if (stats.totalPointsSpent > 0) {
      stats.averageValuePerPoint = stats.totalValueRedeemed / stats.totalPointsSpent;
    }

    for (const redemption of redemptions) {
      stats.byType[redemption.type].count++;
      stats.byType[redemption.type].pointsSpent += redemption.pointsSpent;
      stats.byType[redemption.type].value += redemption.value;
    }

    return stats;
  }

  /**
   * Create custom redemption option (admin)
   */
  async createOption(request: Omit<RedemptionOption, 'optionId'>): Promise<RedemptionOption> {
    const option: RedemptionOption = {
      ...request,
      optionId: uuidv4()
    };

    redemptionOptionStore[option.optionId] = option;
    return option;
  }

  /**
   * Update redemption option (admin)
   */
  async updateOption(optionId: string, updates: Partial<RedemptionOption>): Promise<RedemptionOption | null> {
    const option = redemptionOptionStore[optionId];
    if (!option) {
      return null;
    }

    const updated = {
      ...option,
      ...updates,
      optionId: option.optionId
    };

    redemptionOptionStore[optionId] = updated;
    return updated;
  }

  /**
   * Deactivate redemption option (admin)
   */
  async deactivateOption(optionId: string): Promise<boolean> {
    const option = redemptionOptionStore[optionId];
    if (!option) {
      return false;
    }

    option.available = false;
    redemptionOptionStore[optionId] = option;
    return true;
  }

  /**
   * Get all redemption options (admin)
   */
  async getAllOptions(filters?: {
    type?: RewardType;
    tierRequired?: KarmaTier;
    available?: boolean;
  }): Promise<RedemptionOption[]> {
    let options = Object.values(redemptionOptionStore);

    if (filters) {
      if (filters.type) {
        options = options.filter(o => o.type === filters.type);
      }
      if (filters.tierRequired) {
        options = options.filter(o => o.tierRequired === filters.tierRequired);
      }
      if (filters.available !== undefined) {
        options = options.filter(o => o.available === filters.available);
      }
    }

    return options;
  }

  /**
   * Calculate karma value conversion
   */
  calculateKarmaValue(points: number, currency: string = 'USD'): number {
    const conversionRates: Record<string, number> = {
      USD: 0.01,
      EUR: 0.009,
      GBP: 0.008,
      INR: 0.83
    };

    const rate = conversionRates[currency] || 0.01;
    return Math.round(points * rate * 100) / 100;
  }

  /**
   * Get redemption history by voucher code
   */
  async getRedemptionByVoucherCode(code: string): Promise<Redemption | null> {
    const voucherCode = redemptionCodeStore[code];
    if (!voucherCode) {
      return null;
    }

    return redemptionStore[voucherCode.redemptionId] || null;
  }
}

// Export singleton instance
export const redemptionService = new RedemptionService();
