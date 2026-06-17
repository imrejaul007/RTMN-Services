/**
 * Fraud Detection Service
 * Risk scoring and fraud prevention
 */

import { v4 as uuidv4 } from 'uuid';
import { FraudRiskScore, FraudRiskFactor } from '../types';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

export class FraudDetectionService {
  // Risk indicators
  private readonly riskIndicators = [
    {
      name: 'Velocity',
      description: 'High transaction velocity',
      weight: 25,
      threshold: 10, // transactions per hour
    },
    {
      name: 'Amount Variance',
      description: 'Unusual transaction amounts',
      weight: 20,
      threshold: 3, // standard deviations
    },
    {
      name: 'Geographic',
      description: 'Transactions from multiple locations',
      weight: 15,
      threshold: 2, // locations per day
    },
    {
      name: 'Time Pattern',
      description: 'Unusual transaction timing',
      weight: 10,
      threshold: 3, // AM hours
    },
    {
      name: 'Account Age',
      description: 'New or recently created account',
      weight: 15,
      threshold: 30, // days
    },
    {
      name: 'Device Fingerprint',
      description: 'Multiple devices or new device',
      weight: 10,
      threshold: 2, // devices
    },
    {
      name: 'Payment Method',
      description: 'New or high-risk payment method',
      weight: 5,
      threshold: 1, // new methods
    },
  ];

  /**
   * Calculate fraud risk score for an entity
   */
  async calculateRiskScore(
    entityId: string,
    entityType: 'customer' | 'vendor' | 'account'
  ): Promise<FraudRiskScore> {
    logger.info(`Calculating fraud risk score for ${entityType} ${entityId}`);

    const factors: FraudRiskFactor[] = [];
    let totalScore = 0;
    let activeFactors = 0;

    // Simulate risk indicator checks
    for (const indicator of this.riskIndicators) {
      const detected = Math.random() > 0.7; // Simulate detection
      const severity = Math.random(); // How bad is it

      if (detected) {
        activeFactors++;
        const factorScore = Math.round(indicator.weight * severity);

        factors.push({
          name: indicator.name,
          weight: indicator.weight,
          description: indicator.description,
          detected: true,
        });

        totalScore += factorScore;
      } else {
        factors.push({
          name: indicator.name,
          weight: indicator.weight,
          description: indicator.description,
          detected: false,
        });
      }
    }

    // Normalize score
    const maxPossibleScore = factors
      .filter((f) => f.detected)
      .reduce((sum, f) => sum + f.weight, 0);
    const score = maxPossibleScore > 0 ? Math.min(100, Math.round(totalScore)) : 5;

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (score < 20) {
      riskLevel = 'low';
    } else if (score < 40) {
      riskLevel = 'medium';
    } else if (score < 70) {
      riskLevel = 'high';
    } else {
      riskLevel = 'critical';
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(score, activeFactors, factors);

    return {
      id: uuidv4(),
      entityId,
      entityType,
      score,
      riskLevel,
      factors,
      lastUpdated: new Date(),
      recommendations,
    };
  }

  /**
   * Generate recommendations based on risk factors
   */
  private generateRecommendations(
    score: number,
    activeFactors: number,
    factors: FraudRiskFactor[]
  ): string[] {
    const recommendations: string[] = [];

    if (score >= 70) {
      recommendations.push('Block transactions pending manual review');
      recommendations.push('Contact customer via verified phone number');
      recommendations.push('Enable additional verification (2FA)');
    } else if (score >= 40) {
      recommendations.push('Flag for enhanced monitoring');
      recommendations.push('Require additional verification for transactions over $500');
      recommendations.push('Send notification to account email');
    } else {
      recommendations.push('Continue standard monitoring');
      if (activeFactors > 2) {
        recommendations.push('Monitor for changes in behavior patterns');
      }
    }

    // Specific recommendations based on detected factors
    const detectedNames = factors.filter((f) => f.detected).map((f) => f.name);

    if (detectedNames.includes('Velocity')) {
      recommendations.push('Consider implementing rate limiting');
    }
    if (detectedNames.includes('Geographic')) {
      recommendations.push('Verify location with recent login history');
    }
    if (detectedNames.includes('Payment Method')) {
      recommendations.push('Review payment method for potential issues');
    }

    return recommendations;
  }

  /**
   * Get fraud risk summary
   */
  async getFraudSummary(): Promise<{
    totalEntities: number;
    lowRisk: number;
    mediumRisk: number;
    highRisk: number;
    criticalRisk: number;
    avgScore: number;
    topRiskFactors: string[];
  }> {
    // Simulated summary
    const totalEntities = Math.floor(Math.random() * 1000) + 500;
    const criticalRisk = Math.floor(totalEntities * 0.02);
    const highRisk = Math.floor(totalEntities * 0.05);
    const mediumRisk = Math.floor(totalEntities * 0.15);
    const lowRisk = totalEntities - criticalRisk - highRisk - mediumRisk;

    const topRiskFactors = ['Velocity', 'Geographic', 'Amount Variance', 'Account Age'];

    return {
      totalEntities,
      lowRisk,
      mediumRisk,
      highRisk,
      criticalRisk,
      avgScore: Math.round(Math.random() * 30) + 10,
      topRiskFactors,
    };
  }

  /**
   * Check transaction for fraud
   */
  async checkTransaction(
    transactionId: string,
    amount: number,
    customerId: string,
    merchantId?: string
  ): Promise<{
    flagged: boolean;
    action: 'allow' | 'review' | 'block';
    score: number;
    reason?: string;
  }> {
    logger.info(`Checking transaction ${transactionId} for fraud`);

    // Quick risk assessment
    let score = 0;
    let reason = '';

    // High amount check
    if (amount > 5000) {
      score += 30;
      reason += 'High transaction amount. ';
    }
    if (amount > 10000) {
      score += 20;
      reason += 'Very high transaction amount. ';
    }

    // Velocity check (simulated)
    const velocity = Math.random() * 20;
    if (velocity > 10) {
      score += 25;
      reason += 'High transaction velocity detected. ';
    }

    // New merchant check (simulated)
    const isNewMerchant = Math.random() > 0.8;
    if (isNewMerchant) {
      score += 15;
      reason += 'First transaction with new merchant. ';
    }

    // Unusual time (simulated)
    const hour = new Date().getHours();
    if (hour >= 2 && hour <= 5) {
      score += 10;
      reason += 'Transaction during unusual hours. ';
    }

    score = Math.min(100, score);

    // Determine action
    let action: 'allow' | 'review' | 'block';
    if (score < 30) {
      action = 'allow';
    } else if (score < 60) {
      action = 'review';
    } else {
      action = 'block';
    }

    return {
      flagged: score >= 30,
      action,
      score,
      reason: reason || undefined,
    };
  }
}

export const fraudDetectionService = new FraudDetectionService();
