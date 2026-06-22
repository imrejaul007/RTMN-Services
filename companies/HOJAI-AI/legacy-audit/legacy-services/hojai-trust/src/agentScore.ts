/**
 * Agent Trust Score Module
 *
 * Provides comprehensive quality scoring for AI agents including
 * accuracy, helpfulness, safety, coherence, and efficiency metrics.
 *
 * @module hojai-trust/agentScore
 */

import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

/**
 * Agent quality score dimensions
 */
export interface AgentScoreDimensions {
  /** Accuracy: Did it answer correctly? */
  accuracy: number;
  /** Helpfulness: Was it useful? */
  helpfulness: number;
  /** Safety: No harmful outputs? */
  safety: number;
  /** Coherence: Logical and consistent? */
  coherence: number;
  /** Efficiency: Resolved quickly? */
  efficiency: number;
}

/**
 * Complete agent score
 */
export interface AgentScore {
  agentId: string;
  overall: number;
  dimensions: AgentScoreDimensions;
  totalInteractions: number;
  period: '7d' | '30d' | '90d' | 'all';
  lastUpdated: Date;
  trend: 'improving' | 'declining' | 'stable';
  confidence: number; // 0-1, based on sample size
}

/**
 * Agent interaction for scoring
 */
export interface AgentInteraction {
  id: string;
  agentId: string;
  query: string;
  response: string;
  expectedAnswer?: string;
  taskType: string;
  toolsUsed: string[];
  latencyMs: number;
  cost: number;
  userRating?: number; // 1-5
  feedback?: string;
  flagged: boolean;
  flagReason?: string;
  createdAt: Date;
}

/**
 * Agent score configuration
 */
export interface AgentScoringConfig {
  /** Minimum interactions before scoring */
  minInteractions?: number;
  /** Weights for each dimension */
  weights?: Partial<AgentScoreDimensions>;
  /** Decay factor for old interactions */
  decayFactor?: number;
  /** Safety threshold (below this triggers alerts) */
  safetyThreshold?: number;
  /** Accuracy threshold */
  accuracyThreshold?: number;
}

/**
 * Score weights (must sum to 1)
 */
const DEFAULT_WEIGHTS: AgentScoreDimensions = {
  accuracy: 0.30,
  helpfulness: 0.25,
  safety: 0.20,
  coherence: 0.15,
  efficiency: 0.10,
};

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<Omit<AgentScoringConfig, 'weights'>> & { weights: AgentScoreDimensions } = {
  minInteractions: 10,
  weights: DEFAULT_WEIGHTS,
  decayFactor: 0.95,
  safetyThreshold: 70,
  accuracyThreshold: 75,
};

// ============================================================================
// Schemas
// ============================================================================

/**
 * Schema for recording agent interaction
 */
export const AgentInteractionSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  query: z.string().min(1, 'Query is required'),
  response: z.string().min(1, 'Response is required'),
  expectedAnswer: z.string().optional(),
  taskType: z.string().min(1),
  toolsUsed: z.array(z.string()).default([]),
  latencyMs: z.number().positive(),
  cost: z.number().min(0),
  userRating: z.number().min(1).max(5).optional(),
  feedback: z.string().optional(),
  flagged: z.boolean().default(false),
  flagReason: z.string().optional(),
});

/**
 * Schema for scoring request
 */
export const ScoringRequestSchema = z.object({
  agentId: z.string().min(1),
  period: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
  includeInteractions: z.boolean().default(false),
});

/**
 * Schema for evaluation feedback
 */
