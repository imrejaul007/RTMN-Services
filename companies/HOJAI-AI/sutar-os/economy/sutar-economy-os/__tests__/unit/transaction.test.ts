/**
 * sutar-economy-os — Transaction service unit tests
 */

import { describe, it, expect } from 'vitest';
import { transactionService } from '../../src/services/transaction.service.js';

describe('transaction — create / get', () => {
  it('creates a payment transaction with default category=inflow', async () => {
    const eid = `tx-${Date.now()}-${Math.random()}`;
    const tx = await transactionService.createTransaction({
      entityId: eid,
      entityType: 'user',
      type: 'payment',
      amount: 500,
      currency: 'USD',
      description: 'test payment',
    });
    expect(tx.transactionId).toBeDefined();
    expect(tx.type).toBe('payment');
    expect(tx.category).toBe('inflow');
    expect(tx.amount).toBe(500);
    expect(tx.status).toBe('pending');
  });

  it('classifies refund and fee as outflow', async () => {
    const refund = await transactionService.createTransaction({
      entityId: `tx-${Date.now()}`,
      entityType: 'user',
      type: 'refund',
      amount: 100,
      currency: 'USD',
    });
    const fee = await transactionService.createTransaction({
      entityId: `tx-${Date.now()}`,
      entityType: 'user',
      type: 'fee',
      amount: 5,
      currency: 'USD',
    });
    expect(refund.category).toBe('outflow');
    expect(fee.category).toBe('outflow');
  });

  it('retrieves a transaction by id and returns null for missing id', async () => {
    const tx = await transactionService.createTransaction({
      entityId: `tx-${Date.now()}`,
      entityType: 'user',
      type: 'payment',
      amount: 50,
      currency: 'USD',
    });
    const got = await transactionService.getTransaction(tx.transactionId);
    expect(got?.transactionId).toBe(tx.transactionId);
    const missing = await transactionService.getTransaction('does-not-exist');
    expect(missing).toBeNull();
  });

  it('updates transaction status to completed and sets completedAt', async () => {
    const tx = await transactionService.createTransaction({
      entityId: `tx-${Date.now()}`,
      entityType: 'user',
      type: 'payment',
      amount: 75,
      currency: 'USD',
    });
    const updated = await transactionService.updateTransactionStatus(tx.transactionId, 'completed');
    expect(updated?.status).toBe('completed');
    expect(updated?.completedAt).toBeInstanceOf(Date);
  });

  it('cancels a pending transaction', async () => {
    const tx = await transactionService.createTransaction({
      entityId: `tx-${Date.now()}`,
      entityType: 'user',
      type: 'payment',
      amount: 30,
      currency: 'USD',
    });
    const cancelled = await transactionService.cancelTransaction(tx.transactionId, 'user change');
    expect(cancelled?.status).toBe('cancelled');
    expect(cancelled?.failureReason).toBe('user change');
  });

  it('refuses to cancel a non-pending transaction', async () => {
    const tx = await transactionService.createTransaction({
      entityId: `tx-${Date.now()}`,
      entityType: 'user',
      type: 'payment',
      amount: 30,
      currency: 'USD',
    });
    await transactionService.updateTransactionStatus(tx.transactionId, 'completed');
    await expect(transactionService.cancelTransaction(tx.transactionId, 'too late')).rejects.toThrow(/pending/i);
  });
});

