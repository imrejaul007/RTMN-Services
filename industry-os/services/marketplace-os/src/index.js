/**
 * Hotel Marketplace OS (5290)
 * App Store for Hotels - Third-party integrations and plugins
 */

const express = require('express');
const axios = require('axios');
const app = express();

const PORT = 5290;
const SERVICE_NAME = 'marketplace-os';

// Middleware
app.use(express.json());

// In-memory store for marketplace data
const store = {
  apps: new Map(),
  categories: new Map(),
  reviews: new Map(),
  installations: new Map(),
  subscriptions: new Map()
};

// Initialize sample apps
function initializeSampleData() {
  // Categories
  const categories = [
    { id: 'cat_001', name: 'Guest Services', description: 'Enhance guest experience', icon: '🛎️' },
    { id: 'cat_002', name: 'Operations', description: 'Streamline hotel operations', icon: '⚙️' },
    { id: 'cat_003', name: 'Revenue', description: 'Maximize revenue', icon: '💰' },
    { id: 'cat_004', name: 'Marketing', description: 'Marketing tools', icon: '📣' },
    { id: 'cat_005', name: 'IoT & Smart', description: 'Smart room integrations', icon: '🔌' },
    { id: 'cat_006', name: 'F&B', description: 'Food & Beverage', icon: '🍽️' },
    { id: 'cat_007', name: 'Spa & Wellness', description: 'Spa and wellness', icon: '💆' },
    { id: 'cat_008', name: 'Transportation', description: 'Transport integrations', icon: '🚗' }
  ];
  categories.forEach(c => store.categories.set(c.id, c));

  // Apps
  const apps = [
    {
      id: 'app_001', categoryId: 'cat_001', name: 'Digital Concierge',
      description: 'AI-powered digital concierge for guest requests',
      developer: 'Hojai AI', version: '2.1.0', price: 99, currency: 'USD',
      rating: 4.8, reviews: 156, installs: 2340, status: 'active',
      features: ['Chat Interface', 'Multi-language', 'Request Tracking', 'Sentiment Analysis'],
      icon: '🤖', tier: 'premium', createdAt: new Date().toISOString()
    },
    {
      id: 'app_002', categoryId: 'cat_003', name: 'Dynamic Pricing Engine',
      description: 'AI-driven pricing optimization based on demand',
      developer: 'Revenue Labs', version: '3.0.0', price: 199, currency: 'USD',
      rating: 4.9, reviews: 89, installs: 890, status: 'active',
      features: ['Real-time Pricing', 'Competitor Analysis', 'Demand Forecasting', 'Channel Sync'],
      icon: '📈', tier: 'premium', createdAt: new Date().toISOString()
    },
    {
      id: 'app_003', categoryId: 'cat_004', name: 'Review Manager',
      description: 'Automatically respond to guest reviews',
      developer: 'Reputation Co', version: '1.5.0', price: 49, currency: 'USD',
      rating: 4.5, reviews: 234, installs: 4500, status: 'active',
      features: ['Auto-Responses', 'Sentiment Analysis', 'Review Aggregation', 'Alerts'],
      icon: '⭐', tier: 'standard', createdAt: new Date().toISOString()
    },
    {
      id: 'app_004', categoryId: 'cat_005', name: 'Smart Room Controller',
      description: 'Integrate with smart room devices',
      developer: 'IoT Solutions', version: '2.0.0', price: 0, currency: 'USD',
      rating: 4.6, reviews: 78, installs: 1200, status: 'active',
      features: ['AC Control', 'Lighting', 'Curtains', 'Voice Control'],
      icon: '🏠', tier: 'free', createdAt: new Date().toISOString()
    },
    {
      id: 'app_005', categoryId: 'cat_006', name: 'Room Service POS',
      description: 'Complete room service ordering system',
      developer: 'F&B Tech', version: '4.2.0', price: 79, currency: 'USD',
      rating: 4.7, reviews: 145, installs: 1800, status: 'active',
      features: ['Menu Management', 'Order Tracking', 'Kitchen Display', 'Payment Integration'],
      icon: '🍕', tier: 'standard', createdAt: new Date().toISOString()
    },
    {
      id: 'app_006', categoryId: 'cat_007', name: 'Spa Booking System',
      description: 'Online spa appointment booking',
      developer: 'Wellness Pro', version: '2.3.0', price: 59, currency: 'USD',
      rating: 4.4, reviews: 67, installs: 650, status: 'active',
      features: ['Online Booking', 'Staff Scheduler', 'Treatment Menu', 'Gift Cards'],
      icon: '💆‍♀️', tier: 'standard', createdAt: new Date().toISOString()
    },
    {
      id: 'app_007', categoryId: 'cat_008', name: 'Airport Transfer',
      description: 'Automated airport transfer bookings',
      developer: 'Transport Connect', version: '1.8.0', price: 39, currency: 'USD',
      rating: 4.3, reviews: 98, installs: 2100, status: 'active',
      features: ['Auto Booking', 'Flight Tracking', 'Driver Dispatch', 'Feedback Loop'],
      icon: '🚗', tier: 'standard', createdAt: new Date().toISOString()
    },
    {
      id: 'app_008', categoryId: 'cat_001', name: 'Lost & Found Tracker',
      description: 'Track and manage lost items',
      developer: 'Hotel Ops', version: '1.2.0', price: 0, currency: 'USD',
      rating: 4.2, reviews: 45, installs: 890, status: 'active',
      features: ['Item Registration', 'Guest Notification', 'Found Log', 'Reporting'],
      icon: '🔍', tier: 'free', createdAt: new Date().toISOString()
    },
    {
      id: 'app_009', categoryId: 'cat_002', name: 'Housekeeping Scheduler',
      description: 'Smart housekeeping assignment',
      developer: 'Clean Tech', version: '3.1.0', price: 69, currency: 'USD',
      rating: 4.6, reviews: 112, installs: 1560, status: 'active',
      features: ['Auto Assignment', 'Priority Queue', 'Deep Clean Tracking', 'Staff App'],
      icon: '🧹', tier: 'standard', createdAt: new Date().toISOString()
    },
    {
      id: 'app_010', categoryId: 'cat_004', name: 'Email Marketing Suite',
      description: 'Automated email campaigns',
      developer: 'Mail Pro', version: '5.0.0', price: 89, currency: 'USD',
      rating: 4.7, reviews: 189, installs: 3200, status: 'active',
      features: ['Templates', 'Automation', 'Segmentation', 'Analytics'],
      icon: '📧', tier: 'premium', createdAt: new Date().toISOString()
    }
  ];
  apps.forEach(a => store.apps.set(a.id, a));

  console.log(`✅ Marketplace initialized with ${apps.length} apps and ${categories.length} categories`);
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    port: PORT,
    capabilities: ['App Store', 'Category Browsing', 'App Installation', 'Reviews', 'Subscriptions'],
    stats: {
      totalApps: store.apps.size,
      totalCategories: store.categories.size,
      totalInstalls: Array.from(store.installations.values()).length
    },
    timestamp: new Date().toISOString()
  });
});

