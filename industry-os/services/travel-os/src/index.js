/**
 * Travel OS
 * Port: 5190
 * Industry: travel
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5190;

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
const SERVICE_NAME = process.env.SERVICE_NAME || 'Travel OS';

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
        industry: 'travel',
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

// ============= TRAVEL OS DATA =============
const destinations = new Map();
const packages = new Map();
const bookings = new Map();
const travelers = new Map();

// ============= END DATA =============

// ============= TWINS =============
const destinationTwin = new Map();
const packageTwin = new Map();
const bookingTwin = new Map();

// ============= END TWINS =============

// ============= API ROUTES =============

app.get('/api/detinationss', (req, res) => {
  res.json({ detinationss: Array.from(detinationss.values()) });
});

app.post('/api/detinationss', requireAuth, (req, res) => {
  const detinations = { id: 'detinations_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  detinationss.set(detinations.id, detinations);
  res.json(detinations);
});

app.get('/api/detinationss/:id', (req, res) => {
  const detinations = detinationss.get(req.params.id);
  if (!detinations) return res.status(404).json({ error: 'Not found' });
  res.json(detinations);
});

app.put('/api/detinationss/:id', requireAuth, (req, res) => {
  const detinations = detinationss.get(req.params.id);
  if (!detinations) return res.status(404).json({ error: 'Not found' });
  if (detinations.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  detinationss.set(req.params.id, { ...detinations, ...req.body });
  res.json(detinationss.get(req.params.id));
});

app.delete('/api/detinationss/:id', requireAuth, (req, res) => {
  const detinations = detinationss.get(req.params.id);
  if (!detinations) return res.status(404).json({ error: 'Not found' });
  if (detinations.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  detinationss.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/packages', (req, res) => {
  res.json({ packages: Array.from(packages.values()) });
});

app.post('/api/packages', requireAuth, (req, res) => {
  const package = { id: 'package_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  packages.set(package.id, package);
  res.json(package);
});

app.get('/api/packages/:id', (req, res) => {
  const package = packages.get(req.params.id);
  if (!package) return res.status(404).json({ error: 'Not found' });
  res.json(package);
});

app.put('/api/packages/:id', requireAuth, (req, res) => {
  const package = packages.get(req.params.id);
  if (!package) return res.status(404).json({ error: 'Not found' });
  if (package.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  packages.set(req.params.id, { ...package, ...req.body });
  res.json(packages.get(req.params.id));
});

app.delete('/api/packages/:id', requireAuth, (req, res) => {
  const package = packages.get(req.params.id);
  if (!package) return res.status(404).json({ error: 'Not found' });
  if (package.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  packages.delete(req.params.id);
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


app.get('/api/travelers', (req, res) => {
  res.json({ travelers: Array.from(travelers.values()) });
});

app.post('/api/travelers', requireAuth, (req, res) => {
  const traveler = { id: 'traveler_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  travelers.set(traveler.id, traveler);
  res.json(traveler);
});

app.get('/api/travelers/:id', (req, res) => {
  const traveler = travelers.get(req.params.id);
  if (!traveler) return res.status(404).json({ error: 'Not found' });
  res.json(traveler);
});

app.put('/api/travelers/:id', requireAuth, (req, res) => {
  const traveler = travelers.get(req.params.id);
  if (!traveler) return res.status(404).json({ error: 'Not found' });
  if (traveler.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  travelers.set(req.params.id, { ...traveler, ...req.body });
  res.json(travelers.get(req.params.id));
});

app.delete('/api/travelers/:id', requireAuth, (req, res) => {
  const traveler = travelers.get(req.params.id);
  if (!traveler) return res.status(404).json({ error: 'Not found' });
  if (traveler.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  travelers.delete(req.params.id);
  res.json({ success: true });
});


// Analytics
app.get('/api/analytics', (req, res) => {
  res.json({
    detinationsCount: detinationss.size, packageCount: packages.size, bookingCount: bookings.size, travelerCount: travelers.size
  });
});

// Twins sync
app.post('/api/twins/sync', requireAuth, (req, res) => {
  const twinData = { destination: Array.from(destinationTwin.values()), package: Array.from(packageTwin.values()), booking: Array.from(bookingTwin.values()) };
  res.json({ success: true, synced: twinData });
});

// ============= END ROUTES =============

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});

// Start server
initDatabase().catch(console.warn);
app.listen(PORT, () => console.log(`✅ Travel OS running on port ${PORT}`));

