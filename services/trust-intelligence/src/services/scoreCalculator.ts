import { v4 as uuidv4 } from 'uuid';
import { TrustScoreModel, ITrustScore } from '../models/TrustScore';
import { VerificationModel } from '../models/Verification';
import { RiskFlagModel } from '../models/Flag';
import {
  EntityType,
  TrustLevel,
  TrustFactors,
  ScoreBreakdown,
  CalculateScoreRequest,
  UpdateScoreRequest,
  TrustScoreResponse,
  TrustTrendResponse,
} from '../types';
import logger from '../utils/logger';

export class ScoreCalculator {
  // Default weights for trust score calculation
  private weights = {
    transactionReliability: 0.30,
    verificationStatus: 0.25,
    behavioralPattern: 0.20,
    historicalBehavior: 0.15,
    networkTrust: 0.10,
  };

  // Penalty factors per severity
  private penaltyFactors = {
    low: 5,
    medium: 15,
    high: 30,
    critical: 50,
  };

  constructor(customWeights?: Partial<typeof this.weights>) {
    if (customWeights) {
      this.weights = { ...this.weights, ...customWeights };
    }
  }

  /**
   * Calculate trust score for an entity
   */
  async calculateScore(request: CalculateScoreRequest): Promise<ITrustScore> {
    const { entityId, entityType, tenantId = 'default', factors } = request;

    // Get or create trust score record
    let trustScore = await TrustScoreModel.findOne({
      entityId,
      entityType,
      tenantId,
    });

    if (!trustScore) {
      trustScore = new TrustScoreModel({
        entityId,
        entityType,
        tenantId,
        score: 50,
        level: 'medium',
        factors: this.getDefaultFactors(),
        breakdown: this.getDefaultBreakdown(),
        lastUpdated: new Date(),
        nextReview: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        history: [],
        linkedEntities: [],
        riskFlags: [],
        verified: false,
        verificationLevel: 'none',
      });
    }

    // Calculate factors
    const calculatedFactors = factors || await this.calculateFactors(entityId, entityType, tenantId);
    trustScore.factors = calculatedFactors;

    // Calculate breakdown
    const breakdown = this.calculateBreakdown(calculatedFactors, trustScore);
    trustScore.breakdown = breakdown;

    // Calculate final score
    const previousScore = trustScore.score;
    trustScore.score = this.computeFinalScore(breakdown);

    // Update level
    trustScore.level = this.calculateLevel(trustScore.score);

    // Check verification status
    const verificationStatus = await this.getVerificationStatus(entityId, entityType, tenantId);
    trustScore.verified = verificationStatus.verified;
    trustScore.verificationLevel = verificationStatus.level;

    // Check risk flags
    trustScore.riskFlags = await this.getActiveRiskFlags(entityId, tenantId);

    // Update linked entities influence
    trustScore = await this.applyLinkedEntityInfluence(trustScore);

    trustScore.lastUpdated = new Date();
    trustScore.nextReview = this.calculateNextReview(trustScore.score, trustScore.level);

    await trustScore.save();
    logger.info(`Trust score calculated for ${entityType}:${entityId}`, {
      previousScore,
      newScore: trustScore.score,
      level: trustScore.level,
    });

    return trustScore;
  }

  /**
   * Update trust score with new information
   */
  async updateScore(request: UpdateScoreRequest): Promise<ITrustScore> {
    const { entityId, entityType, changeReason, triggeredBy, factors, penalty } = request;

    const tenantId = 'default'; // Would come from auth context
    let trustScore = await TrustScoreModel.findOne({
      entityId,
      entityType,
      tenantId,
    });

    if (!trustScore) {
      return this.calculateScore({ entityId, entityType, tenantId });
    }

    const previousScore = trustScore.score;
    const previousFactors = { ...trustScore.factors };

    // Update factors
    Object.assign(trustScore.factors, factors);

    // Recalculate
    const breakdown = this.calculateBreakdown(trustScore.factors, trustScore);
    trustScore.breakdown = breakdown;

    // Apply penalty if provided
    if (penalty && penalty > 0) {
      trustScore.breakdown.penalties -= penalty;
    }

    trustScore.score = this.computeFinalScore(breakdown);
    trustScore.level = this.calculateLevel(trustScore.score);

    // Add to history
    trustScore.history.push({
      timestamp: new Date(),
      previousScore,
      newScore: trustScore.score,
      changeReason,
      triggeredBy,
      factors: this.getFactorChanges(previousFactors, trustScore.factors),
    });

    // Keep only last 100 history entries
    if (trustScore.history.length > 100) {
      trustScore.history = trustScore.history.slice(-100);
    }

    trustScore.lastUpdated = new Date();
    await trustScore.save();

    logger.info(`Trust score updated for ${entityType}:${entityId}`, {
      previousScore,
      newScore: trustScore.score,
      changeReason,
    });

    return trustScore;
  }