export const EvaluationFeedbackSchema = z.object({
  interactionId: z.string().min(1),
  accuracy: z.number().min(1).max(5).optional(),
  helpfulness: z.number().min(1).max(5).optional(),
  safety: z.number().min(1).max(5).optional(),
  coherence: z.number().min(1).max(5).optional(),
  efficiency: z.number().min(1).max(5).optional(),
  overall: z.number().min(1).max(5),
  comment: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

// ============================================================================
// Agent Scoring Service
// ============================================================================

/**
 * Agent Scoring Service
 *
 * Provides comprehensive quality scoring for AI agents.
 *
 * @example
 * ```typescript
 * const scoringService = new AgentScoringService({
 *   minInteractions: 20,
 *   weights: { accuracy: 0.35, helpfulness: 0.25, safety: 0.20, coherence: 0.10, efficiency: 0.10 },
 * });
 *
 * // Record an interaction
 * await scoringService.recordInteraction({
 *   agentId: 'agent-123',
 *   query: 'What is the weather?',
 *   response: 'The weather is sunny.',
 *   taskType: 'weather_query',
 *   latencyMs: 150,
 *   cost: 0.002,
 * });
 *
 * // Get agent score
 * const score = await scoringService.getAgentScore('agent-123', '30d');
 * console.log(`Agent score: ${score.overall}/100`);
 * ```
 */
export class AgentScoringService {
  private config: Required<Omit<AgentScoringConfig, 'weights'>> & { weights: AgentScoreDimensions };
  private interactions: AgentInteraction[] = [];
  private scores: Map<string, AgentScore> = new Map();

  constructor(config: AgentScoringConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      weights: { ...DEFAULT_WEIGHTS, ...config.weights },
    };

    // Ensure weights sum to 1
    const weightSum = Object.values(this.config.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(weightSum - 1) > 0.01) {
      const factor = 1 / weightSum;
      for (const key of Object.keys(this.config.weights) as (keyof AgentScoreDimensions)[]) {
        this.config.weights[key] *= factor;
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<typeof this.config> {
    return { ...this.config };
  }

  /**
   * Get period date range
   */
  private getPeriodRange(period: '7d' | '30d' | '90d' | 'all'): { start: Date; end: Date } {
    const end = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365 * 10;
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return { start, end };
  }

  /**
   * Record an agent interaction
   */
  async recordInteraction(
    validatedData: z.infer<typeof AgentInteractionSchema>
  ): Promise<AgentInteraction> {
    const interaction: AgentInteraction = {
      ...validatedData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    this.interactions.push(interaction);

    // Update score if we have enough data
    if (this.shouldUpdateScore(validatedData.agentId)) {
      await this.calculateAgentScore(validatedData.agentId);
    }

    return interaction;
  }

  /**
   * Get agent score for a specific period
   */
  async getAgentScore(
    agentId: string,
    period: '7d' | '30d' | '90d' | 'all' = '30d'
  ): Promise<AgentScore | null> {
    const score = this.scores.get(`${agentId}:${period}`);
    return score || null;
  }

  /**
   * Get score for all periods
   */
  async getAllPeriodScores(agentId: string): Promise<Map<string, AgentScore | null>> {
    const periods: Array<'7d' | '30d' | '90d' | 'all'> = ['7d', '30d', '90d', 'all'];
    const scores = new Map<string, AgentScore | null>();

    for (const period of periods) {
      scores.set(period, await this.getAgentScore(agentId, period));
    }

    return scores;
  }

  /**
   * Get interactions for an agent
   */
  async getInteractions(
    agentId: string,
    filters?: {
      period?: '7d' | '30d' | '90d' | 'all';
      flagged?: boolean;
      minRating?: number;
      limit?: number;
    }
  ): Promise<AgentInteraction[]> {
    const { start } = this.getPeriodRange(filters?.period || '30d');

    let results = this.interactions.filter(
      (i) => i.agentId === agentId && i.createdAt >= start
    );

    if (filters?.flagged !== undefined) {
      results = results.filter((i) => i.flagged === filters.flagged);
    }

    if (filters?.minRating !== undefined) {
      results = results.filter((i) => (i.userRating || 0) >= filters.minRating!);
    }

    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Calculate agent score
   */
  private async calculateAgentScore(agentId: string): Promise<AgentScore | null> {
    const periods: Array<'7d' | '30d' | '90d' | 'all'> = ['7d', '30d', '90d', 'all'];
    let latestScore: AgentScore | null = null;

    for (const period of periods) {
      const { start } = this.getPeriodRange(period);
      const interactions = this.interactions.filter(
        (i) => i.agentId === agentId && i.createdAt >= start
      );

      if (interactions.length < this.config.minInteractions) {
        this.scores.set(`${agentId}:${period}`, null);
        continue;
      }

      const dimensions = await this.calculateDimensions(interactions);
      const overall = this.calculateOverallScore(dimensions);
      const trend = this.calculateTrend(agentId, period);

      const score: AgentScore = {
        agentId,
        overall,
        dimensions,
        totalInteractions: interactions.length,
        period,
        lastUpdated: new Date(),
        trend,
        confidence: Math.min(1, interactions.length / (this.config.minInteractions * 5)),
      };

      this.scores.set(`${agentId}:${period}`, score);
      latestScore = score;
    }

    return latestScore;
  }

  /**
   * Calculate score dimensions
   */
  private async calculateDimensions(
    interactions: AgentInteraction[]
  ): Promise<AgentScoreDimensions> {
    const [accuracy, helpfulness, safety, coherence, efficiency] = await Promise.all([
      this.calculateAccuracy(interactions),
      this.calculateHelpfulness(interactions),
      this.calculateSafety(interactions),
      this.calculateCoherence(interactions),
      this.calculateEfficiency(interactions),
    ]);

    return { accuracy, helpfulness, safety, coherence, efficiency };
  }

  /**
   * Calculate accuracy score
   */
  private async calculateAccuracy(interactions: AgentInteraction[]): Promise<number> {
    // Count interactions with expected answers or positive feedback
    const evaluable = interactions.filter(
      (i) => i.expectedAnswer !== undefined || i.userRating !== undefined
    );

    if (evaluable.length === 0) {
      // Fall back to average user rating
      const rated = interactions.filter((i) => i.userRating !== undefined);
      if (rated.length === 0) return 75; // Default score

      const avgRating = rated.reduce((sum, i) => sum + (i.userRating || 0), 0) / rated.length;
      return (avgRating / 5) * 100;
    }

    let correct = 0;

    for (const interaction of evaluable) {
      if (interaction.expectedAnswer !== undefined) {
        // Simple string matching for demonstration
        // In production, use LLM-based evaluation or embedding similarity
        const response = interaction.response.toLowerCase();
        const expected = interaction.expectedAnswer.toLowerCase();

        if (response.includes(expected) || expected.includes(response.slice(0, 50))) {
          correct++;
        } else if (interaction.userRating && interaction.userRating >= 4) {
          correct++; // Trust user rating
        }
      } else if (interaction.userRating && interaction.userRating >= 4) {
        correct++;
      }
    }

    return (correct / evaluable.length) * 100;
  }

  /**
   * Calculate helpfulness score
   */
  private async calculateHelpfulness(interactions: AgentInteraction[]): Promise<number> {
    const rated = interactions.filter((i) => i.userRating !== undefined);

    if (rated.length === 0) {
      // Fall back to response length and tool usage
      const withTools = interactions.filter((i) => i.toolsUsed.length > 0);
      return 60 + (withTools.length / interactions.length) * 20;
    }

    const avgRating = rated.reduce((sum, i) => sum + (i.userRating || 0), 0) / rated.length;

    // Adjust based on tool usage (tools usually indicate helpfulness)
    const toolUsageBonus = (rated.filter((i) => i.toolsUsed.length > 0).length / rated.length) * 10;

    return Math.min(100, ((avgRating / 5) * 100) + toolUsageBonus);
  }

  /**
   * Calculate safety score
   */
  private async calculateSafety(interactions: AgentInteraction[]): Promise<number> {
    const safe = interactions.filter((i) => !i.flagged);
    const safeRatio = safe.length / interactions.length;

    // Start with ratio score
    let score = safeRatio * 100;

    // Penalize for flagged interactions
    const flagged = interactions.filter((i) => i.flagged);
    for (const flag of flagged) {
      // Check flag severity
      if (flag.flagReason?.toLowerCase().includes('harmful')) {
        score -= 15;
      } else if (flag.flagReason?.toLowerCase().includes('inaccurate')) {
        score -= 10;
      } else if (flag.flagReason?.toLowerCase().includes('inappropriate')) {
        score -= 10;
      } else {
        score -= 5;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate coherence score
   */
  private async calculateCoherence(interactions: AgentInteraction[]): Promise<number> {
    // Coherence is measured by:
    // 1. Response consistency (length variance)
    // 2. Tool usage patterns
    // 3. User satisfaction

    const responseLengths = interactions.map((i) => i.response.length);
    const avgLength = responseLengths.reduce((a, b) => a + b, 0) / responseLengths.length;
    const variance = responseLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / responseLengths.length;
    const stdDev = Math.sqrt(variance);

    // Lower variance = higher coherence
    const lengthScore = Math.max(0, 100 - (stdDev / avgLength) * 100);

    // Tool usage consistency
    const toolCounts = interactions.map((i) => i.toolsUsed.length);
    const avgTools = toolCounts.reduce((a, b) => a + b, 0) / toolCounts.length;
    const toolConsistency = Math.max(0, 100 - Math.abs(avgTools - 3) * 10);

    // User rating
    const rated = interactions.filter((i) => i.userRating !== undefined);
    const ratingScore = rated.length > 0
      ? (rated.reduce((sum, i) => sum + (i.userRating || 0), 0) / rated.length / 5) * 100
      : 70;

    return (lengthScore * 0.3 + toolConsistency * 0.2 + ratingScore * 0.5);
  }

  /**
   * Calculate efficiency score
   */
  private async calculateEfficiency(interactions: AgentInteraction[]): Promise<number> {
    // Efficiency measured by:
    // 1. Latency relative to response length
    // 2. Cost per useful output
    // 3. Single-turn vs multi-turn ratio

    // Latency score (lower is better)
    const avgLatency = interactions.reduce((sum, i) => sum + i.latencyMs, 0) / interactions.length;
    const latencyScore = Math.max(0, 100 - (avgLatency / 10)); // Penalize 1 point per 10ms

    // Cost efficiency
    const avgCost = interactions.reduce((sum, i) => sum + i.cost, 0) / interactions.length;
    const costScore = Math.max(0, 100 - (avgCost * 1000)); // Penalize for high cost

    // Quick wins (short interactions that got positive rating)
    const quickWins = interactions.filter(
      (i) => i.latencyMs < 500 && (i.userRating || 0) >= 4
    );
    const quickWinScore = (quickWins.length / interactions.length) * 100;

    return (latencyScore * 0.4 + costScore * 0.3 + quickWinScore * 0.3);
  }

  /**
   * Calculate overall weighted score
   */
  private calculateOverallScore(dimensions: AgentScoreDimensions): number {
    const { weights } = this.config;

    const overall =
      dimensions.accuracy * weights.accuracy +
      dimensions.helpfulness * weights.helpfulness +
      dimensions.safety * weights.safety +
      dimensions.coherence * weights.coherence +
      dimensions.efficiency * weights.efficiency;

    return Math.round(Math.max(0, Math.min(100, overall)));
  }

  /**
   * Calculate score trend
   */
  private calculateTrend(agentId: string, period: string): 'improving' | 'declining' | 'stable' {
    // Compare first half vs second half of interactions
    const { start } = this.getPeriodRange(period as '7d' | '30d' | '90d' | 'all');
    const interactions = this.interactions.filter(
      (i) => i.agentId === agentId && i.createdAt >= start
    );

    if (interactions.length < 10) return 'stable';

    const halfPoint = Math.floor(interactions.length / 2);
    const firstHalf = interactions.slice(0, halfPoint);
    const secondHalf = interactions.slice(halfPoint);

    // Calculate average rating for each half
    const firstAvg = firstHalf.reduce((sum, i) => sum + (i.userRating || 3), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, i) => sum + (i.userRating || 3), 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;

    if (diff > 0.3) return 'improving';
    if (diff < -0.3) return 'declining';
    return 'stable';
  }

  /**
   * Check if score should be updated
   */
  private shouldUpdateScore(agentId: string): boolean {
    const recentInteractions = this.interactions.filter(
      (i) => i.agentId === agentId &&
        i.createdAt >= new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    return recentInteractions.length >= 5;
  }

  /**
   * Get agents by score
   */
  async getTopAgents(
    limit: number = 10,
    period: '7d' | '30d' | '90d' | 'all' = '30d'
  ): Promise<AgentScore[]> {
    const scores = Array.from(this.scores.entries())
      .filter(([key]) => key.endsWith(`:${period}`))
      .map(([, score]) => score)
      .filter((score): score is AgentScore => score !== null)
      .sort((a, b) => b.overall - a.overall);

    return scores.slice(0, limit);
  }

  /**
   * Get agents below threshold
   */
  async getAgentsBelowThreshold(
    dimension: keyof AgentScoreDimensions,
    threshold: number
  ): Promise<Array<{ agentId: string; score: number }>> {
    const results: Array<{ agentId: string; score: number }> = [];

    for (const [key, score] of this.scores.entries()) {
      if (score && score.dimensions[dimension] < threshold) {
        const agentId = key.split(':')[0];
        results.push({
          agentId,
          score: score.dimensions[dimension],
        });
      }
    }

    return results.sort((a, b) => a.score - b.score);
  }

  /**
   * Flag an interaction for review
   */
  async flagInteraction(
    interactionId: string,
    reason: string
  ): Promise<boolean> {
    const interaction = this.interactions.find((i) => i.id === interactionId);
    if (!interaction) return false;

    interaction.flagged = true;
    interaction.flagReason = reason;

    // Recalculate safety score
    await this.calculateAgentScore(interaction.agentId);

    return true;
  }

  /**
   * Clear interaction flag
   */
  async clearFlag(interactionId: string): Promise<boolean> {
    const interaction = this.interactions.find((i) => i.id === interactionId);
    if (!interaction) return false;

    interaction.flagged = false;
    interaction.flagReason = undefined;

    // Recalculate safety score
    await this.calculateAgentScore(interaction.agentId);

    return true;
  }
}

/**
 * Get default score weights
 */
export function getDefaultWeights(): AgentScoreDimensions {
  return { ...DEFAULT_WEIGHTS };
}

/**
 * Create validators
 */
export function createAgentScoreValidators() {
  return {
    recordInteraction: (data: unknown) => AgentInteractionSchema.parse(data),
    getScore: (data: unknown) => ScoringRequestSchema.parse(data),
    submitFeedback: (data: unknown) => EvaluationFeedbackSchema.parse(data),
  };
}

export default AgentScoringService;
