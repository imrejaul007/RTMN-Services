import { config } from '../config';
import logger from '../utils/logger';
import {
  TrustLevel,
  EntityType,
  IPaymentScore,
  IFulfillmentScore,
  IDisputeScore,
  IVerificationScore,
  ITransactionScore,
  ITrustScore,
  ITrustHistoryEntry,
  VerificationBadge,
  RiskLevel,
  CalculateTrustScoreRequest,
  TrustScoreResponse,
} from '../types';

// In-memory store for trust scores (in production, use a database)
const trustScoreStore = new Map<string, ITrustScore>();

export class TrustService {
  /**
   * Calculate trust score for an entity
   */
  calculateTrustScore(request: CalculateTrustScoreRequest): TrustScoreResponse {
    const { entityId, entityType, factors } = request;

    // Get or create trust score
    let trustScore = trustScoreStore.get(entityId);

    if (!trustScore) {
      trustScore = this.createDefaultTrustScore(entityId, entityType);
    }

    // Apply factors if provided
    if (factors) {
      trustScore = this.applyFactors(trustScore, factors);
    }

    // Recalculate overall score
    trustScore = this.recalculateOverallScore(trustScore);

    // Update store
    trustScoreStore.set(entityId, trustScore);

    logger.info(`Calculated trust score for ${entityId}: ${trustScore.overallScore}`);

    return {
      entityId: trustScore.entityId,
      overallScore: trustScore.overallScore,
      trustLevel: trustScore.trustLevel,
      riskLevel: trustScore.riskLevel,
      componentScores: {
        paymentScore: trustScore.paymentScore.score,
        fulfillmentScore: trustScore.fulfillmentScore.score,
        disputeScore: trustScore.disputeScore.score,
        verificationScore: trustScore.verificationScore.score,
        transactionScore: trustScore.transactionScore.score,
      },
      badges: trustScore.badges,
      calculatedAt: new Date(),
    };
  }

  /**
   * Get trust score for an entity
   */
  getTrustScore(entityId: string): ITrustScore | null {
    const trustScore = trustScoreStore.get(entityId);
    if (!trustScore) {
      logger.warn(`Trust score not found for entity: ${entityId}`);
      return null;
    }
    return trustScore;
  }

  /**
   * Update trust score components
   */
  updateTrustScore(
    entityId: string,
    updates: Partial<{
      paymentScore: Partial<IPaymentScore>;
      fulfillmentScore: Partial<IFulfillmentScore>;
      disputeScore: Partial<IDisputeScore>;
      verificationScore: Partial<IVerificationScore>;
      transactionScore: Partial<ITransactionScore>;
      badges: VerificationBadge[];
    }>,
    changeReason: string
  ): ITrustScore | null {
    let trustScore = trustScoreStore.get(entityId);

    if (!trustScore) {
      logger.warn(`Cannot update non-existent trust score for: ${entityId}`);
      return null;
    }

    const previousOverall = trustScore.overallScore;

    // Apply updates
    if (updates.paymentScore) {
      trustScore.paymentScore = { ...trustScore.paymentScore, ...updates.paymentScore };
    }
    if (updates.fulfillmentScore) {
      trustScore.fulfillmentScore = { ...trustScore.fulfillmentScore, ...updates.fulfillmentScore };
    }
    if (updates.disputeScore) {
      trustScore.disputeScore = { ...trustScore.disputeScore, ...updates.disputeScore };
    }
    if (updates.verificationScore) {
      trustScore.verificationScore = { ...trustScore.verificationScore, ...updates.verificationScore };
    }
    if (updates.transactionScore) {
      trustScore.transactionScore = { ...trustScore.transactionScore, ...updates.transactionScore };
    }
    if (updates.badges) {
      trustScore.badges = [...new Set([...trustScore.badges, ...updates.badges])];
    }

    // Recalculate
    trustScore = this.recalculateOverallScore(trustScore);

    // Add to history
    if (previousOverall !== trustScore.overallScore) {
      const historyEntry: ITrustHistoryEntry = {
        timestamp: new Date(),
        overallScore: trustScore.overallScore,
        paymentScore: trustScore.paymentScore.score,
        fulfillmentScore: trustScore.fulfillmentScore.score,
        disputeScore: trustScore.disputeScore.score,
        verificationScore: trustScore.verificationScore.score,
        changeReason,
        changeType: trustScore.overallScore > previousOverall ? 'increase' : 'decrease',
      };
      trustScore.history.push(historyEntry);

      // Keep only last 100 history entries
      if (trustScore.history.length > 100) {
        trustScore.history = trustScore.history.slice(-100);
      }
    }

    trustScore.updatedAt = new Date();
    trustScoreStore.set(entityId, trustScore);

    logger.info(`Updated trust score for ${entityId}: ${trustScore.overallScore} (was ${previousOverall})`);

    return trustScore;
  }

