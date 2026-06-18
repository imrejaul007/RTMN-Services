/**
 * RTMN TwinOS Hub v2.0
 * Central registry and coordination for all digital twins
 *
 * Features:
 * - Twin Registry (CRUD operations)
 * - Twin State Management
 * - Cross-Twin Relationships
 * - Sync Operations
 * - Authentication & Authorization
 * - Rate Limiting
 * - Input Validation
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

import {
  requireAuth,
  optionalAuth,
  requireRole,
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
  authLimiter
} from '@rtmn/twinos-shared';

const app = express();
const PORT = process.env.PORT || 4705;
const SERVICE_NAME = 'twinos-hub';

// ============ MIDDLEWARE ============

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true
}));

app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(requestId);
app.use(requestLogger);

// ============ IN-MEMORY STORAGE ============

const twinRegistry = new Map();
const twinStates = new Map();
const twinRelationships = new Map();
const syncEvents = [];
const businessRegistry = new Map();

// User store (replace with DB in production)
const users = new Map();
const sessions = new Map();

// ============ TWIN DEFINITIONS ============

const TWIN_DEFINITIONS = {
  // Foundation Twins
  'corpid.identity': { service: 'corpid-os', port: 4702, type: 'identity', category: 'foundation' },
  'memory.knowledge': { service: 'memory-os', port: 4703, type: 'storage', category: 'foundation' },
  'goal.objective': { service: 'goal-os', port: 4242, type: 'orchestration', category: 'foundation' },
  'decision.policy': { service: 'decision-engine', port: 4240, type: 'policy', category: 'foundation' },
  'agent.ai': { service: 'agent-os', port: 3002, type: 'agent', category: 'foundation' },

  // Commerce Twins
  'commerce.customer': { service: 'customer-twin', port: 4895, type: 'person', category: 'commerce' },
  'commerce.order': { service: 'order-twin', port: 4885, type: 'order', category: 'commerce' },
  'commerce.wallet': { service: 'wallet-twin', port: 4896, type: 'transaction', category: 'commerce' },
  'commerce.payment': { service: 'payment-twin', port: 4886, type: 'transaction', category: 'commerce' },
  'commerce.product': { service: 'product-twin', port: 4720, type: 'catalog', category: 'commerce' },
  'commerce.inventory': { service: 'inventory-twin', port: 4887, type: 'catalog', category: 'commerce' },
  'commerce.merchant': { service: 'merchant-twin', port: 4888, type: 'entity', category: 'commerce' },
  'commerce.cart': { service: 'order-twin', port: 4885, type: 'order', category: 'commerce' },
  'commerce.coupon': { service: 'marketing-os', port: 5500, type: 'catalog', category: 'commerce' },

  // People Twins
  'people.employee': { service: 'employee-twin', port: 4730, type: 'workforce', category: 'people' },
  'people.user': { service: 'user-twin', port: 4889, type: 'person', category: 'people' },
  'people.founder': { service: 'founder-os', port: 5100, type: 'person', category: 'people' },

  // AI/Memory Twins
  'ai.memory': { service: 'memory-os', port: 4703, type: 'storage', category: 'ai' },
  'ai.conversation': { service: 'genie-memory', port: 4710, type: 'event', category: 'ai' },
  'ai.intent': { service: 'genie-intent', port: 4725, type: 'concept', category: 'ai' },
  'ai.goal': { service: 'goal-os', port: 4242, type: 'concept', category: 'ai' },
  'ai.simulation': { service: 'simulation-os', port: 4241, type: 'model', category: 'ai' },

  // Hospitality Twins
  'hospitality.hotel': { service: 'hotel-os', port: 5025, type: 'resource', category: 'hospitality' },
  'hospitality.room': { service: 'hotel-os', port: 5025, type: 'resource', category: 'hospitality' },
  'hospitality.guest': { service: 'guest-twin', port: 4876, type: 'person', category: 'hospitality' },
  'hospitality.booking': { service: 'hotel-os', port: 5025, type: 'order', category: 'hospitality' },
  'hospitality.restaurant': { service: 'restaurant-os', port: 5010, type: 'resource', category: 'hospitality' },
  'hospitality.menu': { service: 'restaurant-os', port: 5010, type: 'catalog', category: 'hospitality' },
  'hospitality.table': { service: 'restaurant-os', port: 5010, type: 'resource', category: 'hospitality' },

  // Healthcare Twins
  'healthcare.patient': { service: 'healthcare-os', port: 5020, type: 'person', category: 'healthcare' },
  'healthcare.doctor': { service: 'healthcare-os', port: 5020, type: 'person', category: 'healthcare' },
  'healthcare.hospital': { service: 'healthcare-os', port: 5020, type: 'resource', category: 'healthcare' },
  'healthcare.prescription': { service: 'healthcare-os', port: 5020, type: 'document', category: 'healthcare' },

  // Finance Twins
  'finance.asset': { service: 'asset-twin', port: 4890, type: 'entity', category: 'finance' },
  'finance.budget': { service: 'finance-os', port: 4801, type: 'metric', category: 'finance' },
  'finance.expense': { service: 'finance-os', port: 4801, type: 'transaction', category: 'finance' },
  'finance.invoice': { service: 'finance-os', port: 4801, type: 'document', category: 'finance' },
  'finance.ledger': { service: 'finance-os', port: 4801, type: 'document', category: 'finance' },

  // Marketing Twins
  'marketing.campaign': { service: 'marketing-os', port: 5500, type: 'event', category: 'marketing' },
  'marketing.audience': { service: 'adbazaar-audience', port: 4805, type: 'entity', category: 'marketing' },
  'marketing.ad': { service: 'adbazaar-dsp', port: 4990, type: 'event', category: 'marketing' },
  'marketing.creative': { service: 'media-os', port: 5600, type: 'document', category: 'marketing' },

  // Operations Twins
  'ops.project': { service: 'operations-os', port: 5250, type: 'entity', category: 'operations' },
  'ops.task': { service: 'operations-os', port: 5250, type: 'event', category: 'operations' },
  'ops.process': { service: 'operations-os', port: 5250, type: 'event', category: 'operations' },
  'ops.incident': { service: 'operations-os', port: 5250, type: 'event', category: 'operations' },
  'ops.resource': { service: 'operations-os', port: 5250, type: 'resource', category: 'operations' },

  // Real Estate Twins
  'realestate.property': { service: 'realestate-os', port: 5230, type: 'entity', category: 'realestate' },
  'realestate.building': { service: 'realestate-os', port: 5230, type: 'resource', category: 'realestate' },
  'realestate.lease': { service: 'realestate-os', port: 5230, type: 'document', category: 'realestate' },
  'realestate.tenant': { service: 'realestate-os', port: 5230, type: 'person', category: 'realestate' },

  // HR Twins
  'hr.candidate': { service: 'workforce-os', port: 5077, type: 'person', category: 'hr' },
  'hr.payroll': { service: 'workforce-os', port: 5077, type: 'transaction', category: 'hr' },
  'hr.performance': { service: 'workforce-os', port: 5077, type: 'metric', category: 'hr' },
  'hr.department': { service: 'workforce-os', port: 5077, type: 'entity', category: 'hr' },

  // Voice/Personal Twins
  'voice.profile': { service: 'voice-twin', port: 4876, type: 'person', category: 'personal' },
  'voice.recording': { service: 'voice-twin', port: 4876, type: 'document', category: 'personal' },
  'social.community': { service: 'buzzlocal-os', port: 5200, type: 'entity', category: 'social' },
  'social.post': { service: 'buzzlocal-os', port: 5200, type: 'event', category: 'social' },

  // Business Twins
  'business.partner': { service: 'partner-twin', port: 4892, type: 'entity', category: 'business' },
  'business.organization': { service: 'organization-twin', port: 4710, type: 'entity', category: 'business' },
  'business.lead': { service: 'lead-twin', port: 4894, type: 'person', category: 'business' },

  // Event Twins
  'event.event': { service: 'event-os', port: 4751, type: 'event', category: 'event' },
  'event.venue': { service: 'event-os', port: 4751, type: 'resource', category: 'event' },
  'event.ticket': { service: 'event-os', port: 4751, type: 'catalog', category: 'event' },
  'event.exhibitor': { service: 'event-os', port: 4751, type: 'entity', category: 'event' },
  'event.speaker': { service: 'event-os', port: 4751, type: 'person', category: 'event' },

  // Travel Twins
  'travel.flight': { service: 'travel-os', port: 5190, type: 'event', category: 'travel' },
  'travel.passenger': { service: 'travel-os', port: 5190, type: 'person', category: 'travel' },
  'travel.trip': { service: 'travel-os', port: 5190, type: 'entity', category: 'travel' }
};

// Initialize default twins
function initializeDefaults() {
  for (const [twinId, definition] of Object.entries(TWIN_DEFINITIONS)) {
    const twin = {
      id: twinId,
      name: twinId.split('.').pop(),
      service: definition.service,
      type: definition.type,
      category: definition.category,
      port: definition.port,
      status: 'registered',
      health: 'unknown',
      lastSync: null,
      lastUpdate: null,
      version: 1,
      syncCount: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    twinRegistry.set(twinId, twin);
    twinStates.set(twinId, { data: null, timestamp: null });
  }
  logger.info(`TwinOS Hub initialized with ${twinRegistry.size} twin definitions`);
}

initializeDefaults();

// ============ TWIN FACTORY ============

function createTwin(data) {
  const now = new Date().toISOString();
  return {
    id: data.id,
    name: data.name || data.id.split('.').pop(),
    service: data.service,
    type: data.type || 'entity',
    category: data.category || 'custom',
    port: data.port || 0,
    status: data.status || 'active',
    health: data.health || 'healthy',
    version: 1,
    syncCount: 0,
    metadata: data.metadata || {},
    relationships: [],
    tags: data.tags || [],
    owner: data.owner || null,
    businessId: data.businessId || null,
    createdAt: now,
    updatedAt: now
  };
}

// ============ AUTH ENDPOINTS ============

/**
 * POST /auth/register
 * Register new user/business
 */
