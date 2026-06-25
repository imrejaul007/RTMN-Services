/**
 * SUTAR agent registry for {{PROJECT_TITLE}}.
 *
 * Each agent is a `BaseAgent` instance from our local runtime
 * (`../runtime/BaseAgent.js`). The runtime runs in two modes:
 *
 *   • **local mode** — runs the deterministic `strategy` function.
 *     This is the default and lets the app boot end-to-end without any
 *     external service. It is what you see right now.
 *
 *   • **remote mode** — when `HOJAI_SUTAR_URL` and `HOJAI_API_KEY`
 *     are set in the environment, every `run()` call is forwarded
 *     to the SUTAR merchant-agents service. No code change needed.
 *
 * The shape returned is normalized:
 *
 *   { agent: 'Sales', output: {...}, success: true, latencyMs: 4, source: 'local' }
 *
 * To upgrade an agent to use the real `@hojai/sutar` SDK or an LLM,
 * replace its `strategy` function. The registry and HTTP routes stay
 * the same.
 */

import { BaseAgent, createAgentRegistry } from '../runtime/BaseAgent.js';

function CEOStrategy(body = {}) {
  return { agent: "CEO", received: body, message: 'Stub response (no LLM in v0). Replace the strategy with a real @hojai/sutar BaseAgent or LLM call.' };
}

function ReceptionStrategy(body = {}) {
  return { agent: "Reception", received: body, message: 'Stub response (no LLM in v0). Replace the strategy with a real @hojai/sutar BaseAgent or LLM call.' };
}

function HousekeepingStrategy(body = {}) {
  return { agent: "Housekeeping", received: body, message: 'Stub response (no LLM in v0). Replace the strategy with a real @hojai/sutar BaseAgent or LLM call.' };
}

function RevenueStrategy(body = {}) {
  return { agent: "Revenue", received: body, message: 'Stub response (no LLM in v0). Replace the strategy with a real @hojai/sutar BaseAgent or LLM call.' };
}

function SupportStrategy(body = {}) {
  return { agent: "Support", received: body, message: 'Stub response (no LLM in v0). Replace the strategy with a real @hojai/sutar BaseAgent or LLM call.' };
}


const registry = createAgentRegistry();

registry.register(new BaseAgent({
  name: "CEO",
  type: 'merchant',
  industry: 'unknown',
  description: "Orchestrator. Revenue + occupancy KPIs.",
  capabilities: [],
  strategy: CEOStrategy
}));

registry.register(new BaseAgent({
  name: "Reception",
  type: 'merchant',
  industry: 'unknown',
  description: "Check-in / check-out, room assignment, upsell.",
  capabilities: [],
  strategy: ReceptionStrategy
}));

registry.register(new BaseAgent({
  name: "Housekeeping",
  type: 'merchant',
  industry: 'unknown',
  description: "Room status, cleaning schedule, maintenance tickets.",
  capabilities: [],
  strategy: HousekeepingStrategy
}));

registry.register(new BaseAgent({
  name: "Revenue",
  type: 'merchant',
  industry: 'unknown',
  description: "Dynamic pricing, occupancy forecast, channel mix.",
  capabilities: [],
  strategy: RevenueStrategy
}));

registry.register(new BaseAgent({
  name: "Support",
  type: 'merchant',
  industry: 'unknown',
  description: "Guest requests, complaints, concierge.",
  capabilities: [],
  strategy: SupportStrategy
}));


export function listAgents() {
  return registry.list().map(({ name, description }) => ({ name, description }));
}

export async function runAgent(name, body) {
  return registry.run(name, body || {});
}
