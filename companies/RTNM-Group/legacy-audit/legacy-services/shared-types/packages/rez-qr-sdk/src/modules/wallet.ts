/**
 * Wallet Module - Balance, payments, and transactions
 */

import { QRClient } from './client';
import type {
  WalletBalance,
  PaymentResult,
  PaymentMethod,
  Transaction,
} from '../types';

export class WalletModule {
  private client: QRClient;

  constructor(client: QRClient) {
    this.client = client;
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<WalletBalance> {
    return this.client.get('/wallet/balance');
  }

  /**
   * Get detailed coin balances
   */
  async getCoinBalances(): Promise<WalletBalance['coins']> {
    return this.client.get('/wallet/coins');
  }

  /**
   * Pay from wallet
   */
  async pay(amount: number, description: string, metadata?: {
    orderId?: string;
    billId?: string;
    merchantId?: string;
  }): Promise<PaymentResult> {
    return this.client.post('/wallet/pay', { amount, description, ...metadata });
  }

  /**
   * Add funds to wallet
   */
  async addFunds(amount: number, method: PaymentMethod): Promise<Transaction> {
    return this.client.post('/wallet/add-funds', { amount, method });
  }

  /**
   * Get payment methods
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return this.client.get('/wallet/payment-methods');
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(method: PaymentMethod): Promise<{ methodId: string }> {
    return this.client.post('/wallet/payment-methods', method);
  }

  /**
   * Remove payment method
   */
  async removePaymentMethod(methodId: string): Promise<void> {
    return this.client.delete(`/wallet/payment-methods/${methodId}`);
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(methodId: string): Promise<void> {
    return this.client.patch(`/wallet/payment-methods/${methodId}`, { default: true });
  }

  /**
   * Get transaction history
   */
  async getTransactions(params?: {
    page?: number;
    limit?: number;
    type?: 'credit' | 'debit';
    startDate?: string;
    endDate?: string;
  }): Promise<TransactionList> {
    const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return this.client.get(`/wallet/transactions${query}`);
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<Transaction> {
    return this.client.get(`/wallet/transactions/${transactionId}`);
  }

  /**
   * Get pending transactions
   */
  async getPendingTransactions(): Promise<Transaction[]> {
    return this.client.get('/wallet/transactions/pending');
  }

  /**
   * Cancel pending transaction
   */
  async cancelTransaction(transactionId: string): Promise<void> {
    return this.client.delete(`/wallet/transactions/${transactionId}`);
  }

  /**
   * Request refund
   */
  async requestRefund(transactionId: string, reason: string): Promise<{ refundId: string; status: string }> {
    return this.client.post(`/wallet/refunds`, { transactionId, reason });
  }

  /**
   * Get refund status
   */
  async getRefundStatus(refundId: string): Promise<{ status: 'pending' | 'approved' | 'processed' | 'rejected'; amount: number }> {
    return this.client.get(`/wallet/refunds/${refundId}`);
  }

  /**
   * Convert coins
   */
  async convertCoins(fromType: string, toType: string, amount: number): Promise<{ convertedAmount: number; rate: number }> {
    return this.client.post('/wallet/coins/convert', { fromType, toType, amount });
  }

  /**
   * Get coin conversion rates
   */
  async getConversionRates(): Promise<{ from: string; to: string; rate: number }[]> {
    return this.client.get('/wallet/coins/rates');
  }

  /**
   * Gift coins to another user
   */
  async giftCoins(toUserId: string, amount: number, message?: string): Promise<Transaction> {
    return this.client.post('/wallet/gift', { toUserId, amount, message });
  }

  /**
   * Get wallet settings
   */
  async getSettings(): Promise<WalletSettings> {
    return this.client.get('/wallet/settings');
  }

  /**
   * Update wallet settings
   */
  async updateSettings(settings: Partial<WalletSettings>): Promise<WalletSettings> {
    return this.client.patch('/wallet/settings', settings);
  }

  /**
   * Enable/disable auto-reload
   */
  async setAutoReload(enabled: boolean, amount?: number, threshold?: number): Promise<void> {
    return this.client.patch('/wallet/auto-reload', { enabled, amount, threshold });
  }

  /**
   * Get spending insights
   */
  async getInsights(params?: {
    period?: 'week' | 'month' | 'year';
  }): Promise<SpendingInsights> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.client.get(`/wallet/insights${query}`);
  }

  /**
   * Get budget status
   */
  async getBudgetStatus(): Promise<BudgetStatus> {
    return this.client.get('/wallet/budget');
  }

  /**
   * Set monthly budget
   */
  async setBudget(amount: number): Promise<void> {
    return this.client.post('/wallet/budget', { amount });
  }

  /**
   * Verify wallet ownership
   */
  async verifyOwnership(): Promise<{ verified: boolean; verifiedAt?: string }> {
    return this.client.post('/wallet/verify');
  }
}

export interface TransactionList {
  items: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WalletSettings {
  defaultPaymentMethod?: string;
  autoReload: {
    enabled: boolean;
    amount?: number;
    threshold?: number;
  };
  notifications: {
    lowBalance: boolean;
    largeTransaction: boolean;
    weeklySummary: boolean;
  };
  security: {
    requirePin: boolean;
    biometricEnabled: boolean;
  };
}

export interface SpendingInsights {
  totalSpent: number;
  averageTransaction: number;
  transactionCount: number;
  topCategories: { category: string; amount: number; percentage: number }[];
  spendingByDay: { date: string; amount: number }[];
  comparisonToLastPeriod: {
    spent: number;
    change: number;
    changePercentage: number;
  };
}

export interface BudgetStatus {
  monthlyBudget: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  daysRemaining: number;
  projectedSpend: number;
  onTrack: boolean;
}
