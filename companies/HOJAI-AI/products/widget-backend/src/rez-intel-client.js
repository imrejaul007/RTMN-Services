/**
 * REZ Intelligence client for the widget backend.
 *
 * Calls REZ Intelligence Integration service (port 5370) for:
 *  - enrichAgentContext (real-time agent enrichment)
 *  - classifyIntent (intent classification)
 *  - getNextBestAction (NBA recommendations)
 *  - getCustomerInsights (per-customer analytics)
 *
 * All calls are gracefully degraded — if REZ Intel is unavailable,
 * returns null and the caller falls back to local logic.
 */

const REZ_INTEL_URL = process.env.REZ_INTEL_URL || 'http://localhost:5370';
const REZ_INTEL_TIMEOUT = parseInt(process.env.REZ_INTEL_TIMEOUT_MS || '3000');
const REZ_INTEL_ENABLED = process.env.REZ_INTEL_ENABLED !== 'false';

async function callREZIntel(endpoint, body) {
  if (!REZ_INTEL_ENABLED) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REZ_INTEL_TIMEOUT);
    const res = await fetch(`${REZ_INTEL_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

const enrichAgentContext = (params) => callREZIntel('/api/v1/agent/enrich', params);
const classifyIntent = (params) => callREZIntel('/api/v1/intent/classify', params);
const getNextBestAction = (params) => callREZIntel('/api/v1/recommendations/next-best-action', params);
const getCustomerInsights = (params) => callREZIntel('/api/v1/insights/customer', params);
const getMerchantInsights = (params) => callREZIntel('/api/v1/insights/merchant', params);

async function checkRezIntelHealth() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${REZ_INTEL_URL}/api/v1/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

module.exports = {
  REZ_INTEL_URL,
  REZ_INTEL_ENABLED,
  enrichAgentContext,
  classifyIntent,
  getNextBestAction,
  getCustomerInsights,
  getMerchantInsights,
  checkRezIntelHealth
};
