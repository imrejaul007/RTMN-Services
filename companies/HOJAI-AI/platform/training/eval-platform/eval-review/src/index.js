/**
 * eval-review (port 4788) — Phase 31.6
 *
 * Human-in-the-loop review queue for LLM outputs.
 *
 * Features:
 *   - Queue: add (input, output) for human review with priority
 *   - Active learning: surface uncertain cases first (judge confidence < threshold)
 *   - Submit reviews: multiple reviewers can rate the same item
 *   - Inter-rater reliability: Fleiss' kappa across multiple reviewers
 *   - Gold standard: items reviewed by ≥3 reviewers with majority agreement
 *   - Reviewer stats: agreement rate, count, avg time
 *   - Calibration handoff: gold labels can be POSTed to eval-judges for recalibration
 *
 * Each queue item: { id, input, output, reference?, priority, judgeScore?, judgeConfidence?, addedAt, reviews: [...] }
 * Each review: { reviewerId, score (0-1), label?, notes?, ts, durationMs? }
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = parseInt(process.env.PORT, 10) || 4788;
const SERVICE_NAME = 'eval-review';
const VERSION = '1.0.0';
const DATA_DIR = process.env.EVAL_REVIEW_DATA_DIR || path.join(__dirname, '../data');

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { /* ignore */ } }

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const queue = new Map(); // id -> item

function loadQueue() {
  try {
    const p = path.join(DATA_DIR, 'review-queue.json');
    if (!fs.existsSync(p)) return new Map();
    return new Map(Object.entries(JSON.parse(fs.readFileSync(p, 'utf8'))));
  } catch { return new Map(); }
}
function saveQueue() {
  try { ensureDir(); fs.writeFileSync(path.join(DATA_DIR, 'review-queue.json'), JSON.stringify(Object.fromEntries(queue), null, 2)); }
  catch (e) { console.warn(`[${SERVICE_NAME}] save failed: ${e.message}`); }
}
for (const [k, v] of loadQueue()) queue.set(k, v);

// ---------------------------------------------------------------------------
// Priority scoring (lower number = higher priority)
//   Uncertain cases (judgeConfidence < 0.7) → priority 1
//   High-priority manual flag → priority 1
//   Default → 5
//   Old items decay over time (older = lower priority number)
// ---------------------------------------------------------------------------

function computePriority(item, now = Date.now()) {
  let p = item.priorityOverride !== undefined ? item.priorityOverride : 5;
  const conf = item.judgeConfidence !== undefined ? item.judgeConfidence : 1;
  if (conf < 0.7) p = Math.min(p, 1);
  // Age decay: items older than 1 day get priority bumped up (more urgent to clear)
  const ageMs = now - new Date(item.addedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays > 1) p = Math.max(0, p - Math.floor(ageDays));
  return p;
}

function queueOrder(items, n, uncertaintyThreshold = 0.7) {
  return items
    .filter((it) => it.reviews.length === 0 || computePriority(it) <= 2) // include uncertain or recently added
    .sort((a, b) => {
      const pa = computePriority(a);
      const pb = computePriority(b);
      if (pa !== pb) return pa - pb;
      return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
    })
    .slice(0, n);
}

// ---------------------------------------------------------------------------
// Fleiss' kappa (multi-rater agreement)
// ---------------------------------------------------------------------------

