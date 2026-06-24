/**
 * Dynamic Replanner (port 5365) — Phase 14.6
 *
 * Adapts an in-flight plan when conditions change. The execution-engine calls
 * this service whenever a task completes (so we can re-evaluate the remaining plan)
 * or when external signals arrive (budget tightening, deadline approaching, etc.).
 *
 * Inputs:
 *   POST /api/replan { graphId, signal: { type: 'budget_tightened'|'deadline_approaching'|'task_failed'|'priority_changed', ... }, options: { newBudget?, newDeadline?, newPriorities? } }
 *
 * Output:
 *   { actions: [{ type: 'reprioritize'|'skip'|'parallelize'|'relax_constraint', taskIds, ... }], reason, projectedDuration, projectedCost }
 *
 * Strategies:
 *   - reprioritize:   reorder tasks (within their dependency wave) so high-priority tasks run first
 *   - skip:           mark non-critical tasks as 'optional' so execution-engine can skip them under budget pressure
 *   - parallelize:    identify tasks within a wave that have no cross-dependencies and can run truly concurrently
 *   - relax_constraint: drop soft constraints (e.g. "verify X before Y" → "best-effort verify")
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

const PORT = parseInt(process.env.PORT, 10) || 5365;
const SERVICE_NAME = 'dynamic-replanner';
const VERSION = '1.0.0';
const DEPENDENCY_GRAPH_URL = process.env.DEPENDENCY_GRAPH_URL || 'http://localhost:5361';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const DATA_DIR = process.env.DYNAMIC_REPLANNER_DATA_DIR || path.join(__dirname, '../data');

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { /* ignore */ } }
function storePath() { return path.join(DATA_DIR, 'replans.json'); }

function loadStore() {
  try {
    if (!fs.existsSync(storePath())) return [];
    return JSON.parse(fs.readFileSync(storePath(), 'utf8'));
  } catch { return []; }
}
function saveStore(arr) {
  try {
    ensureDir();
    fs.writeFileSync(storePath(), JSON.stringify(arr, null, 2));
  } catch (e) { console.warn(`[${SERVICE_NAME}] save failed: ${e.message}`); }
}

const replans = loadStore();

// ---------------------------------------------------------------------------
// HTTP client to dependency-graph
// ---------------------------------------------------------------------------

