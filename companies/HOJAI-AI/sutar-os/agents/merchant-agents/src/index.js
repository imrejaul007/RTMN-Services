import cors from 'cors';
import helmet from 'helmet';
/**
 * SUTAR OS - Merchant AI Agents
 *
 * Business AI agents that handle customer negotiations, orders, and support.
 * Every business gets an intelligent agent that can:
 * - Negotiate with Genie consumer agents
 * - Process orders autonomously
 * - Handle customer inquiries
 * - Manage inventory
 * - Set dynamic pricing
 * - Provide customer support
 *
 * Industry-specific templates:
 * - Restaurant AI
 * - Hotel AI
 * - Retail AI
 * - Healthcare AI
 * - Travel AI
 * - And 20+ more
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { setupSecurity, strictLimiter } = require('@rtmn/shared/security');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { v4: uuidv4 } = require('uuid');

// REZ Intelligence client (wires merchant-agents to real-time business intelligence)
const rezIntel = require('./rez-intel-client');

const app = express();

app.use(cors());
app.use(helmet());

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
setupSecurity(app, { serviceName: 'merchant-agents' });

const PORT = process.env.PORT || 4737;

// Service URLs
const ACP_PROTOCOL_URL = process.env.ACP_PROTOCOL_URL || 'http://localhost:4800';
const ACN_NETWORK_URL = process.env.ACN_NETWORK_URL || 'http://localhost:4801';

// In-memory stores
const merchants = new PersistentMap('merchants', { serviceName: 'merchant-agents' });
const merchantProducts = new PersistentMap('merchant-products', { serviceName: 'merchant-agents' });
const merchantOrders = new PersistentMap('merchant-orders', { serviceName: 'merchant-agents' });
const merchantInventory = new PersistentMap('merchant-inventory', { serviceName: 'merchant-agents' });
const merchantPricing = new PersistentMap('merchant-pricing', { serviceName: 'merchant-agents' });
const negotiationHandlers = new PersistentMap('negotiation-handlers', { serviceName: 'merchant-agents' });

// Industry types
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
  GROCERY: 'grocery',
  ELECTRONICS: 'electronics',
  EVENTS: 'events',
  EXHIBITIONS: 'exhibitions'
};

/**
 * Merchant AI configuration
 */
function createMerchantAI(config) {
  const merchant = {
    id: config.id || uuidv4(),
    agentId: `${config.industry}-${config.businessId}-ai`,
    businessId: config.businessId,
    businessName: config.businessName,
    industry: config.industry,
    type: 'merchant',

    // AI Configuration
    ai: {
      name: config.aiName || `${config.businessName} AI`,
      personality: config.personality || 'professional',  // professional, friendly, formal
      language: config.language || 'en',
      operatingHours: config.operatingHours || { start: '09:00', end: '21:00' },
      timezone: config.timezone || 'UTC'
    },

    // Business Rules
    rules: {
      minOrderValue: config.rules?.minOrderValue || 0,
      maxDiscount: config.rules?.maxDiscount || 0.20,  // 20% max discount
      acceptReturns: config.rules?.acceptReturns ?? true,
      returnDays: config.rules?.returnDays || 30,
      freeShippingThreshold: config.rules?.freeShippingThreshold || 50,
      rushDeliveryFee: config.rules?.rushDeliveryFee || 15,
      autoAcceptThreshold: config.rules?.autoAcceptThreshold || 0.05,  // Auto-accept if within 5% of asking
      negotiationRounds: config.rules?.negotiationRounds || 5
    },

    // Products & Inventory
    catalog: config.catalog || [],
    inventory: config.inventory || {},

    // Pricing Strategy
    pricing: {
      strategy: config.pricing?.strategy || 'dynamic',  // fixed, dynamic, competitive
      margins: config.pricing?.margins || { min: 0.15, target: 0.30, max: 0.50 },
      competitorWeight: config.pricing?.competitorWeight || 0.3
    },

    // Capabilities
    capabilities: config.capabilities || [
      'negotiation',
      'order_placement',
      'order_tracking',
      'customer_support',
      'returns',
      'refunds'
    ],

    // Endpoints
    endpoints: {
      api: config.endpoints?.api,
      webhook: config.endpoints?.webhook,
      callback: config.endpoints?.callback
    },

    // Stats
    stats: {
      totalNegotiations: 0,
      successfulNegotiations: 0,
      totalOrders: 0,
      revenue: 0,
      avgResponseTime: 0,
      customerSatisfaction: 0
    },

    status: 'online',
    verified: false,
    tier: config.tier || 'basic',  // basic, pro, enterprise
    createdAt: new Date().toISOString()
  };

  merchants.set(merchant.id, merchant);
  merchantInventory.set(merchant.id, merchant.inventory);
  merchantPricing.set(merchant.id, merchant.pricing);

  return merchant;
}

