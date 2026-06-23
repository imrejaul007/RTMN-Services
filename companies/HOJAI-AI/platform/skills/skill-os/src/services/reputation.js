/**
 * SkillOS — Creator reputation and trust score
 *
 * Computes a creator's reputation profile from their reviews, sales,
 * and support responsiveness. The trust score is a weighted heuristic —
 * it's documented as such, easy to swap for a learned model later.
 *
 * Trust score formula (0..100):
 *   40% rating         (4.0 → 80, 5.0 → 100)
 *   20% review volume  (log scale, capped at 1000)
 *   15% update freq    (weekly=100, monthly=50, never=0)
 *   15% responsiveness (≤1h=100, ≤24h=70, never=0)
 *   10% enterprise     (count, log scale, capped at 50)
 */

import { aggregateReviews } from './reviews.js';

export const BADGES = [
  'top-100',         // top 100 by trust score
  'verified',        // identity verified
  'enterprise-ready', // 1+ enterprise customer
  'fast-responder',  // avg response ≤ 4h
  'prolific',        // 10+ published assets
  'trending',        // recent growth
];

/**
 * Compute a creator's full reputation profile.
 *
 * @param {string} creatorId
 * @param {object} data — all data we have about the creator
 * @param {Array}  data.assets          — published assets
 * @param {Array}  data.reviews         — all reviews across the creator's assets
 * @param {Array}  data.transactions    — completed sales transactions
 * @param {Array}  data.installs        — active install records
 * @param {number} [data.avgResponseHours] — avg support response time
 * @param {number} [data.avgUpdateDays]    — avg days between asset versions
 * @param {string} [data.joinedAt]          — when creator joined
 * @returns {object} reputation profile
 */
export function buildReputation(creatorId, data = {}) {
  const assets = data.assets || [];
  const reviews = data.reviews || [];
  const transactions = (data.transactions || []).filter((t) => t.status === 'completed');
  const installs = data.installs || [];

  // Rating aggregate across all assets
  const ratingAgg = aggregateReviews(reviews);

  // Downloads / installs
  const totalDownloads = assets.reduce((s, a) => s + (a.totalDownloads || 0), 0);
  const activeInstalls = installs.filter((i) => i.status === 'installed').length;

  // MRR: sum of monthly subscriptions × current price
  const monthlyRecurringRevenue = computeMRR(assets, transactions);

  // Enterprise customers: count of transactions with amount >= enterprise threshold
  const enterpriseCustomers = countEnterpriseCustomers(transactions);

  // Update frequency (days)
  const updateFreqScore = scoreUpdateFreq(data.avgUpdateDays);

  // Responsiveness (hours)
  const respScore = scoreResponsiveness(data.avgResponseHours);

  // Volume score (log scale)
  const volumeScore = scoreVolume(ratingAgg.count);

  // Rating score
  const ratingScore = scoreRating(ratingAgg.average);

  // Enterprise score (log scale)
  const enterpriseScore = scoreEnterprise(enterpriseCustomers);

  // Weighted trust score
  const trustScore = Math.round(
    0.40 * ratingScore +
    0.20 * volumeScore +
    0.15 * updateFreqScore +
    0.15 * respScore +
    0.10 * enterpriseScore
  );

  // Determine primary category
  const categoryCount = {};
  for (const a of assets) {
    if (a.category) categoryCount[a.category] = (categoryCount[a.category] || 0) + 1;
  }
  const primaryCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Badges
  const badges = [];
  if (ratingAgg.count >= 100 && ratingAgg.average >= 4.5) badges.push('top-100');
  if (assets.length >= 1) badges.push('verified');  // simplified
  if (enterpriseCustomers >= 1) badges.push('enterprise-ready');
  if (data.avgResponseHours !== undefined && data.avgResponseHours <= 4) badges.push('fast-responder');
  if (assets.length >= 10) badges.push('prolific');

  return {
    creatorId,
    averageRating: ratingAgg.average,
    totalReviews: ratingAgg.count,
    ratingDistribution: ratingAgg.distribution,
    totalDownloads,
    activeInstalls,
    monthlyRecurringRevenue,
    enterpriseCustomers,
    averageResponseHours: data.avgResponseHours || null,
    updateFrequencyDays: data.avgUpdateDays || null,
    trustScore,
    badges,
    primaryCategory,
    assetCount: assets.length,
    joinedAt: data.joinedAt || null,
    lastUpdated: new Date().toISOString(),
    // Internal: keep sub-scores for debugging
    _subscores: {
      rating: ratingScore,
      volume: volumeScore,
      updateFreq: updateFreqScore,
      responsiveness: respScore,
      enterprise: enterpriseScore,
    },
  };
}

function scoreRating(avg) {
  if (avg <= 0) return 0;
  // 4.0 = 80, 5.0 = 100, linear between
  return Math.round(Math.max(0, Math.min(100, (avg / 5) * 100)));
}

function scoreVolume(count) {
  if (count <= 0) return 0;
  // log10 scale, capped at 1000 reviews = 100
  const score = Math.log10(Math.min(count, 1000)) / Math.log10(1000) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function scoreUpdateFreq(days) {
  if (days === undefined || days === null) return 0;
  // 7 days = 100, 30 days = 50, 90 days = 17
  const score = Math.max(0, 100 - (days - 7) * (50 / 23));
  return Math.round(Math.max(0, Math.min(100, score)));
}

function scoreResponsiveness(hours) {
  if (hours === undefined || hours === null) return 0;
  // ≤1h = 100, ≤24h = 70, >72h = 0
  if (hours <= 1) return 100;
  if (hours <= 4) return 90;
  if (hours <= 24) return 70;
  if (hours <= 72) return 30;
  return 0;
}

function scoreEnterprise(count) {
  if (count <= 0) return 0;
  // log10 scale, capped at 50 enterprise customers = 100
  const score = Math.log10(Math.min(count, 50)) / Math.log10(50) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function computeMRR(assets, transactions) {
  // Simple approximation: sum of all completed subscription transactions
  // in the last 30 days, divided by 1 month, plus one-time purchases amortized
  // over 12 months
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  let mrr = 0;
  for (const t of transactions) {
    const txDate = new Date(t.createdAt).getTime();
    if (t.kind === 'subscription' && txDate >= thirtyDaysAgo) {
      mrr += t.amount;
    } else if (t.kind === 'install' && t.pricingModel === 'one-time') {
      mrr += t.amount / 12;
    } else if (t.kind === 'execution' && txDate >= thirtyDaysAgo) {
      // usage: assume constant; add last-30-days
      mrr += t.amount;
    }
  }
  return +mrr.toFixed(2);
}

function countEnterpriseCustomers(transactions) {
  const set = new Set();
  for (const t of transactions) {
    if (t.amount >= 500 && t.tenantId) set.add(t.tenantId);
  }
  return set.size;
}

/**
 * Build a leaderboard from a list of reputation profiles.
 */
export function buildLeaderboard(profiles, opts = {}) {
  const { category = null, sortBy = 'trustScore', limit = 50 } = opts;
  let list = profiles || [];
  if (category) list = list.filter((p) => p.primaryCategory === category);
  list.sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
  return list.slice(0, limit).map((p, i) => ({ ...p, rank: i + 1 }));
}