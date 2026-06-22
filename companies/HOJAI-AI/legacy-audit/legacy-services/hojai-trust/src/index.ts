/**
 * HOJAI Trust - Trust and Reputation System
 *
 * Provides comprehensive trust scoring for agents and users,
 * including quality metrics, reputation tracking, and fraud detection.
 *
 * @module @hojai/trust
 * @version 1.0.0
 */

// Re-export modules
export * from './agentScore';
export * from './userTrust';

// ============================================================================
// Shared Types
// ============================================================================

/**
 * Trust score range
 */
export type TrustLevel = 'critical' | 'low' | 'medium' | 'high' | 'excellent';

/**
 * Score dimension for trust evaluation
 */
export interface ScoreDimension {
  name: string;
  score: number; // 0-100
  weight: number; // 0-1
  trend: 'up' | 'down' | 'stable';
  sampleSize: number;
  lastUpdated: Date;
}

/**
 * Overall trust score
 */
export interface TrustScore {
  entityId: string;
  entityType: 'agent' | 'user' | 'tenant';
  overall: number; // 0-100
  level: TrustLevel;
  dimensions: ScoreDimension[];
  totalEvaluations: number;
  periodStart: Date;
  periodEnd: Date;
  confidence: number; // 0-1, based on sample size
  trend: 'up' | 'down' | 'stable';
}

/**
 * Evaluation feedback
 */
export interface Feedback {
  id: string;
  entityId: string;
  evaluatorId: string;
  rating: number; // 1-5
  dimensions: Record<string, number>; // dimension name -> score
  comment?: string;
  tags: string[];
  createdAt: Date;
}

/**
 * Trust event types
 */
export enum TrustEventType {
  POSITIVE_INTERACTION = 'positive_interaction',
  NEGATIVE_INTERACTION = 'negative_interaction',
  RESOLUTION = 'resolution',
  ESCALATION = 'escalation',
  FRAUD_REPORTED = 'fraud_reported',
  FRAUD_CLEARED = 'fraud_cleared',
  ACCOUNT_FLAGGED = 'account_flagged',
  ACCOUNT_CLEARED = 'account_cleared',
  VERIFICATION_PASSED = 'verification_passed',
  VERIFICATION_FAILED = 'verification_failed',
}

/**
 * Trust event
 */
export interface TrustEvent {
  id: string;
  entityId: string;
  eventType: TrustEventType;
  score: number; // positive or negative delta
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Trust score configuration
 */
export interface TrustConfig {
  /** Minimum score threshold */
  minScore?: number;
  /** Maximum score threshold */
  maxScore?: number;
  /** Decay factor for old evaluations */
  decayFactor?: number;
  /** Minimum evaluations before publishing score */
  minEvaluations?: number;
  /** Score update window in days */
  updateWindowDays?: number;
}

/**
 * Default trust configuration
 */
const DEFAULT_CONFIG: Required<TrustConfig> = {
  minScore: 0,
  maxScore: 100,
  decayFactor: 0.95,
  minEvaluations: 5,
  updateWindowDays: 30,
};

/**
 * HOJAI Trust Engine
 *
 * Central engine for trust and reputation management.
 *
 * @example
 * ```typescript
 * import { TrustEngine } from '@hojai/trust';
 *
 * const trustEngine = new TrustEngine({
 *   minEvaluations: 10,
 *   decayFactor: 0.9,
 * });
 *
 * // Record an interaction
 * await trustEngine.recordEvent({
 *   entityId: 'agent-123',
 *   eventType: TrustEventType.POSITIVE_INTERACTION,
 *   score: 10,
 * });
 *
 * // Get trust score
 * const score = await trustEngine.getTrustScore('agent-123', 'agent');
 * console.log(`Trust level: ${score.level}`);
 * ```
 */
export class TrustEngine {
  private config: Required<TrustConfig>;
  private scores: Map<string, TrustScore> = new Map();
  private events: TrustEvent[] = [];
  private feedback: Feedback[] = [];

