/**
 * eval-shadow (port 4784) — Phase 31.4
 *
 * Shadow testing (a.k.a. "bake-off" or "dark launch"):
 *
 * Workflow:
 *   1. POST /api/shadow/start → create a shadow run with {name, modelA, modelB, rubric}
 *   2. Caller runs modelA and modelB on the same inputs and POSTs each comparison
 *   3. GET /api/shadow/:id/compare → side-by-side scores per (input, outputA, outputB)
 *   4. POST /api/shadow/:id/decide → returns ship recommendation:
 *      - winner (A or B)
 *      - confidence (0-1)
 *      - pValue (paired t-test)
 *      - meanA, meanB, stdA, stdB
 *      - recommendation: "ship_b" | "ship_a" | "inconclusive"
 *
 * Statistical test:
 *   - Paired t-test (scipy.stats.ttest_rel equivalent) on per-case score deltas
 *   - If N < 30, returns pValue=null and recommends "inconclusive"
 *   - Otherwise: p < 0.05 → significant; recommendation follows direction of larger mean
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = parseInt(process.env.PORT, 10) || 5395;
const SERVICE_NAME = 'eval-shadow';
const VERSION = '1.0.0';
const EVAL_JUDGES_URL = process.env.EVAL_JUDGES_URL || 'http://localhost:4782';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const DATA_DIR = process.env.EVAL_SHADOW_DATA_DIR || path.join(__dirname, '../data');

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { /* ignore */ } }

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const runs = new Map(); // id -> { id, name, modelA, modelB, rubric, comparisons: [...], createdAt }

function loadRuns() {
  try {
    const p = path.join(DATA_DIR, 'shadows.json');
    if (!fs.existsSync(p)) return new Map();
    return new Map(Object.entries(JSON.parse(fs.readFileSync(p, 'utf8'))));
  } catch { return new Map(); }
}
function saveRuns() {
  try { ensureDir(); fs.writeFileSync(path.join(DATA_DIR, 'shadows.json'), JSON.stringify(Object.fromEntries(runs), null, 2)); }
  catch (e) { console.warn(`[${SERVICE_NAME}] save failed: ${e.message}`); }
}
// Load existing
for (const [k, v] of loadRuns()) runs.set(k, v);

// ---------------------------------------------------------------------------
// Statistics: mean, std, paired t-test
// ---------------------------------------------------------------------------

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = arr.reduce((s, x) => s + (x - m) * (x - m), 0) / (arr.length - 1);
  return Math.sqrt(v);
}

// Compute t-statistic and 2-tailed p-value using Student's t-distribution
// Approximation via incomplete beta function (Numerical Recipes style)
function studentTPairedTTest(a, b) {
  if (a.length !== b.length) throw new Error('length mismatch');
  if (a.length < 2) return { t: 0, pValue: 1, df: 0 };
  const n = a.length;
  const diffs = a.map((ai, i) => ai - b[i]);
  const m = mean(diffs);
  const sd = stddev(diffs);
  if (sd === 0) {
    return { t: m === 0 ? 0 : Infinity * Math.sign(m), pValue: m === 0 ? 1 : 0, df: n - 1 };
  }
  const t = (m / sd) * Math.sqrt(n);
  const df = n - 1;
  const pValue = twoTailedTProb(Math.abs(t), df);
  return { t, pValue, df };
}

// 2-tailed p-value for Student's t using regularized incomplete beta
function twoTailedTProb(t, df) {
  if (!isFinite(t)) return 0;
  if (df <= 0) return 1;
  const x = df / (df + t * t);
  const prob = incompleteBeta(x, df / 2, 0.5) / 2;
  return Math.min(1, Math.max(0, prob));
}

// Regularized incomplete beta function I_x(a, b) using continued fraction
function incompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  // continued fraction
  let f = 1, c = 1, d = 0;
  for (let m = 0; m <= 200; m++) {
    const m2 = 2 * m;
    let aa;
    if (m === 0) aa = 1;
    else if (m % 2 === 0) aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    else aa = -((a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = c * d;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-10) break;
  }
  return front * (f - 1);
}

// Lanczos approximation for log-gamma
function logGamma(z) {
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// ---------------------------------------------------------------------------
// Score a (input, output) via eval-judges
// ---------------------------------------------------------------------------

async function scoreOne(input, output, rubric, reference) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (INTERNAL_SERVICE_TOKEN) headers['X-Internal-Token'] = INTERNAL_SERVICE_TOKEN;
    const r = await fetch(`${EVAL_JUDGES_URL}/api/score`, {
      method: 'POST', headers,
      body: JSON.stringify({ input, output, reference, rubric, mode: 'heuristic' }),
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return typeof j.score === 'number' ? j.score : null;
  } catch (_) { return null; }
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
    stats: { runs: runs.size },
    timestamp: new Date().toISOString(),
  });
});
app.get('/ready', (_req, res) => res.json({ ready: true, ts: new Date().toISOString() }));

// Start shadow run
app.post('/api/shadow/start', requireInternal, (req, res) => {
  const { name, modelA, modelB, rubric = 'relevance' } = req.body || {};
  if (!name || !modelA || !modelB) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'name, modelA, modelB required' });
  const id = crypto.randomUUID();
  const run = { id, name, modelA, modelB, rubric, comparisons: [], createdAt: new Date().toISOString(), decidedAt: null, decision: null };
  runs.set(id, run);
  saveRuns();
  res.status(201).json(run);
});

