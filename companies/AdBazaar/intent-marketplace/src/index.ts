/**
 * Intent Marketplace
 *
 * Buy and sell intent-based audience segments.
 * Enables advertisers to target users based on their real-time purchase intent.
 *
 * Features:
 * - Pre-built intent segments
 * - Custom segment creation
 * - Real-time bidding on segments
 * - Performance analytics
 * - Seller dashboard
 *
 * Port: 4802
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import promClient from 'prom-client';

promClient.collectDefaultMetrics();
dotenv.config();

const app: Express = express();
const PORT = parseInt(process.env.PORT || '4802', 10);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Health
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'intent-marketplace',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/live', (_req, res) => {
  res.json({ status: 'alive' });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// API Info
app.get('/api', (_req, res) => {
  res.json({
    name: 'Intent Marketplace',
    version: '1.0.0',
    description: 'Buy and sell intent-based audience segments',
    endpoints: {
      segments: '/api/segments',
      purchase: '/api/purchase',
      seller: '/api/seller',
      bid: '/api/bid'
    }
  });
});

// ============================================================================
// PRE-BUILT INTENT SEGMENTS
// ============================================================================

const INTENT_SEGMENTS = [
  {
    id: 'intent_dining_search',
    name: 'Dining Intent',
    category: 'DINING',
    description: 'Users actively searching for restaurants and food',
    type: 'search_intent',
    size: 2500000,
    quality: 92,
    conversionRate: 7.8,
    avgOrderValue: 650,
    pricing: { cpm: 2.00, minBudget: 500, model: 'cpm' },
    signals: ['restaurant_search', 'food_delivery_search', 'cuisine_browsing'],
    demographics: { '25-34': 40, '35-44': 30, '18-24': 20, '45+': 10 },
    topLocations: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad']
  },
  {
    id: 'intent_travel_booking',
    name: 'Travel Intent',
    category: 'TRAVEL',
    description: 'Users researching or booking travel services',
    type: 'purchase_intent',
    size: 1200000,
    quality: 95,
    conversionRate: 9.2,
    avgOrderValue: 2800,
    pricing: { cpm: 3.50, minBudget: 1000, model: 'cpm' },
    signals: ['flight_search', 'hotel_search', 'holiday_package_browsing'],
    demographics: { '25-34': 45, '35-44': 35, '18-24': 10, '45+': 10 },
    topLocations: ['Mumbai', 'Delhi', 'Bangalore']
  },
  {
    id: 'intent_retail_shopper',
    name: 'Active Shoppers',
    category: 'RETAIL',
    description: 'Users actively browsing and comparing products',
    type: 'browse_intent',
    size: 3500000,
    quality: 88,
    conversionRate: 5.5,
    avgOrderValue: 1200,
    pricing: { cpm: 1.75, minBudget: 400, model: 'cpm' },
    signals: ['product_search', 'comparison_browsing', 'price_tracking'],
    demographics: { '25-34': 42, '35-44': 28, '18-24': 20, '45+': 10 },
    topLocations: ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Chennai']
  },
  {
    id: 'intent_healthcare_seeker',
    name: 'Healthcare Intent',
    category: 'HEALTHCARE',
    description: 'Users researching health services and products',
    type: 'research_intent',
    size: 800000,
    quality: 90,
    conversionRate: 6.8,
    avgOrderValue: 1500,
    pricing: { cpm: 2.25, minBudget: 600, model: 'cpm' },
    signals: ['doctor_search', 'clinic_browsing', 'medicine_search'],
    demographics: { '25-34': 30, '35-44': 35, '45+': 35 },
    topLocations: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai']
  },
  {
    id: 'intent_reengage_winback',
    name: 'Win-Back Candidates',
    category: 'RE_ENGAGE',
    description: 'Lapsed users showing re-engagement signals',
    type: 'reengagement_intent',
    size: 5000000,
    quality: 72,
    conversionRate: 3.2,
    avgOrderValue: 800,
    pricing: { cpm: 0.75, minBudget: 250, model: 'cpm' },
    signals: ['return_visit', 'app_open', 'browsing_past_category'],
    demographics: { '25-34': 35, '35-44': 30, '18-24': 15, '45+': 20 },
    topLocations: ['All India']
  },
  {
    id: 'intent_near_purchase',
    name: 'Near Purchase',
    category: 'CONVERSION',
    description: 'High-intent users who started checkout or added to cart',
    type: 'high_intent',
    size: 600000,
    quality: 98,
    conversionRate: 15.5,
    avgOrderValue: 2200,
    pricing: { cpm: 5.00, minBudget: 2000, model: 'cpm' },
    signals: ['checkout_start', 'cart_add', 'high_value_search'],
    demographics: { '25-34': 48, '35-44': 32, '18-24': 12, '45+': 8 },
    topLocations: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai']
  },
  {
    id: 'intent_loyalty_high_value',
    name: 'High-Value Loyal',
    category: 'LOYALTY',
    description: 'Repeat customers with high lifetime value',
    type: 'loyalty_intent',
    size: 450000,
    quality: 96,
    conversionRate: 12.0,
    avgOrderValue: 3500,
    pricing: { cpm: 4.50, minBudget: 1500, model: 'cpm' },
    signals: ['repeat_purchase', 'loyalty_program', 'high_frequency'],
    demographics: { '25-34': 35, '35-44': 40, '45+': 25 },
    topLocations: ['Mumbai', 'Delhi', 'Bangalore']
  },
  {
    id: 'intent_first_time_buyer',
    name: 'First-Time Buyers',
    category: 'ACQUISITION',
    description: 'New users showing first purchase signals',
    type: 'acquisition_intent',
    size: 1800000,
    quality: 82,
    conversionRate: 4.5,
    avgOrderValue: 600,
    pricing: { cpm: 1.25, minBudget: 350, model: 'cpm' },
    signals: ['new_registration', 'first_browse', 'comparison_shopping'],
    demographics: { '18-24': 50, '25-34': 35, '35-44': 10, '45+': 5 },
    topLocations: ['Tier 2 Cities', 'Mumbai', 'Delhi', 'Bangalore']
  }
];

// ============================================================================
// SEGMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/segments
 * List available intent segments
 */
