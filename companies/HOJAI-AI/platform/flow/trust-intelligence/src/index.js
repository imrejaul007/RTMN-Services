/**
 * Trust Intelligence Service
 * Port: 4882
 *
 * AI agent trust scoring, risk propagation, and confidence analytics.
 * Distinct from trust-network (social reputation) and agent-reputation
 * (transaction-based trust). Trust Intelligence focuses on:
 *   - Multi-source trust scoring (observation, endorsement, penalty, self-report)
 *   - Time-decay of trust over time
 *   - Risk propagation with severity weights
 *   - Confidence and reliability scoring of AI decisions
 *   - Trust graph traversal with PageRank-style propagation
 *   - Model output trust (accuracy + calibration)
 *   - Integration with CorpID and trust-network
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4882;
const SERVICE_NAME = 'trust-intelligence';

// ============================================================================
// Middleware
// ============================================================================
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// In-memory stores
// ============================================================================
const trustScoreEvents = new PersistentMap('trust-score-events', { serviceName: 'trust-intelligence' });   // agentId -> [{id, source, score, context, evidence, timestamp}]
const reputationEvents = new PersistentMap('reputation-events', { serviceName: 'trust-intelligence' });   // agentId -> [{id, type, weight, source, timestamp}]
const riskFlags = new PersistentMap('risk-flags', { serviceName: 'trust-intelligence' });          // agentId -> [{id, severity, reason, evidence, status, createdAt, clearedAt}]
const confidenceRecords = new PersistentMap('confidence-records', { serviceName: 'trust-intelligence' });  // agentId -> [{id, decisionId, confidence, correct, timestamp}]
const trustEdges = new PersistentMap('trust-edges', { serviceName: 'trust-intelligence' });         // edgeId -> {id, trusterId, trusteeId, weight, createdAt}
const modelTrust = new PersistentMap('model-trust', { serviceName: 'trust-intelligence' });         // modelId -> {modelId, accuracy, calibration, sampleSize, lastUpdated, history:[]}
const agentBaseTrust = new PersistentMap('agent-base-trust', { serviceName: 'trust-intelligence' });     // agentId -> base trust score (0-100)
const corpidCache = new PersistentMap('corpid-cache', { serviceName: 'trust-intelligence' });        // agentId -> {score, level, fetchedAt}
const trustNetworkCache = new PersistentMap('trust-network-cache', { serviceName: 'trust-intelligence' });  // agentId -> {score, fetchedAt}

// ============================================================================
// Constants
// ============================================================================
const HALF_LIFE_DAYS = 30;
const MAX_SCORE = 100;
const MIN_SCORE = 0;

// Trust levels
const TRUST_LEVELS = [
  { name: 'Platinum',   min: 90, max: 100, badge: '🏆' },
  { name: 'Gold',       min: 80, max: 89,  badge: '⭐' },
  { name: 'Silver',     min: 70, max: 79,  badge: '🥈' },
  { name: 'Bronze',     min: 50, max: 69,  badge: '🥉' },
  { name: 'Iron',       min: 30, max: 49,  badge: '⚙️' },
  { name: 'Restricted', min: 0,  max: 29,  badge: '⚠️' }
];

const SOURCE_WEIGHTS = {
  observation: 1.0,
  endorsement: 0.8,
  penalty:     1.2,  // Penalties are weighted slightly higher
  'self-report': 0.5
};

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Get the trust level for a given score (0-100).
 */
function getLevel(score) {
  for (const level of TRUST_LEVELS) {
    if (score >= level.min && score <= level.max) {
      return level.name;
    }
  }
  return 'Restricted';
}

/**
 * Get numeric range for a level name.
 */
function getLevelRange(name) {
  return TRUST_LEVELS.find(l => l.name === name) || TRUST_LEVELS[5];
}

/**
 * Compute time-decay factor.
 *   decayFactor = exp(-ageInDays / halfLife)
 */
function decayFactor(ageInDays) {
  return Math.exp(-ageInDays / HALF_LIFE_DAYS);
}