  /**
   * Get trust score with response format
   */
  async getScore(
    entityId: string,
    entityType: EntityType,
    tenantId: string = 'default'
  ): Promise<TrustScoreResponse | null> {
    const trustScore = await TrustScoreModel.findOne({
      entityId,
      entityType,
      tenantId,
    });

    if (!trustScore) {
      return null;
    }

    return {
      entityId: trustScore.entityId,
      entityType: trustScore.entityType,
      score: trustScore.score,
      level: trustScore.level,
      factors: trustScore.factors,
      breakdown: trustScore.breakdown,
      verified: trustScore.verified,
      verificationLevel: trustScore.verificationLevel,
      riskFlags: trustScore.riskFlags,
      linkedEntities: trustScore.linkedEntities.length,
      lastUpdated: trustScore.lastUpdated,
      nextReview: trustScore.nextReview,
    };
  }

  /**
   * Get trust score trend over time
   */
  async getTrend(
    entityId: string,
    entityType: EntityType,
    tenantId: string = 'default'
  ): Promise<TrustTrendResponse | null> {
    const trustScore = await TrustScoreModel.findOne({
      entityId,
      entityType,
      tenantId,
    });

    if (!trustScore) {
      return null;
    }

    // Build history from score record
    const history = trustScore.history.map((entry) => ({
      timestamp: entry.timestamp,
      score: entry.newScore,
      level: this.calculateLevel(entry.newScore),
    }));

    // Add current score as the latest point
    history.push({
      timestamp: trustScore.lastUpdated,
      score: trustScore.score,
      level: trustScore.level,
    });

    // Calculate trend
    const trend = this.calculateTrendDirection(history);

    return {
      entityId,
      history,
      trend: trend.direction,
      averageChange: trend.averageChange,
    };
  }

  /**
   * Calculate factors based on entity type and historical data
   */
  private async calculateFactors(
    entityId: string,
    entityType: EntityType,
    tenantId: string
  ): Promise<TrustFactors> {
    const factors: TrustFactors = this.getDefaultFactors();

    // Entity-type specific calculations
    switch (entityType) {
      case 'customer':
        Object.assign(factors, await this.calculateCustomerFactors(entityId, tenantId));
        break;
      case 'merchant':
        Object.assign(factors, await this.calculateMerchantFactors(entityId, tenantId));
        break;
      case 'agent':
        Object.assign(factors, await this.calculateAgentFactors(entityId, tenantId));
        break;
      case 'vendor':
        Object.assign(factors, await this.calculateVendorFactors(entityId, tenantId));
        break;
      case 'partner':
        Object.assign(factors, await this.calculatePartnerFactors(entityId, tenantId));
        break;
      case 'device':
        Object.assign(factors, await this.calculateDeviceFactors(entityId, tenantId));
        break;
    }

    // Apply risk indicators based on flags
    factors.riskIndicators = await this.calculateRiskIndicators(entityId, tenantId);

    // Apply compliance score
    factors.complianceScore = await this.calculateComplianceScore(entityId, entityType, tenantId);

    return factors;
  }

  private async calculateCustomerFactors(
    entityId: string,
    tenantId: string
  ): Promise<Partial<TrustFactors>> {
    // In production, would query transaction history, behavior patterns, etc.
    return {
      transactionReliability: 75,
      behavioralPattern: 80,
      historicalBehavior: 70,
    };
  }