app.get('/api/segments', (req, res) => {
  const { category, type, minQuality, maxPrice, search } = req.query;

  let segments = [...INTENT_SEGMENTS];

  if (category) {
    segments = segments.filter(s => s.category === category);
  }
  if (type) {
    segments = segments.filter(s => s.type === type);
  }
  if (minQuality) {
    segments = segments.filter(s => s.quality >= Number(minQuality));
  }
  if (maxPrice) {
    segments = segments.filter(s => s.pricing.cpm <= Number(maxPrice));
  }
  if (search) {
    const q = (search as string).toLowerCase();
    segments = segments.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  }

  res.json({
    success: true,
    data: {
      segments: segments.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        type: s.type,
        description: s.description,
        size: s.size,
        quality: s.quality,
        conversionRate: s.conversionRate,
        pricing: s.pricing,
        topLocations: s.topLocations
      })),
      count: segments.length,
      totalAvailable: INTENT_SEGMENTS.length
    }
  });
});

/**
 * GET /api/segments/:segmentId
 * Get segment details
 */
app.get('/api/segments/:segmentId', (req, res) => {
  const { segmentId } = req.params;
  const segment = INTENT_SEGMENTS.find(s => s.id === segmentId);

  if (!segment) {
    res.status(404).json({ success: false, error: 'Segment not found' });
    return;
  }

  res.json({ success: true, data: segment });
});

/**
 * POST /api/segments/recommend
 * Get AI-recommended segments for campaign
 */
app.post('/api/segments/recommend', (req, res) => {
  const { campaignObjective, targetAudience, budget } = req.body;

  // Filter segments based on objective
  let recommended = [...INTENT_SEGMENTS];

  if (campaignObjective === 'conversion') {
    recommended = recommended.filter(s => s.type === 'high_intent' || s.type === 'purchase_intent');
  } else if (campaignObjective === 'awareness') {
    recommended = recommended.filter(s => s.type === 'browse_intent');
  } else if (campaignObjective === 'retention') {
    recommended = recommended.filter(s => s.type === 'loyalty_intent' || s.type === 'reengagement_intent');
  }

  // Score and rank
  recommended = recommended.map(s => ({
    ...s,
    matchScore: Math.random() * 0.3 + 0.7,
    estimatedReach: Math.floor(s.size * (budget / 10000) * 0.1),
    expectedConversions: Math.floor(s.size * s.conversionRate / 100 * (budget / s.pricing.cpm / 1000))
  })).sort((a, b) => b.matchScore - a.matchScore);

  res.json({
    success: true,
    data: {
      recommendations: recommended.slice(0, 5),
      alternatives: recommended.slice(5, 10)
    }
  });
});

// ============================================================================
// PURCHASE ENDPOINTS
// ============================================================================

/**
 * POST /api/purchase
 * Purchase segment access
 */