/**
 * Age in days from an ISO timestamp.
 */
function ageInDays(isoTs) {
  const ms = Date.now() - new Date(isoTs).getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24));
}

/**
 * Compute effective trust for a given agent using:
 *   effectiveTrust = baseTrust * decayFactor
 *                  + sum(reputationEvents * weight) / 100
 *                  - sum(riskFlags * severity * 3)
 *
 * The reputation contribution is intentionally small (divided by 100) so
 * that a single positive/negative event cannot swing the score by more
 * than a few points, while risk-flag penalties compound more quickly.
 */
function computeEffectiveTrust(agentId) {
  const base = agentBaseTrust.get(agentId) || 50;

  // Most recent base trust event determines decay anchor
  const events = trustScoreEvents.get(agentId) || [];
  let lastEventTs = null;
  for (const ev of events) {
    if (!lastEventTs || new Date(ev.timestamp) > new Date(lastEventTs)) {
      lastEventTs = ev.timestamp;
    }
  }
  const age = lastEventTs ? ageInDays(lastEventTs) : 0;
  const decay = decayFactor(age);

  // Weighted sum of reputation events (divided by 100 per spec)
  const reps = reputationEvents.get(agentId) || [];
  let repSum = 0;
  for (const r of reps) {
    repSum += (r.type === 'positive' ? 1 : -1) * (r.weight || 1);
  }
  const repContribution = repSum / 100;

  // Sum of active risk flag penalties
  const flags = (riskFlags.get(agentId) || []).filter(f => f.status === 'active');
  let riskPenalty = 0;
  for (const f of flags) {
    riskPenalty += (f.severity || 0) * 3;
  }

  const effective = base * decay + repContribution - riskPenalty;

  return {
    effectiveTrust: Math.max(MIN_SCORE, Math.min(MAX_SCORE, effective)),
    baseTrust: base,
    decayFactor: decay,
    ageInDays: age,
    reputationContribution: repContribution,
    riskPenalty
  };
}

/**
 * Aggregated reputation for an agent.
 */
function aggregateReputation(agentId) {
  const reps = reputationEvents.get(agentId) || [];
  let positive = 0;
  let negative = 0;
  for (const r of reps) {
    if (r.type === 'positive') positive += r.weight || 1;
    else negative += r.weight || 1;
  }
  const total = positive + negative;
  const score = total === 0 ? 50 : Math.round((positive / total) * 100);
  return {
    agentId,
    positive,
    negative,
    total,
    score,
    level: getLevel(score),
    events: reps
  };
}

/**
 * Aggregated accuracy / reliability for an agent.
 */
function aggregateConfidence(agentId) {
  const records = confidenceRecords.get(agentId) || [];
  const total = records.length;
  const correct = records.filter(r => r.correct).length;
  const accuracy = total === 0 ? 0 : correct / total;
  const avgConfidence = total === 0
    ? 0
    : records.reduce((s, r) => s + (r.confidence || 0), 0) / total;
  // Reliability score: blend accuracy with confidence calibration
  const reliability = total === 0
    ? 50
    : Math.round((accuracy * 0.7 + avgConfidence * 0.3) * 100);
  return {
    agentId,
    total,
    correct,
    accuracy,
    avgConfidence,
    reliability,
    level: getLevel(reliability)
  };
}

/**
 * Ensure the agent has a base-trust entry (default 50).
 */
function ensureAgent(agentId) {
  if (!agentBaseTrust.has(agentId)) {
    agentBaseTrust.set(agentId, 50);
  }
  if (!trustScoreEvents.has(agentId)) {
    trustScoreEvents.set(agentId, []);
  }
  if (!reputationEvents.has(agentId)) {
    reputationEvents.set(agentId, []);
  }
  if (!riskFlags.has(agentId)) {
    riskFlags.set(agentId, []);
  }
  if (!confidenceRecords.has(agentId)) {
    confidenceRecords.set(agentId, []);
  }
}

/**
 * PageRank-style transitive trust.
 *   trust(A->B) = sum( trust(A->X) * trust(X->B) ) / outDegree(X)
 */
