/**
 * hotel-os AI Company Platform
 * 
 * restaurant OS upgraded with all 15 layers of RTMN ecosystem.
 * 
 * Port: 5010
 * Industry: Restaurant
 */

const express = require('express');
const industryIntegration = require('./industry-integration');
const stayownIntegration = require('./stayown-integration');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5025;

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
// HOTEL DATA
// ============================================

const rooms = new Map();
const bookings = new Map();
const guests = new Map();
const housekeeping = new Map();
const amenities = new Map();

// Initialize sample rooms — mix of types for a mid-size hotel
const roomTypes = [
  { type: 'standard', basePrice: 120, count: 12 },
  { type: 'deluxe',   basePrice: 220, count: 8  },
  { type: 'suite',    basePrice: 450, count: 4  },
  { type: 'penthouse',basePrice: 900, count: 1  },
];
let roomCounter = 1;
for (const { type, basePrice, count } of roomTypes) {
  for (let i = 0; i < count; i++) {
    const floor = Math.ceil(roomCounter / 6);
    const id = `room_${String(roomCounter).padStart(3, '0')}`;
    rooms.set(id, {
      id, type, basePrice, floor,
      maxOccupancy: type === 'penthouse' ? 6 : type === 'suite' ? 4 : 2,
      bedConfig: type === 'standard' ? '1 Queen' : type === 'deluxe' ? '1 King' : type === 'suite' ? '1 King + Sofa' : '2 King',
      view: type === 'penthouse' ? 'panoramic' : type === 'suite' ? 'city' : 'garden',
      status: 'available',
      lastCleaned: new Date().toISOString(),
      tenantId: 'demo',
    });
    roomCounter++;
  }
}

// Sample amenities
const seedAmenities = [
  { id: 'am-spa', name: 'Spa & Wellness Center', category: 'wellness', hours: '08:00-22:00', price: 0 },
  { id: 'am-pool', name: 'Infinity Pool', category: 'recreation', hours: '06:00-22:00', price: 0 },
  { id: 'am-gym', name: '24h Fitness Center', category: 'wellness', hours: '24h', price: 0 },
  { id: 'am-rest', name: 'Rooftop Restaurant', category: 'dining', hours: '07:00-23:00', price: 0 },
  { id: 'am-bar', name: 'Sky Lounge Bar', category: 'dining', hours: '17:00-01:00', price: 0 },
  { id: 'am-laundry', name: 'Express Laundry', category: 'service', hours: '07:00-21:00', price: 25 },
  { id: 'am-airport', name: 'Airport Transfer', category: 'transport', hours: '24h', price: 65 },
  { id: 'am-tour', name: 'City Tour Booking', category: 'experience', hours: '09:00-18:00', price: 80 },
];
seedAmenities.forEach(a => amenities.set(a.id, { ...a, tenantId: 'demo' }));

// Sample housekeeping schedule (one item per floor)
const seedHousekeeping = [
  { id: 'hk-001', floor: 1, status: 'clean', assignedTo: 'Maria', completedAt: new Date().toISOString() },
  { id: 'hk-002', floor: 2, status: 'in-progress', assignedTo: 'James', startedAt: new Date().toISOString() },
  { id: 'hk-003', floor: 3, status: 'pending', assignedTo: null, startedAt: null },
];
seedHousekeeping.forEach(h => housekeeping.set(h.id, { ...h, tenantId: 'demo' }));

// ============================================
// HOTEL TWINS
// ============================================

const hotelTwin = new Map();
const roomTwin = new Map();
const bookingTwin = new Map();
const guestTwin = new Map();
const housekeepingTwin = new Map();
const amenityTwin = new Map();

// ============================================
// HOTEL API
// ============================================

// ---- Rooms ----
app.get('/api/rooms', (req, res) => {
  const { type, status } = req.query;
  let items = Array.from(rooms.values());
  if (type) items = items.filter(r => r.type === type);
  if (status) items = items.filter(r => r.status === status);
  res.json({ rooms: items, total: items.length, byType: roomTypes.map(rt => ({ type: rt.type, basePrice: rt.basePrice, count: items.filter(r => r.type === rt.type).length })) });
});

