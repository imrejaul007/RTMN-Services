/**
 * RTMN Platform Hub - Central Orchestration Platform
 * Connects all 24 Industry OS + Core Services (CorpID, MemoryOS, KnowledgeGraphOS, TwinOS, SimulationOS, BOA, SUTAR, Genie, AgentOS)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Service Registry - All RTMN Services
const serviceRegistry = {
  // Core Services
  core: {
    'api-gateway': { url: process.env.API_GATEWAY_URL || 'http://localhost:3000', status: 'active' },
    'agentos-hub': { url: process.env.AGENTOS_HUB_URL || 'http://localhost:3010', status: 'active' },
    'twinos-hub': { url: process.env.TWINOS_HUB_URL || 'http://localhost:3011', status: 'active' },
    'knowledge-graph': { url: process.env.KG_URL || 'http://localhost:3012', status: 'active' },
    'business-copilot': { url: process.env.BUSINESS_COPILOT_URL || 'http://localhost:3002', status: 'active' }
  },
  // BOA & SUTAR
  platform: {
    'boa-os': { url: process.env.BOA_OS_URL || 'http://localhost:3001', status: 'active' },
    'sutar-os': { url: process.env.SUTAR_OS_URL || 'http://localhost:4002', status: 'active' },
    'genie-os': { url: process.env.GENIE_OS_URL || 'http://localhost:4001', status: 'active' },
    'agent-os': { url: process.env.AGENT_OS_URL || 'http://localhost:4003', status: 'active' }
  },
  // Economic Network (RTNM-Group)
  economic: {
    'company-registry': { url: process.env.COMPANY_REGISTRY_URL || 'http://localhost:6000', port: 6000, status: 'active' },
    'inter-company-graph': { url: process.env.INTER_COMPANY_GRAPH_URL || 'http://localhost:6001', port: 6001, status: 'active' },
    'company-twins': { url: process.env.COMPANY_TWINS_URL || 'http://localhost:6002', port: 6002, status: 'active' },
    'company-trust': { url: process.env.COMPANY_TRUST_URL || 'http://localhost:6003', port: 6003, status: 'active' },
    'inter-company-ledger': { url: process.env.INTER_COMPANY_LEDGER_URL || 'http://localhost:6004', port: 6004, status: 'active' }
  },
  // Industry OS (24 Industries)
  industries: {
    'restaurant-os': { url: process.env.RESTAURANT_OS_URL || 'http://localhost:5010', port: 5010, twins: ['Order', 'Menu', 'Kitchen', 'Table', 'Inventory'] },
    'healthcare-os': { url: process.env.HEALTHCARE_OS_URL || 'http://localhost:5020', port: 5020, twins: ['Patient', 'Appointment', 'Doctor', 'Billing', 'Inventory'] },
    'retail-os': { url: process.env.RETAIL_OS_URL || 'http://localhost:5030', port: 5030, twins: ['Customer', 'Product', 'Inventory', 'Order', 'Revenue'] },
    'hospitality-os': { url: process.env.HOSPITALITY_OS_URL || 'http://localhost:5040', port: 5040, twins: ['Guest', 'Room', 'Booking', 'Revenue', 'Service'] },
    'legal-os': { url: process.env.LEGAL_OS_URL || 'http://localhost:5050', port: 5050, twins: ['Case', 'Client', 'Document', 'Contract', 'Court'] },
    'education-os': { url: process.env.EDUCATION_OS_URL || 'http://localhost:5060', port: 5060, twins: ['Course', 'Student', 'Teacher', 'Institution'] },
    'agriculture-os': { url: process.env.AGRICULTURE_OS_URL || 'http://localhost:5070', port: 5070, twins: ['Farm', 'Crop', 'Livestock', 'Weather', 'Soil'] },
    'automotive-os': { url: process.env.AUTOMOTIVE_OS_URL || 'http://localhost:5080', port: 5080, twins: ['Vehicle', 'Engine', 'Customer', 'Service'] },
    'beauty-os': { url: process.env.BEAUTY_OS_URL || 'http://localhost:5090', port: 5090, twins: ['Client', 'Service', 'Staff', 'Inventory'] },
    'fashion-os': { url: process.env.FASHION_OS_URL || 'http://localhost:5100', port: 5100, twins: ['Product', 'Collection', 'Inventory', 'Trend'] },
    'fitness-os': { url: process.env.FITNESS_OS_URL || 'http://localhost:5110', port: 5110, twins: ['Member', 'Trainer', 'Equipment', 'Class'] },
    'gaming-os': { url: process.env.GAMING_OS_URL || 'http://localhost:5120', port: 5120, twins: ['Game', 'Player', 'Tournament', 'Match'] },
    'government-os': { url: process.env.GOVERNMENT_OS_URL || 'http://localhost:5130', port: 5130, twins: ['Citizen', 'Service', 'Department', 'Permit'] },
    'homeservices-os': { url: process.env.HOMESERVICES_OS_URL || 'http://localhost:5140', port: 5140, twins: ['Provider', 'Customer', 'Booking', 'Service'] },
    'manufacturing-os': { url: process.env.MANUFACTURING_OS_URL || 'http://localhost:5150', port: 5150, twins: ['Product', 'Machine', 'Production', 'Inventory'] },
    'nonprofit-os': { url: process.env.NONPROFIT_OS_URL || 'http://localhost:5160', port: 5160, twins: ['Donor', 'Campaign', 'Beneficiary', 'Volunteer'] },
    'professional-os': { url: process.env.PROFESSIONAL_OS_URL || 'http://localhost:5170', port: 5170, twins: ['Consultant', 'Client', 'Project', 'Invoice'] },
    'sports-os': { url: process.env.SPORTS_OS_URL || 'http://localhost:5180', port: 5180, twins: ['Team', 'Player', 'Match', 'Venue'] },
    'travel-os': { url: process.env.TRAVEL_OS_URL || 'http://localhost:5190', port: 5190, twins: ['Destination', 'Package', 'Booking', 'Traveler'] },
    'entertainment-os': { url: process.env.ENTERTAINMENT_OS_URL || 'http://localhost:5200', port: 5200, twins: ['Event', 'Venue', 'Ticket', 'Artist'] },
    'construction-os': { url: process.env.CONSTRUCTION_OS_URL || 'http://localhost:5210', port: 5210, twins: ['Project', 'Contractor', 'Worker', 'Material'] },
    'financial-os': { url: process.env.FINANCIAL_OS_URL || 'http://localhost:5220', port: 5220, twins: ['Account', 'Transaction', 'Customer', 'Loan'] },
    'realestate-os': { url: process.env.REALESTATE_OS_URL || 'http://localhost:5230', port: 5230, twins: ['Property', 'Buyer', 'Agent', 'Market'] },
    'transport-os': { url: process.env.TRANSPORT_OS_URL || 'http://localhost:5240', port: 5240, twins: ['Vehicle', 'Driver', 'Rider', 'Route'] },
    'hotel-os': { url: process.env.HOTEL_OS_URL || 'http://localhost:5025', port: 5025, twins: ['Guest', 'Room', 'Property', 'Booking'] }
  }
};

// Flatten all services for easy access
const allServices = {
  ...serviceRegistry.core,
  ...serviceRegistry.platform,
  ...serviceRegistry.economic,
  ...serviceRegistry.industries
};

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'RTMN Platform Hub',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root - Platform Overview
app.get('/', (req, res) => {
  res.json({
    name: 'RTMN Platform Hub',
    description: 'Real-Time Multi-Industry Network - Unified Platform for 24 Industries + Economic Network',
    version: '1.0.0',
    architecture: {
      core: 'CorpID → MemoryOS → KnowledgeGraphOS → TwinOS → SimulationOS',
      platform: 'Business Copilot → BOA → SUTAR → Genie → AgentOS',
      economic: 'Company Registry → Company Twins → Trust → Inter-Company Graph → Ledger',
      industries: '24 Industry Operating Systems'
    },
    services: {
      core: Object.keys(serviceRegistry.core).length,
      platform: Object.keys(serviceRegistry.platform).length,
      economic: Object.keys(serviceRegistry.economic).length,
      industries: Object.keys(serviceRegistry.industries).length,
      total: Object.keys(allServices).length
    },
    endpoints: {
      services: '/services',
      industries: '/industries',
      twins: '/twins',
      agents: '/agents',
      query: '/query'
    }
  });
});

// Service Registry
app.get('/services', (req, res) => {
  res.json({
    core: serviceRegistry.core,
    platform: serviceRegistry.platform,
    industries: serviceRegistry.industries,
    total: Object.keys(allServices).length
  });
});

// Industries List
app.get('/industries', (req, res) => {
  const industries = Object.entries(serviceRegistry.industries).map(([id, data]) => ({
    id,
    url: data.url,
    port: data.port,
    twins: data.twins,
    status: data.status || 'active'
  }));
  res.json({ industries, count: industries.length });
});

// Get specific industry
app.get('/industries/:id', (req, res) => {
  const industry = serviceRegistry.industries[req.params.id];
  if (!industry) return res.status(404).json({ error: 'Industry not found' });
  res.json({ id: req.params.id, ...industry });
});

// Universal Query - Query any service
app.post('/query', async (req, res) => {
  const { service, endpoint, method = 'GET', data } = req.body;

  const targetService = allServices[service];
  if (!targetService) return res.status(404).json({ error: 'Service not found' });

  try {
    const response = await axios({
      method,
      url: `${targetService.url}${endpoint}`,
      data,
      timeout: 10000
    });
    res.json({ service, endpoint, response: response.data });
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: 'Service query failed',
      service,
      message: error.message
    });
  }
});

// All Digital Twins across industries
app.get('/twins', (req, res) => {
  const twins = [];
  Object.entries(serviceRegistry.industries).forEach(([industry, data]) => {
    data.twins.forEach(twin => {
      twins.push({
        id: `${industry}-${twin.toLowerCase()}-twin`,
        name: `${twin} Twin`,
        type: twin.toLowerCase(),
        industry,
        service: industry,
        url: `${data.url}/api/twins`
      });
    });
  });
  res.json({ twins, count: twins.length });
});

// All AI Agents across industries
app.get('/agents', (req, res) => {
  const agents = [];
  Object.entries(serviceRegistry.industries).forEach(([industry, data]) => {
    agents.push({
      id: `${industry}-agent`,
      name: `${industry.replace('-os', '').replace('-', ' ')} Agent`,
      industry,
      service: industry,
      url: `${data.url}/api/agents`
    });
  });
  res.json({ agents, count: agents.length });
});

// Platform-wide search
app.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter q required' });

  // Search across all services
  const results = {
    query: q,
    industries: Object.keys(serviceRegistry.industries).filter(i => i.includes(q.toLowerCase())),
    twins: Object.values(serviceRegistry.industries).flatMap(s => s.twins).filter(t => t.toLowerCase().includes(q.toLowerCase())),
    services: Object.keys(allServices).filter(s => s.includes(q.toLowerCase()))
  };

  res.json(results);
});

// Proxy to specific industry service
app.use('/api/:industry', async (req, res, next) => {
  const industry = serviceRegistry.industries[req.params.industry];
  if (!industry) return next();

  try {
    const targetUrl = `${industry.url}${req.originalUrl.replace(`/api/${req.params.industry}`, '')}`;
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'X-RTMN-Hub': 'true' },
      timeout: 10000
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: 'Industry service unavailable',
      industry: req.params.industry,
      message: error.message
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('RTMN Hub Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`🌐 RTMN Platform Hub running on port ${PORT}`);
  console.log(`   Core Services: ${Object.keys(serviceRegistry.core).length}`);
  console.log(`   Platform Services: ${Object.keys(serviceRegistry.platform).length}`);
  console.log(`   Industry OS: ${Object.keys(serviceRegistry.industries).length}`);
  console.log(`   Total Services: ${Object.keys(allServices).length}`);
  console.log(`\n   Endpoints:`);
  console.log(`   - /services - Service Registry`);
  console.log(`   - /industries - All Industry OS`);
  console.log(`   - /twins - All Digital Twins`);
  console.log(`   - /agents - All AI Agents`);
  console.log(`   - /query - Universal Query`);
  console.log(`   - /api/:industry - Proxy to Industry OS`);
});

module.exports = app;