app.post('/auth/register', authLimiter, asyncHandler(async (req, res) => {
  const { email, password, businessId, businessName, role = 'owner' } = preventPrototypePollution(req.body);

  if (!email || !password || !businessId) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Email, password, and businessId required' }
    });
  }

  if (users.has(email.toLowerCase())) {
    return res.status(409).json({
      success: false,
      error: { code: 'USER_EXISTS', message: 'User already exists' }
    });
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  const user = {
    id: `user-${uuidv4().slice(0, 8)}`,
    email: email.toLowerCase(),
    passwordHash,
    businessId,
    businessName: businessName || businessId,
    role,
    createdAt: new Date().toISOString()
  };

  users.set(email.toLowerCase(), user);

  // Create business registry entry
  if (!businessRegistry.has(businessId)) {
    businessRegistry.set(businessId, {
      id: businessId,
      name: businessName || businessId,
      twins: [],
      createdAt: new Date().toISOString()
    });
  }

  // Generate tokens
  const tokens = generateTokens(user);

  logger.info('User registered', { userId: user.id, businessId });

  res.status(201).json({
    success: true,
    ...tokens,
    user: { id: user.id, email: user.email, role: user.role }
  });
}));

/**
 * POST /auth/login
 */
app.post('/auth/login', authLimiter, asyncHandler(async (req, res) => {
  const { email, password } = preventPrototypePollution(req.body);

  const user = users.get(email?.toLowerCase());
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
    });
  }

  const tokens = generateTokens(user);

  logger.info('User logged in', { userId: user.id });

  res.json({
    success: true,
    ...tokens,
    user: { id: user.id, email: user.email, role: user.role }
  });
}));

