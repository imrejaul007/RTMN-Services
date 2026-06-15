import { v4 as uuidv4 } from 'uuid';
import {
  TrustRecord,
  TrustEvent,
  TrustEventType,
  TrustComponents,
  TrustFactors,
  TrustTier,
  ScoreBreakdown,
  ComponentBreakdown,
  BonusBreakdown,
  PenaltyBreakdown,
} from '../types';
import { trustStore } from '../models/Trust';
import { config } from '../config';
import { eventBus, TRUST_TOPICS } from '../utils/eventBus';
import { logger } from '../utils/logger';
import { NotFoundError, InsufficientDataError } from '../utils/errors';

/**
 * Default factors for a new entity.
 */
function defaultFactors(): TrustFactors {
  return {
    accountAgeDays: 0,
    totalTransactionVolume: 0,
    totalTransactionCount: 0,
    transactionTypeDiversity: 0,
    totalPayments: 0,
    onTimePayments: 0,
    latePayments: 0,
    failedPayments: 0,
    avgPaymentDaysEarly: 0,
    totalDisputes: 0,
    disputesWon: 0,
    disputesLost: 0,
    disputesPending: 0,
    totalDisputeValue: 0,
    totalDeliveries: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    returnedDeliveries: 0,
    avgDeliveryDays: 0,
    onTimeDeliveryRate: 0,
    verified: false,
    identityVerified: false,
    totalReviews: 0,
    positiveReviews: 0,
    negativeReviews: 0,
    avgRating: 0,
    totalSLAs: 0,
    slasMet: 0,
    slasBreached: 0,
  };
}

/**
 * Determine trust tier from score.
 */
function determineTier(score: number): TrustTier {
  const t = config.trust.tiers;
  if (score >= t.excellent) return 'excellent';
  if (score >= t.good) return 'good';
  if (score >= t.fair) return 'fair';
  if (score >= t.poor) return 'poor';
  return 'untrusted';
}

/**
 * Calculate credit history component (0-1000).
 */
function calcCreditHistory(f: TrustFactors): ComponentBreakdown {
  const w = config.trust.components.creditHistory;
  const subFactors: Record<string, number> = {};

  // Account age score (max 1000 * 0.4 = 400)
  const ageScore = Math.min(1000, (f.accountAgeDays / 365) * 1000);
  subFactors.accountAge = ageScore;

  // Transaction volume score (max 1000 * 0.3 = 300)
  const volScore = Math.min(1000, Math.log10(Math.max(1, f.totalTransactionVolume) + 1) * 200);
  subFactors.transactionVolume = volScore;

  // Transaction count score (max 1000 * 0.2 = 200)
  const countScore = Math.min(1000, (f.totalTransactionCount / 100) * 1000);
  subFactors.transactionCount = countScore;

  // Diversity score (max 1000 * 0.1 = 100)
  const diversityScore = (f.transactionTypeDiversity / 10) * 1000;
  subFactors.diversity = diversityScore;

  const rawScore = ageScore + volScore + countScore + diversityScore;
  return {
    rawScore: Math.round(rawScore),
    weightedScore: Math.round(rawScore * w.creditHistory),
    subFactors,
    weight: w.creditHistory,
  };
}

/**
 * Calculate payment history component (0-1000).
 */
function calcPaymentHistory(f: TrustFactors): ComponentBreakdown {
  const w = config.trust.components.paymentHistory;
  const subFactors: Record<string, number> = {};

  // On-time rate (max 1000 * 0.5 = 500)
  const totalPayments = f.onTimePayments + f.latePayments + f.failedPayments;
  const onTimeRate = totalPayments > 0 ? (f.onTimePayments / totalPayments) * 1000 : 500;
  subFactors.onTimeRate = Math.round(onTimeRate);

  // Average payment time (max 1000 * 0.3 = 300)
  // Positive = early, negative = late. Scale to 0-1000.
  const paymentTimeScore = Math.max(0, Math.min(1000, 500 + f.avgPaymentDaysEarly * 20));
  subFactors.avgPaymentTime = Math.round(paymentTimeScore);

  // Payment method diversity bonus (max 1000 * 0.2 = 200)
  // Assume multiple methods if they exist
  const methodDiversityScore = Math.min(1000, 500 + (f.totalPayments > 10 ? 500 : f.totalPayments * 50));
  subFactors.paymentMethodDiversity = Math.round(methodDiversityScore);

  const rawScore = onTimeRate * 0.5 + paymentTimeScore * 0.3 + methodDiversityScore * 0.2;
  return {
    rawScore: Math.round(rawScore),
    weightedScore: Math.round(rawScore * w.paymentHistory),
    subFactors,
    weight: w.paymentHistory,
  };
}

