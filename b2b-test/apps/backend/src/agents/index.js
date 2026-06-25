/**
 * SUTAR agent registry for B2b Test.
 *
 * Each agent is a pure function. v0 returns deterministic stub responses
 * so the app runs end-to-end without an LLM. Replace the body of each
 * with a real `@hojai/sutar` BaseAgent when you're ready.
 */

const AGENTS = [
  { name: "CEO", description: "Orchestrator. Routes work across sales, procurement, finance, logistics.", run: CEORun },
  { name: "Sales", description: "RFQ → quote conversion, deal tracking.", run: SalesRun },
  { name: "Procurement", description: "Supplier discovery, RFQ broadcast, price negotiation.", run: ProcurementRun },
  { name: "Finance", description: "Trade finance, escrow, BNPL, payment reconciliation.", run: FinanceRun },
  { name: "Logistics", description: "Shipping quotes, customs, dispatch.", run: LogisticsRun },
  { name: "Support", description: "Buyer/seller tickets, dispute mediation.", run: SupportRun }
];

function CEORun(body = {}) {
  return { agent: "CEO", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function SalesRun(body = {}) {
  return { agent: "Sales", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function ProcurementRun(body = {}) {
  return { agent: "Procurement", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function FinanceRun(body = {}) {
  return { agent: "Finance", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
}

function LogisticsRun(body = {}) {
  return { agent: "Logistics", received: body, message: 'Stub response (no LLM in v0). Replace with a real @hojai/sutar BaseAgent.' };
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
