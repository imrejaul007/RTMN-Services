/**
 * BAM Integration Service
 * Port: 4510
 * Hire AI workers from BAM into your company
 */
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const PORT = 4510;
const app = express();
app.use(cors(), express.json());

// ── BAM Agent Catalog ───────────────────────────────────

const AGENT_CATALOG = [
  // Growth & Marketing
  { id: 'growth-specialist', name: 'Growth Specialist', category: 'marketing', salary: 400, model: 'claude-3-sonnet', skills: ['seo', 'ads', 'analytics', 'campaigns', 'content'], description: 'Full-growth AI agent for customer acquisition' },
  { id: 'content-writer', name: 'Content Writer', category: 'marketing', salary: 200, model: 'claude-3-haiku', skills: ['copywriting', 'seo', 'blogging', 'social'], description: 'Creates content at scale' },
  { id: 'social-media-agent', name: 'Social Media Agent', category: 'marketing', salary: 250, model: 'claude-3-haiku', skills: ['instagram', 'twitter', 'linkedin', 'reddit'], description: 'Manages all social channels' },

  // Operations
  { id: 'operations-manager', name: 'Operations Manager', category: 'ops', salary: 350, model: 'claude-3-sonnet', skills: ['process', 'optimization', 'metrics', 'reporting'], description: 'Runs day-to-day operations' },
  { id: 'customer-success-agent', name: 'Customer Success', category: 'ops', salary: 200, model: 'claude-3-haiku', skills: ['onboarding', 'engagement', 'retention', 'nps'], description: 'Keeps customers happy' },

  // Finance
  { id: 'finance-agent', name: 'Finance Agent', category: 'finance', salary: 300, model: 'claude-3-haiku', skills: ['invoicing', 'payouts', 'reporting', 'compliance'], description: 'Handles all financial operations' },
  { id: 'accountant-agent', name: 'Accountant Agent', category: 'finance', salary: 250, model: 'claude-3-haiku', skills: [' bookkeeping', 'gst', 'reconciliation'], description: 'Accounting and compliance' },

  // Legal
  { id: 'legal-agent', name: 'Legal Agent', category: 'legal', salary: 300, model: 'claude-3-haiku', skills: ['contracts', 'compliance', 'terms', 'privacy'], description: 'Legal and compliance tasks' },

  // Domain-specific
  { id: 'insurance-specialist', name: 'Insurance Specialist', category: 'mobility', salary: 250, model: 'claude-3-haiku', skills: ['verification', 'claims', 'coverage'], description: 'Verifies driver insurance' },
  { id: 'pricing-expert', name: 'Pricing Expert', category: 'mobility', salary: 350, model: 'claude-3-sonnet', skills: ['dynamic-pricing', 'surge', 'demand-forecast'], description: 'Optimizes pricing strategy' },
  { id: 'dispatch-specialist', name: 'Dispatch Specialist', category: 'mobility', salary: 250, model: 'claude-3-haiku', skills: ['matching', 'routing', 'optimization'], description: 'Optimizes driver-passenger matching' },

  // Healthcare
  { id: 'diagnostics-assistant', name: 'Diagnostics Assistant', category: 'healthcare', salary: 500, model: 'claude-3-sonnet', skills: ['triage', 'symptom-check', 'appointment'], description: 'AI-powered patient triage' },
  { id: 'pharmacy-agent', name: 'Pharmacy Agent', category: 'healthcare', salary: 200, model: 'claude-3-haiku', skills: ['prescriptions', 'interactions', 'refills'], description: 'Manages pharmacy operations' },

  // Education
  { id: 'tutor-agent', name: 'AI Tutor', category: 'education', salary: 350, model: 'claude-3-sonnet', skills: ['adaptive-learning', 'assessment', 'feedback'], description: 'Personalized AI tutoring' },
  { id: 'curriculum-agent', name: 'Curriculum Agent', category: 'education', salary: 400, model: 'claude-3-sonnet', skills: ['course-design', 'outcomes', 'assessment'], description: 'Creates courses and curricula' },
];

// ── Hired Agents ────────────────────────────────────────

const hiredAgents = new Map(); // companyId -> [hired agents]
const companies = new Map(); // companyId -> company

