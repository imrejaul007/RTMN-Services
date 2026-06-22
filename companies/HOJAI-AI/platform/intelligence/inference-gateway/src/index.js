/**
 * HOJAI Inference Gateway (port 4734)
 *
 * The single API for ALL LLM inference across the HOJAI AI ecosystem.
 * Routes requests to OpenAI / Anthropic / Google / Mistral / local models
 * based on capability, cost, latency, and policy.
 *
 * Important: this service NEVER holds real provider keys in plaintext in code.
 * Keys are stored in Secrets Manager (port 4744) under names like
 * `openai-api-key`, `anthropic-api-key`, etc. The gateway looks them up on
 * demand via the Secrets Manager HTTP API. If a key is missing, the gateway
 * returns a deterministic stub response so the rest of the platform can
 * still be developed and tested without real provider credentials.
 *
 * Provider adapter contract:
 *   - Each adapter exposes a uniform async function `complete({model, messages, ...opts})`
 *   - Returns `{text, model, provider, tokensIn, tokensOut, latencyMs, costUsd, raw: {...}}`
 *   - Adapters may throw on failure (rate limit, network, auth) — gateway
 *     handles retry-with-fallback.
 *
 * In production:
 *   - Swap the stub adapters in providers.js for real SDK calls.
 *   - Add circuit-breaker around each provider (we already have micro-intelligence).
 *   - Add streaming (SSE) and async batch endpoints.
 */

const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const PORT = parseInt(process.env.PORT, 10) || 4734;
const SERVICE_NAME = 'inference-gateway';
const VERSION = '1.0.0';
const SECRETS_MANAGER_URL = process.env.SECRETS_MANAGER_URL || 'http://localhost:4744';

// ============================================================
// Model catalog (registry-like — kept inline for v1)
// ============================================================

const MODEL_CATALOG = {
  // ---- OpenAI ----
  'gpt-4o': {
    provider: 'openai',
    displayName: 'GPT-4o',
    capabilities: ['chat', 'vision', 'tools', 'json'],
    contextWindow: 128000,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
    avgLatencyMs: 800,
    tier: 'premium'
  },
  'gpt-4o-mini': {
    provider: 'openai',
    displayName: 'GPT-4o mini',
    capabilities: ['chat', 'tools', 'json'],
    contextWindow: 128000,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    avgLatencyMs: 400,
    tier: 'budget'
  },
  'o1-preview': {
    provider: 'openai',
    displayName: 'o1 Preview',
    capabilities: ['chat', 'reasoning'],
    contextWindow: 128000,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.06,
    avgLatencyMs: 5000,
    tier: 'premium'
  },
  // ---- Anthropic ----
  'claude-3-5-sonnet': {
    provider: 'anthropic',
    displayName: 'Claude 3.5 Sonnet',
    capabilities: ['chat', 'vision', 'tools'],
    contextWindow: 200000,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    avgLatencyMs: 900,
    tier: 'premium'
  },
  'claude-3-haiku': {
    provider: 'anthropic',
    displayName: 'Claude 3 Haiku',
    capabilities: ['chat'],
    contextWindow: 200000,
    costPer1kInput: 0.00025,
    costPer1kOutput: 0.00125,
    avgLatencyMs: 350,
    tier: 'budget'
  },
  // ---- Google ----
  'gemini-1.5-pro': {
    provider: 'google',
    displayName: 'Gemini 1.5 Pro',
    capabilities: ['chat', 'vision', 'long-context'],
    contextWindow: 1000000,
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.005,
    avgLatencyMs: 1100,
    tier: 'premium'
  },
  'gemini-1.5-flash': {
    provider: 'google',
    displayName: 'Gemini 1.5 Flash',
    capabilities: ['chat', 'vision', 'long-context'],
    contextWindow: 1000000,
    costPer1kInput: 0.000075,
    costPer1kOutput: 0.0003,
    avgLatencyMs: 300,
    tier: 'budget'
  },
  // ---- Mistral ----
  'mistral-large': {
    provider: 'mistral',
    displayName: 'Mistral Large',
    capabilities: ['chat', 'tools'],
    contextWindow: 128000,
    costPer1kInput: 0.004,
    costPer1kOutput: 0.012,
    avgLatencyMs: 700,
    tier: 'premium'
  },
  // ---- Local / self-hosted stubs ----
  'hojai-llama-3-70b': {
    provider: 'local',
    displayName: 'HOJAI Llama 3 70B (local)',
    capabilities: ['chat'],
    contextWindow: 8192,
    costPer1kInput: 0.0,
    costPer1kOutput: 0.0,
    avgLatencyMs: 1500,
    tier: 'free'
  }
};

