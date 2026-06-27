/**
 * agent-execution-engine (port 4813) — Phase 32.10
 *
 * Agent loop runner for HOJAI AI Agent OS. Supports three patterns:
 *   - react          : Reasoning + Acting (think -> act -> observe -> ... -> finalize)
 *   - plan-execute   : Generate a plan, then execute each step in order
 *   - reflection     : Act, then reflect on the output, then complete
 *
 * Real LLM integration is OUT OF SCOPE (Phase 30 territory). This service provides
 * the LOOP framework with deterministic stub LLM calls. The point is the loop
 * structure is correct, deterministic, and testable.
 *
 * Storage: file-backed JSON in data/executions.json + data/steps.json
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = parseInt(process.env.PORT, 10) || 4813;
const SERVICE_NAME = 'agent-execution-engine';
const VERSION = '1.0.0';
const DATA_DIR = process.env.AGENT_EXECUTION_ENGINE_DATA_DIR || path.join(__dirname, '../data');
const EXECUTIONS_FILE = path.join(DATA_DIR, 'executions.json');
const STEPS_FILE = path.join(DATA_DIR, 'steps.json');
const DEFAULT_MAX_STEPS = 10;

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { /* ignore */ } }
function nowIso() { return new Date().toISOString(); }
function rid() { return crypto.randomBytes(8).toString('hex'); }
function execId() { return `exec_${rid()}`; }
function stepId() { return `step_${rid()}`; }

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_PATTERNS = ['react', 'plan-execute', 'reflection'];
const VALID_STATUS = ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'];
const VALID_STEP_TYPES = ['thought', 'action', 'observation', 'plan', 'reflection'];

function validateExecution(body) {
  const errors = [];
  if (!body || typeof body !== 'object') { errors.push('body must be object'); return errors; }
  if (!body.agentId || typeof body.agentId !== 'string') errors.push('agentId required (string)');
  if (!body.pattern || !VALID_PATTERNS.includes(body.pattern)) {
    errors.push(`pattern must be one of ${VALID_PATTERNS.join(',')}`);
  }
  if (!body.goal || typeof body.goal !== 'string' || body.goal.trim().length === 0) {
    errors.push('goal required (non-empty string)');
  }
  if (body.maxSteps !== undefined) {
    if (typeof body.maxSteps !== 'number' || !Number.isInteger(body.maxSteps) || body.maxSteps <= 0) {
      errors.push('maxSteps must be positive integer');
    }
  }
  return errors;
}

function validateStep(body) {
  const errors = [];
  if (!body || typeof body !== 'object') { errors.push('body must be object'); return errors; }
  if (!body.type || !VALID_STEP_TYPES.includes(body.type)) {
    errors.push(`type must be one of ${VALID_STEP_TYPES.join(',')}`);
  }
  if (body.content !== undefined && typeof body.content !== 'string') {
    errors.push('content must be string when provided');
  }
  return errors;
}

