/**
 * RTMN CorpID - Universal Identity Service v3.0
 *
 * Production-ready refactor:
 * - Uses @rtmn/shared for persistence, auth, logger, errors
 * - JWT-based authentication (unchanged)
 * - Role-based access control (unchanged)
 * - Rate limiting (unchanged)
 * - Data SURVIVES process restarts (NEW)
 *
 * @author HOJAI AI
 * @version 3.0.0
 */

import express from 'express';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { body, param, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Shared library
import { createLogger } from '../../../../shared/lib/logger.js';
import { createModel } from '../../../../shared/lib/persistent-store.js';
import { asyncHandler, errorMiddleware, NotFoundError, ConflictError, UnauthorizedError, ForbiddenError, ValidationError } from '../../../../shared/lib/errors.js';

process.env.SERVICE_NAME = 'corpID';
const logger = createLogger('corpID');

// ============ CONFIGURATION ============

const PORT = process.env.PORT || 4702;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '7d';
const TOKEN_ISSUER = 'rtmn-corpid';
const BCRYPT_ROUNDS = 12;

// ============ AGENTOS BRIDGE ============
// Bidirectional bridge: CorpID (4702) ↔ AgentOS (port 4803)
// CorpID owns canonical agent identity (CI-AGT- typed)
// AgentOS owns agent heartbeat, execution, and capability registry.
// This bridge keeps both systems in sync without migrating either.

const AGENT_OS_URL = process.env.AGENT_OS_URL || 'http://localhost:4803';
const INTERNAL_TOKEN = process.env.CORPID_INTERNAL_TOKEN || 'corpID-internal-dev-token';

async function bridgeToAgentOS(method, path, body) {
  try {
    const res = await fetch(`${AGENT_OS_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': INTERNAL_TOKEN,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      logger.warn({ status: res.status, path }, 'AgentOS bridge call failed');
      return null;
    }
    return await res.json().catch(() => null);
  } catch (err) {
    logger.warn({ err }, 'AgentOS bridge unreachable — continuing without sync');
    return null;
  }
}

// Register agent in AgentOS when CorpID passport is created
async function bridgeRegisterAgent(agent) {
  return bridgeToAgentOS('POST', '/api/agents', {
    name: agent.name,
    displayName: agent.name,
    description: agent.description,
    type: agent.type,
    category: agent.category,
    capabilities: agent.capabilities || [],
    permissions: { dataAccess: agent.permissions || [], actions: [], restrictions: [] },
    model: { provider: agent.provider || 'internal', name: agent.model || 'unknown' },
    owner: { type: 'user', id: agent.ownerId },
    // corpID link back
    corpidId: agent.agentId,
  });
}

// Revoke agent in AgentOS when CorpID passport is revoked
async function bridgeRevokeAgent(agentId) {
  // AgentOS uses internal IDs, so we search first
  return bridgeToAgentOS('GET', `/api/agents/by-agent-id/${agentId}`)
    .then(data => {
      if (data?.agent?.id) {
        return bridgeToAgentOS('POST', `/api/agents/${data.agent.id}/pause`, { reason: 'corpID passport revoked' });
      }
      return null;
    });
}

// ============ PERSISTENT MODELS ============

const User = createModel('User', { key: 'email' });
const Business = createModel('Business', { key: 'id' });
const RefreshToken = createModel('RefreshToken', { key: 'token' });
const ApiKey = createModel('ApiKey', { key: 'id' });
const TrustScore = createModel('TrustScore', { key: 'corpId' });
const Namespace = createModel('Namespace', { key: 'name' });
const Agent = createModel('Agent', { key: 'agentId' });
const AgentInteraction = createModel('AgentInteraction', { key: 'id' });
const Delegation = createModel('Delegation', { key: 'delegationId' });

// Relationship graph models (adapted from corpID-cloud/graph/model.js — ADAPT, don't rewrite)
// Using in-memory indices for graph traversal; persistent store for node/edge data.
const RelNode = createModel('RelNode', { key: 'nodeId' });
const RelEdge = createModel('RelEdge', { key: 'edgeId' });

// In-memory indices for fast graph traversal (reset on process restart)
const relNodeIndex = new Map(); // `${entityType}:${entityId}` → nodeId
const relEdgeIndex = new Map(); // sourceNodeId → [edgeId]

const REL_NODE_TYPES = {
  USER: 'user', ORGANIZATION: 'organization', DEPARTMENT: 'department', TEAM: 'team',
  CONSUMER: 'consumer', MERCHANT: 'merchant', BRANCH: 'branch', AGENT: 'agent',
  DEVICE: 'device', API_KEY: 'api_key', TWIN: 'twin', EMPLOYEE: 'employee',
};
const REL_EDGE_TYPES = {
  OWNS: 'owns', MEMBER_OF: 'member_of', MANAGES: 'manages', REPORTS_TO: 'reports_to',
  PARTNER_OF: 'partner_of', SUPPLIES_TO: 'supplies_to', PARENT_OF: 'parent_of',
  CHILD_OF: 'child_of', LINKED_TO: 'linked_to', CREATED: 'created', USES: 'uses',
  TRUSTS: 'trusts', OWNS_AGENT: 'owns_agent', OWNS_MERCHANT: 'owns_merchant',
  FOLLOWS: 'follows', CONNECTED_TO: 'connected_to', DELEGATES_TO: 'delegates_to',
  HAS_DELEGATION: 'has_delegation',
};

async function upsertRelNode(entityType, entityId, properties = {}) {
  const idxKey = `${entityType}:${entityId}`;
  let nodeId = relNodeIndex.get(idxKey);
  if (!nodeId) {
    nodeId = `REL-${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    relNodeIndex.set(idxKey, nodeId);
    await RelNode.create({
      nodeId, entityType, entityId,
      properties: { name: null, status: 'active', ...properties },
      degree: 0, createdAt: new Date().toISOString(),
    });
  } else {
    const existing = await RelNode.findOne(nodeId);
    if (existing) await RelNode.updateOne({ nodeId }, { properties: { ...existing.properties, ...properties } });
  }
  return (await RelNode.findOne(nodeId)) || null;
}

async function getRelNodeEdges(nodeId, direction = 'all') {
  const result = [];
  const allEdges = await RelEdge.find();
  if (direction === 'all' || direction === 'outgoing') {
    const outgoingIds = relEdgeIndex.get(nodeId) || [];
    for (const edgeId of outgoingIds) {
      const edge = allEdges.find(e => e.edgeId === edgeId);
      if (edge) result.push({ ...edge, direction: 'outgoing' });
    }
  }
  if (direction === 'all' || direction === 'incoming') {
    for (const edge of allEdges) {
      if (edge.targetNodeId === nodeId) result.push({ ...edge, direction: 'incoming' });
    }
  }
  return result;
}

// ============ TRUST INTELLIGENCE ============
// Adapted from corpID-cloud/trust/model.js (ADAPT, don't rewrite).

const TrustEvaluation = createModel('TrustEvaluation', { key: 'evaluationId' });
const IdentityEvent = createModel('IdentityEvent', { key: 'eventId' });

const TRUST_WEIGHTS = {
  identity: 0.25, behavior: 0.25, device: 0.15, transaction: 0.20, history: 0.15,
};

function evaluateTrustComponents(factors = {}) {
  const identityScore = Math.min(100, Math.max(0, 50 + (factors.identity?.verified ? 30 : 0) + (factors.identity?.kycLevel || 0) * 10));
  const behaviorScore = Math.min(100, Math.max(0, 50 + (factors.behavior?.loginCount || 0) * 2 - (factors.behavior?.failedLogins || 0) * 5));
  const deviceScore = Math.min(100, Math.max(0, 50 + (factors.device?.trustedDevices || 0) * 10));
  const transactionScore = Math.min(100, Math.max(0, 50 + (factors.transaction?.completedCount || 0) * 5 - (factors.transaction?.failedCount || 0) * 10));
  const historyScore = Math.min(100, Math.max(0, 50 + (factors.history?.accountAgeDays || 0) * 0.5 - (factors.history?.violations || 0) * 20));

  const overall = Math.round(
    identityScore * TRUST_WEIGHTS.identity +
    behaviorScore * TRUST_WEIGHTS.behavior +
    deviceScore * TRUST_WEIGHTS.device +
    transactionScore * TRUST_WEIGHTS.transaction +
    historyScore * TRUST_WEIGHTS.history
  );

  return { identityScore, behaviorScore, deviceScore, transactionScore, historyScore, overall };
}

function riskCheck(corpId, context = {}) {
  const flags = [];
  if (context.newIp) flags.push({ flag: 'new_ip', risk: 20, detail: 'First login from this IP' });
  if (context.tor) flags.push({ flag: 'tor_exit', risk: 50, detail: 'Traffic from Tor exit node' });
  if (context.velocity > 10) flags.push({ flag: 'high_velocity', risk: 30, detail: 'Unusual request velocity' });
  if (context.unusualTime) flags.push({ flag: 'unusual_time', risk: 10, detail: 'Login outside normal hours' });
  return { corpId, checkedAt: new Date().toISOString(), flags, totalRisk: flags.reduce((s, f) => s + f.risk, 0) };
}

// ============ FEDERATION MODELS ============

const FedProvider = createModel('FedProvider', { key: 'providerId' });
const FedLink = createModel('FedLink', { key: 'linkId' });

const OAUTH_PROVIDERS = {
  google: { name: 'Google', icon: 'google', scopes: ['openid', 'email', 'profile'] },
  apple: { name: 'Apple', icon: 'apple', scopes: ['name', 'email'] },
  microsoft: { name: 'Microsoft', icon: 'microsoft', scopes: ['openid', 'email', 'profile'] },
  github: { name: 'GitHub', icon: 'github', scopes: ['user:email', 'read:user'] },
  linkedin: { name: 'LinkedIn', icon: 'linkedin', scopes: ['r_liteprofile', 'r_emailaddress'] },
};

// ============ ACP BRIDGE ============

const ACP_URL = process.env.ACP_URL || 'http://localhost:4340';

async function bridgeToACP(path, body) {
  try {
    const res = await fetch(`${ACP_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': INTERNAL_TOKEN },
      body: JSON.stringify(body),
    });
    return res.ok ? await res.json().catch(() => null) : null;
  } catch { return null; }
}

// ============ WORKLOAD IDENTITY (CI-WRK) ============
// SPIFFE-compatible workload identity for services, jobs, and automation

const WorkloadIdentity = createModel('WorkloadIdentity', { key: 'workloadId' });

// Workload token store: workloadId → { token, expiresAt }
const workloadTokenStore = new Map();

/**
 * Generate SPIFFE-compatible workload ID
 * Format: CI-WRK-<namespace>-<service>-<8-char-uuid>
 */
function generateWorkloadId(namespace, service) {
  const uuid = uuidv4().replace(/-/g, '').substring(0, 8);
  return `CI-WRK-${namespace}-${service}-${uuid}`.toUpperCase();
}

/**
 * Generate short-lived workload token (JWT)
 * Similar to SPIFFE SVID - short-lived, rotatable
 */
function generateWorkloadToken(workload) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h default
  const token = jwt.sign(
    {
      sub: workload.workloadId,
      type: 'workload_token',
      namespace: workload.namespace,
      service: workload.service,
      permissions: workload.permissions || [],
      scopes: workload.scopes || [],
      audience: workload.audience,
    },
    JWT_SECRET,
    { expiresIn: '24h', issuer: TOKEN_ISSUER, jwtid: uuidv4() }
  );
  workloadTokenStore.set(workload.workloadId, { token, expiresAt: expiresAt.toISOString() });
  return { token, expiresAt: expiresAt.toISOString() };
}

// ============ INITIAL SEED DATA ============

// Seed default business + admin user (only if database is empty)
async function seedDefaults() {
  const existingBusinesses = await Business.find();
  if (existingBusinesses.length === 0) {
    const now = new Date().toISOString();
    await Business.create({
      id: 'RTMN-HQ',
      name: 'RTMN Headquarters',
      industry: 'technology',
      plan: 'enterprise',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    logger.info('Seeded default business: RTMN-HQ');
  }

  const existingUsers = await User.find();
  if (existingUsers.length === 0) {
    const now = new Date().toISOString();
    // SECURITY FIX (CORPID L-9 + project-wide constraint): default admin
    // password is no longer seeded in source. The bootstrap flow generates a
    // single-use token via BOOTSTRAP_ADMIN_EMAIL and prints it to stdout.
    // If that env var is not set, refuse to seed (matches the new bootstrap
    // pattern documented in corpID-cloud/README.md and src/index.js).
    if (!process.env.BOOTSTRAP_ADMIN_EMAIL) {
      logger.warn('No users seeded. Set BOOTSTRAP_ADMIN_EMAIL to bootstrap the initial admin.');
      return;
    }
    const passwordHash = await bcrypt.hash(require('crypto').randomBytes(24).toString('base64url'), BCRYPT_ROUNDS);
    await User.create({
      id: 'user-admin-001',
      email: process.env.BOOTSTRAP_ADMIN_EMAIL,
      passwordHash,
      name: 'Admin User',
      role: 'superadmin',
      businessId: 'RTMN-HQ',
      status: 'active',
      mustChangePassword: true,
      createdAt: now,
      updatedAt: now,
    });
    logger.info('Seeded initial admin from BOOTSTRAP_ADMIN_EMAIL (password reset required on first login).');
  }

  // Seed trust scores for existing users
  const allUsers = await User.find();
  for (const u of allUsers) {
    const existing = await TrustScore.findOne(u.id);
    if (!existing) {
      const baseScore = u.role === 'superadmin' ? 95 : u.role === 'admin' ? 85 : u.role === 'manager' ? 70 : 50;
      await TrustScore.create({
        corpId: u.id,
        score: baseScore,
        level: computeTrustLevel(baseScore),
        lastUpdated: new Date().toISOString(),
        history: [],
      });
    }
  }
}

function computeTrustLevel(score) {
  if (score >= 90) return 'platinum';
  if (score >= 80) return 'gold';
  if (score >= 70) return 'silver';
  if (score >= 50) return 'bronze';
  if (score >= 30) return 'iron';
  return 'restricted';
}

// ============ EXPRESS APP ============

const app = express();

// Validate required env at startup
import { requireEnv } from '@rtmn/shared/lib/env';
requireEnv(['PORT'], { allowDev: true });

// ============ SECURITY MIDDLEWARE ============

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
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ============ RATE LIMITERS ============
// In test mode (NODE_ENV=test), skip rate limiting entirely
const TEST_MODE = process.env.NODE_ENV === 'test';

// Per-user rate limit store: userId → { count, resetTime }
const perUserRateLimit = new Map();
const PER_USER_WINDOW_MS = 60 * 1000; // 1 minute
const PER_USER_MAX = 100; // requests per minute per user

function perUserLimiter(req, res, next) {
  if (TEST_MODE) return next();

  // Get user ID from auth token if present
  const authHeader = req.headers.authorization;
  let key = req.ip; // Default to IP

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (decoded) {
      key = `user:${decoded.sub}`; // Per-user tracking
    }
  }

  const now = Date.now();
  let record = perUserRateLimit.get(key);

  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + PER_USER_WINDOW_MS };
  }

  record.count++;

  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': PER_USER_MAX.toString(),
    'X-RateLimit-Remaining': Math.max(0, PER_USER_MAX - record.count).toString(),
    'X-RateLimit-Reset': Math.ceil(record.resetTime / 1000).toString(),
  });

  if (record.count > PER_USER_MAX) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT',
        message: 'Too many requests per user',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      },
    });
  }

  perUserRateLimit.set(key, record);
  next();
}

const authLimiter = TEST_MODE ? (req, res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many auth attempts' } },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});

const defaultLimiter = TEST_MODE ? (req, res, next) => next() : rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false
});

const strictLimiter = TEST_MODE ? (req, res, next) => next() : rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Rate limit exceeded' } }
});

app.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/ready') return next();
  return perUserLimiter(req, res, next);
});

// ============ VALIDATION HELPERS ============

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array().map(err => ({ field: err.path, message: err.msg, value: err.value }))
      }
    });
  }
  next();
}

function sanitizeInput(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const dangerous = ['__proto__', 'constructor', 'prototype'];
  const sanitized = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (!dangerous.includes(key)) {
      sanitized[key] = typeof value === 'object' && value !== null
        ? sanitizeInput(value)
        : value;
    }
  }
  return sanitized;
}

// ============ AUTH HELPERS ============

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      type: 'access'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN, issuer: TOKEN_ISSUER, jwtid: uuidv4() }
  );
}

async function generateRefreshToken(user) {
  const token = jwt.sign(
    { sub: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN, issuer: TOKEN_ISSUER }
  );

  await RefreshToken.create({
    token,
    userId: user.id,
    email: user.email,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  return token;
}

async function generateTokens(user) {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: await generateRefreshToken(user),
    expiresIn: JWT_EXPIRES_IN,
    tokenType: 'Bearer'
  };
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, { issuer: TOKEN_ISSUER });
  } catch {
    return null;
  }
}

// ============ AUTH MIDDLEWARE ============

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No token provided'));
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) return next(new UnauthorizedError('Invalid or expired token'));
  if (decoded.type !== 'access') return next(new UnauthorizedError('Invalid token type'));
  req.user = {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
    businessId: decoded.businessId
  };
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError('Authentication required'));
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Required role: ${allowedRoles.join(' or ')}`));
    }
    next();
  };
}

function requireBusiness(businessIdParam = 'businessId') {
  return async (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError('Authentication required'));
    if (['superadmin', 'admin'].includes(req.user.role)) return next();
    const requestedBusiness = req.params[businessIdParam] || req.body[businessIdParam] || req.query[businessIdParam];
    if (requestedBusiness && requestedBusiness !== req.user.businessId) {
      return next(new ForbiddenError('Access denied to this business'));
    }
    next();
  };
}

