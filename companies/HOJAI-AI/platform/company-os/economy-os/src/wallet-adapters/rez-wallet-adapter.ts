/**
 * REZ Wallet Adapter
 *
 * Connects to existing rez-wallet-service
 */

import { IWalletAdapter, WalletBalance, Transaction, TransactionResult, SpendingLimits } from './types';

export interface REZWalletConfig {
  baseUrl: string;
  apiKey?: string;
}

export class REZWalletAdapter implements IWalletAdapter {
  private baseUrl: string;

  constructor(config: REZWalletConfig) {
    this.baseUrl = config.baseUrl || 'http://localhost:4004';
  }

  async getBalance(walletId: string): Promise<WalletBalance> {
    try {
      const response = await fetch(`${this.baseUrl}/api/wallet/balance/${walletId}`);
      const data = await response.json();
      return {
        available: data.balance?.available || 0,
        pending: data.balance?.pending || 0,
        total: data.balance?.total || 0,
        currency: data.currency || 'INR',
      };
    } catch (error) {
      return {
        available: 0,
        pending: 0,
        total: 0,
        currency: 'INR',
      };
    }
  }

  async credit(walletId: string, amount: number, description: string): Promise<TransactionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/wallet/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId, amount, description }),
      });

      const data = await response.json();
      return {
        success: true,
        transactionId: data.transactionId,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async debit(walletId: string, amount: number, description: string): Promise<TransactionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/wallet/debit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId, amount, description }),
      });

      const data = await response.json();
      return {
        success: true,
        transactionId: data.transactionId,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getTransactions(walletId: string, limit = 50): Promise<Transaction[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/wallet/transactions/${walletId}?limit=${limit}`);
      const data = await response.json();
      return data.transactions || [];
    } catch {
      return [];
    }
  }

  async getSummary(walletId: string): Promise<any> {
    const balance = await this.getBalance(walletId);
    const transactions = await this.getTransactions(walletId, 10);

    return {
      walletId,
      balance: {
        available: balance.available,
        pending: balance.pending,
        total: balance.total,
        currency: balance.currency,
      },
      recentTransactions: transactions,
      limits: {
        dailyLimit: 1000000,
        perTransactionLimit: 100000,
        monthlyLimit: 10000000,
      },
      status: 'active',
    };
  }
}</parameter>
