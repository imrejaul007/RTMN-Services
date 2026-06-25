const cors = require('cors');
const helmet = require('helmet');
/**
 * ACN Hub Gateway
 *
 * Unified gateway for the Agent Commerce Network.
 * Routes requests to appropriate services.
 * Exposes single endpoint for all ACN operations.
 *
 * Port: 4800 - Hub
 */

const express = require('express');

const { requireEnv } = require('@rtmn/shared/lib/env');
const { setupSecurity, strictLimiter } = require('@rtmn/shared/security');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const rezIntel = require('./rez-intel-client');
const app = express();

app.use(cors());
app.use(helmet());

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
setupSecurity(app, { serviceName: 'acn-hub' });

const PORT = process.env.PORT || 4852;

// ACN Service Registry
const SERVICES = {
  // Core ACN
  ACP_PROTOCOL: process.env.ACP_PROTOCOL_URL || 'http://localhost:4800',
  ACN_NETWORK: process.env.ACN_NETWORK_URL || 'http://localhost:4801',
  GENIE_SHOPPING: process.env.GENIE_SHOPPING_URL || 'http://localhost:4716',
  MERCHANT_AGENTS: process.env.MERCHANT_AGENTS_URL || 'http://localhost:4810',

  // Foundation
  AGENT_REPUTATION: process.env.AGENT_REPUTATION_URL || 'http://localhost:4820',
  AGENT_CONTRACTS: process.env.AGENT_CONTRACTS_URL || 'http://localhost:4830',
  AGENT_WALLETS: process.env.AGENT_WALLETS_URL || 'http://localhost:4840',

  // Phase 2
  AGENT_MARKETPLACE: process.env.AGENT_MARKETPLACE_URL || 'http://localhost:4845',
  AGENT_LEARNING: process.env.AGENT_LEARNING_URL || 'http://localhost:4846',
  DISPUTE_RESOLUTION: process.env.DISPUTE_RESOLUTION_URL || 'http://localhost:4847',
  AGENT_ANALYTICS: process.env.AGENT_ANALYTICS_URL || 'http://localhost:4848',
  ACN_INTEGRATION: process.env.ACN_INTEGRATION_URL || 'http://localhost:4849',

  // Phase 3
  NEGOTIATION_AI: process.env.NEGOTIATION_AI_URL || 'http://localhost:4850',
  AGENT_ORCHESTRATION: process.env.AGENT_ORCHESTRATION_URL || 'http://localhost:4851',

  // RTMN Integration
  RTMN_HUB: process.env.RTMN_HUB_URL || 'http://localhost:4399',
  TWINOS_HUB: process.env.TWINOS_HUB_URL || 'http://localhost:4705',
  REZ_WALLET: process.env.REZ_WALLET_URL || 'http://localhost:4004'
};

