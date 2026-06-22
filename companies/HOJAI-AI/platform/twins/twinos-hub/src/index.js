/**
 * RTMN TwinOS Hub v3.0
 * Central registry and coordination for all digital twins
 *
 * Features:
 * - Twin Registry (CRUD operations)
 * - Twin Identity (CorpID, Namespace, Tenant, Ownership)
 * - Twin Profile (Attributes, Configuration, Properties, Dynamic Fields)
 * - Twin Relationship Graph (owns, belongs_to, manages, reports_to, ...)
 * - Twin Context Engine (Home, Office, Working, Driving, ...)
 * - Twin State Engine (Active, Idle, Busy, Suspended, ...)
 * - Twin Lifecycle (Create, Activate, Update, Merge, Split, Archive, Restore, Delete)
 * - Twin Timeline (History, Actions, Decisions, Events, State Changes)
 * - Twin Goals (Objectives, KPIs, Mission, Targets, Preferences)
 * - Twin Knowledge References (Memory, Documents, Policies, Skills, Workflows)
 * - Twin Collaboration (Person<->Person, Person<->Business, AI<->AI, ...)
 * - Twin Simulation (Future State, Impact, Growth, Decision Outcome)
 * - Twin Analytics (Activity, Growth, Usage, Relationship Health)
 * - Twin State Management
 * - Cross-Twin Relationships
 * - Sync Operations
 * - Authentication & Authorization
 * - Rate Limiting
 * - Input Validation
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

import {
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
  generateTokens,
  defaultLimiter,
  strictLimiter,
  authLimiter
} from '@rtmn/twinos-shared';

import { registerV4Features } from './v4-features.js';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
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

const twinRegistry = new PersistentMap('twin-registry', { serviceName: 'twinos-hub' });
const twinStates = new PersistentMap('twin-states', { serviceName: 'twinos-hub' });
const twinRelationships = new PersistentMap('twin-relationships', { serviceName: 'twinos-hub' });
const syncEvents = [];
const businessRegistry = new PersistentMap('business-registry', { serviceName: 'twinos-hub' });

// ============ v3.0 NEW IN-MEMORY STORES ============
// Per-twin profile, context, lifecycle, timeline, goals, knowledge, collaboration, simulation, analytics
const twinProfiles = new PersistentMap('twin-profiles', { serviceName: 'twinos-hub' });        // twinId -> { basicInfo, attributes, configuration, properties, dynamicFields, tags, labels }
const twinContexts = new PersistentMap('twin-contexts', { serviceName: 'twinos-hub' });        // twinId -> { current, history[] }
const twinLifecycles = new PersistentMap('twin-lifecycles', { serviceName: 'twinos-hub' });      // twinId -> { state, history[] }   (active|idle|busy|suspended|deleted|archived|pending)
const twinTimelines = new PersistentMap('twin-timelines', { serviceName: 'twinos-hub' });       // twinId -> [ events... ]
const twinGoals = new PersistentMap('twin-goals', { serviceName: 'twinos-hub' });           // twinId -> [ goals... ]
const twinKnowledgeRefs = new PersistentMap('twin-knowledge-refs', { serviceName: 'twinos-hub' });   // twinId -> [ {kind, refId, refType, refService, addedAt} ... ]
const twinCollaborations = new PersistentMap('twin-collaborations', { serviceName: 'twinos-hub' });  // twinId -> [ {partnerTwinId, kind, since, metadata} ... ]
const twinSimulations = new PersistentMap('twin-simulations', { serviceName: 'twinos-hub' });     // twinId -> [ simulations... ]
const twinAnalytics = new PersistentMap('twin-analytics', { serviceName: 'twinos-hub' });       // twinId -> { activity, growth, usage, relationshipHealth, ... }
const twinIdentity = new PersistentMap('twin-identity', { serviceName: 'twinos-hub' });        // twinId -> { corpidLink, entityType, namespace, ownership, tenant, ... }
const mergeLog = new PersistentMap('merge-log', { serviceName: 'twinos-hub' });            // twinId -> { mergedFrom: [...], mergedAt, mergedBy }
const twinVersions = new PersistentMap('twin-versions', { serviceName: 'twinos-hub' });       // twinId -> [ { version, at, reason, twin: snapshot } ] (v4.0 versioning)

// User store (replace with DB in production)
const users = new PersistentMap('users', { serviceName: 'twinos-hub' });
const sessions = new PersistentMap('sessions', { serviceName: 'twinos-hub' });

// ============ CONSTANTS ============

const VALID_LIFECYCLE_STATES = ['active', 'idle', 'busy', 'suspended', 'deleted', 'archived', 'pending'];
const VALID_CONTEXT_STATES = ['home', 'office', 'shopping', 'working', 'vacation', 'driving', 'meeting', 'emergency', 'online', 'offline', 'unknown'];
const VALID_TIMELINE_EVENT_TYPES = ['created', 'updated', 'action', 'decision', 'event', 'state_change', 'sync', 'context_change', 'goal_change', 'collaboration', 'merge', 'split', 'archive', 'restore', 'delete'];
const VALID_RELATIONSHIP_TYPES = ['owns', 'belongs_to', 'manages', 'reports_to', 'purchased', 'follows', 'parent', 'child', 'supplier', 'customer', 'member', 'partner', 'competitor', 'related_to', 'has', 'part_of', 'depends_on', 'references'];
const VALID_KNOWLEDGE_KINDS = ['memory', 'document', 'policy', 'skill', 'workflow', 'knowledge_object'];
const VALID_COLLABORATION_KINDS = ['person-person', 'person-business', 'business-business', 'ai-ai', 'asset-business', 'person-asset'];

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

/**
 * Create a new twin with full v3.0 identity + structure.
 * @param {Object} data - Twin creation payload
 * @returns {Object} Fully-formed twin record
 */
