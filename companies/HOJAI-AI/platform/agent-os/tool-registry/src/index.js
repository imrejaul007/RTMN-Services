/**
 * tool-registry (port 4805) — Phase 32.3
 *
 * Catalog of tools (concrete functions agents can call). Each tool has:
 *   id, name, description, inputSchema (JSON Schema-like), outputSchema,
 *   auth (required scope string), rateLimit (calls/minute),
 *   endpoint, method, kind ('local' or 'remote').
 *
 * Storage: file-backed JSON in data/tools.json + data/invocations.jsonl
 *   - tools.json: array of tool records
 *   - invocations.jsonl: one JSON record per line
 *       { id, toolId, input, output, statusCode, ok, error, startedAt, endedAt, durationMs }
 *
 * ID prefixes:
 *   - tool_xxxxxx   for tools
 *   - inv_xxxxxx    for invocations
 *
 * Rate limiting: in-process Map<toolId, timestamps[]>. 60s sliding window.
 *   null / missing limit = unlimited.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = parseInt(process.env.PORT, 10) || 4805;
const SERVICE_NAME = 'tool-registry';
const VERSION = '1.0.0';
const DATA_DIR = process.env.TOOL_REGISTRY_DATA_DIR || path.join(__dirname, '../data');
const TOOLS_FILE = path.join(DATA_DIR, 'tools.json');
const INVOCATIONS_FILE = path.join(DATA_DIR, 'invocations.jsonl');
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

const VALID_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const VALID_KINDS = ['local', 'remote'];

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { /* ignore */ } }
function nowIso() { return new Date().toISOString(); }
function rid() { return crypto.randomBytes(8).toString('hex'); }
function toolId() { return `tool_${rid()}`; }
function invocationId() { return `inv_${rid()}`; }

// In-process rate limit state: Map<toolId, number[]>
const rateLimitState = new Map();

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isPlainObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

function validateSchema(schema, label) {
  const errors = [];
  if (!isPlainObject(schema)) {
    errors.push(`${label} must be an object`);
    return errors;
  }
  if (!schema.type || typeof schema.type !== 'string') {
    errors.push(`${label}.type required (string)`);
  }
  return errors;
}

function validateMethod(method) {
  if (method === undefined || method === null) return null; // optional in body for PATCH
  if (typeof method !== 'string') return 'method must be string';
  if (!VALID_METHODS.includes(method)) return `method must be one of ${VALID_METHODS.join(',')}`;
  return null;
}

function validateTool(body) {
  const errors = [];
  if (!body || typeof body !== 'object') { errors.push('body must be object'); return errors; }
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.push('name required (non-empty string)');
  }
  if (body.kind !== undefined && body.kind !== null && !VALID_KINDS.includes(body.kind)) {
    errors.push(`kind must be one of ${VALID_KINDS.join(',')}`);
  }
  if (body.kind !== undefined && body.kind !== null && body.kind === 'remote' && !body.endpoint) {
    errors.push('endpoint required for remote tools');
  }
  if (body.endpoint !== undefined && body.endpoint !== null) {
    if (typeof body.endpoint !== 'string') {
      errors.push('endpoint must be string');
    } else {
      try { new URL(body.endpoint); } catch (_) { errors.push('endpoint must be a valid URL'); }
    }
  }
  if (body.method !== undefined && body.method !== null) {
    const m = validateMethod(body.method);
    if (m) errors.push(m);
  }
  if (body.inputSchema !== undefined && body.inputSchema !== null) {
    const sErrs = validateSchema(body.inputSchema, 'inputSchema');
    errors.push(...sErrs);
  }
  if (body.outputSchema !== undefined && body.outputSchema !== null) {
    const sErrs = validateSchema(body.outputSchema, 'outputSchema');
    errors.push(...sErrs);
  }
  if (body.rateLimit !== undefined && body.rateLimit !== null) {
    if (typeof body.rateLimit !== 'number' || !Number.isInteger(body.rateLimit) || body.rateLimit <= 0) {
      errors.push('rateLimit must be positive integer');
    }
  }
  return errors;
}

