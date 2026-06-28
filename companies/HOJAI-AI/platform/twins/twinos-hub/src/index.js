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

  // Intelligence Layer Twins (NEW - Living Autonomous Twins)
  'intelligence.orchestrator': { service: 'twin-intelligence-orchestrator', port: 4715, type: 'intelligence', category: 'ai' },
  'intelligence.behavior': { service: 'twin-behavior-model', port: 4718, type: 'intelligence', category: 'ai' },
  'intelligence.learning': { service: 'twin-learning-os', port: 4735, type: 'intelligence', category: 'ai' },
  'intelligence.execution': { service: 'twin-execution-os', port: 4737, type: 'intelligence', category: 'ai' },

  // Memory Extensions (NEW)
  'memory.working': { service: 'twin-working-memory', port: 4724, type: 'memory', category: 'foundation' },
  'memory.procedural': { service: 'memory-procedural', port: 4725, type: 'memory', category: 'foundation' },
  'memory.episodic': { service: 'memory-observation', port: 4785, type: 'memory', category: 'foundation' },

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

  const now = new Date().toISOString();
  const relationship = {
    id: `rel-${uuidv4().slice(0, 8)}`,
    sourceId,
    targetId,
    type,
    // Phase 1 enrichment fields
    since: now,
    until: null, // null = currently active
    strength: metadata?.strength ?? 0.5, // 0-1 scale, default 0.5
    trust_score: metadata?.trust_score ?? 50, // 0-100, default 50
    shared_memories: metadata?.shared_memories ?? 0, // count of shared memories
    last_interaction: now,
    metadata: metadata || {},
    createdBy: req.user.id,
    createdAt: now
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

// ============ PHASE 1: RELATIONSHIP ENRICHMENT ENDPOINTS ============

/**
 * POST /api/relationships/:id/interact
 * Record an interaction between twins (updates last_interaction, can increase strength)
 */
app.post('/api/relationships/:id/interact', requireAuth, asyncHandler(async (req, res) => {
  const { interaction_type, memory_id, trust_delta, strength_delta } = preventPrototypePollution(req.body);
  let found = null;
  let foundSourceId = null;

  for (const [sourceId, rels] of twinRelationships.entries()) {
    const idx = rels.findIndex(r => r.id === req.params.id);
    if (idx !== -1) {
      const rel = rels[idx];
      rel.last_interaction = new Date().toISOString();

      // Track interaction type in metadata
      if (interaction_type) {
        rel.metadata = rel.metadata || {};
        rel.metadata.interactions = rel.metadata.interactions || [];
        rel.metadata.interactions.push({
          type: interaction_type,
          at: rel.last_interaction,
          memory_id
        });
      }

      // Link shared memory
      if (memory_id) {
        rel.shared_memories = (rel.shared_memories || 0) + 1;
      }

      // Apply trust delta (-10 to +10)
      if (typeof trust_delta === 'number') {
        rel.trust_score = Math.max(0, Math.min(100, (rel.trust_score || 50) + trust_delta));
      }

      // Apply strength delta (-0.1 to +0.1)
      if (typeof strength_delta === 'number') {
        rel.strength = Math.max(0, Math.min(1, (rel.strength || 0.5) + strength_delta));
      }

      rel.updatedAt = rel.last_interaction;
      rels[idx] = rel;
      twinRelationships.set(sourceId, rels);
      found = rel;
      foundSourceId = sourceId;
      break;
    }
  }

  if (!found) {
    return res.status(404).json({ success: false, error: { code: 'RELATIONSHIP_NOT_FOUND', message: 'Relationship not found' } });
  }

  logger.info('Interaction recorded', { relationshipId: req.params.id, interaction_type, trust_delta, strength_delta });
  res.json({ success: true, relationship: found });
}));

/**
 * POST /api/relationships/:id/expire
 * Mark a relationship as expired (sets until = now)
 */
app.post('/api/relationships/:id/expire', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  let found = null;
  let foundSourceId = null;

  for (const [sourceId, rels] of twinRelationships.entries()) {
    const idx = rels.findIndex(r => r.id === req.params.id);
    if (idx !== -1) {
      const rel = rels[idx];
      const now = new Date().toISOString();
      rel.until = now;
      rel.updatedAt = now;
      rels[idx] = rel;
      twinRelationships.set(sourceId, rels);
      found = rel;
      foundSourceId = sourceId;
      break;
    }
  }

  if (!found) {
    return res.status(404).json({ success: false, error: { code: 'RELATIONSHIP_NOT_FOUND', message: 'Relationship not found' } });
  }

  logger.info('Relationship expired', { relationshipId: req.params.id });
  res.json({ success: true, relationship: found, message: 'Relationship marked as expired' });
}));

/**
 * POST /api/relationships/:id/reactivate
 * Reactivate an expired relationship (clears until, sets since = now)
 */
app.post('/api/relationships/:id/reactivate', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  let found = null;
  let foundSourceId = null;

  for (const [sourceId, rels] of twinRelationships.entries()) {
    const idx = rels.findIndex(r => r.id === req.params.id);
    if (idx !== -1) {
      const rel = rels[idx];
      const now = new Date().toISOString();
      rel.since = now;
      rel.until = null;
      rel.updatedAt = now;
      rels[idx] = rel;
      twinRelationships.set(sourceId, rels);
      found = rel;
      foundSourceId = sourceId;
      break;
    }
  }

  if (!found) {
    return res.status(404).json({ success: false, error: { code: 'RELATIONSHIP_NOT_FOUND', message: 'Relationship not found' } });
  }

  logger.info('Relationship reactivated', { relationshipId: req.params.id });
  res.json({ success: true, relationship: found, message: 'Relationship reactivated' });
}));

/**
 * GET /api/relationships/history/:twinId
 * Get the full temporal history of a twin's relationships
 * Query params: ?from=&to=&include=active,expired
 */
app.get('/api/relationships/history/:twinId', optionalAuth, asyncHandler(async (req, res) => {
  const { twinId } = req.params;
  const { from, to, include = 'active,expired' } = req.query;

  if (!twinRegistry.has(twinId)) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }

  const rels = twinRelationships.get(twinId) || [];
  const includeActive = include.includes('active');
  const includeExpired = include.includes('expired');

  // Build history timeline
  const history = [];

  for (const rel of rels) {
    // Start event
    history.push({
      date: rel.since || rel.createdAt,
      type: 'started',
      relationshipId: rel.id,
      targetId: rel.targetId,
      relationship: rel
    });

    // End event (if expired)
    if (rel.until) {
      history.push({
        date: rel.until,
        type: 'ended',
        relationshipId: rel.id,
        targetId: rel.targetId,
        relationship: rel
      });
    }

    // Interaction events
    if (rel.metadata?.interactions) {
      for (const interaction of rel.metadata.interactions) {
        history.push({
          date: interaction.at,
          type: 'interaction',
          interactionType: interaction.type,
          relationshipId: rel.id,
          targetId: rel.targetId,
          interaction
        });
      }
    }
  }

  // Filter by date range
  let filtered = history;
  if (from) {
    const fromTime = new Date(String(from)).getTime();
    filtered = filtered.filter(e => new Date(e.date).getTime() >= fromTime);
  }
  if (to) {
    const toTime = new Date(String(to)).getTime();
    filtered = filtered.filter(e => new Date(e.date).getTime() <= toTime);
  }

  // Filter by status
  if (!includeActive || !includeExpired) {
    filtered = filtered.filter(e => {
      if (e.type === 'ended') return includeExpired;
      if (e.type === 'started') {
        const rel = e.relationship;
        const isActive = !rel.until;
        return (isActive && includeActive) || (!isActive && includeExpired);
      }
      return true;
    });
  }

  // Sort by date descending
  filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group by status
  const active = rels.filter(r => !r.until).length;
  const expired = rels.filter(r => r.until).length;

  res.json({
    success: true,
    twinId,
    range: { from, to, include },
    stats: {
      total: rels.length,
      active,
      expired
    },
    totalEvents: filtered.length,
    events: filtered
  });
}));

