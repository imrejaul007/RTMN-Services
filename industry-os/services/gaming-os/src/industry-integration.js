/**
 * RTMN Industry OS - Shared Integration Module
 *
 * This module provides universal integration for ALL 24 Industry OS
 * to connect with Department OS, Foundation Services, and External Services.
 *
 * Usage:
 *   const integration = require('./shared/industry-integration');
 *   integration.registerRoutes(app, industryType, PORT);
 */

const express = require('express');
const axios = require('axios');

// ============================================
// RTMN SERVICE REGISTRY
// ============================================

const RTMN_SERVICES = {
  // Foundation Services
  corpId: process.env.CORPID_URL || 'http://localhost:4702',
  memoryOs: process.env.MEMORY_URL || 'http://localhost:4703',
  twinOs: process.env.TWIN_URL || 'http://localhost:4705',

  // Department OS (8)
  sales: process.env.SALES_OS_URL || 'http://localhost:5055',
  marketing: process.env.MARKETING_OS_URL || 'http://localhost:5500',
  customerSuccess: process.env.CS_OS_URL || 'http://localhost:4050',
  procurement: process.env.PROCUREMENT_OS_URL || 'http://localhost:5096',
  workforce: process.env.WORKFORCE_OS_URL || 'http://localhost:5077',
  finance: process.env.FINANCE_OS_URL || 'http://localhost:4801',
  operations: process.env.OPERATIONS_OS_URL || 'http://localhost:5250',
  cxo: process.env.CXO_OS_URL || 'http://localhost:5100',

  // SUTAR OS
  sutar: process.env.SUTAR_URL || 'http://localhost:4799',

  // Nexha
  nexha: process.env.NEXHA_URL || 'http://localhost:3000',

  // Agent Copilot
  agentCopilot: process.env.AGENT_COPILOT_URL || 'http://localhost:4920',
  salesCopilot: process.env.SALES_COPILOT_URL || 'http://localhost:4928',
  financeCopilot: process.env.FINANCE_COPILOT_URL || 'http://localhost:4930',

  // Commerce Identity
  commerceIdentity: process.env.COMMERCE_ID_URL || 'http://localhost:8000',
};

// Create axios clients for all services
const clients = {};
for (const [name, url] of Object.entries(RTMN_SERVICES)) {
  clients[name] = axios.create({ baseURL: url, timeout: 5000 });
}

// ============================================
// INDUSTRY CONFIGURATION
// ============================================

const INDUSTRY_CONFIG = {
  restaurant: { name: 'Restaurant', modules: ['POS', 'Kitchen', 'Menu', 'Delivery', 'Reservations'] },
  hotel: { name: 'Hotel', modules: ['PMS', 'Revenue', 'Housekeeping', 'Events', 'Restaurant'] },
  healthcare: { name: 'Healthcare', modules: ['Patient', 'Appointment', 'Pharmacy', 'Insurance', 'Records'] },
  retail: { name: 'Retail', modules: ['POS', 'Inventory', 'Supplier', 'Loyalty', 'Ecommerce'] },
  legal: { name: 'Legal', modules: ['Cases', 'Clients', 'Documents', 'Billing', 'Calendar'] },
  education: { name: 'Education', modules: ['Student', 'Course', 'Faculty', 'Assessment', 'Admission'] },
  agriculture: { name: 'Agriculture', modules: ['Crop', 'Inventory', 'Equipment', 'Weather', 'Supply'] },
  automotive: { name: 'Automotive', modules: ['Vehicle', 'Service', 'Parts', 'Customer', 'Warranty'] },
  beauty: { name: 'Beauty', modules: ['Appointment', 'Treatment', 'Product', 'Stylist', 'Inventory'] },
  fashion: { name: 'Fashion', modules: ['Collection', 'Inventory', 'Showroom', 'Orders', 'Trends'] },
  fitness: { name: 'Fitness', modules: ['Membership', 'Class', 'Trainer', 'Nutrition', 'Progress'] },
  gaming: { name: 'Gaming', modules: ['Player', 'Tournament', 'Match', 'Reward', 'Streaming'] },
  government: { name: 'Government', modules: ['Citizen', 'Service', 'Permit', 'Payment', 'Records'] },
  homeServices: { name: 'Home Services', modules: ['Job', 'Technician', 'Customer', 'Quote', 'Schedule'] },
  manufacturing: { name: 'Manufacturing', modules: ['Production', 'Inventory', 'Quality', 'Supply', 'Maintenance'] },
  nonProfit: { name: 'Non-Profit', modules: ['Donor', 'Volunteer', 'Grant', 'Event', 'Impact'] },
  professional: { name: 'Professional', modules: ['Client', 'Project', 'Time', 'Invoice', 'Knowledge'] },
  sports: { name: 'Sports', modules: ['Athlete', 'Team', 'Training', 'Match', 'Fan'] },
  travel: { name: 'Travel', modules: ['Booking', 'Destination', 'Guide', 'Package', 'Review'] },
  entertainment: { name: 'Entertainment', modules: ['Event', 'Ticket', 'Artist', 'Venue', 'Streaming'] },
  construction: { name: 'Construction', modules: ['Project', 'Worker', 'Equipment', 'Material', 'Safety'] },
  financial: { name: 'Financial', modules: ['Account', 'Transaction', 'Loan', 'Investment', 'Compliance'] },
  realEstate: { name: 'Real Estate', modules: ['Property', 'Lead', 'Showing', 'Contract', 'Tenant'] },
  transport: { name: 'Transport', modules: ['Fleet', 'Route', 'Driver', 'Booking', 'Cargo'] },
};

