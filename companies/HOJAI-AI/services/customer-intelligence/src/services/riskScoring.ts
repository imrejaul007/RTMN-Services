import { Customer, ICustomer } from '../models/Customer';
import { RiskEvent, IRiskEvent } from '../models/RiskEvent';
import logger from '../utils/logger';

export interface RiskScoreInput {
  customerId: string;
  factors?: Array<{
    name: string;
    weight: number;
    data: Record<string, unknown>;
  }>;
}

export interface RiskScoreResult {
  customerId: string;
  overall: number;
  fraudRisk: number;
  churnRisk: number;
  creditRisk: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{
    name: string;
    score: number;
    weight: number;
    description: string;
  }>;
  recommendations: string[];
  calculatedAt: Date;
}

export interface RiskThresholds {
  high: number;
  medium: number;
  low: number;
}

const DEFAULT_THRESHOLDS: RiskThresholds = {
  high: 70,
  medium: 40,
  low: 20
};

class RiskScoringService {
  private thresholds: RiskThresholds;

  constructor(thresholds?: RiskThresholds) {
    this.thresholds = thresholds || DEFAULT_THRESHOLDS;
  }

  /**
   * Calculate comprehensive risk score for a customer
   */
  async calculateRiskScore(customerId: string): Promise<RiskScoreResult> {
    const customer = await Customer.findByCustomerId(customerId);
    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    const factors: Array<{
      name: string;
      score: number;
      weight: number;
      description: string;
    }> = [];

    // Calculate fraud risk
    const fraudScore = await this.calculateFraudRisk(customer, factors);

    // Calculate churn risk
    const churnScore = await this.calculateChurnRisk(customer, factors);

    // Calculate credit risk
    const creditScore = await this.calculateCreditRisk(customer, factors);

    // Account status factor
    if (customer.status === 'blocked') {
      factors.push({
        name: 'account_blocked',
        score: 100,
        weight: 0.5,
        description: 'Account is currently blocked'
      });
    }

    // Calculate overall score
    const overall = Math.min(100, Math.max(0,
      fraudScore * 0.4 + churnScore * 0.35 + creditScore * 0.25
    ));

    // Determine risk level
    const level = this.getRiskLevel(overall);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      overall,
      fraudScore,
      churnScore,
      creditScore,
      customer
    );

    // Update customer's risk score
    await this.updateCustomerRiskScore(customer, overall, fraudScore, churnScore, creditScore, factors);

