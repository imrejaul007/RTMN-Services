import cors from 'cors';
import helmet from 'helmet';
/**
 * Agent Marketplace Service
 *
 * Central marketplace where Genie consumers can browse and connect
 * with Merchant AI agents. Provides:
 * - Agent listings and profiles
 * - Search and discovery
 * - Reviews and ratings
 * - Featured agents
 * - Categories and tags
 * - Promotions and offers
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
setupSecurity(app, { serviceName: 'agent-marketplace' });

const PORT = process.env.PORT || 4845;

// Service URLs
const ACN_NETWORK_URL = process.env.ACN_NETWORK_URL || 'http://localhost:4801';
const AGENT_REPUTATION_URL = process.env.AGENT_REPUTATION_URL || 'http://localhost:4820';

// In-memory stores
const listings = new PersistentMap('listings', { serviceName: 'agent-marketplace' });
const reviews = new PersistentMap('reviews', { serviceName: 'agent-marketplace' });
const categories = new PersistentMap('categories', { serviceName: 'agent-marketplace' });
const featured = new PersistentMap('featured', { serviceName: 'agent-marketplace' });
const promotions = new PersistentMap('promotions', { serviceName: 'agent-marketplace' });
const searches = new PersistentMap('searches', { serviceName: 'agent-marketplace' });

// Categories
const DEFAULT_CATEGORIES = [
  { id: 'restaurant', name: 'Restaurants', icon: '🍽️', parent: null },
  { id: 'hotel', name: 'Hotels & Stays', icon: '🏨', parent: null },
  { id: 'retail', name: 'Retail & Shopping', icon: '🛍️', parent: null },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥', parent: null },
  { id: 'travel', name: 'Travel', icon: '✈️', parent: null },
  { id: 'fashion', name: 'Fashion', icon: '👗', parent: 'retail' },
  { id: 'electronics', name: 'Electronics', icon: '📱', parent: 'retail' },
  { id: 'grocery', name: 'Grocery', icon: '🛒', parent: 'retail' },
  { id: 'beauty', name: 'Beauty & Spa', icon: '💆', parent: null },
  { id: 'fitness', name: 'Fitness', icon: '💪', parent: null },
  { id: 'education', name: 'Education', icon: '📚', parent: null },
  { id: 'automotive', name: 'Automotive', icon: '🚗', parent: null },
  { id: 'home-services', name: 'Home Services', icon: '🏠', parent: null },
  { id: 'professional', name: 'Professional Services', icon: '💼', parent: null },
  { id: 'legal', name: 'Legal', icon: '⚖️', parent: 'professional' },
  { id: 'financial', name: 'Financial', icon: '💰', parent: 'professional' },
  { id: 'real-estate', name: 'Real Estate', icon: '🏘️', parent: null },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', parent: null },
  { id: 'events', name: 'Events', icon: '🎉', parent: 'entertainment' },
  { id: 'gaming', name: 'Gaming', icon: '🎮', parent: 'entertainment' },
  { id: 'sports', name: 'Sports', icon: '⚽', parent: null },
  { id: 'construction', name: 'Construction', icon: '🏗️', parent: null }
];

/**
 * Initialize categories
 */
DEFAULT_CATEGORIES.forEach(cat => {
  categories.set(cat.id, {
    ...cat,
    agentCount: 0,
    createdAt: new Date().toISOString()
  });
});

/**
 * Create marketplace listing
 */