app.get('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

app.post('/api/rooms/:id/status', requireAuth, (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const { status, reason } = req.body;
  if (!['available', 'occupied', 'cleaning', 'maintenance', 'out-of-order'].includes(status)) return res.status(400).json({ error: 'invalid_status' });
  room.status = status;
  room.statusReason = reason || null;
  room.statusUpdatedAt = new Date().toISOString();
  rooms.set(room.id, room);
  roomTwin.set(room.id, { ...room, twinType: 'room', syncedAt: new Date().toISOString() });
  res.json(room);
});

// ---- Bookings ----
app.post('/api/bookings', requireAuth, (req, res) => {
  const { guestName, guestEmail, guestPhone, roomId, checkIn, checkOut, adults = 1, children = 0, specialRequests = '' } = req.body;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.status !== 'available') return res.status(409).json({ error: 'room_not_available', currentStatus: room.status });

  const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
  const subtotal = room.basePrice * nights;
  const taxes = Math.round(subtotal * 0.12);
  const total = subtotal + taxes;

  const booking = {
    id: 'bk_' + Date.now(),
    confirmationNumber: 'BK' + Date.now().toString().slice(-8),
    guestName, guestEmail, guestPhone,
    roomId, roomType: room.type,
    checkIn, checkOut, nights,
    adults, children,
    subtotal, taxes, total, currency: 'USD',
    status: 'confirmed',
    specialRequests,
    tenantId: req.session.businessId,
    createdAt: new Date().toISOString(),
  };
  bookings.set(booking.id, booking);
  bookingTwin.set(booking.id, { ...booking, twinType: 'booking', syncedAt: new Date().toISOString() });

  // Mark room occupied
  room.status = 'occupied';
  room.currentBookingId = booking.id;
  rooms.set(room.id, room);

  res.status(201).json(booking);
});

app.get('/api/bookings', (req, res) => {
  const { status, guestEmail } = req.query;
  let out = Array.from(bookings.values());
  if (status) out = out.filter(b => b.status === status);
  if (guestEmail) out = out.filter(b => b.guestEmail === guestEmail);
  res.json({ bookings: out, count: out.length });
});

app.get('/api/bookings/:id', (req, res) => {
  const b = bookings.get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  res.json(b);
});

app.post('/api/bookings/:id/check-in', requireAuth, (req, res) => {
  const b = bookings.get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  if (b.status !== 'confirmed') return res.status(409).json({ error: 'invalid_state', currentStatus: b.status });
  b.status = 'checked-in';
  b.checkedInAt = new Date().toISOString();
  bookings.set(b.id, b);
  res.json(b);
});

app.post('/api/bookings/:id/check-out', requireAuth, (req, res) => {
  const b = bookings.get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  if (b.status !== 'checked-in') return res.status(409).json({ error: 'invalid_state', currentStatus: b.status });
  b.status = 'checked-out';
  b.checkedOutAt = new Date().toISOString();
  bookings.set(b.id, b);
  const room = rooms.get(b.roomId);
  if (room) { room.status = 'cleaning'; room.currentBookingId = null; rooms.set(room.id, room); }
  res.json(b);
});

app.post('/api/bookings/:id/cancel', requireAuth, (req, res) => {
  const b = bookings.get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  if (!['confirmed', 'pending'].includes(b.status)) return res.status(409).json({ error: 'invalid_state', currentStatus: b.status });
  b.status = 'cancelled';
  b.cancelledAt = new Date().toISOString();
  b.cancellationReason = req.body.reason || null;
  bookings.set(b.id, b);
  const room = rooms.get(b.roomId);
  if (room) { room.status = 'available'; room.currentBookingId = null; rooms.set(room.id, room); }
  res.json(b);
});

// ---- Guests ----
app.post('/api/guests', requireAuth, (req, res) => {
  const guest = { id: 'guest_' + Date.now(), ...req.body, tenantId: req.session.businessId, loyaltyPoints: 0, tier: 'bronze', visits: 0, createdAt: new Date().toISOString() };
  guests.set(guest.id, guest);
  guestTwin.set(guest.id, { ...guest, twinType: 'guest', syncedAt: new Date().toISOString() });
  res.status(201).json(guest);
});

app.get('/api/guests', (req, res) => {
  res.json({ guests: Array.from(guests.values()), count: guests.size });
});

