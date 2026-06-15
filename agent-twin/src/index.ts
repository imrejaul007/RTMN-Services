import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { v4 as uuidv4 } from 'uuid';

const app: FastifyInstance = Fastify({ logger: true });

// Register plugins
await app.register(cors);
await app.register(swagger, {
  openapi: {
    info: { title: 'Agent Twin API', version: '1.0.0' },
  },
});
await app.register(swaggerUi);

// In-memory stores
const agents = new Map();
const activities = new Map();
const performances = new Map();

// Initialize sample data
function initSampleData() {
  const sampleAgents = [
    { id: 'a1', name: 'Sales Agent Alpha', role: 'sales', status: 'active', karma: 95 },
    { id: 'a2', name: 'Support Agent Beta', role: 'support', status: 'active', karma: 88 },
    { id: 'a3', name: 'Admin Agent Gamma', role: 'admin', status: 'active', karma: 100 },
  ];
  sampleAgents.forEach(a => agents.set(a.id, { ...a, createdAt: new Date().toISOString() }));
}

// Health check
app.get('/health', async () => ({ status: 'healthy', service: 'agent-twin', version: '1.0.0' });

// List agents
app.get('/api/agents', async (req, res) => {
  const { role, status } = req.query as { role?: string; status?: string };
  let result = Array.from(agents.values());
  if (role) result = result.filter((a: any) => a.role === role);
  if (status) result = result.filter((a: any) => a.status === status);
  return { success: true, count: result.length, agents: result };
});

// Get agent
app.get('/api/agents/:id', async (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.code(404).send({ success: false, error: 'Agent not found' });
  return { success: true, agent };
});

// Create agent
app.post('/api/agents', async (req, res) => {
  const { name, role, capabilities } = req.body;
  if (!name || !role) return res.code(400).send({ success: false, error: 'Name and role required' });

  const agent = {
    id: uuidv4(),
    name,
    role,
    capabilities: capabilities || [],
    status: 'active',
    karma: 50,
    createdAt: new Date().toISOString(),
  };
  agents.set(agent.id, agent);
  return res.code(201).send({ success: true, agent });
});

// Update agent
app.put('/api/agents/:id', async (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.code(404).send({ success: false, error: 'Agent not found' });
  const updated = { ...agent, ...req.body, id: agent.id };
  agents.set(agent.id, updated);
  return { success: true, agent: updated };
});

// Delete agent
app.delete('/api/agents/:id', async (req, res) => {
  if (!agents.has(req.params.id)) return res.code(404).send({ success: false, error: 'Agent not found' });
  agents.delete(req.params.id);
  return { success: true, message: 'Agent deleted' };
});

// Activities
app.post('/api/activities', async (req, res) => {
  const { agentId, action, metadata } = req.body;
  if (!agentId || !action) return res.code(400).send({ success: false, error: 'agentId and action required' });

  const activity = {
    id: uuidv4(),
    agentId,
    action,
    metadata: metadata || {},
    timestamp: new Date().toISOString(),
  };
  activities.set(activity.id, activity);
  return res.code(201).send({ success: true, activity });
});

app.get('/api/activities', async (req, res) => {
  const { agentId } = req.query as { agentId?: string };
  let result = Array.from(activities.values());
  if (agentId) result = result.filter((a: any) => a.agentId === agentId);
  return { success: true, count: result.length, activities: result };
});

// Performance
app.get('/api/performance/:agentId', async (req, res) => {
  const agent = agents.get(req.params.agentId);
  if (!agent) return res.code(404).send({ success: false, error: 'Agent not found' });

  const agentActivities = Array.from(activities.values()).filter((a: any) => a.agentId === req.params.agentId);
  return {
    success: true,
    performance: {
      agentId: req.params.agentId,
      karma: (agent as any).karma,
      totalActions: agentActivities.length,
      recentActions: agentActivities.slice(-10),
    },
  };
});

// Start
initSampleData();
const start = async () => {
  try {
    await app.listen({ port: 3011 });
    console.log('🤖 Agent Twin running on port 3011');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();

export default app;
