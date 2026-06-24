/**
 * Retry Planner (port 5363) — Phase 14.4
 *
 * Decides whether and how to retry a failed task. The execution-engine delegates
 * "should I retry?" decisions to this service.
 *
 * Inputs:
 *   POST /api/decide { taskId, error, attempt, history: [{attempt, error, ts}], task: {kind, ...}, options: { maxAttempts?, baseMs?, maxDelayMs?, jitter?, alternatives?: [{type, ...}] } }
 *
 * Output:
 *   { action: 'retry'|'fallback'|'escalate'|'fail', delayMs?, handler?, reason }
 *
 * Strategies:
 *   - retry:    wait delayMs, then re-run with the original handler
 *   - fallback: switch to handler from `alternatives[fallbackIndex]`
 *   - escalate: stop retrying; mark for human review (returns no handler)
 *   - fail:     permanent failure; abort execution
 *
 * Circuit breaker: per-task-id, opens after N consecutive failures, half-open after cooldown.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('node:fs');
const path = require('node:path');

// ---------------------------------------------------------------------------
// Config + persistence
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT, 10) || 5363;
const SERVICE_NAME = 'retry-planner';
const VERSION = '1.0.0';
const DATA_DIR = process.env.RETRY_PLANNER_DATA_DIR || path.join(__dirname, '../data');

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { /* ignore */ } }
function storePath() { return path.join(DATA_DIR, 'breakers.json'); }

function loadStore() {
  try {
    if (!fs.existsSync(storePath())) return {};
    return JSON.parse(fs.readFileSync(storePath(), 'utf8'));
  } catch { return {}; }
}
function saveStore(state) {
  try {
    ensureDir();
    fs.writeFileSync(storePath(), JSON.stringify(state, null, 2));
  } catch (e) { console.warn(`[${SERVICE_NAME}] save failed: ${e.message}`); }
}

// ---------------------------------------------------------------------------
// Per-task circuit breaker state
// ---------------------------------------------------------------------------

// breakerState[taskId] = { state: 'closed'|'open'|'half-open', failures: number, openedAt: number, cooldownMs: number }
const breakerState = loadStore();

function getBreaker(taskId) {
  if (!breakerState[taskId]) {
    breakerState[taskId] = { state: 'closed', failures: 0, openedAt: 0, cooldownMs: 30_000 };
  }
  return breakerState[taskId];
}

function recordSuccess(taskId) {
  const b = getBreaker(taskId);
  b.state = 'closed';
  b.failures = 0;
  b.openedAt = 0;
  saveStore(breakerState);
}

function recordFailure(taskId, opts = {}) {
  const b = getBreaker(taskId);
  b.failures += 1;
  const threshold = opts.failureThreshold || 3;
  if (b.failures >= threshold) {
    b.state = 'open';
    b.openedAt = Date.now();
    b.cooldownMs = opts.cooldownMs || 30_000;
  }
  saveStore(breakerState);
}

function breakerAllows(taskId, opts = {}) {
  const b = getBreaker(taskId);
  if (b.state === 'closed') return true;
  if (b.state === 'open') {
    const elapsed = Date.now() - b.openedAt;
    if (elapsed >= b.cooldownMs) {
      b.state = 'half-open';
      saveStore(breakerState);
      return true;
    }
    return false;
  }
  // half-open: allow exactly one trial
  return true;
}

// ---------------------------------------------------------------------------
// Retry decision logic (pure, also exported for tests)
// ---------------------------------------------------------------------------

function isTransientError(error) {
  if (!error) return false;
  if (typeof error === 'string') {
    return /timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|5\d\d|network|429/i.test(error);
  }
  if (typeof error.status === 'number') {
    return error.status >= 500 || error.status === 429 || error.status === 408;
  }
  return /timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED/i.test(String(error.message || error));
}