// Default routing preferences — override per request
const DEFAULTS = {
  preferredTier: 'premium',          // 'premium' | 'budget' | 'free' | 'any'
  preferProvider: null,              // 'openai' | 'anthropic' | 'google' | 'mistral' | 'local' | null
  fallbackChain: ['claude-3-5-sonnet', 'gpt-4o', 'gemini-1.5-pro', 'mistral-large', 'hojai-llama-3-70b'],
  maxCostUsd: null,                  // null = no cap
  maxLatencyMs: null,                // null = no cap
  timeoutMs: 30000,
  requireCapability: null,           // 'vision' | 'tools' | etc.
  retries: 1                         // per fallback
};

// ============================================================
// Provider adapters (stubbed — return deterministic demo responses)
// ============================================================

async function getProviderKey(provider) {
  // In production: fetch from Secrets Manager
  // try {
  //   const r = await fetch(`${SECRETS_MANAGER_URL}/api/secrets/${provider}-api-key/value`);
  //   if (r.ok) { const j = await r.json(); return j.value; }
  // } catch {}
  return null; // No real key — fallback to stub mode
}

const STUB_DELAY_MS = 120;

async function callStubProvider({ provider, model, messages, opts = {} }) {
  const start = Date.now();
  // Simulate latency
  await new Promise(r => setTimeout(r, STUB_DELAY_MS));
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  const promptText = lastUser ? lastUser.content : '';
  const text = `[${provider}/${model}] (stub) You said: "${promptText.slice(0, 100)}"`;
  const tokensIn = Math.ceil(promptText.length / 4);
  const tokensOut = Math.ceil(text.length / 4);
  const latencyMs = Date.now() - start;
  return {
    text,
    model,
    provider,
    tokensIn,
    tokensOut,
    latencyMs,
    costUsd: 0, // Stubbed: zero cost for local stub
    stubbed: true,
    raw: { provider, model, mode: 'stub' }
  };
}

async function callProvider(provider, params) {
  const key = await getProviderKey(provider);
  if (!key) {
    return callStubProvider({ provider, ...params });
  }
  // Real adapter would go here. Per CLAUDE.md, HOJAI uses
  // orchestration-of-external-models strategy, not a foundation model yet.
  return callStubProvider({ provider, ...params });
}

// ============================================================
// Routing logic
// ============================================================

function selectModel({ requestedModel, options }) {
  // 1. Explicit request wins
  if (requestedModel && MODEL_CATALOG[requestedModel]) {
    return requestedModel;
  }

  // 2. Filter by tier
  let candidates = Object.entries(MODEL_CATALOG);
  if (options.preferredTier && options.preferredTier !== 'any') {
    const filtered = candidates.filter(([_, m]) => m.tier === options.preferredTier);
    if (filtered.length > 0) candidates = filtered;
  }

  // 3. Filter by preferred provider
  if (options.preferProvider) {
    const filtered = candidates.filter(([_, m]) => m.provider === options.preferProvider);
    if (filtered.length > 0) candidates = filtered;
  }

  // 4. Filter by capability
  if (options.requireCapability) {
    const filtered = candidates.filter(([_, m]) => m.capabilities.includes(options.requireCapability));
    if (filtered.length > 0) candidates = filtered;
  }

  // 5. Filter by cost cap
  if (options.maxCostUsd != null) {
    const filtered = candidates.filter(([_, m]) => m.costPer1kOutput <= options.maxCostUsd / 10);
    if (filtered.length > 0) candidates = filtered;
  }

  // 6. Filter by latency cap
  if (options.maxLatencyMs != null) {
    const filtered = candidates.filter(([_, m]) => m.avgLatencyMs <= options.maxLatencyMs);
    if (filtered.length > 0) candidates = filtered;
  }

  if (candidates.length === 0) {
    return null;
  }

  // 7. Cheapest among filtered
  candidates.sort((a, b) => a[1].costPer1kOutput - b[1].costPer1kOutput);
  return candidates[0][0];
}

