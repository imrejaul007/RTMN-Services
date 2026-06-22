#!/usr/bin/env node
/**
 * Seed AgentOS with the 23 specialized Genie services as named agents.
 * Run with: node infrastructure/seed/seed-agents.js
 */

import { createToken } from '@rtmn/shared/auth';

const INTERNAL = process.env.INTERNAL_SERVICE_TOKEN || 'hojai-internal-service-token-change-me';
const AGENTOS_URL = process.env.AGENTOS_URL || 'http://localhost:7300';

// Pre-mint a Bearer token so the seed caller satisfies the requireAuth()
// middleware (in addition to the x-internal-token for reqI()).
const BEARER = createToken({
  userId: 'seed-agentos',
  businessId: 'genie-os-bootstrap',
  industry: 'genie',
  role: 'owner',
});

const AGENTS = [
  { name: 'Shopping Agent',     type: 'personal', runtime: 'genie',  metadata: { specialty: 'autonomous-shopping', service: 'genie-shopping-agent',     port: 4728 } },
  { name: 'Briefing Agent',     type: 'personal', runtime: 'genie',  metadata: { specialty: 'daily-briefings',      service: 'genie-briefing-service',   port: 4712 } },
  { name: 'Calendar Agent',     type: 'personal', runtime: 'genie',  metadata: { specialty: 'scheduling',           service: 'genie-calendar-service',   port: 4709 } },
  { name: 'Companion Agent',    type: 'personal', runtime: 'genie',  metadata: { specialty: 'emotional-support',    service: 'genie-companion-service',  port: 4716 } },
  { name: 'Memory Agent',       type: 'personal', runtime: 'genie',  metadata: { specialty: 'memory-capture',       service: 'genie-memory-inbox',       port: 4711 } },
  { name: 'Money Agent',        type: 'personal', runtime: 'genie',  metadata: { specialty: 'personal-finance',    service: 'genie-money-os',           port: 4715 } },
  { name: 'Wellness Agent',     type: 'personal', runtime: 'genie',  metadata: { specialty: 'health-tracking',      service: 'genie-wellness-os',        port: 4717 } },
  { name: 'Learning Agent',     type: 'personal', runtime: 'genie',  metadata: { specialty: 'education',            service: 'genie-learning-os',        port: 4722 } },
  { name: 'Relationship Agent', type: 'personal', runtime: 'genie',  metadata: { specialty: 'relationships',        service: 'genie-relationship-os',    port: 4720 } },
  { name: 'Consultant Agent',   type: 'business', runtime: 'genie',  metadata: { specialty: 'domain-consulting',    service: 'genie-consultant-agent',   port: 4718 } },
  { name: 'Creator Agent',      type: 'business', runtime: 'genie',  metadata: { specialty: 'content-creation',     service: 'genie-creation-os',        port: 4724 } },
  { name: 'Execution Agent',    type: 'business', runtime: 'genie',  metadata: { specialty: 'task-automation',      service: 'genie-execution-engine',   port: 4725 } },
  { name: 'Research Agent',     type: 'business', runtime: 'genie',  metadata: { specialty: 'deep-reasoning',       service: 'genie-thinking-engine',    port: 4719 } },
  { name: 'Life GPS Agent',     type: 'personal', runtime: 'genie',  metadata: { specialty: 'life-guidance',        service: 'genie-life-gps',           port: 4723 } },
  { name: 'University Agent',   type: 'personal', runtime: 'genie',  metadata: { specialty: 'courses',              service: 'genie-life-university',    port: 4726 } },
  { name: 'Search Agent',       type: 'system',   runtime: 'genie',  metadata: { specialty: 'universal-search',     service: 'genie-universal-search',   port: 4727 } },
  { name: 'Serendipity Agent',  type: 'system',   runtime: 'genie',  metadata: { specialty: 'memory-resurfacing',   service: 'genie-serendipity-service', port: 4730 } },
  { name: 'Smart Forgetting Agent', type: 'system', runtime: 'genie', metadata: { specialty: 'auto-archive',      service: 'genie-smart-forgetting-service', port: 4735 } },
  { name: 'Wake Word Agent',    type: 'system',   runtime: 'genie',  metadata: { specialty: 'voice-detection',      service: 'genie-wake-word-service',  port: 4767 } },
  { name: 'Listening Modes Agent', type: 'system', runtime: 'genie', metadata: { specialty: 'voice-modes',         service: 'genie-listening-modes',    port: 4768 } },
  { name: 'Device Agent',       type: 'system',   runtime: 'genie',  metadata: { specialty: 'multi-device',         service: 'genie-device-integration', port: 4769 } },
  { name: 'Gateway Agent',      type: 'system',   runtime: 'genie',  metadata: { specialty: 'orchestration',        service: 'genie-gateway',            port: 4701 } },
  { name: 'Memory Graph Agent', type: 'system',   runtime: 'genie',  metadata: { specialty: 'knowledge-graph',      service: 'genie-memory-graph',       port: 4717 } },
];

async function call(url, method, body) {
  const r = await fetch(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-internal-token': INTERNAL,
      authorization: `Bearer ${BEARER}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await r.json(); } catch { data = { success: false, error: `non-JSON response (status ${r.status})` }; }
  return data;
}

async function main() {
  console.log(`\n🤖 Seeding AgentOS at ${AGENTOS_URL} with ${AGENTS.length} named agents...\n`);

  let created = 0, failed = 0;

  for (const agent of AGENTS) {
    try {
      const res = await call(`${AGENTOS_URL}/api/agents`, 'POST', agent);
      if (res.success) {
        console.log(`  ✅ ${agent.name.padEnd(30)} → ${res.data.agentId} (${agent.runtime})`);
        created++;
      } else {
        console.log(`  ❌ ${agent.name.padEnd(30)} → ${res.error?.message || 'unknown'}`);
        failed++;
      }
    } catch (e) {
      console.log(`  ❌ ${agent.name.padEnd(30)} → ${e.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Done: ${created} created, ${failed} failed\n`);

  // List all agents to verify
  const list = await call(`${AGENTOS_URL}/api/agents?runtime=genie`, 'GET');
  if (list.success) {
    console.log(`Total Genie-runtime agents in AgentOS: ${list.data.count}\n`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
