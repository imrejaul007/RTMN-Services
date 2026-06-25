/**
 * SUTAR agent registry for Logistics Test.
 *
 * Each agent is a pure function. v0 returns deterministic stub responses
 * so the app runs end-to-end without an LLM. Replace the body of each
 * with a real `@hojai/sutar` BaseAgent when you're ready.
 */

const AGENTS = [
  { name: "CEO", description: "Orchestrator. Fleet utilisation, on-time delivery rate.", run: CEORun },
  { name: "Dispatch", description: "Shipment assignment, route planning, capacity matching.", run: DispatchRun },
  { name: "Fleet", description: "Vehicle health, maintenance schedule, driver hours.", run: FleetRun },
  { name: "Customer", description: "Shipment status, ETA notifications, POD.", run: CustomerRun },
  { name: "Finance", description: "COD reconciliation, fuel costs, driver payouts.", run: FinanceRun }
];

function CEORun(body = {}) {
  return { agent: "CEO", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function DispatchRun(body = {}) {
  return { agent: "Dispatch", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function FleetRun(body = {}) {
  return { agent: "Fleet", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function CustomerRun(body = {}) {
  return { agent: "Customer", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
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
