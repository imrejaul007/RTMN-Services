/**
 * HomeServices OS
 * Port: 5140
 * Industry: home_services
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5140;

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
const SERVICE_NAME = process.env.SERVICE_NAME || 'HomeServices OS';

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
        industry: 'home_services',
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

// ============= HOMESERVICES OS DATA =============
const providers = new Map();
const services = new Map();
const bookings = new Map();
const customers = new Map();

// ============= END DATA =============

// ============= TWINS =============
const providerTwin = new Map();
const serviceTwin = new Map();
const bookingTwin = new Map();

// ============= END TWINS =============

// ============= API ROUTES =============

app.get('/api/providers', (req, res) => {
  res.json({ providers: Array.from(providers.values()) });
});

app.post('/api/providers', requireAuth, (req, res) => {
  const provider = { id: 'provider_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  providers.set(provider.id, provider);
  res.json(provider);
});

app.get('/api/providers/:id', (req, res) => {
  const provider = providers.get(req.params.id);
  if (!provider) return res.status(404).json({ error: 'Not found' });
  res.json(provider);
});

app.put('/api/providers/:id', requireAuth, (req, res) => {
  const provider = providers.get(req.params.id);
  if (!provider) return res.status(404).json({ error: 'Not found' });
  if (provider.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  providers.set(req.params.id, { ...provider, ...req.body });
  res.json(providers.get(req.params.id));
});

app.delete('/api/providers/:id', requireAuth, (req, res) => {
  const provider = providers.get(req.params.id);
  if (!provider) return res.status(404).json({ error: 'Not found' });
  if (provider.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  providers.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/ervicess', (req, res) => {
  res.json({ ervicess: Array.from(ervicess.values()) });
});

app.post('/api/ervicess', requireAuth, (req, res) => {
  const ervices = { id: 'ervices_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  ervicess.set(ervices.id, ervices);
  res.json(ervices);
});

app.get('/api/ervicess/:id', (req, res) => {
  const ervices = ervicess.get(req.params.id);
  if (!ervices) return res.status(404).json({ error: 'Not found' });
  res.json(ervices);
});

app.put('/api/ervicess/:id', requireAuth, (req, res) => {
  const ervices = ervicess.get(req.params.id);
  if (!ervices) return res.status(404).json({ error: 'Not found' });
  if (ervices.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  ervicess.set(req.params.id, { ...ervices, ...req.body });
  res.json(ervicess.get(req.params.id));
});

app.delete('/api/ervicess/:id', requireAuth, (req, res) => {
  const ervices = ervicess.get(req.params.id);
  if (!ervices) return res.status(404).json({ error: 'Not found' });
  if (ervices.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  ervicess.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/bookings', (req, res) => {
  res.json({ bookings: Array.from(bookings.values()) });
});

app.post('/api/bookings', requireAuth, (req, res) => {
  const booking = { id: 'booking_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  bookings.set(booking.id, booking);
  res.json(booking);
});

app.get('/api/bookings/:id', (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Not found' });
  res.json(booking);
});

app.put('/api/bookings/:id', requireAuth, (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Not found' });
  if (booking.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  bookings.set(req.params.id, { ...booking, ...req.body });
  res.json(bookings.get(req.params.id));
});

app.delete('/api/bookings/:id', requireAuth, (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Not found' });
  if (booking.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  bookings.delete(req.params.id);
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
    providerCount: providers.size, ervicesCount: ervicess.size, bookingCount: bookings.size, cutomersCount: cutomerss.size
  });
});

// Twins sync
app.post('/api/twins/sync', requireAuth, (req, res) => {
  const twinData = { provider: Array.from(providerTwin.values()), service: Array.from(serviceTwin.values()), booking: Array.from(bookingTwin.values()) };
  res.json({ success: true, synced: twinData });
});

// ============= END ROUTES =============

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});

// Start server
initDatabase().catch(console.warn);
app.listen(PORT, () => console.log(`✅ HomeServices OS running on port ${PORT}`));

