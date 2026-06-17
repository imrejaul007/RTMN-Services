/**
 * StayOwn Hotel OS - AI-First Hotel Intelligence Platform
 *
 * All 15 layers of RTMN ecosystem integrated for hospitality.
 *
 * Port: 5025
 * Industry: Hotel / Hospitality
 *
 * Competitors: Oracle Opera, Cloudbeds, Mews, Agilysys, eZee, Hotelogix, Stayntouch
 */

const crypto = require('crypto');

const express = require('express');
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
    console.log('✅ MongoDB connected for StayOwn Hotel OS');
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
// HOTEL DATA STORES
// ============================================

// Rooms
const rooms = new Map();
const roomTypes = new Map();
const floors = new Map();

// Bookings & Reservations
const bookings = new Map();
const bookingCounter = { value: 1000 };

// Guests
const guests = new Map();
const guestPreferences = new Map();

// Housekeeping
const housekeepingTasks = new Map();
const roomStatus = new Map();

// Invoices & Billing
const invoices = new Map();
const folioTransactions = new Map();

// Services (Room Service, Spa, etc.)
const services = new Map();
const serviceOrders = new Map();

// POS / Restaurant within hotel
const posOrders = new Map();

// Night Audit
const nightAuditRecords = new Map();

// Initialize sample hotel data
function initSampleData() {
  // Room Types
  const roomTypeList = [
    { id: 'rt_standard', name: 'Standard Room', shortCode: 'STD', baseRate: 150, maxOccupancy: 2, amenities: ['WiFi', 'TV', 'AC'], size: 25 },
    { id: 'rt_deluxe', name: 'Deluxe Room', shortCode: 'DLX', baseRate: 250, maxOccupancy: 2, amenities: ['WiFi', 'TV', 'AC', 'Minibar', 'Balcony'], size: 35 },
    { id: 'rt_suite', name: 'Junior Suite', shortCode: 'STE', baseRate: 400, maxOccupancy: 3, amenities: ['WiFi', 'TV', 'AC', 'Minibar', 'Living Area', 'Bathtub'], size: 50 },
    { id: 'rt_presidential', name: 'Presidential Suite', shortCode: 'PRS', baseRate: 800, maxOccupancy: 4, amenities: ['WiFi', 'TV', 'AC', 'Minibar', 'Living Room', 'Jacuzzi', 'Butler'], size: 100 },
  ];
  roomTypeList.forEach(rt => { if (!roomTypes.has(rt.id)) roomTypes.set(rt.id, rt); });

  // Floors
  for (let f = 1; f <= 5; f++) {
    floors.set(`floor_${f}`, { id: `floor_${f}`, number: f, name: f <= 3 ? 'Standard' : f === 4 ? 'Premium' : 'Executive' });
  }

  // Rooms (30 rooms across 5 floors)
  let roomNum = 101;
  for (let f = 1; f <= 5; f++) {
    for (let r = 0; r < 6; r++) {
      const roomId = `room_${roomNum}`;
      const floorType = f <= 3 ? 'STD' : f === 4 ? 'DLX' : 'STE';
      const roomType = roomTypeList.find(rt => rt.shortCode === floorType);
      rooms.set(roomId, {
        id: roomId,
        number: roomNum.toString(),
        floor: `floor_${f}`,
        type: roomType?.id || 'rt_standard',
        typeName: roomType?.name || 'Standard Room',
        shortCode: floorType,
        status: 'available', // available, occupied, dirty, maintenance, out-of-order
        features: roomType?.amenities || [],
        rackRate: roomType?.baseRate || 150,
        maxOccupancy: roomType?.maxOccupancy || 2,
        size: roomType?.size || 25,
        tenantId: 'demo'
      });
      roomStatus.set(roomId, { roomId, housekeepingStatus: 'clean', lastCleaned: new Date().toISOString() });
      roomNum++;
    }
  }

  // Sample guests
  const sampleGuests = [
    { id: 'guest_1', name: 'John Smith', email: 'john.smith@email.com', phone: '+1-555-0101', nationality: 'USA', idType: 'passport', idNumber: 'US123456', notes: 'VIP - prefers high floor' },
    { id: 'guest_2', name: 'Maria Garcia', email: 'maria.g@email.com', phone: '+1-555-0102', nationality: 'Spain', idType: 'passport', idNumber: 'ES789012', notes: 'Anniversary celebration' },
    { id: 'guest_3', name: 'Raj Patel', email: 'raj.patel@email.com', phone: '+91-9876543210', nationality: 'India', idType: 'passport', idNumber: 'IN345678', notes: 'Frequent guest - Diamond member' },
  ];
  sampleGuests.forEach(g => {
    guests.set(g.id, { ...g, createdAt: new Date().toISOString(), totalStays: 0, totalSpend: 0 });
    guestPreferences.set(g.id, { guestId: g.id, preferences: { pillow: 'firm', view: 'city', floor: 'high', extraBedding: false }, dietary: [], allergies: [], notes: [] });
  });

  // Sample booking
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const checkout = new Date(today);
  checkout.setDate(checkout.getDate() + 3);

  bookings.set('book_1', {
    id: 'book_1',
    confirmationNumber: 'STY' + Date.now().toString().slice(-6),
    guestId: 'guest_1',
    guestName: 'John Smith',
    roomId: 'room_201',
    roomNumber: '201',
    roomType: 'rt_deluxe',
    checkIn: today.toISOString().split('T')[0],
    checkOut: checkout.toISOString().split('T')[0],
    nights: 3,
    adults: 2,
    children: 0,
    status: 'checked-in',
    totalAmount: 750,
    paidAmount: 750,
    balance: 0,
    source: 'direct', // direct, booking.com, expedia, etc.
    paymentMethod: 'credit_card',
    specialRequests: 'Late checkout if available',
    createdAt: new Date().toISOString()
  });

  // Update room status
  if (rooms.has('room_201')) {
    rooms.get('room_201').status = 'occupied';
  }
}

