/**
 * RTMN Customer Twin Service
 * Comprehensive customer digital twin with LTV, behavior, preferences, segments
 *
 * Twin Structure:
 * - Customer Twin: Core identity and profile
 * - Behavior Twin: Shopping behavior, preferences
 * - Segment Twin: Customer segmentation
 * - Lifetime Value Twin: LTV calculation and prediction
 * - Churn Twin: Churn risk assessment
 * - Family Twin: Family/household relationships
 * - AI Memory Twin: AI-learned preferences
 */

import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { PersistentStore } from '@rtmn/shared/lib/persistent-store';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

import {
  requireAuth,
  preventPrototypePollution,
  sanitizeSearchInput,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  requestId,
  requestLogger,
  logger,
  defaultLimiter,
  strictLimiter,
  installPhase5
} from '@rtmn/twinos-shared';
import { publish, publishAsync } from '@rtmn/twinos-shared/src/event-publisher.js';
import { platform } from '@rtmn/twinos-shared/src/platform-client.js';

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


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4895;
const SERVICE_NAME = 'customer-twin';

// ============ MIDDLEWARE ============

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGINS?.split(',') || '*', credentials: true }));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));
app.use(requestId);
app.use(requestLogger);

// ============ IN-MEMORY STORAGE ============

const customers = new PersistentStore('customers', { serviceName: SERVICE_NAME });
const behaviors = new PersistentStore('behaviors', { serviceName: SERVICE_NAME });
const segments = new PersistentStore('segments', { serviceName: SERVICE_NAME });
const familyRelations = new PersistentStore('family-relations', { serviceName: SERVICE_NAME });
const aiMemories = new PersistentStore('ai-memories', { serviceName: SERVICE_NAME });
const preferences = new PersistentStore('preferences', { serviceName: SERVICE_NAME });

// Index maps for fast lookups (in-memory caches; rebuilt from primary stores on demand)
const byEmail = new Map();
const byPhone = new Map();
const bySegment = new Map();
const byBusiness = new Map();

// ============ SEGMENT DEFINITIONS ============

const SEGMENT_TYPES = {
  VALUE: ['vip', 'high_value', 'regular', 'at_risk', 'churned'],
  BEHAVIOR: ['frequent', 'occasional', 'new', 'dormant', 'inactive'],
  DEMOGRAPHIC: ['young_professional', 'family', 'senior', 'student', 'business'],
  ENGAGEMENT: ['highly_engaged', 'engaged', 'passive', 'unengaged']
};

// ============ TWIN FACTORY ============

function createCustomerTwin(data) {
  const now = new Date().toISOString();
  return {
    id: `cust-${uuidv4().slice(0, 8)}`,
    type: 'customer',
    ...data,
    status: data.status || 'active',
    health: 'healthy',
    version: 1,
    createdAt: now,
    updatedAt: now,
    _metadata: {
      service: SERVICE_NAME,
      twinVersion: '1.0.0'
    }
  };
}

function createBehaviorTwin(customerId, data) {
  const now = new Date().toISOString();
  return {
    id: `beh-${uuidv4().slice(0, 8)}`,
    customerId,
    type: 'behavior',
    ...data,
    version: 1,
    createdAt: now,
    updatedAt: now
  };
}

// ============ CUSTOMER TWIN ENDPOINTS ============

/**
 * GET /api/twins/customers
 * List customers with filtering
 */
app.get('/api/twins/customers', requireAuth, defaultLimiter, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, segment, status, search, businessId } = req.query;
  const userBusinessId = businessId || req.user.businessId;

  let results = Array.from(customers.values())
    .filter(c => c.businessId === userBusinessId);

  if (segment) {
    results = results.filter(c => c.segment === segment);
  }
  if (status) {
    results = results.filter(c => c.status === status);
  }
  if (search) {
    const query = sanitizeSearchInput(search);
    results = results.filter(c =>
      c.name?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.id.includes(query)
    );
  }

  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const start = (parseInt(page) - 1) * parseInt(limit);

  res.json({
    success: true,
    twins: results.slice(start, start + parseInt(limit)),
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages }
  });
}));

/**
 * GET /api/twins/customer/:id
 * Get customer twin with all related twins
 */
