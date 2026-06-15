import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 5080;
const logger = winston.createLogger({ level: 'info', format: winston.format.combine(winston.format.timestamp(), winston.format.json()), transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })] });
app.use(helmet()); app.use(cors()); app.use(express.json());

const vehicles = new Map(), customers = new Map(), services = new Map(), appointments = new Map(), invoices = new Map();

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'automotive-os', version: '1.0.0' }));

app.get('/api/vehicles', (req, res) => {
  let result = Array.from(vehicles.values());
  if (req.query.status) result = result.filter(v => v.status === req.query.status);
  if (req.query.brand) result = result.filter(v => v.brand === req.query.brand);
  res.json({ success: true, count: result.length, vehicles: result });
});

app.post('/api/vehicles', (req, res) => {
  const { make, model, year, vin, licensePlate, customerId, mileage } = req.body;
  if (!make || !model || !vin) return res.status(400).json({ success: false, error: 'make, model, and VIN required' });
  const vehicle = { id: uuidv4(), make, model, year: year || 2026, vin, licensePlate: licensePlate || null, customerId: customerId || null, mileage: mileage || 0, status: 'active', createdAt: new Date().toISOString() };
  vehicles.set(vehicle.id, vehicle);
  res.status(201).json({ success: true, vehicle });
});

app.get('/api/customers', (req, res) => res.json({ success: true, count: customers.size, customers: Array.from(customers.values()) }));
app.post('/api/customers', (req, res) => {
  const { name, email, phone, address } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const customer = { id: uuidv4(), name, email: email || null, phone: phone || null, address: address || {}, status: 'active', createdAt: new Date().toISOString() };
  customers.set(customer.id, customer);
  res.status(201).json({ success: true, customer });
});

app.get('/api/services', (req, res) => res.json({ success: true, count: services.size, services: Array.from(services.values()) }));
app.post('/api/services', (req, res) => {
  const { name, category, price, duration, description } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const service = { id: uuidv4(), name, category: category || 'general', price: price || 0, duration: duration || 60, description: description || '', status: 'active', createdAt: new Date().toISOString() };
  services.set(service.id, service);
  res.status(201).json({ success: true, service });
});

app.get('/api/appointments', (req, res) => res.json({ success: true, count: appointments.size, appointments: Array.from(appointments.values()) }));
app.post('/api/appointments', (req, res) => {
  const { vehicleId, serviceId, date, time, notes } = req.body;
  if (!vehicleId || !serviceId || !date) return res.status(400).json({ success: false, error: 'vehicleId, serviceId, and date required' });
  const appt = { id: uuidv4(), vehicleId, serviceId, date, time: time || '09:00', notes: notes || '', status: 'scheduled', createdAt: new Date().toISOString() };
  appointments.set(appt.id, appt);
  res.status(201).json({ success: true, appointment: appt });
});

app.get('/api/analytics', (req, res) => {
  res.json({ success: true, analytics: { totalVehicles: vehicles.size, totalCustomers: customers.size, totalServices: services.size, totalAppointments: appointments.size, scheduledAppointments: Array.from(appointments.values()).filter(a => a.status === 'scheduled').length } });
});

app.use((err, req, res) => { logger.error(err); res.status(500).json({ success: false, error: err.message }); });

// ============= AUTH + DATABASE =============

const authBusinesses = new Map();
const authUsers = new Map();
const authSessions = new Map();
const crypto = import('crypto');

function genToken() { return crypto.randomBytes(32).toString('hex'); }

// MongoDB support
let mongoose = null;
let dbConnected = false;
const MONGODB_URI = process.env.MONGODB_URI;
const CRM_HUB_URL = process.env.CRM_HUB_URL || 'http://localhost:4056';

async function initDatabase() {
  if (!MONGODB_URI) return;
  try {
    mongoose = (await import('mongoose')).default;
    await mongoose.connect(MONGODB_URI);
    dbConnected = true;
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.warn('MongoDB failed:', err.message);
  }
}

async function syncToCRM(endpoint, data) {
  if (!dbConnected) return;
  try {
    await fetch(`${CRM_HUB_URL}/api${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (err) {
    console.warn('CRM sync failed:', err.message);
  }
}

// Register business
app.post('/auth/register', (req, res) => {
  const { businessName, ownerName, email, phone, password, plan } = req.body;
  if (!businessName || !ownerName || !email || !password) {
    return res.status(400).json({ success: false, error: 'businessName, ownerName, email, password required' });
  }
  for (const [, u] of authUsers) {
    if (u.email === email && u.industry === 'automotive') {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }
  }
  const businessId = 'BIZ_automotive_' + Date.now();
  const ownerId = 'OWN_automotive_' + Date.now();
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  const token = genToken();
  authBusinesses.set(businessId, {
    id: businessId, name: businessName, industry: 'automotive', email, phone: phone || '',
    plan: plan || 'starter', status: 'active', createdAt: new Date().toISOString()
  });
  authUsers.set(ownerId, {
    id: ownerId, businessId, industry: 'automotive', email, name: ownerName,
    role: 'owner', passwordHash, status: 'active', createdAt: new Date().toISOString()
  });
  authSessions.set(token, {
    userId: ownerId, businessId, industry: 'automotive', role: 'owner',
    createdAt: Date.now(), expiresAt: Date.now() + 2592000000
  });
  res.status(201).json({
    success: true, message: 'automotive registered',
    business: { id: businessId, name: businessName, industry: 'automotive' },
    user: { id: ownerId, name: ownerName, email, role: 'owner' },
    token
  });
});

// Login
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  for (const [userId, user] of authUsers) {
    if (user.email === email && user.industry === 'automotive') {
      if (user.passwordHash !== passwordHash) {
        return res.status(401).json({ success: false, error: 'Invalid password' });
      }
      const token = genToken();
      authSessions.set(token, {
        userId, businessId: user.businessId, industry: 'automotive', role: user.role,
        createdAt: Date.now(), expiresAt: Date.now() + 2592000000
      });
      return res.json({
        success: true, message: 'Login successful',
        user: { id: userId, name: user.name, email, role: user.role, businessId: user.businessId },
        business: authBusinesses.get(user.businessId),
        token
      });
    }
  }
  res.status(401).json({ success: false, error: 'User not found' });
});

// Verify token
app.get('/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'No token' });
  const token = authHeader.substring(7);
  const session = authSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) authSessions.delete(token);
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
  const user = authUsers.get(session.userId);
  res.json({ success: true, valid: true, user: { id: session.userId, name: user?.name, email: user?.email, role: session.role }, businessId: session.businessId });
});

// Auth middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Authentication required' });
  const token = authHeader.substring(7);
  const session = authSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
  req.session = session;
  next();
}

// Initialize database
initDatabase().catch(console.warn);

app.listen(PORT, () => logger.info(`🚗 Automotive OS running on port ${PORT}`));
export default app;
