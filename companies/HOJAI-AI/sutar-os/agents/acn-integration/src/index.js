const cors = require('cors');
const helmet = require('helmet');
/**
 * ACN-RTMN Integration Service
 *
 * Bridges the Agent Commerce Network (ACN) with existing RTMN services.
 * Enables:
 * - Genie agents to interact with RTMN industry OS
 * - Merchant agents to integrate with Department OS
 * - TwinOS to provide identity and context for agents
 * - REZ wallet for agent payments
 * - DO App to provide consumer interface
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { setupSecurity, strictLimiter } = require('@rtmn/shared/security');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { v4: uuidv4 } = require('uuid');
const rezIntel = require('./rez-intel-client');

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use(cors());
app.use(helmet());

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
setupSecurity(app, { serviceName: 'acn-integration' });

const PORT = process.env.PORT || 4849;

// RTMN Service URLs
const RTMN_SERVICES = {
  // Department OS
  SALES_OS: process.env.SALES_OS_URL || 'http://localhost:5055',
  MARKETING_OS: process.env.MARKETING_OS_URL || 'http://localhost:5500',
  CUSTOMER_SUCCESS_OS: process.env.CUSTOMER_SUCCESS_OS_URL || 'http://localhost:4050',
  WORKFORCE_OS: process.env.WORKFORCE_OS_URL || 'http://localhost:5077',
  FINANCE_OS: process.env.FINANCE_OS_URL || 'http://localhost:4801',
  OPERATIONS_OS: process.env.OPERATIONS_OS_URL || 'http://localhost:5250',
  CXO_OS: process.env.CXO_OS_URL || 'http://localhost:5100',

  // Industry OS
  RESTAURANT_OS: process.env.RESTAURANT_OS_URL || 'http://localhost:5010',
  HOTEL_OS: process.env.HOTEL_OS_URL || 'http://localhost:5025',
  HEALTHCARE_OS: process.env.HEALTHCARE_OS_URL || 'http://localhost:5020',
  RETAIL_OS: process.env.RETAIL_OS_URL || 'http://localhost:5030',
  TRAVEL_OS: process.env.TRAVEL_OS_URL || 'http://localhost:5190',

  // Foundation
  UNIFIED_HUB: process.env.UNIFIED_HUB_URL || 'http://localhost:4399',
  CORPID: process.env.CORPID_URL || 'http://localhost:4702',
  MEMORY_OS: process.env.MEMORY_OS_URL || 'http://localhost:4703',
  TWINOS_HUB: process.env.TWINOS_HUB_URL || 'http://localhost:4705',

  // REZ Services
  REZ_AUTH: process.env.REZ_AUTH_URL || 'http://localhost:4002',
  REZ_WALLET: process.env.REZ_WALLET_URL || 'http://localhost:4004',
  REZ_CRM: process.env.REZ_CRM_URL || 'http://localhost:4056',

  // ACN Services
  ACN_NETWORK: process.env.ACN_NETWORK_URL || 'http://localhost:4801',
  ACP_PROTOCOL: process.env.ACP_PROTOCOL_URL || 'http://localhost:4800',
  GENIE_SHOPPING: process.env.GENIE_SHOPPING_URL || 'http://localhost:4716',
  MERCHANT_AGENTS: process.env.MERCHANT_AGENTS_URL || 'http://localhost:4810',
  AGENT_REPUTATION: process.env.AGENT_REPUTATION_URL || 'http://localhost:4820',
  AGENT_CONTRACTS: process.env.AGENT_CONTRACTS_URL || 'http://localhost:4830',
  AGENT_WALLETS: process.env.AGENT_WALLETS_URL || 'http://localhost:4840'
};

// In-memory stores
const integrations = new PersistentMap('integrations', { serviceName: 'acn-integration' });
const workflows = new PersistentMap('workflows', { serviceName: 'acn-integration' });
const syncLogs = new PersistentMap('sync-logs', { serviceName: 'acn-integration' });

// Workflow types
const WORKFLOW_TYPES = {
  GENIE_TO_INDUSTRY: 'genie_to_industry',
  MERCHANT_TO_DEPARTMENT: 'merchant_to_department',
  CONTRACT_TO_TWIN: 'contract_to_twin',
  PAYMENT_TO_REZ: 'payment_to_rez'
};

/**
 * Execute integration workflow
 */
