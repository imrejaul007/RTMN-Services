import winston from 'winston';
import {
  MatchedPattern,
  RiskLevel,
  BlockAction,
  AlertSeverity,
  AlertDetail,
  RiskFactor
} from '../models/Fraud';
import { TransactionCheckRequest, RiskAssessment } from '../models/Transaction';

interface RiskWeights {
  velocity: number;
  amount: number;
  location: number;
  device: number;
  behavioral: number;
  network: number;
  time: number;
  custom: number;
}

export class RiskScorer {
  private logger: winston.Logger;
  private weights: RiskWeights = {
    velocity: 1.0,
    amount: 1.2,
    location: 1.1,
    device: 0.9,
    behavioral: 1.0,
    network: 1.5,
    time: 0.7,
    custom: 1.0
  };

  private thresholds = {
    high: 75,
    medium: 50,
    low: 25
  };

  private stats = {
    totalAssessments: 0,
    avgScore: 0,
    maxScore: 0,
    highRiskCount: 0
  };

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.loadConfig();
  }

  private loadConfig(): void {
    // Load from environment or use defaults
    this.thresholds.high = parseInt(process.env.HIGH_RISK_THRESHOLD || '75');
    this.thresholds.medium = parseInt(process.env.MEDIUM_RISK_THRESHOLD || '50');
    this.thresholds.low = parseInt(process.env.LOW_RISK_THRESHOLD || '25');
  }

  async assess(
    request: TransactionCheckRequest,
    matchedPatterns: MatchedPattern[]
  ): Promise<RiskAssessment> {
    const startTime = Date.now();
    const factors: RiskFactor[] = [];

    this.logger.debug('Starting risk assessment', {
      transactionId: request.transactionId,
      customerId: request.customerId
    });

    // Calculate base score from patterns
    let baseScore = 0;
    for (const pattern of matchedPatterns) {
      const weight = this.getWeightForPatternType(pattern.patternType);
      const contribution = pattern.contributingScore * weight;
      baseScore += contribution;

      factors.push({
        name: pattern.patternName,
        score: pattern.confidence,
        weight,
        reason: this.getReasonForPattern(pattern),
        details: {
          patternType: pattern.patternType,
          contributingScore: pattern.contributingScore
        }
      });
    }

    // Cap at 100
    const patternScore = Math.min(100, baseScore);

    // Calculate additional factors
    const contextFactors = this.evaluateContextFactors(request, matchedPatterns);

    // Combine scores
    const totalScore = Math.min(100, Math.round(patternScore + contextFactors.totalBonus));

    // Add context factors to the list
    factors.push(...contextFactors.factors);

    // Determine risk level
    const riskLevel = this.getRiskLevel(totalScore);

    // Determine block action
    const blockAction = this.determineBlockAction(totalScore, matchedPatterns);

    // Generate recommendations
    const recommendations = this.generateRecommendations(totalScore, matchedPatterns, contextFactors);

    // Get matched pattern IDs
    const matchedPatternIds = matchedPatterns.map(p => p.patternId);

    const processingTimeMs = Date.now() - startTime;

    // Update stats
    this.stats.totalAssessments++;
    this.stats.avgScore =
      (this.stats.avgScore * (this.stats.totalAssessments - 1) + totalScore) /
      this.stats.totalAssessments;
    this.stats.maxScore = Math.max(this.stats.maxScore, totalScore);
    if (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL) {
      this.stats.highRiskCount++;
    }

    const assessment: RiskAssessment = {
      score: totalScore,
      level: riskLevel,
      blockAction,
      factors,
      matchedPatterns: matchedPatternIds,
      recommendations,
      assessedAt: new Date(),
      processingTimeMs
    };

    this.logger.info('Risk assessment completed', {
      transactionId: request.transactionId,
      score: totalScore,
      level: riskLevel,
      matchedPatterns: matchedPatterns.length,
      processingTimeMs
    });

    return assessment;
  }

  private getWeightForPatternType(patternType: string): number {
    const typeMap: Record<string, keyof RiskWeights> = {
      velocity: 'velocity',
      amount_anomaly: 'amount',
      geo_anomaly: 'location',
      device_fingerprint: 'device',
      behavioral: 'behavioral',
      network: 'network',
      time_based: 'time',
      custom: 'custom'
    };

    const key = typeMap[patternType];
    return key ? this.weights[key] : 1.0;
  }

  private getReasonForPattern(pattern: MatchedPattern): string {
    if (pattern.details && pattern.details.length > 0) {
      const detail = pattern.details[0];
      return detail.message;
    }
    return `${pattern.patternName} pattern matched with ${pattern.confidence}% confidence`;
  }

  private evaluateContextFactors(
    request: TransactionCheckRequest,
    matchedPatterns: MatchedPattern[]
  ): { factors: RiskFactor[]; totalBonus: number } {
    const factors: RiskFactor[] = [];
    let totalBonus = 0;

    // New customer bonus
    if (request.metadata.customerTenureDays !== undefined) {
      if (request.metadata.customerTenureDays < 7) {
        const bonus = 10;
        totalBonus += bonus;
        factors.push({
          name: 'New Account',
          score: bonus,
          weight: 1,
          reason: 'Account less than 7 days old'
        });
      } else if (request.metadata.customerTenureDays < 30) {
        const bonus = 5;
        totalBonus += bonus;
        factors.push({
          name: 'Recent Account',
          score: bonus,
          weight: 1,
          reason: 'Account less than 30 days old'
        });
      }
    }

    // High-value transaction bonus
    if (request.amount > 5000) {
      const bonus = 15;
      totalBonus += bonus;
      factors.push({
        name: 'High Value',
        score: bonus,
        weight: 1,
        reason: `Transaction amount $${request.amount} exceeds $5000`
      });
    } else if (request.amount > 1000) {
      const bonus = 8;
      totalBonus += bonus;
      factors.push({
        name: 'Elevated Value',
        score: bonus,
        weight: 1,
        reason: `Transaction amount $${request.amount} exceeds $1000`
      });
    }

    // Unauthenticated transaction
    if (!request.metadata.authenticated) {
      const bonus = 12;
      totalBonus += bonus;
      factors.push({
        name: 'Unauthenticated',
        score: bonus,
        weight: 1,
        reason: 'Transaction without full authentication'
      });
    }

    // Multiple failed auth attempts
    if (request.metadata.loginAttempts !== undefined && request.metadata.loginAttempts > 2) {
      const bonus = 20;
      totalBonus += bonus;
      factors.push({
        name: 'Failed Auth Attempts',
        score: bonus,
        weight: 1,
        reason: `${request.metadata.loginAttempts} failed authentication attempts`
      });
    }

    // Card not present
    if (request.metadata.cardPresent === false) {
      const bonus = 5;
      totalBonus += bonus;
      factors.push({
        name: 'Card Not Present',
        score: bonus,
        weight: 1,
        reason: 'CNP transaction - higher fraud risk'
      });
    }

    // 3D Secure not used
    if (request.metadata.threeDSecure === false) {
      const bonus = 8;
      totalBonus += bonus;
      factors.push({
        name: 'No 3D Secure',
        score: bonus,
        weight: 1,
        reason: 'Transaction without 3D Secure authentication'
      });
    }

    // Address mismatch
    if (request.metadata.addressVerified === false) {
      const bonus = 10;
      totalBonus += bonus;
      factors.push({
        name: 'Address Mismatch',
        score: bonus,
        weight: 1,
        reason: 'Billing/shipping address not verified'
      });
    }

    // Risk based on merchant category
    const highRiskCategories = ['gambling', 'crypto', 'adult', 'gaming'];
    if (request.category && highRiskCategories.includes(request.category.toLowerCase())) {
      const bonus = 15;
      totalBonus += bonus;
      factors.push({
        name: 'High Risk Category',
        score: bonus,
        weight: 1,
        reason: `Merchant category "${request.category}" is high risk`
      });
    }

    return { factors, totalBonus };
  }

  private getRiskLevel(score: number): RiskLevel {
    if (score >= this.thresholds.high) return RiskLevel.CRITICAL;
    if (score >= this.thresholds.medium) return RiskLevel.HIGH;
    if (score >= this.thresholds.low) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  private determineBlockAction(score: number, matchedPatterns: MatchedPattern[]): BlockAction {
    const autoBlockEnabled = process.env.AUTO_BLOCK_ENABLED === 'true';
    const autoBlockThreshold = parseInt(process.env.AUTO_BLOCK_THRESHOLD || '90');

    // Network fraud - always block
    const hasNetworkFraud = matchedPatterns.some(p => p.patternType === 'network');
    if (hasNetworkFraud) return BlockAction.BLOCK;

    // Auto-block if enabled and above threshold
    if (autoBlockEnabled && score >= autoBlockThreshold) {
      return BlockAction.AUTO_BLOCK;
    }

    // Manual review for high risk
    if (score >= this.thresholds.high) return BlockAction.REVIEW;

    // Flag for medium risk
    if (score >= this.thresholds.medium) return BlockAction.FLAG;

    return BlockAction.NONE;
  }

  private generateRecommendations(
    score: number,
    matchedPatterns: MatchedPattern[],
    contextFactors: { factors: RiskFactor[]; totalBonus: number }
  ): string[] {
    const recommendations: string[] = [];

    // High risk recommendations
    if (score >= this.thresholds.high) {
      recommendations.push('Require additional verification (OTP, biometric)');
      recommendations.push('Consider manual review before approval');
      recommendations.push('Notify customer via alternate channel');
    }

    // Based on matched patterns
    const patternTypes = new Set(matchedPatterns.map(p => p.patternType));

    if (patternTypes.has('velocity')) {
      recommendations.push('Implement velocity limits for this customer');
    }

    if (patternTypes.has('amount_anomaly')) {
      recommendations.push('Contact customer to verify high-value transaction');
    }

    if (patternTypes.has('geo_anomaly')) {
      recommendations.push('Verify customer location via secure channel');
    }

    if (patternTypes.has('device_fingerprint')) {
      recommendations.push('Register device after successful verification');
    }

    if (patternTypes.has('network')) {
      recommendations.push('Review connected accounts for fraud ring');
      recommendations.push('Consider account freeze');
    }

    // Based on context factors
    for (const factor of contextFactors.factors) {
      if (factor.name === 'Failed Auth Attempts') {
        recommendations.push('Implement account lockout policy');
      }
      if (factor.name === 'No 3D Secure') {
        recommendations.push('Enforce 3D Secure for high-value transactions');
      }
    }

    // Default
    if (recommendations.length === 0) {
      recommendations.push('No additional action required');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  getStatus(): { enabled: boolean; avgScore: number } {
    return {
      enabled: true,
      avgScore: Math.round(this.stats.avgScore)
    };
  }

  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  setThreshold(level: 'high' | 'medium' | 'low', value: number): void {
    this.thresholds[level] = value;
  }

  setWeight(type: keyof RiskWeights, value: number): void {
    this.weights[type] = value;
  }
}
