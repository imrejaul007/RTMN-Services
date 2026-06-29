/**
 * PolicyOS — Main Entry Point
 *
 * Port: 4254
 * Version: 1.3.1
 *
 * Universal governance, trust, authorization, compliance, and decision policy platform.
 * The endpoint flow-orchestrator calls is POST /api/policies/evaluate.
 *
 * DESIGN PRINCIPLES:
 *   1. Fail-closed — evaluation MUST deny by default
 *   2. Time-bound — policies have effective windows
 *   3. Explicit composition — anyOf / allOf / majority over sub-policies
 *   4. Zero prototype pollution — safe expression evaluator (no eval/Function)
 *   5. Audit everything — every decision is logged, exportable
 *   6. RBAC + ABAC — role-based AND attribute-based access control
 *
 * ARCHITECTURE:
 *   src/
 *   ├── index.js              ← You are here (app wiring + boot)
 *   ├── expression-evaluator.js ← Safe AST-based expression parser (no eval)
 *   ├── services/
 *   │   └── events.js         ← EventBus singleton (Redis pub/sub)
 *   ├── middleware/
 *   │   └── auth.js           ← HS256 JWT + service token + API key auth
 *   ├── routes/
 *   │   ├── policies.js       ← Policy CRUD + lifecycle + evaluation
 *   │   ├── rbac.js           ← Roles, RBAC checks, ABAC checks
 *   │   ├── apikeys.js        ← API key + token issuance
 *   │   ├── approvals.js       ← Multi-step approval workflows
 *   │   ├── webhooks.js       ← Real-time event webhooks
 *   │   └── analytics.js      ← Analytics + audit log routes
 *   └── lib/
 *       ├── validation.js      ← Policy schema validator
 *       └── evaluation.js      ← Core evaluation engine (pure functions)
 */

import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { PersistentStore } from '../../../../shared/lib/persistent-store.js';
import { resolveEncryptionKey } from './services/key-manager.js';
import { createCustomAuth, createServiceToken } from './middleware/auth.js';
import { registerPolicyRoutes } from './routes/policies.js';
import { registerRbacRoutes } from './routes/rbac.js';
import { registerApiKeyRoutes } from './routes/apikeys.js';
import { registerApprovalRoutes } from './routes/approvals.js';
import { registerWebhookRoutes } from './routes/webhooks.js';
import { registerAnalyticsRoutes, registerAuditRoutes } from './routes/analytics.js';
import { registerAttributeRoutes } from './routes/attributes.js';
import { registerConditionTemplateRoutes } from './routes/condition-templates.js';
import { registerAttributePolicyRoutes } from './routes/attribute-policies.js';
import { registerNLAuthoringRoutes } from './routes/nl-authoring.js';
import { registerNLExplanationRoutes } from './routes/nl-explanation.js';
import { registerReBACRoutes } from './routes/rebac.js';
import { registerAIGovernanceRoutes } from './routes/ai-governance.js';
import { registerAgentTrustRoutes } from './routes/agent-trust.js';
import { registerMemoryGovernanceRoutes } from './routes/memory-governance.js';
import { registerTwinGovernanceRoutes } from './routes/twin-governance.js';
import { registerConstitutionalAIRoutes } from './routes/constitutional-ai.js';
import { registerLifecycleAutomationRoutes } from './routes/lifecycle-automation.js';
import { registerDeveloperExperienceRoutes } from './routes/developer-experience.js';
import { registerGitOpsRoutes } from './routes/gitops.js';
import { registerFormalVerificationRoutes } from './routes/formal-verification.js';
import { registerCacheRoutes } from './routes/cache.js';
import { registerMonitoringRoutes } from './routes/monitoring.js';
import { registerIncidentResponseRoutes } from './routes/incident-response.js';
import { warmCache } from './services/cache.js';
import { validatePolicyBody, CATEGORIES, POLICY_STATUSES } from './lib/validation.js';
import { prototypePollutionMiddleware, sanitizePolicyId, sanitizeExpression, sanitizeName, validateWebhookUrl } from './lib/sanitization.js';
import {
  evaluatePolicy,
  applyExceptions,
  findPolicy,
  evaluateComposition,
} from './lib/evaluation.js';

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