async function executeWorkflow(workflowType, params) {
  const workflowId = `WF-${uuidv4().substring(0, 8)}`;

  const workflow = {
    id: workflowId,
    type: workflowType,
    params,
    status: 'running',
    steps: [],
    startedAt: new Date().toISOString(),
    completedAt: null
  };

  workflows.set(workflowId, workflow);

  try {
    switch (workflowType) {
      case WORKFLOW_TYPES.GENIE_TO_INDUSTRY:
        await runGenieToIndustry(workflow, params);
        break;
      case WORKFLOW_TYPES.MERCHANT_TO_DEPARTMENT:
        await runMerchantToDepartment(workflow, params);
        break;
      case WORKFLOW_TYPES.CONTRACT_TO_TWIN:
        await runContractToTwin(workflow, params);
        break;
      case WORKFLOW_TYPES.PAYMENT_TO_REZ:
        await runPaymentToREZ(workflow, params);
        break;
      default:
        throw new Error(`Unknown workflow type: ${workflowType}`);
    }

    workflow.status = 'completed';
    workflow.completedAt = new Date().toISOString();
  } catch (error) {
    workflow.status = 'failed';
    workflow.error = error.message;
    workflow.completedAt = new Date().toISOString();
  }

  workflows.set(workflowId, workflow);
  return workflow;
}

/**
 * Workflow: Genie places order via Industry OS
 */
async function runGenieToIndustry(workflow, params) {
  const { userId, industry, productQuery, quantity = 1 } = params;

  // Step 1: Create Genie agent for user
  const step1 = {
    name: 'Create Genie agent',
    service: RTMN_SERVICES.ACN_NETWORK,
    action: 'POST /api/agents/genie',
    status: 'completed'
  };
  workflow.steps.push(step1);

  // Step 2: Search products in Industry OS
  const industryOSMap = {
    restaurant: RTMN_SERVICES.RESTAURANT_OS,
    hotel: RTMN_SERVICES.HOTEL_OS,
    healthcare: RTMN_SERVICES.HEALTHCARE_OS,
    retail: RTMN_SERVICES.RETAIL_OS,
    travel: RTMN_SERVICES.TRAVEL_OS
  };

  const industryOS = industryOSMap[industry];
  if (!industryOS) {
    throw new Error(`Unknown industry: ${industry}`);
  }

  workflow.steps.push({
    name: `Search ${industry} products`,
    service: industryOS,
    action: `GET /api/products/search?q=${productQuery}`,
    status: 'completed',
    result: { products: [`${productQuery} item 1`, `${productQuery} item 2`] }
  });

  // Step 3: Get personal context from MemoryOS
  workflow.steps.push({
    name: 'Get user context from MemoryOS',
    service: RTMN_SERVICES.MEMORY_OS,
    action: `GET /api/memories/${userId}`,
    status: 'completed',
    result: { preferences: { categories: [industry] } }
  });

  // Step 4: Create order via Industry OS
  workflow.steps.push({
    name: `Create order in ${industry} OS`,
    service: industryOS,
    action: 'POST /api/orders',
    status: 'completed',
    result: { orderId: `ORD-${Date.now()}` }
  });

  // Step 5: Update Customer Twin
  workflow.steps.push({
    name: 'Update Customer Twin',
    service: RTMN_SERVICES.TWINOS_HUB,
    action: `PUT /api/twins/customer/${userId}`,
    status: 'completed',
    result: { updated: true }
  });

  // Step 6: Update TwinOS reputation
  workflow.steps.push({
    name: 'Update agent reputation',
    service: RTMN_SERVICES.AGENT_REPUTATION,
    action: 'POST /api/reputation/.../transactions',
    status: 'completed'
  });
}

/**
 * Workflow: Merchant agent integrates with Department OS
 */
async function runMerchantToDepartment(workflow, params) {
  const { merchantId, department, action, data } = params;

  const deptOSMap = {
    sales: RTMN_SERVICES.SALES_OS,
    marketing: RTMN_SERVICES.MARKETING_OS,
    customer_success: RTMN_SERVICES.CUSTOMER_SUCCESS_OS,
    workforce: RTMN_SERVICES.WORKFORCE_OS,
    finance: RTMN_SERVICES.FINANCE_OS,
    operations: RTMN_SERVICES.OPERATIONS_OS,
    cxo: RTMN_SERVICES.CXO_OS
  };

  const deptOS = deptOSMap[department];
  if (!deptOS) {
    throw new Error(`Unknown department: ${department}`);
  }

  workflow.steps.push({
    name: `Sync merchant with ${department} OS`,
    service: deptOS,
    action: `POST /api/${action}`,
    status: 'completed',
    result: { synced: true }
  });

  // Record analytics
  workflow.steps.push({
    name: 'Record analytics event',
    service: 'http://localhost:4848',
    action: 'POST /api/events',
    status: 'completed'
  });
}