// List / get
app.get('/api/shadow', (_req, res) => {
  res.json({ count: runs.size, runs: Array.from(runs.values()).map((r) => ({
    id: r.id, name: r.name, modelA: r.modelA, modelB: r.modelB, rubric: r.rubric,
    comparisonCount: r.comparisons.length, createdAt: r.createdAt, decidedAt: r.decidedAt, decision: r.decision,
  })) });
});

app.get('/api/shadow/:id', (req, res) => {
  const r = runs.get(req.params.id);
  if (!r) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(r);
});

// Add comparison (one row per (input, outputA, outputB))
app.post('/api/shadow/:id/compare', requireInternal, async (req, res, next) => {
  try {
    const r = runs.get(req.params.id);
    if (!r) return res.status(404).json({ error: 'NOT_FOUND' });
    const { input, outputA, outputB, reference, scoreA, scoreB } = req.body || {};
    if (!input || outputA === undefined || outputB === undefined) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'input, outputA, outputB required' });
    }
    const entry = { id: crypto.randomUUID(), ts: new Date().toISOString(), input, outputA, outputB, reference };
    entry.scoreA = typeof scoreA === 'number' ? scoreA : await scoreOne(input, outputA, r.rubric, reference);
    entry.scoreB = typeof scoreB === 'number' ? scoreB : await scoreOne(input, outputB, r.rubric, reference);
    r.comparisons.push(entry);
    saveRuns();
    res.status(201).json(entry);
  } catch (err) { next(err); }
});

// Side-by-side view
app.get('/api/shadow/:id/compare', (req, res) => {
  const r = runs.get(req.params.id);
  if (!r) return res.status(404).json({ error: 'NOT_FOUND' });
  const scoresA = r.comparisons.map((c) => c.scoreA).filter((v) => typeof v === 'number');
  const scoresB = r.comparisons.map((c) => c.scoreB).filter((v) => typeof v === 'number');
  const meanA = mean(scoresA);
  const meanB = mean(scoresB);
  const sdA = stddev(scoresA);
  const sdB = stddev(scoresB);
  res.json({
    id: r.id, name: r.name, modelA: r.modelA, modelB: r.modelB, rubric: r.rubric,
    comparisons: r.comparisons,
    summary: {
      count: r.comparisons.length,
      meanA, meanB, stdA: sdA, stdB: sdB,
      deltaMean: meanB - meanA,
      winsA: scoresA.filter((a, i) => a > (scoresB[i] ?? 0)).length,
      winsB: scoresB.filter((b, i) => b > (scoresA[i] ?? 0)).length,
      ties: r.comparisons.length - scoresA.filter((a, i) => a > (scoresB[i] ?? 0)).length - scoresB.filter((b, i) => b > (scoresA[i] ?? 0)).length,
    },
  });
});

// Decision (ship recommendation)
app.post('/api/shadow/:id/decide', requireInternal, (req, res) => {
  const r = runs.get(req.params.id);
  if (!r) return res.status(404).json({ error: 'NOT_FOUND' });
  const alpha = req.body?.alpha !== undefined ? req.body.alpha : 0.05;
  const minN = req.body?.minN !== undefined ? req.body.minN : 30;
  const scoresA = r.comparisons.map((c) => c.scoreA).filter((v) => typeof v === 'number');
  const scoresB = r.comparisons.map((c) => c.scoreB).filter((v) => typeof v === 'number');
  if (scoresA.length < 2) {
    return res.status(400).json({ error: 'INSUFFICIENT_DATA', message: `need ≥2 comparisons, have ${r.comparisons.length}` });
  }
  const meanA = mean(scoresA);
  const meanB = mean(scoresB);
  const delta = meanB - meanA;
  let recommendation, confidence = 0, pValue = null, tStat = null, df = null;
  if (scoresA.length < minN) {
    recommendation = Math.abs(delta) < 0.02 ? 'inconclusive' : (delta > 0 ? 'ship_b' : 'ship_a');
    confidence = Math.min(1, scoresA.length / minN) * Math.abs(delta) * 2;
  } else {
    const tt = studentTPairedTTest(scoresB, scoresA);
    tStat = tt.t; pValue = tt.pValue; df = tt.df;
    const significant = pValue < alpha;
    if (!significant) recommendation = 'inconclusive';
    else recommendation = delta > 0 ? 'ship_b' : 'ship_a';
    confidence = Math.min(1, 1 - pValue);
  }
  r.decidedAt = new Date().toISOString();
  r.decision = { winner: delta > 0 ? 'B' : (delta < 0 ? 'A' : 'tie'), delta, meanA, meanB, tStat, pValue, df, confidence, recommendation, alpha, minN };
  saveRuns();
  res.json({ id: r.id, ...r.decision });
});

app.delete('/api/shadow/:id', requireInternal, (req, res) => {
  if (!runs.delete(req.params.id)) return res.status(404).json({ error: 'NOT_FOUND' });
  saveRuns();
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
  app, runs,
  mean, stddev,
  studentTPairedTTest, twoTailedTProb, incompleteBeta, logGamma,
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