function createTwin(data) {
  const now = new Date().toISOString();
  const twinId = data.id;

  // Identity (HOJAI 3-pillar spec: Twin ID, Entity ID, CorpID Link, Entity Type, Version, Namespace, Status, Ownership, Tenant, Metadata)
  const identity = {
    twinId,
    entityId: data.entityId || twinId,
    corpidLink: data.corpidLink || null,
    entityType: data.entityType || data.type || 'entity',
    version: 1,
    namespace: data.namespace || 'rtmn.global',
    status: data.status || 'active',
    ownership: data.ownership || data.owner || 'system',
    tenant: data.tenant || data.businessId || 'public',
    metadata: data.metadata || {}
  };
  twinIdentity.set(twinId, identity);

  // Profile (basicInfo, attributes, configuration, properties, dynamicFields, tags, labels)
  twinProfiles.set(twinId, {
    twinId,
    basicInfo: data.basicInfo || { id: twinId, name: data.name || twinId.split('.').pop() },
    attributes: data.attributes || {},
    configuration: data.configuration || {},
    properties: data.properties || {},
    dynamicFields: data.dynamicFields || {},
    tags: data.tags || [],
    labels: data.labels || []
  });

  // Context (default unknown)
  twinContexts.set(twinId, {
    current: 'unknown',
    since: now,
    history: []
  });

  // Lifecycle
  twinLifecycles.set(twinId, {
    state: 'active',
    since: now,
    history: [{ state: 'active', at: now, by: data.owner || 'system', reason: 'created' }]
  });

  // Timeline
  twinTimelines.set(twinId, [
    { id: uuidv4(), type: 'created', at: now, by: data.owner || 'system', payload: { id: twinId } }
  ]);

  // Goals / Knowledge / Collaborations / Simulations / Analytics (start empty)
  twinGoals.set(twinId, []);
  twinKnowledgeRefs.set(twinId, []);
  twinCollaborations.set(twinId, []);
  twinSimulations.set(twinId, []);
  twinAnalytics.set(twinId, {
    activity: 0,
    growth: 0,
    usage: { readCount: 0, writeCount: 0, lastReadAt: null, lastWriteAt: null },
    relationshipHealth: 1.0,
    computedAt: now
  });

  return {
    id: twinId,
    name: data.name || twinId.split('.').pop(),
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
    // v3.0 identity fields
    entityId: identity.entityId,
    corpidLink: identity.corpidLink,
    entityType: identity.entityType,
    namespace: identity.namespace,
    ownership: identity.ownership,
    tenant: identity.tenant,
    createdAt: now,
    updatedAt: now
  };
}

// ============ TIMELINE HELPER ============

/**
 * Append a timeline event for a twin.
 * @param {string} twinId
 * @param {string} type - One of VALID_TIMELINE_EVENT_TYPES
 * @param {Object} payload
 * @param {string} [by]
 * @returns {Object|null} The event that was appended, or null if twin is missing
 */
function appendTimeline(twinId, type, payload = {}, by = 'system') {
  const list = twinTimelines.get(twinId);
  if (!list) return null;
  const event = {
    id: `evt-${uuidv4().slice(0, 8)}`,
    twinId,
    type,
    at: new Date().toISOString(),
    by,
    payload
  };
  list.unshift(event);
  if (list.length > 500) list.pop();
  return event;
}

// ============ ANALYTICS HELPER ============

/**
 * Bump usage counters for a twin (called on read/write).
 * @param {string} twinId
 * @param {'read'|'write'} op
 */
function bumpUsage(twinId, op) {
  const a = twinAnalytics.get(twinId);
  if (!a) return;
  a.usage.readCount += op === 'read' ? 1 : 0;
  a.usage.writeCount += op === 'write' ? 1 : 0;
  a.usage.lastReadAt = op === 'read' ? new Date().toISOString() : a.usage.lastReadAt;
  a.usage.lastWriteAt = op === 'write' ? new Date().toISOString() : a.usage.lastWriteAt;
  a.activity += 1;
  a.computedAt = new Date().toISOString();
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
  const tokens = generateLocalTokens(user);

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

  const tokens = generateLocalTokens(user);

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
app.post('/auth/refresh',requireAuth,  authLimiter, asyncHandler(async (req, res) => {
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
  const tokens = generateLocalTokens(user);

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

// ============ v3.0 NEW: TWIN IDENTITY ENDPOINTS ============

/**
 * GET /api/twins/:id/identity
 * Get full twin identity block (Twin ID, Entity ID, CorpID link, namespace, tenant, etc.)
 */
app.get('/api/twins/:id/identity', optionalAuth, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  bumpUsage(req.params.id, 'read');
  res.json({ success: true, identity: twinIdentity.get(req.params.id) || null });
}));

/**
 * PUT /api/twins/:id/identity
 * Update identity fields (namespace, tenant, ownership, corpidLink, etc.)
 */
app.put('/api/twins/:id/identity', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  if (twin.businessId && twin.owner !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Only owner or admin can update identity' } });
  }
  const identity = twinIdentity.get(req.params.id) || { twinId: req.params.id };
  const { corpidLink, entityType, namespace, ownership, tenant, entityId } = preventPrototypePollution(req.body);
  if (entityId !== undefined) identity.entityId = entityId;
  if (corpidLink !== undefined) identity.corpidLink = corpidLink;
  if (entityType !== undefined) identity.entityType = entityType;
  if (namespace !== undefined) identity.namespace = namespace;
  if (ownership !== undefined) identity.ownership = ownership;
  if (tenant !== undefined) identity.tenant = tenant;
  identity.updatedAt = new Date().toISOString();
  twinIdentity.set(req.params.id, identity);
  appendTimeline(req.params.id, 'updated', { section: 'identity', changes: preventPrototypePollution(req.body) }, req.user.id);
  bumpUsage(req.params.id, 'write');
  res.json({ success: true, identity });
}));

// ============ v3.0 NEW: TWIN PROFILE ENDPOINTS ============

/**
 * GET /api/twins/:id/profile
 * Get the twin profile (basicInfo, attributes, configuration, properties, dynamicFields, tags, labels)
 */
app.get('/api/twins/:id/profile', optionalAuth, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  bumpUsage(req.params.id, 'read');
  res.json({ success: true, profile: twinProfiles.get(req.params.id) || null });
}));

