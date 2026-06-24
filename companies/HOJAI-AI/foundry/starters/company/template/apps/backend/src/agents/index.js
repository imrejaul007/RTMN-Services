/**
 * SUTAR agent registry for {{PROJECT_TITLE}}.
 *
 * Each agent is a pure function. v0 returns deterministic stub responses
 * so the app runs end-to-end without an LLM. Replace the body of each
 * with a real `@hojai/sutar` BaseAgent when you're ready.
 */

const AGENTS = [
  { name: "CEO", description: "Orchestrator. Strategic decision support, KPI tracking.", run: CEORun },
  { name: "Sales", description: "Sales coaching, deal inspection, forecast.", run: SalesRun },
  { name: "Marketing", description: "Campaign planning, audience insights.", run: MarketingRun },
  { name: "HR", description: "Hiring screen, leave approval, performance reviews.", run: HRRun },
  { name: "Finance", description: "Budget alerts, expense policy, financial summaries.", run: FinanceRun },
  { name: "Operations", description: "Process bottlenecks, resource allocation.", run: OperationsRun }
];

function CEORun(body = {}) {
  return { agent: "CEO", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function SalesRun(body = {}) {
  return { agent: "Sales", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function MarketingRun(body = {}) {
  return { agent: "Marketing", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function HRRun(body = {}) {
  return { agent: "HR", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function FinanceRun(body = {}) {
  return { agent: "Finance", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function OperationsRun(body = {}) {
  return { agent: "Operations", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}


export function listAgents() {
  return AGENTS.map(({ name, description }) => ({ name, description }));
}

export async function runAgent(name, body) {
  const agent = AGENTS.find(a => a.name === name);
  if (!agent) throw new Error(`unknown agent: ${name}`);
  return agent.run(body || {});
}
