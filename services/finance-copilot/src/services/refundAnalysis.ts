/**
 * Refund Analysis Service
 * Analyzes refund requests for risk assessment
 */

import { v4 as uuidv4 } from 'uuid';
import { RefundAnalysis } from '../types';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

export class RefundAnalysisService {
  // Common refund reasons
  private readonly refundReasons = [
    'Product not as described',
    'Defective product',
    'Wrong item received',
    'Changed mind',
    'Item arrived too late',
    'Duplicate order',
    'Never received item',
    'Quality not met expectations',
    'Unauthorized purchase',
    'Other',
  ];

  /**
   * Analyze a refund request for risk
   */
  async analyzeRefund(
    refundId: string,
    originalTransactionId: string,
    amount: number,
    reason: string,
    customerId: string
  ): Promise<RefundAnalysis> {
    logger.info(`Analyzing refund ${refundId} for customer ${customerId}`);

    const riskFactors: string[] = [];
    let riskScore = 0;

    // Amount-based risk
    if (amount > 500) {
      riskFactors.push('High-value refund request');
      riskScore += 25;
    }
    if (amount > 1000) {
      riskFactors.push('Very high-value refund (>$1000)');
      riskScore += 15;
    }

    // Reason-based risk
    const highRiskReasons = ['Changed mind', 'Duplicate order', 'Unauthorized purchase'];
    if (highRiskReasons.includes(reason)) {
      riskFactors.push('High-risk refund reason');
      riskScore += 30;
    }

    // Simulate customer history (in production would query DB)
    const customerRefundHistory = Math.floor(Math.random() * 5);
    if (customerRefundHistory > 3) {
      riskFactors.push(`Customer has ${customerRefundHistory} previous refunds`);
      riskScore += customerRefundHistory * 5;
    }

    // Simulate account age risk
    const accountAge = Math.floor(Math.random() * 365);
    if (accountAge < 30) {
      riskFactors.push('New account (<30 days)');
      riskScore += 20;
    }

    // Time since purchase (simulated)
    const daysSincePurchase = Math.floor(Math.random() * 90);
    if (daysSincePurchase > 60 && reason !== 'Defective product') {
      riskFactors.push('Refund requested after 60 days');
      riskScore += 15;
    }

    // Normalize risk score
    riskScore = Math.min(100, riskScore);

    // Determine recommendation
    let recommendation: 'approve' | 'review' | 'reject';
    if (riskScore <= 30) {
      recommendation = 'approve';
    } else if (riskScore <= 60) {
      recommendation = 'review';
    } else {
      recommendation = 'reject';
    }

    const analysis: RefundAnalysis = {
      id: uuidv4(),
      refundId,
      originalTransactionId,
      amount,
      reason,
      customerId,
      riskScore,
      riskFactors,
      recommendation,
      analyzedAt: new Date(),
    };

    return analysis;
  }

  /**
   * Get refund analysis by ID
   */
  async getRefundAnalysis(refundId: string): Promise<RefundAnalysis | null> {
    // In production would query database
    // Simulating with a sample response
    return {
      id: uuidv4(),
      refundId,
      originalTransactionId: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      amount: Math.round(Math.random() * 1000),
      reason: this.refundReasons[Math.floor(Math.random() * this.refundReasons.length)],
      customerId: `CUST-${Math.floor(Math.random() * 10000)}`,
      riskScore: Math.round(Math.random() * 100),
      riskFactors: ['Sample risk factor'],
      recommendation: 'review',
      analyzedAt: new Date(),
    };
  }

  /**
   * Get refund statistics
   */
  async getRefundStats(): Promise<{
    totalRefunds: number;
    approvedCount: number;
    reviewCount: number;
    rejectedCount: number;
    totalAmount: number;
    avgRiskScore: number;
    avgAmount: number;
    topReasons: Array<{ reason: string; count: number }>;
  }> {
    // Simulated statistics
    const totalRefunds = Math.floor(Math.random() * 100) + 50;
    const approvedCount = Math.floor(totalRefunds * 0.6);
    const reviewCount = Math.floor(totalRefunds * 0.3);
    const rejectedCount = totalRefunds - approvedCount - reviewCount;
    const avgAmount = Math.round(Math.random() * 200) + 50;
    const totalAmount = totalRefunds * avgAmount;

    const topReasons = this.refundReasons.slice(0, 5).map((reason) => ({
      reason,
      count: Math.floor(Math.random() * 20) + 5,
    }));

    return {
      totalRefunds,
      approvedCount,
      reviewCount,
      rejectedCount,
      totalAmount,
      avgRiskScore: Math.round(Math.random() * 40) + 20,
      avgAmount,
      topReasons: topReasons.sort((a, b) => b.count - a.count),
    };
  }

  /**
   * Batch analyze multiple refunds
   */
  async batchAnalyzeRefunds(
    refunds: Array<{
      refundId: string;
      transactionId: string;
      amount: number;
      reason: string;
      customerId: string;
    }>
  ): Promise<RefundAnalysis[]> {
    logger.info(`Batch analyzing ${refunds.length} refunds`);

    const analyses = await Promise.all(
      refunds.map((refund) =>
        this.analyzeRefund(
          refund.refundId,
          refund.transactionId,
          refund.amount,
          refund.reason,
          refund.customerId
        )
      )
    );

    return analyses;
  }
}

export const refundAnalysisService = new RefundAnalysisService();