  /**
   * Get trust history for an entity
   */
  getTrustHistory(entityId: string, limit: number = 30): ITrustHistoryEntry[] {
    const trustScore = trustScoreStore.get(entityId);
    if (!trustScore) {
      return [];
    }
    return trustScore.history.slice(-limit).reverse();
  }

  /**
   * Create default trust score for new entity
   */
  private createDefaultTrustScore(entityId: string, entityType: EntityType): ITrustScore {
    const now = new Date();
    return {
      entityId,
      entityType,
      overallScore: config.trust.defaultScore,
      trustLevel: this.calculateTrustLevel(config.trust.defaultScore),
      riskLevel: this.calculateRiskLevel(config.trust.defaultScore),
      paymentScore: {
        score: config.trust.defaultScore,
        onTimePayments: 0,
        latePayments: 0,
        defaultedPayments: 0,
        totalPayments: 0,
        paymentRate: 0,
      },
      fulfillmentScore: {
        score: config.trust.defaultScore,
        ordersCompleted: 0,
        ordersPartial: 0,
        ordersFailed: 0,
        totalOrders: 0,
        fulfillmentRate: 0,
      },
      disputeScore: {
        score: config.trust.defaultScore,
        disputesWon: 0,
        disputesLost: 0,
        disputesPending: 0,
        totalDisputes: 0,
        winRate: 0,
      },
      verificationScore: {
        score: config.trust.defaultScore,
        kycStatus: 'not_started',
        kybStatus: 'not_started',
        documentsVerified: 0,
        verificationBadges: [],
        lastVerificationDate: null,
      },
      transactionScore: {
        score: config.trust.defaultScore,
        totalVolume: 0,
        transactionCount: 0,
        avgTransactionSize: 0,
        suspiciousTransactions: 0,
      },
      badges: [],
      history: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Apply factors to trust score
   */
  private applyFactors(
    trustScore: ITrustScore,
    factors: NonNullable<CalculateTrustScoreRequest['factors']>
  ): ITrustScore {
    if (factors.paymentHistory !== undefined) {
      trustScore.paymentScore.score = factors.paymentHistory;
      trustScore.paymentScore = this.calculatePaymentRate(trustScore.paymentScore);
    }
    if (factors.fulfillmentHistory !== undefined) {
      trustScore.fulfillmentScore.score = factors.fulfillmentHistory;
      trustScore.fulfillmentScore = this.calculateFulfillmentRate(trustScore.fulfillmentScore);
    }
    if (factors.disputeHistory !== undefined) {
      trustScore.disputeScore.score = factors.disputeHistory;
      trustScore.disputeScore = this.calculateDisputeWinRate(trustScore.disputeScore);
    }
    if (factors.verificationStatus !== undefined) {
      trustScore.verificationScore.score = factors.verificationStatus;
    }
    if (factors.transactionVolume !== undefined) {
      trustScore.transactionScore.totalVolume = factors.transactionVolume;
      trustScore.transactionScore.score = this.calculateTransactionScore(trustScore.transactionScore);
    }
    return trustScore;
  }

  /**
   * Recalculate overall score using weighted average
   */
  private recalculateOverallScore(trustScore: ITrustScore): ITrustScore {
    const { scoreWeights } = config.trust;

    trustScore.overallScore = Math.round(
      trustScore.paymentScore.score * scoreWeights.payment +
      trustScore.fulfillmentScore.score * scoreWeights.fulfillment +
      trustScore.disputeScore.score * scoreWeights.dispute +
      trustScore.verificationScore.score * scoreWeights.verification +
      trustScore.transactionScore.score * scoreWeights.transaction
    );

    trustScore.overallScore = Math.max(config.trust.minScore, Math.min(config.trust.maxScore, trustScore.overallScore));

    trustScore.trustLevel = this.calculateTrustLevel(trustScore.overallScore);
    trustScore.riskLevel = this.calculateRiskLevel(trustScore.overallScore);

    return trustScore;
  }

  /**
   * Calculate trust level based on score
   */
  private calculateTrustLevel(score: number): TrustLevel {
    const { levelThresholds } = config.trust;
    if (score >= levelThresholds.PREMIUM) return 'PREMIUM';
    if (score >= levelThresholds.HIGH) return 'HIGH';
    if (score >= levelThresholds.MEDIUM) return 'MEDIUM';
    if (score >= levelThresholds.LOW) return 'LOW';
    return 'UNTRUSTED';
  }

  /**
   * Calculate risk level based on score
   */
  private calculateRiskLevel(score: number): RiskLevel {
    if (score >= 90) return 'minimal';
    if (score >= 75) return 'low';
    if (score >= 50) return 'medium';
    if (score >= 25) return 'high';
    return 'critical';
  }

  /**
   * Calculate payment rate
   */
  private calculatePaymentRate(paymentScore: IPaymentScore): IPaymentScore {
    const total = paymentScore.onTimePayments + paymentScore.latePayments + paymentScore.defaultedPayments;
    paymentScore.totalPayments = total;
    paymentScore.paymentRate = total > 0 ? (paymentScore.onTimePayments / total) * 100 : 0;
    return paymentScore;
  }

  /**
   * Calculate fulfillment rate
   */
  private calculateFulfillmentRate(fulfillmentScore: IFulfillmentScore): IFulfillmentScore {
    const total = fulfillmentScore.ordersCompleted + fulfillmentScore.ordersPartial + fulfillmentScore.ordersFailed;
    fulfillmentScore.totalOrders = total;
    fulfillmentScore.fulfillmentRate = total > 0 ? (fulfillmentScore.ordersCompleted / total) * 100 : 0;
    return fulfillmentScore;
  }

  /**
   * Calculate dispute win rate
   */
  private calculateDisputeWinRate(disputeScore: IDisputeScore): IDisputeScore {
    const resolved = disputeScore.disputesWon + disputeScore.disputesLost;
    disputeScore.totalDisputes = disputeScore.disputesWon + disputeScore.disputesLost + disputeScore.disputesPending;
    disputeScore.winRate = resolved > 0 ? (disputeScore.disputesWon / resolved) * 100 : 0;
    return disputeScore;
  }

  /**
   * Calculate transaction score
   */
  private calculateTransactionScore(transactionScore: ITransactionScore): number {
    // Higher volume with lower suspicious ratio = higher score
    const volumeScore = Math.min(transactionScore.totalVolume / 1000000, 1) * 50; // Max 50 points
    const countScore = Math.min(transactionScore.transactionCount / 1000, 1) * 30; // Max 30 points
    const cleanRatio = transactionScore.transactionCount > 0
      ? 1 - (transactionScore.suspiciousTransactions / transactionScore.transactionCount)
      : 1;
    const cleanScore = cleanRatio * 20; // Max 20 points
    return Math.round(volumeScore + countScore + cleanScore);
  }
}

export default new TrustService();