const PORT = parseInt(process.env.PORT || '4254', 10);
const SERVICE_NAME = 'policy-os';
const SERVICE_VERSION = '1.3.1';
const REQUIRE_AUTH = (process.env.POLICYOS_REQUIRE_AUTH || 'true') !== 'false';
const AUDIT_MAX = parseInt(process.env.POLICYOS_AUDIT_MAX || '10000', 10);
const CORS_ORIGIN = process.env.POLICYOS_CORS_ORIGIN || null;

// SECURITY FIX (Phase 6): Generate cryptographically random service token.
// Never log it to console. Stored only in env var.
const SERVICE_TOKEN = process.env.POLICYOS_SERVICE_TOKEN || createServiceToken();

// Rate limit env overrides
const EVAL_LIMIT = parseInt(process.env.POLICYOS_EVAL_LIMIT || '20', 10);
const WRITE_LIMIT = parseInt(process.env.POLICYOS_WRITE_LIMIT || '20', 10);

// =================================================================
// Persistent Stores (file-backed JSON, survive restarts)
// Phase 0.2: Sensitive stores use AES-256-GCM at-rest encryption
// =================================================================

const encryption = resolveEncryptionKey();

const BASE_OPTS = { serviceName: SERVICE_NAME, encryptionKey: encryption.key };

const policies = new PersistentStore('policies', BASE_OPTS);
const roles = new PersistentStore('roles', BASE_OPTS);
const userRoles = new PersistentStore('user-roles', BASE_OPTS);
const approvals = new PersistentStore('approvals', { ...BASE_OPTS, encryptFields: ['metadata'] });
const policyChanges = new PersistentStore('policy-changes', BASE_OPTS);
const users = new PersistentStore('users', { ...BASE_OPTS, encryptFields: ['password', 'passwordHash'] });
const apiKeys = new PersistentStore('api-keys', { ...BASE_OPTS, encryptFields: ['key'] });
const webhooks = new PersistentStore('webhooks', { ...BASE_OPTS, encryptFields: ['secret'] });
const webhookDeliveries = new PersistentStore('webhook-deliveries', BASE_OPTS);
const evalMetrics = new PersistentStore('eval-metrics', BASE_OPTS);

// Phase 2–10 persistent stores (data now survives restarts)
const relationships = new PersistentStore('relationships', BASE_OPTS);
const conditionTemplates = new PersistentStore('condition-templates', BASE_OPTS);
const attributePolicies = new PersistentStore('attribute-policies', BASE_OPTS);
const aiModels = new PersistentStore('ai-models', BASE_OPTS);
const constitutions = new PersistentStore('constitutions', BASE_OPTS);
const agentRegistry = new PersistentStore('agent-registry', BASE_OPTS);
const memoryPolicies = new PersistentStore('memory-policies', BASE_OPTS);
const twinPolicies = new PersistentStore('twin-policies', BASE_OPTS);
const automations = new PersistentStore('automations', BASE_OPTS);
const approvalQueue = new PersistentStore('approval-queue', BASE_OPTS);
const execHistory = new PersistentStore('exec-history', BASE_OPTS);

let auditCount = 0;
const audit = [];
const AUDIT_FILE_PATH = `${process.env.HOJAI_DATA_DIR || './data/'}/policy-os/audit.jsonl`;

// Inject crypto into app locals for webhook route use
app.locals.crypto = crypto;

// ── Distributed Cache (Phase P2) — warm cache on boot ───────────────────────
setImmediate(() => {
  warmCache(policies).catch(err => {
    console.warn('[policy-os] Cache warm failed:', err.message);
  });
});

// =================================================================
// Auth middleware factory
// =================================================================

const customAuth = createCustomAuth({
  requireAuth: REQUIRE_AUTH,
  serviceToken: SERVICE_TOKEN,
  apiKeysStore: apiKeys,
});

