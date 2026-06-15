import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 5090;
const logger = winston.createLogger({ level: 'info', format: winston.format.combine(winston.format.timestamp(), winston.format.json()), transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })] });
app.use(helmet()); app.use(cors()); app.use(express.json());

const clients = new Map(), services = new Map(), staff = new Map(), appointments = new Map(), products = new Map();

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'beauty-os', version: '1.0.0' }));

app.get('/api/clients', (req, res) => res.json({ success: true, count: clients.size, clients: Array.from(clients.values()) }));
app.post('/api/clients', (req, res) => {
  const { name, email, phone, preferences } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const client = { id: uuidv4(), name, email: email || null, phone: phone || null, preferences: preferences || {}, loyaltyPoints: 0, status: 'active', createdAt: new Date().toISOString() };
  clients.set(client.id, client);
  res.status(201).json({ success: true, client });
});

app.get('/api/services', (req, res) => {
  let result = Array.from(services.values());
  if (req.query.category) result = result.filter(s => s.category === req.query.category);
  res.json({ success: true, count: result.length, services: result });
});
app.post('/api/services', (req, res) => {
  const { name, category, price, duration } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const service = { id: uuidv4(), name, category: category || 'general', price: price || 0, duration: duration || 60, status: 'active', createdAt: new Date().toISOString() };
  services.set(service.id, service);
  res.status(201).json({ success: true, service });
});

app.get('/api/staff', (req, res) => res.json({ success: true, count: staff.size, staff: Array.from(staff.values()) }));
app.post('/api/staff', (req, res) => {
  const { name, role, specialties } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const member = { id: uuidv4(), name, role: role || 'stylist', specialties: specialties || [], status: 'available', createdAt: new Date().toISOString() };
  staff.set(member.id, member);
  res.status(201).json({ success: true, staff: member });
});

app.get('/api/appointments', (req, res) => res.json({ success: true, count: appointments.size, appointments: Array.from(appointments.values()) }));
app.post('/api/appointments', (req, res) => {
  const { clientId, serviceId, staffId, date, time } = req.body;
  if (!clientId || !serviceId || !date) return res.status(400).json({ success: false, error: 'clientId, serviceId, and date required' });
  const appt = { id: uuidv4(), clientId, serviceId, staffId: staffId || null, date, time: time || '10:00', status: 'scheduled', createdAt: new Date().toISOString() };
  appointments.set(appt.id, appt);
  res.status(201).json({ success: true, appointment: appt });
});

app.get('/api/products', (req, res) => res.json({ success: true, count: products.size, products: Array.from(products.values()) }));
app.post('/api/products', (req, res) => {
  const { name, category, price, stock } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const product = { id: uuidv4(), name, category: category || 'skincare', price: price || 0, stock: stock || 0, status: 'active', createdAt: new Date().toISOString() };
  products.set(product.id, product);
  res.status(201).json({ success: true, product });
});

app.get('/api/analytics', (req, res) => {
  res.json({ success: true, analytics: { totalClients: clients.size, totalServices: services.size, totalStaff: staff.size, totalAppointments: appointments.size, totalProducts: products.size } });
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
    if (u.email === email && u.industry === 'beauty') {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }
  }
  const businessId = 'BIZ_beauty_' + Date.now();
  const ownerId = 'OWN_beauty_' + Date.now();
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  const token = genToken();
  authBusinesses.set(businessId, {
    id: businessId, name: businessName, industry: 'beauty', email, phone: phone || '',
    plan: plan || 'starter', status: 'active', createdAt: new Date().toISOString()
  });
  authUsers.set(ownerId, {
    id: ownerId, businessId, industry: 'beauty', email, name: ownerName,
    role: 'owner', passwordHash, status: 'active', createdAt: new Date().toISOString()
  });
  authSessions.set(token, {
    userId: ownerId, businessId, industry: 'beauty', role: 'owner',
    createdAt: Date.now(), expiresAt: Date.now() + 2592000000
  });
  res.status(201).json({
    success: true, message: 'beauty registered',
    business: { id: businessId, name: businessName, industry: 'beauty' },
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
    if (user.email === email && user.industry === 'beauty') {
      if (user.passwordHash !== passwordHash) {
        return res.status(401).json({ success: false, error: 'Invalid password' });
      }
      const token = genToken();
      authSessions.set(token, {
        userId, businessId: user.businessId, industry: 'beauty', role: user.role,
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

app.listen(PORT, () => logger.info(`💄 Beauty OS running on port ${PORT}`));
export default app;
