/**
 * HOJAI Performance Dashboard - Compensation Calculator Service
 *
 * Calculates pay and compensation for AI employees based on performance.
 * Integrates with hojai-billing for payment processing.
 */

import { v4 as uuid } from 'uuid';
import axios from 'axios';
import { format, differenceInDays } from 'date-fns';
import {
  CompensationBreakdown,
  CompensationConfig,
  DEFAULT_COMPENSATION_CONFIG,
} from '../types/index.js';
import {
  Compensation,
  Evaluation,
  KPI,
  EmployeeProfile,
} from '../models/performanceModel.js';

const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:4830';

export class CompensationCalculator {
  /**
   * Calculate compensation for an employee
   */
  async calculateCompensation(
    employeeId: string,
    tenantId: string,
    period: string,
    overrideBase?: number
  ) {
    const employee = await EmployeeProfile.findOne({ employeeId, tenantId });
    if (!employee) {
      throw new Error(`Employee ${employeeId} not found`);
    }

    const kpi = await KPI.findOne({ employeeId, tenantId, period });
    if (!kpi) {
      throw new Error(`No KPI data found for employee ${employeeId} in period ${period}`);
    }

    const evaluation = await Evaluation.findOne({ employeeId, tenantId, period });
    const overallScore = evaluation?.overallScore || 50;

    let compensation = await Compensation.findOne({ employeeId, tenantId, period });

    const config = DEFAULT_COMPENSATION_CONFIG;
    const baseAmount = overrideBase || employee.baseSalary;

    const periodStart = new Date(period + '-01');
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const daysWorked = differenceInDays(new Date(), periodStart);

    const breakdown = this.calculateBreakdown(
      employee,
      kpi,
      overallScore,
      baseAmount,
      daysWorked,
      config
    );

    const grossAmount = breakdown.baseHourlyRate * breakdown.hoursWorked +
      breakdown.qualityMultiplier * breakdown.tasksCompleted +
      breakdown.performanceMultiplier * overallScore +
      breakdown.revenueSharePercentage * kpi.revenueGenerated;

    const taxDeduction = grossAmount * config.taxRate;
    const netAmount = grossAmount - taxDeduction - breakdown.penaltyReasons.length * 500;

    const now = new Date();

    if (compensation) {
      compensation.baseAmount = baseAmount;
      compensation.performanceBonus = breakdown.performanceMultiplier * overallScore;
      compensation.qualityBonus = breakdown.qualityMultiplier * breakdown.tasksCompleted;
      compensation.revenueShare = breakdown.revenueSharePercentage * kpi.revenueGenerated;
      compensation.penalty = breakdown.penaltyReasons.length * 500;
      compensation.grossAmount = grossAmount;
      compensation.taxDeduction = taxDeduction;
      compensation.netAmount = Math.max(0, netAmount);
      compensation.calculationDetails = breakdown;
      compensation.status = 'calculated';
      (compensation as any).updatedAt = now;
    } else {
      const compensationId = `comp_${uuid().slice(0, 12)}`;

      compensation = new Compensation({
        compensationId,
        employeeId,
        tenantId,
        period,
        baseAmount,
        compensationType: 'salary',
        performanceBonus: breakdown.performanceMultiplier * overallScore,
        qualityBonus: breakdown.qualityMultiplier * breakdown.tasksCompleted,
        revenueShare: breakdown.revenueSharePercentage * kpi.revenueGenerated,
        penalty: breakdown.penaltyReasons.length * 500,
        grossAmount,
        taxDeduction,
        netAmount: Math.max(0, netAmount),
        status: 'calculated',
        calculationDetails: breakdown,
      });
    }

    await compensation.save();
    return compensation;
  }

  /**
   * Calculate compensation breakdown
   */
  private calculateBreakdown(
    employee: any,
    kpi: any,
    overallScore: number,
    baseAmount: number,
    daysWorked: number,
    config: CompensationConfig
  ): CompensationBreakdown {
    const hoursPerMonth = 176;
    const hoursWorked = Math.min(daysWorked * 8, hoursPerMonth);
    const baseHourlyRate = baseAmount / hoursPerMonth;

    const qualityMultiplier = this.calculateQualityMultiplier(kpi.qualityScore, config.qualityThreshold);
    const performanceMultiplier = this.calculatePerformanceMultiplier(overallScore);
    const revenueSharePercentage = kpi.revenueGenerated > 0 ? config.revenueSharePercentage : 0;

    const penaltyReasons: string[] = [];
    if (kpi.errorRate > 0.1) {
      penaltyReasons.push('High error rate');
    }
    if (kpi.escalationRate > 0.15) {
      penaltyReasons.push('High escalation rate');
    }
    if (overallScore < 50) {
      penaltyReasons.push('Below minimum performance threshold');
    }

    return {
      baseHourlyRate,
      hoursWorked,
      tasksCompleted: kpi.tasksCompleted,
      qualityMultiplier,
      performanceMultiplier,
      revenueSharePercentage,
      penaltyReasons,
    };
  }