  private async calculateMerchantFactors(
    entityId: string,
    tenantId: string
  ): Promise<Partial<TrustFactors>> {
    return {
      transactionReliability: 85,
      behavioralPattern: 75,
      historicalBehavior: 80,
    };
  }

  private async calculateAgentFactors(
    entityId: string,
    tenantId: string
  ): Promise<Partial<TrustFactors>> {
    return {
      transactionReliability: 90,
      behavioralPattern: 85,
      historicalBehavior: 88,
    };
  }

  private async calculateVendorFactors(
    entityId: string,
    tenantId: string
  ): Promise<Partial<TrustFactors>> {
    return {
      transactionReliability: 80,
      behavioralPattern: 70,
      historicalBehavior: 75,
    };
  }

  private async calculatePartnerFactors(
    entityId: string,
    tenantId: string
  ): Promise<Partial<TrustFactors>> {
    return {
      transactionReliability: 85,
      behavioralPattern: 80,
      historicalBehavior: 82,
    };
  }

  private async calculateDeviceFactors(
    entityId: string,
    tenantId: string
  ): Promise<Partial<TrustFactors>> {
    return {
      transactionReliability: 70,
      behavioralPattern: 90,
      historicalBehavior: 75,
    };
  }

  private async calculateRiskIndicators(
    entityId: string,
    tenantId: string
  ): Promise<number> {
    const activeFlags = await RiskFlagModel.findActiveForEntity(entityId, tenantId);
    if (activeFlags.length === 0) return 100;

    let penalty = 0;
    for (const flag of activeFlags) {
      penalty += this.penaltyFactors[flag.severity] || 10;
    }

    return Math.max(0, 100 - penalty);
  }

  private async calculateComplianceScore(
    entityId: string,
    entityType: EntityType,
    tenantId: string
  ): Promise<number> {
    // In production, would check compliance records
    return 85;
  }

  private async getVerificationStatus(
    entityId: string,
    entityType: EntityType,
    tenantId: string
  ): Promise<{ verified: boolean; level: TrustFactors['verificationStatus'] }> {
    const verifications = await VerificationModel.findActiveForEntity(
      entityId,
      entityType,
      tenantId
    );

    if (verifications.length === 0) {
      return { verified: false, level: 'none' };
    }

    const verifiedVerifications = verifications.filter((v) => v.status === 'verified');
    if (verifiedVerifications.length === 0) {
      return { verified: false, level: 'basic' };
    }

    // Determine highest verification level
    const levels = verifiedVerifications.map((v) => v.level);
    let highestLevel: TrustFactors['verificationStatus'] = 'none';

    if (levels.includes('full')) highestLevel = 'full';
    else if (levels.includes('enhanced')) highestLevel = 'enhanced';
    else if (levels.includes('standard')) highestLevel = 'standard';
    else if (levels.includes('basic')) highestLevel = 'basic';

    // Average verification score
    const avgScore =
      verifiedVerifications.reduce((sum, v) => sum + v.score, 0) /
      verifiedVerifications.length;

    return {
      verified: true,
      level: highestLevel,
    };
  }

  private async getActiveRiskFlags(entityId: string, tenantId: string): Promise<string[]> {
    const flags = await RiskFlagModel.findActiveForEntity(entityId, tenantId);
    return flags.map((f) => `${f.type}:${f.severity}`);
  }

  private async applyLinkedEntityInfluence(trustScore: ITrustScore): Promise<ITrustScore> {
    if (trustScore.linkedEntities.length === 0) {
      return trustScore;
    }

    let totalInfluence = 0;
    let count = 0;

    for (const linked of trustScore.linkedEntities) {
      const linkedScore = await TrustScoreModel.findOne({
        entityId: linked.entityId,
        entityType: linked.entityType,
        tenantId: trustScore.tenantId,
      });

      if (linkedScore) {
        totalInfluence += linkedScore.score * linked.trustInfluence;
        count++;
      }
    }

    if (count > 0) {
      const avgNetworkTrust = totalInfluence / count;
      trustScore.factors.networkTrust = avgNetworkTrust;
      trustScore.breakdown.networkBonus = (avgNetworkTrust - 50) * 0.1;
    }

    return trustScore;
  }

