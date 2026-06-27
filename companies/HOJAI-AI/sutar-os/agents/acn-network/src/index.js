const cors = require('cors');
const helmet = require('helmet');
/**
 * ACN Network - Agent Commerce Network
 *
 * Central registry for all AI agents in the RTMN ecosystem.
 * Provides agent discovery, capability matching, and message routing.
 *
 * Agent Types:
 * - GENIE: Consumer personal AI agents
 * - MERCHANT: Business AI agents (SUTAR OS)
 * - SYSTEM: Internal RTMN agents
 * - PARTNER: External partner agents
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
setupSecurity(app, { serviceName: 'acn-network' });

const PORT = process.env.PORT || 4806;

// In-memory stores (replace with proper database in production)
const agents = new PersistentMap('agents', { serviceName: 'acn-network' });
const agentSessions = new PersistentMap('agent-sessions', { serviceName: 'acn-network' });
const agentMetrics = new PersistentMap('agent-metrics', { serviceName: 'acn-network' });
const capabilityIndex = new PersistentMap('capability-index', { serviceName: 'acn-network' });

// Agent types
const AGENT_TYPES = {
  GENIE: 'genie',           // Consumer personal AI
  MERCHANT: 'merchant',      // Business AI
  SYSTEM: 'system',         // RTMN internal
  PARTNER: 'partner'        // External partners
};

// Agent status
const AGENT_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  BUSY: 'busy',
  AWAY: 'away',
  DND: 'do_not_disturb'
};

// Industry categories for merchants
const INDUSTRIES = {
  RESTAURANT: 'restaurant',
  HOTEL: 'hotel',
  HEALTHCARE: 'healthcare',
  RETAIL: 'retail',
  TRAVEL: 'travel',
  FASHION: 'fashion',
  BEAUTY: 'beauty',
  FITNESS: 'fitness',
  EDUCATION: 'education',
  AUTOMOTIVE: 'automotive',
  HOME_SERVICES: 'home_services',
  PROFESSIONAL: 'professional',
  LEGAL: 'legal',
  FINANCIAL: 'financial',
  REAL_ESTATE: 'real_estate',
  ENTERTAINMENT: 'entertainment',
  SPORTS: 'sports',
  MANUFACTURING: 'manufacturing',
  AGRICULTURE: 'agriculture',
  GOVERNMENT: 'government',
  NON_PROFIT: 'non_profit',
  GAMING: 'gaming',
  CONSTRUCTION: 'construction',
  TRANSPORT: 'transport',
  EVENTS: 'events',
  EXHIBITIONS: 'exhibitions'
};

// Agent capabilities taxonomy
const CAPABILITIES = {
  // Shopping capabilities
  PRODUCT_SEARCH: 'product_search',
  PRICE_COMPARE: 'price_compare',
  NEGOTIATION: 'negotiation',
  ORDER_PLACEMENT: 'order_placement',
  ORDER_TRACKING: 'order_tracking',
  RETURNS: 'returns',
  REFUNDS: 'refunds',

  // Service capabilities
  BOOKING: 'booking',
  RESERVATION: 'reservation',
  SCHEDULING: 'scheduling',
  CONSULTATION: 'consultation',

  // Support capabilities
  CUSTOMER_SUPPORT: 'customer_support',
  COMPLAINT_HANDLING: 'complaint_handling',
  TECHNICAL_SUPPORT: 'technical_support',

  // Business capabilities
  B2B_NEGOTIATION: 'b2b_negotiation',
  PROCUREMENT: 'procurement',
  SUPPLY_CHAIN: 'supply_chain',
  INVENTORY_CHECK: 'inventory_check',

  // Personal capabilities
  SCHEDULE_MANAGEMENT: 'schedule_management',
  PAYMENT_PROCESSING: 'payment_processing',
  NOTIFICATION: 'notification',
  REMINDER: 'reminder',

  // Communication
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  EMAIL: 'email',
  VOICE: 'voice',
  CHAT: 'chat'
};

/**
 * Register a new agent
 */