function computeTransitiveTrust(fromId, toId, maxHops = 3) {
  // Direct edge
  for (const edge of trustEdges.values()) {
    if (edge.trusterId === fromId && edge.trusteeId === toId) {
      return { direct: true, transitiveScore: edge.weight, path: [fromId, toId], hops: 1 };
    }
  }

  // BFS up to maxHops
  const adjacency = new PersistentMap('adjacency', { serviceName: 'trust-intelligence' });
  for (const edge of trustEdges.values()) {
    if (!adjacency.has(edge.trusterId)) {
      adjacency.set(edge.trusterId, []);
    }
    adjacency.get(edge.trusterId).push(edge);
  }

  // BFS paths
  const queue = [{ node: fromId, path: [fromId], product: 1.0, hops: 0 }];
  let best = null;

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.hops >= maxHops) continue;
    const out = adjacency.get(current.node) || [];
    for (const edge of out) {
      const newPath = [...current.path, edge.trusteeId];
      const newProduct = current.product * edge.weight;
      if (edge.trusteeId === toId) {
        if (!best || newProduct > best.transitiveScore) {
          best = { direct: false, transitiveScore: newProduct, path: newPath, hops: newPath.length - 1 };
        }
      } else if (!current.path.includes(edge.trusteeId)) {
        queue.push({ node: edge.trusteeId, path: newPath, product: newProduct, hops: current.hops + 1 });
      }
    }
  }

  if (!best) {
    return { direct: false, transitiveScore: 0, path: [], hops: 0, reachable: false };
  }
  return { ...best, reachable: true };
}

/**
 * 1-hop trust network for an agent.
 */
function getTrustGraph(agentId) {
  const outgoing = [];
  const incoming = [];
  for (const edge of trustEdges.values()) {
    if (edge.trusterId === agentId) outgoing.push(edge);
    if (edge.trusteeId === agentId) incoming.push(edge);
  }
  return { agentId, outgoing, incoming };
}

/**
 * Top N trusted agents by effective trust score.
 */
function getTopTrusted(limit = 50) {
  const all = Array.from(agentBaseTrust.keys()).map(id => {
    const { effectiveTrust } = computeEffectiveTrust(id);
    return {
      agentId: id,
      score: Math.round(effectiveTrust * 100) / 100,
      level: getLevel(effectiveTrust)
    };
  });
  all.sort((a, b) => b.score - a.score);
  return all.slice(0, limit);
}

/**
 * Trust distribution histogram across all known agents.
 */
function getDistribution() {
  const buckets = {};
  for (const level of TRUST_LEVELS) {
    buckets[level.name] = 0;
  }
  for (const id of agentBaseTrust.keys()) {
    const { effectiveTrust } = computeEffectiveTrust(id);
    const level = getLevel(effectiveTrust);
    buckets[level] = (buckets[level] || 0) + 1;
  }
  return { totalAgents: agentBaseTrust.size, byLevel: buckets };
}

/**
 * Reliability scores for all agents based on confidence history.
 */
function getReliability() {
  const out = [];
  for (const id of agentBaseTrust.keys()) {
    const conf = aggregateConfidence(id);
    if (conf.total > 0) {
      out.push({
        agentId: id,
        reliability: conf.reliability,
        level: conf.level,
        total: conf.total,
        correct: conf.correct,
        accuracy: conf.accuracy
      });
    }
  }
  out.sort((a, b) => b.reliability - a.reliability);
  return out;
}

