// Model Registry Service
// Port: 4773
// In-memory registry for AI models, their versions, deployments, and lifecycle.

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4773;

const app = express();


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// =====================
// In-memory storage
// =====================
const models = new PersistentMap('models', { serviceName: 'model-registry' });     // id -> model object
const versions = new PersistentMap('versions', { serviceName: 'model-registry' });   // modelId -> [version objects]
const auditLog = [];          // chronological change log

// =====================
// Helpers
// =====================
function addAudit(action, entityId, details) {
  auditLog.push({
    id: uuidv4(),
    action,
    entityId,
    details,
    timestamp: new Date().toISOString(),
  });
  if (auditLog.length > 100) auditLog.splice(0, auditLog.length - 100);
}

function findModelByIdOrSlug(idOrSlug) {
  if (models.has(idOrSlug)) return models.get(idOrSlug);
  for (const m of models.values()) {
    if (m.slug === idOrSlug) return m;
  }
  return null;
}

function findVersion(modelId, versionLabel) {
  const list = versions.get(modelId) || [];
  return list.find((v) => v.version === versionLabel) || null;
}

function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null);
  if (missing.length > 0) {
    const err = new Error(`Missing required field(s): ${missing.join(', ')}`);
    err.status = 400;
    err.code = 'MISSING_FIELDS';
    throw err;
  }
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateSlug(displayName) {
  const base = slugify(displayName);
  let candidate = base || `model-${Date.now()}`;
  let n = 1;
  while ([...models.values()].some((m) => m.slug === candidate)) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

function notFound(req, res) {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

// =====================
// Seed data
// =====================
function seed() {
  const seedModels = [
    {
      slug: 'claude-3-5-sonnet',
      displayName: 'Claude 3.5 Sonnet',
      description: 'Anthropic flagship balanced model with strong reasoning and vision.',
      owner: 'anthropic',
      type: 'llm',
      capabilities: ['chat', 'vision', 'tools', 'long-context'],
      contextWindow: 200000,
      status: 'stable',
      tags: ['premium', 'reasoning'],
    },
    {
      slug: 'claude-3-haiku',
      displayName: 'Claude 3 Haiku',
      description: 'Anthropic fast and affordable small model.',
      owner: 'anthropic',
      type: 'llm',
      capabilities: ['chat'],
      contextWindow: 200000,
      status: 'stable',
      tags: ['budget', 'fast'],
    },
    {
      slug: 'gpt-4o',
      displayName: 'GPT-4o',
      description: 'OpenAI flagship multimodal model.',
      owner: 'openai',
      type: 'llm',
      capabilities: ['chat', 'vision', 'tools', 'json', 'streaming'],
      contextWindow: 128000,
      status: 'stable',
      tags: ['premium', 'multimodal'],
    },
    {
      slug: 'gpt-4o-mini',
      displayName: 'GPT-4o mini',
      description: 'OpenAI small and fast model with strong capability for cost.',
      owner: 'openai',
      type: 'llm',
      capabilities: ['chat', 'tools', 'json'],
      contextWindow: 128000,
      status: 'stable',
      tags: ['budget', 'fast'],
    },
    {
      slug: 'o1-preview',
      displayName: 'o1 Preview',
      description: 'OpenAI experimental reasoning model.',
      owner: 'openai',
      type: 'llm',
      capabilities: ['chat', 'reasoning'],
      contextWindow: 128000,
      status: 'beta',
      tags: ['reasoning', 'experimental'],
    },
    {
      slug: 'gemini-1-5-pro',
      displayName: 'Gemini 1.5 Pro',
      description: 'Google long-context multimodal model.',
      owner: 'google',
      type: 'llm',
      capabilities: ['chat', 'vision', 'long-context'],
      contextWindow: 1000000,
      status: 'stable',
      tags: ['premium', 'long-context'],
    },
    {
      slug: 'text-embedding-3-small',
      displayName: 'Text Embedding 3 Small',
      description: 'OpenAI small embedding model.',
      owner: 'openai',
      type: 'embedding',
      capabilities: ['embed'],
      contextWindow: 8192,
      status: 'stable',
      tags: ['embedding', 'budget'],
    },
    {
      slug: 'whisper-1',
      displayName: 'Whisper',
      description: 'OpenAI speech-to-text model supporting transcription and translation.',
      owner: 'openai',
      type: 'speech',
      capabilities: ['transcribe', 'translate'],
      contextWindow: 0,
      status: 'stable',
      tags: ['speech', 'transcription'],
    },
  ];

  const seedVersions = {
    'claude-3-5-sonnet': [
      {
        version: '20241022',
        releaseDate: '2024-10-22',
        changeNote: 'Initial release of Claude 3.5 Sonnet',
        deployment: {
          provider: 'anthropic',
          endpoint: 'https://api.anthropic.com/v1/messages',
          region: 'us-east-1',
          replicas: 3,
          costPer1kInput: 0.003,
          costPer1kOutput: 0.015,
          avgLatencyMs: 900,
        },
        performance: {
          benchmarkScores: { mmlu: 88.7, humaneval: 92.0, gsm8k: 96.4 },
          accuracy: 0.92,
          evalDate: '2024-10-25',
        },
        safety: {
          guardrailsLevel: 'high',
          piiRedaction: true,
          contentFiltering: true,
          jailbreakResistanceScore: 94,
        },
      },
    ],
    'claude-3-haiku': [
      {
        version: '20240307',
        releaseDate: '2024-03-07',
        changeNote: 'Stable Claude 3 Haiku release',
        deployment: {
          provider: 'anthropic',
          endpoint: 'https://api.anthropic.com/v1/messages',
          region: 'us-east-1',
          replicas: 2,
          costPer1kInput: 0.00025,
          costPer1kOutput: 0.00125,
          avgLatencyMs: 350,
        },
        performance: {
          benchmarkScores: { mmlu: 75.2, humaneval: 75.9, gsm8k: 88.0 },
          accuracy: 0.81,
          evalDate: '2024-03-15',
        },
        safety: {
          guardrailsLevel: 'medium',
          piiRedaction: true,
          contentFiltering: true,
          jailbreakResistanceScore: 82,
        },
      },
    ],
    'gpt-4o': [
      {
        version: '2024-08-06',
        releaseDate: '2024-08-06',
        changeNote: 'GPT-4o snapshot release',
        deployment: {
          provider: 'openai',
          endpoint: 'https://api.openai.com/v1/chat/completions',
          region: 'us-east-1',
          replicas: 5,
          costPer1kInput: 0.005,
          costPer1kOutput: 0.015,
          avgLatencyMs: 800,
        },
        performance: {
          benchmarkScores: { mmlu: 88.7, humaneval: 90.2, gsm8k: 95.0 },
          accuracy: 0.91,
          evalDate: '2024-08-10',
        },
        safety: {
          guardrailsLevel: 'high',
          piiRedaction: true,
          contentFiltering: true,
          jailbreakResistanceScore: 90,
        },
      },
    ],
    'gpt-4o-mini': [
      {
        version: '2024-07-18',
        releaseDate: '2024-07-18',
        changeNote: 'GPT-4o mini release',
        deployment: {
          provider: 'openai',
          endpoint: 'https://api.openai.com/v1/chat/completions',
          region: 'us-east-1',
          replicas: 4,
          costPer1kInput: 0.00015,
          costPer1kOutput: 0.0006,
          avgLatencyMs: 400,
        },
        performance: {
          benchmarkScores: { mmlu: 82.0, humaneval: 87.2, gsm8k: 93.0 },
          accuracy: 0.87,
          evalDate: '2024-07-20',
        },
        safety: {
          guardrailsLevel: 'medium',
          piiRedaction: true,
          contentFiltering: true,
          jailbreakResistanceScore: 80,
        },
      },
    ],
    'o1-preview': [
      {
        version: '2024-09-12',
        releaseDate: '2024-09-12',
        changeNote: 'o1 reasoning preview release',
        deployment: {
          provider: 'openai',
          endpoint: 'https://api.openai.com/v1/chat/completions',
          region: 'us-east-1',
          replicas: 1,
          costPer1kInput: 0.015,
          costPer1kOutput: 0.06,
          avgLatencyMs: 2400,
        },
        performance: {
          benchmarkScores: { mmlu: 90.8, humaneval: 89.0, gsm8k: 96.7 },
          accuracy: 0.93,
          evalDate: '2024-09-20',
        },
        safety: {
          guardrailsLevel: 'high',
          piiRedaction: true,
          contentFiltering: true,
          jailbreakResistanceScore: 88,
        },
      },
    ],
    'gemini-1-5-pro': [
      {
        version: '002',
        releaseDate: '2024-09-24',
        changeNote: 'Gemini 1.5 Pro second generation',
        deployment: {
          provider: 'google',
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro',
          region: 'us-central1',
          replicas: 3,
          costPer1kInput: 0.00125,
          costPer1kOutput: 0.005,
          avgLatencyMs: 1100,
        },
        performance: {
          benchmarkScores: { mmlu: 85.9, humaneval: 84.0, gsm8k: 91.0 },
          accuracy: 0.88,
          evalDate: '2024-09-30',
        },
        safety: {
          guardrailsLevel: 'medium',
          piiRedaction: true,
          contentFiltering: true,
          jailbreakResistanceScore: 85,
        },
      },
    ],
    'text-embedding-3-small': [
      {
        version: '1',
        releaseDate: '2024-01-25',
        changeNote: 'Text Embedding 3 Small release',
        deployment: {
          provider: 'openai',
          endpoint: 'https://api.openai.com/v1/embeddings',
          region: 'us-east-1',
          replicas: 2,
          costPer1kInput: 0.00002,
          costPer1kOutput: 0.0,
          avgLatencyMs: 120,
        },
        performance: {
          benchmarkScores: { mmlu: 0, humaneval: 0, gsm8k: 0 },
          accuracy: 0.0,
          evalDate: '2024-02-01',
        },
        safety: {
          guardrailsLevel: 'low',
          piiRedaction: false,
          contentFiltering: false,
          jailbreakResistanceScore: 0,
        },
      },
    ],
    'whisper-1': [
      {
        version: '1',
        releaseDate: '2022-09-21',
        changeNote: 'Whisper speech-to-text release',
        deployment: {
          provider: 'openai',
          endpoint: 'https://api.openai.com/v1/audio/transcriptions',
          region: 'us-east-1',
          replicas: 2,
          costPer1kInput: 0.006,
          costPer1kOutput: 0.0,
          avgLatencyMs: 2000,
        },
        performance: {
          benchmarkScores: { mmlu: 0, humaneval: 0, gsm8k: 0 },
          accuracy: 0.83,
          evalDate: '2023-01-15',
        },
        safety: {
          guardrailsLevel: 'low',
          piiRedaction: false,
          contentFiltering: false,
          jailbreakResistanceScore: 0,
        },
      },
    ],
  };

  const now = new Date().toISOString();

  for (const m of seedModels) {
    const id = uuidv4();
    const model = {
      id,
      slug: m.slug,
      displayName: m.displayName,
      description: m.description,
      owner: m.owner,
      type: m.type,
      capabilities: m.capabilities,
      contextWindow: m.contextWindow,
      status: m.status,
      tags: m.tags,
      createdAt: now,
      updatedAt: now,
      liveVersionId: null,
    };
    models.set(id, model);

    const versionDefs = seedVersions[m.slug] || [];
    const versionList = [];
    let liveVersionId = null;
    for (const v of versionDefs) {
      const vid = uuidv4();
      const version = {
        id: vid,
        modelId: id,
        version: v.version,
        releaseDate: v.releaseDate,
        retiredDate: null,
        changeNote: v.changeNote,
        deployment: v.deployment,
        performance: v.performance,
        safety: v.safety,
        createdAt: now,
      };
      versionList.push(version);
      liveVersionId = vid;
    }
    if (versionList.length > 0) {
      model.liveVersionId = liveVersionId;
    }
    versions.set(id, versionList);
  }
}

seed();

// =====================
// Health
// =====================
app.get('/health', (_req, res) => {
  res.redirect(301, '/api/health');
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'model-registry',
    port: PORT,
    modelCount: models.size,
    versionCount: [...versions.values()].reduce((a, b) => a + b.length, 0),
    timestamp: new Date().toISOString(),
  });
});