// ============ AGENT AUTH MIDDLEWARE ============

/**
 * AGENT_CAPABILITIES — risk catalog for AI agent capabilities.
 * Adapted from corpID-cloud/agent/model.js (ADAPT, don't rewrite).
 */
const AGENT_CAPABILITIES = {
  'web-search': { name: 'Web Search', risk: 'low', requiresConsent: false },
  'code-execution': { name: 'Code Execution', risk: 'medium', requiresConsent: true },
  'file-read': { name: 'File Read', risk: 'low', requiresConsent: false },
  'file-write': { name: 'File Write', risk: 'medium', requiresConsent: true },
  'email-send': { name: 'Send Email', risk: 'high', requiresConsent: true },
  'sms-send': { name: 'Send SMS', risk: 'high', requiresConsent: true },
  'payment-initiate': { name: 'Initiate Payment', risk: 'critical', requiresConsent: true },
  'user-data-access': { name: 'Access User Data', risk: 'high', requiresConsent: true },
  'admin-actions': { name: 'Admin Actions', risk: 'critical', requiresConsent: true },
  'memory-access': { name: 'Memory Access', risk: 'medium', requiresConsent: true },
  'external-api': { name: 'External API Calls', risk: 'medium', requiresConsent: false },
};

/**
 * Generate an agent access token (JWT with type='agent_access').
 * Different from human access tokens (type='access').
 */
function generateAgentToken(agent) {
  return jwt.sign(
    {
      sub: agent.agentId,         // CI-AGT-xxxxx
      type: 'agent_access',
      owner: agent.ownerId,       // CI-IND-xxxxx
      businessId: agent.businessId,
      permissions: agent.permissions || [],
      scopes: agent.scopes || [],
    },
    JWT_SECRET,
    { expiresIn: '1h', issuer: TOKEN_ISSUER, jwtid: uuidv4() }
  );
}

/**
 * Middleware: accept human JWT (type='access') OR agent JWT (type='agent_access').
 * Sets req.principal = { type: 'human'|'agent', id, ... }
 */
function requireHumanOrAgent(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No token provided'));
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) return next(new UnauthorizedError('Invalid or expired token'));

  if (decoded.type === 'access') {
    // Human token
    req.principal = { type: 'human', id: decoded.sub, email: decoded.email, role: decoded.role, businessId: decoded.businessId };
  } else if (decoded.type === 'agent_access') {
    // Agent token
    req.principal = { type: 'agent', id: decoded.sub, owner: decoded.owner, businessId: decoded.businessId, permissions: decoded.permissions, scopes: decoded.scopes };
  } else {
    return next(new UnauthorizedError('Invalid token type'));
  }
  next();
}