  /**
   * Calculate quality multiplier
   */
  private calculateQualityMultiplier(qualityScore: number, threshold: number): number {
    if (qualityScore >= 90) return 1.5;
    if (qualityScore >= 80) return 1.25;
    if (qualityScore >= threshold) return 1.0;
    if (qualityScore >= 60) return 0.75;
    return 0.5;
  }

  /**
   * Calculate performance multiplier
   */
  private calculatePerformanceMultiplier(overallScore: number): number {
    if (overallScore >= 95) return 500;
    if (overallScore >= 90) return 400;
    if (overallScore >= 85) return 300;
    if (overallScore >= 80) return 200;
    if (overallScore >= 70) return 100;
    if (overallScore >= 60) return 50;
    return 0;
  }

  /**
   * Get compensation record
   */
  async getCompensation(employeeId: string, tenantId: string, period?: string) {
    const query: any = { employeeId, tenantId };
    if (period) query.period = period;
    return Compensation.findOne(query).sort({ createdAt: -1 });
  }

  /**
   * Get compensation history
   */
  async getCompensationHistory(employeeId: string, tenantId: string, limit: number = 12) {
    return Compensation.find({ employeeId, tenantId })
      .sort({ period: -1 })
      .limit(limit);
  }

  /**
   * Approve compensation
   */
  async approveCompensation(compensationId: string, approverId: string) {
    const compensation = await Compensation.findOne({ compensationId });

    if (!compensation) {
      throw new Error(`Compensation ${compensationId} not found`);
    }

    if (compensation.status !== 'calculated') {
      throw new Error(`Compensation must be in 'calculated' status to approve`);
    }

    compensation.status = 'approved';
    compensation.approvedBy = approverId;
    compensation.approvedAt = new Date();

    await compensation.save();
    return compensation;
  }

  /**
   * Mark compensation as paid
   */
  async markAsPaid(compensationId: string) {
    const compensation = await Compensation.findOne({ compensationId });

    if (!compensation) {
      throw new Error(`Compensation ${compensationId} not found`);
    }

    if (compensation.status !== 'approved') {
      throw new Error(`Compensation must be 'approved' before marking as paid`);
    }

    compensation.status = 'paid';
    compensation.paidAt = new Date();

    await compensation.save();
    return compensation;
  }

  /**
   * Process payment via hojai-billing integration
   */
  async processPayment(compensationId: string): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    const compensation = await Compensation.findOne({ compensationId });

    if (!compensation) {
      throw new Error(`Compensation ${compensationId} not found`);
    }

    if (compensation.status !== 'approved') {
      throw new Error(`Compensation must be approved before processing payment`);
    }

