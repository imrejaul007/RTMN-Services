import {
  CompanyCredit,
  ICompanyCredit,
  RiskLevel,
  PaymentStatus,
  IPaymentHistory,
  CreditCheckResult,
  PaymentTermsResult,
} from '../models/company-credit.model';
import { logger } from '../utils/logger';

export class CompanyCreditService {
  /**
   * Get credit information for a company
   */
  async getCredit(corpId: string): Promise<ICompanyCredit | null> {
    try {
      logger.info(`Fetching credit for corpId: ${corpId}`);
      const credit = await CompanyCredit.findOne({ corpId });

      if (!credit) {
        logger.warn(`No credit record found for corpId: ${corpId}`);
        return null;
      }

      logger.info(`Credit found for corpId: ${corpId}`, {
        creditLimit: credit.creditLimit,
        availableCredit: credit.availableCredit,
        riskLevel: credit.riskLevel,
      });

      return credit;
    } catch (error) {
      logger.error(`Error fetching credit for corpId: ${corpId}`, { error });
      throw error;
    }
  }

  /**
   * Update credit information for a company
   */
  async updateCredit(
    corpId: string,
    updateData: {
      creditLimit?: number;
      currentUtilization?: number;
      riskLevel?: RiskLevel;
      creditScore?: number;
      paymentTermsDays?: number;
      companyName?: string;
    }
  ): Promise<ICompanyCredit> {
    try {
      logger.info(`Updating credit for corpId: ${corpId}`, { updateData });

      const credit = await CompanyCredit.findOneAndUpdate(
        { corpId },
        {
          $set: {
            ...updateData,
            ...(updateData.creditLimit !== undefined && {
              availableCredit: Math.max(
                0,
                updateData.creditLimit -
                  (updateData.currentUtilization ??
                    (await CompanyCredit.findOne({ corpId }))?.currentUtilization ??
                    0)
              ),
            }),
          },
        },
        { new: true, runValidators: true }
      );

      if (!credit) {
        // Create new credit record if it doesn't exist
        logger.info(`Creating new credit record for corpId: ${corpId}`);
        const newCredit = new CompanyCredit({
          corpId,
          companyName: updateData.companyName || corpId,
          creditLimit: updateData.creditLimit ?? 0,
          currentUtilization: updateData.currentUtilization ?? 0,
          availableCredit: updateData.creditLimit ?? 0,
          riskLevel: updateData.riskLevel ?? RiskLevel.MEDIUM,
          creditScore: updateData.creditScore ?? 750,
          paymentTermsDays: updateData.paymentTermsDays ?? 30,
        });

        await newCredit.save();
        logger.info(`New credit record created for corpId: ${corpId}`);
        return newCredit;
      }

      logger.info(`Credit updated for corpId: ${corpId}`);
      return credit;
    } catch (error) {
      logger.error(`Error updating credit for corpId: ${corpId}`, { error });
      throw error;
    }
  }

  /**
   * Check if credit can be extended to a company
   */
  async canExtendCredit(corpId: string, amount: number): Promise<CreditCheckResult> {
    try {
      logger.info(`Checking credit extension for corpId: ${corpId}, amount: ${amount}`);

      const credit = await this.getCredit(corpId);

      if (!credit) {
        logger.warn(`No credit record found for corpId: ${corpId}`);
        return {
          canExtend: false,
          availableCredit: 0,
          requestedAmount: amount,
          riskLevel: RiskLevel.HIGH,
          message: 'No credit record found for this company',
        };
      }

      // Calculate new utilization
      const newUtilization = credit.currentUtilization + amount;
      const wouldExceedLimit = newUtilization > credit.creditLimit;

      // Check risk level restrictions
      const riskMultiplier = this.getRiskMultiplier(credit.riskLevel);
      const effectiveLimit = credit.creditLimit * riskMultiplier;
      const wouldExceedRiskAdjustedLimit = newUtilization > effectiveLimit;

      // Determine if credit can be extended
      const canExtend =
        !wouldExceedLimit &&
        !wouldExceedRiskAdjustedLimit &&
        credit.riskLevel !== RiskLevel.CRITICAL;

      let message: string;
      if (credit.riskLevel === RiskLevel.CRITICAL) {
        message = 'Credit cannot be extended due to critical risk level';
      } else if (wouldExceedLimit) {
        message = `Requested amount exceeds credit limit. Available: ${credit.availableCredit}`;
      } else if (wouldExceedRiskAdjustedLimit) {
        message = `Requested amount exceeds risk-adjusted limit due to ${credit.riskLevel} risk level`;
      } else {
        message = 'Credit can be extended';
      }

      logger.info(`Credit check result for corpId: ${corpId}`, {
        canExtend,
        message,
        creditScore: credit.creditScore,
      });

      return {
        canExtend,
        availableCredit: credit.availableCredit,
        requestedAmount: amount,
        riskLevel: credit.riskLevel,
        message,
      };
    } catch (error) {
      logger.error(`Error checking credit extension for corpId: ${corpId}`, { error });
      throw error;
    }
  }