/**
 * POST /auth/refresh
 */
app.post('/auth/refresh', authLimiter, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_TOKEN', message: 'Refresh token required' }
    });
  }

  const session = sessions.get(refreshToken);
  if (!session || session.expiresAt < Date.now()) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token' }
    });
  }

  const user = users.get(session.email);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' }
    });
  }

  // Revoke old session
  sessions.delete(refreshToken);

  // Generate new tokens
  const tokens = generateTokens(user);

  res.json({ success: true, ...tokens });
}));

/**
 * POST /auth/logout
 */
app.post('/auth/logout', requireAuth, asyncHandler(async (req, res) => {
  logger.info('User logged out', { userId: req.user.id });
  res.json({ success: true, message: 'Logged out successfully' });
}));

/**
 * GET /auth/me
 */
app.get('/auth/me', requireAuth, asyncHandler(async (req, res) => {
  const user = users.get(req.user.email);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' }
    });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId
    }
  });
}));

// ============ TWIN REGISTRY ENDPOINTS ============

/**
 * GET /api/twins
 * List all twins with filtering
 */
app.get('/api/twins', optionalAuth, defaultLimiter, asyncHandler(async (req, res) => {
  const { category, type, status, service, search, businessId } = req.query;

  let twins = Array.from(twinRegistry.values());

  // Filter by business scope if authenticated
  if (req.user) {
    twins = twins.filter(t =>
      !t.businessId || t.businessId === req.user.businessId ||
      t.category !== 'custom'
    );
  }

  if (category) twins = twins.filter(t => t.category === category);
  if (type) twins = twins.filter(t => t.type === type);
  if (status) twins = twins.filter(t => t.status === status);
  if (service) twins = twins.filter(t => t.service === service);
  if (search) {
    const query = sanitizeSearchInput(search);
    twins = twins.filter(t =>
      t.id.includes(query) ||
      t.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  res.json({
    success: true,
    count: twins.length,
    twins: twins.map(t => ({
      ...t,
      state: twinStates.has(t.id) ? 'available' : 'empty'
    }))
  });
}));

/**
 * GET /api/twins/:id
 * Get twin details
 */
app.get('/api/twins/:id', optionalAuth, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);

  if (!twin) {
    return res.status(404).json({
      success: false,
      error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' }
    });
  }

  // Check access for custom twins
  if (twin.businessId && twin.category === 'custom' && req.user) {
    if (twin.businessId !== req.user.businessId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Access denied' }
      });
    }
  }

  const state = twinStates.get(req.params.id);
  const relationships = twinRelationships.get(req.params.id) || [];

  res.json({
    success: true,
    twin: {
      ...twin,
      state,
      relationships
    }
  });
}));