/**
 * PUT /api/twins/:id/profile
 * Replace or merge into the twin profile
 * Body: { basicInfo?, attributes?, configuration?, properties?, dynamicFields?, tags?, labels?, merge?: true }
 */
app.put('/api/twins/:id/profile', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  if (twin.businessId && twin.owner !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Only owner or admin can update profile' } });
  }
  const { merge, ...payload } = preventPrototypePollution(req.body);
  const profile = twinProfiles.get(req.params.id) || { twinId: req.params.id };

  if (merge === true) {
    // Deep-merge for object fields, union for arrays
    profile.basicInfo = { ...(profile.basicInfo || {}), ...(payload.basicInfo || {}) };
    profile.attributes = { ...(profile.attributes || {}), ...(payload.attributes || {}) };
    profile.configuration = { ...(profile.configuration || {}), ...(payload.configuration || {}) };
    profile.properties = { ...(profile.properties || {}), ...(payload.properties || {}) };
    profile.dynamicFields = { ...(profile.dynamicFields || {}), ...(payload.dynamicFields || {}) };
    if (payload.tags) profile.tags = [...new Set([...(profile.tags || []), ...payload.tags])];
    if (payload.labels) profile.labels = [...new Set([...(profile.labels || []), ...payload.labels])];
  } else {
    if (payload.basicInfo !== undefined) profile.basicInfo = payload.basicInfo;
    if (payload.attributes !== undefined) profile.attributes = payload.attributes;
    if (payload.configuration !== undefined) profile.configuration = payload.configuration;
    if (payload.properties !== undefined) profile.properties = payload.properties;
    if (payload.dynamicFields !== undefined) profile.dynamicFields = payload.dynamicFields;
    if (payload.tags !== undefined) profile.tags = payload.tags;
    if (payload.labels !== undefined) profile.labels = payload.labels;
  }
  profile.updatedAt = new Date().toISOString();
  twinProfiles.set(req.params.id, profile);
  appendTimeline(req.params.id, 'updated', { section: 'profile', merge: !!merge }, req.user.id);
  bumpUsage(req.params.id, 'write');
  res.json({ success: true, profile });
}));

// ============ v3.0 NEW: TWIN CONTEXT ENGINE ============

/**
 * GET /api/twins/:id/context
 * Get the current context of a twin (Home, Office, Working, Driving, etc.)
 */
app.get('/api/twins/:id/context', optionalAuth, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  bumpUsage(req.params.id, 'read');
  res.json({ success: true, context: twinContexts.get(req.params.id) || null });
}));

/**
 * PUT /api/twins/:id/context
 * Set the current context. Body: { context, reason? }
 */
app.put('/api/twins/:id/context', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  const { context, reason } = preventPrototypePollution(req.body);
  if (!context || !VALID_CONTEXT_STATES.includes(context)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `context must be one of: ${VALID_CONTEXT_STATES.join(', ')}` }
    });
  }
  const ctx = twinContexts.get(req.params.id) || { current: 'unknown', history: [] };
  const now = new Date().toISOString();
  ctx.history.unshift({ context, at: now, by: req.user.id, reason: reason || null });
  if (ctx.history.length > 100) ctx.history.pop();
  ctx.current = context;
  ctx.since = now;
  twinContexts.set(req.params.id, ctx);
  appendTimeline(req.params.id, 'context_change', { from: ctx.history[1]?.context, to: context, reason }, req.user.id);
  bumpUsage(req.params.id, 'write');
  res.json({ success: true, context: ctx });
}));

// ============ v3.0 NEW: TWIN STATE / LIFECYCLE ENGINE ============

/**
 * GET /api/twins/:id/lifecycle
 * Get current lifecycle state (active, idle, busy, suspended, deleted, archived, pending) and history.
 */
app.get('/api/twins/:id/lifecycle', optionalAuth, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  bumpUsage(req.params.id, 'read');
  res.json({ success: true, lifecycle: twinLifecycles.get(req.params.id) || null });
}));

/**
 * PUT /api/twins/:id/lifecycle
 * Transition lifecycle state. Body: { state, reason }
 */
app.put('/api/twins/:id/lifecycle', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  if (twin.businessId && twin.owner !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Only owner or admin can change lifecycle' } });
  }
  const { state, reason } = preventPrototypePollution(req.body);
  if (!state || !VALID_LIFECYCLE_STATES.includes(state)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `state must be one of: ${VALID_LIFECYCLE_STATES.join(', ')}` }
    });
  }
  const lc = twinLifecycles.get(req.params.id) || { state: 'pending', history: [] };
  const now = new Date().toISOString();
  const previous = lc.state;
  lc.history.unshift({ state, at: now, by: req.user.id, reason: reason || null, from: previous });
  if (lc.history.length > 200) lc.history.pop();
  lc.state = state;
  lc.since = now;
  twinLifecycles.set(req.params.id, lc);
  twin.status = state;
  twin.updatedAt = now;
  appendTimeline(req.params.id, 'state_change', { from: previous, to: state, reason }, req.user.id);
  bumpUsage(req.params.id, 'write');
  res.json({ success: true, lifecycle: lc });
}));

// ============ v3.0 NEW: LIFECYCLE ACTIONS (merge / split / archive / restore) ============

/**
 * POST /api/twins/:id/archive
 * Archive a twin (soft delete). Records reason.
 */
app.post('/api/twins/:id/archive', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  if (twin.businessId && twin.owner !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Only owner or admin can archive' } });
  }
  const { reason } = preventPrototypePollution(req.body || {});
  const lc = twinLifecycles.get(req.params.id) || { state: 'active', history: [] };
  const previous = lc.state;
  const now = new Date().toISOString();
  lc.history.unshift({ state: 'archived', at: now, by: req.user.id, reason: reason || null, from: previous });
  lc.state = 'archived';
  lc.since = now;
  twinLifecycles.set(req.params.id, lc);
  twin.status = 'archived';
  twin.updatedAt = now;
  appendTimeline(req.params.id, 'archive', { reason: reason || null }, req.user.id);
  bumpUsage(req.params.id, 'write');
  res.json({ success: true, lifecycle: lc, twin });
}));

