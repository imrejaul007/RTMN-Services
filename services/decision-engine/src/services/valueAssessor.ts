import {
  DecisionRequest,
  ValueAssessment,
  CustomerTier
} from '../types';
import { Factor } from '../models/Factor';
import { logger } from '../utils/logger';

interface ValueFactor {
  name: string;
  score: number;
  weight: number;
  contribution: number;
}

export class ValueAssessor {
  private tenantId: string;
  private thresholds = {
    standard: 0,
    silver: 1000,
    gold: 5000,
    platinum: 10000,
    vip: 50000
  };

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Assess customer value for the decision
   */
  async assessValue(request: DecisionRequest): Promise<ValueAssessment> {
    const startTime = Date.now();
    logger.info(`Assessing customer value`, {
      tenantId: this.tenantId,
      customerId: request.customer.id
    });

    // Calculate component scores
    const ltvScore = this.calculateLTVScore(request.customer.lifetimeValue);
    const engagementScore = this.calculateEngagementScore(request);
    const potentialScore = this.calculatePotentialScore(request);

    // Build value factors
    const factors: ValueFactor[] = [
      {
        name: 'Lifetime Value',
        score: ltvScore,
        weight: 40,
        contribution: (ltvScore * 40) / 100
      },
      {
        name: 'Engagement',
        score: engagementScore,
        weight: 30,
        contribution: (engagementScore * 30) / 100
      },
      {
        name: 'Potential',
        score: potentialScore,
        weight: 30,
        contribution: (potentialScore * 30) / 100
      }
    ];

    // Calculate overall value score
    const valueScore = factors.reduce((sum, f) => sum + f.contribution, 0);

    // Determine value tier
    const valueTier = this.determineTier(valueScore);

    // Normalize scores for output
    const normalizedFactors = factors.map(f => ({
      factor: f.name,
      contribution: Math.round(f.contribution * 100) / 100
    }));

    const processingTime = Date.now() - startTime;

    logger.info(`Value assessment complete`, {
      tenantId: this.tenantId,
      customerId: request.customer.id,
      valueScore,
      valueTier,
      processingTime
    });

    return {
      score: Math.round(valueScore),
      tier: valueTier,
      ltvScore,
      engagementScore,
      potentialScore,
      factors: normalizedFactors
    };
  }

  /**
   * Calculate Lifetime Value score (0-100)
   */
  private calculateLTVScore(lifetimeValue: number): number {
    // Normalize LTV to 0-100 scale
    if (lifetimeValue >= this.thresholds.vip) {
      return 100;
    } else if (lifetimeValue >= this.thresholds.platinum) {
      return 85 + ((lifetimeValue - this.thresholds.platinum) / (this.thresholds.vip - this.thresholds.platinum)) * 15;
    } else if (lifetimeValue >= this.thresholds.gold) {
      return 60 + ((lifetimeValue - this.thresholds.gold) / (this.thresholds.platinum - this.thresholds.gold)) * 25;
    } else if (lifetimeValue >= this.thresholds.silver) {
      return 30 + ((lifetimeValue - this.thresholds.silver) / (this.thresholds.gold - this.thresholds.silver)) * 30;
    }
    return (lifetimeValue / this.thresholds.silver) * 30;
  }

  /**
   * Calculate engagement score based on interaction patterns
   */
  private calculateEngagementScore(request: DecisionRequest): number {
    const { customer } = request;
    let score = 50; // Base score

    // Account age factor
    if (customer.accountAge > 365) {
      score += 15;
    } else if (customer.accountAge > 180) {
      score += 10;
    } else if (customer.accountAge > 90) {
      score += 5;
    }

    // Interaction frequency
    if (customer.previousInteractions > 50) {
      score += 15;
    } else if (customer.previousInteractions > 20) {
      score += 10;
    } else if (customer.previousInteractions > 5) {
      score += 5;
    }

    // Satisfaction score
    if (customer.satisfactionScore !== undefined) {
      score = (score + customer.satisfactionScore) / 2;
    }

    // Refund behavior (lower is better for engagement)
    if (customer.previousRefunds === 0) {
      score += 10;
    } else if (customer.previousRefunds <= 2) {
      score += 5;
    } else if (customer.previousRefunds > 5) {
      score -= 15;
    }

    // Tags bonus
    if (customer.tags && customer.tags.length > 3) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate potential value score
   */
  private calculatePotentialScore(request: DecisionRequest): number {
    const { customer, transaction } = request;
    let score = 50; // Base score

    // Current tier potential
    switch (customer.tier) {
      case 'vip':
        score = 100;
        break;
      case 'platinum':
        score = 85 + (customer.previousInteractions > 20 ? 15 : 0);
        break;
      case 'gold':
        score = 70 + (customer.previousInteractions > 10 ? 10 : 0);
        break;
      case 'silver':
        score = 50 + (customer.accountAge > 180 ? 10 : 0);
        break;
      default:
        score = 30 + (customer.accountAge > 90 ? 10 : 0);
    }

    // Transaction value potential
    if (transaction?.amount) {
      if (transaction.amount > 50000) {
        score = Math.min(100, score + 10);
      } else if (transaction.amount > 25000) {
        score = Math.min(100, score + 5);
      }
    }

    // Upsell/cross-sell potential based on transaction items
    if (transaction?.items && transaction.items.length > 3) {
      score = Math.min(100, score + 5);
    }

    // Discount sensitivity (higher means more responsive to offers)
    if (request.type === 'discount') {
      score = Math.min(100, score + 10);
    }

    return Math.round(score);
  }

  /**
   * Determine value tier based on score
   */
  private determineTier(score: number): CustomerTier {
    if (score >= 90) {
      return 'vip';
    } else if (score >= 75) {
      return 'platinum';
    } else if (score >= 55) {
      return 'gold';
    } else if (score >= 35) {
      return 'silver';
    }
    return 'standard';
  }

  /**
   * Calculate customer retention probability
   */
  calculateRetentionProbability(assessment: ValueAssessment, riskScore: number): number {
    // Higher value + lower risk = higher retention
    const valueFactor = assessment.score / 100;
    const riskFactor = 1 - (riskScore / 100);

    // Weighted combination
    const retentionProb = (valueFactor * 0.6) + (riskFactor * 0.4);

    return Math.round(retentionProb * 100);
  }

  /**
   * Calculate customer lifetime remaining
   */
  estimateRemainingLifetime(assessment: ValueAssessment, accountAge: number): number {
    // Simple estimation based on tier
    const expectedLifetimes = {
      standard: 1,    // 1 year
      silver: 2,      // 2 years
      gold: 3,        // 3 years
      platinum: 5,    // 5 years
      vip: 10         // 10 years
    };

    const expectedYears = expectedLifetimes[assessment.tier];
    const remainingYears = Math.max(0, expectedYears - (accountAge / 365));

    return Math.round(remainingYears * 365); // Return in days
  }

  /**
   * Update thresholds from configuration
   */
  setThresholds(thresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }
}