app.post('/api/purchase', (req, res) => {
  const { segmentId, quantity, campaignId, pricingModel } = req.body;

  if (!segmentId) {
    res.status(400).json({ success: false, error: 'segmentId required' });
    return;
  }

  const segment = INTENT_SEGMENTS.find(s => s.id === segmentId);
  if (!segment) {
    res.status(404).json({ success: false, error: 'Segment not found' });
    return;
  }

  const qty = quantity || 10000;
  const model = pricingModel || segment.pricing.model;
  const totalCost = model === 'cpm' ? (qty / 1000) * segment.pricing.cpm : qty * segment.pricing.cpm;

  const purchase = {
    purchaseId: `pur_${Date.now()}`,
    segmentId,
    segmentName: segment.name,
    quantity: qty,
    pricingModel: model,
    unitPrice: segment.pricing.cpm,
    totalCost: totalCost.toFixed(2),
    campaignId,
    status: 'active',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };

  res.status(201).json({ success: true, data: purchase });
});

/**
 * GET /api/purchase/:purchaseId
 * Get purchase details
 */
app.get('/api/purchase/:purchaseId', (req, res) => {
  const { purchaseId } = req.params;

  const purchase = {
    purchaseId,
    segmentId: 'intent_dining_search',
    segmentName: 'Dining Intent',
    quantity: 10000,
    totalCost: '20.00',
    status: 'active',
    usage: {
      impressions: 2500,
      conversions: 195,
      conversionRate: 7.8,
      spend: 5.00,
      remaining: 7500
    }
  };

  res.json({ success: true, data: purchase });
});

// ============================================================================
// BIDDING ENDPOINTS
// ============================================================================

/**
 * POST /api/bid
 * Place real-time bid on segment
 */
app.post('/api/bid', (req, res) => {
  const { segmentId, bidAmount, targeting, campaignId } = req.body;

  if (!segmentId || !bidAmount) {
    res.status(400).json({ success: false, error: 'segmentId and bidAmount required' });
    return;
  }

  if (bidAmount < 0.5) {
    res.status(400).json({ success: false, error: 'Minimum bid is 0.5 INR CPM' });
    return;
  }

  const auctionId = `auc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  res.json({
    success: true,
    data: {
      auctionId,
      segmentId,
      bidAmount,
      status: 'pending',
      estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  });
});

/**
 * GET /api/bid/:auctionId
 * Get auction status
 */
app.get('/api/bid/:auctionId', (req, res) => {
  const { auctionId } = req.params;

  res.json({
    success: true,
    data: {
      auctionId,
      status: 'active',
      currentBid: 1.50,
      bidCount: 5,
      estimatedReach: 50000,
      deliveryProgress: 45
    }
  });
});

// ============================================================================
// SELLER ENDPOINTS
// ============================================================================

/**
 * GET /api/seller/segments
 * List seller's segments
 */
app.get('/api/seller/segments', (req, res) => {
  const sellerSegments = [
    {
      segmentId: 'custom_dining_mumbai',
      name: 'Mumbai Dining Enthusiasts',
      category: 'DINING',
      size: 150000,
      quality: 88,
      status: 'active',
      revenue: 12500,
      buyers: 12
    }
  ];

  res.json({
    success: true,
    data: {
      segments: sellerSegments,
      totalRevenue: 12500,
      totalBuyers: 12
    }
  });
});

/**
 * POST /api/seller/segments
 * Create custom segment for sale
 */
app.post('/api/seller/segments', (req, res) => {
  const { name, criteria, pricing } = req.body;

  if (!name || !criteria) {
    res.status(400).json({ success: false, error: 'name and criteria required' });
    return;
  }

  const segment = {
    segmentId: `custom_${Date.now()}`,
    name,
    category: criteria.category || 'CUSTOM',
    size: Math.floor(Math.random() * 100000) + 10000,
    quality: 75 + Math.floor(Math.random() * 20),
    status: 'pending_approval',
    criteria,
    pricing: pricing || { cpm: 1.50, minBudget: 300 },
    createdAt: new Date().toISOString()
  };

  res.status(201).json({ success: true, data: segment });
});

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/analytics/marketplace
 * Get marketplace analytics
 */
app.get('/api/analytics/marketplace', (req, res) => {
  res.json({
    success: true,
    data: {
      totalSegments: INTENT_SEGMENTS.length,
      totalReach: INTENT_SEGMENTS.reduce((sum, s) => sum + s.size, 0),
      avgQuality: INTENT_SEGMENTS.reduce((sum, s) => sum + s.quality, 0) / INTENT_SEGMENTS.length,
      totalTransactions: 1250,
      totalRevenue: 125000,
      topCategories: [
        { category: 'DINING', segments: 2, revenue: 45000 },
        { category: 'TRAVEL', segments: 1, revenue: 35000 },
        { category: 'RETAIL', segments: 1, revenue: 25000 }
      ]
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║     Intent Marketplace v1.0.0                    ║
║  Port: ${PORT}                                           ║
║  Features:                                       ║
║  • Intent-based segments                        ║
║  • Real-time bidding                           ║
║  • Seller dashboard                           ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