const authOrBypass = (req, res, next) => (REQUIRE_AUTH ? requireAuth(req, res, next) : next());

// =================================================================
// Per-Tenant Rate Limiters (Phase 0.6)
// Key = "tenantId:endpoint" — each tenant gets their own budget.
// Falls back to IP when no tenant identity is present (unauthenticated
// requests share a global limit but cannot crowd out authenticated ones).
// =================================================================

function tenantKeyGenerator(req) {
  // Prefer authenticated tenant identity; fall back to IP.
  const tenant = req.auth?.tenantId || req.auth?.owner || null;
  return `${tenant || req.ip}:${req.path}`;
}

const evaluateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: EVAL_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: tenantKeyGenerator,
  message: { error: `Rate limit exceeded; max ${EVAL_LIMIT} evaluations per minute per tenant` },
});
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: WRITE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: tenantKeyGenerator,
  message: { error: `Rate limit exceeded; max ${WRITE_LIMIT} writes per minute per tenant` },
});

// =================================================================
// Audit helpers
// =================================================================

function auditLog(entry) {
  const e = { id: uuidv4(), timestamp: new Date().toISOString(), ...entry };
  audit.push(e);
  auditCount++;
  try {
    const dir = path.dirname(AUDIT_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(AUDIT_FILE_PATH, JSON.stringify(e) + '\n', 'utf8');
  } catch (err) {
    console.error('[policy-os] audit write failed:', err.message);
  }
  if (audit.length > AUDIT_MAX) archiveOldAudit();
  setImmediate(() => {
    Promise.all([fireWebhooks(e), recordMetric(e)])
      .catch((err) => console.error('[policy-os] post-audit hook failed:', err.message));
  });
  return e;
}

let archiving = false;
function archiveOldAudit() {
  if (archiving) return;
  archiving = true;
  try {
    const archiveDir = path.join(path.dirname(AUDIT_FILE_PATH), 'archives');
    if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 10);
    const archivePath = path.join(archiveDir, `audit-${stamp}-${uuidv4().slice(0, 6)}.jsonl`);
    if (fs.existsSync(AUDIT_FILE_PATH)) fs.renameSync(AUDIT_FILE_PATH, archivePath);
    audit.length = 0;
  } catch (err) {
    console.error('[policy-os] audit archive failed:', err.message);
  } finally {
    archiving = false;
  }
}

// =================================================================
// Seed data
// =================================================================