// =====================
// Model CRUD
// =====================
app.post('/api/models',requireAuth,  (req, res) => {
  try {
    const body = req.body || {};
    requireFields(body, ['displayName', 'owner', 'type']);
    const {
      slug,
      displayName,
      description = '',
      owner,
      type,
      capabilities = [],
      contextWindow = 0,
      status = 'stable',
      tags = [],
    } = body;

    if (!Array.isArray(capabilities)) {
      return res.status(400).json({ error: 'INVALID_FIELD', message: 'capabilities must be an array' });
    }
    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'INVALID_FIELD', message: 'tags must be an array' });
    }

    const finalSlug = slug ? slugify(slug) : generateSlug(displayName);
    if ([...models.values()].some((m) => m.slug === finalSlug)) {
      return res.status(409).json({ error: 'DUPLICATE_SLUG', message: `Model with slug '${finalSlug}' already exists` });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const model = {
      id,
      slug: finalSlug,
      displayName,
      description,
      owner,
      type,
      capabilities,
      contextWindow,
      status,
      tags,
      createdAt: now,
      updatedAt: now,
      liveVersionId: null,
    };
    models.set(id, model);
    versions.set(id, []);

    addAudit('model.create', id, { slug: finalSlug, displayName });
    res.status(201).json(model);
  } catch (err) {
    const status = err.status || 500;
    const code = err.code || 'INTERNAL_ERROR';
    res.status(status).json({ error: code, message: err.message });
  }
});

