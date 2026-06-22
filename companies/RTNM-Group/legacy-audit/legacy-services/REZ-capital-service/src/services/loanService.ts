import mongoose from 'mongoose';
import { Loan, ILoan, LoanType, LoanStatus } from '../models/Loan';
import { MerchantHealth } from '../models/MerchantHealth';
import { creditScoringService } from './creditScoringService';
import { partnerService } from './partnerService';
import { riskService } from './riskService';
import logger from '../utils/logger';

export class LoanService {
  /**
   * Create a new loan application
   */
  async createLoanApplication(
    merchantId: string,
    amount: number,
    type: LoanType = 'revenue_advance',
    purpose?: string
  ): Promise<ILoan> {
    // Validate merchant exists
    const health = await MerchantHealth.findOne({ merchantId });
    if (!health) {
      throw new Error('Merchant not found. Please complete onboarding first.');
    }

    // Check available credit
    if (amount > health.availableCredit) {
      throw new Error(
        `Requested amount (${amount}) exceeds available credit (${health.availableCredit})`
      );
    }

    // Assess default risk before approving
    const defaultRisk = await riskService.assessDefaultRisk(merchantId);
    if (defaultRisk > 0.7) {
      throw new Error('Application flagged for manual review due to risk assessment');
    }

    // Calculate interest rate based on risk and loan type
    const interestRate = await this.calculateInterestRate(merchantId, type);

    // Generate repayment schedule
    const repaymentSchedule = this.generateRepaymentSchedule(amount, interestRate);

    const loan = new Loan({
      merchantId,
      type,
      amount,
      disbursedAmount: 0,
      interestRate,
      tenure: repaymentSchedule.length * 30, // Monthly payments
      status: 'pending',
      repaymentSchedule,
      nextRepayment: repaymentSchedule[0]?.dueDate,
      purpose,
    });

    await loan.save();
    logger.info(`Loan application created: ${loan._id} for merchant ${merchantId}`);

    return loan;
  }

  /**
   * Approve a pending loan application
   */
  async approveLoan(loanId: string, approvedBy: string): Promise<ILoan> {
    const loan = await Loan.findById(loanId);

    if (!loan) {
      throw new Error('Loan not found');
    }

    if (loan.status !== 'pending') {
      throw new Error(`Cannot approve loan with status: ${loan.status}`);
    }

    // Re-verify credit availability
    const health = await MerchantHealth.findOne({ merchantId: loan.merchantId });
    if (!health || loan.amount > health.availableCredit) {
      throw new Error('Credit availability changed. Please re-assess application.');
    }

    loan.status = 'approved';
    loan.approvedBy = approvedBy;
    loan.approvedAt = new Date();

    await loan.save();
    logger.info(`Loan approved: ${loan._id} by ${approvedBy}`);

    return loan;
  }

  /**
   * Disburse a loan to the merchant via NBFC partner
   * Uses MongoDB transaction to ensure atomicity
   */
  async disburseLoan(loanId: string, partnerId: string = 'capital_float'): Promise<ILoan> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const loan = await Loan.findById(loanId).session(session);

      if (!loan) {
        throw new Error('Loan not found');
      }

      if (loan.status !== 'approved') {
        throw new Error(`Cannot disburse loan with status: ${loan.status}`);
      }

      // Initiate disbursement via partner (outside transaction - partner call is idempotent)
      const partnerRef = await partnerService.initiateDisbursement(loan, partnerId);

      // Update loan status
      loan.status = 'disbursed';
      loan.disbursedAt = new Date();
      loan.partnerRef = partnerRef;
      loan.partnerId = partnerId;
      loan.disbursedAmount = loan.amount;
      await loan.save({ session });

      // Update merchant utilization (within transaction)
      await creditScoringService.updateUtilizationWithSession(
        loan.merchantId,
        loan.amount,
        'add',
        session
      );

      // Commit transaction
      await session.commitTransaction();
      logger.info(`Loan disbursed: ${loan._id} via ${partnerId}, ref: ${partnerRef}`);

