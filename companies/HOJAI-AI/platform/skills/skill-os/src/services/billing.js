/**
 * SkillOS — Billing scaffold
 *
 * Records transactions in a real registry. NO real money yet.
 * Phase 2 will wire:
 *   - Stripe checkout for one-time purchases
 *   - REZ Wallet (port 4004) for in-app credit spending
 *   - Developer payout calculation
 *
 * For now, this module:
 *   - Records install / execution / subscription transactions
 *   - Computes revenue share (85% to publisher, 15% to platform)
 *   - Calculates publisher payouts
 *
 * The transaction model is the data shape that Phase 2 payment integrations
 * will use, so when real money arrives, no schema migration is needed.
 */

import { v4 as uuidv4 } from 'uuid';

export const TX_KINDS = ['install', 'execution', 'subscription', 'refund', 'payout'];
export const TX_STATUSES = ['pending', 'completed', 'failed', 'refunded'];

export const PLATFORM_FEE_PCT = 0.15; // 15% to platform, 85% to publisher

/**
 * Build a transaction record.
 *
 * @param {object} input
 * @param {string} input.kind - one of TX_KINDS
 * @param {string} input.assetId
 * @param {string} input.tenantId - who is paying
 * @param {string} input.publisherId - who is being paid
 * @param {number} input.amount - total amount in input.currency
 * @param {string} [input.currency='USD']
 * @param {string} [input.status='pending']
 * @param {string} [input.refId] - external reference (Stripe, REZ Wallet, etc.)
 * @returns {object} transaction record
 */
export function buildTransaction(input) {
  const kind = input.kind;
  if (!TX_KINDS.includes(kind)) {
    throw new Error(`invalid transaction kind: ${kind}. Must be one of: ${TX_KINDS.join(', ')}`);
  }
  const status = input.status || 'pending';
  if (!TX_STATUSES.includes(status)) {
    throw new Error(`invalid status: ${status}. Must be one of: ${TX_STATUSES.join(', ')}`);
  }
  const amount = Number(input.amount || 0);
  if (Number.isNaN(amount) || amount < 0) {
    throw new Error(`amount must be a non-negative number, got: ${input.amount}`);
  }
  const platformFee = +(amount * PLATFORM_FEE_PCT).toFixed(2);
  const publisherNet = +(amount - platformFee).toFixed(2);
  return {
    id: input.id || `tx-${uuidv4().slice(0, 12)}`,
    kind,
    assetId: input.assetId,
    tenantId: input.tenantId || null,
    publisherId: input.publisherId || null,
    amount,
    currency: input.currency || 'USD',
    platformFee,
    publisherNet,
    status,
    refId: input.refId || null,
    createdAt: input.createdAt || new Date().toISOString(),
    completedAt: status === 'completed' ? new Date().toISOString() : null,
  };
}

/**
 * Compute pending payout for a publisher from a list of completed transactions.
 */
export function computePayout(publisherId, transactions) {
  let gross = 0;
  let fees = 0;
  let count = 0;
  for (const tx of transactions) {
    if (tx.publisherId !== publisherId) continue;
    if (tx.status !== 'completed') continue;
    if (tx.kind === 'payout' || tx.kind === 'refund') continue;
    gross += tx.amount;
    fees += tx.platformFee;
    count += 1;
  }
  return {
    publisherId,
    transactionCount: count,
    grossRevenue: +gross.toFixed(2),
    platformFees: +fees.toFixed(2),
    payoutAmount: +(gross - fees).toFixed(2),
    currency: 'USD',
    generatedAt: new Date().toISOString(),
  };
}