initSampleData();

// ============================================
// HOTEL DIGITAL TWINS
// ============================================

const guestTwin = new Map();
const roomTwin = new Map();
const bookingTwin = new Map();
const propertyTwin = new Map();
const staffTwin = new Map();
const serviceTwin = new Map();
const invoiceTwin = new Map();

// ============================================
// HOTEL API - CORE PMS ENDPOINTS
// ============================================

// ---------- ROOM MANAGEMENT ----------

app.get('/api/rooms', (req, res) => {
  const { status, floor, type, search } = req.query;
  let roomList = Array.from(rooms.values());
  if (status) roomList = roomList.filter(r => r.status === status);
  if (floor) roomList = roomList.filter(r => r.floor === floor);
  if (type) roomList = roomList.filter(r => r.type === type);
  if (search) roomList = roomList.filter(r => r.number.includes(search));
  res.json({ rooms: roomList, count: roomList.length });
});

app.get('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const status = roomStatus.get(req.params.id) || {};
  res.json({ ...room, housekeeping: status });
});

app.post('/api/rooms', requireAuth, (req, res) => {
  const { number, floor, type, shortCode, rackRate, maxOccupancy, size, features } = req.body;
  if (!number || !floor) return res.status(400).json({ error: 'Room number and floor required' });
  const id = `room_${number}`;
  if (rooms.has(id)) return res.status(409).json({ error: 'Room already exists' });
  const room = { id, number, floor, type: type || 'rt_standard', typeName: roomTypes.get(type)?.name || 'Standard', shortCode: shortCode || 'STD', status: 'available', features: features || [], rackRate: rackRate || 150, maxOccupancy: maxOccupancy || 2, size: size || 25, tenantId: req.session.businessId };
  rooms.set(id, room);
  roomTwin.set(id, { ...room, twinType: 'room', syncedAt: new Date().toISOString() });
  roomStatus.set(id, { roomId: id, housekeepingStatus: 'clean', lastCleaned: new Date().toISOString() });
  res.status(201).json(room);
});

app.patch('/api/rooms/:id', requireAuth, (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  Object.assign(room, req.body);
  rooms.set(room.id, room);
  roomTwin.set(room.id, { ...room, twinType: 'room', syncedAt: new Date().toISOString() });
  res.json(room);
});

app.patch('/api/rooms/:id/status', requireAuth, (req, res) => {
  const { status, reason } = req.body;
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const validStatuses = ['available', 'occupied', 'dirty', 'maintenance', 'out-of-order', 'blocked'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  room.status = status;
  rooms.set(room.id, room);
  roomTwin.set(room.id, { ...room, twinType: 'room', syncedAt: new Date().toISOString() });
  res.json({ room, message: `Room ${room.number} status updated to ${status}` + (reason ? `: ${reason}` : '') });
});

// ---------- ROOM TYPES ----------

app.get('/api/room-types', (req, res) => {
  res.json({ roomTypes: Array.from(roomTypes.values()) });
});

app.post('/api/room-types', requireAuth, (req, res) => {
  const { id, name, shortCode, baseRate, maxOccupancy, amenities, size } = req.body;
  if (!id || !name || !baseRate) return res.status(400).json({ error: 'id, name, baseRate required' });
  const roomType = { id, name, shortCode: shortCode || id.slice(0, 3).toUpperCase(), baseRate, maxOccupancy: maxOccupancy || 2, amenities: amenities || [], size: size || 25 };
  roomTypes.set(id, roomType);
  res.status(201).json(roomType);
});

// ---------- FLOOR MANAGEMENT ----------

app.get('/api/floors', (req, res) => {
  const floorList = Array.from(floors.values());
  // Add room counts
  const floorsWithCounts = floorList.map(f => ({
    ...f,
    totalRooms: Array.from(rooms.values()).filter(r => r.floor === f.id).length,
    availableRooms: Array.from(rooms.values()).filter(r => r.floor === f.id && r.status === 'available').length,
    occupiedRooms: Array.from(rooms.values()).filter(r => r.floor === f.id && r.status === 'occupied').length
  }));
  res.json({ floors: floorsWithCounts });
});

// ---------- GUEST MANAGEMENT ----------

app.get('/api/guests', (req, res) => {
  const { search, membership } = req.query;
  let guestList = Array.from(guests.values());
  if (search) guestList = guestList.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) || g.email?.toLowerCase().includes(search.toLowerCase()) || g.phone?.includes(search));
  if (membership) guestList = guestList.filter(g => g.membershipTier === membership);
  res.json({ guests: guestList, count: guestList.length });
});

app.get('/api/guests/:id', (req, res) => {
  const guest = guests.get(req.params.id);
  if (!guest) return res.status(404).json({ error: 'Guest not found' });
  const prefs = guestPreferences.get(req.params.id) || {};
  // Get guest's booking history
  const guestBookings = Array.from(bookings.values()).filter(b => b.guestId === req.params.id);
  res.json({ ...guest, preferences: prefs, bookingHistory: guestBookings });
});