// ============================================================================
// Seed data
// ============================================================================
function seed() {
  const now = Date.now();
  const daysAgo = (d) => new Date(now - d * 24 * 60 * 60 * 1000).toISOString();

  // 5 agents with their base trust scores
  const seedAgents = [
    { id: 'a-genie',         base: 92 },
    { id: 'a-sutar',         base: 88 },
    { id: 'a-copilot',       base: 85 },
    { id: 'a-restaurant-bot', base: 72 },
    { id: 'a-new-bot',       base: 45 }
  ];

  for (const a of seedAgents) {
    agentBaseTrust.set(a.id, a.base);
    trustScoreEvents.set(a.id, []);
    reputationEvents.set(a.id, []);
    riskFlags.set(a.id, []);
    confidenceRecords.set(a.id, []);
  }

  // 10 trust score events spread across these agents
  const events = [
    { agentId: 'a-genie',          source: 'observation', score: 95, context: 'accurate predictions', evidence: '500 transactions verified' },
    { agentId: 'a-genie',          source: 'endorsement', score: 90, context: 'industry leader' },
    { agentId: 'a-sutar',          source: 'observation', score: 88, context: 'consistent performance' },
    { agentId: 'a-sutar',          source: 'self-report', score: 85, context: 'self-assessment' },
    { agentId: 'a-copilot',        source: 'observation', score: 87, context: 'helpful recommendations' },
    { agentId: 'a-copilot',        source: 'endorsement', score: 82, context: 'user feedback positive' },
    { agentId: 'a-restaurant-bot', source: 'observation', score: 75, context: 'good order handling' },
    { agentId: 'a-restaurant-bot', source: 'penalty',     score: 60, context: 'late delivery incident' },
    { agentId: 'a-new-bot',        source: 'observation', score: 50, context: 'new agent, limited data' },
    { agentId: 'a-new-bot',        source: 'endorsement', score: 55, context: 'early user reviews' }
  ];
  for (const e of events) {
    const ev = {
      id: uuidv4(),
      source: e.source,
      score: e.score,
      context: e.context,
      evidence: e.evidence || null,
      timestamp: daysAgo(Math.random() * 0.4)  // within last ~10 hours
    };
    trustScoreEvents.get(e.agentId).push(ev);
  }

  // 3 reputation events
  reputationEvents.get('a-genie').push({ id: uuidv4(), type: 'positive', weight: 5, source: 'community', timestamp: daysAgo(0.1) });
  reputationEvents.get('a-restaurant-bot').push({ id: uuidv4(), type: 'positive', weight: 2, source: 'customer', timestamp: daysAgo(0.2) });
  reputationEvents.get('a-new-bot').push({ id: uuidv4(), type: 'negative', weight: 1, source: 'system', timestamp: daysAgo(0.1) });

  // 2 risk flags
  riskFlags.get('a-new-bot').push({
    id: uuidv4(),
    severity: 4,
    reason: 'Unusual transaction pattern',
    evidence: '3 chargebacks in 24h',
    status: 'active',
    createdAt: daysAgo(0.2),
    clearedAt: null
  });
  riskFlags.get('a-restaurant-bot').push({
    id: uuidv4(),
    severity: 2,
    reason: 'Minor SLA breach',
    evidence: '2 late deliveries',
    status: 'active',
    createdAt: daysAgo(0.3),
    clearedAt: null
  });

  // 4 trust edges (a-genie trusts a-sutar, a-sutar trusts a-copilot, a-copilot trusts a-restaurant-bot, a-genie trusts a-new-bot)
  const edges = [
    { trusterId: 'a-genie',   trusteeId: 'a-sutar',         weight: 0.9 },
    { trusterId: 'a-sutar',   trusteeId: 'a-copilot',       weight: 0.85 },
    { trusterId: 'a-copilot', trusteeId: 'a-restaurant-bot', weight: 0.7 },
    { trusterId: 'a-genie',   trusteeId: 'a-new-bot',       weight: 0.4 }
  ];
  for (const e of edges) {
    const id = uuidv4();
    trustEdges.set(id, {
      id,
      trusterId: e.trusterId,
      trusteeId: e.trusteeId,
      weight: e.weight,
      createdAt: daysAgo(0.3)
    });
  }

  // 3 model output records
  const models = [
    { modelId: 'model-gpt-finance',  accuracy: 0.94, calibration: 0.91, sampleSize: 5000 },
    { modelId: 'model-recommender',  accuracy: 0.87, calibration: 0.85, sampleSize: 12000 },
    { modelId: 'model-fraud-detect', accuracy: 0.96, calibration: 0.93, sampleSize: 8000 }
  ];
  for (const m of models) {
    modelTrust.set(m.modelId, {
      modelId: m.modelId,
      accuracy: m.accuracy,
      calibration: m.calibration,
      sampleSize: m.sampleSize,
      lastUpdated: daysAgo(1),
      history: [
        { accuracy: m.accuracy - 0.02, calibration: m.calibration - 0.02, sampleSize: Math.floor(m.sampleSize * 0.8), timestamp: daysAgo(7) },
        { accuracy: m.accuracy, calibration: m.calibration, sampleSize: m.sampleSize, timestamp: daysAgo(1) }
      ]
    });
  }

  console.log(`[${SERVICE_NAME}] Seeded ${seedAgents.length} agents, ${events.length} events, ${edges.length} edges, ${models.length} models`);
}

