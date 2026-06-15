/**
 * Fashion OS
 * Port: 5095
 * Industry: fashion
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5095;

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
const SERVICE_NAME = process.env.SERVICE_NAME || 'Fashion OS';

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
        industry: 'fashion',
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

// ============= FASHION OS DATA =============
const products = new Map();
const collections = new Map();
const orders = new Map();
const customers = new Map();

// ============= END DATA =============

// ============= TWINS =============
const productTwin = new Map();
const collectionTwin = new Map();
const customerTwin = new Map();

// ============= END TWINS =============

// ============= API ROUTES =============

app.get('/api/products', (req, res) => {
  res.json({ products: Array.from(products.values()) });
});

app.post('/api/products', requireAuth, (req, res) => {
  const product = { id: 'product_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  products.set(product.id, product);
  res.json(product);
});

app.get('/api/products/:id', (req, res) => {
  const product = products.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json(product);
});

app.put('/api/products/:id', requireAuth, (req, res) => {
  const product = products.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  if (product.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  products.set(req.params.id, { ...product, ...req.body });
  res.json(products.get(req.params.id));
});

app.delete('/api/products/:id', requireAuth, (req, res) => {
  const product = products.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  if (product.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  products.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/collections', (req, res) => {
  res.json({ collections: Array.from(collections.values()) });
});

app.post('/api/collections', requireAuth, (req, res) => {
  const collection = { id: 'collection_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  collections.set(collection.id, collection);
  res.json(collection);
});

app.get('/api/collections/:id', (req, res) => {
  const collection = collections.get(req.params.id);
  if (!collection) return res.status(404).json({ error: 'Not found' });
  res.json(collection);
});

app.put('/api/collections/:id', requireAuth, (req, res) => {
  const collection = collections.get(req.params.id);
  if (!collection) return res.status(404).json({ error: 'Not found' });
  if (collection.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  collections.set(req.params.id, { ...collection, ...req.body });
  res.json(collections.get(req.params.id));
});

app.delete('/api/collections/:id', requireAuth, (req, res) => {
  const collection = collections.get(req.params.id);
  if (!collection) return res.status(404).json({ error: 'Not found' });
  if (collection.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  collections.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/orders', (req, res) => {
  res.json({ orders: Array.from(orders.values()) });
});

app.post('/api/orders', requireAuth, (req, res) => {
  const order = { id: 'order_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  orders.set(order.id, order);
  res.json(order);
});

app.get('/api/orders/:id', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});

app.put('/api/orders/:id', requireAuth, (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  if (order.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  orders.set(req.params.id, { ...order, ...req.body });
  res.json(orders.get(req.params.id));
});

app.delete('/api/orders/:id', requireAuth, (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  if (order.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  orders.delete(req.params.id);
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
    productCount: products.size, collectionCount: collections.size, orderCount: orders.size, cutomersCount: cutomerss.size
  });
});

// Twins sync
app.post('/api/twins/sync', requireAuth, (req, res) => {
  const twinData = { product: Array.from(productTwin.values()), collection: Array.from(collectionTwin.values()), customer: Array.from(customerTwin.values()) };
  res.json({ success: true, synced: twinData });
});

// ============= END ROUTES =============

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});

// Start server
initDatabase().catch(console.warn);
app.listen(PORT, () => console.log(`✅ Fashion OS running on port ${PORT}`));

