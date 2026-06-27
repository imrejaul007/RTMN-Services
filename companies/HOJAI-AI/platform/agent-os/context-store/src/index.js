/**
 * context-store (port 4809) — Phase 32.5
 *
 * Per-agent context window management for HOJAI AI Agent OS. A context is a
 * per-agent sliding window of messages with token-budget enforcement.
 *
 * Messages can be `system`, `user`, `assistant`, or `tool` roles. Token
 * estimation uses `Math.ceil(content.length / TOKENS_PER_CHAR)`.
 *
 * Storage: file-backed JSON in data/contexts.json
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = parseInt(process.env.PORT, 10) || 4809;
const SERVICE_NAME = 'context-store';
const VERSION = '1.0.0';
const DATA_DIR = process.env.CONTEXT_STORE_DATA_DIR || path.join(__dirname, '../data');
const CONTEXTS_FILE = path.join(DATA_DIR, 'contexts.json');
const DEFAULT_MAX_TOKENS = 8000;
const TOKENS_PER_CHAR = parseInt(process.env.TOKENS_PER_CHAR, 10) || 4;

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { /* ignore */ } }
function nowIso() { return new Date().toISOString(); }
function rid() { return crypto.randomBytes(8).toString('hex'); }
function contextId() { return `ctx_${rid()}`; }

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_ROLES = ['system', 'user', 'assistant', 'tool'];

function validateContext(body) {
  const errors = [];
  if (!body || typeof body !== 'object') { errors.push('body must be object'); return errors; }
  if (!body.agentId || typeof body.agentId !== 'string') errors.push('agentId required (string)');
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.push('name required (non-empty string)');
  }
  if (body.systemPrompt !== undefined && typeof body.systemPrompt !== 'string') {
    errors.push('systemPrompt must be string when provided');
  }
  if (body.maxTokens !== undefined) {
    if (typeof body.maxTokens !== 'number' || !Number.isInteger(body.maxTokens) || body.maxTokens <= 0) {
      errors.push('maxTokens must be positive integer');
    }
  }
  return errors;
}

function validateMessage(body) {
  const errors = [];
  if (!body || typeof body !== 'object') { errors.push('body must be object'); return errors; }
  if (!body.role || !VALID_ROLES.includes(body.role)) {
    errors.push(`role must be one of ${VALID_ROLES.join(',')}`);
  }
  if (!body.content || typeof body.content !== 'string' || body.content.length === 0) {
    errors.push('content required (non-empty string)');
  }
  if (body.toolCallId !== undefined && typeof body.toolCallId !== 'string') {
    errors.push('toolCallId must be string when provided');
  }
  if (body.name !== undefined && typeof body.name !== 'string') {
    errors.push('name must be string when provided');
  }
  return errors;
}

