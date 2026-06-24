// REZ Intelligence Client for SUTAR Decision Engine
// Pattern: same as merchant-agents + 7 agents + 7 copilots
// REZ Intel (port 5370) provides: agent context enrichment, intent classification, next-best-action
const REZ_INTEL_URL = process.env.REZ_INTEL_URL || 'http://localhost:5370';
const REZ_INTEL_TIMEOUT = parseInt(process.env.REZ_INTEL_TIMEOUT_MS || '3000');
const REZ_INTEL_ENABLED = process.env.REZ_INTEL_ENABLED !== 'false';

async function callREZIntel(endpoint: string, body: any): Promise<any> {
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
    const json: any = await res.json();
    return json.success ? json.data : null;
  } catch (err) { return null; }
}

const enrichAgentContext = (params: any) => callREZIntel('/api/v1/agent/enrich', params);
const classifyIntent = (params: any) => callREZIntel('/api/v1/intent/classify', params);
const getNextBestAction = (params: any) => callREZIntel('/api/v1/recommendations/next-best-action', params);
const checkRezIntelHealth = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${REZ_INTEL_URL}/api/v1/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch { return false; }
};

export { REZ_INTEL_URL, REZ_INTEL_ENABLED, enrichAgentContext, classifyIntent, getNextBestAction, checkRezIntelHealth };