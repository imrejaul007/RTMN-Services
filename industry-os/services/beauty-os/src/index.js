/**
 * beauty-os - Beauty & Salon Operating System
 *
 * Real salon domain: services, stylists, appointments, retail products, memberships.
 * Upgraded with all 15 layers of RTMN ecosystem.
 *
 * Port: 5090
 * Industry: Beauty
 */

const express = require('express');
const industryIntegration = require('./industry-integration');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5090;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Shared auth middleware
const { authMiddleware } = require('./shared/auth-middleware');
app.use('/api', authMiddleware);

// ============================================
// LAYER CONFIGURATION
// ============================================

const INDUSTRY = 'beauty';
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
  
  // Layer 8: Health (RisaCare - external client)
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
// BEAUTY / SALON DATA
// ============================================

const services = new Map();
const stylists = new Map();
const appointments = new Map();
const products = new Map();
const memberships = new Map();
const clients = new Map();

// --- Salon Services (15 typical offerings across categories) ---
const seedServices = [
  // Hair
  { id: 'svc-haircut-women', name: "Women's Haircut", category: 'hair', durationMin: 45, price: 55, description: 'Wash, cut, blow-dry, and style.' },
  { id: 'svc-haircut-men', name: "Men's Haircut", category: 'hair', durationMin: 30, price: 35, description: 'Classic cut and wash.' },
  { id: 'svc-color-single', name: 'Single-Process Color', category: 'hair', durationMin: 90, price: 120, description: 'All-over color application.' },
  { id: 'svc-highlights', name: 'Highlights / Foils', category: 'hair', durationMin: 120, price: 180, description: 'Partial or full highlights.' },
  { id: 'svc-blowout', name: 'Blowout', category: 'hair', durationMin: 30, price: 45, description: 'Wash + professional blow-dry.' },
  { id: 'svc-keratin', name: 'Keratin Treatment', category: 'hair', durationMin: 180, price: 250, description: 'Smoothing treatment, lasts ~3 months.' },
  // Nails
  { id: 'svc-mani-classic', name: 'Classic Manicure', category: 'nails', durationMin: 30, price: 30 },
  { id: 'svc-mani-gel', name: 'Gel Manicure', category: 'nails', durationMin: 45, price: 45 },
  { id: 'svc-pedi-classic', name: 'Classic Pedicure', category: 'nails', durationMin: 45, price: 40 },
  { id: 'svc-acrylic-full', name: 'Acrylic Full Set', category: 'nails', durationMin: 90, price: 65 },
  // Skin / Spa
  { id: 'svc-facial-basic', name: 'Basic Facial', category: 'skincare', durationMin: 60, price: 75 },
  { id: 'svc-facial-deluxe', name: 'Deluxe Hydrating Facial', category: 'skincare', durationMin: 90, price: 145 },
  { id: 'svc-massage-60', name: 'Swedish Massage 60min', category: 'spa', durationMin: 60, price: 110 },
  { id: 'svc-massage-90', name: 'Deep Tissue 90min', category: 'spa', durationMin: 90, price: 165 },
  { id: 'svc-wax-brows', name: 'Eyebrow Wax', category: 'skincare', durationMin: 15, price: 18 },
];
seedServices.forEach(s => services.set(s.id, { ...s, active: true, tenantId: 'demo' }));

// --- Stylists ---
const seedStylists = [
  { id: 'sty-001', name: 'Priya Sharma', title: 'Senior Stylist', skills: ['haircut-women', 'color-single', 'highlights', 'blowout', 'keratin'], languages: ['en', 'hi'], workingHours: { start: '09:00', end: '18:00' }, daysOff: [1] /* Sun */ },
  { id: 'sty-002', name: 'James Lee', title: 'Stylist', skills: ['haircut-men', 'haircut-women', 'blowout', 'color-single'], languages: ['en'], workingHours: { start: '10:00', end: '19:00' }, daysOff: [2] },
  { id: 'sty-003', name: 'Sofia Garcia', title: 'Nail Technician', skills: ['mani-classic', 'mani-gel', 'pedi-classic', 'acrylic-full', 'wax-brows'], languages: ['en', 'es'], workingHours: { start: '09:00', end: '17:00' }, daysOff: [0] },
  { id: 'sty-004', name: 'Amira Hassan', title: 'Esthetician', skills: ['facial-basic', 'facial-deluxe', 'wax-brows', 'massage-60', 'massage-90'], languages: ['en', 'ar'], workingHours: { start: '11:00', end: '20:00' }, daysOff: [3] },
];
seedStylists.forEach(s => stylists.set(s.id, { ...s, active: true, tenantId: 'demo' }));

