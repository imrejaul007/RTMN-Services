import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

/**
 * PaymentSync - Synchronizes payment data with Payment Twin
 *
 * This service keeps the Payment Twin updated with all RABTUL payment
 * activities including transactions, refunds, and reconciliation data.
 */
export interface PaymentTransaction {
  id: string;
  corpid: string;
  type: 'payment' | 'refund' | 'chargeback' | 'fee';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentMethod?: {
    type: string;
    last4?: string;
  };
  merchantId?: string;
  reference?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  completedAt?: Date;
}

export interface PaymentReconciliation {
  corpid: string;
  periodStart: Date;
  periodEnd: Date;
  totalPayments: number;
  totalRefunds: number;
  totalFees: number;
  netAmount: number;
  transactionCount: number;
  discrepancyCount: number;
  status: 'pending' | 'completed' | 'failed';
}

export class PaymentSync {
  private logger: winston.Logger;
  private paymentTwinClient: AxiosInstance;
  private healthy: boolean = true;
  private lastSyncTime: Date | null = null;
  private transactionBuffer: PaymentTransaction[] = [];
  private syncBatchSize: number = 50;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(logger: winston.Logger) {
    this.logger = logger;

    const paymentTwinUrl = process.env.PAYMENT_TWIN_URL || 'http://localhost:3018';

    this.paymentTwinClient = axios.create({
      baseURL: paymentTwinUrl,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Set up periodic batch flush
    this.flushInterval = setInterval(() => {
      this.flushTransactions();
    }, 15000); // Flush every 15 seconds

    this.logger.info('PaymentSync initialized', { paymentTwinUrl });
  }

  /**
   * Sync a single transaction to Payment Twin
   */
  async syncTransaction(transaction: PaymentTransaction): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.debug('Syncing transaction to Payment Twin', {
        id: transaction.id,
        amount: transaction.amount
      });

      await this.paymentTwinClient.post('/api/transactions', {
        ...transaction,
        source: 'rabtul-payment',
        syncedAt: new Date().toISOString()
      });

      this.healthy = true;
      this.lastSyncTime = new Date();

      return { success: true };
    } catch (error: any) {
      this.logger.error('Failed to sync transaction', {
        id: transaction.id,
        error: error.message
      });

      // Add to buffer for retry
      this.transactionBuffer.push(transaction);

      return { success: false, error: error.message };
    }
  }

