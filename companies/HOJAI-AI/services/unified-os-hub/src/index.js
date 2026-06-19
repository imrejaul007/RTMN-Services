/**
 * RTMN Unified Hub v3.0
 * Complete Gateway for ALL RTMN Ecosystem Services
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 4399;

// Import modules
const workflows = require('./workflows');
const integrations = require('./integrations');
const agentMarketplace = require('./agent-marketplace');
const industryWorkflows = require('./industry-workflows');
const phase2Workflows = require('./phase2-workflows');
const phase3Workflows = require('./phase3-workflows');
const phase4Workflows = require('./phase4-workflows');
const genieWorkflows = require('./genie-workflows');

// ============================================
// SERVICE URLS - ALL 50+ SERVICES
// ============================================

const SERVICES = {
  // Foundation
  corpId: 'http://localhost:4702',
  memoryOs: 'http://localhost:4703',
  twinOs: 'http://localhost:4705',

  // Department OS
  salesOs: 'http://localhost:5055',
  marketingOs: 'http://localhost:5500',
  customerSuccessOs: 'http://localhost:4050',
  procurementOs: 'http://localhost:5096',
  workforceOs: 'http://localhost:5077',
  financeOs: 'http://localhost:4801',
  operationsOs: 'http://localhost:5250',
  cxoOs: 'http://localhost:5100',

  // Industry OS
  restaurantOs: 'http://localhost:5010',
  hotelOs: 'http://localhost:5025',
  healthcareOs: 'http://localhost:5020',
  retailOs: 'http://localhost:5030',
  legalOs: 'http://localhost:5035',
  educationOs: 'http://localhost:5060',
  agricultureOs: 'http://localhost:5070',
  automotiveOs: 'http://localhost:5080',
  beautyOs: 'http://localhost:5090',
  fashionOs: 'http://localhost:5095',
  fitnessOs: 'http://localhost:5110',
  gamingOs: 'http://localhost:5120',
  governmentOs: 'http://localhost:5130',
  homeServicesOs: 'http://localhost:5140',
  manufacturingOs: 'http://localhost:5150',
  nonProfitOs: 'http://localhost:5160',
  professionalOs: 'http://localhost:5170',
  sportsOs: 'http://localhost:5180',
  travelOs: 'http://localhost:5190',
  entertainmentOs: 'http://localhost:5200',
  constructionOs: 'http://localhost:5210',
  financialOs: 'http://localhost:5220',
  realEstateOs: 'http://localhost:5230',
  transportOs: 'http://localhost:5240',

  // AI Services
  agentCopilot: 'http://localhost:4920',
  salesCopilot: 'http://localhost:4928',
  financeCopilot: 'http://localhost:4930',
  marketingCopilot: 'http://localhost:4929',
  supportCopilot: 'http://localhost:4895',

  // Phase 2 - Specialized OS
  revenueIntelligence: 'http://localhost:5400',
  eventBanquet: 'http://localhost:4751',

  // Phase 3 - Management OS
  energyManagement: 'http://localhost:5260',
  securityOs: 'http://localhost:5270',
  apiPlatform: 'http://localhost:5280',

  // Phase 4 - Enterprise OS
  marketplace: 'http://localhost:5290',
  multiProperty: 'http://localhost:5300',
  predictiveMaint: 'http://localhost:5310',

  // StayOwn-Hospitality services (30 services from REZ-Merchant / StayOwn)
  // Routed through Hotel OS (5025) which proxies to the right downstream.
  // Direct access URLs are kept here for health checks and direct proxying.
  stayownRezHotel: 'http://localhost:4015',          // rez-hotel-service
  stayownRezHotelPos: 'http://localhost:4005',       // rez-hotel-pos-service
  stayownRezStayown: 'http://localhost:4016',        // rez-stayown-service
  stayownRezBooking: 'http://localhost:4020',         // rez-booking
  stayownRezPayment: 'http://localhost:4025',         // rez-payment
  stayownRezHousekeeping: 'http://localhost:4030',    // rez-housekeeping
  stayownRezPms: 'http://localhost:4802',             // rez-pms
  stayownHotelPms: 'http://localhost:4803',          // hotel-pms
  stayownAiFrontDesk: 'http://localhost:4810',        // ai-front-desk
  stayownConcierge: 'http://localhost:4811',          // concierge-desk
  stayownStaybot: 'http://localhost:4812',            // hojai-staybot
  stayownRoomControls: 'http://localhost:4820',       // room-controls
  stayownMinibar: 'http://localhost:4821',            // minibar-service
  stayownParking: 'http://localhost:4822',            // parking-service
  stayownPreArrival: 'http://localhost:4823',         // pre-arrival-service
  stayownVoiceAgent: 'http://localhost:4824',         // voice-hotel-agent
  stayownSmartLock: 'http://localhost:4825',          // smart-lock-service
  stayownRestaurantBooking: 'http://localhost:4830', // hotel-restaurant-booking
  stayownSpaBooking: 'http://localhost:4831',         // hotel-spa-booking
  stayownGuestTwin: 'http://localhost:4840',          // guest-twin-service
  stayownBusinessTwin: 'http://localhost:4841',       // hotel-business-twin
  stayownPredictiveHk: 'http://localhost:4850',       // predictive-housekeeping
  stayownUpsell: 'http://localhost:4851',             // upsell-engine
  stayownZeroCheckout: 'http://localhost:4852',       // zero-checkout-automation
  stayownLoyalty: 'http://localhost:4860',            // loyalty-system
  stayownFeedback: 'http://localhost:4861',           // feedback-survey
  stayownReview: 'http://localhost:4862',             // review-manager
  stayownLostFound: 'http://localhost:4863',          // lost-found

  // External
  sutarOs: 'http://localhost:4799',
  nexhaPortal: 'http://localhost:3000',
  commerceIdentity: 'http://localhost:8000',

  // Genie AI - Personal Companion Ecosystem (12 services)
  genieCompanion: 'http://localhost:4716',        // Phase 1 - Foundation: Emotional AI, Mood, Journal, Stories
  genieMemoryGraph: 'http://localhost:4717',       // Phase 1 - Foundation: 7 Unified Memory Graphs
  genieRelationshipOs: 'http://localhost:4718',   // Phase 1 - Foundation: Personal CRM, Social Intel
  genieThinkingEngine: 'http://localhost:4719',    // Phase 2 - Intelligence: SWOT, Decisions, Research
  genieConsultant: 'http://localhost:4720',        // Phase 2 - Intelligence: 20 Expert Domains
  genieLifeGps: 'http://localhost:4721',           // Phase 2 - Intelligence: Goals, Future Self, Next Best Action
  genieLearningOs: 'http://localhost:4722',        // Phase 3 - Life Management: Languages, Skills, MBA
  genieWellnessOs: 'http://localhost:4723',        // Phase 3 - Life Management: Health, Sleep, Nutrition, Mental
  genieMoneyOs: 'http://localhost:4724',           // Phase 3 - Life Management: Budget, Invest, Savings, Goals
  genieCreationOs: 'http://localhost:4725',        // Phase 4 - Creation: Content, Image, Video, Audio, Doc
  genieExecutionEngine: 'http://localhost:4726',   // Phase 4 - Execution: Tasks, Automation, Workflows
  genieLifeUniversity: 'http://localhost:4727',    // Phase 4 - Education: Curriculum, Courses, Certs
  genieShoppingAgent: 'http://localhost:4728',     // Agent Commerce: Personal Shopping AI (SUTAR)

  // HOJAI AI - Training Platform (Division 7)
  fineTuning: 'http://localhost:4776',
  syntheticData: 'http://localhost:4777',
  gpuCluster: 'http://localhost:4778',

  // SUTAR OS - Layer 3 + Layer 5 (built June 20, 2026)
  sutarIntentBus: 'http://localhost:4154',
  sutarUsageTracker: 'http://localhost:4252',
  sutarSimulation: 'http://localhost:4241',
  sutarDiscovery: 'http://localhost:4256',
  sutarRoi: 'http://localhost:4259',
  sutarMonitoring: 'http://localhost:3100',
};

// Create axios clients
const clients = {};
for (const [name, url] of Object.entries(SERVICES)) {
  clients[name] = axios.create({ baseURL: url, timeout: 5000, headers: { 'Content-Type': 'application/json' } });
}

// ============================================
// SERVICE REGISTRY
// ============================================

const SERVICE_REGISTRY = {
  foundation: [
    { id: 'corpId', name: 'CorpID', port: 4702, category: 'foundation', description: 'Universal Identity' },
    { id: 'memoryOs', name: 'MemoryOS', port: 4703, category: 'foundation', description: 'AI Memory' },
    { id: 'twinOs', name: 'TwinOS', port: 4705, category: 'foundation', description: 'Digital Twins' },
  ],
  department: [
    { id: 'sales', name: 'Sales OS', port: 5055, category: 'department', description: 'CRM, Leads, Pipeline' },
    { id: 'marketing', name: 'Marketing OS', port: 5500, category: 'department', description: 'Campaigns, Journey' },
    { id: 'customerSuccess', name: 'Customer Success OS', port: 4050, category: 'department', description: 'NPS, Churn' },
    { id: 'procurement', name: 'Procurement OS', port: 5096, category: 'department', description: 'Suppliers, POs' },
    { id: 'workforce', name: 'Workforce OS', port: 5077, category: 'department', description: 'HR, Payroll' },
    { id: 'finance', name: 'Finance OS', port: 4801, category: 'department', description: 'Accounting' },
    { id: 'operations', name: 'Operations OS', port: 5250, category: 'department', description: 'Projects, Tasks' },
    { id: 'cxo', name: 'CXO OS', port: 5100, category: 'department', description: 'Executive KPIs' },
  ],
  industry: [
    { id: 'restaurant', name: 'Restaurant OS', port: 5010, category: 'industry', description: 'Food Service' },
    { id: 'hotel', name: 'Hotel OS', port: 5025, category: 'industry', description: 'Hospitality' },
    { id: 'healthcare', name: 'Healthcare OS', port: 5020, category: 'industry', description: 'Medical' },
    { id: 'retail', name: 'Retail OS', port: 5030, category: 'industry', description: 'Retail' },
    { id: 'legal', name: 'Legal OS', port: 5035, category: 'industry', description: 'Legal' },
    { id: 'education', name: 'Education OS', port: 5060, category: 'industry', description: 'Education' },
    { id: 'agriculture', name: 'Agriculture OS', port: 5070, category: 'industry', description: 'Agriculture' },
    { id: 'automotive', name: 'Automotive OS', port: 5080, category: 'industry', description: 'Automotive' },
    { id: 'beauty', name: 'Beauty OS', port: 5090, category: 'industry', description: 'Beauty' },
    { id: 'fashion', name: 'Fashion OS', port: 5095, category: 'industry', description: 'Fashion' },
    { id: 'fitness', name: 'Fitness OS', port: 5110, category: 'industry', description: 'Fitness' },
    { id: 'gaming', name: 'Gaming OS', port: 5120, category: 'industry', description: 'Gaming' },
    { id: 'government', name: 'Government OS', port: 5130, category: 'industry', description: 'Government' },
    { id: 'homeServices', name: 'HomeServices OS', port: 5140, category: 'industry', description: 'Home Services' },
    { id: 'manufacturing', name: 'Manufacturing OS', port: 5150, category: 'industry', description: 'Manufacturing' },
    { id: 'nonProfit', name: 'NonProfit OS', port: 5160, category: 'industry', description: 'Non-Profit' },
    { id: 'professional', name: 'Professional OS', port: 5170, category: 'industry', description: 'Professional' },
    { id: 'sports', name: 'Sports OS', port: 5180, category: 'industry', description: 'Sports' },
    { id: 'travel', name: 'Travel OS', port: 5190, category: 'industry', description: 'Travel' },
    { id: 'entertainment', name: 'Entertainment OS', port: 5200, category: 'industry', description: 'Entertainment' },
    { id: 'construction', name: 'Construction OS', port: 5210, category: 'industry', description: 'Construction' },
    { id: 'financial', name: 'Financial OS', port: 5220, category: 'industry', description: 'Financial Services' },
    { id: 'realEstate', name: 'RealEstate OS', port: 5230, category: 'industry', description: 'Real Estate' },
    { id: 'transport', name: 'Transport OS', port: 5240, category: 'industry', description: 'Transport & Logistics' },
  ],
  // Phase 2-3 Specialized OS
  specialized: [
    { id: 'revenueIntelligence', name: 'Revenue Intelligence OS', port: 5400, category: 'specialized', description: 'Dynamic Pricing, Forecasting' },
    { id: 'eventBanquet', name: 'Event & Banquet OS', port: 4751, category: 'specialized', description: 'Venue, Weddings, Conferences' },
    { id: 'energyManagement', name: 'Energy Management OS', port: 5260, category: 'specialized', description: 'IoT, Smart Building, Carbon' },
    { id: 'securityOs', name: 'Security OS', port: 5270, category: 'specialized', description: 'CCTV AI, Access Control, Emergency' },
    { id: 'apiPlatform', name: 'API Platform', port: 5280, category: 'specialized', description: 'Developer Portal, OAuth, Webhooks' },
    { id: 'marketplace', name: 'Hotel Marketplace OS', port: 5290, category: 'specialized', description: 'App Store, Plugins, Integrations' },
    { id: 'multiProperty', name: 'Multi-Property Intelligence', port: 5300, category: 'specialized', description: 'Enterprise Dashboard, Portfolio Analytics' },
    { id: 'predictiveMaint', name: 'Predictive Maintenance OS', port: 5310, category: 'specialized', description: 'IoT Equipment, Health Monitoring' },
  ],
  ai: [
    { id: 'agentCopilot', name: 'Agent Copilot', port: 4920, category: 'ai', description: 'AI Agents' },
    { id: 'salesCopilot', name: 'Sales Copilot', port: 4928, category: 'ai', description: 'Sales AI' },
    { id: 'financeCopilot', name: 'Finance Copilot', port: 4930, category: 'ai', description: 'Finance AI' },
    // HOJAI AI Training Platform
    { id: 'fineTuning', name: 'Fine-Tuning Pipeline', port: 4776, category: 'ai', description: 'LoRA/QLoRA/Prefix/IA3/Full orchestration' },
    { id: 'syntheticData', name: 'Synthetic Data Gen', port: 4777, category: 'ai', description: '5-domain dataset generator' },
    { id: 'gpuCluster', name: 'GPU Cluster Manager', port: 4778, category: 'ai', description: 'H100/A100/L40S/RTX-4090/T4/V100' },
    // SUTAR OS
    { id: 'sutarIntentBus', name: 'SUTAR Intent Bus', port: 4154, category: 'ai', description: 'Pub/sub agent intent broadcast' },
    { id: 'sutarUsageTracker', name: 'SUTAR Usage Tracker', port: 4252, category: 'ai', description: 'Metering + billing + revenue share' },
    { id: 'sutarSimulation', name: 'SUTAR Simulation OS', port: 4241, category: 'ai', description: 'What-if scenarios (pricing, market, policy, decisions)' },
    { id: 'sutarDiscovery', name: 'SUTAR Discovery Engine', port: 4256, category: 'ai', description: 'Universal search across services/agents/twins/intents' },
    { id: 'sutarRoi', name: 'SUTAR ROI Calculator', port: 4259, category: 'ai', description: 'ROI / NPV / IRR / payback for investments' },
    { id: 'sutarMonitoring', name: 'SUTAR Monitoring', port: 3100, category: 'ai', description: 'Health probes, metrics, alerts, logs' },
  ],
  external: [
    { id: 'sutarOs', name: 'SUTAR OS', port: 4799, category: 'external', description: 'Identity & Trust' },
    { id: 'nexhaPortal', name: 'Nexha Portal', port: 3000, category: 'external', description: 'Nexha Platform' },
    { id: 'commerceIdentity', name: 'Commerce Identity', port: 8000, category: 'external', description: 'User Identity' },
  ],
  // StayOwn-Hospitality / REZ-Merchant services (30 hotel services)
  // Routed through Hotel OS (5025) for unified access.
  stayown: [
    { id: 'rezHotel', name: 'rez-hotel-service', port: 4015, category: 'stayown', description: 'Hotels, bookings, sync' },
    { id: 'rezHotelPos', name: 'rez-hotel-pos-service', port: 4005, category: 'stayown', description: 'Folio, outlets, payments' },
    { id: 'rezStayown', name: 'rez-stayown-service', port: 4016, category: 'stayown', description: 'Stay management' },
    { id: 'rezBooking', name: 'rez-booking', port: 4020, category: 'stayown', description: 'Reservation engine' },
    { id: 'rezPayment', name: 'rez-payment', port: 4025, category: 'stayown', description: 'Hotel payments' },
    { id: 'rezHousekeeping', name: 'rez-housekeeping', port: 4030, category: 'stayown', description: 'Housekeeping ops' },
    { id: 'rezPms', name: 'rez-pms', port: 4802, category: 'stayown', description: 'Property Management System' },
    { id: 'hotelPms', name: 'hotel-pms', port: 4803, category: 'stayown', description: 'Hotel PMS' },
    { id: 'aiFrontDesk', name: 'ai-front-desk', port: 4810, category: 'stayown', description: 'AI front desk agent' },
    { id: 'concierge', name: 'concierge-desk', port: 4811, category: 'stayown', description: 'Concierge services' },
    { id: 'staybot', name: 'hojai-staybot', port: 4812, category: 'stayown', description: 'AI concierge bot' },
    { id: 'roomControls', name: 'room-controls', port: 4820, category: 'stayown', description: 'In-room IoT controls' },
    { id: 'minibar', name: 'minibar-service', port: 4821, category: 'stayown', description: 'Minibar management' },
    { id: 'parking', name: 'parking-service', port: 4822, category: 'stayown', description: 'Valet & parking' },
    { id: 'preArrival', name: 'pre-arrival-service', port: 4823, category: 'stayown', description: 'Pre-check-in flow' },
    { id: 'voiceAgent', name: 'voice-hotel-agent', port: 4824, category: 'stayown', description: 'Voice assistant' },
    { id: 'smartLock', name: 'smart-lock-service', port: 4825, category: 'stayown', description: 'Digital key & locks' },
    { id: 'restaurantBooking', name: 'hotel-restaurant-booking', port: 4830, category: 'stayown', description: 'F&B reservations' },
    { id: 'spaBooking', name: 'hotel-spa-booking', port: 4831, category: 'stayown', description: 'Spa appointments' },
    { id: 'guestTwin', name: 'guest-twin-service', port: 4840, category: 'stayown', description: 'Guest digital twin' },
    { id: 'businessTwin', name: 'hotel-business-twin', port: 4841, category: 'stayown', description: 'Hotel business twin' },
    { id: 'predictiveHk', name: 'predictive-housekeeping', port: 4850, category: 'stayown', description: 'AI housekeeping' },
    { id: 'upsell', name: 'upsell-engine', port: 4851, category: 'stayown', description: 'Revenue upsell engine' },
    { id: 'zeroCheckout', name: 'zero-checkout-automation', port: 4852, category: 'stayown', description: 'Express checkout' },
    { id: 'loyalty', name: 'loyalty-system', port: 4860, category: 'stayown', description: 'Guest loyalty' },
    { id: 'feedback', name: 'feedback-survey', port: 4861, category: 'stayown', description: 'NPS & feedback' },
    { id: 'review', name: 'review-manager', port: 4862, category: 'stayown', description: 'Online reviews' },
    { id: 'lostFound', name: 'lost-found', port: 4863, category: 'stayown', description: 'Lost & found' },
  ],
  // Genie AI - Personal Companion Ecosystem
  genie: [
    // Phase 1 - Foundation (4716-4718)
    { id: 'genieCompanion', name: 'Genie Companion', port: 4716, category: 'genie', phase: 1, description: 'Emotional AI, Mood, Journal, Life Stories' },
    { id: 'genieMemoryGraph', name: 'Genie Memory Graph', port: 4717, category: 'genie', phase: 1, description: '7 Unified Memory Graphs & Search' },
    { id: 'genieRelationshipOs', name: 'Genie Relationship OS', port: 4718, category: 'genie', phase: 1, description: 'Personal CRM, Social Intelligence' },
    // Phase 2 - Intelligence (4719-4721)
    { id: 'genieThinkingEngine', name: 'Genie Thinking Engine', port: 4719, category: 'genie', phase: 2, description: 'SWOT, Decisions, Research, Brainstorming' },
    { id: 'genieConsultant', name: 'Genie Consultant Agent', port: 4720, category: 'genie', phase: 2, description: '20 Expert Domains, Consultation Routing' },
    { id: 'genieLifeGps', name: 'Genie Life GPS', port: 4721, category: 'genie', phase: 2, description: 'Goals, Future Self, Next Best Action' },
    // Phase 3 - Life Management (4722-4724)
    { id: 'genieLearningOs', name: 'Genie Learning OS', port: 4722, category: 'genie', phase: 3, description: 'Languages, Skills, MBA, Curriculum' },
    { id: 'genieWellnessOs', name: 'Genie Wellness OS', port: 4723, category: 'genie', phase: 3, description: 'Health, Sleep, Nutrition, Mental Wellness' },
    { id: 'genieMoneyOs', name: 'Genie Money OS', port: 4724, category: 'genie', phase: 3, description: 'Budget, Investment, Savings, Goals' },
    // Phase 4 - Creation & Execution (4725-4727)
    { id: 'genieCreationOs', name: 'Genie Creation OS', port: 4725, category: 'genie', phase: 4, description: 'Content, Image, Video, Audio, Document Generation' },
    { id: 'genieExecutionEngine', name: 'Genie Execution Engine', port: 4726, category: 'genie', phase: 4, description: 'Tasks, Automation, Workflows, Calendar' },
    { id: 'genieLifeUniversity', name: 'Genie Life University', port: 4727, category: 'genie', phase: 4, description: 'Curriculum, Courses, Certifications, Achievements' },
    // Agent Commerce Network
    { id: 'genieShoppingAgent', name: 'Genie Shopping Agent', port: 4728, category: 'genie', phase: 'acn', description: 'Personal Shopping AI (SUTAR)' },
  ],
};

// ============================================
// MIDDLEWARE
// ============================================

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api', limiter);

// ============================================
// ROUTES
// ============================================

app.use('/api/workflow', workflows);
app.use('/api/integrations', integrations);
app.use('/api/marketplace', agentMarketplace);
app.use('/api/industry', industryWorkflows);
app.use('/api/phase2', phase2Workflows);
app.use('/api/phase3', phase3Workflows);
app.use('/api/phase4', phase4Workflows);
app.use('/api/genie-workflows', genieWorkflows);

// StayOwn-Hospitality Hub bridge. Forwards to Hotel OS (5025) which proxies
// the request to the right downstream StayOwn / REZ-Merchant service.
app.use('/api/hotel/stayown', async (req, res) => {
  try {
    const response = await clients.hotelOs.request({
      method: req.method,
      url: `/stayown${req.path}`,
      params: req.query,
      data: req.body,
      headers: {
        authorization: req.headers.authorization,
        'x-tenant-id': req.headers['x-tenant-id'],
        'x-property-id': req.headers['x-property-id'],
        'x-guest-id': req.headers['x-guest-id'],
      },
      timeout: 10000,
      validateStatus: () => true,
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    res.status(502).json({ success: false, error: 'Hotel OS StayOwn proxy unreachable', detail: err.message });
  }
});

// Direct registry / health from Hub
app.get('/api/stayown/services', async (req, res) => {
  try {
    const response = await clients.hotelOs.get('/api/stayown/registry', { timeout: 5000 });
    res.json(response.data);
  } catch (err) {
    res.status(502).json({ success: false, error: 'Hotel OS unreachable', detail: err.message });
  }
});

app.get('/api/stayown/health', async (req, res) => {
  try {
    const response = await clients.hotelOs.get('/api/stayown/health', { timeout: 15000 });
    res.json(response.data);
  } catch (err) {
    res.status(502).json({ success: false, error: 'Hotel OS unreachable', detail: err.message });
  }
});

// Health check - using http module with 1s timeout, parallel batches
app.get('/health', async (req, res) => {
  const http = require('http');
  const entries = Object.entries(clients);
  const BATCH_SIZE = 15;
  const results = {};

  const checkService = (name, client) => new Promise((resolve) => {
    try {
      const url = new URL(client.defaults.baseURL + '/health');
      const req2 = http.get({
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        timeout: 1000
      }, (r) => {
        r.resume();
        resolve([name, { status: r.statusCode === 200 ? 'healthy' : 'unhealthy' }]);
      });
      req2.on('timeout', () => { req2.destroy(); resolve([name, { status: 'timeout' }]); });
      req2.on('error', () => resolve([name, { status: 'not_responding' }]));
    } catch {
      resolve([name, { status: 'error' }]);
    }
  });

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(([n, c]) => checkService(n, c)));
    for (const [name, status] of batchResults) results[name] = status;
  }

  const healthy = Object.values(results).filter(r => r.status === 'healthy').length;

  res.json({
    status: 'ok',
    service: 'RTMN Unified Hub',
    version: '3.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    services: { total: Object.keys(clients).length, healthy, unhealthy: Object.keys(clients).length - healthy },
  });
});

app.get('/ready', (req, res) => res.json({ ready: true }));

// Service registry
app.get('/api/services', (req, res) => {
  const flat = Object.values(SERVICE_REGISTRY).flat();
  res.json({ success: true, services: flat, total: flat.length });
});

app.get('/api/services/category/:category', (req, res) => {
  const services = SERVICE_REGISTRY[req.params.category];
  if (!services) return res.status(404).json({ error: 'Category not found' });
  res.json({ success: true, services });
});

// Generic proxy - ALL 24 Industry OS + 8 Department OS
const SERVICE_MAP = {
  // Department OS
  sales: 'salesOs', marketing: 'marketingOs', customerSuccess: 'customerSuccessOs',
  procurement: 'procurementOs', workforce: 'workforceOs', finance: 'financeOs',
  operations: 'operationsOs', cxo: 'cxoOs',
  // Industry OS - All 24
  restaurant: 'restaurantOs', hotel: 'hotelOs', healthcare: 'healthcareOs',
  retail: 'retailOs', legal: 'legalOs', education: 'educationOs',
  agriculture: 'agricultureOs', automotive: 'automotiveOs', beauty: 'beautyOs',
  fashion: 'fashionOs', fitness: 'fitnessOs', gaming: 'gamingOs',
  government: 'governmentOs', homeServices: 'homeServicesOs',
  manufacturing: 'manufacturingOs', nonProfit: 'nonProfitOs',
  professional: 'professionalOs', sports: 'sportsOs', travel: 'travelOs',
  entertainment: 'entertainmentOs', construction: 'constructionOs',
  financial: 'financialOs', realEstate: 'realEstateOs', transport: 'transportOs',
  // Phase 2 Specialized OS
  revenue: 'revenueIntelligence', event: 'eventBanquet',
  // External & Foundation
  sutar: 'sutarOs', identity: 'commerceIdentity', copilot: 'agentCopilot',
  memory: 'memoryOs', twins: 'twinOs',
  // Genie AI - Personal Companion Ecosystem
  'genie-companion': 'genieCompanion',
  'genie-memory': 'genieMemoryGraph',
  'genie-relationship': 'genieRelationshipOs',
  'genie-thinking': 'genieThinkingEngine',
  'genie-consultant': 'genieConsultant',
  'genie-gps': 'genieLifeGps',
  'genie-learning': 'genieLearningOs',
  'genie-wellness': 'genieWellnessOs',
  'genie-money': 'genieMoneyOs',
  'genie-creation': 'genieCreationOs',
  'genie-execution': 'genieExecutionEngine',
  'genie-university': 'genieLifeUniversity',
  'genie-shopping': 'genieShoppingAgent',

  // HOJAI AI Training Platform (Division 7)
  'fine-tuning': 'fineTuning',
  'synthetic-data': 'syntheticData',
  'gpu-cluster': 'gpuCluster',

  // SUTAR OS
  'sutar-intent': 'sutarIntentBus',
  'sutar-usage': 'sutarUsageTracker',
  'sutar-simulation': 'sutarSimulation',
  'sutar-discovery': 'sutarDiscovery',
  'sutar-roi': 'sutarRoi',
  'sutar-monitoring': 'sutarMonitoring',
};

for (const [prefix, serviceKey] of Object.entries(SERVICE_MAP)) {
  app.all(`/api/${prefix}/:path(*)`, async (req, res) => {
    const client = clients[serviceKey];
    if (!client) return res.status(500).json({ error: 'Service not configured' });
    try {
      const path = req.params.path;
      const response = req.method === 'GET'
        ? await client.get(path, { params: req.query })
        : await client.post(path, req.body);
      res.json({ success: true, ...response.data, _meta: { service: serviceKey } });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, service: serviceKey });
    }
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`RTMN Unified Hub v3.0 running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Services: http://localhost:${PORT}/api/services`);
});

module.exports = app;