function normalizeTool(body, existing) {
  const now = nowIso();
  const t = {
    id: body.id || existing?.id || toolId(),
    name: body.name || existing?.name,
    description: body.description !== undefined ? body.description : (existing?.description ?? ''),
    inputSchema: body.inputSchema !== undefined ? body.inputSchema : (existing?.inputSchema ?? { type: 'object' }),
    outputSchema: body.outputSchema !== undefined ? body.outputSchema : (existing?.outputSchema ?? { type: 'object' }),
    auth: body.auth !== undefined ? body.auth : (existing?.auth ?? null),
    rateLimit: body.rateLimit !== undefined ? body.rateLimit : (existing?.rateLimit ?? null),
    endpoint: body.endpoint !== undefined ? body.endpoint : (existing?.endpoint ?? null),
    method: body.method || existing?.method || 'GET',
    kind: body.kind || existing?.kind || 'remote',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  return t;
}

// ---------------------------------------------------------------------------
// Pure functions - filters & lookup
// ---------------------------------------------------------------------------

function byKind(tools, kind) {
  if (!kind) return tools;
  return tools.filter((t) => t.kind === kind);
}
function byMethod(tools, method) {
  if (!method) return tools;
  return tools.filter((t) => t.method === method);
}
function searchByName(tools, name, kind) {
  let out = tools;
  if (name) {
    const needle = String(name).toLowerCase();
    out = out.filter((t) => (t.name || '').toLowerCase().includes(needle));
  }
  if (kind) out = out.filter((t) => t.kind === kind);
  return out;
}
function findTool(tools, id) { return tools.find((t) => t.id === id) || null; }
function findToolIndex(tools, id) { return tools.findIndex((t) => t.id === id); }
function listAll(tools) { return tools; }

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

function checkRateLimit(toolIdKey, limit) {
  // null / undefined / 0 means unlimited
  if (limit === undefined || limit === null) return { allowed: true, remaining: null };
  if (typeof limit !== 'number' || limit <= 0) return { allowed: true, remaining: null };
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  let stamps = rateLimitState.get(toolIdKey) || [];
  // drop stamps outside the window
  stamps = stamps.filter((t) => t > cutoff);
  if (stamps.length >= limit) {
    rateLimitState.set(toolIdKey, stamps);
    return { allowed: false, remaining: 0 };
  }
  stamps.push(now);
  rateLimitState.set(toolIdKey, stamps);
  return { allowed: true, remaining: limit - stamps.length };
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function loadTools() {
  ensureDir();
  if (!fs.existsSync(TOOLS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(TOOLS_FILE, 'utf8')); } catch { return []; }
}
function saveTools(tools) {
  ensureDir();
  fs.writeFileSync(TOOLS_FILE, JSON.stringify(tools, null, 2));
}
function loadInvocations() {
  ensureDir();
  if (!fs.existsSync(INVOCATIONS_FILE)) return [];
  const out = [];
  const txt = fs.readFileSync(INVOCATIONS_FILE, 'utf8');
  if (!txt) return out;
  const lines = txt.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try { out.push(JSON.parse(trimmed)); } catch (_) { /* skip bad line */ }
  }
  return out;
}
function saveInvocations(invs) {
  ensureDir();
  const txt = invs.map((i) => JSON.stringify(i)).join('\n') + (invs.length ? '\n' : '');
  fs.writeFileSync(INVOCATIONS_FILE, txt);
}
function appendInvocation(inv) {
  ensureDir();
  fs.appendFileSync(INVOCATIONS_FILE, JSON.stringify(inv) + '\n');
  return inv;
}

// ---------------------------------------------------------------------------
// Invocation summary
// ---------------------------------------------------------------------------

function buildInvocation({ toolId: tid, input, output, statusCode, ok, error, startedAt, endedAt, durationMs }) {
  return {
    id: invocationId(),
    toolId: tid,
    input: input !== undefined ? input : null,
    output: output !== undefined ? output : null,
    statusCode: statusCode !== undefined ? statusCode : null,
    ok: ok !== undefined ? ok : false,
    error: error !== undefined ? error : null,
    startedAt: startedAt || nowIso(),
    endedAt: endedAt || nowIso(),
    durationMs: durationMs !== undefined ? durationMs : 0,
  };
}

function summarizeInvocations(invs) {
  const total = invs.length;
  let success = 0;
  let failure = 0;
  let totalDuration = 0;
  for (const i of invs) {
    if (i.ok) success += 1; else failure += 1;
    totalDuration += (typeof i.durationMs === 'number' ? i.durationMs : 0);
  }
  return {
    total,
    success,
    failure,
    avgDurationMs: total ? Math.round(totalDuration / total) : 0,
  };
}

// ---------------------------------------------------------------------------
// HTTP proxy for remote tool invocation
// ---------------------------------------------------------------------------

async function proxyRemote(tool, input) {
  const startedAt = nowIso();
  const start = Date.now();
  try {
    const init = { method: tool.method || 'GET', headers: { 'Content-Type': 'application/json' } };
    if (tool.method && tool.method !== 'GET' && tool.method !== 'DELETE') {
      init.body = JSON.stringify(input === undefined ? {} : input);
    }
    // Use AbortController for an outer timeout (30s)
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30_000);
    init.signal = ctrl.signal;
    let res;
    try {
      res = await fetch(tool.endpoint, init);
    } finally {
      clearTimeout(t);
    }
    let body = null;
    const ctype = res.headers.get('content-type') || '';
    if (ctype.includes('application/json')) {
      try { body = await res.json(); } catch { body = null; }
    } else {
      try { body = await res.text(); } catch { body = null; }
    }
    const endedAt = nowIso();
    return {
      statusCode: res.status,
      ok: res.ok,
      output: body,
      error: null,
      startedAt,
      endedAt,
      durationMs: Date.now() - start,
    };
  } catch (e) {
    const endedAt = nowIso();
    return {
      statusCode: 502,
      ok: false,
      output: null,
      error: e && e.message ? e.message : String(e),
      startedAt,
      endedAt,
      durationMs: Date.now() - start,
    };
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

app.get('/health', (_req, res) => res.json({ service: SERVICE_NAME, version: VERSION, port: PORT, status: 'ok' }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

// Create tool
app.post('/api/tools', (req, res) => {
  const errs = validateTool(req.body);
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });

  const tools = loadTools();
  const tool = normalizeTool({ ...req.body }, null);
  tools.push(tool);
  saveTools(tools);
  res.status(201).json(tool);
});

// List (with filters: ?kind=, ?method=, ?name=substring)
app.get('/api/tools', (req, res) => {
  let tools = loadTools();
  tools = byKind(tools, req.query.kind);
  tools = byMethod(tools, req.query.method);
  if (req.query.name) {
    const needle = String(req.query.name).toLowerCase();
    tools = tools.filter((t) => (t.name || '').toLowerCase().includes(needle));
  }
  res.json({ count: tools.length, tools });
});

// IMPORTANT: specific routes MUST come BEFORE /api/tools/:id
app.get('/api/tools/search', (req, res) => {
  let tools = loadTools();
  tools = searchByName(tools, req.query.name, req.query.kind);
  res.json({ count: tools.length, tools });
});

// Get one
app.get('/api/tools/:id', (req, res) => {
  const tools = loadTools();
  const t = findTool(tools, req.params.id);
  if (!t) return res.status(404).json({ error: 'not_found', id: req.params.id });
  res.json(t);
});

// Update (PATCH - in place, no version)
app.patch('/api/tools/:id', (req, res) => {
  const tools = loadTools();
  const idx = findToolIndex(tools, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });

  // Merge existing + patch and validate the merged result
  const merged = { ...tools[idx], ...req.body, id: tools[idx].id };
  const errs = validateTool(merged);
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });

  const updated = normalizeTool(merged, tools[idx]);
  tools[idx] = updated;
  saveTools(tools);
  res.json(updated);
});

