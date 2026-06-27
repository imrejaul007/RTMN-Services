/**
 * SUTAR Decision Engine - Policy and Authorization
 * Port: 4240
 *
 * Makes decisions based on:
 * - Policy compliance validation
 * - Risk assessment
 * - Authorization checks
 * - Trust score verification
 * - Multi-factor scoring
 * - Approval workflows
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

import decisionRoutes from './routes/decisions.js';
import policyRoutes from './routes/policies.js';
import { createStorage } from './storage.js';
import crypto from 'crypto';

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
const PORT = process.env.PORT || 4240;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// Storage (Redis with in-memory fallback). Wrapped so that if Redis is not
// available the service still starts and serves traffic.
const redis = createStorage(process.env.REDIS_URL || 'redis://localhost:6379');

// Decision outcomes
const DECISION = {
  PROCEED: 'proceed',
  HOLD: 'hold',
  REJECT: 'reject',
  ESCALATE: 'escalate'
};

// Risk levels
const RISK = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      duration: Date.now() - start,
      status: res.statusCode
    });
  });
  next();
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    res.json({
      status: 'healthy',
      service: 'decision-engine',
      version: '2.0.0',
      port: PORT,
      storage: redis.status(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Routes
app.use('/api/decisions', decisionRoutes);
app.use('/api/policies', policyRoutes);

// =========================================================================
// /api/policies/evaluate
//
// Called by flow-orchestrator's policy.check step (and other services).
// Body: { policyId, context }
// Returns: { allowed, reasons, suggestions, policyUsed, evaluatedAt, matchedRule }
// =========================================================================
app.post('/api/policies/evaluate',requireAuth,  async (req, res) => {
  try {
    const { policyId, context = {} } = req.body || {};
    const targetPolicyId = policyId || 'default-allow';
    const evaluatedAt = new Date().toISOString();

    // Built-in policies used when none exist in storage
    const BUILTIN = {
      'default-allow': {
        id: 'default-allow',
        name: 'Default Allow',
        action: '*',
        maxAmount: 1000000,
        businessHours: { start: 0, end: 24 },
        allowedCategories: ['*'],
        riskThreshold: 80,
        description: 'Allow any action under default thresholds'
      },
      'default': {
        id: 'default',
        name: 'Default Allow',
        action: '*',
        maxAmount: 1000000,
        businessHours: { start: 0, end: 24 },
        allowedCategories: ['*'],
        riskThreshold: 80,
        description: 'Allow any action under default thresholds'
      },
      'strict': {
        id: 'strict',
        name: 'Strict Policy',
        action: '*',
        maxAmount: 5000,
        businessHours: { start: 8, end: 20 },
        allowedCategories: ['standard', 'low-risk'],
        riskThreshold: 30,
        description: 'Low caps, business hours only, narrow categories'
      },
      'sutar-safety': {
        id: 'sutar-safety',
        name: 'SUTAR Safety',
        action: '*',
        maxAmount: 50000,
        businessHours: { start: 0, end: 24 },
        allowedCategories: ['*'],
        riskThreshold: 70,
        description: 'Operational safety net'
      }
    };

    let policy = BUILTIN[targetPolicyId];
    if (!policy) {
      const raw = await redis.get(`policy:${targetPolicyId}`);
      if (!raw) {
        // Unknown policy → fail-open with reasons
        return res.json({
          allowed: true,
          reasons: [`Unknown policyId '${targetPolicyId}' — failing open`],
          suggestions: ['Register the policy via POST /api/policies before evaluating'],
          policyUsed: targetPolicyId,
          evaluatedAt,
          matchedRule: 'unknown-fail-open'
        });
      }
      policy = JSON.parse(raw);
    }

    const reasons = [];
    const suggestions = [];
    let matchedRule = null;

    // 1) Action match
    if (policy.action && policy.action !== '*' && context.action && policy.action !== context.action) {
      reasons.push(`Action '${context.action}' is not covered by policy '${policy.name}'`);
      suggestions.push(`Use a policy that targets action '${context.action}'`);
    }

    // 2) Max amount
    const amount = Number(context.amount || 0);
    if (policy.maxAmount != null && amount > policy.maxAmount) {
      reasons.push(`Amount ${amount} exceeds policy maxAmount ${policy.maxAmount}`);
      suggestions.push(`Reduce amount to <= ${policy.maxAmount}`);
      suggestions.push(`Or use a higher-tier policy (e.g. 'executive')`);
      matchedRule = 'max-amount';
    }

    // 3) Business hours (only if timestamp provided)
    if (policy.businessHours && context.timestamp) {
      const hour = new Date(context.timestamp).getUTCHours();
      const { start = 0, end = 24 } = policy.businessHours;
      if (hour < start || hour >= end) {
        reasons.push(`Outside business hours (${start}-${end} UTC)`);
        suggestions.push(`Schedule action during business hours or use emergency policy`);
        matchedRule = matchedRule || 'business-hours';
      }
    }

    // 4) Category allow-list
    if (policy.allowedCategories && context.category) {
      const cats = policy.allowedCategories;
      if (!cats.includes('*') && !cats.includes(context.category)) {
        reasons.push(`Category '${context.category}' not in allowed list`);
        suggestions.push(`Use category from: ${cats.join(', ')}`);
        matchedRule = matchedRule || 'category';
      }
    }

    // 5) Risk threshold
    const risk = Number(context.risk || 0);
    if (policy.riskThreshold != null && risk > policy.riskThreshold) {
      reasons.push(`Risk ${risk} exceeds threshold ${policy.riskThreshold}`);
      suggestions.push(`Lower risk or escalate`);
      matchedRule = matchedRule || 'risk-threshold';
    }

    // 6) Trust minimum
    if (policy.minTrust != null) {
      const trust = Number(context.trustScore || context.trust || 0);
      if (trust < policy.minTrust) {
        reasons.push(`Trust ${trust} below required ${policy.minTrust}`);
        suggestions.push(`Improve trust score before retrying`);
        matchedRule = matchedRule || 'min-trust';
      }
    }

    const allowed = reasons.length === 0;

    const result = {
      allowed,
      reasons,
      suggestions,
      policyUsed: policy.id || targetPolicyId,
      evaluatedAt,
      matchedRule
    };

    // Audit every evaluation
    await redis.lpush('audit:log', JSON.stringify({
      kind: 'policy.evaluate',
      policyId: targetPolicyId,
      context,
      result,
      at: evaluatedAt
    }));
    await redis.ltrim('audit:log', 0, 999);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// Approval Engine — in-memory multi-strategy workflow
//
// Strategies:
//   - single      : one approver, simple majority
//   - multi       : M-of-N approvers
//   - sequential  : approvers must approve in order
//   - parallel    : all approvers must approve (order irrelevant)
//   - emergency   : any single approver can approve (fast path)
// =========================================================================

// Track previous decisions per entity (used by multi-factor scoring & audit)
const previousDecisions = new PersistentMap('previous-decisions', { serviceName: 'decision-engine' }); // entityKey -> count

function evaluateApprovalStatus(approval) {
  const approverIds = approval.approvers.map(a => a.id);
  const approvals = approval.approvers.filter(a => a.decision === 'approve').length;
  const rejections = approval.approvers.filter(a => a.decision === 'reject').length;

  // Emergency: any single approve completes the chain
  if (approval.strategy === 'emergency' && approvals >= 1) {
    return 'approved';
  }
  if (rejections >= 1 && approval.strategy !== 'multi') {
    return 'rejected';
  }

  switch (approval.strategy) {
    case 'single':
      return approvals >= 1 ? 'approved' : (rejections >= 1 ? 'rejected' : 'pending');
    case 'multi': {
      const required = approval.threshold || Math.ceil(approverIds.length / 2);
      if (approvals >= required) return 'approved';
      if (rejections > approverIds.length - required) return 'rejected';
      return 'pending';
    }
    case 'parallel':
      return approvals === approverIds.length ? 'approved'
        : (rejections > 0 ? 'rejected' : 'pending');
    case 'sequential': {
      // Walk the approver list in order; first rejection or all approvals complete it
      for (const a of approval.approvers) {
        if (a.decision === 'reject') return 'rejected';
        if (a.decision == null) return 'pending';
      }
      return 'approved';
    }
    default:
      return 'pending';
  }
}

// Create approval
app.post('/api/approvals',requireAuth,  async (req, res) => {
  try {
    const {
      policyId,
      requesterId,
      resource,
      amount,
      strategy = 'single',
      approvers = [],
      threshold,
      metadata = {}
    } = req.body || {};

    if (!requesterId) {
      return res.status(400).json({ error: 'requesterId is required' });
    }
    if (!Array.isArray(approvers) || approvers.length === 0) {
      return res.status(400).json({ error: 'approvers[] is required and must be non-empty' });
    }
    const validStrategies = ['single', 'multi', 'sequential', 'parallel', 'emergency'];
    if (!validStrategies.includes(strategy)) {
      return res.status(400).json({ error: `strategy must be one of ${validStrategies.join(',')}` });
    }

    const id = `apr_${uuidv4()}`;
    const now = new Date().toISOString();
    const approval = {
      id,
      policyId: policyId || null,
      requesterId,
      resource: resource || null,
      amount: amount != null ? Number(amount) : null,
      strategy,
      threshold: threshold || null,
      approvers: approvers.map((a, idx) => ({
        id: a.id || a.approverId || `approver_${idx}`,
        name: a.name || null,
        decision: null,
        comment: null,
        decidedAt: null,
        order: typeof a.order === 'number' ? a.order : idx
      })),
      status: 'pending',
      timeline: [{ event: 'created', at: now, by: requesterId }],
      metadata,
      createdAt: now,
      updatedAt: now
    };

    // sequential: ensure approvers sorted by order
    if (strategy === 'sequential') {
      approval.approvers.sort((a, b) => a.order - b.order);
    }

    await redis.set(`approval:${id}`, JSON.stringify(approval));
    await redis.lpush('approvals:all', id);
    await redis.ltrim('approvals:all', 0, 999);
    if (requesterId) {
      await redis.lpush(`approvals:requester:${requesterId}`, id);
      await redis.ltrim(`approvals:requester:${requesterId}`, 0, 99);
    }

    await redis.lpush('audit:log', JSON.stringify({
      kind: 'approval.create',
      approvalId: id,
      requesterId,
      strategy,
      at: now
    }));
    await redis.ltrim('audit:log', 0, 999);

    res.status(201).json(approval);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Decide on an approval
app.post('/api/approvals/:id/decide',requireAuth,  async (req, res) => {
  try {
    const { id } = req.params;
    const { approverId, decision, comment } = req.body || {};

    if (!approverId || !['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ error: "approverId and decision ('approve'|'reject') required" });
    }

    const raw = await redis.get(`approval:${id}`);
    if (!raw) return res.status(404).json({ error: 'Approval not found' });

    const approval = JSON.parse(raw);

    // Find the approver slot
    let slot = approval.approvers.find(a => a.id === approverId);
    if (!slot) {
      // Allow free-form approver id for emergency/parallel flows
      slot = { id: approverId, name: null, decision: null, comment: null, decidedAt: null, order: approval.approvers.length };
      approval.approvers.push(slot);
    }
    // Sequential: enforce order — only the next pending approver may decide
    if (approval.strategy === 'sequential') {
      const next = approval.approvers.find(a => a.decision == null);
      if (next && next.id !== approverId) {
        return res.status(409).json({
          error: 'Out of order',
          message: `Next approver is '${next.id}', not '${approverId}'`
        });
      }
    }

    slot.decision = decision;
    slot.comment = comment || null;
    slot.decidedAt = new Date().toISOString();

    approval.status = evaluateApprovalStatus(approval);
    approval.updatedAt = new Date().toISOString();
    approval.timeline.push({
      event: decision,
      at: slot.decidedAt,
      by: approverId,
      comment: comment || null
    });
    if (approval.status !== 'pending') {
      approval.timeline.push({ event: `status:${approval.status}`, at: approval.updatedAt });
    }

    await redis.set(`approval:${id}`, JSON.stringify(approval));

    await redis.lpush('audit:log', JSON.stringify({
      kind: 'approval.decide',
      approvalId: id,
      approverId,
      decision,
      status: approval.status,
      at: approval.updatedAt
    }));
    await redis.ltrim('audit:log', 0, 999);

    res.json(approval);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get approval status
app.get('/api/approvals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const raw = await redis.get(`approval:${id}`);
    if (!raw) return res.status(404).json({ error: 'Approval not found' });
    const approval = JSON.parse(raw);
    // Re-evaluate in case state changed externally
    approval.status = evaluateApprovalStatus(approval);
    res.json(approval);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List approvals (filter by status)
app.get('/api/approvals', async (req, res) => {
  try {
    const { status, requesterId, limit = 50 } = req.query;
    let ids;
    if (requesterId) {
      ids = await redis.lrange(`approvals:requester:${requesterId}`, 0, parseInt(limit, 10) - 1);
    } else {
      ids = await redis.lrange('approvals:all', 0, parseInt(limit, 10) - 1);
    }
    const items = [];
    for (const aid of ids) {
      const raw = await redis.get(`approval:${aid}`);
      if (!raw) continue;
      const a = JSON.parse(raw);
      a.status = evaluateApprovalStatus(a);
      if (!status || a.status === status) items.push(a);
    }
    res.json({ approvals: items, total: items.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// Audit endpoints
// =========================================================================

app.get('/api/audit', async (req, res) => {
  try {
    const { entity, policy, decision, kind, limit = 100 } = req.query;
    const rawIds = await redis.lrange('audit:log', 0, parseInt(limit, 10) * 4 - 1);
    const events = [];
    for (const raw of rawIds) {
      try {
        const e = JSON.parse(raw);
        if (entity && e.entity !== entity && e.corpId !== entity && e.requesterId !== entity) continue;
        if (policy && e.policyId !== policy) continue;
        if (decision && e.result && e.result.allowed !== (decision === 'allowed')) continue;
        if (kind && e.kind !== kind) continue;
        events.push(e);
        if (events.length >= parseInt(limit, 10)) break;
      } catch (_) { /* skip malformed */ }
    }
    res.json({ events, total: events.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/audit/export',requireAuth,  async (req, res) => {
  try {
    const rawIds = await redis.lrange('audit:log', 0, 9999);
    const events = [];
    for (const raw of rawIds) {
      try { events.push(JSON.parse(raw)); } catch (_) { /* skip */ }
    }
    const exportPayload = {
      service: 'decision-engine',
      exportedAt: new Date().toISOString(),
      count: events.length,
      events
    };
    res.json(exportPayload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Expose helpers for decision routes
app.locals.previousDecisions = previousDecisions;
app.locals.evaluateApprovalStatus = evaluateApprovalStatus;
app.locals.DECISION = DECISION;
app.locals.RISK = RISK;

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server

// ============= AUTH + DATABASE =============
const authBusinesses = new PersistentMap('auth-businesses', { serviceName: 'decision-engine' });
const authUsers = new PersistentMap('auth-users', { serviceName: 'decision-engine' });
const authSessions = new PersistentMap('auth-sessions', { serviceName: 'decision-engine' });

let mongoose = null;
let dbConnected = false;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const SERVICE_NAME = process.env.SERVICE_NAME || 'service';

async function initDatabase() {
  if (!MONGODB_URI) {
    console.log('⚠️  MONGODB_URI not set. Running in demo mode (in-memory).');
    return;
  }
  try {
    mongoose = (await import('mongoose')).default;
    await mongoose.connect(MONGODB_URI);
    dbConnected = true;
    console.log('✅ MongoDB connected for', SERVICE_NAME);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
  }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

app.post('/auth/register', requireInternal, (req, res) => {
  const { businessId, email, password, role, businessName } = req.body;
  if (!email || !password || !businessId) {
    return res.status(400).json({ error: 'businessId, email, password required' });
  }
  if (authUsers.has(email)) {
    return res.status(409).json({ error: 'User already exists' });
  }
  const user = {
    id: 'user_' + Date.now(),
    businessId,
    email,
    passwordHash: hashPassword(password),
    role: role || 'owner',
    name: businessName || email.split('@')[0],
    createdAt: new Date().toISOString()
  };
  authUsers.set(email, user);
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.post('/auth/login', requireInternal, (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.get('/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  res.json({ valid: true, ...session });
});

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  req.session = session;
  next();
}

// ============= END AUTH + DATABASE =============

// Initialize database connection
initDatabase().then(() => {
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


  const server = app.listen(PORT, () => {
    logger.info(`Decision Engine running on port ${PORT} (storage: ${redis.status().mode})`);
  });
  installGracefulShutdown(server);
});

export { app, redis, DECISION, RISK };