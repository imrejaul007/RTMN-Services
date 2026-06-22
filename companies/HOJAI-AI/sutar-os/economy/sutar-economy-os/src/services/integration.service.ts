/**
 * SUTAR Economy OS - Integration Service
 * Layer 10: Integration with Contract OS (port 4190) and Trust Engine (port 4180)
 */

import axios, { AxiosInstance } from 'axios';
import { karmaService, KARMA_TIERS, KARMA_POINT_CONFIG } from './karma.service.js';
import { earningsService } from './earnings.service.js';
import type { KarmaTier, KarmaAction } from '../types/index.js';

// ============================================
// Configuration
// ============================================

const CONTRACT_OS_URL = process.env.CONTRACT_OS_URL || 'http://localhost:4190';
const TRUST_ENGINE_URL = process.env.TRUST_ENGINE_URL || 'http://localhost:4180';

// ============================================
// Types
// ============================================

export interface TrustScore {
  entityId: string;
  score: number;
  level: 'low' | 'medium' | 'high' | 'excellent';
  factors: Record<string, number>;
  lastUpdated: Date;
}

export interface ContractContext {
  contractId?: string;
  parties: string[];
  terms: Record<string, unknown>;
  karmaBonus?: {
    entityId: string;
    bonusPoints: number;
  };
}

export interface TrustMultiplier {
  multiplier: number;
  bonusPercentage: number;
  trustLevel: TrustScore['level'];
}

// ============================================
// Integration Service Class
// ============================================

export class IntegrationService {
  private contractOSClient: AxiosInstance;
  private trustEngineClient: AxiosInstance;