app.get('/api/twins/customer/:id', requireAuth, asyncHandler(async (req, res) => {
  const customer = customers.get(req.params.id);

  if (!customer) {
    return res.status(404).json({
      success: false,
      error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' }
    });
  }

  if (customer.businessId !== req.user.businessId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'Access denied' }
    });
  }

  // Gather related twins
  const related = {
    behavior: behaviors.get(customer.id) || null,
    segment: segments.get(customer.id) || null,
    family: Array.from(familyRelations.values()).filter(f => f.customerId === customer.id),
    aiMemory: Array.from(aiMemories.values()).filter(m => m.customerId === customer.id),
    preferences: preferences.get(customer.id) || null
  };

  res.json({
    success: true,
    twin: {
      ...customer,
      related
    }
  });
}));

/**
 * POST /api/twins/customer
 * Create new customer twin
 */
app.post('/api/twins/customer', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const data = preventPrototypePollution(req.body);
  const { name, email, phone, address, birthday, gender, metadata } = data;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Name is required' }
    });
  }

  // Check for duplicate email
  if (email && byEmail.has(email.toLowerCase())) {
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE_EMAIL', message: 'Customer with this email already exists' }
    });
  }

  const customer = createCustomerTwin({
    name,
    email: email?.toLowerCase(),
    phone,
    address,
    birthday,
    gender,
    businessId: req.user.businessId,
    segment: 'new',
    lifetimeValue: 0,
    orderCount: 0,
    averageOrderValue: 0,
    lastOrderDate: null,
    churnScore: 0,
    engagementScore: 50,
    metadata: metadata || {}
  });

  await customers.set(customer.id, customer);

  // Update indexes
  if (email) byEmail.set(email.toLowerCase(), customer.id);
  if (phone) byPhone.set(phone, customer.id);
  if (!byBusiness.has(customer.businessId)) byBusiness.set(customer.businessId, new Set());
  byBusiness.get(customer.businessId).add(customer.id);

  // Create initial behavior twin
  const behavior = createBehaviorTwin(customer.id, {
    totalOrders: 0,
    totalSpent: 0,
    favoriteCategories: [],
    favoriteProducts: [],
    preferredPaymentMethod: null,
    preferredShippingMethod: null,
    averageOrderFrequency: 0,
    daysSinceLastOrder: null,
    browsingHistory: [],
    searchQueries: [],
    abandonedCarts: 0,
    wishlistItems: []
  });
  await behaviors.set(customer.id, behavior);

  // Create initial segment twin
  const segmentTwin = {
    id: `seg-${uuidv4().slice(0, 8)}`,
    customerId: customer.id,
    segments: {
      value: 'regular',
      behavior: 'new',
      demographic: null,
      engagement: 'passive'
    },
    tags: [],
    updatedAt: new Date().toISOString()
  };
  await segments.set(customer.id, segmentTwin);

  publishAsync('customer.customer.created', { id: customer.id, email, businessId: req.user.businessId, segment: segmentTwin.segments.value });
  platform.bridge.autoBind(customer.id, 'episodic');
  platform.memory.recordEvent('customer.created', { customerId: customer.id, email, businessId: req.user.businessId }, customer.id);
  platform.policy.audit('create', 'customer', { customerId: customer.id, businessId: req.user.businessId });
  logger.info('Customer twin created', { customerId: customer.id, businessId: req.user.businessId });

  res.status(201).json({
    success: true,
    twin: {
      ...customer,
      behavior,
      segment: segmentTwin
    }
  });
}));

/**
 * PUT /api/twins/customer/:id
 * Update customer twin
 */
app.put('/api/twins/customer/:id', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const customer = customers.get(req.params.id);

  if (!customer) {
    return res.status(404).json({
      success: false,
      error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' }
    });
  }

  const data = preventPrototypePollution(req.body);
  const allowedFields = ['name', 'email', 'phone', 'address', 'birthday', 'gender', 'status', 'metadata'];

  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      customer[field] = data[field];
    }
  });

  customer.updatedAt = new Date().toISOString();
  customer.version++;

  await customers.set(customer.id, customer);

  publishAsync('customer.customer.updated', { id: customer.id, version: customer.version });
  platform.memory.recordEvent('customer.updated', { customerId: customer.id, changes: Object.keys(data).filter(k => allowedFields.includes(k)) }, customer.id);
  logger.info('Customer twin updated', { customerId: customer.id });

  res.json({ success: true, twin: customer });
}));

/**
 * DELETE /api/twins/customer/:id
 * Archive customer twin
 */
app.delete('/api/twins/customer/:id', requireAuth, asyncHandler(async (req, res) => {
  const customer = customers.get(req.params.id);

  if (!customer) {
    return res.status(404).json({
      success: false,
      error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' }
    });
  }

  customer.status = 'archived';
  customer.archivedAt = new Date().toISOString();
  customer.updatedAt = new Date().toISOString();

  await customers.set(customer.id, customer);

  publishAsync('customer.customer.archived', { id: customer.id });
  platform.bridge.unbind(customer.id);
  logger.info('Customer twin archived', { customerId: customer.id });

  res.json({ success: true, message: 'Customer archived' });
}));

