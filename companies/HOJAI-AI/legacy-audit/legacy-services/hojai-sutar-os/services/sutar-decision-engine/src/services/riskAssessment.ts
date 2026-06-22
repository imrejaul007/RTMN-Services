// ============================================================================
// SUTAR Decision Engine - Risk Assessment Service
// ============================================================================

import type { DecisionContext, RiskAssessment, RiskFactor, RiskLevel } from '../types/index.js';
import { RiskLevel as RiskLevelEnum } from '../types/index.js';

/**
 * Risk factor weights by category
 */
const CATEGORY_WEIGHTS = {
  behavioral: 0.3,
  transactional: 0.25,
  historical: 0.3,
  contextual: 0.15,
};

/**
 * Risk thresholds
 */
const RISK_THRESHOLDS = {
  LOW: { min: 0, max: 25 },
  MEDIUM: { min: 26, max: 50 },
  HIGH: { min: 51, max: 75 },
  CRITICAL: { min: 76, max: 100 },
};

/**
 * RiskAssessmentService calculates risk scores based on context factors
 */
export class RiskAssessmentService {
  /**
   * Assess risk based on decision context
   */
  assess(context: DecisionContext): RiskAssessment {
    const factors: RiskFactor[] = [];
    let totalWeightedScore = 0;
    let totalWeight = 0;

    // Assess behavioral factors
    const behavioralFactors = this.assessBehavioralFactors(context);
    factors.push(...behavioralFactors);

    // Assess transactional factors
    const transactionalFactors = this.assessTransactionalFactors(context);
    factors.push(...transactionalFactors);

    // Assess historical factors
    const historicalFactors = this.assessHistoricalFactors(context);
    factors.push(...historicalFactors);

    // Assess contextual factors
    const contextualFactors = this.assessContextualFactors(context);
    factors.push(...contextualFactors);

    // Calculate weighted score
    for (const factor of factors) {
      totalWeightedScore += factor.score * factor.weight;
      totalWeight += factor.weight;
    }

    const overallScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
    const level = this.determineRiskLevel(overallScore);
    const riskIndicators = this.identifyRiskIndicators(factors, overallScore);
    const confidence = this.calculateConfidence(factors);

    return {
      overallScore,
      level,
      factors,
      maxPossibleScore: 100,
      confidence,
      assessmentDate: new Date().toISOString(),
      riskIndicators,
    };
  }

  /**
   * Assess behavioral risk factors
   */
  private assessBehavioralFactors(context: DecisionContext): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Customer tier risk
    if (context.customerTier) {
      const tierScores: Record<string, number> = {
        standard: 40,
        premium: 20,
        vip: 5,
      };
      factors.push({
        name: 'customer_tier',
        score: tierScores[context.customerTier] || 30,
        weight: CATEGORY_WEIGHTS.behavioral,
        description: `Customer tier: ${context.customerTier}`,
        category: 'behavioral',
      });
    }

    // Account age risk
    if (context.accountAge !== undefined) {
      let score = 50;
      if (context.accountAge >= 365) score = 5;
      else if (context.accountAge >= 180) score = 15;
      else if (context.accountAge >= 90) score = 25;
      else if (context.accountAge >= 30) score = 40;

      factors.push({
        name: 'account_age',
        score,
        weight: CATEGORY_WEIGHTS.behavioral,
        description: `Account age: ${context.accountAge} days`,
        category: 'behavioral',
      });
    }

