/**
 * eval-live (port 4783) — Phase 31.3
 *
 * Live evaluation of production LLM calls.
 *
 * Pipeline (called from inference-gateway hook):
 *   1. inference-gateway POSTs to /api/sample with {input, output, latencyMs, costUsd, model, ...}
 *   2. We apply samplingRate (configurable, default 10%) to decide whether to score
 *   3. For sampled calls, we score using eval-judges (heuristic or llm-as-judge)
 *   4. Append to per-day JSONL file (data/live/2026-06-24.jsonl)
 *   5. Update in-memory aggregate indexes for metrics endpoint
 *   6. Check alert rules; fire if threshold violated for X consecutive windows
 *
 * Metrics: accuracy, relevance, helpfulness, safety, latency p50/p95/p99, cost total
 * Dashboard: GET /api/live/dashboard returns everything in one call.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = parseInt(process.env.PORT, 10) || 4783;
const SERVICE_NAME = 'eval-live';
const VERSION = '1.0.0';
const EVAL_JUDGES_URL = process.env.EVAL_JUDGES_URL || 'http://localhost:4782';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const DATA_DIR = process.env.EVAL_LIVE_DATA_DIR || path.join(__dirname, '../data');

function ensureDir() { try { fs.mkdirSync(path.join(DATA_DIR, 'live'), { recursive: true }); } catch (_) { /* ignore */ } }

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

const config = {
  samplingRate: 0.1,            // 10% sample
  defaultRubrics: ['relevance', 'helpfulness', 'safety'],
  windowMinutes: 5,             // metric window
  dataRetentionDays: 30,
  alertCooldownMs: 60_000,
};

// ---------------------------------------------------------------------------
// Sampling
// ---------------------------------------------------------------------------

function shouldSample(rate = config.samplingRate) {
  return Math.random() < Math.max(0, Math.min(1, rate));
}

// ---------------------------------------------------------------------------
// Time bucketing (5-minute windows)
// ---------------------------------------------------------------------------

function timeBucket(date = new Date(), windowMinutes = config.windowMinutes) {
  const ms = date.getTime();
  const windowMs = windowMinutes * 60 * 1000;
  const bucketStart = Math.floor(ms / windowMs) * windowMs;
  return new Date(bucketStart).toISOString();
}

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Persistence (per-day JSONL)
// ---------------------------------------------------------------------------

function livePath(date = new Date()) {
  return path.join(DATA_DIR, 'live', `${dayKey(date)}.jsonl`);
}

function appendSample(sample) {
  ensureDir();
  const p = livePath(new Date(sample.ts));
  fs.appendFileSync(p, JSON.stringify(sample) + '\n');
}

function readDaySamples(date) {
  const p = livePath(date);
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// In-memory aggregate index (per window)
// ---------------------------------------------------------------------------

// windowIndex[windowIso] = { count, scores: { rubric: [scores] }, latencies: [ms], costs: [usd] }
const windowIndex = new Map();

function indexSample(sample) {
  const w = timeBucket(new Date(sample.ts));
  let entry = windowIndex.get(w);
  if (!entry) { entry = { count: 0, scores: {}, latencies: [], costs: [] }; windowIndex.set(w, entry); }
  entry.count++;
  if (typeof sample.latencyMs === 'number') entry.latencies.push(sample.latencyMs);
  if (typeof sample.costUsd === 'number') entry.costs.push(sample.costUsd);
  if (sample.scores) {
    for (const [rubric, score] of Object.entries(sample.scores)) {
      if (typeof score !== 'number') continue;
      entry.scores[rubric] = entry.scores[rubric] || [];
      entry.scores[rubric].push(score);
    }
  }
}

function listRecentWindows(n = 12) {
  const all = Array.from(windowIndex.entries()).sort();
  return all.slice(-n).map(([k, v]) => ({ window: k, ...summarizeWindow(v) }));
}

function summarizeWindow(entry) {
  const latencies = entry.latencies.slice().sort((a, b) => a - b);
  const p = (q) => latencies.length === 0 ? null : latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * q))];
  const avgScore = (arr) => arr && arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  return {
    count: entry.count,
    scores: Object.fromEntries(Object.entries(entry.scores).map(([k, v]) => [k, avgScore(v)])),
    latencyMs: { p50: p(0.5), p95: p(0.95), p99: p(0.99), avg: avgScore(latencies) },
    costUsd: { total: entry.costs.reduce((a, b) => a + b, 0), avg: avgScore(entry.costs) },
  };
}