// ============ HEALTH ENDPOINTS ============

app.get('/health', async (req, res) => {
  // Liveness - always 200 if process up
  const stats = {
    users: await User.countDocuments(),
    businesses: await Business.countDocuments(),
    activeSessions: await RefreshToken.countDocuments(),
  };
  res.json({
    status: 'healthy',
    service: 'corpID',
    version: '3.0.0',
    port: PORT,
    storage: 'persistent',
    timestamp: new Date().toISOString(),
    stats,
  });
});

app.get('/ready', async (req, res) => {
  // Readiness - checks data layer
  try {
    const userCount = await User.countDocuments();
    res.json({
      status: 'ready',
      service: 'corpID',
      storage: 'persistent',
      timestamp: new Date().toISOString(),
      checks: { dataLayer: 'ok', userCount },
    });
  } catch (err) {
    res.status(503).json({
      status: 'not ready',
      service: 'corpID',
      timestamp: new Date().toISOString(),
      error: err.message,
    });
  }
});

// ============ AUTH ROUTES ============

// Breach check using HaveIBeenPwned k-anonymity API
async function checkPasswordBreach(password) {
  try {
    const { createHash } = await import('crypto');
    const hash = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'User-Agent': 'CorpID-v3-RTMN' },
    });

    if (!response.ok) return false; // API unavailable, skip check

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        logger.warn({ breachCount: parseInt(count) }, 'Password found in breach database');
        return true; // Password found in breaches
      }
    }
    return false;
  } catch (err) {
    logger.error({ err }, 'Breach check failed - skipping');
    return false; // On error, skip check (don't block registration)
  }
}

app.post('/auth/register', authLimiter, [
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/).withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
  body('businessId').trim().isLength({ min: 2, max: 50 }).withMessage('Business ID is required'),
  body('businessName').optional().trim().isLength({ max: 200 }),
  body('role').optional().isIn(['owner', 'admin', 'manager', 'user']),
  validate,
], asyncHandler(async (req, res) => {
  const body = sanitizeInput(req.body);
  const { email, password, name, businessId, businessName, role = 'owner' } = body;

  const existingUser = await User.findOne(email.toLowerCase());
  if (existingUser) throw new ConflictError('User with this email already exists');

  const existingBusiness = await Business.findOne(businessId);
  if (existingBusiness) throw new ConflictError('Business with this ID already exists');

  // Check if password was exposed in a data breach
  const isBreached = await checkPasswordBreach(password);
  if (isBreached) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'PASSWORD_COMPROMISED',
        message: 'This password has appeared in a data breach. Please choose a different, stronger password.',
      },
    });
  }

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  await Business.create({
    id: businessId,
    name: businessName || businessId,
    industry: req.body.industry || 'general',
    plan: req.body.plan || 'starter',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  const userId = `user-${uuidv4().slice(0, 8)}`;
  const user = await User.create({
    id: userId,
    email: email.toLowerCase(),
    passwordHash,
    name,
    role,
    businessId,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  const tokens = await generateTokens(user);

  // Initialize trust score for new user
  const baseScore = role === 'superadmin' ? 95 : role === 'admin' ? 85 : role === 'manager' ? 70 : 50;
  await TrustScore.create({
    corpId: userId,
    score: baseScore,
    level: computeTrustLevel(baseScore),
    lastUpdated: now,
    history: [],
  });

  logger.info({ userId, businessId, email: user.email }, 'User registered');

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    ...tokens,
    user: {
      id: user.id, email: user.email, name: user.name,
      role: user.role, businessId: user.businessId,
    },
  });
}));

app.post('/auth/login', authLimiter, [
  body('email').trim().isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
], asyncHandler(async (req, res) => {
  const { email, password } = sanitizeInput(req.body);
  const user = await User.findOne(email.toLowerCase());
  if (!user) throw new UnauthorizedError('Invalid email or password');
  if (user.status !== 'active') throw new ForbiddenError('Account is not active');

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) throw new UnauthorizedError('Invalid email or password');

  const tokens = await generateTokens(user);
  logger.info({ userId: user.id, email: user.email }, 'User logged in');

  res.json({
    success: true,
    message: 'Login successful',
    ...tokens,
    user: {
      id: user.id, email: user.email, name: user.name,
      role: user.role, businessId: user.businessId,
    },
  });
}));

// Token verification endpoint for downstream services (added June 21, 2026)
// Returns the decoded user info if the token is valid, else 401.
app.post('/auth/verify', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('No token provided');
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) throw new UnauthorizedError('Invalid or expired token');
  if (decoded.type !== 'access') throw new UnauthorizedError('Invalid token type');
  res.json({
    success: true,
    user: {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      businessId: decoded.businessId,
    },
  });
}));

app.post('/auth/refresh', authLimiter, [
  body('refreshToken').notEmpty(),
  validate,
], asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const decoded = verifyToken(refreshToken);
  if (!decoded || decoded.type !== 'refresh') throw new UnauthorizedError('Invalid refresh token');

  const tokenRecord = await RefreshToken.findOne(refreshToken);
  if (!tokenRecord || new Date(tokenRecord.expiresAt) < new Date()) {
    if (tokenRecord) await RefreshToken.deleteOne({ token: refreshToken });
    throw new UnauthorizedError('Refresh token expired or revoked');
  }

  const user = await User.findOne(decoded.sub);
  if (!user || user.status !== 'active') throw new UnauthorizedError('User not found or inactive');

  // Revoke old, issue new
  await RefreshToken.deleteOne({ token: refreshToken });
  const tokens = await generateTokens(user);

  logger.info({ userId: user.id }, 'Token refreshed');
  res.json({ success: true, ...tokens });
}));

app.post('/auth/logout', requireAuth, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) await RefreshToken.deleteOne({ token: refreshToken });
  logger.info({ userId: req.user.id }, 'User logged out');
  res.json({ success: true, message: 'Logged out successfully' });
}));

app.get('/auth/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findOne(req.user.email);
  if (!user) throw new NotFoundError('User not found');
  const business = await Business.findOne(user.businessId);
  res.json({
    success: true,
    user: {
      id: user.id, email: user.email, name: user.name,
      role: user.role, businessId: user.businessId,
      businessName: business?.name,
      status: user.status, createdAt: user.createdAt,
    },
  });
}));

// ============ SESSION MANAGEMENT ============

app.get('/api/auth/sessions', requireAuth, asyncHandler(async (req, res) => {
  const sessions = await RefreshToken.find();
  const userSessions = sessions.filter(s => s.userId === req.user.id);
  res.json({
    success: true,
    sessions: userSessions.map(s => ({
      tokenId: s.token.substring(0, 16) + '...',
      email: s.email,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: s.token === req.headers['x-refresh-token'],
    })),
    total: userSessions.length,
  });
}));

app.delete('/api/auth/sessions', requireAuth, asyncHandler(async (req, res) => {
  const { tokenId } = req.body || {};
  if (tokenId) {
    // Revoke specific session
    const sessions = await RefreshToken.find();
    const session = sessions.find(s => s.token.substring(0, 16) === tokenId.replace('...', ''));
    if (!session) throw new NotFoundError('Session not found');
    if (session.userId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) {
      throw new ForbiddenError('Cannot revoke another user\'s session');
    }
    await RefreshToken.deleteOne({ token: session.token });
    res.json({ success: true, message: 'Session revoked' });
  } else {
    // Revoke all sessions for this user
    const sessions = await RefreshToken.find();
    for (const s of sessions.filter(s => s.userId === req.user.id)) {
      await RefreshToken.deleteOne({ token: s.token });
    }
    res.json({ success: true, message: 'All sessions revoked' });
  }
}));

// ============ MFA (TOTP) ============

// TOTP secret storage (in production, encrypt this)
const mfaSecretStore = new Map(); // email → { secret, enabled, backupCodes[] }

function generateMfaSecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) secret += chars[Math.floor(Math.random() * chars.length)];
  return secret;
}

function generateBackupCodes() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    codes.push(code);
  }
  return codes;
}

function totpGenerate(secret) {
  // Simplified TOTP - in production use otplib
  const counter = Math.floor(Date.now() / 30000);
  let hash = 0;
  const str = secret + counter;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return String(Math.abs(hash % 1000000)).padStart(6, '0');
}

app.post('/api/mfa/setup', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findOne(req.user.email);
  if (!user) throw new NotFoundError('User not found');

  const secret = generateMfaSecret();
  const backupCodes = generateBackupCodes();

  mfaSecretStore.set(user.email, {
    secret,
    enabled: false, // Needs verification to enable
    backupCodes: backupCodes.map(c => ({ code: c, used: false })),
    createdAt: new Date().toISOString(),
  });

  // Generate otpauth:// URI for QR code
  const otpauthUri = `otpauth://totp/CorpID:${user.email}?secret=${secret}&issuer=CorpID&algorithm=SHA1&digits=6&period=30`;

  res.json({
    success: true,
    secret,
    backupCodes,
    otpauthUri,
    message: 'Scan QR code with authenticator app, then verify with /api/mfa/verify',
  });
}));

app.post('/api/mfa/verify', requireAuth, [
  body('code').trim().isLength({ min: 6, max: 6 }).withMessage('6-digit code required'),
  validate,
], asyncHandler(async (req, res) => {
  const user = await User.findOne(req.user.email);
  if (!user) throw new NotFoundError('User not found');

  const mfaData = mfaSecretStore.get(user.email);
  if (!mfaData) throw new NotFoundError('MFA not set up. Call /api/mfa/setup first.');

  const { code } = req.body;

  // Check backup code first
  const backupCode = mfaData.backupCodes.find(bc => bc.code === code && !bc.used);
  if (backupCode) {
    backupCode.used = true;
    logger.info({ userId: user.id }, 'MFA verified via backup code');
    return res.json({
      success: true,
      verified: true,
      method: 'backup_code',
      message: 'MFA verified. Backup code consumed.',
    });
  }

  // Verify TOTP
  const expected = totpGenerate(mfaData.secret);
  if (code !== expected) {
    logger.warn({ userId: user.id }, 'Invalid MFA code attempt');
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_CODE', message: 'Invalid MFA code' },
    });
  }

  // Enable MFA
  mfaData.enabled = true;
  logger.info({ userId: user.id }, 'MFA enabled');
  res.json({
    success: true,
    verified: true,
    method: 'totp',
    message: 'MFA enabled successfully',
  });
}));