app.post('/api/guests', requireAuth, (req, res) => {
  const { name, email, phone, nationality, idType, idNumber, dateOfBirth, address, company, membershipTier, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = 'guest_' + Date.now();
  const guest = { id, name, email, phone, nationality, idType, idNumber, dateOfBirth, address, company, membershipTier: membershipTier || 'standard', notes, totalStays: 0, totalSpend: 0, createdAt: new Date().toISOString() };
  guests.set(id, guest);
  guestPreferences.set(id, { guestId: id, preferences: { pillow: 'medium', view: 'any', floor: 'any', extraBedding: false }, dietary: [], allergies: [], notes: [] });
  guestTwin.set(id, { ...guest, twinType: 'guest', syncedAt: new Date().toISOString() });
  res.status(201).json(guest);
});

app.patch('/api/guests/:id', requireAuth, (req, res) => {
  const guest = guests.get(req.params.id);
  if (!guest) return res.status(404).json({ error: 'Guest not found' });
  Object.assign(guest, req.body);
  guests.set(guest.id, guest);
  guestTwin.set(guest.id, { ...guest, twinType: 'guest', syncedAt: new Date().toISOString() });
  res.json(guest);
});

app.get('/api/guests/:id/preferences', (req, res) => {
  const prefs = guestPreferences.get(req.params.id);
  if (!prefs) return res.status(404).json({ error: 'Guest preferences not found' });
  res.json(prefs);
});

app.patch('/api/guests/:id/preferences', requireAuth, (req, res) => {
  const prefs = guestPreferences.get(req.params.id) || { guestId: req.params.id };
  Object.assign(prefs, req.body);
  guestPreferences.set(req.params.id, prefs);
  res.json(prefs);
});

// ---------- BOOKING / RESERVATION MANAGEMENT ----------

app.get('/api/bookings', (req, res) => {
  const { status, date, guestId, roomId } = req.query;
  let bookingList = Array.from(bookings.values());
  if (status) bookingList = bookingList.filter(b => b.status === status);
  if (guestId) bookingList = bookingList.filter(b => b.guestId === guestId);
  if (roomId) bookingList = bookingList.filter(b => b.roomId === roomId);
  if (date) {
    const targetDate = new Date(date).toISOString().split('T')[0];
    bookingList = bookingList.filter(b => b.checkIn <= targetDate && b.checkOut > targetDate);
  }
  res.json({ bookings: bookingList, count: bookingList.length });
});

app.get('/api/bookings/:id', (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  // Get guest info
  const guest = guests.get(booking.guestId) || {};
  const room = rooms.get(booking.roomId) || {};
  res.json({ ...booking, guest, room });
});

app.post('/api/bookings', requireAuth, (req, res) => {
  const { guestId, roomId, checkIn, checkOut, adults, children, roomType, source, paymentMethod, totalAmount, discount, specialRequests, extras } = req.body;
  if (!guestId || !checkIn || !checkOut) return res.status(400).json({ error: 'guestId, checkIn, checkOut required' });

  bookingCounter.value++;
  const id = `book_${bookingCounter.value}`;
  const confNum = 'STY' + bookingCounter.value.toString();

  // Calculate nights and amount
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  const room = roomId ? rooms.get(roomId) : null;
  const rackRate = room?.rackRate || roomTypes.get(roomType)?.baseRate || 150;
  const amount = totalAmount || (rackRate * nights);

  const booking = {
    id, confirmationNumber: confNum, guestId, roomId: roomId || null, roomNumber: room?.number || null,
    roomType: room?.type || roomType || 'rt_standard', checkIn, checkOut, nights, adults: adults || 1, children: children || 0,
    status: roomId ? 'confirmed' : 'on-request', totalAmount: amount, paidAmount: 0, balance: amount,
    discount: discount || 0, source: source || 'direct', paymentMethod: paymentMethod || 'pending',
    specialRequests: specialRequests || '', extras: extras || [], tenantId: req.session.businessId,
    createdAt: new Date().toISOString()
  };

  bookings.set(id, booking);
  bookingTwin.set(id, { ...booking, twinType: 'booking', syncedAt: new Date().toISOString() });
  res.status(201).json(booking);
});

app.patch('/api/bookings/:id', requireAuth, (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const oldRoomId = booking.roomId;

  // Handle room changes
  if (req.body.roomId && req.body.roomId !== oldRoomId) {
    if (oldRoomId && rooms.has(oldRoomId)) {
      rooms.get(oldRoomId).status = 'available';
    }
    const newRoom = rooms.get(req.body.roomId);
    if (newRoom && booking.status === 'checked-in') {
      newRoom.status = 'occupied';
    }
    booking.roomNumber = newRoom?.number || null;
  }

  Object.assign(booking, req.body);
  bookings.set(booking.id, booking);
  bookingTwin.set(booking.id, { ...booking, twinType: 'booking', syncedAt: new Date().toISOString() });
  res.json(booking);
});

app.post('/api/bookings/:id/assign-room', requireAuth, (req, res) => {
  const { roomId } = req.body;
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (!roomId) return res.status(400).json({ error: 'roomId required' });

  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.status === 'occupied') return res.status(409).json({ error: 'Room is currently occupied' });

  const oldRoomId = booking.roomId;
  if (oldRoomId && rooms.has(oldRoomId)) {
    rooms.get(oldRoomId).status = 'available';
  }

  room.status = 'occupied';
  booking.roomId = roomId;
  booking.roomNumber = room.number;
  booking.roomType = room.type;

  rooms.set(room.id, room);
  bookings.set(booking.id, booking);
  res.json({ booking, room });
});

