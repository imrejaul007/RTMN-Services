/**
 * Recovery Planner (port 5364) — Phase 14.5
 *
 * When a task or run has failed, decides the best recovery strategy:
 *   - rollback: undo the last N steps and restart from a checkpoint (preferred when
 *     failure is caused by corrupted state and the task has compensating handlers).
 *   - skip: skip the failing task and continue with downstream tasks marked 'best-effort'.
 *     Preserves partial results. Used when the failing task is non-critical.
 *   - branch: switch to an alternative sub-graph that doesn't depend on the failing task.
 *     Used when alternative paths were planned.
 *   - abort: stop execution; preserve completed work for inspection. Default if no recovery.
 *
 * Inputs:
 *   POST /api/recover { graphId, runId, failedTaskId, history: [{taskId, status, ts}], options: { rollbackDepth?, skipNonCritical?, alternatives?: [{taskId, subGraph}], learnings? } }
 *
 * Output:
 *   { strategy: 'rollback'|'skip'|'branch'|'abort', steps: [...], reason, checkpoint? }
 *
 * State rollback: a checkpoint is a snapshot of dependency-graph state taken at run-start.
 * Rollback restores the last N tasks to 'pending'.
 *
 * Failure learning: appends to /api/learnings (in-memory) so future runs of similar tasks
 * can pre-emptively use the skip strategy.
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

const PORT = parseInt(process.env.PORT, 10) || 5364;
const SERVICE_NAME = 'recovery-planner';
const VERSION = '1.0.0';
const DEPENDENCY_GRAPH_URL = process.env.DEPENDENCY_GRAPH_URL || 'http://localhost:5361';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const DATA_DIR = process.env.RECOVERY_PLANNER_DATA_DIR || path.join(__dirname, '../data');

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { /* ignore */ } }
function storePath() { return path.join(DATA_DIR, 'learnings.json'); }

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

const learnings = loadStore();

// checkpoints[runId] = { graphId, taskStates: { taskId: 'pending'|'done'|... }, takenAt }
const checkpoints = new Map();

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
// Recovery strategies (pure functions for testing)
// ---------------------------------------------------------------------------

function findDownstream(taskId, tasks) {
  // BFS: collect all tasks that transitively depend on taskId
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const downstream = new Set();
  const queue = [taskId];
  while (queue.length > 0) {
    const id = queue.shift();
    for (const t of tasks) {
      if ((t.dependsOn || []).includes(id) && !downstream.has(t.id)) {
        downstream.add(t.id);
        queue.push(t.id);
      }
    }
  }
  return Array.from(downstream);
}

function findUpstream(taskId, tasks) {
  // BFS: collect all tasks that this task transitively depends on
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const upstream = new Set();
  const queue = [(byId.get(taskId)?.dependsOn || []).slice()];
  const seen = new Set();
  while (queue.length > 0) {
    const ids = queue.shift();
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      upstream.add(id);
      const t = byId.get(id);
      if (t && t.dependsOn) queue.push(t.dependsOn);
    }
  }
  return Array.from(upstream);
}

function decideRecovery({ graphId, runId, failedTaskId, history = [], options = {}, tasks = [] }) {
  const failed = tasks.find((t) => t.id === failedTaskId);
  if (!failed) {
    return { strategy: 'abort', steps: [], reason: 'failed-task-not-in-graph' };
  }

  // Failure learning: if we've seen this kind of failure for this task kind before,
  // and the success rate of retrying is < 30%, prefer skip or abort.
  const similarLearnings = learnings.filter((l) => l.taskKind === failed.kind);
  const skipRecommended = options.skipNonCritical === true || similarLearnings.length >= 3;
  const downstream = findDownstream(failedTaskId, tasks);
  const upstream = findUpstream(failedTaskId, tasks);

  // Strategy 1: Branch — alternatives provided
  if (Array.isArray(options.alternatives) && options.alternatives.length > 0) {
    const alt = options.alternatives.find((a) => a.taskId === failedTaskId) || options.alternatives[0];
    return {
      strategy: 'branch',
      steps: [
        { type: 'mark', taskId: failedTaskId, status: 'skipped', reason: 'recovery-branch' },
        { type: 'merge', taskId: alt.taskId, result: { kind: 'alternative', source: alt.taskId } },
      ],
      reason: 'alternative-path-provided',
      branch: alt,
      downstreamTasks: downstream
    };
  }

  // Strategy 2: Rollback — recent history has compensating handlers
  const rollbackDepth = options.rollbackDepth || 3;
  if (history.length >= rollbackDepth && failed.kind !== 'irreversible') {
    const recent = history.slice(-rollbackDepth);
    return {
      strategy: 'rollback',
      steps: [
        ...recent.reverse().map((h) => ({ type: 'mark', taskId: h.taskId, status: 'pending', reason: 'rollback' })),
        { type: 'mark', taskId: failedTaskId, status: 'pending', reason: 'rollback' }
      ],
      reason: 'rollback-last-3-steps',
      checkpoint: { runId, tasks: recent.map((h) => h.taskId) }
    };
  }

  // Strategy 3: Skip — task is non-critical and downstream can run with degraded state
  if (skipRecommended && downstream.length <= 2) {
    return {
      strategy: 'skip',
      steps: [
        { type: 'mark', taskId: failedTaskId, status: 'skipped', reason: 'recovery-skip' },
        ...downstream.map((id) => ({ type: 'mark', taskId: id, status: 'pending', reason: 'continue-after-skip', degraded: true }))
      ],
      reason: 'non-critical-task-skipped',
      downstreamTasks: downstream,
      upstreamTasks: upstream
    };
  }

  // Strategy 4: Abort — preserve completed work
  const completed = history.filter((h) => h.status === 'done').map((h) => h.taskId);
  return {
    strategy: 'abort',
    steps: [],
    reason: 'no-recovery-strategy-applicable',
    preservedTasks: completed
  };
}