    try {
      const response = await axios.post(
        `${BILLING_SERVICE_URL}/api/transactions`,
        {
          type: 'compensation',
          toTenantId: compensation.tenantId,
          amount: compensation.netAmount,
          description: `Performance compensation for employee ${compensation.employeeId} - ${compensation.period}`,
          employeeId: compensation.employeeId,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      if (response.data.success) {
        compensation.billingTransactionId = response.data.data.transactionId;
        compensation.status = 'paid';
        compensation.paidAt = new Date();
        await compensation.save();

        return {
          success: true,
          transactionId: response.data.data.transactionId,
        };
      }

      return { success: false, error: 'Payment processing failed' };
    } catch (error: any) {
      console.error('Payment processing error:', error.message);

      if (error.code === 'ECONNREFUSED' || error.response?.status === 404) {
        console.warn('Billing service unavailable - compensation remains approved');
        return { success: false, error: 'Billing service unavailable' };
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Get payroll summary for a period
   */
  async getPayrollSummary(tenantId: string, period: string) {
    const compensations = await Compensation.find({ tenantId, period });

    return {
      period,
      totalEmployees: compensations.length,
      totalGross: compensations.reduce((sum, c) => sum + c.grossAmount, 0),
      totalTax: compensations.reduce((sum, c) => sum + c.taxDeduction, 0),
      totalPenalties: compensations.reduce((sum, c) => sum + c.penalty, 0),
      totalNet: compensations.reduce((sum, c) => sum + c.netAmount, 0),
      totalBonuses: compensations.reduce((sum, c) => sum + c.performanceBonus + c.qualityBonus + c.revenueShare, 0),
      byStatus: {
        pending: compensations.filter((c) => c.status === 'pending').length,
        calculated: compensations.filter((c) => c.status === 'calculated').length,
        approved: compensations.filter((c) => c.status === 'approved').length,
        paid: compensations.filter((c) => c.status === 'paid').length,
      },
    };
  }

  /**
   * Get compensation statistics
   */
  async getCompensationStats(tenantId: string, period?: string) {
    const periodLabel = period || format(new Date(), 'yyyy-MM');

    const stats = await Compensation.aggregate([
      { $match: { tenantId, period: periodLabel } },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          avgGross: { $avg: '$grossAmount' },
          avgNet: { $avg: '$netAmount' },
          totalGross: { $sum: '$grossAmount' },
          totalNet: { $sum: '$netAmount' },
          totalTax: { $sum: '$taxDeduction' },
          totalBonuses: {
            $sum: { $add: ['$performanceBonus', '$qualityBonus', '$revenueShare'] },
          },
          totalPenalties: { $sum: '$penalty' },
        },
      },
    ]);

    return stats[0] || {
      totalEmployees: 0,
      avgGross: 0,
      avgNet: 0,
      totalGross: 0,
      totalNet: 0,
      totalTax: 0,
      totalBonuses: 0,
      totalPenalties: 0,
    };
  }

  /**
   * Calculate bonuses breakdown
   */
  async getBonusBreakdown(employeeId: string, tenantId: string, period: string) {
    const evaluation = await Evaluation.findOne({ employeeId, tenantId, period });
    const kpi = await KPI.findOne({ employeeId, tenantId, period });

    if (!evaluation || !kpi) {
      throw new Error('No evaluation or KPI data found');
    }

    const config = DEFAULT_COMPENSATION_CONFIG;
    const qualityMultiplier = this.calculateQualityMultiplier(kpi.qualityScore, config.qualityThreshold);
    const performanceMultiplier = this.calculatePerformanceMultiplier(evaluation.overallScore);
    const revenueShareAmount = kpi.revenueGenerated * config.revenueSharePercentage;

    return {
      period,
      qualityBonus: {
        tasksCompleted: kpi.tasksCompleted,
        multiplier: qualityMultiplier,
        amount: qualityMultiplier * kpi.tasksCompleted,
        breakdown: `Rs.${qualityMultiplier} per task x ${kpi.tasksCompleted} tasks`,
      },
      performanceBonus: {
        score: evaluation.overallScore,
        multiplier: performanceMultiplier,
        amount: performanceMultiplier * evaluation.overallScore,
        breakdown: `Rs.${performanceMultiplier} x ${evaluation.overallScore} score`,
      },
      revenueShare: {
        revenueGenerated: kpi.revenueGenerated,
        percentage: config.revenueSharePercentage * 100,
        amount: revenueShareAmount,
        breakdown: `${config.revenueSharePercentage * 100}% of Rs.${kpi.revenueGenerated}`,
      },
      totalBonus: qualityMultiplier * kpi.tasksCompleted +
        performanceMultiplier * evaluation.overallScore +
        revenueShareAmount,
    };
  }

  /**
   * Generate compensation forecast
   */
  async generateForecast(tenantId: string, months: number = 3) {
    const forecasts: any[] = [];
    const currentDate = new Date();

    for (let i = 0; i < months; i++) {
      const forecastDate = new Date(currentDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);
      const period = format(forecastDate, 'yyyy-MM');

      const prevPeriod = new Date(forecastDate);
      prevPeriod.setMonth(prevPeriod.getMonth() - 1);
      const prevPeriodLabel = format(prevPeriod, 'yyyy-MM');

      const prevStats = await this.getCompensationStats(tenantId, prevPeriodLabel);
      const employees = await EmployeeProfile.countDocuments({ tenantId, status: 'active' });

      const projectedEmployees = Math.ceil(employees * (1 + i * 0.05));
      const avgCompensation = prevStats.avgNet || DEFAULT_COMPENSATION_CONFIG.baseSalary;
      const projectedTotal = avgCompensation * projectedEmployees;

      forecasts.push({
        period,
        projectedEmployees,
        projectedTotalGross: projectedTotal,
        projectedTotalNet: projectedTotal * 0.82,
        growthRate: i === 0 ? 0 : 5,
      });
    }

    return forecasts;
  }
}

export const compensationCalculator = new CompensationCalculator();
export default compensationCalculator;