// ============ BEHAVIOR TWIN ENDPOINTS ============

/**
 * PUT /api/twins/customer/:id/behavior
 * Update behavior twin
 */
app.put('/api/twins/customer/:id/behavior', requireAuth, asyncHandler(async (req, res) => {
  let behavior = behaviors.get(req.params.id);

  if (!behavior) {
    behavior = createBehaviorTwin(req.params.id, {});
    await behaviors.set(req.params.id, behavior);
  }

  const data = preventPrototypePollution(req.body);
  const allowedFields = [
    'totalOrders', 'totalSpent', 'favoriteCategories', 'favoriteProducts',
    'preferredPaymentMethod', 'preferredShippingMethod', 'averageOrderFrequency',
    'daysSinceLastOrder', 'browsingHistory', 'searchQueries',
    'abandonedCarts', 'wishlistItems'
  ];

  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      behavior[field] = data[field];
    }
  });

  behavior.updatedAt = new Date().toISOString();
  await behaviors.set(req.params.id, behavior);

  // Update parent customer metrics
  const customer = customers.get(req.params.id);
  if (customer) {
    customer.orderCount = behavior.totalOrders;
    customer.lifetimeValue = behavior.totalSpent;
    customer.averageOrderValue = behavior.totalOrders > 0
      ? behavior.totalSpent / behavior.totalOrders
      : 0;
    customer.lastOrderDate = behavior.lastOrderDate;
    customer.updatedAt = new Date().toISOString();
    await customers.set(customer.id, customer);
  }

  platform.memory.recordEvent('customer.behavior-recorded', { customerId: req.params.id, behavior: data }, req.params.id);
  publishAsync('customer.behavior.recorded', { customerId: req.params.id, behavior: data });

  res.json({ success: true, twin: behavior });
}));

/**
 * POST /api/twins/customer/:id/event
 * Record customer event (for AI learning)
 */
app.post('/api/twins/customer/:id/event', requireAuth, asyncHandler(async (req, res) => {
  const customer = customers.get(req.params.id);

  if (!customer) {
    return res.status(404).json({
      success: false,
      error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' }
    });
  }

  const { eventType, eventData, source } = preventPrototypePollution(req.body);

  const event = {
    id: `evt-${uuidv4().slice(0, 8)}`,
    customerId: customer.id,
    eventType,
    eventData,
    source,
    timestamp: new Date().toISOString()
  };

  // Store in AI memory
  const memory = {
    id: `mem-${uuidv4().slice(0, 8)}`,
    customerId: customer.id,
    type: 'event',
    content: event,
    confidence: 0.9,
    learnedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
  };

  await aiMemories.set(memory.id, memory);

  // Update engagement score
  customer.engagementScore = Math.min(100, (customer.engagementScore || 50) + 5);
  customer.updatedAt = new Date().toISOString();
  await customers.set(customer.id, customer);

  platform.memory.recordEvent(`customer.${eventType}`, { customerId: customer.id, event }, customer.id);
  publishAsync('customer.event.recorded', { customerId: customer.id, eventType });

  res.json({ success: true, event, memory });
}));

// ============ SEGMENT TWIN ENDPOINTS ============

/**
 * PUT /api/twins/customer/:id/segment
 * Update customer segment
 */
app.put('/api/twins/customer/:id/segment', requireAuth, asyncHandler(async (req, res) => {
  let segmentTwin = segments.get(req.params.id);

  if (!segmentTwin) {
    segmentTwin = {
      id: `seg-${uuidv4().slice(0, 8)}`,
      customerId: req.params.id,
      segments: { value: 'regular', behavior: 'new', demographic: null, engagement: 'passive' },
      tags: [],
      updatedAt: new Date().toISOString()
    };
    await segments.set(req.params.id, segmentTwin);
  }

  const data = preventPrototypePollution(req.body);

  if (data.segments) {
    Object.keys(data.segments).forEach(key => {
      if (SEGMENT_TYPES[key.toUpperCase()]?.includes(data.segments[key])) {
        segmentTwin.segments[key] = data.segments[key];
      }
    });
  }

  if (data.tags) {
    segmentTwin.tags = [...new Set([...segmentTwin.tags, ...data.tags])];
  }

  segmentTwin.updatedAt = new Date().toISOString();
  await segments.set(req.params.id, segmentTwin);

  // Update parent customer segment
  const customer = customers.get(req.params.id);
  if (customer && segmentTwin.segments.value) {
    customer.segment = segmentTwin.segments.value;
    customer.updatedAt = new Date().toISOString();
    await customers.set(customer.id, customer);
  }

  platform.memory.recordEvent('customer.segment-changed', { customerId: req.params.id, segmentId: segmentTwin.id }, req.params.id);
  publishAsync('customer.segment.changed', { customerId: req.params.id, segmentId: segmentTwin.id });

  res.json({ success: true, twin: segmentTwin });
}));