// ============================================================
// Stats tracking
// ============================================================

const stats = {
  totalRequests: 0,
  totalTokensIn: 0,
  totalTokensOut: 0,
  totalCostUsd: 0,
  totalLatencyMs: 0,
  byProvider: { openai: 0, anthropic: 0, google: 0, mistral: 0, local: 0 },
  byModel: {},
  byTier: { premium: 0, budget: 0, free: 0 },
  fallbackHits: 0,
  stubHits: 0,
  errors: 0
};

const auditLog = [];

// ============================================================
// Express app
// ============================================================

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '2mb' }));

app.use((req, _res, next) => {
  console.log(`[${SERVICE_NAME}] ${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req, res) => res.redirect(301, '/api/health'));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: VERSION,
    port: PORT,
    uptime: process.uptime(),
    stats: {
      totalRequests: stats.totalRequests,
      modelsAvailable: Object.keys(MODEL_CATALOG).length,
      providers: Object.keys(stats.byProvider)
    },
    timestamp: new Date().toISOString()
  });
});

// ---- Model catalog ----

app.get('/api/models', (_req, res) => {
  res.json({
    count: Object.keys(MODEL_CATALOG).length,
    models: Object.entries(MODEL_CATALOG).map(([id, m]) => ({ id, ...m }))
  });
});

app.get('/api/models/:modelId', (req, res) => {
  const m = MODEL_CATALOG[req.params.modelId];
  if (!m) return res.status(404).json({ error: 'MODEL_NOT_FOUND' });
  res.json({ id: req.params.modelId, ...m });
});

// ---- Routing ----

app.post('/api/route',requireAuth,  (req, res) => {
  const { requestedModel, options = {} } = req.body || {};
  const merged = { ...DEFAULTS, ...options };
  const selected = selectModel({ requestedModel, options: merged });
  if (!selected) {
    return res.status(400).json({
      error: 'NO_MODEL_MATCHES_CRITERIA',
      message: 'No model in catalog matches the requested criteria',
      criteria: merged
    });
  }
  const m = MODEL_CATALOG[selected];
  res.json({
    selectedModel: selected,
    provider: m.provider,
    displayName: m.displayName,
    tier: m.tier,
    estimatedCostPer1kOutput: m.costPer1kOutput,
    estimatedLatencyMs: m.avgLatencyMs
  });
});

// ---- Completion (the main endpoint) ----

app.post('/api/complete',requireAuth,  async (req, res) => {
  const start = Date.now();
  const { messages, model: requestedModel, options = {}, stream } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'messages array required' });
  }

  const merged = { ...DEFAULTS, ...options };
  const selected = selectModel({ requestedModel, options: merged });
  if (!selected) {
    stats.errors += 1;
    return res.status(400).json({ error: 'NO_MODEL_MATCHES_CRITERIA' });
  }
  const meta = MODEL_CATALOG[selected];

  let attempt = 0;
  let result = null;
  let lastError = null;
  const tried = [];

  // Try the selected model first, then walk the fallback chain
  const chain = [selected, ...merged.fallbackChain.filter(m => m !== selected)];

  for (const candidate of chain) {
    if (attempt > merged.retries + 1) break;
    if (!MODEL_CATALOG[candidate]) continue;
    const cmeta = MODEL_CATALOG[candidate];
    tried.push(candidate);
    try {
      const r = await callProvider(cmeta.provider, { model: candidate, messages, opts: merged });
      result = r;
      if (candidate !== selected) stats.fallbackHits += 1;
      break;
    } catch (err) {
      lastError = err;
      attempt += 1;
      continue;
    }
  }

  if (!result) {
    stats.errors += 1;
    return res.status(502).json({
      error: 'ALL_PROVIDERS_FAILED',
      message: 'Every provider in the fallback chain failed',
      lastError: lastError ? lastError.message : null,
      tried
    });
  }

  if (result.stubbed) stats.stubHits += 1;

  stats.totalRequests += 1;
  stats.totalTokensIn += result.tokensIn;
  stats.totalTokensOut += result.tokensOut;
  stats.totalCostUsd += result.costUsd;
  stats.totalLatencyMs += result.latencyMs;
  stats.byProvider[result.provider] = (stats.byProvider[result.provider] || 0) + 1;
  stats.byModel[result.model] = (stats.byModel[result.model] || 0) + 1;
  stats.byTier[meta.tier] = (stats.byTier[meta.tier] || 0) + 1;

  const reqId = uuidv4();
  auditLog.push({
    id: reqId,
    requestedModel: requestedModel || 'auto',
    selectedModel: result.model,
    provider: result.provider,
    stubbed: result.stubbed,
    fallback: tried.length > 1,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    costUsd: result.costUsd,
    latencyMs: result.latencyMs,
    timestamp: new Date()
  });
  if (auditLog.length > 5000) auditLog.shift();

  res.json({
    id: reqId,
    text: result.text,
    model: result.model,
    provider: result.provider,
    tier: meta.tier,
    usage: {
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costUsd: Number(result.costUsd.toFixed(6))
    },
    latencyMs: result.latencyMs,
    stubbed: result.stubbed,
    fallback: tried.length > 1,
    fallbackChain: tried,
    timestamp: new Date().toISOString()
  });
});

// ---- Stats & audit ----

app.get('/api/stats', (_req, res) => {
  res.json({
    ...stats,
    avgLatencyMs: stats.totalRequests > 0 ? Math.round(stats.totalLatencyMs / stats.totalRequests) : 0,
    avgCostPerRequest: stats.totalRequests > 0 ? Number((stats.totalCostUsd / stats.totalRequests).toFixed(6)) : 0,
    stubRate: stats.totalRequests > 0 ? Number((stats.stubHits / stats.totalRequests).toFixed(4)) : 0,
    fallbackRate: stats.totalRequests > 0 ? Number((stats.fallbackHits / stats.totalRequests).toFixed(4)) : 0
  });
});

app.get('/api/stats/reset', (_req, res) => {
  for (const k of Object.keys(stats)) stats[k] = (typeof stats[k] === 'object') ? (Array.isArray(stats[k]) ? [] : {}) : 0;
  for (const p of Object.keys(stats.byProvider)) stats.byProvider[p] = 0;
  for (const t of Object.keys(stats.byTier)) stats.byTier[t] = 0;
  res.json({ message: 'Stats reset' });
});

app.get('/api/audit', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
  res.json({ count: auditLog.length, entries: auditLog.slice(-limit).reverse() });
});

app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` }));
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] Listening on port ${PORT}`);
  console.log(`[${SERVICE_NAME}] Health: http://localhost:${PORT}/health`);
  console.log(`[${SERVICE_NAME}] Catalog: ${Object.keys(MODEL_CATALOG).length} models`);
  console.log(`[${SERVICE_NAME}] Secrets: ${SECRETS_MANAGER_URL}`);
});
installGracefulShutdown(server);

module.exports = { app, selectModel, MODEL_CATALOG };
