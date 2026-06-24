/**
 * Execution Engine (port 5362) — Phase 14.3
 *
 * Executes a task dependency graph by:
 *   1. Asking dependency-graph for parallel-ready batches (waves).
 *   2. Running each wave's tasks concurrently, up to a configurable concurrency cap.
 *   3. Marking each task done/failed on dependency-graph.
 *   4. Calling handlers (HTTP webhook, local function by name) for each task.
 *   5. Surfacing failures — does NOT auto-retry; that's retry-planner's job (Phase 14.4).
 *
 * Each execution is a run: { runId, graphId, status, batches, results, startedAt, completedAt }
 *
 * Inputs:
 *   POST /api/runs { graphId, handlers: { taskId: {type:'webhook', url, method?, headers?, body?} } , concurrency?, failFast? }
 *
 * Output:
 *   { runId, graphId, status: 'running'|'completed'|'failed', results, durationMs, batchCount }
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// ---------------------------------------------------------------------------
// Config + persistence
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT, 10) || 5362;
const SERVICE_NAME = 'execution-engine';
const VERSION = '1.0.0';
const DEPENDENCY_GRAPH_URL = process.env.DEPENDENCY_GRAPH_URL || 'http://localhost:5361';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const DEFAULT_CONCURRENCY = parseInt(process.env.EXECUTION_CONCURRENCY, 10) || 4;
const DATA_DIR = process.env.EXECUTION_ENGINE_DATA_DIR || path.join(__dirname, '../data');

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { /* ignore */ } }
function storePath() { return path.join(DATA_DIR, 'runs.json'); }

function loadStore() {
  try {
    if (!fs.existsSync(storePath())) return new Map();
    return new Map(Object.entries(JSON.parse(fs.readFileSync(storePath(), 'utf8'))));
  } catch { return new Map(); }
}
function saveStore(map) {
  try {
    ensureDir();
    fs.writeFileSync(storePath(), JSON.stringify(Object.fromEntries(map), null, 2));
  } catch (e) { console.warn(`[${SERVICE_NAME}] save failed: ${e.message}`); }
}

const runs = loadStore();

// ---------------------------------------------------------------------------
// HTTP client to dependency-graph
// ---------------------------------------------------------------------------

