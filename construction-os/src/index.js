/**
 * Construction OS
 * Port: 5210
 * Industry: construction
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5210;

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
const SERVICE_NAME = process.env.SERVICE_NAME || 'Construction OS';

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
        industry: 'construction',
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

// ============= CONSTRUCTION OS DATA =============
const projects = new Map();
const contractors = new Map();
const materials = new Map();
const workers = new Map();

// ============= END DATA =============

// ============= TWINS =============
const projectTwin = new Map();
const contractorTwin = new Map();
const materialTwin = new Map();

// ============= END TWINS =============

// ============= API ROUTES =============

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


app.get('/api/contractors', (req, res) => {
  res.json({ contractors: Array.from(contractors.values()) });
});

app.post('/api/contractors', requireAuth, (req, res) => {
  const contractor = { id: 'contractor_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  contractors.set(contractor.id, contractor);
  res.json(contractor);
});

app.get('/api/contractors/:id', (req, res) => {
  const contractor = contractors.get(req.params.id);
  if (!contractor) return res.status(404).json({ error: 'Not found' });
  res.json(contractor);
});

app.put('/api/contractors/:id', requireAuth, (req, res) => {
  const contractor = contractors.get(req.params.id);
  if (!contractor) return res.status(404).json({ error: 'Not found' });
  if (contractor.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  contractors.set(req.params.id, { ...contractor, ...req.body });
  res.json(contractors.get(req.params.id));
});

app.delete('/api/contractors/:id', requireAuth, (req, res) => {
  const contractor = contractors.get(req.params.id);
  if (!contractor) return res.status(404).json({ error: 'Not found' });
  if (contractor.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  contractors.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/materials', (req, res) => {
  res.json({ materials: Array.from(materials.values()) });
});

app.post('/api/materials', requireAuth, (req, res) => {
  const material = { id: 'material_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  materials.set(material.id, material);
  res.json(material);
});

app.get('/api/materials/:id', (req, res) => {
  const material = materials.get(req.params.id);
  if (!material) return res.status(404).json({ error: 'Not found' });
  res.json(material);
});

app.put('/api/materials/:id', requireAuth, (req, res) => {
  const material = materials.get(req.params.id);
  if (!material) return res.status(404).json({ error: 'Not found' });
  if (material.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  materials.set(req.params.id, { ...material, ...req.body });
  res.json(materials.get(req.params.id));
});

app.delete('/api/materials/:id', requireAuth, (req, res) => {
  const material = materials.get(req.params.id);
  if (!material) return res.status(404).json({ error: 'Not found' });
  if (material.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  materials.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/workers', (req, res) => {
  res.json({ workers: Array.from(workers.values()) });
});

app.post('/api/workers', requireAuth, (req, res) => {
  const worker = { id: 'worker_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  workers.set(worker.id, worker);
  res.json(worker);
});

app.get('/api/workers/:id', (req, res) => {
  const worker = workers.get(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Not found' });
  res.json(worker);
});

app.put('/api/workers/:id', requireAuth, (req, res) => {
  const worker = workers.get(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Not found' });
  if (worker.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  workers.set(req.params.id, { ...worker, ...req.body });
  res.json(workers.get(req.params.id));
});

app.delete('/api/workers/:id', requireAuth, (req, res) => {
  const worker = workers.get(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Not found' });
  if (worker.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  workers.delete(req.params.id);
  res.json({ success: true });
});


// Analytics
app.get('/api/analytics', (req, res) => {
  res.json({
    projectCount: projects.size, contractorCount: contractors.size, materialCount: materials.size, workerCount: workers.size
  });
});

// Twins sync
app.post('/api/twins/sync', requireAuth, (req, res) => {
  const twinData = { project: Array.from(projectTwin.values()), contractor: Array.from(contractorTwin.values()), material: Array.from(materialTwin.values()) };
  res.json({ success: true, synced: twinData });
});

// ============= END ROUTES =============

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});

// Start server
initDatabase().catch(console.warn);
app.listen(PORT, () => console.log(`✅ Construction OS running on port ${PORT}`));

