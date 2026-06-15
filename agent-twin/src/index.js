const Fastify = require('fastify');
const cors = require('@fastify/cors');
const swagger = require('@fastify/swagger');
const swaggerUi = require('@fastify/swagger-ui');
const { v4: uuidv4 } = require('uuid');

const app = Fastify({ logger: true });

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

// Register plugins and start
async function start() {
  try {
    await app.register(cors);
    await app.register(swagger, {
      openapi: {
        info: { title: 'Agent Twin API', version: '1.0.0' },
      },
    });
    await app.register(swaggerUi);

    // Health check
    app.get('/health', async () => ({ status: 'healthy', service: 'agent-twin', version: '1.0.0' }));

    // List agents
    app.get('/api/agents', async (req, res) => {
      const { role, status } = req.query;
      let result = Array.from(agents.values());
      if (role) result = result.filter(a => a.role === role);
      if (status) result = result.filter(a => a.status === status);
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
      const { agentId } = req.query;
      let result = Array.from(activities.values());
      if (agentId) result = result.filter(a => a.agentId === agentId);
      return { success: true, count: result.length, activities: result };
    });

    // Performance
    app.get('/api/performance/:agentId', async (req, res) => {
      const agent = agents.get(req.params.agentId);
      if (!agent) return res.code(404).send({ success: false, error: 'Agent not found' });

      const agentActivities = Array.from(activities.values()).filter(a => a.agentId === req.params.agentId);
      return {
        success: true,
        performance: {
          agentId: req.params.agentId,
          karma: agent.karma,
          totalActions: agentActivities.length,
          recentActions: agentActivities.slice(-10),
        },
      };
    });

    initSampleData();
    await 
// ============= AUTH + DATABASE =============
const authBusinesses = new Map();
const authUsers = new Map();
const authSessions = new Map();
const crypto = require('crypto');

let mongoose = null;
let dbConnected = false;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const SERVICE_NAME = process.env.SERVICE_NAME || 'service';

async function initDatabase() {
  if (!MONGODB_URI) {
    console.log('⚠️  MONGODB_URI not set. Running in demo mode (in-memory).');
    return;
  }
  try {
    mongoose = (await import('mongoose')).default;
    await mongoose.connect(MONGODB_URI);
    dbConnected = true;
    console.log('✅ MongoDB connected for', SERVICE_NAME);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
  }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

app.post('/auth/register', (req, res) => {
  const { businessId, email, password, role, businessName } = req.body;
  if (!email || !password || !businessId) {
    return res.status(400).json({ error: 'businessId, email, password required' });
  }
  if (authUsers.has(email)) {
    return res.status(409).json({ error: 'User already exists' });
  }
  const user = {
    id: 'user_' + Date.now(),
    businessId,
    email,
    passwordHash: hashPassword(password),
    role: role || 'owner',
    name: businessName || email.split('@')[0],
    createdAt: new Date().toISOString()
  };
  authUsers.set(email, user);
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email: user.email, businessId: user.businessId, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.get('/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  res.json({ valid: true, ...session });
});

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  req.session = session;
  next();
}

// ============= END AUTH + DATABASE =============

app.listen({ port: 3011, host: '0.0.0.0' });
    console.log('🤖 Agent Twin running on port 3011');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

module.exports = app;