/**
 * GET /api/relationships/enriched
 * Query relationships with enrichment data (filter by trust, strength, etc.)
 */
app.get('/api/relationships/enriched', optionalAuth, asyncHandler(async (req, res) => {
  const { min_trust, min_strength, active_only, source_type, target_type } = req.query;
  const allRels = [];

  for (const [sourceId, rels] of twinRelationships.entries()) {
    for (const rel of rels) {
      // Filter active only (until is null)
      if (active_only === 'true' && rel.until !== null) continue;

      // Filter by minimum trust score
      if (min_trust && (rel.trust_score || 50) < parseFloat(min_trust)) continue;

      // Filter by minimum strength
      if (min_strength && (rel.strength || 0.5) < parseFloat(min_strength)) continue;

      // Filter by source/target twin type if specified
      if (source_type) {
        const sourceTwin = twinRegistry.get(sourceId);
        if (!sourceTwin || sourceTwin.type !== source_type) continue;
      }
      if (target_type) {
        const targetTwin = twinRegistry.get(rel.targetId);
        if (!targetTwin || targetTwin.type !== target_type) continue;
      }

      allRels.push({
        ...rel,
        sourceTwin: twinRegistry.get(sourceId),
        targetTwin: twinRegistry.get(rel.targetId)
      });
    }
  }

  // Sort by trust_score descending by default
  allRels.sort((a, b) => (b.trust_score || 50) - (a.trust_score || 50));

  res.json({
    success: true,
    count: allRels.length,
    relationships: allRels
  });
}));

/**
 * GET /api/relationships/:twinId/enrichment-stats
 * Get enrichment statistics for a specific twin's relationships
 */
