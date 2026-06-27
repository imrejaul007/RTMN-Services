/**
 * RTMN Decision Intelligence v1.0
 *
 * AI-powered decision support and recommendation engine.
 * Implements the Decision Intelligence + Recommendation Intelligence modules
 * of HOJAI AI's Division 3 (Intelligence Cloud).
 *
 * Features:
 *  - Recommendation engine (collaborative + content + popularity + hybrid)
 *  - Next Best Action (NBA) engine for sales / customer success
 *  - Multi-criteria decision framework (WSM + TOPSIS)
 *  - In-memory event log / user-item affinity matrix
 *  - Reusable NBA action templates
 *  - Full audit log of all decisions / recommendations
 *
 * @author HOJAI AI - Division 3 (Intelligence Cloud)
 * @version 1.0.0
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

// Auth bypass for internal/test use
const DECISION_INTELLIGENCE_REQUIRE_AUTH =
  (process.env.DECISION_INTELLIGENCE_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';
const authOrBypass = (req, res, next) =>
  DECISION_INTELLIGENCE_REQUIRE_AUTH ? requireAuth(req, res, next) : next();

const PORT = process.env.PORT || 4756;
const SERVICE_NAME = 'decision-intelligence';
const DEFAULT_K = 10;
const MAX_AUDIT = 10000;

// ============ EVENT WEIGHTS ============
//
// Higher-weight events contribute more to affinity. Tunable.

const EVENT_WEIGHTS = {
  view: 1,
  click: 2,
  like: 3,
  purchase: 5
};

// ============ IN-MEMORY STORAGE ============
//
// All state is in-memory Maps. Replace with PostgreSQL / MongoDB in
// production; the data shapes below are the schema that will be persisted.

/** @type {Map<string, {id:string,name:string,tags:string[],attributes:object,popularity:number}>} */
const items = new PersistentMap('items', { serviceName: 'decision-intelligence' });

/** @type {Map<string, {id:string,name:string,preferences:string[],tier:string,attributes:object}>} */
const users = new PersistentMap('users', { serviceName: 'decision-intelligence' });

/** @type {Array<{id:string,userId:string,itemId:string,eventType:string,weight:number,timestamp:string,metadata:object}>} */
const events = [];

//
// Derived affinity: Map<userId, Map<itemId, affinityScore>>
// Recomputed lazily on demand and on every event write.
//
/** @type {Map<string, Map<string, number>>} */
const userItemAffinity = new PersistentMap('user-item-affinity', { serviceName: 'decision-intelligence' });

/** @type {Map<string, {id:string,name:string,description:string,expectedValue:number,cost:number,tags:string[],goal:string,template:object,createdAt:string}>} */
const nbaTemplates = new PersistentMap('nba-templates', { serviceName: 'decision-intelligence' });

/** @type {Array<object>} append-only audit log */
const auditLog = [];

// ============ HELPERS ============

/**
 * Identify the calling principal for audit logging.
 * @param {import('express').Request} req
 * @returns {string}
 */
function principalOf(req) {
  return (
    req.headers['x-actor'] ||
    req.headers['x-principal'] ||
    req.headers['x-user-id'] ||
    (req.headers.authorization ? 'auth:' + req.headers.authorization.slice(0, 12) : 'anonymous')
  );
}

/**
 * Record an entry in the audit log (bounded).
 * @param {object} entry
 */
function audit(entry) {
  const record = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...entry
  };
  auditLog.push(record);
  if (auditLog.length > MAX_AUDIT) auditLog.shift();
  return record;
}

/**
 * Clamp a number to [min, max].
 * @param {number} v
 * @param {number} min
 * @param {number} max
 */
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Safe number coercion.
 * @param {*} v
 * @param {number} def
 */