  /**
   * Get payment terms for a company
   */
  async getPaymentTerms(corpId: string): Promise<PaymentTermsResult | null> {
    try {
      logger.info(`Fetching payment terms for corpId: ${corpId}`);

      const credit = await this.getCredit(corpId);

      if (!credit) {
        logger.warn(`No payment terms found for corpId: ${corpId}`);
        return null;
      }

      const result: PaymentTermsResult = {
        corpId: credit.corpId,
        paymentTermsDays: credit.paymentTermsDays,
        creditLimit: credit.creditLimit,
        availableCredit: credit.availableCredit,
        currency: credit.currency,
        riskLevel: credit.riskLevel,
        creditScore: credit.creditScore,
      };

      logger.info(`Payment terms found for corpId: ${corpId}`, {
        paymentTermsDays: result.paymentTermsDays,
        creditLimit: result.creditLimit,
      });

      return result;
    } catch (error) {
      logger.error(`Error fetching payment terms for corpId: ${corpId}`, { error });
      throw error;
    }
  }

  /**
   * Record a payment transaction
   */
  async recordPayment(
    corpId: string,
    payment: Omit<IPaymentHistory, 'transactionId' | 'date'>
  ): Promise<ICompanyCredit | null> {
    try {
      logger.info(`Recording payment for corpId: ${corpId}`, {
        amount: payment.amount,
        status: payment.status,
      });

      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const credit = await CompanyCredit.findOneAndUpdate(
        { corpId },
        {
          $push: {
            paymentHistory: {
              transactionId,
              date: new Date(),
              ...payment,
            },
          },
          $set: {
            lastPaymentDate: new Date(),
            ...(payment.status === PaymentStatus.COMPLETED && {
              currentUtilization: Math.max(0, (await this.getCredit(corpId))?.currentUtilization ?? 0 - payment.amount),
            }),
          },
        },
        { new: true }
      );

      if (!credit) {
        logger.warn(`No credit record found for corpId: ${corpId}`);
        return null;
      }

      logger.info(`Payment recorded for corpId: ${corpId}`, { transactionId });
      return credit;
    } catch (error) {
      logger.error(`Error recording payment for corpId: ${corpId}`, { error });
      throw error;
    }
  }

  /**
   * Update utilization (for BNPL operations)
   */
  async updateUtilization(
    corpId: string,
    amount: number,
    operation: 'add' | 'subtract'
  ): Promise<ICompanyCredit | null> {
    try {
      logger.info(`Updating utilization for corpId: ${corpId}`, {
        amount,
        operation,
      });

      const credit = await this.getCredit(corpId);
      if (!credit) {
        logger.warn(`No credit record found for corpId: ${corpId}`);
        return null;
      }

      const newUtilization =
        operation === 'add'
          ? credit.currentUtilization + amount
          : Math.max(0, credit.currentUtilization - amount);

      const updatedCredit = await CompanyCredit.findOneAndUpdate(
        { corpId },
        {
          $set: {
            currentUtilization: newUtilization,
            availableCredit: Math.max(0, credit.creditLimit - newUtilization),
            totalOutstanding: newUtilization,
          },
        },
        { new: true }
      );

      logger.info(`Utilization updated for corpId: ${corpId}`, {
        previousUtilization: credit.currentUtilization,
        newUtilization,
      });

      return updatedCredit;
    } catch (error) {
      logger.error(`Error updating utilization for corpId: ${corpId}`, { error });
      throw error;
    }
  }

  /**
   * Get all companies with credit (for admin view)
   */
  async getAllCredits(
    options: {
      page?: number;
      limit?: number;
      riskLevel?: RiskLevel;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    data: ICompanyCredit[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        riskLevel,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
      } = options;

      const query: Record<string, unknown> = {};
      if (riskLevel) {
        query.riskLevel = riskLevel;
      }

      const skip = (page - 1) * limit;
      const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [data, total] = await Promise.all([
        CompanyCredit.find(query).sort(sort).skip(skip).limit(limit),
        CompanyCredit.countDocuments(query),
      ]);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error fetching all credits', { error });
      throw error;
    }
  }

  /**
   * Calculate risk level based on payment history
   */
  async calculateRiskLevel(corpId: string): Promise<RiskLevel> {
    try {
      const credit = await this.getCredit(corpId);
      if (!credit) {
        return RiskLevel.HIGH;
      }

      const recentPayments = credit.paymentHistory.slice(-10);
      const overdueCount = recentPayments.filter(
        (p) => p.status === PaymentStatus.OVERDUE
      ).length;
      const overdueRatio = overdueCount / Math.max(recentPayments.length, 1);

      // Calculate based on credit score
      if (credit.creditScore >= 750 && overdueRatio < 0.1) {
        return RiskLevel.LOW;
      } else if (credit.creditScore >= 600 && overdueRatio < 0.3) {
        return RiskLevel.MEDIUM;
      } else if (credit.creditScore >= 400 && overdueRatio < 0.5) {
        return RiskLevel.HIGH;
      } else {
        return RiskLevel.CRITICAL;
      }
    } catch (error) {
      logger.error(`Error calculating risk level for corpId: ${corpId}`, { error });
      throw error;
    }
  }

  /**
   * Get risk multiplier based on risk level
   */
  private getRiskMultiplier(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case RiskLevel.LOW:
        return 1.0;
      case RiskLevel.MEDIUM:
        return 0.8;
      case RiskLevel.HIGH:
        return 0.5;
      case RiskLevel.CRITICAL:
        return 0;
      default:
        return 0.5;
    }
  }
}

export const companyCreditService = new CompanyCreditService();