app.post('/api/guests/:id/points', requireAuth, (req, res) => {
  const g = guests.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Guest not found' });
  g.loyaltyPoints += req.body.points || 0;
  g.visits += 1;
  if (g.loyaltyPoints >= 10000) g.tier = 'platinum';
  else if (g.loyaltyPoints >= 5000) g.tier = 'gold';
  else if (g.loyaltyPoints >= 1000) g.tier = 'silver';
  guests.set(g.id, g);
  res.json(g);
});

// ---- Housekeeping ----
app.get('/api/housekeeping', (_req, res) => {
  res.json({ schedule: Array.from(housekeeping.values()), count: housekeeping.size });
});

app.post('/api/housekeeping/:id/start', requireAuth, (req, res) => {
  const h = housekeeping.get(req.params.id);
  if (!h) return res.status(404).json({ error: 'Task not found' });
  h.status = 'in-progress';
  h.assignedTo = req.body.assignedTo || h.assignedTo;
  h.startedAt = new Date().toISOString();
  housekeeping.set(h.id, h);
  res.json(h);
});

app.post('/api/housekeeping/:id/complete', requireAuth, (req, res) => {
  const h = housekeeping.get(req.params.id);
  if (!h) return res.status(404).json({ error: 'Task not found' });
  h.status = 'clean';
  h.completedAt = new Date().toISOString();
  housekeeping.set(h.id, h);
  // Free up rooms on this floor that were marked cleaning
  const floor = h.floor;
  for (const room of rooms.values()) {
    if (room.floor === floor && room.status === 'cleaning') {
      room.status = 'available';
      room.lastCleaned = new Date().toISOString();
      rooms.set(room.id, room);
    }
  }
  res.json(h);
});

// ---- Amenities ----
app.get('/api/amenities', (_req, res) => {
  res.json({ amenities: Array.from(amenities.values()), count: amenities.size });
});

app.post('/api/amenities/:id/book', requireAuth, (req, res) => {
  const a = amenities.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Amenity not found' });
  const booking = { id: 'am_' + Date.now(), amenityId: a.id, amenityName: a.name, guestId: req.body.guestId, scheduledAt: req.body.scheduledAt, price: a.price, status: 'booked', createdAt: new Date().toISOString() };
  res.status(201).json(booking);
});

// ---- Analytics ----
app.get('/api/analytics', requireAuth, (_req, res) => {
  const roomList = Array.from(rooms.values());
  const bookingList = Array.from(bookings.values());
  const occupancyByType = {};
  for (const rt of roomTypes) {
    const total = rt.count;
    const occupied = roomList.filter(r => r.type === rt.type && r.status === 'occupied').length;
    occupancyByType[rt.type] = { total, occupied, rate: total ? Math.round(occupied / total * 100) : 0 };
  }
  const today = new Date().toISOString().split('T')[0];
  const todayCheckIns = bookingList.filter(b => b.checkIn?.startsWith(today)).length;
  const todayCheckOuts = bookingList.filter(b => b.checkOut?.startsWith(today)).length;
  const totalRevenue = bookingList.filter(b => b.status !== 'cancelled').reduce((s, b) => s + (b.total || 0), 0);
  res.json({
    occupancyByType,
    totalRooms: rooms.size, totalBookings: bookings.size, totalGuests: guests.size,
    todayCheckIns, todayCheckOuts,
    totalRevenue, currency: 'USD',
    housekeepingPending: Array.from(housekeeping.values()).filter(h => h.status !== 'clean').length,
  });
});

// ============================================
// START
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Hotel AI Company',
    industry: 'hotel',
    layers: 15,
    version: '2.0.0',
    counts: {
      rooms: rooms.size,
      bookings: bookings.size,
      guests: guests.size,
      housekeeping: housekeeping.size,
      amenities: amenities.size,
    },
    timestamp: new Date().toISOString(),
  });
});

initDatabase().catch(console.warn);

// Register RTMN Industry Integration
industryIntegration.registerRoutes(app, 'hotel', PORT);
// Register StayOwn-Hospitality integration (rez-hotel-service, rez-hotel-pos, etc.)
stayownIntegration.registerRoutes(app);
app.listen(PORT, () => {
  console.log('✅ hotel-os AI Company Platform running on port ' + PORT);
  console.log('📦 15 Layers: Intelligence, Growth, Commerce, Finance, Workforce, Legal, Property, Health, Mobility, Identity, Memory, Twins, Autonomous, Network');
  console.log('🌙 Sharia Compliance: Murabaha, Ijara, Halal Services, Hijri Calendar');
});
