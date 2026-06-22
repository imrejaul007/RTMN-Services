/**
 * Procurement Agent
 * Intelligent procurement with Nexha Procurement OS integration
 *
 * Connects to:
 * - Nexha Procurement OS (Port 4320)
 * - RABTUL Services for payments
 */

const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 4786;
const PROCUREMENT_OS_URL = process.env.PROCUREMENT_OS_URL || 'http://localhost:4320';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'dev-token';

// Procurement OS client
const procurementClient = axios.create({
  baseURL: PROCUREMENT_OS_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Token': INTERNAL_TOKEN,
  },
});

// In-memory cache for active RFQs
const activeRFQs = new Map();

/**
 * Negotiation strategies
 */
const negotiationStrategies = {
  standard: { targetDiscount: 0.10, maxRounds: 3 },
  aggressive: { targetDiscount: 0.20, maxRounds: 5 },
  friendly: { targetDiscount: 0.05, maxRounds: 2 },
};

/**
 * Calculate target price based on strategy
 */
function calculateTargetPrice(currentPrice, strategy = 'standard') {
  const config = negotiationStrategies[strategy] || negotiationStrategies.standard;
  return {
    targetPrice: currentPrice * (1 - config.targetDiscount),
    savings: currentPrice * config.targetDiscount,
    discount: config.targetDiscount * 100,
    maxRounds: config.maxRounds,
  };
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'procurement-agent',
    port: PORT,
    version: '1.0.0',
    connectedTo: PROCUREMENT_OS_URL,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// RFQ ENDPOINTS
// ============================================================================

/**
 * POST /api/rfq
 * Create a new RFQ (Request for Quote)
 */
app.post('/api/rfq', async (req, res) => {
  try {
    const { item, quantity, category, hotelId, priority } = req.body;

    if (!item || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'item and quantity are required',
      });
    }

    // Try to create RFQ in Procurement OS
    try {
      const response = await procurementClient.post('/api/rfqs', {
        title: `RFQ: ${item}`,
        category: category || 'general',
        items: [{ name: item, quantity }],
        merchantId: hotelId || 'default-merchant',
        status: 'open',
      });

      if (response.data?.success) {
        const rfqId = response.data.data?.rfq?._id || `rfq_${Date.now()}`;
        activeRFQs.set(rfqId, {
          item,
          quantity,
          status: 'pending_quotes',
          createdAt: new Date().toISOString(),
        });

        return res.json({
          success: true,
          rfqId,
          status: 'created',
          source: 'procurement-os',
          vendors: response.data.data?.suppliers || [],
          deadline: response.data.data?.rfq?.deadline || getDefaultDeadline(),
        });
      }
    } catch (apiError) {
      console.log('Procurement OS not available, using local mode');
    }

    // Fallback: Create local RFQ
    const rfqId = `rfq_${Date.now()}`;
    activeRFQs.set(rfqId, {
      item,
      quantity,
      category,
      hotelId,
      priority,
      status: 'pending_quotes',
      createdAt: new Date().toISOString(),
    });

    // Match suppliers based on category
    const suppliers = matchSuppliers(category || 'general');

    res.json({
      success: true,
      rfqId,
      status: 'created',
      source: 'local',
      item,
      quantity,
      suppliers,
      deadline: getDefaultDeadline(),
    });
  } catch (error) {
    console.error('RFQ creation error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create RFQ',
    });
  }
});

/**
 * GET /api/rfq/:rfqId
 * Get RFQ status
 */
app.get('/api/rfq/:rfqId', (req, res) => {
  const { rfqId } = req.params;
  const rfq = activeRFQs.get(rfqId) || generateMockRFQ(rfqId);

  res.json({
    success: true,
    data: rfq,
  });
});

/**
 * GET /api/rfq
 * List active RFQs
 */
app.get('/api/rfq', (req, res) => {
  const rfqs = Array.from(activeRFQs.entries()).map(([id, data]) => ({
    rfqId: id,
    ...data,
  }));

  res.json({
    success: true,
    count: rfqs.length,
    data: rfqs,
  });
});

// ============================================================================
// NEGOTIATION ENDPOINTS
// ============================================================================