// ==================== CATEGORIES ====================

// Get all categories
app.get('/api/categories', (req, res) => {
  const categories = Array.from(store.categories.values());
  res.json({ success: true, categories });
});

// Get category by ID
app.get('/api/categories/:id', (req, res) => {
  const category = store.categories.get(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, error: 'Category not found' });
  }

  // Get apps in this category
  const apps = Array.from(store.apps.values()).filter(a => a.categoryId === req.params.id);
  res.json({ success: true, category, apps });
});

// ==================== APPS ====================

// Get all apps
app.get('/api/apps', (req, res) => {
  const { category, tier, search, sort, limit = 50, offset = 0 } = req.query;

  let apps = Array.from(store.apps.values());

  if (category) apps = apps.filter(a => a.categoryId === category);
  if (tier) apps = apps.filter(a => a.tier === tier);
  if (search) {
    const s = search.toLowerCase();
    apps = apps.filter(a =>
      a.name.toLowerCase().includes(s) ||
      a.description.toLowerCase().includes(s)
    );
  }

  // Sort
  if (sort === 'rating') apps.sort((a, b) => b.rating - a.rating);
  else if (sort === 'installs') apps.sort((a, b) => b.installs - a.installs);
  else if (sort === 'price') apps.sort((a, b) => a.price - b.price);
  else if (sort === 'newest') apps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Paginate
  const total = apps.length;
  apps = apps.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  res.json({ success: true, apps, total, limit: parseInt(limit), offset: parseInt(offset) });
});

// Get app by ID
app.get('/api/apps/:id', (req, res) => {
  const app = store.apps.get(req.params.id);
  if (!app) {
    return res.status(404).json({ success: false, error: 'App not found' });
  }

  // Get reviews
  const reviews = Array.from(store.reviews.values()).filter(r => r.appId === req.params.id);

  res.json({ success: true, app, reviews });
});

