/**
 * eval-canary (port 4787) — Phase 31.5
 *
 * Canary deployment service.
 *
 * Workflow:
 *   1. POST /api/canary/start → create canary with {name, modelNew, modelBaseline, initialTrafficPct, autoRollbackThreshold}
 *   2. Caller POSTs evaluation results to /api/canary/:id/score as they come in
 *   3. Caller POSTs to /api/canary/:id/traffic to adjust %  (1% → 10% → 25% → 50% → 100%)
 *   4. After autoRollbackThreshold consecutive windows of quality drop >X%, auto-rollback fires
 *   5. POST /api/canary/:id/promote → set traffic to 100%, lock baseline
 *   6. POST /api/canary/:id/rollback → set traffic to 0%, restore baseline
 *
 * Quality delta = mean(scoreNew) - mean(scoreBaseline) over the rolling window.
 * If delta < -autoRollbackThreshold (e.g. -0.05) for autoRollbackWindows consecutive windows → auto-rollback.
 *
 * Per-tenant filtering: optional `tenantFilter: ['tenantA', 'tenantB']` restricts canary to those tenants only.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = parseInt(process.env.PORT, 10) || 5398;
const SERVICE_NAME = 'eval-canary';
const VERSION = '1.0.0';
const DATA_DIR = process.env.EVAL_CANARY_DATA_DIR || path.join(__dirname, '../data');

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { /* ignore */ } }

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const canaries = new Map(); // id -> canary

function loadCanaries() {
  try {
    const p = path.join(DATA_DIR, 'canaries.json');
    if (!fs.existsSync(p)) return new Map();
    return new Map(Object.entries(JSON.parse(fs.readFileSync(p, 'utf8'))));
  } catch { return new Map(); }
}
function saveCanaries() {
  try { ensureDir(); fs.writeFileSync(path.join(DATA_DIR, 'canaries.json'), JSON.stringify(Object.fromEntries(canaries), null, 2)); }
  catch (e) { console.warn(`[${SERVICE_NAME}] save failed: ${e.message}`); }
}
for (const [k, v] of loadCanaries()) canaries.set(k, v);

// ---------------------------------------------------------------------------
// Quality delta + auto-rollback check
// ---------------------------------------------------------------------------

function evaluateQualityDelta(canary) {
  if (canary.scoresNew.length === 0 || canary.scoresBaseline.length === 0) {
    return { delta: null, autoRollback: false, reason: 'insufficient-data' };
  }
  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const mNew = mean(canary.scoresNew);
  const mBase = mean(canary.scoresBaseline);
  const delta = mNew - mBase;
  const windowsViolating = canary.qualityWindowsBelowThreshold || 0;
  const autoRollback = delta < -(canary.autoRollbackThreshold || 0.05) && windowsViolating >= (canary.autoRollbackWindows || 2);
  return { delta, meanNew: mNew, meanBaseline: mBase, autoRollback, windowsViolating };
}

function recordScoreWindow(canary, scoreNew, scoreBaseline) {
  canary.scoresNew = canary.scoresNew || [];
  canary.scoresBaseline = canary.scoresBaseline || [];
  canary.scoresNew.push(scoreNew);
  canary.scoresBaseline.push(scoreBaseline);
  // Keep rolling window
  const winSize = canary.windowSize || 50;
  if (canary.scoresNew.length > winSize) {
    canary.scoresNew = canary.scoresNew.slice(-winSize);
    canary.scoresBaseline = canary.scoresBaseline.slice(-winSize);
  }
  // Track consecutive windows below threshold
  const evalRes = evaluateQualityDelta(canary);
  if (evalRes.delta !== null && evalRes.delta < -(canary.autoRollbackThreshold || 0.05)) {
    canary.qualityWindowsBelowThreshold = (canary.qualityWindowsBelowThreshold || 0) + 1;
  } else {
    canary.qualityWindowsBelowThreshold = 0;
  }
  return evalRes;
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

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

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

app.get('/health', (_req, res) => res.redirect(301, '/api/health'));
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy', service: SERVICE_NAME, version: VERSION, port: PORT,
    uptimeSec: Math.round(process.uptime()),
    stats: { canaries: canaries.size },
    timestamp: new Date().toISOString(),
  });
});
app.get('/ready', (_req, res) => res.json({ ready: true, ts: new Date().toISOString() }));

