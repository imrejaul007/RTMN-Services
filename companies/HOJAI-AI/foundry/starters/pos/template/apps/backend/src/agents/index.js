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

function CashierStrategy(body = {}) {
  return { agent: "Cashier", received: body, message: 'Stub response (no LLM in v0). Replace the strategy with a real @hojai/sutar BaseAgent or LLM call.' };
}

function InventoryStrategy(body = {}) {
  return { agent: "Inventory", received: body, message: 'Stub response (no LLM in v0). Replace the strategy with a real @hojai/sutar BaseAgent or LLM call.' };
}

function FinanceStrategy(body = {}) {
  return { agent: "Finance", received: body, message: 'Stub response (no LLM in v0). Replace the strategy with a real @hojai/sutar BaseAgent or LLM call.' };
}


const registry = createAgentRegistry();

registry.register(new BaseAgent({
  name: "CEO",
  type: 'merchant',
  industry: 'unknown',
  description: "Orchestrator. Daily takings, basket size.",
  capabilities: [],
  strategy: CEOStrategy
}));

registry.register(new BaseAgent({
  name: "Cashier",
  type: 'merchant',
  industry: 'unknown',
  description: "Barcode scan, totals, change, receipt.",
  capabilities: [],
  strategy: CashierStrategy
}));

registry.register(new BaseAgent({
  name: "Inventory",
  type: 'merchant',
  industry: 'unknown',
  description: "Reorder alerts, shrinkage, expiry tracking.",
  capabilities: [],
  strategy: InventoryStrategy
}));

registry.register(new BaseAgent({
  name: "Finance",
  type: 'merchant',
  industry: 'unknown',
  description: "Daily reconciliation, GST split, payouts.",
  capabilities: [],
  strategy: FinanceStrategy
}));


export function listAgents() {
  return registry.list().map(({ name, description }) => ({ name, description }));
}

export async function runAgent(name, body) {
  return registry.run(name, body || {});
}