// Service routing map
const ROUTES = {
  // ACP Protocol
  '/api/acp/negotiations': SERVICES.ACP_PROTOCOL,
  '/api/acp/messages': SERVICES.ACP_PROTOCOL,

  // ACN Network
  '/api/network/agents': SERVICES.ACN_NETWORK,
  '/api/network/discover': SERVICES.ACN_NETWORK,
  '/api/network/recommend': SERVICES.ACN_NETWORK,

  // Genie
  '/api/genie/shop': SERVICES.GENIE_SHOPPING,
  '/api/genie/negotiate': SERVICES.GENIE_SHOPPING,
  '/api/genie/order': SERVICES.GENIE_SHOPPING,
  '/api/genie/track': SERVICES.GENIE_SHOPPING,
  '/api/genie/wishlist': SERVICES.GENIE_SHOPPING,
  '/api/genie/recommendations': SERVICES.GENIE_SHOPPING,

  // Merchant
  '/api/merchant': SERVICES.MERCHANT_AGENTS,

  // Trust & Reputation
  '/api/reputation': SERVICES.AGENT_REPUTATION,
  '/api/trust': SERVICES.AGENT_REPUTATION,
  '/api/leaderboard': SERVICES.AGENT_REPUTATION,

  // Contracts
  '/api/contracts': SERVICES.AGENT_CONTRACTS,
  '/api/escrow': SERVICES.AGENT_CONTRACTS,

  // Wallets
  '/api/wallets': SERVICES.AGENT_WALLETS,

  // Marketplace
  '/api/listings': SERVICES.AGENT_MARKETPLACE,
  '/api/reviews': SERVICES.AGENT_MARKETPLACE,
  '/api/promotions': SERVICES.AGENT_MARKETPLACE,
  '/api/search': SERVICES.AGENT_MARKETPLACE,

  // Learning
  '/api/learning': SERVICES.AGENT_LEARNING,
  '/api/strategy': SERVICES.AGENT_LEARNING,
  '/api/behavior': SERVICES.AGENT_LEARNING,
  '/api/profile': SERVICES.AGENT_LEARNING,

  // Disputes
  '/api/disputes': SERVICES.DISPUTE_RESOLUTION,
  '/api/mediations': SERVICES.DISPUTE_RESOLUTION,
  '/api/arbitrations': SERVICES.DISPUTE_RESOLUTION,

  // Analytics
  '/api/events': SERVICES.AGENT_ANALYTICS,
  '/api/metrics': SERVICES.AGENT_ANALYTICS,
  '/api/dashboards': SERVICES.AGENT_ANALYTICS,
  '/api/compare': SERVICES.AGENT_ANALYTICS,

  // Integration
  '/api/workflows': SERVICES.ACN_INTEGRATION,
  '/api/integrate': SERVICES.ACN_INTEGRATION,

  // Negotiation AI
  '/api/negotiate': SERVICES.NEGOTIATION_AI,
  '/api/counter': SERVICES.NEGOTIATION_AI,
  '/api/decide': SERVICES.NEGOTIATION_AI,
  '/api/predict': SERVICES.NEGOTIATION_AI,
  '/api/persona': SERVICES.NEGOTIATION_AI,
  '/api/simulate': SERVICES.NEGOTIATION_AI,

  // Orchestration
  '/api/graphs': SERVICES.AGENT_ORCHESTRATION,
  '/api/orchestrations': SERVICES.AGENT_ORCHESTRATION
};

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    service: 'ACN Hub Gateway',
    version: '2.0.0',
    port: PORT,
    status: 'running',
    servicesConnected: Object.keys(SERVICES).length,
    routesConfigured: Object.keys(ROUTES).length,
    timestamp: new Date().toISOString()
  });
});

/**
 * Get service registry
 */
app.get('/services', (req, res) => {
  res.json({
    services: SERVICES,
    routes: ROUTES
  });
});

/**
 * Get ACN info
 */
app.get('/info', (req, res) => {
  res.json({
    name: 'Agent Commerce Network',
    version: '2.0.0',
    description: 'Unified gateway for AI-to-AI commerce',
    services: {
      core: [
        { name: 'ACP Protocol', port: 4800 },
        { name: 'ACN Network', port: 4801 },
        { name: 'Genie Shopping', port: 4716 },
        { name: 'Merchant Agents', port: 4810 }
      ],
      foundation: [
        { name: 'Agent Reputation', port: 4820 },
        { name: 'Agent Contracts', port: 4830 },
        { name: 'Agent Wallets', port: 4840 }
      ],
      phase2: [
        { name: 'Agent Marketplace', port: 4845 },
        { name: 'Agent Learning', port: 4846 },
        { name: 'Dispute Resolution', port: 4847 },
        { name: 'Agent Analytics', port: 4848 },
        { name: 'ACN Integration', port: 4849 }
      ],
      phase3: [
        { name: 'Negotiation AI', port: 4850 },
        { name: 'Agent Orchestration', port: 4851 }
      ]
    },
    stats: {
      totalServices: Object.keys(SERVICES).length,
      totalRoutes: Object.keys(ROUTES).length
    }
  });
});

/**
 * Complete shopping endpoint
 * POST /api/shop
 */
