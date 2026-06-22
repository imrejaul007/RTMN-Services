// Trust Score Service - Core trust score calculation and management

import { v4 as uuidv4 } from "uuid";
import {
  TrustScore,
  TrustLevel,
  TrustFactor,
  TrustFactorType,
  EntityType,
  TrustFactorEvidence,
  TrustFactorWeight,
  TrustDecayConfig,
  TrustThreshold,
  TrustScoreOptions,
  TrustCalculationContext
} from "../types";

/**
 * Default trust factor weights configuration
 */
const DEFAULT_FACTOR_WEIGHTS: TrustFactorWeight[] = [
  { type: TrustFactorType.IDENTITY_VERIFICATION, weight: 0.20, description: "Identity verification status", minScore: 0, maxScore: 100 },
  { type: TrustFactorType.TRANSACTION_HISTORY, weight: 0.18, description: "Transaction history quality", minScore: 0, maxScore: 100 },
  { type: TrustFactorType.CONTRACT_COMPLIANCE, weight: 0.15, description: "Contract compliance rate", minScore: 0, maxScore: 100 },
  { type: TrustFactorType.NETWORK_REPUTATION, weight: 0.12, description: "Network reputation score", minScore: 0, maxScore: 100 },
  { type: TrustFactorType.AGENT_PERFORMANCE, weight: 0.10, description: "Agent performance metrics", minScore: 0, maxScore: 100 },
  { type: TrustFactorType.IDENTITY_STABILITY, weight: 0.08, description: "Identity stability over time", minScore: 0, maxScore: 100 },
  { type: TrustFactorType.VERIFICATION_DEPTH, weight: 0.07, description: "Depth of verification", minScore: 0, maxScore: 100 },
  { type: TrustFactorType.NETWORK_CONNECTIONS, weight: 0.05, description: "Number and quality of network connections", minScore: 0, maxScore: 100 },
  { type: TrustFactorType.HISTORICAL_BEHAVIOR, weight: 0.03, description: "Historical behavior patterns", minScore: 0, maxScore: 100 },
  { type: TrustFactorType.RESPONSE_RATE, weight: 0.02, description: "Response rate to requests", minScore: 0, maxScore: 100 }
];

/**
 * Trust level thresholds
 */
const TRUST_THRESHOLDS: TrustThreshold[] = [
  { level: TrustLevel.UNTRUSTED, minScore: 0, maxScore: 20, color: "#FF0000", description: "Untrusted entity - exercise caution" },
  { level: TrustLevel.LOW, minScore: 21, maxScore: 40, color: "#FF6600", description: "Low trust - limited interactions recommended" },
  { level: TrustLevel.MEDIUM, minScore: 41, maxScore: 60, color: "#FFCC00", description: "Medium trust - standard interactions allowed" },
  { level: TrustLevel.HIGH, minScore: 61, maxScore: 80, color: "#66CC00", description: "High trust - expanded interactions allowed" },
  { level: TrustLevel.PREMIUM, minScore: 81, maxScore: 100, color: "#00CC00", description: "Premium trust - full access granted" }
];

/**
 * Default trust decay configuration
 */
const DEFAULT_DECAY_CONFIG: TrustDecayConfig = {
  enabled: true,
  decayRate: 0.02,
  decayIntervalDays: 30,
  minimumScore: 10,
  factorsSubjectToDecay: [
    TrustFactorType.TRANSACTION_HISTORY,
    TrustFactorType.RESPONSE_RATE,
    TrustFactorType.HISTORICAL_BEHAVIOR
  ]
};

/**
 * In-memory trust score storage
 */
const trustScoreStore: Map<string, TrustScore> = new Map();

/**
 * Trust Score Service class
 */
export class TrustScoreService {
  private factorWeights: Map<TrustFactorType, TrustFactorWeight>;
  private thresholds: TrustThreshold[];
  private decayConfig: TrustDecayConfig;

  constructor(
    factorWeights?: TrustFactorWeight[],
    thresholds?: TrustThreshold[],
    decayConfig?: TrustDecayConfig
  ) {
    this.factorWeights = new Map(
      (factorWeights || DEFAULT_FACTOR_WEIGHTS).map(fw => [fw.type, fw])
    );
    this.thresholds = thresholds || TRUST_THRESHOLDS;
    this.decayConfig = decayConfig || DEFAULT_DECAY_CONFIG;
  }

