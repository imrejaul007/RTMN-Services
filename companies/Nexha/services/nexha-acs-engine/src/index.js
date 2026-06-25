/**
 * nexha-acs-engine — Agent Capability Score Engine (Phase F external item)
 *
 * ACS (Agent Capability Index) is a real-time scoring system for agent
 * capabilities in the Nexha federation marketplace. Think of it as a
 * "ProductHunt score" or "IMDb rating" for AI agents — but real-time,
 * multi-dimensional, and gaming-resistant.
 *
 * Why it matters: When a SUTAR agent registers on the federation,
 * buyers need to know: which agent is best at electronics sourcing?
 * Which has the fastest response? Which has the most verified transactions?
 *
 * ACS answers these with a 0-1000 score per agent per capability domain.
 *
 * Scoring dimensions:
 *   1. Task Success Rate   (0-300 pts) — completed / total tasks
 *   2. Response Time       (0-200 pts) — speed relative to peer avg
 *   3. Specialization      (0-200 pts) — depth of verified specializations
 *   4. Certification       (0-150 pts) — HOJAI-certified capabilities
 *   5. Endorsements       (0-150 pts) — peer + buyer endorsements
 *
 * Trust bands: elite (900+), expert (750+), proficient (600+),
 *             developing (400+), novice (200+), unverified (<200)
 *
 * Port: 4260
 * Dependencies: express, cors, helmet, compression, morgan
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { randomUUID } from 'node:crypto';

const app = express();
const PORT = parseInt(process.env.PORT || '4260', 10);
const START_TIME = Date.now();
const REQUIRE_AUTH = process.env.ACS_ENGINE_REQUIRE_AUTH !== 'false';
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', credentials: true }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

function requireAuth(req, res, next) {
  if (!REQUIRE_AUTH) return next();
  const key = req.headers.authorization?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── In-memory store ─────────────────────────────────────

/**
 * Agents indexed by agentId.
 * Shape: { id, name, ownerId, domains: string[], createdAt, signals: [], scores: {} }
 */
const agents = new Map();

/**
 * Signal log — every event that affects scores.
 * Shape: { id, agentId, kind, weight, meta, occurredAt }
 */
const signalLog = [];
const MAX_SIGNALS = 50_000;

// ── Scoring weights ─────────────────────────────────────

const WEIGHTS = {
  taskSuccess: 300,
  responseTime: 200,
  specialization: 200,
  certification: 150,
  endorsements: 150
};

const BAND_THRESHOLDS = {
  elite: 900,
  expert: 750,
  proficient: 600,
  developing: 400,
  novice: 200
};

function getBand(score) {
  if (score >= BAND_THRESHOLDS.elite) return 'elite';
  if (score >= BAND_THRESHOLDS.expert) return 'expert';
  if (score >= BAND_THRESHOLDS.proficient) return 'proficient';
  if (score >= BAND_THRESHOLDS.developing) return 'developing';
  if (score >= BAND_THRESHOLDS.novice) return 'novice';
  if (score > 0) return 'novice';        // 1-199
  return 'unverified';                    // 0
}

// ── Score computation ───────────────────────────────────

/**
 * Compute ACS score for an agent, optionally scoped to a domain.
 * All dimension scores are 0-1000; weighted sum gives final score.
 */