app.get('/api/models', (req, res) => {
  const { type, owner, capability, status, tag } = req.query;
  let list = [...models.values()];
  if (type) list = list.filter((m) => m.type === String(type));
  if (owner) list = list.filter((m) => m.owner === String(owner));
  if (capability) list = list.filter((m) => (m.capabilities || []).includes(String(capability)));
  if (status) list = list.filter((m) => m.status === String(status));
  if (tag) list = list.filter((m) => (m.tags || []).includes(String(tag)));
  res.json({ count: list.length, models: list });
});

app.get('/api/models/:idOrSlug', (req, res) => {
  const m = findModelByIdOrSlug(req.params.idOrSlug);
  if (!m) return res.status(404).json({ error: 'MODEL_NOT_FOUND', message: 'Model not found' });
  const versionList = versions.get(m.id) || [];
  res.json({ ...m, versions: versionList });
});

app.patch('/api/models/:idOrSlug',requireAuth,  (req, res) => {
  try {
    const m = findModelByIdOrSlug(req.params.idOrSlug);
    if (!m) return res.status(404).json({ error: 'MODEL_NOT_FOUND', message: 'Model not found' });
    const body = req.body || {};
    const editable = ['displayName', 'description', 'owner', 'type', 'capabilities', 'contextWindow', 'status', 'tags'];
    for (const field of editable) {
      if (body[field] !== undefined) {
        if ((field === 'capabilities' || field === 'tags') && !Array.isArray(body[field])) {
          return res.status(400).json({ error: 'INVALID_FIELD', message: `${field} must be an array` });
        }
        m[field] = body[field];
      }
    }
    m.updatedAt = new Date().toISOString();
    addAudit('model.update', m.id, { fields: Object.keys(body) });
    res.json(m);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
  }
});

