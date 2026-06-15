/**
 * Professional OS
 * Port: 5170
 * Industry: professional
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5170;

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
const SERVICE_NAME = process.env.SERVICE_NAME || 'Professional OS';

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
        industry: 'professional',
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

// ============= PROFESSIONAL OS DATA =============
const consultants = new Map();
const clients = new Map();
const projects = new Map();
const invoices = new Map();

// ============= END DATA =============

// ============= TWINS =============
const consultantTwin = new Map();
const clientTwin = new Map();
const projectTwin = new Map();

// ============= END TWINS =============

// ============= API ROUTES =============

app.get('/api/conultantss', (req, res) => {
  res.json({ conultantss: Array.from(conultantss.values()) });
});

app.post('/api/conultantss', requireAuth, (req, res) => {
  const conultants = { id: 'conultants_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  conultantss.set(conultants.id, conultants);
  res.json(conultants);
});

app.get('/api/conultantss/:id', (req, res) => {
  const conultants = conultantss.get(req.params.id);
  if (!conultants) return res.status(404).json({ error: 'Not found' });
  res.json(conultants);
});

app.put('/api/conultantss/:id', requireAuth, (req, res) => {
  const conultants = conultantss.get(req.params.id);
  if (!conultants) return res.status(404).json({ error: 'Not found' });
  if (conultants.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  conultantss.set(req.params.id, { ...conultants, ...req.body });
  res.json(conultantss.get(req.params.id));
});

app.delete('/api/conultantss/:id', requireAuth, (req, res) => {
  const conultants = conultantss.get(req.params.id);
  if (!conultants) return res.status(404).json({ error: 'Not found' });
  if (conultants.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  conultantss.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/clients', (req, res) => {
  res.json({ clients: Array.from(clients.values()) });
});

app.post('/api/clients', requireAuth, (req, res) => {
  const client = { id: 'client_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  clients.set(client.id, client);
  res.json(client);
});

app.get('/api/clients/:id', (req, res) => {
  const client = clients.get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });
  res.json(client);
});

app.put('/api/clients/:id', requireAuth, (req, res) => {
  const client = clients.get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });
  if (client.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  clients.set(req.params.id, { ...client, ...req.body });
  res.json(clients.get(req.params.id));
});

app.delete('/api/clients/:id', requireAuth, (req, res) => {
  const client = clients.get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });
  if (client.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  clients.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/projects', (req, res) => {
  res.json({ projects: Array.from(projects.values()) });
});

app.post('/api/projects', requireAuth, (req, res) => {
  const project = { id: 'project_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  projects.set(project.id, project);
  res.json(project);
});

app.get('/api/projects/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(project);
});

app.put('/api/projects/:id', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (project.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  projects.set(req.params.id, { ...project, ...req.body });
  res.json(projects.get(req.params.id));
});

app.delete('/api/projects/:id', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (project.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  projects.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/invoices', (req, res) => {
  res.json({ invoices: Array.from(invoices.values()) });
});

app.post('/api/invoices', requireAuth, (req, res) => {
  const invoice = { id: 'invoice_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  invoices.set(invoice.id, invoice);
  res.json(invoice);
});

app.get('/api/invoices/:id', (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Not found' });
  res.json(invoice);
});

app.put('/api/invoices/:id', requireAuth, (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Not found' });
  if (invoice.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  invoices.set(req.params.id, { ...invoice, ...req.body });
  res.json(invoices.get(req.params.id));
});

app.delete('/api/invoices/:id', requireAuth, (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Not found' });
  if (invoice.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  invoices.delete(req.params.id);
  res.json({ success: true });
});


// Analytics
app.get('/api/analytics', (req, res) => {
  res.json({
    conultantsCount: conultantss.size, clientCount: clients.size, projectCount: projects.size, invoiceCount: invoices.size
  });
});

// Twins sync
app.post('/api/twins/sync', requireAuth, (req, res) => {
  const twinData = { consultant: Array.from(consultantTwin.values()), client: Array.from(clientTwin.values()), project: Array.from(projectTwin.values()) };
  res.json({ success: true, synced: twinData });
});

// ============= END ROUTES =============

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});

// Start server
initDatabase().catch(console.warn);
app.listen(PORT, () => console.log(`✅ Professional OS running on port ${PORT}`));

