/**
 * AgentOS sync — pulls agent registry from AgentOS at port 7300.
 *
 * When AGENTOS_URL is set, the registry enriches its data with live
 * agent registrations from AgentOS. This lets us answer
 * "what's actually deployed right now" vs "what's planned".
 *
 * Graceful: if AgentOS is unreachable, returns empty agents array.
 */

async function fetchFromAgentOS(baseUrl) {
  if (!baseUrl) {
    return { reachable: false, agents: [], message: 'AGENTOS_URL not set' };
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${baseUrl}/api/v1/agents?limit=500`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return { reachable: false, agents: [], message: `AgentOS returned ${res.status}` };
    }
    const json = await res.json();
    const agents = Array.isArray(json?.data?.agents) ? json.data.agents : [];
    return {
      reachable: true,
      agentosUrl: baseUrl,
      total: agents.length,
      agents: agents.map((a) => ({
        id: a.id,
        name: a.name || a.id,
        type: a.type,
        status: a.status,
        registeredAt: a.registeredAt || a.createdAt
      }))
    };
  } catch (err) {
    return {
      reachable: false,
      agentosUrl: baseUrl,
      agents: [],
      message: err.message
    };
  }
}

/**
 * Build a capability map: for each unique capability, list the employees
 * that provide it. Useful for "find me an AI that can do X" queries.
 */
function buildCapabilityMap(employees) {
  const map = new Map();
  for (const emp of employees) {
    if (!Array.isArray(emp.capabilities)) continue;
    for (const cap of emp.capabilities) {
      if (!map.has(cap)) map.set(cap, []);
      map.get(cap).push({
        id: emp.id,
        slug: emp.slug,
        name: emp.name,
        rating: emp.rating?.score || null,
        visionAgent: !!emp.visionAgent
      });
    }
  }
  // Convert to sorted array
  const out = [];
  for (const [capability, providers] of map.entries()) {
    out.push({
      capability,
      providerCount: providers.length,
      providers: providers.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    });
  }
  return out.sort((a, b) => a.capability.localeCompare(b.capability));
}

module.exports = { fetchFromAgentOS, buildCapabilityMap };