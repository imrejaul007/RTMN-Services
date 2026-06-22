/**
 * BLR AI Marketplace — Multi-Agent Evaluator (port 4257)
 *
 * Score a multi-agent plan across multiple dimensions: completeness,
 * efficiency, redundancy, coordination cost. Used during plan selection
 * and post-execution review.
 *
 * Layer: 7 (Exploration + Discovery + Evaluator + Reputation + ROI)
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4257;
const SERVICE_NAME = 'sutar-multi-agent-evaluator';

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const DIMENSIONS = ['completeness', 'efficiency', 'redundancy', 'coordination', 'capability_coverage'];

const evaluations = new PersistentMap('evaluations', { serviceName: 'blr-multi-agent-evaluator' });
const audit = [];

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok', service: SERVICE_NAME, sutarLayer: 7, port: PORT,
    counts: { evaluations: evaluations.size, audit: audit.length },
    dimensions: DIMENSIONS,
    capabilities: ['evaluations-create', 'evaluations-list', 'evaluations-get', 'evaluations-compare'],
    timestamp: new Date().toISOString(),
  });
});

function score(plan) {
  const scores = {};
  // Completeness: fraction of required intents that have an agent assigned
  if (Array.isArray(plan.intents) && plan.intents.length > 0) {
    const covered = plan.intents.filter(i => i.agentId).length;
    scores.completeness = +(covered / plan.intents.length).toFixed(2);
  } else {
    scores.completeness = 1;
  }
  // Efficiency: ratio of agents to intents (1.0 ideal, lower is worse)
  const agentCount = new Set(plan.intents?.map(i => i.agentId).filter(Boolean)).size || 1;
  scores.efficiency = +(Math.min(1, plan.intents?.length / agentCount || 1)).toFixed(2);
  // Redundancy: 0 if no agent handles >1 intent, 1 if one agent handles all
  const counts = {};
  for (const i of plan.intents || []) {
    if (i.agentId) counts[i.agentId] = (counts[i.agentId] || 0) + 1;
  }
  const maxLoad = Math.max(0, ...Object.values(counts));
  const total = plan.intents?.length || 0;
  scores.redundancy = total > 0 ? +(1 - (maxLoad / total)).toFixed(2) : 1;
  // Coordination cost: agents - 1 (more agents = more coordination)
  scores.coordination = +(1 / Math.max(1, agentCount)).toFixed(2);
  // Capability coverage: if capabilities listed, fraction covered
  if (Array.isArray(plan.requiredCapabilities)) {
    const covered = plan.requiredCapabilities.filter(c =>
      (plan.intents || []).some(i => (i.capabilities || []).includes(c))
    ).length;
    scores.capability_coverage = +(covered / plan.requiredCapabilities.length).toFixed(2);
  } else {
    scores.capability_coverage = 1;
  }
  const overall = +(Object.values(scores).reduce((s, x) => s + x, 0) / Object.keys(scores).length).toFixed(3);
  return { ...scores, overall };
}

app.post('/api/evaluations',requireAuth,  (req, res) => {
  const { plan, notes } = req.body || {};
  if (!plan || !Array.isArray(plan.intents)) return res.status(400).json({ error: 'plan with intents[] required' });
  const id = `eval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const result = score(plan);
  const eval_ = { id, plan, scores: result, notes, evaluatedAt: new Date().toISOString() };
  evaluations.set(id, eval_);
  audit.push({ kind: 'evaluate', evalId: id, overall: result.overall, at: Date.now() });
  res.status(201).json(eval_);
});

app.get('/api/evaluations', (_req, res) => {
  const list = Array.from(evaluations.values()).sort((a, b) => b.scores.overall - a.scores.overall);
  res.json({ count: list.length, evaluations: list });
});

app.get('/api/evaluations/:id', (req, res) => {
  const e = evaluations.get(req.params.id);
  if (!e) return res.status(404).json({ error: 'unknown evaluation' });
  res.json(e);
});

// Compare N plans side by side
app.post('/api/evaluations/compare',requireAuth,  (req, res) => {
  const { plans } = req.body || {};
  if (!Array.isArray(plans) || plans.length === 0) return res.status(400).json({ error: 'plans[] required' });
  const rows = plans.map((p, i) => ({ index: i, name: p.name || `plan-${i}`, scores: score(p) }));
  rows.sort((a, b) => b.scores.overall - a.scores.overall);
  res.json({
    count: rows.length,
    winner: rows[0],
    rankings: rows,
  });
});

app.get('/api/audit', (_req, res) => {
  res.json({ count: audit.length, audit: audit.slice(-100) });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`${SERVICE_NAME} listening on :${PORT}`);
});
installGracefulShutdown(server);