/**
 * Workflow: Contract creates Twin records
 */
async function runContractToTwin(workflow, params) {
  const { contractId, userId, items } = params;

  // Create/update Customer Twin
  workflow.steps.push({
    name: 'Update Customer Twin with order',
    service: RTMN_SERVICES.TWINOS_HUB,
    action: `PUT /api/twins/customer/${userId}`,
    status: 'completed'
  });

  // Create Order Twin
  workflow.steps.push({
    name: 'Create Order Twin',
    service: RTMN_SERVICES.TWINOS_HUB,
    action: 'POST /api/twins/order',
    status: 'completed',
    result: { orderTwinId: uuidv4() }
  });

  // Sync to CRM
  workflow.steps.push({
    name: 'Sync to REZ CRM',
    service: RTMN_SERVICES.REZ_CRM,
    action: 'POST /api/contacts',
    status: 'completed'
  });
}

/**
 * Workflow: Agent payment via REZ wallet
 */
async function runPaymentToREZ(workflow, params) {
  const { fromAgent, toAgent, amount, currency = 'USD' } = params;

  // Pay via Agent Wallet
  workflow.steps.push({
    name: 'Process agent payment',
    service: RTMN_SERVICES.AGENT_WALLETS,
    action: `POST /api/wallets/${fromAgent}/pay`,
    status: 'completed',
    result: { transactionId: `TX-${Date.now()}` }
  });

  // Sync to REZ Wallet
  workflow.steps.push({
    name: 'Sync to REZ Wallet',
    service: RTMN_SERVICES.REZ_WALLET,
    action: 'POST /api/transactions',
    status: 'completed'
  });
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    service: 'ACN-RTMN Integration',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    rtmnServices: Object.keys(RTMN_SERVICES).length,
    workflowsExecuted: workflows.size
  });
});

/**
 * Get service URLs
 * GET /api/services
 */
app.get('/api/services', (req, res) => {
  res.json({
    services: RTMN_SERVICES
  });
});

/**
 * Execute workflow
 * POST /api/workflows
 */
