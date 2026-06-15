import { v4 as uuidv4 } from 'uuid';
import { CreditRecord, CreditTier } from '../types';
import { creditStore } from '../models/Credit';
import { config } from '../config';
import { eventBus, ECONOMY_TOPICS } from '../utils/eventBus';
import { logger } from '../utils/logger';

function determineTier(score: number): CreditTier {
  const t = config.credit.tierThresholds;
  if (score >= t.excellent) return 'excellent';
  if (score >= t.good) return 'good';
  if (score >= t.fair) return 'fair';
  if (score >= t.poor) return 'poor';
  return 'very-poor';
}

export const creditService = {
  /**
   * Initialize a credit record for a new agent.
   */
  initialize(agentId: string): CreditRecord {
    if (creditStore.exists(agentId)) {
      return creditStore.get(agentId)!;
    }
    const now = new Date().toISOString();
    const record: CreditRecord = {
      id: `credit_${uuidv4()}`,
      agentId,
      score: 500, // neutral starting score
      tier: 'fair',
      components: {
        creditHistory: 500,
        paymentHistory: 500,
        disputeRate: 500,
        deliverySuccess: 500,
      },
      factors: {
        totalTransactions: 0,
        onTimePayments: 0,
        latePayments: 0,
        totalDisputes: 0,
        resolvedDisputes: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        accountAgeDays: 0,
      },
      lastUpdated: now,
      lastCalculated: now,
      createdAt: now,
    };
    creditStore.upsert(agentId, record);
    return record;
  },

  /**
   * Get a credit record by agentId. Initializes if not found.
   */
  get(agentId: string): CreditRecord {
    return creditStore.get(agentId) || this.initialize(agentId);
  },

  /**
   * Recalculate credit score from factors.
   * Formula: 25% credit history + 25% payment history + 25% dispute rate + 25% delivery success
   */
  async recalculate(agentId: string): Promise<CreditRecord> {
    const record = this.get(agentId);
    const factors = record.factors;
    const oldTier = record.tier;

    // Component 1: Credit History (age + volume)
    // Score: 0-1000 based on account age (max 365 days = 500) + transaction count (max 100 = 500)
    const ageScore = Math.min(500, (factors.accountAgeDays / 365) * 500);
    const volumeScore = Math.min(500, (factors.totalTransactions / 100) * 500);
    const creditHistory = Math.round(ageScore + volumeScore);

    // Component 2: Payment History
    // Ratio of on-time to total payments, scaled 0-1000
    const totalPayments = factors.onTimePayments + factors.latePayments;
    const paymentHistory = totalPayments === 0 ? 500 : Math.round((factors.onTimePayments / totalPayments) * 1000);

    // Component 3: Dispute Rate (inverse)
    // Lower disputes = higher score
    const totalDisputeActivity = factors.totalDisputes + factors.successfulDeliveries + factors.failedDeliveries;
    const disputeRate = totalDisputeActivity === 0
      ? 500
      : Math.round(1000 - (factors.totalDisputes / totalDisputeActivity) * 1000);

    // Component 4: Delivery Success
    const totalDeliveries = factors.successfulDeliveries + factors.failedDeliveries;
    const deliverySuccess = totalDeliveries === 0
      ? 500
      : Math.round((factors.successfulDeliveries / totalDeliveries) * 1000);

    // Apply 25/25/25/25 weights
    const w = config.credit.weights;
    const finalScore = Math.round(
      creditHistory * w.creditHistory +
      paymentHistory * w.paymentHistory +
      disputeRate * w.disputeRate +
      deliverySuccess * w.deliverySuccess
    );

    // Clamp to 0-1000
    const clampedScore = Math.max(0, Math.min(1000, finalScore));
    const newTier = determineTier(clampedScore);

    const now = new Date().toISOString();
    const updated: CreditRecord = {
      ...record,
      score: clampedScore,
      tier: newTier,
      components: {
        creditHistory,
        paymentHistory,
        disputeRate,
        deliverySuccess,
      },
      lastCalculated: now,
      lastUpdated: now,
    };

    creditStore.upsert(agentId, updated);

    // Publish events
    await eventBus.publish(ECONOMY_TOPICS.CREDIT_UPDATED, {
      agentId,
      oldScore: record.score,
      newScore: clampedScore,
      oldTier,
      newTier,
      components: updated.components,
    });

    if (oldTier !== newTier) {
      await eventBus.publish(ECONOMY_TOPICS.CREDIT_TIER_CHANGED, {
        agentId,
        oldTier,
        newTier,
        score: clampedScore,
      });
    }

    logger.info(`Credit recalculated for ${agentId}: ${clampedScore} (${newTier})`);
    return updated;
  },

  /**
   * Record a payment event.
   */
  async recordPayment(agentId: string, onTime: boolean): Promise<CreditRecord> {
    const record = this.get(agentId);
    record.factors.totalTransactions++;
    if (onTime) record.factors.onTimePayments++;
    else record.factors.latePayments++;
    record.lastUpdated = new Date().toISOString();
    creditStore.upsert(agentId, record);
    return this.recalculate(agentId);
  },

  /**
   * Record a dispute event.
   */
  async recordDispute(agentId: string, resolved: boolean = false): Promise<CreditRecord> {
    const record = this.get(agentId);
    record.factors.totalDisputes++;
    if (resolved) record.factors.resolvedDisputes++;
    record.lastUpdated = new Date().toISOString();
    creditStore.upsert(agentId, record);
    return this.recalculate(agentId);
  },

  /**
   * Record a delivery event.
   */
  async recordDelivery(agentId: string, successful: boolean): Promise<CreditRecord> {
    const record = this.get(agentId);
    if (successful) record.factors.successfulDeliveries++;
    else record.factors.failedDeliveries++;
    record.lastUpdated = new Date().toISOString();
    creditStore.upsert(agentId, record);
    return this.recalculate(agentId);
  },

  /**
   * Update account age in days.
   */
  async updateAccountAge(agentId: string, days: number): Promise<CreditRecord> {
    const record = this.get(agentId);
    record.factors.accountAgeDays = days;
    creditStore.upsert(agentId, record);
    return this.recalculate(agentId);
  },

  /**
   * Get top agents by credit score.
   */
  top(n: number = 10): CreditRecord[] {
    return creditStore.topScores(n);
  },

  /**
   * List all credit records.
   */
  list(): CreditRecord[] {
    return creditStore.list();
  },

  /**
   * Get statistics.
   */
  stats(): { total: number; averageScore: number; byTier: Record<CreditTier, number> } {
    const all = this.list();
    const byTier: Record<CreditTier, number> = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      'very-poor': 0,
      unrated: 0,
    };
    for (const r of all) byTier[r.tier]++;
    return {
      total: all.length,
      averageScore: creditStore.averageScore(),
      byTier,
    };
  },
};