app.delete('/api/models/:idOrSlug',requireAuth,  (req, res) => {
  const m = findModelByIdOrSlug(req.params.idOrSlug);
  if (!m) return res.status(404).json({ error: 'MODEL_NOT_FOUND', message: 'Model not found' });
  models.delete(m.id);
  versions.delete(m.id);
  addAudit('model.delete', m.id, { slug: m.slug });
  res.json({ deleted: true, id: m.id, slug: m.slug });
});

// =====================
// Versioning
// =====================
app.post('/api/models/:idOrSlug/versions',requireAuth,  (req, res) => {
  try {
    const m = findModelByIdOrSlug(req.params.idOrSlug);
    if (!m) return res.status(404).json({ error: 'MODEL_NOT_FOUND', message: 'Model not found' });
    const body = req.body || {};
    requireFields(body, ['version', 'deployment', 'performance', 'safety']);
    const { version, releaseDate, changeNote = '', deployment, performance, safety } = body;
    const list = versions.get(m.id) || [];
    if (list.some((v) => v.version === version)) {
      return res.status(409).json({ error: 'DUPLICATE_VERSION', message: `Version '${version}' already exists for this model` });
    }
    const id = uuidv4();
    const now = new Date().toISOString();
    const v = {
      id,
      modelId: m.id,
      version,
      releaseDate: releaseDate || now.slice(0, 10),
      retiredDate: null,
      changeNote,
      deployment,
      performance,
      safety,
      createdAt: now,
    };
    list.push(v);
    versions.set(m.id, list);
    if (!m.liveVersionId) m.liveVersionId = id;
    m.updatedAt = now;

    addAudit('version.create', m.id, { versionId: id, version });
    res.status(201).json(v);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
  }
});

