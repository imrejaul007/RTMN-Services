/**
 * HOJAI Inference Gateway (port 4770)
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
 * Phase 0 (Real LLM SDK Integration, 2026-06-24):
 *   - Real SDK adapters for OpenAI / Anthropic / Google / Mistral (src/providers.js)
 *   - Per-provider circuit breaker (src/circuit-breaker.js)
 *   - Secrets Manager client with 5-min cache (src/secrets-client.js)
 *   - SSE streaming endpoint /api/complete/stream
 *   - Operability endpoints /api/breakers, /api/secrets/cache
 *   - Forced stub mode via INFERENCE_STUB_MODE=true
 */

const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { callRealProvider } = require('./providers');
const { breakers, getAllBreakerStates } = require('./circuit-breaker');
const { getProviderKey, clearCache, getCacheState } = require('./secrets-client');
const { withRetry } = require('./retry');

const PORT = parseInt(process.env.PORT, 10) || 4770;
const SERVICE_NAME = 'inference-gateway';
const VERSION = '2.0.0';
const SECRETS_MANAGER_URL = process.env.SECRETS_MANAGER_URL || 'http://localhost:4744';
// If true, never call real providers — only stubs. Useful for offline dev.
const STUB_MODE = process.env.INFERENCE_STUB_MODE === 'true';

// Phase 5: AI-safety wiring. Every request passes through ai-safety BEFORE the LLM call
// (prompt-injection + PII) and AFTER the LLM call (toxicity + hallucination + unsourced authority).
// Set INFERENCE_AI_SAFETY=false to disable (e.g. for local dev or load tests).
const AI_SAFETY_URL = process.env.AI_SAFETY_URL || 'http://localhost:4774';
const AI_SAFETY_ENABLED = (process.env.INFERENCE_AI_SAFETY ?? 'true').toLowerCase() !== 'false';
const AI_SAFETY_TIMEOUT_MS = Number(process.env.AI_SAFETY_TIMEOUT_MS) || 1500;
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

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
// Provider adapters
//
// Flow: selectModel -> callProvider (with circuit breaker) -> real SDK or stub
// ============================================================

const STUB_DELAY_MS = 120;

