/**
 * Trust Score Service
 *
 * Calculate and manage trust scores for users
 */

import { v4 as uuidv4 } from 'uuid';
import { TrustScore, ITrustScore, TrustLevel, TrustFactor } from '../models/trustScore.model';
import { Cluster } from '../models/cluster.model';
import { logger } from '../utils/logger';

export interface TrustScoreInput {
  clusterId: string;
  identityVerified?: boolean;
  accountAgeDays?: number;
  transactionCount?: number;
  successfulTransactions?: number;
  deviceCount?: number;
  verifiedDevices?: number;
  karmaScore?: number;
  kycStatus?: 'none' | 'basic' | 'full';
  referralCount?: number;
}

export interface TrustScoreResult {
  clusterId: string;
  overallScore: number;
  level: TrustLevel;
  factors: Record<TrustFactor, { score: number; weight: number }>;
  breakdown: {
    base: number;
    bonuses: number;
    penalties: number;
  };
}

export class TrustScoreService {

  // Factor weights
  private readonly FACTOR_WEIGHTS: Record<TrustFactor, number> = {
    [TrustFactor.IDENTITY_VERIFICATION]: 2.0,
    [TrustFactor.ACCOUNT_AGE]: 1.5,
    [TrustFactor.TRANSACTION_HISTORY]: 2.0,
    [TrustFactor.DEVICE_TRUST]: 1.0,
    [TrustFactor.BEHAVIOR_PATTERN]: 1.5,
    [TrustFactor.SOCIAL_PROOF]: 1.0,
    [TrustFactor.PAYMENT_METHODS]: 1.5,
    [TrustFactor.ADDRESS_VERIFICATION]: 1.0,
    [TrustFactor.KYC_STATUS]: 2.0,
    [TrustFactor.KARMA_SCORE]: 1.5,
  };

  async initialize(): Promise<void> {
    logger.info('Trust Score Service initialized');
  }

  /**
   * Get trust score for a cluster
   */
  async getTrustScore(clusterId: string): Promise<ITrustScore | null> {
    return TrustScore.findOne({ clusterId });
  }