function normalizeContext(body, existing) {
  const now = nowIso();
  return {
    id: body.id || existing?.id || contextId(),
    agentId: body.agentId || existing?.agentId,
    name: body.name || existing?.name,
    systemPrompt: body.systemPrompt !== undefined ? body.systemPrompt : (existing?.systemPrompt || ''),
    messages: Array.isArray(body.messages) ? body.messages : (existing?.messages || []),
    maxTokens: body.maxTokens !== undefined ? body.maxTokens : (existing?.maxTokens || DEFAULT_MAX_TOKENS),
    currentTokens: body.currentTokens !== undefined ? body.currentTokens : (existing?.currentTokens || 0),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

function normalizeMessage(body) {
  const now = nowIso();
  const content = body.content || '';
  return {
    role: body.role,
    content,
    toolCallId: body.toolCallId || null,
    name: body.name || null,
    tokens: estimateTokens(content),
    timestamp: body.timestamp || now,
    metadata: body.metadata || null,
  };
}

// ---------------------------------------------------------------------------
// Pure functions - token math & window management
// ---------------------------------------------------------------------------

function estimateTokens(content) {
  if (content === null || content === undefined) return 0;
  if (typeof content !== 'string') content = String(content);
  return Math.ceil(content.length / TOKENS_PER_CHAR);
}

function isPinned(message) {
  if (!message || typeof message !== 'object') return false;
  if (message.role === 'system') return true;
  if (message.metadata && message.metadata.pin === true) return true;
  return false;
}

function recomputeCurrentTokens(context) {
  if (!context || typeof context !== 'object') return 0;
  if (!Array.isArray(context.messages)) return 0;
  let total = 0;
  for (const m of context.messages) {
    if (m && typeof m.tokens === 'number') total += m.tokens;
    else if (m && typeof m.content === 'string') total += estimateTokens(m.content);
  }
  return total;
}

function appendMessage(context, message) {
  if (!context || typeof context !== 'object') return { context: null, trimmed: 0 };
  if (!message || typeof message !== 'object') return { context, trimmed: 0 };
  const messages = Array.isArray(context.messages) ? [...context.messages] : [];
  messages.push(message);
  let trimmed = 0;

  // Recompute currentTokens; if over budget, drop oldest non-system non-pinned
  let total = recomputeCurrentTokens({ ...context, messages });
  const maxTokens = context.maxTokens || DEFAULT_MAX_TOKENS;
  while (total > maxTokens && messages.length > 0) {
    // Find oldest non-pinned index
    let dropIdx = -1;
    for (let i = 0; i < messages.length; i += 1) {
      if (!isPinned(messages[i])) { dropIdx = i; break; }
    }
    if (dropIdx === -1) break; // all pinned; cannot trim
    total -= (messages[dropIdx].tokens || estimateTokens(messages[dropIdx].content || ''));
    messages.splice(dropIdx, 1);
    trimmed += 1;
  }

  const updated = { ...context, messages, currentTokens: total, updatedAt: nowIso() };
  return { context: updated, trimmed };
}

function trimContext(context, targetTokens) {
  if (!context || typeof context !== 'object') return { context: null, trimmed: 0 };
  const messages = Array.isArray(context.messages) ? [...context.messages] : [];
  const target = (typeof targetTokens === 'number' && targetTokens > 0)
    ? targetTokens
    : (context.maxTokens || DEFAULT_MAX_TOKENS);
  let trimmed = 0;
  let total = recomputeCurrentTokens({ ...context, messages });
  while (total > target && messages.length > 0) {
    let dropIdx = -1;
    for (let i = 0; i < messages.length; i += 1) {
      if (!isPinned(messages[i])) { dropIdx = i; break; }
    }
    if (dropIdx === -1) break;
    total -= (messages[dropIdx].tokens || estimateTokens(messages[dropIdx].content || ''));
    messages.splice(dropIdx, 1);
    trimmed += 1;
  }
  const updated = { ...context, messages, currentTokens: total, updatedAt: nowIso() };
  return { context: updated, trimmed };
}

function composePrompt(context) {
  if (!context || typeof context !== 'object') {
    return { system: '', messages: [], totalTokens: 0 };
  }
  const maxTokens = context.maxTokens || DEFAULT_MAX_TOKENS;
  const messages = Array.isArray(context.messages) ? context.messages : [];

  // Reserve room for system prompt
  const system = context.systemPrompt || '';
  let budget = maxTokens - estimateTokens(system);
  if (budget < 0) budget = 0;

  // Take most-recent-first until budget exhausted
  const picked = [];
  let total = 0;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    const t = m.tokens || estimateTokens(m.content || '');
    if (total + t > budget) continue;
    picked.push({ role: m.role, content: m.content });
    total += t;
  }
  picked.reverse();

  return { system, messages: picked, totalTokens: total + estimateTokens(system) };
}

function calculateUtilization(context) {
  if (!context || typeof context !== 'object') return 0;
  const max = context.maxTokens || DEFAULT_MAX_TOKENS;
  if (max <= 0) return 0;
  const cur = context.currentTokens || 0;
  const u = cur / max;
  if (u < 0) return 0;
  if (u > 1) return 1;
  return u;
}

function messagesWithinBudget(context) {
  if (!context || typeof context !== 'object') return [];
  if (!Array.isArray(context.messages)) return [];
  return context.messages.filter((m) => isPinned(m) || (m.tokens || 0) <= (context.maxTokens || DEFAULT_MAX_TOKENS));
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function loadContexts() {
  ensureDir();
  if (!fs.existsSync(CONTEXTS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(CONTEXTS_FILE, 'utf8')); } catch { return []; }
}

function saveContexts(contexts) {
  ensureDir();
  fs.writeFileSync(CONTEXTS_FILE, JSON.stringify(contexts, null, 2));
}

function findContext(contexts, id) { return contexts.find((c) => c.id === id) || null; }
function findContextIndex(contexts, id) { return contexts.findIndex((c) => c.id === id); }
function byAgent(contexts, agentId) {
  if (!agentId) return contexts;
  return contexts.filter((c) => c.agentId === agentId);
}
function searchByName(contexts, query) {
  if (!query || typeof query !== 'string') return contexts;
  const q = query.toLowerCase();
  return contexts.filter((c) => typeof c.name === 'string' && c.name.toLowerCase().includes(q));
}
function listAll(contexts) { return contexts; }

function summarizeContext(context) {
  if (!context || typeof context !== 'object') return null;
  return {
    id: context.id,
    agentId: context.agentId,
    name: context.name,
    systemPrompt: context.systemPrompt || '',
    maxTokens: context.maxTokens,
    currentTokens: context.currentTokens || 0,
    messageCount: Array.isArray(context.messages) ? context.messages.length : 0,
    utilization: calculateUtilization(context),
    createdAt: context.createdAt,
    updatedAt: context.updatedAt,
  };
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

// Create context
app.post('/api/contexts', requireInternal, (req, res) => {
  const errs = validateContext(req.body);
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });

  const contexts = loadContexts();
  const context = normalizeContext(req.body, null);
  // If a systemPrompt is provided at creation, ensure currentTokens counts it
  if (context.systemPrompt) {
    context.currentTokens = estimateTokens(context.systemPrompt);
  }
  contexts.push(context);
  saveContexts(contexts);
  res.status(201).json(summarizeContext(context));
});

// List (with agentId filter)
app.get('/api/contexts', (req, res) => {
  let contexts = loadContexts();
  contexts = byAgent(contexts, req.query.agentId);
  res.json({ count: contexts.length, contexts: contexts.map(summarizeContext) });
});

// IMPORTANT: specific routes must come BEFORE /:id
app.get('/api/contexts/search', (req, res) => {
  let contexts = loadContexts();
  contexts = byAgent(contexts, req.query.agentId);
  contexts = searchByName(contexts, req.query.name);
  res.json({ count: contexts.length, contexts: contexts.map(summarizeContext) });
});

// Get one
app.get('/api/contexts/:id', (req, res) => {
  const contexts = loadContexts();
  const c = findContext(contexts, req.params.id);
  if (!c) return res.status(404).json({ error: 'not_found', id: req.params.id });
  res.json(summarizeContext(c));
});

// Update (PATCH)
app.patch('/api/contexts/:id', requireInternal, (req, res) => {
  const contexts = loadContexts();
  const idx = findContextIndex(contexts, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });

  // Build merged body from existing + patch
  const patch = req.body || {};
  const merged = {
    agentId: patch.agentId !== undefined ? patch.agentId : contexts[idx].agentId,
    name: patch.name !== undefined ? patch.name : contexts[idx].name,
    systemPrompt: patch.systemPrompt !== undefined ? patch.systemPrompt : contexts[idx].systemPrompt,
    maxTokens: patch.maxTokens !== undefined ? patch.maxTokens : contexts[idx].maxTokens,
    messages: contexts[idx].messages,
  };

  // Light validation on patch fields
  const errs = [];
  if (merged.name !== undefined && (typeof merged.name !== 'string' || merged.name.trim().length === 0)) {
    errs.push('name must be non-empty string');
  }
  if (merged.systemPrompt !== undefined && typeof merged.systemPrompt !== 'string') {
    errs.push('systemPrompt must be string');
  }
  if (merged.maxTokens !== undefined && (typeof merged.maxTokens !== 'number' || !Number.isInteger(merged.maxTokens) || merged.maxTokens <= 0)) {
    errs.push('maxTokens must be positive integer');
  }
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });

  const updated = normalizeContext(merged, contexts[idx]);
  // currentTokens reflects current messages + systemPrompt
  updated.currentTokens = recomputeCurrentTokens(updated) + estimateTokens(updated.systemPrompt || '');

  // If new maxTokens causes overflow, auto-trim
  let trimmed = 0;
  if (updated.currentTokens > updated.maxTokens) {
    const r = trimContext(updated, updated.maxTokens);
    updated.messages = r.context.messages;
    updated.currentTokens = r.context.currentTokens;
    trimmed = r.trimmed;
  }
  updated.updatedAt = nowIso();

  contexts[idx] = updated;
  saveContexts(contexts);
  res.json({ ...summarizeContext(updated), trimmed });
});