describe('transaction — pagination + summary', () => {
  it('paginates transactions for an entity', async () => {
    const eid = `tx-page-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      await transactionService.createTransaction({
        entityId: eid,
        entityType: 'user',
        type: 'payment',
        amount: 10,
        currency: 'USD',
      });
    }
    const page1 = await transactionService.getTransactions(eid, { page: 1, limit: 3 });
    expect(page1.transactions.length).toBe(3);
    expect(page1.total).toBe(5);
    expect(page1.totalPages).toBe(2);
    const page2 = await transactionService.getTransactions(eid, { page: 2, limit: 3 });
    expect(page2.transactions.length).toBe(2);
  });

  it('computes inflow / outflow summary from completed transactions', async () => {
    const eid = `tx-sum-${Date.now()}-${Math.random()}`;
    const inflow = await transactionService.createTransaction({
      entityId: eid,
      entityType: 'user',
      type: 'payment',
      amount: 200,
      currency: 'USD',
    });
    const outflow = await transactionService.createTransaction({
      entityId: eid,
      entityType: 'user',
      type: 'refund',
      amount: 50,
      currency: 'USD',
    });
    await transactionService.updateTransactionStatus(inflow.transactionId, 'completed');
    await transactionService.updateTransactionStatus(outflow.transactionId, 'completed');
    const page = await transactionService.getTransactions(eid, { limit: 100 });
    expect(page.summary.totalInflow).toBe(200);
    expect(page.summary.totalOutflow).toBe(50);
    expect(page.summary.netFlow).toBe(150);
  });

  it('returns empty summary for unknown entity', async () => {
    const eid = `tx-empty-${Date.now()}-${Math.random()}`;
    const page = await transactionService.getTransactions(eid, { limit: 100 });
    expect(page.transactions.length).toBe(0);
    expect(page.total).toBe(0);
    expect(page.summary.totalInflow).toBe(0);
    expect(page.summary.netFlow).toBe(0);
  });
});

describe('transaction — reversal', () => {
  it('reverses a completed payment by creating a refund and marking original reversed', async () => {
    const tx = await transactionService.createTransaction({
      entityId: `tx-rev-${Date.now()}`,
      entityType: 'user',
      type: 'payment',
      amount: 100,
      currency: 'USD',
    });
    await transactionService.updateTransactionStatus(tx.transactionId, 'completed');
    const reversed = await transactionService.reverseTransaction(tx.transactionId, 'merchant refund');
    expect(reversed?.status).toBe('reversed');
    const byRef = await transactionService.getTransactionByReference(tx.transactionId, 'manual');
    expect(byRef.length).toBe(1);
    expect(byRef[0].type).toBe('refund');
  });

  it('refuses to reverse a non-completed transaction', async () => {
    const tx = await transactionService.createTransaction({
      entityId: `tx-rev-${Date.now()}`,
      entityType: 'user',
      type: 'payment',
      amount: 100,
      currency: 'USD',
    });
    await expect(transactionService.reverseTransaction(tx.transactionId, 'oops')).rejects.toThrow(/completed/i);
  });
});

describe('transaction — fees + bulk + stats', () => {
  it('attaches a fee to a transaction and reads it back', async () => {
    const tx = await transactionService.createTransaction({
      entityId: `tx-fee-${Date.now()}`,
      entityType: 'user',
      type: 'payment',
      amount: 100,
      currency: 'USD',
    });
    const fee = await transactionService.addTransactionFee(tx.transactionId, {
      type: 'processing',
      amount: 2.5,
      currency: 'USD',
      description: 'processing fee',
    });
    expect(fee.feeId).toBeDefined();
    const fees = await transactionService.getTransactionFees(tx.transactionId);
    expect(fees.length).toBe(1);
    expect(fees[0].amount).toBe(2.5);
  });

  it('bulk-create returns successful + failed lists', async () => {
    const eid = `tx-bulk-${Date.now()}`;
    const result = await transactionService.bulkCreateTransactions([
      { entityId: eid, entityType: 'user', type: 'payment', amount: 10, currency: 'USD' },
      { entityId: eid, entityType: 'user', type: 'reward', amount: 5, currency: 'USD' },
    ]);
    expect(result.successful.length).toBe(2);
    expect(result.failed.length).toBe(0);
  });

  it('computes transaction statistics for a period', async () => {
    const eid = `tx-stats-${Date.now()}-${Math.random()}`;
    const tx = await transactionService.createTransaction({
      entityId: eid,
      entityType: 'user',
      type: 'payment',
      amount: 100,
      currency: 'USD',
    });
    await transactionService.updateTransactionStatus(tx.transactionId, 'completed');
    const start = new Date(Date.now() - 1000);
    const end = new Date(Date.now() + 1000);
    const stats = await transactionService.getTransactionStatistics(eid, start, end);
    expect(stats.totalTransactions).toBe(1);
    expect(stats.completedTransactions).toBe(1);
    expect(stats.totalVolume).toBe(100);
    expect(stats.byType.payment.count).toBe(1);
  });

  it('returns most recent N transactions', async () => {
    const eid = `tx-recent-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 4; i++) {
      await transactionService.createTransaction({
        entityId: eid,
        entityType: 'user',
        type: 'payment',
        amount: i + 1,
        currency: 'USD',
      });
    }
    const recent = await transactionService.getRecentTransactions(eid, 2);
    expect(recent.length).toBe(2);
  });
});