// Start
app.post('/api/canary/start', requireInternal, (req, res) => {
  const { name, modelNew, modelBaseline, initialTrafficPct = 1, autoRollbackThreshold = 0.05, autoRollbackWindows = 2, tenantFilter, windowSize = 50 } = req.body || {};
  if (!name || !modelNew || !modelBaseline) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'name, modelNew, modelBaseline required' });
  const id = crypto.randomUUID();
  const c = {
    id, name, modelNew, modelBaseline,
    initialTrafficPct,
    autoRollbackThreshold, autoRollbackWindows, windowSize,
    tenantFilter: tenantFilter || null,
    trafficPct: initialTrafficPct,
    trafficHistory: [{ trafficPct: initialTrafficPct, ts: new Date().toISOString(), reason: 'start' }],
    status: 'active',
    scoresNew: [], scoresBaseline: [], qualityWindowsBelowThreshold: 0,
    autoRollbackEvents: [],
    promotionAt: null, rollbackAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  canaries.set(id, c);
  saveCanaries();
  res.status(201).json(c);
});

// List / get
app.get('/api/canary', (_req, res) => {
  res.json({ count: canaries.size, canaries: Array.from(canaries.values()).map((c) => ({
    id: c.id, name: c.name, modelNew: c.modelNew, modelBaseline: c.modelBaseline,
    trafficPct: c.trafficPct, status: c.status, createdAt: c.createdAt,
    promotionAt: c.promotionAt, rollbackAt: c.rollbackAt,
  })) });
});

app.get('/api/canary/:id', (req, res) => {
  const c = canaries.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(c);
});

// Adjust traffic
app.post('/api/canary/:id/traffic', requireInternal, (req, res) => {
  const c = canaries.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'NOT_FOUND' });
  const { trafficPct, reason = 'manual' } = req.body || {};
  if (typeof trafficPct !== 'number' || trafficPct < 0 || trafficPct > 100) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'trafficPct must be 0-100' });
  }
  if (c.status !== 'active') return res.status(409).json({ error: 'NOT_ACTIVE', message: `canary is ${c.status}` });
  c.trafficPct = trafficPct;
  c.trafficHistory.push({ trafficPct, ts: new Date().toISOString(), reason });
  c.updatedAt = new Date().toISOString();
  saveCanaries();
  res.json(c);
});

// Record score
app.post('/api/canary/:id/score', requireInternal, (req, res) => {
  const c = canaries.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'NOT_FOUND' });
  const { scoreNew, scoreBaseline } = req.body || {};
  if (typeof scoreNew !== 'number' || typeof scoreBaseline !== 'number') {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'scoreNew and scoreBaseline required' });
  }
  const evalRes = recordScoreWindow(c, scoreNew, scoreBaseline);
  // Auto-rollback check
  if (evalRes.autoRollback && c.status === 'active') {
    c.status = 'rolled_back';
    c.trafficPct = 0;
    c.trafficHistory.push({ trafficPct: 0, ts: new Date().toISOString(), reason: 'auto-rollback' });
    c.rollbackAt = new Date().toISOString();
    c.autoRollbackEvents.push({
      ts: new Date().toISOString(),
      delta: evalRes.delta,
      windowsViolating: evalRes.windowsViolating,
    });
  }
  c.updatedAt = new Date().toISOString();
  saveCanaries();
  res.json({ id: c.id, trafficPct: c.trafficPct, status: c.status, ...evalRes });
});

// Promote (set 100%, lock baseline as new model)
app.post('/api/canary/:id/promote', requireInternal, (req, res) => {
  const c = canaries.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'NOT_FOUND' });
  if (c.status !== 'active') return res.status(409).json({ error: 'NOT_ACTIVE' });
  c.trafficPct = 100;
  c.trafficHistory.push({ trafficPct: 100, ts: new Date().toISOString(), reason: 'promote' });
  c.status = 'promoted';
  c.promotionAt = new Date().toISOString();
  c.updatedAt = c.promotionAt;
  saveCanaries();
  res.json(c);
});

// Rollback (set 0%, restore baseline)
app.post('/api/canary/:id/rollback', requireInternal, (req, res) => {
  const c = canaries.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'NOT_FOUND' });
  c.trafficPct = 0;
  c.trafficHistory.push({ trafficPct: 0, ts: new Date().toISOString(), reason: 'manual-rollback' });
  c.status = 'rolled_back';
  c.rollbackAt = new Date().toISOString();
  c.updatedAt = c.rollbackAt;
  saveCanaries();
  res.json(c);
});

app.delete('/api/canary/:id', requireInternal, (req, res) => {
  if (!canaries.delete(req.params.id)) return res.status(404).json({ error: 'NOT_FOUND' });
  saveCanaries();
  res.json({ deleted: req.params.id });
});

app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
app.use((err, _req, res, _next) => {
  console.error(`[${SERVICE_NAME}] unhandled error:`, err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});

// ---------------------------------------------------------------------------
// Exports + start
// ---------------------------------------------------------------------------

module.exports = {
  app, canaries,
  evaluateQualityDelta, recordScoreWindow,
};

if (require.main === module) {
  ensureDir();
  const server = app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] listening on :${PORT}`);
  });
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      console.log(`[${SERVICE_NAME}] received ${sig}, shutting down`);
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 5000).unref();
    });
  }
}