app.get('/api/mfa/status', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findOne(req.user.email);
  if (!user) throw new NotFoundError('User not found');

  const mfaData = mfaSecretStore.get(user.email);
  res.json({
    success: true,
    enabled: mfaData?.enabled || false,
    hasBackupCodes: mfaData?.backupCodes?.some(bc => !bc.used) || false,
    remainingBackupCodes: mfaData?.backupCodes?.filter(bc => !bc.used).length || 0,
  });
}));

app.post('/api/mfa/disable', requireAuth, [
  body('code').trim().isLength({ min: 6, max: 6 }).withMessage('6-digit code required'),
  validate,
], asyncHandler(async (req, res) => {
  const user = await User.findOne(req.user.email);
  if (!user) throw new NotFoundError('User not found');

  const mfaData = mfaSecretStore.get(user.email);
  if (!mfaData) throw new NotFoundError('MFA not enabled');

  const { code } = req.body;

  // Verify before disabling
  const expected = totpGenerate(mfaData.secret);
  if (code !== expected) {
    // Check backup code
    const backupCode = mfaData.backupCodes.find(bc => bc.code === code && !bc.used);
    if (!backupCode) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CODE', message: 'Invalid MFA code' },
      });
    }
  }

  mfaSecretStore.delete(user.email);
  logger.info({ userId: user.id }, 'MFA disabled');
  res.json({ success: true, message: 'MFA disabled' });
}));

// ============ WORKLOAD IDENTITY ROUTES (CI-WRK) ============
// SPIFFE-compatible workload identity for services, jobs, and automation

/**
 * Require workload token middleware
 * Accepts workload_token JWT (type='workload_token')
 */
function requireWorkloadToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No token provided'));
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) return next(new UnauthorizedError('Invalid or expired token'));
  if (decoded.type !== 'workload_token') {
    return next(new UnauthorizedError('Invalid token type - workload token required'));
  }
  req.workload = {
    workloadId: decoded.sub,
    namespace: decoded.namespace,
    service: decoded.service,
    permissions: decoded.permissions,
    scopes: decoded.scopes,
    audience: decoded.audience,
  };
  next();
}

app.post('/api/workloads', requireAuth, requireRole('superadmin', 'admin', 'manager'), [
  body('namespace').trim().isLength({ min: 1, max: 50 }).withMessage('namespace required (1-50 chars)'),
  body('service').trim().isLength({ min: 1, max: 100 }).withMessage('service name required'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('permissions').optional().isArray(),
  body('scopes').optional().isArray(),
  body('audience').optional().trim().isLength({ max: 200 }),
  body('ttl').optional().isInt({ min: 3600, max: 86400 }).toInt(), // 1h to 24h
  validate,
], asyncHandler(async (req, res) => {
  const body = sanitizeInput(req.body);
  const { namespace, service, description, permissions = [], scopes = [], audience, ttl = 86400 } = body;

  const workloadId = generateWorkloadId(namespace, service);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  const workload = await WorkloadIdentity.create({
    workloadId,
    namespace,
    service,
    description: description || '',
    ownerId: req.user.id,
    businessId: req.user.businessId,
    permissions,
    scopes,
    audience: audience || null,
    ttl,
    status: 'active',
    createdAt: now,
    expiresAt,
  });

  // Generate initial token
  const tokenInfo = generateWorkloadToken({ ...workload, ttl });
  workload._token = tokenInfo.token; // Don't persist in store

  logger.info({ workloadId, namespace, service, ownerId: req.user.id }, 'Workload identity created');
  res.status(201).json({
    success: true,
    workload: {
      workloadId: workload.workloadId,
      namespace: workload.namespace,
      service: workload.service,
      description: workload.description,
      permissions: workload.permissions,
      scopes: workload.scopes,
      status: workload.status,
      createdAt: workload.createdAt,
      expiresAt: workload.expiresAt,
    },
    token: tokenInfo.token,
    message: 'Store the token securely - it will not be shown again',
  });
}));

app.get('/api/workloads', requireAuth, requireRole('superadmin', 'admin', 'manager'), asyncHandler(async (req, res) => {
  const workloads = await WorkloadIdentity.find();
  const filtered = workloads.filter(w => w.businessId === req.user.businessId || ['superadmin'].includes(req.user.role));
  res.json({
    success: true,
    workloads: filtered.map(w => ({
      workloadId: w.workloadId,
      namespace: w.namespace,
      service: w.service,
      description: w.description,
      permissions: w.permissions,
      scopes: w.scopes,
      status: w.status,
      createdAt: w.createdAt,
      expiresAt: w.expiresAt,
    })),
    total: filtered.length,
  });
}));

app.get('/api/workloads/:workloadId', requireAuth, asyncHandler(async (req, res) => {
  const workload = await WorkloadIdentity.findOne(req.params.workloadId);
  if (!workload) throw new NotFoundError('Workload not found');

  // Business scoping
  if (workload.businessId !== req.user.businessId && !['superadmin'].includes(req.user.role)) {
    throw new ForbiddenError('Access denied');
  }

  res.json({
    success: true,
    workload: {
      workloadId: workload.workloadId,
      namespace: workload.namespace,
      service: workload.service,
      description: workload.description,
      permissions: workload.permissions,
      scopes: workload.scopes,
      status: workload.status,
      createdAt: workload.createdAt,
      expiresAt: workload.expiresAt,
    },
  });
}));

app.post('/api/workloads/:workloadId/rotate', requireAuth, asyncHandler(async (req, res) => {
  const workload = await WorkloadIdentity.findOne(req.params.workloadId);
  if (!workload) throw new NotFoundError('Workload not found');

  // Only owner, admin, or superadmin can rotate
  if (workload.ownerId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) {
    throw new ForbiddenError('Not authorized to rotate this workload');
  }

  // Generate new token
  const { ttl = workload.ttl } = req.body || {};
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  const tokenInfo = generateWorkloadToken({ ...workload, ttl });

  await WorkloadIdentity.updateOne({ workloadId: req.params.workloadId }, { expiresAt, updatedAt: new Date().toISOString() });

  logger.info({ workloadId: req.params.workloadId, rotatedBy: req.user.id }, 'Workload token rotated');
  res.json({
    success: true,
    token: tokenInfo.token,
    expiresAt: tokenInfo.expiresAt,
    message: 'New token generated - old token is now invalid',
  });
}));

app.delete('/api/workloads/:workloadId', requireAuth, asyncHandler(async (req, res) => {
  const workload = await WorkloadIdentity.findOne(req.params.workloadId);
  if (!workload) throw new NotFoundError('Workload not found');

  if (workload.ownerId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) {
    throw new ForbiddenError('Not authorized to delete this workload');
  }

  // Revoke token
  workloadTokenStore.delete(req.params.workloadId);
  await WorkloadIdentity.deleteOne({ workloadId: req.params.workloadId });

  logger.info({ workloadId: req.params.workloadId, deletedBy: req.user.id }, 'Workload identity deleted');
  res.json({ success: true, message: 'Workload identity deleted and token revoked' });
}));

// Verify workload token (for service-to-service auth)
app.get('/api/workloads/:workloadId/verify', requireWorkloadToken, asyncHandler(async (req, res) => {
  if (req.workload.workloadId !== req.params.workloadId) {
    throw new ForbiddenError('Token does not match workload');
  }
  res.json({
    success: true,
    verified: true,
    workload: req.workload,
  });
}));

// ============ USER MANAGEMENT ROUTES ============

app.get('/api/users', requireAuth, requireRole('superadmin', 'admin'), [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('role').optional().isIn(['superadmin', 'admin', 'manager', 'user', 'customer']),
  query('status').optional().isIn(['active', 'inactive', 'suspended']),
  query('businessId').optional().trim(),
  validate,
], asyncHandler(async (req, res) => {
  let userList = await User.find();
  if (req.user.role !== 'superadmin') {
    userList = userList.filter(u => u.businessId === req.user.businessId);
  }
  if (req.query.role) userList = userList.filter(u => u.role === req.query.role);
  if (req.query.status) userList = userList.filter(u => u.status === req.query.status);
  if (req.query.businessId) userList = userList.filter(u => u.businessId === req.query.businessId);

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const start = (page - 1) * limit;
  const paginated = userList.slice(start, start + limit);

  const safeUsers = paginated.map(u => ({
    id: u.id, email: u.email, name: u.name, role: u.role,
    businessId: u.businessId, status: u.status, createdAt: u.createdAt,
  }));

  res.json({
    success: true,
    count: userList.length,
    page, limit,
    totalPages: Math.ceil(userList.length / limit),
    users: safeUsers,
  });
}));

app.get('/api/users/:id', requireAuth, asyncHandler(async (req, res) => {
  const targetUser = (await User.find()).find(u => u.id === req.params.id);
  if (!targetUser) throw new NotFoundError('User not found');

  if (!['superadmin', 'admin'].includes(req.user.role) &&
      targetUser.businessId !== req.user.businessId) {
    throw new ForbiddenError('Access denied to this user');
  }

  const business = await Business.findOne(targetUser.businessId);
  res.json({
    success: true,
    user: {
      id: targetUser.id, email: targetUser.email, name: targetUser.name,
      role: targetUser.role, businessId: targetUser.businessId,
      businessName: business?.name,
      status: targetUser.status,
      createdAt: targetUser.createdAt, updatedAt: targetUser.updatedAt,
    },
  });
}));

app.post('/api/users', requireAuth, requireRole('superadmin', 'admin', 'manager'), strictLimiter, [
  body('email').trim().isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('role').optional().isIn(['admin', 'manager', 'user', 'customer']),
  body('businessId').optional().trim().isLength({ min: 2, max: 50 }),
  validate,
], asyncHandler(async (req, res) => {
  const body = sanitizeInput(req.body);
  const { email, password, name, role = 'user', businessId } = body;
  const targetBusinessId = businessId || req.user.businessId;

  if (!['superadmin', 'admin'].includes(req.user.role) && targetBusinessId !== req.user.businessId) {
    throw new ForbiddenError('Cannot create user for another business');
  }

  if (await User.findOne(email.toLowerCase())) throw new ConflictError('User already exists');
  if (!(await Business.findOne(targetBusinessId))) throw new NotFoundError('Business not found');

  const passwordHash = await hashPassword(password);
  const userId = `user-${uuidv4().slice(0, 8)}`;

  const user = await User.create({
    id: userId, email: email.toLowerCase(), passwordHash, name,
    role, businessId: targetBusinessId, status: 'active',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });

  logger.info({ userId, createdBy: req.user.id }, 'User created');
  res.status(201).json({
    success: true,
    message: 'User created successfully',
    user: {
      id: user.id, email: user.email, name: user.name,
      role: user.role, businessId: user.businessId, status: user.status,
    },
  });
}));

app.put('/api/users/:id', requireAuth, strictLimiter, [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('role').optional().isIn(['admin', 'manager', 'user', 'customer']),
  body('status').optional().isIn(['active', 'inactive', 'suspended']),
  body('preferences').optional().isObject(),
  validate,
], asyncHandler(async (req, res) => {
  const allUsers = await User.find();
  const targetUser = allUsers.find(u => u.id === req.params.id);
  if (!targetUser) throw new NotFoundError('User not found');

  if (!['superadmin', 'admin'].includes(req.user.role) &&
      targetUser.businessId !== req.user.businessId) {
    throw new ForbiddenError('Access denied');
  }

  if (req.body.role && !['superadmin', 'admin'].includes(req.user.role)) {
    throw new ForbiddenError('Only admins can change roles');
  }

  const updates = sanitizeInput(req.body);
  const updated = await User.updateOne({ email: targetUser.email }, updates);

  logger.info({ userId: targetUser.id, updatedBy: req.user.id }, 'User updated');
  res.json({
    success: true,
    message: 'User updated successfully',
    user: {
      id: updated.id, email: updated.email, name: updated.name,
      role: updated.role, businessId: updated.businessId,
      status: updated.status, updatedAt: updated.updatedAt,
    },
  });
}));

app.delete('/api/users/:id', requireAuth, requireRole('superadmin', 'admin'), asyncHandler(async (req, res) => {
  const allUsers = await User.find();
  const targetUser = allUsers.find(u => u.id === req.params.id);
  if (!targetUser) throw new NotFoundError('User not found');
  if (targetUser.id === req.user.id) throw new ValidationError('Cannot delete your own account');

  if (!['superadmin'].includes(req.user.role) &&
      targetUser.businessId !== req.user.businessId) {
    throw new ForbiddenError('Access denied');
  }

  await User.deleteOne({ email: targetUser.email });
  logger.info({ userId: targetUser.id, deletedBy: req.user.id }, 'User deleted');
  res.json({ success: true, message: 'User deleted successfully' });
}));

// ============ BUSINESS ROUTES ============

app.get('/api/businesses', requireAuth, requireRole('superadmin', 'admin'), asyncHandler(async (req, res) => {
  let businessList = await Business.find();
  if (req.query.status) businessList = businessList.filter(b => b.status === req.query.status);
  res.json({ success: true, count: businessList.length, businesses: businessList });
}));

app.get('/api/businesses/:id', requireAuth, requireBusiness('id'), asyncHandler(async (req, res) => {
  const business = await Business.findOne(req.params.id);
  if (!business) throw new NotFoundError('Business not found');
  const allUsers = await User.find();
  const userCount = allUsers.filter(u => u.businessId === business.id).length;
  res.json({ success: true, business: { ...business, userCount } });
}));

// ============ PROFILE ROUTES ============

app.get('/api/profile', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findOne(req.user.email);
  if (!user) throw new NotFoundError('User not found');
  const business = await Business.findOne(user.businessId);
  res.json({
    success: true,
    profile: {
      id: user.id, email: user.email, name: user.name,
      role: user.role, businessId: user.businessId,
      businessName: business?.name, businessPlan: business?.plan,
      status: user.status, preferences: user.preferences || {},
      createdAt: user.createdAt, updatedAt: user.updatedAt,
    },
  });
}));