function computeScore(agent, domain = null) {
  const signals = agent.signals || [];

  // Filter by domain if specified
  const domainSignals = domain
    ? signals.filter(s => s.domain === domain || !s.domain)
    : signals;

  // Dimension 1: Task Success Rate (0-300)
  const taskSignals = domainSignals.filter(s => s.kind === 'task_completed' || s.kind === 'task_failed');
  const totalTasks = taskSignals.length;
  const completedTasks = taskSignals.filter(s => s.kind === 'task_completed').length;
  const taskScore = totalTasks === 0
    ? 0
    : Math.round((completedTasks / totalTasks) * WEIGHTS.taskSuccess);

  // Dimension 2: Response Time (0-200)
  // Avg response time of agent vs. federation peer average
  const responseSignals = domainSignals.filter(s => s.kind === 'response_time');
  if (responseSignals.length === 0) {
    var responseScore = 0;
  } else {
    const avgMs = responseSignals.reduce((s, sig) => s + (sig.meta?.avgMs || 0), 0) / responseSignals.length;
    const peerAvg = 5000; // 5s federation average baseline
    // Better than avg = more points. Below peerAvg is capped at 0.
    const ratio = Math.min(peerAvg / Math.max(avgMs, 100), 2.0);
    var responseScore = Math.round(Math.min(ratio, 2.0) * WEIGHTS.responseTime / 2);
  }

  // Dimension 3: Specialization depth (0-200)
  // More verified specializations in the domain = more points
  const domainCount = domain
    ? (agent.domains || []).filter(d => d === domain).length
    : (agent.domains || []).length;
  // Each domain gives up to 40 pts, max 200
  const specializationScore = Math.min(domainCount * 40, WEIGHTS.specialization);

  // Dimension 4: Certifications (0-150)
  const certSignals = domainSignals.filter(s => s.kind === 'certification_earned');
  const certScore = Math.min(certSignals.length * 50, WEIGHTS.certification);

  // Dimension 5: Endorsements (0-150)
  const endorseSignals = domainSignals.filter(s => s.kind === 'endorsement_received');
  // Weight by endorser quality (higher endorser = more weight)
  const endorseScore = Math.min(endorseSignals.length * 15, WEIGHTS.endorsements);

  const total = taskScore + responseScore + specializationScore + certScore + endorseScore;
  return {
    score: Math.min(total, 1000),
    breakdown: {
      taskSuccess: { raw: completedTasks, total: totalTasks, pts: taskScore, max: WEIGHTS.taskSuccess },
      responseTime: { pts: responseScore, max: WEIGHTS.responseTime },
      specialization: { domains: domainCount, pts: specializationScore, max: WEIGHTS.specialization },
      certification: { count: certSignals.length, pts: certScore, max: WEIGHTS.certification },
      endorsements: { count: endorseSignals.length, pts: endorseScore, max: WEIGHTS.endorsements }
    },
    band: getBand(Math.min(total, 1000)),
    computedAt: new Date().toISOString()
  };
}

// ── Health ─────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({
  status: 'ok', service: 'nexha-acs-engine', port: PORT,
  agents: agents.size, signals: signalLog.length, uptime: Date.now() - START_TIME
}));

app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

app.get('/api/v1/info', (_req, res) => res.json({
  service: 'nexha-acs-engine',
  description: 'ACS (Agent Capability Index) scoring engine for the Nexha federation',
  version: '0.1.0',
  port: PORT,
  weights: WEIGHTS,
  bands: BAND_THRESHOLDS,
  domains: ['electronics', 'fashion', 'food', 'construction', 'healthcare', 'logistics', 'finance', 'general'],
  agents: agents.size,
  signals: signalLog.length
}));

// ── Agent management ────────────────────────────────────

/**
 * Register an agent.
 * POST /api/v1/agents
 */
app.post('/api/v1/agents', requireAuth, (req, res) => {
  const { agentId, name, ownerId, domains = [] } = req.body || {};
  if (!agentId || !name) return res.status(400).json({ error: 'agentId and name are required' });
  if (agents.has(agentId)) return res.status(409).json({ error: 'agent already registered' });
  const agent = {
    id: agentId,
    name,
    ownerId: ownerId || null,
    domains,
    createdAt: new Date().toISOString(),
    signals: [],
    _lastUpdated: new Date().toISOString()
  };
  agents.set(agentId, agent);
  const score = computeScore(agent);
  res.status(201).json({ agent, score, status: 'registered' });
});

/**
 * List all agents, optionally filtered by domain or min score.
 * GET /api/v1/agents
 */
