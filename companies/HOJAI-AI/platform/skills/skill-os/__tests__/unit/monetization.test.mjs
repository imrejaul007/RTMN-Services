/**
 * SkillOS — Monetization unit tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPlan, buildSubscription, buildPayout, buildDashboard,
  PLAN_INTERVALS, PLAN_MODELS, SUBSCRIPTION_STATUSES, PAYOUT_STATUSES, PAYOUT_METHODS,
} from '../../src/services/monetization.js';

test('skill-os monetization — buildPlan', async (t) => {
  await t.test('builds a subscription plan', () => {
    const p = buildPlan({
      assetId: 'a-1', name: 'Pro', pricingModel: 'subscription', price: 29, currency: 'USD',
      features: ['all'], limits: { callsPerMonth: 1000 },
    });
    assert.equal(p.pricingModel, 'subscription');
    assert.equal(p.interval, 'month');
    assert.equal(p.price, 29);
    assert.equal(p.active, true);
  });

  await t.test('rejects invalid pricingModel', () => {
    assert.throws(() => buildPlan({ assetId: 'a', name: 'n', pricingModel: 'nope', price: 0 }), /pricingModel must be/);
  });

  await t.test('rejects negative price', () => {
    assert.throws(() => buildPlan({ assetId: 'a', name: 'n', pricingModel: 'free', price: -1 }), /non-negative/);
  });
});

test('skill-os monetization — buildSubscription', async (t) => {
  await t.test('builds a monthly subscription', () => {
    const s = buildSubscription({
      assetId: 'a-1', planId: 'p-1', tenantId: 't-1', plan: 'Pro', monthlyPrice: 29, currency: 'USD',
    });
    assert.equal(s.status, 'active');
    assert.equal(s.monthlyPrice, 29);
    assert.ok(s.currentPeriodEnd);
    assert.equal(s.nextChargeAt, s.currentPeriodEnd);
  });

  await t.test('trial sets status to trialing', () => {
    const s = buildSubscription({
      assetId: 'a', planId: 'p', tenantId: 't', plan: 'n', monthlyPrice: 0, trialDays: 7,
    });
    assert.equal(s.status, 'trialing');
  });
});

test('skill-os monetization — buildPayout', async (t) => {
  await t.test('builds a payout request', () => {
    const p = buildPayout({
      publisherId: 'hojai', amount: 100, method: 'rez-wallet',
    });
    assert.equal(p.status, 'requested');
    assert.equal(p.amount, 100);
  });

  await t.test('rejects invalid method', () => {
    assert.throws(() => buildPayout({ publisherId: 'p', amount: 1, method: 'western-union' }), /method must be/);
  });

  await t.test('rejects zero/negative amount', () => {
    assert.throws(() => buildPayout({ publisherId: 'p', amount: 0 }), /> 0/);
    assert.throws(() => buildPayout({ publisherId: 'p', amount: -1 }), /> 0/);
  });
});

test('skill-os monetization — buildDashboard', async (t) => {
  const assets = [
    { id: 'a-1', publisher: 'hojai', name: 'Sales Pro', assetType: 'skill', totalDownloads: 100 },
    { id: 'a-2', publisher: 'hojai', name: 'Negotiation', assetType: 'skill', totalDownloads: 50 },
  ];
  const transactions = [
    { id: 't-1', publisherId: 'hojai', assetId: 'a-1', tenantId: 't-1', amount: 29, platformFee: 4.35, publisherNet: 24.65, status: 'completed', kind: 'subscription', pricingModel: 'subscription', createdAt: '2026-06-01' },
    { id: 't-2', publisherId: 'hojai', assetId: 'a-2', tenantId: 't-2', amount: 49, platformFee: 7.35, publisherNet: 41.65, status: 'completed', kind: 'install', pricingModel: 'one-time', createdAt: '2026-06-15' },
  ];
  const installs = [
    { id: 'i-1', assetId: 'a-1', status: 'installed', tenantId: 't-1' },
    { id: 'i-2', assetId: 'a-2', status: 'installed', tenantId: 't-2' },
  ];

  await t.test('aggregates revenue across assets', () => {
    const d = buildDashboard('hojai', { assets, transactions, installs, payouts: [] });
    assert.equal(d.publisherId, 'hojai');
    assert.equal(d.grossRevenue, 78);
    assert.equal(d.platformFees, 11.7);
    assert.equal(d.netRevenue, 66.3);
    assert.equal(d.byAsset.length, 2);
    assert.equal(d.activeInstalls, 2);
    assert.equal(d.customerCount, 2);
  });

  await t.test('byAsset sorted by revenue desc', () => {
    const d = buildDashboard('hojai', { assets, transactions, installs, payouts: [] });
    // t-2 is 49 (a-2), t-1 is 29 (a-1). So a-2 should be first.
    assert.equal(d.byAsset[0].assetId, 'a-2');
    assert.equal(d.byAsset[0].revenue, 49);
    assert.equal(d.byAsset[1].assetId, 'a-1');
    assert.equal(d.byAsset[1].revenue, 29);
  });

  await t.test('handles empty data', () => {
    const d = buildDashboard('empty', { assets: [], transactions: [], installs: [], payouts: [] });
    assert.equal(d.grossRevenue, 0);
    assert.equal(d.netRevenue, 0);
    assert.equal(d.byAsset.length, 0);
  });

  await t.test('computes pending payout', () => {
    const d = buildDashboard('hojai', {
      assets, transactions, installs,
      payouts: [{ publisherId: 'hojai', amount: 10, status: 'completed' }],
    });
    // lifetimeNet = 24.65 + 41.65 = 66.3
    // paidOut = 10
    // pendingPayout = 56.3
    assert.equal(d.pendingPayout, 56.3);
  });
});