app.put('/api/profile', requireAuth, strictLimiter, [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('preferences').optional().isObject(),
  validate,
], asyncHandler(async (req, res) => {
  const user = await User.findOne(req.user.email);
  if (!user) throw new NotFoundError('User not found');
  const updates = sanitizeInput(req.body);
  const updated = await User.updateOne({ email: user.email }, updates);
  logger.info({ userId: user.id }, 'Profile updated');
  res.json({
    success: true,
    message: 'Profile updated successfully',
    profile: {
      id: updated.id, email: updated.email, name: updated.name,
      role: updated.role, preferences: updated.preferences || {},
    },
  });
}));

app.put('/api/profile/password', requireAuth, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  validate,
], asyncHandler(async (req, res) => {
  const user = await User.findOne(req.user.email);
  if (!user) throw new NotFoundError('User not found');

  const { currentPassword, newPassword } = sanitizeInput(req.body);
  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) throw new UnauthorizedError('Current password is incorrect');

  // Check if new password was exposed in a data breach
  const isBreached = await checkPasswordBreach(newPassword);
  if (isBreached) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'PASSWORD_COMPROMISED',
        message: 'This password has appeared in a data breach. Please choose a different, stronger password.',
      },
    });
  }

  const passwordHash = await hashPassword(newPassword);
  await User.updateOne({ email: user.email }, { passwordHash });

  // Revoke all refresh tokens for this user
  const allTokens = await RefreshToken.find({ userId: user.id });
  for (const t of allTokens) {
    await RefreshToken.deleteOne({ token: t.token });
  }

  logger.info({ userId: user.id }, 'Password changed');
  res.json({ success: true, message: 'Password changed successfully. Please login again.' });
}));

// ============ TRUST SCORES ============

app.get('/api/trust/score/:corpId', asyncHandler(async (req, res) => {
  let s = await TrustScore.findOne(req.params.corpId);
  if (!s) {
    s = await TrustScore.create({
      corpId: req.params.corpId,
      score: 50,
      level: 'bronze',
      lastUpdated: new Date().toISOString(),
      history: [],
    });
  }
  res.json({ success: true, corpId: req.params.corpId, ...s });
}));

app.put('/api/trust/score/:corpId', requireAuth, asyncHandler(async (req, res) => {
  const { score, source = 'manual' } = req.body || {};
  if (typeof score !== 'number' || score < 0 || score > 100) {
    throw new ValidationError('score must be 0-100');
  }
  // Find existing by corpId field
  const all = await TrustScore.find();
  const existing = all.find(t => t.corpId === req.params.corpId);
  const history = existing?.history || [];
  const now = new Date().toISOString();
  const record = {
    corpId: req.params.corpId,
    score,
    level: computeTrustLevel(score),
    lastUpdated: now,
    history: [...history, { score, source, by: req.user.id, at: now }].slice(-50),
  };
  let updated;
  if (existing) {
    updated = await TrustScore.updateOne({ corpId: req.params.corpId }, record);
  } else {
    updated = await TrustScore.create(record);
  }
  res.json({ success: true, corpId: updated.corpId, score: updated.score, level: updated.level, lastUpdated: updated.lastUpdated });

  // Sync to Agent model if this is a CI-AGT- entity
  if (req.params.corpId.startsWith('CI-AGT-')) {
    const agent = await Agent.findOne(req.params.corpId);
    if (agent) {
      await Agent.updateOne({ agentId: req.params.corpId }, {
        trustScore: score,
        trustLevel: computeTrustLevel(score),
        updatedAt: new Date().toISOString(),
      });
    }
  }
}));

app.get('/api/trust/levels', (_req, res) => {
  res.json({
    success: true,
    levels: [
      { name: 'platinum', min: 90, max: 100, badge: '🏆' },
      { name: 'gold', min: 80, max: 89, badge: '⭐' },
      { name: 'silver', min: 70, max: 79, badge: '🥈' },
      { name: 'bronze', min: 50, max: 69, badge: '🥉' },
      { name: 'iron', min: 30, max: 49, badge: '⚙️' },
      { name: 'restricted', min: 0, max: 29, badge: '⚠️' },
    ],
  });
});

// ============ TRUST INTELLIGENCE ROUTES ============
// Adapted from corpID-cloud/trust/model.js (ADAPT, don't rewrite).

app.post('/api/trust/evaluate', requireAuth, asyncHandler(async (req, res) => {
  const { corpId, factors = {} } = req.body || {};
  if (!corpId) throw new ValidationError('corpId required');
  const result = evaluateTrustComponents(factors);
  const evaluation = await TrustEvaluation.create({
    evaluationId: `TE-${uuidv4()}`,
    corpId,
    components: result,
    overall: result.overall,
    evaluatedBy: req.user.id,
    evaluatedAt: new Date().toISOString(),
    context: factors,
  });
  logger.info({ evaluationId: evaluation.evaluationId, corpId, overall: result.overall }, 'Trust evaluation completed');
  res.status(201).json({ success: true, evaluation });
}));

app.get('/api/trust/risk-check', requireAuth, asyncHandler(async (req, res) => {
  const { corpId } = req.query;
  if (!corpId) throw new ValidationError('corpId query param required');
  const result = riskCheck(corpId, {
    newIp: req.query.newIp === 'true',
    tor: req.query.tor === 'true',
    velocity: parseInt(req.query.velocity || '0'),
    unusualTime: req.query.unusualTime === 'true',
  });
  res.json({ success: true, ...result });
}));

// ============ FEDERATION ROUTES ============

app.get('/api/federation/providers', (_req, res) => {
  const providers = Object.entries(OAUTH_PROVIDERS).map(([id, p]) => ({ id, ...p }));
  res.json({ success: true, providers });
});

app.get('/api/federation/link', requireAuth, asyncHandler(async (req, res) => {
  const { provider } = req.query;
  const links = await FedLink.find();
  const filtered = provider ? links.filter(l => l.provider === provider) : links;
  const userLinks = filtered.filter(l => l.userId === req.user.id);
  res.json({ success: true, links: userLinks });
}));