      return loan;
    } catch (error) {
      // Abort transaction on any error
      await session.abortTransaction();
      logger.error(`Loan disbursement failed: ${loanId}`, error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Process a repayment for a loan
   */
  async processRepayment(loanId: string, amount: number): Promise<void> {
    const loan = await Loan.findById(loanId);

    if (!loan) {
      throw new Error('Loan not found');
    }

    if (loan.status !== 'disbursed') {
      throw new Error(`Cannot process repayment for loan with status: ${loan.status}`);
    }

    let remainingAmount = amount;
    const now = new Date();

    // Update repayment schedule
    for (const entry of loan.repaymentSchedule) {
      if (entry.status === 'pending' && remainingAmount > 0) {
        const paymentAmount = Math.min(entry.amount, remainingAmount);
        entry.paidAmount = (entry.paidAmount || 0) + paymentAmount;
        entry.paidDate = now;

        if (entry.paidAmount >= entry.amount) {
          entry.status = 'paid';
        }

        remainingAmount -= paymentAmount;

        // Record payment for credit scoring
        const wasOnTime = now <= entry.dueDate;
        await creditScoringService.recordPayment(loan.merchantId, wasOnTime);
      }
    }

    // Check if loan is fully repaid
    const totalPaid = loan.repaymentSchedule.reduce(
      (sum, entry) => sum + (entry.paidAmount || 0),
      0
    );
    const totalDue = loan.repaymentSchedule.reduce((sum, entry) => sum + entry.amount, 0);

    if (totalPaid >= totalDue) {
      loan.status = 'repaid';
      loan.completedAt = now;

      // Release credit utilization
      await creditScoringService.updateUtilization(
        loan.merchantId,
        loan.amount,
        'remove'
      );
    }

    // Update next repayment date
    const nextPending = loan.repaymentSchedule.find(e => e.status === 'pending');
    loan.nextRepayment = nextPending?.dueDate;

    await loan.save();
    logger.info(`Repayment processed for loan ${loanId}: ${amount}`);

    // Notify partner
    await partnerService.processRepaymentViaPartner(loanId, amount);
  }

  /**
   * Mark a loan as defaulted
   */
  async markAsDefaulted(loanId: string): Promise<ILoan> {
    const loan = await Loan.findById(loanId);

    if (!loan) {
      throw new Error('Loan not found');
    }

    loan.status = 'defaulted';
    await loan.save();

    // Record default for credit scoring
    await creditScoringService.recordPayment(loan.merchantId, false, true);

    logger.warn(`Loan marked as defaulted: ${loanId}`);
    return loan;
  }

  /**
   * Calculate EMI (Equated Monthly Installment)
   * EMI = [P x R x (1+R)^N] / [(1+R)^N - 1]
   */
  calculateEMI(principal: number, annualRate: number, tenureDays: number): number {
    const principalNum = Number(principal);
    const annualRateNum = Number(annualRate);
    const tenureDaysNum = Number(tenureDays);

    if (principalNum <= 0 || annualRateNum <= 0 || tenureDaysNum <= 0) {
      return 0;
    }

    const monthlyRate = annualRateNum / 12 / 100;
    const months = Math.ceil(tenureDaysNum / 30);

    const emi =
      (principalNum * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1);

    return Math.round(emi * 100) / 100;
  }

  /**
   * Calculate interest rate based on merchant risk
   */
  private async calculateInterestRate(
    merchantId: string,
    type: LoanType
  ): Promise<number> {
    const riskRating = await creditScoringService.determineRiskRating(merchantId);

    // Base rates by loan type
    const baseRates: Record<LoanType, number> = {
      revenue_advance: 12, // Lower for short-term advances
      term_loan: 18,
      credit_line: 15,
    };

    // Risk adjustment
    const riskAdjustments: Record<string, number> = {
      low: -2,
      medium: 0,
      high: 4,
    };

    const baseRate = baseRates[type];
    const adjustment = riskAdjustments[riskRating] || 0;

    return baseRate + adjustment;
  }

  /**
   * Generate repayment schedule for a loan
   */
  private generateRepaymentSchedule(
    principal: number,
    annualRate: number,
    tenureDays: number = 90
  ): Array<{
    dueDate: Date;
    amount: number;
    principal: number;
    interest: number;
    status: 'pending' | 'paid' | 'overdue';
  }> {
    const monthlyRate = annualRate / 12 / 100;
    const months = Math.ceil(tenureDays / 30);
    const emi = this.calculateEMI(principal, annualRate, tenureDays);

    const schedule: Array<{
      dueDate: Date;
      amount: number;
      principal: number;
      interest: number;
      status: 'pending' | 'paid' | 'overdue';
    }> = [];

    let remainingPrincipal = principal;
    const startDate = new Date();

    for (let i = 1; i <= months; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      // Calculate interest for this period
      const interest = Math.round(remainingPrincipal * monthlyRate * 100) / 100;
      const principalPayment = Math.round((emi - interest) * 100) / 100;
      remainingPrincipal = Math.max(0, remainingPrincipal - principalPayment);

      schedule.push({
        dueDate,
        amount: emi,
        principal: principalPayment,
        interest,
        status: 'pending',
      });
    }

    // Adjust last payment for rounding
    if (schedule.length > 0) {
      const lastEntry = schedule[schedule.length - 1];
      lastEntry.amount = principalPayment + interest;
    }

    return schedule;
  }

  /**
   * Get loans for a merchant
   */
  async getMerchantLoans(
    merchantId: string,
    status?: LoanStatus
  ): Promise<ILoan[]> {
    const query: Record<string, unknown> = { merchantId };
    if (status) {
      query.status = status;
    }

    return Loan.find(query).sort({ createdAt: -1 });
  }

  /**
   * Get loan by ID
   */
  async getLoanById(loanId: string): Promise<ILoan | null> {
    return Loan.findById(loanId);
  }

  /**
   * Check for overdue loans and update status
   */
  async processOverdueLoans(): Promise<number> {
    const now = new Date();
    const overdueLoans = await Loan.find({
      status: 'disbursed',
      nextRepayment: { $lt: now },
    });

    let count = 0;
    for (const loan of overdueLoans) {
      // Mark overdue entries
      for (const entry of loan.repaymentSchedule) {
        if (entry.status === 'pending' && entry.dueDate < now) {
          entry.status = 'overdue';
        }
      }
      await loan.save();
      count++;
    }

    return count;
  }
}

export const loanService = new LoanService();
