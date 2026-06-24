/**
 * studio-playground — Multi-model prompt playground + history
 * Port: 4902
 *
 * The playground lets users send prompts to multiple LLM models side-by-side,
 * compare results, save prompts to history, and favorite specific runs.
 * Models supported: gpt-4, gpt-3.5, claude-opus, claude-sonnet, llama-70b, etc.
 *
 * Storage: $DATA_DIR/runs.json, $DATA_DIR/prompts.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '4902', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'studio-internal-token';

const RUNS_FILE = path.join(DATA_DIR, 'runs.json');
const PROMPTS_FILE = path.join(DATA_DIR, 'prompts.json');

const VALID_MODELS = [
  'gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo',
  'claude-opus-4', 'claude-sonnet-4', 'claude-haiku',
  'llama-70b', 'llama-8b',
  'mistral-large', 'mixtral-8x7b',
  'gemini-1.5-pro', 'gemini-1.5-flash'
];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(RUNS_FILE)) fs.writeFileSync(RUNS_FILE, JSON.stringify({ runs: [] }, null, 2));
  if (!fs.existsSync(PROMPTS_FILE)) fs.writeFileSync(PROMPTS_FILE, JSON.stringify({ prompts: [] }, null, 2));
}
function loadRuns() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(RUNS_FILE, 'utf8')); } catch (_) { return { runs: [] }; } }
function saveRuns(d) {
  const tmp = RUNS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, RUNS_FILE);
}
function loadPrompts() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf8')); } catch (_) { return { prompts: [] }; } }
function savePrompts(d) {
  const tmp = PROMPTS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, PROMPTS_FILE);
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// Deterministic mock LLM - varies output by model name
function mockCompletion(model, prompt, systemPrompt) {
  // Hash model+prompt to get deterministic token count and content
  const hash = crypto.createHash('sha256').update(model + '|' + prompt + '|' + (systemPrompt || '')).digest('hex');
  const tokenCount = 30 + (parseInt(hash.slice(0, 4), 16) % 200);
  const latencyMs = 100 + (parseInt(hash.slice(4, 8), 16) % 1500);
  // Generate a "response" that includes model signature
  const responses = {
    'gpt-4': `[gpt-4] ${prompt.slice(0, 100)}...`,
    'gpt-4-turbo': `[gpt-4-turbo] ${prompt.slice(0, 100)}...`,
    'gpt-3.5-turbo': `[gpt-3.5] ${prompt.slice(0, 100)}...`,
    'claude-opus-4': `[opus] ${prompt.slice(0, 100)}...`,
    'claude-sonnet-4': `[sonnet] ${prompt.slice(0, 100)}...`,
    'claude-haiku': `[haiku] ${prompt.slice(0, 100)}...`,
  };
  const text = responses[model] || `[${model}] ${prompt.slice(0, 100)}...`;
  return {
    text,
    model,
    usage: { prompt_tokens: prompt.length / 4, completion_tokens: tokenCount, total_tokens: Math.ceil(prompt.length / 4) + tokenCount },
    latency_ms: latencyMs,
    finish_reason: 'stop',
    mock: true
  };
}

function validateRun(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.prompt || typeof body.prompt !== 'string') return 'prompt is required';
  if (!body.model || typeof body.model !== 'string') return 'model is required';
  if (!VALID_MODELS.includes(body.model)) return `model must be one of: ${VALID_MODELS.join(', ')}`;
  if (body.temperature !== undefined && (body.temperature < 0 || body.temperature > 2)) return 'temperature must be 0-2';
  if (body.max_tokens !== undefined && (body.max_tokens < 1 || body.max_tokens > 100000)) return 'max_tokens must be 1-100000';
  return null;
}

function validatePrompt(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.name || typeof body.name !== 'string') return 'name is required';
  if (!body.content || typeof body.content !== 'string') return 'content is required';
  if (body.tags !== undefined && !Array.isArray(body.tags)) return 'tags must be an array';
  if (body.variables !== undefined && !Array.isArray(body.variables)) return 'variables must be an array';
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'studio-playground', port: PORT, models: VALID_MODELS }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // Get supported models
  app.get('/models', requireInternal, (_req, res) => {
    res.json({ count: VALID_MODELS.length, models: VALID_MODELS });
  });

  // Execute a prompt
  app.post('/runs', requireInternal, (req, res) => {
    const err = validateRun(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const { prompt, model, system_prompt, temperature = 0.7, max_tokens = 1024, project_id, user_id } = req.body;
    const completion = mockCompletion(model, prompt, system_prompt);
    const run = {
      id: newId('run'),
      project_id: project_id || null,
      user_id: user_id || 'anonymous',
      prompt,
      system_prompt: system_prompt || null,
      model,
      temperature,
      max_tokens,
      response: completion,
      favorited: false,
      tags: [],
      created_at: nowIso()
    };
    const data = loadRuns();
    data.runs.push(run);
    if (data.runs.length > 5000) data.runs = data.runs.slice(-5000);
    saveRuns(data);
    res.status(201).json(run);
  });

  // Compare across multiple models (returns a single result with multiple completions)
  app.post('/runs/compare', requireInternal, (req, res) => {
    const { prompt, models, system_prompt, project_id, user_id } = req.body || {};
    if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'validation', message: 'prompt required' });
    if (!Array.isArray(models) || models.length === 0) return res.status(400).json({ error: 'validation', message: 'models must be non-empty array' });
    if (models.length > 5) return res.status(400).json({ error: 'validation', message: 'compare limited to 5 models' });
    for (const m of models) {
      if (!VALID_MODELS.includes(m)) return res.status(400).json({ error: 'validation', message: `invalid model: ${m}` });
    }
    const completions = models.map((m) => mockCompletion(m, prompt, system_prompt));
    const run = {
      id: newId('cmp'),
      type: 'compare',
      project_id: project_id || null,
      user_id: user_id || 'anonymous',
      prompt,
      system_prompt: system_prompt || null,
      models,
      completions,
      created_at: nowIso()
    };
    const data = loadRuns();
    data.runs.push(run);
    saveRuns(data);
    res.status(201).json(run);
  });

  // List runs (filter by project_id, user_id, model, favorited)
  app.get('/runs', requireInternal, (req, res) => {
    const data = loadRuns();
    let items = data.runs.slice().reverse();
    if (req.query.project_id) items = items.filter((r) => r.project_id === req.query.project_id);
    if (req.query.user_id) items = items.filter((r) => r.user_id === req.query.user_id);
    if (req.query.model) items = items.filter((r) => r.model === req.query.model);
    if (req.query.favorited === 'true') items = items.filter((r) => r.favorited);
    const limit = parseInt(req.query.limit || '50', 10);
    items = items.slice(0, Math.min(limit, 200));
    res.json({ count: items.length, runs: items });
  });

  // Get a specific run
  app.get('/runs/:id', requireInternal, (req, res) => {
    const data = loadRuns();
    const r = data.runs.find((x) => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'not_found' });
    res.json(r);
  });

  // Favorite a run
  app.post('/runs/:id/favorite', requireInternal, (req, res) => {
    const data = loadRuns();
    const r = data.runs.find((x) => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'not_found' });
    r.favorited = true;
    r.favorited_at = nowIso();
    saveRuns(data);
    res.json(r);
  });

  // Unfavorite
  app.delete('/runs/:id/favorite', requireInternal, (req, res) => {
    const data = loadRuns();
    const r = data.runs.find((x) => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'not_found' });
    r.favorited = false;
    delete r.favorited_at;
    saveRuns(data);
    res.json(r);
  });

  // Tag a run
  app.post('/runs/:id/tags', requireInternal, (req, res) => {
    const { tag } = req.body || {};
    if (!tag || typeof tag !== 'string') return res.status(400).json({ error: 'validation', message: 'tag required' });
    const data = loadRuns();
    const r = data.runs.find((x) => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'not_found' });
    if (!r.tags.includes(tag)) r.tags.push(tag);
    saveRuns(data);
    res.json(r);
  });

  // Delete a run
  app.delete('/runs/:id', requireInternal, (req, res) => {
    const data = loadRuns();
    const idx = data.runs.findIndex((x) => x.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'not_found' });
    data.runs.splice(idx, 1);
    saveRuns(data);
    res.json({ deleted: true, run_id: req.params.id });
  });

  // ----- Prompt Library -----

  // Save a prompt template
  app.post('/prompts', requireInternal, (req, res) => {
    const err = validatePrompt(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const { name, content, description = '', project_id, user_id, tags = [], variables = [] } = req.body;
    const data = loadPrompts();
    const prompt = {
      id: newId('pmt'),
      name,
      content,
      description,
      project_id: project_id || null,
      user_id: user_id || 'anonymous',
      tags: Array.isArray(tags) ? tags : [],
      variables: Array.isArray(variables) ? variables : [],
      version: 1,
      created_at: nowIso(),
      updated_at: nowIso()
    };
    data.prompts.push(prompt);
    savePrompts(data);
    res.status(201).json(prompt);
  });

  // List prompt templates
  app.get('/prompts', requireInternal, (req, res) => {
    const data = loadPrompts();
    let items = data.prompts.slice().reverse();
    if (req.query.project_id) items = items.filter((p) => p.project_id === req.query.project_id);
    if (req.query.user_id) items = items.filter((p) => p.user_id === req.query.user_id);
    const limit = parseInt(req.query.limit || '50', 10);
    items = items.slice(0, Math.min(limit, 200));
    res.json({ count: items.length, prompts: items });
  });

  // Get a specific prompt
  app.get('/prompts/:id', requireInternal, (req, res) => {
    const data = loadPrompts();
    const p = data.prompts.find((x) => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'not_found' });
    res.json(p);
  });

  // Update a prompt (creates new version)
  app.put('/prompts/:id', requireInternal, (req, res) => {
    const data = loadPrompts();
    const p = data.prompts.find((x) => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'not_found' });
    const { name, content, description, tags, variables } = req.body || {};
    if (content !== undefined) p.content = content;
    if (name !== undefined) p.name = name;
    if (description !== undefined) p.description = description;
    if (tags !== undefined) p.tags = Array.isArray(tags) ? tags : p.tags;
    if (variables !== undefined) p.variables = Array.isArray(variables) ? variables : p.variables;
    p.version = (p.version || 1) + 1;
    p.updated_at = nowIso();
    savePrompts(data);
    res.json(p);
  });

  // Delete a prompt
  app.delete('/prompts/:id', requireInternal, (req, res) => {
    const data = loadPrompts();
    const idx = data.prompts.findIndex((x) => x.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'not_found' });
    data.prompts.splice(idx, 1);
    savePrompts(data);
    res.json({ deleted: true, prompt_id: req.params.id });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`[studio-playground] listening on :${PORT} models=${VALID_MODELS.length}`));
}

module.exports = { createApp, VALID_MODELS, mockCompletion };