// ============================================================================
// API endpoints
// ============================================================================

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    port: PORT,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      agents: agentBaseTrust.size,
      scoreEvents: Array.from(trustScoreEvents.values()).reduce((s, a) => s + a.length, 0),
      reputationEvents: Array.from(reputationEvents.values()).reduce((s, a) => s + a.length, 0),
      riskFlags: Array.from(riskFlags.values()).reduce((s, a) => s + a.length, 0),
      confidenceRecords: Array.from(confidenceRecords.values()).reduce((s, a) => s + a.length, 0),
      trustEdges: trustEdges.size,
      models: modelTrust.size
    }
  });
});

// ---------------------------------------------------------------------------
// Trust Scores
// ---------------------------------------------------------------------------

// Record a trust score event
app.post('/api/agents/:agentId/trust/score',requireAuth,  (req, res) => {
  const { agentId } = req.params;
  const { source, score, context, evidence } = req.body || {};

  if (!source || !Object.keys(SOURCE_WEIGHTS).includes(source)) {
    return res.status(400).json({ error: 'source must be one of: observation, endorsement, penalty, self-report' });
  }
  if (typeof score !== 'number' || score < 0 || score > 100) {
    return res.status(400).json({ error: 'score must be a number 0-100' });
  }

  ensureAgent(agentId);
  const event = {
    id: uuidv4(),
    source,
    score,
    context: context || null,
    evidence: evidence || null,
    timestamp: new Date().toISOString()
  };
  trustScoreEvents.get(agentId).push(event);

  // Effective trust comes from the spec formula. Score events are recorded
  // for history/audit and influence the decay anchor (most recent event
  // timestamp), but do not directly mutate the base trust value.
  const { effectiveTrust, baseTrust, decayFactor: d, ageInDays: age } = computeEffectiveTrust(agentId);
  res.status(201).json({
    event,
    baseTrust,
    effectiveTrust: Math.round(effectiveTrust * 100) / 100,
    level: getLevel(effectiveTrust),
    decayFactor: d,
    ageInDays: age
  });
});

// Get current aggregated score
app.get('/api/agents/:agentId/trust/score', (req, res) => {
  const { agentId } = req.params;
  if (!agentBaseTrust.has(agentId)) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  const { effectiveTrust, baseTrust, decayFactor: d, ageInDays: age, reputationContribution, riskPenalty } = computeEffectiveTrust(agentId);
  res.json({
    agentId,
    baseTrust,
    effectiveTrust: Math.round(effectiveTrust * 100) / 100,
    level: getLevel(effectiveTrust),
    decayFactor: d,
    ageInDays: age,
    reputationContribution,
    riskPenalty,
    lastUpdated: new Date().toISOString()
  });
});

// Get trust score event history
app.get('/api/agents/:agentId/trust/history', (req, res) => {
  const { agentId } = req.params;
  if (!agentBaseTrust.has(agentId)) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  const events = trustScoreEvents.get(agentId) || [];
  res.json({
    agentId,
    total: events.length,
    events: events.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  });
});