async function dg(method, path_, body) {
  const url = `${DEPENDENCY_GRAPH_URL}${path_}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 5000);
  try {
    const r = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(INTERNAL_SERVICE_TOKEN ? { 'X-Internal-Token': INTERNAL_SERVICE_TOKEN } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await r.text();
    let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
    return { ok: r.ok, status: r.status, body: parsed };
  } catch (e) {
    return { ok: false, status: 0, error: e.name === 'AbortError' ? 'timeout' : e.message };
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------------------
// Task handler dispatch
// ---------------------------------------------------------------------------

async function runHandler(handler, task, ctx) {
  if (!handler || !handler.type) {
    // No handler → no-op success (for testing or when caller will run separately)
    return { ok: true, skipped: true, reason: 'no handler' };
  }
  if (handler.type === 'webhook') {
    const url = handler.url;
    if (!url) return { ok: false, error: 'webhook handler missing url' };
    const method = (handler.method || 'POST').toUpperCase();
    const headers = { 'Content-Type': 'application/json', ...(handler.headers || {}) };
    if (INTERNAL_SERVICE_TOKEN && !headers['X-Internal-Token']) headers['X-Internal-Token'] = INTERNAL_SERVICE_TOKEN;
    const body = handler.body || { task, ctx };
    const controller = new AbortController();
    const timeoutMs = handler.timeoutMs || 30000;
    const to = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const r = await fetch(url, { method, headers, body: JSON.stringify(body), signal: controller.signal });
      const text = await r.text();
      let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
      return { ok: r.ok, status: r.status, body: parsed };
    } catch (e) {
      return { ok: false, error: e.name === 'AbortError' ? 'timeout' : e.message };
    } finally {
      clearTimeout(to);
    }
  }
  if (handler.type === 'echo') {
    return { ok: true, echoed: { task, ctx } };
  }
  if (handler.type === 'sleep') {
    const ms = handler.ms || 100;
    await new Promise((r) => setTimeout(r, ms));
    return { ok: true, sleptMs: ms };
  }
  if (handler.type === 'fail') {
    return { ok: false, error: handler.error || 'handler forced failure' };
  }
  return { ok: false, error: `unknown handler type: ${handler.type}` };
}

// ---------------------------------------------------------------------------
// Concurrency-limited parallel runner
// ---------------------------------------------------------------------------

async function runWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Execute a graph end-to-end
// ---------------------------------------------------------------------------

async function executeGraph(opts) {
  const { graphId, handlers = {}, concurrency = DEFAULT_CONCURRENCY, failFast = true } = opts;
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const run = {
    runId,
    graphId,
    status: 'running',
    concurrency,
    failFast,
    startedAt,
    completedAt: null,
    durationMs: null,
    batches: [],
    results: {},
    error: null,
  };
  runs.set(runId, run);
  saveStore(runs);

  // Fetch the graph state from dependency-graph
  const graphFetch = await dg('GET', `/api/graphs/${encodeURIComponent(graphId)}`);
  if (!graphFetch.ok) {
    run.status = 'failed';
    run.error = `graph not found: ${graphFetch.status}`;
    run.completedAt = new Date().toISOString();
    run.durationMs = Date.now() - new Date(startedAt).getTime();
    saveStore(runs);
    return run;
  }
  const graph = graphFetch.body;
  const batches = graph.tasks.reduce((acc, t) => {
    // Recompute parallel batches from tasks; we don't trust /parallel-batches endpoint
    // because state may have changed. Simpler: sort by dependency depth.
    return acc;
  }, []);

  // Compute parallel batches via dependency-graph
  const batchRes = await dg('POST', `/api/graphs/${encodeURIComponent(graphId)}/parallel-batches`);
  if (!batchRes.ok) {
    run.status = 'failed';
    run.error = `failed to compute batches: ${batchRes.status}`;
    run.completedAt = new Date().toISOString();
    run.durationMs = Date.now() - new Date(startedAt).getTime();
    saveStore(runs);
    return run;
  }
  const waves = batchRes.body.batches;

  for (let w = 0; w < waves.length; w++) {
    const waveIds = waves[w];
    const batchRecord = { index: w, taskIds: waveIds, startedAt: null, completedAt: null, status: 'running', results: {} };
    run.batches.push(batchRecord);
    batchRecord.startedAt = new Date().toISOString();

    const results = await runWithConcurrency(waveIds, concurrency, async (taskId) => {
      const task = graph.tasks.find((t) => t.id === taskId);
      if (!task) return { taskId, ok: false, error: 'task missing from graph' };
      // Skip tasks already done
      if (task.status === 'done') return { taskId, ok: true, skipped: true };
      // Mark in-progress on dependency-graph
      await dg('POST', `/api/graphs/${encodeURIComponent(graphId)}/mark`, { taskId, status: 'in_progress' });
      const result = await runHandler(handlers[taskId], task, { graphId, runId, wave: w });
      // Update dependency-graph state
      const status = result.ok ? 'done' : 'failed';
      await dg('POST', `/api/graphs/${encodeURIComponent(graphId)}/mark`, { taskId, status, result });
      return { taskId, ...result };
    });

    for (const r of results) {
      batchRecord.results[r.taskId] = r;
      run.results[r.taskId] = r;
    }
    batchRecord.completedAt = new Date().toISOString();
    batchRecord.status = Object.values(batchRecord.results).every((r) => r.ok || r.skipped) ? 'completed' : 'failed';
    saveStore(runs);

    if (failFast && batchRecord.status === 'failed') {
      run.status = 'failed';
      run.error = `batch ${w} failed`;
      run.completedAt = new Date().toISOString();
      run.durationMs = Date.now() - new Date(startedAt).getTime();
      saveStore(runs);
      return run;
    }
  }

  run.status = 'completed';
  run.completedAt = new Date().toISOString();
  run.durationMs = Date.now() - new Date(startedAt).getTime();
  saveStore(runs);
  return run;
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
    status: 'healthy',
    service: SERVICE_NAME,
    version: VERSION,
    port: PORT,
    uptimeSec: Math.round(process.uptime()),
    stats: { runs: runs.size },
    dependencyGraphUrl: DEPENDENCY_GRAPH_URL,
    timestamp: new Date().toISOString()
  });
});
app.get('/ready', (_req, res) => res.json({ ready: true, ts: new Date().toISOString() }));

app.post('/api/runs', async (req, res, next) => {
  try {
    const { graphId, handlers, concurrency, failFast } = req.body || {};
    if (!graphId) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'graphId required' });
    const run = await executeGraph({ graphId, handlers: handlers || {}, concurrency, failFast });
    res.status(run.status === 'failed' && run.error === 'graph not found' ? 404 : 201).json(run);
  } catch (err) { next(err); }
});

app.get('/api/runs/:runId', (req, res) => {
  const r = runs.get(req.params.runId);
  if (!r) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(r);
});

app.get('/api/runs', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
  const all = Array.from(runs.values()).slice(-limit);
  res.json({ count: all.length, runs: all });
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

module.exports = { app, executeGraph, runHandler, runWithConcurrency, runs };

if (require.main === module) {
  ensureDir();
  const server = app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] listening on :${PORT} (dependency-graph: ${DEPENDENCY_GRAPH_URL})`);
  });
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      console.log(`[${SERVICE_NAME}] received ${sig}, shutting down`);
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 5000).unref();
    });
  }
}