/**
 * POST /api/twins/:id/restore
 * Restore an archived or suspended twin to active.
 */
app.post('/api/twins/:id/restore', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  if (twin.businessId && twin.owner !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Only owner or admin can restore' } });
  }
  const lc = twinLifecycles.get(req.params.id) || { state: 'archived', history: [] };
  if (lc.state !== 'archived' && lc.state !== 'suspended') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: 'Twin is not archived or suspended' } });
  }
  const previous = lc.state;
  const now = new Date().toISOString();
  lc.history.unshift({ state: 'active', at: now, by: req.user.id, from: previous, reason: 'restored' });
  lc.state = 'active';
  lc.since = now;
  twinLifecycles.set(req.params.id, lc);
  twin.status = 'active';
  twin.updatedAt = now;
  appendTimeline(req.params.id, 'restore', { from: previous }, req.user.id);
  bumpUsage(req.params.id, 'write');
  res.json({ success: true, lifecycle: lc, twin });
}));

/**
 * POST /api/twins/:targetId/merge
 * Merge one or more source twins INTO targetId. Body: { sourceIds: [...], strategy?: "combine"|"override" }
 */
app.post('/api/twins/:targetId/merge', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const targetId = req.params.targetId;
  const target = twinRegistry.get(targetId);
  if (!target) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Target twin not found' } });
  }
  if (target.businessId && target.owner !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Only owner or admin can merge' } });
  }
  const { sourceIds, strategy = 'combine' } = preventPrototypePollution(req.body);
  if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'sourceIds must be a non-empty array' } });
  }
  const now = new Date().toISOString();
  const merged = [];
  const targetProfile = twinProfiles.get(targetId) || { twinId: targetId };
  const targetGoals = twinGoals.get(targetId) || [];
  const targetKnowledge = twinKnowledgeRefs.get(targetId) || [];

  for (const sourceId of sourceIds) {
    if (sourceId === targetId) continue;
    const source = twinRegistry.get(sourceId);
    if (!source) {
      merged.push({ sourceId, merged: false, reason: 'not found' });
      continue;
    }
    const sourceProfile = twinProfiles.get(sourceId) || {};
    if (strategy === 'override') {
      targetProfile.attributes = { ...sourceProfile.attributes, ...targetProfile.attributes };
      targetProfile.properties = { ...sourceProfile.properties, ...targetProfile.properties };
    } else {
      targetProfile.attributes = { ...targetProfile.attributes, ...sourceProfile.attributes };
      targetProfile.properties = { ...targetProfile.properties, ...sourceProfile.properties };
      targetProfile.tags = [...new Set([...(targetProfile.tags || []), ...(sourceProfile.tags || [])])];
      targetProfile.labels = [...new Set([...(targetProfile.labels || []), ...(sourceProfile.labels || [])])];
    }
    for (const g of (twinGoals.get(sourceId) || [])) {
      if (!targetGoals.find(x => x.id === g.id)) targetGoals.push({ ...g, mergedFrom: sourceId });
    }
    for (const k of (twinKnowledgeRefs.get(sourceId) || [])) {
      if (!targetKnowledge.find(x => x.refId === k.refId && x.kind === k.kind)) {
        targetKnowledge.push({ ...k, mergedFrom: sourceId });
      }
    }
    const lc = twinLifecycles.get(sourceId) || { state: 'active', history: [] };
    const previous = lc.state;
    lc.history.unshift({ state: 'archived', at: now, by: req.user.id, reason: `merged into ${targetId}`, from: previous });
    lc.state = 'archived';
    lc.since = now;
    twinLifecycles.set(sourceId, lc);
    source.status = 'archived';
    source.updatedAt = now;
    mergeLog.set(sourceId, { mergedInto: targetId, at: now, by: req.user.id, strategy });
    appendTimeline(sourceId, 'merge', { into: targetId, strategy }, req.user.id);
    appendTimeline(targetId, 'merge', { from: sourceId, strategy }, req.user.id);
    merged.push({ sourceId, merged: true });
    bumpUsage(sourceId, 'write');
  }
  twinProfiles.set(targetId, targetProfile);
  twinGoals.set(targetId, targetGoals);
  twinKnowledgeRefs.set(targetId, targetKnowledge);
  appendTimeline(targetId, 'updated', { section: 'merge', sources: sourceIds }, req.user.id);
  bumpUsage(targetId, 'write');
  res.json({ success: true, target: targetId, results: merged });
}));

/**
 * POST /api/twins/:id/split
 * Split a twin into N new twins. Body: { newTwins: [{ id, name?, service?, type?, category?, port?, attributes?, properties? }, ...] }
 */
app.post('/api/twins/:id/split', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const parentId = req.params.id;
  const parent = twinRegistry.get(parentId);
  if (!parent) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Parent twin not found' } });
  }
  if (parent.businessId && parent.owner !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Only owner or admin can split' } });
  }
  const { newTwins } = preventPrototypePollution(req.body);
  if (!Array.isArray(newTwins) || newTwins.length === 0) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'newTwins must be a non-empty array' } });
  }
  const parentProfile = twinProfiles.get(parentId) || {};
  const created = [];
  for (const spec of newTwins) {
    if (!spec.id) {
      created.push({ id: spec.id, created: false, reason: 'id required' });
      continue;
    }
    if (twinRegistry.has(spec.id)) {
      created.push({ id: spec.id, created: false, reason: 'twin exists' });
      continue;
    }
    const twin = createTwin({
      id: spec.id,
      name: spec.name || spec.id,
      service: spec.service || parent.service,
      type: spec.type || parent.type,
      category: spec.category || parent.category,
      port: spec.port || 0,
      businessId: parent.businessId,
      owner: parent.owner,
      attributes: { ...(parentProfile.attributes || {}), ...(spec.attributes || {}) },
      properties: { ...(parentProfile.properties || {}), ...(spec.properties || {}) },
      tags: spec.tags || parentProfile.tags || [],
      labels: spec.labels || parentProfile.labels || []
    });
    twinRegistry.set(spec.id, twin);
    twinStates.set(spec.id, { data: null, timestamp: null });
    if (businessRegistry.has(parent.businessId)) {
      businessRegistry.get(parent.businessId).twins.push(spec.id);
    }
    appendTimeline(parentId, 'split', { into: spec.id }, req.user.id);
    appendTimeline(spec.id, 'updated', { section: 'split', from: parentId }, req.user.id);
    created.push({ id: spec.id, created: true });
  }
  res.json({ success: true, parent: parentId, created });
}));

