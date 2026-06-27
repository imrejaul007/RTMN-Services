/**
 * Dependency Graph (port 5361) — Phase 14.2
 *
 * Stores task dependency graphs (DAGs) and answers graph queries:
 *   - topological sort (linear execution order)
 *   - parallel-ready batches (waves of tasks that can run concurrently)
 *   - cycle detection
 *   - downstream/upstream traversal
 *   - critical path
 *
 * Endpoints:
 *   POST /api/graphs                       — create a graph from {goalId, tasks}
 *   GET  /api/graphs/:id                   — fetch a graph
 *   GET  /api/graphs                       — list recent graphs
 *   POST /api/graphs/:id/topological       — get linear execution order
 *   POST /api/graphs/:id/parallel-batches  — get parallel-ready waves
 *   POST /api/graphs/:id/critical-path     — get critical path
 *   POST /api/graphs/:id/validate          — re-validate the graph
 *   POST /api/graphs/:id/mark              — mark a task as done/failed (advances state)
 *   GET  /api/graphs/:id/ready             — get tasks whose deps are all done
 *   DELETE /api/graphs/:id                 — remove a graph
 *
 * State is persisted to data/graphs.json so the engine survives restarts.
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

const PORT = parseInt(process.env.PORT, 10) || 5361;
const SERVICE_NAME = 'dependency-graph';
const VERSION = '1.0.0';
const DATA_DIR = process.env.DEPENDENCY_GRAPH_DATA_DIR || path.join(__dirname, '../data');

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { /* ignore */ } }
function storePath() { return path.join(DATA_DIR, 'graphs.json'); }

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

const graphs = loadStore();

// ---------------------------------------------------------------------------
// Pure graph algorithms (also exported for unit tests)
// ---------------------------------------------------------------------------

function validateDag(tasks) {
  const errors = [];
  if (!Array.isArray(tasks) || tasks.length === 0) {
    errors.push('tasks must be a non-empty array');
    return { valid: false, errors };
  }
  const ids = new Set();
  for (const t of tasks) {
    if (!t || !t.id) { errors.push('task missing id'); continue; }
    if (ids.has(t.id)) errors.push(`duplicate id ${t.id}`);
    ids.add(t.id);
  }
  for (const t of tasks) {
    if (!t) continue;
    const deps = Array.isArray(t.dependsOn) ? t.dependsOn : [];
    if (t.dependsOn !== undefined && !Array.isArray(t.dependsOn)) {
      errors.push(`task ${t.id} dependsOn must be array`);
      continue;
    }
    for (const dep of deps) {
      if (dep === t.id) errors.push(`task ${t.id} depends on itself`);
      if (!ids.has(dep)) errors.push(`task ${t.id} depends on missing task ${dep}`);
    }
  }
  if (errors.length === 0 && hasCycle(tasks)) errors.push('cycle detected');
  return { valid: errors.length === 0, errors };
}

function hasCycle(tasks) {
  // White=0, Gray=1, Black=2 DFS coloring
  const color = new Map(tasks.map((t) => [t.id, 0]));
  const adj = new Map(tasks.map((t) => [t.id, (t.dependsOn || [])]));
  function dfs(id) {
    color.set(id, 1);
    for (const dep of adj.get(id) || []) {
      if (!color.has(dep)) continue; // missing dep, ignore
      if (color.get(dep) === 1) return true;
      if (color.get(dep) === 0 && dfs(dep)) return true;
    }
    color.set(id, 2);
    return false;
  }
  for (const t of tasks) {
    if (color.get(t.id) === 0 && dfs(t.id)) return true;
  }
  return false;
}

function topologicalSort(tasks) {
  // Kahn's algorithm: produce one valid linear order
  const indeg = new Map();
  const adj = new Map();
  for (const t of tasks) {
    indeg.set(t.id, (t.dependsOn || []).length);
    adj.set(t.id, []);
  }
  for (const t of tasks) {
    for (const dep of t.dependsOn || []) {
      if (adj.has(dep)) adj.get(dep).push(t.id);
    }
  }
  const queue = [];
  for (const [id, deg] of indeg.entries()) if (deg === 0) queue.push(id);
  const order = [];
  while (queue.length > 0) {
    // Stable sort by id for determinism
    queue.sort();
    const id = queue.shift();
    order.push(id);
    for (const next of adj.get(id) || []) {
      indeg.set(next, indeg.get(next) - 1);
      if (indeg.get(next) === 0) queue.push(next);
    }
  }
  return order;
}

function parallelBatches(tasks) {
  // Produce waves: each wave contains tasks whose dependencies are all in earlier waves
  // (or done, if marked). Useful for parallel execution.
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const completed = new Set();
  const batches = [];
  let remaining = tasks.slice();
  while (remaining.length > 0) {
    const batch = remaining.filter((t) => (t.dependsOn || []).every((d) => completed.has(d)));
    if (batch.length === 0) {
      // Should not happen if validated DAG, but guard against infinite loop
      throw new Error('cycle or missing dependency detected while batching');
    }
    batch.sort((a, b) => a.id.localeCompare(b.id));
    batches.push(batch.map((t) => t.id));
    for (const t of batch) completed.add(t.id);
    remaining = remaining.filter((t) => !completed.has(t.id));
  }
  return batches;
}

