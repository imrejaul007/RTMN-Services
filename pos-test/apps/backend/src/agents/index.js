/**
 * SUTAR agent registry for Pos Test.
 *
 * Each agent is a pure function. v0 returns deterministic stub responses
 * so the app runs end-to-end without an LLM. Replace the body of each
 * with a real `@hojai/sutar` BaseAgent when you're ready.
 */

const AGENTS = [
  { name: "CEO", description: "Orchestrator. Daily takings, basket size.", run: CEORun },
  { name: "Cashier", description: "Barcode scan, totals, change, receipt.", run: CashierRun },
  { name: "Inventory", description: "Reorder alerts, shrinkage, expiry tracking.", run: InventoryRun },
  { name: "Finance", description: "Daily reconciliation, GST split, payouts.", run: FinanceRun }
];

function CEORun(body = {}) {
  return { agent: "CEO", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function CashierRun(body = {}) {
  return { agent: "Cashier", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function InventoryRun(body = {}) {
  return { agent: "Inventory", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function FinanceRun(body = {}) {
  return { agent: "Finance", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}


export function listAgents() {
  return AGENTS.map(({ name, description }) => ({ name, description }));
}

export async function runAgent(name, body) {
  const agent = AGENTS.find(a => a.name === name);
  if (!agent) throw new Error(`unknown agent: ${name}`);
  return agent.run(body || {});
}