async function callStubProvider({ provider, model, messages, opts = {} }) {
  const start = Date.now();
  // Simulate latency
  await new Promise(r => setTimeout(r, STUB_DELAY_MS));
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  const promptText = lastUser ? lastUser.content : '';
  const text = `[${provider}/${model}] (stub) You said: "${String(promptText).slice(0, 100)}"`;
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

class CircuitOpenError extends Error {
  constructor(provider) {
    super(`Circuit breaker open for provider: ${provider}`);
    this.code = 'CIRCUIT_OPEN';
    this.provider = provider;
  }
}

// Phase 5: AI-safety HTTP helpers. Same fail-open pattern as flow-orchestrator:
// if ai-safety is unreachable or times out, we degrade open and tag the response.
async function aiSafetyCheckInput(messages) {
  if (!AI_SAFETY_ENABLED) return { safe: true, skipped: 'disabled' };
  // Concatenate user/assistant text content for inspection.
  const text = (Array.isArray(messages) ? messages : [])
    .map((m) => (m && typeof m.content === 'string' ? m.content : ''))
    .filter(Boolean)
    .join('\n');
  if (!text) return { safe: true, skipped: 'empty' };
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), AI_SAFETY_TIMEOUT_MS);
  try {
    const r = await fetch(`${AI_SAFETY_URL}/api/check/input`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(INTERNAL_SERVICE_TOKEN ? { 'X-Internal-Token': INTERNAL_SERVICE_TOKEN } : {}),
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return { safe: true, degraded: true, error: `http_${r.status}` };
    return {
      safe: body.safe !== false,
      blocked: !!body.blocked,
      reasons: body.reasons || [],
      sanitized: body.sanitized || text,
      confidence: body.confidence,
    };
  } catch (err) {
    return { safe: true, degraded: true, error: err.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(t);
  }
}

async function aiSafetyCheckOutput(text) {
  if (!AI_SAFETY_ENABLED) return { safe: true, skipped: 'disabled' };
  if (typeof text !== 'string' || text.length === 0) return { safe: true, skipped: 'empty' };
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), AI_SAFETY_TIMEOUT_MS);
  try {
    const r = await fetch(`${AI_SAFETY_URL}/api/check/output`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(INTERNAL_SERVICE_TOKEN ? { 'X-Internal-Token': INTERNAL_SERVICE_TOKEN } : {}),
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return { safe: true, degraded: true, error: `http_${r.status}` };
    return {
      safe: body.safe !== false,
      blocked: !!body.blocked,
      reasons: body.reasons || [],
      risk: body.risk,
      flags: body.flags || [],
      redacted: body.redacted || text,
    };
  } catch (err) {
    return { safe: true, degraded: true, error: err.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(t);
  }
}

async function callProvider(provider, params) {
  // 1. Stub mode (offline dev / tests)
  if (STUB_MODE) {
    return callStubProvider({ provider, ...params });
  }

  // 2. Local model is always a stub for now (Phase 30 will wire vLLM/Ollama)
  if (provider === 'local') {
    return callStubProvider({ provider, ...params });
  }

  // 3. Circuit breaker check
  const breaker = breakers[provider];
  if (breaker && !breaker.shouldAllow()) {
    throw new CircuitOpenError(provider);
  }

  // 4. Real adapter — needs a key
  const apiKey = await getProviderKey(provider);
  if (!apiKey) {
    // No key in secrets manager — fall back to stub so the rest of the
    // platform still works. Stats will reflect stubHits.
    return callStubProvider({ provider, ...params });
  }

  // 5. Resolve model meta (for cost calculation)
  const modelMeta = MODEL_CATALOG[params.model] || { costPer1kInput: 0, costPer1kOutput: 0 };

  // 6. Real SDK call (with retry-with-backoff for transient errors)
  try {
    const result = await withRetry(
      () => callRealProvider(provider, {
        model: params.model,
        modelMeta,
        messages: params.messages,
        opts: { ...(params.opts || {}), _apiKey: apiKey }
      }),
      { maxRetries: 2, baseMs: 250, maxDelayMs: 3_000 }
    );
    if (breaker) breaker.recordSuccess();
    return result;
  } catch (err) {
    if (breaker) breaker.recordFailure();
    throw err;
  }
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

  // Phase 5: input safety check (prompt injection + PII)
  const inputCheck = await aiSafetyCheckInput(messages);
  if (inputCheck.blocked) {
    stats.safetyBlocked = (stats.safetyBlocked || 0) + 1;
    return res.status(400).json({
      error: 'AI_SAFETY_BLOCKED',
      phase: 'input',
      reasons: inputCheck.reasons || [],
      message: 'Request blocked by AI Safety — prompt injection or unsafe input detected.'
    });
  }
  // Use sanitized messages if provided (replaces injected payloads with sanitized version).
  const safeMessages = inputCheck.sanitized && Array.isArray(inputCheck.sanitized)
    ? inputCheck.sanitized
    : messages;

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
      const r = await callProvider(cmeta.provider, { model: candidate, messages: safeMessages, opts: merged });
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

  // Phase 5: output safety check (toxicity + hallucination + unsourced authority).
  // Default policy: WARN but return the response with safety metadata so callers can
  // decide how to surface it. Set options.strictSafety=true to hard-block on output.
  const outputCheck = await aiSafetyCheckOutput(result.text || '');
  const safetyMeta = {
    input: { blocked: inputCheck.blocked, degraded: inputCheck.degraded, reasons: inputCheck.reasons || [] },
    output: {
      blocked: outputCheck.blocked,
      degraded: outputCheck.degraded,
      risk: outputCheck.risk || 'low',
      reasons: outputCheck.reasons || [],
      flags: outputCheck.flags || []
    }
  };
  if (outputCheck.blocked) {
    stats.safetyBlocked = (stats.safetyBlocked || 0) + 1;
    if (merged.strictSafety) {
      return res.status(400).json({
        error: 'AI_SAFETY_BLOCKED',
        phase: 'output',
        reasons: outputCheck.reasons || [],
        message: 'Response blocked by AI Safety — toxicity or hallucination detected.'
      });
    }
    // Otherwise return the redacted text + safety metadata
    result.text = outputCheck.redacted || result.text;
  }

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
    safety: { inputBlocked: inputCheck.blocked, outputBlocked: outputCheck.blocked, outputRisk: outputCheck.risk },
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
    safety: safetyMeta,
    timestamp: new Date().toISOString()
  });
});

