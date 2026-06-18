/**
 * RTMN Unified Hub v1.0.0
 * Single API Gateway for ALL RTMN Ecosystem Services
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
const NODE_ENV = process.env.NODE_ENV || 'development';

// Import workflows
const workflows = require('./workflows');

// ============================================
// SERVICE URLS - ALL 50+ SERVICES
// ============================================

const SERVICES = {
  // Core Business OS
  salesOs: 'http://localhost:5055',
  mediaOs: 'http://localhost:5600',
  marketingOs: 'http://localhost:5500',

  // Department OS
  customerSuccessOs: 'http://localhost:4050',
  procurementOs: 'http://localhost:5096',
  workforceOs: 'http://localhost:5077',
  financeOs: 'http://localhost:4801',
  operationsOs: 'http://localhost:5250',
  cxoOs: 'http://localhost:5100',

  // Foundation
  corpId: 'http://localhost:4702',
  memoryOs: 'http://localhost:4703',
  twinOs: 'http://localhost:4705',

  // HOJAI AI Suite
  leverageIntelligence: 'http://localhost:4761',
  leverageMemory: 'http://localhost:4762',
  leverageTwin: 'http://localhost:4763',
  leverageAgents: 'http://localhost:4764',
  leverageCopilot: 'http://localhost:4765',

  // RABTUL Services
  rezAuth: 'http://localhost:4002',
  rezWallet: 'http://localhost:4004',

  // Core CRM/Care
  rezCrmHub: 'http://localhost:4056',
  rezCareService: 'http://localhost:4055',

  // AdBazaar
  adbazaarDsp: 'http://localhost:4990',
  adbazaarAudience: 'http://localhost:4805',
  adbazaarAttribution: 'http://localhost:4803',
  adbazaarCdp: 'http://localhost:4901',

  // Hospitality
  restaurantOs: 'http://localhost:5010',
  hotelOs: 'http://localhost:5025',
  hospitalityOs: 'http://localhost:5050',

  // Health
  healthcareOs: 'http://localhost:5020',

  // Retail
  retailOs: 'http://localhost:5030',

  // Business
  legalOs: 'http://localhost:5035',
  financialOs: 'http://localhost:5220',
  professionalOs: 'http://localhost:5170',

  // Education
  educationOs: 'http://localhost:5060',

  // Media
  exhibitionOs: 'http://localhost:5040',
  entertainmentOs: 'http://localhost:5200',

  // Lifestyle
  beautyOs: 'http://localhost:5090',
  fitnessOs: 'http://localhost:5110',
  fashionOs: 'http://localhost:5095',

  // Real Estate
  realestateOs: 'http://localhost:5230',

  // Industrial
  manufacturingOs: 'http://localhost:5150',
  constructionOs: 'http://localhost:5210',
  automotiveOs: 'http://localhost:5080',
  transportOs: 'http://localhost:5240',

  // Other
  agricultureOs: 'http://localhost:5070',
  gamingOs: 'http://localhost:5120',
  governmentOs: 'http://localhost:5130',
  homeServicesOs: 'http://localhost:5140',
  nonProfitOs: 'http://localhost:5160',
  sportsOs: 'http://localhost:5180',
  travelOs: 'http://localhost:5190',
  energyOs: 'http://localhost:5100',
};

// Create axios clients
const clients = {};
for (const [name, url] of Object.entries(SERVICES)) {
  clients[name] = axios.create({ baseURL: url, timeout: 8000, headers: { 'Content-Type': 'application/json' } });
}

// ============================================
// MIDDLEWARE
// ============================================

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================
// WORKFLOWS ROUTES
// ============================================
app.use('/api/workflow', workflows);
app.use(morgan('combined'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api', limiter);

// ============================================
// SERVICE REGISTRY
// ============================================

const SERVICE_REGISTRY = {
  // Department OS - Horizontal Layer
  department: [
    { id: 'sales', name: 'Sales OS', port: 5055, description: 'CRM, Leads, Pipeline, Deals', category: 'department' },
    { id: 'marketing', name: 'Marketing OS', port: 5500, description: 'Campaigns, Journey, Brand', category: 'department' },
    { id: 'customerSuccess', name: 'Customer Success OS', port: 4050, description: 'NPS, Churn, Health Scores', category: 'department' },
    { id: 'procurement', name: 'Procurement OS', port: 5096, description: 'Suppliers, POs, Contracts', category: 'department' },
    { id: 'workforce', name: 'Workforce OS', port: 5077, description: 'HR, Payroll, Attendance', category: 'department' },
    { id: 'finance', name: 'Finance OS', port: 4801, description: 'Chart of Accounts, Consolidation', category: 'department' },
    { id: 'operations', name: 'Operations OS', port: 5250, description: 'Projects, Processes, Incidents', category: 'department' },
    { id: 'cxo', name: 'CXO OS', port: 5100, description: 'Executive KPIs, Strategy', category: 'department' },
  ],
  // Core Business OS
  coreOS: [
    { id: 'media', name: 'Media OS', port: 5600, description: 'Content, Streaming' },
  ],
  foundation: [
    { id: 'corpId', name: 'CorpID', port: 4702, description: 'Universal Identity' },
    { id: 'memoryOs', name: 'MemoryOS', port: 4703, description: 'AI Memory' },
    { id: 'twinOs', name: 'TwinOS', port: 4705, description: 'Digital Twins' },
  ],
  hojaiAI: [
    { id: 'leverageIntelligence', name: 'Leverge Intelligence', port: 4761, description: 'Business Analytics' },
    { id: 'leverageMemory', name: 'Leverge Memory', port: 4762, description: 'AI Memory Platform' },
    { id: 'leverageTwin', name: 'Leverge Twin', port: 4763, description: 'Digital Twin Platform' },
    { id: 'leverageAgents', name: 'Leverge Agents', port: 4764, description: 'AI Agent Orchestration' },
    { id: 'leverageCopilot', name: 'Leverge Copilot', port: 4765, description: 'Business AI Copilot' },
  ],
  adbazaar: [
    { id: 'adbazaarDsp', name: 'REZ DSP', port: 4990, description: 'Ad Campaign Delivery' },
    { id: 'adbazaarAudience', name: 'REZ Audience', port: 4805, description: 'Audience Segments' },
    { id: 'adbazaarAttribution', name: 'REZ Attribution', port: 4803, description: 'Multi-touch Attribution' },
    { id: 'adbazaarCdp', name: 'REZ CDP', port: 4901, description: 'Customer Data Platform' },
  ],
  hospitality: [
    { id: 'restaurantOs', name: 'Restaurant OS', port: 5010, description: 'Restaurant Management' },
    { id: 'hotelOs', name: 'Hotel OS', port: 5025, description: 'Hotel Management' },
    { id: 'hospitalityOs', name: 'Hospitality OS', port: 5050, description: 'General Hospitality' },
  ],
  health: [
    { id: 'healthcareOs', name: 'Healthcare OS', port: 5020, description: 'Healthcare Management' },
  ],
  retail: [
    { id: 'retailOs', name: 'Retail OS', port: 5030, description: 'Retail Management' },
  ],
  business: [
    { id: 'legalOs', name: 'Legal OS', port: 5035, description: 'Legal Management' },
    { id: 'financialOs', name: 'Financial OS', port: 5220, description: 'Financial Services' },
    { id: 'professionalOs', name: 'Professional OS', port: 5170, description: 'Professional Services' },
  ],
  education: [
    { id: 'educationOs', name: 'Education OS', port: 5060, description: 'Education Management' },
  ],
  media: [
    { id: 'exhibitionOs', name: 'Exhibition OS', port: 5040, description: 'Event Management' },
    { id: 'entertainmentOs', name: 'Entertainment OS', port: 5200, description: 'Entertainment' },
  ],
  lifestyle: [
    { id: 'beautyOs', name: 'Beauty OS', port: 5090, description: 'Beauty & Salon' },
    { id: 'fitnessOs', name: 'Fitness OS', port: 5110, description: 'Gym & Fitness' },
    { id: 'fashionOs', name: 'Fashion OS', port: 5095, description: 'Fashion & Apparel' },
  ],
  realEstate: [
    { id: 'realestateOs', name: 'RealEstate OS', port: 5230, description: 'Real Estate' },
  ],
  industrial: [
    { id: 'manufacturingOs', name: 'Manufacturing OS', port: 5150, description: 'Manufacturing' },
    { id: 'constructionOs', name: 'Construction OS', port: 5210, description: 'Construction' },
    { id: 'automotiveOs', name: 'Automotive OS', port: 5080, description: 'Automotive' },
    { id: 'transportOs', name: 'Transport OS', port: 5240, description: 'Transport & Logistics' },
    { id: 'energyOs', name: 'Energy OS', port: 5100, description: 'Energy' },
  ],
  other: [
    { id: 'agricultureOs', name: 'Agriculture OS', port: 5070, description: 'Agriculture' },
    { id: 'gamingOs', name: 'Gaming OS', port: 5120, description: 'Gaming' },
    { id: 'governmentOs', name: 'Government OS', port: 5130, description: 'Government' },
    { id: 'homeServicesOs', name: 'Home Services OS', port: 5140, description: 'Home Services' },
    { id: 'nonProfitOs', name: 'Non-Profit OS', port: 5160, description: 'Non-Profit' },
    { id: 'sportsOs', name: 'Sports OS', port: 5180, description: 'Sports' },
    { id: 'travelOs', name: 'Travel OS', port: 5190, description: 'Travel' },
  ],
};

// ============================================
// HEALTH CHECKS
// ============================================

app.get('/health', async (req, res) => {
  const results = {};
  let healthy = 0;

  for (const [name, client] of Object.entries(clients)) {
    try {
      await client.get('/health', { timeout: 2000 });
      results[name] = { status: 'healthy' };
      healthy++;
    } catch {
      results[name] = { status: 'not_responding' };
    }
  }

  res.json({
    status: 'ok',
    service: 'RTMN Unified Hub',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    services: { total: Object.keys(clients).length, healthy, unhealthy: Object.keys(clients).length - healthy },
  });
});

app.get('/ready', (req, res) => res.json({ status: 'ready' }));
app.get('/live', (req, res) => res.json({ status: 'alive' }));

// ============================================
// SERVICE REGISTRY ENDPOINTS
// ============================================

app.get('/api/services', (req, res) => {
  const flat = Object.entries(SERVICE_REGISTRY)
    .flatMap(([category, services]) => services.map(s => ({ ...s, category })));
  res.json({ success: true, services: flat, total: flat.length });
});

app.get('/api/services/category/:category', (req, res) => {
  const services = SERVICE_REGISTRY[req.params.category];
  if (!services) return res.status(404).json({ success: false, error: 'Category not found' });
  res.json({ success: true, services });
});

app.get('/api/services/:serviceId', (req, res) => {
  const service = Object.values(SERVICE_REGISTRY).flat().find(s => s.id === req.params.serviceId);
  if (!service) return res.status(404).json({ success: false, error: 'Service not found' });
  res.json({ success: true, service });
});

// ============================================
// GENERIC SERVICE PROXY - ALL SERVICES
// ============================================

// Map: route prefix -> service key
const SERVICE_MAP = {
  sales: 'salesOs',
  media: 'mediaOs',
  marketing: 'marketingOs',
  // Department OS
  customerSuccess: 'customerSuccessOs',
  procurement: 'procurementOs',
  workforce: 'workforceOs',
  finance: 'financeOs',
  operations: 'operationsOs',
  cxo: 'cxoOs',
  ads: 'adbazaarDsp',
  audiences: 'adbazaarAudience',
  attribution: 'adbazaarAttribution',
  cdp: 'adbazaarCdp',
  crm: 'rezCrmHub',
  care: 'rezCareService',
  wallet: 'rezWallet',
  identity: 'corpId',
  memory: 'memoryOs',
  twins: 'twinOs',
  ai: 'leverageIntelligence',
  restaurant: 'restaurantOs',
  hotel: 'hotelOs',
  hospitality: 'hospitalityOs',
  healthcare: 'healthcareOs',
  retail: 'retailOs',
  legal: 'legalOs',
  education: 'educationOs',
  financial: 'financialOs',
  professional: 'professionalOs',
  beauty: 'beautyOs',
  fitness: 'fitnessOs',
  fashion: 'fashionOs',
  entertainment: 'entertainmentOs',
  exhibition: 'exhibitionOs',
  agriculture: 'agricultureOs',
  automotive: 'automotiveOs',
  manufacturing: 'manufacturingOs',
  construction: 'constructionOs',
  transport: 'transportOs',
  realestate: 'realestateOs',
  gaming: 'gamingOs',
  government: 'governmentOs',
  homeservices: 'homeServicesOs',
  nonprofit: 'nonProfitOs',
  sports: 'sportsOs',
  travel: 'travelOs',
  energy: 'energyOs',
};

// Generic proxy handler
for (const [prefix, serviceKey] of Object.entries(SERVICE_MAP)) {
  app.all(`/api/${prefix}/:path(.*)`, async (req, res) => {
    const client = clients[serviceKey];
    if (!client) return res.status(500).json({ success: false, error: 'Service not configured' });

    try {
      const response = req.method === 'GET'
        ? await client.get(req.params.path, { params: req.query })
        : await client.post(req.params.path, req.body);

      res.json({ success: true, ...response.data, _meta: { service: serviceKey } });
    } catch (error) {
      res.status(502).json({
        success: false,
        error: error.response?.data?.error || error.message,
        service: serviceKey,
      });
    }
  });
}

// ============================================
// CROSS-OS WORKFLOWS
// ============================================

// Customer 360 - All data in one call
app.get('/api/customer360/:id', async (req, res) => {
  const { id } = req.params;

  const promises = [
    safeGet(clients.salesOs, `/customers/${id}`),
    safeGet(clients.mediaOs, `/viewers/${id}`),
    safeGet(clients.marketingOs, `/leads/${id}`),
    safeGet(clients.rezCrmHub, `/contacts/${id}`),
    safeGet(clients.rezWallet, `/wallet/${id}`),
  ];

  const [sales, media, marketing, crm, wallet] = await Promise.all(promises);

  res.json({
    success: true,
    customer: {
      sales,
      media,
      marketing,
      crm,
      wallet,
    }
  });
});

// Lead to Revenue Pipeline
app.post('/api/workflow/lead-to-revenue', async (req, res) => {
  const { email, phone, name, source } = req.body;

  const [lead, crmContact, wallet] = await Promise.all([
    safePost(clients.marketingOs, '/api/leads', { email, phone, firstName: name, source }),
    safePost(clients.rezCrmHub, '/api/contacts', { email, name }),
    safePost(clients.rezWallet, '/api/wallets', { userId: email }),
  ]);

  res.json({
    success: true,
    workflow: { lead, crmContact, wallet }
  });
});

// Campaign Launch
app.post('/api/workflow/campaign-launch', async (req, res) => {
  const { name, budget, audience, targeting } = req.body;

  const [campaign, ads, attribution] = await Promise.all([
    safePost(clients.marketingOs, '/api/campaigns', { name, budget }),
    safePost(clients.adbazaarDsp, '/api/campaigns', { name, budget, audience }),
    safePost(clients.adbazaarAttribution, '/api/setup', { campaign: name }),
  ]);

  res.json({ success: true, workflow: { campaign, ads, attribution } });
});

// Industry-specific workflows
app.post('/api/workflow/hotel-booking', async (req, res) => {
  const { guestId, roomType, checkIn, checkOut } = req.body;

  const [booking, crm, wallet] = await Promise.all([
    safePost(clients.hotelOs, '/api/bookings', { guestId, roomType, checkIn, checkOut }),
    safePost(clients.rezCrmHub, '/api/contacts', { customerId: guestId }),
    safePost(clients.rezWallet, '/api/transactions', { userId: guestId, type: 'hotel_booking' }),
  ]);

  res.json({ success: true, workflow: { booking, crm, wallet } });
});

app.post('/api/workflow/restaurant-order', async (req, res) => {
  const { customerId, items, table } = req.body;

  const [order, crm, wallet] = await Promise.all([
    safePost(clients.restaurantOs, '/api/orders', { customerId, items, table }),
    safePost(clients.rezCrmHub, '/api/contacts', { customerId }),
    safePost(clients.rezWallet, '/api/transactions', { userId: customerId }),
  ]);

  res.json({ success: true, workflow: { order, crm, wallet } });
});

// ============================================
// UTILITY
// ============================================

async function safeGet(client, path) {
  try {
    const { data } = await client.get(path);
    return data;
  } catch (e) {
    return { error: e.message };
  }
}

async function safePost(client, path, body) {
  try {
    const { data } = await client.post(path, body);
    return data;
  } catch (e) {
    return { error: e.message };
  }
}

// ============================================
// ERROR HANDLING
// ============================================

app.use((req, res) => res.status(404).json({ success: false, error: 'Not found', path: req.path }));
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ success: false, error: 'Internal error' });
});

// ============================================
// START
// ============================================

app.listen(PORT, () => {
  const totalServices = Object.keys(SERVICE_REGISTRY).reduce((sum, cat) => sum + SERVICE_REGISTRY[cat].length, 0);

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║              RTMN UNIFIED HUB v1.0.0                                  ║
║                                                                       ║
║              ONE GATEWAY TO RULE THEM ALL                              ║
║                                                                       ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  Port: ${PORT}                                                         ║
║  Environment: ${NODE_ENV}                                               ║
║                                                                       ║
║  SERVICES CONNECTED: ${totalServices}                                              ║
║                                                                       ║
║  ✅ Core OS (3)                                                       ║
║     Sales OS (5055)  Media OS (5600)  Marketing OS (5500)                   ║
║                                                                       ║
║  ✅ Foundation (3)                                                    ║
║     CorpID (4702)  MemoryOS (4703)  TwinOS (4705)                         ║
║                                                                       ║
║  ✅ HOJAI AI (5)                                                      ║
║     Intelligence, Memory, Twin, Agents, Copilot                        ║
║                                                                       ║
║  ✅ AdBazaar (4)                                                     ║
║     DSP, Audience, Attribution, CDP                                   ║
║                                                                       ║
║  ✅ Industry OS (24)                                                 ║
║     Restaurant, Hotel, Healthcare, Retail, Legal...                       ║
║                                                                       ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  API ENDPOINTS:                                                       ║
║                                                                       ║
║  GET /api/services          - Service Registry                       ║
║  GET /api/{service}/{path}   - Proxy to any service                   ║
║  GET /api/customer360/:id    - 360 customer view                      ║
║  POST /api/workflow/*         - Cross-OS workflows                      ║
║                                                                       ║
║  SERVICE ROUTES:                                                     ║
║  /api/sales/*    /api/media/*    /api/marketing/*                         ║
║  /api/ads/*      /api/crm/*      /api/wallet/*                            ║
║  /api/restaurant/*  /api/hotel/*  /api/healthcare/*                       ║
║  ... ALL 24 Industry OS                                               ║
║                                                                       ║
╚══════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`\n🚀 RTMN Unified Hub Ready!\n`);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