/**
 * Calculate dispute rate component (0-1000, inverse).
 * Lower disputes = higher score.
 */
function calcDisputeRate(f: TrustFactors): ComponentBreakdown {
  const w = config.trust.components.disputeRate;
  const subFactors: Record<string, number> = {};

  // Dispute rate (max 1000 * 0.6 = 600)
  // Total transactions as denominator
  const totalActivity = f.totalTransactionCount || 1;
  const disputeRate = (f.totalDisputes / totalActivity);
  // Inverse: 0 disputes = 1000, 100% disputes = 0
  const disputeScore = Math.max(0, 1000 * (1 - disputeRate * 10));
  subFactors.disputeRate = Math.round(disputeScore);

  // Resolution rate (max 1000 * 0.3 = 300)
  const resolutionRate = f.totalDisputes > 0 ? (f.disputesWon / f.totalDisputes) * 1000 : 500;
  subFactors.disputeResolutionRate = Math.round(resolutionRate);

  // Severity (max 1000 * 0.1 = 100) - lower dispute value = better
  const avgDisputeValue = f.totalDisputes > 0 ? f.totalDisputeValue / f.totalDisputes : 0;
  const severityScore = Math.max(0, 1000 - avgDisputeValue / 10);
  subFactors.disputeSeverity = Math.round(severityScore);

  const rawScore = disputeScore * 0.6 + resolutionRate * 0.3 + severityScore * 0.1;
  return {
    rawScore: Math.round(rawScore),
    weightedScore: Math.round(rawScore * w.disputeRate),
    subFactors,
    weight: w.disputeRate,
  };
}

/**
 * Calculate delivery success component (0-1000).
 */
function calcDeliverySuccess(f: TrustFactors): ComponentBreakdown {
  const w = config.trust.components.deliverySuccess;
  const subFactors: Record<string, number> = {};

  // Success rate (max 1000 * 0.5 = 500)
  const totalDeliveries = f.successfulDeliveries + f.failedDeliveries + f.returnedDeliveries;
  const successRate = totalDeliveries > 0 ? (f.successfulDeliveries / totalDeliveries) * 1000 : 500;
  subFactors.successRate = Math.round(successRate);

  // On-time delivery rate (max 1000 * 0.3 = 300)
  subFactors.onTimeDeliveryRate = Math.round(f.onTimeDeliveryRate * 1000);

  // Return rate (max 1000 * 0.2 = 200) - inverse
  const returnRate = totalDeliveries > 0 ? (f.returnedDeliveries / totalDeliveries) : 0;
  const returnScore = Math.max(0, 1000 * (1 - returnRate * 5));
  subFactors.returnRate = Math.round(returnScore);

  const rawScore = successRate * 0.5 + f.onTimeDeliveryRate * 1000 * 0.3 + returnScore * 0.2;
  return {
    rawScore: Math.round(rawScore),
    weightedScore: Math.round(rawScore * w.deliverySuccess),
    subFactors,
    weight: w.deliverySuccess,
  };
}

