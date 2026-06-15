import { v4 as uuidv4 } from 'uuid';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  LedgerEntry,
  LedgerEntryType,
} from '../types';
import { transactionStore } from '../models/Transaction';
import { accountService } from './accountService';
import { karmaService } from './karmaService';
import { creditService } from './creditService';
import { config } from '../config';
import { eventBus, ECONOMY_TOPICS } from '../utils/eventBus';
import { logger } from '../utils/logger';
import {
  ValidationError,
  NotFoundError,
  InsufficientFundsError,
  FrozenAccountError,
  LedgerImbalanceError,
  ConflictError,
} from '../utils/errors';

let txCounter = 0;
function generateReference(type: TransactionType): string {
  const year = new Date().getFullYear();
  txCounter++;
  return `TXN-${year}-${String(txCounter).padStart(8, '0')}`;
}

function roundToPrecision(value: number, precision: number = config.ledger.precision): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

export const transactionService = {
  /**
   * Create and execute a transaction with double-entry ledger entries.
   * Implements atomicity: either all entries succeed or none.
   */
  async create(input: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    type: TransactionType;
    currency?: string;
    description?: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
    fee?: number;
    initiatedBy: string;
    approvedBy?: string;
    trustScoreAtTime?: number;
    karmaAtTime?: number;
    creditScoreAtTime?: number;
  }): Promise<Transaction> {
    // Validation
    if (input.amount <= 0) throw new ValidationError('Amount must be positive');
    if (input.amount > config.ledger.maxTransactionAmount) {
      throw new ValidationError(`Amount exceeds maximum ${config.ledger.maxTransactionAmount}`);
    }
    if (input.amount < config.ledger.minTransactionAmount) {
      throw new ValidationError(`Amount below minimum ${config.ledger.minTransactionAmount}`);
    }
    if (input.fromAccountId === input.toAccountId) {
      throw new ValidationError('Cannot transfer to same account');
    }

    // Idempotency check
    if (input.idempotencyKey) {
      const existing = transactionStore.getByIdempotencyKey(input.idempotencyKey);
      if (existing) return existing;
    }

    // Verify accounts exist and are active
    const fromAccount = accountService.get(input.fromAccountId);
    const toAccount = accountService.get(input.toAccountId);

    if (fromAccount.status === 'frozen') throw new FrozenAccountError(fromAccount.id);
    if (toAccount.status === 'frozen') throw new FrozenAccountError(toAccount.id);

    if (fromAccount.currency !== (input.currency || fromAccount.currency)) {
      throw new ValidationError(`Currency mismatch: account ${fromAccount.currency} vs requested ${input.currency}`);
    }

    // Verify sufficient funds
    const fee = roundToPrecision(input.fee || 0);
    const netAmount = roundToPrecision(input.amount - fee);
    if (fromAccount.availableBalance < input.amount) {
      throw new InsufficientFundsError(input.amount, fromAccount.availableBalance);
    }

    const currency = input.currency || fromAccount.currency;
    const now = new Date().toISOString();
    const reference = generateReference(input.type);

    // Create transaction
    const transaction: Transaction = {
      id: `tx_${uuidv4()}`,
      reference,
      type: input.type,
      status: 'pending',
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      amount: roundToPrecision(input.amount),
      currency,
      fee,
      netAmount,
      description: input.description || `${input.type} from ${fromAccount.ownerId} to ${toAccount.ownerId}`,
      metadata: input.metadata || {},
      idempotencyKey: input.idempotencyKey,
      externalRefs: {
        trustScoreAtTime: input.trustScoreAtTime,
        karmaAtTime: input.karmaAtTime,
        creditScoreAtTime: input.creditScoreAtTime,
      },
      initiatedBy: input.initiatedBy,
      approvedBy: input.approvedBy,
      createdAt: now,
    };

    try {
      // Execute: update account balances
      accountService.updateBalance(fromAccount.id, -input.amount, 0);
      accountService.updateBalance(toAccount.id, input.amount, 0);

      // Handle fee - deduct from recipient
      if (fee > 0) {
        accountService.updateBalance(toAccount.id, -fee, 0);
      }

      // Create double-entry ledger entries
      const debitEntry: LedgerEntry = {
        id: `led_${uuidv4()}`,
        transactionId: transaction.id,
        accountId: fromAccount.id,
        type: 'debit',
        amount: roundToPrecision(input.amount),
        balance: accountService.get(fromAccount.id).balance,
        currency,
        description: transaction.description,
        metadata: { ...input.metadata, direction: 'out' },
        timestamp: now,
        postedAt: now,
      };

      const creditEntry: LedgerEntry = {
        id: `led_${uuidv4()}`,
        transactionId: transaction.id,
        accountId: toAccount.id,
        type: 'credit',
        amount: roundToPrecision(input.amount),
        balance: accountService.get(toAccount.id).balance,
        currency,
        description: transaction.description,
        metadata: { ...input.metadata, direction: 'in' },
        timestamp: now,
        postedAt: now,
      };

      let feeEntry: LedgerEntry | null = null;
      if (fee > 0) {
        feeEntry = {
          id: `led_${uuidv4()}`,
          transactionId: transaction.id,
          accountId: toAccount.id,
          type: 'debit',
          amount: fee,
          balance: accountService.get(toAccount.id).balance,
          currency,
          description: `Fee for ${reference}`,
          metadata: { feeFor: transaction.id },
          timestamp: now,
          postedAt: now,
        };
      }

      // Verify double-entry: total debits = total credits
      const totalDebits = (debitEntry.type === 'debit' ? debitEntry.amount : 0) + (feeEntry ? feeEntry.amount : 0);
      const totalCredits = creditEntry.amount;
      if (Math.abs(totalDebits - totalCredits) > 0.0001) {
        throw new LedgerImbalanceError(transaction.id);
      }

      // Persist ledger entries
      transactionStore.addLedgerEntry(debitEntry);
      transactionStore.addLedgerEntry(creditEntry);
      if (feeEntry) transactionStore.addLedgerEntry(feeEntry);

      // Update transaction status
      transaction.status = 'completed';
      transaction.completedAt = new Date().toISOString();
      transaction.debitEntryId = debitEntry.id;
      transaction.creditEntryId = creditEntry.id;
      transaction.feeEntryId = feeEntry?.id;

      transactionStore.upsertTransaction(transaction);

      // Publish event
      await eventBus.publish(ECONOMY_TOPICS.TRANSACTION_CREATED, transaction);
      await eventBus.publish(ECONOMY_TOPICS.TRANSACTION_COMPLETED, {
        transactionId: transaction.id,
        reference: transaction.reference,
        fromAccountId: transaction.fromAccountId,
        toAccountId: transaction.toAccountId,
        amount: transaction.amount,
        fee: transaction.fee,
        currency: transaction.currency,
        type: transaction.type,
        completedAt: transaction.completedAt,
      });

      // Update credit records for both parties
      if (fromAccount.ownerType === 'agent') {
        await creditService.recordPayment(fromAccount.ownerId, true);
      }
      if (toAccount.ownerType === 'agent') {
        await creditService.recordPayment(toAccount.ownerId, true);
      }

      // Award karma for completed transaction
      if (fromAccount.ownerType === 'agent') {
        await karmaService.award(fromAccount.ownerId, 'onTimePayment', undefined, {
          reason: `Transaction ${reference} completed`,
          referenceId: transaction.id,
        });
      }

      logger.info(`Transaction ${reference} completed: ${input.amount} ${currency} from ${fromAccount.id} to ${toAccount.id}`);

      return transaction;
    } catch (error: any) {
      // Mark transaction as failed
      transaction.status = 'failed';
      transaction.failedAt = new Date().toISOString();
      transaction.failureReason = error.message;
      transactionStore.upsertTransaction(transaction);

      await eventBus.publish(ECONOMY_TOPICS.TRANSACTION_FAILED, {
        transactionId: transaction.id,
        reason: error.message,
      });

      logger.error(`Transaction ${reference} failed: ${error.message}`);
      throw error;
    }
  },

  /**
   * Reverse a completed transaction.
   * Creates an offsetting transaction linked to the original.
   */
  async reverse(transactionId: string, reason: string, initiatedBy: string): Promise<Transaction> {
    const original = transactionStore.getTransaction(transactionId);
    if (!original) throw new NotFoundError(`Transaction ${transactionId}`);
    if (original.status !== 'completed') {
      throw new ValidationError(`Cannot reverse transaction in status ${original.status}`);
    }
    if (original.reversedByTransactionId) {
      throw new ConflictError(`Transaction already reversed by ${original.reversedByTransactionId}`);
    }

    // Create reversal
    const reversal = await this.create({
      fromAccountId: original.toAccountId,
      toAccountId: original.fromAccountId,
      amount: original.amount,
      type: 'refund',
      currency: original.currency,
      description: `Reversal of ${original.reference}: ${reason}`,
      metadata: { reversalOf: original.id, reversalReason: reason },
      initiatedBy,
    });

    // Mark original as reversed
    original.reversedByTransactionId = reversal.id;
    original.status = 'reversed';
    transactionStore.upsertTransaction(original);

    reversal.reversesTransactionId = original.id;
    transactionStore.upsertTransaction(reversal);

    await eventBus.publish(ECONOMY_TOPICS.TRANSACTION_REVERSED, {
      originalTransactionId: original.id,
      reversalTransactionId: reversal.id,
      reason,
    });

    logger.warn(`Transaction ${original.reference} reversed by ${reversal.reference} (${reason})`);
    return reversal;
  },

  /**
   * Get a transaction by ID.
   */
  get(transactionId: string): Transaction {
    const tx = transactionStore.getTransaction(transactionId);
    if (!tx) throw new NotFoundError(`Transaction ${transactionId}`);
    return tx;
  },

  /**
   * Get by reference.
   */
  getByReference(reference: string): Transaction {
    const tx = transactionStore.getByReference(reference);
    if (!tx) throw new NotFoundError(`Transaction ${reference}`);
    return tx;
  },

  /**
   * List transactions.
   */
  list(filter?: {
    fromAccountId?: string;
    toAccountId?: string;
    type?: TransactionType;
    status?: TransactionStatus;
    limit?: number;
  }): Transaction[] {
    return transactionStore.listTransactions(filter);
  },

  /**
   * Get ledger entries for an account.
   */
  getLedger(accountId: string, limit: number = 50): LedgerEntry[] {
    return transactionStore.getLedger(accountId, limit);
  },

  /**
   * Verify ledger integrity for a transaction.
   */
  verifyTransaction(transactionId: string): {
    transactionId: string;
    balanced: boolean;
    totalDebits: number;
    totalCredits: number;
    entries: LedgerEntry[];
  } {
    const entries = transactionStore.getLedgerForTransaction(transactionId);
    let totalDebits = 0;
    let totalCredits = 0;
    for (const e of entries) {
      if (e.type === 'debit') totalDebits += e.amount;
      else totalCredits += e.amount;
    }
    const balanced = Math.abs(totalDebits - totalCredits) < 0.0001;
    return { transactionId, balanced, totalDebits, totalCredits, entries };
  },

  /**
   * Statistics.
   */
  stats(): {
    total: number;
    byStatus: Record<TransactionStatus, number>;
    byType: Record<TransactionType, number>;
    totalVolume: { USD: number };
  } {
    const all = transactionStore.listTransactions();
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const t of all) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byType[t.type] = (byType[t.type] || 0) + 1;
    }
    return {
      total: all.length,
      byStatus: byStatus as any,
      byType: byType as any,
      totalVolume: { USD: transactionStore.totalVolume('USD') },
    };
  },
};
