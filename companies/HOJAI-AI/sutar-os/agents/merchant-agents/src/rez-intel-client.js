/**
 * REZ Intelligence Client
 *
 * Wires merchant-agents to the REZ Intelligence Integration service (port 5370).
 * Every merchant agent decision is enriched with real-time business intelligence
 * (merchant insights, customer insights, predictions, recommendations, intent).
 *
 * Setup: REZ_INTEL_URL env var (default http://localhost:5370)
 */

const REZ_INTEL_URL = process.env.REZ_INTEL_URL || 'http://localhost:5370';
const REZ_INTEL_TIMEOUT = parseInt(process.env.REZ_INTEL_TIMEOUT_MS || '3000');
const REZ_INTEL_ENABLED = process.env.REZ_INTEL_ENABLED !== 'false'; // on by default

/**
 * Call the REZ Intelligence /api/v1/agent/enrich endpoint
 * Returns null if service unavailable (graceful degradation)
 */
async function enrichAgentContext({ agentRole, userId, companyId, query, context }) {
  if (!REZ_INTEL_ENABLED) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REZ_INTEL_TIMEOUT);
    const res = await fetch(`${REZ_INTEL_URL}/api/v1/agent/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentRole, userId, companyId, query, context }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[rez-intel] enrichment unavailable: ${err.message}`);
    }
    return null;
  }
}

async function getMerchantInsights({ merchantId, timeRange }) {
  if (!REZ_INTEL_ENABLED) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REZ_INTEL_TIMEOUT);
    const res = await fetch(`${REZ_INTEL_URL}/api/v1/insights/merchant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId, timeRange: timeRange || '30d' }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    return null;
  }
}

async function getCustomerInsights({ merchantId, customerId, timeRange }) {
  if (!REZ_INTEL_ENABLED) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REZ_INTEL_TIMEOUT);
    const res = await fetch(`${REZ_INTEL_URL}/api/v1/insights/customer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId, customerId, timeRange: timeRange || '90d' }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    return null;
  }
}

async function predictRevenue({ merchantId, timeRange, segment }) {
  if (!REZ_INTEL_ENABLED) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REZ_INTEL_TIMEOUT);
    const res = await fetch(`${REZ_INTEL_URL}/api/v1/predictions/revenue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId, timeRange: timeRange || '30d', segment }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    return null;
  }
}

async function getProductRecommendations({ merchantId, customerId, context }) {
  if (!REZ_INTEL_ENABLED) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REZ_INTEL_TIMEOUT);
    const res = await fetch(`${REZ_INTEL_URL}/api/v1/recommendations/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId, customerId, context }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    return null;
  }
}

async function getNextBestAction({ merchantId, customerId }) {
  if (!REZ_INTEL_ENABLED) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REZ_INTEL_TIMEOUT);
    const res = await fetch(`${REZ_INTEL_URL}/api/v1/recommendations/next-best-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId, customerId, agentRole: 'merchant-agent' }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    return null;
  }
}

async function getPricingRecommendations({ merchantId, productId, customerSegment }) {
  if (!REZ_INTEL_ENABLED) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REZ_INTEL_TIMEOUT);
    const res = await fetch(`${REZ_INTEL_URL}/api/v1/recommendations/pricing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId, productId, customerSegment }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    return null;
  }
}

async function checkRezIntelHealth() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${REZ_INTEL_URL}/api/v1/health`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    return res.ok;
  } catch (err) {
    return false;
  }
}

module.exports = {
  REZ_INTEL_URL,
  REZ_INTEL_ENABLED,
  enrichAgentContext,
  getMerchantInsights,
  getCustomerInsights,
  predictRevenue,
  getProductRecommendations,
  getNextBestAction,
  getPricingRecommendations,
  checkRezIntelHealth
};