app.get('/api/models/:idOrSlug/versions', (req, res) => {
  const m = findModelByIdOrSlug(req.params.idOrSlug);
  if (!m) return res.status(404).json({ error: 'MODEL_NOT_FOUND', message: 'Model not found' });
  const list = versions.get(m.id) || [];
  res.json({ modelId: m.id, slug: m.slug, count: list.length, versions: list });
});

app.get('/api/models/:idOrSlug/versions/:version', (req, res) => {
  const m = findModelByIdOrSlug(req.params.idOrSlug);
  if (!m) return res.status(404).json({ error: 'MODEL_NOT_FOUND', message: 'Model not found' });
  const v = findVersion(m.id, req.params.version);
  if (!v) return res.status(404).json({ error: 'VERSION_NOT_FOUND', message: `Version '${req.params.version}' not found` });
  res.json(v);
});

app.patch('/api/models/:idOrSlug/versions/:version',requireAuth,  (req, res) => {
  try {
    const m = findModelByIdOrSlug(req.params.idOrSlug);
    if (!m) return res.status(404).json({ error: 'MODEL_NOT_FOUND', message: 'Model not found' });
    const v = findVersion(m.id, req.params.version);
    if (!v) return res.status(404).json({ error: 'VERSION_NOT_FOUND', message: `Version '${req.params.version}' not found` });

    const body = req.body || {};
    if (body.changeNote !== undefined) v.changeNote = body.changeNote;
    if (body.releaseDate !== undefined) v.releaseDate = body.releaseDate;
    if (body.retiredDate !== undefined) v.retiredDate = body.retiredDate;
    if (body.deployment !== undefined) v.deployment = { ...v.deployment, ...body.deployment };
    if (body.performance !== undefined) v.performance = { ...v.performance, ...body.performance };
    if (body.safety !== undefined) v.safety = { ...v.safety, ...body.safety };

    m.updatedAt = new Date().toISOString();
    if (v.retiredDate) {
      addAudit('version.retire', m.id, { versionId: v.id, version: v.version });
    } else {
      addAudit('version.update', m.id, { versionId: v.id, version: v.version });
    }
    res.json(v);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
  }
});