/**
 * GET /api/segments
 * Get all segments
 */
app.get('/api/segments', requireAuth, asyncHandler(async (req, res) => {
  const businessId = req.user.businessId;
  const segmentCounts = {};

  SEGMENT_TYPES.VALUE.forEach(seg => segmentCounts[seg] = 0);

  customers.forEach(c => {
    if (c.businessId === businessId && c.segment) {
      segmentCounts[c.segment] = (segmentCounts[c.segment] || 0) + 1;
    }
  });

  res.json({
    success: true,
    segments: segmentCounts,
    definitions: SEGMENT_TYPES
  });
}));

// ============ LTV & CHURN ENDPOINTS ============

/**
 * GET /api/twins/customer/:id/ltv
 * Get lifetime value analysis
 */
app.get('/api/twins/customer/:id/ltv', requireAuth, asyncHandler(async (req, res) => {
  const customer = customers.get(req.params.id);

  if (!customer) {
    return res.status(404).json({
      success: false,
      error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' }
    });
  }

  const behavior = behaviors.get(customer.id);

  const ltvAnalysis = {
    currentLTV: customer.lifetimeValue || 0,
    averageOrderValue: customer.averageOrderValue || 0,
    orderCount: customer.orderCount || 0,
    predictedLTV: calculatePredictedLTV(customer, behavior),
    ltvTier: getLTVTier(customer.lifetimeValue || 0),
    potential: calculateLTVPotential(customer),
    recommendations: generateLTVRecommendations(customer, behavior)
  };

  res.json({ success: true, ltv: ltvAnalysis });
}));

/**
 * GET /api/twins/customer/:id/churn
 * Get churn risk analysis
 */
app.get('/api/twins/customer/:id/churn', requireAuth, asyncHandler(async (req, res) => {
  const customer = customers.get(req.params.id);
  const behavior = behaviors.get(customer?.id);

  if (!customer) {
    return res.status(404).json({
      success: false,
      error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' }
    });
  }

  const churnAnalysis = {
    riskScore: customer.churnScore || 0,
    riskLevel: getChurnRiskLevel(customer.churnScore || 0),
    factors: analyzeChurnFactors(customer, behavior),
    lastOrderDays: behavior?.daysSinceLastOrder || null,
    recommendedActions: getChurnPreventionActions(customer, behavior)
  };

  res.json({ success: true, churn: churnAnalysis });
}));

// ============ ANALYTICS ENDPOINTS ============

/**
 * GET /api/analytics/customers
 * Get customer analytics
 */
app.get('/api/analytics/customers', requireAuth, asyncHandler(async (req, res) => {
  const businessId = req.user.businessId;
  const businessCustomers = Array.from(customers.values())
    .filter(c => c.businessId === businessId);

  const analytics = {
    totalCustomers: businessCustomers.length,
    totalLTV: businessCustomers.reduce((sum, c) => sum + (c.lifetimeValue || 0), 0),
    averageLTV: businessCustomers.length > 0
      ? businessCustomers.reduce((sum, c) => sum + (c.lifetimeValue || 0), 0) / businessCustomers.length
      : 0,
    bySegment: {},
    byStatus: {},
    newThisMonth: 0,
    atRiskCount: 0
  };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  businessCustomers.forEach(c => {
    analytics.bySegment[c.segment] = (analytics.bySegment[c.segment] || 0) + 1;
    analytics.byStatus[c.status] = (analytics.byStatus[c.status] || 0) + 1;

    if (new Date(c.createdAt) >= monthStart) analytics.newThisMonth++;
    if (c.segment === 'at_risk' || c.churnScore > 70) analytics.atRiskCount++;
  });

  res.json({ success: true, analytics });
}));

// ============ FAMILY RELATIONSHIPS ============

/**
 * POST /api/twins/customer/:id/family
 * Add family member relationship
 */