/**
 * POST /api/twins
 * Register new twin
 */
app.post('/api/twins', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { id, name, service, type, category, port, metadata, tags } = preventPrototypePollution(req.body);

  if (!id || !name) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'ID and name are required' }
    });
  }

  // Validate ID format
  if (!/^[a-z0-9-_.]+$/.test(id)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID', message: 'ID must be lowercase alphanumeric with hyphens, underscores, or dots' }
    });
  }

  if (twinRegistry.has(id)) {
    return res.status(409).json({
      success: false,
      error: { code: 'TWIN_EXISTS', message: 'Twin with this ID already exists' }
    });
  }

  const twin = createTwin({
    id,
    name,
    service,
    type,
    category,
    port,
    metadata,
    tags,
    businessId: req.user.businessId,
    owner: req.user.id
  });

  twinRegistry.set(id, twin);
  twinStates.set(id, { data: null, timestamp: null });

  // Update business registry
  if (businessRegistry.has(req.user.businessId)) {
    businessRegistry.get(req.user.businessId).twins.push(id);
  }

  logger.info('Twin registered', { twinId: id, businessId: req.user.businessId });

  res.status(201).json({
    success: true,
    twin
  });
}));

/**
 * PUT /api/twins/:id
 * Update twin metadata
 */
app.put('/api/twins/:id', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);

  if (!twin) {
    return res.status(404).json({
      success: false,
      error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' }
    });
  }

  // Check ownership
  if (twin.businessId && twin.owner !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'Only owner or admin can update' }
    });
  }

  const { name, type, category, port, metadata, tags, status } = preventPrototypePollution(req.body);

  if (name) twin.name = name;
  if (type) twin.type = type;
  if (category) twin.category = category;
  if (port) twin.port = port;
  if (metadata) twin.metadata = { ...twin.metadata, ...metadata };
  if (tags) twin.tags = [...new Set([...twin.tags, ...tags])];
  if (status && ['active', 'inactive', 'archived'].includes(status)) twin.status = status;

  twin.updatedAt = new Date().toISOString();
  twin.version++;

  logger.info('Twin updated', { twinId: twin.id });

  res.json({ success: true, twin });
}));

/**
 * DELETE /api/twins/:id
 * Unregister twin
 */
app.delete('/api/twins/:id', requireAuth, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);

  if (!twin) {
    return res.status(404).json({
      success: false,
      error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' }
    });
  }

  // Check ownership
  if (twin.businessId && twin.owner !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'Only owner or admin can delete' }
    });
  }

  twinRegistry.delete(req.params.id);
  twinStates.delete(req.params.id);
  twinRelationships.delete(req.params.id);

  logger.info('Twin unregistered', { twinId: req.params.id });

  res.json({ success: true, message: 'Twin unregistered' });
}));

// ============ TWIN STATE ENDPOINTS ============

/**
 * GET /api/twins/:id/state
 */