app.post('/api/bookings/:id/check-in', requireAuth, (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status === 'checked-in') return res.status(409).json({ error: 'Already checked in' });
  if (!booking.roomId) return res.status(400).json({ error: 'No room assigned' });

  booking.status = 'checked-in';
  booking.checkInTime = new Date().toISOString();

  const room = rooms.get(booking.roomId);
  if (room) room.status = 'occupied';

  // Update guest stats
  const guest = guests.get(booking.guestId);
  if (guest) {
    guest.totalStays = (guest.totalStays || 0) + 1;
    guests.set(guest.id, guest);
  }

  // Create initial folio
  const folioId = `folio_${booking.id}`;
  folioTransactions.set(folioId, {
    folioId, bookingId: booking.id, guestId: booking.guestId,
    transactions: [{ type: 'charge', description: 'Room charge (' + booking.nights + ' nights)', amount: booking.totalAmount, date: new Date().toISOString() }]
  });

  bookings.set(booking.id, booking);
  bookingTwin.set(booking.id, { ...booking, twinType: 'booking', syncedAt: new Date().toISOString() });
  res.json({ booking, message: 'Check-in successful' });
});

app.post('/api/bookings/:id/check-out', requireAuth, (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'checked-in') return res.status(409).json({ error: 'Guest is not checked in' });

  booking.status = 'checked-out';
  booking.checkOutTime = new Date().toISOString();

  const room = rooms.get(booking.roomId);
  if (room) {
    room.status = 'dirty';
    rooms.set(room.id, room);
  }

  // Create housekeeping task
  const taskId = `hk_task_${Date.now()}`;
  housekeepingTasks.set(taskId, {
    id: taskId, roomId: booking.roomId, roomNumber: booking.roomNumber,
    task: 'checkout-cleaning', priority: 'normal', status: 'pending',
    assignedTo: null, notes: 'Guest checkout - full cleaning required',
    createdAt: new Date().toISOString()
  });

  bookings.set(booking.id, booking);
  bookingTwin.set(booking.id, { ...booking, twinType: 'booking', syncedAt: new Date().toISOString() });
  res.json({ booking, folioId: `folio_${booking.id}`, message: 'Check-out successful. Room marked for cleaning.' });
});

app.post('/api/bookings/:id/cancel', requireAuth, (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status === 'checked-out') return res.status(409).json({ error: 'Cannot cancel checked-out booking' });

  booking.status = 'cancelled';
  booking.cancellationReason = req.body.reason || 'No reason provided';
  booking.cancelledAt = new Date().toISOString();

  if (booking.roomId && rooms.has(booking.roomId)) {
    rooms.get(booking.roomId).status = 'available';
  }

  bookings.set(booking.id, booking);
  res.json({ booking, message: 'Booking cancelled' });
});

// ---------- AVAILABILITY SEARCH ----------

app.get('/api/availability', (req, res) => {
  const { checkIn, checkOut, adults, children, roomType } = req.query;
  if (!checkIn || !checkOut) return res.status(400).json({ error: 'checkIn and checkOut required' });

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  // Get all bookings in date range
  const overlappingBookings = Array.from(bookings.values()).filter(b =>
    b.status !== 'cancelled' && b.status !== 'no-show' &&
    new Date(b.checkIn) < checkOutDate && new Date(b.checkOut) > checkInDate
  );
  const occupiedRoomIds = new Set(overlappingBookings.map(b => b.roomId));

  // Get available rooms
  let availableRooms = Array.from(rooms.values()).filter(r =>
    !occupiedRoomIds.has(r.id) && r.status === 'available'
  );

  if (roomType) availableRooms = availableRooms.filter(r => r.type === roomType);
  if (adults) availableRooms = availableRooms.filter(r => r.maxOccupancy >= parseInt(adults) + (parseInt(children) || 0));

  // Calculate rates
  const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  const roomsWithRates = availableRooms.map(r => ({
    ...r,
    totalRate: r.rackRate * nights,
    nightlyRate: r.rackRate,
    nights
  }));

  res.json({
    checkIn, checkOut, nights, adults: parseInt(adults) || 1, children: parseInt(children) || 0,
    available: roomsWithRates.length,
    rooms: roomsWithRates
  });
});

// ---------- HOUSEKEEPING ----------

app.get('/api/housekeeping/tasks', (req, res) => {
  const { status, priority, assignedTo } = req.query;
  let tasks = Array.from(housekeepingTasks.values());
  if (status) tasks = tasks.filter(t => t.status === status);
  if (priority) tasks = tasks.filter(t => t.priority === priority);
  if (assignedTo) tasks = tasks.filter(t => t.assignedTo === assignedTo);
  res.json({ tasks, count: tasks.length });
});

app.post('/api/housekeeping/tasks', requireAuth, (req, res) => {
  const { roomId, task, priority, notes, assignedTo } = req.body;
  if (!roomId || !task) return res.status(400).json({ error: 'roomId and task required' });
  const room = rooms.get(roomId);
  const taskId = 'hk_task_' + Date.now();
  const hkTask = {
    id: taskId, roomId, roomNumber: room?.number, task, priority: priority || 'normal',
    status: 'pending', assignedTo, notes, createdAt: new Date().toISOString()
  };
  housekeepingTasks.set(taskId, hkTask);
  res.status(201).json(hkTask);
});

app.patch('/api/housekeeping/tasks/:id', requireAuth, (req, res) => {
  const task = housekeepingTasks.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  Object.assign(task, req.body);
  if (req.body.status === 'completed') {
    task.completedAt = new Date().toISOString();
    const room = rooms.get(task.roomId);
    if (room) {
      room.status = 'available';
      rooms.set(room.id, room);
    }
    const status = roomStatus.get(task.roomId) || { roomId: task.roomId };
    status.housekeepingStatus = 'clean';
    status.lastCleaned = new Date().toISOString();
    roomStatus.set(task.roomId, status);
  }
  housekeepingTasks.set(task.id, task);
  res.json(task);
});