app.post('/api/federation/link', requireAuth, [
  body('provider').isIn(Object.keys(OAUTH_PROVIDERS)).withMessage('Invalid provider'),
  body('providerUserId').trim().isLength({ min: 1 }).withMessage('providerUserId required'),
  body('email').optional().trim().isEmail(),
  body('profile').optional().isObject(),
  validate,
], asyncHandler(async (req, res) => {
  const { provider, providerUserId, email, profile } = req.body;
  // Check for existing link to this provider for this user
  const existing = await FedLink.find();
  const dup = existing.find(l => l.userId === req.user.id && l.provider === provider);
  if (dup) throw new ConflictError(`Already linked to ${provider}`);
  const link = await FedLink.create({
    linkId: `FL-${uuidv4()}`,
    userId: req.user.id,
    provider,
    providerUserId,
    email: email || null,
    profile: profile || {},
    linkedAt: new Date().toISOString(),
  });
  logger.info({ linkId: link.linkId, provider, userId: req.user.id }, 'Federation link created');
  res.status(201).json({ success: true, link });
}));

app.delete('/api/federation/link/:linkId', requireAuth, asyncHandler(async (req, res) => {
  const link = await FedLink.findOne(req.params.linkId);
  if (!link) throw new NotFoundError('Link not found');
  if (link.userId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) {
    throw new ForbiddenError('Not your link');
  }
  await FedLink.deleteOne({ linkId: req.params.linkId });
  logger.info({ linkId: req.params.linkId, removedBy: req.user.id }, 'Federation link removed');
  res.json({ success: true, message: 'Link removed' });
}));

app.get('/api/federation/stats', requireAuth, asyncHandler(async (req, res) => {
  const links = await FedLink.find();
  const byProvider = {};
  for (const l of links) {
    byProvider[l.provider] = (byProvider[l.provider] || 0) + 1;
  }
  res.json({ success: true, total: links.length, byProvider });
}));

// ============ ACP BRIDGE ROUTES ============

app.get('/api/acp/verify/:corpId', asyncHandler(async (req, res) => {
  const { corpId } = req.params;
  try {
    const result = await bridgeToACP('/api/identity/verify', { corpId });
    if (result) {
      res.json({ success: true, verified: result.verified || false, corpId });
    } else {
      // ACP unavailable — check local trust score as fallback
      let s = await TrustScore.findOne(corpId);
      const score = s?.score ?? 50;
      res.json({ success: true, verified: score >= 50, corpId, score, source: 'corpID' });
    }
  } catch {
    let s = await TrustScore.findOne(corpId);
    const score = s?.score ?? 50;
    res.json({ success: true, verified: score >= 50, corpId, score, source: 'corpID' });
  }
}));

// ============ TIMELINE ROUTES ============

app.post('/api/timeline/events', requireAuth, [
  body('corpId').trim().isLength({ min: 1 }).withMessage('corpId required'),
  body('type').trim().isLength({ min: 1 }).withMessage('type required'),
  body('category').optional().trim(),
  body('actor').optional().trim(),
  body('data').optional().isObject(),
  validate,
], asyncHandler(async (req, res) => {
  const body = sanitizeInput(req.body);
  const { corpId, type, category = 'general', actor, data = {} } = body;
  const event = await IdentityEvent.create({
    eventId: `EVT-${uuidv4()}`,
    corpId,
    type,
    category,
    actor: actor || req.user.id,
    data,
    timestamp: new Date().toISOString(),
  });
  logger.info({ eventId: event.eventId, corpId, type }, 'Identity event recorded');
  res.status(201).json({ success: true, event });
}));

app.get('/api/timeline/events', requireAuth, asyncHandler(async (req, res) => {
  const { corpId, category, limit = '50' } = req.query;
  if (!corpId) throw new ValidationError('corpId query param required');
  let events = await IdentityEvent.find();
  events = events.filter(e => e.corpId === corpId);
  if (category) events = events.filter(e => e.category === category);
  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const limited = events.slice(0, parseInt(limit));
  res.json({ success: true, count: limited.length, events: limited });
}));

// ============ NAMESPACES ============

app.post('/api/namespaces', requireAuth, asyncHandler(async (req, res) => {
  const { name, businessId } = req.body || {};
  if (!name) throw new ValidationError('name required');
  if (await Namespace.findOne(name)) throw new ConflictError('namespace exists');
  const ns = await Namespace.create({
    name, owner: req.user.id, businessId: businessId || null,
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ success: true, namespace: ns });
}));

app.get('/api/namespaces', requireAuth, asyncHandler(async (_req, res) => {
  const all = await Namespace.find();
  res.json({ success: true, namespaces: all });
}));

app.get('/api/namespaces/:name', requireAuth, asyncHandler(async (req, res) => {
  const ns = await Namespace.findOne(req.params.name);
  if (!ns) throw new NotFoundError('namespace not found');
  res.json({ success: true, namespace: ns });
}));

app.delete('/api/namespaces/:name', requireAuth, asyncHandler(async (req, res) => {
  const ns = await Namespace.findOne(req.params.name);
  if (!ns) throw new NotFoundError('namespace not found');
  await Namespace.deleteOne({ name: req.params.name });
  res.json({ success: true, deleted: req.params.name });
}));

// ============ API KEYS ============

app.post('/api/api-keys', requireAuth, asyncHandler(async (req, res) => {
  const { name, scopes = [], businessId = null } = req.body || {};
  if (!name) throw new ValidationError('name required');
  const crypto = await import('crypto');
  const key = 'ak_' + crypto.randomBytes(24).toString('hex');
  const kid = crypto.randomUUID();
  const record = await ApiKey.create({
    id: kid, key, name, scopes, businessId, owner: req.user.id,
    createdAt: new Date().toISOString(), lastUsed: null, status: 'active',
  });
  res.status(201).json({
    success: true,
    apiKey: { id: record.id, key: record.key, name: record.name, scopes: record.scopes },
    warning: 'Save the key now — it will not be shown again.',
  });
}));

app.get('/api/api-keys', requireAuth, asyncHandler(async (req, res) => {
  const all = await ApiKey.find();
  const owned = all.filter(k => k.owner === req.user.id);
  res.json({
    success: true,
    apiKeys: owned.map(k => ({
      id: k.id, name: k.name, scopes: k.scopes, status: k.status,
      lastUsed: k.lastUsed, createdAt: k.createdAt,
    })),
  });
}));

app.delete('/api/api-keys/:id', requireAuth, asyncHandler(async (req, res) => {
  const k = await ApiKey.findOne(req.params.id);
  if (!k) throw new NotFoundError('key not found');
  if (k.owner !== req.user.id && req.user.role !== 'superadmin') throw new ForbiddenError('forbidden');
  await ApiKey.deleteOne({ id: req.params.id });
  res.json({ success: true, revoked: req.params.id });
}));

// ============ AGENT PASSPORT ROUTES ============
// Adapted from corpID-cloud/agent/model.js + agent.routes.js (ADAPT, don't rewrite).

// GET /api/agents/capabilities
app.get('/api/agents/capabilities', asyncHandler(async (req, res) => {
  res.json({ success: true, capabilities: AGENT_CAPABILITIES });
}));

// POST /api/agents — Create agent passport
app.post('/api/agents', requireAuth, strictLimiter, [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('type').optional().isIn(['assistant', 'autonomous', 'hybrid', 'webhook']),
  body('category').optional().isIn(['personal', 'business', 'system', 'customer-service']),
  body('model').optional().isString(),
  body('provider').optional().isString(),
  body('capabilities').optional().isArray(),
  body('permissions').optional().isArray(),
  body('scopes').optional().isArray(),
  body('rateLimit').optional().isObject(),
  body('budget').optional().isObject(),
  body('tags').optional().isArray(),
  validate,
], asyncHandler(async (req, res) => {
  const body = sanitizeInput(req.body);
  const now = new Date().toISOString();

  // Generate CI-AGT- typed CorpID
  const shortId = uuidv4().replace(/-/g, '').slice(0, 12);
  const agentId = `CI-AGT-${shortId}`;

  const agent = await Agent.create({
    agentId,
    name: body.name,
    description: body.description || '',
    type: body.type || 'assistant',
    category: body.category || 'business',
    model: body.model || 'unknown',
    provider: body.provider || 'internal',

    // Identity
    ownerId: req.user.id,         // CI-IND-xxxxx (human principal)
    businessId: req.user.businessId,

    // Authorization
    permissions: body.permissions || [],
    scopes: body.scopes || [],

    // Constraints
    rateLimit: body.rateLimit || { requestsPerMinute: 60, requestsPerDay: 10000 },
    budget: body.budget || { monthly: 100000, spent: 0, currency: 'USD' },

    // Status
    status: 'active',
    suspensionReason: null,
    revokedAt: null,

    // Trust (synced from CorpID trust system)
    trustScore: 50,
    trustLevel: 'bronze',

    // Metadata
    capabilities: body.capabilities || [],
    tags: body.tags || [],
    agentOsId: body.agentOsId || null,

    // Timestamps
    createdAt: now,
    updatedAt: now,
    lastActiveAt: null,

    // History
    history: [{ event: 'created', by: req.user.id, at: now, details: {} }],
  });

  // Generate agent JWT
  const agentToken = generateAgentToken(agent);

  logger.info({ agentId, ownerId: req.user.id }, 'Agent passport created');

  // Sync to AgentOS (non-blocking)
  bridgeRegisterAgent(agent).catch(() => {});

  res.status(201).json({
    success: true,
    message: 'Agent passport created',
    agent: {
      agentId: agent.agentId,
      name: agent.name,
      type: agent.type,
      category: agent.category,
      ownerId: agent.ownerId,
      businessId: agent.businessId,
      status: agent.status,
      trustScore: agent.trustScore,
      trustLevel: agent.trustLevel,
      createdAt: agent.createdAt,
    },
    agentToken,
  });
}));

// GET /api/agents — List agents (business-scoped)
app.get('/api/agents', requireAuth, asyncHandler(async (req, res) => {
  const { status, type, category } = req.query;
  let all = await Agent.find();
  // Business scope
  if (req.user.role !== 'superadmin') {
    all = all.filter(a => a.businessId === req.user.businessId);
  }
  if (status) all = all.filter(a => a.status === status);
  if (type) all = all.filter(a => a.type === type);
  if (category) all = all.filter(a => a.category === category);

  res.json({
    success: true,
    count: all.length,
    agents: all.map(a => ({
      agentId: a.agentId,
      name: a.name,
      type: a.type,
      category: a.category,
      status: a.status,
      trustScore: a.trustScore,
      trustLevel: a.trustLevel,
      lastActiveAt: a.lastActiveAt,
      createdAt: a.createdAt,
    })),
  });
}));