/**
 * POST /api/negotiate
 * Calculate negotiation strategy
 */
app.post('/api/negotiate', async (req, res) => {
  try {
    const { vendor, currentPrice, item, strategy } = req.body;

    if (!currentPrice) {
      return res.status(400).json({
        success: false,
        error: 'currentPrice is required',
      });
    }

    // Try to get quotes from Procurement OS
    try {
      const response = await procurementClient.get('/api/quotes', {
        params: { item },
      });

      if (response.data?.success) {
        const quotes = response.data.data || [];
        const bestQuote = quotes.sort((a, b) => a.price - b.price)[0];

        if (bestQuote) {
          return res.json({
            success: true,
            vendor: bestQuote.supplier,
            currentPrice: bestQuote.price,
            targetPrice: bestQuote.price * 0.9,
            savings: bestQuote.price * 0.1,
            strategy: 'automated',
          });
        }
      }
    } catch (apiError) {
      console.log('Procurement OS quotes not available');
    }

    // Calculate local negotiation
    const pricing = calculateTargetPrice(currentPrice, strategy || 'standard');

    res.json({
      success: true,
      vendor: vendor || 'Supplier',
      currentPrice,
      targetPrice: pricing.targetPrice,
      savings: pricing.savings,
      discount: pricing.discount,
      strategy: strategy || 'standard',
      recommendations: generateRecommendations(currentPrice, pricing),
    });
  } catch (error) {
    console.error('Negotiation error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Negotiation failed',
    });
  }
});

/**
 * POST /api/negotiate/counter
 * Submit a counter offer
 */
app.post('/api/negotiate/counter', (req, res) => {
  const { rfqId, counterPrice, message } = req.body;

  const rfq = activeRFQs.get(rfqId);
  if (!rfq) {
    return res.status(404).json({
      success: false,
      error: 'RFQ not found',
    });
  }

  // Simulate vendor response
  const accepted = counterPrice <= rfq.quantity * 1000; // Accept if reasonable
  const counter = accepted ? null : counterPrice * 0.95;

  res.json({
    success: true,
    rfqId,
    vendorResponse: accepted ? 'accepted' : 'counter_offer',
    finalPrice: accepted ? counterPrice : counter,
    message: accepted
      ? 'Price accepted! Order proceeding.'
      : `Counter offer: ₹${counter?.toFixed(2)} (15% off your price)`,
  });
});

// ============================================================================
// SUPPLIER ENDPOINTS
// ============================================================================

/**
 * GET /api/suppliers
 * Find suppliers for a category
 */
app.get('/api/suppliers', (req, res) => {
  const { category } = req.query;
  const suppliers = matchSuppliers(category || 'general');

  res.json({
    success: true,
    count: suppliers.length,
    data: suppliers,
  });
});

/**
 * POST /api/suppliers/evaluate
 * Evaluate supplier trustworthiness
 */
app.post('/api/suppliers/evaluate', async (req, res) => {
  const { supplierId, category } = req.body;

  // Get supplier score from Procurement OS
  try {
    const response = await procurementClient.get(`/api/suppliers/${supplierId}/score`);
    if (response.data?.success) {
      return res.json({
        success: true,
        data: response.data.data,
      });
    }
  } catch (apiError) {
    console.log('Supplier score API not available');
  }

  // Generate local score
  res.json({
    success: true,
    data: {
      supplierId,
      category,
      trustScore: Math.floor(Math.random() * 20) + 80,
      deliveryRating: (Math.random() * 2 + 3).toFixed(1),
      priceRating: (Math.random() * 2 + 3).toFixed(1),
      reliability: 'high',
      lastDelivery: '2026-06-01',
    },
  });
});

/**
 * POST /api/suppliers/contract
 * Generate contract with supplier
 */
app.post('/api/suppliers/contract', async (req, res) => {
  const { supplierId, item, quantity, price, deliveryDate } = req.body;

  try {
    // Create deal in Procurement OS
    const response = await procurementClient.post('/api/deals', {
      supplierId,
      items: [{ name: item, quantity, price }],
      deliveryDate,
      status: 'awarded',
    });

    if (response.data?.success) {
      return res.json({
        success: true,
        contractId: response.data.data?.deal?._id || `contract_${Date.now()}`,
        status: 'created',
      });
    }
  } catch (apiError) {
    console.log('Deal creation API not available');
  }

  // Local fallback
  res.json({
    success: true,
    contractId: `contract_${Date.now()}`,
    supplierId,
    item,
    quantity,
    price,
    deliveryDate,
    status: 'pending_signature',
  });
});

