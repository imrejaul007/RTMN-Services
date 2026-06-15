/**
 * Government OS
 * Port: 5130
 * Industry: government
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5130;

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
const SERVICE_NAME = process.env.SERVICE_NAME || 'Government OS';

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
        industry: 'government',
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

// ============= GOVERNMENT OS DATA =============
const citizens = new Map();
const services = new Map();
const applications = new Map();
const departments = new Map();

// ============= END DATA =============

// ============= TWINS =============
const citizenTwin = new Map();
const serviceTwin = new Map();
const departmentTwin = new Map();

// ============= END TWINS =============

// ============= API ROUTES =============

app.get('/api/citizens', (req, res) => {
  res.json({ citizens: Array.from(citizens.values()) });
});

app.post('/api/citizens', requireAuth, (req, res) => {
  const citizen = { id: 'citizen_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  citizens.set(citizen.id, citizen);
  res.json(citizen);
});

app.get('/api/citizens/:id', (req, res) => {
  const citizen = citizens.get(req.params.id);
  if (!citizen) return res.status(404).json({ error: 'Not found' });
  res.json(citizen);
});

app.put('/api/citizens/:id', requireAuth, (req, res) => {
  const citizen = citizens.get(req.params.id);
  if (!citizen) return res.status(404).json({ error: 'Not found' });
  if (citizen.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  citizens.set(req.params.id, { ...citizen, ...req.body });
  res.json(citizens.get(req.params.id));
});

app.delete('/api/citizens/:id', requireAuth, (req, res) => {
  const citizen = citizens.get(req.params.id);
  if (!citizen) return res.status(404).json({ error: 'Not found' });
  if (citizen.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  citizens.delete(req.params.id);
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


app.get('/api/applications', (req, res) => {
  res.json({ applications: Array.from(applications.values()) });
});

app.post('/api/applications', requireAuth, (req, res) => {
  const application = { id: 'application_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  applications.set(application.id, application);
  res.json(application);
});

app.get('/api/applications/:id', (req, res) => {
  const application = applications.get(req.params.id);
  if (!application) return res.status(404).json({ error: 'Not found' });
  res.json(application);
});

app.put('/api/applications/:id', requireAuth, (req, res) => {
  const application = applications.get(req.params.id);
  if (!application) return res.status(404).json({ error: 'Not found' });
  if (application.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  applications.set(req.params.id, { ...application, ...req.body });
  res.json(applications.get(req.params.id));
});

app.delete('/api/applications/:id', requireAuth, (req, res) => {
  const application = applications.get(req.params.id);
  if (!application) return res.status(404).json({ error: 'Not found' });
  if (application.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  applications.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/departments', (req, res) => {
  res.json({ departments: Array.from(departments.values()) });
});

app.post('/api/departments', requireAuth, (req, res) => {
  const department = { id: 'department_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  departments.set(department.id, department);
  res.json(department);
});

app.get('/api/departments/:id', (req, res) => {
  const department = departments.get(req.params.id);
  if (!department) return res.status(404).json({ error: 'Not found' });
  res.json(department);
});

app.put('/api/departments/:id', requireAuth, (req, res) => {
  const department = departments.get(req.params.id);
  if (!department) return res.status(404).json({ error: 'Not found' });
  if (department.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  departments.set(req.params.id, { ...department, ...req.body });
  res.json(departments.get(req.params.id));
});

app.delete('/api/departments/:id', requireAuth, (req, res) => {
  const department = departments.get(req.params.id);
  if (!department) return res.status(404).json({ error: 'Not found' });
  if (department.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  departments.delete(req.params.id);
  res.json({ success: true });
});


// Analytics
app.get('/api/analytics', (req, res) => {
  res.json({
    citizenCount: citizens.size, ervicesCount: ervicess.size, applicationCount: applications.size, departmentCount: departments.size
  });
});

// Twins sync
app.post('/api/twins/sync', requireAuth, (req, res) => {
  const twinData = { citizen: Array.from(citizenTwin.values()), service: Array.from(serviceTwin.values()), department: Array.from(departmentTwin.values()) };
  res.json({ success: true, synced: twinData });
});

// ============= END ROUTES =============

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});

// Start server
initDatabase().catch(console.warn);
app.listen(PORT, () => console.log(`✅ Government OS running on port ${PORT}`));

