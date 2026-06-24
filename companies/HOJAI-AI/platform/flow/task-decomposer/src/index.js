/**
 * Task Decomposer (port 5360) — Phase 14.1
 *
 * Breaks a high-level goal into a task dependency graph (DAG).
 *
 * Inputs:  { goal: string, context?: object, options?: { maxTasks?, depth?, useLlm? } }
 * Outputs: { goalId, tasks: [{id, name, description, dependsOn, durationMin, priority, kind}], warnings: [], source: 'llm'|'heuristic' }
 *
 * Pipeline:
 *   1. Try LLM-powered decomposition via inference-gateway (port 4770).
 *   2. Validate the response (tasks form a DAG, all dependencies exist, no cycles).
 *   3. If LLM unavailable / returns invalid JSON / times out → heuristic fallback.
 *   4. Heuristic decomposes by splitting on conjunctions and key verbs ("book", "order", etc.)
 *      and produces a sequential DAG with the option to parallelize steps that have no dependencies.
 *
 * Stores: in-memory + file-backed for persistence across restarts.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const http = require('node:http');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT, 10) || 5360;
const SERVICE_NAME = 'task-decomposer';
const VERSION = '1.0.0';
const INFERENCE_GATEWAY_URL = process.env.INFERENCE_GATEWAY_URL || 'http://localhost:4770';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const DATA_DIR = process.env.TASK_DECOMPOSER_DATA_DIR || path.join(__dirname, '../data');

// ---------------------------------------------------------------------------
// File-backed store
// ---------------------------------------------------------------------------

function ensureDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { /* ignore */ }
}
function storePath() { return path.join(DATA_DIR, 'decompositions.json'); }

function loadStore() {
  try {
    if (!fs.existsSync(storePath())) return new Map();
    const raw = fs.readFileSync(storePath(), 'utf8');
    return new Map(Object.entries(JSON.parse(raw)));
  } catch { return new Map(); }
}
function saveStore(map) {
  try {
    ensureDir();
    fs.writeFileSync(storePath(), JSON.stringify(Object.fromEntries(map), null, 2));
  } catch (e) { console.warn(`[${SERVICE_NAME}] save failed: ${e.message}`); }
}

const decompositions = loadStore();

// ---------------------------------------------------------------------------
// Heuristic decomposition (offline fallback)
// ---------------------------------------------------------------------------

const CONJUNCTIONS = /\b(and then|then|after that|afterwards|next|finally|and also|plus|also|and)\b/gi;
const VERB_PATTERN = /\b(book|order|buy|reserve|confirm|send|email|call|message|notify|create|set up|setup|schedule|plan|design|build|write|draft|publish|launch|review|verify|check|pay|transfer|reserve|allocate|hire|recruit|find|search|compare|purchase|acquire|register|sign up|enroll|apply|submit|request|approve|reject|negotiate|quote|invoice|charge|refund|track|ship|deliver|return|cancel|update|edit|fix|test|deploy|configure|install|monitor)\b/gi;

function heuristicDecompose(goal, options = {}) {
  const maxTasks = Math.min(Math.max(options.maxTasks || 8, 2), 20);
  // Split goal into clauses via conjunctions
  const parts = goal
    .split(CONJUNCTIONS)
    .map((p) => p.trim().replace(/^[,\s]+|[,\s]+$/g, ''))
    .filter((p) => p.length > 0 && p.length < 200);
  const clauses = parts.length > 1 ? parts : [goal];
  // Build tasks, each clause becomes a task, sequential by default
  const tasks = [];
  for (let i = 0; i < Math.min(clauses.length, maxTasks); i++) {
    const clause = clauses[i];
    const verbs = clause.match(VERB_PATTERN) || ['do'];
    const kind = verbs[0].toLowerCase().replace(/\s+/g, '_');
    const id = `t${i + 1}`;
    const dependsOn = i === 0 ? [] : [`t${i}`]; // sequential by default
    tasks.push({
      id,
      name: clause.length > 80 ? clause.slice(0, 77) + '...' : clause,
      description: clause,
      kind,
      dependsOn,
      durationMin: estimateDuration(clause),
      priority: i === 0 ? 'high' : (i === clauses.length - 1 ? 'low' : 'normal'),
      metadata: { source: 'heuristic', verb: verbs[0].toLowerCase() }
    });
  }
  return {
    tasks,
    warnings: ['heuristic decomposition: LLM unavailable or returned invalid plan'],
    source: 'heuristic'
  };
}