/**
 * Industry-specific merchant templates
 */
const INDUSTRY_TEMPLATES = {
  [INDUSTRIES.RESTAURANT]: {
    capabilities: ['reservation', 'order_placement', 'delivery', 'takeout', 'catering'],
    rules: {
      minOrderValue: 15,
      maxDiscount: 0.15,
      acceptReturns: false,
      autoAcceptThreshold: 0.10
    }
  },
  [INDUSTRIES.HOTEL]: {
    capabilities: ['booking', 'check_in', 'check_out', 'room_service', 'concierge'],
    rules: {
      minOrderValue: 50,
      maxDiscount: 0.25,
      acceptReturns: false,
      autoAcceptThreshold: 0.08
    }
  },
  [INDUSTRIES.RETAIL]: {
    capabilities: ['product_search', 'order_placement', 'shipping', 'returns', 'refunds'],
    rules: {
      minOrderValue: 10,
      maxDiscount: 0.30,
      acceptReturns: true,
      returnDays: 30,
      freeShippingThreshold: 50
    }
  },
  [INDUSTRIES.HEALTHCARE]: {
    capabilities: ['appointment', 'consultation', 'prescription', 'lab_booking'],
    rules: {
      minOrderValue: 0,
      maxDiscount: 0.10,
      acceptReturns: false,
      autoAcceptThreshold: 0.05
    }
  },
  [INDUSTRIES.TRAVEL]: {
    capabilities: ['booking', 'cancellation', 'rescheduling', 'refunds', 'insurance'],
    rules: {
      minOrderValue: 100,
      maxDiscount: 0.20,
      acceptReturns: true,
      returnDays: 14,
      freeShippingThreshold: 0
    }
  }
};

/**
 * Handle incoming QUERY from buyer
 */
function handleQuery(merchantId, query) {
  const merchant = merchants.get(merchantId);
  if (!merchant) {
    throw new Error('Merchant not found');
  }

  const response = {
    id: uuidv4(),
    type: 'QUERY_RECEIVED',
    merchantId,
    query,
    timestamp: new Date().toISOString(),
    status: 'processing'
  };

  // Analyze query and prepare response
  const productMatch = findMatchingProduct(merchant, query.intent);

  if (productMatch) {
    response.match = productMatch;
    response.action = 'generate_quote';
  } else {
    response.action = 'request_more_info';
  }

  return response;
}

/**
 * Generate quote based on query
 */