  constructor(config: TrustConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<TrustConfig>> {
    return { ...this.config };
  }

  /**
   * Record a trust event
   */
  async recordEvent(event: Omit<TrustEvent, 'id' | 'createdAt'>): Promise<TrustEvent> {
    const fullEvent: TrustEvent = {
      ...event,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    this.events.push(fullEvent);

    // Update score
    await this.updateScore(event.entityId);

    return fullEvent;
  }

  /**
   * Record feedback for an entity
   */
  async recordFeedback(feedback: Omit<Feedback, 'id' | 'createdAt'>): Promise<Feedback> {
    const fullFeedback: Feedback = {
      ...feedback,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    this.feedback.push(fullFeedback);

    // Trigger trust event based on rating
    const eventType = feedback.rating >= 4
      ? TrustEventType.POSITIVE_INTERACTION
      : feedback.rating <= 2
        ? TrustEventType.NEGATIVE_INTERACTION
        : null;

    if (eventType) {
      await this.recordEvent({
        entityId: feedback.entityId,
        eventType,
        score: (feedback.rating - 3) * 5, // Map 1-5 to -10 to +10
        reason: `Feedback: ${feedback.comment || 'No comment'}`,
        metadata: { feedbackId: fullFeedback.id, dimensions: feedback.dimensions },
      });
    }

    return fullFeedback;
  }

  /**
   * Get trust score for an entity
   */
  async getTrustScore(
    entityId: string,
    entityType: 'agent' | 'user' | 'tenant' = 'user'
  ): Promise<TrustScore | null> {
    return this.scores.get(`${entityType}:${entityId}`) || null;
  }

  /**
   * Get trust level from score
   */
  getTrustLevel(score: number): TrustLevel {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    if (score >= 20) return 'low';
    return 'critical';
  }

  /**
   * Get score trend from historical data
   */
  getScoreTrend(entityId: string, windowDays: number = 7): 'up' | 'down' | 'stable' {
    const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const recentEvents = this.events.filter(
      (e) => e.entityId === entityId && e.createdAt >= cutoff
    );

    if (recentEvents.length < 3) return 'stable';

    const halfPoint = Math.floor(recentEvents.length / 2);
    const firstHalf = recentEvents.slice(0, halfPoint);
    const secondHalf = recentEvents.slice(halfPoint);

    const firstAvg = firstHalf.reduce((sum, e) => sum + e.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, e) => sum + e.score, 0) / secondHalf.length;

    const threshold = 2;
    if (secondAvg - firstAvg > threshold) return 'up';
    if (firstAvg - secondAvg > threshold) return 'down';
    return 'stable';
  }

  /**
   * Query trust events
   */
  async queryEvents(filters: {
    entityId?: string;
    eventType?: TrustEventType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<TrustEvent[]> {
    let results = [...this.events];

    if (filters.entityId) {
      results = results.filter((e) => e.entityId === filters.entityId);
    }
    if (filters.eventType) {
      results = results.filter((e) => e.eventType === filters.eventType);
    }
    if (filters.startDate) {
      results = results.filter((e) => e.createdAt >= filters.startDate!);
    }
    if (filters.endDate) {
      results = results.filter((e) => e.createdAt <= filters.endDate!);
    }

    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Query feedback
   */
  async queryFeedback(filters: {
    entityId?: string;
    evaluatorId?: string;
    minRating?: number;
    maxRating?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Feedback[]> {
    let results = [...this.feedback];

    if (filters.entityId) {
      results = results.filter((f) => f.entityId === filters.entityId);
    }
    if (filters.evaluatorId) {
      results = results.filter((f) => f.evaluatorId === filters.evaluatorId);
    }
    if (filters.minRating !== undefined) {
      results = results.filter((f) => f.rating >= filters.minRating!);
    }
    if (filters.maxRating !== undefined) {
      results = results.filter((f) => f.rating <= filters.maxRating!);
    }
    if (filters.startDate) {
      results = results.filter((f) => f.createdAt >= filters.startDate!);
    }
    if (filters.endDate) {
      results = results.filter((f) => f.createdAt <= filters.endDate!);
    }

    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Get top entities by trust score
   */
  async getTopEntities(
    entityType: 'agent' | 'user' | 'tenant',
    limit: number = 10
  ): Promise<TrustScore[]> {
    const scores = Array.from(this.scores.values())
      .filter((s) => s.entityType === entityType)
      .sort((a, b) => b.overall - a.overall);

    return scores.slice(0, limit);
  }

  /**
   * Update trust score for an entity
   */
  private async updateScore(entityId: string): Promise<void> {
    const windowStart = new Date(
      Date.now() - this.config.updateWindowDays * 24 * 60 * 60 * 1000
    );

    const events = await this.queryEvents({
      entityId,
      startDate: windowStart,
    });

    if (events.length < this.config.minEvaluations) {
      return;
    }

    // Calculate base score from events
    let totalScore = 50; // Start at neutral
    let totalWeight = 1;

    for (let i = 0; i < events.length; i++) {
      const age = (events.length - i) / events.length;
      const weight = Math.pow(this.config.decayFactor, i) * age;
      totalScore += events[i].score * weight;
      totalWeight += weight;
    }

    const normalizedScore = Math.max(
      this.config.minScore,
      Math.min(this.config.maxScore, totalScore / totalWeight)
    );

    // Calculate dimensions
    const dimensions: ScoreDimension[] = [
      {
        name: 'quality',
        score: this.calculateDimensionScore(events, ['quality', 'accuracy']),
        weight: 0.3,
        trend: this.getDimensionTrend(entityId, 'quality'),
        sampleSize: events.length,
        lastUpdated: new Date(),
      },
      {
        name: 'reliability',
        score: this.calculateDimensionScore(events, ['reliability', 'consistency']),
        weight: 0.25,
        trend: this.getDimensionTrend(entityId, 'reliability'),
        sampleSize: events.length,
        lastUpdated: new Date(),
      },
      {
        name: 'responsiveness',
        score: this.calculateDimensionScore(events, ['speed', 'responsiveness', 'timing']),
        weight: 0.2,
        trend: this.getDimensionTrend(entityId, 'responsiveness'),
        sampleSize: events.length,
        lastUpdated: new Date(),
      },
      {
        name: 'safety',
        score: this.calculateDimensionScore(events, ['safety', 'accuracy', 'appropriateness']),
        weight: 0.25,
        trend: this.getDimensionTrend(entityId, 'safety'),
        sampleSize: events.length,
        lastUpdated: new Date(),
      },
    ];

    // Calculate confidence based on sample size
    const confidence = Math.min(1, events.length / (this.config.minEvaluations * 5));

    // Determine entity type from first event or default to user
    const entityType = 'user';

    const score: TrustScore = {
      entityId,
      entityType,
      overall: Math.round(normalizedScore),
      level: this.getTrustLevel(normalizedScore),
      dimensions,
      totalEvaluations: events.length,
      periodStart: windowStart,
      periodEnd: new Date(),
      confidence,
      trend: this.getScoreTrend(entityId),
    };

    this.scores.set(`${entityType}:${entityId}`, score);
  }

  /**
   * Calculate score for a specific dimension
   */
  private calculateDimensionScore(
    events: TrustEvent[],
    keywords: string[]
  ): number {
    const matchingEvents = events.filter(
      (e) => e.reason && keywords.some((k) => e.reason!.toLowerCase().includes(k))
    );

    if (matchingEvents.length === 0) {
      return 50; // Default neutral score
    }

    const avgScore = matchingEvents.reduce((sum, e) => sum + e.score, 0) / matchingEvents.length;
    return Math.max(0, Math.min(100, 50 + avgScore));
  }

  /**
   * Get trend for a dimension
   */
  private getDimensionTrend(entityId: string, dimension: string): 'up' | 'down' | 'stable' {
    // Simplified - in production would track dimension-specific trends
    return this.getScoreTrend(entityId);
  }
}

/**
 * Score weight configuration for different entity types
 */
export const AGENT_SCORE_WEIGHTS = {
  accuracy: 0.30,
  helpfulness: 0.25,
  safety: 0.20,
  coherence: 0.15,
  efficiency: 0.10,
};

export const USER_SCORE_WEIGHTS = {
  engagement: 0.25,
  quality: 0.25,
  reliability: 0.20,
  safety: 0.15,
  growth: 0.15,
};

export default TrustEngine;


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-trust',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe (for Kubernetes)
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe (for Kubernetes)
app.get('/health/ready', async (req, res) => {
  try {
    // Add readiness checks here (DB connection, etc.)
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