function createListing(agentData) {
  const listing = {
    id: `LST-${uuidv4().substring(0, 12)}`,
    agentId: agentData.agentId,
    businessId: agentData.businessId,

    // Basic info
    name: agentData.name || agentData.businessName,
    tagline: agentData.tagline || '',
    description: agentData.description || '',
    category: agentData.category || 'retail',
    subcategory: agentData.subcategory,

    // Media
    logo: agentData.logo || 'https://placeholder.com/logo.png',
    cover: agentData.cover || 'https://placeholder.com/cover.png',
    gallery: agentData.gallery || [],

    // Contact
    location: agentData.location || {
      address: '',
      city: '',
      state: '',
      country: '',
      coordinates: null
    },

    // Service details
    serviceArea: agentData.serviceArea || 'local',
    deliveryOptions: agentData.deliveryOptions || [],
    paymentMethods: agentData.paymentMethods || ['wallet'],
    languages: agentData.languages || ['en'],
    currencies: agentData.currencies || ['USD'],

    // Operating hours
    hours: agentData.hours || {},

    // Tags
    tags: agentData.tags || [],
    specialties: agentData.specialties || [],

    // Pricing
    priceRange: agentData.priceRange || '$$',  // $, $$, $$$, $$$$
    hasPromotions: false,

    // Stats
    views: 0,
    inquiries: 0,
    bookings: 0,

    // Status
    status: 'active',  // active, paused, suspended
    featured: false,
    verified: false,
    premium: false,

    // Timestamps
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  listings.set(listing.id, listing);

  // Update category count
  if (categories.has(listing.category)) {
    const cat = categories.get(listing.category);
    cat.agentCount++;
    categories.set(listing.category, cat);
  }

  return listing;
}

/**
 * Create review
 */
function createReview(agentId, reviewData) {
  const review = {
    id: `RVW-${uuidv4().substring(0, 8)}`,
    agentId,
    listingId: reviewData.listingId,
    userId: reviewData.userId,
    userName: reviewData.userName,

    rating: reviewData.rating,  // 1-5
    title: reviewData.title,
    comment: reviewData.comment,

    // Detailed ratings
    ratings: {
      quality: reviewData.ratings?.quality || reviewData.rating,
      service: reviewData.ratings?.service || reviewData.rating,
      value: reviewData.ratings?.value || reviewData.rating,
      speed: reviewData.ratings?.speed || reviewData.rating
    },

    // Verified purchase
    verified: reviewData.verified || false,
    orderId: reviewData.orderId,

    // Helpful votes
    helpful: 0,
    notHelpful: 0,

    // Status
    status: 'published',  // published, hidden, flagged

    // Timestamps
    createdAt: new Date().toISOString()
  };

  const agentReviews = reviews.get(agentId) || [];
  agentReviews.push(review);
  reviews.set(agentId, agentReviews);

  return review;
}

/**
 * Calculate average rating for agent
 */
function getAverageRating(agentId) {
  const agentReviews = reviews.get(agentId) || [];
  if (agentReviews.length === 0) {
    return { average: 0, total: 0 };
  }

  const total = agentReviews.reduce((sum, r) => sum + r.rating, 0);
  return {
    average: (total / agentReviews.length).toFixed(2),
    total: agentReviews.length,
    breakdown: {
      5: agentReviews.filter(r => r.rating === 5).length,
      4: agentReviews.filter(r => r.rating === 4).length,
      3: agentReviews.filter(r => r.rating === 3).length,
      2: agentReviews.filter(r => r.rating === 2).length,
      1: agentReviews.filter(r => r.rating === 1).length
    }
  };
}

/**
 * Search listings
 */
function searchListings(criteria) {
  let results = Array.from(listings.values()).filter(l => l.status === 'active');

  // Filter by category
  if (criteria.category) {
    results = results.filter(l => l.category === criteria.category);
  }

  // Filter by subcategory
  if (criteria.subcategory) {
    results = results.filter(l => l.subcategory === criteria.subcategory);
  }

  // Filter by query
  if (criteria.query) {
    const q = criteria.query.toLowerCase();
    results = results.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.description.toLowerCase().includes(q) ||
      l.tags.some(t => t.toLowerCase().includes(q)) ||
      l.specialties.some(s => s.toLowerCase().includes(q))
    );
  }

  // Filter by location
  if (criteria.city) {
    results = results.filter(l => l.location.city === criteria.city);
  }
  if (criteria.country) {
    results = results.filter(l => l.location.country === criteria.country);
  }

  // Filter by features
  if (criteria.verified) {
    results = results.filter(l => l.verified);
  }
  if (criteria.premium) {
    results = results.filter(l => l.premium);
  }
  if (criteria.featured) {
    results = results.filter(l => l.featured);
  }

  // Filter by price range
  if (criteria.priceRange) {
    results = results.filter(l => l.priceRange === criteria.priceRange);
  }

  // Filter by rating
  if (criteria.minRating) {
    results = results.filter(l => {
      const { average } = getAverageRating(l.agentId);
      return parseFloat(average) >= criteria.minRating;
    });
  }

  // Sort
  if (criteria.sortBy === 'rating') {
    results.sort((a, b) => {
      const aRating = parseFloat(getAverageRating(a.agentId).average);
      const bRating = parseFloat(getAverageRating(b.agentId).average);
      return bRating - aRating;
    });
  } else if (criteria.sortBy === 'featured') {
    results.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });
  } else if (criteria.sortBy === 'newest') {
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (criteria.sortBy === 'popular') {
    results.sort((a, b) => b.views - a.views);
  }

  // Limit
  if (criteria.limit) {
    results = results.slice(0, criteria.limit);
  }

  return results;
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    service: 'Agent Marketplace',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    stats: {
      totalListings: listings.size,
      totalReviews: Array.from(reviews.values()).reduce((sum, r) => sum + r.length, 0),
      categories: categories.size
    }
  });
});