// Get current decay factor and projected score
app.get('/api/agents/:agentId/trust/decay', (req, res) => {
  const { agentId } = req.params;
  if (!agentBaseTrust.has(agentId)) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  const { effectiveTrust, baseTrust, decayFactor: d, ageInDays: age } = computeEffectiveTrust(agentId);

  // Project decay over next 30, 60, 90, 180 days
  const projection = [0, 7, 30, 60, 90, 180].map(days => {
    const futureAge = age + days;
    const futureDecay = decayFactor(futureAge);
    const futureScore = baseTrust * futureDecay;
    return {
      daysFromNow: days,
      decayFactor: Math.round(futureDecay * 1000) / 1000,
      projectedScore: Math.round(futureScore * 100) / 100
    };
  });

  res.json({
    agentId,
    current: {
      baseTrust,
      effectiveTrust: Math.round(effectiveTrust * 100) / 100,
      decayFactor: d,
      ageInDays: age,
      halfLifeDays: HALF_LIFE_DAYS
    },
    projection
  });
});

// Bulk score lookup
app.post('/api/agents/bulk/score',requireAuth,  (req, res) => {
  const { agentIds } = req.body || {};
  if (!Array.isArray(agentIds)) {
    return res.status(400).json({ error: 'agentIds must be an array' });
  }
  const results = agentIds.map(id => {
    if (!agentBaseTrust.has(id)) {
      return { agentId: id, found: false };
    }
    const { effectiveTrust } = computeEffectiveTrust(id);
    return {
      agentId: id,
      found: true,
      score: Math.round(effectiveTrust * 100) / 100,
      level: getLevel(effectiveTrust)
    };
  });
  res.json({ count: results.length, scores: results });
});

// ---------------------------------------------------------------------------
// Trust Levels
// ---------------------------------------------------------------------------

app.get('/api/trust/levels', (req, res) => {
  res.json({ levels: TRUST_LEVELS });
});

// ---------------------------------------------------------------------------
// Reputation Aggregation
// ---------------------------------------------------------------------------

app.post('/api/agents/:agentId/reputation',requireAuth,  (req, res) => {
  const { agentId } = req.params;
  const { type, weight, source } = req.body || {};
  if (!type || (type !== 'positive' && type !== 'negative')) {
    return res.status(400).json({ error: 'type must be positive or negative' });
  }
  const w = typeof weight === 'number' ? weight : 1;
  ensureAgent(agentId);
  const event = {
    id: uuidv4(),
    type,
    weight: w,
    source: source || 'unspecified',
    timestamp: new Date().toISOString()
  };
  reputationEvents.get(agentId).push(event);
  const agg = aggregateReputation(agentId);
  res.status(201).json({ event, aggregate: agg });
});

app.get('/api/agents/:agentId/reputation', (req, res) => {
  const { agentId } = req.params;
  if (!agentBaseTrust.has(agentId)) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json(aggregateReputation(agentId));
});

app.get('/api/agents/top-trusted', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const top = getTopTrusted(limit);
  res.json({ count: top.length, agents: top });
});

// ---------------------------------------------------------------------------
// Risk Propagation
// ---------------------------------------------------------------------------

app.post('/api/agents/:agentId/risk/flag',requireAuth,  (req, res) => {
  const { agentId } = req.params;
  const { severity, reason, evidence } = req.body || {};
  if (typeof severity !== 'number' || severity < 1 || severity > 10) {
    return res.status(400).json({ error: 'severity must be 1-10' });
  }
  ensureAgent(agentId);
  const flag = {
    id: uuidv4(),
    severity,
    reason: reason || 'unspecified',
    evidence: evidence || null,
    status: 'active',
    createdAt: new Date().toISOString(),
    clearedAt: null
  };
  riskFlags.get(agentId).push(flag);
  const { effectiveTrust } = computeEffectiveTrust(agentId);
  res.status(201).json({
    flag,
    effectiveTrust: Math.round(effectiveTrust * 100) / 100,
    level: getLevel(effectiveTrust)
  });
});

