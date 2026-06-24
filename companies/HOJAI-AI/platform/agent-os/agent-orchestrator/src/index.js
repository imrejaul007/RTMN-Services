/**
 * agent-orchestrator (port 4812) — Phase 32.9
 *
 * Multi-step workflow composition for the HOJAI AI Agent OS.
 *
 *   - CRUD for workflows (id, name, description, steps[], createdAt, updatedAt)
 *   - Workflow steps form a DAG with named dependencies (dependsOn[])
 *   - Run a workflow: creates a Run record with step states
 *   - Step execution state machine: pending → ready → running → completed/failed/skipped
 *   - Marks step complete / fail; advances DAG (dependents become ready when all deps complete)
 *   - Cycle detection on workflow create/update via Kahn-style topo sort
 *   - Run history with cancel + status query
 *
 * Storage: file-backed JSON in data/workflows.json + data/runs.json
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = parseInt(process.env.PORT, 10) || 4812;
const SERVICE_NAME = 'agent-orchestrator';
const VERSION = '1.0.0';
const DATA_DIR = process.env.AGENT_ORCHESTRATOR_DATA_DIR || path.join(__dirname, '../data');
const WORKFLOWS_FILE = path.join(DATA_DIR, 'workflows.json');
const RUNS_FILE = path.join(DATA_DIR, 'runs.json');

const DEFAULT_STEP_TIMEOUT_MS = 30000;
const MAX_STEP_TIMEOUT_MS = 600000;
const DEFAULT_RETRIES = 0;
const MAX_RETRIES = 3;

const STEP_STATUS = ['pending', 'ready', 'running', 'completed', 'failed', 'skipped'];
const RUN_STATUS = ['pending', 'running', 'completed', 'failed', 'cancelled'];

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { /* ignore */ } }
function nowIso() { return new Date().toISOString(); }
function rid() { return crypto.randomBytes(8).toString('hex'); }

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/**
 * Validate a workflow object. Returns an array of error strings (empty = OK).
 * Safely returns ['body must be object'] for null/undefined/non-object inputs.
 */
function validateWorkflow(body) {
  const errors = [];
  if (!body || typeof body !== 'object') { errors.push('body must be object'); return errors; }
  if (!body.name || typeof body.name !== 'string') errors.push('name required (string)');
  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.push('description must be string');
  }
  if (!Array.isArray(body.steps) || body.steps.length === 0) {
    errors.push('steps must be a non-empty array');
    return errors; // can't continue without steps
  }
  // Step IDs must be unique strings
  const ids = new Set();
  for (const s of body.steps) {
    const e = validateStep(s);
    errors.push(...e);
    if (s && s.id !== undefined) {
      if (ids.has(s.id)) errors.push(`duplicate step id: ${s.id}`);
      else ids.add(s.id);
    }
  }
  // dependsOn must reference existing step IDs
  for (const s of body.steps) {
    if (s && Array.isArray(s.dependsOn)) {
      for (const dep of s.dependsOn) {
        if (!ids.has(dep)) errors.push(`step ${s.id} dependsOn missing step: ${dep}`);
      }
    }
  }
  // Cycle detection via topo sort
  if (hasCycle(body.steps)) errors.push('workflow steps contain a cycle');
  return errors;
}

/**
 * Validate a single step. Returns an array of error strings (empty = OK).
 */
function validateStep(step) {
  const errors = [];
  if (!step || typeof step !== 'object') { errors.push('step must be object'); return errors; }
  if (!step.id || typeof step.id !== 'string') errors.push('step.id required (string)');
  if (step.name !== undefined && typeof step.name !== 'string') errors.push('step.name must be string');
  if (step.dependsOn !== undefined && !Array.isArray(step.dependsOn)) errors.push('step.dependsOn must be array');
  if (step.agentId !== undefined && typeof step.agentId !== 'string') errors.push('step.agentId must be string');
  if (step.toolId !== undefined && typeof step.toolId !== 'string') errors.push('step.toolId must be string');
  if (step.skillId !== undefined && typeof step.skillId !== 'string') errors.push('step.skillId must be string');
  if (step.agentId === undefined && step.toolId === undefined && step.skillId === undefined) {
    errors.push('step must specify at least one of agentId, toolId, skillId');
  }
  if (step.inputs !== undefined && (typeof step.inputs !== 'object' || Array.isArray(step.inputs))) {
    errors.push('step.inputs must be object');
  }
  if (step.outputs !== undefined && (typeof step.outputs !== 'object' || Array.isArray(step.outputs))) {
    errors.push('step.outputs must be object');
  }
  if (step.timeout !== undefined) {
    if (typeof step.timeout !== 'number' || step.timeout < 0) errors.push('step.timeout must be non-negative number');
    else if (step.timeout > MAX_STEP_TIMEOUT_MS) errors.push(`step.timeout max ${MAX_STEP_TIMEOUT_MS}ms`);
  }
  if (step.retries !== undefined) {
    if (typeof step.retries !== 'number' || step.retries < 0) errors.push('step.retries must be non-negative number');
    else if (step.retries > MAX_RETRIES) errors.push(`step.retries max ${MAX_RETRIES}`);
  }
  return errors;
}

