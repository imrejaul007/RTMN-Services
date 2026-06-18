/**
 * RTMN Unified Hub - Industry Cross-OS Workflows
 * Complete integration for all 24 Industry OS
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

// All 24 Industry OS
const INDUSTRY_OS = {
  restaurant: { port: 5010, name: 'Restaurant', procurement: 'food' },
  hotel: { port: 5025, name: 'Hotel', procurement: 'hotel_supplies' },
  healthcare: { port: 5020, name: 'Healthcare', procurement: 'medical' },
  retail: { port: 5030, name: 'Retail', procurement: 'merchandise' },
  legal: { port: 5035, name: 'Legal', procurement: 'office' },
  education: { port: 5060, name: 'Education', procurement: 'educational' },
  agriculture: { port: 5070, name: 'Agriculture', procurement: 'farm' },
  automotive: { port: 5080, name: 'Automotive', procurement: 'auto_parts' },
  beauty: { port: 5090, name: 'Beauty', procurement: 'beauty_products' },
  fashion: { port: 5095, name: 'Fashion', procurement: 'textiles' },
  fitness: { port: 5110, name: 'Fitness', procurement: 'gym_equipment' },
  gaming: { port: 5120, name: 'Gaming', procurement: 'tech' },
  government: { port: 5130, name: 'Government', procurement: 'general' },
  homeServices: { port: 5140, name: 'Home Services', procurement: 'tools' },
  manufacturing: { port: 5150, name: 'Manufacturing', procurement: 'raw_materials' },
  nonProfit: { port: 5160, name: 'Non-Profit', procurement: 'supplies' },
  professional: { port: 5170, name: 'Professional', procurement: 'office' },
  sports: { port: 5180, name: 'Sports', procurement: 'sports_equipment' },
  travel: { port: 5190, name: 'Travel', procurement: 'travel' },
  entertainment: { port: 5200, name: 'Entertainment', procurement: 'event' },
  construction: { port: 5210, name: 'Construction', procurement: 'building' },
  financial: { port: 5220, name: 'Financial', procurement: 'office' },
  realEstate: { port: 5230, name: 'Real Estate', procurement: 'property' },
  transport: { port: 5240, name: 'Transport', procurement: 'logistics' },
};

// Department OS
const DEPT_OS = {
  sales: 'http://localhost:5055',
  marketing: 'http://localhost:5500',
  procurement: 'http://localhost:5096',
  workforce: 'http://localhost:5077',
  finance: 'http://localhost:4801',
  operations: 'http://localhost:5250',
  cxo: 'http://localhost:5100',
  customerSuccess: 'http://localhost:4050',
};

// Foundation
const FOUNDATION = {
  corpId: 'http://localhost:4702',
  memoryOs: 'http://localhost:4703',
  twinOs: 'http://localhost:4705',
};

// External
const EXTERNAL = {
  sutar: 'http://localhost:4799',
  nexha: 'http://localhost:3000',
  agentCopilot: 'http://localhost:4920',
};

// Helper function to call services
async function callService(baseUrl, path, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `${baseUrl}${path}`,
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
    };
    if (data) config.data = data;
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// INDUSTRY OS HEALTH CHECK
// ============================================

router.get('/industry/health/:industry', async (req, res) => {
  const { industry } = req.params;
  const config = INDUSTRY_OS[industry];
  if (!config) return res.status(404).json({ error: 'Industry not found' });

  const result = await callService(`http://localhost:${config.port}`, '/health');
  res.json({ industry, ...result });
});

router.get('/industry/all-health', async (req, res) => {
  const results = [];
  for (const [key, config] of Object.entries(INDUSTRY_OS)) {
    const result = await callService(`http://localhost:${config.port}`, '/health');
    results.push({ industry: key, ...result });
  }
  const healthy = results.filter(r => r.success).length;
  res.json({ total: results.length, healthy, unhealthy: results.length - healthy, results });
});

// ============================================
// UNIFIED LEAD CREATION (All Industry → Sales)
// ============================================

router.post('/lead/:industry', async (req, res) => {
  const { industry } = req.params;
  const { name, email, phone, value, metadata } = req.body;

  // Create lead in Sales OS
  const leadResult = await callService(DEPT_OS.sales, '/api/leads', 'POST', {
    name, email, phone, value,
    source: industry,
    industry: industry,
    metadata,
  });

  // Also create in Industry OS
  const industryResult = await callService(
    `http://localhost:${INDUSTRY_OS[industry]?.port}`,
    '/api/integration/sales/lead',
    'POST',
    { name, email, phone, source: 'hub' }
  );

  res.json({
    success: true,
    workflow: 'lead-creation',
    industry,
    sales: leadResult,
    industry: industryResult,
  });
});

// ============================================
// UNIFIED PROCUREMENT FLOW (All Industry → Nexha)
// ============================================

router.post('/procurement/:industry', async (req, res) => {
  const { industry } = req.params;
  const { items, urgency = 'normal' } = req.body;
  const config = INDUSTRY_OS[industry];

  if (!config) return res.status(404).json({ error: 'Industry not found' });

  // Step 1: Create RFQ via SUTAR
  const sutarResult = await callService(EXTERNAL.sutar, '/events/publish', 'POST', {
    eventType: 'procurement_request',
    data: { industry, items, category: config.procurement, urgency },
  });

  // Step 2: Create RFQ via Nexha
  const nexhaResult = await callService(EXTERNAL.nexha, '/api/rfq', 'POST', {
    items,
    requirements: { industry, category: config.procurement },
    source: 'rtmn_hub',
  });

  // Step 3: Create in Procurement OS
  const procResult = await callService(DEPT_OS.procurement, '/api/rfqs', 'POST', {
    items,
    industry,
    category: config.procurement,
    urgency,
  });

  res.json({
    success: true,
    workflow: 'procurement',
    industry,
    category: config.procurement,
    steps: {
      sutar: sutarResult,
      nexha: nexhaResult,
      procurement: procResult,
    },
  });
});

// ============================================
// UNIFIED CUSTOMER CREATION (All Industry → All Systems)
// ============================================

router.post('/customer/:industry', async (req, res) => {
  const { industry } = req.params;
  const { name, email, phone, preferences = {} } = req.body;
  const config = INDUSTRY_OS[industry];

  if (!config) return res.status(404).json({ error: 'Industry not found' });

  // Step 1: Create in Industry OS
  const industryResult = await callService(
    `http://localhost:${config.port}`,
    '/api/customers',
    'POST',
    { name, email, phone, preferences }
  );

  // Step 2: Create in Sales (Customer)
  const salesResult = await callService(DEPT_OS.sales, '/api/customers', 'POST', {
    name, email, phone,
    industry,
    preferences,
  });

  // Step 3: Store in MemoryOS
  const memoryResult = await callService(FOUNDATION.memoryOs, '/api/store', 'POST', {
    key: `customer_${industry}_${email}`,
    data: { name, email, phone, industry, preferences },
    category: 'customer',
  });

  // Step 4: Create Digital Twin
  const twinResult = await callService(FOUNDATION.twinOs, '/api/twins', 'POST', {
    type: 'customer',
    data: { name, email, phone, industry },
    source: industry,
  });

  res.json({
    success: true,
    workflow: 'customer-creation',
    industry,
    steps: {
      industry: industryResult,
      sales: salesResult,
      memory: memoryResult,
      twin: twinResult,
    },
  });
});

// ============================================
// UNIFIED KPI REPORTING (All Industry → CXO)
// ============================================

router.post('/kpi/:industry', async (req, res) => {
  const { industry } = req.params;
  const { metrics } = req.body; // Array of { metric, value, period }
  const config = INDUSTRY_OS[industry];

  if (!config) return res.status(404).json({ error: 'Industry not found' });

  const results = [];
  for (const metric of metrics || []) {
    // Report to CXO
    const cxoResult = await callService(DEPT_OS.cxo, '/api/kpis', 'POST', {
      metric: metric.metric,
      value: metric.value,
      period: metric.period || 'daily',
      source: industry,
      industry,
    });

    // Report to Operations
    const opsResult = await callService(DEPT_OS.operations, '/api/metrics', 'POST', {
      metric: metric.metric,
      value: metric.value,
      source: industry,
    });

    // Store in Memory
    const memoryResult = await callService(FOUNDATION.memoryOs, '/api/store', 'POST', {
      key: `kpi_${industry}_${metric.metric}_${Date.now()}`,
      data: { metric: metric.metric, value: metric.value, period: metric.period },
      category: 'kpi',
    });

    results.push({
      metric: metric.metric,
      value: metric.value,
      cxo: cxoResult,
      operations: opsResult,
      memory: memoryResult,
    });
  }

  res.json({
    success: true,
    workflow: 'kpi-reporting',
    industry,
    metrics: results,
  });
});

// ============================================
// UNIFIED NPS COLLECTION (All Industry → Customer Success)
// ============================================

router.post('/nps/:industry', async (req, res) => {
  const { industry } = req.params;
  const { customerId, score, feedback, channel = 'hub' } = req.body;
  const config = INDUSTRY_OS[industry];

  if (!config) return res.status(404).json({ error: 'Industry not found' });

  // Collect NPS in Customer Success OS
  const csResult = await callService(DEPT_OS.customerSuccess, '/api/nps', 'POST', {
    customerId,
    score,
    feedback,
    source: industry,
    channel,
  });

  // Store sentiment in MemoryOS
  const memoryResult = await callService(FOUNDATION.memoryOs, '/api/store', 'POST', {
    key: `nps_${industry}_${customerId}_${Date.now()}`,
    data: { customerId, score, feedback, sentiment: score >= 9 ? 'positive' : score >= 7 ? 'neutral' : 'negative' },
    category: 'feedback',
  });

  // Update Customer Twin
  const twinResult = await callService(FOUNDATION.twinOs, '/api/twins/customer', 'PATCH', {
    customerId,
    data: { lastNpsScore: score, lastFeedback: feedback },
  });

  res.json({
    success: true,
    workflow: 'nps-collection',
    industry,
    steps: { customerSuccess: csResult, memory: memoryResult, twin: twinResult },
  });
});

// ============================================
// UNIFIED WORKFORCE INTEGRATION (All Industry)
// ============================================

router.post('/employee/:industry', async (req, res) => {
  const { industry } = req.params;
  const { name, email, role, department, skills = [] } = req.body;
  const config = INDUSTRY_OS[industry];

  if (!config) return res.status(404).json({ error: 'Industry not found' });

  // Create in Workforce OS
  const workforceResult = await callService(DEPT_OS.workforce, '/api/employees', 'POST', {
    name, email, role,
    department: department || industry,
    skills,
    industry,
  });

  // Create in Industry OS
  const industryResult = await callService(
    `http://localhost:${config.port}`,
    '/api/integration/workforce/employee',
    'POST',
    { name, email, role, department: industry }
  );

  // Create Staff Twin
  const twinResult = await callService(FOUNDATION.twinOs, '/api/twins', 'POST', {
    type: 'staff',
    data: { name, email, role, department: industry, industry },
    source: industry,
  });

  res.json({
    success: true,
    workflow: 'employee-creation',
    industry,
    steps: { workforce: workforceResult, industry: industryResult, twin: twinResult },
  });
});

// ============================================
// UNIFIED CAMPAIGN LAUNCH (All Industry → Marketing)
// ============================================

router.post('/campaign/:industry', async (req, res) => {
  const { industry } = req.params;
  const { name, type, audience, budget, channels = ['email', 'social'] } = req.body;
  const config = INDUSTRY_OS[industry];

  if (!config) return res.status(404).json({ error: 'Industry not found' });

  // Create campaign in Marketing OS
  const marketingResult = await callService(DEPT_OS.marketing, '/api/campaigns', 'POST', {
    name,
    type,
    audience,
    budget,
    channels,
    industry,
  });

  // Create in Industry OS
  const industryResult = await callService(
    `http://localhost:${config.port}`,
    '/api/integration/marketing/campaign',
    'POST',
    { name, type, audience, budget }
  );

  res.json({
    success: true,
    workflow: 'campaign-launch',
    industry,
    steps: { marketing: marketingResult, industry: industryResult },
  });
});

// ============================================
// INDUSTRY ANALYTICS (All Industry → All Systems)
// ============================================

router.get('/analytics/:industry/:type', async (req, res) => {
  const { industry, type } = req.params;
  const config = INDUSTRY_OS[industry];

  if (!config) return res.status(404).json({ error: 'Industry not found' });

  const results = {};

  // Get from Industry OS
  results.industry = await callService(`http://localhost:${config.port}`, `/api/analytics/${type}`);

  // Get from CXO
  results.cxo = await callService(DEPT_OS.cxo, `/api/dashboard/${industry}/${type}`);

  // Get from Memory
  results.memory = await callService(FOUNDATION.memoryOs, `/api/query`, 'POST', {
    category: type,
    filter: { industry },
  });

  res.json({
    success: true,
    workflow: 'analytics',
    industry,
    type,
    data: results,
  });
});

// ============================================
// BULK OPERATIONS
// ============================================

router.post('/bulk/kpi', async (req, res) => {
  const { kpis } = req.body; // Array of { industry, metrics }
  const results = [];

  for (const kpi of kpis || []) {
    const result = await callService(
      `http://localhost:${INDUSTRY_OS[kpi.industry]?.port || 5000}`,
      '/api/integration/cxo/kpi',
      'POST',
      { metrics: kpi.metrics }
    );
    results.push({ industry: kpi.industry, ...result });
  }

  res.json({
    success: true,
    workflow: 'bulk-kpi',
    processed: results.length,
    results,
  });
});

router.post('/bulk/health-check', async (req, res) => {
  const results = [];
  for (const [key, config] of Object.entries(INDUSTRY_OS)) {
    const result = await callService(`http://localhost:${config.port}`, '/health');
    results.push({ industry: key, ...result });
  }

  const healthy = results.filter(r => r.success).length;
  res.json({
    success: true,
    total: results.length,
    healthy,
    unhealthy: results.length - healthy,
    results,
  });
});

// ============================================
// SUTAR EVENT BRIDGE
// ============================================

router.post('/event/:industry', async (req, res) => {
  const { industry } = req.params;
  const { eventType, data } = req.body;

  const result = await callService(EXTERNAL.sutar, '/events/publish', 'POST', {
    eventType,
    data: { ...data, industry },
    source: 'rtmn_hub',
  });

  res.json({
    success: true,
    workflow: 'sutar-event',
    industry,
    eventType,
    result,
  });
});

// ============================================
// AGENT COPILOT BRIDGE
// ============================================

router.post('/agent/:industry', async (req, res) => {
  const { industry } = req.params;
  const { task, context = {} } = req.body;

  const result = await callService(EXTERNAL.agentCopilot, '/api/execute', 'POST', {
    task,
    context: { ...context, industry },
  });

  res.json({
    success: true,
    workflow: 'agent-execution',
    industry,
    task,
    result,
  });
});

// ============================================
// EXPORTS
// ============================================

module.exports = router;