// ---------------------------------------------------------------------------
// Alert rules
// ---------------------------------------------------------------------------

// alerts = [{ id, name, metric, threshold, direction, windowCount, createdAt, lastFiredAt }]
const alerts = [];
// alertFires = [{ alertId, ts, value, window }]  -- in-memory history
const alertFires = [];

function evaluateAlerts() {
  const recent = listRecentWindows(Math.max(1, config.windowMinutes));
  const now = Date.now();
  const fired = [];
  for (const a of alerts) {
    // Collect last windowCount values of this metric
    const vals = recent.map((w) => {
      const path = a.metric.startsWith('scores.') ? w.scores?.[a.metric.slice(7)] : w[a.metric];
      return path;
    }).filter((v) => typeof v === 'number');
    if (vals.length < (a.windowCount || 1)) continue;
    const last = vals.slice(-(a.windowCount || 1));
    const allViolating = last.every((v) => a.direction === 'lt' ? v < a.threshold : v > a.threshold);
    if (!allViolating) continue;
    // Cooldown
    if (a.lastFiredAt && now - a.lastFiredAt < config.alertCooldownMs) continue;
    a.lastFiredAt = now;
    const fire = { alertId: a.id, ts: new Date().toISOString(), metric: a.metric, value: last[last.length - 1], threshold: a.threshold, direction: a.direction, window: recent[recent.length - 1]?.window };
    alertFires.push(fire);
    fired.push(fire);
  }
  return fired;
}

// ---------------------------------------------------------------------------
// Score via eval-judges (best-effort)
// ---------------------------------------------------------------------------

async function scoreOne({ input, output, reference, mode = 'heuristic', rubrics = config.defaultRubrics }) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (INTERNAL_SERVICE_TOKEN) headers['X-Internal-Token'] = INTERNAL_SERVICE_TOKEN;
    const url = `${EVAL_JUDGES_URL}/api/batch`;
    const r = await fetch(url, {
      method: 'POST', headers,
      body: JSON.stringify({ rubric: rubrics[0], items: [{ input, output, reference }], mode }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j.results || j.results.length === 0) return null;
    return j.results[0].score;
  } catch (_) { return null; }
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

app.get('/health', (_req, res) => res.redirect(301, '/api/health'));
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy', service: SERVICE_NAME, version: VERSION, port: PORT,
    uptimeSec: Math.round(process.uptime()),
    stats: { windows: windowIndex.size, alerts: alerts.length, alertFires: alertFires.length },
    config,
    timestamp: new Date().toISOString(),
  });
});
app.get('/ready', (_req, res) => res.json({ ready: true, ts: new Date().toISOString() }));

app.post('/api/config', (req, res) => {
  const { samplingRate, defaultRubrics, windowMinutes, dataRetentionDays, alertCooldownMs } = req.body || {};
  if (samplingRate !== undefined) config.samplingRate = Math.max(0, Math.min(1, samplingRate));
  if (Array.isArray(defaultRubrics)) config.defaultRubrics = defaultRubrics;
  if (windowMinutes !== undefined) config.windowMinutes = windowMinutes;
  if (dataRetentionDays !== undefined) config.dataRetentionDays = dataRetentionDays;
  if (alertCooldownMs !== undefined) config.alertCooldownMs = alertCooldownMs;
  res.json(config);
});