  private calculateBreakdown(factors: TrustFactors, trustScore: ITrustScore): ScoreBreakdown {
    const baseScore = 50;

    // Calculate bonuses based on factors
    const transactionBonus = (factors.transactionReliability - 50) * 0.3;
    const verificationBonus = (factors.verificationStatus - 50) * 0.25;
    const behaviorBonus = (factors.behavioralPattern - 50) * 0.2;
    const historyBonus = (factors.historicalBehavior - 50) * 0.15;
    const networkBonus = (factors.networkTrust - 50) * 0.1;

    // Calculate penalties from risk flags
    const penalties = this.calculatePenaltyFromFlags(trustScore.riskFlags);

    return {
      baseScore,
      transactionBonus: Math.round(transactionBonus * 10) / 10,
      verificationBonus: Math.round(verificationBonus * 10) / 10,
      behaviorBonus: Math.round(behaviorBonus * 10) / 10,
      historyBonus: Math.round(historyBonus * 10) / 10,
      networkBonus: Math.round(networkBonus * 10) / 10,
      penalties: penalties,
    };
  }

  private calculatePenaltyFromFlags(riskFlags: string[]): number {
    let totalPenalty = 0;
    for (const flag of riskFlags) {
      const [type, severity] = flag.split(':') as [string, keyof typeof this.penaltyFactors];
      if (this.penaltyFactors[severity]) {
        totalPenalty += this.penaltyFactors[severity];
      }
    }
    return -Math.min(totalPenalty, 100);
  }

  private computeFinalScore(breakdown: ScoreBreakdown): number {
    const score =
      breakdown.baseScore +
      breakdown.transactionBonus +
      breakdown.verificationBonus +
      breakdown.behaviorBonus +
      breakdown.historyBonus +
      breakdown.networkBonus +
      breakdown.penalties;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private calculateLevel(score: number): TrustLevel {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    if (score >= 25) return 'low';
    return 'critical';
  }

  private calculateNextReview(score: number, level: TrustLevel): Date {
    // Higher trust = longer review interval
    const days = {
      excellent: 90,
      high: 30,
      medium: 14,
      low: 7,
      critical: 1,
    };

    return new Date(Date.now() + days[level] * 24 * 60 * 60 * 1000);
  }

  private calculateTrendDirection(
    history: { timestamp: Date; score: number }[]
  ): { direction: 'improving' | 'stable' | 'declining'; averageChange: number } {
    if (history.length < 2) {
      return { direction: 'stable', averageChange: 0 };
    }

    let totalChange = 0;
    for (let i = 1; i < history.length; i++) {
      totalChange += history[i].score - history[i - 1].score;
    }

    const averageChange = totalChange / (history.length - 1);

    if (averageChange > 2) return { direction: 'improving', averageChange };
    if (averageChange < -2) return { direction: 'declining', averageChange };
    return { direction: 'stable', averageChange };
  }

  private getDefaultFactors(): TrustFactors {
    return {
      transactionReliability: 50,
      verificationStatus: 0,
      behavioralPattern: 50,
      historicalBehavior: 50,
      networkTrust: 50,
      riskIndicators: 100,
      complianceScore: 50,
    };
  }

  private getDefaultBreakdown(): ScoreBreakdown {
    return {
      baseScore: 50,
      transactionBonus: 0,
      verificationBonus: 0,
      behaviorBonus: 0,
      historyBonus: 0,
      networkBonus: 0,
      penalties: 0,
    };
  }

  private getFactorChanges(
    previous: TrustFactors,
    current: TrustFactors
  ): Partial<TrustFactors> {
    const changes: Partial<TrustFactors> = {};
    const keys = Object.keys(previous) as (keyof TrustFactors)[];

    for (const key of keys) {
      if (previous[key] !== current[key]) {
        (changes as any)[key] = current[key];
      }
    }

    return changes;
  }
}

export const scoreCalculator = new ScoreCalculator();
export default scoreCalculator;