// ============ v3.0 NEW: TWIN TIMELINE ============

/**
 * GET /api/twins/:id/timeline
 * Get timeline history. Query: ?limit=50&type=created,updated
 */
app.get('/api/twins/:id/timeline', optionalAuth, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  let events = twinTimelines.get(req.params.id) || [];
  const { type, limit = 50 } = req.query;
  if (type) {
    const types = String(type).split(',').map(s => s.trim()).filter(Boolean);
    if (types.length) events = events.filter(e => types.includes(e.type));
  }
  const lim = Math.min(parseInt(limit) || 50, 500);
  events = events.slice(0, lim);
  bumpUsage(req.params.id, 'read');
  res.json({ success: true, count: events.length, events });
}));

/**
 * POST /api/twins/:id/timeline
 * Append a manual timeline event. Body: { type, payload?, at? }
 */
app.post('/api/twins/:id/timeline', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  const { type, payload = {}, at } = preventPrototypePollution(req.body);
  if (!type || !VALID_TIMELINE_EVENT_TYPES.includes(type)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `type must be one of: ${VALID_TIMELINE_EVENT_TYPES.join(', ')}` }
    });
  }
  const event = {
    id: `evt-${uuidv4().slice(0, 8)}`,
    twinId: req.params.id,
    type,
    at: at || new Date().toISOString(),
    by: req.user.id,
    payload
  };
  const list = twinTimelines.get(req.params.id) || [];
  list.unshift(event);
  if (list.length > 500) list.pop();
  twinTimelines.set(req.params.id, list);
  bumpUsage(req.params.id, 'write');
  res.status(201).json({ success: true, event });
}));

// ============ v3.0 NEW: TWIN GOALS ============

/**
 * GET /api/twins/:id/goals
 * List goals for a twin.
 */
app.get('/api/twins/:id/goals', optionalAuth, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  bumpUsage(req.params.id, 'read');
  res.json({ success: true, count: (twinGoals.get(req.params.id) || []).length, goals: twinGoals.get(req.params.id) || [] });
}));

/**
 * POST /api/twins/:id/goals
 * Create a goal. Body: { objective, mission?, kpis?: [...], targets?, preferences?, deadline? }
 */
app.post('/api/twins/:id/goals', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  if (twin.businessId && twin.owner !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Only owner or admin can add goals' } });
  }
  const { objective, mission, kpis, targets, preferences, deadline } = preventPrototypePollution(req.body);
  if (!objective) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'objective is required' } });
  }
  const goal = {
    id: `goal-${uuidv4().slice(0, 8)}`,
    twinId: req.params.id,
    objective,
    mission: mission || null,
    kpis: (kpis || []).map(k => ({ name: k.name, target: k.target, current: k.current ?? 0, unit: k.unit || null })),
    targets: targets || [],
    preferences: preferences || {},
    deadline: deadline || null,
    status: 'active',
    progress: 0,
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const list = twinGoals.get(req.params.id) || [];
  list.unshift(goal);
  twinGoals.set(req.params.id, list);
  appendTimeline(req.params.id, 'goal_change', { goalId: goal.id, action: 'created', objective }, req.user.id);
  bumpUsage(req.params.id, 'write');
  res.status(201).json({ success: true, goal });
}));

/**
 * PATCH /api/twins/:id/goals/:goalId
 * Update a goal (progress, KPIs, status, etc.)
 */
app.patch('/api/twins/:id/goals/:goalId', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const list = twinGoals.get(req.params.id);
  if (!list) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  const idx = list.findIndex(g => g.id === req.params.goalId);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: { code: 'GOAL_NOT_FOUND', message: 'Goal not found' } });
  }
  const goal = list[idx];
  const patch = preventPrototypePollution(req.body);
  const updatable = ['objective', 'mission', 'targets', 'preferences', 'deadline', 'status', 'progress', 'kpis'];
  for (const k of updatable) {
    if (patch[k] !== undefined) goal[k] = patch[k];
  }
  goal.updatedAt = new Date().toISOString();
  list[idx] = goal;
  twinGoals.set(req.params.id, list);
  appendTimeline(req.params.id, 'goal_change', { goalId: goal.id, action: 'updated', changes: patch }, req.user.id);
  bumpUsage(req.params.id, 'write');
  res.json({ success: true, goal });
}));

/**
 * DELETE /api/twins/:id/goals/:goalId
 */
app.delete('/api/twins/:id/goals/:goalId', requireAuth, asyncHandler(async (req, res) => {
  const list = twinGoals.get(req.params.id);
  if (!list) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  const idx = list.findIndex(g => g.id === req.params.goalId);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: { code: 'GOAL_NOT_FOUND', message: 'Goal not found' } });
  }
  const [removed] = list.splice(idx, 1);
  twinGoals.set(req.params.id, list);
  appendTimeline(req.params.id, 'goal_change', { goalId: removed.id, action: 'deleted' }, req.user.id);
  bumpUsage(req.params.id, 'write');
  res.json({ success: true, message: 'Goal deleted', goalId: removed.id });
}));

// ============ v3.0 NEW: TWIN KNOWLEDGE REFERENCES ============

/**
 * GET /api/twins/:id/knowledge
 * List knowledge references. Query: ?kind=memory,document
 */