app.get('/api/twins/:id/state', requireAuth, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);

  if (!twin) {
    return res.status(404).json({
      success: false,
      error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' }
    });
  }

  const state = twinStates.get(req.params.id) || { data: null, timestamp: null };

  res.json({ success: true, twinId: twin.id, state });
}));

/**
 * PUT /api/twins/:id/state
 */
app.put('/api/twins/:id/state', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);

  if (!twin) {
    return res.status(404).json({
      success: false,
      error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' }
    });
  }

  const { data, version } = preventPrototypePollution(req.body);

  if (data === undefined) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Data is required' }
    });
  }

  const timestamp = new Date().toISOString();
  const newVersion = version || twin.version + 1;

  twinStates.set(req.params.id, { data, timestamp, version: newVersion });
  twin.lastUpdate = timestamp;
  twin.version = newVersion;
  twin.updatedAt = timestamp;

  logger.info('Twin state updated', { twinId: twin.id, version: newVersion });

  res.json({ success: true, state: twinStates.get(req.params.id) });
}));

// ============ RELATIONSHIP ENDPOINTS ============

/**
 * GET /api/relationships
 */
app.get('/api/relationships', optionalAuth, asyncHandler(async (req, res) => {
  const { twinId, type } = req.query;

  let relationships = [];

  for (const [sourceId, rels] of twinRelationships.entries()) {
    for (const rel of rels) {
      if (!twinId || rel.sourceId === twinId || rel.targetId === twinId) {
        if (!type || rel.type === type) {
          relationships.push({ ...rel, sourceId });
        }
      }
    }
  }

  res.json({ success: true, count: relationships.length, relationships });
}));

/**
 * POST /api/relationships
 */
app.post('/api/relationships', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { sourceId, targetId, type = 'related', metadata } = preventPrototypePollution(req.body);

  if (!sourceId || !targetId) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Source and target IDs required' }
    });
  }

  if (!twinRegistry.has(sourceId) || !twinRegistry.has(targetId)) {
    return res.status(404).json({
      success: false,
      error: { code: 'TWIN_NOT_FOUND', message: 'Source or target twin not found' }
    });
  }

  if (!twinRelationships.has(sourceId)) {
    twinRelationships.set(sourceId, []);
  }

  const relationship = {
    id: `rel-${uuidv4().slice(0, 8)}`,
    sourceId,
    targetId,
    type,
    metadata: metadata || {},
    createdBy: req.user.id,
    createdAt: new Date().toISOString()
  };

  twinRelationships.get(sourceId).push(relationship);

  logger.info('Relationship created', { sourceId, targetId, type });

  res.status(201).json({ success: true, relationship });
}));

/**
 * DELETE /api/relationships/:id
 */
app.delete('/api/relationships/:id', requireAuth, asyncHandler(async (req, res) => {
  let deleted = false;

  for (const [sourceId, rels] of twinRelationships.entries()) {
    const index = rels.findIndex(r => r.id === req.params.id);
    if (index !== -1) {
      rels.splice(index, 1);
      deleted = true;
      break;
    }
  }

  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: { code: 'RELATIONSHIP_NOT_FOUND', message: 'Relationship not found' }
    });
  }

  logger.info('Relationship deleted', { relationshipId: req.params.id });

  res.json({ success: true, message: 'Relationship deleted' });
}));

// ============ SYNC ENDPOINTS ============

/**
 * POST /api/sync/:id
 */
app.post('/api/sync/:id', requireAuth, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);

  if (!twin) {
    return res.status(404).json({
      success: false,
      error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' }
    });
  }

  twin.status = 'syncing';
  twinRegistry.set(twin.id, twin);

  // Simulate async sync (in production, would call actual service)
  setTimeout(() => {
    twin.status = 'active';
    twin.lastSync = new Date().toISOString();
    twin.syncCount++;
    twin.health = 'healthy';
    twinRegistry.set(twin.id, twin);

    syncEvents.unshift({
      id: uuidv4(),
      twinId: twin.id,
      action: 'sync',
      status: 'completed',
      timestamp: new Date().toISOString()
    });

    if (syncEvents.length > 1000) syncEvents.pop();
  }, 100);

  res.json({ success: true, twin, message: 'Sync initiated' });
}));

/**
 * POST /api/sync
 * Bulk sync
 */
