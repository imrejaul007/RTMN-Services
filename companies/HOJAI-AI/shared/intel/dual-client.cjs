/**
 * Dual-client intelligence helper (HOJAI Intelligence + REZ Intelligence)
 *
 * REPLACES the older per-service `rez-intel-client.js`. The old client pointed
 * only at REZ Intelligence Integration (port 5370), which is itself a thin
 * proxy over HOJAI Intelligence (port 4881) + REZ-Intelligence-Bridge (5369).
 *
 * This helper supports three modes via `INTEL_MODE` env var:
 *
 *   INTEL_MODE=hojai  — call HOJAI Intelligence (4881) directly. Use this for
 *                       HOJAI Foundry startups, Nexha tenants, and any
 *                       non-REZ-ecosystem consumer.
 *   INTEL_MODE=rez    — call REZ Intelligence Integration (5370). Use this for
 *                       REZ-ecosystem clients (RTMN internal, Do App).
 *   INTEL_MODE=dual   — DEFAULT. Try HOJAI first, fall back to REZ. Best for
 *                       copilots that may be deployed in either ecosystem.
 *
 * Backend availability by helper:
 *
 *   classifyIntent           → HOJAI /api/analyze (POST) + REZ /api/v1/intent/classify
 *   getCustomerInsights      → HOJAI /api/customer/:id/insights (GET) + REZ /api/v1/insights/customer
 *   enrichAgentContext       → REZ ONLY (/api/v1/agent/enrich)
 *   getMerchantInsights      → REZ ONLY (/api/v1/insights/merchant)
 *   predictRevenue           → REZ ONLY (/api/v1/predictions/revenue)
 *   predictChurn             → REZ ONLY (/api/v1/predictions/churn)
 *   predictLtv               → REZ ONLY (/api/v1/predictions/ltv)
 *   predictDemand            → REZ ONLY (/api/v1/predictions/demand)
 *   getProductRecommendations → REZ ONLY (/api/v1/recommendations/products)
 *   getNextBestAction        → REZ ONLY (/api/v1/recommendations/next-best-action)
 *   getPricingRecommendations → REZ ONLY (/api/v1/recommendations/pricing)
 *
 * In `hojai` mode, REZ-only helpers return null (no fallback exists).
 * In `rez` mode, REZ-only helpers work; HOJAI-only endpoints are skipped.
 * In `dual` mode, helpers that exist in both backends try HOJAI first.
 *
 * Graceful degradation: all helpers return null on failure (timeout, non-2xx,
 * disabled backend). Callers must handle null and fall back to local logic.
 */

'use strict';

const REZ_INTEL_URL = process.env.REZ_INTEL_URL || 'http://localhost:5370';
const HOJAI_INTEL_URL = process.env.HOJAI_INTEL_URL || 'http://localhost:4881';

// Read all config lazily so test env-var overrides apply after module load.
// Without this, INTEL_MODE + TIMEOUT_MS are captured once at first require()
// and never re-read, breaking tests that flip env vars between tests.
function getConfig() {
  return {
    mode: (process.env.INTEL_MODE || 'dual').toLowerCase(),
    rezEnabled: process.env.REZ_INTEL_ENABLED !== 'false',
    hojaiEnabled: process.env.HOJAI_INTEL_ENABLED !== 'false',
    timeoutMs: parseInt(process.env.INTEL_TIMEOUT_MS || process.env.REZ_INTEL_TIMEOUT_MS || '3000')
  };
}

// ── low-level HTTP ─────────────────────────────────────────────────────────

// ── low-level HTTP ─────────────────────────────────────────────────────────

async function callPost(baseUrl, endpoint, body) {
  if (!baseUrl) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getConfig().timeoutMs);
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    // REZ returns { success: true, data: {...} }
    if (json && json.success === true) return json.data;
    // HOJAI returns the analysis object directly (intent, sentiment, etc.)
    if (json && (json.intent || json.sentiment || json.retrieval)) return json;
    return null;
  } catch (err) {
    return null;
  }
}

async function callGet(baseUrl, endpoint) {
  if (!baseUrl) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getConfig().timeoutMs);
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    if (json && (json.success === false || json.error)) return null;
    return json;
  } catch (err) {
    return null;
  }
}

// ── mode-aware dispatch ────────────────────────────────────────────────────

function tryHojai(cfg) { return cfg.mode !== 'rez' && cfg.hojaiEnabled; }
function tryRez(cfg)   { return cfg.mode !== 'hojai' && cfg.rezEnabled; }

