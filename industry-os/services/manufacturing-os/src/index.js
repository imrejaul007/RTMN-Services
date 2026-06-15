import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 5150;
const logger = winston.createLogger({ level: 'info', format: winston.format.combine(winston.format.timestamp(), winston.format.json()), transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })] });
app.use(helmet()); app.use(cors()); app.use(express.json());

const products = new Map(), orders = new Map(), machines = new Map(), materials = new Map(), workers = new Map(), production = new Map();

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'manufacturing-os', version: '1.0.0' }));

app.get('/api/products', (req, res) => res.json({ success: true, count: products.size, products: Array.from(products.values()) }));
app.post('/api/products', (req, res) => {
  const { name, sku, description, unitCost, sellingPrice } = req.body;
  if (!name || !sku) return res.status(400).json({ success: false, error: 'Name and SKU required' });
  const product = { id: uuidv4(), name, sku, description: description || '', unitCost: unitCost || 0, sellingPrice: sellingPrice || 0, status: 'active', createdAt: new Date().toISOString() };
  products.set(product.id, product);
  res.status(201).json({ success: true, product });
});

app.get('/api/orders', (req, res) => {
  let result = Array.from(orders.values());
  if (req.query.status) result = result.filter(o => o.status === req.query.status);
  res.json({ success: true, count: result.length, orders: result });
});
app.post('/api/orders', (req, res) => {
  const { productId, quantity, priority } = req.body;
  if (!productId || !quantity) return res.status(400).json({ success: false, error: 'productId and quantity required' });
  const product = products.get(productId);
  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
  const order = { id: uuidv4(), productId, quantity, productName: product.name, totalCost: product.unitCost * quantity, priority: priority || 'normal', status: 'pending', createdAt: new Date().toISOString() };
  orders.set(order.id, order);
  res.status(201).json({ success: true, order });
});

app.get('/api/machines', (req, res) => res.json({ success: true, count: machines.size, machines: Array.from(machines.values()) }));
app.post('/api/machines', (req, res) => {
  const { name, type, capacity, status } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const machine = { id: uuidv4(), name, type: type || 'general', capacity: capacity || 100, status: status || 'idle', createdAt: new Date().toISOString() };
  machines.set(machine.id, machine);
  res.status(201).json({ success: true, machine });
});

app.get('/api/materials', (req, res) => res.json({ success: true, count: materials.size, materials: Array.from(materials.values()) }));
app.post('/api/materials', (req, res) => {
  const { name, sku, quantity, unit, reorderLevel } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const material = { id: uuidv4(), name, sku: sku || null, quantity: quantity || 0, unit: unit || 'units', reorderLevel: reorderLevel || 10, status: 'in_stock', createdAt: new Date().toISOString() };
  materials.set(material.id, material);
  res.status(201).json({ success: true, material });
});

app.get('/api/workers', (req, res) => res.json({ success: true, count: workers.size, workers: Array.from(workers.values()) }));
app.post('/api/workers', (req, res) => {
  const { name, role, machineId, shift } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const worker = { id: uuidv4(), name, role: role || 'operator', machineId: machineId || null, shift: shift || 'day', status: 'available', createdAt: new Date().toISOString() };
  workers.set(worker.id, worker);
  res.status(201).json({ success: true, worker });
});

app.get('/api/production', (req, res) => res.json({ success: true, count: production.size, production: Array.from(production.values()) }));
app.post('/api/production', (req, res) => {
  const { orderId, machineId, workerId, quantity } = req.body;
  if (!orderId) return res.status(400).json({ success: false, error: 'orderId required' });
  const record = { id: uuidv4(), orderId, machineId: machineId || null, workerId: workerId || null, quantity: quantity || 0, status: 'in_progress', startedAt: new Date().toISOString(), completedAt: null };
  production.set(record.id, record);
  res.status(201).json({ success: true, production: record });
});

app.get('/api/analytics', (req, res) => {
  res.json({ success: true, analytics: { totalProducts: products.size, totalOrders: orders.size, pendingOrders: Array.from(orders.values()).filter(o => o.status === 'pending').length, totalMachines: machines.size, activeMachines: Array.from(machines.values()).filter(m => m.status === 'running').length, totalWorkers: workers.size, lowStockMaterials: Array.from(materials.values()).filter(m => m.quantity <= m.reorderLevel).length } });
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
    if (u.email === email && u.industry === 'manufacturing') {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }
  }
  const businessId = 'BIZ_manufacturing_' + Date.now();
  const ownerId = 'OWN_manufacturing_' + Date.now();
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  const token = genToken();
  authBusinesses.set(businessId, {
    id: businessId, name: businessName, industry: 'manufacturing', email, phone: phone || '',
    plan: plan || 'starter', status: 'active', createdAt: new Date().toISOString()
  });
  authUsers.set(ownerId, {
    id: ownerId, businessId, industry: 'manufacturing', email, name: ownerName,
    role: 'owner', passwordHash, status: 'active', createdAt: new Date().toISOString()
  });
  authSessions.set(token, {
    userId: ownerId, businessId, industry: 'manufacturing', role: 'owner',
    createdAt: Date.now(), expiresAt: Date.now() + 2592000000
  });
  res.status(201).json({
    success: true, message: 'manufacturing registered',
    business: { id: businessId, name: businessName, industry: 'manufacturing' },
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
    if (user.email === email && user.industry === 'manufacturing') {
      if (user.passwordHash !== passwordHash) {
        return res.status(401).json({ success: false, error: 'Invalid password' });
      }
      const token = genToken();
      authSessions.set(token, {
        userId, businessId: user.businessId, industry: 'manufacturing', role: user.role,
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

app.listen(PORT, () => logger.info(`🏭 Manufacturing OS running on port ${PORT}`));
export default app;
