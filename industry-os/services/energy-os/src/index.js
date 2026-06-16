/**
 * Energy OS - AI Company Platform
 *
 * Energy OS with all 15 layers of RTMN ecosystem.
 *
 * Port: 5100
 * Industry: Energy
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5100;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// ============================================
// LAYER CONFIGURATION
// ============================================

const INDUSTRY = 'energy';
const LAYERS_ENABLED = process.env.LAYERS ? process.env.LAYERS.split(',') : 'all';

// Service URLs for Layer Integration
const RTMN_SERVICES = {
  // Layer 1: Intelligence (HOJAI AI - 153 services)
  genie: process.env.GENIE_URL || 'http://localhost:4701',
  genieHousehold: process.env.GENIE_HOUSEHOLD_URL || 'http://localhost:4706',
  genieBusiness: process.env.GENIE_BUSINESS_URL || 'http://localhost:4707',
  genieProject: process.env.GENIE_PROJECT_URL || 'http://localhost:4708',
  genieMemory: process.env.GENIE_MEMORY_URL || 'http://localhost:4709',
  genieTwin: process.env.GENIE_TWIN_URL || 'http://localhost:4710',
  genieRelationship: process.env.GENIE_RELATIONSHIP_URL || 'http://localhost:4711',
  copilot: process.env.COPILOT_URL || 'http://localhost:4600',
  copilotBusiness: process.env.COPILOT_BUSINESS_URL || 'http://localhost:4601',
  copilotSales: process.env.COPILOT_SALES_URL || 'http://localhost:4602',
  copilotFinance: process.env.COPILOT_FINANCE_URL || 'http://localhost:4603',
  copilotHR: process.env.COPILOT_HR_URL || 'http://localhost:4604',
  agentMarketplace: process.env.AGENT_URL || 'http://localhost:4580',
  agentStream: process.env.AGENT_STREAM_URL || 'http://localhost:4581',
  sutarOS: process.env.SUTAR_URL || 'http://localhost:4140',
  sutarCore: process.env.SUTAR_CORE_URL || 'http://localhost:4141',
  hojaiIndustry: process.env.HOJAI_INDUSTRY_URL || 'http://localhost:4150',
  hojaiCommerce: process.env.HOJAI_COMMERCE_URL || 'http://localhost:4151',
  hojaiCollab: process.env.HOJAI_COLLAB_URL || 'http://localhost:4160',
  hojaiExpert: process.env.HOJAI_EXPERT_URL || 'http://localhost:4161',

  // Layer 2: Customer Growth (AdBazaar)
  crmHub: process.env.CRM_HUB_URL || 'http://localhost:4056',
  leadIntelligence: process.env.LEAD_INTELLIGENCE_URL || 'http://localhost:4057',
  adsApi: process.env.ADS_API_URL || 'http://localhost:4060',
  adAi: process.env.AD_AI_URL || 'http://localhost:4061',
  aiCampaignBuilder: process.env.CAMPAIGN_BUILDER_URL || 'http://localhost:4062',
  dspPortal: process.env.DSP_URL || 'http://localhost:4063',
  programmaticBidding: process.env.PROGRAMMATIC_URL || 'http://localhost:4064',
  emailCampaign: process.env.EMAIL_CAMPAIGN_URL || 'http://localhost:4065',
  loyaltyService: process.env.LOYALTY_URL || 'http://localhost:4070',
  anniversaryRewards: process.env.ANNIVERSARY_URL || 'http://localhost:4071',
  birthdayRewards: process.env.BIRTHDAY_URL || 'http://localhost:4072',
  gamification: process.env.GAMIFICATION_URL || 'http://localhost:4073',
  referralGraph: process.env.REFERRAL_URL || 'http://localhost:4074',
  creatorStudio: process.env.CREATOR_URL || 'http://localhost:4080',
  creatorCommerce: process.env.CREATOR_COMMERCE_URL || 'http://localhost:4081',
  ugcManagement: process.env.UGC_URL || 'http://localhost:4082',
  marketingAnalytics: process.env.MARKETING_ANALYTICS_URL || 'http://localhost:4090',
  mediaAnalytics: process.env.MEDIA_ANALYTICS_URL || 'http://localhost:4091',
  intelligenceBridge: process.env.INTELLIGENCE_BRIDGE_URL || 'http://localhost:4092',
  revenueIntelligence: process.env.REVENUE_INTEL_URL || 'http://localhost:4093',
  doohService: process.env.DOOH_URL || 'http://localhost:4100',
  doohSdk: process.env.DOOH_SDK_URL || 'http://localhost:4101',
  videoAds: process.env.VIDEO_ADS_URL || 'http://localhost:4102',
  liveChat: process.env.LIVE_CHAT_URL || 'http://localhost:4110',
  feedbackService: process.env.FEEDBACK_URL || 'http://localhost:4111',
  buzzLocal: process.env.BUZZLOCAL_URL || 'http://localhost:4020',
  intentExchange: process.env.INTENT_URL || 'http://localhost:4120',
  audienceMarketplace: process.env.AUDIENCE_URL || 'http://localhost:4121',

  // Layer 3: Commerce (Nexha + REZ-Merchant)
  nexha: process.env.NEXHA_URL || 'http://localhost:5002',
  procurement: process.env.PROCUREMENT_URL || 'http://localhost:4320',
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

  // Layer 4: Financial (RABTUL)
  auth: process.env.AUTH_URL || 'http://localhost:4002',
  wallet: process.env.WALLET_URL || 'http://localhost:4004',
  walletService: process.env.WALLET_SERVICE_URL || 'http://localhost:4005',
  paymentGateway: process.env.PAYMENT_GATEWAY_URL || 'http://localhost:4006',
  accounting: process.env.ACCOUNTING_URL || 'http://localhost:4010',
  expenseService: process.env.EXPENSE_URL || 'http://localhost:4011',
  invoiceService: process.env.INVOICE_URL || 'http://localhost:4012',
  lending: process.env.LENDING_URL || 'http://localhost:4020',
  creditService: process.env.CREDIT_URL || 'http://localhost:4021',
  procurementPayment: process.env.PROCUREMENT_PAYMENT_URL || 'http://localhost:4007',
  contractMgmt: process.env.CONTRACT_URL || 'http://localhost:4030',
  distributionOS: process.env.DISTRIBUTION_URL || 'http://localhost:4040',
  graphqlFed: process.env.GRAPHQL_URL || 'http://localhost:4000',
  eventBus: process.env.EVENT_BUS_URL || 'http://localhost:4510',
  fileStorage: process.env.STORAGE_URL || 'http://localhost:4050',
  ecosystemConnector: process.env.ECOSYSTEM_URL || 'http://localhost:4399',

  // Layer 5: Workforce (CorpPerks)
  corpPerks: process.env.CORPPERKS_URL || 'http://localhost:4450',
  hrService: process.env.HR_SERVICE_URL || 'http://localhost:4451',
  onboardingService: process.env.ONBOARDING_URL || 'http://localhost:4452',
  payrollService: process.env.PAYROLL_URL || 'http://localhost:4453',
  attendanceService: process.env.ATTENDANCE_URL || 'http://localhost:4454',
  leaveService: process.env.LEAVE_URL || 'http://localhost:4455',
  atsService: process.env.ATS_URL || 'http://localhost:4460',
  talentPool: process.env.TALENT_URL || 'http://localhost:4461',
  calendarService: process.env.CALENDAR_URL || 'http://localhost:4470',
  meetingService: process.env.MEETING_URL || 'http://localhost:4471',
  documentService: process.env.DOCUMENT_URL || 'http://localhost:4472',
  lmsService: process.env.LMS_URL || 'http://localhost:4480',
  okrService: process.env.OKR_URL || 'http://localhost:4481',
  insightService: process.env.INSIGHT_URL || 'http://localhost:4482',

  // Layer 6: Legal & Trust (LawGens)
  legal: process.env.LEGAL_URL || 'http://localhost:5035',
  trustScorer: process.env.TRUST_URL || 'http://localhost:4180',
  contractService: process.env.CONTRACT_SERVICE_URL || 'http://localhost:5036',
  complianceService: process.env.COMPLIANCE_URL || 'http://localhost:5037',

  // Layer 7: Property (RisnaEstate + StayOwn)
  risnaEstate: process.env.RISNA_URL || 'http://localhost:4300',
  propertyService: process.env.PROPERTY_SERVICE_URL || 'http://localhost:4301',
  listingService: process.env.LISTING_URL || 'http://localhost:4302',
  leadService: process.env.LEAD_SERVICE_URL || 'http://localhost:4303',
  agentService: process.env.AGENT_SERVICE_URL || 'http://localhost:4304',
  stayOwn: process.env.STAYOWN_URL || 'http://localhost:6000',
  stayOwnPMS: process.env.STAYOWN_PMS_URL || 'http://localhost:6001',
  bookingEngine: process.env.BOOKING_ENGINE_URL || 'http://localhost:6002',
  guestApp: process.env.GUEST_APP_URL || 'http://localhost:6003',
  housekeepingService: process.env.HOUSEKEEPING_URL || 'http://localhost:6004',

  // Layer 8: Health (RisaCare)
  risaCare: process.env.RISACARE_URL || 'http://localhost:7000',
  healthTwin: process.env.HEALTH_TWIN_URL || 'http://localhost:7001',
  consultationCopilot: process.env.CONSULTATION_URL || 'http://localhost:7002',
  wellnessService: process.env.WELLNESS_URL || 'http://localhost:7003',
  healthInsurance: process.env.HEALTH_INSURANCE_URL || 'http://localhost:7004',
  familyCoordination: process.env.FAMILY_COORD_URL || 'http://localhost:7005',

  // Layer 9: Mobility (KHAIRMOVE)
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

  // RidZa (Layer 4)
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
    console.log('✅ MongoDB connected for Energy AI Company');
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

// ============================================
// ENERGY DATA
// ============================================

const facilities = new Map();
const meters = new Map();
const readings = new Map();
const bills = new Map();
const customers = new Map();
const tariffs = new Map();

// Initialize sample tariffs
const sampleTariffs = [
  { id: 'tariff_1', name: 'Residential Basic', rate: 5.0, unit: 'kWh', description: 'Basic residential rate' },
  { id: 'tariff_2', name: 'Residential Peak', rate: 8.0, unit: 'kWh', description: 'Peak hours (6PM-10PM)' },
  { id: 'tariff_3', name: 'Commercial', rate: 6.5, unit: 'kWh', description: 'Commercial rate' },
  { id: 'tariff_4', name: 'Industrial', rate: 4.5, unit: 'kWh', description: 'Industrial rate' },
  { id: 'tariff_5', name: 'Solar Export', rate: 3.0, unit: 'kWh', description: 'Solar export rate' },
];
sampleTariffs.forEach(t => tariffs.set(t.id, t));

// Initialize sample facilities
const sampleFacilities = [
  { id: 'fac_1', name: 'Main Power Plant', type: 'generation', capacity: 1000, status: 'active', location: 'Zone A' },
  { id: 'fac_2', name: 'Solar Farm Alpha', type: 'solar', capacity: 500, status: 'active', location: 'Zone B' },
  { id: 'fac_3', name: 'Wind Farm Beta', type: 'wind', capacity: 750, status: 'active', location: 'Zone C' },
  { id: 'fac_4', name: 'Distribution Center 1', type: 'distribution', capacity: 2000, status: 'active', location: 'Zone A' },
  { id: 'fac_5', name: 'Grid Substation Alpha', type: 'grid', capacity: 1500, status: 'active', location: 'Zone B' },
];
sampleFacilities.forEach(f => facilities.set(f.id, { ...f, tenantId: 'demo' }));

// Initialize sample meters
for (let i = 1; i <= 20; i++) {
  meters.set(`meter_${i}`, {
    id: `meter_${i}`,
    facilityId: sampleFacilities[i % 5].id,
    type: i % 3 === 0 ? 'commercial' : 'residential',
    status: 'active',
    lastReading: null,
    tenantId: 'demo'
  });
}

// ============================================
// ENERGY TWINS
// ============================================

const facilityTwin = new Map();
const meterTwin = new Map();
const consumptionTwin = new Map();
const productionTwin = new Map();
const gridTwin = new Map();

// ============================================
// ENERGY API
// ============================================

// Facilities Management
app.get('/api/facilities', (req, res) => {
  const { type } = req.query;
  let items = Array.from(facilities.values());
  if (type) items = items.filter(f => f.type === type);
  res.json({ facilities: items });
});

app.post('/api/facilities', requireAuth, (req, res) => {
  const facility = { id: 'fac_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  facilities.set(facility.id, facility);
  facilityTwin.set(facility.id, { ...facility, twinType: 'facility', syncedAt: new Date().toISOString() });
  res.json(facility);
});

app.get('/api/facilities/:id', (req, res) => {
  const facility = facilities.get(req.params.id);
  if (!facility) return res.status(404).json({ error: 'Facility not found' });
  res.json(facility);
});

app.patch('/api/facilities/:id/status', requireAuth, (req, res) => {
  const facility = facilities.get(req.params.id);
  if (!facility) return res.status(404).json({ error: 'Facility not found' });
  facility.status = req.body.status;
  facilities.set(facility.id, facility);
  facilityTwin.set(facility.id, { ...facility, syncedAt: new Date().toISOString() });
  res.json(facility);
});

// Meters Management
app.get('/api/meters', (req, res) => {
  res.json({ meters: Array.from(meters.values()) });
});

app.post('/api/meters', requireAuth, (req, res) => {
  const meter = { id: 'meter_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  meters.set(meter.id, meter);
  meterTwin.set(meter.id, { ...meter, twinType: 'meter', syncedAt: new Date().toISOString() });
  res.json(meter);
});

app.get('/api/meters/:id', (req, res) => {
  const meter = meters.get(req.params.id);
  if (!meter) return res.status(404).json({ error: 'Meter not found' });
  res.json(meter);
});

// Readings
app.post('/api/readings', requireAuth, (req, res) => {
  const { meterId, value, timestamp } = req.body;
  const meter = meters.get(meterId);
  if (!meter) return res.status(404).json({ error: 'Meter not found' });

  const reading = {
    id: 'read_' + Date.now(),
    meterId,
    value,
    timestamp: timestamp || new Date().toISOString(),
    tenantId: req.session.businessId,
    createdAt: new Date().toISOString()
  };
  readings.set(reading.id, reading);
  meter.lastReading = value;
  meters.set(meterId, meter);
  consumptionTwin.set(reading.id, { ...reading, twinType: 'consumption', syncedAt: new Date().toISOString() });
  res.json(reading);
});

app.get('/api/readings', (req, res) => {
  const { meterId, from, to } = req.query;
  let items = Array.from(readings.values());
  if (meterId) items = items.filter(r => r.meterId === meterId);
  if (from) items = items.filter(r => r.timestamp >= from);
  if (to) items = items.filter(r => r.timestamp <= to);
  res.json({ readings: items });
});

// Tariffs
app.get('/api/tariffs', (req, res) => {
  res.json({ tariffs: Array.from(tariffs.values()) });
});

app.post('/api/tariffs', requireAuth, (req, res) => {
  const tariff = { id: 'tariff_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  tariffs.set(tariff.id, tariff);
  res.json(tariff);
});

// Billing
app.post('/api/bills', requireAuth, (req, res) => {
  const { customerId, meterId, period, consumption, amount } = req.body;
  const bill = {
    id: 'bill_' + Date.now(),
    customerId,
    meterId,
    period,
    consumption,
    amount,
    status: 'pending',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    tenantId: req.session.businessId,
    createdAt: new Date().toISOString()
  };
  bills.set(bill.id, bill);
  res.json(bill);
});

app.get('/api/bills', (req, res) => {
  const { customerId, status } = req.query;
  let items = Array.from(bills.values());
  if (customerId) items = items.filter(b => b.customerId === customerId);
  if (status) items = items.filter(b => b.status === status);
  res.json({ bills: items });
});

app.patch('/api/bills/:id/pay', requireAuth, (req, res) => {
  const bill = bills.get(req.params.id);
  if (!bill) return res.status(404).json({ error: 'Bill not found' });
  bill.status = 'paid';
  bill.paidAt = new Date().toISOString();
  bills.set(bill.id, bill);
  res.json(bill);
});

// Customers
app.get('/api/customers', (req, res) => {
  res.json({ customers: Array.from(customers.values()) });
});

app.post('/api/customers', requireAuth, (req, res) => {
  const customer = { id: 'cust_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  customers.set(customer.id, customer);
  res.json(customer);
});

// Analytics
app.get('/api/analytics', requireAuth, (req, res) => {
  const readingsList = Array.from(readings.values());
  const today = new Date().toISOString().split('T')[0];
  const todayReadings = readingsList.filter(r => r.timestamp.startsWith(today));
  const totalGeneration = Array.from(facilities.values())
    .filter(f => f.type === 'generation' || f.type === 'solar' || f.type === 'wind')
    .reduce((sum, f) => sum + f.capacity, 0);

  res.json({
    totalFacilities: facilities.size,
    activeFacilities: Array.from(facilities.values()).filter(f => f.status === 'active').length,
    totalMeters: meters.size,
    totalReadings: readings.size,
    todayReadings: todayReadings.length,
    todayConsumption: todayReadings.reduce((sum, r) => sum + r.value, 0),
    totalGeneration,
    pendingBills: Array.from(bills.values()).filter(b => b.status === 'pending').length,
    totalCustomers: customers.size,
  });
});

// Grid Status
app.get('/api/grid/status', (req, res) => {
  const activeFacilities = Array.from(facilities.values()).filter(f => f.status === 'active').length;
  const totalCapacity = Array.from(facilities.values()).reduce((sum, f) => sum + f.capacity, 0);
  const currentLoad = Array.from(readings.values()).slice(-10).reduce((sum, r) => sum + r.value, 0);

  res.json({
    gridStatus: activeFacilities > 0 ? 'operational' : 'degraded',
    totalCapacity,
    currentLoad,
    utilizationPercent: totalCapacity > 0 ? Math.round((currentLoad / totalCapacity) * 100) : 0,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// LAYER 1: INTELLIGENCE (HOJAI AI)
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
      name: 'Intelligence (HOJAI AI)',
      services: {
        genie: genieRes.status === 'fulfilled' ? 'online' : 'offline',
        copilot: copilotRes.status === 'fulfilled' ? 'online' : 'offline',
        agentMarketplace: agentsRes.status === 'fulfilled' ? 'online' : 'offline',
        sutarOS: RTMN_SERVICES.sutarOS,
        hojaiIndustry: RTMN_SERVICES.hojaiIndustry,
      },
      capabilities: ['Genie AI Chat', 'Business Copilot', 'Agent Marketplace', 'Energy AI', 'Predictive Analytics'],
      aiAgents: ['Grid Optimizer Agent', 'Load Balancer Agent', 'Predictive Maintenance Agent', 'Energy Advisor Agent', 'Sustainability Agent'],
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

// ============================================
// LAYER 2: CUSTOMER GROWTH (AdBazaar)
// ============================================

app.get('/api/layer/customer-growth', requireAuth, async (req, res) => {
  try {
    const [crmRes, loyaltyRes] = await Promise.allSettled([
      fetch(RTMN_SERVICES.crmHub + '/api/health'),
      fetch(RTMN_SERVICES.loyaltyService + '/health'),
    ]);

    res.json({
      layer: 2,
      name: 'Customer Growth (AdBazaar)',
      services: {
        crmHub: crmRes.status === 'fulfilled' ? 'online' : 'offline',
        loyaltyService: loyaltyRes.status === 'fulfilled' ? 'online' : 'offline',
        marketingAnalytics: RTMN_SERVICES.marketingAnalytics,
        feedbackService: RTMN_SERVICES.feedbackService,
      },
      capabilities: ['Customer Management', 'Loyalty Programs', 'Marketing Analytics', 'Feedback Collection'],
    });
  } catch (err) {
    res.json({ layer: 2, name: 'Customer Growth', status: 'offline', error: err.message });
  }
});

app.get('/api/crm/contacts', requireAuth, async (req, res) => {
  try {
    const contactsRes = await fetch(RTMN_SERVICES.crmHub + '/api/contacts');
    res.json(await contactsRes.json());
  } catch (err) {
    res.status(500).json({ error: 'CRM unavailable' });
  }
});

app.get('/api/loyalty/points', requireAuth, async (req, res) => {
  try {
    const pointsRes = await fetch(RTMN_SERVICES.loyaltyService + '/api/points');
    res.json(await pointsRes.json());
  } catch (err) {
    res.json({ error: 'Loyalty service unavailable' });
  }
});

// ============================================
// LAYER 3: COMMERCE (Nexha + REZ-Merchant)
// ============================================

app.get('/api/layer/commerce', requireAuth, async (req, res) => {
  res.json({
    layer: 3,
    name: 'Commerce (Nexha + REZ-Merchant)',
    services: {
      nexha: RTMN_SERVICES.nexha,
      merchantPOS: RTMN_SERVICES.merchantPOS,
      merchantPayment: RTMN_SERVICES.merchantPayment,
    },
    capabilities: ['Procurement', 'Distribution', 'POS', 'Payments'],
  });
});

app.get('/api/merchant/payments', requireAuth, async (req, res) => {
  try {
    const payRes = await fetch(RTMN_SERVICES.merchantPayment + '/health');
    res.json({ status: 'online', service: 'REZ-Merchant Payment Gateway' });
  } catch (err) {
    res.json({ status: 'offline', service: 'REZ-Merchant Payment Gateway' });
  }
});

// ============================================
// LAYER 4: FINANCIAL (RABTUL)
// ============================================

app.get('/api/layer/finance', requireAuth, async (req, res) => {
  try {
    const [walletRes, authRes] = await Promise.allSettled([
      fetch(RTMN_SERVICES.wallet + '/health'),
      fetch(RTMN_SERVICES.auth + '/health'),
    ]);

    res.json({
      layer: 4,
      name: 'Financial (RABTUL)',
      services: {
        auth: authRes.status === 'fulfilled' ? 'online' : 'offline',
        wallet: walletRes.status === 'fulfilled' ? 'online' : 'offline',
        accounting: RTMN_SERVICES.accounting,
        paymentGateway: RTMN_SERVICES.paymentGateway,
      },
      capabilities: ['Authentication', 'Wallet', 'Payments', 'Accounting', 'Billing'],
    });
  } catch (err) {
    res.json({ layer: 4, name: 'Finance', status: 'offline', error: err.message });
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
// LAYER 5: WORKFORCE (CorpPerks)
// ============================================

app.get('/api/layer/workforce', requireAuth, async (req, res) => {
  res.json({
    layer: 5,
    name: 'Workforce (CorpPerks)',
    services: {
      corpPerks: RTMN_SERVICES.corpPerks,
      hrService: RTMN_SERVICES.hrService,
      payrollService: RTMN_SERVICES.payrollService,
    },
    capabilities: ['HR Management', 'Payroll', 'Attendance', 'OKR'],
  });
});

// ============================================
// LAYER 6: LEGAL & TRUST (LawGens)
// ============================================

app.get('/api/layer/legal', requireAuth, async (req, res) => {
  res.json({
    layer: 6,
    name: 'Legal & Trust (LawGens)',
    services: {
      legal: RTMN_SERVICES.legal,
      contractService: RTMN_SERVICES.contractService,
      complianceService: RTMN_SERVICES.complianceService,
    },
    capabilities: ['Contracts', 'Compliance', 'Regulatory'],
  });
});

// ============================================
// LAYER 7: PROPERTY (RisnaEstate + StayOwn)
// ============================================

app.get('/api/layer/property', requireAuth, async (req, res) => {
  res.json({
    layer: 7,
    name: 'Property (RisnaEstate + StayOwn)',
    services: {
      risnaEstate: RTMN_SERVICES.risnaEstate,
      stayOwn: RTMN_SERVICES.stayOwn,
    },
    capabilities: ['Property Management', 'Facilities'],
  });
});

// ============================================
// LAYER 8: HEALTH (RisaCare)
// ============================================

app.get('/api/layer/health', requireAuth, async (req, res) => {
  res.json({
    layer: 8,
    name: 'Health (RisaCare)',
    services: {
      risaCare: RTMN_SERVICES.risaCare,
      wellnessService: RTMN_SERVICES.wellnessService,
    },
    capabilities: ['Employee Health', 'Wellness'],
  });
});

// ============================================
// LAYER 9: MOBILITY (KHAIRMOVE)
// ============================================

app.get('/api/layer/mobility', requireAuth, async (req, res) => {
  res.json({
    layer: 9,
    name: 'Mobility (KHAIRMOVE)',
    services: {
      khairMove: RTMN_SERVICES.khairMove,
      fleetService: RTMN_SERVICES.fleetService,
    },
    capabilities: ['Fleet Management', 'Logistics'],
  });
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
      capabilities: ['Universal Identity', 'Verification'],
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
      capabilities: ['Business Memory', 'Customer Memory'],
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
        facilityTwin: Array.from(facilityTwin.values()),
        meterTwin: Array.from(meterTwin.values()),
        consumptionTwin: Array.from(consumptionTwin.values()),
        productionTwin: Array.from(productionTwin.values()),
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
        twins: [...facilityTwin.values(), ...meterTwin.values(), ...consumptionTwin.values()],
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
  res.json({
    layer: 13,
    name: 'Automation (FlowOS)',
    services: { flowOS: RTMN_SERVICES.flow },
    capabilities: {
      workflows: true,
      approvalChains: true,
      triggers: ['on_reading', 'on_bill', 'on_alert', 'on_maintenance'],
      templates: ['meter_reading', 'bill_generation', 'alert_notification', 'maintenance_scheduling'],
    },
  });
});

app.post('/api/automation/workflows', requireAuth, async (req, res) => {
  const { workflowId, trigger, data } = req.body;
  res.json({ success: true, executedAt: new Date().toISOString() });
});

// ============================================
// LAYER 14: AUTONOMOUS (SUTAR OS)
// ============================================

app.get('/api/layer/autonomous', requireAuth, async (req, res) => {
  try {
    const [sutarRes, goalRes] = await Promise.allSettled([
      fetch(RTMN_SERVICES.sutar + '/health'),
      fetch(RTMN_SERVICES.goalOS + '/health'),
    ]);
    res.json({
      layer: 14,
      name: 'Autonomous (SUTAR OS + Karma Foundation)',
      services: {
        sutar: sutarRes.status === 'fulfilled' ? 'online' : 'offline',
        goalOS: goalRes.status === 'fulfilled' ? 'online' : 'offline',
        karmaFoundation: RTMN_SERVICES.karmaFoundation,
      },
      capabilities: ['Goal Management', 'Decision Engine', 'Autonomous Execution', 'Karma Scoring'],
    });
  } catch (err) {
    res.json({ layer: 14, name: 'Autonomous', status: 'offline', error: err.message });
  }
});

app.post('/api/autonomous/goal', requireAuth, async (req, res) => {
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
  res.json({
    layer: 15,
    name: 'Consumer Network (REZ Consumer + Axom)',
    services: {
      rezConsumer: RTMN_SERVICES.rezConsumer,
      axom: RTMN_SERVICES.axom,
    },
    capabilities: ['Customers', 'Discovery', 'Local Business'],
  });
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

  res.json({
    industry: INDUSTRY,
    service: 'Energy AI Company',
    layers: layerEndpoints.map(l => ({ layer: l.layer, name: l.name })),
  });
});

// ============================================
// HEALTH
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Energy AI Company',
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
  console.log('✅ energy-os AI Company Platform running on port ' + PORT);
  console.log('📦 15 Layers: Intelligence, Growth, Commerce, Finance, Workforce, Legal, Property, Health, Mobility, Identity, Memory, Twins, Autonomous, Network');
});