// ---- Streaming completion (SSE) ----

app.post('/api/complete/stream', requireAuth, async (req, res) => {
  const { messages, model: requestedModel, options = {} } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'messages array required' });
  }

  const merged = { ...DEFAULTS, ...options };
  const selected = selectModel({ requestedModel, options: merged });
  if (!selected) return res.status(400).json({ error: 'NO_MODEL_MATCHES_CRITERIA' });
  const meta = MODEL_CATALOG[selected];

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders?.();

  const reqId = uuidv4();
  const started = Date.now();

  // For now: streaming only works in stub mode (real providers need SDK
  // streaming support — added per provider in a follow-up). This endpoint
  // exists so callers can wire to it today and switch to real streaming later.
  if (STUB_MODE || (await getProviderKey(meta.provider)) === null) {
    const stub = await callStubProvider({ provider: meta.provider, model: selected, messages, opts: merged });
    // Stream the stub response in 5-token chunks
    const words = stub.text.split(/(\s+)/);
    for (const w of words) {
      res.write(`data: ${JSON.stringify({ id: reqId, delta: w, model: selected, provider: meta.provider })}\n\n`);
      await new Promise(r => setTimeout(r, 30));
    }
    res.write(`data: ${JSON.stringify({ id: reqId, done: true, usage: { tokensIn: stub.tokensIn, tokensOut: stub.tokensOut, costUsd: 0 }, stubbed: true, latencyMs: Date.now() - started })}\n\n`);
    res.end();
    stats.stubHits += 1;
    stats.totalRequests += 1;
    return;
  }

  // Real streaming not yet implemented per provider — fall back to non-streaming
  // and emit the full response as a single SSE event
  try {
    const result = await callProvider(meta.provider, { model: selected, messages, opts: merged });
    res.write(`data: ${JSON.stringify({ id: reqId, delta: result.text, model: selected, provider: meta.provider })}\n\n`);
    res.write(`data: ${JSON.stringify({
      id: reqId,
      done: true,
      usage: { tokensIn: result.tokensIn, tokensOut: result.tokensOut, costUsd: result.costUsd },
      stubbed: result.stubbed,
      latencyMs: Date.now() - started
    })}\n\n`);
    res.end();
    stats.totalRequests += 1;
    stats.totalTokensIn += result.tokensIn;
    stats.totalTokensOut += result.tokensOut;
    stats.totalCostUsd += result.costUsd;
  } catch (err) {
    res.write(`data: ${JSON.stringify({ id: reqId, error: err.message, code: err.code || 'PROVIDER_ERROR' })}\n\n`);
    res.end();
    stats.errors += 1;
  }
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

// ---- Operational health (Phase 0: Real LLM SDK) ----

app.get('/api/breakers', (_req, res) => {
  res.json({
    breakers: getAllBreakerStates(),
    mode: STUB_MODE ? 'stub-forced' : 'real-with-stub-fallback'
  });
});

app.get('/api/secrets/cache', (_req, res) => {
  res.json({
    secretsManagerUrl: SECRETS_MANAGER_URL,
    cache: getCacheState(),
    mode: STUB_MODE ? 'stub-forced' : 'real-with-stub-fallback'
  });
});

app.post('/api/secrets/cache/clear', (_req, res) => {
  clearCache();
  res.json({ message: 'Cache cleared' });
});

// Readiness probe — returns 200 once the server is accepting requests.
// Must be defined BEFORE the 404 catch-all below.
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` }));
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});



// Only start the HTTP listener when this file is run directly. When imported
// by tests, we export the Express `app` so they can bind to a random port.
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] Listening on port ${PORT}`);
    console.log(`[${SERVICE_NAME}] Health: http://localhost:${PORT}/health`);
    console.log(`[${SERVICE_NAME}] Catalog: ${Object.keys(MODEL_CATALOG).length} models`);
    console.log(`[${SERVICE_NAME}] Secrets: ${SECRETS_MANAGER_URL}`);
  });
  installGracefulShutdown(server);
}

module.exports = { app, selectModel, MODEL_CATALOG };
