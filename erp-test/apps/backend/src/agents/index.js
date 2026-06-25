/**
 * SUTAR agent registry for Erp Test.
 *
 * Each agent is a pure function. v0 returns deterministic stub responses
 * so the app runs end-to-end without an LLM. Replace the body of each
 * with a real `@hojai/sutar` BaseAgent when you're ready.
 */

const AGENTS = [
  { name: "CEO", description: "Orchestrator. Working capital, EBITDA, runway.", run: CEORun },
  { name: "Procurement", description: "Reorder suggestions, supplier scoring, RFQ drafting.", run: ProcurementRun },
  { name: "Finance", description: "GL postings, AR/AP ageing, cashflow forecast.", run: FinanceRun },
  { name: "Operations", description: "Production schedule, capacity, wastage.", run: OperationsRun },
  { name: "HR", description: "Headcount planning, payroll, leave policy.", run: HRRun }
];

function CEORun(body = {}) {
  return { agent: "CEO", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function ProcurementRun(body = {}) {
  return { agent: "Procurement", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function FinanceRun(body = {}) {
  return { agent: "Finance", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function OperationsRun(body = {}) {
  return { agent: "Operations", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function HRRun(body = {}) {
  return { agent: "HR", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}


export function listAgents() {
  return AGENTS.map(({ name, description }) => ({ name, description }));
}

export async function runAgent(name, body) {
  const agent = AGENTS.find(a => a.name === name);
  if (!agent) throw new Error(`unknown agent: ${name}`);
  return agent.run(body || {});
}
