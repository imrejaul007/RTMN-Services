const Fastify = require('fastify');
const cors = require('@fastify/cors');
const { v4: uuidv4 } = require('uuid');

const app = Fastify({ logger: true });

// Stores
const deals = new Map();
const stages = new Map();
const activities = new Map();

const defaultStages = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
defaultStages.forEach(s => stages.set(s, { id: s, name: s.replace('_', ' '), count: 0 }));

function initSampleData() {
  const sampleDeals = [
    { id: 'd1', title: 'Enterprise Deal A', value: 100000, stage: 'qualified', probability: 50 },
    { id: 'd2', title: 'SMB Deal B', value: 25000, stage: 'proposal', probability: 75 },
  ];
  sampleDeals.forEach(d => deals.set(d.id, { ...d, createdAt: new Date().toISOString() }));
}

async function start() {
  try {
    await app.register(cors);

    app.get('/health', async () => ({ status: 'healthy', service: 'deal-twin', version: '1.0.0' }));

    // Deals
    app.get('/api/deals', async (req, res) => {
      const { stage, minValue } = req.query;
      let result = Array.from(deals.values());
      if (stage) result = result.filter(d => d.stage === stage);
      if (minValue) result = result.filter(d => d.value >= parseFloat(minValue));
      return { success: true, count: result.length, deals: result };
    });

    app.get('/api/deals/:id', async (req, res) => {
      const deal = deals.get(req.params.id);
      if (!deal) return res.code(404).send({ success: false, error: 'Deal not found' });
      return { success: true, deal };
    });

    app.post('/api/deals', async (req, res) => {
      const { title, value, stage, probability, customerId } = req.body;
      if (!title || value === undefined) return res.code(400).send({ success: false, error: 'Title and value required' });
      const deal = { id: uuidv4(), title, value, stage: stage || 'lead', probability: probability || 10, customerId: customerId || null, createdAt: new Date().toISOString() };
      deals.set(deal.id, deal);
      return res.code(201).send({ success: true, deal });
    });

    app.put('/api/deals/:id', async (req, res) => {
      const deal = deals.get(req.params.id);
      if (!deal) return res.code(404).send({ success: false, error: 'Deal not found' });
      const updated = { ...deal, ...req.body, id: deal.id };
      deals.set(deal.id, updated);
      return { success: true, deal: updated };
    });

    app.patch('/api/deals/:id/stage', async (req, res) => {
      const deal = deals.get(req.params.id);
      if (!deal) return res.code(404).send({ success: false, error: 'Deal not found' });
      const { stage, probability } = req.body;
      if (stage) deal.stage = stage;
      if (probability !== undefined) deal.probability = probability;
      deal.updatedAt = new Date().toISOString();
      deals.set(deal.id, deal);
      return { success: true, deal };
    });

    app.delete('/api/deals/:id', async (req, res) => {
      if (!deals.has(req.params.id)) return res.code(404).send({ success: false, error: 'Deal not found' });
      deals.delete(req.params.id);
      return { success: true, message: 'Deal deleted' };
    });

    // Stages
    app.get('/api/stages', async () => ({ success: true, stages: Array.from(stages.values()) }));

    // Analytics
    app.get('/api/analytics', async () => {
      const allDeals = Array.from(deals.values());
      const totalValue = allDeals.reduce((sum, d) => sum + d.value, 0);
      const weightedValue = allDeals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0);
      return { success: true, analytics: { totalDeals: allDeals.length, totalValue, weightedValue, byStage: Object.fromEntries(stages) } };
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

app.listen({ port: 3014, host: '0.0.0.0' });
    console.log('📊 Deal Twin running on port 3014');
  } catch (err) { app.log.error(err); process.exit(1); }
}

start();

module.exports = app;