// Delete context
app.delete('/api/contexts/:id', requireInternal, (req, res) => {
  const contexts = loadContexts();
  const idx = findContextIndex(contexts, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  const removed = contexts.splice(idx, 1)[0];
  saveContexts(contexts);
  res.json({ deleted: true, id: removed.id });
});

// Append message (specific route BEFORE /:id)
app.post('/api/contexts/:id/messages', requireInternal, (req, res) => {
  const contexts = loadContexts();
  const idx = findContextIndex(contexts, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });

  const errs = validateMessage(req.body);
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });

  const msg = normalizeMessage(req.body);
  const result = appendMessage(contexts[idx], msg);
  contexts[idx] = result.context;
  saveContexts(contexts);
  res.status(201).json({ message: msg, currentTokens: contexts[idx].currentTokens, maxTokens: contexts[idx].maxTokens, trimmed: result.trimmed });
});

// Clear all messages (keep system prompt)
app.delete('/api/contexts/:id/messages', requireInternal, (req, res) => {
  const contexts = loadContexts();
  const idx = findContextIndex(contexts, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  contexts[idx].messages = [];
  contexts[idx].currentTokens = estimateTokens(contexts[idx].systemPrompt || '');
  contexts[idx].updatedAt = nowIso();
  saveContexts(contexts);
  res.json({ cleared: true, currentTokens: contexts[idx].currentTokens });
});

// List messages
app.get('/api/contexts/:id/messages', (req, res) => {
  const contexts = loadContexts();
  const c = findContext(contexts, req.params.id);
  if (!c) return res.status(404).json({ error: 'not_found', id: req.params.id });
  res.json({ contextId: c.id, count: c.messages.length, messages: c.messages });
});

// Compose prompt (specific route BEFORE /:id)
app.get('/api/contexts/:id/prompt', (req, res) => {
  const contexts = loadContexts();
  const c = findContext(contexts, req.params.id);
  if (!c) return res.status(404).json({ error: 'not_found', id: req.params.id });
  res.json(composePrompt(c));
});

// Manual trim
app.post('/api/contexts/:id/trim', requireInternal, (req, res) => {
  const contexts = loadContexts();
  const idx = findContextIndex(contexts, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  const target = req.body && typeof req.body.targetTokens === 'number' ? req.body.targetTokens : undefined;
  const r = trimContext(contexts[idx], target);
  contexts[idx] = r.context;
  saveContexts(contexts);
  res.json({ trimmed: r.trimmed, currentTokens: contexts[idx].currentTokens, maxTokens: contexts[idx].maxTokens });
});

// Token stats
app.get('/api/contexts/:id/tokens', (req, res) => {
  const contexts = loadContexts();
  const c = findContext(contexts, req.params.id);
  if (!c) return res.status(404).json({ error: 'not_found', id: req.params.id });
  res.json({
    currentTokens: c.currentTokens || 0,
    maxTokens: c.maxTokens,
    utilization: calculateUtilization(c),
  });
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
  CONTEXTS_FILE, DEFAULT_MAX_TOKENS, TOKENS_PER_CHAR,
  VALID_ROLES,
  validateContext, validateMessage, normalizeContext, normalizeMessage,
  estimateTokens, appendMessage, trimContext, composePrompt,
  calculateUtilization, messagesWithinBudget,
  loadContexts, saveContexts,
  findContext, byAgent, searchByName, listAll, summarizeContext,
};