function seed() {
  if (policies.size > 0) return;

  const roleSeeds = [
    { name: 'admin', description: 'Full system administrator', permissions: ['*'], scope: 'global' },
    { name: 'manager', description: 'Department/team manager', permissions: ['policies:read', 'policies:write', 'approvals:decide', 'roles:assign', 'audit:read'], scope: 'department' },
    { name: 'customer', description: 'End user / customer', permissions: ['policies:read:own', 'approvals:request'], scope: 'self' },
  ];
  for (const r of roleSeeds) roles.set(r.name, { ...r, createdAt: new Date().toISOString() });

  const userSeeds = [
    { id: 'u-admin', name: 'Alice Admin', roles: ['admin'], trustScore: 100, attributes: { department: 'IT' } },
    { id: 'u-manager', name: 'Maya Manager', roles: ['manager'], trustScore: 90, attributes: { department: 'Operations' } },
    { id: 'u-customer', name: 'Carl Customer', roles: ['customer'], trustScore: 85, attributes: { vip: false } },
  ];
  for (const u of userSeeds) {
    userRoles.set(u.id, u.roles);
    users.set(u.id, { id: u.id, name: u.name, trustScore: u.trustScore, attributes: u.attributes, createdAt: new Date().toISOString() });
  }

  const now = new Date().toISOString();
  const policySeeds = [
    {
      id: 'pol-shopping-budget', name: 'Shopping Budget Policy', description: 'Auto-allow purchases under 5000, require approval above', category: 'financial', priority: 10,
      conditions: { 'context.amount': { lte: 5000 } },
      rules: [
        { if: { 'context.amount': { lte: 100 } }, then: { allow: true, action: 'auto_allow_small_purchase' } },
        { if: { 'context.amount': { lte: 5000 } }, then: { allow: true, action: 'auto_allow_within_budget' } },
        { if: { 'context.amount': { gt: 5000 } }, then: { allow: false, action: 'require_approval_over_budget' } },
      ],
      actions: { onAllow: { log: 'purchase_approved' }, onDeny: { log: 'purchase_requires_approval' } },
      exceptions: [],
      approvals: { strategy: 'multi', requiredApprovers: ['u-manager', 'u-admin'] },
      owner: 'u-admin', status: 'published',
    },
    {
      id: 'pol-payment-fraud', name: 'Payment Fraud Prevention', description: 'Block payments from low-trust users', category: 'security', priority: 100,
      conditions: { 'context.user.trustScore': { lt: 50 } },
      rules: [
        { if: { 'context.user.trustScore': { lt: 30 } }, then: { allow: false, action: 'block_critical_trust' } },
        { if: { 'context.user.trustScore': { lt: 50 } }, then: { allow: false, action: 'block_low_trust' } },
        { if: { 'context.user.trustScore': { gte: 50 } }, then: { allow: true, action: 'allow_adequate_trust' } },
      ],
      actions: { onAllow: { log: 'payment_approved' }, onDeny: { log: 'payment_blocked_fraud' } },
      exceptions: [{ name: 'vip_override', condition: 'context.user.attributes.vip === true' }],
      approvals: { strategy: 'emergency', requiredApprovers: ['u-admin'] },
      owner: 'u-admin', status: 'published',
    },
    {
      id: 'pol-data-export', name: 'Data Export Privacy Policy', description: 'Bulk data exports > 100 records require approval', category: 'privacy', priority: 80,
      conditions: { 'context.action': { in: ['data.export', 'data.bulk_download'] } },
      rules: [
        { if: { 'context.recordCount': { lte: 100 } }, then: { allow: true, action: 'allow_small_export' } },
        { if: { 'context.recordCount': { gt: 100 } }, then: { allow: false, action: 'require_approval_large_export' } },
      ],
      actions: { onAllow: { log: 'export_approved' }, onDeny: { log: 'export_requires_approval' } },
      exceptions: [],
      approvals: { strategy: 'sequential', requiredApprovers: ['u-manager', 'u-admin'] },
      owner: 'u-admin', status: 'published',
    },
    {
      id: 'pol-ai-autonomy', name: 'AI Autonomy Policy', description: 'AI execution requires confidence > 0.7', category: 'ai', priority: 90,
      conditions: { 'context.action': { startsWith: 'ai.' } },
      rules: [
        { if: { 'context.confidence': { lt: 0.5 } }, then: { allow: false, action: 'block_low_confidence' } },
        { if: { 'context.confidence': { lt: 0.7 } }, then: { allow: false, action: 'require_human_review' } },
        { if: { 'context.confidence': { gte: 0.7 } }, then: { allow: true, action: 'allow_high_confidence' } },
      ],
      actions: { onAllow: { log: 'ai_action_approved' }, onDeny: { log: 'ai_action_blocked' } },
      exceptions: [],
      approvals: { strategy: 'single', requiredApprovers: ['u-admin'] },
      owner: 'u-admin', status: 'published',
    },
    {
      id: 'pol-skill-execution', name: 'Skill Execution Scope Policy', description: 'Skill execution requires scope check', category: 'skill', priority: 70,
      conditions: { 'context.action': { startsWith: 'skill.' } },
      rules: [
        { if: { 'context.scope': { exists: false } }, then: { allow: false, action: 'block_missing_scope' } },
        { if: { 'context.user.scopes': { notContains: 'context.scope' } }, then: { allow: false, action: 'block_insufficient_scope' } },
        { if: { 'context.user.scopes': { contains: 'context.scope' } }, then: { allow: true, action: 'allow_valid_scope' } },
      ],
      actions: { onAllow: { log: 'skill_execution_approved' }, onDeny: { log: 'skill_execution_blocked' } },
      exceptions: [],
      approvals: { strategy: 'single', requiredApprovers: ['u-manager'] },
      owner: 'u-admin', status: 'published',
    },
    {
      id: 'pol-twin-sharing', name: 'Twin Sharing Consent Policy', description: 'Sharing a digital twin requires owner consent', category: 'twin', priority: 75,
      conditions: { 'context.action': { in: ['twin.share', 'twin.export', 'twin.delegate'] } },
      rules: [
        { if: { 'context.ownerConsent': { equals: false } }, then: { allow: false, action: 'block_no_consent' } },
        { if: { 'context.ownerConsent': { equals: true } }, then: { allow: true, action: 'allow_with_consent' } },
      ],
      actions: { onAllow: { log: 'twin_share_approved' }, onDeny: { log: 'twin_share_blocked' } },
      exceptions: [],
      approvals: { strategy: 'multi', requiredApprovers: ['u-manager', 'u-admin'] },
      owner: 'u-admin', status: 'published',
    },
  ];

  for (const p of policySeeds) {
    policies.set(p.id, { ...p, version: 1, createdAt: now, updatedAt: now });
    auditLog({ type: 'policy.created', policyId: p.id, actor: p.owner, details: { category: p.category, name: p.name, source: 'seed' } });
  }
}

