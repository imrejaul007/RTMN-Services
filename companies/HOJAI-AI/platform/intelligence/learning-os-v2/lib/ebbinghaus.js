/**
 * Learning OS v2 — Ebbinghaus forgetting curve helpers
 *
 * Core idea: every fact the user has learned has a retention probability that
 * decays exponentially with time. When retention drops below a threshold
 * (default 0.7), the user is about to forget — we should re-surface it.
 *
 * Retention = e^(-t / S)
 *   t = time since last review (seconds)
 *   S = stability (seconds) — increases each time the user remembers
 *
 * Stability grows by a factor (default 2.5) each successful recall, simulating
 * the spacing effect from cognitive science.
 */

/**
 * Compute current retention (0-1) for a fact.
 * @param {object} fact
 * @param {number} fact.lastReviewedAt    epoch ms
 * @param {number} [fact.stability=86400] stability in seconds (default 1 day)
 * @param {string} [nowIso]               ISO date, defaults to now
 * @returns {number} retention 0-1
 */
export function retention(fact, nowIso = new Date().toISOString()) {
  const lastMs = fact.lastReviewedAt || fact.learnedAt || Date.now();
  const stabilitySec = fact.stability || 86400; // 1 day
  const tSec = Math.max(0, (new Date(nowIso).getTime() - lastMs) / 1000);
  return Math.exp(-tSec / stabilitySec);
}

/**
 * Update a fact's stability after a review.
 * - remembered=true: stability *= boost (default 2.5)
 * - remembered=false: stability = max(minStability, stability / 2)
 *
 * @returns updated fact (new object)
 */
export function review(fact, remembered = true, options = {}) {
  const { boost = 2.5, minStability = 3600 } = options;
  const stability = fact.stability || 86400;
  const newStability = remembered
    ? stability * boost
    : Math.max(minStability, stability / 2);
  return {
    ...fact,
    stability: newStability,
    lastReviewedAt: Date.now(),
    reviews: (fact.reviews || 0) + 1,
    lastRemembered: remembered,
  };
}

/**
 * Find facts whose retention is below a threshold (i.e. about to be forgotten).
 * Sorted by lowest retention first (most urgent).
 *
 * @param {Array<object>} facts
 * @param {object} [options]
 * @param {number} [options.threshold=0.7] retention threshold
 * @param {number} [options.limit=10]
 * @returns {Array<{fact, retention}>}
 */
export function dueForReview(facts, options = {}) {
  const { threshold = 0.7, limit = 10 } = options;
  const now = new Date().toISOString();
  const scored = facts
    .map((f) => ({ fact: f, retention: retention(f, now) }))
    .filter((s) => s.retention < threshold)
    .sort((a, b) => a.retention - b.retention);
  return scored.slice(0, limit);
}

/**
 * Group facts by category for a quick "study session" view.
 */
export function groupByCategory(facts, options = {}) {
  const { categoryKey = 'category' } = options;
  const out = {};
  for (const f of facts) {
    const k = f[categoryKey] || 'uncategorized';
    if (!out[k]) out[k] = [];
    out[k].push(f);
  }
  return out;
}

/**
 * Stability tier for display.
 * 1d = novice, 1w = familiar, 1mo = solid, 3mo+ = mastered.
 */
export function stabilityTier(stabilitySec) {
  const days = stabilitySec / 86400;
  if (days < 1)   return { tier: 'novice',    color: '#ef4444' };
  if (days < 7)   return { tier: 'familiar',  color: '#f59e0b' };
  if (days < 30)  return { tier: 'solid',     color: '#10b981' };
  return                  { tier: 'mastered', color: '#8b5cf6' };
}
