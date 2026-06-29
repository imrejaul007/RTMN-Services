/**
 * Transaction Service
 *
 * Handles transactions between wallets with authority limits.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  AgentAuthority,
} from './types';
import { walletService } from './wallets';

// ============================================
// Store
// ============================================

const transactions = new Map<string, Transaction>();
const agentAuthorities = new Map<string, AgentAuthority>();

// ============================================
// Transaction Service
// ============================================

export class TransactionService {
  /**
   * Create and execute a transaction
   */
  async execute(params: {
    fromWalletId: string;
    toWalletId?: string;
    type: TransactionType;
    amount: number;
    description: string;
    metadata?: Record<string, any>;
    initiatorId: string;          // Who initiated
    initiatorType: 'user' | 'agent' | 'system';
  }): Promise<Transaction> {
    const fromWallet = walletService.get(params.fromWalletId);
    if (!fromWallet) {
      throw new Error(`Wallet not found: ${params.fromWalletId}`);
    }

    const requiresApproval = this.requiresApproval(params.fromWalletId, params.amount, params.initiatorType);

    const transaction: Transaction = {
      id: `txn_${uuidv4().slice(0, 8)}`,
      fromWalletId: params.fromWalletId,
      toWalletId: params.toWalletId,
      type: params.type,
      amount: params.amount,
      currency: fromWallet.currency,
      status: requiresApproval ? 'pending' : 'completed',
      description: params.description,
      metadata: params.metadata,
      requiresApproval,
      approvedBy: requiresApproval ? undefined : 'auto-approved',
      approvedAt: requiresApproval ? undefined : new Date().toISOString(),
      executedAt: requiresApproval ? undefined : new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    transactions.set(transaction.id, transaction);

    // If auto-approved, execute immediately
    if (!requiresApproval) {
      this.executeTransaction(transaction);
    }

    return transaction;
  }

  /**
   * Check if transaction requires approval
   */
  private requiresApproval(
    walletId: string,
    amount: number,
    initiatorType: 'user' | 'agent' | 'system'
  ): boolean {
    const wallet = walletService.get(walletId);
    if (!wallet) return true;

    // System-initiated transactions are auto-approved
    if (initiatorType === 'system') return false;

    // Agent transactions: check authority
    if (initiatorType === 'agent') {
      // For now, all agents need approval above their auto-approve limit
      const authority = agentAuthorities.get(wallet.ownerId);
      if (authority && amount <= authority.limits.maxAutoApproveAmount) {
        return false;
      }
      return true;
    }

    // User transactions: check wallet limit
    return amount > wallet.spendingLimits.requiresApprovalAbove;
  }

  /**
   * Execute a pending transaction
   */
  private executeTransaction(transaction: Transaction): void {
    const result = walletService.debit(transaction.fromWalletId, transaction.amount, transaction.description);

    if (!result.success) {
      transaction.status = 'failed';
      transaction.metadata = {
        ...transaction.metadata,
        failureReason: result.reason,
      };
      return;
    }

    // Credit destination wallet if internal
    if (transaction.toWalletId) {
      walletService.credit(transaction.toWalletId, transaction.amount, transaction.description);
    }

    transaction.status = 'completed';
    transaction.executedAt = new Date().toISOString();
  }

  /**
   * Approve a pending transaction
   */
  approve(transactionId: string, approvedBy: string): Transaction | null {
    const tx = transactions.get(transactionId);
    if (!tx || tx.status !== 'pending') return null;

    tx.status = 'approved';
    tx.approvedBy = approvedBy;
    tx.approvedAt = new Date().toISOString();

    this.executeTransaction(tx);
    return tx;
  }

  /**
   * Reject a pending transaction
   */
  reject(transactionId: string, reason: string): Transaction | null {
    const tx = transactions.get(transactionId);
    if (!tx || tx.status !== 'pending') return null;

    tx.status = 'failed';
    tx.metadata = { ...tx.metadata, rejectionReason: reason };
    return tx;
  }

  /**
   * Get transaction by ID
   */
  get(transactionId: string): Transaction | null {
    return transactions.get(transactionId) || null;
  }

  /**
   * List transactions for a wallet
   */
  listForWallet(walletId: string, filters?: { status?: TransactionStatus; type?: TransactionType }): Transaction[] {
    let list = Array.from(transactions.values())
      .filter(t => t.fromWalletId === walletId || t.toWalletId === walletId);

    if (filters?.status) list = list.filter(t => t.status === filters.status);
    if (filters?.type) list = list.filter(t => t.type === filters.type);

    return list.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get pending transactions (for approval queue)
   */
  getPending(): Transaction[] {
    return Array.from(transactions.values())
      .filter(t => t.status === 'pending')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  /**
   * Register agent authority
   */
  registerAgentAuthority(authority: AgentAuthority): void {
    agentAuthorities.set(authority.agentId, authority);
  }

  /**
   * Get agent authority
   */
  getAgentAuthority(agentId: string): AgentAuthority | null {
    return agentAuthorities.get(agentId) || null;
  }
}

export const transactionService = new TransactionService();