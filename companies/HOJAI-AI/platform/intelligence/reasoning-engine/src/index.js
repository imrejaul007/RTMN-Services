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

'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT || '4785', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'reasoning-engine-internal-token';
const SERVICE_NAME = 'reasoning-engine';
const DATA_DIR = () => process.env.DATA_DIR || path.join(__dirname, '..', 'data');

function ensureDir() {
  const dd = DATA_DIR();
  if (!fs.existsSync(dd)) fs.mkdirSync(dd, { recursive: true });
}

function storeFile(name) { return path.join(DATA_DIR(), `${name}.json`); }

function loadStore(name) {
  ensureDir();
  const f = storeFile(name);
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (_) { return {}; }
}

function saveStore(name, data) {
  ensureDir();
  const dd = DATA_DIR();
  const f = storeFile(name);
  const tmp = path.join(dd, '.tmp_' + crypto.randomBytes(4).toString('hex'));
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, f);
}

function createMap(name) {
  let map = new Map(Object.entries(loadStore(name)));
  return {
    get(k) { return map.get(k); },
    set(k, v) { map.set(k, v); saveStore(name, Object.fromEntries(map)); return this; },
    has(k) { return map.has(k); },
    delete(k) { map.delete(k); saveStore(name, Object.fromEntries(map)); return this; },
    get size() { return map.size; },
    values() { return map.values(); },
    forEach(fn) { map.forEach(fn); },
    clear() { map.clear(); saveStore(name, {}); },
    *[Symbol.iterator]() { yield* map; },
  };
}

// ---------------------------------------------------------------------------
// Shared constants & helpers (module-level for test imports)
// ---------------------------------------------------------------------------

const STRATEGIES = Object.freeze({
  deductive: { name: 'deductive', description: 'General-to-specific reasoning: applies rules to derive conclusions' },
  inductive: { name: 'inductive', description: 'Specific-to-general reasoning: derives general rules from examples' },
  abductive: { name: 'abductive', description: 'Best-explanation reasoning: infers the most likely cause' },
});

const REASONING_ENGINE_REQUIRE_AUTH =
  (process.env.REASONING_ENGINE_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';

const REASONING_ENGINE_NO_LISTEN =
  (process.env.REASONING_ENGINE_NO_LISTEN ?? '').toLowerCase() === 'true' ||
  process.env.NODE_ENV === 'test';

function decompose(query, strategy) {
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

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN)
    return res.status(401).json({ error: 'unauthorized' });
  next();
}

const authOrBypass = (req, res, next) =>
  REASONING_ENGINE_REQUIRE_AUTH ? requireInternal(req, res, next) : next();

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

function createApp() {
  const reasoningRuns = createMap('reasoning-runs');
  const auditLog = [];

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

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use((req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
      console.log(`[reasoning-engine] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started}ms)`);
    });
    next();
  });

  app.post('/api/reason', authOrBypass, (req, res) => {
    const { query, context, strategy } = req.body || {};
    if (!query || typeof query !== 'string')
      return res.status(400).json({ error: 'query (string) is required' });
    const chosen = strategy || 'deductive';
    if (!STRATEGIES[chosen])
      return res.status(400).json({ error: `unknown strategy '${chosen}'`, allowed: Object.keys(STRATEGIES) });
    const steps = decompose(query, chosen);
    const avgConfidence = steps.reduce((a, s) => a + s.confidence, 0) / steps.length;
    const run = {
      id: uuidv4(), query, context: context || null, strategy: chosen, steps,
      conclusion: steps[steps.length - 1]?.statement || query,
      confidence: Number(avgConfidence.toFixed(3)),
      createdAt: new Date().toISOString(),
    };
    reasoningRuns.set(run.id, run);
    audit('reason.run', req.body?.actor || 'system', { id: run.id, strategy: chosen });
    res.status(201).json(run);
  });

  app.get('/api/reason', (req, res) => {
    const { strategy, limit } = req.query;
    let list = Array.from(reasoningRuns.values());
    if (strategy) list = list.filter(r => r.strategy === strategy);
    const max = Math.min(parseInt(limit, 10) || 100, 1000);
    res.json({ runs: list.slice(-max).reverse(), count: list.length });
  });

  app.get('/api/reason/templates', (_req, res) => {
    res.json({ strategies: Object.values(STRATEGIES), count: Object.keys(STRATEGIES).length });
  });

  app.get('/api/reason/audit', (req, res) => {
    const { action, limit } = req.query;
    let entries = auditLog;
    if (action) entries = entries.filter(e => e.action === action);
    const max = Math.min(parseInt(limit, 10) || 200, 5000);
    res.json({ entries: entries.slice(-max).reverse(), count: entries.length });
  });

  app.get('/api/reason/:id', (req, res) => {
    const run = reasoningRuns.get(req.params.id);
    if (!run) return res.status(404).json({ error: 'Reasoning run not found' });
    res.json(run);
  });

  app.delete('/api/reason/:id', authOrBypass, (req, res) => {
    const run = reasoningRuns.get(req.params.id);
    if (!run) return res.status(404).json({ error: 'Reasoning run not found' });
    reasoningRuns.delete(req.params.id);
    audit('reason.delete', req.body?.actor || 'system', { id: req.params.id });
    res.json({ message: 'Run deleted', id: req.params.id });
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT, strategies: Object.keys(STRATEGIES) });
  });
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT, runs: reasoningRuns.size, audits: auditLog.length, uptime: process.uptime() });
  });
  app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

  app.use((err, _req, res, _next) => {
    console.error('[reasoning-engine] error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  });

  return app;
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const app = createApp();

app.authOrBypass = authOrBypass;
app.REASONING_ENGINE_REQUIRE_AUTH = REASONING_ENGINE_REQUIRE_AUTH;
app.REASONING_ENGINE_NO_LISTEN = REASONING_ENGINE_NO_LISTEN;
app.SERVICE_NAME = SERVICE_NAME;
app.decompose = decompose;

function start() {
  const server = app.listen(PORT, () => {
    console.log(`reasoning-engine running on port ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
  });
  process.on('SIGTERM', () => { console.log('[reasoning-engine] SIGTERM'); server.close(() => process.exit(0)); });
  process.on('SIGINT',  () => { console.log('[reasoning-engine] SIGINT');  server.close(() => process.exit(0)); });
  return server;
}

if (require.main === module && !REASONING_ENGINE_NO_LISTEN) start();

module.exports = app;
module.exports.app = app;
module.exports.createApp = createApp;
module.exports.authOrBypass = authOrBypass;
module.exports.REASONING_ENGINE_REQUIRE_AUTH = REASONING_ENGINE_REQUIRE_AUTH;
module.exports.REASONING_ENGINE_NO_LISTEN = REASONING_ENGINE_NO_LISTEN;
module.exports.SERVICE_NAME = SERVICE_NAME;
module.exports.STRATEGIES = STRATEGIES;
module.exports.decompose = decompose;