app.get('/api/agents/:agentId/risk', (req, res) => {
  const { agentId } = req.params;
  if (!agentBaseTrust.has(agentId)) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  const flags = riskFlags.get(agentId) || [];
  const active = flags.filter(f => f.status === 'active');
  const cleared = flags.filter(f => f.status === 'cleared');
  const maxSeverity = active.length === 0 ? 0 : Math.max(...active.map(f => f.severity));
  res.json({
    agentId,
    active,
    cleared,
    activeCount: active.length,
    clearedCount: cleared.length,
    maxSeverity,
    riskScore: active.reduce((s, f) => s + f.severity, 0)
  });
});

app.post('/api/agents/:agentId/risk/clear',requireAuth,  (req, res) => {
  const { agentId } = req.params;
  const { flagId } = req.body || {};
  if (!agentBaseTrust.has(agentId)) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  const flags = riskFlags.get(agentId) || [];
  let cleared = 0;
  for (const f of flags) {
    if (f.status === 'active' && (!flagId || f.id === flagId)) {
      f.status = 'cleared';
      f.clearedAt = new Date().toISOString();
      cleared++;
    }
  }
  const { effectiveTrust } = computeEffectiveTrust(agentId);
  res.json({
    cleared,
    effectiveTrust: Math.round(effectiveTrust * 100) / 100,
    level: getLevel(effectiveTrust)
  });
});

// ---------------------------------------------------------------------------
// Confidence Scoring
// ---------------------------------------------------------------------------

app.post('/api/agents/:agentId/confidence',requireAuth,  (req, res) => {
  const { agentId } = req.params;
  const { decisionId, confidence, correct } = req.body || {};
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
    return res.status(400).json({ error: 'confidence must be 0-1' });
  }
  if (typeof correct !== 'boolean') {
    return res.status(400).json({ error: 'correct must be boolean' });
  }
  ensureAgent(agentId);
  const record = {
    id: uuidv4(),
    decisionId: decisionId || null,
    confidence,
    correct,
    timestamp: new Date().toISOString()
  };
  confidenceRecords.get(agentId).push(record);
  const agg = aggregateConfidence(agentId);
  res.status(201).json({ record, aggregate: agg });
});

app.get('/api/agents/:agentId/confidence', (req, res) => {
  const { agentId } = req.params;
  if (!agentBaseTrust.has(agentId)) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json(aggregateConfidence(agentId));
});

// ---------------------------------------------------------------------------
// Trust Graph
// ---------------------------------------------------------------------------

app.post('/api/trust/edges',requireAuth,  (req, res) => {
  const { trusterId, trusteeId, weight } = req.body || {};
  if (!trusterId || !trusteeId) {
    return res.status(400).json({ error: 'trusterId and trusteeId are required' });
  }
  if (typeof weight !== 'number' || weight < 0 || weight > 1) {
    return res.status(400).json({ error: 'weight must be 0-1' });
  }
  ensureAgent(trusterId);
  ensureAgent(trusteeId);
  const id = uuidv4();
  const edge = {
    id,
    trusterId,
    trusteeId,
    weight,
    createdAt: new Date().toISOString()
  };
  trustEdges.set(id, edge);
  res.status(201).json({ edge });
});

app.get('/api/agents/:agentId/trust-graph', (req, res) => {
  const { agentId } = req.params;
  res.json(getTrustGraph(agentId));
});

app.get('/api/agents/:agentId/trust-transitive/:targetId', (req, res) => {
  const { agentId, targetId } = req.params;
  const result = computeTransitiveTrust(agentId, targetId);
  res.json({ from: agentId, to: targetId, ...result });
});

// ---------------------------------------------------------------------------
// Aggregations / Analytics
// ---------------------------------------------------------------------------

app.get('/api/analytics/distribution', (req, res) => {
  res.json(getDistribution());
});

app.get('/api/analytics/reliability', (req, res) => {
  const list = getReliability();
  res.json({ count: list.length, agents: list });
});

app.get('/api/analytics/leaderboard', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const top = getTopTrusted(limit);
  res.json({ count: top.length, leaderboard: top });
});