function fleissKappa(items, minReviewers = 2) {
  // items: array of { reviews: [{ score }] }
  // Bin scores to 3 categories: 0 (bad: <0.4), 1 (neutral: 0.4-0.7), 2 (good: >=0.7)
  const K = 3;
  const eligible = items.filter((it) => it.reviews.length >= minReviewers);
  if (eligible.length === 0) return { kappa: null, n: 0, reason: 'no-eligible-items' };
  const N = eligible.length;
  let n = 0;
  const counts = eligible.map((it) => {
    const c = [0, 0, 0];
    for (const r of it.reviews) {
      const bin = r.score < 0.4 ? 0 : (r.score < 0.7 ? 1 : 2);
      c[bin]++;
    }
    n = Math.max(n, it.reviews.length);
    return c;
  });
  if (n < 2) return { kappa: null, n: N, reason: 'need-at-least-2-reviewers-per-item' };
  // P_i = (sum c_ij^2 - n) / (n*(n-1))
  const P = counts.map((c) => {
    const sumSq = c.reduce((s, x) => s + x * x, 0);
    return (sumSq - n) / (n * (n - 1));
  });
  const Pbar = P.reduce((s, x) => s + x, 0) / N;
  // p_j = total votes for category j / (N*n)
  const pj = [0, 0, 0];
  for (const c of counts) for (let j = 0; j < K; j++) pj[j] += c[j];
  for (let j = 0; j < K; j++) pj[j] /= (N * n);
  const Pe = pj.reduce((s, x) => s + x * x, 0);
  if (Pe === 1) return { kappa: 1, n: N, Pbar, Pe };
  const kappa = (Pbar - Pe) / (1 - Pe);
  return { kappa: Math.round(kappa * 10000) / 10000, n: N, Pbar, Pe };
}

// ---------------------------------------------------------------------------
// Majority agreement → gold standard
// ---------------------------------------------------------------------------

function majorityLabel(item) {
  if (item.reviews.length < 3) return null;
  const bins = [0, 0, 0];
  for (const r of item.reviews) {
    const bin = r.score < 0.4 ? 0 : (r.score < 0.7 ? 1 : 2);
    bins[bin]++;
  }
  const max = Math.max(...bins);
  const winners = bins.filter((b) => b === max).length;
  if (winners > 1) return null; // tie
  const winnerIdx = bins.indexOf(max);
  return { label: ['bad', 'neutral', 'good'][winnerIdx], score: winnerIdx === 0 ? 0.2 : (winnerIdx === 1 ? 0.55 : 0.85), agreement: max / item.reviews.length };
}

// ---------------------------------------------------------------------------
// Reviewer stats
// ---------------------------------------------------------------------------

function reviewerStats(reviewerId, items) {
  let count = 0, totalAgreement = 0, agreed = 0, totalDurationMs = 0;
  for (const it of items) {
    for (const r of it.reviews) {
      if (r.reviewerId !== reviewerId) continue;
      count++;
      if (typeof r.durationMs === 'number') totalDurationMs += r.durationMs;
      const majority = majorityLabel(it);
      if (majority) {
        totalAgreement++;
        // Treat ±0.2 as agreement (within tolerance)
        if (Math.abs(r.score - majority.score) < 0.2) agreed++;
      }
    }
  }
  return {
    reviewerId,
    reviewCount: count,
    agreementRate: totalAgreement === 0 ? null : agreed / totalAgreement,
    avgDurationMs: count === 0 ? null : Math.round(totalDurationMs / count),
  };
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

app.get('/health', (_req, res) => res.redirect(301, '/api/health'));
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy', service: SERVICE_NAME, version: VERSION, port: PORT,
    uptimeSec: Math.round(process.uptime()),
    stats: { queueItems: queue.size },
    timestamp: new Date().toISOString(),
  });
});
app.get('/ready', (_req, res) => res.json({ ready: true, ts: new Date().toISOString() }));

// Add to queue
app.post('/api/review/queue', (req, res) => {
  const { input, output, reference, judgeScore, judgeConfidence, priority } = req.body || {};
  if (input === undefined || output === undefined) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'input, output required' });
  const id = crypto.randomUUID();
  const item = {
    id, input, output, reference,
    judgeScore: typeof judgeScore === 'number' ? judgeScore : null,
    judgeConfidence: typeof judgeConfidence === 'number' ? judgeConfidence : null,
    priorityOverride: typeof priority === 'number' ? priority : undefined,
    addedAt: new Date().toISOString(),
    reviews: [],
  };
  queue.set(id, item);
  saveQueue();
  res.status(201).json(item);
});

