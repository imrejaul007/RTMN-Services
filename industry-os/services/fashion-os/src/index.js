/**
 * fashion-os AI Company Platform
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

const INDUSTRY = 'fashion';
const LAYERS_ENABLED = process.env.LAYERS ? process.env.LAYERS.split(',') : 'all';

// Service URLs for Layer Integration
const RTMN_SERVICES = {
  // Layer 1: Intelligence (HOJAI AI - 153 services)
  // Genie Services
  genie: process.env.GENIE_URL || 'http://localhost:4701',
  genieHousehold: process.env.GENIE_HOUSEHOLD_URL || 'http://localhost:4706',
  genieBusiness: process.env.GENIE_BUSINESS_URL || 'http://localhost:4707',
  genieProject: process.env.GENIE_PROJECT_URL || 'http://localhost:4708',
  genieMemory: process.env.GENIE_MEMORY_URL || 'http://localhost:4709',
  genieTwin: process.env.GENIE_TWIN_URL || 'http://localhost:4710',
  genieRelationship: process.env.GENIE_RELATIONSHIP_URL || 'http://localhost:4711',
  // CoPilot Services
  copilot: process.env.COPILOT_URL || 'http://localhost:4600',
  copilotBusiness: process.env.COPILOT_BUSINESS_URL || 'http://localhost:4601',
  copilotSales: process.env.COPILOT_SALES_URL || 'http://localhost:4602',
  copilotFinance: process.env.COPILOT_FINANCE_URL || 'http://localhost:4603',
  copilotHR: process.env.COPILOT_HR_URL || 'http://localhost:4604',
  // Agent Services
  agentMarketplace: process.env.AGENT_URL || 'http://localhost:4580',
  agentStream: process.env.AGENT_STREAM_URL || 'http://localhost:4581',
  // SUTAR OS
  sutarOS: process.env.SUTAR_URL || 'http://localhost:4140',
  sutarCore: process.env.SUTAR_CORE_URL || 'http://localhost:4141',
  // Industry AI
  hojaiIndustry: process.env.HOJAI_INDUSTRY_URL || 'http://localhost:4150',
  hojaiCommerce: process.env.HOJAI_COMMERCE_URL || 'http://localhost:4151',
  // Collaboration
  hojaiCollab: process.env.HOJAI_COLLAB_URL || 'http://localhost:4160',
  hojaiExpert: process.env.HOJAI_EXPERT_URL || 'http://localhost:4161',
  
  // Layer 2: Customer Growth (AdBazaar + REZ Consumer + Axom)
  // CRM & Customer
  crmHub: process.env.CRM_HUB_URL || 'http://localhost:4056',
  leadIntelligence: process.env.LEAD_INTELLIGENCE_URL || 'http://localhost:4057',

  // Ads & Campaigns
  adsApi: process.env.ADS_API_URL || 'http://localhost:4060',
  adAi: process.env.AD_AI_URL || 'http://localhost:4061',
  aiCampaignBuilder: process.env.CAMPAIGN_BUILDER_URL || 'http://localhost:4062',
  dspPortal: process.env.DSP_URL || 'http://localhost:4063',
  programmaticBidding: process.env.PROGRAMMATIC_URL || 'http://localhost:4064',
  emailCampaign: process.env.EMAIL_CAMPAIGN_URL || 'http://localhost:4065',

  // Loyalty & Rewards
  loyaltyService: process.env.LOYALTY_URL || 'http://localhost:4070',
  anniversaryRewards: process.env.ANNIVERSARY_URL || 'http://localhost:4071',
  birthdayRewards: process.env.BIRTHDAY_URL || 'http://localhost:4072',
  gamification: process.env.GAMIFICATION_URL || 'http://localhost:4073',
  referralGraph: process.env.REFERRAL_URL || 'http://localhost:4074',

  // Creator & Influencer
  creatorStudio: process.env.CREATOR_URL || 'http://localhost:4080',
  creatorCommerce: process.env.CREATOR_COMMERCE_URL || 'http://localhost:4081',
  ugcManagement: process.env.UGC_URL || 'http://localhost:4082',

  // Analytics & Intelligence
  marketingAnalytics: process.env.MARKETING_ANALYTICS_URL || 'http://localhost:4090',
  mediaAnalytics: process.env.MEDIA_ANALYTICS_URL || 'http://localhost:4091',
  intelligenceBridge: process.env.INTELLIGENCE_BRIDGE_URL || 'http://localhost:4092',
  revenueIntelligence: process.env.REVENUE_INTEL_URL || 'http://localhost:4093',

  // DOOH & Display
  doohService: process.env.DOOH_URL || 'http://localhost:4100',
  doohSdk: process.env.DOOH_SDK_URL || 'http://localhost:4101',
  videoAds: process.env.VIDEO_ADS_URL || 'http://localhost:4102',

  // Chat & Widgets
  liveChat: process.env.LIVE_CHAT_URL || 'http://localhost:4110',
  feedbackService: process.env.FEEDBACK_URL || 'http://localhost:4111',

  // BuzzLocal & Community
  buzzLocal: process.env.BUZZLOCAL_URL || 'http://localhost:4020',

  // Intent & Audience
  intentExchange: process.env.INTENT_URL || 'http://localhost:4120',
  audienceMarketplace: process.env.AUDIENCE_URL || 'http://localhost:4121',
  
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
  
  // Layer 4: Financial (RABTUL - 112 services)
  // Auth & Identity
  auth: process.env.AUTH_URL || 'http://localhost:4002',
  // Wallet & Payments
  wallet: process.env.WALLET_URL || 'http://localhost:4004',
  walletService: process.env.WALLET_SERVICE_URL || 'http://localhost:4005',
  paymentGateway: process.env.PAYMENT_GATEWAY_URL || 'http://localhost:4006',
  // Accounting
  accounting: process.env.ACCOUNTING_URL || 'http://localhost:4010',
  expenseService: process.env.EXPENSE_URL || 'http://localhost:4011',
  invoiceService: process.env.INVOICE_URL || 'http://localhost:4012',
  // Lending & Credit
  lending: process.env.LENDING_URL || 'http://localhost:4020',
  creditService: process.env.CREDIT_URL || 'http://localhost:4021',
  // Procurement
  procurementPayment: process.env.PROCUREMENT_PAYMENT_URL || 'http://localhost:4007',
  // Contract
  contractMgmt: process.env.CONTRACT_URL || 'http://localhost:4030',
  // Distribution
  distributionOS: process.env.DISTRIBUTION_URL || 'http://localhost:4040',
  // GraphQL Federation
  graphqlFed: process.env.GRAPHQL_URL || 'http://localhost:4000',
  // Event Bus
  eventBus: process.env.EVENT_BUS_URL || 'http://localhost:4510',
  // Storage
  fileStorage: process.env.STORAGE_URL || 'http://localhost:4050',
  // Ecosystem
  ecosystemConnector: process.env.ECOSYSTEM_URL || 'http://localhost:4399',
  
  // Layer 5: Workforce (CorpPerks - 43 services)
  corpPerks: process.env.CORPPERKS_URL || 'http://localhost:4450',
  // HR Services
  hrService: process.env.HR_SERVICE_URL || 'http://localhost:4451',
  onboardingService: process.env.ONBOARDING_URL || 'http://localhost:4452',
  payrollService: process.env.PAYROLL_URL || 'http://localhost:4453',
  attendanceService: process.env.ATTENDANCE_URL || 'http://localhost:4454',
  leaveService: process.env.LEAVE_URL || 'http://localhost:4455',
  // Recruitment
  atsService: process.env.ATS_URL || 'http://localhost:4460',
  talentPool: process.env.TALENT_URL || 'http://localhost:4461',
  // Collaboration
  calendarService: process.env.CALENDAR_URL || 'http://localhost:4470',
  meetingService: process.env.MEETING_URL || 'http://localhost:4471',
  documentService: process.env.DOCUMENT_URL || 'http://localhost:4472',
  // Learning
  lmsService: process.env.LMS_URL || 'http://localhost:4480',
  okrService: process.env.OKR_URL || 'http://localhost:4481',
  insightService: process.env.INSIGHT_URL || 'http://localhost:4482',
  
  // Layer 6: Legal & Trust (LawGens - 4 services)
  legal: process.env.LEGAL_URL || 'http://localhost:5035',
  trustScorer: process.env.TRUST_URL || 'http://localhost:4180',
  contractService: process.env.CONTRACT_SERVICE_URL || 'http://localhost:5036',
  complianceService: process.env.COMPLIANCE_URL || 'http://localhost:5037',
  
  // Layer 7: Property (RisnaEstate - 10 services + StayOwn - 37 services)
  risnaEstate: process.env.RISNA_URL || 'http://localhost:4300',
  propertyService: process.env.PROPERTY_SERVICE_URL || 'http://localhost:4301',
  listingService: process.env.LISTING_URL || 'http://localhost:4302',
  leadService: process.env.LEAD_SERVICE_URL || 'http://localhost:4303',
  agentService: process.env.AGENT_SERVICE_URL || 'http://localhost:4304',
  // StayOwn-Hospitality
  stayOwn: process.env.STAYOWN_URL || 'http://localhost:6000',
  stayOwnPMS: process.env.STAYOWN_PMS_URL || 'http://localhost:6001',
  bookingEngine: process.env.BOOKING_ENGINE_URL || 'http://localhost:6002',
  guestApp: process.env.GUEST_APP_URL || 'http://localhost:6003',
  housekeepingService: process.env.HOUSEKEEPING_URL || 'http://localhost:6004',
  
  // Layer 8: Health (RisaCare - 31 services)
  risaCare: process.env.RISACARE_URL || 'http://localhost:7000',
  healthTwin: process.env.HEALTH_TWIN_URL || 'http://localhost:7001',
  consultationCopilot: process.env.CONSULTATION_URL || 'http://localhost:7002',
  wellnessService: process.env.WELLNESS_URL || 'http://localhost:7003',
  healthInsurance: process.env.HEALTH_INSURANCE_URL || 'http://localhost:7004',
  familyCoordination: process.env.FAMILY_COORD_URL || 'http://localhost:7005',
  
  // Layer 9: Mobility (KHAIRMOVE - 19 services)
  khairMove: process.env.KHAIRMOVE_URL || 'http://localhost:4500',
  deliveryService: process.env.DELIVERY_URL || 'http://localhost:4501',
  fleetService: process.env.FLEET_URL || 'http://localhost:4502',
  rideService: process.env.RIDE_URL || 'http://localhost:4503',
  logisticsService: process.env.LOGISTICS_URL || 'http://localhost:4504',
  airzyService: process.env.AIRZY_URL || 'http://localhost:4505',
  
  // Layer 10: Identity (CorpID)
  corpid: process.env.CORPID_URL || 'http://localhost:4702',
  
  // Layer 11: Memory (MemoryOS)
  memory: process.env.MEMORY_URL || 'http://localhost:4703',
  
  // Layer 12: Twins (TwinOS Hub)
  twinos: process.env.TWINOS_URL || 'http://localhost:4705',

  // Layer 13: Automation (FlowOS)
  flow: process.env.FLOW_URL || 'http://localhost:4200',

  // Layer 14: Autonomous (SUTAR OS + Karma Foundation)
  sutar: process.env.SUTAR_URL || 'http://localhost:4140',
  goalOS: process.env.GOAL_URL || 'http://localhost:4242',
  decision: process.env.DECISION_URL || 'http://localhost:4240',
  negotiation: process.env.NEGOTIATION_URL || 'http://localhost:4191',
  karmaFoundation: process.env.KARMA_URL || 'http://localhost:4250',

  // Layer 15: Consumer (REZ Consumer + Axom)
  rezConsumer: process.env.REZ_CONSUMER_URL || 'http://localhost:3000',
  axom: process.env.AXOM_URL || 'http://localhost:4000',
  buzzLocal: process.env.BUZZLOCAL_URL || 'http://localhost:4020',

  // Additional Services
  // StayOwn-Hospitality (Layer 7 - PMS)
  stayOwnPMS: process.env.STAYOWN_PMS_URL || 'http://localhost:6000',

  // RidZa (Layer 4 - Financial Services)
  ridZa: process.env.RIDZA_URL || 'http://localhost:4255',
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
// LAYER 1: INTELLIGENCE (HOJAI AI - 153 services)
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
      name: 'Intelligence (HOJAI AI - Full Suite)',
      services: {
        // Genie Services
        genie: genieRes.status === 'fulfilled' ? 'online' : 'offline',
        genieHousehold: RTMN_SERVICES.genieHousehold,
        genieBusiness: RTMN_SERVICES.genieBusiness,
        genieProject: RTMN_SERVICES.genieProject,
        genieMemory: RTMN_SERVICES.genieMemory,
        genieTwin: RTMN_SERVICES.genieTwin,
        genieRelationship: RTMN_SERVICES.genieRelationship,
        // CoPilot Services
        copilot: copilotRes.status === 'fulfilled' ? 'online' : 'offline',
        copilotBusiness: RTMN_SERVICES.copilotBusiness,
        copilotSales: RTMN_SERVICES.copilotSales,
        copilotFinance: RTMN_SERVICES.copilotFinance,
        copilotHR: RTMN_SERVICES.copilotHR,
        // Agent Services
        agentMarketplace: agentsRes.status === 'fulfilled' ? 'online' : 'offline',
        agentStream: RTMN_SERVICES.agentStream,
        // SUTAR OS
        sutarOS: RTMN_SERVICES.sutarOS,
        sutarCore: RTMN_SERVICES.sutarCore,
        // Industry AI
        hojaiIndustry: RTMN_SERVICES.hojaiIndustry,
        hojaiCommerce: RTMN_SERVICES.hojaiCommerce,
        // Collaboration
        hojaiCollab: RTMN_SERVICES.hojaiCollab,
        hojaiExpert: RTMN_SERVICES.hojaiExpert,
      },
      capabilities: [
        'Genie AI Chat', 'Business Copilot', 'Agent Marketplace',
        'Personal AI', 'Business AI', 'Project AI', 'Memory AI',
        'Twin AI', 'Relationship AI', 'Sales Copilot', 'Finance Copilot', 'HR Copilot',
        'Industry AI', 'Commerce AI', 'Expert OS', 'Collaboration'
      ],
      aiAgents: ['AI Receptionist', 'AI Chef', 'AI Waiter', 'AI Manager', 'AI Procurement Agent', 'AI Sales Rep', 'AI Recruiter', 'AI Support', 'AI Finance Analyst'],
    });
  } catch (err) {
    res.json({ layer: 1, name: 'Intelligence', status: 'offline', error: err.message });
  }
});

app.post('/api/ai/chat', requireAuth, async (req, res) => {
  try {
    const response = await fetch(RTMN_SERVICES.genie + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: req.body.prompt, context: { industry: INDUSTRY } }),
    });
    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

app.get('/api/ai/agents', requireAuth, async (req, res) => {
  try {
    const agentsRes = await fetch(RTMN_SERVICES.agentMarketplace + '/api/agents');
    res.json(await agentsRes.json());
  } catch (err) {
    res.json({ error: 'Agent marketplace unavailable' });
  }
});

app.get('/api/ai/copilot', requireAuth, async (req, res) => {
  try {
    const copilotRes = await fetch(RTMN_SERVICES.copilot + '/api/copilot');
    res.json(await copilotRes.json());
  } catch (err) {
    res.json({ error: 'Copilot unavailable' });
  }
});

// ============================================
// LAYER 2: CUSTOMER GROWTH (AdBazaar + REZ Consumer + Axom)
// ============================================

app.get('/api/layer/customer-growth', requireAuth, async (req, res) => {
  try {
    const [crmRes, loyaltyRes, adsRes] = await Promise.allSettled([
      fetch(RTMN_SERVICES.crmHub + '/api/health'),
      fetch(RTMN_SERVICES.loyaltyService + '/health'),
      fetch(RTMN_SERVICES.adsApi + '/health'),
    ]);

    res.json({
      layer: 2,
      name: 'Customer Growth (AdBazaar Full Suite)',
      services: {
        // CRM & Customer
        crmHub: crmRes.status === 'fulfilled' ? 'online' : 'offline',
        leadIntelligence: RTMN_SERVICES.leadIntelligence,
        // Ads & Campaigns
        adsApi: adsRes.status === 'fulfilled' ? 'online' : 'offline',
        adAi: RTMN_SERVICES.adAi,
        aiCampaignBuilder: RTMN_SERVICES.aiCampaignBuilder,
        dspPortal: RTMN_SERVICES.dspPortal,
        programmaticBidding: RTMN_SERVICES.programmaticBidding,
        emailCampaign: RTMN_SERVICES.emailCampaign,
        // Loyalty & Rewards
        loyaltyService: loyaltyRes.status === 'fulfilled' ? 'online' : 'offline',
        anniversaryRewards: RTMN_SERVICES.anniversaryRewards,
        birthdayRewards: RTMN_SERVICES.birthdayRewards,
        gamification: RTMN_SERVICES.gamification,
        referralGraph: RTMN_SERVICES.referralGraph,
        // Creator & Influencer
        creatorStudio: RTMN_SERVICES.creatorStudio,
        creatorCommerce: RTMN_SERVICES.creatorCommerce,
        ugcManagement: RTMN_SERVICES.ugcManagement,
        // Analytics & Intelligence
        marketingAnalytics: RTMN_SERVICES.marketingAnalytics,
        mediaAnalytics: RTMN_SERVICES.mediaAnalytics,
        intelligenceBridge: RTMN_SERVICES.intelligenceBridge,
        revenueIntelligence: RTMN_SERVICES.revenueIntelligence,
        // DOOH & Display
        doohService: RTMN_SERVICES.doohService,
        doohSdk: RTMN_SERVICES.doohSdk,
        videoAds: RTMN_SERVICES.videoAds,
        // Chat & Widgets
        liveChat: RTMN_SERVICES.liveChat,
        feedbackService: RTMN_SERVICES.feedbackService,
        // Community
        buzzLocal: RTMN_SERVICES.buzzLocal,
        // Intent & Audience
        intentExchange: RTMN_SERVICES.intentExchange,
        audienceMarketplace: RTMN_SERVICES.audienceMarketplace,
      },
      capabilities: [
        'Customer Acquisition', 'Lead Generation', 'CRM',
        'Ads & Campaigns', 'Programmatic Bidding', 'Email Marketing',
        'Loyalty Programs', 'Rewards', 'Gamification', 'Referrals',
        'Creator Network', 'UGC Management',
        'Marketing Analytics', 'Media Analytics', 'Revenue Intelligence',
        'DOOH', 'Video Ads',
        'Live Chat', 'Feedback',
        'Community', 'Local Discovery',
        'Intent Exchange', 'Audience Targeting'
      ],
    });
  } catch (err) {
    res.json({ layer: 2, name: 'Customer Growth', status: 'offline', error: err.message });
  }
});

// AdBazaar - CRM Endpoints
app.get('/api/crm/contacts', requireAuth, async (req, res) => {
  try {
    const contactsRes = await fetch(RTMN_SERVICES.crmHub + '/api/contacts');
    res.json(await contactsRes.json());
  } catch (err) {
    res.status(500).json({ error: 'CRM unavailable' });
  }
});

app.post('/api/crm/contacts', requireAuth, async (req, res) => {
  try {
    const response = await fetch(RTMN_SERVICES.crmHub + '/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: 'CRM contact creation failed' });
  }
});

app.get('/api/crm/leads', requireAuth, async (req, res) => {
  try {
    const leadsRes = await fetch(RTMN_SERVICES.leadIntelligence + '/api/leads');
    res.json(await leadsRes.json());
  } catch (err) {
    res.json({ error: 'Lead intelligence unavailable' });
  }
});

// AdBazaar - Ads Endpoints
app.get('/api/ads/campaigns', requireAuth, async (req, res) => {
  try {
    const campaignsRes = await fetch(RTMN_SERVICES.adsApi + '/api/campaigns');
    res.json(await campaignsRes.json());
  } catch (err) {
    res.json({ error: 'Ads API unavailable' });
  }
});

app.post('/api/ads/campaigns', requireAuth, async (req, res) => {
  try {
    const response = await fetch(RTMN_SERVICES.adsApi + '/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: 'Campaign creation failed' });
  }
});

app.get('/api/ads/budget', requireAuth, async (req, res) => {
  res.json({ budget: 0, spent: 0, remaining: 0 });
});

app.post('/api/ads/ai-optimize', requireAuth, async (req, res) => {
  try {
    const response = await fetch(RTMN_SERVICES.adAi + '/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: 'AI optimization failed' });
  }
});

// AdBazaar - Loyalty Endpoints
app.get('/api/loyalty/points', requireAuth, async (req, res) => {
  try {
    const pointsRes = await fetch(RTMN_SERVICES.loyaltyService + '/api/points');
    res.json(await pointsRes.json());
  } catch (err) {
    res.json({ error: 'Loyalty service unavailable' });
  }
});

app.post('/api/loyalty/points', requireAuth, async (req, res) => {
  try {
    const response = await fetch(RTMN_SERVICES.loyaltyService + '/api/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: 'Points update failed' });
  }
});

app.get('/api/loyalty/rewards', requireAuth, async (req, res) => {
  try {
    const [annivRes, bdayRes] = await Promise.allSettled([
      fetch(RTMN_SERVICES.anniversaryRewards + '/api/rewards'),
      fetch(RTMN_SERVICES.birthdayRewards + '/api/rewards'),
    ]);
    res.json({
      anniversary: annivRes.status === 'fulfilled' ? await annivRes.value.json() : 'offline',
      birthday: bdayRes.status === 'fulfilled' ? await bdayRes.value.json() : 'offline',
    });
  } catch (err) {
    res.json({ error: 'Rewards unavailable' });
  }
});

app.get('/api/loyalty/gamification', requireAuth, async (req, res) => {
  try {
    const gamRes = await fetch(RTMN_SERVICES.gamification + '/api/games');
    res.json(await gamRes.json());
  } catch (err) {
    res.json({ error: 'Gamification unavailable' });
  }
});

app.get('/api/loyalty/referrals', requireAuth, async (req, res) => {
  try {
    const refRes = await fetch(RTMN_SERVICES.referralGraph + '/api/referrals');
    res.json(await refRes.json());
  } catch (err) {
    res.json({ error: 'Referral graph unavailable' });
  }
});

// AdBazaar - Creator Endpoints
app.get('/api/creator/campaigns', requireAuth, async (req, res) => {
  try {
    const creatorRes = await fetch(RTMN_SERVICES.creatorStudio + '/api/campaigns');
    res.json(await creatorRes.json());
  } catch (err) {
    res.json({ error: 'Creator studio unavailable' });
  }
});

app.get('/api/creator/influencers', requireAuth, async (req, res) => {
  try {
    const infRes = await fetch(RTMN_SERVICES.creatorStudio + '/api/influencers');
    res.json(await infRes.json());
  } catch (err) {
    res.json({ error: 'Influencer data unavailable' });
  }
});

app.get('/api/creator/commerce', requireAuth, async (req, res) => {
  try {
    const commerceRes = await fetch(RTMN_SERVICES.creatorCommerce + '/api/products');
    res.json(await commerceRes.json());
  } catch (err) {
    res.json({ error: 'Creator commerce unavailable' });
  }
});

app.get('/api/creator/ugc', requireAuth, async (req, res) => {
  try {
    const ugcRes = await fetch(RTMN_SERVICES.ugcManagement + '/api/content');
    res.json(await ugcRes.json());
  } catch (err) {
    res.json({ error: 'UGC management unavailable' });
  }
});

// AdBazaar - Analytics Endpoints
app.get('/api/analytics/marketing', requireAuth, async (req, res) => {
  try {
    const analyticsRes = await fetch(RTMN_SERVICES.marketingAnalytics + '/api/dashboard');
    res.json(await analyticsRes.json());
  } catch (err) {
    res.json({ error: 'Marketing analytics unavailable' });
  }
});

app.get('/api/analytics/media', requireAuth, async (req, res) => {
  try {
    const mediaRes = await fetch(RTMN_SERVICES.mediaAnalytics + '/api/insights');
    res.json(await mediaRes.json());
  } catch (err) {
    res.json({ error: 'Media analytics unavailable' });
  }
});

app.get('/api/analytics/revenue', requireAuth, async (req, res) => {
  try {
    const revenueRes = await fetch(RTMN_SERVICES.revenueIntelligence + '/api/report');
    res.json(await revenueRes.json());
  } catch (err) {
    res.json({ error: 'Revenue intelligence unavailable' });
  }
});

// AdBazaar - DOOH Endpoints
app.get('/api/dooh/screens', requireAuth, async (req, res) => {
  try {
    const screensRes = await fetch(RTMN_SERVICES.doohService + '/api/screens');
    res.json(await screensRes.json());
  } catch (err) {
    res.json({ error: 'DOOH service unavailable' });
  }
});

app.get('/api/dooh/campaigns', requireAuth, async (req, res) => {
  try {
    const campaignsRes = await fetch(RTMN_SERVICES.doohService + '/api/campaigns');
    res.json(await campaignsRes.json());
  } catch (err) {
    res.json({ error: 'DOOH campaigns unavailable' });
  }
});

app.get('/api/dooh/video-ads', requireAuth, async (req, res) => {
  try {
    const videoRes = await fetch(RTMN_SERVICES.videoAds + '/api/ads');
    res.json(await videoRes.json());
  } catch (err) {
    res.json({ error: 'Video ads unavailable' });
  }
});

// AdBazaar - Chat & Widgets
app.get('/api/chat/widget', requireAuth, async (req, res) => {
  res.json({
    widgetId: 'chat-widget',
    embedUrl: RTMN_SERVICES.liveChat + '/widget.js',
    config: { position: 'bottom-right', theme: 'light' }
  });
});

app.post('/api/chat/message', requireAuth, async (req, res) => {
  try {
    const response = await fetch(RTMN_SERVICES.liveChat + '/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: 'Chat message failed' });
  }
});

app.get('/api/feedback', requireAuth, async (req, res) => {
  try {
    const feedbackRes = await fetch(RTMN_SERVICES.feedbackService + '/api/feedback');
    res.json(await feedbackRes.json());
  } catch (err) {
    res.json({ error: 'Feedback service unavailable' });
  }
});

// AdBazaar - Intent & Audience
app.get('/api/audience/targets', requireAuth, async (req, res) => {
  try {
    const audienceRes = await fetch(RTMN_SERVICES.audienceMarketplace + '/api/targets');
    res.json(await audienceRes.json());
  } catch (err) {
    res.json({ error: 'Audience marketplace unavailable' });
  }
});

app.get('/api/intent/signals', requireAuth, async (req, res) => {
  try {
    const intentRes = await fetch(RTMN_SERVICES.intentExchange + '/api/signals');
    res.json(await intentRes.json());
  } catch (err) {
    res.json({ error: 'Intent exchange unavailable' });
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
// LAYER 4: FINANCIAL (RABTUL - 112 services)
// ============================================

app.get('/api/layer/finance', requireAuth, async (req, res) => {
  try {
    const [walletRes, authRes] = await Promise.allSettled([
      fetch(RTMN_SERVICES.wallet + '/health'),
      fetch(RTMN_SERVICES.auth + '/health'),
    ]);

    res.json({
      layer: 4,
      name: 'Financial (RABTUL Full Suite - 112 services)',
      services: {
        // Auth & Identity
        auth: authRes.status === 'fulfilled' ? 'online' : 'offline',
        // Wallet & Payments
        wallet: walletRes.status === 'fulfilled' ? 'online' : 'offline',
        walletService: RTMN_SERVICES.walletService,
        paymentGateway: RTMN_SERVICES.paymentGateway,
        // Accounting
        accounting: RTMN_SERVICES.accounting,
        expenseService: RTMN_SERVICES.expenseService,
        invoiceService: RTMN_SERVICES.invoiceService,
        // Lending & Credit
        lending: RTMN_SERVICES.lending,
        creditService: RTMN_SERVICES.creditService,
        // Procurement
        procurementPayment: RTMN_SERVICES.procurementPayment,
        // Contract
        contractMgmt: RTMN_SERVICES.contractMgmt,
        // Distribution
        distributionOS: RTMN_SERVICES.distributionOS,
        // GraphQL
        graphqlFed: RTMN_SERVICES.graphqlFed,
        // Event Bus
        eventBus: RTMN_SERVICES.eventBus,
        // Storage
        fileStorage: RTMN_SERVICES.fileStorage,
        // Ecosystem
        ecosystemConnector: RTMN_SERVICES.ecosystemConnector,
      },
      capabilities: [
        'Authentication', 'Wallet', 'Payments', 'Accounting', 'Expenses',
        'Invoicing', 'Lending', 'Credit', 'Procurement', 'Contract Management',
        'Distribution', 'GraphQL API', 'Event Bus', 'File Storage', 'Ecosystem Integration'
      ],
    });
  } catch (err) {
    res.json({ layer: 4, name: 'Finance', status: 'offline', error: err.message });
  }
});

// Financial Endpoints
app.get('/api/finance/accounting', requireAuth, async (req, res) => {
  try {
    const accRes = await fetch(RTMN_SERVICES.accounting + '/api/accounts');
    res.json(await accRes.json());
  } catch (err) {
    res.json({ error: 'Accounting service unavailable' });
  }
});

app.get('/api/finance/wallet', requireAuth, async (req, res) => {
  try {
    const walletRes = await fetch(RTMN_SERVICES.wallet + '/api/balance');
    res.json(await walletRes.json());
  } catch (err) {
    res.json({ error: 'Wallet service unavailable' });
  }
});

app.post('/api/finance/payment', requireAuth, async (req, res) => {
  try {
    const response = await fetch(RTMN_SERVICES.paymentGateway + '/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: 'Payment failed' });
  }
});

// ============================================
// LAYER 5: WORKFORCE (CorpPerks - 43 services)
// ============================================

app.get('/api/layer/workforce', requireAuth, async (req, res) => {
  try {
    const corpRes = await fetch(RTMN_SERVICES.corpPerks + '/health');

    res.json({
      layer: 5,
      name: 'Workforce (CorpPerks Full Suite - 43 services)',
      services: {
        corpPerks: RTMN_SERVICES.corpPerks,
        // HR Services
        hrService: RTMN_SERVICES.hrService,
        onboardingService: RTMN_SERVICES.onboardingService,
        payrollService: RTMN_SERVICES.payrollService,
        attendanceService: RTMN_SERVICES.attendanceService,
        leaveService: RTMN_SERVICES.leaveService,
        // Recruitment
        atsService: RTMN_SERVICES.atsService,
        talentPool: RTMN_SERVICES.talentPool,
        // Collaboration
        calendarService: RTMN_SERVICES.calendarService,
        meetingService: RTMN_SERVICES.meetingService,
        documentService: RTMN_SERVICES.documentService,
        // Learning
        lmsService: RTMN_SERVICES.lmsService,
        okrService: RTMN_SERVICES.okrService,
        insightService: RTMN_SERVICES.insightService,
      },
      capabilities: [
        'HR Management', 'Onboarding', 'Payroll', 'Attendance', 'Leave Management',
        'ATS', 'Talent Pool', 'Calendar', 'Meetings', 'Documents',
        'LMS', 'OKR', 'Insights'
      ],
    });
  } catch (err) {
    res.json({ layer: 5, name: 'Workforce', status: 'offline', error: err.message });
  }
});

// ============================================
// LAYER 6: LEGAL & TRUST (LawGens - 4 services)
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
        contractService: RTMN_SERVICES.contractService,
        complianceService: RTMN_SERVICES.complianceService,
      },
      capabilities: ['Contracts', 'Compliance', 'Risk', 'Security', 'Due Diligence', 'Verification'],
    });
  } catch (err) {
    res.json({ layer: 6, name: 'Legal', status: 'offline', error: err.message });
  }
});

// ============================================
// LAYER 7: PROPERTY (RisnaEstate + StayOwn)
// ============================================

app.get('/api/layer/property', requireAuth, async (req, res) => {
  try {
    const [risnaRes, stayRes] = await Promise.allSettled([
      fetch(RTMN_SERVICES.risnaEstate + '/health'),
      fetch(RTMN_SERVICES.stayOwn + '/health'),
    ]);

    res.json({
      layer: 7,
      name: 'Property (RisnaEstate - 10 + StayOwn - 37)',
      services: {
        risnaEstate: risnaRes.status === 'fulfilled' ? 'online' : 'offline',
        propertyService: RTMN_SERVICES.propertyService,
        listingService: RTMN_SERVICES.listingService,
        leadService: RTMN_SERVICES.leadService,
        agentService: RTMN_SERVICES.agentService,
        // StayOwn
        stayOwn: stayRes.status === 'fulfilled' ? 'online' : 'offline',
        stayOwnPMS: RTMN_SERVICES.stayOwnPMS,
        bookingEngine: RTMN_SERVICES.bookingEngine,
        guestApp: RTMN_SERVICES.guestApp,
        housekeepingService: RTMN_SERVICES.housekeepingService,
      },
      capabilities: ['Expansion', 'Property Management', 'Listings', 'Lead Management', 'Agent Network', 'PMS', 'Booking Engine', 'Guest App', 'Housekeeping'],
    });
  } catch (err) {
    res.json({ layer: 7, name: 'Property', status: 'offline', error: err.message });
  }
});

// ============================================
// LAYER 8: HEALTH (RisaCare - 31 services)
// ============================================

app.get('/api/layer/health', requireAuth, async (req, res) => {
  try {
    const risaRes = await fetch(RTMN_SERVICES.risaCare + '/health');

    res.json({
      layer: 8,
      name: 'Health (RisaCare - 31 services)',
      services: {
        risaCare: RTMN_SERVICES.risaCare,
        healthTwin: RTMN_SERVICES.healthTwin,
        consultationCopilot: RTMN_SERVICES.consultationCopilot,
        wellnessService: RTMN_SERVICES.wellnessService,
        healthInsurance: RTMN_SERVICES.healthInsurance,
        familyCoordination: RTMN_SERVICES.familyCoordination,
      },
      capabilities: ['Employee Health', 'Health Twin', 'Consultation Copilot', 'Wellness', 'Insurance', 'Family Coordination'],
    });
  } catch (err) {
    res.json({ layer: 8, name: 'Health', status: 'offline', error: err.message });
  }
});

// ============================================
// LAYER 9: MOBILITY (KHAIRMOVE - 19 services)
// ============================================

app.get('/api/layer/mobility', requireAuth, async (req, res) => {
  try {
    const khairRes = await fetch(RTMN_SERVICES.khairMove + '/health');

    res.json({
      layer: 9,
      name: 'Mobility (KHAIRMOVE - 19 services)',
      services: {
        khairMove: RTMN_SERVICES.khairMove,
        deliveryService: RTMN_SERVICES.deliveryService,
        fleetService: RTMN_SERVICES.fleetService,
        rideService: RTMN_SERVICES.rideService,
        logisticsService: RTMN_SERVICES.logisticsService,
        airzyService: RTMN_SERVICES.airzyService,
      },
      capabilities: ['Delivery', 'Fleet Management', 'Ride Hailing', 'Logistics', 'Airzy (Air Transport)'],
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
      name: 'Autonomous (SUTAR OS + Karma Foundation)',
      services: {
        sutar: sutarRes.status === 'fulfilled' ? 'online' : 'offline',
        goalOS: goalRes.status === 'fulfilled' ? 'online' : 'offline',
        decisionEngine: decisionRes.status === 'fulfilled' ? 'online' : 'offline',
        karmaFoundation: RTMN_SERVICES.karmaFoundation,
      },
      capabilities: ['Goal Management', 'Decision Engine', 'Negotiation', 'Contracts', 'Autonomous Execution', 'Agent Economy', 'Karma Scoring'],
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
      name: 'Consumer Network (REZ Consumer + Axom + BuzzLocal)',
      services: {
        rezConsumer: consumer.status || 'online',
        axom: RTMN_SERVICES.axom,
        buzzLocal: RTMN_SERVICES.buzzLocal,
      },
      capabilities: ['Customers', 'Referrals', 'Communities', 'Events', 'Creators', 'Discovery', 'Local Business', 'Reviews'],
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
  console.log('✅ fashion-os AI Company Platform running on port ' + PORT);
  console.log('📦 15 Layers: Intelligence, Growth, Commerce, Finance, Workforce, Legal, Property, Health, Mobility, Identity, Memory, Twins, Autonomous, Network');
});