// ── Routes ─────────────────────────────────────────────

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'bam-integration', version: '1.0.0' }));

app.get('/api/v1', (_, res) => res.json({
  service: 'BAM Integration',
  version: '1.0.0',
  tagline: 'Hire AI workers from the marketplace'
}));

app.get('/api/v1/catalog', (req, res) => {
  const { category, skill } = req.query;
  let agents = AGENT_CATALOG;
  if (category) agents = agents.filter(a => a.category === category);
  if (skill) agents = agents.filter(a => a.skills.includes(skill));
  res.json({ success: true, count: agents.length, agents });
});

app.get('/api/v1/catalog/:id', (req, res) => {
  const agent = AGENT_CATALOG.find(a => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json({ success: true, agent });
});

app.get('/api/v1/categories', (_, res) => {
  const categories = [...new Set(AGENT_CATALOG.map(a => a.category))];
  res.json({ success: true, categories });
});

// Hire an agent
app.post('/api/v1/hire', (req, res) => {
  const { companyId, agentId, config } = req.body;
  if (!companyId || !agentId) {
    return res.status(400).json({ error: 'companyId and agentId required' });
  }

  const agentDef = AGENT_CATALOG.find(a => a.id === agentId);
  if (!agentDef) {
    return res.status(404).json({ error: 'Agent not in catalog' });
  }

  // Create company if not exists
  if (!companies.has(companyId)) {
    companies.set(companyId, { id: companyId, name: `Company ${companyId.slice(0, 8)}`, hiredAgents: [] });
  }

  // Create hired agent instance
  const hiredAgent = {
    id: uuidv4(),
    agentId,
    name: agentDef.name,
    salary: agentDef.salary,
    model: agentDef.model,
    skills: agentDef.skills,
    config: config || {},
    status: 'active',
    hiredAt: new Date().toISOString(),
    tasks: 0,
    performance: []
  };

  // Add to company's hired agents
  if (!hiredAgents.has(companyId)) hiredAgents.set(companyId, []);
  hiredAgents.get(companyId).push(hiredAgent);

  res.status(201).json({
    success: true,
    agent: hiredAgent,
    message: `${agentDef.name} hired for $${agentDef.salary}/month`
  });
});

// List company agents
app.get('/api/v1/company/:companyId/agents', (req, res) => {
  const agents = hiredAgents.get(req.params.companyId) || [];
  res.json({
    success: true,
    count: agents.length,
    totalSalary: agents.reduce((s, a) => s + a.salary, 0),
    agents
  });
});

// Fire agent
app.delete('/api/v1/company/:companyId/agents/:agentInstanceId', (req, res) => {
  const { companyId, agentInstanceId } = req.params;
  const agents = hiredAgents.get(companyId) || [];
  const index = agents.findIndex(a => a.id === agentInstanceId);
  if (index === -1) return res.status(404).json({ error: 'Agent not found' });

  agents.splice(index, 1);
  res.json({ success: true, message: 'Agent fired' });
});

// Assign task to agent
app.post('/api/v1/company/:companyId/agents/:agentInstanceId/tasks', (req, res) => {
  const { companyId, agentInstanceId } = req.params;
  const { task, input } = req.body;
  if (!task) return res.status(400).json({ error: 'task required' });

  const agents = hiredAgents.get(companyId) || [];
  const agent = agents.find(a => a.id === agentInstanceId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  // Simulate task execution
  const result = {
    taskId: uuidv4(),
    agent: agent.name,
    task,
    status: 'completed',
    output: `Task "${task}" executed by ${agent.name}`,
    executedAt: new Date().toISOString()
  };

  agent.tasks++;
  agent.performance.push(result);

  res.json({ success: true, result });
});

app.listen(PORT, () => console.log(`
╔══════════════════════════════════════════╗
║  BAM Integration — PORT ${PORT}            ║
║  Hire AI workers from BAM              ║
╠══════════════════════════════════════╣
║  POST /api/v1/hire — Hire agent       ║
║  GET  /api/v1/catalog — Browse agents ║
║  POST /api/v1/company/:id/tasks — Assign task ║
╚══════════════════════════════════════╝
`));

export default app;