function estimateDuration(clause) {
  const len = clause.length;
  if (len < 30) return 5;
  if (len < 80) return 15;
  if (len < 150) return 30;
  return 60;
}

// ---------------------------------------------------------------------------
// DAG validation
// ---------------------------------------------------------------------------

function validateDag(tasks) {
  const errors = [];
  if (!Array.isArray(tasks) || tasks.length === 0) {
    errors.push('tasks must be a non-empty array');
    return { valid: false, errors };
  }
  const ids = new Set(tasks.map((t) => t.id));
  if (ids.size !== tasks.length) errors.push('duplicate task ids');
  for (const t of tasks) {
    if (!t.id) errors.push(`task missing id`);
    if (!t.name && !t.description) errors.push(`task ${t.id} missing name and description`);
    const deps = Array.isArray(t.dependsOn) ? t.dependsOn : [];
    if (t.dependsOn !== undefined && !Array.isArray(t.dependsOn)) errors.push(`task ${t.id} dependsOn must be array`);
    for (const dep of deps) {
      if (dep === t.id) errors.push(`task ${t.id} depends on itself`);
      if (!ids.has(dep)) errors.push(`task ${t.id} depends on missing ${dep}`);
    }
  }
  // Cycle detection via topological sort
  const indeg = new Map(tasks.map((t) => [t.id, (t.dependsOn || []).length]));
  const adj = new Map(tasks.map((t) => [t.id, tasks.filter((other) => (other.dependsOn || []).includes(t.id)).map((o) => o.id)]));
  const queue = tasks.filter((t) => indeg.get(t.id) === 0).map((t) => t.id);
  let visited = 0;
  while (queue.length > 0) {
    const n = queue.shift();
    visited += 1;
    for (const m of adj.get(n) || []) {
      indeg.set(m, indeg.get(m) - 1);
      if (indeg.get(m) === 0) queue.push(m);
    }
  }
  if (visited !== tasks.length) errors.push('cycle detected in dependency graph');
  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// LLM-powered decomposition (via inference-gateway)
// ---------------------------------------------------------------------------

const DECOMPOSE_PROMPT = (goal, ctx) => `You are a planning agent. Decompose this high-level goal into a task dependency graph (DAG). Return ONLY valid JSON — no prose, no markdown.

Goal: ${goal}

Context: ${JSON.stringify(ctx || {})}

Return this exact JSON shape:
{
  "tasks": [
    {
      "id": "t1",
      "name": "Short verb-noun title",
      "description": "What this task does in 1-2 sentences",
      "kind": "book|order|send|create|verify|...",
      "dependsOn": [],
      "durationMin": 15,
      "priority": "high|normal|low"
    }
  ]
}

Rules:
- 2 to 15 tasks.
- IDs: t1, t2, t3, ... (sequential)
- dependsOn uses IDs from this list (empty array for no dependencies).
- DAG must be acyclic (topological order).
- Parallel tasks: list them with empty dependsOn and reference them later via dependsOn.`;

async function llmDecompose(goal, context) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const body = JSON.stringify({
      messages: [
        { role: 'system', content: 'You decompose goals into JSON task graphs. Output only JSON.' },
        { role: 'user', content: DECOMPOSE_PROMPT(goal, context) }
      ],
      model: 'gpt-4o-mini',
      options: { temperature: 0.2, maxTokens: 1500 }
    });
    const headers = { 'Content-Type': 'application/json' };
    if (INTERNAL_SERVICE_TOKEN) headers['X-Internal-Token'] = INTERNAL_SERVICE_TOKEN;
    const r = await fetch(`${INFERENCE_GATEWAY_URL}/api/complete`, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });
    if (!r.ok) return null;
    const json = await r.json();
    const text = (json && json.text) || '';
    return extractJson(text);
  } catch (_) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function extractJson(text) {
  if (!text || typeof text !== 'string') return null;
  // Strip code fences if present
  let cleaned = text.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (fence) cleaned = fence[1].trim();
  // Try direct parse first
  try { return JSON.parse(cleaned); } catch (_) { /* fall through */ }
  // Find first { ... last }
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first === -1 || last === -1) return null;
  try { return JSON.parse(cleaned.slice(first, last + 1)); } catch (_) { return null; }
}

// ---------------------------------------------------------------------------
// Decompose entry point
// ---------------------------------------------------------------------------