app.post('/api/models/:idOrSlug/versions/:version/deploy',requireAuth,  (req, res) => {
  const m = findModelByIdOrSlug(req.params.idOrSlug);
  if (!m) return res.status(404).json({ error: 'MODEL_NOT_FOUND', message: 'Model not found' });
  const list = versions.get(m.id) || [];
  const v = list.find((x) => x.version === req.params.version);
  if (!v) return res.status(404).json({ error: 'VERSION_NOT_FOUND', message: `Version '${req.params.version}' not found` });

  // Demote previous live
  const previousLive = list.find((x) => x.id === m.liveVersionId && x.id !== v.id) || null;
  if (previousLive) {
    addAudit('version.demote', m.id, { versionId: previousLive.id, version: previousLive.version });
  }
  m.liveVersionId = v.id;
  m.updatedAt = new Date().toISOString();
  addAudit('version.deploy', m.id, { versionId: v.id, version: v.version });
  res.json({
    deployed: true,
    modelId: m.id,
    version: v.version,
    versionId: v.id,
    demoted: previousLive ? { versionId: previousLive.id, version: previousLive.version } : null,
  });
});

app.get('/api/models/:idOrSlug/live', (req, res) => {
  const m = findModelByIdOrSlug(req.params.idOrSlug);
  if (!m) return res.status(404).json({ error: 'MODEL_NOT_FOUND', message: 'Model not found' });
  if (!m.liveVersionId) return res.status(404).json({ error: 'NO_LIVE_VERSION', message: 'Model has no live version' });
  const list = versions.get(m.id) || [];
  const v = list.find((x) => x.id === m.liveVersionId);
  if (!v) return res.status(404).json({ error: 'NO_LIVE_VERSION', message: 'Live version record not found' });
  res.json({ model: { id: m.id, slug: m.slug, displayName: m.displayName }, liveVersion: v });
});

// =====================
// Discovery & search
// =====================
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase().trim();
  if (!q) return res.json({ query: '', count: 0, results: [] });
  const results = [...models.values()].filter((m) => {
    const haystack = [
      m.slug,
      m.displayName,
      m.description || '',
      ...(m.tags || []),
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });
  res.json({ query: q, count: results.length, results });
});

app.get('/api/capabilities/:capability', (req, res) => {
  const cap = req.params.capability;
  const list = [...models.values()].filter((m) => (m.capabilities || []).includes(cap));
  res.json({ capability: cap, count: list.length, models: list });
});