// --- Products (retail) ---
const seedProducts = [
  { id: 'prd-shampoo', name: 'Hydrating Shampoo 250ml', category: 'hair-care', price: 28, stock: 25 },
  { id: 'prd-conditioner', name: 'Daily Conditioner 250ml', category: 'hair-care', price: 26, stock: 30 },
  { id: 'prd-sermum', name: 'Argan Hair Serum 50ml', category: 'hair-care', price: 38, stock: 15 },
  { id: 'prd-nail-polish', name: 'Gel Polish — assorted colors', category: 'nails', price: 18, stock: 60 },
  { id: 'prd-cuticle-oil', name: 'Cuticle Oil Pen', category: 'nails', price: 12, stock: 40 },
  { id: 'prd-sunscreen', name: 'Daily SPF 50', category: 'skincare', price: 42, stock: 22 },
  { id: 'prd-retinol', name: 'Retinol Night Serum', category: 'skincare', price: 68, stock: 12 },
  { id: 'prd-massage-oil', name: 'Relaxation Massage Oil 200ml', category: 'spa', price: 32, stock: 18 },
];
seedProducts.forEach(p => products.set(p.id, { ...p, tenantId: 'demo' }));

// --- Memberships ---
const seedMemberships = [
  { id: 'mem-bronze', name: 'Bronze', pricePerMonth: 49, perks: ['10% off all services', '5% off retail', '1 free basic facial/quarter'], minCommitment: 3 },
  { id: 'mem-silver', name: 'Silver', pricePerMonth: 99, perks: ['15% off all services', '10% off retail', '1 free deluxe facial/month', 'Priority booking'], minCommitment: 3 },
  { id: 'mem-gold', name: 'Gold', pricePerMonth: 199, perks: ['20% off all services', '15% off retail', '2 free services/month', 'Priority booking', 'Birthday gift'], minCommitment: 6 },
];
seedMemberships.forEach(m => memberships.set(m.id, { ...m, tenantId: 'demo' }));

// ============================================
// BEAUTY TWINS
// ============================================

const salonTwin = new Map();
const serviceTwin = new Map();
const stylistTwin = new Map();
const appointmentTwin = new Map();
const productTwin = new Map();
const clientTwin = new Map();
const membershipTwin = new Map();

// ============================================
// BEAUTY API
// ============================================

// ---- Services ----
app.get('/api/services', (req, res) => {
  const { category, activeOnly } = req.query;
  let out = Array.from(services.values());
  if (category) out = out.filter(s => s.category === category);
  if (activeOnly === 'true') out = out.filter(s => s.active);
  res.json({ services: out, count: out.length });
});

app.get('/api/services/:id', (req, res) => {
  const s = services.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Service not found' });
  res.json(s);
});

app.post('/api/services', requireAuth, (req, res) => {
  const s = { id: 'svc-' + Date.now(), active: true, tenantId: req.session.businessId, createdAt: new Date().toISOString(), ...req.body };
  services.set(s.id, s);
  res.status(201).json(s);
});

// ---- Stylists ----
app.get('/api/stylists', (req, res) => {
  const { skill, language } = req.query;
  let out = Array.from(stylists.values());
  if (skill) out = out.filter(s => s.skills.includes(skill));
  if (language) out = out.filter(s => s.languages.includes(language));
  res.json({ stylists: out, count: out.length });
});

app.get('/api/stylists/:id', (req, res) => {
  const s = stylists.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Stylist not found' });
  // Compute appointments today for this stylist
  const today = new Date().toISOString().split('T')[0];
  const todayCount = Array.from(appointments.values()).filter(a => a.stylistId === s.id && a.scheduledAt?.startsWith(today) && a.status !== 'cancelled').length;
  res.json({ ...s, appointmentsToday: todayCount });
});