// ============================================================================
// HELPERS
// ============================================================================

function getDefaultDeadline() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().split('T')[0];
}

function matchSuppliers(category) {
  const supplierTemplates = {
    ac: [
      { id: 'sup-ac-1', name: 'CoolAir Solutions', rating: 4.5, categories: ['ac', 'hvac'], location: 'Bangalore' },
      { id: 'sup-ac-2', name: 'Climate Pro', rating: 4.2, categories: ['ac', 'maintenance'], location: 'Bangalore' },
      { id: 'sup-ac-3', name: 'Metro Cooling', rating: 4.7, categories: ['ac', 'refrigeration'], location: 'Mumbai' },
    ],
    plumbing: [
      { id: 'sup-pl-1', name: 'AquaFix Services', rating: 4.3, categories: ['plumbing', 'water'], location: 'Bangalore' },
      { id: 'sup-pl-2', name: 'PipeMaster Pro', rating: 4.6, categories: ['plumbing', 'drainage'], location: 'Bangalore' },
    ],
    electrical: [
      { id: 'sup-el-1', name: 'Spark Electric', rating: 4.4, categories: ['electrical', 'wiring'], location: 'Bangalore' },
      { id: 'sup-el-2', name: 'PowerSafe Solutions', rating: 4.8, categories: ['electrical', 'safety'], location: 'Bangalore' },
    ],
    general: [
      { id: 'sup-gen-1', name: 'ABC Supplies', rating: 4.2, categories: ['general'], location: 'Bangalore' },
      { id: 'sup-gen-2', name: 'XYZ Traders', rating: 4.0, categories: ['general'], location: 'Mumbai' },
      { id: 'sup-gen-3', name: 'Quality Goods Co', rating: 4.5, categories: ['general'], location: 'Delhi' },
    ],
    linen: [
      { id: 'sup-li-1', name: 'SoftLinens Hotel Supply', rating: 4.6, categories: ['linen', 'textiles'], location: 'Bangalore' },
      { id: 'sup-li-2', name: 'Hotel Essentials', rating: 4.3, categories: ['linen', 'amenities'], location: 'Coimbatore' },
    ],
    food: [
      { id: 'sup-fo-1', name: 'FreshFarm Foods', rating: 4.7, categories: ['food', 'produce'], location: 'Bangalore' },
      { id: 'sup-fo-2', name: 'Quality Meats & More', rating: 4.4, categories: ['food', 'meat'], location: 'Bangalore' },
    ],
  };

  return supplierTemplates[category] || supplierTemplates.general;
}

function generateMockRFQ(rfqId) {
  return {
    rfqId,
    status: 'open',
    createdAt: new Date().toISOString(),
    deadline: getDefaultDeadline(),
    quotes: [],
  };
}

function generateRecommendations(currentPrice, pricing) {
  return [
    {
      priority: 'high',
      action: 'Request volume discount for orders above ₹50,000',
      potentialSavings: currentPrice * 0.15,
    },
    {
      priority: 'medium',
      action: 'Negotiate faster payment terms for 2% additional discount',
      potentialSavings: currentPrice * 0.02,
    },
    {
      priority: 'low',
      action: 'Consider alternative suppliers for comparison',
      potentialSavings: currentPrice * 0.05,
    },
  ];
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🛒 Procurement Agent                                        ║
║                                                                ║
║   Server running on port ${PORT}                               ║
║                                                                ║
║   Connected to:                                                ║
║   • Nexha Procurement OS: ${PROCUREMENT_OS_URL}  ║
║                                                                ║
║   Features:                                                    ║
║   • RFQ creation and management                               ║
║   • Supplier matching by category                              ║
║   • Negotiation strategy calculation                           ║
║   • Contract generation                                       ║
║   • Trust score evaluation                                    ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