function registerAgent(agentData) {
  const agent = {
    id: agentData.id || uuidv4(),
    name: agentData.name,
    type: agentData.type || AGENT_TYPES.MERCHANT,
    owner: agentData.owner,           // User ID or Business ID
    industry: agentData.industry,     // For merchants
    capabilities: agentData.capabilities || [],
    metadata: agentData.metadata || {},
    endpoints: {
      api: agentData.endpoints?.api,
      websocket: agentData.endpoints?.websocket,
      webhook: agentData.endpoints?.webhook
    },
    rating: {
      overall: 0,
      transactions: 0,
      reliability: 0,
      responsiveness: 0
    },
    limits: {
      maxConcurrent: agentData.limits?.maxConcurrent || 10,
      maxDailyTransactions: agentData.limits?.maxDailyTransactions || 1000,
      maxOrderValue: agentData.limits?.maxOrderValue || 100000
    },
    status: AGENT_STATUS.OFFLINE,
    lastSeen: null,
    registeredAt: new Date().toISOString(),
    verified: false,
    tier: agentData.tier || 'basic'  // basic, pro, enterprise
  };

  agents.set(agent.id, agent);

  // Index capabilities for search
  agent.capabilities.forEach(cap => {
    if (!capabilityIndex.has(cap)) {
      capabilityIndex.set(cap, new Set());
    }
    capabilityIndex.get(cap).add(agent.id);
  });

  // Initialize metrics
  agentMetrics.set(agent.id, {
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    totalVolume: 0,
    averageResponseTime: 0,
    lastTransactionAt: null,
    dailyStats: {}
  });

  return agent;
}

/**
 * Create a Genie consumer agent
 */
function createGenieAgent(userId, preferences = {}) {
  return registerAgent({
    name: `Genie-${userId.substring(0, 8)}`,
    type: AGENT_TYPES.GENIE,
    owner: userId,
    capabilities: [
      CAPABILITIES.PRODUCT_SEARCH,
      CAPABILITIES.PRICE_COMPARE,
      CAPABILITIES.NEGOTIATION,
      CAPABILITIES.ORDER_PLACEMENT,
      CAPABILITIES.ORDER_TRACKING,
      CAPABILITIES.RETURNS,
      CAPABILITIES.NOTIFICATION,
      CAPABILITIES.REMINDER,
      CAPABILITIES.PAYMENT_PROCESSING
    ],
    metadata: {
      preferences: preferences.preferences || {},
      budget: preferences.budget || {},
      shoppingStyle: preferences.shoppingStyle || 'balanced',
      preferredIndustries: preferences.preferredIndustries || []
    },
    limits: {
      maxConcurrent: 5,
      maxDailyTransactions: 100,
      maxOrderValue: 10000
    },
    tier: 'personal'
  });
}

/**
 * Create a Merchant AI agent
 */
function createMerchantAgent(businessId, businessData) {
  return registerAgent({
    name: businessData.name || `${businessData.industry}-ai`,
    type: AGENT_TYPES.MERCHANT,
    owner: businessId,
    industry: businessData.industry,
    capabilities: businessData.capabilities || getDefaultMerchantCapabilities(businessData.industry),
    metadata: {
      businessName: businessData.businessName,
      location: businessData.location,
      operatingHours: businessData.operatingHours,
      languages: businessData.languages || ['en'],
      currencies: businessData.currencies || ['USD'],
      shippingZones: businessData.shippingZones,
      returnPolicy: businessData.returnPolicy
    },
    endpoints: {
      api: businessData.apiEndpoint,
      webhook: businessData.webhookEndpoint
    },
    limits: {
      maxConcurrent: businessData.maxConcurrent || 50,
      maxDailyTransactions: businessData.maxDailyTransactions || 10000,
      maxOrderValue: businessData.maxOrderValue || 1000000
    },
    tier: businessData.tier || 'pro'
  });
}

/**
 * Get default capabilities based on industry
 */
function getDefaultMerchantCapabilities(industry) {
  const base = [
    CAPABILITIES.PRODUCT_SEARCH,
    CAPABILITIES.NEGOTIATION,
    CAPABILITIES.ORDER_PLACEMENT,
    CAPABILITIES.ORDER_TRACKING,
    CAPABILITIES.CUSTOMER_SUPPORT
  ];

  switch (industry) {
    case INDUSTRIES.RESTAURANT:
      return [...base, CAPABILITIES.BOOKING, CAPABILITIES.RESERVATION];
    case INDUSTRIES.HOTEL:
      return [...base, CAPABILITIES.BOOKING, CAPABILITIES.RESERVATION, CAPABILITIES.SCHEDULING];
    case INDUSTRIES.HEALTHCARE:
      return [...base, CAPABILITIES.CONSULTATION, CAPABILITIES.SCHEDULING];
    case INDUSTRIES.RETAIL:
      return [...base, CAPABILITIES.PRICE_COMPARE, CAPABILITIES.RETURNS, CAPABILITIES.REFUNDS];
    case INDUSTRIES.TRAVEL:
      return [...base, CAPABILITIES.BOOKING, CAPABILITIES.RESERVATION];
    default:
      return base;
  }
}

/**
 * Search for agents by capabilities
 */