export const trustService = {
  /**
   * Initialize a trust record for a new entity.
   */
  initialize(entityId: string, entityType: string = 'agent'): TrustRecord {
    if (trustStore.exists(entityId)) {
      return trustStore.getRecord(entityId)!;
    }
    const now = new Date().toISOString();
    const record: TrustRecord = {
      id: `trust_${uuidv4()}`,
      entityId,
      entityType,
      score: 500, // neutral starting score
      tier: 'fair',
      components: {
        creditHistory: 500,
        paymentHistory: 500,
        disputeRate: 500,
        deliverySuccess: 500,
      },
      factors: defaultFactors(),
      events: [],
      history: [],
      lastUpdated: now,
      lastCalculated: now,
      createdAt: now,
    };
    trustStore.upsertRecord(entityId, record);
    logger.info(`Trust record initialized for ${entityId}`);
    return record;
  },

  /**
   * Get trust record.
   */
  get(entityId: string): TrustRecord {
    const record = trustStore.getRecord(entityId);
    if (!record) return this.initialize(entityId);
    return record;
  },

  /**
   * Record a trust event and update factors.
   */
  async recordEvent(input: {
    entityId: string;
    type: TrustEventType;
    details?: Record<string, any>;
    weight?: number;
    timestamp?: string;
  }): Promise<TrustRecord> {
    let record = trustStore.getRecord(input.entityId);
    if (!record) {
      record = this.initialize(input.entityId);
    }

    const timestamp = input.timestamp || new Date().toISOString();
    const event: TrustEvent = {
      id: `tevt_${uuidv4()}`,
      entityId: input.entityId,
      type: input.type,
      weight: input.weight || 1,
      impact: 0,
      details: input.details || {},
      timestamp,
    };

    // Update factors based on event type
    const f = record.factors;
    switch (input.type) {
      case 'payment_completed':
        f.totalPayments++;
        f.onTimePayments++;
        if (input.details?.daysEarly !== undefined) {
          f.avgPaymentDaysEarly = (f.avgPaymentDaysEarly * (f.totalPayments - 1) + input.details.daysEarly) / f.totalPayments;
        }
        break;
      case 'payment_late':
        f.totalPayments++;
        f.latePayments++;
        break;
      case 'payment_failed':
        f.totalPayments++;
        f.failedPayments++;
        break;
      case 'dispute_opened':
        f.totalDisputes++;
        if (input.details?.value) f.totalDisputeValue += input.details.value;
        break;
      case 'dispute_resolved':
        f.disputesWon++;
        break;
      case 'dispute_lost':
        f.disputesLost++;
        break;
      case 'delivery_completed':
        f.totalDeliveries++;
        f.successfulDeliveries++;
        if (input.details?.days !== undefined) f.avgDeliveryDays = input.details.days;
        if (input.details?.onTime !== undefined && input.details.onTime) {
          f.onTimeDeliveryRate = (f.onTimeDeliveryRate * (f.totalDeliveries - 1) + 1) / f.totalDeliveries;
        }
        break;
      case 'delivery_failed':
        f.totalDeliveries++;
        f.failedDeliveries++;
        break;
      case 'delivery_returned':
        f.totalDeliveries++;
        f.returnedDeliveries++;
        break;
      case 'account_created':
        f.accountAgeDays = 1;
        break;
      case 'verification_completed':
        f.verified = true;
        break;
      case 'review_received':
        f.totalReviews++;
        if (input.details?.rating >= 4) f.positiveReviews++;
        if (input.details?.rating <= 2) f.negativeReviews++;
        f.avgRating = (f.avgRating * (f.totalReviews - 1) + (input.details?.rating || 3)) / f.totalReviews;
        break;
      case 'sla_met':
        f.totalSLAs++;
        f.slasMet++;
        break;
      case 'sla_breached':
        f.totalSLAs++;
        f.slasBreached++;
        break;
      case 'contract_completed':
      case 'contract_breached':
        f.totalTransactionCount++;
        if (input.details?.volume) f.totalTransactionVolume += input.details.volume;
        if (input.details?.type) f.transactionTypeDiversity = Math.min(10, f.transactionTypeDiversity + 0.5);
        break;
    }

    // Recalculate score
    const result = this.recalculate(record.entityId);
    trustStore.addEvent(input.entityId, event);

    await eventBus.publish(TRUST_TOPICS.TRUST_EVENT_RECORDED, {
      entityId: input.entityId,
      eventType: input.type,
      newScore: result.score,
      tier: result.tier,
    });

    return trustStore.getRecord(input.entityId)!;
  },

  /**
   * Recalculate trust score from factors.
   */
  recalculate(entityId: string): { score: number; tier: TrustTier } {
    let record = trustStore.getRecord(entityId);
    if (!record) {
      record = this.initialize(entityId);
    }

    const f = record.factors;
    const oldTier = record.tier;
    const now = new Date().toISOString();

    // Calculate each component
    const creditBreakdown = calcCreditHistory(f);
    const paymentBreakdown = calcPaymentHistory(f);
    const disputeBreakdown = calcDisputeRate(f);
    const deliveryBreakdown = calcDeliverySuccess(f);

    // Calculate bonuses
    const bonuses: BonusBreakdown = {
      verificationBonus: f.verified ? 25 : 0,
      reviewBonus: f.avgRating > 4 ? 20 : f.avgRating > 3 ? 10 : 0,
      slaBonus: f.totalSLAs > 0 ? (f.slasMet / f.totalSLAs) * 15 : 0,
      total: 0,
    };
    bonuses.total = bonuses.verificationBonus + bonuses.reviewBonus + bonuses.slaBonus;

    // Calculate penalties
    const penalties: PenaltyBreakdown = {
      disputePenalty: f.totalDisputes > 0 ? Math.min(50, f.totalDisputes * 5) : 0,
      latePaymentPenalty: f.latePayments > 0 ? Math.min(30, f.latePayments * 3) : 0,
      failedDeliveryPenalty: f.failedDeliveries > 0 ? Math.min(30, f.failedDeliveries * 5) : 0,
      total: 0,
    };
    penalties.total = penalties.disputePenalty + penalties.latePaymentPenalty + penalties.failedDeliveryPenalty;

    // Apply 25/25/25/25 weighted formula
    const w = config.trust.weights;
    const baseScore =
      creditBreakdown.rawScore * w.creditHistory +
      paymentBreakdown.rawScore * w.paymentHistory +
      disputeBreakdown.rawScore * w.disputeRate +
      deliveryBreakdown.rawScore * w.deliverySuccess;

    // Normalize to 0-1000
    const maxRawScore = 4000; // 4 components * 1000 max
    let finalScore = (baseScore / maxRawScore) * 1000;

    // Apply bonuses
    finalScore = Math.min(1000, finalScore + bonuses.total);

    // Apply penalties
    finalScore = Math.max(0, finalScore - penalties.total);

    // Round and clamp
    finalScore = Math.round(Math.max(0, Math.min(1000, finalScore)));
    const newTier = determineTier(finalScore);

    // Update record
    const breakdown: ScoreBreakdown = {
      creditHistory: creditBreakdown,
      paymentHistory: paymentBreakdown,
      disputeRate: disputeBreakdown,
      deliverySuccess: deliveryBreakdown,
      bonuses,
      penalties,
      finalScore,
    };

    record.score = finalScore;
    record.tier = newTier;
    record.components = {
      creditHistory: creditBreakdown.rawScore,
      paymentHistory: paymentBreakdown.rawScore,
      disputeRate: disputeBreakdown.rawScore,
      deliverySuccess: deliveryBreakdown.rawScore,
    };
    record.lastCalculated = now;
    record.lastUpdated = now;

    // Add history entry
    record.history.push({
      timestamp: now,
      score: finalScore,
      tier: newTier,
      change: finalScore - record.score,
      reason: 'Recalculated from factors',
    });
    if (record.history.length > 100) record.history = record.history.slice(-100);

    trustStore.upsertRecord(entityId, record);

    // Publish tier change event
    if (oldTier !== newTier) {
      eventBus.publish(TRUST_TOPICS.TRUST_TIER_CHANGED, {
        entityId,
        oldTier,
        newTier,
        score: finalScore,
      });
    }

    eventBus.publish(TRUST_TOPICS.TRUST_CALCULATED, {
      entityId,
      score: finalScore,
      tier: newTier,
      breakdown,
    });

    logger.info(`Trust recalculated for ${entityId}: ${finalScore} (${newTier})`);
    return { score: finalScore, tier: newTier };
  },

  /**
   * Get trust history.
   */
  getHistory(entityId: string, limit: number = 50): TrustRecord['history'] {
    const record = this.get(entityId);
    return record.history.slice(-limit);
  },

  /**
   * Get trust events.
   */
  getEvents(entityId: string, limit: number = 50): TrustEvent[] {
    return trustStore.getEvents(entityId, limit);
  },

  /**
   * List all trust records.
   */
  list(): TrustRecord[] {
    return trustStore.list();
  },

  /**
   * List by tier.
   */
  listByTier(tier: TrustTier): TrustRecord[] {
    return trustStore.listByTier(tier);
  },

  /**
   * Top N by trust score.
   */
  top(n: number = 10): TrustRecord[] {
    return trustStore.topScores(n);
  },

  /**
   * Compare multiple entities.
   */
  compare(entityIds: string[]): Array<{ entityId: string; score: number; tier: TrustTier; rank: number }> {
    const records = entityIds.map((id) => ({
      entityId: id,
      record: this.get(id),
    }));
    records.sort((a, b) => b.record.score - a.record.score);
    return records.map((r, idx) => ({
      entityId: r.entityId,
      score: r.record.score,
      tier: r.record.tier,
      rank: idx + 1,
    }));
  },

  /**
   * Get audit log.
   */
  getAuditLog(entityId?: string, limit: number = 100) {
    return trustStore.getAuditLog(entityId, limit);
  },

  /**
   * Statistics.
   */
  stats(): { total: number; byTier: Record<TrustTier, number>; averageScore: number; topEntity: { id: string; score: number } | null } {
    const all = this.list();
    const byTier: Record<TrustTier, number> = { excellent: 0, good: 0, fair: 0, poor: 0, untrusted: 0 };
    for (const r of all) byTier[r.tier]++;
    const avg = all.length > 0 ? Math.round(all.reduce((s, r) => s + r.score, 0) / all.length) : 0;
    const top = all.sort((a, b) => b.score - a.score)[0];
    return {
      total: all.length,
      byTier,
      averageScore: avg,
      topEntity: top ? { id: top.entityId, score: top.score } : null,
    };
  },
};