  /**
   * Calculate trust score for an entity
   */
  calculateTrustScore(
    entityId: string,
    entityType: EntityType,
    factors: TrustFactor[],
    previousScore?: TrustScore
  ): TrustScore {
    const context = this.createCalculationContext(entityId, entityType, factors);
    const processedFactors = this.processFactors(factors, context);
    const score = this.computeScore(processedFactors);
    const level = this.determineLevel(score);
    const confidence = this.calculateConfidence(processedFactors);
    const now = new Date().toISOString();
    const expiresAt = this.calculateExpiry(now);

    const trustScore: TrustScore = {
      entityId,
      entityType,
      score,
      level,
      factors: processedFactors,
      totalWeight: this.calculateTotalWeight(processedFactors),
      confidence,
      calculatedAt: now,
      expiresAt,
      previousScore: previousScore?.score,
      scoreChange: previousScore ? score - previousScore.score : undefined
    };

    trustScoreStore.set(entityId, trustScore);
    return trustScore;
  }

  /**
   * Get trust score for an entity
   */
  getTrustScore(entityId: string): TrustScore | null {
    const score = trustScoreStore.get(entityId);
    if (!score) return null;

    // Check if score has expired
    if (new Date(score.expiresAt) < new Date()) {
      return this.refreshTrustScore(entityId);
    }

    return score;
  }

  /**
   * Get trust score with options
   */
  getTrustScoreWithOptions(entityId: string, options: TrustScoreOptions): TrustScore | null {
    const score = this.getTrustScore(entityId);
    if (!score) return null;

    if (!options.includeFactors) {
      score.factors = [];
    }

    return score;
  }

  /**
   * Refresh an expired trust score
   */
  refreshTrustScore(entityId: string): TrustScore | null {
    const currentScore = trustScoreStore.get(entityId);
    if (!currentScore) return null;

    // Apply decay if enabled
    if (this.decayConfig.enabled) {
      const decayedFactors = this.applyDecay(currentScore.factors);
      return this.calculateTrustScore(
        entityId,
        currentScore.entityType,
        decayedFactors,
        currentScore
      );
    }

    return currentScore;
  }

  /**
   * Update trust score for an entity
   */
  updateTrustScore(entityId: string, updatedFactors: TrustFactor[]): TrustScore | null {
    const currentScore = trustScoreStore.get(entityId);
    if (!currentScore) {
      throw new Error(`Trust score not found for entity: ${entityId}`);
    }

    return this.calculateTrustScore(
      entityId,
      currentScore.entityType,
      updatedFactors,
      currentScore
    );
  }

  /**
   * Delete trust score for an entity
   */
  deleteTrustScore(entityId: string): boolean {
    return trustScoreStore.delete(entityId);
  }

  /**
   * Get all trust scores
   */
  getAllTrustScores(): TrustScore[] {
    return Array.from(trustScoreStore.values());
  }

  /**
   * Get trust scores by level
   */
  getTrustScoresByLevel(level: TrustLevel): TrustScore[] {
    return this.getAllTrustScores().filter(score => score.level === level);
  }

  /**
   * Get trust scores by entity type
   */
  getTrustScoresByEntityType(entityType: EntityType): TrustScore[] {
    return this.getAllTrustScores().filter(score => score.entityType === entityType);
  }

  /**
   * Get trust score statistics
   */
  getStatistics(): {
    totalEntities: number;
    averageScore: number;
    levelDistribution: Record<TrustLevel, number>;
    highestScore: TrustScore | null;
    lowestScore: TrustScore | null;
  } {
    const scores = this.getAllTrustScores();
    const levelDistribution: Record<TrustLevel, number> = {
      [TrustLevel.UNTRUSTED]: 0,
      [TrustLevel.LOW]: 0,
      [TrustLevel.MEDIUM]: 0,
      [TrustLevel.HIGH]: 0,
      [TrustLevel.PREMIUM]: 0
    };

    let totalScore = 0;
    let highestScore: TrustScore | null = null;
    let lowestScore: TrustScore | null = null;

    for (const score of scores) {
      totalScore += score.score;
      levelDistribution[score.level]++;

      if (!highestScore || score.score > highestScore.score) {
        highestScore = score;
      }
      if (!lowestScore || score.score < lowestScore.score) {
        lowestScore = score;
      }
    }

    return {
      totalEntities: scores.length,
      averageScore: scores.length > 0 ? totalScore / scores.length : 0,
      levelDistribution,
      highestScore,
      lowestScore
    };
  }

  /**
   * Batch calculate trust scores
   */
  batchCalculateTrustScores(
    requests: Array<{ entityId: string; entityType: EntityType; factors: TrustFactor[] }>
  ): TrustScore[] {
    return requests.map(req => {
      const previousScore = trustScoreStore.get(req.entityId);
      return this.calculateTrustScore(req.entityId, req.entityType, req.factors, previousScore);
    });
  }

  /**
   * Get thresholds
   */
  getThresholds(): TrustThreshold[] {
    return [...this.thresholds];
  }

  /**
   * Get factor weights
   */
  getFactorWeights(): TrustFactorWeight[] {
    return Array.from(this.factorWeights.values());
  }