app.get('/api/v1/agents', (req, res) => {
  const { domain, minScore, ownerId, limit = 50 } = req.query;
  let items = [...agents.values()];

  if (domain) items = items.filter(a => a.domains.includes(domain));
  if (ownerId) items = items.filter(a => a.ownerId === ownerId);

  // Attach computed scores and sort by overall score desc
  items = items.map(a => {
    const score = computeScore(a);
    if (minScore && score.score < Number(minScore)) return null;
    return { ...a, score: score.score, band: score.band, breakdown: undefined };
  }).filter(Boolean);

  items.sort((a, b) => b.score - a.score);
  res.json({ items: items.slice(0, Number(limit)), total: items.length });
});

/**
 * Get one agent with full score breakdown.
 * GET /api/v1/agents/:agentId
 */
app.get('/api/v1/agents/:agentId', (req, res) => {
  const agent = agents.get(req.params.agentId);
  if (!agent) return res.status(404).json({ error: 'agent not found' });
  const score = computeScore(agent);
  res.json({ agent, score });
});

/**
 * Update agent domains.
 * PATCH /api/v1/agents/:agentId
 */
app.patch('/api/v1/agents/:agentId', requireAuth, (req, res) => {
  const agent = agents.get(req.params.agentId);
  if (!agent) return res.status(404).json({ error: 'agent not found' });
  const { name, domains, ownerId } = req.body || {};
  if (name !== undefined) agent.name = name;
  if (domains !== undefined) agent.domains = domains;
  if (ownerId !== undefined) agent.ownerId = ownerId;
  agent._lastUpdated = new Date().toISOString();
  const score = computeScore(agent);
  res.json({ agent, score });
});

/**
 * Deregister an agent.
 * DELETE /api/v1/agents/:agentId
 */
app.delete('/api/v1/agents/:agentId', requireAuth, (req, res) => {
  if (!agents.has(req.params.agentId)) return res.status(404).json({ error: 'agent not found' });
  agents.delete(req.params.agentId);
  res.json({ deregistered: true, agentId: req.params.agentId });
});

// ── Signal ingestion ───────────────────────────────────

/**
 * Ingest capability signals for an agent.
 * POST /api/v1/signals
 *
 * Signal kinds:
 *   task_completed       — agent completed a task successfully
 *   task_failed         — agent failed a task
 *   response_time       — avg response time in ms (meta.avgMs)
 *   endorsement_received — someone endorsed the agent (meta.endorserScore: 1-10)
 *   certification_earned — agent earned a certification (meta.certId)
 *   specialization_added — agent added a domain specialization
 *   error_rate          — agent had an error spike (meta.errorRate: 0-1)
 */
app.post('/api/v1/signals', requireAuth, (req, res) => {
  const { agentId, kind, weight = 1, domain, meta = {} } = req.body || {};
  if (!agentId || !kind) return res.status(400).json({ error: 'agentId and kind are required' });

  const VALID_KINDS = [
    'task_completed', 'task_failed', 'response_time',
    'endorsement_received', 'certification_earned',
    'specialization_added', 'error_rate'
  ];
  if (!VALID_KINDS.includes(kind)) {
    return res.status(400).json({ error: `kind must be one of: ${VALID_KINDS.join(', ')}` });
  }

  const agent = agents.get(agentId);
  if (!agent) return res.status(404).json({ error: 'agent not found — register first' });

  const signal = {
    id: randomUUID(),
    agentId,
    kind,
    weight,
    domain: domain || null,
    meta,
    occurredAt: new Date().toISOString()
  };

  // Append to signal log
  signalLog.push(signal);
  if (signalLog.length > MAX_SIGNALS) signalLog.splice(0, signalLog.length - MAX_SIGNALS);

  // Append to agent signal list (keep last 500 per agent)
  agent.signals.push(signal);
  if (agent.signals.length > 500) agent.signals.splice(0, agent.signals.length - 500);
  agent._lastUpdated = new Date().toISOString();

  // Recompute score
  const score = computeScore(agent);
  res.status(201).json({ signal, agentScore: score });
});

/**
 * Batch ingest signals.
 * POST /api/v1/signals/batch
 */
