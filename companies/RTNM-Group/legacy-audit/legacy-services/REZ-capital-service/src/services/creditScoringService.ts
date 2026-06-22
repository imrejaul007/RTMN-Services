import mongoose from 'mongoose';
import { MerchantHealth, IMerchantHealth } from '../models/MerchantHealth';
import { Loan } from '../models/Loan';

export class CreditScoringService {
  /**
   * Calculate health score from POS data (0-100)
   * Based on revenue trends, order patterns, and business stability
   */
  async calculateHealthScore(merchantId: string): Promise<number> {
    const health = await MerchantHealth.findOne({ merchantId });

    if (!health) {
      return 50; // Default neutral score for new merchants
    }

    let score = 50;

    // Revenue factor (0-20 points)
    // Higher revenue = better score
    const revenueFactor = Math.min(20, (health.monthlyRevenue / 50000) * 20);
    score += revenueFactor;

    // Order frequency factor (0-15 points)
    // Consistent order volume indicates stable business
    const orderFactor = Math.min(15, (health.orderCount / 500) * 15);
    score += orderFactor;

    // Average order value factor (0-15 points)
    // Higher AOV suggests more profitable business
    const aovFactor = Math.min(15, (health.avgOrderValue / 500) * 15);
    score += aovFactor;

    // Payment history factor (-20 to +20 points)
    const totalPayments = health.onTimePayments + health.latePayments + health.defaults;
    if (totalPayments > 0) {
      const paymentRatio = health.onTimePayments / totalPayments;
      const paymentFactor = (paymentRatio - 0.5) * 40; // -20 to +20
      score += paymentFactor;
    }

    // Defaults penalty
    if (health.defaults > 0) {
      score -= Math.min(30, health.defaults * 10);
    }

    // Clamp to 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate credit score (300-900)
   * Standard credit scoring model adapted for merchant lending
   */
  async calculateCreditScore(merchantId: string): Promise<number> {
    const health = await MerchantHealth.findOne({ merchantId });

    if (!health) {
      return 600; // Default score for new merchants
    }

    let score = 500; // Base score

    // Payment history (most important factor) - up to 200 points
    const totalPayments = health.onTimePayments + health.latePayments + health.defaults;
    if (totalPayments > 0) {
      const onTimeRatio = health.onTimePayments / totalPayments;
      score += Math.round(onTimeRatio * 200);
    }

    // Revenue impact - up to 100 points
    const revenuePoints = Math.min(100, Math.round((health.monthlyRevenue / 100000) * 100));
    score += revenuePoints;

    // Credit utilization - up to 50 points penalty or bonus
    if (health.creditLimit > 0) {
      const utilizationRatio = health.utilizedAmount / health.creditLimit;
      if (utilizationRatio > 0.8) {
        score -= 50; // High utilization is risky
      } else if (utilizationRatio < 0.3) {
        score += 25; // Low utilization is good
      }
    }

    // Defaults penalty
    score -= health.defaults * 30;

    // Late payments penalty
    score -= health.latePayments * 5;

    // Clamp to 300-900
    return Math.max(300, Math.min(900, score));
  }

  /**
   * Determine risk rating based on credit score
   */
  async determineRiskRating(merchantId: string): Promise<'low' | 'medium' | 'high'> {
    const creditScore = await this.calculateCreditScore(merchantId);

    if (creditScore >= 700) {
      return 'low';
    } else if (creditScore >= 550) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Calculate credit limit based on health metrics
   * Formula: Based on monthly revenue and credit score
   */
  async calculateCreditLimit(merchantId: string): Promise<number> {
    const health = await MerchantHealth.findOne({ merchantId });
    const creditScore = await this.calculateCreditScore(merchantId);

    if (!health) {
      return 0;
    }

    // Base limit: 30% of monthly revenue
    let baseLimit = health.monthlyRevenue * 0.3;

    // Score multiplier (0.5 to 1.5)
    const scoreMultiplier = 0.5 + (creditScore - 300) / 1200;

    // Risk adjustment
    let riskMultiplier = 1.0;
    if (creditScore >= 700) {
      riskMultiplier = 1.5; // Low risk - higher limit
    } else if (creditScore < 550) {
      riskMultiplier = 0.5; // High risk - lower limit
    }

    // Existing utilization check
    if (health.utilizedAmount > 0) {
      const utilizationRatio = health.utilizedAmount / health.creditLimit;
      if (utilizationRatio > 0.70) {
        riskMultiplier *= 0.5; // Reduce limit if currently highly utilized
      }
    }

    const calculatedLimit = baseLimit * scoreMultiplier * riskMultiplier;

    // Round to nearest 1000 and apply min/max
    const finalLimit = Math.round(calculatedLimit / 1000) * 1000;

    return Math.max(5000, Math.min(500000, finalLimit)); // Min 5K, Max 500K
  }

  /**
   * Update merchant health record with latest metrics
   */
  async updateMerchantHealth(
    merchantId: string,
    metrics: {
      monthlyRevenue?: number;
      avgOrderValue?: number;
      orderCount?: number;
    }
  ): Promise<IMerchantHealth> {
    let health = await MerchantHealth.findOne({ merchantId });

    if (!health) {
      health = new MerchantHealth({ merchantId });
    }

    if (metrics.monthlyRevenue !== undefined) {
      health.monthlyRevenue = metrics.monthlyRevenue;
    }
    if (metrics.avgOrderValue !== undefined) {
      health.avgOrderValue = metrics.avgOrderValue;
    }
    if (metrics.orderCount !== undefined) {
      health.orderCount = metrics.orderCount;
    }

    // Recalculate scores
    health.healthScore = await this.calculateHealthScore(merchantId);
    health.creditScore = await this.calculateCreditScore(merchantId);
    health.riskRating = await this.determineRiskRating(merchantId);
    health.creditLimit = await this.calculateCreditLimit(merchantId);
    health.availableCredit = health.creditLimit - health.utilizedAmount;

    await health.save();
    return health;
  }

  /**
   * Record a payment event
   */
  async recordPayment(
    merchantId: string,
    wasOnTime: boolean,
    wasDefault: boolean = false
  ): Promise<void> {
    const health = await MerchantHealth.findOne({ merchantId });

    if (!health) {
      throw new Error(`Merchant health record not found for ${merchantId}`);
    }

    if (wasDefault) {
      health.defaults += 1;
    } else if (wasOnTime) {
      health.onTimePayments += 1;
    } else {
      health.latePayments += 1;
    }

    // Recalculate scores
    health.healthScore = await this.calculateHealthScore(merchantId);
    health.creditScore = await this.calculateCreditScore(merchantId);
    health.riskRating = await this.determineRiskRating(merchantId);

    await health.save();
  }

  /**
   * Update credit utilization when loan is disbursed or repaid
   */
  async updateUtilization(
    merchantId: string,
    amount: number,
    operation: 'add' | 'remove'
  ): Promise<void> {
    const health = await MerchantHealth.findOne({ merchantId });

    if (!health) {
      throw new Error(`Merchant health record not found for ${merchantId}`);
    }

    if (operation === 'add') {
      health.utilizedAmount += amount;
    } else {
      health.utilizedAmount = Math.max(0, health.utilizedAmount - amount);
    }

    health.availableCredit = health.creditLimit - health.utilizedAmount;
    await health.save();
  }

  /**
   * Update credit utilization with MongoDB session support for transactions
   */
  async updateUtilizationWithSession(
    merchantId: string,
    amount: number,
    operation: 'add' | 'remove',
    session: mongoose.ClientSession
  ): Promise<void> {
    const health = await MerchantHealth.findOne({ merchantId }).session(session);

    if (!health) {
      throw new Error(`Merchant health record not found for ${merchantId}`);
    }

    if (operation === 'add') {
      health.utilizedAmount += amount;
    } else {
      health.utilizedAmount = Math.max(0, health.utilizedAmount - amount);
    }

    health.availableCredit = health.creditLimit - health.utilizedAmount;
    await health.save({ session });
  }

  /**
   * Get full credit profile for a merchant
   */
  async getCreditProfile(merchantId: string): Promise<{
    health: IMerchantHealth;
    healthScore: number;
    creditScore: number;
    riskRating: 'low' | 'medium' | 'high';
    creditLimit: number;
    availableCredit: number;
  }> {
    const health = await MerchantHealth.findOne({ merchantId });

    if (!health) {
      return {
        health: null as any,
        healthScore: 50,
        creditScore: 600,
        riskRating: 'medium',
        creditLimit: 0,
        availableCredit: 0,
      };
    }

    return {
      health,
      healthScore: await this.calculateHealthScore(merchantId),
      creditScore: await this.calculateCreditScore(merchantId),
      riskRating: await this.determineRiskRating(merchantId),
      creditLimit: health.creditLimit,
      availableCredit: health.availableCredit,
    };
  }
}

export const creditScoringService = new CreditScoringService();
