import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';
import {
  Decision,
  DecisionType,
  PredictionRisk
} from '../types/index.js';
import { DecisionModel } from '../models/decisionModel.js';

// ============================================================================
// DECISION SERVICE
// ============================================================================

export class DecisionService {
  /**
   * Decide cashback amount for a transaction
   */
  async decideCashback(params: {
    tenantId: string;
    userId: string;
    amount: number;
    context?: {
      sessionId?: string;
      channel?: string;
    };
  }): Promise<Decision> {
    const { tenantId, userId, amount, context } = params;

    // In production, this would use ML model
    // For now, use rule-based logic

    let cashbackPercent = 5; // Base 5%

    // Higher for larger orders
    if (amount > 5000) cashbackPercent = 8;
    else if (amount > 2000) cashbackPercent = 7;
    else if (amount > 1000) cashbackPercent = 6;

    const cashbackValue = (amount * cashbackPercent) / 100;

    const decision: Decision = {
      id: uuid(),
      tenantId,
      userId,
      type: DecisionType.CASHBACK,
      action: 'approve_cashback',
      value: cashbackPercent,
      reason: `Standard cashback of ${cashbackPercent}% for orders above ₹${amount}`,
      factors: [
        { name: 'order_amount', weight: 0.4, value: amount },
        { name: 'base_cashback', weight: 0.3, value: 5 },
        { name: 'user_tier', weight: 0.2, value: 'regular' },
        { name: 'channel', weight: 0.1, value: context?.channel || 'app' }
      ],
      model: 'cashback-v1',
      context: {
        requestId: uuid(),
        sessionId: context?.sessionId,
        channel: context?.channel,
        amount
      },
      risk: PredictionRisk.LOW,
      status: 'approved',
      createdAt: new Date()
    };

    await DecisionModel.create(decision);
    return decision;
  }

  /**
   * Decide offer eligibility
   */
  async decideOffer(params: {
    tenantId: string;
    userId: string;
    offerId: string;
    context?: Record<string, unknown>;
  }): Promise<Decision> {
    const { tenantId, userId, offerId } = params;

    // Simplified eligibility check
    const eligible = true;
    const score = 0.85;

    const decision: Decision = {
      id: uuid(),
      tenantId,
      userId,
      type: DecisionType.OFFER,
      action: eligible ? 'approve_offer' : 'reject_offer',
      value: score,
      reason: eligible
        ? 'User meets eligibility criteria for this offer'
        : 'User does not meet offer eligibility requirements',
      factors: [
        { name: 'eligibility_score', weight: 0.5, value: score },
        { name: 'user_segment', weight: 0.3, value: 'active' },
        { name: 'offer_type', weight: 0.2, value: 'standard' }
      ],
      model: 'offer-eligibility-v1',
      context: {
        requestId: uuid(),
        channel: 'app'
      },
      risk: PredictionRisk.LOW,
      status: eligible ? 'approved' : 'rejected',
      createdAt: new Date()
    };

    await DecisionModel.create(decision);
    return decision;
  }

  /**
   * Decide targeting for a campaign
   */
  async decideTargeting(params: {
    tenantId: string;
    campaignId: string;
    userId: string;
    context?: Record<string, unknown>;
  }): Promise<Decision> {
    const { tenantId, campaignId, userId } = params;

    const targetingScore = 0.78;
    const segments = ['active', 'high_value', 'frequent_buyer'];

    const decision: Decision = {
      id: uuid(),
      tenantId,
      userId,
      type: DecisionType.TARGETING,
      action: targetingScore > 0.5 ? 'include' : 'exclude',
      value: targetingScore,
      reason: `User matches ${segments.length} target segments`,
      factors: segments.map((segment, i) => ({
        name: segment,
        weight: 0.33,
        value: true
      })),
      model: 'targeting-v1',
      context: {
        requestId: uuid(),
        campaignId
      },
      risk: PredictionRisk.LOW,
      status: 'approved',
      createdAt: new Date()
    };

    await DecisionModel.create(decision);
    return decision;
  }

