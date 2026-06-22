/**
 * CorpPerks Wallet API Service
 * Multi-Category Benefit Wallet for employees
 */

import { apiClient } from './apiClient';

const WALLET_API = '/api/wallet';

// Types
export interface CorporateWallet {
  walletId: string;
  companyId: string;
  companyName: string;
  balance: number;
  totalAllocated: number;
  currency: string;
  status: string;
}

export interface EmployeeWallet {
  walletId: string;
  employeeId: string;
  companyId: string;
  name: string;
  wallets: {
    meal: WalletType;
    travel: WalletType;
    wellness: WalletType;
    gift: WalletType;
    general: WalletType;
  };
  benefits: WalletBenefits;
  totals: {
    totalBalance: number;
    totalAllocated: number;
    totalSpent: number;
  };
}

export interface WalletType {
  balance: number;
  allocated: number;
  spent: number;
  monthlyLimit: number | null;
  resetDay: number;
  expiry: string | null;
  categories: string[];
  merchantTypes: string[];
}

export interface WalletBenefits {
  rezMerchantDiscount: number;
  cashbackRate: number;
  maxCashbackPerMonth: number;
}

export interface Transaction {
  id: string;
  type: string;
  walletId: string;
  employeeId: string;
  walletType: string;
  amount: number;
  originalAmount?: number;
  discount?: number;
  finalAmount?: number;
  cashback?: number;
  cashbackCoins?: number;
  isReZMerchant?: boolean;
  merchantId?: string;
  merchantType?: string;
  merchantName?: string;
  description?: string;
  balanceAfter: number;
  status: string;
  createdAt: string;
}

export interface SpendResult {
  transaction: Transaction;
  summary: {
    originalAmount: number;
    discountApplied: boolean;
    discountAmount: number;
    finalAmountPaid: number;
    youSaved: number;
    earnedReZCoins: number;
    balanceRemaining: number;
  };
}

// API Functions

export const walletApi = {
  // Corporate Wallet
  async getCorporateWallet(companyId: string): Promise<CorporateWallet> {
    const headers = await apiClient.getAuthHeaders();
    const res = await fetch(`${WALLET_API}/corporate/${companyId}`, {
      headers,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  async topupCorporateWallet(companyId: string, amount: number, paymentMethod: string): Promise<unknown> {
    const headers = await apiClient.getAuthHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetch(`${WALLET_API}/corporate/${companyId}/topup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount, paymentMethod }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  // Employee Wallet
  async getEmployeeWallet(employeeId: string): Promise<EmployeeWallet> {
    const headers = await apiClient.getAuthHeaders();
    const res = await fetch(`${WALLET_API}/employee/${employeeId}`, {
      headers,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  async getWalletType(employeeId: string, type: string): Promise<WalletType> {
    const headers = await apiClient.getAuthHeaders();
    const res = await fetch(`${WALLET_API}/employee/${employeeId}/${type}`, {
      headers,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  async allocateToEmployee(employeeId: string, type: string, amount: number, description?: string): Promise<unknown> {
    const headers = await apiClient.getAuthHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetch(`${WALLET_API}/employee/${employeeId}/allocate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type, amount, description }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  async bulkAllocate(allocations: { employeeId: string; type: string; amount: number }[]): Promise<unknown> {
    const headers = await apiClient.getAuthHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetch(`${WALLET_API}/bulk-allocate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ allocations }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  // Spend with Benefits
  async spend(
    employeeId: string,
    walletType: string,
    amount: number,
    merchantId: string,
    merchantType: string,
    merchantName: string,
    isReZMerchant: boolean,
    description?: string
  ): Promise<SpendResult> {
    const headers = await apiClient.getAuthHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetch(`${WALLET_API}/employee/${employeeId}/spend`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount,
        walletType,
        merchantId,
        merchantType,
        merchantName,
        isReZMerchant,
        description,
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  // Check Benefits
  async checkBenefits(employeeId: string, amount: number, merchantType: string, merchantId: string): Promise<unknown> {
    const headers = await apiClient.getAuthHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetch(`${WALLET_API}/check-benefits`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ employeeId, amount, merchantType, merchantId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  // Transactions
  async getTransactions(params?: {
    employeeId?: string;
    walletType?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Transaction[]; pagination: unknown }> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const headers = await apiClient.getAuthHeaders();
    const res = await fetch(`${WALLET_API}/transactions?${query}`, {
      headers,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Reset (Monthly)
  async resetWallets(companyId: string): Promise<unknown> {
    const headers = await apiClient.getAuthHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetch(`${WALLET_API}/reset`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ companyId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  // Wallet Rules
  async setWalletRules(employeeId: string, type: string, rules: Partial<WalletType>): Promise<WalletType> {
    const headers = await apiClient.getAuthHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetch(`${WALLET_API}/employee/${employeeId}/rules`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type, rules }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },
};

export default walletApi;