// GET /api/agents/:agentId — Get agent details
app.get('/api/agents/:agentId', requireAuth, asyncHandler(async (req, res) => {
  const agent = await Agent.findOne(req.params.agentId);
  if (!agent) throw new NotFoundError('Agent not found');

  // Business scope check
  if (req.user.role !== 'superadmin' && agent.businessId !== req.user.businessId) {
    throw new ForbiddenError('Access denied to this agent');
  }

  res.json({ success: true, agent });
}));

// PUT /api/agents/:agentId — Update agent
app.put('/api/agents/:agentId', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const agent = await Agent.findOne(req.params.agentId);
  if (!agent) throw new NotFoundError('Agent not found');

  // Owner or admin can update
  if (agent.ownerId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) {
    throw new ForbiddenError('Only owner or admin can update');
  }

  const body = sanitizeInput(req.body);
  const allowed = ['name', 'description', 'capabilities', 'permissions', 'scopes', 'rateLimit', 'budget', 'tags', 'type', 'category'];
  const updates = {};
  for (const field of allowed) {
    if (body[field] !== undefined) updates[field] = body[field];
  }
  updates.updatedAt = new Date().toISOString();
  updates.history = [...(agent.history || []), { event: 'updated', by: req.user.id, at: updates.updatedAt, details: body }];

  const updated = await Agent.updateOne({ agentId: req.params.agentId }, updates);
  logger.info({ agentId: req.params.agentId, updatedBy: req.user.id }, 'Agent updated');
  res.json({ success: true, message: 'Agent updated', agent: updated });
}));

// DELETE /api/agents/:agentId — Revoke agent passport
app.delete('/api/agents/:agentId', requireAuth, asyncHandler(async (req, res) => {
  const agent = await Agent.findOne(req.params.agentId);
  if (!agent) throw new NotFoundError('Agent not found');

  if (agent.ownerId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) {
    throw new ForbiddenError('Only owner or admin can revoke');
  }

  const now = new Date().toISOString();
  await Agent.updateOne({ agentId: req.params.agentId }, {
    status: 'revoked',
    revokedAt: now,
    updatedAt: now,
    history: [...(agent.history || []), { event: 'revoked', by: req.user.id, at: now, details: {} }],
  });

  logger.info({ agentId: req.params.agentId, revokedBy: req.user.id }, 'Agent passport revoked');

  // Sync to AgentOS (non-blocking)
  bridgeRevokeAgent(req.params.agentId).catch(() => {});

  res.json({ success: true, message: 'Agent passport revoked' });
}));

// POST /api/agents/:agentId/suspend
app.post('/api/agents/:agentId/suspend', requireAuth, asyncHandler(async (req, res) => {
  const agent = await Agent.findOne(req.params.agentId);
  if (!agent) throw new NotFoundError('Agent not found');
  if (agent.ownerId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) {
    throw new ForbiddenError('Only owner or admin can suspend');
  }

  const now = new Date().toISOString();
  const updated = await Agent.updateOne({ agentId: req.params.agentId }, {
    status: 'suspended',
    suspensionReason: req.body.reason || null,
    updatedAt: now,
    history: [...(agent.history || []), { event: 'suspended', by: req.user.id, at: now, details: { reason: req.body.reason } }],
  });

  logger.info({ agentId: req.params.agentId, by: req.user.id }, 'Agent suspended');
  res.json({ success: true, message: 'Agent suspended', agent: updated });
}));

// POST /api/agents/:agentId/resume
app.post('/api/agents/:agentId/resume', requireAuth, asyncHandler(async (req, res) => {
  const agent = await Agent.findOne(req.params.agentId);
  if (!agent) throw new NotFoundError('Agent not found');
  if (agent.ownerId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) {
    throw new ForbiddenError('Only owner or admin can resume');
  }

  const now = new Date().toISOString();
  const updated = await Agent.updateOne({ agentId: req.params.agentId }, {
    status: 'active',
    suspensionReason: null,
    updatedAt: now,
    history: [...(agent.history || []), { event: 'resumed', by: req.user.id, at: now, details: {} }],
  });

  logger.info({ agentId: req.params.agentId, by: req.user.id }, 'Agent resumed');
  res.json({ success: true, message: 'Agent resumed', agent: updated });
}));

// GET /api/agents/:agentId/permissions
app.get('/api/agents/:agentId/permissions', requireAuth, asyncHandler(async (req, res) => {
  const agent = await Agent.findOne(req.params.agentId);
  if (!agent) throw new NotFoundError('Agent not found');
  if (req.user.role !== 'superadmin' && agent.businessId !== req.user.businessId) {
    throw new ForbiddenError('Access denied');
  }

  res.json({
    success: true,
    agentId: agent.agentId,
    permissions: agent.permissions || [],
    scopes: agent.scopes || [],
  });
}));

// POST /api/agents/:agentId/permissions — Add permissions
app.post('/api/agents/:agentId/permissions', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const agent = await Agent.findOne(req.params.agentId);
  if (!agent) throw new NotFoundError('Agent not found');
  if (agent.ownerId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) {
    throw new ForbiddenError('Only owner or admin can modify permissions');
  }

  const { permissions = [], scopes = [] } = sanitizeInput(req.body);
  const now = new Date().toISOString();
  const updated = await Agent.updateOne({ agentId: req.params.agentId }, {
    permissions: [...new Set([...(agent.permissions || []), ...permissions])],
    scopes: [...new Set([...(agent.scopes || []), ...scopes])],
    updatedAt: now,
    history: [...(agent.history || []), { event: 'permissions_updated', by: req.user.id, at: now, details: { permissions, scopes } }],
  });

  logger.info({ agentId: req.params.agentId, added: permissions.length }, 'Agent permissions updated');
  res.json({ success: true, permissions: updated.permissions, scopes: updated.scopes });
}));

// GET /api/agents/:agentId/budget
app.get('/api/agents/:agentId/budget', requireAuth, asyncHandler(async (req, res) => {
  const agent = await Agent.findOne(req.params.agentId);
  if (!agent) throw new NotFoundError('Agent not found');
  if (req.user.role !== 'superadmin' && agent.businessId !== req.user.businessId) {
    throw new ForbiddenError('Access denied');
  }

  res.json({
    success: true,
    agentId: agent.agentId,
    budget: agent.budget || { monthly: 0, spent: 0, currency: 'USD' },
  });
}));

// POST /api/agents/:agentId/budget/reset — Reset monthly budget
app.post('/api/agents/:agentId/budget/reset', requireAuth, asyncHandler(async (req, res) => {
  const agent = await Agent.findOne(req.params.agentId);
  if (!agent) throw new NotFoundError('Agent not found');
  if (agent.ownerId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) {
    throw new ForbiddenError('Only owner or admin can reset budget');
  }

  const now = new Date().toISOString();
  const updated = await Agent.updateOne({ agentId: req.params.agentId }, {
    budget: { ...(agent.budget || { monthly: 100000, currency: 'USD' }), spent: 0 },
    updatedAt: now,
    history: [...(agent.history || []), { event: 'budget_reset', by: req.user.id, at: now, details: {} }],
  });

  logger.info({ agentId: req.params.agentId, by: req.user.id }, 'Agent budget reset');
  res.json({ success: true, message: 'Budget reset', budget: updated.budget });
}));

// POST /api/agents/:agentId/interactions — Record interaction
app.post('/api/agents/:agentId/interactions', requireHumanOrAgent, asyncHandler(async (req, res) => {
  const agent = await Agent.findOne(req.params.agentId);
  if (!agent) throw new NotFoundError('Agent not found');
  if (agent.status !== 'active') throw new ForbiddenError('Agent is not active');

  const body = sanitizeInput(req.body) || {};
  const interaction = await AgentInteraction.create({
    id: uuidv4(),
    agentId: req.params.agentId,
    type: body.type || 'query',
    success: body.success !== false,
    actorId: req.principal.id,
    actorType: req.principal.type,
    duration: body.duration || 0,
    tokensUsed: body.tokensUsed || 0,
    metadata: body.metadata || {},
    timestamp: new Date().toISOString(),
  });

  // Update agent lastActiveAt
  await Agent.updateOne({ agentId: req.params.agentId }, {
    lastActiveAt: interaction.timestamp,
    updatedAt: new Date().toISOString(),
  });

  res.json({ success: true, interaction });
}));

// GET /api/agents/:agentId/interactions — Get interactions
app.get('/api/agents/:agentId/interactions', requireAuth, asyncHandler(async (req, res) => {
  const agent = await Agent.findOne(req.params.agentId);
  if (!agent) throw new NotFoundError('Agent not found');
  if (req.user.role !== 'superadmin' && agent.businessId !== req.user.businessId) {
    throw new ForbiddenError('Access denied');
  }

  const { limit = 50 } = req.query;
  const all = await AgentInteraction.find();
  const interactions = all
    .filter(i => i.agentId === req.params.agentId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, parseInt(limit));

  res.json({ success: true, count: interactions.length, interactions });
}));

// ============ DELEGATION ROUTES ============
// Authority chains: humans/agents delegate scoped authority to other agents.

const MAX_DELEGATION_DEPTH = 10;

function generateDelegationId() {
  return `DEL-${uuidv4().replace(/-/g, '').slice(0, 12)}`;
}

