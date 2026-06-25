/**
 * HOJAI AI Model Registry (port 4773) — STUB
 *
 * Central catalog of all AI models with versioning, deployment, and capability metadata.
 *
 * Storage: file-backed JSON (atomic temp+rename writes)
 * Auth:    X-Internal-Token header
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '4773', 10);
const DATA_DIR = () => process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'model-registry-internal-token';

function mdlFile() { return path.join(DATA_DIR(), 'models.json'); }
function verFile() { return path.join(DATA_DIR(), 'versions.json'); }

function ensureDir() {
  const dd = DATA_DIR();
  if (!fs.existsSync(dd)) fs.mkdirSync(dd, { recursive: true });
  if (!fs.existsSync(mdlFile())) fs.writeFileSync(mdlFile(), JSON.stringify({ data: {} }));
  if (!fs.existsSync(verFile())) fs.writeFileSync(verFile(), JSON.stringify({ data: {} }));
}
function load(file) { ensureDir(); try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return { data: {} }; } }
function save(file, d) { const dd = DATA_DIR(), f = file(), tmp = path.join(dd, '.tmp_' + crypto.randomBytes(4).toString('hex')); fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, f); }
const loadModels = () => load(mdlFile());
const saveModels = (d) => save(mdlFile, d);
const loadVersions = () => load(verFile());
const saveVersions = (d) => save(verFile, d);

function nowIso() { return new Date().toISOString(); }
function newId() { return crypto.randomBytes(16).toString('hex'); }
function uuidv4() { return newId(); }

function slugify(s) {
  return String(s).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function findModel(mdlData, idOrSlug) {
  if (mdlData.data[idOrSlug]) return mdlData.data[idOrSlug];
  return Object.values(mdlData.data).find((m) => m.slug === idOrSlug) || null;
}

function findVersion(versionList, versionLabel) {
  return versionList.find((v) => v.version === versionLabel) || null;
}

// ── Seed data ────────────────────────────────────────────────────────────────
const SEED_MODELS = [
  { slug: 'claude-3-5-sonnet', displayName: 'Claude 3.5 Sonnet', description: 'Anthropic flagship balanced model with strong reasoning and vision.', owner: 'anthropic', type: 'llm', capabilities: ['chat', 'vision', 'tools', 'long-context'], contextWindow: 200000, status: 'stable', tags: ['premium', 'reasoning'] },
  { slug: 'claude-3-haiku', displayName: 'Claude 3 Haiku', description: 'Anthropic fast and affordable small model.', owner: 'anthropic', type: 'llm', capabilities: ['chat'], contextWindow: 200000, status: 'stable', tags: ['budget', 'fast'] },
  { slug: 'gpt-4o', displayName: 'GPT-4o', description: 'OpenAI flagship multimodal model.', owner: 'openai', type: 'llm', capabilities: ['chat', 'vision', 'tools', 'json', 'streaming'], contextWindow: 128000, status: 'stable', tags: ['premium', 'multimodal'] },
  { slug: 'gpt-4o-mini', displayName: 'GPT-4o mini', description: 'OpenAI small and fast model with strong capability for cost.', owner: 'openai', type: 'llm', capabilities: ['chat', 'tools', 'json'], contextWindow: 128000, status: 'stable', tags: ['budget', 'fast'] },
  { slug: 'o1-preview', displayName: 'o1 Preview', description: 'OpenAI experimental reasoning model.', owner: 'openai', type: 'llm', capabilities: ['chat', 'reasoning'], contextWindow: 128000, status: 'beta', tags: ['reasoning', 'experimental'] },
  { slug: 'gemini-1-5-pro', displayName: 'Gemini 1.5 Pro', description: 'Google long-context multimodal model.', owner: 'google', type: 'llm', capabilities: ['chat', 'vision', 'long-context'], contextWindow: 1000000, status: 'stable', tags: ['premium', 'long-context'] },
  { slug: 'text-embedding-3-small', displayName: 'Text Embedding 3 Small', description: 'OpenAI small embedding model.', owner: 'openai', type: 'embedding', capabilities: ['embed'], contextWindow: 8192, status: 'stable', tags: ['embedding', 'budget'] },
  { slug: 'whisper-1', displayName: 'Whisper', description: 'OpenAI speech-to-text model supporting transcription and translation.', owner: 'openai', type: 'speech', capabilities: ['transcribe', 'translate'], contextWindow: 0, status: 'stable', tags: ['speech', 'transcription'] },
];

const SEED_VERSIONS = {
  'claude-3-5-sonnet': [{ version: '20241022', releaseDate: '2024-10-22', changeNote: 'Initial release of Claude 3.5 Sonnet', deployment: { provider: 'anthropic', endpoint: 'https://api.anthropic.com/v1/messages', region: 'us-east-1', replicas: 3, costPer1kInput: 0.003, costPer1kOutput: 0.015, avgLatencyMs: 900 }, performance: { benchmarkScores: { mmlu: 88.7, humaneval: 92.0, gsm8k: 96.4 }, accuracy: 0.92, evalDate: '2024-10-25' }, safety: { guardrailsLevel: 'high', piiRedaction: true, contentFiltering: true, jailbreakResistanceScore: 94 } }],
  'claude-3-haiku': [{ version: '20240307', releaseDate: '2024-03-07', changeNote: 'Stable Claude 3 Haiku release', deployment: { provider: 'anthropic', endpoint: 'https://api.anthropic.com/v1/messages', region: 'us-east-1', replicas: 2, costPer1kInput: 0.00025, costPer1kOutput: 0.00125, avgLatencyMs: 350 }, performance: { benchmarkScores: { mmlu: 75.2, humaneval: 75.9, gsm8k: 88.0 }, accuracy: 0.81, evalDate: '2024-03-15' }, safety: { guardrailsLevel: 'medium', piiRedaction: true, contentFiltering: true, jailbreakResistanceScore: 82 } }],
  'gpt-4o': [{ version: '2024-08-06', releaseDate: '2024-08-06', changeNote: 'GPT-4o snapshot release', deployment: { provider: 'openai', endpoint: 'https://api.openai.com/v1/chat/completions', region: 'us-east-1', replicas: 5, costPer1kInput: 0.005, costPer1kOutput: 0.015, avgLatencyMs: 800 }, performance: { benchmarkScores: { mmlu: 88.7, humaneval: 90.2, gsm8k: 95.0 }, accuracy: 0.91, evalDate: '2024-08-10' }, safety: { guardrailsLevel: 'high', piiRedaction: true, contentFiltering: true, jailbreakResistanceScore: 90 } }],
  'gpt-4o-mini': [{ version: '2024-07-18', releaseDate: '2024-07-18', changeNote: 'GPT-4o mini release', deployment: { provider: 'openai', endpoint: 'https://api.openai.com/v1/chat/completions', region: 'us-east-1', replicas: 4, costPer1kInput: 0.00015, costPer1kOutput: 0.0006, avgLatencyMs: 400 }, performance: { benchmarkScores: { mmlu: 82.0, humaneval: 87.2, gsm8k: 93.0 }, accuracy: 0.87, evalDate: '2024-07-20' }, safety: { guardrailsLevel: 'medium', piiRedaction: true, contentFiltering: true, jailbreakResistanceScore: 80 } }],
  'o1-preview': [{ version: '2024-09-12', releaseDate: '2024-09-12', changeNote: 'o1 reasoning preview release', deployment: { provider: 'openai', endpoint: 'https://api.openai.com/v1/chat/completions', region: 'us-east-1', replicas: 1, costPer1kInput: 0.015, costPer1kOutput: 0.06, avgLatencyMs: 2400 }, performance: { benchmarkScores: { mmlu: 90.8, humaneval: 89.0, gsm8k: 96.7 }, accuracy: 0.93, evalDate: '2024-09-20' }, safety: { guardrailsLevel: 'high', piiRedaction: true, contentFiltering: true, jailbreakResistanceScore: 88 } }],
  'gemini-1-5-pro': [{ version: '002', releaseDate: '2024-09-24', changeNote: 'Gemini 1.5 Pro second generation', deployment: { provider: 'google', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro', region: 'us-central1', replicas: 3, costPer1kInput: 0.00125, costPer1kOutput: 0.005, avgLatencyMs: 1100 }, performance: { benchmarkScores: { mmlu: 85.9, humaneval: 84.0, gsm8k: 91.0 }, accuracy: 0.88, evalDate: '2024-09-30' }, safety: { guardrailsLevel: 'medium', piiRedaction: true, contentFiltering: true, jailbreakResistanceScore: 85 } }],
  'text-embedding-3-small': [{ version: '1', releaseDate: '2024-01-25', changeNote: 'Text Embedding 3 Small release', deployment: { provider: 'openai', endpoint: 'https://api.openai.com/v1/embeddings', region: 'us-east-1', replicas: 2, costPer1kInput: 0.00002, costPer1kOutput: 0.0, avgLatencyMs: 120 }, performance: { benchmarkScores: { mmlu: 0, humaneval: 0, gsm8k: 0 }, accuracy: 0.0, evalDate: '2024-02-01' }, safety: { guardrailsLevel: 'low', piiRedaction: false, contentFiltering: false, jailbreakResistanceScore: 0 } }],
  'whisper-1': [{ version: '1', releaseDate: '2022-09-21', changeNote: 'Whisper speech-to-text release', deployment: { provider: 'openai', endpoint: 'https://api.openai.com/v1/audio/transcriptions', region: 'us-east-1', replicas: 2, costPer1kInput: 0.006, costPer1kOutput: 0.0, avgLatencyMs: 2000 }, performance: { benchmarkScores: { mmlu: 0, humaneval: 0, gsm8k: 0 }, accuracy: 0.83, evalDate: '2023-01-15' }, safety: { guardrailsLevel: 'low', piiRedaction: false, contentFiltering: false, jailbreakResistanceScore: 0 } }],
};

function seed(mdlData, verData) {
  const now = nowIso();
  for (const m of SEED_MODELS) {
    const id = uuidv4();
    const verDefs = SEED_VERSIONS[m.slug] || [];
    let liveVersionId = null;
    const versionList = verDefs.map((v) => {
      const vid = uuidv4();
      liveVersionId = vid;
      return { id: vid, modelId: id, version: v.version, releaseDate: v.releaseDate, retiredDate: null, changeNote: v.changeNote, deployment: v.deployment, performance: v.performance, safety: v.safety, createdAt: now };
    });
    mdlData.data[id] = { id, slug: m.slug, displayName: m.displayName, description: m.description, owner: m.owner, type: m.type, capabilities: m.capabilities, contextWindow: m.contextWindow, status: m.status, tags: m.tags, createdAt: now, updatedAt: now, liveVersionId };
    verData.data[id] = versionList;
  }
}

function bootstrap() {
  ensureDir();
  const mdlData = loadModels();
  if (Object.keys(mdlData.data).length === 0) {
    const verData = loadVersions(); // fresh reference
    seed(mdlData, verData);        // populates both via reference
    saveModels(mdlData);
    saveVersions(verData);          // persist versions separately
  }
}

// Starts the server only after bootstrap + data are ready.
function startServer(port) {
  return new Promise((resolve, reject) => {
    const server = createApp().listen(port, () => resolve(server));
    server.on('error', reject);
  });
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'model-registry', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: nowIso() }));

  // ── Model CRUD ────────────────────────────────────────────────────
  app.post('/api/models', requireInternal, (req, res) => {
    const body = req.body || {};
    const missing = ['displayName', 'owner', 'type'].filter((f) => !body.hasOwnProperty(f));
    if (missing.length) return res.status(400).json({ error: 'MISSING_FIELDS', message: `Missing: ${missing.join(', ')}` });
    const { displayName, owner, type, description = '', capabilities = [], contextWindow = 0, status = 'stable', tags = [], slug: providedSlug } = body;
    if (!Array.isArray(capabilities)) return res.status(400).json({ error: 'INVALID_FIELD', message: 'capabilities must be an array' });
    if (!Array.isArray(tags)) return res.status(400).json({ error: 'INVALID_FIELD', message: 'tags must be an array' });
    const finalSlug = providedSlug ? slugify(providedSlug) : slugify(displayName);
    const mdlData = loadModels();
    if (Object.values(mdlData.data).some((m) => m.slug === finalSlug)) return res.status(409).json({ error: 'DUPLICATE_SLUG', message: `Slug '${finalSlug}' exists` });
    const id = uuidv4();
    const now = nowIso();
    const model = { id, slug: finalSlug, displayName, description, owner, type, capabilities, contextWindow, status, tags, createdAt: now, updatedAt: now, liveVersionId: null };
    mdlData.data[id] = model;
    saveModels(mdlData);
    const verData = loadVersions();
    verData.data[id] = [];
    saveVersions(verData);
    res.status(201).json(model);
  });

  app.get('/api/models', (req, res) => {
    const { type, owner, capability, status, tag } = req.query;
    const mdlData = loadModels();
    let list = Object.values(mdlData.data);
    if (type) list = list.filter((m) => m.type === String(type));
    if (owner) list = list.filter((m) => m.owner === String(owner));
    if (capability) list = list.filter((m) => (m.capabilities || []).includes(String(capability)));
    if (status) list = list.filter((m) => m.status === String(status));
    if (tag) list = list.filter((m) => (m.tags || []).includes(String(tag)));
    res.json({ count: list.length, models: list });
  });

  app.patch('/api/models/:idOrSlug', requireInternal, (req, res) => {
    const mdlData = loadModels();
    const m = findModel(mdlData, req.params.idOrSlug);
    if (!m) return res.status(404).json({ error: 'MODEL_NOT_FOUND', message: 'Model not found' });
    const body = req.body || {};
    const editable = ['displayName', 'description', 'owner', 'type', 'capabilities', 'contextWindow', 'status', 'tags'];
    for (const field of editable) {
      if (body[field] !== undefined) {
        if ((field === 'capabilities' || field === 'tags') && !Array.isArray(body[field])) return res.status(400).json({ error: 'INVALID_FIELD', message: `${field} must be array` });
        m[field] = body[field];
      }
    }
    m.updatedAt = nowIso();
    saveModels(mdlData);
    res.json(m);
  });

  app.delete('/api/models/:idOrSlug', requireInternal, (req, res) => {
    const mdlData = loadModels();
    const m = findModel(mdlData, req.params.idOrSlug);
    if (!m) return res.status(404).json({ error: 'MODEL_NOT_FOUND', message: 'Model not found' });
    delete mdlData.data[m.id];
    saveModels(mdlData);
    const verData = loadVersions();
    delete verData.data[m.id];
    saveVersions(verData);
    res.json({ deleted: true, id: m.id });
  });

  // ── Versioning ───────────────────────────────────────────────────
  app.post('/api/models/:idOrSlug/versions', requireInternal, (req, res) => {
    const mdlData = loadModels();
    const m = findModel(mdlData, req.params.idOrSlug);
    if (!m) return res.status(404).json({ error: 'MODEL_NOT_FOUND', message: 'Model not found' });
    const body = req.body || {};
    const required = ['version', 'deployment', 'performance', 'safety'];
    const missing = required.filter((f) => !body.hasOwnProperty(f));
    if (missing.length) return res.status(400).json({ error: 'MISSING_FIELDS', message: `Missing: ${missing.join(', ')}` });
    const { version, releaseDate, changeNote = '', deployment, performance, safety } = body;
    const verData = loadVersions();
    const list = verData.data[m.id] || [];
    if (list.some((v) => v.version === version)) return res.status(409).json({ error: 'DUPLICATE_VERSION', message: `Version '${version}' exists` });
    const id = uuidv4();
    const now = nowIso();
    const v = { id, modelId: m.id, version, releaseDate: releaseDate || now.slice(0, 10), retiredDate: null, changeNote, deployment, performance, safety, createdAt: now };
    list.push(v);
    verData.data[m.id] = list;
    if (!m.liveVersionId) m.liveVersionId = id;
    m.updatedAt = now;
    saveVersions(verData);
    saveModels(mdlData);
    res.status(201).json(v);
  });

  app.get('/api/models/:idOrSlug/versions', (req, res) => {
    const mdlData = loadModels();
    const m = findModel(mdlData, req.params.idOrSlug);
    if (!m) return res.status(404).json({ error: 'MODEL_NOT_FOUND', message: 'Model not found' });
    const verData = loadVersions();
    const list = verData.data[m.id] || [];
    res.json({ modelId: m.id, slug: m.slug, count: list.length, versions: list });
  });

  app.get('/api/models/:idOrSlug/versions/:version', (req, res) => {
    const mdlData = loadModels();
    const m = findModel(mdlData, req.params.idOrSlug);
    if (!m) return res.status(404).json({ error: 'MODEL_NOT_FOUND', message: 'Model not found' });
    const verData = loadVersions();
    const v = findVersion(verData.data[m.id] || [], req.params.version);
    if (!v) return res.status(404).json({ error: 'VERSION_NOT_FOUND', message: `Version '${req.params.version}' not found` });
    res.json(v);
  });

  app.patch('/api/models/:idOrSlug/versions/:version', requireInternal, (req, res) => {
    const mdlData = loadModels();
    const m = findModel(mdlData, req.params.idOrSlug);
    if (!m) return res.status(404).json({ error: 'MODEL_NOT_FOUND', message: 'Model not found' });
    const verData = loadVersions();
    const list = verData.data[m.id] || [];
    const v = findVersion(list, req.params.version);
    if (!v) return res.status(404).json({ error: 'VERSION_NOT_FOUND', message: `Version '${req.params.version}' not found` });
    const body = req.body || {};
    if (body.changeNote !== undefined) v.changeNote = body.changeNote;
    if (body.releaseDate !== undefined) v.releaseDate = body.releaseDate;
    if (body.retiredDate !== undefined) v.retiredDate = body.retiredDate;
    if (body.deployment !== undefined) v.deployment = { ...v.deployment, ...body.deployment };
    if (body.performance !== undefined) v.performance = { ...v.performance, ...body.performance };
    if (body.safety !== undefined) v.safety = { ...v.safety, ...body.safety };
    m.updatedAt = nowIso();
    saveVersions(verData);
    saveModels(mdlData);
    res.json(v);
  });

  app.post('/api/models/:idOrSlug/versions/:version/deploy', requireInternal, (req, res) => {
    const mdlData = loadModels();
    const m = findModel(mdlData, req.params.idOrSlug);
    if (!m) return res.status(404).json({ error: 'MODEL_NOT_FOUND', message: 'Model not found' });
    const verData = loadVersions();
    const list = verData.data[m.id] || [];
    const v = list.find((x) => x.version === req.params.version);
    if (!v) return res.status(404).json({ error: 'VERSION_NOT_FOUND', message: `Version '${req.params.version}' not found` });
    const previousLive = list.find((x) => x.id === m.liveVersionId && x.id !== v.id) || null;
    m.liveVersionId = v.id;
    m.updatedAt = nowIso();
    saveVersions(verData);
    saveModels(mdlData);
    res.json({ deployed: true, modelId: m.id, version: v.version, versionId: v.id, demoted: previousLive ? { versionId: previousLive.id, version: previousLive.version } : null });
  });

  app.get('/api/models/:idOrSlug/live', (req, res) => {
    const mdlData = loadModels();
    const m = findModel(mdlData, req.params.idOrSlug);
    if (!m) return res.status(404).json({ error: 'MODEL_NOT_FOUND', message: 'Model not found' });
    if (!m.liveVersionId) return res.status(404).json({ error: 'NO_LIVE_VERSION', message: 'Model has no live version' });
    const verData = loadVersions();
    const verList = verData.data[m.id] || [];
    const v = verList.find((x) => x.id === m.liveVersionId);
    if (!v) return res.status(404).json({ error: 'NO_LIVE_VERSION', message: 'Live version record not found' });
    res.json({ model: { id: m.id, slug: m.slug, displayName: m.displayName }, liveVersion: v });
  });

  // NOTE: generic /:idOrSlug MUST be after specific subpath routes above
  app.get('/api/models/:idOrSlug', (req, res) => {
    const mdlData = loadModels();
    const m = findModel(mdlData, req.params.idOrSlug);
    if (!m) return res.status(404).json({ error: 'MODEL_NOT_FOUND', message: 'Model not found' });
    const verData = loadVersions();
    const versionList = verData.data[m.id] || [];
    res.json({ ...m, versions: versionList });
  });

  // ── Discovery & search ───────────────────────────────────────────
  app.get('/api/search', (req, res) => {
    const q = (req.query.q || '').toString().toLowerCase().trim();
    if (!q) return res.json({ query: '', count: 0, results: [] });
    const mdlData = loadModels();
    const results = Object.values(mdlData.data).filter((m) => [m.slug, m.displayName, m.description || '', ...(m.tags || [])].join(' ').toLowerCase().includes(q));
    res.json({ query: q, count: results.length, results });
  });

  app.get('/api/capabilities/:capability', (req, res) => {
    const cap = req.params.capability;
    const mdlData = loadModels();
    const list = Object.values(mdlData.data).filter((m) => (m.capabilities || []).includes(cap));
    res.json({ capability: cap, count: list.length, models: list });
  });

  app.post('/api/recommend', requireInternal, (req, res) => {
    const body = req.body || {};
    const requiredCapabilities = Array.isArray(body.requiredCapabilities) ? body.requiredCapabilities : [];
    const maxCost = body.maxCost !== undefined ? Number(body.maxCost) : null;
    const minContextWindow = body.minContextWindow !== undefined ? Number(body.minContextWindow) : null;
    const preferOwner = body.preferOwner || null;
    const mdlData = loadModels();
    const verData = loadVersions();
    let candidates = Object.values(mdlData.data);
    candidates = candidates.filter((m) => requiredCapabilities.every((c) => (m.capabilities || []).includes(c)));
    if (maxCost !== null) {
      candidates = candidates.filter((m) => {
        if (!m.liveVersionId) return false;
        const v = (verData.data[m.id] || []).find((x) => x.id === m.liveVersionId);
        if (!v || !v.deployment) return false;
        const avg = ((v.deployment.costPer1kInput || 0) + (v.deployment.costPer1kOutput || 0)) / 2;
        return avg <= maxCost;
      });
    }
    if (minContextWindow !== null) candidates = candidates.filter((m) => Number(m.contextWindow || 0) >= minContextWindow);
    candidates.sort((a, b) => {
      if (preferOwner) { const aO = a.owner === preferOwner ? 0 : 1, bO = b.owner === preferOwner ? 0 : 1; if (aO !== bO) return aO - bO; }
      const aVer = (verData.data[a.id] || []).find((x) => x.id === a.liveVersionId);
      const bVer = (verData.data[b.id] || []).find((x) => x.id === b.liveVersionId);
      const aCost = aVer ? (aVer.deployment.costPer1kInput || 0) + (aVer.deployment.costPer1kOutput || 0) : Number.MAX_SAFE_INTEGER;
      const bCost = bVer ? (bVer.deployment.costPer1kInput || 0) + (bVer.deployment.costPer1kOutput || 0) : Number.MAX_SAFE_INTEGER;
      if (aCost !== bCost) return aCost - bCost;
      return (b.contextWindow || 0) - (a.contextWindow || 0);
    });
    res.json({ criteria: { requiredCapabilities, maxCost, minContextWindow, preferOwner }, count: candidates.length, recommendations: candidates });
  });

  app.get('/api/owners', (_req, res) => {
    const mdlData = loadModels();
    const owners = [...new Set(Object.values(mdlData.data).map((m) => m.owner))].sort();
    res.json({ count: owners.length, owners });
  });

  app.get('/api/types', (_req, res) => {
    const mdlData = loadModels();
    const types = [...new Set(Object.values(mdlData.data).map((m) => m.type))].sort();
    res.json({ count: types.length, types });
  });

  // ── Compare ───────────────────────────────────────────────────────
  app.post('/api/compare', requireInternal, (req, res) => {
    const body = req.body || {};
    const modelIds = Array.isArray(body.modelIds) ? body.modelIds : [];
    if (!modelIds.length) return res.status(400).json({ error: 'MISSING_FIELDS', message: 'modelIds is required' });
    const mdlData = loadModels();
    const verData = loadVersions();
    const compared = modelIds.map((idOrSlug) => {
      const m = findModel(mdlData, idOrSlug);
      if (!m) return { idOrSlug, error: 'MODEL_NOT_FOUND' };
      const list = verData.data[m.id] || [];
      return { id: m.id, slug: m.slug, displayName: m.displayName, owner: m.owner, type: m.type, capabilities: m.capabilities, contextWindow: m.contextWindow, status: m.status, tags: m.tags, liveVersionId: m.liveVersionId, versions: list.map((v) => ({ version: v.version, releaseDate: v.releaseDate, retiredDate: v.retiredDate, changeNote: v.changeNote, deployment: v.deployment, performance: v.performance, safety: v.safety, isLive: v.id === m.liveVersionId })) };
    });
    res.json({ count: compared.length, compared });
  });

  // ── Stats & catalog ───────────────────────────────────────────────
  app.get('/api/stats', (_req, res) => {
    const mdlData = loadModels();
    const verData = loadVersions();
    let totalVersions = 0, deployed = 0, deprecated = 0;
    const allMdls = Object.values(mdlData.data);
    for (const m of allMdls) {
      const list = verData.data[m.id] || [];
      totalVersions += list.length;
      for (const v of list) { if (m.liveVersionId && v.id === m.liveVersionId) deployed++; if (v.retiredDate) deprecated++; }
    }
    res.json({ totalModels: allMdls.length, totalVersions, deployed, deprecated, timestamp: nowIso() });
  });

  app.get('/api/catalog/base-models', (_req, res) => {
    const mdlData = loadModels();
    const models = Object.values(mdlData.data).map((m) => ({ id: m.id, slug: m.slug, displayName: m.displayName, type: m.type, owner: m.owner, capabilities: m.capabilities, contextWindow: m.contextWindow, status: m.status }));
    res.json({ count: models.length, models });
  });

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

module.exports = { createApp, bootstrap, startServer };
