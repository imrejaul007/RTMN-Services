/**
 * Financial OS
 * Port: 5220
 * Industry: financial
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5220;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());


// ============= AUTH + DATABASE =============
const authBusinesses = new Map();
const authUsers = new Map();
const authSessions = new Map();
const crypto = require('crypto');

let mongoose = null;
let dbConnected = false;
const MONGODB_URI = process.env.MONGODB_URI;
const CRM_HUB_URL = process.env.CRM_HUB_URL || 'http://localhost:4056';
const SERVICE_NAME = process.env.SERVICE_NAME || 'Financial OS';

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

async function syncCustomerToCRM(customer, businessId) {
  if (!dbConnected) return;
  try {
    await fetch(`${CRM_HUB_URL}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        industry: 'financial',
        businessId,
        loyaltyPoints: customer.loyaltyPoints || 0,
        tier: customer.tier || 'bronze',
      }),
    });
  } catch (err) {
    console.warn('CRM sync failed:', err.message);
  }
}

// ============= END AUTH + DATABASE =============

// ============= FINANCIAL OS DATA =============
const accounts = new Map();
const transactions = new Map();
const budgets = new Map();
const customers = new Map();

// ============= END DATA =============

// ============= TWINS =============
const accountTwin = new Map();
const transactionTwin = new Map();
const budgetTwin = new Map();

// ============= END TWINS =============

// ============= API ROUTES =============

app.get('/api/accounts', (req, res) => {
  res.json({ accounts: Array.from(accounts.values()) });
});

app.post('/api/accounts', requireAuth, (req, res) => {
  const account = { id: 'account_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  accounts.set(account.id, account);
  res.json(account);
});

app.get('/api/accounts/:id', (req, res) => {
  const account = accounts.get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Not found' });
  res.json(account);
});

app.put('/api/accounts/:id', requireAuth, (req, res) => {
  const account = accounts.get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Not found' });
  if (account.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  accounts.set(req.params.id, { ...account, ...req.body });
  res.json(accounts.get(req.params.id));
});

app.delete('/api/accounts/:id', requireAuth, (req, res) => {
  const account = accounts.get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Not found' });
  if (account.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  accounts.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/tranactionss', (req, res) => {
  res.json({ tranactionss: Array.from(tranactionss.values()) });
});

app.post('/api/tranactionss', requireAuth, (req, res) => {
  const tranactions = { id: 'tranactions_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  tranactionss.set(tranactions.id, tranactions);
  res.json(tranactions);
});

app.get('/api/tranactionss/:id', (req, res) => {
  const tranactions = tranactionss.get(req.params.id);
  if (!tranactions) return res.status(404).json({ error: 'Not found' });
  res.json(tranactions);
});

app.put('/api/tranactionss/:id', requireAuth, (req, res) => {
  const tranactions = tranactionss.get(req.params.id);
  if (!tranactions) return res.status(404).json({ error: 'Not found' });
  if (tranactions.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  tranactionss.set(req.params.id, { ...tranactions, ...req.body });
  res.json(tranactionss.get(req.params.id));
});

app.delete('/api/tranactionss/:id', requireAuth, (req, res) => {
  const tranactions = tranactionss.get(req.params.id);
  if (!tranactions) return res.status(404).json({ error: 'Not found' });
  if (tranactions.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  tranactionss.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/budgets', (req, res) => {
  res.json({ budgets: Array.from(budgets.values()) });
});

app.post('/api/budgets', requireAuth, (req, res) => {
  const budget = { id: 'budget_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  budgets.set(budget.id, budget);
  res.json(budget);
});

app.get('/api/budgets/:id', (req, res) => {
  const budget = budgets.get(req.params.id);
  if (!budget) return res.status(404).json({ error: 'Not found' });
  res.json(budget);
});

app.put('/api/budgets/:id', requireAuth, (req, res) => {
  const budget = budgets.get(req.params.id);
  if (!budget) return res.status(404).json({ error: 'Not found' });
  if (budget.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  budgets.set(req.params.id, { ...budget, ...req.body });
  res.json(budgets.get(req.params.id));
});

app.delete('/api/budgets/:id', requireAuth, (req, res) => {
  const budget = budgets.get(req.params.id);
  if (!budget) return res.status(404).json({ error: 'Not found' });
  if (budget.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  budgets.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/cutomerss', (req, res) => {
  res.json({ cutomerss: Array.from(cutomerss.values()) });
});

app.post('/api/cutomerss', requireAuth, (req, res) => {
  const cutomers = { id: 'cutomers_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  cutomerss.set(cutomers.id, cutomers);
  res.json(cutomers);
});

app.get('/api/cutomerss/:id', (req, res) => {
  const cutomers = cutomerss.get(req.params.id);
  if (!cutomers) return res.status(404).json({ error: 'Not found' });
  res.json(cutomers);
});

app.put('/api/cutomerss/:id', requireAuth, (req, res) => {
  const cutomers = cutomerss.get(req.params.id);
  if (!cutomers) return res.status(404).json({ error: 'Not found' });
  if (cutomers.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  cutomerss.set(req.params.id, { ...cutomers, ...req.body });
  res.json(cutomerss.get(req.params.id));
});

app.delete('/api/cutomerss/:id', requireAuth, (req, res) => {
  const cutomers = cutomerss.get(req.params.id);
  if (!cutomers) return res.status(404).json({ error: 'Not found' });
  if (cutomers.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  cutomerss.delete(req.params.id);
  res.json({ success: true });
});


// Analytics
app.get('/api/analytics', (req, res) => {
  res.json({
    accountCount: accounts.size, tranactionsCount: tranactionss.size, budgetCount: budgets.size, cutomersCount: cutomerss.size
  });
});

// Twins sync
app.post('/api/twins/sync', requireAuth, (req, res) => {
  const twinData = { account: Array.from(accountTwin.values()), transaction: Array.from(transactionTwin.values()), budget: Array.from(budgetTwin.values()) };
  res.json({ success: true, synced: twinData });
});

// ============= END ROUTES =============

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});

// Start server
initDatabase().catch(console.warn);
app.listen(PORT, () => console.log(`✅ Financial OS running on port ${PORT}`));