app.get('/api/stylists/:id/availability', (req, res) => {
  const stylist = stylists.get(req.params.id);
  if (!stylist) return res.status(404).json({ error: 'Stylist not found' });
  const { date } = req.query; // YYYY-MM-DD
  if (!date) return res.status(400).json({ error: 'date_required' });
  const targetDate = new Date(date);
  if (isNaN(targetDate)) return res.status(400).json({ error: 'invalid_date' });
  const dayOfWeek = targetDate.getDay();
  if (stylist.daysOff.includes(dayOfWeek)) return res.json({ stylistId: stylist.id, date, available: false, reason: 'day_off', slots: [] });

  // Generate 30-min slots between working hours, excluding booked ones
  const [startH] = stylist.workingHours.start.split(':').map(Number);
  const [endH] = stylist.workingHours.end.split(':').map(Number);
  const slots = [];
  for (let h = startH; h < endH; h++) {
    for (const m of [0, 30]) {
      const slotISO = `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`;
      slots.push(slotISO);
    }
  }
  const bookedSlots = new Set(
    Array.from(appointments.values())
      .filter(a => a.stylistId === stylist.id && a.scheduledAt === slotISO || (a.scheduledAt?.startsWith(date) && a.status !== 'cancelled'))
      .map(a => a.scheduledAt)
  );
  const available = slots.filter(s => !bookedSlots.has(s));
  res.json({ stylistId: stylist.id, date, available: available.length > 0, slots: available });
});

// ---- Appointments ----
app.post('/api/appointments', requireAuth, (req, res) => {
  const { clientId, clientName, clientPhone, clientEmail, stylistId, serviceId, scheduledAt, notes = '' } = req.body;
  const stylist = stylists.get(stylistId);
  const service = services.get(serviceId);
  if (!stylist) return res.status(404).json({ error: 'Stylist not found' });
  if (!service) return res.status(404).json({ error: 'Service not found' });
  if (!scheduledAt) return res.status(400).json({ error: 'scheduledAt_required' });

  // Check skill match
  if (!stylist.skills.includes(serviceId.replace('svc-', ''))) {
    return res.status(400).json({ error: 'stylist_lacks_skill', stylistSkills: stylist.skills });
  }

  // Conflict check: existing appointment with this stylist at this time
  const conflict = Array.from(appointments.values()).find(a =>
    a.stylistId === stylistId && a.scheduledAt === scheduledAt && a.status !== 'cancelled'
  );
  if (conflict) return res.status(409).json({ error: 'slot_already_booked', conflictingAppointmentId: conflict.id });

  const endsAt = new Date(new Date(scheduledAt).getTime() + service.durationMin * 60 * 1000).toISOString();
  const appt = {
    id: 'apt-' + Date.now(),
    confirmationNumber: 'A' + Date.now().toString().slice(-8),
    clientId: clientId || null,
    clientName, clientPhone, clientEmail,
    stylistId, stylistName: stylist.name,
    serviceId, serviceName: service.name, category: service.category,
    scheduledAt, endsAt, durationMin: service.durationMin,
    price: service.price,
    status: 'confirmed',
    notes,
    tenantId: req.session.businessId,
    createdAt: new Date().toISOString(),
  };
  appointments.set(appt.id, appt);
  appointmentTwin.set(appt.id, { ...appt, twinType: 'appointment', syncedAt: new Date().toISOString() });
  res.status(201).json(appt);
});

app.get('/api/appointments', (req, res) => {
  const { status, stylistId, clientId, date } = req.query;
  let out = Array.from(appointments.values()).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  if (status) out = out.filter(a => a.status === status);
  if (stylistId) out = out.filter(a => a.stylistId === stylistId);
  if (clientId) out = out.filter(a => a.clientId === clientId);
  if (date) out = out.filter(a => a.scheduledAt?.startsWith(date));
  res.json({ appointments: out, count: out.length });
});

app.get('/api/appointments/:id', (req, res) => {
  const a = appointments.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Appointment not found' });
  res.json(a);
});

app.post('/api/appointments/:id/cancel', requireAuth, (req, res) => {
  const a = appointments.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Appointment not found' });
  if (!['confirmed', 'pending'].includes(a.status)) return res.status(409).json({ error: 'invalid_state', currentStatus: a.status });
  a.status = 'cancelled';
  a.cancelledAt = new Date().toISOString();
  a.cancelReason = req.body.reason || null;
  appointments.set(a.id, a);
  res.json(a);
});

app.post('/api/appointments/:id/complete', requireAuth, (req, res) => {
  const a = appointments.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Appointment not found' });
  a.status = 'completed';
  a.completedAt = new Date().toISOString();
  appointments.set(a.id, a);
  res.json(a);
});

