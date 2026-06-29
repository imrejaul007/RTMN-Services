/**
 * Wallet Adapter Types
 *
 * Common types used across all wallet adapters.
 */

export interface WalletBalance {
  available: number;
  pending: number;
  total: number;
  currency: string;
}

export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface TransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export interface WalletSummary {
  walletId: string;
  balance: WalletBalance;
  recentTransactions: Transaction[];
  limits: SpendingLimits;
  status: 'active' | 'frozen' | 'closed';
}

export interface SpendingLimits {
  dailyLimit: number;
  perTransactionLimit: number;
  monthlyLimit: number;
}

/**
 * Wallet Provider Types
 */
export type WalletProvider = 'rez' | 'agent' | 'hojai' | 'corporate' | 'cross_wallet';

/**
 * Wallet Types in CompanyOS
 */
export type CompanyOSWalletType = 'corporate' | 'user' | 'agent';

/**
 * Adapter Configuration
 */
export interface WalletAdapterConfig {
  provider: WalletProvider;
  baseUrl: string;
  apiKey?: string;
}

/**
 * Create adapter based on provider
 */
export function createWalletAdapter(config: WalletAdapterConfig): any {
  switch (config.provider) {
    case 'rez':
      return { type: 'rez', baseUrl: config.baseUrl };
    case 'agent':
      return { type: 'agent', baseUrl: config.baseUrl };
    case 'hojai':
      return { type: 'hojai', baseUrl: config.baseUrl };
    case 'cross_wallet':
      return { type: 'cross_wallet', baseUrl: config.baseUrl };
    default:
      return { type: 'unknown' };
  }
}
