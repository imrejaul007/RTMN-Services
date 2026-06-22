/**
 * SUTAR Economy OS - Transaction Service
 * Layer 10: Transaction management with CRUD, filtering, pagination
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  TransactionType,
  TransactionStatus,
  TransactionCategory,
  ITransaction,
  ITransactionFee,
  CreateTransactionRequest
} from '../types/index.js';

// ============================================
// In-Memory Storage
// ============================================

interface TransactionStore {
  [transactionId: string]: ITransaction;
}

interface TransactionFeeStore {
  [feeId: string]: ITransactionFee;
}

const transactionStore: TransactionStore = {};
const transactionFeeStore: TransactionFeeStore = {};

// ============================================
// Transaction Service Class
// ============================================

export class TransactionService {
  /**
   * Create a new transaction
   */
  async createTransaction(request: CreateTransactionRequest): Promise<ITransaction> {
    const {
      entityId,
      entityType,
      type,
      amount,
      currency = 'USD',
      description,
      referenceId,
      referenceType,
      metadata
    } = request;

    // Determine category based on type
    let category: TransactionCategory;
    switch (type) {
      case 'payment':
      case 'reward':
        category = 'inflow';
        break;
      case 'refund':
        category = 'outflow';
        break;
      case 'fee':
        category = 'outflow';
        break;
      case 'transfer':
        category = 'internal';
        break;
      default:
        category = 'internal';
    }

    const transaction: ITransaction = {
      transactionId: uuidv4(),
      entityId,
      entityType,
      type,
      category,
      amount,
      currency,
      balanceBefore: 0, // Will be updated by balance service
      balanceAfter: amount, // Will be updated by balance service
      status: 'pending',
      description,
      referenceId,
      referenceType: referenceType as ITransaction['referenceType'],
      metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    transactionStore[transaction.transactionId] = transaction;

    return transaction;
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<ITransaction | null> {
    return transactionStore[transactionId] || null;
  }

  /**
   * Get transaction by reference
   */
  async getTransactionByReference(referenceId: string, referenceType?: string): Promise<ITransaction[]> {
    return Object.values(transactionStore).filter(t =>
      t.referenceId === referenceId &&
      (!referenceType || t.referenceType === referenceType)
    );
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: string,
    status: TransactionStatus,
    failureReason?: string
  ): Promise<ITransaction | null> {
    const transaction = transactionStore[transactionId];
    if (!transaction) {
      return null;
    }

    transaction.status = status;
    transaction.failureReason = failureReason;
    transaction.updatedAt = new Date();

    if (status === 'completed') {
      transaction.completedAt = new Date();
    }

    transactionStore[transactionId] = transaction;
    return transaction;
  }

  /**
   * Get transactions for an entity with filtering and pagination
   */
  async getTransactions(
    entityId: string,
    options: {
      page?: number;
      limit?: number;
      type?: TransactionType;
      status?: TransactionStatus;
      category?: TransactionCategory;
      currency?: string;
      startDate?: Date;
      endDate?: Date;
      minAmount?: number;
      maxAmount?: number;
      sortBy?: 'createdAt' | 'amount' | 'type';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    transactions: ITransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    summary: {
      totalInflow: number;
      totalOutflow: number;
      netFlow: number;
      currency: string;
    };
  }> {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      category,
      currency,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    let transactions = Object.values(transactionStore)
      .filter(t => t.entityId === entityId)
      .filter(t => !type || t.type === type)
      .filter(t => !status || t.status === status)
      .filter(t => !category || t.category === category)
      .filter(t => !currency || t.currency === currency)
      .filter(t => !startDate || t.createdAt >= startDate)
      .filter(t => !endDate || t.createdAt <= endDate)
      .filter(t => !minAmount || t.amount >= minAmount)
      .filter(t => !maxAmount || t.amount <= maxAmount);

    // Sort transactions
    transactions.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const total = transactions.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    transactions = transactions.slice(startIndex, startIndex + limit);

    // Calculate summary
    const allTransactions = Object.values(transactionStore).filter(t => t.entityId === entityId);
    const totalInflow = allTransactions
      .filter(t => t.category === 'inflow' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalOutflow = allTransactions
      .filter(t => t.category === 'outflow' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      transactions,
      total,
      page,
      limit,
      totalPages,
      summary: {
        totalInflow,
        totalOutflow,
        netFlow: totalInflow - totalOutflow,
        currency: currency || 'USD'
      }
    };
  }

  /**
   * Get all transactions (admin) with filtering and pagination
   */
  async getAllTransactions(
    options: {
      page?: number;
      limit?: number;
      entityId?: string;
      entityType?: 'user' | 'business' | 'agent';
      type?: TransactionType;
      status?: TransactionStatus;
      category?: TransactionCategory;
      currency?: string;
      startDate?: Date;
      endDate?: Date;
      minAmount?: number;
      maxAmount?: number;
      sortBy?: 'createdAt' | 'amount' | 'type';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    transactions: ITransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      entityId,
      entityType,
      type,
      status,
      category,
      currency,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    let transactions = Object.values(transactionStore)
      .filter(t => !entityId || t.entityId === entityId)
      .filter(t => !entityType || t.entityType === entityType)
      .filter(t => !type || t.type === type)
      .filter(t => !status || t.status === status)
      .filter(t => !category || t.category === category)
      .filter(t => !currency || t.currency === currency)
      .filter(t => !startDate || t.createdAt >= startDate)
      .filter(t => !endDate || t.createdAt <= endDate)
      .filter(t => !minAmount || t.amount >= minAmount)
      .filter(t => !maxAmount || t.amount <= maxAmount);

    // Sort transactions
    transactions.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const total = transactions.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    transactions = transactions.slice(startIndex, startIndex + limit);

    return {
      transactions,
      total,
      page,
      limit,
      totalPages
    };
  }

  /**
   * Update transaction balances
   */
  async updateTransactionBalances(
    transactionId: string,
    balanceBefore: number,
    balanceAfter: number
  ): Promise<ITransaction | null> {
    const transaction = transactionStore[transactionId];
    if (!transaction) {
      return null;
    }

    transaction.balanceBefore = balanceBefore;
    transaction.balanceAfter = balanceAfter;
    transaction.updatedAt = new Date();

    transactionStore[transactionId] = transaction;
    return transaction;
  }

  /**
   * Reverse a transaction
   */
  async reverseTransaction(transactionId: string, reason: string): Promise<ITransaction | null> {
    const transaction = transactionStore[transactionId];
    if (!transaction) {
      return null;
    }

    if (transaction.status !== 'completed') {
      throw new Error('Can only reverse completed transactions');
    }

    // Create reversal transaction
    const reversalType: TransactionType = transaction.type === 'payment' ? 'refund' : 'payment';
    const reversal = await this.createTransaction({
      entityId: transaction.entityId,
      entityType: transaction.entityType,
      type: reversalType,
      amount: transaction.amount,
      currency: transaction.currency,
      description: `Reversal: ${reason}`,
      referenceId: transaction.transactionId,
      referenceType: 'manual',
      metadata: { originalTransactionId: transactionId, reversal: true }
    });

    reversal.status = 'completed';
    reversal.completedAt = new Date();
    transactionStore[reversal.transactionId] = reversal;

    // Mark original as reversed
    transaction.status = 'reversed';
    transaction.failureReason = reason;
    transaction.updatedAt = new Date();
    transactionStore[transactionId] = transaction;

    return transaction;
  }

  /**
   * Cancel a pending transaction
   */
  async cancelTransaction(transactionId: string, reason: string): Promise<ITransaction | null> {
    const transaction = transactionStore[transactionId];
    if (!transaction) {
      return null;
    }

    if (transaction.status !== 'pending') {
      throw new Error('Can only cancel pending transactions');
    }

    transaction.status = 'cancelled';
    transaction.failureReason = reason;
    transaction.updatedAt = new Date();

    transactionStore[transactionId] = transaction;
    return transaction;
  }

  /**
   * Add fee to transaction
   */
  async addTransactionFee(
    transactionId: string,
    fee: {
      type: 'platform' | 'processing' | 'service' | 'custom';
      amount: number;
      currency: string;
      percentage?: number;
      fixedAmount?: number;
      description: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<ITransactionFee> {
    const transactionFee: ITransactionFee = {
      feeId: uuidv4(),
      transactionId,
      entityId: transactionStore[transactionId]?.entityId || '',
      type: fee.type,
      amount: fee.amount,
      currency: fee.currency,
      percentage: fee.percentage,
      fixedAmount: fee.fixedAmount,
      description: fee.description,
      metadata: fee.metadata,
      createdAt: new Date()
    };

    transactionFeeStore[transactionFee.feeId] = transactionFee;
    return transactionFee;
  }

  /**
   * Get fees for a transaction
   */
  async getTransactionFees(transactionId: string): Promise<ITransactionFee[]> {
    return Object.values(transactionFeeStore).filter(f => f.transactionId === transactionId);
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStatistics(
    entityId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    totalTransactions: number;
    completedTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
    totalVolume: number;
    averageTransactionSize: number;
    byType: Record<TransactionType, { count: number; volume: number }>;
    byStatus: Record<TransactionStatus, { count: number; volume: number }>;
  }> {
    const transactions = Object.values(transactionStore)
      .filter(t => t.entityId === entityId)
      .filter(t => t.createdAt >= periodStart && t.createdAt <= periodEnd);

    const stats = {
      totalTransactions: transactions.length,
      completedTransactions: transactions.filter(t => t.status === 'completed').length,
      failedTransactions: transactions.filter(t => t.status === 'failed').length,
      pendingTransactions: transactions.filter(t => t.status === 'pending').length,
      totalVolume: transactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0),
      averageTransactionSize: 0,
      byType: {} as Record<TransactionType, { count: number; volume: number }>,
      byStatus: {} as Record<TransactionStatus, { count: number; volume: number }>
    };

    if (stats.totalTransactions > 0) {
      stats.averageTransactionSize = stats.totalVolume / stats.completedTransactions;
    }

    // By type
    const types: TransactionType[] = ['payment', 'refund', 'fee', 'reward', 'transfer', 'adjustment'];
    for (const type of types) {
      const typeTransactions = transactions.filter(t => t.type === type && t.status === 'completed');
      stats.byType[type] = {
        count: typeTransactions.length,
        volume: typeTransactions.reduce((sum, t) => sum + t.amount, 0)
      };
    }

    // By status
    const statuses: TransactionStatus[] = ['pending', 'completed', 'failed', 'cancelled', 'reversed'];
    for (const status of statuses) {
      const statusTransactions = transactions.filter(t => t.status === status);
      stats.byStatus[status] = {
        count: statusTransactions.length,
        volume: statusTransactions.reduce((sum, t) => sum + t.amount, 0)
      };
    }

    return stats;
  }

  /**
   * Delete transaction (admin - soft delete by marking as cancelled)
   */
  async deleteTransaction(transactionId: string, adminId: string, reason: string): Promise<boolean> {
    const transaction = transactionStore[transactionId];
    if (!transaction) {
      return false;
    }

    if (transaction.status === 'completed') {
      throw new Error('Cannot delete completed transactions. Use reverse instead.');
    }

    transaction.status = 'cancelled';
    transaction.failureReason = `[ADMIN: ${adminId}] ${reason}`;
    transaction.metadata = { ...transaction.metadata, deletedBy: adminId, deletedAt: new Date().toISOString() };
    transaction.updatedAt = new Date();

    transactionStore[transactionId] = transaction;
    return true;
  }

  /**
   * Bulk create transactions
   */
  async bulkCreateTransactions(
    requests: CreateTransactionRequest[]
  ): Promise<{ successful: ITransaction[]; failed: Array<{ request: CreateTransactionRequest; error: string }> }> {
    const successful: ITransaction[] = [];
    const failed: Array<{ request: CreateTransactionRequest; error: string }> = [];

    for (const request of requests) {
      try {
        const transaction = await this.createTransaction(request);
        successful.push(transaction);
      } catch (error) {
        failed.push({
          request,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(entityId: string, limit: number = 10): Promise<ITransaction[]> {
    return Object.values(transactionStore)
      .filter(t => t.entityId === entityId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Export transactions as CSV-compatible format
   */
  async exportTransactions(
    entityId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      type?: TransactionType;
      status?: TransactionStatus;
    } = {}
  ): Promise<Array<Record<string, unknown>>> {
    const transactions = await this.getTransactions(entityId, {
      page: 1,
      limit: 10000,
      ...options
    });

    return transactions.transactions.map(t => ({
      transactionId: t.transactionId,
      type: t.type,
      category: t.category,
      amount: t.amount,
      currency: t.currency,
      status: t.status,
      description: t.description,
      referenceId: t.referenceId,
      referenceType: t.referenceType,
      balanceBefore: t.balanceBefore,
      balanceAfter: t.balanceAfter,
      completedAt: t.completedAt?.toISOString(),
      createdAt: t.createdAt.toISOString()
    }));
  }
}

// Export singleton instance
export const transactionService = new TransactionService();