// Create app (developer endpoint)
app.post('/api/apps', (req, res) => {
  const { name, categoryId, description, developer, price, tier, features, icon } = req.body;

  if (!name || !categoryId || !description) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const app = {
    id: `app_${Date.now()}`,
    categoryId,
    name,
    description,
    developer: developer || 'Unknown',
    version: '1.0.0',
    price: price || 0,
    currency: 'USD',
    rating: 0,
    reviews: 0,
    installs: 0,
    status: 'pending',
    features: features || [],
    icon: icon || '📦',
    tier: tier || 'free',
    createdAt: new Date().toISOString()
  };

  store.apps.set(app.id, app);
  res.status(201).json({ success: true, app });
});

// Update app
app.put('/api/apps/:id', (req, res) => {
  const app = store.apps.get(req.params.id);
  if (!app) {
    return res.status(404).json({ success: false, error: 'App not found' });
  }

  const updates = req.body;
  Object.assign(app, updates, { updatedAt: new Date().toISOString() });
  store.apps.set(app.id, app);

  res.json({ success: true, app });
});

// ==================== INSTALLATIONS ====================

// Install app
app.post('/api/installations', (req, res) => {
  const { appId, hotelId, propertyId, config } = req.body;

  if (!appId || !hotelId) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const app = store.apps.get(appId);
  if (!app) {
    return res.status(404).json({ success: false, error: 'App not found' });
  }

  const installation = {
    id: `inst_${Date.now()}`,
    appId,
    hotelId,
    propertyId,
    config: config || {},
    status: 'active',
    installedAt: new Date().toISOString()
  };

  store.installations.set(installation.id, installation);

  // Update install count
  app.installs++;
  store.apps.set(appId, app);

  res.status(201).json({ success: true, installation });
});

// Get hotel installations
app.get('/api/installations/hotel/:hotelId', (req, res) => {
  const installations = Array.from(store.installations.values())
    .filter(i => i.hotelId === req.params.hotelId);

  const apps = installations.map(i => ({
    ...store.apps.get(i.appId),
    installation: i
  })).filter(a => a.id);

  res.json({ success: true, installations, apps });
});

// Uninstall app
app.delete('/api/installations/:id', (req, res) => {
  const installation = store.installations.get(req.params.id);
  if (!installation) {
    return res.status(404).json({ success: false, error: 'Installation not found' });
  }

  installation.status = 'uninstalled';
  installation.uninstalledAt = new Date().toISOString();
  store.installations.set(req.params.id, installation);

  res.json({ success: true });
});

// ==================== REVIEWS ====================

// Submit review
app.post('/api/reviews', (req, res) => {
  const { appId, hotelId, rating, title, comment } = req.body;

  if (!appId || !hotelId || !rating) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const review = {
    id: `rev_${Date.now()}`,
    appId,
    hotelId,
    rating: Math.min(5, Math.max(1, rating)),
    title: title || '',
    comment: comment || '',
    status: 'approved',
    createdAt: new Date().toISOString()
  };

  store.reviews.set(review.id, review);

  // Update app rating
  const app = store.apps.get(appId);
  if (app) {
    const appReviews = Array.from(store.reviews.values()).filter(r => r.appId === appId);
    const avgRating = appReviews.reduce((sum, r) => sum + r.rating, 0) / appReviews.length;
    app.rating = Math.round(avgRating * 10) / 10;
    app.reviews = appReviews.length;
    store.apps.set(appId, app);
  }

  res.status(201).json({ success: true, review });
});

// ==================== SUBSCRIPTIONS ====================

// Create subscription
app.post('/api/subscriptions', (req, res) => {
  const { appId, hotelId, plan, billingCycle } = req.body;

  if (!appId || !hotelId || !plan) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const subscription = {
    id: `sub_${Date.now()}`,
    appId,
    hotelId,
    plan,
    billingCycle: billingCycle || 'monthly',
    status: 'active',
    startDate: new Date().toISOString(),
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };

  store.subscriptions.set(subscription.id, subscription);
  res.status(201).json({ success: true, subscription });
});

// Get subscription
app.get('/api/subscriptions/:id', (req, res) => {
  const subscription = store.subscriptions.get(req.params.id);
  if (!subscription) {
    return res.status(404).json({ success: false, error: 'Subscription not found' });
  }
  res.json({ success: true, subscription });
});

// Cancel subscription
app.delete('/api/subscriptions/:id', (req, res) => {
  const subscription = store.subscriptions.get(req.params.id);
  if (!subscription) {
    return res.status(404).json({ success: false, error: 'Subscription not found' });
  }

  subscription.status = 'cancelled';
  subscription.cancelledAt = new Date().toISOString();
  store.subscriptions.set(req.params.id, subscription);

  res.json({ success: true });
});

