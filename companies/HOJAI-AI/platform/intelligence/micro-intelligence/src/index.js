/**
 * HOJAI Micro Intelligence Service
 *
 * Cross-cutting circuit-breaker pattern + per-app AI fallback layer.
 * Lets HOJAI AI products (Genie, Razo, Sales Copilot, etc.) keep running
 * even when central HOJAI Intelligence (port 4881) is unavailable.
 *
 * Implements:
 *   - Circuit breaker (3-state: CLOSED → OPEN → HALF_OPEN)
 *   - Per-breaker sliding window of outcomes
 *   - Fallback registration and lookup
 *   - Execution proxy with breaker-aware routing
 *   - Manual state control (kill-switch)
 *   - Audit log of state changes and force-opens
 *
 * Storage: in-memory Map (matches the rest of the HOJAI AI ecosystem).
 * No external DB, no external breaker library (built from scratch per spec).
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = parseInt(process.env.PORT, 10) || 4753;
const SERVICE_NAME = 'micro-intelligence';
const VERSION = '1.0.0';

const STATE = Object.freeze({
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
});

// ============================================================
// In-memory storage
// ============================================================

/** @type {Map<string, Breaker>} */
const breakers = new PersistentMap('breakers', { serviceName: 'micro-intelligence' });
/** @type {Map<string, Fallback>} */
const fallbacks = new PersistentMap('fallbacks', { serviceName: 'micro-intelligence' });
/** @type {AuditEntry[]} */
const auditLog = [];
/** @type {ExecutionRecord[]} */
const recentExecutions = [];

// ============================================================
// Circuit Breaker implementation
// ============================================================