app.post('/api/recommend',requireAuth,  (req, res) => {
  try {
    const body = req.body || {};
    const requiredCapabilities = Array.isArray(body.requiredCapabilities) ? body.requiredCapabilities : [];
    const maxCost = body.maxCost !== undefined ? Number(body.maxCost) : null;
    const minContextWindow = body.minContextWindow !== undefined ? Number(body.minContextWindow) : null;
    const preferOwner = body.preferOwner || null;

    let candidates = [...models.values()];

    // Must have all required capabilities
    candidates = candidates.filter((m) => requiredCapabilities.every((c) => (m.capabilities || []).includes(c)));

    // Apply maxCost filter on the live version's avg cost (input + output)
    if (maxCost !== null) {
      candidates = candidates.filter((m) => {
        if (!m.liveVersionId) return false;
        const v = (versions.get(m.id) || []).find((x) => x.id === m.liveVersionId);
        if (!v || !v.deployment) return false;
        const avg = ((v.deployment.costPer1kInput || 0) + (v.deployment.costPer1kOutput || 0)) / 2;
        return avg <= maxCost;
      });
    }

    // Min context window
    if (minContextWindow !== null) {
      candidates = candidates.filter((m) => Number(m.contextWindow || 0) >= minContextWindow);
    }

    // Sort
    candidates.sort((a, b) => {
      if (preferOwner) {
        const aOwner = a.owner === preferOwner ? 0 : 1;
        const bOwner = b.owner === preferOwner ? 0 : 1;
        if (aOwner !== bOwner) return aOwner - bOwner;
      }
      const aVer = (versions.get(a.id) || []).find((x) => x.id === a.liveVersionId);
      const bVer = (versions.get(b.id) || []).find((x) => x.id === b.liveVersionId);
      const aCost = aVer ? (aVer.deployment.costPer1kInput || 0) + (aVer.deployment.costPer1kOutput || 0) : Number.MAX_SAFE_INTEGER;
      const bCost = bVer ? (bVer.deployment.costPer1kInput || 0) + (bVer.deployment.costPer1kOutput || 0) : Number.MAX_SAFE_INTEGER;
      if (aCost !== bCost) return aCost - bCost;
      return (b.contextWindow || 0) - (a.contextWindow || 0);
    });

    res.json({
      criteria: { requiredCapabilities, maxCost, minContextWindow, preferOwner },
      count: candidates.length,
      recommendations: candidates,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
  }
});

app.get('/api/owners', (_req, res) => {
  const owners = [...new Set([...models.values()].map((m) => m.owner))].sort();
  res.json({ count: owners.length, owners });
});

app.get('/api/types', (_req, res) => {
  const types = [...new Set([...models.values()].map((m) => m.type))].sort();
  res.json({ count: types.length, types });
});

// =====================
// Compare
// =====================
app.post('/api/compare',requireAuth,  (req, res) => {
  try {
    const body = req.body || {};
    const modelIds = Array.isArray(body.modelIds) ? body.modelIds : [];
    if (modelIds.length === 0) {
      return res.status(400).json({ error: 'MISSING_FIELDS', message: 'modelIds is required and must be a non-empty array' });
    }

    const compared = modelIds.map((idOrSlug) => {
      const m = findModelByIdOrSlug(idOrSlug);
      if (!m) return { idOrSlug, error: 'MODEL_NOT_FOUND' };
      const list = versions.get(m.id) || [];
      return {
        id: m.id,
        slug: m.slug,
        displayName: m.displayName,
        owner: m.owner,
        type: m.type,
        capabilities: m.capabilities,
        contextWindow: m.contextWindow,
        status: m.status,
        tags: m.tags,
        liveVersionId: m.liveVersionId,
        versions: list.map((v) => ({
          version: v.version,
          releaseDate: v.releaseDate,
          retiredDate: v.retiredDate,
          changeNote: v.changeNote,
          deployment: v.deployment,
          performance: v.performance,
          safety: v.safety,
          isLive: v.id === m.liveVersionId,
        })),
      };
    });

    res.json({ count: compared.length, compared });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
  }
});

// =====================
// Stats & audit
// =====================
app.get('/api/stats', (_req, res) => {
  let totalVersions = 0;
  let deployed = 0;
  let deprecated = 0;
  for (const m of models.values()) {
    const list = versions.get(m.id) || [];
    totalVersions += list.length;
    for (const v of list) {
      if (m.liveVersionId && v.id === m.liveVersionId) deployed += 1;
      if (v.retiredDate) deprecated += 1;
    }
  }
  res.json({
    totalModels: models.size,
    totalVersions,
    deployed,
    deprecated,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/audit', (_req, res) => {
  const last = auditLog.slice(-100).reverse();
  res.json({ count: last.length, entries: last });
});

// =====================
// 404 + error handlers
// =====================
app.use((req, res) => notFound(req, res));

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`model-registry service listening on port ${PORT}`);
});
installGracefulShutdown(server);

module.exports = app;
