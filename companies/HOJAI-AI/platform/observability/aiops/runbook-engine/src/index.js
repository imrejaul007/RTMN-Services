/**
 * runbook-engine — Runbook CRUD + execution + parameter binding
 * Port: 5333
 *
 * Runbooks are ordered lists of steps. Steps can have parameter templates
 * ({{var}} substitution). Executions track state per run.
 *
 * Storage: $DATA_DIR/runbooks.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5333', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'aiops-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'runbooks.json');

const VALID_STEP_TYPES = ['command', 'http', 'wait', 'note', 'approval'];
const VALID_EXEC_STATUSES = ['pending', 'running', 'completed', 'failed', 'aborted'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ runbooks: {}, executions: {} }, null, 2));
  }
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { runbooks: {}, executions: {} }; } }
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function substituteParams(text, params) {
  if (typeof text !== 'string') return text;
  return text.replace(/\{\{(\w+)\}\}/g, (m, key) => params[key] !== undefined ? params[key] : m);
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function validateRunbook(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.name) return 'name required';
  if (!Array.isArray(body.steps) || body.steps.length === 0) return 'steps array required';
  for (let i = 0; i < body.steps.length; i++) {
    const s = body.steps[i];
    if (!s.type || !VALID_STEP_TYPES.includes(s.type)) return `step ${i}: type must be one of ${VALID_STEP_TYPES.join(',')}`;
    if (s.type === 'command' && !s.command) return `step ${i}: command required for type=command`;
    if (s.type === 'http' && !s.url) return `step ${i}: url required for type=http`;
  }
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'runbook-engine', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // ---- Runbook CRUD ----
  app.post('/runbooks', requireInternal, (req, res) => {
    const err = validateRunbook(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const data = loadAll();
    const { name, description = '', tags = [], parameters = [], steps } = req.body;
    const runbook = {
      id: newId('rbk'),
      name, description, tags,
      parameters: Array.isArray(parameters) ? parameters : [],
      steps,
      version: 1,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    data.runbooks[runbook.id] = runbook;
    saveAll(data);
    res.status(201).json(runbook);
  });

  app.get('/runbooks', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.runbooks);
    if (req.query.tag) items = items.filter((r) => r.tags.includes(req.query.tag));
    res.json({ count: items.length, runbooks: items });
  });

  app.get('/runbooks/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const r = data.runbooks[req.params.id];
    if (!r) return res.status(404).json({ error: 'not_found' });
    res.json(r);
  });

  app.put('/runbooks/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const r = data.runbooks[req.params.id];
    if (!r) return res.status(404).json({ error: 'not_found' });
    const err = validateRunbook({ ...r, ...req.body });
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const { name, description, tags, parameters, steps } = req.body;
    if (name !== undefined) r.name = name;
    if (description !== undefined) r.description = description;
    if (tags !== undefined) r.tags = tags;
    if (parameters !== undefined) r.parameters = parameters;
    if (steps !== undefined) {
      r.steps = steps;
      r.version = (r.version || 1) + 1;
    }
    r.updated_at = nowIso();
    saveAll(data);
    res.json(r);
  });

  app.delete('/runbooks/:id', requireInternal, (req, res) => {
    const data = loadAll();
    if (!data.runbooks[req.params.id]) return res.status(404).json({ error: 'not_found' });
    delete data.runbooks[req.params.id];
    saveAll(data);
    res.json({ deleted: true, id: req.params.id });
  });

  // ---- Execution ----
  app.post('/runbooks/:id/execute', requireInternal, (req, res) => {
    const data = loadAll();
    const r = data.runbooks[req.params.id];
    if (!r) return res.status(404).json({ error: 'not_found' });
    const params = (req.body && req.body.parameters) || {};
    const triggered_by = (req.body && req.body.triggered_by) || 'manual';

    // Validate params against declared parameters
    const missing = [];
    for (const p of r.parameters) {
      if (p.required && params[p.name] === undefined) missing.push(p.name);
    }
    if (missing.length) return res.status(400).json({ error: 'validation', message: `missing required params: ${missing.join(',')}` });

    const execution = {
      id: newId('exe'),
      runbook_id: r.id,
      runbook_version: r.version,
      parameters: params,
      triggered_by,
      status: 'running',
      current_step: 0,
      step_results: r.steps.map((step) => ({
        step_index: 0,
        type: step.type,
        status: 'pending',
        started_at: null,
        completed_at: null,
        output: null,
        error: null,
      })),
      created_at: nowIso(),
      completed_at: null,
    };
    // Assign step indices properly
    execution.step_results.forEach((sr, i) => { sr.step_index = i; });

    data.executions[execution.id] = execution;
    saveAll(data);

    // Stub execution: simulate by marking step 0 as completed if there's at least one step
    if (r.steps.length > 0) {
      const step0 = execution.step_results[0];
      step0.status = 'completed';
      step0.started_at = nowIso();
      step0.completed_at = nowIso();
      step0.output = substituteParams(`Step "${r.steps[0].name || r.steps[0].type}" simulated`, params);
      execution.current_step = 1;
    }

    saveAll(data);
    res.status(201).json(execution);
  });

  app.get('/executions', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.executions);
    if (req.query.runbook_id) items = items.filter((e) => e.runbook_id === req.query.runbook_id);
    if (req.query.status) items = items.filter((e) => e.status === req.query.status);
    const limit = parseInt(req.query.limit || '50', 10);
    items = items.slice(-limit);
    res.json({ count: items.length, executions: items });
  });

  app.get('/executions/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const e = data.executions[req.params.id];
    if (!e) return res.status(404).json({ error: 'not_found' });
    res.json(e);
  });

  app.post('/executions/:id/abort', requireInternal, (req, res) => {
    const data = loadAll();
    const e = data.executions[req.params.id];
    if (!e) return res.status(404).json({ error: 'not_found' });
    if (['completed', 'failed', 'aborted'].includes(e.status)) return res.status(400).json({ error: 'already_finished' });
    e.status = 'aborted';
    e.completed_at = nowIso();
    saveAll(data);
    res.json(e);
  });

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`runbook-engine listening on ${PORT}`));
}

module.exports = { createApp };