  /**
   * Calculate trust score from inputs
   */
  async calculateTrustScore(input: TrustScoreInput): Promise<TrustScoreResult> {
    const { clusterId } = input;

    // Initialize factor scores
    const factors: Record<TrustFactor, { score: number; weight: number; lastUpdated: Date }> = {} as any;

    // 1. Identity Verification (0-100)
    factors[TrustFactor.IDENTITY_VERIFICATION] = {
      score: input.identityVerified ? 100 : 0,
      weight: this.FACTOR_WEIGHTS[TrustFactor.IDENTITY_VERIFICATION],
      lastUpdated: new Date()
    };

    // 2. Account Age (0-100, scales with days)
    const ageScore = Math.min(100, (input.accountAgeDays || 0) * 2);
    factors[TrustFactor.ACCOUNT_AGE] = {
      score: ageScore,
      weight: this.FACTOR_WEIGHTS[TrustFactor.ACCOUNT_AGE],
      lastUpdated: new Date()
    };

    // 3. Transaction History (0-100)
    const txCount = input.transactionCount || 0;
    const successRate = txCount > 0 ? (input.successfulTransactions || 0) / txCount : 0;
    const txScore = Math.min(100, txCount * 2) * successRate + (successRate * 50);
    factors[TrustFactor.TRANSACTION_HISTORY] = {
      score: Math.round(txScore),
      weight: this.FACTOR_WEIGHTS[TrustFactor.TRANSACTION_HISTORY],
      lastUpdated: new Date()
    };

    // 4. Device Trust (0-100)
    const deviceScore = input.verifiedDevices && input.deviceCount
      ? (input.verifiedDevices / input.deviceCount) * 100
      : 50;
    factors[TrustFactor.DEVICE_TRUST] = {
      score: Math.round(deviceScore),
      weight: this.FACTOR_WEIGHTS[TrustFactor.DEVICE_TRUST],
      lastUpdated: new Date()
    };

    // 5. KYC Status (0-100)
    const kycScores = { none: 0, basic: 50, full: 100 };
    factors[TrustFactor.KYC_STATUS] = {
      score: kycScores[input.kycStatus || 'none'],
      weight: this.FACTOR_WEIGHTS[TrustFactor.KYC_STATUS],
      lastUpdated: new Date()
    };

    // 6. Karma Score (0-100, maps karma to trust)
    const karmaScore = Math.min(100, (input.karmaScore || 0) / 50);
    factors[TrustFactor.KARMA_SCORE] = {
      score: Math.round(karmaScore),
      weight: this.FACTOR_WEIGHTS[TrustFactor.KARMA_SCORE],
      lastUpdated: new Date()
    };

    // 7. Social Proof (referrals)
    const socialScore = Math.min(100, (input.referralCount || 0) * 10);
    factors[TrustFactor.SOCIAL_PROOF] = {
      score: Math.round(socialScore),
      weight: this.FACTOR_WEIGHTS[TrustFactor.SOCIAL_PROOF],
      lastUpdated: new Date()
    };

    // Default factors
    factors[TrustFactor.BEHAVIOR_PATTERN] = { score: 75, weight: this.FACTOR_WEIGHTS[TrustFactor.BEHAVIOR_PATTERN], lastUpdated: new Date() };
    factors[TrustFactor.PAYMENT_METHODS] = { score: 70, weight: this.FACTOR_WEIGHTS[TrustFactor.PAYMENT_METHODS], lastUpdated: new Date() };
    factors[TrustFactor.ADDRESS_VERIFICATION] = { score: 50, weight: this.FACTOR_WEIGHTS[TrustFactor.ADDRESS_VERIFICATION], lastUpdated: new Date() };

    // Calculate weighted average
    let totalWeight = 0;
    let weightedSum = 0;
    for (const factor of Object.values(factors)) {
      weightedSum += factor.score * factor.weight;
      totalWeight += factor.weight;
    }
    const overallScore = Math.round(weightedSum / totalWeight);

    // Determine level
    let level: TrustLevel;
    if (overallScore >= 90) level = TrustLevel.VERY_HIGH;
    else if (overallScore >= 70) level = TrustLevel.HIGH;
    else if (overallScore >= 40) level = TrustLevel.MEDIUM;
    else if (overallScore >= 20) level = TrustLevel.LOW;
    else level = TrustLevel.VERY_LOW;

    // Save to database
    await TrustScore.findOneAndUpdate(
      { clusterId },
      {
        clusterId,
        overallScore,
        level,
        factors,
        verifiedAt: input.identityVerified ? new Date() : undefined,
        nextReviewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      { upsert: true, new: true }
    );

    // Return breakdown
    const breakdown = {
      base: 50,
      bonuses: Math.max(0, overallScore - 50),
      penalties: Math.max(0, 50 - overallScore),
    };

    return {
      clusterId,
      overallScore,
      level,
      factors: Object.fromEntries(
        Object.entries(factors).map(([k, v]) => [k, { score: v.score, weight: v.weight }])
      ) as Record<TrustFactor, { score: number; weight: number }>,
      breakdown,
    };
  }

  /**
   * Update specific factor
   */
  async updateFactor(
    clusterId: string,
    factor: TrustFactor,
    score: number
  ): Promise<ITrustScore | null> {
    const trustScore = await TrustScore.findOne({ clusterId });
    if (!trustScore) return null;

    trustScore.factors.set(factor, {
      score,
      weight: this.FACTOR_WEIGHTS[factor],
      lastUpdated: new Date()
    });

    // Recalculate overall
    trustScore.overallScore = trustScore.recalculateScore();
    trustScore.level = trustScore.calculateLevel();
    trustScore.updatedAt = new Date();

    await trustScore.save();
    return trustScore;
  }

  /**
   * Add trust bonus
   */
  async addBonus(clusterId: string, bonus: number, reason: string): Promise<void> {
    const trustScore = await TrustScore.findOne({ clusterId });
    if (!trustScore) return;

    // Increase overall score
    trustScore.overallScore = Math.min(100, trustScore.overallScore + bonus);
    trustScore.level = trustScore.calculateLevel();
    trustScore.factors.set(TrustFactor.BEHAVIOR_PATTERN, {
      score: Math.min(100, (trustScore.factors.get(TrustFactor.BEHAVIOR_PATTERN)?.score || 75) + bonus / 2),
      weight: this.FACTOR_WEIGHTS[TrustFactor.BEHAVIOR_PATTERN],
      lastUpdated: new Date()
    });

    trustScore.flags.push(`bonus:${reason}:${bonus}`);
    await trustScore.save();

    logger.info('Trust bonus added', { clusterId, bonus, reason });
  }

  /**
   * Add trust penalty
   */
  async addPenalty(clusterId: string, penalty: number, reason: string): Promise<void> {
    const trustScore = await TrustScore.findOne({ clusterId });
    if (!trustScore) return;

    trustScore.overallScore = Math.max(0, trustScore.overallScore - penalty);
    trustScore.level = trustScore.calculateLevel();
    trustScore.factors.set(TrustFactor.BEHAVIOR_PATTERN, {
      score: Math.max(0, (trustScore.factors.get(TrustFactor.BEHAVIOR_PATTERN)?.score || 75) - penalty / 2),
      weight: this.FACTOR_WEIGHTS[TrustFactor.BEHAVIOR_PATTERN],
      lastUpdated: new Date()
    });

    trustScore.flags.push(`penalty:${reason}:${penalty}`);
    await trustScore.save();

    logger.info('Trust penalty applied', { clusterId, penalty, reason });
  }

  /**
   * Get trust level benefits
   */
  getTrustLevelBenefits(level: TrustLevel): string[] {
    const benefits: Record<TrustLevel, string[]> = {
      [TrustLevel.VERY_LOW]: [
        'Basic features only',
        'Limited transaction amounts',
        'Manual verification required'
      ],
      [TrustLevel.LOW]: [
        'Standard features',
        'Increased transaction limits',
        'Basic support'
      ],
      [TrustLevel.MEDIUM]: [
        'All standard features',
        'Priority support',
        'Higher transaction limits',
        'Early access to new features'
      ],
      [TrustLevel.HIGH]: [
        'All medium benefits',
        'Premium support',
        'High transaction limits',
        'Personal account manager',
        'Custom rewards'
      ],
      [TrustLevel.VERY_HIGH]: [
        'All high benefits',
        'Unlimited transactions',
        'VIP events',
        'White-glove support',
        'Custom integrations'
      ]
    };
    return benefits[level];
  }
}
