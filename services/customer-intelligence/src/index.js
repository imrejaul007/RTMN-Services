/**
 * RTMN Customer Intelligence Service
 *
 * Port: 4885
 * Purpose: 360° Customer View, Customer Data Platform (CDP), Customer Twin 2.0
 *
 * Features:
 * - Customer profiles with 360° view
 * - Customer data platform (CDP)
 * - Preferences and history tracking
 * - Loyalty and rewards management
 * - Predictive analytics (churn, LTV, NPS)
 * - Customer segmentation
 * - Cross-platform customer identity
 * - Real-time customer insights
 * - Customer journey tracking
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.CUSTOMER_INTELLIGENCE_PORT || 4885;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// ============================================================
// DATA STORES
// ============================================================

const customers = new Map();
const profiles = new Map();
const preferences = new Map();
const history = new Map();
const segments = new Map();
const loyalty = new Map();
const predictions = new Map();
const journeys = new Map();

// Initialize sample data
const sampleCustomers = [
  {
    id: 'cust-001',
    email: 'sarah.chen@techcorp.com',
    name: 'Sarah Chen',
    phone: '+1-555-0101',
    type: 'enterprise',
    company: 'TechCorp Inc.',
    industry: 'Technology',
    value: 125000,
    tier: 'gold',
    status: 'active',
    lifetimeValue: 450000,
    engagementScore: 87,
    nps: 9,
    churnRisk: 'low',
    createdAt: '2024-06-15T10:00:00Z',
    lastActive: '2026-06-17T14:30:00Z'
  },
  {
    id: 'cust-002',
    email: 'michael.raj@globalretail.com',
    name: 'Michael Raj',
    phone: '+1-555-0102',
    type: 'enterprise',
    company: 'Global Retail Ltd.',
    industry: 'Retail',
    value: 85000,
    tier: 'silver',
    status: 'active',
    lifetimeValue: 220000,
    engagementScore: 72,
    nps: 7,
    churnRisk: 'medium',
    createdAt: '2024-09-20T08:00:00Z',
    lastActive: '2026-06-16T11:00:00Z'
  },
  {
    id: 'cust-003',
    email: 'priya.sharma@finserve.com',
    name: 'Priya Sharma',
    phone: '+1-555-0103',
    type: 'enterprise',
    company: 'FinServe Corp.',
    industry: 'Finance',
    value: 200000,
    tier: 'platinum',
    status: 'active',
    lifetimeValue: 890000,
    engagementScore: 94,
    nps: 10,
    churnRisk: 'low',
    createdAt: '2023-01-10T12:00:00Z',
    lastActive: '2026-06-18T09:00:00Z'
  }
];

// Initialize data
sampleCustomers.forEach(c => {
  customers.set(c.id, c);

  // Create profile
  profiles.set(c.id, {
    customerId: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    company: c.company,
    industry: c.industry,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.id}`,
    timezone: 'Asia/Kolkata',
    language: 'en',
    currency: 'USD',
    tags: [],
    customFields: {}
  });

  // Create preferences
  preferences.set(c.id, {
    customerId: c.id,
    notifications: { email: true, sms: true, push: false },
    marketingConsent: true,
    language: 'en',
    timezone: 'Asia/Kolkata',
    favorites: [],
    interests: ['AI', 'Automation', 'Analytics'],
    communicationPrefs: { emailFrequency: 'weekly', sms: true }
  });

  // Create history
  history.set(c.id, {
    customerId: c.id,
    events: [
      { type: 'signup', date: c.createdAt, source: 'website' },
      { type: 'first_purchase', date: c.createdAt, value: c.value },
      { type: 'support_ticket', date: '2026-03-15T10:00:00Z', ticketId: 'TKT-001' },
      { type: 'payment', date: '2026-06-01T10:00:00Z', value: c.value },
      { type: 'login', date: c.lastActive, source: 'web' }
    ]
  });

  // Create loyalty
  loyalty.set(c.id, {
    customerId: c.id,
    points: Math.floor(c.lifetimeValue / 100),
    pointsValue: Math.floor(c.lifetimeValue / 100) * 0.01,
    tier: c.tier,
    tierProgress: 75,
    nextTier: c.tier === 'platinum' ? null : c.tier === 'gold' ? 'platinum' : 'gold',
    pointsToNextTier: c.tier === 'platinum' ? 0 : 5000 - (Math.floor(c.lifetimeValue / 100) % 5000),
    history: [
      { type: 'earn', points: 1000, date: '2026-06-01', description: 'Monthly purchase' },
      { type: 'redeem', points: -500, date: '2026-05-15', description: 'Discount' }
    ]
  });

  // Create predictions
  predictions.set(c.id, {
    customerId: c.id,
    churnProbability: c.churnRisk === 'low' ? 0.12 : c.churnRisk === 'medium' ? 0.45 : 0.78,
    lifetimeValue: c.lifetimeValue,
    predictedLTV: c.lifetimeValue * 1.25,
    nextPurchaseDate: '2026-07-01',
    upsellProbability: 0.72,
    refundRisk: 0.15,
    npsScore: c.nps,
    sentiment: 'positive',
    confidence: 0.89
  });
});

// Initialize segments
const defaultSegments = [
  { id: 'seg-enterprise', name: 'Enterprise', description: 'High-value enterprise customers', count: 2, criteria: { type: 'enterprise' } },
  { id: 'seg-high-value', name: 'High Value', description: 'Customers with LTV > $100K', count: 2, criteria: { minLTV: 100000 } },
  { id: 'seg-at-risk', name: 'At Risk', description: 'Medium-high churn risk', count: 1, criteria: { churnRisk: ['medium', 'high'] } },
  { id: 'seg-active', name: 'Active', description: 'Active in last 7 days', count: 3, criteria: { activeWithin: 7 } },
  { id: 'seg-promoters', name: 'Promoters', description: 'NPS 9-10', count: 2, criteria: { npsMin: 9 } },
  { id: 'seg-detractors', name: 'Detractors', description: 'NPS < 7', count: 0, criteria: { npsMax: 6 } }
];
defaultSegments.forEach(s => segments.set(s.id, s));

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Customer Intelligence',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      customers: customers.size,
      segments: segments.size,
      avgEngagement: Math.round(Array.from(customers.values()).reduce((sum, c) => sum + c.engagementScore, 0) / customers.size),
      totalLTV: Array.from(customers.values()).reduce((sum, c) => sum + c.lifetimeValue, 0),
      atRiskCount: Array.from(customers.values()).filter(c => c.churnRisk !== 'low').length
    }
  });
});

// ============================================================
// CUSTOMER 360 VIEW
// ============================================================

// Get all customers
app.get('/api/customers', (req, res) => {
  const { search, segment, tier, status, limit = 50, offset = 0 } = req.query;

  let result = Array.from(customers.values());

  // Filters
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(c =>
      c.name.toLowerCase().includes(s) ||
      c.email.toLowerCase().includes(s) ||
      (c.company && c.company.toLowerCase().includes(s))
    );
  }
  if (tier) result = result.filter(c => c.tier === tier);
  if (status) result = result.filter(c => c.status === status);

  // Segment filtering
  if (segment) {
    const seg = segments.get(segment);
    if (seg) {
      result = result.filter(c => {
        if (seg.criteria.type && c.type !== seg.criteria.type) return false;
        if (seg.criteria.minLTV && c.lifetimeValue < seg.criteria.minLTV) return false;
        if (seg.criteria.churnRisk && !seg.criteria.churnRisk.includes(c.churnRisk)) return false;
        if (seg.criteria.npsMin && c.nps < seg.criteria.npsMin) return false;
        return true;
      });
    }
  }

  const total = result.length;
  result = result.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  res.json({
    success: true,
    total,
    limit: parseInt(limit),
    offset: parseInt(offset),
    customers: result
  });
});

// Get customer 360 view
app.get('/api/customers/:id', (req, res) => {
  const customer = customers.get(req.params.id);
  if (!customer) {
    return res.status(404).json({ success: false, error: 'Customer not found' });
  }

  const profile = profiles.get(req.params.id) || {};
  const pref = preferences.get(req.params.id) || {};
  const hist = history.get(req.params.id) || { events: [] };
  const loy = loyalty.get(req.params.id) || {};
  const pred = predictions.get(req.params.id) || {};

  // Get related customers (same company, similar behavior)
  const relatedCustomers = Array.from(customers.values())
    .filter(c => c.id !== customer.id && (c.company === customer.company || Math.abs(c.engagementScore - customer.engagementScore) < 10))
    .slice(0, 5);

  res.json({
    success: true,
    customer: {
      ...customer,
      profile,
      preferences: pref,
      history: hist.events,
      loyalty: loy,
      predictions: pred,
      relatedCustomers: relatedCustomers.map(c => ({ id: c.id, name: c.name, email: c.email, tier: c.tier }))
    }
  });
});

// Create customer
app.post('/api/customers', (req, res) => {
  const { name, email, phone, company, industry, type = 'individual' } = req.body;

  if (!name || !email) {
    return res.status(400).json({ success: false, error: 'Name and email required' });
  }

  // Check duplicate
  const existing = Array.from(customers.values()).find(c => c.email === email);
  if (existing) {
    return res.status(400).json({ success: false, error: 'Customer with this email already exists' });
  }

  const customer = {
    id: `cust-${uuidv4().slice(0, 8)}`,
    name,
    email,
    phone: phone || null,
    type,
    company: company || null,
    industry: industry || null,
    value: 0,
    tier: 'bronze',
    status: 'active',
    lifetimeValue: 0,
    engagementScore: 50,
    nps: 0,
    churnRisk: 'low',
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString()
  };

  customers.set(customer.id, customer);

  // Create related records
  profiles.set(customer.id, {
    customerId: customer.id,
    name,
    email,
    phone,
    company,
    industry,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${customer.id}`,
    timezone: 'Asia/Kolkata',
    language: 'en',
    currency: 'USD',
    tags: [],
    customFields: {}
  });

  preferences.set(customer.id, {
    customerId: customer.id,
    notifications: { email: true, sms: true, push: false },
    marketingConsent: false,
    language: 'en',
    timezone: 'Asia/Kolkata',
    favorites: [],
    interests: [],
    communicationPrefs: { emailFrequency: 'weekly', sms: false }
  });

  history.set(customer.id, {
    customerId: customer.id,
    events: [{ type: 'signup', date: customer.createdAt, source: 'api' }]
  });

  loyalty.set(customer.id, {
    customerId: customer.id,
    points: 0,
    pointsValue: 0,
    tier: 'bronze',
    tierProgress: 0,
    nextTier: 'silver',
    pointsToNextTier: 1000,
    history: []
  });

  predictions.set(customer.id, {
    customerId: customer.id,
    churnProbability: 0.5,
    lifetimeValue: 0,
    predictedLTV: 0,
    nextPurchaseDate: null,
    upsellProbability: 0.3,
    refundRisk: 0.2,
    npsScore: 0,
    sentiment: 'neutral',
    confidence: 0.5
  });

  res.status(201).json({ success: true, customer });
});

// Update customer
app.patch('/api/customers/:id', (req, res) => {
  const customer = customers.get(req.params.id);
  if (!customer) {
    return res.status(404).json({ success: false, error: 'Customer not found' });
  }

  const updated = { ...customer, ...req.body, lastActive: new Date().toISOString() };
  customers.set(req.params.id, updated);

  res.json({ success: true, customer: updated });
});

// Delete customer
app.delete('/api/customers/:id', (req, res) => {
  if (!customers.has(req.params.id)) {
    return res.status(404).json({ success: false, error: 'Customer not found' });
  }

  customers.delete(req.params.id);
  profiles.delete(req.params.id);
  preferences.delete(req.params.id);
  history.delete(req.params.id);
  loyalty.delete(req.params.id);
  predictions.delete(req.params.id);

  res.json({ success: true, message: 'Customer deleted' });
});

// ============================================================
// SEGMENTS
// ============================================================

// Get all segments
app.get('/api/segments', (req, res) => {
  const segs = Array.from(segments.values());
  res.json({ success: true, segments: segs });
});

// Get segment by ID
app.get('/api/segments/:id', (req, res) => {
  const segment = segments.get(req.params.id);
  if (!segment) {
    return res.status(404).json({ success: false, error: 'Segment not found' });
  }

  // Get customers in segment
  const segCustomers = Array.from(customers.values()).filter(c => {
    if (segment.criteria.type && c.type !== segment.criteria.type) return false;
    if (segment.criteria.minLTV && c.lifetimeValue < segment.criteria.minLTV) return false;
    if (segment.criteria.churnRisk && !segment.criteria.churnRisk.includes(c.churnRisk)) return false;
    if (segment.criteria.npsMin && c.nps < segment.criteria.npsMin) return false;
    return true;
  });

  res.json({
    success: true,
    segment: { ...segment, count: segCustomers.length },
    customers: segCustomers
  });
});

// Create segment
app.post('/api/segments', (req, res) => {
  const { name, description, criteria } = req.body;

  if (!name || !criteria) {
    return res.status(400).json({ success: false, error: 'Name and criteria required' });
  }

  const segment = {
    id: `seg-${uuidv4().slice(0, 8)}`,
    name,
    description: description || '',
    criteria,
    count: 0,
    createdAt: new Date().toISOString()
  };

  segments.set(segment.id, segment);

  res.status(201).json({ success: true, segment });
});

// ============================================================
// PREFERENCES
// ============================================================

// Get customer preferences
app.get('/api/customers/:id/preferences', (req, res) => {
  const pref = preferences.get(req.params.id);
  if (!pref) {
    return res.status(404).json({ success: false, error: 'Customer preferences not found' });
  }
  res.json({ success: true, preferences: pref });
});

// Update customer preferences
app.patch('/api/customers/:id/preferences', (req, res) => {
  let pref = preferences.get(req.params.id);
  if (!pref) {
    pref = { customerId: req.params.id };
    preferences.set(req.params.id, pref);
  }

  const updated = { ...pref, ...req.body };
  preferences.set(req.params.id, updated);

  res.json({ success: true, preferences: updated });
});

// ============================================================
// LOYALTY & REWARDS
// ============================================================

// Get customer loyalty
app.get('/api/customers/:id/loyalty', (req, res) => {
  const loy = loyalty.get(req.params.id);
  if (!loy) {
    return res.status(404).json({ success: false, error: 'Customer loyalty not found' });
  }
  res.json({ success: true, loyalty: loy });
});

// Add loyalty points
app.post('/api/customers/:id/loyalty/points', (req, res) => {
  const { points, description, type = 'earn' } = req.body;

  if (!points) {
    return res.status(400).json({ success: false, error: 'Points required' });
  }

  let loy = loyalty.get(req.params.id);
  if (!loy) {
    loy = { customerId: req.params.id, points: 0, pointsValue: 0, tier: 'bronze', tierProgress: 0, nextTier: 'silver', pointsToNextTier: 1000, history: [] };
    loyalty.set(req.params.id, loy);
  }

  const pointChange = type === 'earn' ? points : -points;
  loy.points += pointChange;
  loy.pointsValue = loy.points * 0.01;
  loy.history.push({ type, points: pointChange, date: new Date().toISOString(), description });

  // Update tier if needed
  if (loy.points >= 50000) {
    loy.tier = 'platinum';
    loy.tierProgress = ((loy.points - 50000) / 25000) * 100;
    loy.nextTier = null;
    loy.pointsToNextTier = 0;
  } else if (loy.points >= 10000) {
    loy.tier = 'gold';
    loy.tierProgress = ((loy.points - 10000) / 40000) * 100;
    loy.nextTier = 'platinum';
    loy.pointsToNextTier = 50000 - loy.points;
  } else if (loy.points >= 2000) {
    loy.tier = 'silver';
    loy.tierProgress = ((loy.points - 2000) / 8000) * 100;
    loy.nextTier = 'gold';
    loy.pointsToNextTier = 10000 - loy.points;
  }

  loyalty.set(req.params.id, loy);
  res.json({ success: true, loyalty: loy });
});

// ============================================================
// PREDICTIONS & ANALYTICS
// ============================================================

// Get customer predictions
app.get('/api/customers/:id/predictions', (req, res) => {
  const pred = predictions.get(req.params.id);
  if (!pred) {
    return res.status(404).json({ success: false, error: 'Predictions not found' });
  }
  res.json({ success: true, predictions: pred });
});

// Get AI insights for customer
app.get('/api/customers/:id/insights', (req, res) => {
  const customer = customers.get(req.params.id);
  const pred = predictions.get(req.params.id);

  if (!customer) {
    return res.status(404).json({ success: false, error: 'Customer not found' });
  }

  const insights = [];

  // Churn risk insight
  if (pred && pred.churnProbability > 0.5) {
    insights.push({
      type: 'warning',
      title: 'High Churn Risk',
      description: `Customer has ${Math.round(pred.churnProbability * 100)}% probability of churning`,
      action: 'Consider proactive outreach or special offer'
    });
  }

  // High value insight
  if (customer.lifetimeValue > 100000) {
    insights.push({
      type: 'success',
      title: 'High Value Customer',
      description: `Customer lifetime value is $${customer.lifetimeValue.toLocaleString()}`,
      action: 'Prioritize for premium support'
    });
  }

  // NPS insight
  if (customer.nps >= 9) {
    insights.push({
      type: 'success',
      title: 'Promoter',
      description: 'Customer NPS score is 9-10',
      action: 'Request referral or testimonial'
    });
  }

  // Engagement insight
  if (customer.engagementScore < 50) {
    insights.push({
      type: 'info',
      title: 'Low Engagement',
      description: `Engagement score is ${customer.engagementScore}/100`,
      action: 'Send re-engagement campaign'
    });
  }

  // Upsell opportunity
  if (pred && pred.upsellProbability > 0.7) {
    insights.push({
      type: 'opportunity',
      title: 'Upsell Opportunity',
      description: `High probability (${Math.round(pred.upsellProbability * 100)}%) of accepting upgrade`,
      action: 'Send premium tier offer'
    });
  }

  res.json({ success: true, insights });
});

// ============================================================
// ANALYTICS & DASHBOARD
// ============================================================

// Get dashboard metrics
app.get('/api/analytics/dashboard', (req, res) => {
  const allCustomers = Array.from(customers.values());

  const metrics = {
    totalCustomers: allCustomers.length,
    activeCustomers: allCustomers.filter(c => c.status === 'active').length,
    totalLTV: allCustomers.reduce((sum, c) => sum + c.lifetimeValue, 0),
    averageLTV: allCustomers.reduce((sum, c) => sum + c.lifetimeValue, 0) / allCustomers.length,
    averageEngagement: allCustomers.reduce((sum, c) => sum + c.engagementScore, 0) / allCustomers.length,
    averageNPS: allCustomers.reduce((sum, c) => sum + c.nps, 0) / allCustomers.length,
    churnRisk: {
      low: allCustomers.filter(c => c.churnRisk === 'low').length,
      medium: allCustomers.filter(c => c.churnRisk === 'medium').length,
      high: allCustomers.filter(c => c.churnRisk === 'high').length
    },
    tiers: {
      platinum: allCustomers.filter(c => c.tier === 'platinum').length,
      gold: allCustomers.filter(c => c.tier === 'gold').length,
      silver: allCustomers.filter(c => c.tier === 'silver').length,
      bronze: allCustomers.filter(c => c.tier === 'bronze').length
    },
    recentSignups: allCustomers.filter(c => {
      const signup = new Date(c.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return signup > weekAgo;
    }).length
  };

  res.json({ success: true, metrics });
});

// Get segment analytics
app.get('/api/analytics/segments', (req, res) => {
  const segmentAnalytics = Array.from(segments.values()).map(seg => {
    const segCustomers = Array.from(customers.values()).filter(c => {
      if (seg.criteria.type && c.type !== seg.criteria.type) return false;
      if (seg.criteria.minLTV && c.lifetimeValue < seg.criteria.minLTV) return false;
      if (seg.criteria.churnRisk && !seg.criteria.churnRisk.includes(c.churnRisk)) return false;
      if (seg.criteria.npsMin && c.nps < seg.criteria.npsMin) return false;
      return true;
    });

    return {
      id: seg.id,
      name: seg.name,
      count: segCustomers.length,
      totalLTV: segCustomers.reduce((sum, c) => sum + c.lifetimeValue, 0),
      avgLTV: segCustomers.length > 0 ? segCustomers.reduce((sum, c) => sum + c.lifetimeValue, 0) / segCustomers.length : 0,
      avgNPS: segCustomers.length > 0 ? segCustomers.reduce((sum, c) => sum + c.nps, 0) / segCustomers.length : 0,
      atRiskCount: segCustomers.filter(c => c.churnRisk !== 'low').length
    };
  });

  res.json({ success: true, segments: segmentAnalytics });
});

// ============================================================
// EVENT TRACKING
// ============================================================

// Track customer event
app.post('/api/customers/:id/events', (req, res) => {
  const { type, data, source } = req.body;

  if (!type) {
    return res.status(400).json({ success: false, error: 'Event type required' });
  }

  let hist = history.get(req.params.id);
  if (!hist) {
    hist = { customerId: req.params.id, events: [] };
    history.set(req.params.id, hist);
  }

  const event = {
    type,
    data,
    source: source || 'api',
    date: new Date().toISOString()
  };

  hist.events.push(event);

  // Update customer based on event
  const customer = customers.get(req.params.id);
  if (customer) {
    customer.lastActive = event.date;

    if (type === 'purchase' && data.value) {
      customer.value = (customer.value || 0) + data.value;
      customer.lifetimeValue += data.value;
    }

    if (type === 'support_ticket') {
      customer.engagementScore = Math.max(0, customer.engagementScore - 5);
    }

    if (type === 'login') {
      customer.engagementScore = Math.min(100, customer.engagementScore + 2);
    }

    customers.set(req.params.id, customer);
  }

  res.status(201).json({ success: true, event });
});

// ============================================================
// CUSTOMER JOURNEY
// ============================================================

// Get customer journey
app.get('/api/customers/:id/journey', (req, res) => {
  const customer = customers.get(req.params.id);
  const hist = history.get(req.params.id);

  if (!customer) {
    return res.status(404).json({ success: false, error: 'Customer not found' });
  }

  // Build journey timeline
  const journey = {
    customerId: customer.id,
    startDate: customer.createdAt,
    currentStage: customer.status === 'active' ? 'customer' : 'churned',
    stages: [
      { name: 'Visitor', entered: customer.createdAt },
      { name: 'Lead', entered: customer.createdAt },
      { name: 'Customer', entered: customer.createdAt }
    ],
    touchpoints: hist?.events || [],
    summary: {
      totalInteractions: hist?.events?.length || 0,
      daysSinceSignup: Math.floor((Date.now() - new Date(customer.createdAt)) / (1000 * 60 * 60 * 24)),
      lastInteraction: customer.lastActive
    }
  };

  res.json({ success: true, journey });
});

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`[Customer Intelligence] Service started on port ${PORT}`);
  console.log(`[Customer Intelligence] ${customers.size} customers loaded`);
  console.log(`[Customer Intelligence] ${segments.size} segments available`);
});

module.exports = app;
