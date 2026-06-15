/**
 * hotel-os AI Company Platform
 * 
 * restaurant OS upgraded with all 15 layers of RTMN ecosystem.
 * 
 * Port: 5010
 * Industry: Restaurant
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5010;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// ============================================
// LAYER CONFIGURATION
// ============================================

const INDUSTRY = 'hotel';
const LAYERS_ENABLED = process.env.LAYERS ? process.env.LAYERS.split(',') : 'all';

// Service URLs for Layer Integration
const RTMN_SERVICES = {
  // Layer 1: Intelligence (HOJAI)
  genie: process.env.GENIE_URL || 'http://localhost:4701',
  copilot: process.env.COPILOT_URL || 'http://localhost:4600',
  agentMarketplace: process.env.AGENT_URL || 'http://localhost:4580',
  
  // Layer 2: Customer Growth (AdBazaar + REZ Consumer + Axom)
  crmHub: process.env.CRM_HUB_URL || 'http://localhost:4056',
  buzzLocal: process.env.BUZZLOCAL_URL || 'http://localhost:4020',
  
  // Layer 3: Commerce (Nexha + REZ-Merchant)
  nexha: process.env.NEXHA_URL || 'http://localhost:5002',
  procurement: process.env.PROCUREMENT_URL || 'http://localhost:4320',

  // REZ-Merchant Integration (Layer 3 Extension)
  merchantPOS: process.env.MERCHANT_POS_URL || 'http://localhost:4800',
  merchantRestaurant: process.env.MERCHANT_RESTAURANT_URL || 'http://localhost:4801',
  merchantMenu: process.env.MERCHANT_MENU_URL || 'http://localhost:4802',
  merchantPayment: process.env.MERCHANT_PAYMENT_URL || 'http://localhost:4803',
  merchantLoyalty: process.env.MERCHANT_LOYALTY_URL || 'http://localhost:4804',
  merchantInventory: process.env.MERCHANT_INVENTORY_URL || 'http://localhost:4805',
  merchantStaff: process.env.MERCHANT_STAFF_URL || 'http://localhost:4806',
  merchantReservations: process.env.MERCHANT_RESERVATIONS_URL || 'http://localhost:4807',
  merchantDashboard: process.env.MERCHANT_DASHBOARD_URL || 'http://localhost:4808',
  merchantGenie: process.env.MERCHANT_GENIE_URL || 'http://localhost:4809',
  
  // Layer 4: Financial (RABTUL + RIDZA + AssetMind)
  wallet: process.env.WALLET_URL || 'http://localhost:4004',
  auth: process.env.AUTH_URL || 'http://localhost:4002',
  
  // Layer 5: Workforce (CorpPerks)
  corpPerks: process.env.CORPPERKS_URL || 'http://localhost:4450',
  
  // Layer 6: Legal & Trust (LawGens)
  legal: process.env.LEGAL_URL || 'http://localhost:5035',
  trustScorer: process.env.TRUST_URL || 'http://localhost:4180',
  
  // Layer 7: Property (RisnaEstate + StayOwn)
  risnaEstate: process.env.RISNA_URL || 'http://localhost:4300',
  stayOwn: process.env.STAYOWN_URL || 'http://localhost:6000',
  
  // Layer 8: Health (RisaCare)
  risaCare: process.env.RISACARE_URL || 'http://localhost:7000',
  
  // Layer 9: Mobility (KHAIRMOVE)
  khairMove: process.env.KHAIRMOVE_URL || 'http://localhost:4500',
  
  // Layer 10: Identity (CorpID)
  corpid: process.env.CORPID_URL || 'http://localhost:4702',
  
  // Layer 11: Memory (MemoryOS)
  memory: process.env.MEMORY_URL || 'http://localhost:4703',
  
  // Layer 12: Twins (TwinOS Hub)
  twinos: process.env.TWINOS_URL || 'http://localhost:4705',

  // Layer 13: Automation (FlowOS)
  flow: process.env.FLOW_URL || 'http://localhost:4200',

  // Layer 14: Autonomous (SUTAR OS)
  sutar: process.env.SUTAR_URL || 'http://localhost:4140',
  goalOS: process.env.GOAL_URL || 'http://localhost:4242',
  decision: process.env.DECISION_URL || 'http://localhost:4240',
  negotiation: process.env.NEGOTIATION_URL || 'http://localhost:4191',
  
  // Layer 15: Consumer (REZ Consumer)
  rezConsumer: process.env.REZ_CONSUMER_URL || 'http://localhost:3000',
};

// ============================================
// AUTHENTICATION & DATABASE
// ============================================

const authBusinesses = new Map();
const authUsers = new Map();
const authSessions = new Map();
const crypto = require('crypto');

let mongoose = null;
let dbConnected = false;
const MONGODB_URI = process.env.MONGODB_URI;

async function initDatabase() {
  if (!MONGODB_URI) {
    console.log('⚠️  MONGODB_URI not set. Running in demo mode.');
    return;
  }
  try {
    mongoose = (await import('mongoose')).default;
    await mongoose.connect(MONGODB_URI);
    dbConnected = true;
    console.log('✅ MongoDB connected for Restaurant AI Company');
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
    industry: INDUSTRY,
    createdAt: new Date().toISOString()
  };
  authUsers.set(email, user);
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId, industry: INDUSTRY, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email: user.email, businessId: user.businessId, industry: INDUSTRY, createdAt: Date.now() });
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
    await fetch(`${RTMN_SERVICES.crmHub}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        industry: INDUSTRY,
        businessId,
        loyaltyPoints: customer.loyaltyPoints || 0,
        tier: customer.tier || 'bronze',
      }),
    });
  } catch (err) {
    console.warn('CRM sync failed:', err.message);
  }
}

// ============================================
// RESTAURANT DATA
// ============================================

const menus = new Map();
const orders = new Map();
const tables = new Map();
const customers = new Map();
const kitchenQueue = new Map();

// Initialize sample tables
for (let i = 1; i <= 20; i++) {
  tables.set(`table_${i}`, { id: `table_${i}`, capacity: 4, section: 'main', status: 'available', tenantId: 'demo' });
}

// Initialize sample menu
const sampleMenu = [
  { id: 'menu_1', name: 'Margherita Pizza', category: 'Pizza', price: 299, prepTime: 15 },
  { id: 'menu_2', name: 'Chicken Burger', category: 'Burgers', price: 199, prepTime: 10 },
  { id: 'menu_3', name: 'Pasta Carbonara', category: 'Pasta', price: 249, prepTime: 12 },
  { id: 'menu_4', name: 'Caesar Salad', category: 'Salads', price: 149, prepTime: 5 },
  { id: 'menu_5', name: 'Cold Coffee', category: 'Beverages', price: 99, prepTime: 3 },
];
sampleMenu.forEach(item => menus.set(item.id, { ...item, available: true, tenantId: 'demo' }));

// ============================================
// RESTAURANT TWINS
// ============================================

const restaurantTwin = new Map();
const menuTwin = new Map();
const orderTwin = new Map();
const kitchenTwin = new Map();
const tableTwin = new Map();
const customerTwin = new Map();

// ============================================
// RESTAURANT API
// ============================================

// Menu Management
app.get('/api/menu', (req, res) => {
  const { category } = req.query;
  let items = Array.from(menus.values());
  if (category) items = items.filter(m => m.category === category);
  res.json({ menu: items });
});

app.post('/api/menu', requireAuth, (req, res) => {
  const item = { id: 'menu_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  menus.set(item.id, item);
  menuTwin.set(item.id, { ...item, syncedAt: new Date().toISOString() });
  res.json(item);
});

// Order Processing
app.post('/api/orders', requireAuth, (req, res) => {
  const { tableId, items, orderType = 'dine-in', notes = '' } = req.body;
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = Math.round(subtotal * 0.08);
  const order = {
    id: 'order_' + Date.now(),
    orderNumber: 'ORD' + Date.now().toString().slice(-6),
    tableId,
    items,
    subtotal,
    tax,
    total: subtotal + tax,
    status: 'pending',
    orderType,
    notes,
    priority: 'normal',
    tenantId: req.session.businessId,
    createdAt: new Date().toISOString()
  };
  orders.set(order.id, order);
  kitchenQueue.set(order.id, { ...order, kitchenStatus: 'pending' });
  orderTwin.set(order.id, { ...order, twinType: 'order', syncedAt: new Date().toISOString() });
  res.json(order);
});

app.get('/api/orders', (req, res) => {
  res.json({ orders: Array.from(orders.values()) });
});

app.patch('/api/orders/:id/status', requireAuth, (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status = req.body.status;
  orders.set(order.id, order);
  orderTwin.set(order.id, { ...order, syncedAt: new Date().toISOString() });
  res.json(order);
});

// Table Management
app.get('/api/tables', (req, res) => {
  res.json({ tables: Array.from(tables.values()) });
});

app.post('/api/tables/:id/reserve', requireAuth, (req, res) => {
  const table = tables.get(req.params.id);
  if (!table) return res.status(404).json({ error: 'Table not found' });
  table.status = 'reserved';
  table.guestCount = req.body.guestCount || 1;
  table.reservationName = req.body.name;
  table.reservationTime = new Date().toISOString();
  tables.set(table.id, table);
  tableTwin.set(table.id, { ...table, twinType: 'table', syncedAt: new Date().toISOString() });
  res.json(table);
});

// Customer Loyalty
app.get('/api/customers', (req, res) => {
  res.json({ customers: Array.from(customers.values()) });
});

app.post('/api/customers', requireAuth, async (req, res) => {
  const customer = { id: 'cust_' + Date.now(), ...req.body, tenantId: req.session.businessId, loyaltyPoints: 0, tier: 'bronze', createdAt: new Date().toISOString() };
  customers.set(customer.id, customer);
  customerTwin.set(customer.id, { ...customer, twinType: 'customer', syncedAt: new Date().toISOString() });
  await syncCustomerToCRM(customer, req.session.businessId);
  res.json(customer);
});

app.post('/api/customers/:id/points', requireAuth, (req, res) => {
  const customer = customers.get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  customer.loyaltyPoints += req.body.points || 0;
  if (customer.loyaltyPoints >= 5000) customer.tier = 'platinum';
  else if (customer.loyaltyPoints >= 2000) customer.tier = 'gold';
  else if (customer.loyaltyPoints >= 500) customer.tier = 'silver';
  customers.set(customer.id, customer);
  res.json(customer);
});

// Kitchen Queue
app.get('/api/kitchen', (req, res) => {
  res.json({ queue: Array.from(kitchenQueue.values()) });
});

app.patch('/api/kitchen/:orderId', requireAuth, (req, res) => {
  const item = kitchenQueue.get(req.params.orderId);
  if (!item) return res.status(404).json({ error: 'Order not found' });
  item.kitchenStatus = req.body.status;
  kitchenQueue.set(item.id, item);
  kitchenTwin.set(item.id, { ...item, twinType: 'kitchen', syncedAt: new Date().toISOString() });
  res.json(item);
});

// Analytics
app.get('/api/analytics', requireAuth, (req, res) => {
  const orderList = Array.from(orders.values());
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orderList.filter(o => o.createdAt.startsWith(today));
  res.json({
    totalOrders: orders.size,
    todayOrders: todayOrders.length,
    todayRevenue: todayOrders.reduce((sum, o) => sum + o.total, 0),
    pendingOrders: orderList.filter(o => o.status === 'pending').length,
    activeTables: Array.from(tables.values()).filter(t => t.status === 'occupied').length,
    totalCustomers: customers.size,
    menuItems: menus.size,
  });
});

// ============================================
// LAYER 1: INTELLIGENCE (HOJAI)
// ============================================

app.get('/api/layer/intelligence', requireAuth, async (req, res) => {
  try {
    const [genieRes, copilotRes, agentsRes] = await Promise.allSettled([
      fetch(RTMN_SERVICES.genie + '/health'),
      fetch(RTMN_SERVICES.copilot + '/health'),
      fetch(RTMN_SERVICES.agentMarketplace + '/api/agents'),
    ]);
    
    res.json({
      layer: 1,
      name: 'Intelligence (HOJAI)',
      services: {
        genie: genieRes.status === 'fulfilled' ? 'online' : 'offline',
        businessCopilot: copilotRes.status === 'fulfilled' ? 'online' : 'offline',
        agentMarketplace: agentsRes.status === 'fulfilled' ? 'online' : 'offline',
      },
      aiAgents: ['AI Receptionist', 'AI Chef', 'AI Waiter', 'AI Manager', 'AI Procurement Agent'],
    });
  } catch (err) {
    res.json({ layer: 1, name: 'Intelligence', status: 'offline', error: err.message });
  }
});

app.post('/api/ai/chat', requireAuth, async (req, res) => {
  // Connect to Genie for AI chat
  try {
    const response = await fetch(RTMN_SERVICES.genie + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: req.body.prompt, context: { industry: INDUSTRY } }),
    });
    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: 'AI service unavailable', details: err.message });
  }
});

// ============================================
// LAYER 2: CUSTOMER GROWTH
// ============================================

app.get('/api/layer/customer-growth', requireAuth, async (req, res) => {
  try {
    const crmRes = await fetch(RTMN_SERVICES.crmHub + '/api/health');
    const crm = await crmRes.json();
    
    res.json({
      layer: 2,
      name: 'Customer Growth (AdBazaar + REZ Consumer + Axom)',
      services: {
        crmHub: crm.status || 'online',
        buzzLocal: RTMN_SERVICES.buzzLocal,
      },
      capabilities: ['Customer Acquisition', 'Lead Generation', 'CRM', 'Loyalty', 'Community'],
    });
  } catch (err) {
    res.json({ layer: 2, name: 'Customer Growth', status: 'offline', error: err.message });
  }
});

// ============================================
// LAYER 3: COMMERCE (Nexha)
// ============================================

app.get('/api/layer/commerce', requireAuth, async (req, res) => {
  try {
    const nexhaRes = await fetch(RTMN_SERVICES.nexha + '/health');
    const nexha = await nexhaRes.json();
    
    res.json({
      layer: 3,
      name: 'Commerce (Nexha + REZ-Merchant)',
      services: {
        nexha: nexha.status || 'online',
        procurement: RTMN_SERVICES.procurement,
        merchantPOS: RTMN_SERVICES.merchantPOS,
        merchantRestaurant: RTMN_SERVICES.merchantRestaurant,
        merchantMenu: RTMN_SERVICES.merchantMenu,
        merchantPayment: RTMN_SERVICES.merchantPayment,
      },
      capabilities: ['Procurement', 'Distribution', 'Manufacturing', 'Franchise', 'Trade Finance', 'POS', 'Orders', 'Menu', 'Payments'],
    });
  } catch (err) {
    res.json({ layer: 3, name: 'Commerce', status: 'offline', error: err.message });
  }
});

// REZ-Merchant Integration Endpoints
app.get('/api/merchant/pos', requireAuth, async (req, res) => {
  try {
    const posRes = await fetch(RTMN_SERVICES.merchantPOS + '/health');
    res.json({ status: 'online', service: 'REZ-Merchant POS', url: RTMN_SERVICES.merchantPOS });
  } catch (err) {
    res.json({ status: 'offline', service: 'REZ-Merchant POS', error: err.message });
  }
});

app.get('/api/merchant/orders', requireAuth, async (req, res) => {
  try {
    const ordersRes = await fetch(RTMN_SERVICES.merchantRestaurant + '/api/orders');
    const orders = await ordersRes.json();
    res.json({ orders, source: 'REZ-Merchant' });
  } catch (err) {
    res.json({ error: 'REZ-Merchant orders unavailable', details: err.message });
  }
});

app.post('/api/merchant/orders', requireAuth, async (req, res) => {
  try {
    const response = await fetch(RTMN_SERVICES.merchantRestaurant + '/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: 'Order creation failed' });
  }
});

app.get('/api/merchant/menu', requireAuth, async (req, res) => {
  try {
    const menuRes = await fetch(RTMN_SERVICES.merchantMenu + '/api/menu');
    const menu = await menuRes.json();
    res.json({ menu, source: 'REZ-Merchant' });
  } catch (err) {
    res.json({ error: 'REZ-Merchant menu unavailable', details: err.message });
  }
});

app.get('/api/merchant/payments', requireAuth, async (req, res) => {
  try {
    const payRes = await fetch(RTMN_SERVICES.merchantPayment + '/health');
    res.json({ status: 'online', service: 'REZ-Merchant Payment Gateway' });
  } catch (err) {
    res.json({ status: 'offline', service: 'REZ-Merchant Payment Gateway' });
  }
});

app.get('/api/merchant/loyalty', requireAuth, async (req, res) => {
  try {
    const loyaltyRes = await fetch(RTMN_SERVICES.merchantLoyalty + '/api/loyalty');
    res.json({ loyalty: await loyaltyRes.json(), source: 'REZ-Merchant' });
  } catch (err) {
    res.json({ error: 'Loyalty service unavailable' });
  }
});

app.get('/api/merchant/inventory', requireAuth, async (req, res) => {
  try {
    const invRes = await fetch(RTMN_SERVICES.merchantInventory + '/api/inventory');
    res.json({ inventory: await invRes.json(), source: 'REZ-Merchant' });
  } catch (err) {
    res.json({ error: 'Inventory service unavailable' });
  }
});

app.get('/api/merchant/staff', requireAuth, async (req, res) => {
  try {
    const staffRes = await fetch(RTMN_SERVICES.merchantStaff + '/api/staff');
    res.json({ staff: await staffRes.json(), source: 'REZ-Merchant' });
  } catch (err) {
    res.json({ error: 'Staff service unavailable' });
  }
});

app.get('/api/merchant/reservations', requireAuth, async (req, res) => {
  try {
    const resRes = await fetch(RTMN_SERVICES.merchantReservations + '/api/reservations');
    res.json({ reservations: await resRes.json(), source: 'REZ-Merchant' });
  } catch (err) {
    res.json({ error: 'Reservations service unavailable' });
  }
});

app.get('/api/merchant/genie', requireAuth, async (req, res) => {
  try {
    const genieRes = await fetch(RTMN_SERVICES.merchantGenie + '/health');
    res.json({ status: 'online', service: 'REZ-Merchant Genie' });
  } catch (err) {
    res.json({ status: 'offline', service: 'REZ-Merchant Genie' });
  }
});

app.post('/api/procure/ingredients', requireAuth, async (req, res) => {
  // Connect to Nexha for auto-procurement
  try {
    const response = await fetch(RTMN_SERVICES.procurement + '/api/rfq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: req.body.items, industry: INDUSTRY }),
    });
    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: 'Procurement service unavailable' });
  }
});

// ============================================
// LAYER 4: FINANCIAL
// ============================================

app.get('/api/layer/finance', requireAuth, async (req, res) => {
  try {
    const [walletRes, authRes] = await Promise.allSettled([
      fetch(RTMN_SERVICES.wallet + '/health'),
      fetch(RTMN_SERVICES.auth + '/health'),
    ]);
    
    res.json({
      layer: 4,
      name: 'Financial (RIDZA + AssetMind + RABTUL)',
      services: {
        wallet: walletRes.status === 'fulfilled' ? 'online' : 'offline',
        auth: authRes.status === 'fulfilled' ? 'online' : 'offline',
      },
      capabilities: ['Accounting', 'Banking', 'Lending', 'Insurance', 'Investment'],
    });
  } catch (err) {
    res.json({ layer: 4, name: 'Finance', status: 'offline', error: err.message });
  }
});

// ============================================
// LAYER 5: WORKFORCE
// ============================================

app.get('/api/layer/workforce', requireAuth, async (req, res) => {
  try {
    const corpRes = await fetch(RTMN_SERVICES.corpPerks + '/health');
    const corp = await corpRes.json();
    
    res.json({
      layer: 5,
      name: 'Workforce (CorpPerks + REZ Workspace)',
      services: { corpPerks: corp.status || 'online' },
      capabilities: ['HR', 'Recruitment', 'Collaboration', 'Learning'],
    });
  } catch (err) {
    res.json({ layer: 5, name: 'Workforce', status: 'offline', error: err.message });
  }
});

// ============================================
// LAYER 6: LEGAL & TRUST
// ============================================

app.get('/api/layer/legal', requireAuth, async (req, res) => {
  try {
    const [legalRes, trustRes] = await Promise.allSettled([
      fetch(RTMN_SERVICES.legal + '/health'),
      fetch(RTMN_SERVICES.trustScorer + '/health'),
    ]);
    
    res.json({
      layer: 6,
      name: 'Legal & Trust (LawGens)',
      services: {
        legal: legalRes.status === 'fulfilled' ? 'online' : 'offline',
        trustScorer: trustRes.status === 'fulfilled' ? 'online' : 'offline',
      },
      capabilities: ['Contracts', 'Compliance', 'Risk', 'Security'],
    });
  } catch (err) {
    res.json({ layer: 6, name: 'Legal', status: 'offline', error: err.message });
  }
});

// ============================================
// LAYER 7: PROPERTY
// ============================================

app.get('/api/layer/property', requireAuth, async (req, res) => {
  try {
    const [risnaRes, stayRes] = await Promise.allSettled([
      fetch(RTMN_SERVICES.risnaEstate + '/health'),
      fetch(RTMN_SERVICES.stayOwn + '/health'),
    ]);
    
    res.json({
      layer: 7,
      name: 'Property (RisnaEstate + StayOwn)',
      services: {
        risnaEstate: risnaRes.status === 'fulfilled' ? 'online' : 'offline',
        stayOwn: stayRes.status === 'fulfilled' ? 'online' : 'offline',
      },
      capabilities: ['Expansion', 'Property', 'Facility', 'Hospitality'],
    });
  } catch (err) {
    res.json({ layer: 7, name: 'Property', status: 'offline', error: err.message });
  }
});

// ============================================
// LAYER 8: HEALTH
// ============================================

app.get('/api/layer/health', requireAuth, async (req, res) => {
  try {
    const risaRes = await fetch(RTMN_SERVICES.risaCare + '/health');
    const risa = await risaRes.json();
    
    res.json({
      layer: 8,
      name: 'Health (RisaCare)',
      services: { risaCare: risa.status || 'online' },
      capabilities: ['Employee Health', 'Occupational', 'Mental Health'],
    });
  } catch (err) {
    res.json({ layer: 8, name: 'Health', status: 'offline', error: err.message });
  }
});

// ============================================
// LAYER 9: MOBILITY
// ============================================

app.get('/api/layer/mobility', requireAuth, async (req, res) => {
  try {
    const khairRes = await fetch(RTMN_SERVICES.khairMove + '/health');
    const khair = await khairRes.json();
    
    res.json({
      layer: 9,
      name: 'Mobility (KHAIRMOVE)',
      services: { khairMove: khair.status || 'online' },
      capabilities: ['Delivery', 'Employee Transport', 'Logistics'],
    });
  } catch (err) {
    res.json({ layer: 9, name: 'Mobility', status: 'offline', error: err.message });
  }
});

// ============================================
// LAYER 10: IDENTITY
// ============================================

app.get('/api/layer/identity', requireAuth, async (req, res) => {
  try {
    const corpidRes = await fetch(RTMN_SERVICES.corpid + '/health');
    const corpid = await corpidRes.json();
    
    res.json({
      layer: 10,
      name: 'Identity (CorpID)',
      services: { corpid: corpid.status || 'online' },
      capabilities: ['Human Identity', 'Business Identity', 'Supplier Identity', 'Agent Identity'],
    });
  } catch (err) {
    res.json({ layer: 10, name: 'Identity', status: 'offline', error: err.message });
  }
});

// ============================================
// LAYER 11: MEMORY
// ============================================

app.get('/api/layer/memory', requireAuth, async (req, res) => {
  try {
    const memoryRes = await fetch(RTMN_SERVICES.memory + '/health');
    const memory = await memoryRes.json();
    
    res.json({
      layer: 11,
      name: 'Memory (MemoryOS)',
      services: { memoryOS: memory.status || 'online' },
      capabilities: ['Customer Memory', 'Supplier Memory', 'Relationship Memory'],
    });
  } catch (err) {
    res.json({ layer: 11, name: 'Memory', status: 'offline', error: err.message });
  }
});

// ============================================
// LAYER 12: TWINS
// ============================================

app.get('/api/layer/twins', requireAuth, async (req, res) => {
  try {
    const twinRes = await fetch(RTMN_SERVICES.twinos + '/health');
    const twin = await twinRes.json();
    
    res.json({
      layer: 12,
      name: 'Twins (TwinOS Hub)',
      services: { twinosHub: twin.status || 'online' },
      twins: {
        restaurantTwin: Array.from(restaurantTwin.values()),
        menuTwin: Array.from(menuTwin.values()),
        orderTwin: Array.from(orderTwin.values()),
        kitchenTwin: Array.from(kitchenTwin.values()),
        tableTwin: Array.from(tableTwin.values()),
        customerTwin: Array.from(customerTwin.values()),
      },
    });
  } catch (err) {
    res.json({ layer: 12, name: 'Twins', status: 'offline', error: err.message });
  }
});

app.post('/api/twins/sync', requireAuth, async (req, res) => {
  try {
    await fetch(RTMN_SERVICES.twinos + '/api/twins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        twins: [...restaurantTwin.values(), ...menuTwin.values(), ...orderTwin.values()],
        industry: INDUSTRY,
        businessId: req.session.businessId,
      }),
    });
    res.json({ success: true, syncedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Twin sync failed' });
  }
});

// ============================================
// LAYER 13: AUTOMATION (FlowOS)
// ============================================

app.get('/api/layer/automation', requireAuth, async (req, res) => {
  try {
    const flowRes = await fetch(RTMN_SERVICES.flow + '/health');
    const flow = await flowRes.json();

    res.json({
      layer: 13,
      name: 'Automation (FlowOS)',
      services: { flowOS: flow.status || 'online' },
      capabilities: {
        workflows: true,
        approvalChains: true,
        businessProcesses: true,
        agentCoordination: true,
        triggers: ['on_order', 'on_payment', 'on_booking', 'on_customer'],
        templates: [
          'order_to_kitchen',
          'booking_confirmation',
          'customer_onboarding',
          'invoice_generation',
          'inventory_reorder',
        ],
      },
    });
  } catch (err) {
    res.json({ layer: 13, name: 'Automation', status: 'offline', error: err.message });
  }
});

app.post('/api/automation/workflows', requireAuth, async (req, res) => {
  try {
    const { workflowId, trigger, data } = req.body;

    // Execute workflow via FlowOS
    const flowRes = await fetch(RTMN_SERVICES.flow + '/api/workflows/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId, trigger, data }),
    });

    res.json({ success: true, executedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Workflow execution failed' });
  }
});

app.get('/api/automation/workflows', requireAuth, async (req, res) => {
  res.json({
    workflows: [
      { id: 'wf_001', name: 'Order to Kitchen', trigger: 'on_order', status: 'active' },
      { id: 'wf_002', name: 'Booking Confirmation', trigger: 'on_booking', status: 'active' },
      { id: 'wf_003', name: 'Customer Onboarding', trigger: 'on_customer', status: 'active' },
      { id: 'wf_004', name: 'Inventory Reorder', trigger: 'on_stock_low', status: 'active' },
      { id: 'wf_005', name: 'Payment Processing', trigger: 'on_payment', status: 'active' },
    ],
  });
});

// ============================================
// LAYER 14: AUTONOMOUS (SUTAR OS)
// ============================================

app.get('/api/layer/autonomous', requireAuth, async (req, res) => {
  try {
    const [sutarRes, goalRes, decisionRes] = await Promise.allSettled([
      fetch(RTMN_SERVICES.sutar + '/health'),
      fetch(RTMN_SERVICES.goalOS + '/health'),
      fetch(RTMN_SERVICES.decision + '/health'),
    ]);
    
    res.json({
      layer: 14,
      name: 'Autonomous (SUTAR OS)',
      services: {
        sutar: sutarRes.status === 'fulfilled' ? 'online' : 'offline',
        goalOS: goalRes.status === 'fulfilled' ? 'online' : 'offline',
        decisionEngine: decisionRes.status === 'fulfilled' ? 'online' : 'offline',
      },
      capabilities: ['Goal Management', 'Decision Engine', 'Negotiation', 'Contracts', 'Autonomous Execution'],
    });
  } catch (err) {
    res.json({ layer: 14, name: 'Autonomous', status: 'offline', error: err.message });
  }
});

app.post('/api/autonomous/goal', requireAuth, async (req, res) => {
  // Set autonomous goal
  try {
    const response = await fetch(RTMN_SERVICES.goalOS + '/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objective: req.body.objective, industry: INDUSTRY, businessId: req.session.businessId }),
    });
    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: 'Goal service unavailable' });
  }
});

// ============================================
// LAYER 15: CONSUMER NETWORK
// ============================================

app.get('/api/layer/network', requireAuth, async (req, res) => {
  try {
    const consumerRes = await fetch(RTMN_SERVICES.rezConsumer + '/health');
    const consumer = await consumerRes.json();
    
    res.json({
      layer: 15,
      name: 'Consumer Network (REZ Consumer + Axom)',
      services: { rezConsumer: consumer.status || 'online' },
      capabilities: ['Customers', 'Referrals', 'Communities', 'Events', 'Creators', 'Discovery'],
    });
  } catch (err) {
    res.json({ layer: 15, name: 'Consumer Network', status: 'offline', error: err.message });
  }
});

// ============================================
// ALL LAYERS STATUS
// ============================================

app.get('/api/layers', requireAuth, async (req, res) => {
  const layerEndpoints = [
    { layer: 1, name: 'Intelligence', endpoint: '/api/layer/intelligence' },
    { layer: 2, name: 'Customer Growth', endpoint: '/api/layer/customer-growth' },
    { layer: 3, name: 'Commerce', endpoint: '/api/layer/commerce' },
    { layer: 4, name: 'Finance', endpoint: '/api/layer/finance' },
    { layer: 5, name: 'Workforce', endpoint: '/api/layer/workforce' },
    { layer: 6, name: 'Legal', endpoint: '/api/layer/legal' },
    { layer: 7, name: 'Property', endpoint: '/api/layer/property' },
    { layer: 8, name: 'Health', endpoint: '/api/layer/health' },
    { layer: 9, name: 'Mobility', endpoint: '/api/layer/mobility' },
    { layer: 10, name: 'Identity', endpoint: '/api/layer/identity' },
    { layer: 11, name: 'Memory', endpoint: '/api/layer/memory' },
    { layer: 12, name: 'Twins', endpoint: '/api/layer/twins' },
    { layer: 13, name: 'Automation', endpoint: '/api/layer/automation' },
    { layer: 14, name: 'Autonomous', endpoint: '/api/layer/autonomous' },
    { layer: 15, name: 'Consumer Network', endpoint: '/api/layer/network' },
  ];
  
  const results = await Promise.allSettled(
    layerEndpoints.map(({ layer, name, endpoint }) =>
      fetch(`${req.protocol}://${req.get('host')}${endpoint}`)
        .then(r => r.json())
        .catch(() => ({ layer, name, status: 'error' }))
    )
  );
  
  res.json({
    industry: INDUSTRY,
    service: 'Restaurant AI Company',
    layers: results.map((r, i) => r.status === 'fulfilled' ? r.value : { layer: layerEndpoints[i].layer, name: layerEndpoints[i].name, status: 'error' }),
  });
});

// ============================================
// HEALTH
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Restaurant AI Company',
    industry: INDUSTRY,
    layers: 15,
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// START
// ============================================

initDatabase().catch(console.warn);
app.listen(PORT, () => {
  console.log('✅ hotel-os AI Company Platform running on port ' + PORT);
  console.log('📦 15 Layers: Intelligence, Growth, Commerce, Finance, Workforce, Legal, Property, Health, Mobility, Identity, Memory, Twins, Autonomous, Network');
});
