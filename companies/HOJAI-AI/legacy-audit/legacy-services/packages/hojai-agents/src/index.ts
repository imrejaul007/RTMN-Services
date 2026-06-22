import express from 'express';
import mongoose from 'mongoose';
import { agentService } from './services/agentService.js';
import { AgentType, AgentStatus } from './types/index.js';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4550;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-agents';

// Health
app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'hojai-agents' }));

// Agent CRUD
app.post('/api/agents', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const agent = await agentService.createAgent({ ...req.body, tenantId });
  res.status(201).json({ success: true, data: agent });
});

app.get('/api/agents', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const agents = await agentService.listAgents(tenantId, req.query.type as AgentType);
  res.json({ success: true, data: agents });
});

app.get('/api/agents/:id', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const agent = await agentService.getAgent(tenantId, req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, data: agent });
});

app.patch('/api/agents/:id', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const agent = await agentService.updateAgent(tenantId, req.params.id, req.body);
  res.json({ success: true, data: agent });
});

app.delete('/api/agents/:id', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  await agentService.deleteAgent(tenantId, req.params.id);
  res.json({ success: true });
});

// Run agent
app.post('/api/agents/:id/run', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  try {
    const run = await agentService.runAgent({
      tenantId,
      agentId: req.params.id,
      input: req.body.input || {},
      trigger: 'api'
    });
    res.status(201).json({ success: true, data: run });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Run history
app.get('/api/agents/:id/runs', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const runs = await agentService.getRunHistory(tenantId, req.params.id);
  res.json({ success: true, data: runs });
});

// Insights
app.get('/api/insights', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const insights = await agentService.getInsights(tenantId, {
    agentId: req.query.agentId as string,
    severity: req.query.severity as string,
    status: req.query.status as string
  });
  res.json({ success: true, data: insights });
});

app.post('/api/insights/:id/acknowledge', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  await agentService.acknowledgeInsight(tenantId, req.params.id, req.body.acknowledgedBy);
  res.json({ success: true });
});

async function start() {
  await mongoose.connect(MONGODB_URI);
  app.listen(PORT, () => console.log(`[Hojai Agents] Running on port ${PORT}`));
}

start().catch(console.error);
export default app;