app.get('/api/housekeeping/rooms', (req, res) => {
  const roomList = Array.from(rooms.values()).map(r => ({
    ...r,
    housekeeping: roomStatus.get(r.id) || { housekeepingStatus: 'unknown', lastCleaned: null }
  }));
  res.json({ rooms: roomList, summary: { clean: roomList.filter(r => r.status === 'available').length, dirty: roomList.filter(r => r.status === 'dirty').length, occupied: roomList.filter(r => r.status === 'occupied').length, maintenance: roomList.filter(r => r.status === 'maintenance').length } });
});

// ---------- ROOM SERVICES ----------

app.get('/api/services', (req, res) => {
  res.json({ services: Array.from(services.values()) });
});

app.post('/api/services', requireAuth, (req, res) => {
  const { name, category, description, price, available } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'name and price required' });
  const service = { id: 'svc_' + Date.now(), name, category: category || 'misc', description, price, available: available !== false, createdAt: new Date().toISOString() };
  services.set(service.id, service);
  serviceTwin.set(service.id, { ...service, twinType: 'service' });
  res.status(201).json(service);
});

app.post('/api/services/orders', requireAuth, (req, res) => {
  const { bookingId, items, deliveryTime, notes } = req.body;
  if (!bookingId || !items?.length) return res.status(400).json({ error: 'bookingId and items required' });
  const booking = bookings.get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const orderId = 'svc_order_' + Date.now();
  const order = {
    id: orderId, bookingId, guestId: booking.guestId, roomId: booking.roomId, roomNumber: booking.roomNumber,
    items, subtotal, tax: Math.round(subtotal * 0.1), total: 0, deliveryTime: deliveryTime || 'asap',
    notes, status: 'pending', createdAt: new Date().toISOString()
  };
  order.total = order.subtotal + order.tax;
  serviceOrders.set(orderId, order);

  // Add to folio
  const folioId = `folio_${bookingId}`;
  const folio = folioTransactions.get(folioId) || { folioId, bookingId, transactions: [] };
  folio.transactions.push({ type: 'charge', description: 'Room Service - ' + orderId, amount: order.total, date: new Date().toISOString() });
  folioTransactions.set(folioId, folio);

  res.status(201).json(order);
});

app.get('/api/services/orders', (req, res) => {
  const { status, bookingId } = req.query;
  let orders = Array.from(serviceOrders.values());
  if (status) orders = orders.filter(o => o.status === status);
  if (bookingId) orders = orders.filter(o => o.bookingId === bookingId);
  res.json({ orders });
});

app.patch('/api/services/orders/:id', requireAuth, (req, res) => {
  const order = serviceOrders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  Object.assign(order, req.body);
  serviceOrders.set(order.id, order);
  res.json(order);
});

// ---------- INVOICES & FOLIO ----------

app.get('/api/invoices', (req, res) => {
  const { bookingId, guestId } = req.query;
  let invoicesList = [];
  for (const [id, folio] of folioTransactions) {
    if (bookingId && folio.bookingId !== bookingId) continue;
    if (guestId && folio.guestId !== guestId) continue;
    invoicesList.push({ ...folio, totalCharges: folio.transactions.filter(t => t.type === 'charge').reduce((s, t) => s + t.amount, 0), totalPayments: folio.transactions.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0) });
  }
  res.json({ invoices: invoicesList });
});

app.get('/api/invoices/:bookingId', (req, res) => {
  const folioId = `folio_${req.params.bookingId}`;
  const folio = folioTransactions.get(folioId);
  if (!folio) return res.status(404).json({ error: 'Folio not found' });
  const booking = bookings.get(req.params.bookingId) || {};
  res.json({ ...folio, booking, balance: (folio.transactions.filter(t => t.type === 'charge').reduce((s, t) => s + t.amount, 0) - folio.transactions.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0)).toFixed(2) });
});

app.post('/api/invoices/:bookingId/charge', requireAuth, (req, res) => {
  const { description, amount } = req.body;
  if (!description || !amount) return res.status(400).json({ error: 'description and amount required' });
  const folioId = `folio_${req.params.bookingId}`;
  const folio = folioTransactions.get(folioId) || { folioId, bookingId: req.params.bookingId, guestId: '', transactions: [] };
  folio.transactions.push({ type: 'charge', description, amount, date: new Date().toISOString() });
  folioTransactions.set(folioId, folio);
  res.json({ success: true, transaction: folio.transactions[folio.transactions.length - 1] });
});

app.post('/api/invoices/:bookingId/payment', requireAuth, (req, res) => {
  const { amount, method, reference } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount required' });
  const folioId = `folio_${req.params.bookingId}`;
  const folio = folioTransactions.get(folioId) || { folioId, bookingId: req.params.bookingId, guestId: '', transactions: [] };
  folio.transactions.push({ type: 'payment', description: 'Payment - ' + (method || 'cash'), amount, reference, date: new Date().toISOString() });
  folioTransactions.set(folioId, folio);

  // Update booking paid amount
  const booking = bookings.get(req.params.bookingId);
  if (booking) {
    booking.paidAmount = (booking.paidAmount || 0) + amount;
    booking.balance = booking.totalAmount - booking.paidAmount;
    bookings.set(booking.id, booking);
  }

  res.json({ success: true, transaction: folio.transactions[folio.transactions.length - 1] });
});

// ---------- NIGHT AUDIT ----------