// ==================== SEARCH & RECOMMENDATIONS ====================

// Search apps
app.get('/api/search', (req, res) => {
  const { q, category, tier, minRating } = req.query;

  if (!q) {
    return res.status(400).json({ success: false, error: 'Search query required' });
  }

  const s = q.toLowerCase();
  let results = Array.from(store.apps.values()).filter(a => {
    if (!a.name.toLowerCase().includes(s) &&
        !a.description.toLowerCase().includes(s) &&
        !a.features.some(f => f.toLowerCase().includes(s))) {
      return false;
    }
    if (category && a.categoryId !== category) return false;
    if (tier && a.tier !== tier) return false;
    if (minRating && a.rating < parseFloat(minRating)) return false;
    return true;
  });

  res.json({ success: true, results, total: results.length });
});

// Get featured apps
app.get('/api/featured', (req, res) => {
  const apps = Array.from(store.apps.values())
    .filter(a => a.status === 'active')
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10);

  res.json({ success: true, featured: apps });
});

// Get trending apps
app.get('/api/trending', (req, res) => {
  const apps = Array.from(store.apps.values())
    .filter(a => a.status === 'active')
    .sort((a, b) => b.installs - a.installs)
    .slice(0, 10);

  res.json({ success: true, trending: apps });
});

// ==================== ANALYTICS ====================

// Marketplace analytics
app.get('/api/analytics', (req, res) => {
  const apps = Array.from(store.apps.values());
  const installations = Array.from(store.installations.values());
  const reviews = Array.from(store.reviews.values());

  const totalRevenue = apps.reduce((sum, app) => {
    const subs = Array.from(store.subscriptions.values()).filter(s => s.appId === app.id);
    return sum + (subs.length * app.price);
  }, 0);

  res.json({
    success: true,
    analytics: {
      totalApps: apps.length,
      totalInstallations: installations.length,
      totalReviews: reviews.length,
      totalCategories: store.categories.size,
      totalRevenue,
      avgRating: apps.reduce((sum, a) => sum + a.rating, 0) / apps.length,
      topCategories: Array.from(store.categories.values()).map(c => ({
        ...c,
        appCount: apps.filter(a => a.categoryId === c.id).length
      })).sort((a, b) => b.appCount - a.appCount)
    }
  });
});

// App analytics
app.get('/api/apps/:id/analytics', (req, res) => {
  const app = store.apps.get(req.params.id);
  if (!app) {
    return res.status(404).json({ success: false, error: 'App not found' });
  }

  const installations = Array.from(store.installations.values())
    .filter(i => i.appId === req.params.id);
  const reviews = Array.from(store.reviews.values())
    .filter(r => r.appId === req.params.id);

  res.json({
    success: true,
    analytics: {
      installs: app.installs,
      activeInstallations: installations.filter(i => i.status === 'active').length,
      reviews: app.reviews,
      rating: app.rating,
      ratingDistribution: {
        5: reviews.filter(r => r.rating === 5).length,
        4: reviews.filter(r => r.rating === 4).length,
        3: reviews.filter(r => r.rating === 3).length,
        2: reviews.filter(r => r.rating === 2).length,
        1: reviews.filter(r => r.rating === 1).length
      }
    }
  });
});

// ==================== RTMN INTEGRATIONS ====================

// Connect to Hotel OS
async function connectToHotelOS() {
  try {
    await axios.get('http://localhost:5025/health', { timeout: 2000 });
    console.log('✅ Connected to Hotel OS (5025)');
    return true;
  } catch {
    console.log('⚠️ Hotel OS not available');
    return false;
  }
}

// Connect to Agent Copilot
async function connectToAgentCopilot() {
  try {
    await axios.get('http://localhost:4920/health', { timeout: 2000 });
    console.log('✅ Connected to Agent Copilot (4920)');
    return true;
  } catch {
    console.log('⚠️ Agent Copilot not available');
    return false;
  }
}

// Start server
initializeSampleData();

app.listen(PORT, async () => {
  console.log(`\n🏪 Hotel Marketplace OS started on port ${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await connectToHotelOS();
  await connectToAgentCopilot();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📦 ${store.apps.size} apps | ${store.categories.size} categories`);
  console.log('🎯 Available endpoints:');
  console.log('   GET  /health');
  console.log('   GET  /api/categories');
  console.log('   GET  /api/apps');
  console.log('   GET  /api/search?q=<query>');
  console.log('   GET  /api/featured');
  console.log('   GET  /api/trending');
  console.log('   POST /api/installations');
  console.log('   GET  /api/analytics');
});