async function dualCall(hojaiFn, rezFn) {
  const cfg = getConfig();
  if (cfg.mode === 'hojai') return await hojaiFn();
  if (cfg.mode === 'rez') return await rezFn();
  const h = tryHojai(cfg) ? await hojaiFn() : null;
  if (h) return h;
  return tryRez(cfg) ? await rezFn() : null;
}

// ── public helpers ─────────────────────────────────────────────────────────

const enrichAgentContext = (params) => {
  if (!tryRez(getConfig())) return Promise.resolve(null);
  return callPost(REZ_INTEL_URL, '/api/v1/agent/enrich', params);
};

const classifyIntent = (params) => {
  const cfg = getConfig();
  if (!tryHojai(cfg) && !tryRez(cfg)) return Promise.resolve(null);
  // HOJAI /api/analyze expects { text, customerId, sessionId, context }
  // REZ /api/v1/intent/classify expects params as-is
  return dualCall(
    () => callPost(HOJAI_INTEL_URL, '/api/analyze', {
      text: (params && (params.message || params.text)) || '',
      customerId: params && params.customerId,
      sessionId: params && params.sessionId,
      context: params && params.context
    }),
    () => callPost(REZ_INTEL_URL, '/api/v1/intent/classify', params)
  );
};

const getCustomerInsights = (customerIdOrParams) => {
  const cfg = getConfig();
  if (!tryHojai(cfg) && !tryRez(cfg)) return Promise.resolve(null);
  const customerId = typeof customerIdOrParams === 'string'
    ? customerIdOrParams
    : (customerIdOrParams && customerIdOrParams.customerId);
  if (!customerId) return Promise.resolve(null);
  return dualCall(
    () => callGet(HOJAI_INTEL_URL, `/api/customer/${encodeURIComponent(customerId)}/insights`),
    () => callPost(REZ_INTEL_URL, '/api/v1/insights/customer', { customerId })
  );
};

// REZ-only helpers (HOJAI has no equivalent)
const getMerchantInsights = (params) =>
  tryRez(getConfig()) ? callPost(REZ_INTEL_URL, '/api/v1/insights/merchant', params) : Promise.resolve(null);

const predictRevenue = (params) =>
  tryRez(getConfig()) ? callPost(REZ_INTEL_URL, '/api/v1/predictions/revenue', params) : Promise.resolve(null);

const predictChurn = (params) =>
  tryRez(getConfig()) ? callPost(REZ_INTEL_URL, '/api/v1/predictions/churn', params) : Promise.resolve(null);

const predictLtv = (params) =>
  tryRez(getConfig()) ? callPost(REZ_INTEL_URL, '/api/v1/predictions/ltv', params) : Promise.resolve(null);

const predictDemand = (params) =>
  tryRez(getConfig()) ? callPost(REZ_INTEL_URL, '/api/v1/predictions/demand', params) : Promise.resolve(null);

const getProductRecommendations = (params) =>
  tryRez(getConfig()) ? callPost(REZ_INTEL_URL, '/api/v1/recommendations/products', params) : Promise.resolve(null);

const getNextBestAction = (params) =>
  tryRez(getConfig()) ? callPost(REZ_INTEL_URL, '/api/v1/recommendations/next-best-action', params) : Promise.resolve(null);

const getPricingRecommendations = (params) =>
  tryRez(getConfig()) ? callPost(REZ_INTEL_URL, '/api/v1/recommendations/pricing', params) : Promise.resolve(null);

const checkHealth = async () => {
  const cfg = getConfig();
  const [hojai, rez] = await Promise.all([
    tryHojai(cfg) ? callGet(HOJAI_INTEL_URL, '/api/health').then(r => !!r) : Promise.resolve(false),
    tryRez(cfg) ? callGet(REZ_INTEL_URL, '/api/v1/health').then(r => !!r) : Promise.resolve(false)
  ]);
  return { hojai, rez, mode: cfg.mode };
};

// Backwards-compat alias
const checkRezIntelHealth = async () => {
  const h = await checkHealth();
  return h.rez || h.hojai;
};

module.exports = {
  REZ_INTEL_URL,
  HOJAI_INTEL_URL,
  get INTEL_MODE() { return getConfig().mode; },
  get REZ_INTEL_ENABLED() { return getConfig().rezEnabled; },
  get HOJAI_INTEL_ENABLED() { return getConfig().hojaiEnabled; },
  enrichAgentContext,
  classifyIntent,
  getCustomerInsights,
  getMerchantInsights,
  predictRevenue,
  predictChurn,
  predictLtv,
  predictDemand,
  getProductRecommendations,
  getNextBestAction,
  getPricingRecommendations,
  checkHealth,
  checkRezIntelHealth
};