app.get('/api/twins/:id/knowledge', optionalAuth, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  let refs = twinKnowledgeRefs.get(req.params.id) || [];
  const { kind } = req.query;
  if (kind) {
    const kinds = String(kind).split(',').map(s => s.trim()).filter(Boolean);
    if (kinds.length) refs = refs.filter(r => kinds.includes(r.kind));
  }
  bumpUsage(req.params.id, 'read');
  res.json({ success: true, count: refs.length, knowledge: refs });
}));

/**
 * POST /api/twins/:id/knowledge
 * Link a knowledge object. Body: { kind, refId, refType?, refService?, label? }
 */
app.post('/api/twins/:id/knowledge', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  const { kind, refId, refType, refService, label } = preventPrototypePollution(req.body);
  if (!kind || !VALID_KNOWLEDGE_KINDS.includes(kind)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `kind must be one of: ${VALID_KNOWLEDGE_KINDS.join(', ')}` }
    });
  }
  if (!refId) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'refId is required' } });
  }
  const list = twinKnowledgeRefs.get(req.params.id) || [];
  if (list.find(r => r.kind === kind && r.refId === refId)) {
    return res.status(409).json({ success: false, error: { code: 'KNOWLEDGE_EXISTS', message: 'Knowledge link already exists' } });
  }
  const ref = {
    id: `kr-${uuidv4().slice(0, 8)}`,
    twinId: req.params.id,
    kind,
    refId,
    refType: refType || null,
    refService: refService || null,
    label: label || null,
    addedBy: req.user.id,
    addedAt: new Date().toISOString()
  };
  list.unshift(ref);
  twinKnowledgeRefs.set(req.params.id, list);
  appendTimeline(req.params.id, 'updated', { section: 'knowledge', added: ref.id, kind, refId }, req.user.id);
  bumpUsage(req.params.id, 'write');
  res.status(201).json({ success: true, knowledge: ref });
}));

/**
 * DELETE /api/twins/:id/knowledge/:refId
 * Unlink a knowledge reference.
 */
app.delete('/api/twins/:id/knowledge/:refId', requireAuth, asyncHandler(async (req, res) => {
  const list = twinKnowledgeRefs.get(req.params.id);
  if (!list) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  const idx = list.findIndex(r => r.id === req.params.refId);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: { code: 'KNOWLEDGE_NOT_FOUND', message: 'Knowledge ref not found' } });
  }
  const [removed] = list.splice(idx, 1);
  twinKnowledgeRefs.set(req.params.id, list);
  appendTimeline(req.params.id, 'updated', { section: 'knowledge', removed: removed.id }, req.user.id);
  bumpUsage(req.params.id, 'write');
  res.json({ success: true, message: 'Knowledge unlinked', knowledgeId: removed.id });
}));

// ============ v3.0 NEW: TWIN COLLABORATION ============

/**
 * GET /api/twins/:id/collaborations
 * List collaborations. Query: ?kind=person-person,business-business
 */
app.get('/api/twins/:id/collaborations', optionalAuth, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  let collabs = twinCollaborations.get(req.params.id) || [];
  const { kind } = req.query;
  if (kind) {
    const kinds = String(kind).split(',').map(s => s.trim()).filter(Boolean);
    if (kinds.length) collabs = collabs.filter(c => kinds.includes(c.kind));
  }
  bumpUsage(req.params.id, 'read');
  res.json({ success: true, count: collabs.length, collaborations: collabs });
}));

/**
 * POST /api/twins/:id/collaborations
 * Add a collaboration. Body: { partnerTwinId, kind, metadata? }
 */
app.post('/api/twins/:id/collaborations', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  const { partnerTwinId, kind, metadata = {} } = preventPrototypePollution(req.body);
  if (!partnerTwinId) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'partnerTwinId is required' } });
  }
  if (!kind || !VALID_COLLABORATION_KINDS.includes(kind)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `kind must be one of: ${VALID_COLLABORATION_KINDS.join(', ')}` }
    });
  }
  if (!twinRegistry.has(partnerTwinId)) {
    return res.status(404).json({ success: false, error: { code: 'PARTNER_NOT_FOUND', message: 'Partner twin not found' } });
  }
  const now = new Date().toISOString();
  const list = twinCollaborations.get(req.params.id) || [];
  if (list.find(c => c.partnerTwinId === partnerTwinId && c.kind === kind)) {
    return res.status(409).json({ success: false, error: { code: 'COLLABORATION_EXISTS', message: 'Collaboration already exists' } });
  }
  const collab = {
    id: `collab-${uuidv4().slice(0, 8)}`,
    twinId: req.params.id,
    partnerTwinId,
    kind,
    metadata,
    since: now,
    lastInteractionAt: now,
    createdBy: req.user.id
  };
  list.unshift(collab);
  twinCollaborations.set(req.params.id, list);

  // Mirror on partner side
  const partnerList = twinCollaborations.get(partnerTwinId) || [];
  if (!partnerList.find(c => c.partnerTwinId === req.params.id && c.kind === kind)) {
    partnerList.unshift({
      id: `collab-${uuidv4().slice(0, 8)}`,
      twinId: partnerTwinId,
      partnerTwinId: req.params.id,
      kind,
      metadata: { ...metadata, mirrored: true },
      since: now,
      lastInteractionAt: now,
      createdBy: req.user.id
    });
    twinCollaborations.set(partnerTwinId, partnerList);
  }

  appendTimeline(req.params.id, 'collaboration', { action: 'created', partnerTwinId, kind }, req.user.id);
  appendTimeline(partnerTwinId, 'collaboration', { action: 'created', partnerTwinId: req.params.id, kind }, req.user.id);
  bumpUsage(req.params.id, 'write');
  bumpUsage(partnerTwinId, 'write');
  res.status(201).json({ success: true, collaboration: collab });
}));

/**
 * DELETE /api/twins/:id/collaborations/:collabId
 * Remove a collaboration.
 */