async function decompose(goal, context = {}, options = {}) {
  if (typeof goal !== 'string' || goal.trim().length === 0) {
    throw Object.assign(new Error('goal must be a non-empty string'), { status: 400, code: 'VALIDATION_ERROR' });
  }
  if (goal.length > 2000) {
    throw Object.assign(new Error('goal too long (max 2000 chars)'), { status: 400, code: 'VALIDATION_ERROR' });
  }

  let result = null;
  if (options.useLlm !== false) {
    const llmResult = await llmDecompose(goal, context);
    if (llmResult && Array.isArray(llmResult.tasks)) {
      const validation = validateDag(llmResult.tasks);
      if (validation.valid) {
        result = { tasks: llmResult.tasks, warnings: llmResult.warnings || [], source: 'llm' };
      }
    }
  }
  if (!result) {
    result = heuristicDecompose(goal, options);
  }

  // Ensure tasks have all required fields, fill in defaults
  const tasks = result.tasks.map((t, i) => ({
    id: t.id || `t${i + 1}`,
    name: t.name || t.description || `Task ${i + 1}`,
    description: t.description || t.name || '',
    kind: t.kind || 'do',
    dependsOn: Array.isArray(t.dependsOn) ? t.dependsOn : [],
    durationMin: Number(t.durationMin) || 15,
    priority: ['high', 'normal', 'low'].includes(t.priority) ? t.priority : 'normal',
    metadata: t.metadata || {}
  }));
  // Renumber IDs sequentially if they're not in order
  const idMap = new Map();
  tasks.forEach((t, i) => { idMap.set(t.id, `t${i + 1}`); });
  for (const t of tasks) {
    t.id = idMap.get(t.id);
    t.dependsOn = (t.dependsOn || []).map((d) => idMap.get(d) || d).filter((d) => d !== t.id);
  }

  const goalId = crypto.randomUUID();
  const record = {
    goalId,
    goal,
    context,
    options,
    tasks,
    warnings: result.warnings || [],
    source: result.source,
    createdAt: new Date().toISOString()
  };
  decompositions.set(goalId, record);
  if (decompositions.size > 1000) {
    // Trim oldest entries to bound memory
    const first = decompositions.keys().next().value;
    decompositions.delete(first);
  }
  saveStore(decompositions);
  return record;
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

// Public health/readiness
app.get('/health', (_req, res) => res.redirect(301, '/api/health'));
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: VERSION,
    port: PORT,
    uptimeSec: Math.round(process.uptime()),
    stats: { decompositions: decompositions.size },
    inferenceGatewayUrl: INFERENCE_GATEWAY_URL,
    timestamp: new Date().toISOString()
  });
});
app.get('/ready', (_req, res) => res.json({ ready: true, ts: new Date().toISOString() }));

// POST /api/decompose — main entry point
app.post('/api/decompose', async (req, res, next) => {
  try {
    const { goal, context, options } = req.body || {};
    const record = await decompose(goal, context, options || {});
    res.status(201).json(record);
  } catch (err) { next(err); }
});

// GET /api/decompositions/:goalId — fetch a stored decomposition
app.get('/api/decompositions/:goalId', (req, res) => {
  const rec = decompositions.get(req.params.goalId);
  if (!rec) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(rec);
});

// GET /api/decompositions — list recent
app.get('/api/decompositions', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
  const all = Array.from(decompositions.values()).slice(-limit);
  res.json({ count: all.length, decompositions: all });
});

// Validate DAG (utility for callers that build plans manually)
app.post('/api/validate', (req, res) => {
  const { tasks } = req.body || {};
  const result = validateDag(tasks);
  res.status(result.valid ? 200 : 400).json(result);
});

// Error handler
app.use((err, _req, res, _next) => {
  if (err.status && err.code) {
    return res.status(err.status).json({ error: err.code, message: err.message });
  }
  console.error(`[${SERVICE_NAME}] unhandled error:`, err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});

// 404
app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

// ---------------------------------------------------------------------------
// Export for tests
// ---------------------------------------------------------------------------

module.exports = { app, decompose, validateDag, heuristicDecompose, extractJson, decompositions };

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

if (require.main === module) {
  ensureDir();
  const server = app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] listening on :${PORT} (inference-gateway: ${INFERENCE_GATEWAY_URL})`);
  });
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      console.log(`[${SERVICE_NAME}] received ${sig}, shutting down`);
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 5000).unref();
    });
  }
}