app.post('/api/twins/customer/:id/family', requireAuth, asyncHandler(async (req, res) => {
  const { memberId, relationship, name } = preventPrototypePollution(req.body);

  const relation = {
    id: `fam-${uuidv4().slice(0, 8)}`,
    customerId: req.params.id,
    memberId,
    memberName: name,
    relationship,
    createdAt: new Date().toISOString()
  };

  await familyRelations.set(relation.id, relation);

  publishAsync('customer.family.added', { customerId: req.params.id, relatedUserId: memberId });

  res.status(201).json({ success: true, twin: relation });
}));

// ============ HELPER FUNCTIONS ============

function calculatePredictedLTV(customer, behavior) {
  const currentLTV = customer.lifetimeValue || 0;
  const avgOrderValue = customer.averageOrderValue || 0;
  const orderFrequency = behavior?.averageOrderFrequency || 30; // days between orders
  const customerAge = Math.max(1, Math.floor((Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

  // Project over 2 years
  const projectedOrders = (365 * 2) / Math.max(1, orderFrequency);
  const predictedLTV = avgOrderValue * projectedOrders;

  return Math.round(predictedLTV * 100) / 100;
}

function getLTVTier(ltv) {
  if (ltv > 10000) return 'platinum';
  if (ltv > 5000) return 'gold';
  if (ltv > 1000) return 'silver';
  return 'bronze';
}

function calculateLTVPotential(customer) {
  const currentLTV = customer.lifetimeValue || 0;
  const engagementScore = customer.engagementScore || 50;

  // Potential based on engagement
  const potentialMultiplier = 1 + (engagementScore / 100);
  const potentialLTV = currentLTV * potentialMultiplier;

  return Math.round((potentialLTV - currentLTV) * 100) / 100;
}

function generateLTVRecommendations(customer, behavior) {
  const recs = [];

  if (customer.orderCount < 3) {
    recs.push({ action: 'onboarding', priority: 'high', message: 'Focus on first 3 orders' });
  }
  if ((customer.lifetimeValue || 0) < 100) {
    recs.push({ action: 'increase_aov', priority: 'high', message: 'Encourage larger orders' });
  }
  if (customer.segment === 'at_risk') {
    recs.push({ action: 'retention', priority: 'critical', message: 'Implement retention campaign' });
  }

  return recs;
}

function getChurnRiskLevel(score) {
  if (score < 30) return 'low';
  if (score < 60) return 'medium';
  if (score < 80) return 'high';
  return 'critical';
}

function analyzeChurnFactors(customer, behavior) {
  const factors = [];

  if (behavior?.daysSinceLastOrder > 90) {
    factors.push({ factor: 'inactive_period', weight: 30, severity: 'high' });
  }
  if (customer.engagementScore < 30) {
    factors.push({ factor: 'low_engagement', weight: 25, severity: 'high' });
  }
  if (behavior?.abandonedCarts > 3) {
    factors.push({ factor: 'cart_abandonment', weight: 15, severity: 'medium' });
  }
  if (customer.segment === 'at_risk') {
    factors.push({ factor: 'segment_risk', weight: 20, severity: 'high' });
  }

  return factors;
}

function getChurnPreventionActions(customer, behavior) {
  const actions = [];

  if (behavior?.daysSinceLastOrder > 60) {
    actions.push({ type: 're_engagement', message: 'Send win-back campaign' });
  }
  if (customer.engagementScore < 40) {
    actions.push({ type: 'increase_engagement', message: 'Personalized content recommendations' });
  }

  return actions;
}

// ============ HEALTH ENDPOINTS ============

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      customers: customers.size,
      behaviors: behaviors.size,
      segments: segments.size,
      aiMemories: aiMemories.size
    }
  });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', service: SERVICE_NAME });
});

// ============ ERROR HANDLING ============

// ============ PHASE 5 (lifecycle + merge + SSE + /ready) ============
const phase5Cleanup = installPhase5(app, {
  serviceName: (typeof SERVICE_NAME !== 'undefined' && SERVICE_NAME) || process.env.SERVICE_NAME || 'twin',
  twinType: 'customer',
  store: typeof customers !== 'undefined' ? customers : null,
  version: process.env.SERVICE_VERSION || '2.0.0',
  stats: () => ({ count: customers.size }),
})

app.use(notFoundHandler);
app.use(errorHandler);

// ============ START ============


;
const server = app.listen(PORT, () => {
  logger.info(`👤 Customer Twin Service running on port ${PORT}`);
});
installGracefulShutdown(server, phase5Cleanup);

export default app;
