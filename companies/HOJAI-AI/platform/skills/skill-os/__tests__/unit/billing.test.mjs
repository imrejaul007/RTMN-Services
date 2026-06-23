/**
 * SkillOS — Billing unit tests
 *
 * Tests the transaction model and payout calculation.
 * NO real money — these are data-shape tests.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTransaction,
  computePayout,
  TX_KINDS,
  TX_STATUSES,
  PLATFORM_FEE_PCT,
} from '../../src/services/billing.js';

test('skill-os billing — transaction kinds and statuses', async (t) => {
  await t.test('TX_KINDS includes install, execution, subscription, refund, payout', () => {
    assert.equal(TX_KINDS.length, 5);
    for (const k of ['install', 'execution', 'subscription', 'refund', 'payout']) {
      assert.ok(TX_KINDS.includes(k));
    }
  });

  await t.test('TX_STATUSES includes pending, completed, failed, refunded', () => {
    assert.equal(TX_STATUSES.length, 4);
  });

  await t.test('platform fee is 15%', () => {
    assert.equal(PLATFORM_FEE_PCT, 0.15);
  });
});

test('skill-os billing — buildTransaction', async (t) => {
  await t.test('builds a valid install transaction', () => {
    const tx = buildTransaction({
      kind: 'install', assetId: 'ast-1', tenantId: 't-1', publisherId: 'hojai',
      amount: 49, currency: 'USD', status: 'completed',
    });
    assert.equal(tx.kind, 'install');
    assert.equal(tx.assetId, 'ast-1');
    assert.equal(tx.amount, 49);
    assert.equal(tx.platformFee, 7.35);   // 49 * 0.15
    assert.equal(tx.publisherNet, 41.65); // 49 - 7.35
    assert.equal(tx.status, 'completed');
    assert.equal(tx.currency, 'USD');
    assert.ok(tx.id.startsWith('tx-'));
    assert.ok(tx.createdAt);
    assert.ok(tx.completedAt); // auto-set for completed
  });

  await t.test('builds pending transaction with no completedAt', () => {
    const tx = buildTransaction({
      kind: 'execution', assetId: 'ast-1', tenantId: 't-1', publisherId: 'hojai',
      amount: 0.10, status: 'pending',
    });
    assert.equal(tx.status, 'pending');
    assert.equal(tx.completedAt, null);
  });

  await t.test('rejects invalid kind', () => {
    assert.throws(() => buildTransaction({ kind: 'bribe', assetId: 'x', amount: 1 }), /invalid transaction kind/);
  });

  await t.test('rejects invalid status', () => {
    assert.throws(() => buildTransaction({ kind: 'install', assetId: 'x', amount: 1, status: 'weird' }), /invalid status/);
  });

  await t.test('rejects negative amount', () => {
    assert.throws(() => buildTransaction({ kind: 'install', assetId: 'x', amount: -1 }), /non-negative/);
  });

  await t.test('zero amount is allowed (free install)', () => {
    const tx = buildTransaction({ kind: 'install', assetId: 'ast-free', amount: 0 });
    assert.equal(tx.amount, 0);
    assert.equal(tx.platformFee, 0);
    assert.equal(tx.publisherNet, 0);
  });

  await t.test('default currency is USD', () => {
    const tx = buildTransaction({ kind: 'install', assetId: 'x', amount: 10 });
    assert.equal(tx.currency, 'USD');
  });

  await t.test('preserves custom id if provided', () => {
    const tx = buildTransaction({ id: 'tx-custom', kind: 'install', assetId: 'x', amount: 1 });
    assert.equal(tx.id, 'tx-custom');
  });
});

test('skill-os billing — computePayout', async (t) => {
  const txns = [
    { id: '1', publisherId: 'pub-a', amount: 100, platformFee: 15, kind: 'install',    status: 'completed' },
    { id: '2', publisherId: 'pub-a', amount: 50,  platformFee: 7.5, kind: 'execution',  status: 'completed' },
    { id: '3', publisherId: 'pub-a', amount: 200, platformFee: 30,  kind: 'subscription', status: 'completed' },
    { id: '4', publisherId: 'pub-b', amount: 999, platformFee: 0,   kind: 'install',    status: 'completed' },
    { id: '5', publisherId: 'pub-a', amount: 30,  platformFee: 4.5, kind: 'install',    status: 'pending'   }, // ignored
    { id: '6', publisherId: 'pub-a', amount: 999, platformFee: 0,   kind: 'payout',     status: 'completed' }, // ignored
  ];

  await t.test('aggregates completed transactions per publisher', () => {
    const payout = computePayout('pub-a', txns);
    assert.equal(payout.transactionCount, 3);
    assert.equal(payout.grossRevenue, 350);     // 100 + 50 + 200
    assert.equal(payout.platformFees, 52.5);    // 15 + 7.5 + 30
    assert.equal(payout.payoutAmount, 297.5);   // 350 - 52.5
  });

  await t.test('returns zero for unknown publisher', () => {
    const payout = computePayout('pub-nobody', txns);
    assert.equal(payout.transactionCount, 0);
    assert.equal(payout.payoutAmount, 0);
  });

  await t.test('ignores pending and payout transactions', () => {
    const payout = computePayout('pub-a', txns);
    assert.equal(payout.transactionCount, 3); // not 5
  });
});