  /**
   * Decide fraud risk
   */
  async decideFraud(params: {
    tenantId: string;
    userId: string;
    transactionData: {
      amount: number;
      velocity: number;
      riskSignals: string[];
    };
  }): Promise<Decision> {
    const { tenantId, userId, transactionData } = params;

    const { amount, velocity, riskSignals } = transactionData;

    // Calculate fraud score
    let fraudScore = 0.1; // Base 10%

    if (velocity > 5) fraudScore += 0.2;
    if (riskSignals.length > 2) fraudScore += 0.3;
    if (amount > 50000) fraudScore += 0.2;

    const risk = fraudScore > 0.7 ? PredictionRisk.HIGH :
                 fraudScore > 0.4 ? PredictionRisk.MEDIUM :
                 PredictionRisk.LOW;

    const decision: Decision = {
      id: uuid(),
      tenantId,
      userId,
      type: DecisionType.FRAUD,
      action: fraudScore > 0.7 ? 'block' : fraudScore > 0.4 ? 'review' : 'approve',
      value: fraudScore,
      reason: fraudScore > 0.7
        ? 'High fraud risk detected - blocking transaction'
        : fraudScore > 0.4
          ? 'Moderate fraud risk - requires manual review'
          : 'Low fraud risk - transaction approved',
      factors: [
        { name: 'transaction_velocity', weight: 0.3, value: velocity },
        { name: 'amount', weight: 0.25, value: amount },
        { name: 'risk_signals', weight: 0.3, value: riskSignals.length },
        { name: 'historical_fraud', weight: 0.15, value: 0 }
      ],
      model: 'fraud-v1',
      context: {
        requestId: uuid(),
        amount
      },
      risk,
      fraudScore,
      status: risk === PredictionRisk.HIGH ? 'rejected' :
              risk === PredictionRisk.MEDIUM ? 'manual_review' : 'approved',
      createdAt: new Date()
    };

    await DecisionModel.create(decision);
    return decision;
  }

  /**
   * Get decision by ID
   */
  async getDecision(tenantId: string, decisionId: string): Promise<Decision | null> {
    const decision = await DecisionModel.findOne({ _id: decisionId, tenantId });
    return decision ? (decision.toObject() as Decision) : null;
  }

  /**
   * Get decisions for a user
   */
  async getUserDecisions(params: {
    tenantId: string;
    userId: string;
    type?: DecisionType;
    limit?: number;
    offset?: number;
  }): Promise<{ decisions: Decision[]; total: number }> {
    const { tenantId, userId, type, limit = 50, offset = 0 } = params;

    const query: Record<string, unknown> = { tenantId, userId };
    if (type) query.type = type;

    const [decisions, total] = await Promise.all([
      DecisionModel.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit),
      DecisionModel.countDocuments(query)
    ]);

    return {
      decisions: decisions.map(d => d.toObject() as Decision),
      total
    };
  }

  /**
   * Approve/reject a decision (manual review)
   */
  async reviewDecision(params: {
    tenantId: string;
    decisionId: string;
    action: 'approve' | 'reject';
    reviewerId: string;
    notes?: string;
  }): Promise<Decision | null> {
    const { tenantId, decisionId, action, reviewerId } = params;

    const decision = await DecisionModel.findOneAndUpdate(
      { _id: decisionId, tenantId, status: 'manual_review' },
      {
        $set: {
          status: action === 'approve' ? 'approved' : 'rejected',
          reviewedBy: reviewerId,
          reviewedAt: new Date()
        }
      },
      { new: true }
    );

    return decision ? (decision.toObject() as Decision) : null;
  }

  /**
   * Get pending manual reviews
   */
  async getPendingReviews(tenantId: string, limit = 50): Promise<Decision[]> {
    const decisions = await DecisionModel.find({
      tenantId,
      status: 'manual_review'
    })
      .sort({ createdAt: 1 })
      .limit(limit);

    return decisions.map(d => d.toObject() as Decision);
  }
}

export const decisionService = new DecisionService();