app.post('/api/sync', requireAuth, asyncHandler(async (req, res) => {
  const { twinIds } = preventPrototypePollution(req.body);

  const results = [];

  if (twinIds && twinIds.length > 0) {
    for (const id of twinIds) {
      const twin = twinRegistry.get(id);
      if (twin) {
        twin.status = 'syncing';
        twinRegistry.set(twin.id, twin);
        results.push({ id, success: true });
      } else {
        results.push({ id, success: false, error: 'Not found' });
      }
    }
  } else {
    // Sync all twins
    for (const [id, twin] of twinRegistry) {
      twin.status = 'syncing';
      twinRegistry.set(id, twin);
    }
    results.push({ success: true, message: 'Full sync initiated' });
  }

  res.json({ success: true, results, message: 'Bulk sync initiated' });
}));

/**
 * GET /api/sync/history
 */
app.get('/api/sync/history', requireAuth, asyncHandler(async (req, res) => {
  const { twinId, limit = 50 } = req.query;

  let events = [...syncEvents];

  if (twinId) {
    events = events.filter(e => e.twinId === twinId);
  }

  events = events.slice(0, parseInt(limit));

  res.json({ success: true, count: events.length, events });
}));

// ============ STATISTICS & ANALYTICS ============

/**
 * GET /api/stats
 */
app.get('/api/stats', optionalAuth, asyncHandler(async (req, res) => {
  const twins = Array.from(twinRegistry.values());
  const categories = {};
  const services = {};
  const byStatus = {};
  const byHealth = {};

  twins.forEach(twin => {
    categories[twin.category] = (categories[twin.category] || 0) + 1;
    services[twin.service] = (services[twin.service] || 0) + 1;
    byStatus[twin.status] = (byStatus[twin.status] || 0) + 1;
    byHealth[twin.health] = (byHealth[twin.health] || 0) + 1;
  });

  res.json({
    success: true,
    stats: {
      totalTwins: twins.length,
      byCategory: categories,
      byService: services,
      byStatus,
      byHealth,
      totalSyncs: twins.reduce((sum, t) => sum + t.syncCount, 0),
      businesses: businessRegistry.size,
      users: users.size
    }
  });
}));

/**
 * GET /api/categories
 */
app.get('/api/categories', optionalAuth, asyncHandler(async (req, res) => {
  const twins = Array.from(twinRegistry.values());
  const categories = [...new Set(twins.map(t => t.category))];

  res.json({
    success: true,
    categories: categories.map(cat => ({
      name: cat,
      count: twins.filter(t => t.category === cat).length,
      twins: twins.filter(t => t.category === cat).map(t => t.id)
    }))
  });
}));

/**
 * GET /api/services
 */
app.get('/api/services', optionalAuth, asyncHandler(async (req, res) => {
  const twins = Array.from(twinRegistry.values());
  const services = [...new Set(twins.map(t => t.service))];

  res.json({
    success: true,
    services: services.map(svc => ({
      name: svc,
      count: twins.filter(t => t.service === svc).length,
      twins: twins.filter(t => t.service === svc).map(t => t.id)
    }))
  });
}));

// ============ HEALTH ENDPOINTS ============

app.get('/health', (req, res) => {
  const twins = Array.from(twinRegistry.values());

  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      totalTwins: twins.length,
      activeTwins: twins.filter(t => t.status === 'active').length,
      syncingTwins: twins.filter(t => t.status === 'syncing').length,
      healthyTwins: twins.filter(t => t.health === 'healthy').length,
      businesses: businessRegistry.size,
      users: users.size,
      relationships: Array.from(twinRelationships.values()).reduce((sum, r) => sum + r.length, 0)
    }
  });
});

app.get('/ready', (req, res) => {
  res.json({
    status: 'ready',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString()
  });
});

// ============ ERROR HANDLING ============

app.use(notFoundHandler);
app.use(errorHandler);

// ============ START SERVER ============

app.listen(PORT, () => {
  logger.info(`🔗 TwinOS Hub v2.0 running on port ${PORT}`);
  logger.info(`📊 Managing ${twinRegistry.size} digital twins`);
  logger.info(`🏢 ${businessRegistry.size} registered businesses`);
});

export default app;

// Helper functions
async function hashPassword(password) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}

function generateTokens(user) {
  const accessToken = `access-${uuidv4()}-${Date.now()}`;
  const refreshToken = `refresh-${uuidv4()}-${Date.now()}`;

  sessions.set(refreshToken, {
    email: user.email,
    userId: user.id,
    businessId: user.businessId,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: '1h'
  };
}