app.get('/api/relationships/:twinId/enrichment-stats', optionalAuth, asyncHandler(async (req, res) => {
  const { twinId } = req.params;
  const rels = twinRelationships.get(twinId) || [];

  const active = rels.filter(r => r.until === null);
  const expired = rels.filter(r => r.until !== null);

  const stats = {
    twinId,
    total: rels.length,
    active: active.length,
    expired: expired.length,
    avg_trust_score: rels.length > 0 ? rels.reduce((s, r) => s + (r.trust_score || 50), 0) / rels.length : 0,
    avg_strength: rels.length > 0 ? rels.reduce((s, r) => s + (r.strength || 0.5), 0) / rels.length : 0,
    total_shared_memories: rels.reduce((s, r) => s + (r.shared_memories || 0), 0),
    trust_distribution: {
      high: rels.filter(r => (r.trust_score || 50) >= 80).length,
      medium: rels.filter(r => (r.trust_score || 50) >= 50 && (r.trust_score || 50) < 80).length,
      low: rels.filter(r => (r.trust_score || 50) < 50).length
    },
    strongest_relationship: active.sort((a, b) => (b.strength || 0.5) - (a.strength || 0.5))[0] || null,
    most_trusted_relationship: active.sort((a, b) => (b.trust_score || 50) - (a.trust_score || 50))[0] || null,
    most_recent_interaction: rels.filter(r => r.last_interaction)
      .sort((a, b) => new Date(b.last_interaction).getTime() - new Date(a.last_interaction).getTime())[0] || null
  };

  res.json({ success: true, stats });
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

// ============ v3.1 NEW: INTELLIGENCE LAYER ENDPOINTS ============

const INTELLIGENCE_SERVICES = {
  orchestrator: process.env.INTELLIGENCE_ORCHESTRATOR_URL || 'http://localhost:4715',
  behavior: process.env.BEHAVIOR_MODEL_URL || 'http://localhost:4718',
  learning: process.env.TWIN_LEARNING_URL || 'http://localhost:4735',
  execution: process.env.TWIN_EXECUTION_URL || 'http://localhost:4737',
  workingMemory: process.env.TWIN_WORKING_MEMORY_URL || 'http://localhost:4724',
  proceduralMemory: process.env.MEMORY_PROCEDURAL_URL || 'http://localhost:4725',
};

/**
 * GET /api/intelligence/services
 * List available intelligence services
 */
app.get('/api/intelligence/services', optionalAuth, asyncHandler(async (req, res) => {
  const services = Object.entries(INTELLIGENCE_SERVICES).map(([name, url]) => ({
    name,
    url,
    status: 'configured'
  }));

  res.json({
    success: true,
    services,
    count: services.length
  });
}));

/**
 * POST /api/intelligence/analyze/:twinId
 * Full twin analysis via Intelligence Orchestrator
 */
app.post('/api/intelligence/analyze/:twinId', optionalAuth, asyncHandler(async (req, res) => {
  const { twinId } = req.params;
  const twin = twinRegistry.get(twinId);

  if (!twin) {
    return res.status(404).json({
      success: false,
      error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' }
    });
  }

  // Call intelligence orchestrator
  try {
    const response = await fetch(`${INTELLIGENCE_SERVICES.orchestrator}/api/orchestrator/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ twinId, ...req.body })
    });

    if (response.ok) {
      const analysis = await response.json();
      res.json({
        success: true,
        twinId,
        analysis
      });
    } else {
      res.status(502).json({
        success: false,
        error: 'Intelligence service unavailable'
      });
    }
  } catch (error) {
    res.status(502).json({
      success: false,
      error: 'Failed to connect to intelligence orchestrator'
    });
  }
}));

/**
 * GET /api/intelligence/behavior/:twinId
 * Get behavior profile
 */
app.get('/api/intelligence/behavior/:twinId', optionalAuth, asyncHandler(async (req, res) => {
  const { twinId } = req.params;

  try {
    const response = await fetch(`${INTELLIGENCE_SERVICES.behavior}/api/behavior/profile/${twinId}`);

    if (response.ok) {
      const profile = await response.json();
      res.json({
        success: true,
        behavior: profile
      });
    } else {
      res.json({
        success: true,
        behavior: { twinId, patterns: [], message: 'Behavior service pending' }
      });
    }
  } catch (error) {
    res.json({
      success: true,
      behavior: { twinId, patterns: [], message: 'Behavior service unavailable' }
    });
  }
}));

/**
 * GET /api/intelligence/working-memory/:twinId
 * Get working memory
 */
app.get('/api/intelligence/working-memory/:twinId', optionalAuth, asyncHandler(async (req, res) => {
  const { twinId } = req.params;

  try {
    const response = await fetch(`${INTELLIGENCE_SERVICES.workingMemory}/api/working/${twinId}`);

    if (response.ok) {
      const memory = await response.json();
      res.json({
        success: true,
        workingMemory: memory
      });
    } else {
      res.json({
        success: true,
        workingMemory: { twinId, items: [], message: 'Working memory service pending' }
      });
    }
  } catch (error) {
    res.json({
      success: true,
      workingMemory: { twinId, items: [], message: 'Working memory service unavailable' }
    });
  }
}));

/**
 * GET /api/intelligence/procedural/:twinId
 * Get procedural memory (skills, workflows, habits)
 */
app.get('/api/intelligence/procedural/:twinId', optionalAuth, asyncHandler(async (req, res) => {
  const { twinId } = req.params;

  try {
    const [skills, workflows, habits] = await Promise.all([
      fetch(`${INTELLIGENCE_SERVICES.proceduralMemory}/api/procedural/${twinId}/skills`),
      fetch(`${INTELLIGENCE_SERVICES.proceduralMemory}/api/procedural/${twinId}/workflows`),
      fetch(`${INTELLIGENCE_SERVICES.proceduralMemory}/api/procedural/${twinId}/habits`)
    ]);

    const [skillsData, workflowsData, habitsData] = await Promise.all([
      skills.ok ? skills.json() : { skills: [] },
      workflows.ok ? workflows.json() : { workflows: [] },
      habits.ok ? habits.json() : { habits: [] }
    ]);

    res.json({
      success: true,
      procedural: {
        twinId,
        skills: skillsData.skills || [],
        workflows: workflowsData.workflows || [],
        habits: habitsData.habits || []
      }
    });
  } catch (error) {
    res.json({
      success: true,
      procedural: {
        twinId,
        skills: [],
        workflows: [],
        habits: [],
        message: 'Procedural memory service unavailable'
      }
    });
  }
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
 * Query: ?depth=2&type=owns,belongs_to&at=2024-03-15T00:00:00Z
 *
 * Temporal filtering: pass ?at=ISO_DATE to see the graph as it existed at
 * that moment. Only relationships where start_time <= at <= end_time (or
 * end_time is null) are included.
 */
app.get('/api/relationships/graph/:twinId', optionalAuth, asyncHandler(async (req, res) => {
  const rootId = req.params.twinId;
  if (!twinRegistry.has(rootId)) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }
  const maxDepth = Math.min(parseInt(req.query.depth) || 2, 5);
  const typeFilter = req.query.type ? String(req.query.type).split(',').map(s => s.trim()) : null;

  // ── Temporal filter ──────────────────────────────────────────────────────
  // ?at=2024-03-15T00:00:00Z  →  show graph as of that timestamp
  // ?from=2024-01-01&to=2024-06-01  →  show edges valid in that window
  let queryAt = null;
  let queryFrom = null;
  let queryTo = null;
  if (req.query.at) {
    queryAt = new Date(String(req.query.at)).getTime();
  }
  if (req.query.from) {
    queryFrom = new Date(String(req.query.from)).getTime();
  }
  if (req.query.to) {
    queryTo = new Date(String(req.query.to)).getTime();
  }

  /**
   * Returns true if an edge (relationship) was active at the query time(s).
   */
  function edgeWasActive(rel) {
    const created = new Date(rel.createdAt).getTime();
    const since  = rel.since  ? new Date(rel.since).getTime()  : created;
    const until  = rel.until  ? new Date(rel.until).getTime()  : Infinity;

    if (queryAt !== null) {
      // Point-in-time query: was the edge active at that exact moment?
      return queryAt >= since && queryAt <= until;
    }
    if (queryFrom !== null && queryTo !== null) {
      // Range query: was any part of the edge valid within the window?
      return !(until < queryFrom || since > queryTo);
    }
    // No temporal filter: include all edges (including expired)
    return true;
  }

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
        // Temporal gate — skip edges that were not yet born or already expired
        if (!edgeWasActive(r)) continue;

        const neighbor = r.sourceId === id ? r.targetId : r.sourceId;

        // Add temporal metadata so callers know the edge's effective window
        const edgeWithTemporal = {
          ...r,
          depth: d + 1,
          from: id,
          // Mark whether this edge was already expired at query time
          ...(queryAt !== null ? {
            active_at: queryAt,
            expired: r.until !== null && new Date(r.until).getTime() <= queryAt,
            temporal_depth: d + 1
          } : {}),
          ...(queryFrom !== null && queryTo !== null ? {
            valid_in_range: true,
            effective_from: r.since || r.createdAt,
            effective_until: r.until || null
          } : {})
        };
        edges.push(edgeWithTemporal);

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

  res.json({
    success: true,
    root: rootId,
    depth: maxDepth,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    temporal: queryAt
      ? { at: new Date(queryAt).toISOString(), type: 'point_in_time' }
      : queryFrom && queryTo
        ? { from: new Date(queryFrom).toISOString(), to: new Date(queryTo).toISOString(), type: 'range' }
        : { type: 'current' },
    nodes,
    edges
  });
}));

/**
 * GET /api/graph/snapshot
 * Get a complete snapshot of the relationship graph at a point in time.
 * Query: ?at=2024-03-15T00:00:00Z
 *
 * Returns all twins and all edges that were valid at the specified timestamp,
 * plus the TTL (time-to-live) of each edge — when it started and when it ends.
 */
app.get('/api/graph/snapshot', optionalAuth, asyncHandler(async (req, res) => {
  const { at = null, include = 'all' } = req.query;

  let queryAt = null;
  if (at) {
    queryAt = new Date(String(at)).getTime();
  }

  const allNodes = [];
  const allEdges = [];

  for (const [id, twin] of twinRegistry.entries()) {
    allNodes.push({ id, twin });
  }

  for (const [sourceId, rels] of twinRelationships.entries()) {
    for (const rel of rels) {
      const created = new Date(rel.createdAt).getTime();
      const since   = rel.since  ? new Date(rel.since).getTime()  : created;
      const until   = rel.until  ? new Date(rel.until).getTime()  : Infinity;

      let active = true;
      let expired = false;
      if (queryAt !== null) {
        active  = queryAt >= since && queryAt <= until;
        expired = until <= queryAt && until !== Infinity;
      }

      if (include === 'active' && !active) continue;
      if (include === 'expired' && !expired) continue;

      allEdges.push({
        ...rel,
        sourceId,
        ttl: {
          effective_from: rel.since || rel.createdAt,
          effective_until: rel.until || null,
          active_at: queryAt !== null ? new Date(queryAt).toISOString() : new Date().toISOString(),
          is_expired: rel.until !== null,
          was_active: active
        }
      });
    }
  }

  res.json({
    success: true,
    snapshot_at: queryAt !== null ? new Date(queryAt).toISOString() : new Date().toISOString(),
    type: queryAt !== null ? 'historical' : 'current',
    nodes: allNodes,
    edges: allEdges,
    stats: {
      total_nodes: allNodes.length,
      total_edges: allEdges.length,
      active_edges: allEdges.filter(e => !e.ttl.is_expired).length,
      expired_edges: allEdges.filter(e => e.ttl.is_expired).length
    }
  });
}));

// ============ PHASE 2: PATH FINDING API ============

/**
 * GET /api/graph/path
 * Find shortest path between two twins using BFS
 * Query: ?from=twinId&to=twinId&maxHops=5&type=owns,works_at
 */
app.get('/api/graph/path', optionalAuth, asyncHandler(async (req, res) => {
  const { from, to, maxHops = 5, type } = req.query;

  if (!from || !to) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'from and to query params are required' } });
  }

  if (!twinRegistry.has(from) || !twinRegistry.has(to)) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Source or target twin not found' } });
  }

  if (from === to) {
    return res.json({ success: true, path: [{ id: from, twin: twinRegistry.get(from) }], hops: 0, pathTypes: [] });
  }

  const typeFilter = type ? String(type).split(',').map(s => s.trim()) : null;
  const maxDepth = Math.min(parseInt(maxHops) || 5, 10);

  // BFS for shortest path
  const visited = new Map([[from, null]]); // twinId -> previous twinId
  const queue = [from];

  while (queue.length > 0) {
    const current = queue.shift();
    const currentPath = visited.get(current);

    if (current === to) {
      // Reconstruct path
      const path = [];
      const pathTypes = [];
      let node = to;
      while (node !== null) {
        path.unshift({ id: node, twin: twinRegistry.get(node) });
        const prev = visited.get(node);
        if (prev && node !== from) {
          // Find the relationship type
          const rels = twinRelationships.get(prev) || [];
          const rel = rels.find(r => r.targetId === node || r.sourceId === node);
          pathTypes.unshift(rel?.type || 'unknown');
        }
        node = prev;
      }

      logger.info('Path found', { from, to, hops: path.length - 1 });
      return res.json({ success: true, path, hops: path.length - 1, pathTypes });
    }

    const rels = twinRelationships.get(current) || [];
    for (const rel of rels) {
      if (typeFilter && !typeFilter.includes(rel.type)) continue;

      const neighbor = rel.sourceId === current ? rel.targetId : rel.sourceId;
      if (!visited.has(neighbor)) {
        visited.set(neighbor, current);
        queue.push(neighbor);
      }
    }

    if (visited.size > maxDepth * 10) break; // Safety limit
  }

  res.json({ success: true, path: null, hops: -1, pathTypes: [], message: 'No path found within maxHops' });
}));

/**
 * GET /api/graph/connected
 * Find all twins connected to a given twin (within N hops)
 * Query: ?twinId=X&hops=2&minStrength=0.5&minTrust=50
 */
app.get('/api/graph/connected', optionalAuth, asyncHandler(async (req, res) => {
  const { twinId, hops = 2, minStrength, minTrust } = req.query;

  if (!twinId) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'twinId query param is required' } });
  }

  if (!twinRegistry.has(twinId)) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }

  const maxDepth = Math.min(parseInt(hops) || 2, 5);
  const minStrengthVal = minStrength ? parseFloat(minStrength) : null;
  const minTrustVal = minTrust ? parseFloat(minTrust) : null;

  const visited = new Map([[twinId, 0]]); // twinId -> min hops to reach
  const frontier = [twinId];

  for (let d = 0; d < maxDepth; d++) {
    const next = [];
    for (const id of frontier) {
      const rels = twinRelationships.get(id) || [];
      for (const rel of rels) {
        // Filter by enrichment criteria
        if (minStrengthVal !== null && (rel.strength || 0.5) < minStrengthVal) continue;
        if (minTrustVal !== null && (rel.trust_score || 50) < minTrustVal) continue;

        const neighbor = rel.sourceId === id ? rel.targetId : rel.sourceId;
        if (!visited.has(neighbor)) {
          visited.set(neighbor, d + 1);
          next.push(neighbor);
        }
      }
    }
    frontier.length = 0;
    frontier.push(...next);
  }

  const connected = Array.from(visited.entries())
    .filter(([id]) => id !== twinId)
    .map(([id, distance]) => ({
      id,
      twin: twinRegistry.get(id),
      distance,
      // Get the relationship that connects us
      relationship: (twinRelationships.get(twinId)?.find(r =>
        r.sourceId === twinId && r.targetId === id ||
        r.targetId === twinId && r.sourceId === id
      ) || null)
    }))
    .sort((a, b) => a.distance - b.distance);

  res.json({
    success: true,
    root: twinId,
    totalConnected: connected.length,
    byDistance: Object.fromEntries(
      Array.from(new Set(connected.map(c => c.distance))).map(d => [
        d,
        connected.filter(c => c.distance === d)
      ])
    ),
    connected
  });
}));

/**
 * POST /api/graph/path-validate
 * Validate if a proposed path exists (for path planning)
 * Body: { path: ['twin1', 'twin2', 'twin3'] }
 */
app.post('/api/graph/path-validate', requireAuth, asyncHandler(async (req, res) => {
  const { path: twinIds } = preventPrototypePollution(req.body);

  if (!Array.isArray(twinIds) || twinIds.length < 2) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'path must be an array of at least 2 twin IDs' } });
  }

  const validation = [];
  let valid = true;

  for (let i = 0; i < twinIds.length - 1; i++) {
    const from = twinIds[i];
    const to = twinIds[i + 1];

    const rels = twinRelationships.get(from) || [];
    const connectingRel = rels.find(r =>
      (r.sourceId === from && r.targetId === to) ||
      (r.sourceId === to && r.targetId === from)
    );

    const segment = {
      from,
      to,
      exists: !!connectingRel,
      relationship: connectingRel || null
    };

    if (!connectingRel) valid = false;
    validation.push(segment);
  }

  res.json({ success: true, valid, path: twinIds, validation });
}));

// ============ PHASE 3: TEMPORAL HISTORY QUERY ============

/**
 * GET /api/relationships/:twinId/history
 * Query relationships as they existed at a point in time
 * Query: ?at=2024-01-15T00:00:00Z&include=expired,active
 */
app.get('/api/relationships/:twinId/history', optionalAuth, asyncHandler(async (req, res) => {
  const { twinId } = req.params;
  const { at, include = 'all', type } = req.query;

  if (!twinRegistry.has(twinId)) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }

  const queryTime = at ? new Date(String(at)).getTime() : Date.now();
  const rels = twinRelationships.get(twinId) || [];

  // Filter relationships based on temporal validity
  const temporalRels = rels.filter(rel => {
    const createdTime = new Date(rel.createdAt).getTime();
    const sinceTime = rel.since ? new Date(rel.since).getTime() : createdTime;
    const untilTime = rel.until ? new Date(rel.until).getTime() : Infinity;

    // Check if relationship was valid at queryTime
    return queryTime >= sinceTime && queryTime <= untilTime;
  });

  // Apply include filter
  let filtered = temporalRels;
  if (include === 'expired') {
    filtered = temporalRels.filter(r => r.until !== null);
  } else if (include === 'active') {
    filtered = temporalRels.filter(r => r.until === null);
  }

  // Apply type filter
  if (type) {
    const types = String(type).split(',').map(s => s.trim());
    filtered = filtered.filter(r => types.includes(r.type));
  }

  // Sort by trust_score descending
  filtered.sort((a, b) => (b.trust_score || 50) - (a.trust_score || 50));

  res.json({
    success: true,
    query: {
      twinId,
      at: new Date(queryTime).toISOString(),
      now: new Date().toISOString(),
      include,
      type
    },
    total: filtered.length,
    relationships: filtered
  });
}));

/**
 * GET /api/relationships/:twinId/timeline
 * Get the full temporal timeline of a twin's relationships
 * Shows when relationships started, ended, and how metrics evolved
 */
app.get('/api/relationships/:twinId/timeline', optionalAuth, asyncHandler(async (req, res) => {
  const { twinId } = req.params;
  const { from, to, granularity = 'month' } = req.query;

  if (!twinRegistry.has(twinId)) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }

  const rels = twinRelationships.get(twinId) || [];
  const events = [];

  for (const rel of rels) {
    // Start event
    events.push({
      date: rel.since || rel.createdAt,
      type: 'started',
      relationship: rel,
      relationshipId: rel.id
    });

    // End event (if ended)
    if (rel.until) {
      events.push({
        date: rel.until,
        type: 'ended',
        relationship: rel,
        relationshipId: rel.id
      });
    }

    // Key interaction events (from metadata)
    if (rel.metadata?.interactions) {
      const recentInteractions = rel.metadata.interactions.slice(-5); // Last 5
      for (const interaction of recentInteractions) {
        events.push({
          date: interaction.at,
          type: 'interaction',
          interaction,
          relationshipId: rel.id
        });
      }
    }
  }

  // Filter by date range if specified
  let filteredEvents = events;
  if (from) {
    const fromTime = new Date(String(from)).getTime();
    filteredEvents = filteredEvents.filter(e => new Date(e.date).getTime() >= fromTime);
  }
  if (to) {
    const toTime = new Date(String(to)).getTime();
    filteredEvents = filteredEvents.filter(e => new Date(e.date).getTime() <= toTime);
  }

  // Sort by date
  filteredEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group by granularity
  const grouped = {};
  for (const event of filteredEvents) {
    const date = new Date(event.date);
    let key;
    switch (granularity) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
      default:
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(event);
  }

  res.json({
    success: true,
    twinId,
    range: { from, to, granularity },
    totalEvents: filteredEvents.length,
    events: filteredEvents,
    byPeriod: grouped
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4: Event Graph — Causal Links
// ─────────────────────────────────────────────────────────────────────────────
//
// Causal links form an event graph where events can cause or be caused by other events.
// Causal types:
//   - direct: A directly causes B (e.g., contract signed → payment initiated)
//   - indirect: A causes B through a chain (e.g., meeting → decision → action)
//   - parallel: A and B happen together (correlated, not necessarily causal)
//   - triggered: A triggers B as a response
//   - escalated: A escalates to B
//
// The event graph enables:
//   - "Why did this happen?" — trace causes backwards
//   - "What will this cause?" — follow effects forward
//   - Impact analysis — how far does an event propagate?
//

/**
 * GET /api/events/:id/causes
 * Find events that caused this event (backward causal tracing)
 * Query params: ?maxDepth=3&includeIndirect=true
 */
app.get('/api/events/:id/causes', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { maxDepth = 3, includeIndirect = 'true' } = req.query;
  const depthLimit = Math.min(parseInt(maxDepth) || 3, 10);
  const includeIndirect_ = includeIndirect !== 'false';

  // Find the event in all twin timelines
  let sourceEvent = null;
  let sourceTwinId = null;
  for (const [twinId, timeline] of twinTimelines.entries()) {
    const found = timeline.find(e => e.id === id);
    if (found) {
      sourceEvent = found;
      sourceTwinId = twinId;
      break;
    }
  }

  // Also check relationship timeline events
  if (!sourceEvent) {
    for (const [twinId, rels] of twinRelationships.entries()) {
      for (const rel of rels) {
        if (rel.id === id) {
          sourceEvent = { ...rel, type: 'relationship', twinId };
          sourceTwinId = twinId;
          break;
        }
      }
      if (sourceEvent) break;
    }
  }

  if (!sourceEvent) {
    return res.status(404).json({
      success: false,
      error: { code: 'EVENT_NOT_FOUND', message: 'Event not found' }
    });
  }

  // Traverse backwards through causal links
  const visited = new Set([id]);
  const causeChain = [];
  const queue = [{ eventId: id, depth: 0, causalType: 'self' }];

  while (queue.length > 0) {
    const { eventId, depth, causalType } = queue.shift();
    if (depth >= depthLimit) continue;

    // Find events that caused this one
    // Check both direct causal links and temporal proximity
    for (const [twinId, timeline] of twinTimelines.entries()) {
      for (const event of timeline) {
        if (visited.has(event.id)) continue;
        if (event.id === id) continue;

        const isCause = (
          (event.causes && event.causes.includes(id)) ||
          (event.caused_by && event.caused_by.includes(id)) ||
          (includeIndirect_ &&
            event.causal_effects && event.causal_effects.includes(id) &&
            event.causal_type === 'indirect')
        );

        if (isCause) {
          visited.add(event.id);
          causeChain.push({
            event,
            twinId,
            depth: depth + 1,
            causalType: event.causes?.includes(id) ? 'direct' : 'indirect',
            chain: [...causeChain.map(c => c.event.id), event.id]
          });
          queue.push({ eventId: event.id, depth: depth + 1 });
        }
      }
    }

    // Also check temporal causality (events within 24h before are potential causes)
    if (includeIndirect_) {
      const eventTime = sourceEvent.at
        ? new Date(sourceEvent.at).getTime()
        : (sourceEvent.since ? new Date(sourceEvent.since).getTime() : Date.now());

      for (const [twinId, timeline] of twinTimelines.entries()) {
        for (const event of timeline) {
          if (visited.has(event.id)) continue;
          if (event.id === id) continue;

          const otherTime = event.at
            ? new Date(event.at).getTime()
            : (event.since ? new Date(event.since).getTime() : 0);

          // Event happened within 24h before and has causal_type = 'triggered'
          if (otherTime < eventTime &&
              eventTime - otherTime < 24 * 60 * 60 * 1000 &&
              event.causal_type === 'triggered') {
            visited.add(event.id);
            causeChain.push({
              event,
              twinId,
              depth: depth + 1,
              causalType: 'triggered',
              chain: [event.id, id]
            });
          }
        }
      }
    }
  }

  // Sort by depth (closest causes first)
  causeChain.sort((a, b) => a.depth - b.depth);

  res.json({
    success: true,
    event: sourceEvent,
    twinId: sourceTwinId,
    totalCauses: causeChain.length,
    maxDepth: depthLimit,
    causes: causeChain.map(c => ({
      event: c.event,
      twinId: c.twinId,
      depth: c.depth,
      causalType: c.causalType,
      causalChain: c.chain
    }))
  });
}));

/**
 * GET /api/events/:id/effects
 * Find events that were caused by this event (forward causal tracing)
 * Query params: ?maxDepth=5&includeIndirect=true
 */
app.get('/api/events/:id/effects', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { maxDepth = 5, includeIndirect = 'true' } = req.query;
  const depthLimit = Math.min(parseInt(maxDepth) || 5, 10);
  const includeIndirect_ = includeIndirect !== 'false';

  // Find the event
  let sourceEvent = null;
  let sourceTwinId = null;
  for (const [twinId, timeline] of twinTimelines.entries()) {
    const found = timeline.find(e => e.id === id);
    if (found) {
      sourceEvent = found;
      sourceTwinId = twinId;
      break;
    }
  }

  if (!sourceEvent) {
    for (const [twinId, rels] of twinRelationships.entries()) {
      for (const rel of rels) {
        if (rel.id === id) {
          sourceEvent = { ...rel, type: 'relationship', twinId };
          sourceTwinId = twinId;
          break;
        }
      }
      if (sourceEvent) break;
    }
  }

  if (!sourceEvent) {
    return res.status(404).json({
      success: false,
      error: { code: 'EVENT_NOT_FOUND', message: 'Event not found' }
    });
  }

  // Traverse forward through causal links
  const visited = new Set([id]);
  const effectChain = [];
  const queue = [{ eventId: id, depth: 0 }];

  while (queue.length > 0) {
    const { eventId, depth } = queue.shift();
    if (depth >= depthLimit) continue;

    for (const [twinId, timeline] of twinTimelines.entries()) {
      for (const event of timeline) {
        if (visited.has(event.id)) continue;
        if (event.id === id) continue;

        const isEffect = (
          (event.caused_by && event.caused_by.includes(eventId)) ||
          (event.causes && event.causes.includes(eventId)) ||
          (includeIndirect_ &&
            event.caused_by && event.caused_by.some(cb =>
              effectChain.some(e => e.event.id === cb)
            ))
        );

        if (isEffect) {
          visited.add(event.id);
          effectChain.push({
            event,
            twinId,
            depth: depth + 1,
            causalType: event.caused_by?.includes(eventId) ? 'direct' : 'indirect'
          });
          queue.push({ eventId: event.id, depth: depth + 1 });
        }
      }
    }
  }

  // Sort by depth
  effectChain.sort((a, b) => a.depth - b.depth);

  res.json({
    success: true,
    event: sourceEvent,
    twinId: sourceTwinId,
    totalEffects: effectChain.length,
    maxDepth: depthLimit,
    effects: effectChain.map(e => ({
      event: e.event,
      twinId: e.twinId,
      depth: e.depth,
      causalType: e.causalType
    }))
  });
}));

/**
 * GET /api/graph/affected
 * Find all twins/nodes affected by a given event
 * Query params: ?eventId=X&cascade=true
 */
app.get('/api/graph/affected', optionalAuth, asyncHandler(async (req, res) => {
  const { eventId } = req.query;

  if (!eventId) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_PARAM', message: 'eventId query parameter required' }
    });
  }

  // Find the event
  let sourceEvent = null;
  let sourceTwinId = null;
  for (const [twinId, timeline] of twinTimelines.entries()) {
    const found = timeline.find(e => e.id === eventId);
    if (found) {
      sourceEvent = found;
      sourceTwinId = twinId;
      break;
    }
  }

  if (!sourceEvent) {
    return res.status(404).json({
      success: false,
      error: { code: 'EVENT_NOT_FOUND', message: 'Event not found' }
    });
  }

  // Find all affected twins via causal chain
  const affected = new Map();
  affected.set(sourceTwinId, { twinId: sourceTwinId, how: 'source', depth: 0 });

  // BFS through causal links to find affected twins
  const visited = new Set([eventId]);
  const queue = [{ eventId, depth: 0 }];

  while (queue.length > 0) {
    const { eventId: currId, depth } = queue.shift();
    if (depth > 10) continue;

    for (const [twinId, timeline] of twinTimelines.entries()) {
      for (const event of timeline) {
        if (visited.has(event.id)) continue;

        const isAffected = (
          (event.caused_by && event.caused_by.includes(currId)) ||
          (event.causes && event.causes.includes(currId)) ||
          (event.causal_effects && event.causal_effects.includes(currId))
        );

        if (isAffected) {
          visited.add(event.id);
          if (!affected.has(twinId)) {
            affected.set(twinId, {
              twinId,
              how: event.caused_by?.includes(currId) ? 'caused_by' : 'causes',
              depth: depth + 1,
              firstEventId: event.id
            });
          }
          queue.push({ eventId: event.id, depth: depth + 1 });
        }
      }
    }
  }

  // Also check affected twins through relationship events
  const rels = twinRelationships.get(sourceTwinId) || [];
  for (const rel of rels) {
    if (rel.caused_by?.includes(eventId) || rel.causes?.includes(eventId)) {
      const otherTwin = rel.sourceId === sourceTwinId ? rel.targetId : rel.sourceId;
      if (!affected.has(otherTwin)) {
        affected.set(otherTwin, {
          twinId: otherTwin,
          how: 'relationship',
          depth: 1,
          firstEventId: rel.id
        });
      }
    }
  }

  res.json({
    success: true,
    sourceEvent: { id: eventId, twinId: sourceTwinId },
    totalAffected: affected.size - 1, // exclude source
    affectedTwins: Array.from(affected.values()).map(a => ({
      twinId: a.twinId,
      how: a.how,
      depth: a.depth,
      firstEventId: a.firstEventId
    }))
  });
}));

/**
 * POST /api/events/:id/link
 * Create a causal link between two events
 * Body: { causes: string[], causal_type: 'direct' | 'indirect' | 'triggered' | 'escalated' }
 */
app.post('/api/events/:id/link', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { causes = [], causal_type = 'direct', causal_effects = [] } = req.body;

  if (!Array.isArray(causes) && !Array.isArray(causal_effects)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_BODY', message: 'causes or causal_effects array required' }
    });
  }

  // Find the target event
  let targetEvent = null;
  let targetTwinId = null;
  for (const [twinId, timeline] of twinTimelines.entries()) {
    const idx = timeline.findIndex(e => e.id === id);
    if (idx !== -1) {
      targetEvent = timeline[idx];
      targetTwinId = twinId;
      break;
    }
  }

  if (!targetEvent) {
    return res.status(404).json({
      success: false,
      error: { code: 'EVENT_NOT_FOUND', message: 'Target event not found' }
    });
  }

  // Add causal links to target event
  const updatedEvent = {
    ...targetEvent,
    causal_type: causal_type || targetEvent.causal_type || 'direct'
  };

  if (causes.length > 0) {
    updatedEvent.caused_by = [...new Set([...(targetEvent.caused_by || []), ...causes])];
  }

  if (causal_effects.length > 0) {
    updatedEvent.causes = [...new Set([...(targetEvent.causes || []), ...causal_effects])];
  }

  // Save back to timeline
  const timeline = twinTimelines.get(targetTwinId);
  const idx = timeline.findIndex(e => e.id === id);
  timeline[idx] = updatedEvent;
  twinTimelines.set(targetTwinId, timeline);

  res.json({
    success: true,
    event: updatedEvent,
    message: `Causal links updated for event ${id}`
  });
}));

/**
 * GET /api/relationships/:twinId/evolution
 * Track how a specific relationship's metrics evolved over time
 */
app.get('/api/relationships/:twinId/:relationshipId/evolution', optionalAuth, asyncHandler(async (req, res) => {
  const { twinId, relationshipId } = req.params;
  const { from, to } = req.query;

  if (!twinRegistry.has(twinId)) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }

  const rels = twinRelationships.get(twinId) || [];
  const rel = rels.find(r => r.id === relationshipId);

  if (!rel) {
    return res.status(404).json({ success: false, error: { code: 'RELATIONSHIP_NOT_FOUND', message: 'Relationship not found' } });
  }

  // Build evolution timeline from current state + history
  const evolution = [];

  // Initial creation
  evolution.push({
    date: rel.createdAt,
    event: 'created',
    strength: rel.strength || 0.5,
    trust_score: rel.trust_score || 50,
    shared_memories: 0
  });

  // Add any historical interaction snapshots if tracked
  if (rel.metadata?.interaction_history) {
    for (const snapshot of rel.metadata.interaction_history) {
      if (from && new Date(snapshot.date) < new Date(String(from))) continue;
      if (to && new Date(snapshot.date) > new Date(String(to))) continue;
      evolution.push({
        date: snapshot.date,
        event: 'interaction',
        ...snapshot
      });
    }
  }

  // Current state
  evolution.push({
    date: new Date().toISOString(),
    event: 'current',
    strength: rel.strength,
    trust_score: rel.trust_score,
    shared_memories: rel.shared_memories,
    active: rel.until === null
  });

  // Sort by date
  evolution.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  res.json({
    success: true,
    relationship: rel,
    evolution,
    summary: {
      duration: rel.until
        ? `${Math.round((new Date(rel.until).getTime() - new Date(rel.since || rel.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days`
        : `${Math.round((Date.now() - new Date(rel.since || rel.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days (ongoing)`,
      strength_change: rel.strength - (evolution[0]?.strength || 0.5),
      trust_change: rel.trust_score - (evolution[0]?.trust_score || 50)
    }
  });
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
  let foundSourceId = null;
  for (const [sourceId, rels] of twinRelationships.entries()) {
    const idx = rels.findIndex(r => r.id === req.params.id);
    if (idx !== -1) {
      const { type, metadata, strength, trust_score, shared_memories, until } = preventPrototypePollution(req.body);
      if (type && !VALID_RELATIONSHIP_TYPES.includes(type)) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `type must be one of: ${VALID_RELATIONSHIP_TYPES.join(', ')}` } });
      }
      const rel = rels[idx];
      if (type) rel.type = type;
      if (metadata) rel.metadata = { ...(rel.metadata || {}), ...metadata };
      // Phase 1: Allow updating enrichment fields
      if (typeof strength === 'number') rel.strength = Math.max(0, Math.min(1, strength));
      if (typeof trust_score === 'number') rel.trust_score = Math.max(0, Math.min(100, trust_score));
      if (typeof shared_memories === 'number' && shared_memories >= 0) rel.shared_memories = shared_memories;
      if (typeof until === 'string') {
        rel.until = until; // null to end relationship, or date to set end
        if (until === 'now') rel.until = new Date().toISOString();
      }
      rel.updatedAt = new Date().toISOString();
      rels[idx] = rel;
      twinRelationships.set(sourceId, rels);
      found = rel;
      foundSourceId = sourceId;
      break;
    }
  }
  if (!found) {
    return res.status(404).json({ success: false, error: { code: 'RELATIONSHIP_NOT_FOUND', message: 'Relationship not found' } });
  }
  res.json({ success: true, relationship: found });
}));

// ============ PHASE 4: AUTO-LINKING SERVICE ============

// Auto-linking state (in production, would be persisted)
const autoLinkJobs = new Map();

/**
 * POST /api/auto-link/suggest
 * Auto-suggest relationship links based on shared attributes
 * Body: { twinId, strategy: 'memory' | 'attribute' | 'behavior', minConfidence: 0.5 }
 */
app.post('/api/auto-link/suggest', requireAuth, asyncHandler(async (req, res) => {
  const { twinId, strategy = 'memory', minConfidence = 0.5, maxSuggestions = 10 } = preventPrototypePollution(req.body);

  if (!twinRegistry.has(twinId)) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }

  const twin = twinRegistry.get(twinId);
  const suggestions = [];

  // Strategy 1: Memory-based linking (shared memories/knowledge)
  if (strategy === 'memory' || strategy === 'all') {
    const twinMemories = twinKnowledgeRefs.get(twinId) || [];
    const memoryIds = new Set(twinMemories.map(m => m.knowledgeId));

    for (const [otherId, otherMemories] of twinKnowledgeRefs.entries()) {
      if (otherId === twinId) continue;

      const otherMemoryIds = new Set(otherMemories.map(m => m.knowledgeId));
      const shared = [...memoryIds].filter(id => otherMemoryIds.has(id));

      if (shared.length > 0) {
        const confidence = Math.min(1, shared.length / 10); // 1 shared = 0.1 confidence, 10+ = 1.0
        if (confidence >= minConfidence) {
          suggestions.push({
            targetId: otherId,
            targetTwin: twinRegistry.get(otherId),
            reason: 'shared_memories',
            sharedKnowledge: shared,
            sharedCount: shared.length,
            confidence,
            suggestedType: shared.length > 3 ? 'collaborates_with' : 'knows'
          });
        }
      }
    }
  }

  // Strategy 2: Attribute-based linking (same org, team, etc.)
  if (strategy === 'attribute' || strategy === 'all') {
    for (const [otherId, otherTwin] of twinRegistry.entries()) {
      if (otherId === twinId) continue;

      let attrMatchScore = 0;
      const matchingAttributes = [];

      // Check shared metadata attributes
      if (twin.metadata && otherTwin.metadata) {
        for (const key of ['organization', 'team', 'department', 'industry', 'location']) {
          if (twin.metadata[key] && twin.metadata[key] === otherTwin.metadata[key]) {
            attrMatchScore += 0.25;
            matchingAttributes.push(key);
          }
        }
      }

      // Check same twin type
      if (twin.type === otherTwin.type) {
        attrMatchScore += 0.2;
        matchingAttributes.push('type');
      }

      if (attrMatchScore >= minConfidence) {
        // Avoid duplicate suggestions
        if (!suggestions.find(s => s.targetId === otherId)) {
          suggestions.push({
            targetId: otherId,
            targetTwin: otherTwin,
            reason: 'shared_attributes',
            matchingAttributes,
            confidence: attrMatchScore,
            suggestedType: matchingAttributes.includes('organization') ? 'works_with' : 'similar_to'
          });
        }
      }
    }
  }

  // Strategy 3: Behavior-based linking (similar interactions/patterns)
  if (strategy === 'behavior' || strategy === 'all') {
    const twinRels = twinRelationships.get(twinId) || [];
    const twinRelTypes = new Set(twinRels.map(r => r.type));

    for (const [otherId, otherRels] of twinRelationships.entries()) {
      if (otherId === twinId) continue;

      const otherRelTypes = new Set(otherRels.map(r => r.type));
      const commonTypes = [...twinRelTypes].filter(t => otherRelTypes.has(t));

      if (commonTypes.length >= 2) {
        const confidence = Math.min(1, commonTypes.length / 5);
        if (confidence >= minConfidence) {
          if (!suggestions.find(s => s.targetId === otherId)) {
            suggestions.push({
              targetId: otherId,
              targetTwin: twinRegistry.get(otherId),
              reason: 'similar_behavior',
              sharedInteractionTypes: commonTypes,
              confidence,
              suggestedType: 'similar_to'
            });
          }
        }
      }
    }
  }

  // Sort by confidence and limit
  suggestions.sort((a, b) => b.confidence - a.confidence);
  const limited = suggestions.slice(0, maxSuggestions);

  // Filter out already-connected twins
  const twinRels = twinRelationships.get(twinId) || [];
  const existingConnections = new Set(twinRels.map(r => r.targetId));

  const filtered = limited.filter(s => !existingConnections.has(s.targetId));

  logger.info('Auto-link suggestions generated', { twinId, strategy, count: filtered.length });

  res.json({
    success: true,
    twinId,
    strategy,
    totalScanned: twinRegistry.size - 1,
    suggestions: filtered
  });
}));

/**
 * POST /api/auto-link/create
 * Create relationships from auto-link suggestions (batch create)
 * Body: { suggestions: [{targetId, type, strength, trust_score}] }
 */
app.post('/api/auto-link/create', requireAuth, asyncHandler(async (req, res) => {
  const { suggestions, twinId, dryRun = false } = preventPrototypePollution(req.body);

  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'suggestions array is required' } });
  }

  if (!twinId) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'twinId is required' } });
  }

  if (!twinRegistry.has(twinId)) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }

  const results = {
    created: [],
    skipped: [],
    failed: []
  };

  for (const suggestion of suggestions) {
    const { targetId, type = 'linked_to', strength = 0.5, trust_score = 50 } = suggestion;

    // Validate target exists
    if (!twinRegistry.has(targetId)) {
      results.failed.push({ targetId, reason: 'Target twin not found' });
      continue;
    }

    // Check if relationship already exists
    const existingRels = twinRelationships.get(twinId) || [];
    const alreadyExists = existingRels.some(r =>
      (r.sourceId === twinId && r.targetId === targetId) ||
      (r.sourceId === targetId && r.targetId === twinId)
    );

    if (alreadyExists) {
      results.skipped.push({ targetId, reason: 'Relationship already exists' });
      continue;
    }

    if (dryRun) {
      results.skipped.push({ targetId, reason: 'Dry run - would create', type, strength, trust_score });
      continue;
    }

    // Create the relationship with enriched metadata
    const now = new Date().toISOString();
    const relationship = {
      id: `rel-${uuidv4().slice(0, 8)}`,
      sourceId: twinId,
      targetId,
      type,
      since: now,
      until: null,
      strength,
      trust_score,
      shared_memories: suggestion.sharedCount || 0,
      last_interaction: now,
      metadata: {
        auto_linked: true,
        link_reason: suggestion.reason,
        confidence: suggestion.confidence
      },
      createdBy: req.user.id,
      createdAt: now
    };

    if (!twinRelationships.has(twinId)) {
      twinRelationships.set(twinId, []);
    }
    twinRelationships.get(twinId).push(relationship);

    results.created.push({ targetId, relationshipId: relationship.id, type, strength, trust_score });
  }

  logger.info('Auto-link batch complete', { twinId, created: results.created.length, skipped: results.skipped.length, failed: results.failed.length });

  res.json({
    success: true,
    dryRun,
    twinId,
    results
  });
}));

/**
 * POST /api/auto-link/jobs
 * Start a background auto-linking job
 * Body: { twinId, strategy, minConfidence, schedule: 'once' | 'hourly' | 'daily' }
 */
app.post('/api/auto-link/jobs', requireAuth, asyncHandler(async (req, res) => {
  const { twinId, strategy = 'all', minConfidence = 0.6, schedule = 'once' } = preventPrototypePollution(req.body);

  if (!twinRegistry.has(twinId)) {
    return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
  }

  const jobId = `job-${uuidv4().slice(0, 8)}`;
  const job = {
    id: jobId,
    twinId,
    strategy,
    minConfidence,
    schedule,
    status: 'running',
    createdAt: new Date().toISOString(),
    lastRun: null,
    runs: 0,
    totalCreated: 0,
    intervalId: null
  };

  // Run immediately
  const runJob = async () => {
    job.lastRun = new Date().toISOString();
    job.runs++;

    // Call the suggest endpoint internally
    const twinMemories = twinKnowledgeRefs.get(twinId) || [];
    const memoryIds = new Set(twinMemories.map(m => m.knowledgeId));
    const suggestions = [];

    for (const [otherId, otherMemories] of twinKnowledgeRefs.entries()) {
      if (otherId === twinId) continue;
      const otherMemoryIds = new Set(otherMemories.map(m => m.knowledgeId));
      const shared = [...memoryIds].filter(id => otherMemoryIds.has(id));

      if (shared.length > 0) {
        const confidence = Math.min(1, shared.length / 10);
        if (confidence >= minConfidence) {
          const existingRels = twinRelationships.get(twinId) || [];
          const alreadyExists = existingRels.some(r => r.targetId === otherId);

          if (!alreadyExists) {
            suggestions.push({ targetId: otherId, reason: 'shared_memories', sharedCount: shared.length, confidence, type: 'collaborates_with' });
          }
        }
      }
    }

    // Auto-create high-confidence links
    const highConfidence = suggestions.filter(s => s.confidence >= minConfidence + 0.2);
    let created = 0;

    for (const s of highConfidence) {
      const relationship = {
        id: `rel-${uuidv4().slice(0, 8)}`,
        sourceId: twinId,
        targetId: s.targetId,
        type: s.type,
        since: new Date().toISOString(),
        until: null,
        strength: s.confidence,
        trust_score: Math.round(s.confidence * 100),
        shared_memories: s.sharedCount,
        last_interaction: new Date().toISOString(),
        metadata: { auto_linked: true, link_reason: s.reason, confidence: s.confidence },
        createdBy: 'system',
        createdAt: new Date().toISOString()
      };

      if (!twinRelationships.has(twinId)) twinRelationships.set(twinId, []);
      twinRelationships.get(twinId).push(relationship);
      created++;
    }

    job.totalCreated += created;
    logger.info('Auto-link job completed', { jobId, twinId, suggestionsFound: suggestions.length, created });
  };

  // Initial run
  await runJob();

  // Schedule recurring if needed
  if (schedule === 'hourly') {
    job.intervalId = setInterval(runJob, 60 * 60 * 1000);
  } else if (schedule === 'daily') {
    job.intervalId = setInterval(runJob, 24 * 60 * 60 * 1000);
  }

  if (schedule === 'once') {
    job.status = 'completed';
  }

  autoLinkJobs.set(jobId, job);

  res.json({ success: true, job });
}));

/**
 * GET /api/auto-link/jobs/:jobId
 * Get status of an auto-linking job
 */
app.get('/api/auto-link/jobs/:jobId', requireAuth, (req, res) => {
  const job = autoLinkJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Auto-link job not found' } });
  }
  res.json({ success: true, job });
});

/**
 * DELETE /api/auto-link/jobs/:jobId
 * Cancel an auto-linking job
 */
app.delete('/api/auto-link/jobs/:jobId', requireAuth, (req, res) => {
  const job = autoLinkJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Auto-link job not found' } });
  }
  if (job.intervalId) {
    clearInterval(job.intervalId);
  }
  job.status = 'cancelled';
  res.json({ success: true, job });
});

/**
 * GET /api/auto-link/stats
 * Get auto-linking statistics
 */
app.get('/api/auto-link/stats', requireAuth, (req, res) => {
  const allJobs = Array.from(autoLinkJobs.values());

  // Count auto-linked relationships
  let autoLinkedCount = 0;
  let totalRelationships = 0;
  for (const [, rels] of twinRelationships.entries()) {
    for (const rel of rels) {
      totalRelationships++;
      if (rel.metadata?.auto_linked) autoLinkedCount++;
    }
  }

  res.json({
    success: true,
    stats: {
      totalJobs: allJobs.length,
      activeJobs: allJobs.filter(j => j.status === 'running').length,
      completedJobs: allJobs.filter(j => j.status === 'completed').length,
      totalAutoLinks: autoLinkedCount,
      totalRelationships,
      autoLinkPercentage: totalRelationships > 0 ? (autoLinkedCount / totalRelationships * 100).toFixed(2) + '%' : '0%'
    }
  });
});

// ============ HEALTH ENDPOINTS ============

app.get('/health', (req, res) => {
  const twins = Array.from(twinRegistry.values());

  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '3.1.0',
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