function searchAgents(criteria) {
  let results = Array.from(agents.values());

  // Filter by type
  if (criteria.type) {
    results = results.filter(a => a.type === criteria.type);
  }

  // Filter by industry
  if (criteria.industry) {
    results = results.filter(a => a.industry === criteria.industry);
  }

  // Filter by status
  if (criteria.status) {
    results = results.filter(a => a.status === criteria.status);
  }

  // Filter by capabilities
  if (criteria.capabilities && criteria.capabilities.length > 0) {
    results = results.filter(a =>
      criteria.capabilities.every(cap => a.capabilities.includes(cap))
    );
  }

  // Filter by verified status
  if (criteria.verified !== undefined) {
    results = results.filter(a => a.verified === criteria.verified);
  }

  // Filter by tier
  if (criteria.tier) {
    results = results.filter(a => a.tier === criteria.tier);
  }

  // Filter by minimum rating
  if (criteria.minRating) {
    results = results.filter(a => a.rating.overall >= criteria.minRating);
  }

  // Sort by relevance/rating
  if (criteria.sortBy === 'rating') {
    results.sort((a, b) => b.rating.overall - a.rating.overall);
  } else if (criteria.sortBy === 'transactions') {
    results.sort((a, b) => b.rating.transactions - a.rating.transactions);
  }

  // Limit results
  if (criteria.limit) {
    results = results.slice(0, criteria.limit);
  }

  return results;
}

/**
 * Update agent status
 */
function updateAgentStatus(agentId, status) {
  const agent = agents.get(agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  agent.status = status;
  agent.lastSeen = new Date().toISOString();
  agents.set(agentId, agent);

  return agent;
}

/**
 * Update agent metrics after transaction
 */
function updateAgentMetrics(agentId, metrics) {
  const current = agentMetrics.get(agentId) || {
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    totalVolume: 0,
    averageResponseTime: 0,
    lastTransactionAt: null,
    dailyStats: {}
  };

  current.totalTransactions++;
  if (metrics.success) {
    current.successfulTransactions++;
  } else {
    current.failedTransactions++;
  }

  if (metrics.volume) {
    current.totalVolume += metrics.volume;
  }

  if (metrics.responseTime) {
    current.averageResponseTime =
      (current.averageResponseTime * (current.totalTransactions - 1) + metrics.responseTime) /
      current.totalTransactions;
  }

  current.lastTransactionAt = new Date().toISOString();

  // Update daily stats
  const today = new Date().toISOString().split('T')[0];
  if (!current.dailyStats[today]) {
    current.dailyStats[today] = { transactions: 0, volume: 0 };
  }
  current.dailyStats[today].transactions++;
  if (metrics.volume) {
    current.dailyStats[today].volume += metrics.volume;
  }

  agentMetrics.set(agentId, current);

  // Update agent rating
  const agent = agents.get(agentId);
  if (agent && current.totalTransactions > 0) {
    agent.rating.transactions = current.totalTransactions;
    agent.rating.reliability = (current.successfulTransactions / current.totalTransactions) * 5;
    agent.rating.overall = (
      agent.rating.reliability +
      agent.rating.responsiveness
    ) / 2;
    agents.set(agentId, agent);
  }

  return current;
}

/**
 * Create agent session
 */
function createSession(agentId, context = {}) {
  const session = {
    id: uuidv4(),
    agentId,
    context,
    startedAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    messages: [],
    negotiations: []
  };

  agentSessions.set(session.id, session);
  return session;
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    service: 'ACN Network',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    stats: {
      totalAgents: agents.size,
      onlineAgents: Array.from(agents.values()).filter(a => a.status === AGENT_STATUS.ONLINE).length,
      totalSessions: agentSessions.size
    }
  });
});

/**
 * Get network info
 */
app.get('/info', (req, res) => {
  res.json({
    name: 'Agent Commerce Network',
    version: '1.0.0',
    description: 'Central registry for all AI agents',
    agentTypes: Object.values(AGENT_TYPES),
    industries: Object.values(INDUSTRIES),
    capabilities: Object.values(CAPABILITIES),
    stats: {
      totalAgents: agents.size,
      byType: {
        genie: Array.from(agents.values()).filter(a => a.type === AGENT_TYPES.GENIE).length,
        merchant: Array.from(agents.values()).filter(a => a.type === AGENT_TYPES.MERCHANT).length,
        system: Array.from(agents.values()).filter(a => a.type === AGENT_TYPES.SYSTEM).length,
        partner: Array.from(agents.values()).filter(a => a.type === AGENT_TYPES.PARTNER).length
      }
    }
  });
});

/**
 * Register a new agent
 * POST /api/agents
 */