// Delete
app.delete('/api/tools/:id', (req, res) => {
  const tools = loadTools();
  const idx = findToolIndex(tools, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  const [removed] = tools.splice(idx, 1);
  saveTools(tools);
  res.json({ deleted: true, id: removed.id });
});

// Invoke a tool (remote: proxy HTTP; local: 400)
app.post('/api/tools/:id/invoke', async (req, res) => {
  const tools = loadTools();
  const idx = findToolIndex(tools, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  const tool = tools[idx];

  if (tool.kind === 'local') {
    const inv = buildInvocation({
      toolId: tool.id,
      input: req.body?.input !== undefined ? req.body.input : req.body,
      statusCode: 400,
      ok: false,
      error: 'local_tool_invocation_not_supported',
      durationMs: 0,
    });
    appendInvocation(inv);
    return res.status(400).json({ error: 'local_tool_invocation_not_supported', toolId: tool.id });
  }

  // Rate limit check (do this BEFORE proxying)
  const rl = checkRateLimit(tool.id, tool.rateLimit);
  if (!rl.allowed) {
    const inv = buildInvocation({
      toolId: tool.id,
      input: req.body?.input !== undefined ? req.body.input : req.body,
      statusCode: 429,
      ok: false,
      error: 'rate_limit_exceeded',
      durationMs: 0,
    });
    appendInvocation(inv);
    return res.status(429).json({ error: 'rate_limit_exceeded', toolId: tool.id, limit: tool.rateLimit });
  }

  // Remote: proxy the HTTP call
  const input = req.body?.input !== undefined ? req.body.input : req.body;
  const result = await proxyRemote(tool, input);

  const inv = buildInvocation({
    toolId: tool.id,
    input,
    output: result.output,
    statusCode: result.statusCode,
    ok: result.ok,
    error: result.error,
    startedAt: result.startedAt,
    endedAt: result.endedAt,
    durationMs: result.durationMs,
  });
  appendInvocation(inv);

  if (!result.ok) {
    return res.status(result.statusCode >= 400 && result.statusCode < 600 ? result.statusCode : 502)
      .json({ error: result.error || 'upstream_failure', invocation: inv });
  }
  res.json({ invocation: inv, output: result.output });
});

// List invocations for one tool
app.get('/api/tools/:id/invocations', (req, res) => {
  const tools = loadTools();
  if (!findTool(tools, req.params.id)) {
    return res.status(404).json({ error: 'not_found', id: req.params.id });
  }
  const invs = loadInvocations().filter((i) => i.toolId === req.params.id);
  res.json({ toolId: req.params.id, count: invs.length, invocations: invs });
});

// List all invocations (filters: ?toolId=, ?since=, ?ok=true|false)
app.get('/api/invocations', (req, res) => {
  let invs = loadInvocations();
  if (req.query.toolId) invs = invs.filter((i) => i.toolId === req.query.toolId);
  if (req.query.since) {
    const sinceTs = Date.parse(req.query.since);
    if (!Number.isNaN(sinceTs)) {
      invs = invs.filter((i) => {
        const t = Date.parse(i.startedAt || i.endedAt || '');
        return !Number.isNaN(t) && t >= sinceTs;
      });
    }
  }
  if (req.query.ok !== undefined && req.query.ok !== '') {
    const wantOk = String(req.query.ok) === 'true' || req.query.ok === true;
    invs = invs.filter((i) => Boolean(i.ok) === wantOk);
  }
  res.json({ count: invs.length, invocations: invs });
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
  TOOLS_FILE, INVOCATIONS_FILE, DATA_DIR,
  VALID_METHODS, VALID_KINDS, RATE_LIMIT_WINDOW_MS,
  // validation / normalization
  validateTool, normalizeTool, validateSchema, validateMethod,
  // filters / lookup
  byKind, byMethod, searchByName, findTool, listAll,
  // rate limit
  checkRateLimit,
  // invocations
  buildInvocation, summarizeInvocations,
  // storage
  loadTools, saveTools, loadInvocations, saveInvocations, appendInvocation,
  // proxy
  proxyRemote,
};
