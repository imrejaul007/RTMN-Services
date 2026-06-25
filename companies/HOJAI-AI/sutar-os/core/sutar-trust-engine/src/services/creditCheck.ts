import logger from '../utils/logger';
import { config } from '../config';
import {
  ICreditScore,
  IPaymentHistoryEntry,
  RiskLevel,
  CreditCheckRequest,
  CreditCheckResponse,
  PaymentStatus,
} from '../types';

// In-memory store for credit scores
const creditScoreStore = new Map<string, ICreditScore>();

export class CreditCheckService {
  /**
   * Perform credit check for an entity
   */
  performCreditCheck(request: CreditCheckRequest): CreditCheckResponse {
    const { entityId, requestType, amount, purpose } = request;

    let creditScore = creditScoreStore.get(entityId);

    if (!creditScore) {
      creditScore = this.createDefaultCreditScore(entityId);
      creditScoreStore.set(entityId, creditScore);
    }

    logger.info(`Credit check for ${entityId}: type=${requestType}, score=${creditScore.score}`);

    // Calculate utilization rate
    const utilizationRate = creditScore.creditLimit > 0
      ? (creditScore.currentUtilization / creditScore.creditLimit) * 100
      : 0;

    const response: CreditCheckResponse = {
      entityId,
      creditScore: creditScore.score,
      creditGrade: creditScore.creditGrade,
      riskLevel: creditScore.riskLevel,
      creditLimit: creditScore.creditLimit,
      availableCredit: creditScore.availableCredit,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      reportType: requestType,
      generatedAt: new Date(),
    };

    // For pre-approval requests, add additional details
    if (requestType === 'pre_approval' && amount) {
      (response as CreditCheckResponse & { preApprovalAmount: number; approved: boolean }).preApprovalAmount =
        this.calculatePreApprovalAmount(creditScore, amount);
      (response as CreditCheckResponse & { preApprovalAmount: number; approved: boolean }).approved =
        (response as CreditCheckResponse & { preApprovalAmount: number; approved: boolean }).preApprovalAmount >= amount;
    }

    return response;
  }

  /**
   * Get credit score for an entity
   */
  getCreditScore(entityId: string): ICreditScore | null {
    return creditScoreStore.get(entityId) || null;
  }

  /**
   * Update credit score
   */
  updateCreditScore(
    entityId: string,
    updates: Partial<{
      score: number;
      creditLimit: number;
      currentUtilization: number;
      paymentHistory: IPaymentHistoryEntry[];
    }>
  ): ICreditScore {
    let creditScore = creditScoreStore.get(entityId);

    if (!creditScore) {
      creditScore = this.createDefaultCreditScore(entityId);
    }

    if (updates.score !== undefined) {
      creditScore.score = Math.max(
        config.credit.minScore,
        Math.min(config.credit.maxScore, updates.score)
      );
      creditScore.creditGrade = this.calculateCreditGrade(creditScore.score);
      creditScore.riskLevel = this.calculateRiskLevel(creditScore.score);
    }

    if (updates.creditLimit !== undefined) {
      creditScore.creditLimit = updates.creditLimit;
      creditScore.availableCredit = creditScore.creditLimit - creditScore.currentUtilization;
    }

    if (updates.currentUtilization !== undefined) {
      creditScore.currentUtilization = updates.currentUtilization;
      creditScore.availableCredit = creditScore.creditLimit - creditScore.currentUtilization;
    }

    if (updates.paymentHistory) {
      creditScore.paymentHistory = [
        ...creditScore.paymentHistory,
        ...updates.paymentHistory,
      ].slice(-24); // Keep last 24 entries
    }

    creditScore.lastUpdated = new Date();
    creditScore.updatedAt = new Date();
    creditScoreStore.set(entityId, creditScore);

    logger.info(`Updated credit score for ${entityId}: ${creditScore.score}`);

    return creditScore;
  }