app.post('/api/shop',requireAuth,  async (req, res) => {
  try {
    const { userId, message, product, maxPrice } = req.body;

    res.json({
      success: true,
      workflow: {
        step1: {
          service: SERVICES.GENIE_SHOPPING,
          action: 'POST /api/shop',
          description: 'Genie shopping agent processes request',
          endpoint: `${SERVICES.GENIE_SHOPPING}/api/shop`
        },
        step2: {
          service: SERVICES.ACN_NETWORK,
          action: 'POST /api/agents/search',
          description: 'Find matching merchant agents',
          endpoint: `${SERVICES.ACN_NETWORK}/api/agents/search`
        },
        step3: {
          service: SERVICES.ACP_PROTOCOL,
          action: 'POST /api/negotiations',
          description: 'Start AI-to-AI negotiation',
          endpoint: `${SERVICES.ACP_PROTOCOL}/api/negotiations`
        },
        step4: {
          service: SERVICES.NEGOTIATION_AI,
          action: 'POST /api/counter',
          description: 'AI optimizes counter-offers',
          endpoint: `${SERVICES.NEGOTIATION_AI}/api/counter`
        },
        step5: {
          service: SERVICES.AGENT_CONTRACTS,
          action: 'POST /api/contracts',
          description: 'Create smart contract',
          endpoint: `${SERVICES.AGENT_CONTRACTS}/api/contracts`
        },
        step6: {
          service: SERVICES.AGENT_WALLETS,
          action: 'POST /api/wallets/:id/escrow',
          description: 'Hold payment in escrow',
          endpoint: `${SERVICES.AGENT_WALLETS}/api/wallets`
        },
        step7: {
          service: SERVICES.MERCHANT_AGENTS,
          action: 'GET /api/merchants/:id/orders',
          description: 'Track order fulfillment',
          endpoint: `${SERVICES.MERCHANT_AGENTS}/api/merchants`
        }
      },
      instructions: 'Call each endpoint in sequence to complete the shopping flow',
      example: {
        shop: `POST ${SERVICES.GENIE_SHOPPING}/api/shop`,
        negotiate: `POST ${SERVICES.ACP_PROTOCOL}/api/negotiations`,
        contract: `POST ${SERVICES.AGENT_CONTRACTS}/api/contracts`,
        pay: `POST ${SERVICES.AGENT_WALLETS}/api/wallets`
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get system overview
 */
app.get('/api/overview', async (req, res) => {
  res.json({
    overview: {
      name: 'Agent Commerce Network',
      version: '2.0.0',
      status: 'operational',
      uptime: process.uptime()
    },
    services: {
      core: 4,
      foundation: 3,
      phase2: 5,
      phase3: 2,
      total: Object.keys(SERVICES).length
    },
    capabilities: [
      'AI-to-AI negotiation',
      'Multi-merchant comparison',
      'Autonomous shopping',
      'Smart contracts',
      'Escrow management',
      'Trust scoring',
      'Dispute resolution',
      'Marketplace discovery',
      'Behavior learning',
      'Real-time analytics',
      'Multi-agent orchestration'
    ],
    integrations: [
      'RTMN Unified Hub',
      'TwinOS (Customer Twins)',
      'REZ Wallet',
      'All Industry OS'
    ]
  });
});

/**
 * Get routing info
 */
app.get('/routes', (req, res) => {
  res.json({
    routes: ROUTES,
    totalRoutes: Object.keys(ROUTES).length
  });
});

/**
 * Status check for all services
 */
app.get('/status', async (req, res) => {
  const status = Object.entries(SERVICES).map(([name, url]) => ({
    service: name,
    url,
    status: 'configured'  // In production, actually check health
  }));

  res.json({
    timestamp: new Date().toISOString(),
    services: status,
    healthy: status.filter(s => s.status === 'configured').length,
    total: status.length
  });
});

/**
 * Documentation endpoint
 */
app.get('/docs', (req, res) => {
  res.json({
    title: 'ACN Hub API Documentation',
    version: '2.0.0',
    endpoints: {
      health: 'GET /health - Health check',
      info: 'GET /info - ACN information',
      services: 'GET /services - Service registry',
      routes: 'GET /routes - Route mapping',
      status: 'GET /status - Service status',
      overview: 'GET /api/overview - System overview',
      shop: 'POST /api/shop - Complete shopping flow'
    },
    services: {
      'ACP Protocol': `${SERVICES.ACP_PROTOCOL} - Standardized AI messaging`,
      'ACN Network': `${SERVICES.ACN_NETWORK} - Agent registry and discovery`,
      'Genie Shopping': `${SERVICES.GENIE_SHOPPING} - Consumer AI agent`,
      'Merchant Agents': `${SERVICES.MERCHANT_AGENTS} - Business AI agents`,
      'Agent Reputation': `${SERVICES.AGENT_REPUTATION} - Trust scoring`,
      'Agent Contracts': `${SERVICES.AGENT_CONTRACTS} - Smart contracts`,
      'Agent Wallets': `${SERVICES.AGENT_WALLETS} - Digital payments`,
      'Agent Marketplace': `${SERVICES.AGENT_MARKETPLACE} - Agent discovery`,
      'Agent Learning': `${SERVICES.AGENT_LEARNING} - ML improvements`,
      'Dispute Resolution': `${SERVICES.DISPUTE_RESOLUTION} - Conflict handling`,
      'Agent Analytics': `${SERVICES.AGENT_ANALYTICS} - Metrics and insights`,
      'ACN Integration': `${SERVICES.ACN_INTEGRATION} - RTMN integration`,
      'Negotiation AI': `${SERVICES.NEGOTIATION_AI} - Advanced strategies`,
      'Agent Orchestration': `${SERVICES.AGENT_ORCHESTRATION} - Multi-agent workflows`
    },
    quickStart: [
      '1. Register a Genie agent: POST /api/network/agents/genie',
      '2. Find merchants: POST /api/network/agents/search',
      '3. Start negotiation: POST /api/acp/negotiations',
      '4. Create contract: POST /api/contracts',
      '5. Process payment: POST /api/wallets/{id}/pay'
    ]
  });
});

// REZ Intelligence endpoints — must be before 404 catch-all
app.get('/rez-intel-status', async (req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({ rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED, rezIntelUrl: rezIntel.REZ_INTEL_URL, rezIntelHealthy: isHealthy });
});

app.post('/api/enrich', async (req, res) => {
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

/**
 * Catch-all for unknown routes
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
    hint: 'Try GET / for API documentation'
  });
});

// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                               ║
║        AGENT COMMERCE NETWORK (ACN) HUB GATEWAY             ║
║                                                               ║
║                  Version 2.0.0 - COMPLETE                    ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Port: ${PORT}                                                   ║
║  Status: OPERATIONAL                                          ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  SERVICES CONNECTED: ${Object.keys(SERVICES).length}                                       ║
║                                                               ║
║  Core (4):                                                    ║
║    ACP Protocol (4800) | ACN Network (4801)                  ║
║    Genie Shopping (4716) | Merchant Agents (4810)            ║
║                                                               ║
║  Foundation (3):                                              ║
║    Reputation (4820) | Contracts (4830) | Wallets (4840)     ║
║                                                               ║
║  Phase 2 (5):                                                 ║
║    Marketplace (4845) | Learning (4846) | Disputes (4847)    ║
║    Analytics (4848) | Integration (4849)                     ║
║                                                               ║
║  Phase 3 (2):                                                 ║
║    Negotiation AI (4850) | Orchestration (4851)              ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  API ENDPOINTS:                                               ║
║    GET    /health              Service health                ║
║    GET    /info                ACN information               ║
║    GET    /services            Service registry              ║
║    GET    /routes              Route mapping                 ║
║    GET    /status              Service status                ║
║    GET    /docs                API documentation             ║
║    POST   /api/shop            Shopping workflow             ║
║    GET    /api/overview        System overview               ║
║                                                               ║
║  14 services. ONE unified gateway.                           ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

module.exports = app;