// =================================================================
// Webhook delivery
// =================================================================

function signPayload(secret, body) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

async function deliverWebhook(wh, payload) {
  const deliveryId = `wh-${Date.now()}`;
  const body = JSON.stringify(payload);
  const signature = signPayload(wh.secret || 'policy-os-default', body);
  const startedAt = Date.now();
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 5000);
    const resp = await fetch(wh.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PolicyOS-Event': payload.event,
        'X-PolicyOS-Delivery': deliveryId,
        'X-PolicyOS-Signature': `sha256=${signature}`,
      },
      body,
      signal: ac.signal,
    });
    clearTimeout(timer);
    const ok = resp.status >= 200 && resp.status < 300;
    const entry = { id: deliveryId, webhookId: wh.id, event: payload.event, url: wh.url, status: ok ? 'success' : 'failed', httpStatus: resp.status, durationMs: Date.now() - startedAt, timestamp: new Date().toISOString() };
    await webhookDeliveries.set(deliveryId, entry);
    wh.lastDeliveryAt = entry.timestamp;
    wh.lastError = ok ? null : `HTTP ${resp.status}`;
    await webhooks.set(wh.id, wh);
    return entry;
  } catch (err) {
    const entry = { id: deliveryId, webhookId: wh.id, event: payload.event, url: wh.url, status: 'failed', error: err.message, durationMs: Date.now() - startedAt, timestamp: new Date().toISOString() };
    await webhookDeliveries.set(deliveryId, entry);
    wh.lastError = err.message;
    await webhooks.set(wh.id, wh);
    return entry;
  }
}

async function fireWebhooks(auditEntry) {
  if (!auditEntry || !auditEntry.type) return;
  const all = Array.from(webhooks.values());
  const subscribers = all.filter((w) => w.active && Array.isArray(w.events) && w.events.includes(auditEntry.type));
  for (const wh of subscribers) {
    deliverWebhook(wh, { event: auditEntry.type, audit: auditEntry, deliveryId: null })
      .catch((err) => console.error('[policy-os] webhook delivery failed:', err.message));
  }
}

// =================================================================
// Analytics metric recorder
// =================================================================