/**
 * Build a normalized step with defaults filled in.
 * For null/undefined inputs returns a safe empty object.
 */
function buildStep(step) {
  if (!step || typeof step !== 'object') return {};
  return {
    id: step.id,
    name: step.name || step.id,
    agentId: step.agentId,
    toolId: step.toolId,
    skillId: step.skillId,
    dependsOn: Array.isArray(step.dependsOn) ? [...step.dependsOn] : [],
    inputs: step.inputs && typeof step.inputs === 'object' ? { ...step.inputs } : {},
    outputs: step.outputs && typeof step.outputs === 'object' ? { ...step.outputs } : {},
    timeout: typeof step.timeout === 'number' ? step.timeout : DEFAULT_STEP_TIMEOUT_MS,
    retries: typeof step.retries === 'number' ? step.retries : DEFAULT_RETRIES,
  };
}

/**
 * Normalize a workflow for persistence: assign ID, timestamps, and normalize all steps.
 */
function normalizeWorkflow(body, existing) {
  const now = nowIso();
  const w = {
    id: body.id || existing?.id || `wf_${rid()}`,
    name: body.name || existing?.name,
    description: body.description ?? existing?.description ?? '',
    steps: Array.isArray(body.steps) ? body.steps.map((s) => buildStep(s)) : (existing?.steps || []),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  return w;
}

/**
 * Topological sort of steps using Kahn's algorithm.
 * Returns an array of step IDs in execution order, or null if there's a cycle.
 * For null/undefined/empty input, returns [].
 */
function topoSort(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return [];
  const inDeg = new Map();
  const adj = new Map();
  for (const s of steps) {
    if (!s || !s.id) continue;
    inDeg.set(s.id, 0);
    adj.set(s.id, []);
  }
  for (const s of steps) {
    if (!s || !s.id || !Array.isArray(s.dependsOn)) continue;
    for (const dep of s.dependsOn) {
      if (!inDeg.has(dep)) continue; // unknown dep — skip
      inDeg.set(s.id, (inDeg.get(s.id) || 0) + 1);
      adj.get(dep).push(s.id);
    }
  }
  const queue = [];
  for (const [id, deg] of inDeg.entries()) {
    if (deg === 0) queue.push(id);
  }
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const next of (adj.get(id) || [])) {
      inDeg.set(next, inDeg.get(next) - 1);
      if (inDeg.get(next) === 0) queue.push(next);
    }
  }
  return order.length === inDeg.size ? order : null;
}

/**
 * Returns true if the steps form a cycle (or self-dependency / unknown ref).
 */
function hasCycle(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return false;
  const sorted = topoSort(steps);
  return sorted === null;
}

/**
 * Find steps whose dependencies are all completed (or skipped) AND that are still pending.
 * Returns the array of step IDs that are ready to run next.
 */
function findReadySteps(run, workflow) {
  if (!run || !workflow || !Array.isArray(workflow.steps)) return [];
  const completed = new Set();
  for (const [sid, st] of Object.entries(run.stepStates || {})) {
    if (st && (st.status === 'completed' || st.status === 'skipped')) completed.add(sid);
  }
  const ready = [];
  for (const step of workflow.steps) {
    if (!step || !step.id) continue;
    const state = run.stepStates?.[step.id];
    if (!state || state.status !== 'pending') continue;
    const deps = Array.isArray(step.dependsOn) ? step.dependsOn : [];
    const allDone = deps.every((d) => completed.has(d));
    if (allDone) ready.push(step.id);
  }
  return ready;
}

/**
 * Returns true if every non-skipped step is completed.
 */
function isComplete(run) {
  if (!run || !run.stepStates) return false;
  const entries = Object.entries(run.stepStates);
  if (entries.length === 0) return false;
  for (const [, st] of entries) {
    if (!st) return false;
    if (st.status === 'skipped') continue;
    if (st.status !== 'completed') return false;
  }
  return true;
}