/**
 * Create listing
 * POST /api/listings
 */
app.post('/api/listings',requireAuth,  (req, res) => {
  try {
    const listing = createListing(req.body);
    res.status(201).json(listing);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get listing
 * GET /api/listings/:id
 */
app.get('/api/listings/:id', (req, res) => {
  const listing = listings.get(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  // Increment views
  listing.views++;

  const { average, total, breakdown } = getAverageRating(listing.agentId);

  res.json({
    ...listing,
    rating: {
      average: parseFloat(average),
      total,
      breakdown
    }
  });
});

/**
 * Update listing
 * PUT /api/listings/:id
 */
app.put('/api/listings/:id',requireAuth,  (req, res) => {
  try {
    const listing = listings.get(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const updated = { ...listing, ...req.body, id: listing.id, updatedAt: new Date().toISOString() };
    listings.set(listing.id, updated);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Delete listing
 * DELETE /api/listings/:id
 */
app.delete('/api/listings/:id',requireAuth,  (req, res) => {
  const listing = listings.get(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  listing.status = 'deleted';
  listings.set(listing.id, listing);
  res.json({ success: true });
});

/**
 * Search listings
 * POST /api/search
 */
app.post('/api/search',requireAuth,  (req, res) => {
  try {
    const results = searchListings(req.body);
    res.json({
      total: results.length,
      results: results.map(l => ({
        ...l,
        rating: getAverageRating(l.agentId)
      }))
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get featured listings
 * GET /api/featured
 */
app.get('/api/featured', (req, res) => {
  const featured = Array.from(listings.values())
    .filter(l => l.featured && l.status === 'active')
    .slice(0, 10);

  res.json({
    featured: featured.map(l => ({
      ...l,
      rating: getAverageRating(l.agentId)
    }))
  });
});

/**
 * Get by category
 * GET /api/category/:category
 */
app.get('/api/category/:category', (req, res) => {
  const results = searchListings({
    category: req.params.category,
    limit: 50
  });

  res.json({
    category: req.params.category,
    total: results.length,
    listings: results
  });
});

/**
 * Get all categories
 * GET /api/categories
 */
app.get('/api/categories', (req, res) => {
  res.json({
    categories: Array.from(categories.values())
  });
});

/**
 * Create review
 * POST /api/reviews
 */
app.post('/api/reviews',requireAuth,  (req, res) => {
  try {
    const { agentId, ...reviewData } = req.body;
    if (!agentId || !reviewData.rating) {
      return res.status(400).json({ error: 'agentId and rating are required' });
    }

    const review = createReview(agentId, reviewData);
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get reviews for agent
 * GET /api/reviews/:agentId
 */
app.get('/api/reviews/:agentId', (req, res) => {
  const agentReviews = reviews.get(req.params.agentId) || [];
  const { limit = 50, offset = 0, sort = 'newest' } = req.query;

  let sorted = [...agentReviews];
  if (sort === 'newest') sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (sort === 'oldest') sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (sort === 'highest') sorted.sort((a, b) => b.rating - a.rating);
  if (sort === 'lowest') sorted.sort((a, b) => a.rating - b.rating);

  const rating = getAverageRating(req.params.agentId);

  res.json({
    agentId: req.params.agentId,
    rating,
    reviews: sorted.slice(parseInt(offset), parseInt(offset) + parseInt(limit))
  });
});

/**
 * Mark review helpful
 * POST /api/reviews/:id/helpful
 */
app.post('/api/reviews/:id/helpful',requireAuth,  (req, res) => {
  for (const [agentId, agentReviews] of reviews.entries()) {
    const review = agentReviews.find(r => r.id === req.params.id);
    if (review) {
      review.helpful++;
      reviews.set(agentId, agentReviews);
      return res.json(review);
    }
  }
  res.status(404).json({ error: 'Review not found' });
});

/**
 * Create promotion
 * POST /api/promotions
 */
app.post('/api/promotions',requireAuth,  (req, res) => {
  try {
    const { agentId, ...promoData } = req.body;

    const promotion = {
      id: `PROMO-${uuidv4().substring(0, 8)}`,
      agentId,
      title: promoData.title,
      description: promoData.description,
      type: promoData.type || 'discount',  // discount, cashback, freebie, bogo
      value: promoData.value,
      code: promoData.code || `PROMO-${uuidv4().substring(0, 6).toUpperCase()}`,
      minOrder: promoData.minOrder || 0,
      maxUses: promoData.maxUses || 100,
      currentUses: 0,
      validFrom: promoData.validFrom || new Date().toISOString(),
      validUntil: promoData.validUntil,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    promotions.set(promotion.id, promotion);

    // Update listing
    const listing = Array.from(listings.values()).find(l => l.agentId === agentId);
    if (listing) {
      listing.hasPromotions = true;
      listings.set(listing.id, listing);
    }

    res.status(201).json(promotion);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get active promotions
 * GET /api/promotions
 */
app.get('/api/promotions', (req, res) => {
  const active = Array.from(promotions.values()).filter(p =>
    p.status === 'active' &&
    new Date(p.validFrom) <= new Date() &&
    (!p.validUntil || new Date(p.validUntil) >= new Date())
  );

  res.json({ promotions: active });
});

/**
 * Get promotions by agent
 * GET /api/promotions/agent/:agentId
 */
app.get('/api/promotions/agent/:agentId', (req, res) => {
  const agentPromos = Array.from(promotions.values())
    .filter(p => p.agentId === req.params.agentId && p.status === 'active');

  res.json({ promotions: agentPromos });
});

/**
 * Track inquiry
 * POST /api/listings/:id/inquiry
 */
app.post('/api/listings/:id/inquiry',requireAuth,  (req, res) => {
  const listing = listings.get(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  listing.inquiries++;
  listings.set(listing.id, listing);

  res.json({ success: true });
});

/**
 * Get marketplace statistics
 * GET /api/stats
 */
app.get('/api/stats', (req, res) => {
  const allListings = Array.from(listings.values());
  const allReviews = Array.from(reviews.values()).flat();

  res.json({
    totalListings: allListings.filter(l => l.status === 'active').length,
    totalReviews: allReviews.length,
    totalCategories: categories.size,
    featuredListings: allListings.filter(l => l.featured).length,
    verifiedListings: allListings.filter(l => l.verified).length,
    totalViews: allListings.reduce((sum, l) => sum + l.views, 0),
    totalInquiries: allListings.reduce((sum, l) => sum + l.inquiries, 0),
    averageRating: allReviews.length > 0
      ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(2)
      : 0
  });
});

/**
 * Featured agents list (admin)
 * PUT /api/listings/:id/feature
 */
app.put('/api/listings/:id/feature',requireAuth,  (req, res) => {
  const listing = listings.get(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  listing.featured = req.body.featured ?? true;
  listings.set(listing.id, listing);

  res.json(listing);
});

/**
 * Verify listing
 * PUT /api/listings/:id/verify
 */
app.put('/api/listings/:id/verify',requireAuth,  (req, res) => {
  const listing = listings.get(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  listing.verified = true;
  listing.verifiedAt = new Date().toISOString();
  listings.set(listing.id, listing);

  res.json(listing);
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = 
// REZ Intelligence endpoints
app.get('/rez-intel-status', async (req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({ rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED, rezIntelUrl: rezIntel.REZ_INTEL_URL, rezIntelHealthy: isHealthy });
});

app.post('/api/enrich', requireInternal, async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body;
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

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           AGENT MARKETPLACE SERVICE                          ║
║                 Version 1.0.0                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                   ║
║  Status: RUNNING                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Categories: ${DEFAULT_CATEGORIES.length}                                            ║
║  Listings: search by category, location, rating              ║
║  Reviews: 1-5 star ratings with detailed breakdowns          ║
║  Promotions: discounts, cashback, freebies                   ║
╠══════════════════════════════════════════════════════════════╣
║  API Endpoints:                                               ║
║    POST   /api/listings             Create listing            ║
║    GET    /api/listings/:id         Get listing              ║
║    POST   /api/search              Search listings           ║
║    GET    /api/featured             Get featured             ║
║    GET    /api/category/:id         By category              ║
║    POST   /api/reviews              Create review            ║
║    GET    /api/reviews/:agentId    Get reviews              ║
║    POST   /api/promotions           Create promotion         ║
║    GET    /api/promotions           Get active promotions     ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

module.exports = app;