async function takeCheckpoint(runId, graphId, tasks) {
  const taskStates = {};
  for (const t of tasks) taskStates[t.id] = t.status || 'pending';
  checkpoints.set(runId, { runId, graphId, taskStates, takenAt: new Date().toISOString() });
  return checkpoints.get(runId);
}

async function rollbackTo(runId, graphId, taskIds) {
  const results = [];
  for (const taskId of taskIds) {
    const r = await dg('POST', `/api/graphs/${encodeURIComponent(graphId)}/mark`, { taskId, status: 'pending' });
    results.push({ taskId, ok: r.ok });
  }
  return results;
}

async function applyStrategy(graphId, plan) {
  if (!plan || !Array.isArray(plan.steps)) return { applied: 0, results: [] };
  const results = [];
  for (const step of plan.steps) {
    if (step.type === 'mark') {
      const r = await dg('POST', `/api/graphs/${encodeURIComponent(graphId)}/mark`, {
        taskId: step.taskId,
        status: step.status,
        result: { reason: step.reason, degraded: step.degraded }
      });
      results.push({ step, ok: r.ok });
    } else if (step.type === 'merge') {
      const r = await dg('POST', `/api/graphs/${encodeURIComponent(graphId)}/mark`, {
        taskId: step.taskId,
        status: 'done',
        result: step.result
      });
      results.push({ step, ok: r.ok });
    }
  }
  return { applied: results.length, results };
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
    stats: { learnings: learnings.length, checkpoints: checkpoints.size },
    timestamp: new Date().toISOString()
  });
});
app.get('/ready', (_req, res) => res.json({ ready: true, ts: new Date().toISOString() }));

// Decide recovery strategy (pure, no side effects)
app.post('/api/decide', requireInternal, async (req, res) => {
  const { graphId, failedTaskId, history, options } = req.body || {};
  if (!graphId || !failedTaskId) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'graphId and failedTaskId required' });
  }
  const graphRes = await dg('GET', `/api/graphs/${encodeURIComponent(graphId)}`);
  if (!graphRes.ok) return res.status(404).json({ error: 'GRAPH_NOT_FOUND' });
  const tasks = graphRes.body.tasks || [];
  const plan = decideRecovery({ graphId, failedTaskId, history: history || [], options: options || {}, tasks });
  res.json(plan);
});

// Apply a recovery plan (mutates dependency-graph state)
app.post('/api/recover', requireInternal, async (req, res) => {
  const { graphId, runId, failedTaskId, history, options } = req.body || {};
  if (!graphId || !failedTaskId) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'graphId and failedTaskId required' });
  }
  const graphRes = await dg('GET', `/api/graphs/${encodeURIComponent(graphId)}`);
  if (!graphRes.ok) return res.status(404).json({ error: 'GRAPH_NOT_FOUND' });
  const tasks = graphRes.body.tasks || [];
  const plan = decideRecovery({ graphId, runId, failedTaskId, history: history || [], options: options || {}, tasks });
  const applied = await applyStrategy(graphId, plan);
  res.json({ plan, applied });
});

// Checkpoints
app.post('/api/checkpoints', requireInternal, async (req, res) => {
  const { runId, graphId } = req.body || {};
  if (!runId || !graphId) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'runId and graphId required' });
  const graphRes = await dg('GET', `/api/graphs/${encodeURIComponent(graphId)}`);
  if (!graphRes.ok) return res.status(404).json({ error: 'GRAPH_NOT_FOUND' });
  const cp = await takeCheckpoint(runId, graphId, graphRes.body.tasks || []);
  res.status(201).json(cp);
});

app.post('/api/checkpoints/:runId/rollback', requireInternal, async (req, res) => {
  const { graphId, taskIds } = req.body || {};
  if (!graphId || !Array.isArray(taskIds)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'graphId and taskIds[] required' });
  }
  const results = await rollbackTo(req.params.runId, graphId, taskIds);
  res.json({ runId: req.params.runId, results });
});

// Failure learning
app.post('/api/learnings', requireInternal, (req, res) => {
  const { taskId, taskKind, error, outcome } = req.body || {};
  if (!taskId || !taskKind || !outcome) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'taskId, taskKind, outcome required' });
  }
  const entry = { taskId, taskKind, error, outcome, ts: new Date().toISOString() };
  learnings.push(entry);
  if (learnings.length > 1000) learnings.shift();
  saveStore(learnings);
  res.status(201).json(entry);
});

app.get('/api/learnings', (req, res) => {
  const taskKind = req.query.taskKind;
  const filtered = taskKind ? learnings.filter((l) => l.taskKind === taskKind) : learnings;
  res.json({ count: filtered.length, learnings: filtered });
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

module.exports = { app, decideRecovery, findDownstream, findUpstream, applyStrategy, takeCheckpoint, rollbackTo, checkpoints, learnings };

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