/**
 * Returns true if any step is failed AND has exhausted its retries.
 */
function hasFailed(run) {
  if (!run || !run.stepStates) return false;
  for (const [, st] of Object.entries(run.stepStates)) {
    if (st && st.status === 'failed' && (st.attempts || 0) >= (st.maxRetries ?? Infinity)) return true;
  }
  return false;
}

/**
 * List all workflows (pass-through; useful for symmetry).
 */
function listAll(workflows) { return Array.isArray(workflows) ? workflows : []; }

/**
 * Find a workflow by ID. Returns null for null/undefined inputs.
 */
function findWorkflow(workflows, id) {
  if (!Array.isArray(workflows) || !id) return null;
  return workflows.find((w) => w && w.id === id) || null;
}

/**
 * Find a run by ID. Returns null for null/undefined inputs.
 */
function findRun(runs, id) {
  if (!Array.isArray(runs) || !id) return null;
  return runs.find((r) => r && r.id === id) || null;
}

/**
 * Build a compact summary of a run (omits raw output for safety).
 */
function summarizeRun(run) {
  if (!run || typeof run !== 'object') return null;
  return {
    id: run.id,
    workflowId: run.workflowId,
    status: run.status,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    currentStepIds: run.currentStepIds || [],
    stepStates: Object.fromEntries(
      Object.entries(run.stepStates || {}).map(([sid, st]) => [
        sid,
        { status: st.status, startedAt: st.startedAt, endedAt: st.endedAt, attempts: st.attempts || 0, error: st.error || null },
      ]),
    ),
  };
}

/**
 * Compute the next set of step IDs that should transition pending → ready
 * given a workflow and current stepStates. Used when a step is completed.
 * This does NOT mutate; callers apply the result.
 */
function nextSteps(workflow, stepStates) {
  if (!workflow || !Array.isArray(workflow.steps)) return [];
  const completed = new Set();
  for (const [sid, st] of Object.entries(stepStates || {})) {
    if (st && (st.status === 'completed' || st.status === 'skipped')) completed.add(sid);
  }
  const next = [];
  for (const step of workflow.steps) {
    if (!step || !step.id) continue;
    const state = stepStates?.[step.id];
    if (!state || state.status !== 'pending') continue;
    const deps = Array.isArray(step.dependsOn) ? step.dependsOn : [];
    if (deps.every((d) => completed.has(d))) next.push(step.id);
  }
  return next;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function loadWorkflows() {
  ensureDir();
  if (!fs.existsSync(WORKFLOWS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(WORKFLOWS_FILE, 'utf8')); } catch { return []; }
}

function saveWorkflows(workflows) {
  ensureDir();
  fs.writeFileSync(WORKFLOWS_FILE, JSON.stringify(workflows, null, 2));
}

function loadRuns() {
  ensureDir();
  if (!fs.existsSync(RUNS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(RUNS_FILE, 'utf8')); } catch { return []; }
}

function saveRuns(runs) {
  ensureDir();
  fs.writeFileSync(RUNS_FILE, JSON.stringify(runs, null, 2));
}

function findWorkflowIndex(workflows, id) { return workflows.findIndex((w) => w && w.id === id); }
function findRunIndex(runs, id) { return runs.findIndex((r) => r && r.id === id); }

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// Health
app.get('/health', (_req, res) => res.json({ service: SERVICE_NAME, version: VERSION, port: PORT, status: 'ok' }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

// Create workflow
app.post('/api/workflows', (req, res) => {
  const errs = validateWorkflow(req.body);
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });
  const workflows = loadWorkflows();
  const w = normalizeWorkflow(req.body, null);
  workflows.push(w);
  saveWorkflows(workflows);
  res.status(201).json(w);
});

// List workflows
app.get('/api/workflows', (_req, res) => {
  const workflows = loadWorkflows();
  res.json({ count: workflows.length, workflows });
});

// IMPORTANT: specific routes must come BEFORE /api/workflows/:id
app.get('/api/workflows/search', (req, res) => {
  const name = req.query.name;
  let workflows = loadWorkflows();
  if (name && typeof name === 'string') {
    const q = name.toLowerCase();
    workflows = workflows.filter((w) => w && w.name && w.name.toLowerCase().includes(q));
  }
  res.json({ count: workflows.length, workflows });
});

// IMPORTANT: /api/workflows/runs routes must come BEFORE /api/workflows/:id
app.get('/api/workflows/runs', (req, res) => {
  let runs = loadRuns();
  if (req.query.workflowId) runs = runs.filter((r) => r.workflowId === req.query.workflowId);
  if (req.query.status) runs = runs.filter((r) => r.status === req.query.status);
  res.json({ count: runs.length, runs: runs.map(summarizeRun) });
});

app.get('/api/workflows/runs/:runId', (req, res) => {
  const runs = loadRuns();
  const r = findRun(runs, req.params.runId);
  if (!r) return res.status(404).json({ error: 'not_found', id: req.params.runId });
  res.json(summarizeRun(r));
});

app.post('/api/workflows/runs/:runId/cancel', (req, res) => {
  const runs = loadRuns();
  const idx = findRunIndex(runs, req.params.runId);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.runId });
  const r = runs[idx];
  if (r.status === 'completed' || r.status === 'failed' || r.status === 'cancelled') {
    return res.status(409).json({ error: 'conflict', currentStatus: r.status });
  }
  r.status = 'cancelled';
  r.endedAt = nowIso();
  r.currentStepIds = [];
  // Mark any ready/running steps as skipped. Pending steps remain pending
  // (they were never activated; their predecessors never completed).
  for (const sid of Object.keys(r.stepStates || {})) {
    const st = r.stepStates[sid];
    if (st && (st.status === 'ready' || st.status === 'running')) {
      st.status = 'skipped';
      st.endedAt = nowIso();
    }
  }
  saveRuns(runs);
  res.json(summarizeRun(r));
});

