/**
 * SkillOS — Monetization: pricing plans, subscriptions, payouts, dashboard
 *
 * Builds on the existing `transactions` and `installs` stores.
 * All money is recorded but Phase 4 will replace stubs with real
 * Stripe / REZ Wallet calls.
 */

import { v4 as uuidv4 } from 'uuid';
import { computePayout } from './billing.js';

export const PLAN_INTERVALS = ['month', 'year', null];
export const PLAN_MODELS = ['free', 'one-time', 'subscription', 'usage'];
export const SUBSCRIPTION_STATUSES = ['active', 'paused', 'cancelled', 'past_due', 'trialing'];
export const PAYOUT_STATUSES = ['requested', 'approved', 'processing', 'completed', 'failed'];
export const PAYOUT_METHODS = ['stripe', 'rez-wallet', 'bank-transfer', 'paypal'];

/**
 * Build a pricing plan record.
 */
export function buildPlan(input) {
  const { assetId, name, pricingModel, price, currency = 'USD' } = input;
  if (!assetId) throw new Error('assetId required');
  if (!name) throw new Error('name required');
  if (!pricingModel || !PLAN_MODELS.includes(pricingModel)) {
    throw new Error(`pricingModel must be one of: ${PLAN_MODELS.join(', ')}`);
  }
  const p = Number(price || 0);
  if (Number.isNaN(p) || p < 0) throw new Error(`price must be a non-negative number`);
  return {
    id: `plan-${uuidv4().slice(0, 8)}`,
    assetId,
    name,
    pricingModel,
    price: p,
    currency,
    interval: input.interval || (pricingModel === 'subscription' ? 'month' : null),
    features: Array.isArray(input.features) ? input.features : [],
    limits: input.limits || {},
    active: input.active !== false,
    trialDays: input.trialDays || 0,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Build a subscription record.
 */
export function buildSubscription(input) {
  const { assetId, planId, tenantId, plan, monthlyPrice, currency = 'USD' } = input;
  if (!assetId) throw new Error('assetId required');
  if (!planId) throw new Error('planId required');
  if (!tenantId) throw new Error('tenantId required');
  if (!plan) throw new Error('plan required');
  const now = new Date();
  const periodEnd = new Date(now);
  if (input.interval === 'year') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);
  return {
    id: `sub-${uuidv4().slice(0, 8)}`,
    assetId, planId, tenantId, plan,
    monthlyPrice: Number(monthlyPrice || 0),
    currency,
    status: input.trialDays > 0 ? 'trialing' : 'active',
    startedAt: now.toISOString(),
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    nextChargeAt: periodEnd.toISOString(),
    cancelledAt: null,
    autoRenew: input.autoRenew !== false,
    trialDays: input.trialDays || 0,
  };
}

/**
 * Build a payout request.
 */
export function buildPayout(input) {
  const { publisherId, amount, currency = 'USD', method = 'rez-wallet', destination, transactionIds = [] } = input;
  if (!publisherId) throw new Error('publisherId required');
  if (!PAYOUT_METHODS.includes(method)) {
    throw new Error(`method must be one of: ${PAYOUT_METHODS.join(', ')}`);
  }
  const amt = Number(amount || 0);
  if (Number.isNaN(amt) || amt <= 0) throw new Error('amount must be > 0');
  return {
    id: `po-${uuidv4().slice(0, 8)}`,
    publisherId,
    amount: amt,
    currency,
    method,
    destination: destination || null,
    transactionIds,
    status: 'requested',
    requestedAt: new Date().toISOString(),
    approvedAt: null,
    completedAt: null,
    notes: input.notes || '',
  };
}

/**
 * Build a publisher dashboard.
 *
 * @param {string} publisherId
 * @param {object} data
 * @param {Array} data.assets       — published assets
 * @param {Array} data.transactions — completed sales transactions
 * @param {Array} data.installs     — install records
 * @param {Array} data.payouts      — payout records
 * @param {object} [data.period]    — { from, to } ISO strings
 */
export function buildDashboard(publisherId, data = {}) {
  const assets = data.assets || [];
  const transactions = (data.transactions || []).filter((t) => t.publisherId === publisherId && t.status === 'completed');
  const installs = (data.installs || []).filter((i) => {
    const asset = assets.find((a) => a.id === i.assetId);
    return asset && asset.publisher === publisherId;
  });
  const payouts = (data.payouts || []).filter((p) => p.publisherId === publisherId);
  const period = data.period || defaultPeriod();

  // Filter transactions to the period
  const periodTx = transactions.filter((t) => t.createdAt >= period.from && t.createdAt <= period.to);

  // Lifetime + period aggregates
  const grossRevenue = periodTx.reduce((s, t) => s + t.amount, 0);
  const platformFees = periodTx.reduce((s, t) => s + t.platformFee, 0);
  const netRevenue = +(grossRevenue - platformFees).toFixed(2);

  // Lifetime
  const lifetimeGross = transactions.reduce((s, t) => s + t.amount, 0);
  const lifetimeNet = transactions.reduce((s, t) => s + (t.publisherNet || 0), 0);

  // By-asset breakdown
  const byAsset = assets.map((a) => {
    const assetTx = periodTx.filter((t) => t.assetId === a.id);
    const assetInstalls = installs.filter((i) => i.assetId === a.id && i.status === 'installed');
    return {
      assetId: a.id,
      name: a.name,
      assetType: a.assetType,
      revenue: +assetTx.reduce((s, t) => s + t.amount, 0).toFixed(2),
      netRevenue: +assetTx.reduce((s, t) => s + (t.publisherNet || 0), 0).toFixed(2),
      installs: assetInstalls.length,
      activeInstalls: assetInstalls.length,
      totalDownloads: a.totalDownloads || 0,
    };
  }).filter((x) => x.installs > 0 || x.revenue > 0);

  // By-month trend (last 6 months)
  const byMonth = buildMonthlyTrend(transactions);

  // Top assets
  const topAssets = [...byAsset].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Pending payout
  const completedPayouts = payouts.filter((p) => p.status === 'completed');
  const paidOut = completedPayouts.reduce((s, p) => s + p.amount, 0);
  const pendingPayout = +Math.max(0, lifetimeNet - paidOut).toFixed(2);

  // Customer count (unique tenants)
  const customerSet = new Set();
  for (const t of transactions) if (t.tenantId) customerSet.add(t.tenantId);
  for (const i of installs) if (i.tenantId) customerSet.add(i.tenantId);

  return {
    publisherId,
    period,
    grossRevenue: +grossRevenue.toFixed(2),
    platformFees: +platformFees.toFixed(2),
    netRevenue,
    byAsset: byAsset.sort((a, b) => b.revenue - a.revenue),
    byMonth,
    topAssets,
    pendingPayout,
    lifetimeRevenue: +lifetimeNet.toFixed(2),
    customerCount: customerSet.size,
    activeInstalls: installs.filter((i) => i.status === 'installed').length,
    recentPayouts: payouts.slice(-5).reverse(),
  };
}

function defaultPeriod() {
  const now = new Date();
  const to = now.toISOString();
  const fromDate = new Date(now);
  fromDate.setMonth(fromDate.getMonth() - 1);
  return { from: fromDate.toISOString(), to };
}

function buildMonthlyTrend(transactions) {
  const buckets = {};
  for (const t of transactions) {
    const month = t.createdAt.slice(0, 7); // YYYY-MM
    if (!buckets[month]) buckets[month] = { month, revenue: 0, transactions: 0 };
    buckets[month].revenue += t.publisherNet || 0;
    buckets[month].transactions += 1;
  }
  return Object.values(buckets)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6)
    .map((b) => ({ month: b.month, revenue: +b.revenue.toFixed(2), transactions: b.transactions }));
}