  /**
   * Add payment to history
   */
  addPaymentRecord(
    entityId: string,
    payment: {
      amount: number;
      status: PaymentStatus;
      dueDate: Date;
      paidDate?: Date;
    }
  ): ICreditScore {
    let creditScore = creditScoreStore.get(entityId);

    if (!creditScore) {
      creditScore = this.createDefaultCreditScore(entityId);
    }

    const paymentEntry: IPaymentHistoryEntry = {
      date: new Date(),
      amount: payment.amount,
      status: payment.status,
      dueDate: payment.dueDate,
      paidDate: payment.paidDate || null,
    };

    creditScore.paymentHistory.push(paymentEntry);
    creditScore.paymentHistory = creditScore.paymentHistory.slice(-24);

    // Recalculate score based on payment history
    creditScore = this.recalculateScoreFromHistory(creditScore);

    creditScore.lastUpdated = new Date();
    creditScore.updatedAt = new Date();
    creditScoreStore.set(entityId, creditScore);

    return creditScore;
  }

  /**
   * Recalculate score from payment history
   */
  private recalculateScoreFromHistory(creditScore: ICreditScore): ICreditScore {
    if (creditScore.paymentHistory.length === 0) {
      return creditScore;
    }

    const recentPayments = creditScore.paymentHistory.slice(-12); // Last 12 payments
    let scoreChange = 0;

    for (const payment of recentPayments) {
      switch (payment.status) {
        case 'paid':
          scoreChange += 5;
          break;
        case 'partial':
          scoreChange += 0;
          break;
        case 'overdue':
          scoreChange -= 10;
          break;
        case 'defaulted':
          scoreChange -= 20;
          break;
        case 'pending':
          scoreChange += 1;
          break;
      }
    }

    // Apply change but clamp to range
    const newScore = Math.max(
      config.credit.minScore,
      Math.min(config.credit.maxScore, creditScore.score + scoreChange)
    );

    creditScore.score = newScore;
    creditScore.creditGrade = this.calculateCreditGrade(newScore);
    creditScore.riskLevel = this.calculateRiskLevel(newScore);

    return creditScore;
  }

  /**
   * Calculate credit grade from score
   */
  private calculateCreditGrade(score: number): string {
    const { grades } = config.credit;

    for (const [grade, range] of Object.entries(grades)) {
      if (score >= range.min && score <= range.max) {
        return grade;
      }
    }

    return 'VERY_POOR';
  }

  /**
   * Calculate risk level from score
   */
  private calculateRiskLevel(score: number): RiskLevel {
    if (score >= 800) return 'minimal';
    if (score >= 700) return 'low';
    if (score >= 600) return 'medium';
    if (score >= 500) return 'high';
    return 'critical';
  }

  /**
   * Calculate pre-approval amount
   */
  private calculatePreApprovalAmount(creditScore: ICreditScore, requestedAmount: number): number {
    // Base amount is available credit
    let approvedAmount = creditScore.availableCredit;

    // Adjust based on risk level
    switch (creditScore.riskLevel) {
      case 'minimal':
        approvedAmount = Math.max(approvedAmount, requestedAmount);
        break;
      case 'low':
        approvedAmount = Math.min(approvedAmount, requestedAmount * 1.2);
        break;
      case 'medium':
        approvedAmount = Math.min(approvedAmount, requestedAmount * 0.8);
        break;
      case 'high':
        approvedAmount = Math.min(approvedAmount, requestedAmount * 0.5);
        break;
      case 'critical':
        approvedAmount = 0;
        break;
    }

    return Math.max(0, Math.round(approvedAmount));
  }

