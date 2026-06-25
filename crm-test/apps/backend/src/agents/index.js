/**
 * SUTAR agent registry for Crm Test.
 *
 * Each agent is a pure function. v0 returns deterministic stub responses
 * so the app runs end-to-end without an LLM. Replace the body of each
 * with a real `@hojai/sutar` BaseAgent when you're ready.
 */

const AGENTS = [
  { name: "CEO", description: "Orchestrator. Pipeline coverage, win rate.", run: CEORun },
  { name: "Sales", description: "Lead scoring, next-best-action, follow-up drafting.", run: SalesRun },
  { name: "Support", description: "Customer health, ticket triage, renewal alerts.", run: SupportRun },
  { name: "Marketing", description: "Lead source attribution, campaign → revenue.", run: MarketingRun }
];

function CEORun(body = {}) {
  return { agent: "CEO", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function SalesRun(body = {}) {
  return { agent: "Sales", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function SupportRun(body = {}) {
  return { agent: "Support", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function MarketingRun(body = {}) {
  return { agent: "Marketing", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}


export function listAgents() {
  return AGENTS.map(({ name, description }) => ({ name, description }));
}

export async function runAgent(name, body) {
  const agent = AGENTS.find(a => a.name === name);
  if (!agent) throw new Error(`unknown agent: ${name}`);
  return agent.run(body || {});
}
