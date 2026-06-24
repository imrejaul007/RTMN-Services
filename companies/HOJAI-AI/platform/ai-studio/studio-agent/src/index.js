/**
 * studio-agent — Agent composition: roles, tools, skills, memory, system prompt
 * Port: 4904
 *
 * An agent is a complete AI configuration:
 * - role: persona description (e.g. "Customer support specialist")
 * - system_prompt: instructions sent to the model
 * - model: which LLM to use
 * - tools: list of tool refs (e.g. {name, type, config})
 * - skills: list of skill refs (e.g. {name, params})
 * - memory: {type, partition, retention_days} for long-term memory
 * - temperature, max_tokens
 * - input_schema, output_schema (JSON schemas for validation)
 * - guardrails: max_iterations, timeout_ms, content_filters
 *
 * Storage: $DATA_DIR/agents.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '4904', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'studio-internal-token';

const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');

const VALID_TOOL_TYPES = ['function', 'api', 'database', 'twin', 'rag', 'web_search', 'code_exec', 'custom'];
const VALID_MEMORY_TYPES = ['none', 'short_term', 'long_term', 'episodic', 'semantic'];
const VALID_GUARDRAILS = ['content_filter', 'pii_redaction', 'rate_limit', 'no_pii', 'no_code', 'max_iterations', 'timeout'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(AGENTS_FILE)) fs.writeFileSync(AGENTS_FILE, JSON.stringify({ agents: {} }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf8')); } catch (_) { return { agents: {} }; } }
function saveAll(d) { const tmp = AGENTS_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, AGENTS_FILE); }

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function validateAgent(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.name || typeof body.name !== 'string') return 'name is required';
  if (body.name.trim().length === 0) return 'name must not be empty';
  if (!body.role || typeof body.role !== 'string') return 'role is required';
  if (body.model && typeof body.model !== 'string') return 'model must be a string';
  if (body.temperature !== undefined && (body.temperature < 0 || body.temperature > 2)) return 'temperature must be 0-2';
  if (body.max_tokens !== undefined && (body.max_tokens < 1 || body.max_tokens > 100000)) return 'max_tokens must be 1-100000';
  if (body.tools !== undefined && !Array.isArray(body.tools)) return 'tools must be an array';
  if (body.skills !== undefined && !Array.isArray(body.skills)) return 'skills must be an array';
  if (body.tools) {
    for (const t of body.tools) {
      if (!t.name) return 'each tool needs a name';
      if (t.type && !VALID_TOOL_TYPES.includes(t.type)) return `invalid tool type: ${t.type}`;
    }
  }
  if (body.memory && body.memory.type && !VALID_MEMORY_TYPES.includes(body.memory.type)) {
    return `invalid memory type: ${body.memory.type}`;
  }
  if (body.guardrails !== undefined && !Array.isArray(body.guardrails)) return 'guardrails must be an array';
  if (body.guardrails) {
    for (const g of body.guardrails) {
      if (!VALID_GUARDRAILS.includes(g)) return `invalid guardrail: ${g}`;
    }
  }
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => res.json({
    ok: true, service: 'studio-agent', port: PORT,
    tool_types: VALID_TOOL_TYPES,
    memory_types: VALID_MEMORY_TYPES
  }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // Get supported tool/memory types
  app.get('/capabilities', requireInternal, (_req, res) => {
    res.json({
      tool_types: VALID_TOOL_TYPES,
      memory_types: VALID_MEMORY_TYPES,
      guardrails: VALID_GUARDRAILS
    });
  });

  // Create agent
  app.post('/agents', requireInternal, (req, res) => {
    const err = validateAgent(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const {
      name, role, system_prompt = '', model = 'gpt-4', temperature = 0.7,
      max_tokens = 2048, project_id, user_id, tools = [], skills = [],
      memory = { type: 'short_term' }, input_schema = null, output_schema = null,
      guardrails = [], description = '', tags = []
    } = req.body;
    if (!project_id) return res.status(400).json({ error: 'validation', message: 'project_id required' });
    if (!user_id) return res.status(400).json({ error: 'validation', message: 'user_id required' });
    const agent = {
      id: newId('agt'),
      name,
      role,
      description,
      system_prompt,
      model,
      temperature,
      max_tokens,
      project_id,
      user_id,
      tools,
      skills,
      memory,
      input_schema,
      output_schema,
      guardrails,
      tags: Array.isArray(tags) ? tags : [],
      status: 'draft',
      version: 1,
      created_at: nowIso(),
      updated_at: nowIso()
    };
    const data = loadAll();
    data.agents[agent.id] = agent;
    saveAll(data);
    res.status(201).json(agent);
  });

  // List agents
  app.get('/agents', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.agents);
    if (req.query.project_id) items = items.filter((a) => a.project_id === req.query.project_id);
    if (req.query.user_id) items = items.filter((a) => a.user_id === req.query.user_id);
    if (req.query.status) items = items.filter((a) => a.status === req.query.status);
    if (req.query.model) items = items.filter((a) => a.model === req.query.model);
    res.json({ count: items.length, agents: items });
  });

  // Get agent
  app.get('/agents/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const a = data.agents[req.params.id];
    if (!a) return res.status(404).json({ error: 'not_found' });
    res.json(a);
  });

  // Update agent (bumps version)
  app.put('/agents/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const a = data.agents[req.params.id];
    if (!a) return res.status(404).json({ error: 'not_found' });
    const err = validateAgent({ ...a, ...req.body });
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const fields = ['name', 'role', 'description', 'system_prompt', 'model', 'temperature', 'max_tokens', 'tools', 'skills', 'memory', 'input_schema', 'output_schema', 'guardrails', 'tags', 'status'];
    for (const f of fields) {
      if (req.body[f] !== undefined) a[f] = req.body[f];
    }
    if (a.status && !['draft', 'active', 'archived', 'disabled'].includes(a.status)) {
      return res.status(400).json({ error: 'validation', message: 'invalid status' });
    }
    a.version = (a.version || 1) + 1;
    a.updated_at = nowIso();
    saveAll(data);
    res.json(a);
  });

  // Delete agent
  app.delete('/agents/:id', requireInternal, (req, res) => {
    const data = loadAll();
    if (!data.agents[req.params.id]) return res.status(404).json({ error: 'not_found' });
    delete data.agents[req.params.id];
    saveAll(data);
    res.json({ deleted: true, agent_id: req.params.id });
  });

  // Add a tool to an agent
  app.post('/agents/:id/tools', requireInternal, (req, res) => {
    const data = loadAll();
    const a = data.agents[req.params.id];
    if (!a) return res.status(404).json({ error: 'not_found' });
    const { name, type, config = {} } = req.body || {};
    if (!name) return res.status(400).json({ error: 'validation', message: 'tool name required' });
    if (type && !VALID_TOOL_TYPES.includes(type)) return res.status(400).json({ error: 'validation', message: `invalid type: ${type}` });
    if (a.tools.find((t) => t.name === name)) return res.status(409).json({ error: 'conflict', message: 'tool already exists' });
    a.tools.push({ name, type: type || 'function', config, added_at: nowIso() });
    a.updated_at = nowIso();
    a.version = (a.version || 1) + 1;
    saveAll(data);
    res.status(201).json(a);
  });

  // Remove a tool
  app.delete('/agents/:id/tools/:name', requireInternal, (req, res) => {
    const data = loadAll();
    const a = data.agents[req.params.id];
    if (!a) return res.status(404).json({ error: 'not_found' });
    const before = a.tools.length;
    a.tools = a.tools.filter((t) => t.name !== req.params.name);
    if (a.tools.length === before) return res.status(404).json({ error: 'not_found', message: 'tool not found' });
    a.updated_at = nowIso();
    a.version = (a.version || 1) + 1;
    saveAll(data);
    res.json(a);
  });

  // Clone an agent
  app.post('/agents/:id/clone', requireInternal, (req, res) => {
    const data = loadAll();
    const src = data.agents[req.params.id];
    if (!src) return res.status(404).json({ error: 'not_found' });
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'validation', message: 'name required for clone' });
    const clone = {
      ...src,
      id: newId('agt'),
      name,
      status: 'draft',
      version: 1,
      cloned_from: src.id,
      created_at: nowIso(),
      updated_at: nowIso()
    };
    data.agents[clone.id] = clone;
    saveAll(data);
    res.status(201).json(clone);
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`[studio-agent] listening on :${PORT}`));
}

module.exports = { createApp, VALID_TOOL_TYPES, VALID_MEMORY_TYPES, VALID_GUARDRAILS, validateAgent };