// ---------------------------------------------------------------------------
// Model Output Trust
// ---------------------------------------------------------------------------

app.post('/api/models/:modelId/trust',requireAuth,  (req, res) => {
  const { modelId } = req.params;
  const { accuracy, calibration, sampleSize } = req.body || {};
  if (typeof accuracy !== 'number' || accuracy < 0 || accuracy > 1) {
    return res.status(400).json({ error: 'accuracy must be 0-1' });
  }
  if (typeof calibration !== 'number' || calibration < 0 || calibration > 1) {
    return res.status(400).json({ error: 'calibration must be 0-1' });
  }
  if (typeof sampleSize !== 'number' || sampleSize < 0) {
    return res.status(400).json({ error: 'sampleSize must be >= 0' });
  }
  const existing = modelTrust.get(modelId);
  const record = {
    accuracy,
    calibration,
    sampleSize,
    timestamp: new Date().toISOString()
  };
  if (existing) {
    existing.history.push(record);
    existing.accuracy = accuracy;
    existing.calibration = calibration;
    existing.sampleSize = sampleSize;
    existing.lastUpdated = record.timestamp;
  } else {
    modelTrust.set(modelId, {
      modelId,
      accuracy,
      calibration,
      sampleSize,
      lastUpdated: record.timestamp,
      history: [record]
    });
  }
  res.status(201).json({ modelId, trust: modelTrust.get(modelId) });
});

app.get('/api/models/:modelId/trust', (req, res) => {
  const { modelId } = req.params;
  const m = modelTrust.get(modelId);
  if (!m) {
    return res.status(404).json({ error: 'Model not found' });
  }
  res.json(m);
});

// ---------------------------------------------------------------------------
// Integration
// ---------------------------------------------------------------------------

app.post('/api/sync-from-corpid',requireAuth,  async (req, res) => {
  // Mock: in production this would call CorpID (port 4702)
  // For seed/testing we use the in-memory data to populate the cache.
  const synced = [];
  for (const [agentId, base] of agentBaseTrust.entries()) {
    const entry = {
      agentId,
      score: base,
      level: getLevel(base),
      fetchedAt: new Date().toISOString(),
      source: 'corpid'
    };
    corpidCache.set(agentId, entry);
    synced.push(agentId);
  }
  res.json({
    source: 'corpid',
    endpoint: 'http://localhost:4702',
    cached: synced.length,
    agents: Array.from(corpidCache.values())
  });
});

app.post('/api/sync-from-trust-network',requireAuth,  async (req, res) => {
  // Mock: in production this would call trust-network (port 4149)
  // For testing we use a simple social reputation score (different from
  // transaction-based agent-reputation).
  const synced = [];
  for (const id of agentBaseTrust.keys()) {
    const rep = aggregateReputation(id);
    const entry = {
      agentId: id,
      score: rep.score,
      level: rep.level,
      fetchedAt: new Date().toISOString(),
      source: 'trust-network'
    };
    trustNetworkCache.set(id, entry);
    synced.push(id);
  }
  res.json({
    source: 'trust-network',
    endpoint: 'http://localhost:4149',
    cached: synced.length,
    agents: Array.from(trustNetworkCache.values())
  });
});

// ============================================================================
// 404 / Error handlers
// ============================================================================
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
  console.error(`[${SERVICE_NAME}] Unhandled error:`, err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// ============================================================================
// Start server
// ============================================================================
seed();
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           TRUST INTELLIGENCE SERVICE                            ║
║                  Version 1.0.0                                 ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                   ║
║  Status: RUNNING                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Trust Levels:                                                ║
║    🏆 Platinum 90-100  ⭐ Gold 80-89  🥈 Silver 70-79          ║
║    🥉 Bronze 50-69   ⚙️ Iron 30-49  ⚠️ Restricted 0-29         ║
╠══════════════════════════════════════════════════════════════╣
║  Formula:                                                     ║
║    effective = base * decay + sum(rep * 10) - sum(risk * 3)   ║
║    decay = exp(-ageDays / 30)                                 ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

export default app;
