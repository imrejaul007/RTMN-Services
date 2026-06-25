/**
 * Dual-client intelligence helper (ESM version)
 *
 * Mirrors `./dual-client.cjs` for ESM consumers. See that file for full docs.
 *
 * Backend mapping (same as CJS version):
 *   HOJAI Intelligence (4881)  - core AI agents (intent, sentiment, retrieval)
 *   REZ Intelligence   (5370)  - business intelligence (predictions, recommendations)
 *
 * INTEL_MODE env var: 'hojai' | 'rez' | 'dual' (default)
 */

const REZ_INTEL_URL = process.env.REZ_INTEL_URL || 'http://localhost:5370';
const HOJAI_INTEL_URL = process.env.HOJAI_INTEL_URL || 'http://localhost:4881';

function getConfig() {
  return {
    mode: (process.env.INTEL_MODE || 'dual').toLowerCase(),
    rezEnabled: process.env.REZ_INTEL_ENABLED !== 'false',
    hojaiEnabled: process.env.HOJAI_INTEL_ENABLED !== 'false',
    timeoutMs: parseInt(process.env.INTEL_TIMEOUT_MS || process.env.REZ_INTEL_TIMEOUT_MS || '3000')
  };
}

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
    if (json && json.success === true) return json.data;
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

export const enrichAgentContext = (params) => {
  if (!tryRez(getConfig())) return Promise.resolve(null);
  return callPost(REZ_INTEL_URL, '/api/v1/agent/enrich', params);
};

export const classifyIntent = (params) => {
  const cfg = getConfig();
  if (!tryHojai(cfg) && !tryRez(cfg)) return Promise.resolve(null);
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

export const getCustomerInsights = (customerIdOrParams) => {
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

export const getMerchantInsights = (params) =>
  tryRez(getConfig()) ? callPost(REZ_INTEL_URL, '/api/v1/insights/merchant', params) : Promise.resolve(null);

export const predictRevenue = (params) =>
  tryRez(getConfig()) ? callPost(REZ_INTEL_URL, '/api/v1/predictions/revenue', params) : Promise.resolve(null);

export const predictChurn = (params) =>
  tryRez(getConfig()) ? callPost(REZ_INTEL_URL, '/api/v1/predictions/churn', params) : Promise.resolve(null);

export const predictLtv = (params) =>
  tryRez(getConfig()) ? callPost(REZ_INTEL_URL, '/api/v1/predictions/ltv', params) : Promise.resolve(null);

export const predictDemand = (params) =>
  tryRez(getConfig()) ? callPost(REZ_INTEL_URL, '/api/v1/predictions/demand', params) : Promise.resolve(null);

export const getProductRecommendations = (params) =>
  tryRez(getConfig()) ? callPost(REZ_INTEL_URL, '/api/v1/recommendations/products', params) : Promise.resolve(null);

export const getNextBestAction = (params) =>
  tryRez(getConfig()) ? callPost(REZ_INTEL_URL, '/api/v1/recommendations/next-best-action', params) : Promise.resolve(null);

export const getPricingRecommendations = (params) =>
  tryRez(getConfig()) ? callPost(REZ_INTEL_URL, '/api/v1/recommendations/pricing', params) : Promise.resolve(null);

export const checkHealth = async () => {
  const cfg = getConfig();
  const [hojai, rez] = await Promise.all([
    tryHojai(cfg) ? callGet(HOJAI_INTEL_URL, '/api/health').then(r => !!r) : Promise.resolve(false),
    tryRez(cfg) ? callGet(REZ_INTEL_URL, '/api/v1/health').then(r => !!r) : Promise.resolve(false)
  ]);
  return { hojai, rez, mode: cfg.mode };
};

export const checkRezIntelHealth = async () => {
  const h = await checkHealth();
  return h.rez || h.hojai;
};

export { REZ_INTEL_URL, HOJAI_INTEL_URL };

export default {
  REZ_INTEL_URL,
  HOJAI_INTEL_URL,
  INTEL_MODE: getConfig().mode,
  REZ_INTEL_ENABLED: getConfig().rezEnabled,
  HOJAI_INTEL_ENABLED: getConfig().hojaiEnabled,
  enrichAgentContext, classifyIntent, getCustomerInsights, getMerchantInsights,
  predictRevenue, predictChurn, predictLtv, predictDemand,
  getProductRecommendations, getNextBestAction, getPricingRecommendations,
  checkHealth, checkRezIntelHealth
};