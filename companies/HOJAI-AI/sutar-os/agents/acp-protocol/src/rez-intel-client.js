// REZ Intelligence Client for ACP Protocol
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
  } catch (err) { return null; }
}

const enrichAgentContext = (params) => callREZIntel('/api/v1/agent/enrich', params);
const classifyIntent = (params) => callREZIntel('/api/v1/intent/classify', params);
const getNextBestAction = (params) => callREZIntel('/api/v1/recommendations/next-best-action', params);
const checkRezIntelHealth = async () => {
  try {
    const res = await fetch(`${REZ_INTEL_URL}/api/v1/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch { return false; }
};

module.exports = { REZ_INTEL_URL, REZ_INTEL_ENABLED, enrichAgentContext, classifyIntent, getNextBestAction, checkRezIntelHealth };