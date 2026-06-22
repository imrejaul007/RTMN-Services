import { MerchantHealth } from '../models/MerchantHealth';
import { Loan } from '../models/Loan';
import { creditScoringService } from './creditScoringService';

export interface Anomaly {
  type: 'revenue_spike' | 'revenue_drop' | 'unusual_orders' | 'payment_pattern';
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: Date;
  metrics: Record<string, number>;
}

export class RiskService {
  /**
   * Assess default risk for a merchant (0-1 scale)
   * Higher values indicate higher risk
   */
  async assessDefaultRisk(merchantId: string): Promise<number> {
    const health = await MerchantHealth.findOne({ merchantId });
    const loans = await Loan.find({
      merchantId,
      status: { $in: ['disbursed', 'approved'] },
    });

    if (!health) {
      return 0.5; // Neutral risk for unknown merchants
    }

    let riskScore = 0.3; // Base risk

    // Credit score factor (0-0.3)
    if (health.creditScore < 500) {
      riskScore += 0.3;
    } else if (health.creditScore < 600) {
      riskScore += 0.2;
    } else if (health.creditScore < 700) {
      riskScore += 0.1;
    }

    // Payment history factor (0-0.25)
    const totalPayments = health.onTimePayments + health.latePayments + health.defaults;
    if (totalPayments > 0) {
      const defaultRatio = health.defaults / totalPayments;
      riskScore += defaultRatio * 0.25;
    }

    // Current utilization factor (0-0.2)
    if (health.creditLimit > 0) {
      const utilizationRatio = health.utilizedAmount / health.creditLimit;
      if (utilizationRatio > 0.9) {
        riskScore += 0.2;
      } else if (utilizationRatio > 0.7) {
        riskScore += 0.1;
      }
    }

    // Active loans factor (0-0.15)
    if (loans.length > 3) {
      riskScore += 0.15;
    } else if (loans.length > 1) {
      riskScore += 0.05;
    }

    // Revenue stability factor (0-0.1)
    if (health.monthlyRevenue < 10000) {
      riskScore += 0.1;
    }

    return Math.min(1, Math.max(0, riskScore));
  }

  /**
   * Detect anomalies in merchant behavior
   */
  async detectAnomaly(merchantId: string): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    const health = await MerchantHealth.findOne({ merchantId });

    if (!health) {
      return anomalies;
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Revenue spike detection (>50% increase)
    if (health.monthlyRevenue > 50000) {
      // Assuming we could get historical data
      // For now, flag if revenue is unusually high for new merchants
      anomalies.push({
        type: 'revenue_spike',
        severity: 'low',
        description: 'Revenue significantly above average',
        detectedAt: now,
        metrics: { monthlyRevenue: health.monthlyRevenue },
      });
    }

    // Low revenue detection
    if (health.monthlyRevenue < 5000 && health.orderCount < 50) {
      anomalies.push({
        type: 'revenue_drop',
        severity: 'medium',
        description: 'Revenue and order count below threshold',
        detectedAt: now,
        metrics: {
          monthlyRevenue: health.monthlyRevenue,
          orderCount: health.orderCount,
        },
      });
    }

    // Unusual order pattern (very low or very high AOV)
    if (health.orderCount > 0) {
      const calculatedAOV = health.monthlyRevenue / health.orderCount;
      if (Math.abs(calculatedAOV - health.avgOrderValue) > health.avgOrderValue * 0.5) {
        anomalies.push({
          type: 'unusual_orders',
          severity: 'high',
          description: 'Average order value discrepancy detected',
          detectedAt: now,
          metrics: {
            calculatedAOV,
            reportedAOV: health.avgOrderValue,
          },
        });
      }
    }

    // Payment pattern anomalies
    if (health.latePayments > 3) {
      anomalies.push({
        type: 'payment_pattern',
        severity: 'high',
        description: 'Multiple late payments recorded',
        detectedAt: now,
        metrics: {
          latePayments: health.latePayments,
          onTimePayments: health.onTimePayments,
        },
      });
    } else if (health.latePayments > 1) {
      anomalies.push({
        type: 'payment_pattern',
        severity: 'medium',
        description: 'Some late payments on record',
        detectedAt: now,
        metrics: {
          latePayments: health.latePayments,
        },
      });
    }

    return anomalies;
  }