app.post('/api/night-audit', requireAuth, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const auditId = `audit_${today}_${Date.now()}`;

  // Get today's stats
  const allBookings = Array.from(bookings.values());
  const todayArrivals = allBookings.filter(b => b.checkIn === today && b.status !== 'cancelled');
  const todayDepartures = allBookings.filter(b => b.checkOut === today && b.status === 'checked-in');
  const inHouse = allBookings.filter(b => b.status === 'checked-in');
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowArrivals = allBookings.filter(b => b.checkIn === tomorrow.toISOString().split('T')[0] && b.status === 'confirmed');

  // Revenue
  let totalRevenue = 0;
  for (const [, folio] of folioTransactions) {
    totalRevenue += folio.transactions.filter(t => t.type === 'charge').reduce((s, t) => s + t.amount, 0);
  }

  // Room status summary
  const roomList = Array.from(rooms.values());
  const roomStatusSummary = {
    available: roomList.filter(r => r.status === 'available').length,
    occupied: roomList.filter(r => r.status === 'occupied').length,
    dirty: roomList.filter(r => r.status === 'dirty').length,
    maintenance: roomList.filter(r => r.status === 'maintenance').length,
    outOfOrder: roomList.filter(r => r.status === 'out-of-order').length
  };

  const audit = {
    auditId, date: today, generatedAt: new Date().toISOString(),
    arrivals: todayArrivals.length, departures: todayDepartures.length,
    inHouse: inHouse.length, tomorrowArrivals: tomorrowArrivals.length,
    occupancyRate: ((roomStatusSummary.occupied / roomList.length) * 100).toFixed(1) + '%',
    revenue: totalRevenue, roomStatus: roomStatusSummary
  };

  nightAuditRecords.set(auditId, audit);
  res.json(audit);
});

app.get('/api/night-audit', (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  for (const [id, audit] of nightAuditRecords) {
    if (id.includes(targetDate)) return res.json(audit);
  }
  res.json({ error: 'No audit found for date', date: targetDate });
});

// ---------- F&B / RESTAURANT POS ----------

// Hotel dining outlets
const diningOutlets = new Map([
  ['outlet_1', { id: 'outlet_1', name: 'Main Restaurant', type: 'restaurant', hours: '7:00 AM - 10:00 PM', tables: 20, active: true }],
  ['outlet_2', { id: 'outlet_2', name: 'Rooftop Bar', type: 'bar', hours: '5:00 PM - 1:00 AM', tables: 10, active: true }],
  ['outlet_3', { id: 'outlet_3', name: 'Pool Cafe', type: 'cafe', hours: '8:00 AM - 8:00 PM', tables: 15, active: true }],
]);

// F&B Menu
const fbMenuItems = new Map([
  ['fb_1', { id: 'fb_1', name: 'Continental Breakfast', category: 'Breakfast', price: 15, outlet: 'outlet_1', available: true }],
  ['fb_2', { id: 'fb_2', name: 'Full English Breakfast', category: 'Breakfast', price: 25, outlet: 'outlet_1', available: true }],
  ['fb_3', { id: 'fb_3', name: 'Caesar Salad', category: 'Salads', price: 18, outlet: 'outlet_1', available: true }],
  ['fb_4', { id: 'fb_4', name: 'Grilled Salmon', category: 'Main Course', price: 35, outlet: 'outlet_1', available: true }],
  ['fb_5', { id: 'fb_5', name: 'Steak & Fries', category: 'Main Course', price: 45, outlet: 'outlet_1', available: true }],
  ['fb_6', { id: 'fb_6', name: 'Signature Cocktail', category: 'Beverages', price: 12, outlet: 'outlet_2', available: true }],
  ['fb_7', { id: 'fb_7', name: 'Craft Beer', category: 'Beverages', price: 8, outlet: 'outlet_2', available: true }],
  ['fb_8', { id: 'fb_8', name: 'Fresh Juice', category: 'Beverages', price: 6, outlet: 'outlet_3', available: true }],
]);

// POS Tables
const posTables = new Map();
for (let i = 1; i <= 45; i++) {
  posTables.set(`pos_table_${i}`, { id: `pos_table_${i}`, number: i, outlet: i <= 20 ? 'outlet_1' : i <= 30 ? 'outlet_2' : 'outlet_3', capacity: 4, status: 'available', currentOrder: null });
}

// POS Order Counter
const posOrderCounter = { value: 5000 };

app.get('/api/dining/outlets', (req, res) => {
  res.json({ outlets: Array.from(diningOutlets.values()) });
});

app.post('/api/dining/outlets', requireAuth, (req, res) => {
  const { name, type, hours, tables } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type required' });
  const id = 'outlet_' + Date.now();
  const outlet = { id, name, type, hours: hours || '', tables: tables || 10, active: true };
  diningOutlets.set(id, outlet);
  res.status(201).json(outlet);
});

app.get('/api/dining/menu', (req, res) => {
  const { outlet, category } = req.query;
  let items = Array.from(fbMenuItems.values()).filter(i => i.available);
  if (outlet) items = items.filter(i => i.outlet === outlet);
  if (category) items = items.filter(i => i.category === category);
  res.json({ items, count: items.length });
});

app.post('/api/dining/menu', requireAuth, (req, res) => {
  const { name, category, price, outlet, available } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'name and price required' });
  const id = 'fb_' + Date.now();
  const item = { id, name, category: category || 'General', price, outlet: outlet || 'outlet_1', available: available !== false };
  fbMenuItems.set(id, item);
  res.status(201).json(item);
});

app.get('/api/dining/tables', (req, res) => {
  const { outlet, status } = req.query;
  let tables = Array.from(posTables.values());
  if (outlet) tables = tables.filter(t => t.outlet === outlet);
  if (status) tables = tables.filter(t => t.status === status);
  res.json({ tables });
});