app.delete('/api/twins/:id/collaborations/:collabId', requireAuth, asyncHandler(async (req, res) => {
  const list = twinCollaborations.get(req.params.id);
  if (!list) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  const idx = list.findIndex(c => c.id === req.params.collabId);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: { code: 'COLLABORATION_NOT_FOUND', message: 'Collaboration not found' } });
  }
  const [removed] = list.splice(idx, 1);
  twinCollaborations.set(req.params.id, list);
  appendTimeline(req.params.id, 'collaboration', { action: 'deleted', partnerTwinId: removed.partnerTwinId }, req.user.id);
  bumpUsage(req.params.id, 'write');
  res.json({ success: true, message: 'Collaboration removed', collaborationId: removed.id });
}));

// ============ v3.0 NEW: TWIN SIMULATION ============

/**
 * POST /api/twins/:id/simulate
 * Run a what-if simulation. Body: { scenario, parameters?, horizonDays? }
 */
app.post('/api/twins/:id/simulate', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  const { scenario, parameters = {}, horizonDays = 30 } = preventPrototypePollution(req.body);
  if (!scenario) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'scenario is required' } });
  }
  const now = new Date().toISOString();
  // Deterministic pseudo-impact (in-memory placeholder; real impl would call reasoning engine)
  const seed = (req.params.id + scenario).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const impactScore = (seed % 100) / 100;
  const growthPct = Math.round(((seed * 7) % 60) - 20) / 10;
  const decisionOutcome = impactScore > 0.5 ? 'positive' : (impactScore > 0.25 ? 'neutral' : 'negative');
  const sim = {
    id: `sim-${uuidv4().slice(0, 8)}`,
    twinId: req.params.id,
    scenario,
    parameters,
    horizonDays,
    result: {
      futureState: { projectedLifecycle: 'active', projectedContext: 'working' },
      impact: { score: impactScore, level: impactScore > 0.66 ? 'high' : impactScore > 0.33 ? 'medium' : 'low' },
      growth: { percent: growthPct, periodDays: horizonDays },
      decisionOutcome,
      riskFactors: impactScore < 0.33 ? ['low engagement', 'dependency on external services'] : ['moderate risk'],
      recommendations: impactScore > 0.5
        ? ['proceed with scenario', 'monitor KPIs weekly']
        : ['pilot on subset first', 'gather more data']
    },
    createdBy: req.user.id,
    createdAt: now
  };
  const list = twinSimulations.get(req.params.id) || [];
  list.unshift(sim);
  if (list.length > 100) list.pop();
  twinSimulations.set(req.params.id, list);
  appendTimeline(req.params.id, 'decision', { kind: 'simulation', simulationId: sim.id, scenario, outcome: decisionOutcome }, req.user.id);
  bumpUsage(req.params.id, 'write');
  res.status(201).json({ success: true, simulation: sim });
}));

/**
 * GET /api/twins/:id/simulations
 * List simulations for a twin.
 */
app.get('/api/twins/:id/simulations', optionalAuth, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  bumpUsage(req.params.id, 'read');
  res.json({ success: true, count: (twinSimulations.get(req.params.id) || []).length, simulations: twinSimulations.get(req.params.id) || [] });
}));

// ============ v3.0 NEW: TWIN ANALYTICS ============

/**
 * GET /api/twins/:id/analytics
 * Per-twin analytics: activity, growth, usage, relationshipHealth, plus aggregates.
 */
app.get('/api/twins/:id/analytics', optionalAuth, asyncHandler(async (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  const a = twinAnalytics.get(req.params.id) || { activity: 0, growth: 0, usage: {}, relationshipHealth: 1.0 };
  const profile = twinProfiles.get(req.params.id) || {};
  const goals = twinGoals.get(req.params.id) || [];
  const collaborations = twinCollaborations.get(req.params.id) || [];
  const knowledge = twinKnowledgeRefs.get(req.params.id) || [];
  const timeline = twinTimelines.get(req.params.id) || [];
  const lifecycle = twinLifecycles.get(req.params.id) || {};

  const collabCount = collaborations.length;
  const recent = timeline.filter(e => (Date.now() - new Date(e.at).getTime()) < 30 * 24 * 60 * 60 * 1000).length;
  a.relationshipHealth = Math.min(1, 0.4 + (collabCount * 0.1) + (recent * 0.05));
  a.activity = recent;
  a.computedAt = new Date().toISOString();
  twinAnalytics.set(req.params.id, a);

  res.json({
    success: true,
    analytics: {
      ...a,
      profileFieldCount: Object.keys(profile.attributes || {}).length + Object.keys(profile.properties || {}).length,
      goalCount: goals.length,
      activeGoalCount: goals.filter(g => g.status === 'active').length,
      collaborationCount: collabCount,
      knowledgeRefCount: knowledge.length,
      timelineEventCount: timeline.length,
      lifecycleState: lifecycle.state || 'unknown',
      lastLifecycleChange: lifecycle.since || null
    }
  });
}));

/**
 * GET /api/analytics
 * Hub-wide analytics rollup.
 */
app.get('/api/analytics', optionalAuth, asyncHandler(async (req, res) => {
  const twins = Array.from(twinRegistry.values());
  const totalGoals = Array.from(twinGoals.values()).reduce((s, g) => s + g.length, 0);
  const totalCollabs = Array.from(twinCollaborations.values()).reduce((s, c) => s + c.length, 0);
  const totalKnowledge = Array.from(twinKnowledgeRefs.values()).reduce((s, k) => s + k.length, 0);
  const totalSims = Array.from(twinSimulations.values()).reduce((s, x) => s + x.length, 0);
  const stateCounts = {};
  for (const lc of twinLifecycles.values()) {
    if (lc && lc.state) stateCounts[lc.state] = (stateCounts[lc.state] || 0) + 1;
  }
  const contextCounts = {};
  for (const ctx of twinContexts.values()) {
    if (ctx && ctx.current) contextCounts[ctx.current] = (contextCounts[ctx.current] || 0) + 1;
  }
  res.json({
    success: true,
    analytics: {
      totalTwins: twins.length,
      totalGoals,
      totalCollaborations: totalCollabs,
      totalKnowledgeRefs: totalKnowledge,
      totalSimulations: totalSims,
      lifecycleByState: stateCounts,
      contextByCurrent: contextCounts,
      averageActivity: twins.length === 0 ? 0 : Array.from(twinAnalytics.values()).reduce((s, a) => s + (a.activity || 0), 0) / twins.length
    }
  });
}));

