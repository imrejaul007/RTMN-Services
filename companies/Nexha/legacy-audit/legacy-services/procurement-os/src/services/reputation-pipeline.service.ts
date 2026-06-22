/**
 * Nexha ProcurementOS - Auto-Reputation Pipeline
 *
 * Post-transaction reputation updates:
 * - delivery -> delivery_score
 * - quality_check -> quality_score
 * - payment_received -> payment_score
 * - rfq_response -> communication_score
 * - negotiation_won -> negotiation_score
 */

import { randomUUID } from 'crypto';

export interface ReputationMetrics {
  deliveryScore: number;
  qualityScore: number;
  paymentScore: number;
  communicationScore: number;
  negotiationScore: number;
  overallScore: number;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze' | 'new';
}

export interface ReputationEvent {
  id: string;
  supplierId: string;
  supplierName: string;
  type: 'delivery' | 'quality' | 'payment' | 'communication' | 'negotiation';
  score: number; // 0-100
  metadata: Record<string, unknown>;
  timestamp: Date;
}

const WEIGHTS = {
  delivery: 0.25,
  quality: 0.30,
  payment: 0.20,
  communication: 0.15,
  negotiation: 0.10,
};

export class ReputationPipeline {
  private events: ReputationEvent[] = [];
  private scores: Map<string, ReputationMetrics> = new Map();

  /**
   * Record delivery event
   */
  recordDelivery(params: {
    supplierId: string;
    supplierName: string;
    onTime: boolean;
    deliveryDays: number;
    promisedDays: number;
  }): ReputationEvent {
    const score = params.onTime ? 100 : 0;
    const event: ReputationEvent = {
      id: randomUUID(),
      supplierId: params.supplierId,
      supplierName: params.supplierName,
      type: 'delivery',
      score,
      metadata: { deliveryDays: params.deliveryDays, promisedDays: params.promisedDays },
      timestamp: new Date(),
    };
    this.events.push(event);
    this.updateScore(params.supplierId, params.supplierName, 'delivery', score);
    return event;
  }

  /**
   * Record quality check event
   */
  recordQuality(params: {
    supplierId: string;
    supplierName: string;
    passed: boolean;
    defectRate?: number;
  }): ReputationEvent {
    const score = params.passed ? 100 : 0;
    const event: ReputationEvent = {
      id: randomUUID(),
      supplierId: params.supplierId,
      supplierName: params.supplierName,
      type: 'quality',
      score,
      metadata: { defectRate: params.defectRate },
      timestamp: new Date(),
    };
    this.events.push(event);
    this.updateScore(params.supplierId, params.supplierName, 'quality', score);
    return event;
  }

  /**
   * Record payment event
   */
  recordPayment(params: {
    supplierId: string;
    supplierName: string;
    onTime: boolean;
    amount: number;
  }): ReputationEvent {
    const event: ReputationEvent = {
      id: randomUUID(),
      supplierId: params.supplierId,
      supplierName: params.supplierName,
      type: 'payment',
      score: params.onTime ? 100 : 0,
      metadata: { amount: params.amount },
      timestamp: new Date(),
    };
    this.events.push(event);
    this.updateScore(params.supplierId, params.supplierName, 'payment', params.onTime ? 100 : 0);
    return event;
  }

  /**
   * Record RFQ response event
   */
  recordResponse(params: {
    supplierId: string;
    supplierName: string;
    responded: boolean;
    responseTimeHours: number;
  }): ReputationEvent {
    const score = params.responded ? 100 : 0;
    const event: ReputationEvent = {
      id: randomUUID(),
      supplierId: params.supplierId,
      supplierName: params.supplierName,
      type: 'communication',
      score,
      metadata: { responseTimeHours: params.responseTimeHours },
      timestamp: new Date(),
    };
    this.events.push(event);
    this.updateScore(params.supplierId, params.supplierName, 'communication', score);
    return event;
  }

  /**
   * Record negotiation won event
   */
  recordNegotiation(params: {
    supplierId: string;
    supplierName: string;
    finalAmount: number;
    targetAmount: number;
  }): ReputationEvent {
    const event: ReputationEvent = {
      id: randomUUID(),
      supplierId: params.supplierId,
      supplierName: params.supplierName,
      type: 'negotiation',
      score: 100,
      metadata: { finalAmount: params.finalAmount, targetAmount: params.targetAmount },
      timestamp: new Date(),
    };
    this.events.push(event);
    this.updateScore(params.supplierId, params.supplierName, 'negotiation', 100);
    return event;
  }

  /**
   * Get supplier reputation
   */
  getReputation(supplierId: string): ReputationMetrics | null {
    return this.scores.get(supplierId) || null;
  }

  /**
   * Get all reputations
   */
  getAllReputations(): Map<string, ReputationMetrics> {
    return this.scores;
  }

  /**
   * Get reputation events
   */
  getEvents(supplierId: string, limit = 50): ReputationEvent[] {
    return this.events
      .filter(e => e.supplierId === supplierId)
      .slice(-limit);
  }

  /**
   * Get top suppliers by reputation
   */
  getLeaderboard(limit = 10): Array<{ supplierId: string; supplierName: string; score: ReputationMetrics }> {
    return Array.from(this.scores.entries())
      .map(([id, score]) => ({
        supplierId: id,
        supplierName: this.events.find(e => e.supplierId === id)?.supplierName || id,
        score,
      }))
      .sort((a, b) => b.score.overallScore - a.score.overallScore)
      .slice(0, limit);
  }

  private updateScore(
    supplierId: string,
    supplierName: string,
    type: ReputationEvent['type'],
    score: number
  ): void {
    const current = this.scores.get(supplierId) || {
      deliveryScore: 70,
      qualityScore: 70,
      paymentScore: 70,
      communicationScore: 70,
      negotiationScore: 70,
      overallScore: 70,
      tier: 'new',
    };

    switch (type) {
      case 'delivery':
        current.deliveryScore = (current.deliveryScore + score) / 2;
        break;
      case 'quality':
        current.qualityScore = (current.qualityScore + score) / 2;
        break;
      case 'payment':
        current.paymentScore = (current.paymentScore + score) / 2;
        break;
      case 'communication':
        current.communicationScore = (current.communicationScore + score) / 2;
        break;
      case 'negotiation':
        current.negotiationScore = (current.negotiationScore + score) / 2;
        break;
    }

    // Weighted overall score
    current.overallScore = Math.round(
      current.deliveryScore * WEIGHTS.delivery +
      current.qualityScore * WEIGHTS.quality +
      current.paymentScore * WEIGHTS.payment +
      current.communicationScore * WEIGHTS.communication +
      current.negotiationScore * WEIGHTS.negotiation
    );

    // Update tier
    if (current.overallScore >= 90) current.tier = 'platinum';
    else if (current.overallScore >= 75) current.tier = 'gold';
    else if (current.overallScore >= 60) current.tier = 'silver';
    else if (current.overallScore >= 40) current.tier = 'bronze';
    else current.tier = 'new';

    this.scores.set(supplierId, current);
  }
}

export const reputationPipeline = new ReputationPipeline();