app.post('/api/workflows/runs/:runId/step/:stepId/complete', (req, res) => {
  const runs = loadRuns();
  const workflows = loadWorkflows();
  const idx = findRunIndex(runs, req.params.runId);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.runId });
  const r = runs[idx];
  if (r.status !== 'running' && r.status !== 'pending') {
    return res.status(409).json({ error: 'conflict', currentStatus: r.status });
  }
  const workflow = findWorkflow(workflows, r.workflowId);
  if (!workflow) return res.status(404).json({ error: 'workflow_not_found', workflowId: r.workflowId });
  const step = workflow.steps.find((s) => s && s.id === req.params.stepId);
  if (!step) return res.status(404).json({ error: 'step_not_found', stepId: req.params.stepId });
  const state = r.stepStates?.[req.params.stepId];
  if (!state) return res.status(404).json({ error: 'step_state_not_found', stepId: req.params.stepId });
  if (state.status !== 'running' && state.status !== 'ready') {
    return res.status(409).json({ error: 'conflict', currentStepStatus: state.status });
  }
  // Mark complete
  state.status = 'completed';
  state.endedAt = nowIso();
  state.output = req.body?.output ?? null;
  // Transition dependents: pending → ready if all deps now complete
  const newlyReady = nextSteps(workflow, r.stepStates);
  for (const sid of newlyReady) {
    if (r.stepStates[sid]?.status === 'pending') {
      r.stepStates[sid].status = 'ready';
    }
  }
  // Compute current running step IDs (running + ready)
  r.currentStepIds = Object.entries(r.stepStates)
    .filter(([, st]) => st && (st.status === 'running' || st.status === 'ready'))
    .map(([sid]) => sid);
  // Ensure run status is running if not already terminal
  if (r.status === 'pending') r.status = 'running';
  r.startedAt = r.startedAt || nowIso();
  // Check completion
  if (isComplete(r)) {
    r.status = 'completed';
    r.endedAt = nowIso();
    r.currentStepIds = [];
  }
  saveRuns(runs);
  res.json(summarizeRun(r));
});