// ============ v3.0 NEW: RELATIONSHIP GRAPH ============

/**
 * GET /api/relationships/graph/:twinId
 * Walk the relationship graph from a twin (BFS, depth-limited).
 * Query: ?depth=2&type=owns,belongs_to
 */
app.get('/api/relationships/graph/:twinId', optionalAuth, asyncHandler(async (req, res) => {
  const rootId = req.params.twinId;
  if (!twinRegistry.has(rootId)) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  const maxDepth = Math.min(parseInt(req.query.depth) || 2, 5);
  const typeFilter = req.query.type ? String(req.query.type).split(',').map(s => s.trim()) : null;

  const visited = new Set([rootId]);
  const nodes = [{ id: rootId, twin: twinRegistry.get(rootId) }];
  const edges = [];
  const frontier = [rootId];

  for (let d = 0; d < maxDepth; d++) {
    const next = [];
    for (const id of frontier) {
      const rels = twinRelationships.get(id) || [];
      for (const r of rels) {
        if (typeFilter && !typeFilter.includes(r.type)) continue;
        edges.push({ ...r, depth: d + 1, from: id });
        const neighbor = r.sourceId === id ? r.targetId : r.sourceId;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          nodes.push({ id: neighbor, twin: twinRegistry.get(neighbor) });
          next.push(neighbor);
        }
      }
    }
    frontier.length = 0;
    frontier.push(...next);
  }

  res.json({ success: true, root: rootId, depth: maxDepth, nodeCount: nodes.length, edgeCount: edges.length, nodes, edges });
}));

/**
 * GET /api/relationships/types
 * Return valid relationship type vocabulary.
 */
app.get('/api/relationships/types', optionalAuth, (req, res) => {
  res.json({ success: true, types: VALID_RELATIONSHIP_TYPES });
});

/**
 * PUT /api/relationships/:id
 * Update an existing relationship's type or metadata.
 */
app.put('/api/relationships/:id', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  let found = null;
  for (const [sourceId, rels] of twinRelationships.entries()) {
    const idx = rels.findIndex(r => r.id === req.params.id);
    if (idx !== -1) {
      const { type, metadata } = preventPrototypePollution(req.body);
      if (type && !VALID_RELATIONSHIP_TYPES.includes(type)) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `type must be one of: ${VALID_RELATIONSHIP_TYPES.join(', ')}` } });
      }
      const rel = rels[idx];
      if (type) rel.type = type;
      if (metadata) rel.metadata = { ...(rel.metadata || {}), ...metadata };
      rel.updatedAt = new Date().toISOString();
      rels[idx] = rel;
      twinRelationships.set(sourceId, rels);
      found = rel;
      break;
    }
  }
  if (!found) {
    return res.status(404).json({ success: false, error: { code: 'RELATIONSHIP_NOT_FOUND', message: 'Relationship not found' } });
  }
  res.json({ success: true, relationship: found });
}));

// ============ HEALTH ENDPOINTS ============

app.get('/health', (req, res) => {
  const twins = Array.from(twinRegistry.values());

  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      totalTwins: twins.length,
      activeTwins: twins.filter(t => t.status === 'active').length,
      syncingTwins: twins.filter(t => t.status === 'syncing').length,
      healthyTwins: twins.filter(t => t.health === 'healthy').length,
      businesses: businessRegistry.size,
      users: users.size,
      relationships: Array.from(twinRelationships.values()).reduce((sum, r) => sum + r.length, 0),
      // v3.0 counters
      profiles: twinProfiles.size,
      contexts: twinContexts.size,
      lifecycles: twinLifecycles.size,
      timelines: twinTimelines.size,
      goals: Array.from(twinGoals.values()).reduce((s, g) => s + g.length, 0),
      knowledgeRefs: Array.from(twinKnowledgeRefs.values()).reduce((s, k) => s + k.length, 0),
      collaborations: Array.from(twinCollaborations.values()).reduce((s, c) => s + c.length, 0),
      simulations: Array.from(twinSimulations.values()).reduce((s, x) => s + x.length, 0)
    },
    features: [
      'twin-identity', 'twin-profile', 'twin-context', 'twin-state',
      'twin-lifecycle', 'twin-timeline', 'twin-goals', 'twin-knowledge',
      'twin-collaboration', 'twin-simulation', 'twin-analytics', 'twin-relationship-graph'
    ]
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

// Background cleanup to prevent unbounded growth
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_SYNC_EVENTS = 10000;
const MAX_VERSIONS_PER_TWIN = 50;

setInterval(() => {
  const now = Date.now();
  let removedSessions = 0;
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt && session.expiresAt < now) {
      sessions.delete(token);
      removedSessions++;
    }
  }
  if (removedSessions > 0) logger.info('Cleaned expired sessions', { count: removedSessions });

  // Cap syncEvents
  if (syncEvents.length > MAX_SYNC_EVENTS) {
    const dropped = syncEvents.length - MAX_SYNC_EVENTS;
    syncEvents.splice(0, dropped);
    logger.info('Trimmed syncEvents', { dropped, kept: syncEvents.length });
  }
}, 60 * 60 * 1000); // hourly

const server = app.listen(PORT, () => {
  logger.info(`🔗 TwinOS Hub v2.0 running on port ${PORT}`);
  logger.info(`📊 Managing ${twinRegistry.size} digital twins`);
  logger.info(`🏢 ${businessRegistry.size} registered businesses`);
});
installGracefulShutdown(server);

// Graceful shutdown
const shutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;

// Helper functions
async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function generateLocalTokens(user) {
  // Track refresh tokens for revocation in the in-memory sessions store.
  // The actual JWT signing is delegated to twinos-shared's generateTokens.
  const tokens = generateTokens(user, { expiresIn: '1h' });
  sessions.set(tokens.refreshToken, {
    email: user.email,
    userId: user.id,
    businessId: user.businessId,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  });
  return tokens;
}
