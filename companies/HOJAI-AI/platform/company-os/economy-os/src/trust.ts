/**
 * TrustOS
 *
 * Reputation and Trust scoring for:
 * - Companies
 * - Users (employees)
 * - Agents
 * - Suppliers
 */

import { v4 as uuidv4 } from 'uuid';
import { ReputationScore, ReputationEvent } from './types';

// ============================================
// Store
// ============================================

const scores = new Map<string, ReputationScore>();

// ============================================
// TrustOS Service
// ============================================

export class TrustOSService {
  /**
   * Initialize a reputation score
   */
  initialize(entityId: string, entityType: 'company' | 'user' | 'agent' | 'supplier'): ReputationScore {
    const score: ReputationScore = {
      entityId,
      entityType,
      score: 50, // Start neutral
      breakdown: {
        reliability: 50,
        quality: 50,
        speed: 50,
        financial: 50,
        communication: 50,
      },
      totalTransactions: 0,
      lastUpdated: new Date().toISOString(),
      history: [],
    };

    scores.set(entityId, score);
    return score;
  }

  /**
   * Get score for an entity
   */
  get(entityId: string): ReputationScore | null {
    return scores.get(entityId) || null;
  }

  /**
   * Record a positive or negative event
   */
  recordEvent(params: {
    entityId: string;
    event: string;
    impact: number;           // +5, -3, etc.
    category?: keyof ReputationScore['breakdown'];
    referenceId?: string;
  }): ReputationScore | null {
    let score = scores.get(params.entityId);
    if (!score) {
      score = this.initialize(params.entityId, 'company');
    }

    // Apply impact
    score.score = Math.max(0, Math.min(100, score.score + params.impact));

    if (params.category && score.breakdown[params.category] !== undefined) {
      score.breakdown[params.category] = Math.max(0, Math.min(100,
        score.breakdown[params.category] + params.impact
      ));
    }

    // Record event
    const event: ReputationEvent = {
      date: new Date().toISOString(),
      event: params.event,
      impact: params.impact,
      referenceId: params.referenceId,
    };
    score.history.push(event);

    score.totalTransactions++;
    score.lastUpdated = new Date().toISOString();

    return score;
  }

  /**
   * Get trust level (badge)
   */
  getTrustLevel(score: number): { level: string; badge: string; color: string } {
    if (score >= 90) return { level: 'Platinum', badge: '💎', color: '#E5E4E2' };
    if (score >= 80) return { level: 'Gold', badge: '🥇', color: '#FFD700' };
    if (score >= 70) return { level: 'Silver', badge: '🥈', color: '#C0C0C0' };
    if (score >= 50) return { level: 'Bronze', badge: '🥉', color: '#CD7F32' };
    return { level: 'New', badge: '🆕', color: '#808080' };
  }

  /**
   * Check if entity meets trust threshold
   */
  meetsThreshold(entityId: string, minScore: number): boolean {
    const score = scores.get(entityId);
    return score ? score.score >= minScore : false;
  }

  /**
   * Get reputation leaderboard
   */
  getLeaderboard(entityType: 'company' | 'user' | 'agent' | 'supplier', limit: number = 10): ReputationScore[] {
    return Array.from(scores.values())
      .filter(s => s.entityType === entityType)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

export const trustOS = new TrustOSService();