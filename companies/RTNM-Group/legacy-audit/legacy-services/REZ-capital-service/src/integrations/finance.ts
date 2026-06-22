/**
 * Finance Service Integration for Capital Service
 * Manages connection to the finance service
 */

import { getFinanceClient, FinanceClient, Transaction, Invoice } from '../clients/financeClient';
import logger from '../utils/logger';

export interface FinanceIntegrationConfig {
  serviceUrl: string;
  timeout: number;
  retries: number;
}

const defaultConfig: FinanceIntegrationConfig = {
  serviceUrl: process.env.FINANCE_SERVICE_URL || 'http://localhost:3006',
  timeout: 10000,
  retries: 3,
};

/**
 * Finance Integration class
 * Provides high-level integration with the finance service
 */
export class FinanceIntegration {
  private client: FinanceClient;
  private config: FinanceIntegrationConfig;

  constructor(config: Partial<FinanceIntegrationConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.client = getFinanceClient();
  }

  /**
   * Get the finance client instance
   */
  getClient(): FinanceClient {
    return this.client;
  }

  /**
   * Health check for the finance service
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const start = Date.now();
    try {
      const healthy = await this.client.healthCheck();
      return {
        healthy,
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Record loan disbursement
   */
  async recordDisbursement(params: {
    loanId: string;
    merchantId: string;
    amount: number;
  }): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
    try {
      const transaction = await this.client.recordDisbursement(params);
      logger.info('[FinanceIntegration] Disbursement recorded', {
        loanId: params.loanId,
        transactionId: transaction.transactionId,
      });
      return { success: true, transaction };
    } catch (error) {
      logger.error('[FinanceIntegration] Error recording disbursement', {
        loanId: params.loanId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Record loan repayment
   */
  async recordRepayment(params: {
    loanId: string;
    merchantId: string;
    amount: number;
    principal: number;
    interest: number;
    fees: number;
  }): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
    try {
      const transaction = await this.client.recordRepayment({
        loanId: params.loanId,
        merchantId: params.merchantId,
        amount: params.amount,
      });
      logger.info('[FinanceIntegration] Repayment recorded', {
        loanId: params.loanId,
        transactionId: transaction.transactionId,
        principal: params.principal,
        interest: params.interest,
      });
      return { success: true, transaction };
    } catch (error) {
      logger.error('[FinanceIntegration] Error recording repayment', {
        loanId: params.loanId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Record a fee
   */
  async recordFee(params: {
    loanId: string;
    merchantId: string;
    feeType: string;
    amount: number;
  }): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
    try {
      const transaction = await this.client.recordFee({
        loanId: params.loanId,
        merchantId: params.merchantId,
        feeType: params.feeType,
        amount: params.amount,
      });
      logger.info('[FinanceIntegration] Fee recorded', {
        loanId: params.loanId,
        feeType: params.feeType,
        transactionId: transaction.transactionId,
      });
      return { success: true, transaction };
    } catch (error) {
      logger.error('[FinanceIntegration] Error recording fee', {
        loanId: params.loanId,
        feeType: params.feeType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get merchant loan transactions
   */
  async getMerchantTransactions(
    merchantId: string,
    params?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<Transaction[]> {
    try {
      return await this.client.getTransactions(merchantId, params);
    } catch (error) {
      logger.error('[FinanceIntegration] Error getting transactions', {
        merchantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Create an invoice
   */
  async createInvoice(params: {
    merchantId: string;
    type: 'loan_statement' | 'fee' | 'interest';
    amount: number;
    dueDate: Date;
    referenceId?: string;
  }): Promise<{ success: boolean; invoice?: Invoice; error?: string }> {
    try {
      const invoice = await this.client.createInvoice(params);
      logger.info('[FinanceIntegration] Invoice created', {
        invoiceId: invoice.invoiceId,
        merchantId: params.merchantId,
        amount: params.amount,
      });
      return { success: true, invoice };
    } catch (error) {
      logger.error('[FinanceIntegration] Error creating invoice', {
        merchantId: params.merchantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get merchant financial summary
   */
  async getFinancialSummary(merchantId: string): Promise<{
    totalDisbursed: number;
    totalRepaid: number;
    totalOutstanding: number;
    pendingInvoices: number;
    overdueInvoices: number;
  }> {
    try {
      return await this.client.getFinancialSummary(merchantId);
    } catch (error) {
      logger.error('[FinanceIntegration] Error getting financial summary', {
        merchantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        totalDisbursed: 0,
        totalRepaid: 0,
        totalOutstanding: 0,
        pendingInvoices: 0,
        overdueInvoices: 0,
      };
    }
  }

  /**
   * Get account summary
   */
  async getAccountSummary(merchantId: string): Promise<{
    balance: number;
    availableBalance: number;
    pendingBalance: number;
  }> {
    try {
      const summary = await this.client.getAccountSummary(merchantId, 'capital');
      return {
        balance: summary.balance,
        availableBalance: summary.availableBalance,
        pendingBalance: summary.pendingBalance,
      };
    } catch (error) {
      logger.error('[FinanceIntegration] Error getting account summary', {
        merchantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        balance: 0,
        availableBalance: 0,
        pendingBalance: 0,
      };
    }
  }
}

// Singleton instance
let financeIntegration: FinanceIntegration | null = null;

export function getFinanceIntegration(): FinanceIntegration {
  if (!financeIntegration) {
    financeIntegration = new FinanceIntegration();
  }
  return financeIntegration;
}

export default FinanceIntegration;