function generateQuote(merchantId, query, product) {
  const merchant = merchants.get(merchantId);
  const inventory = merchantInventory.get(merchantId) || {};

  const basePrice = product?.price || query.context?.maxPrice || 100;
  const quantity = query.constraints?.quantity || 1;

  // Calculate dynamic pricing
  const pricing = merchantPricing.get(merchantId) || { margins: { target: 0.30 } };
  const margin = pricing.margins.target;

  // Factors affecting price
  let priceModifier = 1;

  // Urgency factor
  if (query.context?.urgency === 'urgent') {
    priceModifier *= 1.1;  // Charge more for urgent
  }

  // Quantity discount
  if (quantity >= 10) priceModifier *= 0.95;
  if (quantity >= 100) priceModifier *= 0.90;

  const finalPrice = basePrice * priceModifier;
  const originalPrice = basePrice * (1 + margin);

  return {
    type: 'QUOTE',
    sender: merchant.agentId,
    receiver: query.sender,
    negotiationId: query.negotiationId,
    offer: {
      product: product?.name || query.intent,
      description: product?.description || query.context?.description,
      price: Math.round(finalPrice * 100) / 100,
      originalPrice: Math.round(originalPrice * 100) / 100,
      quantity,
      currency: 'USD',
      unit: product?.unit || 'each'
    },
    terms: {
      deliveryDate: calculateDeliveryDate(merchant, query),
      warranty: product?.warranty || 'standard',
      paymentTerms: 'immediate',
      returnPolicy: merchant.rules.acceptReturns ? `${merchant.rules.returnDays} days` : 'no returns'
    },
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    negotiableFields: ['price', 'quantity', 'deliveryDate'],
    alternatives: getAlternatives(merchant, product)
  };
}

/**
 * Handle counter-offer from buyer
 */
function handleCounterOffer(merchantId, negotiationId, counter) {
  const merchant = merchants.get(merchantId);
  const { counterOffer, reasoning } = counter;

  // Calculate minimum acceptable price
  const minPrice = counterOffer.originalPrice * (1 - merchant.rules.maxDiscount);

  if (counterOffer.price >= minPrice) {
    // Acceptable range
    if (counterOffer.price <= counterOffer.originalPrice * (1 + merchant.rules.autoAcceptThreshold)) {
      // Auto-accept (within threshold)
      return {
        type: 'ACCEPT',
        message: 'Counter offer accepted',
        terms: counterOffer
      };
    } else {
      // Need to counter
      const counterPrice = Math.max(
        counterOffer.originalPrice * (1 - merchant.rules.maxDiscount * 0.5),
        counterOffer.price * 1.02
      );

      return {
        type: 'COUNTER',
        message: 'Here is our counter offer',
        counterOffer: {
          price: Math.round(counterPrice * 100) / 100,
          quantity: counterOffer.quantity,
          deliveryDate: counterOffer.deliveryDate
        },
        reasoning: 'This is our best price given market conditions',
        remainingRounds: (negotiationHandlers.get(negotiationId)?.rounds || 3) - 1
      };
    }
  } else {
    // Below minimum - reject
    return {
      type: 'REJECT',
      message: 'Price too low',
      reason: `Cannot go below $${minPrice.toFixed(2)} (our cost)`,
      alternatives: getAlternatives(merchant, null)
    };
  }
}

/**
 * Process order from buyer
 */
function processOrder(merchantId, orderDetails) {
  const merchant = merchants.get(merchantId);
  const order = {
    id: orderDetails.orderDetails?.id || `ORD-${Date.now()}`,
    merchantId,
    buyerAgent: orderDetails.sender,
    items: orderDetails.orderDetails?.items || [],
    total: orderDetails.orderDetails?.total,
    currency: 'USD',
    status: 'confirmed',
    fulfillment: {
      status: 'pending',
      steps: [
        { name: 'Order Received', status: 'completed', timestamp: new Date().toISOString() },
        { name: 'Processing', status: 'pending' },
        { name: 'Preparing', status: 'pending' },
        { name: 'Shipped/Delivered', status: 'pending' }
      ]
    },
    tracking: {
      carrier: 'standard',
      trackingNumber: null,
      estimatedDelivery: calculateDeliveryDate(merchant, {})
    },
    timeline: {
      createdAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString()
    }
  };

  // Store order
  const orders = merchantOrders.get(merchantId) || [];
  orders.push(order);
  merchantOrders.set(merchantId, orders);

  // Update stats
  merchant.stats.totalOrders++;
  merchant.stats.revenue += order.total;
  merchants.set(merchantId, merchant);

  return order;
}