app.post('/api/workflows/runs/:runId/step/:stepId/fail', (req, res) => {
  const runs = loadRuns();
  const workflows = loadWorkflows();
  const idx = findRunIndex(runs, req.params.runId);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.runId });
  const r = runs[idx];
  if (r.status !== 'running' && r.status !== 'pending') {
    return res.status(409).json({ error: 'conflict', currentStatus: r.status });
  }
  const workflow = findWorkflow(workflows, r.workflowId);
  if (!workflow) return res.status(404).json({ error: 'workflow_not_found', workflowId: r.workflowId });
  const step = workflow.steps.find((s) => s && s.id === req.params.stepId);
  if (!step) return res.status(404).json({ error: 'step_not_found', stepId: req.params.stepId });
  const state = r.stepStates?.[req.params.stepId];
  if (!state) return res.status(404).json({ error: 'step_state_not_found', stepId: req.params.stepId });
  state.attempts = (state.attempts || 0) + 1;
  const maxRetries = state.maxRetries ?? step.retries ?? DEFAULT_RETRIES;
  state.error = req.body?.error ?? 'unknown error';
  if (state.attempts <= maxRetries) {
    // Retry: revert to ready
    state.status = 'ready';
    state.startedAt = null;
    state.endedAt = null;
    r.currentStepIds = Object.entries(r.stepStates)
      .filter(([, st]) => st && (st.status === 'running' || st.status === 'ready'))
      .map(([sid]) => sid);
    if (r.status === 'pending') r.status = 'running';
    r.startedAt = r.startedAt || nowIso();
    saveRuns(runs);
    return res.json(summarizeRun(r));
  }
  // Exhausted retries
  state.status = 'failed';
  state.endedAt = nowIso();
  // Mark dependents as skipped (they cannot run)
  for (const s of workflow.steps) {
    if (!s || !s.id) continue;
    if (Array.isArray(s.dependsOn) && s.dependsOn.includes(req.params.stepId)) {
      const depState = r.stepStates[s.id];
      if (depState && depState.status === 'pending') {
        depState.status = 'skipped';
        depState.endedAt = nowIso();
      }
    }
  }
  r.status = 'failed';
  r.endedAt = nowIso();
  r.currentStepIds = [];
  saveRuns(runs);
  res.json(summarizeRun(r));
});

// Get one workflow
app.get('/api/workflows/:id', (req, res) => {
  const workflows = loadWorkflows();
  const w = findWorkflow(workflows, req.params.id);
  if (!w) return res.status(404).json({ error: 'not_found', id: req.params.id });
  res.json(w);
});

// Update workflow
app.patch('/api/workflows/:id', (req, res) => {
  const workflows = loadWorkflows();
  const idx = findWorkflowIndex(workflows, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  const merged = { ...workflows[idx], ...req.body };
  const errs = validateWorkflow(merged);
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });
  const updated = normalizeWorkflow(req.body, workflows[idx]);
  workflows[idx] = updated;
  saveWorkflows(workflows);
  res.json(updated);
});

// Delete workflow
app.delete('/api/workflows/:id', (req, res) => {
  const workflows = loadWorkflows();
  const idx = findWorkflowIndex(workflows, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  const [removed] = workflows.splice(idx, 1);
  saveWorkflows(workflows);
  res.json({ deleted: true, id: removed.id });
});

// Start a run for a workflow
app.post('/api/workflows/:id/run', (req, res) => {
  const workflows = loadWorkflows();
  const idx = findWorkflowIndex(workflows, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  const wf = workflows[idx];
  const now = nowIso();
  const stepStates = {};
  for (const step of wf.steps) {
    if (!step || !step.id) continue;
    const deps = Array.isArray(step.dependsOn) ? step.dependsOn : [];
    const initialStatus = deps.length === 0 ? 'ready' : 'pending';
    stepStates[step.id] = {
      status: initialStatus,
      startedAt: null,
      endedAt: null,
      attempts: 0,
      maxRetries: step.retries ?? DEFAULT_RETRIES,
      output: null,
      error: null,
    };
  }
  const run = {
    id: `run_${rid()}`,
    workflowId: wf.id,
    status: 'running',
    startedAt: now,
    endedAt: null,
    inputs: req.body?.inputs || {},
    stepStates,
    currentStepIds: Object.entries(stepStates)
      .filter(([, st]) => st.status === 'ready')
      .map(([sid]) => sid),
  };
  const runs = loadRuns();
  runs.push(run);
  saveRuns(runs);
  res.status(201).json(summarizeRun(run));
});

// 404
app.use((req, res) => res.status(404).json({ error: 'not_found', path: req.path }));

if (require.main === module) {
  app.listen(PORT, () => {
    ensureDir();
    console.log(`${SERVICE_NAME} listening on :${PORT}`);
  });
}

module.exports = {
  app,
  PORT, SERVICE_NAME, VERSION, WORKFLOWS_FILE, RUNS_FILE,
  DEFAULT_STEP_TIMEOUT_MS, MAX_STEP_TIMEOUT_MS, DEFAULT_RETRIES, MAX_RETRIES,
  STEP_STATUS, RUN_STATUS,
  // pure functions
  validateWorkflow, normalizeWorkflow, validateStep, buildStep,
  topoSort, findReadySteps, isComplete, hasFailed, hasCycle,
  listAll, findWorkflow, findRun, summarizeRun, nextSteps,
  // storage
  loadWorkflows, saveWorkflows, loadRuns, saveRuns,
  findWorkflowIndex, findRunIndex,
};