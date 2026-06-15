/**
 * Transport OS
 * Port: 5240
 * Industry: transport
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5240;

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
const SERVICE_NAME = process.env.SERVICE_NAME || 'Transport OS';

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
        industry: 'transport',
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

// ============= TRANSPORT OS DATA =============
const vehicles = new Map();
const drivers = new Map();
const riders = new Map();
const trips = new Map();

// ============= END DATA =============

// ============= TWINS =============
const vehicleTwin = new Map();
const driverTwin = new Map();
const tripTwin = new Map();

// ============= END TWINS =============

// ============= API ROUTES =============

app.get('/api/vehicles', (req, res) => {
  res.json({ vehicles: Array.from(vehicles.values()) });
});

app.post('/api/vehicles', requireAuth, (req, res) => {
  const vehicle = { id: 'vehicle_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  vehicles.set(vehicle.id, vehicle);
  res.json(vehicle);
});

app.get('/api/vehicles/:id', (req, res) => {
  const vehicle = vehicles.get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Not found' });
  res.json(vehicle);
});

app.put('/api/vehicles/:id', requireAuth, (req, res) => {
  const vehicle = vehicles.get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Not found' });
  if (vehicle.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  vehicles.set(req.params.id, { ...vehicle, ...req.body });
  res.json(vehicles.get(req.params.id));
});

app.delete('/api/vehicles/:id', requireAuth, (req, res) => {
  const vehicle = vehicles.get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Not found' });
  if (vehicle.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  vehicles.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/drivers', (req, res) => {
  res.json({ drivers: Array.from(drivers.values()) });
});

app.post('/api/drivers', requireAuth, (req, res) => {
  const driver = { id: 'driver_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  drivers.set(driver.id, driver);
  res.json(driver);
});

app.get('/api/drivers/:id', (req, res) => {
  const driver = drivers.get(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Not found' });
  res.json(driver);
});

app.put('/api/drivers/:id', requireAuth, (req, res) => {
  const driver = drivers.get(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Not found' });
  if (driver.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  drivers.set(req.params.id, { ...driver, ...req.body });
  res.json(drivers.get(req.params.id));
});

app.delete('/api/drivers/:id', requireAuth, (req, res) => {
  const driver = drivers.get(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Not found' });
  if (driver.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  drivers.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/riders', (req, res) => {
  res.json({ riders: Array.from(riders.values()) });
});

app.post('/api/riders', requireAuth, (req, res) => {
  const rider = { id: 'rider_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  riders.set(rider.id, rider);
  res.json(rider);
});

app.get('/api/riders/:id', (req, res) => {
  const rider = riders.get(req.params.id);
  if (!rider) return res.status(404).json({ error: 'Not found' });
  res.json(rider);
});

app.put('/api/riders/:id', requireAuth, (req, res) => {
  const rider = riders.get(req.params.id);
  if (!rider) return res.status(404).json({ error: 'Not found' });
  if (rider.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  riders.set(req.params.id, { ...rider, ...req.body });
  res.json(riders.get(req.params.id));
});

app.delete('/api/riders/:id', requireAuth, (req, res) => {
  const rider = riders.get(req.params.id);
  if (!rider) return res.status(404).json({ error: 'Not found' });
  if (rider.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  riders.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/trips', (req, res) => {
  res.json({ trips: Array.from(trips.values()) });
});

app.post('/api/trips', requireAuth, (req, res) => {
  const trip = { id: 'trip_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  trips.set(trip.id, trip);
  res.json(trip);
});

app.get('/api/trips/:id', (req, res) => {
  const trip = trips.get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Not found' });
  res.json(trip);
});

app.put('/api/trips/:id', requireAuth, (req, res) => {
  const trip = trips.get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Not found' });
  if (trip.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  trips.set(req.params.id, { ...trip, ...req.body });
  res.json(trips.get(req.params.id));
});

app.delete('/api/trips/:id', requireAuth, (req, res) => {
  const trip = trips.get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Not found' });
  if (trip.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  trips.delete(req.params.id);
  res.json({ success: true });
});


// Analytics
app.get('/api/analytics', (req, res) => {
  res.json({
    vehicleCount: vehicles.size, driverCount: drivers.size, riderCount: riders.size, tripCount: trips.size
  });
});

// Twins sync
app.post('/api/twins/sync', requireAuth, (req, res) => {
  const twinData = { vehicle: Array.from(vehicleTwin.values()), driver: Array.from(driverTwin.values()), trip: Array.from(tripTwin.values()) };
  res.json({ success: true, synced: twinData });
});

// ============= END ROUTES =============

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});

// Start server
initDatabase().catch(console.warn);
app.listen(PORT, () => console.log(`✅ Transport OS running on port ${PORT}`));

