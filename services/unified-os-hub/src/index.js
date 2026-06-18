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
  marketingCopilot: 'http://localhost:4925',
  supportCopilot: 'http://localhost:4926',

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

  // External
  sutarOs: 'http://localhost:4799',
  nexhaPortal: 'http://localhost:3000',
  commerceIdentity: 'http://localhost:8000',
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
  ],
  external: [
    { id: 'sutarOs', name: 'SUTAR OS', port: 4799, category: 'external', description: 'Identity & Trust' },
    { id: 'nexhaPortal', name: 'Nexha Portal', port: 3000, category: 'external', description: 'Nexha Platform' },
    { id: 'commerceIdentity', name: 'Commerce Identity', port: 8000, category: 'external', description: 'User Identity' },
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

// Health check
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