// List queue (optionally prioritized)
app.get('/api/review/queue', (req, res) => {
  const n = Math.min(parseInt(req.query.limit, 10) || 50, 500);
  const onlyUncertain = req.query.uncertain === 'true';
  const items = Array.from(queue.values()).map((it) => ({ ...it, priority: computePriority(it) }));
  const filtered = onlyUncertain ? items.filter((it) => it.judgeConfidence !== null && it.judgeConfidence < 0.7) : items;
  const sorted = filtered.sort((a, b) => a.priority - b.priority || new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
  res.json({ count: sorted.length, items: sorted.slice(0, n) });
});

// Get next item to review
app.get('/api/review/queue/next', (req, res) => {
  const items = Array.from(queue.values());
  const ordered = queueOrder(items, 1);
  if (ordered.length === 0) return res.status(404).json({ error: 'QUEUE_EMPTY' });
  const it = ordered[0];
  res.json({ ...it, priority: computePriority(it) });
});

// Submit review
app.post('/api/review/:id/submit', (req, res) => {
  const it = queue.get(req.params.id);
  if (!it) return res.status(404).json({ error: 'NOT_FOUND' });
  const { reviewerId, score, label, notes, durationMs } = req.body || {};
  if (!reviewerId || typeof score !== 'number') return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'reviewerId and score required' });
  const review = { reviewerId, score: Math.max(0, Math.min(1, score)), label, notes, durationMs, ts: new Date().toISOString() };
  it.reviews.push(review);
  it.updatedAt = review.ts;
  saveQueue();
  res.status(201).json({ id: it.id, review, reviewCount: it.reviews.length });
});

// Reviewer stats
app.get('/api/review/stats', (req, res) => {
  const reviewerId = req.query.reviewerId;
  const items = Array.from(queue.values());
  if (!reviewerId) {
    // Aggregate per reviewer
    const map = new Map();
    for (const it of items) for (const r of it.reviews) {
      if (!map.has(r.reviewerId)) map.set(r.reviewerId, []);
      map.get(r.reviewerId).push({ review: r, item: it });
    }
    const stats = Array.from(map.entries()).map(([rid, arr]) => reviewerStats(rid, arr.map((x) => x.item)));
    return res.json({ count: stats.length, stats });
  }
  res.json(reviewerStats(reviewerId, items));
});

// Inter-rater reliability
app.get('/api/review/kappa', (req, res) => {
  const minReviewers = parseInt(req.query.minReviewers, 10) || 2;
  const items = Array.from(queue.values());
  res.json(fleissKappa(items, minReviewers));
});

// Gold standard export
app.get('/api/review/gold', (req, res) => {
  const minAgreement = parseFloat(req.query.minAgreement) || 0.6;
  const minReviewers = parseInt(req.query.minReviewers, 10) || 3;
  const gold = [];
  for (const it of queue.values()) {
    const m = majorityLabel(it);
    if (!m) continue;
    if (m.agreement < minAgreement) continue;
    if (it.reviews.length < minReviewers) continue;
    gold.push({
      id: it.id,
      input: it.input,
      output: it.output,
      expected: m.label,
      score: m.score,
      agreement: m.agreement,
      reviewerCount: it.reviews.length,
    });
  }
  res.json({ count: gold.length, gold });
});

// Calibration handoff payload (for POST to eval-judges /api/calibrate)
app.get('/api/review/calibrate-payload', (req, res) => {
  const minAgreement = parseFloat(req.query.minAgreement) || 0.7;
  const gold = [];
  for (const it of queue.values()) {
    const m = majorityLabel(it);
    if (!m || m.agreement < minAgreement || it.reviews.length < 3) continue;
    if (it.judgeScore !== null) {
      gold.push({ judgeScore: it.judgeScore, goldScore: m.score });
    }
  }
  res.json({
    count: gold.length,
    judgeScores: gold.map((x) => x.judgeScore),
    goldScores: gold.map((x) => x.goldScore),
    calibrationUrl: 'http://localhost:4782/api/calibrate',
  });
});

app.delete('/api/review/:id', (req, res) => {
  if (!queue.delete(req.params.id)) return res.status(404).json({ error: 'NOT_FOUND' });
  saveQueue();
  res.json({ deleted: req.params.id });
});

// Get one item (must come AFTER all specific routes — Express matches in order)
app.get('/api/review/:id', (req, res) => {
  const it = queue.get(req.params.id);
  if (!it) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json({ ...it, priority: computePriority(it), majorityLabel: majorityLabel(it) });
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
  app, queue,
  computePriority, queueOrder,
  fleissKappa, majorityLabel, reviewerStats,
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