app.post('/api/dining/tables/:id/occupy', requireAuth, (req, res) => {
  const table = posTables.get(req.params.id);
  if (!table) return res.status(404).json({ error: 'Table not found' });
  table.status = 'occupied';
  table.guestCount = req.body.guestCount || 1;
  table.serverId = req.body.serverId;
  posTables.set(table.id, table);
  res.json(table);
});

app.post('/api/dining/orders', requireAuth, (req, res) => {
  const { tableId, outletId, guestId, items, serverId, orderType } = req.body;
  if (!items?.length) return res.status(400).json({ error: 'items required' });
  if (!tableId && !guestId) return res.status(400).json({ error: 'tableId or guestId required' });

  posOrderCounter.value++;
  const orderId = `pos_order_${posOrderCounter.value}`;
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = Math.round(subtotal * 0.1);

  const order = {
    id: orderId, orderNumber: 'ORD' + posOrderCounter.value, tableId, outletId: outletId || 'outlet_1',
    guestId, serverId, items, subtotal, tax, total: subtotal + tax, orderType: orderType || 'dine-in',
    status: 'open', printed: false, paid: false,
    createdAt: new Date().toISOString()
  };

  posOrders.set(orderId, order);
  if (tableId) {
    const table = posTables.get(tableId);
    if (table) { table.status = 'occupied'; table.currentOrder = orderId; posTables.set(table.id, table); }
  }
  res.status(201).json(order);
});

app.get('/api/dining/orders', (req, res) => {
  const { status, outletId, tableId } = req.query;
  let orders = Array.from(posOrders.values());
  if (status) orders = orders.filter(o => o.status === status);
  if (outletId) orders = orders.filter(o => o.outletId === outletId);
  if (tableId) orders = orders.filter(o => o.tableId === tableId);
  res.json({ orders, count: orders.length });
});

app.patch('/api/dining/orders/:id', requireAuth, (req, res) => {
  const order = posOrders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  Object.assign(order, req.body);

  // Auto-update table status
  if (req.body.status === 'closed' && order.tableId) {
    const table = posTables.get(order.tableId);
    if (table) { table.status = 'available'; table.currentOrder = null; posTables.set(table.id, table); }
  }

  posOrders.set(order.id, order);
  res.json(order);
});

app.post('/api/dining/orders/:id/pay', requireAuth, (req, res) => {
  const { method, roomCharge, splitAmount } = req.body;
  const order = posOrders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  order.paid = true;
  order.status = 'closed';
  order.paymentMethod = method || 'cash';
  order.paidAt = new Date().toISOString();
  if (splitAmount) order.splitPayment = { amount: splitAmount, method, paidAt: new Date().toISOString() };

  posOrders.set(order.id, order);

  // If room charge, add to guest folio
  if (roomCharge && order.guestId) {
    const guestBookings = Array.from(bookings.values()).filter(b => b.guestId === order.guestId && b.status === 'checked-in');
    if (guestBookings.length > 0) {
      const folioId = `folio_${guestBookings[0].id}`;
      const folio = folioTransactions.get(folioId) || { folioId, bookingId: guestBookings[0].id, guestId: order.guestId, transactions: [] };
      folio.transactions.push({ type: 'charge', description: 'F&B - ' + order.outletId, amount: order.total, date: new Date().toISOString() });
      folioTransactions.set(folioId, folio);
    }
  }

  // Update table
  if (order.tableId) {
    const table = posTables.get(order.tableId);
    if (table) { table.status = 'available'; table.currentOrder = null; posTables.set(table.id, table); }
  }

  res.json({ success: true, order });
});

app.get('/api/dining/revenue', requireAuth, (req, res) => {
  const { date, outletId } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  let orders = Array.from(posOrders.values()).filter(o => o.paid && o.paidAt?.startsWith(targetDate));
  if (outletId) orders = orders.filter(o => o.outletId === outletId);

  const byOutlet = {};
  for (const order of orders) {
    if (!byOutlet[order.outletId]) byOutlet[order.outletId] = { count: 0, revenue: 0 };
    byOutlet[order.outletId].count++;
    byOutlet[order.outletId].revenue += order.total;
  }

  res.json({ date: targetDate, totalOrders: orders.length, totalRevenue: orders.reduce((s, o) => s + o.total, 0), byOutlet });
});

// ---------- HOTEL ANALYTICS ----------

app.get('/api/analytics', requireAuth, (req, res) => {
  const roomList = Array.from(rooms.values());
  const bookingList = Array.from(bookings.values());
  const guestList = Array.from(guests.values());
  const today = new Date().toISOString().split('T')[0];

  const todayBookings = bookingList.filter(b => b.createdAt.startsWith(today));
  const arrivals = bookingList.filter(b => b.checkIn === today && b.status !== 'cancelled');
  const departures = bookingList.filter(b => b.checkOut === today && b.status === 'checked-in');
  const inHouse = bookingList.filter(b => b.status === 'checked-in');

  let revenue = 0;
  for (const [, folio] of folioTransactions) {
    revenue += folio.transactions.filter(t => t.type === 'charge').reduce((s, t) => s + t.amount, 0);
  }

  res.json({
    overview: {
      totalRooms: roomList.length, availableRooms: roomList.filter(r => r.status === 'available').length,
      occupiedRooms: roomList.filter(r => r.status === 'occupied').length, dirtyRooms: roomList.filter(r => r.status === 'dirty').length,
      occupancyRate: ((roomList.filter(r => r.status === 'occupied').length / roomList.length) * 100).toFixed(1) + '%',
      totalGuests: guestList.length, totalBookings: bookingList.length,
      inHouseGuests: inHouse.length, arrivalsToday: arrivals.length, departuresToday: departures.length,
      revenue: revenue, avgDailyRate: inHouse.length > 0 ? (revenue / inHouse.length).toFixed(2) : 0
    },
    today: { arrivals: arrivals.length, departures: departures.length, newBookings: todayBookings.length },
    roomTypes: Array.from(roomTypes.values()).map(rt => ({
      ...rt,
      total: roomList.filter(r => r.type === rt.id).length,
      available: roomList.filter(r => r.type === rt.id && r.status === 'available').length,
      occupied: roomList.filter(r => r.type === rt.id && r.status === 'occupied').length
    }))
  });
});