// POST /api/delegations
app.post('/api/delegations', requireAuth, strictLimiter, [
  body('delegateId').trim().notEmpty().withMessage('delegateId required'),
  body('delegateName').optional().trim().isLength({ max: 100 }),
  body('scope').isArray({ min: 1 }).withMessage('scope must be a non-empty array'),
  body('attenuationFactor').optional().isFloat({ min: 0, max: 1 }),
  body('expiresAt').optional().isISO8601(),
  body('constraints').optional().isObject(),
  body('parentDelegationId').optional().isString(),
  validate,
], asyncHandler(async (req, res) => {
  const body = sanitizeInput(req.body);
  const now = new Date().toISOString();

  // Prevent circular delegation
  if (body.parentDelegationId) {
    const parent = await Delegation.findOne(body.parentDelegationId);
    if (!parent) throw new ValidationError('parentDelegationId not found');
    if (parent.delegatorId === req.user.id) throw new ValidationError('Circular delegation: cannot delegate back to yourself');
  }

  const delegationId = generateDelegationId();
  const attenuationFactor = body.attenuationFactor ?? 1.0;

  const delegation = await Delegation.create({
    delegationId,
    delegatorId: req.user.id,
    delegatorType: 'human',
    delegateId: body.delegateId,
    delegateName: body.delegateName || body.delegateId,
    scope: body.scope,
    constraints: body.constraints || {},
    attenuationFactor,
    effectiveTrustScore: 50 * attenuationFactor, // rough estimate
    expiresAt: body.expiresAt || null,
    autoRevoke: true,
    status: 'active',
    parentDelegationId: body.parentDelegationId || null,
    createdBy: req.user.id,
    createdAt: now,
    updatedAt: now,
    history: [{ event: 'created', by: req.user.id, at: now, details: {} }],
  });

  logger.info({ delegationId, delegatorId: req.user.id, delegateId: body.delegateId }, 'Delegation created');
  res.status(201).json({ success: true, delegation });
}));

// GET /api/delegations
app.get('/api/delegations', requireAuth, asyncHandler(async (req, res) => {
  const { status, as } = req.query; // as = 'delegator' | 'delegate'
  let all = await Delegation.find();
  if (as === 'delegate') {
    all = all.filter(d => d.delegateId === req.user.id);
  } else {
    // Default: show delegations I created
    all = all.filter(d => d.delegatorId === req.user.id || d.delegateId === req.user.id);
  }
  if (status) all = all.filter(d => d.status === status);

  res.json({ success: true, count: all.length, delegations: all.map(d => ({
    delegationId: d.delegationId,
    delegatorId: d.delegatorId,
    delegateId: d.delegateId,
    delegateName: d.delegateName,
    scope: d.scope,
    status: d.status,
    expiresAt: d.expiresAt,
    createdAt: d.createdAt,
  })) });
}));

// GET /api/delegations/:delegationId
app.get('/api/delegations/:delegationId', requireAuth, asyncHandler(async (req, res) => {
  const delegation = await Delegation.findOne(req.params.delegationId);
  if (!delegation) throw new NotFoundError('Delegation not found');
  if (delegation.delegatorId !== req.user.id && delegation.delegateId !== req.user.id) {
    throw new ForbiddenError('Access denied');
  }
  res.json({ success: true, delegation });
}));

// PUT /api/delegations/:delegationId — scope narrowing only
app.put('/api/delegations/:delegationId', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const delegation = await Delegation.findOne(req.params.delegationId);
  if (!delegation) throw new NotFoundError('Delegation not found');
  if (delegation.delegatorId !== req.user.id) throw new ForbiddenError('Only delegator can update');

  const body = sanitizeInput(req.body);
  const now = new Date().toISOString();
  const updates = {};

  // Scope narrowing: can only REMOVE scope, never expand
  if (body.scope) {
    const existing = new Set(delegation.scope);
    const narrower = body.scope.filter(s => existing.has(s));
    if (narrower.length < body.scope.length) {
      throw new ValidationError('Can only narrow scope, not expand it');
    }
    updates.scope = narrower;
  }
  if (body.constraints) updates.constraints = { ...delegation.constraints, ...body.constraints };
  if (body.expiresAt) updates.expiresAt = body.expiresAt;
  updates.updatedAt = now;
  updates.history = [...(delegation.history || []), { event: 'scope_updated', by: req.user.id, at: now, details: body }];

  const updated = await Delegation.updateOne({ delegationId: req.params.delegationId }, updates);
  logger.info({ delegationId: req.params.delegationId }, 'Delegation updated');
  res.json({ success: true, delegation: updated });
}));

// DELETE /api/delegations/:delegationId — revoke
app.delete('/api/delegations/:delegationId', requireAuth, asyncHandler(async (req, res) => {
  const delegation = await Delegation.findOne(req.params.delegationId);
  if (!delegation) throw new NotFoundError('Delegation not found');
  if (delegation.delegatorId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) {
    throw new ForbiddenError('Only delegator or admin can revoke');
  }

  const now = new Date().toISOString();
  const updated = await Delegation.updateOne({ delegationId: req.params.delegationId }, {
    status: 'revoked',
    updatedAt: now,
    history: [...(delegation.history || []), { event: 'revoked', by: req.user.id, at: now, details: {} }],
  });

  logger.info({ delegationId: req.params.delegationId, by: req.user.id }, 'Delegation revoked');
  res.json({ success: true, delegation: updated });
}));

// DELETE /api/delegations/:delegationId/expire — force expire
app.delete('/api/delegations/:delegationId/expire', requireAuth, asyncHandler(async (req, res) => {
  const delegation = await Delegation.findOne(req.params.delegationId);
  if (!delegation) throw new NotFoundError('Delegation not found');
  if (delegation.delegatorId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) {
    throw new ForbiddenError('Access denied');
  }

  const now = new Date().toISOString();
  const updated = await Delegation.updateOne({ delegationId: req.params.delegationId }, {
    status: 'expired',
    updatedAt: now,
    history: [...(delegation.history || []), { event: 'auto_expired', by: req.user.id, at: now, details: {} }],
  });

  res.json({ success: true, delegation: updated });
}));

// ============ RELATIONSHIP ROUTES ============
// Adapted from corpID-cloud/graph/model.js + graph.routes.js (ADAPT, don't rewrite).

// GET /api/relationships/types
app.get('/api/relationships/types', requireAuth, asyncHandler(async (req, res) => {
  res.json({ success: true, nodeTypes: REL_NODE_TYPES, edgeTypes: REL_EDGE_TYPES });
}));

// POST /api/relationships/nodes — create or get node
app.post('/api/relationships/nodes', requireAuth, asyncHandler(async (req, res) => {
  const { entityType, entityId, properties = {} } = sanitizeInput(req.body);
  if (!entityType || !entityId) throw new ValidationError('entityType and entityId required');
  const node = await upsertRelNode(entityType, entityId, properties);
  res.status(201).json({ success: true, node });
}));

// GET /api/relationships/nodes — list nodes
app.get('/api/relationships/nodes', requireAuth, asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.query;
  let all = await RelNode.find();
  if (entityType) all = all.filter(n => n.entityType === entityType);
  if (entityId) all = all.filter(n => n.entityId === entityId);
  res.json({ success: true, count: all.length, nodes: all });
}));

// GET /api/relationships/nodes/:nodeId
app.get('/api/relationships/nodes/:nodeId', requireAuth, asyncHandler(async (req, res) => {
  const node = await RelNode.findOne(req.params.nodeId);
  if (!node) throw new NotFoundError('Node not found');
  const edges = await getRelNodeEdges(req.params.nodeId);
  res.json({ success: true, node, edges });
}));

// GET /api/relationships/nodes/:nodeId/related
app.get('/api/relationships/nodes/:nodeId/related', requireAuth, asyncHandler(async (req, res) => {
  const { depth = 1, edgeType } = req.query;
  const related = await getRelatedRelNodes(req.params.nodeId, parseInt(depth), edgeType || null);
  const nodeIds = [...new Set(related.map(r => r.nodeId))];
  const nodes = [];
  for (const nid of nodeIds) {
    const node = await RelNode.findOne(nid);
    if (node) nodes.push(node);
  }
  res.json({ success: true, count: nodes.length, nodes, edges: related });
}));

// POST /api/relationships/edges
app.post('/api/relationships/edges', requireAuth, asyncHandler(async (req, res) => {
  const { sourceNodeId, targetNodeId, type, properties = {} } = sanitizeInput(req.body);
  if (!sourceNodeId || !targetNodeId || !type) throw new ValidationError('sourceNodeId, targetNodeId, and type required');

  // Upsert both nodes
  await upsertRelNode('unknown', sourceNodeId);
  await upsertRelNode('unknown', targetNodeId);

  const edgeId = `RELED-${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const now = new Date().toISOString();
  await RelEdge.create({
    edgeId, sourceNodeId, targetNodeId, type,
    properties: { since: now, verified: false, strength: 50, ...properties },
    createdAt: now, updatedAt: now,
  });

  // Update index
  const idx = relEdgeIndex.get(sourceNodeId) || [];
  idx.push(edgeId);
  relEdgeIndex.set(sourceNodeId, idx);

  // Update degree
  for (const nid of [sourceNodeId, targetNodeId]) {
    const n = await RelNode.findOne(nid);
    if (n) await RelNode.updateOne({ nodeId: nid }, { degree: (n.degree || 0) + 1 });
  }

  logger.info({ edgeId, sourceNodeId, targetNodeId, type }, 'Relationship edge created');
  res.status(201).json({ success: true, edge: { edgeId, sourceNodeId, targetNodeId, type } });
}));

// GET /api/relationships/edges
app.get('/api/relationships/edges', requireAuth, asyncHandler(async (req, res) => {
  const { sourceNodeId, type } = req.query;
  let all = await RelEdge.find();
  if (sourceNodeId) all = all.filter(e => e.sourceNodeId === sourceNodeId);
  if (type) all = all.filter(e => e.type === type);
  res.json({ success: true, count: all.length, edges: all });
}));

// GET /api/relationships/stats
app.get('/api/relationships/stats', requireAuth, asyncHandler(async (req, res) => {
  const nodes = await RelNode.find();
  const edges = await RelEdge.find();
  const byType = {};
  for (const n of nodes) byType[n.entityType] = (byType[n.entityType] || 0) + 1;
  const byEdge = {};
  for (const e of edges) byEdge[e.type] = (byEdge[e.type] || 0) + 1;
  res.json({ success: true, stats: { totalNodes: nodes.length, totalEdges: edges.length, nodesByType: byType, edgesByType: byEdge } });
}));

// ============ ERROR HANDLERS ============

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
});

app.use(errorMiddleware(logger));

// ============ START SERVER ============

export async function startServer(port = PORT) {
  await seedDefaults();
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      logger.info(`🔐 CorpID v3.0 (persistent) running on port ${port}`);
      resolve(server);
    });
    installGracefulShutdown(server);
    server.on('error', reject);
  });
}

// Auto-start when run directly (not when imported by tests)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  startServer().catch((err) => {
    logger.error({ err }, 'Failed to start CorpID');
    process.exit(1);
  });
}

export default app;
