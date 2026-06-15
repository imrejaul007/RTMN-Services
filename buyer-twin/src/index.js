const Fastify = require('fastify');
const cors = require('@fastify/cors');
const { v4: uuidv4 } = require('uuid');

const app = Fastify({ logger: true });

// Stores
const buyers = new Map();
const preferences = new Map();
const history = new Map();

function initSampleData() {
  const sampleBuyers = [
    { id: 'b1', name: 'John Buyer', budget: 500000, type: 'individual', status: 'active' },
    { id: 'b2', name: 'Acme Corp', budget: 2000000, type: 'corporate', status: 'active' },
  ];
  sampleBuyers.forEach(b => buyers.set(b.id, { ...b, createdAt: new Date().toISOString() }));
}

async function start() {
  try {
    await app.register(cors);

    app.get('/health', async () => ({ status: 'healthy', service: 'buyer-twin', version: '1.0.0' }));

    // Buyers
    app.get('/api/buyers', async (req, res) => {
      const { type, status, minBudget } = req.query;
      let result = Array.from(buyers.values());
      if (type) result = result.filter(b => b.type === type);
      if (status) result = result.filter(b => b.status === status);
      if (minBudget) result = result.filter(b => b.budget >= parseFloat(minBudget));
      return { success: true, count: result.length, buyers: result };
    });

    app.get('/api/buyers/:id', async (req, res) => {
      const buyer = buyers.get(req.params.id);
      if (!buyer) return res.code(404).send({ success: false, error: 'Buyer not found' });
      return { success: true, buyer };
    });

    app.post('/api/buyers', async (req, res) => {
      const { name, type, budget, contact, requirements } = req.body;
      if (!name) return res.code(400).send({ success: false, error: 'Name required' });
      const buyer = { id: uuidv4(), name, type: type || 'individual', budget: budget || 0, contact: contact || {}, requirements: requirements || {}, status: 'active', createdAt: new Date().toISOString() };
      buyers.set(buyer.id, buyer);
      return res.code(201).send({ success: true, buyer });
    });

    app.put('/api/buyers/:id', async (req, res) => {
      const buyer = buyers.get(req.params.id);
      if (!buyer) return res.code(404).send({ success: false, error: 'Buyer not found' });
      const updated = { ...buyer, ...req.body, id: buyer.id };
      buyers.set(buyer.id, updated);
      return { success: true, buyer: updated };
    });

    app.delete('/api/buyers/:id', async (req, res) => {
      if (!buyers.has(req.params.id)) return res.code(404).send({ success: false, error: 'Buyer not found' });
      buyers.delete(req.params.id);
      return { success: true, message: 'Buyer deleted' };
    });

    // Preferences
    app.get('/api/buyers/:id/preferences', async (req, res) => {
      const prefs = Array.from(preferences.values()).filter(p => p.buyerId === req.params.id);
      return { success: true, preferences: prefs };
    });

    app.post('/api/preferences', async (req, res) => {
      const { buyerId, type, value } = req.body;
      if (!buyerId || !type) return res.code(400).send({ success: false, error: 'buyerId and type required' });
      const pref = { id: uuidv4(), buyerId, type, value, createdAt: new Date().toISOString() };
      preferences.set(pref.id, pref);
      return res.code(201).send({ success: true, preference: pref });
    });

    // History
    app.get('/api/buyers/:id/history', async (req, res) => {
      const hist = Array.from(history.values()).filter(h => h.buyerId === req.params.id);
      return { success: true, history: hist };
    });

    app.post('/api/history', async (req, res) => {
      const { buyerId, action, details } = req.body;
      if (!buyerId || !action) return res.code(400).send({ success: false, error: 'buyerId and action required' });
      const entry = { id: uuidv4(), buyerId, action, details: details || {}, timestamp: new Date().toISOString() };
      history.set(entry.id, entry);
      return res.code(201).send({ success: true, history: entry });
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

app.listen({ port: 3013, host: '0.0.0.0' });
    console.log('💼 Buyer Twin running on port 3013');
  } catch (err) { app.log.error(err); process.exit(1); }
}

start();

module.exports = app;