// Sample endpoint: inference-gateway or caller POSTs here
app.post('/api/sample', async (req, res, next) => {
  try {
    const { input, output, reference, model, latencyMs, costUsd, rubrics, mode, forceScore } = req.body || {};
    if (input === undefined || output === undefined) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'input, output required' });
    const sample = {
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      input, output, reference, model, latencyMs, costUsd,
      sampled: forceScore === true || shouldSample(),
    };
    if (sample.sampled) {
      const score = await scoreOne({ input, output, reference, rubrics, mode });
      if (score !== null) sample.scores = { [rubrics?.[0] || config.defaultRubrics[0]]: score };
    }
    appendSample(sample);
    indexSample(sample);
    res.status(201).json({ id: sample.id, sampled: sample.sampled, scores: sample.scores || null });
  } catch (err) { next(err); }
});

app.post('/api/score', async (req, res, next) => {
  // Direct scoring endpoint (skips sampling gate)
  try {
    const { input, output, reference, rubric = config.defaultRubrics[0], mode = 'heuristic' } = req.body || {};
    if (input === undefined || output === undefined) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'input, output required' });
    const score = await scoreOne({ input, output, reference, rubrics: [rubric], mode });
    res.json({ score, mode, rubric });
  } catch (err) { next(err); }
});

// Metrics
app.get('/api/metrics', (req, res) => {
  const n = Math.min(parseInt(req.query.windows, 10) || 12, 288);
  res.json({ windows: n, data: listRecentWindows(n) });
});

// Alerts
app.post('/api/alerts', (req, res) => {
  const { name, metric, threshold, direction = 'lt', windowCount = 2 } = req.body || {};
  if (!name || !metric || threshold === undefined) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'name, metric, threshold required' });
  const alert = { id: crypto.randomUUID(), name, metric, threshold, direction, windowCount, createdAt: new Date().toISOString(), lastFiredAt: null };
  alerts.push(alert);
  res.status(201).json(alert);
});

app.get('/api/alerts', (_req, res) => {
  res.json({ count: alerts.length, alerts, recentFires: alertFires.slice(-20) });
});

app.delete('/api/alerts/:id', (req, res) => {
  const i = alerts.findIndex((a) => a.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'NOT_FOUND' });
  alerts.splice(i, 1);
  res.json({ deleted: req.params.id });
});

// Run alert evaluation on demand (and on a schedule via setInterval)
app.post('/api/alerts/evaluate', (_req, res) => {
  const fired = evaluateAlerts();
  res.json({ fired, totalFires: alertFires.length });
});

// Dashboard
app.get('/api/dashboard', (_req, res) => {
  res.json({
    windows: listRecentWindows(12),
    alerts: { active: alerts.length, recentFires: alertFires.slice(-10) },
    config,
    stats: {
      totalWindows: windowIndex.size,
      totalAlertFires: alertFires.length,
    },
    timestamp: new Date().toISOString(),
  });
});

app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
app.use((err, _req, res, _next) => {
  console.error(`[${SERVICE_NAME}] unhandled error:`, err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});

// ---------------------------------------------------------------------------
// Background alert evaluator
// ---------------------------------------------------------------------------

const alertInterval = setInterval(() => {
  try { evaluateAlerts(); } catch (_) { /* ignore */ }
}, 30_000);
alertInterval.unref?.();

// ---------------------------------------------------------------------------
// Exports + start
// ---------------------------------------------------------------------------

module.exports = {
  app,
  config,
  shouldSample, timeBucket, dayKey,
  appendSample, readDaySamples,
  indexSample, windowIndex, listRecentWindows, summarizeWindow,
  evaluateAlerts, alerts, alertFires,
  scoreOne,
};

if (require.main === module) {
  ensureDir();
  const server = app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] listening on :${PORT} (eval-judges: ${EVAL_JUDGES_URL})`);
  });
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      console.log(`[${SERVICE_NAME}] received ${sig}, shutting down`);
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 5000).unref();
    });
  }
}