function criticalPath(tasks) {
  // Longest path by durationMin, considering dependencies.
  // Returns { path: [ids], durationMin }.
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const order = topologicalSort(tasks);
  const dur = new Map();
  const prev = new Map();
  for (const id of order) {
    const t = byId.get(id);
    dur.set(id, t.durationMin || 0);
    prev.set(id, null);
    for (const dep of t.dependsOn || []) {
      if (!dur.has(dep)) continue;
      const candidate = (dur.get(dep) || 0) + (t.durationMin || 0);
      if (candidate > (dur.get(id) || 0)) {
        dur.set(id, candidate);
        prev.set(id, dep);
      }
    }
  }
  // Find the end of the longest path
  let end = null;
  let bestDur = -1;
  for (const [id, d] of dur.entries()) {
    if (d > bestDur) { bestDur = d; end = id; }
  }
  // Walk backwards
  const path = [];
  let cur = end;
  while (cur) {
    path.unshift(cur);
    cur = prev.get(cur);
  }
  return { path, durationMin: bestDur };
}

function readyTasks(graph) {
  // Tasks whose dependencies are all in 'done' state
  return graph.tasks.filter((t) =>
    t.status !== 'done' &&
    t.status !== 'failed' &&
    (t.dependsOn || []).every((d) => {
      const dep = graph.tasks.find((x) => x.id === d);
      return dep && dep.status === 'done';
    })
  ).map((t) => t.id);
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
    status: 'healthy',
    service: SERVICE_NAME,
    version: VERSION,
    port: PORT,
    uptimeSec: Math.round(process.uptime()),
    stats: { graphs: graphs.size },
    timestamp: new Date().toISOString()
  });
});
app.get('/ready', (_req, res) => res.json({ ready: true, ts: new Date().toISOString() }));

// ---- Create graph ----
app.post('/api/graphs', requireInternal, (req, res) => {
  const { goalId, tasks } = req.body || {};
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'tasks array required' });
  }
  const validation = validateDag(tasks);
  if (!validation.valid) {
    return res.status(400).json({ error: 'INVALID_DAG', errors: validation.errors });
  }
  const id = goalId || crypto.randomUUID();
  const graph = {
    id,
    goalId: id,
    tasks: tasks.map((t) => ({ ...t, status: 'pending', startedAt: null, completedAt: null, result: null })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  graphs.set(id, graph);
  saveStore(graphs);
  res.status(201).json(graph);
});

app.get('/api/graphs', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
  const all = Array.from(graphs.values()).slice(-limit);
  res.json({ count: all.length, graphs: all.map((g) => ({ id: g.id, taskCount: g.tasks.length, createdAt: g.createdAt, updatedAt: g.updatedAt })) });
});

app.get('/api/graphs/:id', (req, res) => {
  const g = graphs.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(g);
});

app.delete('/api/graphs/:id', requireInternal, (req, res) => {
  const existed = graphs.delete(req.params.id);
  if (!existed) return res.status(404).json({ error: 'NOT_FOUND' });
  saveStore(graphs);
  res.json({ deleted: req.params.id });
});

// ---- Graph algorithms ----

app.post('/api/graphs/:id/topological', requireInternal, (req, res) => {
  const g = graphs.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json({ id: g.id, order: topologicalSort(g.tasks) });
});

app.post('/api/graphs/:id/parallel-batches', requireInternal, (req, res) => {
  const g = graphs.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'NOT_FOUND' });
  try {
    const batches = parallelBatches(g.tasks);
    res.json({ id: g.id, batches, batchCount: batches.length });
  } catch (e) {
    res.status(400).json({ error: 'INVALID_DAG', message: e.message });
  }
});

app.post('/api/graphs/:id/critical-path', requireInternal, (req, res) => {
  const g = graphs.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'NOT_FOUND' });
  const result = criticalPath(g.tasks);
  res.json({ id: g.id, ...result, tasks: result.path.map((id) => g.tasks.find((t) => t.id === id)) });
});

app.post('/api/graphs/:id/validate', requireInternal, (req, res) => {
  const g = graphs.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'NOT_FOUND' });
  const result = validateDag(g.tasks);
  res.status(result.valid ? 200 : 400).json(result);
});

app.get('/api/graphs/:id/ready', (req, res) => {
  const g = graphs.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json({ id: g.id, ready: readyTasks(g) });
});

// ---- Mark task state ----
app.post('/api/graphs/:id/mark', requireInternal, (req, res) => {
  const g = graphs.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'NOT_FOUND' });
  const { taskId, status, result } = req.body || {};
  if (!taskId) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'taskId required' });
  const validStatuses = ['pending', 'in_progress', 'done', 'failed', 'skipped'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: `status must be one of: ${validStatuses.join(', ')}` });
  }
  const task = g.tasks.find((t) => t.id === taskId);
  if (!task) return res.status(404).json({ error: 'TASK_NOT_FOUND', message: `task ${taskId} not in graph` });
  task.status = status;
  task.result = result !== undefined ? result : task.result;
  task.startedAt = status === 'in_progress' && !task.startedAt ? new Date().toISOString() : task.startedAt;
  task.completedAt = (status === 'done' || status === 'failed' || status === 'skipped') ? new Date().toISOString() : task.completedAt;
  g.updatedAt = new Date().toISOString();
  graphs.set(g.id, g);
  saveStore(graphs);
  res.json({ id: g.id, taskId, status, ready: readyTasks(g) });
});

// 404 + error handlers
app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
app.use((err, _req, res, _next) => {
  console.error(`[${SERVICE_NAME}] unhandled error:`, err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});

// ---------------------------------------------------------------------------
// Exports + start
// ---------------------------------------------------------------------------

module.exports = { app, validateDag, hasCycle, topologicalSort, parallelBatches, criticalPath, readyTasks, graphs };

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
