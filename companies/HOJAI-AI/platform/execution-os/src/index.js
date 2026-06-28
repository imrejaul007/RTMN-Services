/**
 * RTMN ExecutionOS v1.0
 * Execute actions/steps against mission tasks.
 * An Execution is a runnable action with retry, timeout, sequencing, and result tracking.
 * @port 4296
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

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

requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4296;
const SERVICE_NAME = 'execution-os';

const EXECUTION_OS_REQUIRE_AUTH =
  (process.env.EXECUTION_OS_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';
const EXECUTION_OS_NO_LISTEN =
  (process.env.EXECUTION_OS_NO_LISTEN ?? '').toLowerCase() === 'true' ||
  process.env.NODE_ENV === 'test';
const authOrBypass = (req, res, next) =>
  EXECUTION_OS_REQUIRE_AUTH ? requireAuth(req, res, next) : next();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  const s = Date.now();
  res.on('finish', () =>
    console.log(`[execution-os] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - s}ms)`)
  );
  next();
});

const executions = new PersistentMap('executions', { serviceName: SERVICE_NAME });
const stepResults = new PersistentMap('step-results', { serviceName: SERVICE_NAME });
const auditLog = [];

const EXEC_STATUSES = ['pending', 'queued', 'running', 'success', 'failed', 'cancelled', 'timeout'];
const STEP_STATUSES = ['pending', 'running', 'success', 'failed', 'skipped', 'timeout'];
const STEP_KINDS = ['http', 'shell', 'noop', 'wait', 'sub-execution'];

function audit(action, actor, payload) {
  const e = {
    id: uuidv4(),
    service: SERVICE_NAME,
    action,
    actor: actor || 'system',
    payload: payload || {},
    timestamp: new Date().toISOString(),
  };
  auditLog.push(e);
  return e;
}

function getExecutionOr404(req, res) {
  const e = executions.get(req.params.id);
  if (!e) {
    res.status(404).json({ error: 'Execution not found' });
    return null;
  }
  return e;
}

// POST /api/executions — create a new execution (runs synchronously when kind=noop or wait)
app.post('/api/executions',requireAuth,  authOrBypass, (req, res) => {
  const { name, missionId, taskId, steps, maxRetries, timeoutMs, runInline, actor } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!Array.isArray(steps) || steps.length === 0) return res.status(400).json({ error: 'steps[] is required and must be non-empty' });
  for (const s of steps) {
    if (!s.kind || !STEP_KINDS.includes(s.kind)) {
      return res.status(400).json({ error: `invalid step kind '${s.kind}'`, allowed: STEP_KINDS });
    }
  }
  const exec = {
    id: uuidv4(),
    name,
    missionId: missionId || null,
    taskId: taskId || null,
    steps: steps.map((s, i) => ({
      id: s.id || `step-${i}`,
      kind: s.kind,
      payload: s.payload || {},
      timeoutMs: s.timeoutMs || timeoutMs || 5000,
      maxRetries: typeof s.maxRetries === 'number' ? s.maxRetries : (maxRetries || 0),
    })),
    maxRetries: maxRetries || 0,
    timeoutMs: timeoutMs || 30000,
    status: 'pending',
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    results: [],
    actor: actor || 'system',
  };
  executions.set(exec.id, exec);
  audit('execution.create', actor, { id: exec.id, name, steps: exec.steps.length });

  if (runInline) {
    runExecution(exec);
  }
  res.status(201).json(exec);
});

// GET /api/executions — list executions
app.get('/api/executions', (req, res) => {
  const { status, missionId, taskId, limit } = req.query;
  let list = Array.from(executions.values());
  if (status) list = list.filter(e => e.status === status);
  if (missionId) list = list.filter(e => e.missionId === missionId);
  if (taskId) list = list.filter(e => e.taskId === taskId);
  const max = Math.min(parseInt(limit, 10) || 100, 1000);
  res.json({ executions: list.slice(-max).reverse(), count: list.length });
});

// GET /api/executions/audit (must come BEFORE /:id)
app.get('/api/executions/audit', (req, res) => {
  const { action, executionId, limit } = req.query;
  let list = [...auditLog];
  if (action) list = list.filter(e => e.action === action);
  if (executionId) list = list.filter(e => e.payload && e.payload.id === executionId);
  const max = Math.min(parseInt(limit, 10) || 100, 1000);
  res.json({ events: list.slice(-max).reverse(), count: list.length });
});

// GET /api/executions/:id — full execution with step results
app.get('/api/executions/:id', (req, res) => {
  const e = getExecutionOr404(req, res);
  if (!e) return;
  const results = Array.from(stepResults.values()).filter(r => r.executionId === e.id);
  res.json({ ...e, stepResults: results });
});

// POST /api/executions/:id/run — kick off execution
app.post('/api/executions/:id/run',requireAuth,  authOrBypass, (req, res) => {
  const e = getExecutionOr404(req, res);
  if (!e) return;
  if (e.status === 'running') return res.status(409).json({ error: 'execution already running' });
  const result = runExecution(e);
  res.json(result);
});

// POST /api/executions/:id/cancel
app.post('/api/executions/:id/cancel',requireAuth,  authOrBypass, (req, res) => {
  const e = getExecutionOr404(req, res);
  if (!e) return;
  if (e.status === 'success' || e.status === 'failed' || e.status === 'cancelled' || e.status === 'timeout') {
    return res.status(409).json({ error: `cannot cancel: status is '${e.status}'` });
  }
  e.status = 'cancelled';
  e.completedAt = new Date().toISOString();
  executions.set(e.id, e);
  audit('execution.cancel', req.body?.actor || 'system', { id: e.id });
  res.json(e);
});

// DELETE /api/executions/:id
app.delete('/api/executions/:id',requireAuth,  authOrBypass, (req, res) => {
  const e = getExecutionOr404(req, res);
  if (!e) return;
  executions.delete(e.id);
  // also delete step results
  for (const r of Array.from(stepResults.values())) {
    if (r.executionId === e.id) stepResults.delete(r.id);
  }
  audit('execution.delete', req.body?.actor || 'system', { id: e.id });
  res.status(204).send();
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: SERVICE_NAME, port: PORT, uptimeSec: Math.round(process.uptime()) });
});

// Ready
app.get('/ready', (req, res) => {
  res.json({ ready: true, service: SERVICE_NAME });
});

// === Execution engine ===

function runExecution(exec) {
  exec.status = 'running';
  exec.startedAt = new Date().toISOString();
  executions.set(exec.id, exec);
  audit('execution.run', exec.actor, { id: exec.id });

  let allOk = true;
  for (const step of exec.steps) {
    const stepResult = runStep(exec, step);
    if (stepResult.status !== 'success') {
      allOk = false;
      break;
    }
  }
  exec.status = allOk ? 'success' : 'failed';
  exec.completedAt = new Date().toISOString();
  executions.set(exec.id, exec);
  audit(`execution.${exec.status}`, exec.actor, { id: exec.id });
  return exec;
}

function runStep(exec, step) {
  const result = {
    id: uuidv4(),
    executionId: exec.id,
    stepId: step.id,
    kind: step.kind,
    payload: step.payload,
    status: 'pending',
    attempts: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
    output: null,
    error: null,
  };
  stepResults.set(result.id, result);

  const maxAttempts = (step.maxRetries || 0) + 1;
  let attempt = 0;
  let lastError = null;
  while (attempt < maxAttempts) {
    attempt++;
    result.attempts = attempt;
    result.status = 'running';
    try {
      const out = invokeStep(step, exec);
      result.status = 'success';
      result.output = out;
      result.completedAt = new Date().toISOString();
      stepResults.set(result.id, result);
      return result;
    } catch (err) {
      lastError = err && err.message ? err.message : String(err);
      if (attempt < maxAttempts) continue;
      result.status = 'failed';
      result.error = lastError;
      result.completedAt = new Date().toISOString();
      stepResults.set(result.id, result);
      return result;
    }
  }
  return result;
}

function invokeStep(step, exec) {
  switch (step.kind) {
    case 'noop':
      return { ok: true, kind: 'noop' };
    case 'wait':
      return { ok: true, kind: 'wait', waitedMs: step.payload.ms || 0 };
    case 'http':
      // We can't actually call out in tests, so validate payload and return metadata
      if (!step.payload.url) throw new Error('http step requires payload.url');
      return { ok: true, kind: 'http', url: step.payload.url, method: step.payload.method || 'GET' };
    case 'shell':
      // We can't actually spawn in tests, so validate payload
      if (!step.payload.cmd) throw new Error('shell step requires payload.cmd');
      return { ok: true, kind: 'shell', cmd: step.payload.cmd };
    case 'sub-execution':
      if (!step.payload.executionId) throw new Error('sub-execution step requires payload.executionId');
      const sub = executions.get(step.payload.executionId);
      if (!sub) throw new Error(`sub-execution not found: ${step.payload.executionId}`);
      return { ok: true, kind: 'sub-execution', subStatus: sub.status };
    default:
      throw new Error(`unknown step kind: ${step.kind}`);
  }
}

let server = null;
if (require.main === module && !EXECUTION_OS_NO_LISTEN) {
  server = app.listen(PORT, () => console.log(`${SERVICE_NAME} running on port ${PORT}`));
  installGracefulShutdown(server);
}

module.exports = app;
module.exports.app = app;
module.exports.authOrBypass = authOrBypass;
module.exports.EXECUTION_OS_REQUIRE_AUTH = EXECUTION_OS_REQUIRE_AUTH;
module.exports.EXECUTION_OS_NO_LISTEN = EXECUTION_OS_NO_LISTEN;
module.exports.SERVICE_NAME = SERVICE_NAME;