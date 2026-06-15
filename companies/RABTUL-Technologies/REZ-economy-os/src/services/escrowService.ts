import { v4 as uuidv4 } from 'uuid';
import { Escrow } from '../types';
import { escrowStore } from '../models/Escrow';
import { accountService } from './accountService';
import { transactionService } from './transactionService';
import { eventBus, ECONOMY_TOPICS } from '../utils/eventBus';
import { logger } from '../utils/logger';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';

export const escrowService = {
  /**
   * Hold funds in escrow.
   * Creates a payment transaction from payer to escrow account,
   * and tracks the escrow conditions.
   */
  async hold(input: {
    payerAccountId: string;
    payeeAccountId: string;
    amount: number;
    currency?: string;
    conditions: string[];
    description?: string;
    initiatedBy: string;
  }): Promise<Escrow> {
    if (input.amount <= 0) throw new ValidationError('Escrow amount must be positive');
    if (!input.conditions || input.conditions.length === 0) {
      throw new ValidationError('At least one release condition is required');
    }

    // Get or create platform escrow account
    const escrowAccount = accountService.getOrCreatePrimary('platform-escrow', 'escrow', input.currency || 'USD');

    // Create payment transaction to escrow
    const tx = await transactionService.create({
      fromAccountId: input.payerAccountId,
      toAccountId: escrowAccount.id,
      amount: input.amount,
      type: 'escrow',
      currency: input.currency,
      description: input.description || `Escrow hold: ${input.conditions.join(', ')}`,
      metadata: { escrowType: 'hold' },
      initiatedBy: input.initiatedBy,
    });

    // Track held balance on escrow account
    accountService.updateBalance(escrowAccount.id, 0, input.amount);

    const now = new Date().toISOString();
    const escrow: Escrow = {
      id: `esc_${uuidv4()}`,
      transactionId: tx.id,
      payerAccountId: input.payerAccountId,
      payeeAccountId: input.payeeAccountId,
      amount: input.amount,
      currency: input.currency || 'USD',
      status: 'held',
      conditions: input.conditions,
      createdAt: now,
      updatedAt: now,
    };

    escrowStore.upsert(escrow);

    await eventBus.publish(ECONOMY_TOPICS.ESCROW_HELD, {
      escrowId: escrow.id,
      amount: escrow.amount,
      currency: escrow.currency,
      payerAccountId: escrow.payerAccountId,
      payeeAccountId: escrow.payeeAccountId,
    });

    logger.info(`Escrow held: ${escrow.id} amount=${escrow.amount} ${escrow.currency}`);
    return escrow;
  },

  /**
   * Release escrowed funds to the payee.
   */
  async release(escrowId: string, initiatedBy: string, notes?: string): Promise<Escrow> {
    const escrow = escrowStore.get(escrowId);
    if (!escrow) throw new NotFoundError(`Escrow ${escrowId}`);
    if (escrow.status !== 'held') {
      throw new ValidationError(`Cannot release escrow in status ${escrow.status}`);
    }

    const escrowAccount = accountService.getOrCreatePrimary('platform-escrow', 'escrow', escrow.currency);

    // Release held balance
    accountService.updateBalance(escrowAccount.id, 0, -escrow.amount);

    // Transfer from escrow to payee
    await transactionService.create({
      fromAccountId: escrowAccount.id,
      toAccountId: escrow.payeeAccountId,
      amount: escrow.amount,
      type: 'release',
      currency: escrow.currency,
      description: `Escrow release: ${escrow.id}${notes ? ` (${notes})` : ''}`,
      metadata: { escrowId: escrow.id, releaseNotes: notes },
      initiatedBy,
    });

    escrow.status = 'released';
    escrow.releasedAt = new Date().toISOString();
    escrow.updatedAt = new Date().toISOString();
    escrowStore.upsert(escrow);

    await eventBus.publish(ECONOMY_TOPICS.ESCROW_RELEASED, {
      escrowId: escrow.id,
      amount: escrow.amount,
      currency: escrow.currency,
      payeeAccountId: escrow.payeeAccountId,
    });

    logger.info(`Escrow released: ${escrow.id} amount=${escrow.amount}`);
    return escrow;
  },

  /**
   * Refund escrowed funds to the payer.
   */
  async refund(escrowId: string, initiatedBy: string, reason: string): Promise<Escrow> {
    const escrow = escrowStore.get(escrowId);
    if (!escrow) throw new NotFoundError(`Escrow ${escrowId}`);
    if (escrow.status !== 'held' && escrow.status !== 'disputed') {
      throw new ValidationError(`Cannot refund escrow in status ${escrow.status}`);
    }

    const escrowAccount = accountService.getOrCreatePrimary('platform-escrow', 'escrow', escrow.currency);

    // Release held balance
    accountService.updateBalance(escrowAccount.id, 0, -escrow.amount);

    // Refund from escrow to payer
    await transactionService.create({
      fromAccountId: escrowAccount.id,
      toAccountId: escrow.payerAccountId,
      amount: escrow.amount,
      type: 'refund',
      currency: escrow.currency,
      description: `Escrow refund: ${reason}`,
      metadata: { escrowId: escrow.id, refundReason: reason },
      initiatedBy,
    });

    escrow.status = 'refunded';
    escrow.refundedAt = new Date().toISOString();
    escrow.updatedAt = new Date().toISOString();
    escrowStore.upsert(escrow);

    await eventBus.publish(ECONOMY_TOPICS.ESCROW_RELEASED, {
      escrowId: escrow.id,
      type: 'refund',
      amount: escrow.amount,
      currency: escrow.currency,
      payerAccountId: escrow.payerAccountId,
    });

    logger.info(`Escrow refunded: ${escrow.id} amount=${escrow.amount} (${reason})`);
    return escrow;
  },

  /**
   * Mark an escrow as disputed.
   */
  async dispute(escrowId: string, disputeId: string): Promise<Escrow> {
    const escrow = escrowStore.get(escrowId);
    if (!escrow) throw new NotFoundError(`Escrow ${escrowId}`);
    if (escrow.status !== 'held') {
      throw new ConflictError(`Cannot dispute escrow in status ${escrow.status}`);
    }

    escrow.status = 'disputed';
    escrow.disputeId = disputeId;
    escrow.updatedAt = new Date().toISOString();
    escrowStore.upsert(escrow);

    await eventBus.publish(ECONOMY_TOPICS.ESCROW_DISPUTED, {
      escrowId: escrow.id,
      disputeId,
    });

    logger.warn(`Escrow disputed: ${escrow.id} (dispute: ${disputeId})`);
    return escrow;
  },

  /**
   * Get an escrow by ID.
   */
  get(escrowId: string): Escrow {
    const e = escrowStore.get(escrowId);
    if (!e) throw new NotFoundError(`Escrow ${escrowId}`);
    return e;
  },

  /**
   * List escrows.
   */
  list(filter?: { status?: string; payerAccountId?: string; payeeAccountId?: string }): Escrow[] {
    return escrowStore.list(filter);
  },

  /**
   * Statistics.
   */
  stats(): { total: number; byStatus: Record<string, number>; totalHeld: { USD: number } } {
    const all = escrowStore.list();
    const byStatus: Record<string, number> = {};
    for (const e of all) byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    return {
      total: all.length,
      byStatus,
      totalHeld: { USD: escrowStore.totalHeld('USD') },
    };
  },
};