// ============================================
// ROUTE REGISTRATION
// ============================================

function registerRoutes(app, industryType, industryPort) {
  const config = INDUSTRY_CONFIG[industryType] || { name: industryType, modules: [] };

  console.log(`[Integration] Registering routes for ${config.name} OS`);

  // ----------------------------------------
  // Foundation Integration Routes
  // ----------------------------------------

  // CorpID - Identity
  app.get('/api/integration/corpId/verify/:id', async (req, res) => {
    try {
      const response = await clients.corpId.get(`/api/verify/${req.params.id}`);
      res.json({ success: true, data: response.data, source: 'corpId' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'corpId' });
    }
  });

  // MemoryOS - Store/Retrieve Data
  app.post('/api/integration/memory/store', async (req, res) => {
    try {
      const { key, data, category } = req.body;
      const response = await clients.memoryOs.post('/api/store', {
        key, data, category, industry: industryType
      });
      res.json({ success: true, data: response.data, source: 'memoryOs' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'memoryOs' });
    }
  });

  app.get('/api/integration/memory/retrieve/:key', async (req, res) => {
    try {
      const response = await clients.memoryOs.get(`/api/retrieve/${req.params.key}`, {
        params: { industry: industryType }
      });
      res.json({ success: true, data: response.data, source: 'memoryOs' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'memoryOs' });
    }
  });

  // TwinOS - Digital Twin Operations
  app.post('/api/integration/twin/create', async (req, res) => {
    try {
      const { twinType, data } = req.body;
      const response = await clients.twinOs.post('/api/twins', {
        type: twinType,
        data: { ...data, industry: industryType },
        source: industryType
      });
      res.json({ success: true, data: response.data, source: 'twinOs' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'twinOs' });
    }
  });

  app.get('/api/integration/twin/:twinType/:id', async (req, res) => {
    try {
      const response = await clients.twinOs.get(`/api/twins/${req.params.twinType}/${req.params.id}`);
      res.json({ success: true, data: response.data, source: 'twinOs' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'twinOs' });
    }
  });

  // ----------------------------------------
  // Department OS Integration Routes
  // ----------------------------------------

  // Sales OS - Customer & Lead Management
  app.post('/api/integration/sales/lead', async (req, res) => {
    try {
      const { name, email, phone, source, value } = req.body;
      const response = await clients.sales.post('/api/leads', {
        name, email, phone, source, value, industry: industryType
      });
      res.json({ success: true, data: response.data, source: 'sales' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'sales' });
    }
  });

  app.get('/api/integration/sales/customer/:id', async (req, res) => {
    try {
      const response = await clients.sales.get(`/api/customers/${req.params.id}`, {
        params: { industry: industryType }
      });
      res.json({ success: true, data: response.data, source: 'sales' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'sales' });
    }
  });

  // Marketing OS - Campaigns & Analytics
  app.post('/api/integration/marketing/campaign', async (req, res) => {
    try {
      const { name, type, audience, budget } = req.body;
      const response = await clients.marketing.post('/api/campaigns', {
        name, type, audience, budget, industry: industryType
      });
      res.json({ success: true, data: response.data, source: 'marketing' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'marketing' });
    }
  });

  app.post('/api/integration/marketing/track', async (req, res) => {
    try {
      const { event, data } = req.body;
      const response = await clients.marketing.post('/api/analytics/track', {
        event, data, industry: industryType
      });
      res.json({ success: true, data: response.data, source: 'marketing' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'marketing' });
    }
  });

  // Procurement OS - Supplier & Purchase Orders
  app.post('/api/integration/procurement/rfq', async (req, res) => {
    try {
      const { items, supplierPreferences, urgency } = req.body;
      const response = await clients.procurement.post('/api/rfqs', {
        items, supplierPreferences, urgency, industry: industryType
      });
      res.json({ success: true, data: response.data, source: 'procurement' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'procurement' });
    }
  });

  app.post('/api/integration/procurement/order', async (req, res) => {
    try {
      const { items, supplierId, budget } = req.body;
      const response = await clients.procurement.post('/api/orders', {
        items, supplierId, budget, industry: industryType
      });
      res.json({ success: true, data: response.data, source: 'procurement' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'procurement' });
    }
  });

  app.get('/api/integration/procurement/suppliers', async (req, res) => {
    try {
      const response = await clients.procurement.get('/api/suppliers', {
        params: { industry: industryType }
      });
      res.json({ success: true, data: response.data, source: 'procurement' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'procurement' });
    }
  });

  // Workforce OS - Employee Management
  app.post('/api/integration/workforce/employee', async (req, res) => {
    try {
      const { name, email, department, role, skills } = req.body;
      const response = await clients.workforce.post('/api/employees', {
        name, email, department: department || industryType, role, skills, industry: industryType
      });
      res.json({ success: true, data: response.data, source: 'workforce' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'workforce' });
    }
  });

  app.post('/api/integration/workforce/attendance', async (req, res) => {
    try {
      const { employeeId, date, checkIn, checkOut } = req.body;
      const response = await clients.workforce.post('/api/attendance', {
        employeeId, date, checkIn, checkOut, industry: industryType
      });
      res.json({ success: true, data: response.data, source: 'workforce' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'workforce' });
    }
  });

  // Finance OS - Financial Transactions
  app.post('/api/integration/finance/invoice', async (req, res) => {
    try {
      const { customerId, items, amount, type } = req.body;
      const response = await clients.finance.post('/api/invoices', {
        customerId, items, amount, type, industry: industryType
      });
      res.json({ success: true, data: response.data, source: 'finance' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'finance' });
    }
  });

  app.get('/api/integration/finance/report/:type', async (req, res) => {
    try {
      const response = await clients.finance.get(`/api/reports/${req.params.type}`, {
        params: { industry: industryType }
      });
      res.json({ success: true, data: response.data, source: 'finance' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'finance' });
    }
  });

  // Operations OS - Projects & Tasks
  app.post('/api/integration/operations/project', async (req, res) => {
    try {
      const { name, description, priority, assignees } = req.body;
      const response = await clients.operations.post('/api/projects', {
        name, description, priority, assignees, industry: industryType
      });
      res.json({ success: true, data: response.data, source: 'operations' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'operations' });
    }
  });

  app.post('/api/integration/operations/task', async (req, res) => {
    try {
      const { projectId, title, assignee, dueDate } = req.body;
      const response = await clients.operations.post('/api/tasks', {
        projectId, title, assignee, dueDate, industry: industryType
      });
      res.json({ success: true, data: response.data, source: 'operations' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'operations' });
    }
  });

  // CXO OS - KPIs & Dashboard
  app.post('/api/integration/cxo/kpi', async (req, res) => {
    try {
      const { metric, value, period } = req.body;
      const response = await clients.cxo.post('/api/kpis', {
        metric, value, period, source: industryType, industry: industryType
      });
      res.json({ success: true, data: response.data, source: 'cxo' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'cxo' });
    }
  });

  // Customer Success OS
  app.post('/api/integration/customerSuccess/nps', async (req, res) => {
    try {
      const { customerId, score, feedback } = req.body;
      const response = await clients.customerSuccess.post('/api/nps', {
        customerId, score, feedback, industry: industryType
      });
      res.json({ success: true, data: response.data, source: 'customerSuccess' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'customerSuccess' });
    }
  });

  // ----------------------------------------
  // SUTAR OS Integration Routes
  // ----------------------------------------

  app.post('/api/integration/sutar/identity', async (req, res) => {
    try {
      const { identity, type, data } = req.body;
      const response = await clients.sutar.post('/api/identity/register', {
        identity, type, data, source: industryType
      });
      res.json({ success: true, data: response.data, source: 'sutar' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'sutar' });
    }
  });

  app.post('/api/integration/sutar/verify', async (req, res) => {
    try {
      const { identity, action } = req.body;
      const response = await clients.sutar.post('/api/verify', {
        identity, action, source: industryType
      });
      res.json({ success: true, data: response.data, source: 'sutar' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'sutar' });
    }
  });

  app.post('/api/integration/sutar/event', async (req, res) => {
    try {
      const { eventType, data } = req.body;
      const response = await clients.sutar.post('/events/publish', {
        eventType, data, source: industryType
      });
      res.json({ success: true, data: response.data, source: 'sutar' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'sutar' });
    }
  });

  app.post('/api/integration/sutar/policy', async (req, res) => {
    try {
      const { policyType, rules } = req.body;
      const response = await clients.sutar.post('/api/policies', {
        policyType, rules, source: industryType
      });
      res.json({ success: true, data: response.data, source: 'sutar' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'sutar' });
    }
  });

  // ----------------------------------------
  // Nexha Integration Routes
  // ----------------------------------------

  app.post('/api/integration/nexha/rfq', async (req, res) => {
    try {
      const { items, requirements, budget } = req.body;
      const response = await clients.nexha.post('/api/rfq', {
        items, requirements, budget, source: industryType
      });
      res.json({ success: true, data: response.data, source: 'nexha' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'nexha' });
    }
  });

  app.post('/api/integration/nexha/quote', async (req, res) => {
    try {
      const { rfqId, supplierId } = req.body;
      const response = await clients.nexha.post('/api/quotes', {
        rfqId, supplierId, source: industryType
      });
      res.json({ success: true, data: response.data, source: 'nexha' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'nexha' });
    }
  });

  app.post('/api/integration/nexha/order', async (req, res) => {
    try {
      const { quoteId, items, delivery } = req.body;
      const response = await clients.nexha.post('/api/orders', {
        quoteId, items, delivery, source: industryType
      });
      res.json({ success: true, data: response.data, source: 'nexha' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'nexha' });
    }
  });

  // ----------------------------------------
  // Agent Copilot Integration
  // ----------------------------------------

  app.post('/api/integration/copilot/execute', async (req, res) => {
    try {
      const { task, context } = req.body;
      const response = await clients.agentCopilot.post('/api/execute', {
        task, context: { ...context, industry: industryType }
      });
      res.json({ success: true, data: response.data, source: 'agentCopilot' });
    } catch (error) {
      res.status(502).json({ success: false, error: error.message, source: 'agentCopilot' });
    }
  });

  // ----------------------------------------
  // Health Check - All Integrations
  // ----------------------------------------

  app.get('/api/integration/health', async (req, res) => {
    const results = {};
    let healthy = 0;
    const total = Object.keys(clients).length;

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
      industry: industryType,
      port: industryPort,
      integrations: { total, healthy, unhealthy: total - healthy },
      services: results,
      timestamp: new Date().toISOString()
    });
  });

  // ----------------------------------------
  // Status Endpoint
  // ----------------------------------------

  app.get('/api/integration/status', (req, res) => {
    res.json({
      industry: industryType,
      config: config,
      integrations: Object.keys(RTMN_SERVICES),
      timestamp: new Date().toISOString()
    });
  });

  console.log(`[Integration] ✅ Registered ${Object.keys(RTMN_SERVICES).length} service integrations`);
  console.log(`[Integration] ✅ ${config.name} OS connected to RTMN Ecosystem`);
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  registerRoutes,
  RTMN_SERVICES,
  INDUSTRY_CONFIG,
  clients,
};

module.exports.RTMN_SERVICES = RTMN_SERVICES;
module.exports.INDUSTRY_CONFIG = INDUSTRY_CONFIG;
module.exports.clients = clients;
