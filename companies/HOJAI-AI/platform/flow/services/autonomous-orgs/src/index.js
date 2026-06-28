/**
 * FlowOS Autonomous Organizations
 * Self-managing workflow organizations
 * Port: 5364
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 5364;
app.use(cors());
app.use(express.json());

const storage = {
  organizations: new Map(),
  workflows: new Map(),
  agents: new Map()
};

app.get('/health', (_, res) => res.json({
  status: 'ok',
  service: 'autonomous-orgs',
  port: PORT,
  organizations: storage.organizations.size
}));

// Create organization
app.post('/api/orgs', (req, res) => {
  const { name, type = 'default', settings = {} } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });

  const org = {
    id: 'org_' + crypto.randomUUID().slice(0, 8),
    name, type, settings,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  storage.organizations.set(org.id, org);
  res.status(201).json(org);
});

// Get organization
app.get('/api/orgs/:id', (req, res) => {
  const org = storage.organizations.get(req.params.id);
  if (!org) return res.status(404).json({ error: 'Not found' });
  res.json(org);
});

// Register workflow
app.post('/api/workflows', (req, res) => {
  const { orgId, name, definition } = req.body || {};
  if (!orgId || !name) return res.status(400).json({ error: 'orgId and name required' });

  const workflow = {
    id: 'wf_' + crypto.randomUUID().slice(0, 8),
    orgId, name, definition,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  storage.workflows.set(workflow.id, workflow);
  res.status(201).json(workflow);
});

// Get org workflows
app.get('/api/orgs/:id/workflows', (req, res) => {
  const workflows = Array.from(storage.workflows.values())
    .filter(w => w.orgId === req.params.id);
  res.json({ count: workflows.length, workflows });
});

// Register agent
app.post('/api/agents', (req, res) => {
  const { orgId, name, capabilities = [] } = req.body || {};
  if (!orgId || !name) return res.status(400).json({ error: 'orgId and name required' });

  const agent = {
    id: 'agent_' + crypto.randomUUID().slice(0, 8),
    orgId, name, capabilities,
    status: 'online',
    createdAt: new Date().toISOString()
  };
  storage.agents.set(agent.id, agent);
  res.status(201).json(agent);
});

// Get org agents
app.get('/api/orgs/:id/agents', (req, res) => {
  const agents = Array.from(storage.agents.values())
    .filter(a => a.orgId === req.params.id);
  res.json({ count: agents.length, agents });
});

// Self-heal: reassign workflow
app.post('/api/workflows/:id/reassign', (req, res) => {
  const { fromAgentId, toAgentId } = req.body || {};
  const workflow = storage.workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Not found' });

  workflow.lastAssigned = { from: fromAgentId, to: toAgentId, at: new Date().toISOString() };
  res.json(workflow);
});

// Budget enforcement
app.post('/api/orgs/:id/enforce-budget', (req, res) => {
  const org = storage.organizations.get(req.params.id);
  if (!org) return res.status(404).json({ error: 'Not found' });

  const { action = 'pause' } = req.body || {};
  org.settings.budgetAction = action;
  org.settings.lastEnforcement = new Date().toISOString();
  res.json({ enforced: true, action, org });
});

app.get('/ready', (_, res) => res.json({ ready: true }));
app.listen(PORT, () => console.log(`[autonomous-orgs] :${PORT}`));
export { app };