// ---------- DASHBOARD SUMMARY ----------

app.get('/api/dashboard', (req, res) => {
  const roomList = Array.from(rooms.values());
  const bookingList = Array.from(bookings.values());
  const today = new Date().toISOString().split('T')[0];
  const inHouse = bookingList.filter(b => b.status === 'checked-in');
  const arrivals = bookingList.filter(b => b.checkIn === today && b.status !== 'cancelled');
  const departures = bookingList.filter(b => b.checkOut === today && b.status === 'checked-in');

  res.json({
    property: { name: 'StayOwn Hotel', totalRooms: roomList.length, floors: floors.size },
    occupancy: {
      occupied: roomList.filter(r => r.status === 'occupied').length,
      available: roomList.filter(r => r.status === 'available').length,
      dirty: roomList.filter(r => r.status === 'dirty').length,
      maintenance: roomList.filter(r => r.status === 'maintenance').length,
      rate: ((roomList.filter(r => r.status === 'occupied').length / roomList.length) * 100).toFixed(1)
    },
    arrivals, departures, inHouse: inHouse.length,
    housekeeping: { pendingTasks: Array.from(housekeepingTasks.values()).filter(t => t.status === 'pending').length }
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
      aiAgents: [
        'AI Receptionist (Genie)',     // Front desk - check-in/out, concierge
        'AI Concierge',                  // Guest services, recommendations, local info
        'AI Housekeeping Manager',       // Room status, task allocation, scheduling
        'AI Revenue Manager',           // Dynamic pricing, occupancy optimization
        'AI Guest Relations',            // Pre-arrival, in-stay, post-departure
        'AI Chef (Room Service)',        // Kitchen management, menu optimization
        'AI Waiter (F&B)',               // Restaurant service, order management
        'AI Sales & Events',             // Banquet sales, corporate bookings
        'AI Maintenance',                // Preventive maintenance, work orders
        'AI Billing & Folio',            // Invoice management, dispute resolution
        'AI Booking Agent',              // Direct booking optimization
        'AI Marketing',                  // Campaign management, guest engagement
      ],
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
        guestTwin: Array.from(guestTwin.values()),
        roomTwin: Array.from(roomTwin.values()),
        bookingTwin: Array.from(bookingTwin.values()),
        propertyTwin: Array.from(propertyTwin.values()),
        staffTwin: Array.from(staffTwin.values()),
        serviceTwin: Array.from(serviceTwin.values()),
        invoiceTwin: Array.from(invoiceTwin.values()),
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
        twins: [...guestTwin.values(), ...roomTwin.values(), ...bookingTwin.values()],
        industry: INDUSTRY,
        businessId: req.session.businessId,
      }),
    });
    res.json({ success: true, syncedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Twin sync failed' });
  }
});

// Sync individual twins
app.post('/api/twins/sync/:type/:id', requireAuth, async (req, res) => {
  const { type, id } = req.params;
  const twinMaps = { guest: guestTwin, room: roomTwin, booking: bookingTwin, property: propertyTwin, staff: staffTwin, service: serviceTwin, invoice: invoiceTwin };
  const twinMap = twinMaps[type];
  if (!twinMap) return res.status(400).json({ error: 'Invalid twin type' });
  const twin = twinMap.get(id);
  if (!twin) return res.status(404).json({ error: 'Twin not found' });
  twin.syncedAt = new Date().toISOString();
  twinMap.set(id, twin);
  try {
    await fetch(RTMN_SERVICES.twinos + '/api/twins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ twins: [twin], industry: INDUSTRY, businessId: req.session.businessId }),
    });
  } catch (err) {
    console.warn('Twin sync warning:', err.message);
  }
  res.json({ success: true, twin });
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
    industry: 'Hotel / Hospitality',
    service: 'StayOwn Hotel OS',
    layers: results.map((r, i) => r.status === 'fulfilled' ? r.value : { layer: layerEndpoints[i].layer, name: layerEndpoints[i].name, status: 'error' }),
  });
});

// ============================================
// HEALTH
// ============================================

app.get('/health', (req, res) => {
  const roomList = Array.from(rooms.values());
  res.json({
    status: 'healthy',
    service: 'StayOwn Hotel OS',
    industry: 'Hotel / Hospitality',
    port: PORT,
    layers: 15,
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      rooms: roomList.length,
      available: roomList.filter(r => r.status === 'available').length,
      occupied: roomList.filter(r => r.status === 'occupied').length,
      bookings: bookings.size,
      guests: guests.size
    }
  });
});

// ============================================
// START
// ============================================

initDatabase().catch(console.warn);
app.listen(PORT, () => {
  console.log('🏨 StayOwn Hotel OS running on port ' + PORT);
  console.log('📦 ' + rooms.size + ' rooms | ' + bookings.size + ' bookings | ' + guests.size + ' guests');
  console.log('🔗 15 RTMN Layers: Intelligence → Customer Growth → Commerce → Finance → Workforce → Legal → Property → Health → Mobility → Identity → Memory → Twins → Automation → Autonomous → Consumer');
});
