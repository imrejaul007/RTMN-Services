import {
  DecisionRequest,
  RiskAssessment,
  RiskLevel,
  DecisionFactor
} from '../types';
import { Factor } from '../models/Factor';
import { logger } from '../utils/logger';

export class RiskCalculator {
  private tenantId: string;
  private thresholds = {
    low: 30,
    medium: 60,
    high: 80
  };

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Calculate overall risk score for a decision request
   */
  async calculateRisk(request: DecisionRequest): Promise<RiskAssessment> {
    const startTime = Date.now();
    logger.info(`Calculating risk for ${request.type} request`, {
      tenantId: this.tenantId,
      customerId: request.customer.id
    });

    // Get all risk factors for this tenant
    const factors = await Factor.findRiskFactors(this.tenantId);

    // Build context for evaluation
    const context = this.buildContext(request);

    // Evaluate each factor
    const evaluatedFactors = await this.evaluateFactors(factors, context);

    // Calculate weighted risk score
    const riskScore = this.calculateWeightedScore(evaluatedFactors);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(riskScore);

    // Identify risk flags
    const flags = this.identifyFlags(request, evaluatedFactors);

    // Generate risk factors with reasons
    const riskFactors = evaluatedFactors.map(f => ({
      factor: f.name,
      contribution: f.contribution,
      reason: f.reason
    }));

    const processingTime = Date.now() - startTime;

    logger.info(`Risk calculation complete`, {
      tenantId: this.tenantId,
      riskScore,
      riskLevel,
      processingTime
    });

    return {
      score: Math.round(riskScore),
      level: riskLevel,
      factors: riskFactors,
      flags
    };
  }

  /**
   * Build evaluation context from request
   */
  private buildContext(request: DecisionRequest): Record<string, unknown> {
    const context: Record<string, unknown> = {
      // Customer factors
      customerId: request.customer.id,
      customerTier: request.customer.tier,
      accountAge: request.customer.accountAge,
      lifetimeValue: request.customer.lifetimeValue,
      previousRefunds: request.customer.previousRefunds,
      previousDisputes: request.customer.previousDisputes,
      satisfactionScore: request.customer.satisfactionScore,

      // Transaction factors
      transactionId: request.transaction?.id,
      transactionAmount: request.transaction?.amount,
      transactionType: request.transaction?.type,
      transactionDate: request.transaction?.date,

      // Request factors
      requestType: request.type,
      requestedAmount: request.requestedAmount,
      priority: request.priority,
      reason: request.reason,

      // Context factors
      channel: request.context?.channel,
      agentId: request.context?.agentId
    };

    return context;
  }

  /**
   * Evaluate all factors and return results with contributions
   */
  private async evaluateFactors(
    factors: any[],
    context: Record<string, unknown>
  ): Promise<Array<{
    name: string;
    score: number;
    weight: number;
    contribution: number;
    reason: string;
  }>> {
    const results = [];

    for (const factor of factors) {
      const fieldValue = this.getNestedValue(context, factor.factorId.replace(`${this.tenantId}:`, ''));
      const score = factor.calculateScore(fieldValue);
      const weightedContribution = (score * factor.weight) / 100;

      // Determine reason based on score and direction
      const reason = this.generateReason(factor, fieldValue, score);

      results.push({
        name: factor.name,
        score,
        weight: factor.weight,
        contribution: Math.round(weightedContribution * 100) / 100,
        reason
      });
    }

    return results;
  }

  /**
   * Get nested value from context object
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Calculate weighted risk score
   */
  private calculateWeightedScore(evaluatedFactors: Array<{
    name: string;
    score: number;
    weight: number;
    contribution: number;
    reason: string;
  }>): number {
    if (evaluatedFactors.length === 0) {
      return 25; // Default low risk
    }

    const totalWeight = evaluatedFactors.reduce((sum, f) => sum + f.weight, 0);
    if (totalWeight === 0) {
      return 25;
    }

    const weightedSum = evaluatedFactors.reduce((sum, f) => {
      // For risk factors, higher score = higher risk
      return sum + (f.score * f.weight);
    }, 0);

    return weightedSum / totalWeight;
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score < this.thresholds.low) {
      return 'low';
    } else if (score < this.thresholds.medium) {
      return 'medium';
    } else if (score < this.thresholds.high) {
      return 'high';
    }
    return 'critical';
  }

  /**
   * Identify risk flags based on specific conditions
   */
  private identifyFlags(
    request: DecisionRequest,
    evaluatedFactors: Array<{
      name: string;
      score: number;
      weight: number;
      contribution: number;
      reason: string;
    }>
  ): string[] {
    const flags: string[] = [];

    // Check refund history
    if (request.customer.previousRefunds > 5) {
      flags.push('EXCESSIVE_REFUND_HISTORY');
    } else if (request.customer.previousRefunds > 3) {
      flags.push('ELEVATED_REFUND_HISTORY');
    }

    // Check dispute history
    if (request.customer.previousDisputes > 0) {
      flags.push('PREVIOUS_DISPUTES');
    }

    // Check account age
    if (request.customer.accountAge < 30) {
      flags.push('NEW_ACCOUNT');
    }

    // Check transaction amount
    if (request.transaction?.amount && request.transaction.amount > 100000) {
      flags.push('HIGH_VALUE_TRANSACTION');
    }

    // Check if refund exceeds transaction amount
    if (
      request.type === 'refund' &&
      request.requestedAmount &&
      request.transaction?.amount &&
      request.requestedAmount > request.transaction.amount
    ) {
      flags.push('REFUND_EXCEEDS_TRANSACTION');
    }

    // Check customer tier
    if (request.customer.tier === 'standard' && request.requestedAmount && request.requestedAmount > 25000) {
      flags.push('STANDARD_TIER_HIGH_REFUND');
    }

    // Check priority
    if (request.priority === 'critical' || request.priority === 'urgent') {
      flags.push('HIGH_PRIORITY_REQUEST');
    }

    // Check for patterns in evaluated factors
    const highRiskFactors = evaluatedFactors.filter(f => f.score < 30);
    if (highRiskFactors.length >= 3) {
      flags.push('MULTIPLE_HIGH_RISK_FACTORS');
    }

    return flags;
  }

  /**
   * Generate human-readable reason for factor score
   */
  private generateReason(factor: any, value: unknown, score: number): string {
    const factorName = factor.name;
    const valueStr = String(value ?? 'unknown');

    if (score < 30) {
      return `${factorName} is high risk (${valueStr})`;
    } else if (score < 60) {
      return `${factorName} is moderate (${valueStr})`;
    } else if (score < 80) {
      return `${factorName} is good (${valueStr})`;
    }
    return `${factorName} is excellent (${valueStr})`;
  }

  /**
   * Adjust thresholds based on configuration
   */
  setThresholds(thresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }
}