  constructor() {
    this.contractOSClient = axios.create({
      baseURL: CONTRACT_OS_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.trustEngineClient = axios.create({
      baseURL: TRUST_ENGINE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // ============================================
  // Trust Engine Integration
  // ============================================

  /**
   * Get trust score for an entity
   */
  async getTrustScore(entityId: string): Promise<TrustScore | null> {
    try {
      const response = await this.trustEngineClient.get(`/api/v1/trust/${entityId}`);
      return response.data.data;
    } catch (error) {
      // If Trust Engine is unavailable, return a default score
      console.warn(`Trust Engine unavailable for entity ${entityId}, using default score`);
      return {
        entityId,
        score: 50,
        level: 'medium',
        factors: {
          history: 50,
          activity: 50,
          verification: 50
        },
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Calculate trust-based multiplier
   */
  async getTrustMultiplier(entityId: string): Promise<TrustMultiplier> {
    const trustScore = await this.getTrustScore(entityId);

    if (!trustScore) {
      return {
        multiplier: 1.0,
        bonusPercentage: 0,
        trustLevel: 'medium'
      };
    }

    let multiplier = 1.0;
    let bonusPercentage = 0;

    switch (trustScore.level) {
      case 'excellent':
        multiplier = 1.5;
        bonusPercentage = 50;
        break;
      case 'high':
        multiplier = 1.25;
        bonusPercentage = 25;
        break;
      case 'medium':
        multiplier = 1.0;
        bonusPercentage = 0;
        break;
      case 'low':
        multiplier = 0.75;
        bonusPercentage = -25;
        break;
    }

    return {
      multiplier,
      bonusPercentage,
      trustLevel: trustScore.level
    };
  }

  /**
   * Apply trust multiplier to karma points
   */
  async applyTrustMultiplierToKarma(
    entityId: string,
    basePoints: number
  ): Promise<{ adjustedPoints: number; multiplier: number; trustLevel: TrustScore['level'] }> {
    const trustMultiplier = await this.getTrustMultiplier(entityId);
    const adjustedPoints = Math.round(basePoints * trustMultiplier.multiplier);

    return {
      adjustedPoints,
      multiplier: trustMultiplier.multiplier,
      trustLevel: trustMultiplier.trustLevel
    };
  }

  /**
   * Apply trust multiplier to earnings
   */
  async applyTrustMultiplierToEarnings(
    entityId: string,
    baseAmount: number
  ): Promise<{ adjustedAmount: number; multiplier: number }> {
    const trustMultiplier = await this.getTrustMultiplier(entityId);
    const adjustedAmount = Math.round(baseAmount * trustMultiplier.multiplier * 100) / 100;

    return {
      adjustedAmount,
      multiplier: trustMultiplier.multiplier
    };
  }

  /**
   * Get trust-adjusted tier
   */
  async getTrustAdjustedTier(entityId: string): Promise<{ baseTier: KarmaTier; adjustedTier: KarmaTier; bonusPoints: number }> {
    const karmaBalance = await karmaService.getKarmaBalance(entityId);
    const baseTier = karmaBalance?.tier || 'bronze';

    const trustScore = await this.getTrustScore(entityId);
    let adjustedTier = baseTier;
    let bonusPoints = 0;

    if (trustScore) {
      // Boost tier based on trust score
      if (trustScore.score >= 90 && baseTier !== 'diamond') {
        const tiers: KarmaTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
        const currentIndex = tiers.indexOf(baseTier);
        adjustedTier = tiers[Math.min(currentIndex + 1, tiers.length - 1)];
        bonusPoints = 500;
      } else if (trustScore.score >= 75 && baseTier === 'bronze') {
        adjustedTier = 'silver';
        bonusPoints = 200;
      }
    }

    return {
      baseTier,
      adjustedTier,
      bonusPoints
    };
  }

  // ============================================
  // Contract OS Integration
  // ============================================

  /**
   * Notify Contract OS of karma events
   */
  async notifyContractOSKarmaEvent(
    contractId: string,
    event: {
      type: 'contract_signed' | 'milestone_completed' | 'negotiation_completed';
      entityId: string;
      points: number;
      tier: KarmaTier;
    }
  ): Promise<boolean> {
    try {
      await this.contractOSClient.post(`/api/v1/contracts/${contractId}/karma-event`, {
        type: event.type,
        entityId: event.entityId,
        points: event.points,
        tier: event.tier,
        timestamp: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error(`Failed to notify Contract OS: ${error}`);
      return false;
    }
  }

  /**
   * Get contract-based karma bonus
   */
  async getContractKarmaBonus(contractId: string, entityId: string): Promise<number> {
    try {
      const response = await this.contractOSClient.get(`/api/v1/contracts/${contractId}/karma-bonus/${entityId}`);
      return response.data.data?.bonusPoints || 0;
    } catch (error) {
      console.warn(`Failed to get contract karma bonus: ${error}`);
      return 0;
    }
  }

  /**
   * Award contract-based karma
   */
  async awardContractKarma(
    contractId: string,
    entityId: string,
    action: KarmaAction,
    reason: string
  ): Promise<{ success: boolean; pointsAwarded: number; error?: string }> {
    try {
      // Get contract bonus
      const contractBonus = await this.getContractKarmaBonus(contractId, entityId);

      // Get trust multiplier
      const trustMultiplier = await this.getTrustMultiplier(entityId);

      // Calculate total points
      const actionConfig = KARMA_POINT_CONFIG[action];
      const basePoints = actionConfig?.basePoints || 100;
      const contractBonusPoints = contractBonus;
      const trustBonusPoints = Math.round(basePoints * (trustMultiplier.multiplier - 1));
      const totalPoints = basePoints + contractBonusPoints + trustBonusPoints;

      // Award karma
      const history = await karmaService.earnKarma({
        entityId,
        entityType: 'user',
        action,
        points: totalPoints,
        reason: `${reason} (Contract: ${contractId})`,
        referenceId: contractId,
        metadata: {
          contractId,
          contractBonus: contractBonusPoints,
          trustBonus: trustBonusPoints,
          trustLevel: trustMultiplier.trustLevel
        }
      });

      // Notify Contract OS
      await this.notifyContractOSKarmaEvent(contractId, {
        type: 'milestone_completed',
        entityId,
        points: totalPoints,
        tier: history.tier
      });

      return {
        success: true,
        pointsAwarded: totalPoints
      };
    } catch (error) {
      return {
        success: false,
        pointsAwarded: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get contract earnings
   */
  async getContractEarnings(contractId: string, entityId: string): Promise<number> {
    try {
      const response = await this.contractOSClient.get(`/api/v1/contracts/${contractId}/earnings/${entityId}`);
      return response.data.data?.totalEarnings || 0;
    } catch (error) {
      console.warn(`Failed to get contract earnings: ${error}`);
      return 0;
    }
  }

  /**
   * Sync contract payments with earnings
   */
  async syncContractPayments(contractId: string): Promise<{ synced: number; failed: number }> {
    try {
      const response = await this.contractOSClient.get(`/api/v1/contracts/${contractId}/payments`);
      const payments = response.data.data || [];

      let synced = 0;
      let failed = 0;

      for (const payment of payments) {
        try {
          await earningsService.createEarning({
            entityId: payment.entityId,
            entityType: 'user',
            source: 'contract',
            sourceId: contractId,
            amount: payment.amount,
            currency: payment.currency,
            metadata: {
              contractId,
              paymentId: payment.paymentId
            }
          });
          synced++;
        } catch (error) {
          failed++;
        }
      }

      return { synced, failed };
    } catch (error) {
      console.error(`Failed to sync contract payments: ${error}`);
      return { synced: 0, failed: 0 };
    }
  }

  // ============================================
  // Combined Operations
  // ============================================

  /**
   * Get comprehensive entity profile
   */
  async getEntityProfile(entityId: string): Promise<{
    karma: {
      points: number;
      tier: KarmaTier;
      tierInfo: typeof KARMA_TIERS[KarmaTier];
      streakDays: number;
    };
    trust: TrustScore | null;
    trustMultiplier: TrustMultiplier;
    adjustedTier: { baseTier: KarmaTier; adjustedTier: KarmaTier; bonusPoints: number };
  }> {
    const karmaBalance = await karmaService.getKarmaBalance(entityId);
    const trustScore = await this.getTrustScore(entityId);
    const trustMultiplier = await this.getTrustMultiplier(entityId);
    const adjustedTier = await this.getTrustAdjustedTier(entityId);

    return {
      karma: {
        points: karmaBalance?.points || 0,
        tier: karmaBalance?.tier || 'bronze',
        tierInfo: KARMA_TIERS[karmaBalance?.tier || 'bronze'],
        streakDays: karmaBalance?.streakDays || 0
      },
      trust: trustScore,
      trustMultiplier,
      adjustedTier
    };
  }

  /**
   * Process payment with karma and trust integration
   */
  async processPaymentWithIntegration(
    entityId: string,
    amount: number,
    currency: string = 'USD',
    referenceId?: string
  ): Promise<{
    baseAmount: number;
    trustMultiplier: number;
    trustBonus: number;
    karmaDiscount: number;
    finalAmount: number;
    karmaPointsEarned: number;
  }> {
    const trustMultiplier = await this.getTrustMultiplier(entityId);
    const karmaBalance = await karmaService.getKarmaBalance(entityId);

    // Calculate trust bonus (additional amount due to trust)
    const trustBonus = Math.round(amount * (trustMultiplier.multiplier - 1) * 100) / 100;

    // Calculate karma discount (percentage off based on tier)
    const karmaDiscountPercent = karmaBalance ? (KARMA_TIERS[karmaBalance.tier].multiplier - 1) * 10 : 0;
    const karmaDiscount = Math.round(amount * karmaDiscountPercent / 100 * 100) / 100;

    // Calculate karma points earned (1% of transaction + trust bonus)
    const karmaPointsEarned = Math.round((amount + trustBonus) * 0.01);

    // Final amount after discounts
    const finalAmount = Math.max(0, amount - karmaDiscount);

    return {
      baseAmount: amount,
      trustMultiplier: trustMultiplier.multiplier,
      trustBonus,
      karmaDiscount,
      finalAmount,
      karmaPointsEarned
    };
  }

  /**
   * Validate transaction with trust and karma checks
   */
  async validateTransaction(
    entityId: string,
    amount: number
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    trustLevel: TrustScore['level'];
    karmaTier: KarmaTier;
    maxTransactionLimit: number;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const trustScore = await this.getTrustScore(entityId);
    const karmaBalance = await karmaService.getKarmaBalance(entityId);
    const trustMultiplier = await this.getTrustMultiplier(entityId);

    const trustLevel = trustScore?.level || 'medium';
    const karmaTier = karmaBalance?.tier || 'bronze';

    // Calculate max transaction limit based on tier
    const tierLimits: Record<KarmaTier, number> = {
      bronze: 1000,
      silver: 5000,
      gold: 25000,
      platinum: 100000,
      diamond: 1000000
    };
    const maxTransactionLimit = tierLimits[karmaTier];

    // Validation checks
    if (amount > maxTransactionLimit) {
      errors.push(`Transaction amount exceeds limit for ${karmaTier} tier (${maxTransactionLimit})`);
    }

    if (trustLevel === 'low') {
      warnings.push('Low trust score may result in additional verification');
    }

    if (karmaTier === 'bronze') {
      warnings.push('Consider upgrading karma tier for better rates');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      trustLevel,
      karmaTier,
      maxTransactionLimit
    };
  }

  /**
   * Get dashboard summary for entity
   */
  async getDashboardSummary(entityId: string): Promise<{
    totalKarmaPoints: number;
    currentTier: KarmaTier;
    nextTier: KarmaTier | null;
    pointsToNextTier: number | null;
    trustScore: number;
    trustLevel: TrustScore['level'];
    estimatedEarnings: number;
    pendingPayout: number;
    availableBalance: number;
    activeEscrows: number;
    recentAchievements: number;
  }> {
    const karmaBalance = await karmaService.getKarmaBalance(entityId);
    const trustScore = await this.getTrustScore(entityId);
    const trustMultiplier = await this.getTrustMultiplier(entityId);

    // Suppress unused variable warning
    void trustMultiplier;

    // Calculate tier progress
    const tierOrder: KarmaTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const currentIndex = tierOrder.indexOf(karmaBalance?.tier || 'bronze');
    const nextTier = tierOrder[currentIndex + 1] || null;
    const pointsToNextTier = nextTier ? KARMA_TIERS[nextTier].minPoints - (karmaBalance?.points || 0) : null;

    // Estimate earnings based on trust multiplier
    const estimatedEarnings = trustMultiplier.bonusPercentage;

    return {
      totalKarmaPoints: karmaBalance?.points || 0,
      currentTier: karmaBalance?.tier || 'bronze',
      nextTier,
      pointsToNextTier,
      trustScore: trustScore?.score || 50,
      trustLevel: trustScore?.level || 'medium',
      estimatedEarnings,
      pendingPayout: 0, // Would come from earnings service
      availableBalance: 0, // Would come from balance service
      activeEscrows: 0, // Would come from escrow service
      recentAchievements: 0 // Would come from leaderboard service
    };
  }

  /**
   * Health check for external services
   */
  async healthCheck(): Promise<{
    contractOS: { available: boolean; latency: number };
    trustEngine: { available: boolean; latency: number };
  }> {
    const contractOSHealth = await this.checkServiceHealth(this.contractOSClient, '/health');
    const trustEngineHealth = await this.checkServiceHealth(this.trustEngineClient, '/health');

    return {
      contractOS: contractOSHealth,
      trustEngine: trustEngineHealth
    };
  }

  /**
   * Check service health
   */
  private async checkServiceHealth(client: AxiosInstance, path: string): Promise<{ available: boolean; latency: number }> {
    const start = Date.now();
    try {
      await client.get(path, { timeout: 3000 });
      return {
        available: true,
        latency: Date.now() - start
      };
    } catch (error) {
      return {
        available: false,
        latency: Date.now() - start
      };
    }
  }
}

// Export singleton instance
export const integrationService = new IntegrationService();