async function recordMetric(auditEntry) {
  if (!auditEntry || auditEntry.type !== 'policy.evaluated') return;
  const policyId = auditEntry.policyId || (auditEntry.details && auditEntry.details.policyId) || '__fail_closed__';
  const allowed = !!(auditEntry.details && auditEntry.details.allowed);
  const reasonsArr = (auditEntry.details && auditEntry.details.reasons) || [];
  const reason = (auditEntry.details && auditEntry.details.reason) || (Array.isArray(reasonsArr) && reasonsArr[0]) || 'unknown';
  const actor = (auditEntry.details && auditEntry.details.actor) || auditEntry.actor || 'anonymous';
  const day = (auditEntry.timestamp || new Date().toISOString()).slice(0, 10);

  let cur = await evalMetrics.get(policyId);
  if (!cur) cur = { policyId, allows: 0, denies: 0, total: 0, byActor: {}, byReason: {}, byDay: {} };
  cur.total += 1;
  if (allowed) cur.allows += 1; else cur.denies += 1;
  cur.byActor[actor] = (cur.byActor[actor] || 0) + 1;
  cur.byReason[reason] = (cur.byReason[reason] || 0) + 1;
  cur.byDay[day] = (cur.byDay[day] || 0) + 1;
  cur.lastEvaluatedAt = auditEntry.timestamp || new Date().toISOString();
  await evalMetrics.set(policyId, cur);
}

// =================================================================
// Policy finder (used by routes)
// =================================================================

function policyFinder(policyId, context) {
  return findPolicy(policyId, context, policies);
}

// =================================================================
// Express middleware
// =================================================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: { policy: 'require-corp' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
}));

app.use(cors(CORS_ORIGIN ? { origin: CORS_ORIGIN.split(',').map((s) => s.trim()) } : undefined));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
// Phase 0.7: Strip prototype-pollution keys from all JSON bodies.
app.use(prototypePollutionMiddleware);
app.use(morgan('tiny'));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(JSON.stringify({
        method: req.method, path: req.path,
        duration_ms: Date.now() - start, status: res.statusCode, ts: new Date().toISOString(),
      }));
    }
  });
  next();
});

// =================================================================
// Health endpoints
// =================================================================