    return factors;
  }

  /**
   * Assess transactional risk factors
   */
  private assessTransactionalFactors(context: DecisionContext): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Transaction amount risk
    if (context.amount !== undefined) {
      let score = 20;
      if (context.amount >= 10000) score = 80;
      else if (context.amount >= 5000) score = 60;
      else if (context.amount >= 1000) score = 40;
      else if (context.amount >= 500) score = 25;

      factors.push({
        name: 'transaction_amount',
        score,
        weight: CATEGORY_WEIGHTS.transactional,
        description: `Transaction amount: ${context.currency || 'USD'} ${context.amount}`,
        category: 'transactional',
      });
    }

    // Transaction count risk
    if (context.transactionCount !== undefined) {
      let score = 20;
      if (context.transactionCount >= 100) score = 70;
      else if (context.transactionCount >= 50) score = 50;
      else if (context.transactionCount >= 20) score = 30;
      else if (context.transactionCount >= 10) score = 15;

      factors.push({
        name: 'transaction_count',
        score,
        weight: CATEGORY_WEIGHTS.transactional,
        description: `Transaction count: ${context.transactionCount}`,
        category: 'transactional',
      });
    }

    return factors;
  }

  /**
   * Assess historical risk factors
   */
  private assessHistoricalFactors(context: DecisionContext): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Previous decision risk
    if (context.previousDecisions && context.previousDecisions.length > 0) {
      const rejections = context.previousDecisions.filter(d => d.outcome === 'REJECT').length;
      const holds = context.previousDecisions.filter(d => d.outcome === 'HOLD').length;
      const total = context.previousDecisions.length;

      let score = 10;
      if (rejections / total > 0.3) score = 70;
      else if (rejections / total > 0.1) score = 50;
      else if (holds / total > 0.5) score = 40;
      else if (rejections / total > 0) score = 30;

      factors.push({
        name: 'previous_decisions',
        score,
        weight: CATEGORY_WEIGHTS.historical,
        description: `${rejections} rejections, ${holds} holds from ${total} previous decisions`,
        category: 'historical',
      });
    }

    // External risk score
    if (context.riskScore !== undefined) {
      factors.push({
        name: 'external_risk_score',
        score: context.riskScore,
        weight: CATEGORY_WEIGHTS.historical,
        description: `External risk score: ${context.riskScore}`,
        category: 'historical',
      });
    }

    return factors;
  }

  /**
   * Assess contextual risk factors
   */
  private assessContextualFactors(context: DecisionContext): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Decision type risk
    const typeRiskScores: Record<string, number> = {
      FRAUD: 60,
      PRICING: 40,
      APPROVAL: 50,
      CASHBACK: 30,
      OFFER: 25,
      PERSONALIZATION: 15,
      ROUTING: 20,
      NEXT_ACTION: 15,
      RETENTION: 20,
      RISK: 55,
    };

    factors.push({
      name: 'decision_type',
      score: typeRiskScores[context.decisionType] || 30,
      weight: CATEGORY_WEIGHTS.contextual,
      description: `Decision type: ${context.decisionType}`,
      category: 'contextual',
    });

    // Customer age risk
    if (context.customerAge !== undefined) {
      let score = 30;
      if (context.customerAge < 18) score = 60;
      else if (context.customerAge < 25) score = 45;
      else if (context.customerAge >= 65) score = 40;

      factors.push({
        name: 'customer_age',
        score,
        weight: CATEGORY_WEIGHTS.contextual,
        description: `Customer age: ${context.customerAge}`,
        category: 'contextual',
      });
    }

    return factors;
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score <= RISK_THRESHOLDS.LOW.max) return RiskLevelEnum.LOW;
    if (score <= RISK_THRESHOLDS.MEDIUM.max) return RiskLevelEnum.MEDIUM;
    if (score <= RISK_THRESHOLDS.HIGH.max) return RiskLevelEnum.HIGH;
    return RiskLevelEnum.CRITICAL;
  }

  /**
   * Identify key risk indicators
   */
  private identifyRiskIndicators(factors: RiskFactor[], overallScore: number): string[] {
    const indicators: string[] = [];

    // High-scoring factors become indicators
    const highScoringFactors = factors
      .filter(f => f.score >= 60)
      .sort((a, b) => b.score - a.score);

    for (const factor of highScoringFactors.slice(0, 3)) {
      indicators.push(`${factor.name}: ${factor.score} (${factor.category})`);
    }

    // Overall level indicator
    if (overallScore >= 75) {
      indicators.push('CRITICAL_RISK_THRESHOLD_REACHED');
    }

    return indicators;
  }

  /**
   * Calculate confidence in the assessment
   */
  private calculateConfidence(factors: RiskFactor[]): number {
    if (factors.length === 0) return 0;

    // More factors = higher confidence
    const factorCountScore = Math.min(factors.length / 5, 1) * 50;

    // Weight coverage
    const coveredCategories = new Set(factors.map(f => f.category)).size;
    const categoryCoverageScore = (coveredCategories / 4) * 50;

    return Math.round(factorCountScore + categoryCoverageScore);
  }
}