function computeBackoff(attempt, opts = {}) {
  const base = opts.baseMs ?? 500;
  const cap = opts.maxDelayMs ?? 30_000;
  const jitter = opts.jitter ?? 0.25; // ±25%
  const exp = Math.min(cap, base * Math.pow(2, Math.max(0, attempt - 1)));
  const j = exp * jitter * (Math.random() * 2 - 1);
  return Math.max(0, Math.floor(exp + j));
}

function decideRetry(input) {
  const {
    taskId,
    error,
    attempt = 1,
    history = [],
    task = {},
    options = {},
  } = input || {};

  const maxAttempts = options.maxAttempts ?? 5;
  const transient = isTransientError(error);

  // Circuit breaker gate
  if (!breakerAllows(taskId, options)) {
    if (Array.isArray(options.alternatives) && options.alternatives.length > 0) {
      return { action: 'fallback', reason: 'circuit-open-switching-to-fallback', handler: options.alternatives[0], attempt };
    }
    if (options.escalateAfter !== undefined && attempt >= options.escalateAfter) {
      return { action: 'escalate', reason: 'circuit-open-escalate', attempt };
    }
    return { action: 'fail', reason: 'circuit-open', attempt };
  }

  // Permanent error (4xx that's not 408/429) → fail fast
  if (!transient) {
    if (Array.isArray(options.alternatives) && options.alternatives.length > 0) {
      return { action: 'fallback', reason: 'permanent-error-fallback', handler: options.alternatives[0], attempt };
    }
    return { action: 'fail', reason: 'permanent-error', attempt };
  }

  // Exhausted attempts
  if (attempt >= maxAttempts) {
    if (Array.isArray(options.alternatives) && options.alternatives.length > 0) {
      return { action: 'fallback', reason: 'max-attempts-reached-fallback', handler: options.alternatives[0], attempt };
    }
    if (options.escalateAfter !== undefined && attempt >= options.escalateAfter) {
      return { action: 'escalate', reason: 'max-attempts-escalate', attempt };
    }
    return { action: 'fail', reason: 'max-attempts-reached', attempt };
  }

  // Transient + budget remaining → retry with backoff
  const delayMs = computeBackoff(attempt, options);
  return { action: 'retry', delayMs, reason: 'transient-retry', attempt };
}

function recordOutcome(taskId, outcome /* 'success' | 'failure' */, options = {}) {
  if (outcome === 'success') recordSuccess(taskId);
  else recordFailure(taskId, options);
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
    status: 'healthy',
    service: SERVICE_NAME,
    version: VERSION,
    port: PORT,
    uptimeSec: Math.round(process.uptime()),
    stats: { trackedTasks: Object.keys(breakerState).length },
    timestamp: new Date().toISOString()
  });
});
app.get('/ready', (_req, res) => res.json({ ready: true, ts: new Date().toISOString() }));

app.post('/api/decide', (req, res) => {
  const decision = decideRetry(req.body || {});
  // Don't auto-record here; caller records outcomes via /api/record-outcome
  res.json(decision);
});

app.post('/api/record-outcome', (req, res) => {
  const { taskId, outcome, options } = req.body || {};
  if (!taskId || !['success', 'failure'].includes(outcome)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'taskId and outcome (success|failure) required' });
  }
  recordOutcome(taskId, outcome, options || {});
  const b = getBreaker(taskId);
  res.json({ taskId, breaker: { state: b.state, failures: b.failures } });
});

app.post('/api/reset-breaker', (req, res) => {
  const { taskId } = req.body || {};
  if (!taskId) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'taskId required' });
  delete breakerState[taskId];
  saveStore(breakerState);
  res.json({ taskId, breaker: { state: 'closed', failures: 0 } });
});

app.get('/api/breakers', (_req, res) => {
  res.json({ breakers: breakerState });
});

// 404 + error
app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
app.use((err, _req, res, _next) => {
  console.error(`[${SERVICE_NAME}] unhandled error:`, err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});

// ---------------------------------------------------------------------------
// Exports + start
// ---------------------------------------------------------------------------

module.exports = { app, decideRetry, computeBackoff, isTransientError, recordOutcome, breakerAllows, recordSuccess, recordFailure, breakerState };

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
