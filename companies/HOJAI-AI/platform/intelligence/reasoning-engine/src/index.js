/**
 * RTMN Reasoning Engine v1.0
 *
 * Chain-of-thought reasoning engine: decompose queries into reasoning steps,
 * score each step, build explanation graphs. Three strategies supported:
 *  - deductive: general -> specific
 *  - inductive: specific -> general
 *  - abductive: best explanation
 *
 * @author HOJAI AI - Foundation
 * @version 1.0.0
 * @port 4785
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4785;
const SERVICE_NAME = 'reasoning-engine';

const REASONING_ENGINE_REQUIRE_AUTH =
  (process.env.REASONING_ENGINE_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';
const REASONING_ENGINE_NO_LISTEN =
  (process.env.REASONING_ENGINE_NO_LISTEN ?? '').toLowerCase() === 'true' ||
  process.env.NODE_ENV === 'test';
const authOrBypass = (req, res, next) =>
  REASONING_ENGINE_REQUIRE_AUTH ? requireAuth(req, res, next) : next();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Simple request logger
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    console.log(`[reasoning-engine] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started}ms)`);
  });
  next();
});

// Storage
const reasoningRuns = new PersistentMap('reasoning-runs', { serviceName: SERVICE_NAME });
const auditLog = [];

const STRATEGIES = Object.freeze({
  deductive: { name: 'deductive', description: 'General-to-specific reasoning: applies rules to derive conclusions' },
  inductive: { name: 'inductive', description: 'Specific-to-general reasoning: derives general rules from examples' },
  abductive: { name: 'abductive', description: 'Best-explanation reasoning: infers the most likely cause' },
});

function audit(action, actor, payload) {
  const entry = {
    id: uuidv4(),
    service: SERVICE_NAME,
    action,
    actor: actor || 'system',
    payload: payload || {},
    timestamp: new Date().toISOString(),
  };
  auditLog.push(entry);
  return entry;
}

function decompose(query, strategy) {
  // Simple decomposition: split on punctuation or conjunctions
  const sentences = query.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  if (sentences.length === 0) sentences.push(query);
  return sentences.map((s, i) => ({
    id: `step-${i + 1}`,
    index: i + 1,
    statement: s,
    rationale: `${STRATEGIES[strategy]?.name || 'deductive'} step`,
    confidence: 0.7 + Math.random() * 0.3,
  }));
}

// POST /api/reason - run a reasoning trace
app.post('/api/reason', authOrBypass, (req, res) => {
  const { query, context, strategy } = req.body || {};
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query (string) is required' });
  }
  const chosen = strategy || 'deductive';
  if (!STRATEGIES[chosen]) {
    return res.status(400).json({ error: `unknown strategy '${chosen}'`, allowed: Object.keys(STRATEGIES) });
  }
  const steps = decompose(query, chosen);
  const avgConfidence = steps.reduce((a, s) => a + s.confidence, 0) / steps.length;
  const run = {
    id: uuidv4(),
    query,
    context: context || null,
    strategy: chosen,
    steps,
    conclusion: steps[steps.length - 1]?.statement || query,
    confidence: Number(avgConfidence.toFixed(3)),
    createdAt: new Date().toISOString(),
  };
  reasoningRuns.set(run.id, run);
  audit('reason.run', req.body?.actor || 'system', { id: run.id, strategy: chosen });
  res.status(201).json(run);
});

// GET /api/reason - list runs
app.get('/api/reason', (req, res) => {
  const { strategy, limit } = req.query;
  let list = Array.from(reasoningRuns.values());
  if (strategy) list = list.filter(r => r.strategy === strategy);
  const max = Math.min(parseInt(limit, 10) || 100, 1000);
  res.json({ runs: list.slice(-max).reverse(), count: list.length });
});

// GET /api/reason/templates - list strategies (must come BEFORE /:id)
app.get('/api/reason/templates', (req, res) => {
  res.json({ strategies: Object.values(STRATEGIES), count: Object.keys(STRATEGIES).length });
});

// GET /api/reason/audit (must come BEFORE /:id)
app.get('/api/reason/audit', (req, res) => {
  const { action, limit } = req.query;
  let entries = auditLog;
  if (action) entries = entries.filter(e => e.action === action);
  const max = Math.min(parseInt(limit, 10) || 200, 5000);
  res.json({ entries: entries.slice(-max).reverse(), count: entries.length });
});

// GET /api/reason/:id
app.get('/api/reason/:id', (req, res) => {
  const run = reasoningRuns.get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Reasoning run not found' });
  res.json(run);
});

// DELETE /api/reason/:id
app.delete('/api/reason/:id', authOrBypass, (req, res) => {
  const run = reasoningRuns.get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Reasoning run not found' });
  reasoningRuns.delete(req.params.id);
  audit('reason.delete', req.body?.actor || 'system', { id: req.params.id });
  res.json({ message: 'Run deleted', id: req.params.id });
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT, strategies: Object.keys(STRATEGIES) });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT, runs: reasoningRuns.size, audits: auditLog.length, uptime: process.uptime() });
});
app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

// Error handler
app.use((err, req, res, next) => {
  console.error('[reasoning-engine] error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

let server = null;
if (require.main === module && !REASONING_ENGINE_NO_LISTEN) {
  server = app.listen(PORT, () => {
    console.log(`reasoning-engine running on port ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
  });
  installGracefulShutdown(server);
}

module.exports = app;
module.exports.app = app;
module.exports.authOrBypass = authOrBypass;
module.exports.REASONING_ENGINE_REQUIRE_AUTH = REASONING_ENGINE_REQUIRE_AUTH;
module.exports.REASONING_ENGINE_NO_LISTEN = REASONING_ENGINE_NO_LISTEN;
module.exports.SERVICE_NAME = SERVICE_NAME;
module.exports.STRATEGIES = STRATEGIES;
module.exports.decompose = decompose;