  /**
   * Batch sync multiple transactions
   */
  async syncTransactionBatch(transactions: PaymentTransaction[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      this.logger.debug('Syncing transaction batch to Payment Twin', {
        count: transactions.length
      });

      const response = await this.paymentTwinClient.post('/api/transactions/batch', {
        transactions: transactions.map(t => ({
          ...t,
          source: 'rabtul-payment',
          syncedAt: new Date().toISOString()
        }))
      });

      if (response.data.results) {
        for (const res of response.data.results) {
          if (res.success) result.success++;
          else {
            result.failed++;
            result.errors.push(`${res.id}: ${res.error}`);
          }
        }
      } else {
        result.success = transactions.length;
      }

      this.healthy = true;
      this.lastSyncTime = new Date();
    } catch (error: any) {
      this.logger.error('Failed to sync transaction batch', {
        error: error.message,
        count: transactions.length
      });

      // Add all to buffer for retry
      this.transactionBuffer.push(...transactions);

      result.failed = transactions.length;
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Sync refund to Payment Twin
   */
  async syncRefund(refund: {
    id: string;
    originalTransactionId: string;
    corpid: string;
    amount: number;
    currency: string;
    reason?: string;
    status: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.debug('Syncing refund to Payment Twin', {
        id: refund.id,
        originalTransactionId: refund.originalTransactionId
      });

      await this.paymentTwinClient.post('/api/refunds', {
        ...refund,
        source: 'rabtul-payment',
        syncedAt: new Date().toISOString()
      });

      this.healthy = true;
      this.lastSyncTime = new Date();

      return { success: true };
    } catch (error: any) {
      this.logger.error('Failed to sync refund', {
        id: refund.id,
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Sync reconciliation data to Payment Twin
   */
  async syncReconciliation(reconciliation: PaymentReconciliation): Promise<{
    success: boolean;
    reconciliationId?: string;
    error?: string;
  }> {
    try {
      this.logger.debug('Syncing reconciliation to Payment Twin', {
        corpid: reconciliation.corpid,
        periodStart: reconciliation.periodStart,
        periodEnd: reconciliation.periodEnd
      });

      const response = await this.paymentTwinClient.post('/api/reconciliations', {
        ...reconciliation,
        source: 'rabtul-payment',
        syncedAt: new Date().toISOString()
      });

      this.healthy = true;
      this.lastSyncTime = new Date();

      return {
        success: true,
        reconciliationId: response.data.id
      };
    } catch (error: any) {
      this.logger.error('Failed to sync reconciliation', {
        corpid: reconciliation.corpid,
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Get payment summary from Payment Twin
   */
  async getPaymentSummary(corpid: string, period?: {
    start: Date;
    end: Date;
  }): Promise<any | null> {
    try {
      let url = `/api/summary/${corpid}`;

      if (period) {
        url += `?start=${period.start.toISOString()}&end=${period.end.toISOString()}`;
      }

      const response = await this.paymentTwinClient.get(url);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      this.logger.error('Failed to get payment summary', {
        corpid,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get transaction from Payment Twin
   */
  async getTransaction(transactionId: string): Promise<PaymentTransaction | null> {
    try {
      const response = await this.paymentTwinClient.get(`/api/transactions/${transactionId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      this.logger.error('Failed to get transaction', {
        transactionId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Verify transaction with Payment Twin
   */
  async verifyTransaction(transactionId: string): Promise<{
    verified: boolean;
    data?: PaymentTransaction;
    discrepancy?: string;
  }> {
    try {
      const response = await this.paymentTwinClient.post('/api/transactions/verify', {
        transactionId,
        source: 'rabtul-payment'
      });

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to verify transaction', {
        transactionId,
        error: error.message
      });

      return {
        verified: false,
        discrepancy: error.message
      };
    }
  }

  /**
   * Flush buffered transactions
   */
  private async flushTransactions(): Promise<void> {
    if (this.transactionBuffer.length === 0) return;

    const toFlush = this.transactionBuffer.splice(0, this.syncBatchSize);

    try {
      const result = await this.syncTransactionBatch(toFlush);

      if (result.failed > 0) {
        this.logger.warn('Some transactions failed to sync', {
          failed: result.failed,
          errors: result.errors.slice(0, 5) // Log first 5 errors
        });
      }
    } catch (error: any) {
      this.logger.error('Failed to flush transaction buffer', {
        error: error.message,
        count: toFlush.length
      });

      // Re-add to buffer
      this.transactionBuffer.unshift(...toFlush);
    }
  }

  /**
   * Force flush all buffered transactions
   */
  async forceFlush(): Promise<{ flushed: number; remaining: number }> {
    const flushed = this.transactionBuffer.length;

    while (this.transactionBuffer.length > 0) {
      await this.flushTransactions();
    }

    return {
      flushed,
      remaining: this.transactionBuffer.length
    };
  }

  /**
   * Get merchant payment analytics
   */
  async getMerchantAnalytics(merchantId: string, period: {
    start: Date;
    end: Date;
  }): Promise<any | null> {
    try {
      const response = await this.paymentTwinClient.get('/api/analytics/merchant', {
        params: {
          merchantId,
          start: period.start.toISOString(),
          end: period.end.toISOString()
        }
      });

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to get merchant analytics', {
        merchantId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Sync payment method to Payment Twin
   */
  async syncPaymentMethod(method: {
    id: string;
    corpid: string;
    type: 'card' | 'bank' | 'wallet' | 'upi';
    provider?: string;
    last4?: string;
    status: 'active' | 'expired' | 'blocked';
  }): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.debug('Syncing payment method to Payment Twin', {
        id: method.id,
        type: method.type
      });

      await this.paymentTwinClient.post('/api/payment-methods', {
        ...method,
        source: 'rabtul-payment',
        syncedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error: any) {
      this.logger.error('Failed to sync payment method', {
        id: method.id,
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Get sync status
   */
  getStatus(): {
    healthy: boolean;
    lastSyncTime: Date | null;
    bufferedTransactions: number;
  } {
    return {
      healthy: this.healthy,
      lastSyncTime: this.lastSyncTime,
      bufferedTransactions: this.transactionBuffer.length
    };
  }

  /**
   * Check if service is healthy
   */
  isHealthy(): boolean {
    return this.healthy && this.transactionBuffer.length < 1000;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    // Final flush
    this.forceFlush();
  }
}
