/**
 * SUTAR agent registry for company-starter.
 *
 * 7 agents — CEO orchestrator + 6 Department OS agents. Each agent
 * is a pure function returning a deterministic stub response. v0 has
 * no LLM. Replace the body of any `*Run` function with a real
 * `@hojai/sutar` BaseAgent (and wire to @hojai/department for the
 * underlying API) to bring each department online.
 */

const AGENTS = [
  { name: 'CEO',         department: 'orchestration', description: 'Orchestrator. Routes work across departments and tracks KPIs.', run: ceoRun },
  { name: 'Sales',       department: 'sales',          description: 'CRM. Lead capture, qualification, pipeline, forecasting.',       run: salesRun },
  { name: 'Marketing',   department: 'marketing',      description: 'Brand, campaigns, audiences, content, SEO.',                     run: marketingRun },
  { name: 'HR',          department: 'workforce',      description: 'Recruiting, onboarding, performance, payroll.',                 run: hrRun },
  { name: 'Finance',     department: 'finance',        description: 'Chart of accounts, ledger, invoicing, AP/AR.',                  run: financeRun },
  { name: 'Operations',  department: 'operations',     description: 'Projects, processes, incidents, risks, SOPs.',                  run: operationsRun },
  { name: 'CXO',         department: 'cxo',            description: 'Executive KPIs, strategic pillars, board reports.',             run: cxoRun }
];

// ─── Agent run functions ────────────────────────────────────────────

function ceoRun({ goal, context }) {
  // Simple keyword routing — no LLM in v0.
  const goalText = String(goal || '').toLowerCase();
  let route = 'sales';
  if (/hire|recruit|onboard|review|performance/.test(goalText)) route = 'hr';
  else if (/invoice|payment|ledger|expense|tax/.test(goalText)) route = 'finance';
  else if (/campaign|launch|content|seo|brand|email/.test(goalText)) route = 'marketing';
  else if (/incident|outage|risk|process|project/.test(goalText)) route = 'operations';
  else if (/kpi|board|report|executive|strategy/.test(goalText)) route = 'cxo';
  return { agent: 'CEO', decision: `route:${route}`, confidence: 0.75, reasoning: `Picked ${route} based on goal keywords.`, context: context || null };
}

function salesRun({ intent, leadId, productId, quantity }) {
  if (intent === 'qualify-lead' && leadId) return { agent: 'Sales', action: 'qualify', leadId, score: 65, status: 'qualified', message: 'Lead qualified (stub).' };
  if (intent === 'create-deal') return { agent: 'Sales', action: 'create-deal', productId, quantity, dealId: `deal-${Date.now()}`, value: 5000, stage: 'prospecting', message: 'Deal created (stub).' };
  return { agent: 'Sales', intent, message: 'Sales intent received. Provide more specific intent.' };
}

function marketingRun({ intent, campaign, audience }) {
  if (intent === 'launch-campaign') return { agent: 'Marketing', action: 'launch', campaign, audience, reach: 12500, ctr: 0.034, message: 'Campaign launched (stub).' };
  if (intent === 'recommend') return { agent: 'Marketing', action: 'recommend', suggestions: ['Email nurture sequence', 'Retargeting ads', 'SEO content refresh'], message: 'Generated 3 marketing recommendations.' };
  return { agent: 'Marketing', intent, message: 'Marketing intent received.' };
}

function hrRun({ intent, role, skills }) {
  if (intent === 'recruit') return { agent: 'HR', action: 'recruit', role, skills: skills || [], candidatesFound: 12, topCandidate: { name: 'Alex', matchScore: 0.87 }, message: '12 candidates found (stub).' };
  if (intent === 'hire') return { agent: 'HR', action: 'hire', employeeId: `emp-${Date.now()}`, onboardTasks: 8, message: 'Onboarding initiated (stub).' };
  if (intent === 'review') return { agent: 'HR', action: 'review', rating: 4.2, strengths: ['shipping fast'], improvements: ['docs'], message: 'Performance review generated.' };
  return { agent: 'HR', intent, message: 'HR intent received.' };
}

function financeRun({ intent, amount, currency, fromAccount, toAccount }) {
  if (intent === 'transfer') return { agent: 'Finance', action: 'transfer', amount, currency: currency || 'USD', fromAccount, toAccount, txnId: `txn-${Date.now()}`, status: 'completed', message: 'Transfer completed (stub).' };
  if (intent === 'invoice') return { agent: 'Finance', action: 'invoice', invoiceId: `inv-${Date.now()}`, amount, currency: currency || 'USD', dueIn: '30d', message: 'Invoice created.' };
  if (intent === 'report') return { agent: 'Finance', action: 'report', period: 'last-30d', revenue: 42000, expenses: 31000, netIncome: 11000, message: 'Financial report generated.' };
  return { agent: 'Finance', intent, message: 'Finance intent received.' };
}

function operationsRun({ intent, severity, projectId }) {
  if (intent === 'report-incident') return { agent: 'Operations', action: 'report-incident', severity: severity || 'medium', incidentId: `inc-${Date.now()}`, assignedTo: 'ops-on-call', message: 'Incident reported and routed to on-call.' };
  if (intent === 'create-project') return { agent: 'Operations', action: 'create-project', projectId, owner: 'ops-bot', milestones: 5, message: 'Project created.' };
  if (intent === 'risk-scan') return { agent: 'Operations', action: 'risk-scan', risksFound: 3, topRisk: { title: 'Vendor concentration', score: 78 }, message: 'Risk scan complete.' };
  return { agent: 'Operations', intent, message: 'Operations intent received.' };
}

function cxoRun({ intent, period }) {
  if (intent === 'kpi-dashboard') return { agent: 'CXO', action: 'kpi-dashboard', period: period || 'last-30d', kpis: [
    { name: 'MRR',            value: 42000, unit: 'USD', trend: 'up',   health: 85 },
    { name: 'Active Customers', value: 248,  unit: 'count', trend: 'up',  health: 90 },
    { name: 'Churn Rate',      value: 3.2,   unit: '%',    trend: 'down', health: 78 },
    { name: 'NPS',            value: 47,    unit: 'score', trend: 'up',  health: 82 }
  ], message: 'Executive KPI dashboard.' };
  if (intent === 'board-report') return { agent: 'CXO', action: 'board-report', period: period || 'Q2-2026', highlights: { wins: ['+18% MRR', 'shipped widget'], concerns: ['rising infra costs'], asks: ['approve EU expansion'] }, message: 'Board report ready.' };
  return { agent: 'CXO', intent, message: 'CXO intent received.' };
}

// ─── Public API ─────────────────────────────────────────────────────

export function listAgents() {
  return AGENTS.map(({ name, department, description }) => ({ name, department, description }));
}

export async function runAgent(name, body) {
  const agent = AGENTS.find(a => a.name === name);
  if (!agent) throw new Error(`unknown agent: ${name}`);
  return agent.run(body || {});
}

/** Return a mapping of agent name → department id (Nexha capability) */
export function agentDepartments() {
  const map = {};
  for (const a of AGENTS) map[a.name] = a.department;
  return map;
}