/**
 * Find matching product in catalog
 */
function findMatchingProduct(merchant, intent) {
  const keywords = intent.toLowerCase().split(' ');

  for (const product of merchant.catalog) {
    const searchText = `${product.name} ${product.description} ${product.categories?.join(' ')}`.toLowerCase();
    const matchCount = keywords.filter(k => searchText.includes(k)).length;
    if (matchCount >= keywords.length * 0.5) {
      return product;
    }
  }

  return null;
}

/**
 * Calculate delivery date based on merchant and query
 */
function calculateDeliveryDate(merchant, query) {
  const baseDays = {
    [INDUSTRIES.RESTAURANT]: 0.5,  // Same day
    [INDUSTRIES.RETAIL]: 3,
    [INDUSTRIES.HOTEL]: 0,  // Immediate for booking
    [INDUSTRIES.TRAVEL]: 0,
    default: 5
  };

  const days = baseDays[merchant.industry] || baseDays.default;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

/**
 * Get alternative products
 */
function getAlternatives(merchant, currentProduct) {
  return merchant.catalog
    .filter(p => p.id !== currentProduct?.id)
    .slice(0, 2)
    .map(p => ({
      name: p.name,
      price: p.price,
      description: p.description
    }));
}

/**
 * Track order status
 */
function trackOrder(merchantId, orderId) {
  const orders = merchantOrders.get(merchantId) || [];
  const order = orders.find(o => o.id === orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  return {
    orderId: order.id,
    status: order.fulfillment.status,
    milestones: order.fulfillment.steps,
    estimatedDelivery: order.tracking.estimatedDelivery,
    lastUpdate: order.timeline.confirmedAt
  };
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    service: 'SUTAR OS - Merchant Agents',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    stats: {
      totalMerchants: merchants.size,
      totalOrders: Array.from(merchantOrders.values()).reduce((sum, orders) => sum + orders.length, 0)
    }
  });
});

/**
 * Get service info
 */
app.get('/info', async (req, res) => {
  // Check REZ Intelligence status (non-blocking)
  let rezIntelStatus = 'unknown';
  try {
    rezIntelStatus = await rezIntel.checkRezIntelHealth() ? 'healthy' : 'unhealthy';
  } catch (err) {
    rezIntelStatus = 'unreachable';
  }

  res.json({
    name: 'SUTAR OS - Merchant AI Agents',
    description: 'Business AI agents for autonomous commerce, enriched with REZ Intelligence',
    version: '2.0.0',
    industries: Object.values(INDUSTRIES),
    capabilities: [
      'autonomous_negotiation',
      'order_management',
      'inventory_control',
      'dynamic_pricing',
      'customer_support',
      'returns_refunds',
      'rez_intelligence_enrichment',
      'personalized_recommendations',
      'revenue_prediction',
      'customer_lifetime_value',
      'next_best_action'
    ],
    rezIntel: {
      enabled: rezIntel.REZ_INTEL_ENABLED,
      url: rezIntel.REZ_INTEL_URL,
      status: rezIntelStatus
    }
  });
});

/**
 * Create merchant AI
 * POST /api/merchants
 */