  /**
   * Get collection priority score (higher = more urgent)
   * Used to prioritize collection efforts
   */
  async getCollectionPriority(merchantId: string): Promise<number> {
    const health = await MerchantHealth.findOne({ merchantId });
    const overdueLoans = await Loan.find({
      merchantId,
      status: 'disbursed',
      repaymentSchedule: {
        $elemMatch: {
          status: 'overdue',
          dueDate: { $lt: new Date() },
        },
      },
    });

    if (!health || overdueLoans.length === 0) {
      return 0;
    }

    let priority = 0;

    // Days overdue (max 30 points)
    const oldestOverdueEntry = overdueLoans
      .flatMap(loan => loan.repaymentSchedule)
      .filter(entry => entry.status === 'overdue')
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];

    if (oldestOverdueEntry) {
      const daysOverdue = Math.floor(
        (Date.now() - oldestOverdueEntry.dueDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      priority += Math.min(30, daysOverdue);
    }

    // Amount at risk (max 30 points)
    const totalOverdue = overdueLoans
      .flatMap(loan => loan.repaymentSchedule)
      .filter(entry => entry.status === 'overdue')
      .reduce((sum, entry) => sum + entry.amount, 0);

    priority += Math.min(30, totalOverdue / 1000);

    // Credit score factor (max 20 points)
    if (health.creditScore < 400) {
      priority += 20;
    } else if (health.creditScore < 500) {
      priority += 15;
    } else if (health.creditScore < 600) {
      priority += 10;
    }

    // Defaults history (max 20 points)
    priority += Math.min(20, health.defaults * 10);

    return Math.round(priority);
  }

  /**
   * Calculate risk-adjusted return for a loan
   */
  async calculateRiskAdjustedReturn(loanId: string): Promise<{
    expectedReturn: number;
    riskPremium: number;
    adjustedReturn: number;
  }> {
    const loan = await Loan.findById(loanId);

    if (!loan) {
      throw new Error('Loan not found');
    }

    const riskScore = await this.assessDefaultRisk(loan.merchantId);
    const expectedReturn = loan.interestRate;

    // Risk premium based on default probability
    const riskPremium = riskScore * 10;

    // Adjusted return = Expected return - Risk premium
    const adjustedReturn = Math.max(0, expectedReturn - riskPremium);

    return {
      expectedReturn,
      riskPremium,
      adjustedReturn,
    };
  }

  /**
   * Get risk summary for dashboard
   */
  async getRiskSummary(merchantId: string): Promise<{
    riskScore: number;
    riskRating: 'low' | 'medium' | 'high';
    anomalies: Anomaly[];
    collectionPriority: number;
    portfolioRisk: number;
  }> {
    const riskScore = await this.assessDefaultRisk(merchantId);
    const anomalies = await this.detectAnomaly(merchantId);
    const collectionPriority = await this.getCollectionPriority(merchantId);

    let riskRating: 'low' | 'medium' | 'high' = 'medium';
    if (riskScore < 0.3) {
      riskRating = 'low';
    } else if (riskScore > 0.6) {
      riskRating = 'high';
    }

    // Calculate portfolio-level risk
    const allMerchants = await MerchantHealth.find({});
    const avgRisk = allMerchants.length > 0
      ? allMerchants.filter(m => m.riskRating === 'high').length / allMerchants.length
      : 0;

    return {
      riskScore: Math.round(riskScore * 100) / 100,
      riskRating,
      anomalies,
      collectionPriority,
      portfolioRisk: Math.round(avgRisk * 100) / 100,
    };
  }
}

export const riskService = new RiskService();