// ---- Clients ----
app.post('/api/clients', requireAuth, (req, res) => {
  const c = {
    id: 'cli-' + Date.now(),
    ...req.body,
    tenantId: req.session.businessId,
    loyaltyPoints: 0,
    totalVisits: 0,
    totalSpent: 0,
    membershipId: null,
    createdAt: new Date().toISOString(),
  };
  clients.set(c.id, c);
  clientTwin.set(c.id, { ...c, twinType: 'client', syncedAt: new Date().toISOString() });
  res.status(201).json(c);
});

app.get('/api/clients', (req, res) => {
  res.json({ clients: Array.from(clients.values()), count: clients.size });
});

app.get('/api/clients/:id', (req, res) => {
  const c = clients.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Client not found' });
  const visitHistory = Array.from(appointments.values()).filter(a => a.clientId === req.params.id).sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
  res.json({ ...c, visitHistory, lastVisit: visitHistory[0]?.scheduledAt || null });
});

// ---- Products ----
app.get('/api/products', (req, res) => {
  const { category, inStockOnly } = req.query;
  let out = Array.from(products.values());
  if (category) out = out.filter(p => p.category === category);
  if (inStockOnly === 'true') out = out.filter(p => p.stock > 0);
  res.json({ products: out, count: out.length });
});

app.post('/api/products/:id/sell', requireAuth, (req, res) => {
  const p = products.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  const qty = req.body.quantity || 1;
  if (p.stock < qty) return res.status(409).json({ error: 'insufficient_stock', available: p.stock });
  p.stock -= qty;
  p.totalSold = (p.totalSold || 0) + qty;
  products.set(p.id, p);
  res.status(201).json({ productId: p.id, sold: qty, revenue: p.price * qty, remainingStock: p.stock });
});

// ---- Memberships ----
app.get('/api/memberships', (_req, res) => {
  res.json({ memberships: Array.from(memberships.values()), count: memberships.size });
});

app.post('/api/clients/:id/membership', requireAuth, (req, res) => {
  const c = clients.get(req.params.id);
  const m = memberships.get(req.body.membershipId);
  if (!c) return res.status(404).json({ error: 'Client not found' });
  if (!m) return res.status(404).json({ error: 'Membership not found' });
  c.membershipId = m.id;
  c.membershipName = m.name;
  c.membershipStartDate = new Date().toISOString();
  clients.set(c.id, c);
  res.json(c);
});

// ---- Analytics ----
app.get('/api/analytics', requireAuth, (_req, res) => {
  const apptList = Array.from(appointments.values()).filter(a => a.status !== 'cancelled');
  const today = new Date().toISOString().split('T')[0];
  const todayAppts = apptList.filter(a => a.scheduledAt?.startsWith(today));
  const revenueByCategory = {};
  for (const a of apptList) {
    revenueByCategory[a.category] = (revenueByCategory[a.category] || 0) + (a.price || 0);
  }
  const utilizationByStylist = Array.from(stylists.values()).map(s => {
    const stylistAppts = apptList.filter(a => a.stylistId === s.id);
    const totalMin = stylistAppts.reduce((sum, a) => sum + a.durationMin, 0);
    return { stylistId: s.id, name: s.name, appointments: stylistAppts.length, totalMinutes: totalMin };
  });
  res.json({
    totalServices: services.size,
    totalStylists: stylists.size,
    totalAppointments: apptList.length,
    todayAppointments: todayAppts.length,
    todayRevenue: todayAppts.reduce((s, a) => s + (a.price || 0), 0),
    totalRevenue: apptList.reduce((s, a) => s + (a.price || 0), 0),
    revenueByCategory,
    utilizationByStylist,
    totalClients: clients.size,
    totalProducts: products.size,
    lowStockProducts: Array.from(products.values()).filter(p => p.stock < 15).map(p => ({ id: p.id, name: p.name, stock: p.stock })),
  });
});

industryIntegration.registerRoutes(app, 'beauty', PORT);

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'beauty-os',
    industry: 'beauty',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      services: services.size,
      stylists: stylists.size,
      appointments: appointments.size,
      clients: clients.size,
      products: products.size,
      memberships: memberships.size,
    },
  });
});

app.listen(PORT, () => {
  console.log('✅ beauty-os running on port ' + PORT);
  console.log('💇 Beauty OS - Real salon domain (services, stylists, appointments, products, memberships)');
});