    return {
      customerId,
      overall,
      fraudRisk: fraudScore,
      churnRisk: churnScore,
      creditRisk: creditScore,
      level,
      factors,
      recommendations,
      calculatedAt: new Date()
    };
  }

  /**
   * Calculate fraud risk score
   */
  private async calculateFraudRisk(
    customer: ICustomer,
    factors: Array<{ name: string; score: number; weight: number; description: string }>
  ): Promise<number> {
    let score = 0;
    const weight = 0.4;

    // Check for previous fraud events
    const fraudEvents = await RiskEvent.find({
      customerId: customer.customerId,
      eventType: { $in: ['fraud_attempt', 'suspicious_activity'] }
    });

    if (fraudEvents.length > 0) {
      const unresolved = fraudEvents.filter(e => !e.resolved).length;
      score += Math.min(50, unresolved * 25 + fraudEvents.length * 10);
      factors.push({
        name: 'fraud_history',
        score: Math.min(50, unresolved * 25 + fraudEvents.length * 10),
        weight,
        description: `${fraudEvents.length} fraud event(s), ${unresolved} unresolved`
      });
    }

    // Identity verification status
    const verifiedIdentities = customer.identities.filter(i => i.verified).length;
    const totalIdentities = customer.identities.length;

    if (totalIdentities > 0) {
      const verificationRatio = verifiedIdentities / totalIdentities;
      if (verificationRatio < 0.5) {
        score += 30;
        factors.push({
          name: 'low_identity_verification',
          score: 30,
          weight,
          description: `Only ${verifiedIdentities}/${totalIdentities} identities verified`
        });
      }
    }

    // Multiple identities (potential sign farming)
    if (customer.identities.length > 5) {
      score += 15;
      factors.push({
        name: 'excessive_identities',
        score: 15,
        weight,
        description: `${customer.identities.length} linked identities`
      });
    }

    // Recently created account with high-value activity
    const accountAgeDays = Math.floor(
      (Date.now() - customer.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (accountAgeDays < 30 && customer.metrics.totalRevenue > 10000) {
      score += 25;
      factors.push({
        name: 'new_account_high_value',
        score: 25,
        weight,
        description: `Account ${accountAgeDays} days old with ${customer.metrics.totalRevenue} revenue`
      });
    }

    // Rapid order velocity
    const recentOrders = customer.behaviors.filter(
      b => b.event === 'order_placed' &&
      Date.now() - b.timestamp.getTime() < 24 * 60 * 60 * 1000
    ).length;

    if (recentOrders > 10) {
      score += 20;
      factors.push({
        name: 'high_order_velocity',
        score: 20,
        weight,
        description: `${recentOrders} orders in last 24 hours`
      });
    }

    return Math.min(100, score);
  }

  /**
   * Calculate churn risk score
   */
  private async calculateChurnRisk(
    customer: ICustomer,
    factors: Array<{ name: string; score: number; weight: number; description: string }>
  ): Promise<number> {
    let score = 0;
    const weight = 0.35;

    // Days since last activity
    const daysSinceActivity = Math.floor(
      (Date.now() - (customer.lastActivityAt?.getTime() || customer.createdAt.getTime())) /
      (1000 * 60 * 60 * 24)
    );

    if (daysSinceActivity > 180) {
      score += 60;
      factors.push({
        name: 'inactive_180_days',
        score: 60,
        weight,
        description: `No activity for ${daysSinceActivity} days`
      });
    } else if (daysSinceActivity > 90) {
      score += 40;
      factors.push({
        name: 'inactive_90_days',
        score: 40,
        weight,
        description: `No activity for ${daysSinceActivity} days`
      });
    } else if (daysSinceActivity > 30) {
      score += 20;
      factors.push({
        name: 'inactive_30_days',
        score: 20,
        weight,
        description: `No activity for ${daysSinceActivity} days`
      });
    }

    // Declining engagement
    if (customer.metrics.engagementScore < 20) {
      score += 25;
      factors.push({
        name: 'low_engagement',
        score: 25,
        weight,
        description: `Engagement score: ${customer.metrics.engagementScore}`
      });
    } else if (customer.metrics.engagementScore < 40) {
      score += 15;
      factors.push({
        name: 'declining_engagement',
        score: 15,
        weight,
        description: `Engagement score: ${customer.metrics.engagementScore}`
      });
    }

    // Single purchase customers
    if (customer.metrics.totalOrders === 1) {
      const daysSinceFirstOrder = Math.floor(
        (Date.now() - (customer.metrics.firstOrderDate?.getTime() || customer.createdAt.getTime())) /
        (1000 * 60 * 60 * 24)
      );

      if (daysSinceFirstOrder > 60) {
        score += 20;
        factors.push({
          name: 'single_purchase_churn_risk',
          score: 20,
          weight,
          description: 'One-time buyer, no repeat purchase'
        });
      }
    }

    // Decreasing order frequency
    if (customer.metrics.totalOrders > 3) {
      const avgDaysBetweenOrders = customer.metrics.lifetimeDays / customer.metrics.totalOrders;
      if (avgDaysBetweenOrders > 90) {
        score += 15;
        factors.push({
          name: 'decreasing_order_frequency',
          score: 15,
          weight,
          description: `Average ${Math.round(avgDaysBetweenOrders)} days between orders`
        });
      }
    }

    // Status-based adjustment
    if (customer.status === 'inactive') {
      score += 10;
    } else if (customer.status === 'churned') {
      score += 30;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate credit risk score
   */
  private calculateCreditRisk(
    customer: ICustomer,
    factors: Array<{ name: string; score: number; weight: number; description: string }>
  ): number {
    let score = 0;
    const weight = 0.25;

    // Payment history (based on risk events)
    // This would normally integrate with payment service

    // Chargeback history
    // Score decreases for good payment behavior
    score += 0; // Default good behavior

    // Average order value relative to tier
    const tierAverages: Record<string, number> = {
      standard: 100,
      premium: 500,
      enterprise: 2000,
      vip: 5000
    };

    const expectedAOV = tierAverages[customer.tier] || 100;
    if (customer.metrics.averageOrderValue < expectedAOV * 0.3) {
      score += 20;
      factors.push({
        name: 'below_tier_aov',
        score: 20,
        weight,
        description: `AOV ${customer.metrics.averageOrderValue} below tier average ${expectedAOV}`
      });
    }

    // High-value order patterns
    if (customer.metrics.averageOrderValue > 5000) {
      score += 10;
      factors.push({
        name: 'high_value_orders',
        score: 10,
        weight,
        description: `High average order value: ${customer.metrics.averageOrderValue}`
      });
    }

    // VIP/Enterprise customers get lower credit risk
    if (customer.tier === 'vip' || customer.tier === 'enterprise') {
      score -= 20;
      factors.push({
        name: 'premium_tier',
        score: -20,
        weight,
        description: `${customer.tier} tier customer - lower credit risk`
      });
    }

    // Total lifetime value
    if (customer.metrics.totalRevenue > 100000) {
      score -= 10;
      factors.push({
        name: 'high_ltv',
        score: -10,
        weight,
        description: `High LTV customer: ${customer.metrics.totalRevenue}`
      });
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get risk level based on score
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= this.thresholds.high) return 'critical';
    if (score >= this.thresholds.medium) return 'high';
    if (score >= this.thresholds.low) return 'medium';
    return 'low';
  }

  /**
   * Generate risk-based recommendations
   */
  private generateRecommendations(
    overall: number,
    fraudScore: number,
    churnScore: number,
    creditScore: number,
    customer: ICustomer
  ): string[] {
    const recommendations: string[] = [];

    if (fraudScore >= 70) {
      recommendations.push('Review customer for potential fraud - enable enhanced verification');
      recommendations.push('Consider adding manual review step for orders');
      recommendations.push('Monitor for unusual activity patterns');
    }

    if (churnScore >= 70) {
      recommendations.push('Initiate retention campaign - customer at high churn risk');
      recommendations.push('Send personalized re-engagement offer');
      recommendations.push('Schedule outreach call with customer success');
    }

    if (creditScore >= 70) {
      recommendations.push('Review credit limit for this customer');
      recommendations.push('Consider requiring prepayment for high-value orders');
    }

    if (overall >= 70) {
      recommendations.push('Add customer to watch list');
      recommendations.push('Enable real-time alerting for customer activity');
    }

    if (customer.status === 'active' && customer.metrics.engagementScore < 30) {
      recommendations.push('Consider customer for loyalty/rewards program');
    }

    if (customer.identities.filter(i => !i.verified).length > 2) {
      recommendations.push('Request additional identity verification');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring - no immediate action required');
    }

    return recommendations;
  }

  /**
   * Update customer's stored risk score
   */
  private async updateCustomerRiskScore(
    customer: ICustomer,
    overall: number,
    fraudRisk: number,
    churnRisk: number,
    creditRisk: number,
    factors: Array<{ name: string; score: number; weight: number; description: string }>
  ): Promise<void> {
    customer.riskScore = {
      overall,
      fraudRisk,
      churnRisk,
      creditRisk,
      factors,
      calculatedAt: new Date()
    };

    // Update status if high risk
    if (overall >= this.thresholds.high) {
      // Don't auto-block, but flag for review
      customer.metadata = {
        ...customer.metadata,
        riskFlagged: true,
        riskFlaggedAt: new Date()
      };
    }

    await customer.save();
  }

  /**
   * Batch calculate risk scores for multiple customers
   */
  async batchCalculateRiskScores(customerIds: string[]): Promise<RiskScoreResult[]> {
    const results: RiskScoreResult[] = [];

    for (const customerId of customerIds) {
      try {
        const result = await this.calculateRiskScore(customerId);
        results.push(result);
      } catch (error) {
        logger.error(`Error calculating risk for ${customerId}:`, error);
      }
    }

    return results;
  }

  /**
   * Get risk distribution for all customers
   */
  async getRiskDistribution(): Promise<{
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
  }> {
    const distribution = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      unknown: 0
    };

    // This would be more efficient with aggregation in production
    const customers = await Customer.find({
      status: { $ne: 'blocked' }
    }).select('riskScore');

    for (const customer of customers) {
      if (!customer.riskScore || !customer.riskScore.calculatedAt) {
        distribution.unknown++;
        continue;
      }

      const level = this.getRiskLevel(customer.riskScore.overall);
      distribution[level]++;
    }

    return distribution;
  }

  /**
   * Get customers by risk level
   */
  async getCustomersByRiskLevel(level: 'low' | 'medium' | 'high' | 'critical'): Promise<ICustomer[]> {
    let minScore: number;
    let maxScore: number;

    switch (level) {
      case 'critical':
        minScore = this.thresholds.high;
        maxScore = 100;
        break;
      case 'high':
        minScore = this.thresholds.medium;
        maxScore = this.thresholds.high - 1;
        break;
      case 'medium':
        minScore = this.thresholds.low;
        maxScore = this.thresholds.medium - 1;
        break;
      case 'low':
        minScore = 0;
        maxScore = this.thresholds.low - 1;
        break;
    }

    return Customer.find({
      'riskScore.overall': { $gte: minScore, $lte: maxScore },
      'riskScore.calculatedAt': { $exists: true }
    }).sort({ 'riskScore.overall': -1 });
  }
}

export const riskScoringService = new RiskScoringService();
