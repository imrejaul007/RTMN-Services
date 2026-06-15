/**
 * Agriculture OS
 * Port: 5070
 * Industry: agriculture
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5070;

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
const SERVICE_NAME = process.env.SERVICE_NAME || 'Agriculture OS';

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
        industry: 'agriculture',
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

// ============= AGRICULTURE OS DATA =============
const farms = new Map();
const crops = new Map();
const livestock = new Map();
const harvests = new Map();

// ============= END DATA =============

// ============= TWINS =============
const farmTwin = new Map();
const cropTwin = new Map();
const livestockTwin = new Map();

// ============= END TWINS =============

// ============= API ROUTES =============

app.get('/api/farms', (req, res) => {
  res.json({ farms: Array.from(farms.values()) });
});

app.post('/api/farms', requireAuth, (req, res) => {
  const farm = { id: 'farm_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  farms.set(farm.id, farm);
  res.json(farm);
});

app.get('/api/farms/:id', (req, res) => {
  const farm = farms.get(req.params.id);
  if (!farm) return res.status(404).json({ error: 'Not found' });
  res.json(farm);
});

app.put('/api/farms/:id', requireAuth, (req, res) => {
  const farm = farms.get(req.params.id);
  if (!farm) return res.status(404).json({ error: 'Not found' });
  if (farm.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  farms.set(req.params.id, { ...farm, ...req.body });
  res.json(farms.get(req.params.id));
});

app.delete('/api/farms/:id', requireAuth, (req, res) => {
  const farm = farms.get(req.params.id);
  if (!farm) return res.status(404).json({ error: 'Not found' });
  if (farm.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  farms.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/crops', (req, res) => {
  res.json({ crops: Array.from(crops.values()) });
});

app.post('/api/crops', requireAuth, (req, res) => {
  const crop = { id: 'crop_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  crops.set(crop.id, crop);
  res.json(crop);
});

app.get('/api/crops/:id', (req, res) => {
  const crop = crops.get(req.params.id);
  if (!crop) return res.status(404).json({ error: 'Not found' });
  res.json(crop);
});

app.put('/api/crops/:id', requireAuth, (req, res) => {
  const crop = crops.get(req.params.id);
  if (!crop) return res.status(404).json({ error: 'Not found' });
  if (crop.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  crops.set(req.params.id, { ...crop, ...req.body });
  res.json(crops.get(req.params.id));
});

app.delete('/api/crops/:id', requireAuth, (req, res) => {
  const crop = crops.get(req.params.id);
  if (!crop) return res.status(404).json({ error: 'Not found' });
  if (crop.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  crops.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/livetocks', (req, res) => {
  res.json({ livetocks: Array.from(livetocks.values()) });
});

app.post('/api/livetocks', requireAuth, (req, res) => {
  const livetock = { id: 'livetock_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  livetocks.set(livetock.id, livetock);
  res.json(livetock);
});

app.get('/api/livetocks/:id', (req, res) => {
  const livetock = livetocks.get(req.params.id);
  if (!livetock) return res.status(404).json({ error: 'Not found' });
  res.json(livetock);
});

app.put('/api/livetocks/:id', requireAuth, (req, res) => {
  const livetock = livetocks.get(req.params.id);
  if (!livetock) return res.status(404).json({ error: 'Not found' });
  if (livetock.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  livetocks.set(req.params.id, { ...livetock, ...req.body });
  res.json(livetocks.get(req.params.id));
});

app.delete('/api/livetocks/:id', requireAuth, (req, res) => {
  const livetock = livetocks.get(req.params.id);
  if (!livetock) return res.status(404).json({ error: 'Not found' });
  if (livetock.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  livetocks.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/harvetss', (req, res) => {
  res.json({ harvetss: Array.from(harvetss.values()) });
});

app.post('/api/harvetss', requireAuth, (req, res) => {
  const harvets = { id: 'harvets_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  harvetss.set(harvets.id, harvets);
  res.json(harvets);
});

app.get('/api/harvetss/:id', (req, res) => {
  const harvets = harvetss.get(req.params.id);
  if (!harvets) return res.status(404).json({ error: 'Not found' });
  res.json(harvets);
});

app.put('/api/harvetss/:id', requireAuth, (req, res) => {
  const harvets = harvetss.get(req.params.id);
  if (!harvets) return res.status(404).json({ error: 'Not found' });
  if (harvets.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  harvetss.set(req.params.id, { ...harvets, ...req.body });
  res.json(harvetss.get(req.params.id));
});

app.delete('/api/harvetss/:id', requireAuth, (req, res) => {
  const harvets = harvetss.get(req.params.id);
  if (!harvets) return res.status(404).json({ error: 'Not found' });
  if (harvets.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  harvetss.delete(req.params.id);
  res.json({ success: true });
});


// Analytics
app.get('/api/analytics', (req, res) => {
  res.json({
    farmCount: farms.size, cropCount: crops.size, livetockCount: livetocks.size, harvetsCount: harvetss.size
  });
});

// Twins sync
app.post('/api/twins/sync', requireAuth, (req, res) => {
  const twinData = { farm: Array.from(farmTwin.values()), crop: Array.from(cropTwin.values()), livestock: Array.from(livestockTwin.values()) };
  res.json({ success: true, synced: twinData });
});

// ============= END ROUTES =============

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});

// Start server
initDatabase().catch(console.warn);
app.listen(PORT, () => console.log(`✅ Agriculture OS running on port ${PORT}`));