app.post('/api/merchants',requireAuth,  (req, res) => {
  try {
    const { industry, template, ...config } = req.body;

    if (!config.businessId || !config.businessName) {
      return res.status(400).json({ error: 'businessId and businessName are required' });
    }

    // Apply industry template if provided
    if (industry && template !== false) {
      const templateConfig = INDUSTRY_TEMPLATES[industry] || {};
      config.rules = { ...templateConfig.rules, ...config.rules };
      config.capabilities = [...(templateConfig.capabilities || []), ...(config.capabilities || [])];
    }

    config.industry = industry || 'retail';
    const merchant = createMerchantAI(config);

    res.status(201).json(merchant);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Create restaurant AI
 * POST /api/merchants/restaurant
 */
app.post('/api/merchants/restaurant',requireAuth,  (req, res) => {
  try {
    const merchant = createMerchantAI({
      industry: INDUSTRIES.RESTAURANT,
      ...req.body,
      capabilities: INDUSTRY_TEMPLATES[INDUSTRIES.RESTAURANT].capabilities,
      rules: {
        ...INDUSTRY_TEMPLATES[INDUSTRIES.RESTAURANT].rules,
        ...req.body.rules
      }
    });

    res.status(201).json(merchant);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Create hotel AI
 * POST /api/merchants/hotel
 */
app.post('/api/merchants/hotel',requireAuth,  (req, res) => {
  try {
    const merchant = createMerchantAI({
      industry: INDUSTRIES.HOTEL,
      ...req.body,
      capabilities: INDUSTRY_TEMPLATES[INDUSTRIES.HOTEL].capabilities,
      rules: {
        ...INDUSTRY_TEMPLATES[INDUSTRIES.HOTEL].rules,
        ...req.body.rules
      }
    });

    res.status(201).json(merchant);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Create retail AI
 * POST /api/merchants/retail
 */
app.post('/api/merchants/retail',requireAuth,  (req, res) => {
  try {
    const merchant = createMerchantAI({
      industry: INDUSTRIES.RETAIL,
      ...req.body,
      capabilities: INDUSTRY_TEMPLATES[INDUSTRIES.RETAIL].capabilities,
      rules: {
        ...INDUSTRY_TEMPLATES[INDUSTRIES.RETAIL].rules,
        ...req.body.rules
      }
    });

    res.status(201).json(merchant);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get merchant by ID
 * GET /api/merchants/:id
 */
app.get('/api/merchants/:id', (req, res) => {
  const merchant = merchants.get(req.params.id);
  if (!merchant) {
    return res.status(404).json({ error: 'Merchant not found' });
  }
  res.json(merchant);
});

/**
 * Update merchant
 * PUT /api/merchants/:id
 */
app.put('/api/merchants/:id',requireAuth,  (req, res) => {
  try {
    const merchant = merchants.get(req.params.id);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const updated = { ...merchant, ...req.body, id: merchant.id };
    merchants.set(merchant.id, updated);

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Update merchant status
 * PUT /api/merchants/:id/status
 */
app.put('/api/merchants/:id/status',requireAuth,  (req, res) => {
  try {
    const merchant = merchants.get(req.params.id);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    merchant.status = req.body.status || 'online';
    merchants.set(merchant.id, merchant);

    res.json(merchant);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Add product to catalog
 * POST /api/merchants/:id/products
 */
app.post('/api/merchants/:id/products',requireAuth,  (req, res) => {
  try {
    const merchant = merchants.get(req.params.id);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const product = {
      id: uuidv4(),
      ...req.body,
      addedAt: new Date().toISOString()
    };

    merchant.catalog.push(product);
    merchantInventory.set(merchant.id, {
      ...merchantInventory.get(merchant.id),
      [product.id]: { quantity: product.quantity || 100, status: 'in_stock' }
    });

    merchants.set(merchant.id, merchant);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get merchant catalog
 * GET /api/merchants/:id/catalog
 */
app.get('/api/merchants/:id/catalog', (req, res) => {
  const merchant = merchants.get(req.params.id);
  if (!merchant) {
    return res.status(404).json({ error: 'Merchant not found' });
  }
  res.json({
    merchant: merchant.businessName,
    products: merchant.catalog
  });
});

/**
 * Handle incoming ACP message
 * POST /api/merchants/:id/message
 */
app.post('/api/merchants/:id/message',requireAuth,  async (req, res) => {
  try {
    const merchant = merchants.get(req.params.id);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const { message } = req.body;

    // REZ Intelligence: enrich context with real-time business intelligence
    // before processing the message. Graceful degradation if unavailable.
    const enriched = await rezIntel.enrichAgentContext({
      agentRole: 'merchant-agent',
      userId: message.from || message.customerId,
      companyId: merchant.id,
      query: message.text || message.query,
      context: {
        merchantIndustry: merchant.industry,
        merchantTier: merchant.tier,
        messageType: message.type
      }
    }).catch(() => null);

    let response;
    switch (message.type) {
      case 'QUERY':
        response = handleQuery(merchant.id, message);
        // Auto-generate quote if match found
        if (response.action === 'generate_quote') {
          response = generateQuote(merchant.id, message, response.match);
        }
        // REZ Intelligence: attach personalized product recommendations
        if (enriched && enriched.recommendations && enriched.recommendations.products) {
          response.recommendations = enriched.recommendations.products;
        }
        // REZ Intelligence: surface relevant predictions (LTV, demand)
        if (enriched && enriched.predictions) {
          response.predictions = enriched.predictions;
        }
        break;

      case 'COUNTER':
        const negotiationId = message.negotiationId;
        negotiationHandlers.set(negotiationId, { rounds: merchant.rules.negotiationRounds });
        response = handleCounterOffer(merchant.id, negotiationId, message);
        // REZ Intelligence: pricing recommendation for counter-offers
        if (enriched && enriched.recommendations && enriched.recommendations.pricing) {
          response.pricing_guidance = enriched.recommendations.pricing;
        }
        break;

      case 'ORDER':
        response = processOrder(merchant.id, message);
        break;

      default:
        response = { error: 'Unknown message type', received: message };
    }

    // REZ Intelligence: attach intent classification
    if (enriched && enriched.intent) {
      response.intent = enriched.intent;
    }

    // Update stats
    merchant.stats.totalNegotiations++;
    if (response.type === 'ACCEPT') {
      merchant.stats.successfulNegotiations++;
    }
    merchants.set(merchant.id, merchant);

    res.json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get merchant orders
 * GET /api/merchants/:id/orders
 */
app.get('/api/merchants/:id/orders', (req, res) => {
  const orders = merchantOrders.get(req.params.id) || [];
  res.json({
    total: orders.length,
    orders
  });
});

/**
 * Get order by ID
 * GET /api/merchants/:id/orders/:orderId
 */
app.get('/api/merchants/:id/orders/:orderId', (req, res) => {
  const orders = merchantOrders.get(req.params.id) || [];
  const order = orders.find(o => o.id === req.params.orderId);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

/**
 * Update order status
 * PUT /api/merchants/:id/orders/:orderId
 */
app.put('/api/merchants/:id/orders/:orderId',requireAuth,  (req, res) => {
  try {
    const orders = merchantOrders.get(req.params.id) || [];
    const orderIndex = orders.findIndex(o => o.id === req.params.orderId);

    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }

    orders[orderIndex] = { ...orders[orderIndex], ...req.body };
    merchantOrders.set(req.params.id, orders);

    res.json(orders[orderIndex]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Track order
 * GET /api/merchants/:id/track/:orderId
 */
app.get('/api/merchants/:id/track/:orderId', (req, res) => {
  try {
    const tracking = trackOrder(req.params.id, req.params.orderId);
    res.json(tracking);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * Get merchant stats
 * GET /api/merchants/:id/stats
 */
app.get('/api/merchants/:id/stats', (req, res) => {
  const merchant = merchants.get(req.params.id);
  if (!merchant) {
    return res.status(404).json({ error: 'Merchant not found' });
  }

  const successRate = merchant.stats.totalNegotiations > 0
    ? (merchant.stats.successfulNegotiations / merchant.stats.totalNegotiations * 100).toFixed(1)
    : 0;

  res.json({
    ...merchant.stats,
    successRate: `${successRate}%`
  });
});

/**
 * Get enriched merchant insights from REZ Intelligence
 * GET /api/merchants/:id/insights
 *
 * Combines local merchant stats with REZ Intelligence:
 * - Merchant performance metrics
 * - Top products + growth rate
 * - Churn risk customers
 */
app.get('/api/merchants/:id/insights', async (req, res) => {
  const merchant = merchants.get(req.params.id);
  if (!merchant) {
    return res.status(404).json({ error: 'Merchant not found' });
  }

  const timeRange = req.query.timeRange || '30d';
  const rezInsights = await rezIntel.getMerchantInsights({
    merchantId: merchant.id,
    timeRange
  });

  const successRate = merchant.stats.totalNegotiations > 0
    ? (merchant.stats.successfulNegotiations / merchant.stats.totalNegotiations * 100).toFixed(1)
    : 0;

  res.json({
    merchantId: merchant.id,
    merchantName: merchant.businessName,
    industry: merchant.industry,
    timeRange,
    local: {
      totalNegotiations: merchant.stats.totalNegotiations,
      successfulNegotiations: merchant.stats.successfulNegotiations,
      totalOrders: merchant.stats.totalOrders,
      revenue: merchant.stats.revenue,
      successRate: `${successRate}%`
    },
    rezIntel: rezInsights, // null if REZ Intel unavailable
    source: rezIntel ? 'local + rez-intel' : 'local only (rez-intel unavailable)'
  });
});

/**
 * Get enriched customer insights from REZ Intelligence
 * GET /api/merchants/:id/customers/:customerId/insights
 */
app.get('/api/merchants/:id/customers/:customerId/insights', async (req, res) => {
  const merchant = merchants.get(req.params.id);
  if (!merchant) {
    return res.status(404).json({ error: 'Merchant not found' });
  }

  const timeRange = req.query.timeRange || '90d';
  const rezInsights = await rezIntel.getCustomerInsights({
    merchantId: merchant.id,
    customerId: req.params.customerId,
    timeRange
  });

  res.json({
    merchantId: merchant.id,
    customerId: req.params.customerId,
    timeRange,
    rezIntel: rezInsights,
    source: rezInsights ? 'rez-intel' : 'unavailable'
  });
});

/**
 * Get revenue prediction from REZ Intelligence
 * GET /api/merchants/:id/predictions/revenue
 */
app.get('/api/merchants/:id/predictions/revenue', async (req, res) => {
  const merchant = merchants.get(req.params.id);
  if (!merchant) {
    return res.status(404).json({ error: 'Merchant not found' });
  }

  const timeRange = req.query.timeRange || '30d';
  const segment = req.query.segment;
  const prediction = await rezIntel.predictRevenue({
    merchantId: merchant.id,
    timeRange,
    segment
  });

  res.json({
    merchantId: merchant.id,
    timeRange,
    segment: segment || 'all',
    prediction,
    source: prediction ? 'rez-intel' : 'unavailable'
  });
});

/**
 * Get product recommendations for a customer
 * GET /api/merchants/:id/recommendations?customerId=X
 */
app.get('/api/merchants/:id/recommendations', async (req, res) => {
  const merchant = merchants.get(req.params.id);
  if (!merchant) {
    return res.status(404).json({ error: 'Merchant not found' });
  }

  const customerId = req.query.customerId;
  if (!customerId) {
    return res.status(400).json({ error: 'customerId query param required' });
  }

  const recommendations = await rezIntel.getProductRecommendations({
    merchantId: merchant.id,
    customerId,
    context: req.query
  });

  res.json({
    merchantId: merchant.id,
    customerId,
    recommendations,
    source: recommendations ? 'rez-intel' : 'unavailable'
  });
});

/**
 * Get next-best-action recommendation
 * GET /api/merchants/:id/next-best-action?customerId=X
 */
app.get('/api/merchants/:id/next-best-action', async (req, res) => {
  const merchant = merchants.get(req.params.id);
  if (!merchant) {
    return res.status(404).json({ error: 'Merchant not found' });
  }

  const customerId = req.query.customerId;
  const nba = await rezIntel.getNextBestAction({
    merchantId: merchant.id,
    customerId
  });

  res.json({
    merchantId: merchant.id,
    customerId,
    nba,
    source: nba ? 'rez-intel' : 'unavailable'
  });
});

/**
 * Get pricing recommendations for a product
 * GET /api/merchants/:id/pricing-recommendations?productId=X
 */
app.get('/api/merchants/:id/pricing-recommendations', async (req, res) => {
  const merchant = merchants.get(req.params.id);
  if (!merchant) {
    return res.status(404).json({ error: 'Merchant not found' });
  }

  const productId = req.query.productId;
  const customerSegment = req.query.segment;
  if (!productId) {
    return res.status(400).json({ error: 'productId query param required' });
  }

  const pricing = await rezIntel.getPricingRecommendations({
    merchantId: merchant.id,
    productId,
    customerSegment
  });

  res.json({
    merchantId: merchant.id,
    productId,
    pricing,
    source: pricing ? 'rez-intel' : 'unavailable'
  });
});

/**
 * Check REZ Intelligence service status
 * GET /api/merchants/rez-intel-status
 */
app.get('/api/merchants/rez-intel-status', async (req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({
    rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED,
    rezIntelUrl: rezIntel.REZ_INTEL_URL,
    rezIntelHealthy: isHealthy,
    timestamp: new Date().toISOString()
  });
});

/**
 * Update inventory
 * PUT /api/merchants/:id/inventory
 */
app.put('/api/merchants/:id/inventory',requireAuth,  (req, res) => {
  try {
    const merchant = merchants.get(req.params.id);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    merchantInventory.set(merchant.id, {
      ...merchantInventory.get(merchant.id),
      ...req.body
    });

    res.json(merchantInventory.get(merchant.id));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Update pricing strategy
 * PUT /api/merchants/:id/pricing
 */
app.put('/api/merchants/:id/pricing',requireAuth,  (req, res) => {
  try {
    const merchant = merchants.get(req.params.id);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    merchantPricing.set(merchant.id, {
      ...merchant.pricing,
      ...req.body
    });

    res.json(merchantPricing.get(merchant.id));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get all merchants
 * GET /api/merchants
 */
app.get('/api/merchants', (req, res) => {
  const { industry, status } = req.query;

  let result = Array.from(merchants.values());

  if (industry) {
    result = result.filter(m => m.industry === industry);
  }
  if (status) {
    result = result.filter(m => m.status === status);
  }

  res.json({
    total: result.length,
    merchants: result
  });
});

// Start server
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           SUTAR OS - Merchant AI Agents                       ║
║                 Version 1.0.0                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                   ║
║  Status: RUNNING                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Industry Templates:                                          ║
║    Restaurant AI → Menu, Reservations, Delivery               ║
║    Hotel AI     → Rooms, Booking, Services                   ║
║    Retail AI    → Products, Shipping, Returns                ║
║    Healthcare AI→ Appointments, Consultations               ║
║    Travel AI    → Bookings, Cancellations, Refunds          ║
║    + 17 more industries...                                    ║
╠══════════════════════════════════════════════════════════════╣
║  Agent Capabilities:                                         ║
║    • Autonomous negotiation with buyers                     ║
║    • Dynamic pricing & margins                              ║
║    • Order processing & fulfillment                         ║
║    • Inventory management                                    ║
║    • Customer support automation                            ║
║    • Returns & refunds handling                             ║
╠══════════════════════════════════════════════════════════════╣
║  API Endpoints:                                               ║
║    POST   /api/merchants              Create merchant         ║
║    POST   /api/merchants/restaurant  Restaurant AI           ║
║    POST   /api/merchants/hotel       Hotel AI               ║
║    POST   /api/merchants/retail      Retail AI              ║
║    GET    /api/merchants/:id         Get merchant           ║
║    POST   /api/merchants/:id/message Handle ACP message    ║
║    GET    /api/merchants/:id/orders  Get orders             ║
║    GET    /api/merchants/:id/stats   Get stats             ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

module.exports = app;