function num(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

/**
 * Cosine similarity between two equally-sized sparse vectors.
 * Vectors are {key: weight} maps.
 * @param {Object<string, number>} a
 * @param {Object<string, number>} b
 * @returns {number}
 */
function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const x = a[k] || 0;
    const y = b[k] || 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Jaccard similarity over two sets.
 * @param {Array<string>} a
 * @param {Array<string>} b
 * @returns {number}
 */
function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  const inter = [...A].filter(x => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

// ============ AFFINITY MATRIX ============

/**
 * Recompute the user x item affinity matrix from the event log.
 * Affinity(user, item) = sum of (event weight) for all (user,item) events.
 */
function recomputeAffinity() {
  userItemAffinity.clear();
  for (const e of events) {
    if (!userItemAffinity.has(e.userId)) userItemAffinity.set(e.userId, new PersistentMap('collection-5', { serviceName: 'decision-intelligence' }));
    const row = userItemAffinity.get(e.userId);
    row.set(e.itemId, (row.get(e.itemId) || 0) + e.weight);
  }
}

/**
 * Get the affinity row for a user, recomputing on demand.
 * @param {string} userId
 */
function getUserRow(userId) {
  if (!userItemAffinity.has(userId)) {
    recomputeAffinity();
  }
  return userItemAffinity.get(userId) || new PersistentMap('collection-6', { serviceName: 'decision-intelligence' });
}

// ============ RECOMMENDATION ALGORITHMS ============

/**
 * Collaborative filtering — item-item similarity via cosine similarity
 * of user-event vectors. For the target user, score each candidate item
 * by the sum of (similarity(item, history-item) * affinity(history-item)).
 *
 * @param {string} userId
 * @param {Array<string>} candidateIds
 * @param {number} k
 * @returns {Array<{itemId:string, score:number}>}
 */
function recommendCollaborative(userId, candidateIds, k) {
  const row = getUserRow(userId);
  if (row.size === 0) return [];

  // Build per-item user vector: item -> {userId: weight}
  const itemVectors = new PersistentMap('item-vectors', { serviceName: 'decision-intelligence' });
  for (const e of events) {
    if (!itemVectors.has(e.itemId)) itemVectors.set(e.itemId, {});
    itemVectors.get(e.itemId)[e.userId] =
      (itemVectors.get(e.itemId)[e.userId] || 0) + e.weight;
  }

  // Pre-compute the user's history vector
  const userHistoryItems = [...row.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([itemId]) => itemId);

  const scored = [];
  for (const cand of candidateIds) {
    if (row.has(cand)) continue; // already interacted
    let s = 0;
    for (const histItem of userHistoryItems) {
      if (histItem === cand) continue;
      const sim = cosineSimilarity(itemVectors.get(cand) || {}, itemVectors.get(histItem) || {});
      s += sim * (row.get(histItem) || 0);
    }
    scored.push({ itemId: cand, score: s });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

/**
 * Content-based — overlap between item tags/attributes and user preferences.
 *
 * @param {string} userId
 * @param {Array<string>} candidateIds
 * @param {number} k
 * @returns {Array<{itemId:string, score:number}>}
 */
function recommendContent(userId, candidateIds, k) {
  const user = users.get(userId);
  if (!user) return [];

  const userTags = new Set(user.preferences || []);
  const scored = candidateIds.map(id => {
    if (getUserRow(userId).has(id)) return { itemId: id, score: 0 }; // skip seen
    const it = items.get(id);
    if (!it) return { itemId: id, score: 0 };
    const itemTags = (it.tags || []).filter(t => userTags.has(t));
    const tagScore = jaccard([...userTags], it.tags || []);
    // small bonus for matching attributes
    let attrBonus = 0;
    const ua = user.attributes || {};
    const ia = it.attributes || {};
    for (const key of Object.keys(ua)) {
      if (ua[key] && ia[key] && ua[key] === ia[key]) attrBonus += 0.1;
    }
    return { itemId: id, score: tagScore + attrBonus, matchedTags: itemTags };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter(s => s.score > 0).slice(0, k);
}

/**
 * Popularity baseline — items with the most total event weight.
 *
 * @param {Array<string>} candidateIds
 * @param {number} k
 * @returns {Array<{itemId:string, score:number}>}
 */
function recommendPopularity(candidateIds, k) {
  const pop = new PersistentMap('pop', { serviceName: 'decision-intelligence' });
  for (const e of events) {
    pop.set(e.itemId, (pop.get(e.itemId) || 0) + e.weight);
  }
  const scored = candidateIds.map(id => ({
    itemId: id,
    score: pop.get(id) || 0
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

/**
 * Hybrid — weighted combination of the three methods.
 * Default weights: collaborative 0.5, content 0.3, popularity 0.2.
 *
 * @param {string} userId
 * @param {Array<string>} candidateIds
 * @param {number} k
 * @param {Object} [weights]
 * @returns {Array<{itemId:string, score:number}>}
 */
function recommendHybrid(userId, candidateIds, k, weights) {
  const w = Object.assign({ collaborative: 0.5, content: 0.3, popularity: 0.2 }, weights || {});

  const collab = new Map(recommendCollaborative(userId, candidateIds, candidateIds.length).map(r => [r.itemId, r.score]));
  const content = new Map(recommendContent(userId, candidateIds, candidateIds.length).map(r => [r.itemId, r.score]));
  const pop = new Map(recommendPopularity(candidateIds, candidateIds.length).map(r => [r.itemId, r.score]));

  // Normalize each map to [0,1] so the weights are meaningful.
  const normalize = m => {
    const max = Math.max(0, ...m.values());
    if (max === 0) return new PersistentMap('collection-9', { serviceName: 'decision-intelligence' });
    return new Map([...m].map(([k, v]) => [k, v / max]));
  };
  const cn = normalize(collab);
  const ctn = normalize(content);
  const pn = normalize(pop);

  const scored = candidateIds.map(id => {
    const s = (cn.get(id) || 0) * w.collaborative
            + (ctn.get(id) || 0) * w.content
            + (pn.get(id) || 0) * w.popularity;
    return { itemId: id, score: s, breakdown: {
      collaborative: cn.get(id) || 0,
      content: ctn.get(id) || 0,
      popularity: pn.get(id) || 0
    }};
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

// ============ NBA (NEXT BEST ACTION) ============
//
// For each candidate action, compute a score:
//   score = (expectedValue * probabilityOfSuccess * goalAlignment) - cost
// probabilityOfSuccess is estimated from customer tier + lifecycle + NPS.
// goalAlignment is a lookup based on action.tags and the requested goal.

const GOAL_ALIGNMENT = {
  revenue:    { revenue: 1.0, expansion: 0.7, retention: 0.3, engagement: 0.2 },
  retention:  { revenue: 0.3, expansion: 0.2, retention: 1.0, engagement: 0.6 },
  expansion:  { revenue: 0.7, expansion: 1.0, retention: 0.5, engagement: 0.4 },
  engagement: { revenue: 0.2, expansion: 0.4, retention: 0.6, engagement: 1.0 }
};

/**
 * Estimate probability of action success given customer context.
 * @param {object} customer
 * @param {object} action
 */
function estimateSuccessProbability(customer, action) {
  let p = 0.5; // base
  const tier = (customer.tier || '').toLowerCase();
  if (tier === 'platinum' || tier === 'enterprise') p += 0.2;
  else if (tier === 'gold') p += 0.1;
  else if (tier === 'bronze') p -= 0.1;

  const stage = (customer.lifecycleStage || '').toLowerCase();
  if (stage === 'expansion' || stage === 'active') p += 0.15;
  else if (stage === 'onboarding') p += 0.05;
  else if (stage === 'churn_risk') p -= 0.2;
  else if (stage === 'churned') p -= 0.4;

  if (typeof customer.nps === 'number') {
    // NPS -100..100 → adjust [-0.1, +0.1]
    p += (customer.nps / 100) * 0.1;
  }

  // Tag-based adjustments
  const tags = action.tags || [];
  if (tags.includes('urgent') && stage === 'churn_risk') p += 0.15;
  if (tags.includes('low-touch') && tier === 'platinum') p += 0.05;

  return clamp(p, 0.05, 0.95);
}

/**
 * Rank actions for a customer.
 * @param {object} customer
 * @param {Array<object>} actions
 * @param {string} goal
 */
function rankActions(customer, actions, goal) {
  const g = GOAL_ALIGNMENT[goal] ? goal : 'revenue';
  const ranked = actions.map(action => {
    const ev = num(action.expectedValue, 0);
    const cost = num(action.cost, 0);
    const p = estimateSuccessProbability(customer, action);
    const actionGoal = (action.tags || []).find(t => GOAL_ALIGNMENT[g][t] !== undefined) || 'engagement';
    const alignment = GOAL_ALIGNMENT[g][actionGoal] ?? 0.3;
    const score = (ev * p * alignment) - cost;
    return {
      actionId: action.id || action.name,
      name: action.name || action.id,
      score: Number(score.toFixed(4)),
      expectedValue: ev,
      cost,
      probabilityOfSuccess: Number(p.toFixed(3)),
      goalAlignment: alignment,
      actionGoal,
      reasoning: [
        `expectedValue=${ev}`,
        `cost=${cost}`,
        `p(success)=${p.toFixed(3)} (tier=${customer.tier || 'n/a'}, stage=${customer.lifecycleStage || 'n/a'})`,
        `goalAlignment=${alignment} (goal=${g}, actionGoal=${actionGoal})`,
        `score = (${ev} * ${p.toFixed(3)} * ${alignment}) - ${cost} = ${score.toFixed(4)}`
      ]
    };
  });
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

// ============ DECISION FRAMEWORK ============
//
// Two multi-criteria decision analysis methods.

/**
 * Weighted-Sum Model — for each alternative, sum (weight[c] * score[c])
 * across all criteria. Highest sum wins. All scores are assumed to be on
 * the same scale (the caller is responsible for normalizing to [0,1]
 * or otherwise aligning them).
 *
 * @param {Array<{name:string, scores:Object<string,number>}>} alternatives
 * @param {Object<string,number>} weights
 */
function wsm(alternatives, weights) {
  const totalWeight = Object.values(weights).reduce((a, b) => a + num(b, 0), 0) || 1;
  const scored = alternatives.map(alt => {
    let s = 0;
    const breakdown = {};
    for (const [criterion, w] of Object.entries(weights)) {
      const v = num(alt.scores ? alt.scores[criterion] : 0, 0);
      const contrib = (num(w, 0) / totalWeight) * v;
      s += contrib;
      breakdown[criterion] = Number(contrib.toFixed(4));
    }
    return { alternative: alt.name, score: Number(s.toFixed(4)), breakdown };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/**
 * TOPSIS — Technique for Order Preference by Similarity to Ideal Solution.
 * Steps:
 *   1. Build decision matrix (alternatives x criteria).
 *   2. Normalize columns by column norm.
 *   3. Apply weights.
 *   4. Find positive-ideal (max for positive, min for negative) and negative-ideal.
 *   5. Compute Euclidean distance to each ideal.
 *   6. Closeness coefficient = d_neg / (d_pos + d_neg). Higher = better.
 *
 * @param {Array<{name:string, scores:Object<string,number>}>} alternatives
 * @param {Array<string>} criteria
 * @param {Object<string,number>} weights
 * @param {Object<string,'positive'|'negative'>} impacts
 */
function topsis(alternatives, criteria, weights, impacts) {
  // Step 1: matrix
  const m = alternatives.length;
  const n = criteria.length;
  const matrix = alternatives.map(alt =>
    criteria.map(c => num(alt.scores ? alt.scores[c] : 0, 0))
  );

  // Step 2: column normalization
  const colNorms = [];
  for (let j = 0; j < n; j++) {
    let s = 0;
    for (let i = 0; i < m; i++) s += matrix[i][j] * matrix[i][j];
    colNorms.push(Math.sqrt(s) || 1);
  }
  const norm = matrix.map(row => row.map((v, j) => v / colNorms[j]));

  // Step 3: weighted normalized matrix
  const totalW = Object.values(weights).reduce((a, b) => a + num(b, 0), 0) || 1;
  const wArr = criteria.map((c, j) => num(weights[c], 0) / totalW);
  const wnorm = norm.map(row => row.map((v, j) => v * wArr[j]));

  // Step 4: positive / negative ideals
  const idealPos = [], idealNeg = [];
  for (let j = 0; j < n; j++) {
    const col = wnorm.map(r => r[j]);
    const imp = impacts[criteria[j]] === 'negative' ? 'neg' : 'pos';
    idealPos.push(imp === 'pos' ? Math.max(...col) : Math.min(...col));
    idealNeg.push(imp === 'pos' ? Math.min(...col) : Math.max(...col));
  }

  // Step 5 & 6: distances and closeness
  const scored = wnorm.map((row, i) => {
    let dPos = 0, dNeg = 0;
    for (let j = 0; j < n; j++) {
      dPos += Math.pow(row[j] - idealPos[j], 2);
      dNeg += Math.pow(row[j] - idealNeg[j], 2);
    }
    dPos = Math.sqrt(dPos);
    dNeg = Math.sqrt(dNeg);
    const cc = (dPos + dNeg) === 0 ? 0 : dNeg / (dPos + dNeg);
    return {
      alternative: alternatives[i].name,
      closenessCoefficient: Number(cc.toFixed(4)),
      distanceToIdealPositive: Number(dPos.toFixed(4)),
      distanceToIdealNegative: Number(dNeg.toFixed(4))
    };
  });
  scored.sort((a, b) => b.closenessCoefficient - a.closenessCoefficient);
  return scored;
}

/**
 * Sensitivity analysis — for WSM. Re-ranks while sweeping one criterion
 * weight by ±pct and reports rank stability.
 *
 * @param {Array<{name:string, scores:Object<string,number>}>} alternatives
 * @param {Object<string,number>} weights
 * @param {string} pivot
 * @param {number} pct
 */
function wsmSensitivity(alternatives, weights, pivot, pct) {
  const p = pct || 0.25;
  const crit = pivot || Object.keys(weights)[0];
  const sweep = [-p, -p / 2, 0, p / 2, p];
  const results = [];
  for (const delta of sweep) {
    const w = { ...weights, [crit]: num(weights[crit], 0) * (1 + delta) };
    const ranked = wsm(alternatives, w);
    results.push({
      delta: Number(delta.toFixed(3)),
      weights: w,
      top: ranked[0] ? ranked[0].alternative : null,
      ranking: ranked.map(r => r.alternative)
    });
  }
  return { pivot: crit, sweep: results };
}

// ============ SEED DATA ============

function seed() {
  // 5 users
  const u = [
    { id: 'u1', name: 'Aarav Sharma',   preferences: ['saas', 'analytics', 'b2b'],     tier: 'platinum',  attributes: { region: 'apac' } },
    { id: 'u2', name: 'Priya Iyer',     preferences: ['saas', 'crm', 'sales'],         tier: 'gold',      attributes: { region: 'apac' } },
    { id: 'u3', name: 'Diego Alvarez',  preferences: ['analytics', 'ml', 'platform'],  tier: 'gold',      attributes: { region: 'amer' } },
    { id: 'u4', name: 'Mei Tanaka',     preferences: ['crm', 'mobile', 'consumer'],    tier: 'silver',    attributes: { region: 'apac' } },
    { id: 'u5', name: 'Lucas Becker',   preferences: ['ml', 'platform', 'analytics'],  tier: 'bronze',    attributes: { region: 'emea' } }
  ];
  for (const x of u) users.set(x.id, x);

  // 20 items
  const it = [
    { id: 'i1',  name: 'Genie Pro',         tags: ['saas', 'consumer', 'ai'] },
    { id: 'i2',  name: 'SalesOS CRM',       tags: ['crm', 'b2b', 'sales'] },
    { id: 'i3',  name: 'Revenue Brain',     tags: ['analytics', 'revenue', 'b2b'] },
    { id: 'i4',  name: 'TwinOS Hub',        tags: ['platform', 'twin', 'b2b'] },
    { id: 'i5',  name: 'MarketingOS',       tags: ['marketing', 'b2b'] },
    { id: 'i6',  name: 'Mobile Companion',  tags: ['mobile', 'consumer'] },
    { id: 'i7',  name: 'Insight Engine',    tags: ['analytics', 'ml', 'b2b'] },
    { id: 'i8',  name: 'LeadScorer',        tags: ['sales', 'ml', 'b2b'] },
    { id: 'i9',  name: 'Loyalty Hub',       tags: ['marketing', 'consumer'] },
    { id: 'i10', name: 'AI Copilot',        tags: ['ai', 'saas', 'b2b'] },
    { id: 'i11', name: 'Smart Forgetting',  tags: ['ai', 'memory', 'consumer'] },
    { id: 'i12', name: 'Decision Engine',   tags: ['ml', 'platform', 'b2b'] },
    { id: 'i13', name: 'Voice Twin',        tags: ['ai', 'consumer'] },
    { id: 'i14', name: 'AdBazaar DSP',      tags: ['marketing', 'b2b'] },
    { id: 'i15', name: 'Restaurant OS',     tags: ['saas', 'b2b', 'hospitality'] },
    { id: 'i16', name: 'Hotel OS',          tags: ['saas', 'b2b', 'hospitality'] },
    { id: 'i17', name: 'Healthcare OS',     tags: ['saas', 'b2b', 'healthcare'] },
    { id: 'i18', name: 'Personal Memory',   tags: ['memory', 'consumer', 'ai'] },
    { id: 'i19', name: 'Forecast AI',       tags: ['analytics', 'ml', 'revenue'] },
    { id: 'i20', name: 'Smart Calendar',    tags: ['saas', 'productivity', 'ai'] }
  ];
  for (const x of it) items.set(x.id, { ...x, popularity: 0, attributes: {} });

  // ~50 sample interactions
  const rng = (() => {
    // simple deterministic LCG for repeatable seed
    let s = 1234;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xFFFFFFFF;
    };
  })();
  const eventTypes = ['view', 'view', 'click', 'click', 'like', 'purchase'];
  for (let i = 0; i < 50; i++) {
    const userId = 'u' + (1 + Math.floor(rng() * 5));
    const itemId = 'i' + (1 + Math.floor(rng() * 20));
    const eventType = eventTypes[Math.floor(rng() * eventTypes.length)];
    const w = EVENT_WEIGHTS[eventType] || 1;
    events.push({
      id: uuidv4(),
      userId,
      itemId,
      eventType,
      weight: w,
      timestamp: new Date(Date.now() - Math.floor(rng() * 30) * 86400000).toISOString(),
      metadata: { seed: true }
    });
  }
  recomputeAffinity();

  // 3 NBA templates
  const tpls = [
    {
      id: 'nba-nps',
      name: 'Send NPS survey',
      description: 'Send an NPS survey to measure customer satisfaction.',
      expectedValue: 50,
      cost: 2,
      tags: ['retention', 'engagement', 'low-touch'],
      goal: 'retention'
    },
    {
      id: 'nba-upgrade',
      name: 'Offer upgrade discount',
      description: 'Offer a 20% discount on the next-tier plan.',
      expectedValue: 1200,
      cost: 240,
      tags: ['revenue', 'expansion'],
      goal: 'revenue'
    },
    {
      id: 'nba-checkin',
      name: 'Schedule check-in call',
      description: 'Book a 30-min success check-in with the assigned CSM.',
      expectedValue: 200,
      cost: 50,
      tags: ['retention', 'engagement', 'urgent'],
      goal: 'retention'
    }
  ];
  for (const t of tpls) nbaTemplates.set(t.id, { ...t, createdAt: new Date().toISOString() });
}

// ============ EXPRESS APP ============

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '1mb' }));

// ============ HEALTH ============

app.get('/health', (req, res) => res.redirect(301, '/api/health'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    version: '1.0.0',
    stats: {
      users: users.size,
      items: items.size,
      events: events.length,
      nbaTemplates: nbaTemplates.size,
      auditEntries: auditLog.length
    },
    algorithms: ['collaborative', 'content', 'popularity', 'hybrid', 'wsm', 'topsis'],
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/methods
 * Describe the available algorithms.
 */
app.get('/api/methods', (req, res) => {
  res.json({
    recommendation: [
      { name: 'collaborative', description: 'Item-item cosine similarity over user event vectors', input: 'userId' },
      { name: 'content',       description: 'Tag + attribute overlap with user profile',           input: 'userId' },
      { name: 'popularity',    description: 'Most-interacted-with items globally',                  input: 'none' },
      { name: 'hybrid',        description: 'Weighted blend of the three',                          input: 'userId + weights' }
    ],
    nba: {
      goals: Object.keys(GOAL_ALIGNMENT),
      formula: 'score = expectedValue * p(success) * goalAlignment - cost'
    },
    decision: [
      { name: 'wsm',     description: 'Weighted-Sum Model', input: 'alternatives, criteria, weights' },
      { name: 'topsis',  description: 'TOPSIS closeness coefficient', input: 'alternatives, criteria, weights, impacts' }
    ],
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/stats
 * Aggregate counts.
 */
app.get('/api/stats', (req, res) => {
  const totalRecs = auditLog.filter(e => e.op && e.op.startsWith('recommend')).length;
  const totalNba = auditLog.filter(e => e.op && e.op.startsWith('nba')).length;
  const totalDecisions = auditLog.filter(e => e.op && (e.op === 'wsm' || e.op === 'topsis')).length;
  res.json({
    users: users.size,
    items: items.size,
    events: events.length,
    nbaTemplates: nbaTemplates.size,
    totalRecommendations: totalRecs,
    totalNbaQueries: totalNba,
    totalDecisions: totalDecisions,
    auditEntries: auditLog.length,
    timestamp: new Date().toISOString()
  });
});

// ============ RECOMMENDATIONS ============

/**
 * POST /api/recommend/event
 * Record a user-item interaction. Body: { userId, itemId, eventType, metadata? }
 */
app.post('/api/recommend/event', authOrBypass,  (req, res) => {
  const { userId, itemId, eventType, metadata } = req.body || {};
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId (string) is required' });
  }
  if (!itemId || typeof itemId !== 'string') {
    return res.status(400).json({ error: 'itemId (string) is required' });
  }
  if (!EVENT_WEIGHTS[eventType]) {
    return res.status(400).json({ error: `eventType must be one of: ${Object.keys(EVENT_WEIGHTS).join(', ')}` });
  }
  if (!items.has(itemId)) {
    // auto-register unknown items so the demo is forgiving
    items.set(itemId, { id: itemId, name: itemId, tags: [], popularity: 0, attributes: {} });
  }
  if (!users.has(userId)) {
    users.set(userId, { id: userId, name: userId, preferences: [], tier: 'bronze', attributes: {} });
  }
  const weight = EVENT_WEIGHTS[eventType];
  const event = {
    id: uuidv4(),
    userId,
    itemId,
    eventType,
    weight,
    timestamp: new Date().toISOString(),
    metadata: metadata || {}
  };
  events.push(event);
  recomputeAffinity();
  audit({ op: 'recommend.event', principal: principalOf(req), userId, itemId, eventType, weight, success: true, ip: req.ip });
  res.status(201).json({ message: 'Event recorded', event });
});

/**
 * POST /api/recommend/items
 * Body: { userId, itemPool?, method?, k?, weights? }
 * Returns top-k recommendations.
 */
app.post('/api/recommend/items', authOrBypass,  (req, res) => {
  const { userId, itemPool, method, k, weights } = req.body || {};
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId (string) is required' });
  }
  const m = method || 'hybrid';
  if (!['collaborative', 'content', 'popularity', 'hybrid'].includes(m)) {
    return res.status(400).json({ error: `method must be one of: collaborative, content, popularity, hybrid` });
  }
  const kk = clamp(parseInt(k) || DEFAULT_K, 1, 100);

  // Candidate pool: caller-provided list, or all known items
  let candidates;
  if (Array.isArray(itemPool) && itemPool.length) {
    candidates = itemPool.filter(x => items.has(x));
  } else {
    candidates = [...items.keys()];
  }
  if (candidates.length === 0) {
    return res.status(404).json({ error: 'No candidate items available' });
  }

  let recs;
  if (m === 'collaborative') {
    recs = recommendCollaborative(userId, candidates, kk);
  } else if (m === 'content') {
    recs = recommendContent(userId, candidates, kk);
  } else if (m === 'popularity') {
    recs = recommendPopularity(candidates, kk);
  } else {
    recs = recommendHybrid(userId, candidates, kk, weights);
  }

  // Decorate with item metadata
  const result = recs.map(r => {
    const it = items.get(r.itemId);
    return {
      itemId: r.itemId,
      name: it ? it.name : r.itemId,
      tags: it ? it.tags : [],
      score: r.score,
      ...(r.breakdown ? { breakdown: r.breakdown } : {}),
      ...(r.matchedTags ? { matchedTags: r.matchedTags } : {})
    };
  });

  audit({
    op: 'recommend.items',
    principal: principalOf(req),
    userId,
    method: m,
    k: kk,
    returned: result.length,
    success: true,
    ip: req.ip
  });

  res.json({
    userId,
    method: m,
    k: kk,
    count: result.length,
    recommendations: result,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/recommend/items/batch
 * Body: { userIds: [...], itemPool?, method?, k? }
 */
app.post('/api/recommend/items/batch', authOrBypass,  (req, res) => {
  const { userIds, itemPool, method, k } = req.body || {};
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'userIds (non-empty array) is required' });
  }
  if (userIds.length > 100) {
    return res.status(400).json({ error: 'userIds capped at 100 per batch' });
  }
  const m = method || 'hybrid';
  const kk = clamp(parseInt(k) || DEFAULT_K, 1, 100);

  const results = userIds.map(uid => {
    let candidates;
    if (Array.isArray(itemPool) && itemPool.length) {
      candidates = itemPool.filter(x => items.has(x));
    } else {
      candidates = [...items.keys()];
    }
    let recs;
    if (m === 'collaborative') recs = recommendCollaborative(uid, candidates, kk);
    else if (m === 'content') recs = recommendContent(uid, candidates, kk);
    else if (m === 'popularity') recs = recommendPopularity(candidates, kk);
    else recs = recommendHybrid(uid, candidates, kk);

    return {
      userId: uid,
      recommendations: recs.map(r => {
        const it = items.get(r.itemId);
        return {
          itemId: r.itemId,
          name: it ? it.name : r.itemId,
          score: r.score
        };
      })
    };
  });

  audit({
    op: 'recommend.items.batch',
    principal: principalOf(req),
    method: m,
    k: kk,
    userCount: userIds.length,
    success: true,
    ip: req.ip
  });

  res.json({
    method: m,
    k: kk,
    userCount: userIds.length,
    results,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/recommend/similarity/:itemId
 * Find items most similar to the given one (cosine over user vectors).
 */
app.get('/api/recommend/similarity/:itemId', (req, res) => {
  const itemId = req.params.itemId;
  if (!items.has(itemId)) return res.status(404).json({ error: 'Item not found' });

  // Build per-item user vector
  const itemVectors = new PersistentMap('item-vectors', { serviceName: 'decision-intelligence' });
  for (const e of events) {
    if (!itemVectors.has(e.itemId)) itemVectors.set(e.itemId, {});
    itemVectors.get(e.itemId)[e.userId] =
      (itemVectors.get(e.itemId)[e.userId] || 0) + e.weight;
  }
  const target = itemVectors.get(itemId) || {};
  const k = clamp(parseInt(req.query.k) || 5, 1, 50);

  const scored = [];
  for (const [otherId, vec] of itemVectors.entries()) {
    if (otherId === itemId) continue;
    const sim = cosineSimilarity(target, vec);
    scored.push({ itemId: otherId, similarity: Number(sim.toFixed(4)) });
  }
  scored.sort((a, b) => b.similarity - a.similarity);
  const top = scored.slice(0, k);

  // Content similarity too (by tags)
  const it = items.get(itemId);
  const tagSim = [];
  if (it && it.tags) {
    for (const [otherId, other] of items.entries()) {
      if (otherId === itemId) continue;
      const sim = jaccard(it.tags, other.tags || []);
      tagSim.push({ itemId: otherId, tagSimilarity: Number(sim.toFixed(4)) });
    }
    tagSim.sort((a, b) => b.tagSimilarity - a.tagSimilarity);
  }

  audit({
    op: 'recommend.similarity',
    principal: principalOf(req),
    itemId,
    success: true,
    ip: req.ip
  });

  res.json({
    itemId,
    k,
    collaborative: top,
    content: tagSim.slice(0, k),
    timestamp: new Date().toISOString()
  });
});

// ============ NBA (NEXT BEST ACTION) ============

/**
 * POST /api/nba/actions
 * Register a reusable action template. Body: { id, name, description?, expectedValue, cost, tags?, goal? }
 */
app.post('/api/nba/actions', authOrBypass,  (req, res) => {
  const { id, name, description, expectedValue, cost, tags, goal } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name (string) is required' });
  }
  const tid = id || 'nba-' + uuidv4().slice(0, 8);
  if (nbaTemplates.has(tid)) {
    return res.status(409).json({ error: `Template "${tid}" already exists` });
  }
  const template = {
    id: tid,
    name,
    description: description || '',
    expectedValue: num(expectedValue, 0),
    cost: num(cost, 0),
    tags: Array.isArray(tags) ? tags : [],
    goal: goal || 'engagement',
    createdAt: new Date().toISOString()
  };
  nbaTemplates.set(tid, template);
  audit({ op: 'nba.template.create', principal: principalOf(req), templateId: tid, success: true, ip: req.ip });
  res.status(201).json({ message: 'Template created', template });
});

/**
 * GET /api/nba/actions
 * List all action templates.
 */
app.get('/api/nba/actions', (req, res) => {
  const list = [...nbaTemplates.values()];
  res.json({ count: list.length, templates: list });
});

/**
 * POST /api/nba
 * Body: { customer: {tier, lifecycleStage, nps, ...}, availableActions?: [...], goal: 'revenue'|'retention'|'expansion'|'engagement' }
 * If availableActions is omitted, all templates are used.
 */
app.post('/api/nba', authOrBypass,  (req, res) => {
  const { customer, availableActions, goal } = req.body || {};
  if (!customer || typeof customer !== 'object') {
    return res.status(400).json({ error: 'customer (object) is required' });
  }
  const g = GOAL_ALIGNMENT[goal] ? goal : 'revenue';

  let actions;
  if (Array.isArray(availableActions) && availableActions.length) {
    actions = availableActions;
  } else {
    actions = [...nbaTemplates.values()];
  }
  if (actions.length === 0) {
    return res.status(404).json({ error: 'No actions available' });
  }

  const ranked = rankActions(customer, actions, g);
  audit({
    op: 'nba.rank',
    principal: principalOf(req),
    goal: g,
    customerTier: customer.tier || 'n/a',
    candidateCount: actions.length,
    topAction: ranked[0] ? ranked[0].name : null,
    success: true,
    ip: req.ip
  });

  res.json({
    customer,
    goal: g,
    candidateCount: actions.length,
    topAction: ranked[0] || null,
    ranked,
    timestamp: new Date().toISOString()
  });
});

// ============ DECISION FRAMEWORK ============

/**
 * POST /api/decision/wsm
 * Body: { alternatives: [{name, scores: {criterion: value}}], weights: {criterion: weight}, sensitivity?: {pivot?, pct?} }
 */
app.post('/api/decision/wsm', authOrBypass,  (req, res) => {
  const { alternatives, weights, sensitivity } = req.body || {};
  if (!Array.isArray(alternatives) || alternatives.length === 0) {
    return res.status(400).json({ error: 'alternatives (non-empty array) is required' });
  }
  if (!weights || typeof weights !== 'object' || Object.keys(weights).length === 0) {
    return res.status(400).json({ error: 'weights (object with at least one criterion) is required' });
  }
  for (const a of alternatives) {
    if (!a.name || typeof a.name !== 'string') {
      return res.status(400).json({ error: 'each alternative must have a name' });
    }
  }

  const ranking = wsm(alternatives, weights);
  let sens = null;
  if (sensitivity && typeof sensitivity === 'object') {
    sens = wsmSensitivity(alternatives, weights, sensitivity.pivot, sensitivity.pct);
  }

  audit({
    op: 'wsm',
    principal: principalOf(req),
    alternatives: alternatives.length,
    criteria: Object.keys(weights).length,
    winner: ranking[0] ? ranking[0].alternative : null,
    success: true,
    ip: req.ip
  });

  res.json({
    method: 'wsm',
    ranking,
    winner: ranking[0] || null,
    sensitivity: sens,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/decision/topsis
 * Body: { alternatives, criteria, weights, impacts }
 */
app.post('/api/decision/topsis', authOrBypass,  (req, res) => {
  const { alternatives, criteria, weights, impacts } = req.body || {};
  if (!Array.isArray(alternatives) || alternatives.length === 0) {
    return res.status(400).json({ error: 'alternatives (non-empty array) is required' });
  }
  if (!Array.isArray(criteria) || criteria.length === 0) {
    return res.status(400).json({ error: 'criteria (non-empty array) is required' });
  }
  if (!weights || typeof weights !== 'object') {
    return res.status(400).json({ error: 'weights (object) is required' });
  }
  if (!impacts || typeof impacts !== 'object') {
    return res.status(400).json({ error: 'impacts (object mapping criterion to "positive"|"negative") is required' });
  }
  for (const c of criteria) {
    if (!impacts[c] || !['positive', 'negative'].includes(impacts[c])) {
      return res.status(400).json({ error: `impacts.${c} must be "positive" or "negative"` });
    }
  }

  const ranking = topsis(alternatives, criteria, weights, impacts);

  audit({
    op: 'topsis',
    principal: principalOf(req),
    alternatives: alternatives.length,
    criteria: criteria.length,
    winner: ranking[0] ? ranking[0].alternative : null,
    success: true,
    ip: req.ip
  });

  res.json({
    method: 'topsis',
    ranking,
    winner: ranking[0] || null,
    timestamp: new Date().toISOString()
  });
});

// ============ AUDIT ============

/**
 * GET /api/audit
 * Optional filters: ?op=...&limit=200&principal=...
 */
app.get('/api/audit', (req, res) => {
  let entries = auditLog;
  if (req.query.op) entries = entries.filter(e => e.op === req.query.op);
  if (req.query.principal) entries = entries.filter(e => e.principal === req.query.principal);
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
  res.json({ count: entries.length, entries: entries.slice(-limit) });
});

// ============ ERROR HANDLERS ============

app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));
app.use((err, req, res, next) => {
  console.error(`[${SERVICE_NAME}] error:`, err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============ STARTUP ============

seed();
console.log(`[${SERVICE_NAME}] seeded ${users.size} users, ${items.size} items, ${events.length} events, ${nbaTemplates.size} NBA templates`);
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



// Auto-start gated — skip listen() in test mode or when explicitly disabled
if (process.env.NODE_ENV !== 'test' && !process.env.DECISION_INTELLIGENCE_NO_LISTEN) {
  const server = app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] running on port ${PORT}`);
  });
  installGracefulShutdown(server);
}

// Named exports for vitest
module.exports = app;
module.exports.app = app;
module.exports.authOrBypass = authOrBypass;
module.exports.DECISION_INTELLIGENCE_REQUIRE_AUTH = DECISION_INTELLIGENCE_REQUIRE_AUTH;
module.exports.PORT = PORT;
module.exports.SERVICE_NAME = SERVICE_NAME;
module.exports.items = items;
module.exports.users = users;
module.exports.events = events;