app.get('/', (req, res) => {
  res.json({
    service: SERVICE_NAME, version: SERVICE_VERSION, port: PORT,
    description: 'PolicyOS — Universal governance, trust, authorization, compliance, decision policy platform',
    docs: 'See README.md or CLAUDE.md for full API documentation',
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy', service: SERVICE_NAME, version: SERVICE_VERSION, port: PORT,
    authRequired: REQUIRE_AUTH,
    counts: {
      policies: policies.size, roles: roles.size, users: users.size,
      approvals: approvals.size, auditEntries: auditCount, auditInMemory: audit.length,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, service: SERVICE_NAME });
});

// =================================================================
// Register all route modules
// =================================================================

const routeDeps = {
  policies, roles, userRoles, users, approvals, policyChanges, apiKeys,
  webhooks, webhookDeliveries, evalMetrics, auditLog, customAuth,
  evaluateLimiter, writeLimiter,
  evaluatePolicy, applyExceptions, findPolicy: policyFinder, evaluateComposition,
  CATEGORIES, POLICY_STATUSES, audit,
  // Phase 2: ABAC v2
  conditionTemplates, attributePolicies,
  // Phase 3: ReBAC
  relationships,
  // Phase 4: AI Governance
  aiModels, constitutions,
  // Phase 5: Agent Trust
  agentRegistry,
  // Phase 6: Memory Governance
  memoryPolicies,
  // Phase 7: Twin Governance
  twinPolicies,
  // Phase 9: Lifecycle Automation
  automations, approvalQueue, execHistory,
};

registerPolicyRoutes(app, routeDeps);
registerRbacRoutes(app, routeDeps);
registerApiKeyRoutes(app, routeDeps);
registerApprovalRoutes(app, routeDeps);
registerWebhookRoutes(app, routeDeps);
registerAnalyticsRoutes(app, { evalMetrics, customAuth });
registerAuditRoutes(app, { audit, customAuth });
// Phase P1: GitOps — Git-backed policy management with PR workflow
registerGitOpsRoutes(app, {
  policies, relationships, conditionTemplates, attributePolicies,
  aiModels, constitutions, agentRegistry, memoryPolicies, twinPolicies, automations,
  customAuth, writeLimiter,
});
// Phase P1: Formal Verification — conflict/dead/escalation/cycle detection
registerFormalVerificationRoutes(app, {
  policies, roles, customAuth, writeLimiter,
});
// Phase 2: ABAC v2 routes
registerAttributeRoutes(app, { customAuth });
registerConditionTemplateRoutes(app, { auditLog, customAuth, conditionTemplates });
registerAttributePolicyRoutes(app, { auditLog, customAuth, attributePolicies });
// Phase 2.4: Natural Language Policy Authoring
registerNLAuthoringRoutes(app, { auditLog, customAuth });
// Phase 2.5: Natural Language Explanation of Decisions
registerNLExplanationRoutes(app, { auditLog, customAuth });
// Phase 3: ReBAC — Relationship-Based Access Control
registerReBACRoutes(app, { auditLog, customAuth, relationships });
// Phase 4: AI Governance — Model registry, output validation, constitutions
registerAIGovernanceRoutes(app, { auditLog, customAuth, aiModels, constitutions });
// Phase 5: Agent Trust — Identity registry, multi-dimensional scoring
registerAgentTrustRoutes(app, { auditLog, customAuth, agentRegistry });
// Phase 6: Memory Governance — Access policies, retention, PII detection
registerMemoryGovernanceRoutes(app, { auditLog, customAuth, memoryPolicies });
// Phase 7: Twin Governance — TwinOS bridge, version governance, cross-twin
registerTwinGovernanceRoutes(app, { auditLog, customAuth, twinPolicies });
// Phase 8: Constitutional AI — Documents, review, harm categorization
registerConstitutionalAIRoutes(app, { auditLog, customAuth, constitutions });
// Phase 9: Lifecycle Automation — Automation engine, approval queue
registerLifecycleAutomationRoutes(app, { auditLog, customAuth, automations, approvalQueue });
// Phase 10: Developer Experience — OpenAPI, SDKs, sandbox, compliance reports
registerDeveloperExperienceRoutes(app, { auditLog, customAuth });
// Phase P2: Distributed Cache — Redis-backed caching with circuit breaker
registerCacheRoutes(app, { policies, customAuth });
// Phase P3: Real-time Monitoring — metrics, SLA, health, alerts
registerMonitoringRoutes(app, { policies, customAuth });
// Phase P4: Incident Response Automation
registerIncidentResponseRoutes(app, { policies, customAuth, writeLimiter });
// =================================================================
// Error handlers
// =================================================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// =================================================================
// Boot
// =================================================================

seed();

// =================================================================
// Graceful shutdown
// =================================================================

let isShuttingDown = false;
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[policy-os] Received ${signal}, flushing state...`);
  try {
    const flushStart = Date.now();
    await Promise.all([policies.flush(), roles.flush(), userRoles.flush(), users.flush(), approvals.flush()]);
    console.log(`Flushed state in ${Date.now() - flushStart}ms`);
  } catch (err) {
    console.error(`Flush error:`, err.message);
  }
  if (server) {
    server.close(() => { console.log('HTTP server closed, exiting'); process.exit(0); });
    setTimeout(() => { console.warn('Forced exit after 5s shutdown grace period'); process.exit(1); }, 5000).unref();
  } else {
    process.exit(0);
  }
}

let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`PolicyOS v${SERVICE_VERSION} running on port ${PORT}`);
    console.log(`Seeded ${policies.size} policies, ${roles.size} roles, ${users.size} users`);
  });
  installGracefulShutdown(server);
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    console.error('[policy-os] Uncaught exception:', err);
    gracefulShutdown('uncaughtException');
  });
}

export default app;
export {
  policies, roles, userRoles, approvals, users, apiKeys,
  webhooks, webhookDeliveries, evalMetrics, audit,
  CATEGORIES, POLICY_STATUSES, gracefulShutdown,
  SERVICE_NAME, SERVICE_VERSION, PORT,
};
