/**
 * Genie Shopping Agent
 *
 * Personal AI agent that shops on behalf of the consumer.
 * Handles product discovery, price negotiation, order placement, and tracking.
 *
 * Features:
 * - Natural language shopping requests
 * - Multi-merchant comparison
 * - Autonomous negotiation
 * - Smart product matching
 * - Budget management
 * - Purchase history & preferences
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4716;

// Service URLs
const ACN_NETWORK_URL = process.env.ACN_NETWORK_URL || 'http://localhost:4801';
const ACP_PROTOCOL_URL = process.env.ACP_PROTOCOL_URL || 'http://localhost:4800';

// In-memory stores
const shoppingSessions = new Map();
const purchaseHistory = new Map();
const wishlists = new Map();
const priceAlerts = new Map();
const userPreferences = new Map();

// Shopping states
const SHOPPING_STATES = {
  IDLE: 'idle',
  SEARCHING: 'searching',
  COMPARING: 'comparing',
  NEGOTIATING: 'negotiating',
  ORDERING: 'ordering',
  TRACKING: 'tracking',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

/**
 * User profile with shopping preferences
 */
function createUserProfile(userId, preferences = {}) {
  return {
    userId,
    shoppingProfile: {
      style: preferences.style || 'smart',  // smart, budget, luxury
      negotiationLevel: preferences.negotiationLevel || 'moderate',  // none, light, moderate, aggressive
      preferredCategories: preferences.preferredCategories || [],
      preferredBrands: preferences.preferredBrands || [],
      sizePreferences: preferences.sizePreferences || {},
      dietaryRestrictions: preferences.dietaryRestrictions || []
    },
    budget: {
      daily: preferences.budget?.daily || 100,
      monthly: preferences.budget?.monthly || 1000,
      categoryLimits: preferences.budget?.categoryLimits || {}
    },
    notificationPrefs: {
      priceDrops: preferences.notificationPrefs?.priceDrops ?? true,
      orderUpdates: preferences.notificationPrefs?.orderUpdates ?? true,
      recommendations: preferences.notificationPrefs?.recommendations ?? true
    },
    paymentMethods: preferences.paymentMethods || [],
    shippingAddresses: preferences.shippingAddresses || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Create a shopping session
 */
function createShoppingSession(userId, request) {
  const session = {
    id: uuidv4(),
    userId,
    request: {
      type: request.type || 'general',  // general, specific, budget, urgent
      intent: request.intent,
      description: request.description,
      constraints: {
        maxPrice: request.maxPrice,
        minPrice: request.minPrice,
        preferredBrands: request.preferredBrands,
        categories: request.categories,
        location: request.location,
        deadline: request.deadline
      },
      preferences: request.preferences || {}
    },
    state: SHOPPING_STATES.IDLE,
    products: [],
    merchants: [],
    negotiations: [],
    currentStep: 0,
    recommendations: [],
    selectedProduct: null,
    selectedMerchant: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  shoppingSessions.set(session.id, session);
  return session;
}

/**
 * Parse natural language shopping request
 */
function parseShoppingIntent(userMessage) {
  // Simple intent parsing - in production use NLP
  const lowerMsg = userMessage.toLowerCase();

  // Detect intent
  let intent = 'general';
  if (lowerMsg.includes('buy') || lowerMsg.includes('purchase')) {
    intent = 'purchase';
  } else if (lowerMsg.includes('find') || lowerMsg.includes('search')) {
    intent = 'search';
  } else if (lowerMsg.includes('compare') || lowerMsg.includes('best')) {
    intent = 'compare';
  } else if (lowerMsg.includes('negotiate') || lowerMsg.includes('deal')) {
    intent = 'negotiate';
  } else if (lowerMsg.includes('track') || lowerMsg.includes('where')) {
    intent = 'track';
  }

  // Detect urgency
  let urgency = 'normal';
  if (lowerMsg.includes('urgent') || lowerMsg.includes('asap') || lowerMsg.includes('now')) {
    urgency = 'urgent';
  } else if (lowerMsg.includes('when') || lowerMsg.includes('later') || lowerMsg.includes('sometime')) {
    urgency = 'low';
  }

  // Extract price range
  const priceMatch = userMessage.match(/\$?([\d,]+(?:\.\d{2})?)/);
  const maxPrice = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : null;

  // Extract keywords
  const keywords = userMessage
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(' ')
    .filter(w => w.length > 2);

  return {
    intent,
    urgency,
    maxPrice,
    keywords,
    rawMessage: userMessage
  };
}

/**
 * Search for products matching request
 */
async function searchProducts(session) {
  const { keywords, maxPrice, constraints } = session.request;

  // In production, this would query actual product databases
  // For now, simulate product search results
  const mockProducts = [
    {
      id: uuidv4(),
      name: `${keywords[0] || 'Product'} - Premium Model`,
      description: `High-quality ${keywords[0] || 'product'} with excellent features`,
      price: maxPrice ? maxPrice * 0.9 : 299.99,
      originalPrice: maxPrice ? maxPrice * 1.2 : 399.99,
      merchant: 'tech-store-ai',
      merchantName: 'Tech Store',
      rating: 4.5,
      reviews: 234,
      availability: 'in_stock',
      shipping: 'free',
      deliveryDays: 2,
      categories: keywords,
      images: ['https://placeholder.com/product1.jpg']
    },
    {
      id: uuidv4(),
      name: `${keywords[0] || 'Product'} - Standard Model`,
      description: `Reliable ${keywords[0] || 'product'} at great value`,
      price: maxPrice ? maxPrice * 0.7 : 199.99,
      originalPrice: maxPrice ? maxPrice * 0.9 : 249.99,
      merchant: ' bargain-depot-ai',
      merchantName: 'Bargain Depot',
      rating: 4.2,
      reviews: 567,
      availability: 'in_stock',
      shipping: 5.99,
      deliveryDays: 4,
      categories: keywords,
      images: ['https://placeholder.com/product2.jpg']
    },
    {
      id: uuidv4(),
      name: `${keywords[0] || 'Product'} - Economy Model`,
      description: `Budget-friendly ${keywords[0] || 'product'}`,
      price: maxPrice ? maxPrice * 0.5 : 99.99,
      originalPrice: maxPrice ? maxPrice * 0.7 : 149.99,
      merchant: 'discount-mart-ai',
      merchantName: 'Discount Mart',
      rating: 3.8,
      reviews: 1234,
      availability: 'limited',
      shipping: 9.99,
      deliveryDays: 5,
      categories: keywords,
      images: ['https://placeholder.com/product3.jpg']
    }
  ];

  session.products = mockProducts;
  session.state = SHOPPING_STATES.COMPARING;
  session.updatedAt = new Date().toISOString();

  shoppingSessions.set(session.id, session);
  return mockProducts;
}

/**
 * Find best merchants for a product
 */
async function findBestMerchants(productId, criteria) {
  // In production, query ACN Network for merchant agents
  return [
    {
      id: 'merchant-1',
      name: 'Tech Store',
      agentId: 'tech-store-ai',
      industry: 'retail',
      rating: 4.7,
      transactions: 5000,
      responseTime: 2,
      price: 299.99,
      shipping: 0,
      deliveryDays: 2,
      returnPolicy: '30 days',
      verified: true,
      tier: 'pro'
    },
    {
      id: 'merchant-2',
      name: 'Bargain Depot',
      agentId: 'bargain-depot-ai',
      industry: 'retail',
      rating: 4.3,
      transactions: 12000,
      responseTime: 5,
      price: 279.99,
      shipping: 5.99,
      deliveryDays: 4,
      returnPolicy: '15 days',
      verified: true,
      tier: 'basic'
    }
  ];
}

/**
 * Start negotiation with merchant
 */
async function startNegotiation(session, merchantId, targetPrice) {
  const negotiation = {
    id: uuidv4(),
    sessionId: session.id,
    merchantId,
    productId: session.selectedProduct?.id,
    initialRequest: {
      targetPrice: targetPrice || session.selectedProduct.price * 0.85,
      quantity: 1,
      deliveryDate: session.request.constraints.deadline
    },
    currentOffer: null,
    offers: [],
    status: 'initiated',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
  };

  session.negotiations.push(negotiation);
  session.state = SHOPPING_STATES.NEGOTIATING;
  session.updatedAt = new Date().toISOString();

  shoppingSessions.set(session.id, session);
  return negotiation;
}

/**
 * Process counter-offer from merchant
 */
async function processCounterOffer(negotiationId, counterOffer) {
  const session = Array.from(shoppingSessions.values()).find(
    s => s.negotiations.some(n => n.id === negotiationId)
  );

  if (!session) {
    throw new Error('Negotiation not found');
  }

  const negotiation = session.negotiations.find(n => n.id === negotiationId);
  negotiation.currentOffer = counterOffer;
  negotiation.offers.push({
    type: 'merchant',
    price: counterOffer.price,
    timestamp: new Date().toISOString()
  });

  // Decide whether to accept, counter, or reject
  const decision = decideNegotiationAction(negotiation, session.userId);

  shoppingSessions.set(session.id, session);

  return {
    negotiation,
    decision
  };
}

/**
 * Decide negotiation action based on user preferences
 */
function decideNegotiationAction(negotiation, userId) {
  const profile = userPreferences.get(userId) || createUserProfile(userId);
  const { currentOffer, initialRequest } = negotiation;

  if (!currentOffer) {
    return { action: 'waiting', message: 'Waiting for merchant response' };
  }

  const targetPrice = initialRequest.targetPrice;
  const offerPrice = currentOffer.price;

  // Calculate how close we are to target
  const percentFromTarget = ((offerPrice - targetPrice) / targetPrice) * 100;

  if (percentFromTarget <= 5) {
    // Very close to target - recommend accept
    return {
      action: 'recommend_accept',
      message: `Price is only ${percentFromTarget.toFixed(1)}% above your target. Should I accept?`,
      reasoning: 'Great deal - very close to target price'
    };
  } else if (percentFromTarget <= 15) {
    // Reasonable - suggest small counter
    const counterPrice = offerPrice * 0.95;
    return {
      action: 'counter',
      counterPrice,
      message: `Price is ${percentFromTarget.toFixed(1)}% above target. Counter at $${counterPrice.toFixed(2)}?`,
      reasoning: 'Room for small negotiation'
    };
  } else if (profile.shoppingProfile.negotiationLevel === 'aggressive') {
    // Aggressive negotiation
    const counterPrice = targetPrice;
    return {
      action: 'counter',
      counterPrice,
      message: `Let me try for your target price of $${targetPrice.toFixed(2)}`,
      reasoning: 'Aggressive negotiation per your settings'
    };
  } else {
    // Suggest rejecting and trying another merchant
    return {
      action: 'recommend_reject',
      message: `Price is too high (${percentFromTarget.toFixed(1)}% above target). Should I try another merchant?`,
      reasoning: 'Better options available elsewhere'
    };
  }
}

/**
 * Place order with merchant
 */
async function placeOrder(session, paymentDetails) {
  const { selectedMerchant, selectedProduct, negotiations } = session;

  const order = {
    id: `ORD-${Date.now()}`,
    sessionId: session.id,
    product: selectedProduct,
    merchant: selectedMerchant,
    negotiation: negotiations.find(n => n.status === 'agreed'),
    total: selectedProduct.price + (selectedProduct.shipping || 0),
    payment: paymentDetails,
    shippingAddress: paymentDetails.shippingAddress,
    status: 'confirmed',
    tracking: {
      steps: [
        { name: 'Order Placed', status: 'completed', timestamp: new Date().toISOString() },
        { name: 'Processing', status: 'pending' },
        { name: 'Shipped', status: 'pending' },
        { name: 'Delivered', status: 'pending' }
      ]
    },
    createdAt: new Date().toISOString()
  };

  session.orders = session.orders || [];
  session.orders.push(order);
  session.state = SHOPPING_STATES.ORDERING;
  session.updatedAt = new Date().toISOString();

  shoppingSessions.set(session.id, session);

  // Add to purchase history
  const history = purchaseHistory.get(session.userId) || [];
  history.unshift(order);
  purchaseHistory.set(session.userId, history);

  return order;
}

/**
 * Track order status
 */
async function trackOrder(orderId, userId) {
  const history = purchaseHistory.get(userId) || [];
  const order = history.find(o => o.id === orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  // Simulate tracking update
  order.tracking.lastUpdated = new Date().toISOString();
  purchaseHistory.set(userId, history);

  return order.tracking;
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    service: 'Genie Shopping Agent',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    capabilities: [
      'product_search',
      'price_comparison',
      'autonomous_negotiation',
      'order_placement',
      'order_tracking',
      'returns_management',
      'price_monitoring',
      'smart_recommendations'
    ]
  });
});

/**
 * Process shopping request (main endpoint)
 * POST /api/shop
 */
app.post('/api/shop', async (req, res) => {
  try {
    const { userId, message, request } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get or create user profile
    let profile = userPreferences.get(userId);
    if (!profile) {
      profile = createUserProfile(userId);
      userPreferences.set(userId, profile);
    }

    // Parse intent from natural language or structured request
    const intent = message
      ? parseShoppingIntent(message)
      : { intent: request?.intent, constraints: request?.constraints };

    // Create shopping session
    const session = createShoppingSession(userId, {
      type: intent.intent,
      intent: message || request?.description,
      description: message,
      ...intent
    });

    // Process based on intent
    let response = { session };

    if (intent.intent === 'track') {
      // Handle tracking request
      session.state = SHOPPING_STATES.TRACKING;
      const history = purchaseHistory.get(userId) || [];
      response.tracking = history.slice(0, 5);
    } else if (['purchase', 'search', 'compare', 'general'].includes(intent.intent)) {
      // Search for products
      session.state = SHOPPING_STATES.SEARCHING;
      const products = await searchProducts(session);
      response.products = products;

      // Find best merchants for top product
      if (products.length > 0) {
        const merchants = await findBestMerchants(products[0].id, intent);
        session.merchants = merchants;
        response.merchants = merchants;

        // Generate recommendations
        response.recommendation = generateRecommendation(products, merchants, profile);
      }
    }

    shoppingSessions.set(session.id, session);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start negotiation with merchant
 * POST /api/negotiate
 */
app.post('/api/negotiate', async (req, res) => {
  try {
    const { sessionId, merchantId, targetPrice } = req.body;

    const session = shoppingSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Set selected merchant
    session.selectedMerchant = session.merchants.find(m => m.id === merchantId);
    session.selectedProduct = session.products[0]; // For demo

    const negotiation = await startNegotiation(session, merchantId, targetPrice);

    res.json({
      negotiation,
      message: `Negotiation started with ${session.selectedMerchant.name}`,
      nextSteps: [
        'Send QUERY to merchant',
        'Receive QUOTE from merchant',
        'Negotiate with COUNTER offers',
        'ACCEPT when terms are right',
        'Place ORDER'
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Process counter-offer
 * POST /api/negotiate/:id/counter
 */
app.post('/api/negotiate/:id/counter', async (req, res) => {
  try {
    const { counterPrice, accept, reject } = req.body;

    const result = await processCounterOffer(req.params.id, { price: counterPrice });

    if (result.decision.action === 'counter') {
      // Send counter to merchant
      result.negotiation.offers.push({
        type: 'user',
        price: result.decision.counterPrice,
        timestamp: new Date().toISOString()
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Accept negotiation and place order
 * POST /api/order
 */
app.post('/api/order', async (req, res) => {
  try {
    const { sessionId, paymentDetails } = req.body;

    const session = shoppingSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.state !== SHOPPING_STATES.NEGOTIATING) {
      return res.status(400).json({
        error: 'Cannot place order - negotiation not in progress',
        currentState: session.state
      });
    }

    const order = await placeOrder(session, paymentDetails);

    res.json({
      order,
      message: 'Order placed successfully!',
      tracking: order.tracking
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Track order
 * GET /api/track/:orderId
 */
app.get('/api/track/:orderId', async (req, res) => {
  try {
    // Note: In production, get userId from auth token
    const { userId } = req.query;
    const tracking = await trackOrder(req.params.orderId, userId || 'demo');
    res.json(tracking);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * Get shopping session
 * GET /api/sessions/:id
 */
app.get('/api/sessions/:id', (req, res) => {
  const session = shoppingSessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

/**
 * Get user's purchase history
 * GET /api/history/:userId
 */
app.get('/api/history/:userId', (req, res) => {
  const history = purchaseHistory.get(req.params.userId) || [];
  res.json({
    total: history.length,
    orders: history
  });
});

/**
 * Add to wishlist
 * POST /api/wishlist
 */
app.post('/api/wishlist', (req, res) => {
  try {
    const { userId, product } = req.body;

    const wishlist = wishlists.get(userId) || [];
    wishlist.push({
      id: uuidv4(),
      product,
      addedAt: new Date().toISOString(),
      priceAtAdd: product.price,
      notifyPriceDrop: true
    });

    wishlists.set(userId, wishlist);
    res.json({ wishlist });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get wishlist
 * GET /api/wishlist/:userId
 */
app.get('/api/wishlist/:userId', (req, res) => {
  const wishlist = wishlists.get(req.params.userId) || [];
  res.json({ wishlist });
});

/**
 * Set price alert
 * POST /api/alerts
 */
app.post('/api/alerts', (req, res) => {
  try {
    const { userId, productId, targetPrice, currentPrice } = req.body;

    const alerts = priceAlerts.get(userId) || [];
    alerts.push({
      id: uuidv4(),
      productId,
      targetPrice,
      currentPrice,
      createdAt: new Date().toISOString(),
      triggered: false
    });

    priceAlerts.set(userId, alerts);
    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user preferences
 * GET /api/preferences/:userId
 */
app.get('/api/preferences/:userId', (req, res) => {
  const profile = userPreferences.get(req.params.userId);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  res.json(profile);
});

/**
 * Update user preferences
 * PUT /api/preferences/:userId
 */
app.put('/api/preferences/:userId', (req, res) => {
  try {
    let profile = userPreferences.get(req.params.userId);
    if (!profile) {
      profile = createUserProfile(req.params.userId);
    }

    profile = {
      ...profile,
      ...req.body,
      userId: req.params.userId,
      updatedAt: new Date().toISOString()
    };

    userPreferences.set(req.params.userId, profile);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get shopping recommendations
 * GET /api/recommendations/:userId
 */
app.get('/api/recommendations/:userId', (req, res) => {
  const profile = userPreferences.get(req.params.userId);
  const history = purchaseHistory.get(req.params.userId) || [];

  // Generate smart recommendations based on history and preferences
  const recommendations = [
    {
      type: 'repeat',
      reason: 'You bought this before',
      products: history.slice(0, 3).map(o => o.product)
    },
    {
      type: 'similar',
      reason: 'Based on your browsing',
      products: [
        { name: 'Wireless Earbuds Pro', price: 79.99, match: 92 },
        { name: 'Phone Case Premium', price: 24.99, match: 88 }
      ]
    },
    {
      type: 'trending',
      reason: 'Popular in your area',
      products: [
        { name: 'Smart Watch Series 5', price: 199.99, trending: true },
        { name: 'Portable Charger 20000mAh', price: 39.99, trending: true }
      ]
    }
  ];

  res.json({ recommendations });
});

/**
 * Generate recommendation based on products, merchants, and profile
 */
function generateRecommendation(products, merchants, profile) {
  // Score each option
  const scored = products.map(product => {
    const merchant = merchants.find(m => m.merchant === product.merchant);
    let score = 0;

    // Price score (lower is better)
    const avgPrice = products.reduce((sum, p) => sum + p.price, 0) / products.length;
    if (product.price < avgPrice) score += 30;
    else score += 20;

    // Rating score
    score += product.rating * 10;

    // Shipping score
    if (product.shipping === 0) score += 15;
    else score += 5;

    // Delivery speed score
    if (product.deliveryDays <= 2) score += 10;
    else if (product.deliveryDays <= 4) score += 5;

    // Merchant score
    if (merchant) {
      score += merchant.rating * 5;
      if (merchant.verified) score += 5;
    }

    return { product, score, merchant };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  return {
    recommended: best.product,
    merchant: best.merchant,
    score: best.score,
    reasoning: `Best value at $${best.product.price} with ${best.product.rating}★ rating and ${best.product.deliveryDays}-day delivery`,
    alternatives: scored.slice(1, 3).map(s => ({
      product: s.product,
      reason: `$${s.product.price} - ${s.product.name}`
    }))
  };
}

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           GENIE SHOPPING AGENT v1.0.0                         ║
║        Your Personal AI Shopping Assistant                    ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                   ║
║  Status: RUNNING                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Capabilities:                                               ║
║    • Natural language shopping requests                      ║
║    • Multi-merchant product search                           ║
║    • Price comparison & negotiation                          ║
║    • Autonomous deal closing                                ║
║    • Order tracking & management                            ║
║    • Price alerts & wishlists                              ║
║    • Smart recommendations                                   ║
╠══════════════════════════════════════════════════════════════╣
║  Example Requests:                                          ║
║    "Find me a laptop under $1000"                           ║
║    "Compare prices for wireless headphones"                  ║
║    "Buy the cheapest running shoes with free shipping"       ║
║    "Track my recent order"                                  ║
╠══════════════════════════════════════════════════════════════╣
║  API Endpoints:                                               ║
║    POST   /api/shop              Start shopping              ║
║    POST   /api/negotiate         Start negotiation           ║
║    POST   /api/order             Place order                ║
║    GET    /api/track/:orderId    Track order                ║
║    GET    /api/history/:userId   Purchase history           ║
║    POST   /api/wishlist          Add to wishlist            ║
║    GET    /api/recommendations/:userId  Get recommendations ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