  /**
   * Update factor weight
   */
  updateFactorWeight(type: TrustFactorType, weight: number): TrustFactorWeight | null {
    const currentWeight = this.factorWeights.get(type);
    if (!currentWeight) return null;

    const updatedWeight = { ...currentWeight, weight };
    this.factorWeights.set(type, updatedWeight);
    return updatedWeight;
  }

  /**
   * Create calculation context
   */
  private createCalculationContext(
    entityId: string,
    entityType: EntityType,
    factors: TrustFactor[]
  ): TrustCalculationContext {
    const factorMap = new Map<TrustFactorType, TrustFactor>();
    factors.forEach(f => factorMap.set(f.type, f));

    return {
      entityId,
      entityType,
      timestamp: new Date().toISOString(),
      factors: factorMap,
      metadata: {}
    };
  }

  /**
   * Process factors with weights
   */
  private processFactors(factors: TrustFactor[], context: TrustCalculationContext): TrustFactor[] {
    return factors.map(factor => {
      const weightConfig = this.factorWeights.get(factor.type);
      const weight = weightConfig?.weight || 0.1;
      const contribution = (factor.score * weight) / 100;

      return {
        ...factor,
        weight,
        contribution,
        lastUpdated: new Date().toISOString()
      };
    });
  }

  /**
   * Compute final score from factors
   */
  private computeScore(factors: TrustFactor[]): number {
    if (factors.length === 0) return 0;

    const totalContribution = factors.reduce((sum, f) => sum + f.contribution, 0);
    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);

    if (totalWeight === 0) return 0;

    // Normalize score to 0-100 range
    return Math.min(100, Math.max(0, Math.round((totalContribution / totalWeight) * 100)));
  }

  /**
   * Determine trust level from score
   */
  private determineLevel(score: number): TrustLevel {
    for (const threshold of this.thresholds) {
      if (score >= threshold.minScore && score <= threshold.maxScore) {
        return threshold.level;
      }
    }
    return TrustLevel.UNTRUSTED;
  }

  /**
   * Calculate confidence level
   */
  private calculateConfidence(factors: TrustFactor[]): number {
    if (factors.length === 0) return 0;

    // Calculate confidence based on number of factors and their evidence
    const factorCountScore = Math.min(factors.length / DEFAULT_FACTOR_WEIGHTS.length, 1) * 50;
    const evidenceScore = factors.reduce((sum, f) => {
      return sum + Math.min(f.evidence.length / 5, 1);
    }, 0) / factors.length * 50;

    return Math.min(100, Math.round(factorCountScore + evidenceScore));
  }

  /**
   * Calculate total weight
   */
  private calculateTotalWeight(factors: TrustFactor[]): number {
    return factors.reduce((sum, f) => sum + f.weight, 0);
  }

  /**
   * Calculate expiry time
   */
  private calculateExpiry(calculatedAt: string): string {
    const date = new Date(calculatedAt);
    date.setDate(date.getDate() + 7); // Default 7 days expiry
    return date.toISOString();
  }

  /**
   * Apply decay to factors
   */
  private applyDecay(factors: TrustFactor[]): TrustFactor[] {
    return factors.map(factor => {
      if (!this.decayConfig.factorsSubjectToDecay.includes(factor.type)) {
        return factor;
      }

      const decayedScore = Math.max(
        this.decayConfig.minimumScore,
        factor.score * (1 - this.decayConfig.decayRate)
      );

      return {
        ...factor,
        score: Math.round(decayedScore * 100) / 100,
        lastUpdated: new Date().toISOString(),
        evidence: [
          ...factor.evidence,
          {
            type: "DECAY_APPLIED",
            value: `Score decayed from ${factor.score} to ${decayedScore}`,
            timestamp: new Date().toISOString(),
            source: "TRUST_SCORE_SERVICE"
          }
        ]
      };
    });
  }

  /**
   * Create a default trust factor
   */
  static createDefaultFactor(type: TrustFactorType, score: number = 50): TrustFactor {
    const factorWeights = new Map(DEFAULT_FACTOR_WEIGHTS.map(fw => [fw.type, fw]));
    const weightConfig = factorWeights.get(type);
    const weight = weightConfig?.weight || 0.1;

    return {
      type,
      name: type.replace(/_/g, " "),
      description: weightConfig?.description || "",
      score,
      weight,
      contribution: (score * weight) / 100,
      lastUpdated: new Date().toISOString(),
      evidence: []
    };
  }

  /**
   * Generate initial trust factors for a new entity
   */
  static generateInitialFactors(): TrustFactor[] {
    return DEFAULT_FACTOR_WEIGHTS.map(fw => TrustScoreService.createDefaultFactor(fw.type, 50));
  }
}

export default TrustScoreService;
