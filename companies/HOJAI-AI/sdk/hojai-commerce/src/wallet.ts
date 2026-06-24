/**
 * REZ Wallet Client
 *
 * Wraps rez-wallet-service: consumer wallets, merchant wallets,
 * coins, loyalty points, BNPL credit, savings, reconciliation.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type WalletTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type WalletStatus = 'active' | 'suspended' | 'closed';

export interface Wallet {
  userId: string;
  balance: number;
  coins: number;
  currency: string;
  status: WalletStatus;
  tier: WalletTier;
  metadata?: Record<string, unknown>;
}

export interface Transaction {
  id: string;
  walletId: string;
  type: 'credit' | 'debit';
  amount: number;
  balanceAfter: number;
  reason: string;
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CreditScore {
  userId: string;
  score: number;
  tier: string;
  factors: Array<{ name: string; weight: number; value: number }>;
  lastUpdated: string;
}

export interface MerchantWallet {
  merchantId: string;
  balance: number;
  pendingPayout: number;
  currency: string;
  totalEarnings: number;
  totalPayouts: number;
  metadata?: Record<string, unknown>;
}

export interface Payout {
  id: string;
  merchantId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  bankAccount?: { accountNumber: string; ifsc: string; bankName: string };
  requestedAt: string;
  completedAt?: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline?: string;
  achieved: boolean;
  createdAt: string;
}

export class WalletClient {
  constructor(private config: HojaiConfig) {}

  // ── Consumer Wallet ───────────────────────────────────────
  async get(userId: string): Promise<Wallet> {
    return request<Wallet>(this.config, 'GET', `/wallet/${encodeURIComponent(userId)}`);
  }

  async credit(userId: string, input: { amount: number; reason: string; reference?: string; metadata?: Record<string, unknown> }): Promise<Transaction> {
    return request<Transaction>(this.config, 'POST', `/wallet/${encodeURIComponent(userId)}/credit`, input);
  }

  async debit(userId: string, input: { amount: number; reason: string; reference?: string; metadata?: Record<string, unknown> }): Promise<Transaction> {
    return request<Transaction>(this.config, 'POST', `/wallet/${encodeURIComponent(userId)}/debit`, input);
  }

  async listTransactions(userId: string, input: { type?: 'credit' | 'debit'; limit?: number; since?: string } = {}): Promise<Transaction[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Transaction[]>(this.config, 'GET', `/wallet/${encodeURIComponent(userId)}/transactions?${params.toString()}`);
  }

  // ── Merchant Wallet ───────────────────────────────────────
  async getMerchant(merchantId: string): Promise<MerchantWallet> {
    return request<MerchantWallet>(this.config, 'GET', `/merchant-wallet/${encodeURIComponent(merchantId)}`);
  }

  async requestPayout(merchantId: string, input: { amount: number; bankAccount?: { accountNumber: string; ifsc: string; bankName: string } }): Promise<Payout> {
    return request<Payout>(this.config, 'POST', `/merchant-wallet/${encodeURIComponent(merchantId)}/payout`, input);
  }

  async getMerchantEarnings(merchantId: string, input: { period?: 'day' | 'week' | 'month' | 'year' | 'all' } = {}): Promise<{ totalEarnings: number; breakdown: Array<{ date: string; amount: number; source: string }> }> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request(this.config, 'GET', `/merchant-wallet/${encodeURIComponent(merchantId)}/earnings?${params.toString()}`);
  }

  // ── Credit (BNPL) ─────────────────────────────────────────
  async getCreditScore(userId: string): Promise<CreditScore> {
    return request<CreditScore>(this.config, 'GET', `/credit/score/${encodeURIComponent(userId)}`);
  }

  async applyForBnpl(input: { userId: string; amount: number; tenureMonths: number; purpose?: string }): Promise<{ applicationId: string; status: 'approved' | 'pending' | 'rejected'; approvedAmount?: number; interestRate?: number }> {
    return request(this.config, 'POST', '/api/credit/apply', input);
  }

  async getCreditLimit(userId: string): Promise<{ userId: string; limit: number; used: number; available: number; currency: string }> {
    return request(this.config, 'GET', `/api/credit/limit/${encodeURIComponent(userId)}`);
  }

  // ── Savings ───────────────────────────────────────────────
  async getSavingsSummary(userId: string): Promise<{ totalSaved: number; goals: SavingsGoal[]; insights: string[] }> {
    return request(this.config, 'GET', `/api/savings/${encodeURIComponent(userId)}`);
  }

  async getSavingsInsights(userId: string): Promise<{ insights: Array<{ type: string; message: string; data?: Record<string, unknown> }> }> {
    return request(this.config, 'GET', `/api/savings/${encodeURIComponent(userId)}/insights`);
  }

  async createSavingsGoal(input: { userId: string; name: string; targetAmount: number; deadline?: string }): Promise<SavingsGoal> {
    return request<SavingsGoal>(this.config, 'POST', `/api/savings/${encodeURIComponent(input.userId)}/goals`, input);
  }

  // ── Internal ──────────────────────────────────────────────
  async internalCredit(input: { userId: string; amount: number; reason: string; reference: string }): Promise<{ credited: boolean }> {
    return request(this.config, 'POST', '/internal/wallet/credit', input);
  }

  async internalDebit(input: { userId: string; amount: number; reason: string; reference: string }): Promise<{ debited: boolean }> {
    return request(this.config, 'POST', '/internal/wallet/debit', input);
  }

  async internalRead(userId: string): Promise<Wallet> {
    return request<Wallet>(this.config, 'GET', `/internal/wallet/read/${encodeURIComponent(userId)}`);
  }

  async reconciliation(input: { fromDate: string; toDate: string }): Promise<{ matched: number; unmatched: number; discrepancies: Array<{ reference: string; expected: number; actual: number }> }> {
    return request(this.config, 'POST', '/internal/reconciliation', input);
  }
}