  /**
   * Get credit report (full report)
   */
  getCreditReport(entityId: string): {
    creditScore: ICreditScore | null;
    paymentAnalysis: {
      onTimeRate: number;
      lateRate: number;
      defaultRate: number;
      avgDaysLate: number;
    };
    recommendations: string[];
  } {
    const creditScore = creditScoreStore.get(entityId);

    if (!creditScore) {
      return {
        creditScore: null,
        paymentAnalysis: {
          onTimeRate: 0,
          lateRate: 0,
          defaultRate: 0,
          avgDaysLate: 0,
        },
        recommendations: ['No credit history available'],
      };
    }

    const paymentAnalysis = this.analyzePaymentHistory(creditScore.paymentHistory);
    const recommendations = this.generateRecommendations(creditScore, paymentAnalysis);

    return {
      creditScore,
      paymentAnalysis,
      recommendations,
    };
  }

  /**
   * Analyze payment history
   */
  private analyzePaymentHistory(payments: IPaymentHistoryEntry[]): {
    onTimeRate: number;
    lateRate: number;
    defaultRate: number;
    avgDaysLate: number;
  } {
    if (payments.length === 0) {
      return {
        onTimeRate: 0,
        lateRate: 0,
        defaultRate: 0,
        avgDaysLate: 0,
      };
    }

    const paid = payments.filter(p => p.status === 'paid').length;
    const overdue = payments.filter(p => p.status === 'overdue').length;
    const defaulted = payments.filter(p => p.status === 'defaulted').length;
    const partial = payments.filter(p => p.status === 'partial').length;

    const total = payments.length;
    const onTimeRate = (paid / total) * 100;
    const lateRate = ((overdue + partial) / total) * 100;
    const defaultRate = (defaulted / total) * 100;

    // Calculate average days late
    let totalDaysLate = 0;
    let latePayments = 0;

    for (const payment of payments) {
      if (payment.paidDate && payment.dueDate) {
        const daysLate = Math.max(0, payment.paidDate.getTime() - payment.dueDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysLate > 0) {
          totalDaysLate += daysLate;
          latePayments++;
        }
      }
    }

    const avgDaysLate = latePayments > 0 ? totalDaysLate / latePayments : 0;

    return {
      onTimeRate: Math.round(onTimeRate * 100) / 100,
      lateRate: Math.round(lateRate * 100) / 100,
      defaultRate: Math.round(defaultRate * 100) / 100,
      avgDaysLate: Math.round(avgDaysLate * 10) / 10,
    };
  }

  /**
   * Generate recommendations based on credit score and payment analysis
   */
  private generateRecommendations(
    creditScore: ICreditScore,
    paymentAnalysis: { onTimeRate: number; lateRate: number; defaultRate: number; avgDaysLate: number }
  ): string[] {
    const recommendations: string[] = [];

    if (paymentAnalysis.defaultRate > 10) {
      recommendations.push('Reduce defaults to improve credit score');
    }

    if (paymentAnalysis.lateRate > 20) {
      recommendations.push('Set up payment reminders to avoid late payments');
    }

    if (creditScore.currentUtilization > 0.7) {
      recommendations.push('Lower credit utilization by paying down balances');
    }

    if (creditScore.score < 600) {
      recommendations.push('Consider secured credit card to build credit history');
    }

    if (paymentAnalysis.onTimeRate > 90) {
      recommendations.push('Excellent payment history - maintain current practices');
    }

    if (creditScore.paymentHistory.length < 6) {
      recommendations.push('Build credit history with consistent on-time payments');
    }

    return recommendations;
  }

  /**
   * Create default credit score
   */
  private createDefaultCreditScore(entityId: string): ICreditScore {
    const now = new Date();
    return {
      entityId,
      score: config.credit.defaultScore,
      creditLimit: 0,
      currentUtilization: 0,
      availableCredit: 0,
      creditGrade: this.calculateCreditGrade(config.credit.defaultScore),
      riskLevel: this.calculateRiskLevel(config.credit.defaultScore),
      paymentHistory: [],
      lastUpdated: now,
      createdAt: now,
      updatedAt: now,
    };
  }
}

export default new CreditCheckService();