function normalizeExecution(body, existing) {
  const now = nowIso();
  return {
    id: body.id || existing?.id || execId(),
    agentId: body.agentId || existing?.agentId,
    pattern: body.pattern || existing?.pattern,
    goal: body.goal || existing?.goal,
    status: body.status || existing?.status || 'pending',
    finalAnswer: body.finalAnswer !== undefined ? body.finalAnswer : (existing?.finalAnswer ?? null),
    currentStep: body.currentStep !== undefined ? body.currentStep : (existing?.currentStep || 0),
    maxSteps: body.maxSteps !== undefined ? body.maxSteps : (existing?.maxSteps || DEFAULT_MAX_STEPS),
    stepIds: body.stepIds || existing?.stepIds || [],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

function normalizeStep(body, executionId) {
  const now = nowIso();
  return {
    id: body.id || stepId(),
    executionId: executionId || body.executionId,
    type: body.type,
    content: body.content || '',
    toolName: body.toolName || null,
    toolInput: body.toolInput || null,
    toolOutput: body.toolOutput || null,
    timestamp: body.timestamp || now,
  };
}

// ---------------------------------------------------------------------------
// Pure functions - loop logic
// ---------------------------------------------------------------------------

function buildReActPrompt(goal) {
  if (!goal || typeof goal !== 'string') return 'ReAct prompt: (no goal)';
  return `ReAct loop for goal: ${goal}. Think step-by-step, then act with a tool call.`;
}

function parseReActStep(step) {
  if (!step || typeof step !== 'object') return { thought: null, action: null };
  return {
    thought: step.type === 'thought' ? (step.content || '') : null,
    action: step.type === 'action' ? { tool: step.toolName, input: step.toolInput, output: step.toolOutput } : null,
  };
}

function shouldContinue(execution) {
  if (!execution || typeof execution !== 'object') return false;
  if (execution.status !== 'running') return false;
  if (execution.currentStep >= execution.maxSteps) return false;
  if (execution.status === 'cancelled' || execution.status === 'failed' || execution.status === 'completed') return false;
  return true;
}

function buildSummary(execution) {
  if (!execution || typeof execution !== 'object') return '';
  const steps = Array.isArray(execution.stepIds) ? execution.stepIds.length : 0;
  return `Execution ${execution.id || '(unknown)'} of pattern ${execution.pattern || '?'} ran ${steps} step(s) for goal: ${execution.goal || '(none)'}`;
}

// ---------------------------------------------------------------------------
// Step generation - deterministic stub LLM
// ---------------------------------------------------------------------------

function generateReActNextStep(execution, stepIndex) {
  if (!execution || typeof execution !== 'object') return null;
  const goal = execution.goal || '';
  // Step 1: thought
  if (stepIndex === 0) {
    return { type: 'thought', content: `Thinking about: ${goal}` };
  }
  // Step 2: action - search
  if (stepIndex === 1) {
    return { type: 'action', content: `Searching for: ${goal}`, toolName: 'search', toolInput: { query: goal }, toolOutput: null };
  }
  // Step 3: observation
  if (stepIndex === 2) {
    return { type: 'observation', content: 'Got results from search' };
  }
  // Step 4: thought
  if (stepIndex === 3) {
    return { type: 'thought', content: 'Synthesizing final answer' };
  }
  // Step 5: finalize
  if (stepIndex === 4) {
    return { type: 'action', content: `Final answer for: ${goal}`, toolName: 'finalize', toolInput: { answer: `Final answer: ${goal}` }, toolOutput: { answer: `Final answer: ${goal}` } };
  }
  return null;
}

function generatePlanSteps(execution) {
  if (!execution || typeof execution !== 'object') return [];
  const goal = execution.goal || '';
  return [
    { type: 'plan', content: JSON.stringify({ steps: [
      { id: 1, action: `think about: ${goal}` },
      { id: 2, action: `act on: ${goal}` },
      { id: 3, action: `verify: ${goal}` },
    ] }) },
    { type: 'action', content: `Executing plan step 1: think about ${goal}`, toolName: 'think', toolInput: { goal }, toolOutput: { result: 'planned' } },
    { type: 'action', content: `Executing plan step 2: act on ${goal}`, toolName: 'act', toolInput: { goal }, toolOutput: { result: 'acted' } },
    { type: 'action', content: `Executing plan step 3: verify ${goal}`, toolName: 'verify', toolInput: { goal }, toolOutput: { result: 'verified' } },
    { type: 'reflection', content: `Reflection on plan: completed all 3 sub-steps for ${goal}` },
  ];
}

function generateReflectionSteps(execution) {
  if (!execution || typeof execution !== 'object') return [];
  const goal = execution.goal || '';
  return [
    { type: 'thought', content: `Thinking about: ${goal}` },
    { type: 'action', content: `Acting on: ${goal}`, toolName: 'act', toolInput: { goal }, toolOutput: { result: 'acted' } },
    { type: 'reflection', content: `Reflecting on output for: ${goal}` },
  ];
}

function findReadySteps(execution, steps) {
  if (!execution || typeof execution !== 'object') return [];
  if (!Array.isArray(steps)) return [];
  return steps.filter((s) => s.executionId === execution.id);
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function loadExecutions() {
  ensureDir();
  if (!fs.existsSync(EXECUTIONS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(EXECUTIONS_FILE, 'utf8')); } catch { return []; }
}

function saveExecutions(executions) {
  ensureDir();
  fs.writeFileSync(EXECUTIONS_FILE, JSON.stringify(executions, null, 2));
}

function loadSteps() {
  ensureDir();
  if (!fs.existsSync(STEPS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(STEPS_FILE, 'utf8')); } catch { return []; }
}

function saveSteps(steps) {
  ensureDir();
  fs.writeFileSync(STEPS_FILE, JSON.stringify(steps, null, 2));
}

function appendStep(step) {
  const steps = loadSteps();
  steps.push(step);
  saveSteps(steps);
  return step;
}

function findExecution(executions, id) { return executions.find((e) => e.id === id) || null; }
function findIndex(executions, id) { return executions.findIndex((e) => e.id === id); }
function byAgent(executions, agentId) {
  if (!agentId) return executions;
  return executions.filter((e) => e.agentId === agentId);
}
function byPattern(executions, pattern) {
  if (!pattern) return executions;
  return executions.filter((e) => e.pattern === pattern);
}
function byStatus(executions, status) {
  if (!status) return executions;
  return executions.filter((e) => e.status === status);
}
function listAll(executions) { return executions; }

function summarizeExecution(execution) {
  if (!execution || typeof execution !== 'object') return null;
  return {
    id: execution.id,
    agentId: execution.agentId,
    pattern: execution.pattern,
    goal: execution.goal,
    status: execution.status,
    finalAnswer: execution.finalAnswer,
    currentStep: execution.currentStep,
    maxSteps: execution.maxSteps,
    stepCount: Array.isArray(execution.stepIds) ? execution.stepIds.length : 0,
    createdAt: execution.createdAt,
    updatedAt: execution.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Loop runner - drives deterministic stub LLM steps
// ---------------------------------------------------------------------------

function runLoop(execution) {
  // Build a list of step templates to generate based on pattern
  let stepTemplates = [];
  if (execution.pattern === 'react') {
    for (let i = 0; i < 5; i += 1) {
      const t = generateReActNextStep(execution, i);
      if (t) stepTemplates.push(t);
    }
  } else if (execution.pattern === 'plan-execute') {
    stepTemplates = generatePlanSteps(execution);
  } else if (execution.pattern === 'reflection') {
    stepTemplates = generateReflectionSteps(execution);
  }

  const generatedSteps = [];
  for (let i = 0; i < stepTemplates.length; i += 1) {
    if (execution.currentStep >= execution.maxSteps) break;
    const tmpl = stepTemplates[i];
    const s = normalizeStep({ ...tmpl, executionId: execution.id }, execution.id);
    appendStep(s);
    generatedSteps.push(s);
    execution.stepIds.push(s.id);
    execution.currentStep += 1;
    execution.updatedAt = nowIso();
  }

  // Mark completed only if the entire pattern completed (all template steps generated)
  // If maxSteps was hit before completion, leave status as 'running' so pause/continue works
  if (execution.stepIds.length >= stepTemplates.length && stepTemplates.length > 0) {
    execution.status = 'completed';
    execution.finalAnswer = `Final answer: ${execution.goal}`;
    execution.updatedAt = nowIso();
  }

  return generatedSteps;
}

// ---------------------------------------------------------------------------
// App
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

// Health
app.get('/health', (_req, res) => res.json({ service: SERVICE_NAME, version: VERSION, port: PORT, status: 'ok' }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

// Create execution (auto-runs the stub LLM loop synchronously)
app.post('/api/executions', requireInternal, (req, res) => {
  const errs = validateExecution(req.body);
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });

  const executions = loadExecutions();
  const execution = normalizeExecution({ ...req.body, status: 'running' }, null);
  executions.push(execution);
  saveExecutions(executions);

  // Run the stub LLM loop synchronously
  runLoop(execution);

  // Persist the (possibly updated) execution
  const allExec = loadExecutions();
  const idx = findIndex(allExec, execution.id);
  if (idx !== -1) {
    allExec[idx] = execution;
    saveExecutions(allExec);
  }

  res.status(201).json({ ...summarizeExecution(execution), steps: loadSteps().filter((s) => s.executionId === execution.id) });
});

// List (with filters)
app.get('/api/executions', (req, res) => {
  let executions = loadExecutions();
  executions = byAgent(executions, req.query.agentId);
  executions = byPattern(executions, req.query.pattern);
  executions = byStatus(executions, req.query.status);
  res.json({ count: executions.length, executions: executions.map(summarizeExecution) });
});

// IMPORTANT: specific routes must come BEFORE :id
app.get('/api/executions/search', (req, res) => {
  let executions = loadExecutions();
  executions = byAgent(executions, req.query.agentId);
  executions = byPattern(executions, req.query.pattern);
  executions = byStatus(executions, req.query.status);
  res.json({ count: executions.length, executions: executions.map(summarizeExecution) });
});

// Get one
app.get('/api/executions/:id', (req, res) => {
  const executions = loadExecutions();
  const e = findExecution(executions, req.params.id);
  if (!e) return res.status(404).json({ error: 'not_found', id: req.params.id });
  res.json(summarizeExecution(e));
});

// Cancel
app.post('/api/executions/:id/cancel', requireInternal, (req, res) => {
  const executions = loadExecutions();
  const idx = findIndex(executions, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  if (executions[idx].status === 'completed' || executions[idx].status === 'failed' || executions[idx].status === 'cancelled') {
    return res.status(409).json({ error: 'invalid_state', currentStatus: executions[idx].status });
  }
  executions[idx].status = 'cancelled';
  executions[idx].updatedAt = nowIso();
  saveExecutions(executions);
  res.json(summarizeExecution(executions[idx]));
});

// Pause
app.post('/api/executions/:id/pause', requireInternal, (req, res) => {
  const executions = loadExecutions();
  const idx = findIndex(executions, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  if (executions[idx].status === 'completed' || executions[idx].status === 'failed' || executions[idx].status === 'cancelled') {
    return res.status(409).json({ error: 'invalid_state', currentStatus: executions[idx].status });
  }
  executions[idx].status = 'paused';
  executions[idx].updatedAt = nowIso();
  saveExecutions(executions);
  res.json(summarizeExecution(executions[idx]));
});

// Continue (resume from paused)
app.post('/api/executions/:id/continue', requireInternal, (req, res) => {
  const executions = loadExecutions();
  const idx = findIndex(executions, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  if (executions[idx].status !== 'paused') {
    return res.status(409).json({ error: 'invalid_state', currentStatus: executions[idx].status });
  }
  executions[idx].status = 'running';
  executions[idx].updatedAt = nowIso();

  // Run the loop from where it left off
  runLoop(executions[idx]);
  saveExecutions(executions);

  res.json(summarizeExecution(executions[idx]));
});

// List steps for an execution
app.get('/api/executions/:id/steps', (req, res) => {
  const executions = loadExecutions();
  if (!findExecution(executions, req.params.id)) {
    return res.status(404).json({ error: 'not_found', id: req.params.id });
  }
  const steps = loadSteps().filter((s) => s.executionId === req.params.id);
  res.json({ executionId: req.params.id, count: steps.length, steps });
});

// Manually add a step
app.post('/api/executions/:id/step', requireInternal, (req, res) => {
  const executions = loadExecutions();
  const idx = findIndex(executions, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });

  const errs = validateStep(req.body);
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });

  const s = normalizeStep({ ...req.body, executionId: req.params.id }, req.params.id);
  appendStep(s);
  executions[idx].stepIds.push(s.id);
  executions[idx].currentStep = (executions[idx].currentStep || 0) + 1;
  executions[idx].updatedAt = nowIso();
  saveExecutions(executions);
  res.status(201).json(s);
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
  PORT, SERVICE_NAME, VERSION,
  EXECUTIONS_FILE, STEPS_FILE, DEFAULT_MAX_STEPS,
  VALID_PATTERNS, VALID_STATUS, VALID_STEP_TYPES,
  validateExecution, validateStep, normalizeExecution, normalizeStep,
  buildReActPrompt, parseReActStep, shouldContinue, buildSummary,
  findReadySteps, generateReActNextStep, generatePlanSteps, generateReflectionSteps,
  loadExecutions, saveExecutions, loadSteps, saveSteps, appendStep,
  findExecution, byAgent, byPattern, byStatus, listAll, summarizeExecution, runLoop,
};