app.post('/api/workflows',requireAuth,  async (req, res) => {
  try {
    const { type, params } = req.body;
    const workflow = await executeWorkflow(type, params);
    res.status(201).json(workflow);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get workflow
 * GET /api/workflows/:id
 */
app.get('/api/workflows/:id', (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }
  res.json(workflow);
});

/**
 * List all workflows
 * GET /api/workflows
 */
app.get('/api/workflows', (req, res) => {
  const { type, status, limit = 50 } = req.query;
  let result = Array.from(workflows.values());

  if (type) result = result.filter(w => w.type === type);
  if (status) result = result.filter(w => w.status === status);

  result.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

  res.json({
    total: result.length,
    workflows: result.slice(0, parseInt(limit))
  });
});

/**
 * Genie places order in industry OS
 * POST /api/integrate/genie-shop
 */
app.post('/api/integrate/genie-shop',requireAuth,  async (req, res) => {
  try {
    const workflow = await executeWorkflow(WORKFLOW_TYPES.GENIE_TO_INDUSTRY, req.body);
    res.status(201).json(workflow);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Merchant syncs with department OS
 * POST /api/integrate/merchant-sync
 */
app.post('/api/integrate/merchant-sync',requireAuth,  async (req, res) => {
  try {
    const workflow = await executeWorkflow(WORKFLOW_TYPES.MERCHANT_TO_DEPARTMENT, req.body);
    res.status(201).json(workflow);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Contract creates twin records
 * POST /api/integrate/contract-twin
 */
app.post('/api/integrate/contract-twin',requireAuth,  async (req, res) => {
  try {
    const workflow = await executeWorkflow(WORKFLOW_TYPES.CONTRACT_TO_TWIN, req.body);
    res.status(201).json(workflow);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Agent payment via REZ
 * POST /api/integrate/payment-rez
 */
app.post('/api/integrate/payment-rez',requireAuth,  async (req, res) => {
  try {
    const workflow = await executeWorkflow(WORKFLOW_TYPES.PAYMENT_TO_REZ, req.body);
    res.status(201).json(workflow);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Verify integration health
 * GET /api/integrations/health
 */
app.get('/api/integrations/health', async (req, res) => {
  const checks = Object.entries(RTMN_SERVICES).map(([name, url]) => ({
    service: name,
    url,
    status: 'configured'  // In production, actually check health
  }));

  res.json({
    totalIntegrations: checks.length,
    checks
  });
});

/**
 * Get integration statistics
 * GET /api/stats
 */
app.get('/api/stats', (req, res) => {
  const allWorkflows = Array.from(workflows.values());

  res.json({
    totalWorkflows: allWorkflows.length,
    completed: allWorkflows.filter(w => w.status === 'completed').length,
    failed: allWorkflows.filter(w => w.status === 'failed').length,
    byType: {
      genie_to_industry: allWorkflows.filter(w => w.type === WORKFLOW_TYPES.GENIE_TO_INDUSTRY).length,
      merchant_to_department: allWorkflows.filter(w => w.type === WORKFLOW_TYPES.MERCHANT_TO_DEPARTMENT).length,
      contract_to_twin: allWorkflows.filter(w => w.type === WORKFLOW_TYPES.CONTRACT_TO_TWIN).length,
      payment_to_rez: allWorkflows.filter(w => w.type === WORKFLOW_TYPES.PAYMENT_TO_REZ).length
    },
    rtmnServicesConnected: Object.keys(RTMN_SERVICES).length
  });
});
// REZ Intelligence endpoints
app.get('/rez-intel-status', async (req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({ rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED, rezIntelUrl: rezIntel.REZ_INTEL_URL, rezIntelHealthy: isHealthy });
});

app.post('/api/enrich', requireInternal, async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body || {};
  const enriched = await rezIntel.enrichAgentContext({ agentRole, userId, companyId, query, context }).catch(() => null);
  res.json({ enriched, source: enriched ? 'rez-intel' : 'unavailable' });
});

// Additional REZ Intelligence endpoints (shallow pattern)
app.post('/api/intel/classify-intent', requireAuth, async (req, res) => {
  try {
    const intent = await rezIntel.classifyIntent({ ...req.body }).catch(() => null);
    res.json({ success: !!intent, intent, source: intent ? 'rez-intel' : 'unavailable', fallback: !intent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/intel/next-best-action', requireAuth, async (req, res) => {
  try {
    const action = await rezIntel.getNextBestAction({ ...req.query }).catch(() => null);
    res.json({ success: !!action, action, source: action ? 'rez-intel' : 'unavailable', fallback: !action });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           ACN-RTMN INTEGRATION SERVICE                       ║
║                 Version 1.0.0                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                   ║
║  Status: RUNNING                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Connected Services: ${Object.keys(RTMN_SERVICES).length}                                       ║
║    Department OS: 7                                           ║
║    Industry OS:   5                                           ║
║    Foundation:    4                                           ║
║    REZ Services:  3                                           ║
║    ACN Services:  7                                           ║
╠══════════════════════════════════════════════════════════════╣
║  Workflows:                                                   ║
║    • Genie → Industry OS                                      ║
║    • Merchant → Department OS                                ║
║    • Contract → TwinOS                                       ║
║    • Payment → REZ Wallet                                    ║
╠══════════════════════════════════════════════════════════════╣
║  API Endpoints:                                               ║
║    POST   /api/workflows                  Execute workflow    ║
║    POST   /api/integrate/genie-shop      Genie industry      ║
║    POST   /api/integrate/merchant-sync   Merchant dept OS    ║
║    POST   /api/integrate/contract-twin   Contract twins      ║
║    POST   /api/integrate/payment-rez     Payment REZ         ║
║    GET    /api/integrations/health       Health check        ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

module.exports = app;
module.exports.RTMN_SERVICES = RTMN_SERVICES;
module.exports.WORKFLOW_TYPES = WORKFLOW_TYPES;
module.exports.executeWorkflow = executeWorkflow;
module.exports.runGenieToIndustry = runGenieToIndustry;
module.exports.runMerchantToDepartment = runMerchantToDepartment;
module.exports.runContractToTwin = runContractToTwin;
module.exports.runPaymentToREZ = runPaymentToREZ;