class Breaker {
  constructor({ name, targetUrl, failureThreshold = 5, successThreshold = 2, timeoutMs = 5000, resetTimeoutMs = 30000, fallbackName = null, windowSize = 20 }) {
    this.id = uuidv4();
    this.name = name;
    this.targetUrl = targetUrl;
    this.failureThreshold = failureThreshold;
    this.successThreshold = successThreshold;
    this.timeoutMs = timeoutMs;
    this.resetTimeoutMs = resetTimeoutMs;
    this.fallbackName = fallbackName;
    this.windowSize = windowSize;
    this.state = STATE.CLOSED;
    this.previousState = null;
    this.stateChangedAt = new Date();
    this.nextAttemptAt = null;
    /** @type {('success'|'failure'|'timeout'|'rejected')[]} sliding window of recent outcomes */
    this.outcomes = [];
    this.stats = {
      totalCalls: 0,
      successes: 0,
      failures: 0,
      timeouts: 0,
      rejected: 0,
      fallbackHits: 0,
      stateTransitions: 0
    };
    this.lastError = null;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  recordOutcome(outcome) {
    this.stats.totalCalls += 1;
    if (outcome === 'success') this.stats.successes += 1;
    else if (outcome === 'failure') this.stats.failures += 1;
    else if (outcome === 'timeout') {
      this.stats.timeouts += 1;
      this.stats.failures += 1; // a timeout counts as a failure for threshold purposes
    } else if (outcome === 'rejected') this.stats.rejected += 1;

    this.outcomes.push(outcome);
    if (this.outcomes.length > this.windowSize) this.outcomes.shift();
    this.updatedAt = new Date();
    this.evaluate();
  }

  evaluate() {
    if (this.state === STATE.CLOSED) {
      const recentFailures = this.outcomes.filter(o => o === 'failure' || o === 'timeout').length;
      if (recentFailures >= this.failureThreshold) {
        this.transitionTo(STATE.OPEN);
      }
    } else if (this.state === STATE.HALF_OPEN) {
      const recentSuccesses = this.outcomes.filter(o => o === 'success').length;
      const recentFailures = this.outcomes.filter(o => o === 'failure' || o === 'timeout').length;
      if (recentSuccesses >= this.successThreshold) {
        this.transitionTo(STATE.CLOSED);
      } else if (recentFailures > 0) {
        this.transitionTo(STATE.OPEN);
      }
    }
    // OPEN: only the resetTimeoutMs timer can transition us to HALF_OPEN (checked in allowRequest)
  }

  allowRequest() {
    if (this.state === STATE.CLOSED || this.state === STATE.HALF_OPEN) return true;
    // OPEN — check if resetTimeoutMs has elapsed
    if (this.nextAttemptAt && Date.now() >= this.nextAttemptAt.getTime()) {
      this.transitionTo(STATE.HALF_OPEN);
      return true;
    }
    return false;
  }

  transitionTo(newState) {
    if (this.state === newState) return;
    this.previousState = this.state;
    this.state = newState;
    this.stateChangedAt = new Date();
    this.stats.stateTransitions += 1;

    if (newState === STATE.OPEN) {
      this.nextAttemptAt = new Date(Date.now() + this.resetTimeoutMs);
    } else if (newState === STATE.HALF_OPEN) {
      this.nextAttemptAt = null;
      // Clear sliding window so half-open probe starts fresh
      this.outcomes = [];
    } else if (newState === STATE.CLOSED) {
      this.nextAttemptAt = null;
      this.outcomes = [];
    }

    auditLog.push({
      id: uuidv4(),
      type: 'state-transition',
      breakerName: this.name,
      fromState: this.previousState,
      toState: newState,
      at: new Date(),
      stats: { ...this.stats }
    });
    if (auditLog.length > 5000) auditLog.shift();
  }

  snapshot() {
    return {
      id: this.id,
      name: this.name,
      targetUrl: this.targetUrl,
      state: this.state,
      previousState: this.previousState,
      stateChangedAt: this.stateChangedAt,
      nextAttemptAt: this.nextAttemptAt,
      config: {
        failureThreshold: this.failureThreshold,
        successThreshold: this.successThreshold,
        timeoutMs: this.timeoutMs,
        resetTimeoutMs: this.resetTimeoutMs,
        windowSize: this.windowSize,
        fallbackName: this.fallbackName
      },
      stats: { ...this.stats },
      recentFailures: this.outcomes.filter(o => o === 'failure' || o === 'timeout').length,
      recentSuccesses: this.outcomes.filter(o => o === 'success').length,
      windowSize: this.outcomes.length,
      lastError: this.lastError,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// ============================================================
// HTTP call helper (no axios — built-in http/https only)
// ============================================================

function callUpstream(targetUrl, payload, timeoutMs) {
  return new Promise((resolve, reject) => {
    let urlObj;
    try { urlObj = new URL(targetUrl); }
    catch (e) { return reject(new Error(`Invalid targetUrl: ${targetUrl}`)); }

    const lib = urlObj.protocol === 'https:' ? https : http;
    const body = payload !== undefined ? JSON.stringify(payload) : undefined;

    const req = lib.request({
      method: 'POST',
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      headers: {
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
      },
      timeout: timeoutMs
    }, (res) => {
      let chunks = '';
      res.on('data', c => { chunks += c; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = chunks ? JSON.parse(chunks) : {};
            resolve({ status: res.statusCode, body: parsed });
          } catch {
            resolve({ status: res.statusCode, body: chunks });
          }
        } else {
          reject(new Error(`Upstream returned status ${res.statusCode}: ${chunks.slice(0, 200)}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });
    req.on('error', err => reject(err));
    if (body) req.write(body);
    req.end();
  });
}

// ============================================================
// Express app
// ============================================================

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '1mb' }));

app.use((req, _res, next) => {
  console.log(`[${SERVICE_NAME}] ${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req, res) => res.redirect(301, '/api/health'));

app.get('/api/health', (_req, res) => {
  const states = { CLOSED: 0, OPEN: 0, HALF_OPEN: 0 };
  for (const b of breakers.values()) states[b.state] += 1;
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: VERSION,
    port: PORT,
    uptime: process.uptime(),
    stats: {
      breakers: breakers.size,
      states,
      fallbacks: fallbacks.size,
      auditEntries: auditLog.length
    },
    timestamp: new Date().toISOString()
  });
});

// ----- Breaker CRUD -----

app.post('/api/breakers',requireAuth,  (req, res) => {
  const { name, targetUrl, failureThreshold, successThreshold, timeoutMs, resetTimeoutMs, fallbackName, windowSize } = req.body || {};
  if (!name || !targetUrl) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'name and targetUrl required' });
  if (breakers.has(name)) return res.status(409).json({ error: 'BREAKER_EXISTS', message: `Breaker "${name}" already exists` });

  const breaker = new Breaker({
    name,
    targetUrl,
    failureThreshold,
    successThreshold,
    timeoutMs,
    resetTimeoutMs,
    fallbackName,
    windowSize
  });
  breakers.set(name, breaker);
  auditLog.push({
    id: uuidv4(),
    type: 'breaker-created',
    breakerName: name,
    config: { ...breaker.snapshot().config },
    at: new Date()
  });
  res.status(201).json({ message: 'Breaker created', breaker: breaker.snapshot() });
});

app.get('/api/breakers', (_req, res) => {
  const list = Array.from(breakers.values()).map(b => b.snapshot());
  res.json({ count: list.length, breakers: list });
});

app.get('/api/breakers/:name', (req, res) => {
  const b = breakers.get(req.params.name);
  if (!b) return res.status(404).json({ error: 'BREAKER_NOT_FOUND', message: `No breaker named "${req.params.name}"` });
  res.json(b.snapshot());
});

app.delete('/api/breakers/:name',requireAuth,  (req, res) => {
  const b = breakers.get(req.params.name);
  if (!b) return res.status(404).json({ error: 'BREAKER_NOT_FOUND' });
  breakers.delete(req.params.name);
  auditLog.push({ id: uuidv4(), type: 'breaker-deleted', breakerName: req.params.name, at: new Date() });
  res.json({ message: 'Breaker deleted', breakerName: req.params.name });
});

app.patch('/api/breakers/:name/state',requireAuth,  (req, res) => {
  const b = breakers.get(req.params.name);
  if (!b) return res.status(404).json({ error: 'BREAKER_NOT_FOUND' });
  const { state, reason } = req.body || {};
  if (!Object.values(STATE).includes(state)) return res.status(400).json({ error: 'INVALID_STATE', message: `state must be one of ${Object.values(STATE).join(', ')}` });
  const fromState = b.state;
  b.transitionTo(state);
  auditLog.push({
    id: uuidv4(),
    type: 'force-state-change',
    breakerName: b.name,
    fromState,
    toState: state,
    reason: reason || 'manual',
    at: new Date()
  });
  res.json({ message: 'State forced', breaker: b.snapshot() });
});

app.post('/api/breakers/:name/reset',requireAuth,  (req, res) => {
  const b = breakers.get(req.params.name);
  if (!b) return res.status(404).json({ error: 'BREAKER_NOT_FOUND' });
  b.outcomes = [];
  b.stats = {
    totalCalls: 0,
    successes: 0,
    failures: 0,
    timeouts: 0,
    rejected: 0,
    fallbackHits: 0,
    stateTransitions: 0
  };
  b.lastError = null;
  b.transitionTo(STATE.CLOSED);
  auditLog.push({ id: uuidv4(), type: 'stats-reset', breakerName: b.name, at: new Date() });
  res.json({ message: 'Breaker stats reset', breaker: b.snapshot() });
});

// ----- Execute (the main call) -----

app.post('/api/execute/:breakerName',requireAuth,  async (req, res) => {
  const breaker = breakers.get(req.params.breakerName);
  if (!breaker) return res.status(404).json({ error: 'BREAKER_NOT_FOUND' });

  const start = Date.now();
  if (!breaker.allowRequest()) {
    breaker.stats.rejected += 1;
    const fallback = breaker.fallbackName ? fallbacks.get(breaker.fallbackName) : null;
    breaker.stats.fallbackHits += 1;
    const execution = {
      id: uuidv4(),
      breakerName: breaker.name,
      outcome: 'rejected',
      durationMs: 0,
      timestamp: new Date(),
      fallbackUsed: fallback ? fallback.name : null,
      response: fallback ? fallback.value : null
    };
    recentExecutions.unshift(execution);
    if (recentExecutions.length > 500) recentExecutions.pop();
    return res.status(503).json({
      outcome: 'rejected',
      breakerState: breaker.state,
      fallbackUsed: execution.fallbackUsed,
      response: execution.response,
      message: 'Circuit breaker is OPEN — request rejected without calling upstream'
    });
  }

  try {
    const upstreamResult = await callUpstream(breaker.targetUrl, req.body?.payload, breaker.timeoutMs);
    breaker.recordOutcome('success');
    breaker.lastError = null;
    const execution = {
      id: uuidv4(),
      breakerName: breaker.name,
      outcome: 'success',
      durationMs: Date.now() - start,
      timestamp: new Date(),
      upstreamStatus: upstreamResult.status
    };
    recentExecutions.unshift(execution);
    if (recentExecutions.length > 500) recentExecutions.pop();
    return res.json({
      outcome: 'success',
      breakerState: breaker.state,
      upstreamStatus: upstreamResult.status,
      durationMs: execution.durationMs,
      response: upstreamResult.body
    });
  } catch (err) {
    const isTimeout = err.message && err.message.toLowerCase().includes('timeout');
    breaker.recordOutcome(isTimeout ? 'timeout' : 'failure');
    breaker.lastError = err.message;
    const fallback = breaker.fallbackName ? fallbacks.get(breaker.fallbackName) : null;
    breaker.stats.fallbackHits += 1;
    const execution = {
      id: uuidv4(),
      breakerName: breaker.name,
      outcome: isTimeout ? 'timeout' : 'failure',
      durationMs: Date.now() - start,
      timestamp: new Date(),
      error: err.message,
      fallbackUsed: fallback ? fallback.name : null
    };
    recentExecutions.unshift(execution);
    if (recentExecutions.length > 500) recentExecutions.pop();
    return res.status(isTimeout ? 504 : 502).json({
      outcome: isTimeout ? 'timeout' : 'failure',
      breakerState: breaker.state,
      error: err.message,
      fallbackUsed: execution.fallbackUsed,
      response: fallback ? fallback.value : null,
      message: 'Upstream call failed — fallback returned'
    });
  }
});

app.get('/api/execute/:breakerName/stats', (req, res) => {
  const breakerName = req.params.breakerName;
  if (!breakers.has(breakerName)) return res.status(404).json({ error: 'BREAKER_NOT_FOUND' });
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
  const records = recentExecutions.filter(e => e.breakerName === breakerName).slice(0, limit);
  res.json({ breakerName, count: records.length, executions: records });
});

// ----- Fallback CRUD -----

app.post('/api/fallbacks',requireAuth,  (req, res) => {
  const { name, value, description, tags } = req.body || {};
  if (!name || value === undefined) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'name and value required' });
  if (fallbacks.has(name)) return res.status(409).json({ error: 'FALLBACK_EXISTS' });

  const fb = {
    id: uuidv4(),
    name,
    value,
    description: description || '',
    tags: Array.isArray(tags) ? tags : [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  fallbacks.set(name, fb);
  res.status(201).json({ message: 'Fallback created', fallback: fb });
});

app.get('/api/fallbacks', (_req, res) => {
  res.json({ count: fallbacks.size, fallbacks: Array.from(fallbacks.values()) });
});

app.get('/api/fallbacks/:name', (req, res) => {
  const fb = fallbacks.get(req.params.name);
  if (!fb) return res.status(404).json({ error: 'FALLBACK_NOT_FOUND' });
  res.json(fb);
});

app.delete('/api/fallbacks/:name',requireAuth,  (req, res) => {
  if (!fallbacks.has(req.params.name)) return res.status(404).json({ error: 'FALLBACK_NOT_FOUND' });
  fallbacks.delete(req.params.name);
  res.json({ message: 'Fallback deleted', fallbackName: req.params.name });
});

// ----- Status & audit -----

app.get('/api/status', (_req, res) => {
  const states = { CLOSED: 0, OPEN: 0, HALF_OPEN: 0 };
  let totalCalls = 0, totalFallbacks = 0, totalRejections = 0;
  for (const b of breakers.values()) {
    states[b.state] += 1;
    totalCalls += b.stats.totalCalls;
    totalFallbacks += b.stats.fallbackHits;
    totalRejections += b.stats.rejected;
  }
  res.json({
    breakers: breakers.size,
    states,
    fallbacks: fallbacks.size,
    totalCalls,
    totalFallbacks,
    totalRejections,
    fallbackHitRate: totalCalls > 0 ? Number((totalFallbacks / (totalCalls + totalRejections)).toFixed(4)) : 0,
    auditEntries: auditLog.length,
    recentExecutions: recentExecutions.length
  });
});

app.get('/api/audit', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
  const type = req.query.type;
  let entries = auditLog.slice();
  if (type) entries = entries.filter(e => e.type === type);
  entries.reverse();
  res.json({ count: entries.length, entries: entries.slice(0, limit) });
});

app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` }));
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});

// ============================================================
// Pre-seeded data
// ============================================================

function seed() {
  // Example fallbacks
  fallbacks.set('sentiment-default', {
    id: uuidv4(),
    name: 'sentiment-default',
    value: { score: 0.5, label: 'neutral', confidence: 0.3, source: 'micro-intelligence-fallback' },
    description: 'Default sentiment response when central HOJAI is unavailable',
    tags: ['sentiment', 'nlp'],
    createdAt: new Date(),
    updatedAt: new Date()
  });
  fallbacks.set('intent-default', {
    id: uuidv4(),
    name: 'intent-default',
    value: { intent: 'unknown', confidence: 0.0, candidates: [], source: 'micro-intelligence-fallback' },
    description: 'Default intent response when central HOJAI is unavailable',
    tags: ['intent', 'nlp'],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Example breaker (uses HOJAI Intelligence port; configured but not started yet)
  const hojaiBreaker = new Breaker({
    name: 'hojai-central',
    targetUrl: 'http://localhost:4881/api/intelligence/analyze',
    failureThreshold: 3,
    successThreshold: 2,
    timeoutMs: 3000,
    resetTimeoutMs: 30000,
    fallbackName: 'sentiment-default',
    windowSize: 10
  });
  breakers.set('hojai-central', hojaiBreaker);

  // Example breaker for Memory OS
  const memoryBreaker = new Breaker({
    name: 'memory-os-fallback',
    targetUrl: 'http://localhost:4703/api/memory/search',
    failureThreshold: 5,
    successThreshold: 2,
    timeoutMs: 5000,
    resetTimeoutMs: 60000,
    fallbackName: null,
    windowSize: 15
  });
  breakers.set('memory-os-fallback', memoryBreaker);

  console.log(`[${SERVICE_NAME}] Seeded ${breakers.size} breakers and ${fallbacks.size} fallbacks`);
}

seed();
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] Listening on port ${PORT}`);
  console.log(`[${SERVICE_NAME}] Health: http://localhost:${PORT}/health`);
  console.log(`[${SERVICE_NAME}] Version ${VERSION}`);
});
installGracefulShutdown(server);

module.exports = { app, Breaker };