app.post('/api/v1/signals/batch', requireAuth, (req, res) => {
  const { signals } = req.body || {};
  if (!Array.isArray(signals)) return res.status(400).json({ error: 'signals array required' });

  const results = [];
  for (const s of signals.slice(0, 100)) { // max 100 per batch
    try {
      const agent = agents.get(s.agentId);
      if (!agent) { results.push({ signal: s, error: 'agent not found' }); continue; }
      const signal = { id: randomUUID(), agentId: s.agentId, kind: s.kind, weight: s.weight || 1, domain: s.domain || null, meta: s.meta || {}, occurredAt: new Date().toISOString() };
      signalLog.push(signal);
      if (signalLog.length > MAX_SIGNALS) signalLog.splice(0, signalLog.length - MAX_SIGNALS);
      agent.signals.push(signal);
      if (agent.signals.length > 500) agent.signals.splice(0, agent.signals.length - 500);
      results.push({ signal, agentId: s.agentId, error: null });
    } catch (e) {
      results.push({ signal: s, error: e.message });
    }
  }
  res.status(201).json({ ingested: results.filter(r => !r.error).length, errors: results.filter(r => r.error).length, results });
});

// ── Scores ─────────────────────────────────────────────

/**
 * Get score for one agent (optionally scoped to domain).
 * GET /api/v1/scores/:agentId
 */
app.get('/api/v1/scores/:agentId', (req, res) => {
  const agent = agents.get(req.params.agentId);
  if (!agent) return res.status(404).json({ error: 'agent not found' });
  const score = computeScore(agent, req.query.domain || null);
  res.json({ agentId: req.params.agentId, ...score });
});

/**
 * Get rankings for a domain or overall.
 * GET /api/v1/scores/rankings
 */
app.get('/api/v1/scores/rankings', (req, res) => {
  const { domain, limit = 20 } = req.query;
  let items = [...agents.values()].map(a => {
    const score = computeScore(a, domain || null);
    return { agentId: a.id, name: a.name, domains: a.domains, score: score.score, band: score.band };
  });
  items.sort((a, b) => b.score - a.score);
  res.json({ domain: domain || 'overall', items: items.slice(0, Number(limit)), total: items.length });
});

/**
 * Get signal log for an agent.
 * GET /api/v1/agents/:agentId/signals
 */
app.get('/api/v1/agents/:agentId/signals', (req, res) => {
  const agent = agents.get(req.params.agentId);
  if (!agent) return res.status(404).json({ error: 'agent not found' });
  const { kind, domain, limit = 100 } = req.query;
  let signals = [...agent.signals].reverse();
  if (kind) signals = signals.filter(s => s.kind === kind);
  if (domain) signals = signals.filter(s => s.domain === domain);
  res.json({ agentId: req.params.agentId, items: signals.slice(0, Number(limit)), total: agent.signals.length });
});

/**
 * Get federation-wide stats.
 * GET /api/v1/stats
 */
app.get('/api/v1/stats', (_req, res) => {
  if (agents.size === 0) return res.json({ agents: 0, signals: 0, topDomain: null, avgScore: null });
  const scores = [...agents.values()].map(a => computeScore(a).score);
  const avgScore = Math.round(scores.reduce((s, x) => s + x, 0) / scores.length);

  // Count agents per domain
  const domainCounts = {};
  for (const a of agents.values()) {
    for (const d of a.domains) {
      domainCounts[d] = (domainCounts[d] || 0) + 1;
    }
  }
  const topDomain = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Band distribution
  const bandDist = { elite: 0, expert: 0, proficient: 0, developing: 0, novice: 0, unverified: 0 };
  for (const a of agents.values()) {
    bandDist[computeScore(a).band]++;
  }

  res.json({
    agents: agents.size,
    signals: signalLog.length,
    avgScore,
    topDomain,
    domainCounts,
    bandDistribution: bandDist,
    uptime: Date.now() - START_TIME
  });
});

// ── Start ─────────────────────────────────────────────

const server = app.listen(PORT, () => console.log(`[acs-engine] listening on http://localhost:${PORT}`));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;
