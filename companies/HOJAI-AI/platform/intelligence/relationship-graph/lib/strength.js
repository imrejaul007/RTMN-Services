/**
 * Relationship Graph — pure helpers for strength, decay, and importance.
 *
 * Strength model:
 *   strength = baseStrength + recencyBoost - timeDecay + interactionBoost
 *
 * Recency: more recent interactions → higher strength. Decay follows an
 * exponential curve with a half-life (configurable per relationship).
 *
 * Importance: a separate dimension, manually set or inferred. Used for
 * "who matters most" sorting.
 *
 * Context: a list of topic tags. Used to find "people I talk to about X".
 */

/**
 * Compute current relationship strength (0-100).
 *
 * @param {object} rel
 * @param {number} rel.baseStrength        0-100, manually set or learned
 * @param {number} rel.interactions        total interaction count
 * @param {string} rel.lastContactAt       ISO date string
 * @param {string} [rel.halfLifeDays=30]   strength half-life in days
 * @param {string} [now]                   ISO date string, defaults to now
 * @returns {number} strength 0-100 (clamped)
 */
export function computeStrength(rel, now = new Date().toISOString()) {
  const base = clamp(rel.baseStrength || 50, 0, 100);
  const interactions = rel.interactions || 0;
  const lastContact = rel.lastContactAt ? new Date(rel.lastContactAt) : null;
  const halfLifeDays = rel.halfLifeDays || 30;

  // Recency: 100 if today, decays exponentially
  let recencyScore = 50;
  if (lastContact) {
    const daysSince = (new Date(now).getTime() - lastContact.getTime()) / 86400000;
    recencyScore = 100 * Math.pow(0.5, Math.max(0, daysSince) / halfLifeDays);
  }

  // Interaction volume: log scale, 100 interactions = ~50 boost
  const interactionBoost = Math.min(30, Math.log2(1 + interactions) * 5);

  // Combine: 50% base + 30% recency + 20% interactions
  const combined = base * 0.5 + recencyScore * 0.3 + interactionBoost * 0.2;
  return Math.round(clamp(combined, 0, 100));
}

/**
 * Bucket strength into a level name.
 * @param {number} strength 0-100
 * @returns {{level: string, color: string}}
 */
export function strengthLevel(strength) {
  if (strength >= 80) return { level: 'inner_circle', color: '#10b981' };
  if (strength >= 60) return { level: 'close',        color: '#3b82f6' };
  if (strength >= 40) return { level: 'active',       color: '#8b5cf6' };
  if (strength >= 20) return { level: 'fading',       color: '#f59e0b' };
  return                     { level: 'dormant',     color: '#6b7280' };
}

/**
 * Return "days since last contact" rounded to int.
 */
export function daysSinceLastContact(rel, now = new Date().toISOString()) {
  if (!rel.lastContactAt) return Infinity;
  const ms = new Date(now).getTime() - new Date(rel.lastContactAt).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

/**
 * Find people the user hasn't contacted in a while ("reach out" candidates).
 * Filters by minimum strength (so we don't suggest dormant people) and
 * returns sorted by strength * importance.
 */
export function staleRelationships(rels, options = {}) {
  const { minStrength = 30, minDaysSince = 7, limit = 10 } = options;
  const now = new Date().toISOString();
  return rels
    .filter((r) => {
      const s = computeStrength(r, now);
      const d = daysSinceLastContact(r, now);
      return s >= minStrength && d >= minDaysSince;
    })
    .map((r) => ({
      ...r,
      strength: computeStrength(r, now),
      daysSince: daysSinceLastContact(r, now),
    }))
    .sort((a, b) => b.strength - a.strength)
    .slice(0, limit);
}

/**
 * Find people associated with a context tag (e.g. "work", "family", "tennis").
 */
export function peopleByContext(rels, tag) {
  if (!tag) return [];
  const needle = String(tag).toLowerCase();
  return rels.filter((r) =>
    Array.isArray(r.contexts) && r.contexts.some((c) => String(c).toLowerCase().includes(needle))
  );
}

/**
 * Compute relationship summary stats for PI Score component.
 * Returns counts that the PI Score can use directly.
 */
export function summary(rels, now = new Date().toISOString()) {
  const recent = rels.filter((r) => daysSinceLastContact(r, now) <= 14).length;
  const avgAccuracy = rels.length
    ? rels.reduce((a, r) => a + (r.accuracyScore ?? 0.5), 0) / rels.length
    : 0.5;
  const byLevel = {};
  for (const r of rels) {
    const lvl = strengthLevel(computeStrength(r, now)).level;
    byLevel[lvl] = (byLevel[lvl] || 0) + 1;
  }
  return {
    people_count: rels.length,
    recently_contacted: recent,
    accuracy_score: Math.round(avgAccuracy * 100) / 100,
    by_level: byLevel,
  };
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
