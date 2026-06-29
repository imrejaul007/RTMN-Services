/**
 * Wallet Adapter Layer
 *
 * Connects CompanyOS EconomyOS to existing wallet implementations:
 * - REZ Wallet Service
 * - Agent Wallet
 * - HOJAI Agent Wallet
 * - Cross-Wallet Identity
 *
 * This layer abstracts the wallet types.
 */

export * from './types';

// Re-export all wallet types
export * from './rez-wallet-adapter';
export * from './agent-wallet-adapter';
export * from './hojai-wallet-adapter';
export * from './cross-wallet-adapter';

/**
 * Unified Wallet Adapter Interface
 * All wallet adapters implement this interface.
 */
export interface IWalletAdapter {
  /** Get wallet balance */
  getBalance(walletId: string): Promise<WalletBalance>;

  /** Credit wallet */
  credit(walletId: string, amount: number, description: string): Promise<TransactionResult>;

  /** Debit wallet */
  debit(walletId: string, amount: number, description: string): Promise<TransactionResult>;

  /** Get transaction history */
  getTransactions(walletId: string, limit?: number): Promise<Transaction[]>;

  /** Get wallet summary */
  getSummary(walletId: string): Promise<WalletSummary>;
}

// ============================================
// Shared Types
// ============================================

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