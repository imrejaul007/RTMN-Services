/**
 * SUTAR agent registry for Hotel Test.
 *
 * Each agent is a pure function. v0 returns deterministic stub responses
 * so the app runs end-to-end without an LLM. Replace the body of each
 * with a real `@hojai/sutar` BaseAgent when you're ready.
 */

const AGENTS = [
  { name: "CEO", description: "Orchestrator. Revenue + occupancy KPIs.", run: CEORun },
  { name: "Reception", description: "Check-in / check-out, room assignment, upsell.", run: ReceptionRun },
  { name: "Housekeeping", description: "Room status, cleaning schedule, maintenance tickets.", run: HousekeepingRun },
  { name: "Revenue", description: "Dynamic pricing, occupancy forecast, channel mix.", run: RevenueRun },
  { name: "Support", description: "Guest requests, complaints, concierge.", run: SupportRun }
];

function CEORun(body = {}) {
  return { agent: "CEO", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function ReceptionRun(body = {}) {
  return { agent: "Reception", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function HousekeepingRun(body = {}) {
  return { agent: "Housekeeping", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function RevenueRun(body = {}) {
  return { agent: "Revenue", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function SupportRun(body = {}) {
  return { agent: "Support", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}


export function listAgents() {
  return AGENTS.map(({ name, description }) => ({ name, description }));
}

export async function runAgent(name, body) {
  const agent = AGENTS.find(a => a.name === name);
  if (!agent) throw new Error(`unknown agent: ${name}`);
  return agent.run(body || {});
}