app.post('/api/agents',requireAuth,  (req, res) => {
  try {
    const { type, ...agentData } = req.body;

    let agent;
    if (type === 'genie') {
      agent = createGenieAgent(agentData.owner, agentData);
    } else if (type === 'merchant') {
      agent = createMerchantAgent(agentData.owner, agentData);
    } else {
      agent = registerAgent(req.body);
    }

    res.status(201).json(agent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Register a Genie consumer agent
 * POST /api/agents/genie
 */
app.post('/api/agents/genie',requireAuth,  (req, res) => {
  try {
    const { userId, preferences } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const agent = createGenieAgent(userId, preferences);
    res.status(201).json(agent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Register a Merchant AI agent
 * POST /api/agents/merchant
 */
app.post('/api/agents/merchant',requireAuth,  (req, res) => {
  try {
    const { businessId, businessName, industry, capabilities, ...rest } = req.body;

    if (!businessId || !industry) {
      return res.status(400).json({ error: 'businessId and industry are required' });
    }

    const agent = createMerchantAgent(businessId, {
      name: `${industry}-ai`,
      businessName,
      industry,
      capabilities,
      ...rest
    });

    res.status(201).json(agent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get agent by ID
 * GET /api/agents/:id
 */
app.get('/api/agents/:id', (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json(agent);
});

/**
 * Update agent
 * PUT /api/agents/:id
 */
app.put('/api/agents/:id',requireAuth,  (req, res) => {
  try {
    const agent = agents.get(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const updates = req.body;
    const updated = { ...agent, ...updates, id: agent.id };
    agents.set(agent.id, updated);

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Update agent status
 * PUT /api/agents/:id/status
 */
app.put('/api/agents/:id/status',requireAuth,  (req, res) => {
  try {
    const { status } = req.body;
    if (!Object.values(AGENT_STATUS).includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        validStatuses: Object.values(AGENT_STATUS)
      });
    }

    const agent = updateAgentStatus(req.params.id, status);
    res.json(agent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Search for agents
 * POST /api/agents/search
 */
app.post('/api/agents/search',requireAuth,  (req, res) => {
  try {
    const results = searchAgents(req.body);
    res.json({
      total: results.length,
      results
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Find agents by capability
 * GET /api/agents/capability/:capability
 */
app.get('/api/agents/capability/:capability', (req, res) => {
  const capability = req.params.capability.toUpperCase();
  const agentIds = capabilityIndex.get(capability) || new Set();
  const agentList = Array.from(agentIds).map(id => agents.get(id)).filter(Boolean);

  res.json({
    capability,
    total: agentList.length,
    agents: agentList
  });
});

/**
 * Get agents by industry
 * GET /api/agents/industry/:industry
 */
app.get('/api/agents/industry/:industry', (req, res) => {
  const industry = req.params.industry.toLowerCase();
  const results = Array.from(agents.values()).filter(a => a.industry === industry);

  res.json({
    industry,
    total: results.length,
    agents: results
  });
});

/**
 * Get online agents
 * GET /api/agents/online
 */
app.get('/api/agents/online', (req, res) => {
  const online = Array.from(agents.values()).filter(a => a.status === AGENT_STATUS.ONLINE);
  res.json({
    total: online.length,
    agents: online
  });
});

/**
 * Verify an agent
 * POST /api/agents/:id/verify
 */
app.post('/api/agents/:id/verify',requireAuth,  (req, res) => {
  try {
    const agent = agents.get(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    agent.verified = true;
    agents.set(agent.id, agent);

    res.json(agent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get agent metrics
 * GET /api/agents/:id/metrics
 */
app.get('/api/agents/:id/metrics', (req, res) => {
  const metrics = agentMetrics.get(req.params.id);
  if (!metrics) {
    return res.status(404).json({ error: 'Metrics not found' });
  }
  res.json(metrics);
});

/**
 * Update agent metrics (internal/callback)
 * POST /api/agents/:id/metrics
 */
app.post('/api/agents/:id/metrics',requireAuth,  (req, res) => {
  try {
    const updated = updateAgentMetrics(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Create agent session
 * POST /api/sessions
 */
app.post('/api/sessions',requireAuth,  (req, res) => {
  try {
    const { agentId, context } = req.body;
    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    const agent = agents.get(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const session = createSession(agentId, context);
    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get session by ID
 * GET /api/sessions/:id
 */
app.get('/api/sessions/:id', (req, res) => {
  const session = agentSessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

/**
 * Update session
 * PUT /api/sessions/:id
 */
app.put('/api/sessions/:id',requireAuth,  (req, res) => {
  try {
    const session = agentSessions.get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.lastActivity = new Date().toISOString();
    if (req.body.context) {
      session.context = { ...session.context, ...req.body.context };
    }
    if (req.body.messages) {
      session.messages.push(...req.body.messages);
    }
    if (req.body.negotiations) {
      session.negotiations.push(...req.body.negotiations);
    }

    agentSessions.set(session.id, session);
    res.json(session);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get network statistics
 * GET /api/stats
 */
app.get('/api/stats', (req, res) => {
  const allAgents = Array.from(agents.values());

  const byType = {};
  Object.values(AGENT_TYPES).forEach(type => {
    byType[type] = allAgents.filter(a => a.type === type).length;
  });

  const byIndustry = {};
  Object.values(INDUSTRIES).forEach(ind => {
    const count = allAgents.filter(a => a.industry === ind).length;
    if (count > 0) byIndustry[ind] = count;
  });

  const byStatus = {};
  Object.values(AGENT_STATUS).forEach(status => {
    byStatus[status] = allAgents.filter(a => a.status === status).length;
  });

  res.json({
    totalAgents: allAgents.length,
    byType,
    byIndustry,
    byStatus,
    totalSessions: agentSessions.size,
    totalCapabilities: capabilityIndex.size
  });
});

/**
 * Get recommended agents for a purchase
 * POST /api/recommend
 */
app.post('/api/recommend',requireAuth,  (req, res) => {
  try {
    const { intent, industry, budget, preferences } = req.body;

    // Build search criteria based on intent
    const criteria = {
      type: AGENT_TYPES.MERCHANT,
      status: AGENT_STATUS.ONLINE,
      verified: true,
      sortBy: 'rating',
      limit: 10
    };

    if (industry) {
      criteria.industry = industry;
    }

    // Map intent to capabilities
    const intentCapabilities = {
      'buy': [CAPABILITIES.ORDER_PLACEMENT],
      'book': [CAPABILITIES.BOOKING, CAPABILITIES.RESERVATION],
      'inquire': [CAPABILITIES.PRODUCT_SEARCH],
      'negotiate': [CAPABILITIES.NEGOTIATION],
      'track': [CAPABILITIES.ORDER_TRACKING],
      'support': [CAPABILITIES.CUSTOMER_SUPPORT]
    };

    if (intent) {
      criteria.capabilities = intentCapabilities[intent.toLowerCase()] || [];
    }

    const recommendations = searchAgents(criteria);

    // Score and rank recommendations
    const scored = recommendations.map(agent => ({
      ...agent,
      score: calculateAgentScore(agent, { budget, preferences })
    })).sort((a, b) => b.score - a.score);

    res.json({
      intent,
      industry,
      total: scored.length,
      recommendations: scored.slice(0, 5)
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Calculate agent recommendation score
 */
function calculateAgentScore(agent, context) {
  let score = agent.rating.overall * 20; // 0-100 from rating

  // Boost for verified agents
  if (agent.verified) score += 10;

  // Boost for higher tiers
  if (agent.tier === 'enterprise') score += 20;
  else if (agent.tier === 'pro') score += 10;

  // Boost for transaction volume
  if (agent.rating.transactions > 1000) score += 15;
  else if (agent.rating.transactions > 100) score += 5;

  return Math.min(100, score);
}

// Start server
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           ACN NETWORK - Agent Commerce Network                 ║
║                    Version 1.0.0                              ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                   ║
║  Status: RUNNING                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Agent Types:                                                 ║
║    GENIE    → Consumer personal AI agents                     ║
║    MERCHANT → Business AI agents (SUTAR OS)                  ║
║    SYSTEM   → RTMN internal agents                          ║
║    PARTNER  → External partner agents                         ║
╠══════════════════════════════════════════════════════════════╣
║  Capabilities:                                                ║
║    Shopping: Product Search, Price Compare, Negotiation       ║
║    Orders: Order Placement, Tracking, Returns, Refunds        ║
║    Services: Booking, Reservation, Scheduling, Consultation  ║
║    Support: Customer Support, Complaints, Technical          ║
╠══════════════════════════════════════════════════════════════╣
║  API Endpoints:                                               ║
║    POST   /api/agents              Register agent             ║
║    POST   /api/agents/genie        Register Genie agent       ║
║    POST   /api/agents/merchant     Register Merchant agent    ║
║    GET    /api/agents/:id          Get agent                  ║
║    PUT    /api/agents/:id/status   Update status              ║
║    POST   /api/agents/search       Search agents              ║
║    GET    /api/agents/online       Get online agents          ║
║    POST   /api/recommend           Get recommendations        ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

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

module.exports = app;