async function dg(method, path_, body) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 5000);
  try {
    const r = await fetch(`${DEPENDENCY_GRAPH_URL}${path_}`, {
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
// Replan algorithms (pure, exported for testing)
// ---------------------------------------------------------------------------

function topoByPriority(tasks) {
  // Topological sort, but within a wave, order by priority (high > normal > low),
  // then by id for stability.
  const order = [];
  const remaining = tasks.slice();
  const completed = new Set();
  const prio = { high: 0, normal: 1, low: 2 };
  while (remaining.length > 0) {
    const wave = remaining.filter((t) => (t.dependsOn || []).every((d) => completed.has(d)));
    if (wave.length === 0) break;
    wave.sort((a, b) => {
      const pa = prio[a.priority] ?? 1;
      const pb = prio[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;
      return a.id.localeCompare(b.id);
    });
    for (const t of wave) {
      order.push(t.id);
      completed.add(t.id);
    }
    const remaining2 = remaining.filter((t) => !completed.has(t.id));
    remaining.length = 0;
    remaining.push(...remaining2);
  }
  return order;
}

function identifyOptionalTasks(tasks, budgetPressure) {
  // When budgetPressure > 0, mark low-priority + non-critical-path tasks as optional.
  // 'critical path' = tasks on the longest-duration path.
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
  // Longest path (by durationMin) for critical path identification
  const topo = [];
  const queue = [];
  for (const [id, deg] of indeg.entries()) if (deg === 0) queue.push(id);
  const visited = new Set();
  while (queue.length > 0) {
    queue.sort();
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    topo.push(id);
    for (const next of adj.get(id) || []) {
      indeg.set(next, indeg.get(next) - 1);
      if (indeg.get(next) === 0) queue.push(next);
    }
  }
  // longest duration ending at each node
  const dur = new Map();
  const prev = new Map();
  for (const id of topo) {
    const t = tasks.find((x) => x.id === id);
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
  let end = null, best = -1;
  for (const [id, d] of dur.entries()) if (d > best) { best = d; end = id; }
  const critical = new Set();
  let cur = end;
  while (cur) { critical.add(cur); cur = prev.get(cur); }

  // Optional: low priority AND not on critical path
  const optional = tasks
    .filter((t) => t.priority === 'low' && !critical.has(t.id))
    .map((t) => t.id);

  // When budget pressure is high, also mark 'normal' priority non-critical
  if (budgetPressure >= 0.5) {
    tasks
      .filter((t) => t.priority === 'normal' && !critical.has(t.id))
      .forEach((t) => optional.push(t.id));
  }
  return { optional: Array.from(new Set(optional)), criticalPath: Array.from(critical), criticalDurationMin: best };
}

function planReplan({ tasks, signal, options = {} }) {
  const actions = [];

  if (!tasks || tasks.length === 0) {
    return { actions, reason: 'no-tasks', projectedDuration: 0 };
  }

  // Always include a priority re-ordering so the response is actionable.
  const priorityOrder = topoByPriority(tasks);
  const currentOrder = tasks.map((t) => t.id);
  const orderChanged = priorityOrder.some((id, i) => id !== currentOrder[i]);
  if (orderChanged) {
    actions.push({
      type: 'reprioritize',
      taskIds: priorityOrder,
      reason: 'reorder-by-priority-within-deps'
    });
  }

  // Signal-specific actions
  switch (signal?.type) {
    case 'budget_tightened': {
      const pressure = signal.budgetPressure ?? 0.5;
      const { optional, criticalPath, criticalDurationMin } = identifyOptionalTasks(tasks, pressure);
      if (optional.length > 0) {
        actions.push({
          type: 'skip',
          taskIds: optional,
          reason: `budget-tightened-pressure-${pressure}`,
          savings: optional.reduce((s, id) => {
            const t = tasks.find((x) => x.id === id);
            return s + (t?.durationMin || 0);
          }, 0)
        });
      }
      return { actions, reason: 'budget-tightened', criticalPath, projectedDuration: criticalDurationMin };
    }
    case 'deadline_approaching': {
      // Drop optional tasks to fit within newDeadline
      const newDeadlineMin = signal.deadlineMin || options.newDeadline;
      const { optional, criticalPath, criticalDurationMin } = identifyOptionalTasks(tasks, 0.5);
      const currentTotal = tasks.reduce((s, t) => s + (t.durationMin || 0), 0);
      let projected = currentTotal;
      const toDrop = [];
      for (const id of optional) {
        if (projected <= (newDeadlineMin || projected)) break;
        const t = tasks.find((x) => x.id === id);
        projected -= (t?.durationMin || 0);
        toDrop.push(id);
      }
      if (toDrop.length > 0) {
        actions.push({
          type: 'skip',
          taskIds: toDrop,
          reason: `deadline-approaching-target-${newDeadlineMin}min`,
          projectedDuration: projected
        });
      }
      return { actions, reason: 'deadline-approaching', criticalPath, projectedDuration: projected };
    }
    case 'priority_changed': {
      const newPriorities = signal.priorities || options.newPriorities || {};
      const updated = tasks
        .filter((t) => newPriorities[t.id] && newPriorities[t.id] !== t.priority)
        .map((t) => ({ taskId: t.id, oldPriority: t.priority, newPriority: newPriorities[t.id] }));
      if (updated.length > 0) {
        actions.push({
          type: 'reprioritize',
          updates: updated,
          reason: 'priority-signals-changed',
          taskIds: topoByPriority(tasks.map((t) => ({ ...t, priority: newPriorities[t.id] || t.priority })))
        });
      }
      return { actions, reason: 'priority-changed' };
    }
    case 'task_failed': {
      const failedId = signal.taskId;
      if (failedId) {
        const downstream = [];
        const queue = [failedId];
        const visited = new Set();
        while (queue.length) {
          const id = queue.shift();
          for (const t of tasks) {
            if ((t.dependsOn || []).includes(id) && !visited.has(t.id)) {
              visited.add(t.id);
              downstream.push(t.id);
              queue.push(t.id);
            }
          }
        }
        if (downstream.length > 0) {
          actions.push({
            type: 'relax_constraint',
            taskIds: downstream,
            reason: 'upstream-failed-mark-downstream-best-effort',
            bestEffort: true
          });
        }
      }
      return { actions, reason: 'task-failed' };
    }
    default: {
      // No specific signal — just provide a fresh priority-ordered execution plan.
      return { actions, reason: 'baseline-replan', projectedDuration: tasks.reduce((s, t) => s + (t.durationMin || 0), 0) };
    }
  }
}

async function applyReplan(graphId, plan) {
  // For now, actions are returned for the execution-engine to consume. Future:
  // - 'skip' → call dependency-graph /mark with status 'skipped'
  // - 'reprioritize' → store new priorities in graph metadata
  // We just record the plan for audit.
  const record = {
    planId: crypto.randomUUID(),
    graphId,
    plan,
    createdAt: new Date().toISOString()
  };
  replans.push(record);
  if (replans.length > 1000) replans.shift();
  saveStore(replans);
  return record;
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
    stats: { replans: replans.length },
    timestamp: new Date().toISOString()
  });
});
app.get('/ready', (_req, res) => res.json({ ready: true, ts: new Date().toISOString() }));

// Decide replan strategy
app.post('/api/replan', async (req, res) => {
  const { graphId, signal, options } = req.body || {};
  if (!graphId) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'graphId required' });
  const graphRes = await dg('GET', `/api/graphs/${encodeURIComponent(graphId)}`);
  if (!graphRes.ok) return res.status(404).json({ error: 'GRAPH_NOT_FOUND' });
  const tasks = graphRes.body.tasks || [];
  const plan = planReplan({ tasks, signal, options: options || {} });
  res.json(plan);
});

// Record a replan
app.post('/api/replans', async (req, res) => {
  const { graphId, signal, options } = req.body || {};
  if (!graphId) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'graphId required' });
  const graphRes = await dg('GET', `/api/graphs/${encodeURIComponent(graphId)}`);
  if (!graphRes.ok) return res.status(404).json({ error: 'GRAPH_NOT_FOUND' });
  const tasks = graphRes.body.tasks || [];
  const plan = planReplan({ tasks, signal, options: options || {} });
  const record = await applyReplan(graphId, plan);
  res.status(201).json(record);
});

app.get('/api/replans', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
  res.json({ count: replans.length, replans: replans.slice(-limit) });
});

app.get('/api/replans/:planId', (req, res) => {
  const r = replans.find((x) => x.planId === req.params.planId);
  if (!r) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(r);
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

module.exports = { app, planReplan, topoByPriority, identifyOptionalTasks, replans };

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
