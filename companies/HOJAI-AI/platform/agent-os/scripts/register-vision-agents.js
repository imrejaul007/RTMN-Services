#!/usr/bin/env node
/**
 * Register the 13 HOJAI Vision Genie Agents in AgentOS.
 *
 * Per .claude/plans/global-nexha-addendum.md and the Genie vision doc,
 * HOJAI has 13 named AI Employees (the "vision agents"). They all exist as
 * standalone services in companies/HOJAI-AI/products/genie/ but were never
 * registered as named templates in AgentOS (port 7300).
 *
 * This script reads the AI Employee Registry (port 5500), filters for
 * vision-genie agents, and registers each one in AgentOS via POST /api/agents.
 *
 * Usage:
 *   AGENT_REGISTRY_URL=http://localhost:5500 \
 *   AGENTOS_URL=http://localhost:7300 \
 *   node scripts/register-vision-agents.js
 *
 * Idempotent — re-running won't duplicate (checks for existing agent by name).
 */

const https = require('http');
const { URL } = require('url');

const REGISTRY_URL = process.env.AGENT_REGISTRY_URL || 'http://localhost:5500';
const AGENTOS_URL = process.env.AGENTOS_URL || 'http://localhost:7300';
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || process.env.INTERNAL_SERVICE_TOKEN || '';

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOpts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(HOJAI_API_KEY ? { Authorization: `Bearer ${HOJAI_API_KEY}` } : {}),
        ...(options.headers || {})
      }
    };
    const req = https.request(reqOpts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        } catch (err) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchVisionAgents() {
  const url = `${REGISTRY_URL}/api/v1/vision-agents`;
  const res = await fetchJson(url);
  if (res.status !== 200) {
    throw new Error(`Registry returned ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body.data?.visionAgents || [];
}

async function fetchAgentOSAgents() {
  const url = `${AGENTOS_URL}/api/agents`;
  const res = await fetchJson(url);
  if (res.status !== 200) {
    return [];
  }
  return res.body?.agents || res.body?.data?.agents || [];
}

async function registerAgent(visionAgent) {
  // Map registry vision-agent to AgentOS agent shape
  const agentPayload = {
    id: `vision_${visionAgent.visionRole}`,
    name: visionAgent.name,
    type: 'personal',
    description: visionAgent.description,
    version: visionAgent.version || '1.0.0',
    capabilities: visionAgent.capabilities || [],
    tags: ['vision-genie', 'genie-vision', ...(visionAgent.tags || [])],
    endpoints: visionAgent.serviceUrl ? {
      primary: {
        url: visionAgent.serviceUrl,
        protocol: 'http',
        healthCheck: `${visionAgent.serviceUrl}/health`
      }
    } : {},
    metadata: {
      visionRole: visionAgent.visionRole,
      registrySlug: visionAgent.slug,
      registryId: visionAgent.id,
      port: visionAgent.port
    },
    pricing: visionAgent.pricing,
    health: visionAgent.serviceUrl ? 'unknown' : 'unregistered',
    status: visionAgent.serviceUrl ? 'active' : 'planned'
  };

  const res = await fetchJson(`${AGENTOS_URL}/api/agents`, {
    method: 'POST',
    body: agentPayload
  });

  return { visionAgent, status: res.status, body: res.body };
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Register HOJAI Vision Genie Agents in AgentOS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Registry:  ${REGISTRY_URL}`);
  console.log(`AgentOS:   ${AGENTOS_URL}`);
  console.log('');

  // 1. Fetch all vision agents from registry
  console.log('1. Fetching vision agents from registry...');
  let visionAgents;
  try {
    visionAgents = await fetchVisionAgents();
  } catch (err) {
    console.error(`   ✗ Failed to reach registry: ${err.message}`);
    console.error('   Make sure the AI Employee Registry is running on port 5500.');
    process.exit(1);
  }
  console.log(`   Found ${visionAgents.length} vision agents.`);

  // 2. Fetch existing agents from AgentOS to detect duplicates
  console.log('2. Fetching existing AgentOS agents for dedup...');
  const existingAgents = await fetchAgentOSAgents();
  const existingNames = new Set(existingAgents.map((a) => a.name));
  console.log(`   AgentOS has ${existingAgents.length} agents already.`);

  // 3. Register each missing agent
  console.log('3. Registering missing vision agents...');
  console.log('');
  const results = [];
  for (const visionAgent of visionAgents) {
    if (existingNames.has(visionAgent.name)) {
      console.log(`   ⊘ ${visionAgent.name.padEnd(28)} — already registered, skipping`);
      results.push({ visionAgent, status: 'skipped', reason: 'already-exists' });
      continue;
    }
    try {
      const { status, body } = await registerAgent(visionAgent);
      if (status === 201 || status === 200) {
        const icon = visionAgent.serviceUrl ? '✓' : '○';
        const note = visionAgent.serviceUrl ? '' : ' (planned — no service yet)';
        console.log(`   ${icon} ${visionAgent.name.padEnd(28)} — registered${note}`);
        results.push({ visionAgent, status: 'registered', agentOsId: body?.id || body?.agent?.id });
      } else {
        console.log(`   ✗ ${visionAgent.name.padEnd(28)} — failed: ${status} ${JSON.stringify(body)}`);
        results.push({ visionAgent, status: 'failed', error: body });
      }
    } catch (err) {
      console.log(`   ✗ ${visionAgent.name.padEnd(28)} — error: ${err.message}`);
      results.push({ visionAgent, status: 'error', error: err.message });
    }
    await sleep(50);
  }

  // 4. Summary
  const registered = results.filter((r) => r.status === 'registered').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const failed = results.filter((r) => r.status === 'failed' || r.status === 'error').length;

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Summary: ${registered} registered, ${skipped} skipped, ${failed} failed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});