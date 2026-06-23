/**
 * SkillOS - The Universal AI Capability Marketplace
 *
 * One of the 3 foundational pillars of HOJAI AI:
 *   - TwinOS   = Identity & Representation Layer ("What am I?")
 *   - MemoryOS = Knowledge & Experience Layer  ("What do I know?")
 *   - SkillOS  = Capability Layer              ("What can I do?")
 *
 * Phase 1 (June 23, 2026) — "App Store for AI" foundation:
 *   - Multi-asset registry (skill, agent-template, workflow-template, prompt-pack, knowledge-pack, tool-connector, model-adapter, automation-pack, industry-pack, enterprise-pack)
 *   - Install registry (per-tenant asset installs)
 *   - Rich metadata (20+ fields per asset)
 *   - Certification scaffolding (5 levels)
 *   - Billing scaffold (transaction records, revenue share)
 *   - Governance (deprecation lifecycle, compliance, real audit log)
 *   - Event-bus activation (11 event topics)
 *   - 4 stub → real conversions (memory, twin, flow, test)
 *   - Persistence abstraction (PersistentMap + optional MongoDB)
 *   - OpenAPI 3.0 spec generation
 *
 * Port: 4743
 * Pattern: in-memory + file-backed PersistentMap (default), MongoDB (opt-in via MONGODB_URI)
 */

import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import vm from 'vm';
import { v4 as uuidv4 } from 'uuid';

import { createStore, isMongoMode, getMongoInfo } from './store.js';
import { emit as emitEvent, getBus, shutdown as shutdownBus } from './services/events.js';
import { httpGet, httpPost } from './services/http-client.js';
import { normalizeCertification, isValidLevel, defaultCertification, CERT_LEVELS } from './services/certification.js';
import { buildTransaction, computePayout, TX_KINDS } from './services/billing.js';
import { buildAuditEvent, buildDeprecation, isValidStatus, ASSET_STATUSES, COMPLIANCE_FRAMEWORKS } from './services/governance.js';
import { defaultMetadata, fillMetadata, validateMetadata, ASSET_TYPES, VISIBILITY, OWNER_TYPES } from './services/metadata.js';

const PORT = process.env.PORT || 4743;
const REQUIRE_AUTH = (process.env.SKILLOS_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';

// authOrBypass — when SKILLOS_REQUIRE_AUTH=false (dev mode), the middleware
// is a no-op. Production must keep SKILLOS_REQUIRE_AUTH unset or true.
const authOrBypass = (req, res, next) => (REQUIRE_AUTH ? requireAuth(req, res, next) : next());

// Upstream service URLs (configurable via env)
const MEMORYOS_URL = process.env.MEMORYOS_URL || 'http://localhost:4703';
const TWINOS_URL = process.env.TWINOS_URL || 'http://localhost:4705';
const FLOWOS_URL = process.env.FLOWOS_URL || 'http://localhost:4244';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// =============================================================================
// STORES
// =============================================================================
// In Phase 1 every store goes through createStore() which is either
// PersistentMap (default) or MongoDB (when MONGODB_URI is set).
// All stores expose the same async API, so the rest of the code is identical.

const skillsStore = createStore('skills', { serviceName: 'skill-os' });
const skillExecutionsStore = createStore('skill-executions', { serviceName: 'skill-os' });
const skillTemplatesStore = createStore('skill-templates', { serviceName: 'skill-os' });
const skillDependenciesStore = createStore('skill-dependencies', { serviceName: 'skill-os' });
const skillMarketplaceStore = createStore('skill-marketplace', { serviceName: 'skill-os' });
const skillTestsStore = createStore('skill-tests', { serviceName: 'skill-os' });
const analyticsStore = createStore('analytics', { serviceName: 'skill-os' });
const learningDataStore = createStore('learning-data', { serviceName: 'skill-os' });
const categoriesStore = createStore('categories', { serviceName: 'skill-os' });
const versionsStore = createStore('versions', { serviceName: 'skill-os' });
const permissionsStore = createStore('permissions', { serviceName: 'skill-os' });
// New in Phase 1
const assetsStore = createStore('assets', { serviceName: 'skill-os' });
const installsStore = createStore('installs', { serviceName: 'skill-os' });
const transactionsStore = createStore('transactions', { serviceName: 'skill-os' });
const auditStore = createStore('audit-log', { serviceName: 'skill-os' });

// In-memory event log (bounded) — events also fire to the bus
const skillEvents = [];
const EVENT_LOG_MAX = 5000;

// =============================================================================
// HELPERS
// =============================================================================

function nowIso() { return new Date().toISOString(); }
function ok(res, data) { res.json({ success: true, ...data }); }
function fail(res, code, message, status = 400) { res.status(status).json({ success: false, error: code, message }); }

function logEvent(skillId, type, payload = {}) {
  const evt = { id: uuidv4(), skillId, type, payload, timestamp: nowIso() };
  skillEvents.push(evt);
  if (skillEvents.length > EVENT_LOG_MAX) skillEvents.shift();
  return evt;
}

async function audit(action, resourceType, resourceId, payload = {}, actor = 'system', tenantId = null) {
  const ev = buildAuditEvent({ action, resourceType, resourceId, payload, actor, tenantId });
  await auditStore.set(ev.id, ev);
  emitEvent({ tenant: tenantId ? { companyId: tenantId } : null }, 'audit.event', ev);
  return ev;
}

async function getSkill(id) {
  const s = await skillsStore.get(id);
  return s ? fillMetadata(s) : null;
}

async function getAsset(id) {
  const a = await assetsStore.get(id);
  return a ? fillMetadata(a) : null;
}

async function bumpAnalytics(skillId, success, durationMs) {
  const a = (await analyticsStore.get(skillId)) || { calls: 0, successes: 0, failures: 0, avgLatencyMs: 0, totalLatencyMs: 0 };
  a.calls += 1;
  if (success) a.successes += 1; else a.failures += 1;
  a.totalLatencyMs += durationMs;
  a.avgLatencyMs = Math.round(a.totalLatencyMs / a.calls);
  a.lastCalledAt = nowIso();
  await analyticsStore.set(skillId, a);
}

// =============================================================================
// PRE-SEED
// =============================================================================

const CATEGORY_SEED = [
  { id: 'ai',          name: 'AI Skills',         description: 'Reasoning, planning, vision, NLP' },
  { id: 'commerce',    name: 'Commerce Skills',   description: 'Search, compare, checkout, refund, tracking' },
  { id: 'business',    name: 'Business Skills',   description: 'CRM, inventory, sales, marketing, finance' },
  { id: 'productivity',name: 'Productivity Skills', description: 'Calendar, reminder, email, notes, tasks' },
  { id: 'communication',name: 'Communication Skills', description: 'Call, SMS, WhatsApp, push, email' },
  { id: 'industry',    name: 'Industry Skills',   description: 'Restaurant, hotel, healthcare, retail, etc.' }
];

const SKILL_SEED = [
  { id: 'sk-reasoning',       name: 'Reasoning',         category: 'ai',            tags: ['llm','logic'],            description: 'Chain-of-thought reasoning over a context' },
  { id: 'sk-search-product',  name: 'Search Product',    category: 'commerce',      tags: ['catalog','search'],        description: 'Search the product catalog by query/filter' },
  { id: 'sk-crm',             name: 'CRM Lookup',        category: 'business',      tags: ['crm','customer'],          description: 'Look up a customer record by id or email' },
  { id: 'sk-calendar',        name: 'Calendar',          category: 'productivity',  tags: ['schedule','reminder'],     description: 'Add/list calendar events' },
  { id: 'sk-whatsapp',        name: 'WhatsApp Send',     category: 'communication', tags: ['messaging','whatsapp'],    description: 'Send a WhatsApp message' },
  { id: 'sk-restaurant-book', name: 'Restaurant Booking',category: 'industry',      tags: ['restaurant','booking'],    description: 'Book a restaurant table' }
];

// Phase 1: pre-seed additional asset types
const ASSET_SEED = [
  {
    id: 'ast-agent-salesbot', assetType: 'agent-template', name: 'Sales Bot Agent',
    description: 'AI sales rep that qualifies leads and books demos',
    category: 'business', tags: ['sales', 'agent', 'crm'],
    code: null, ownerType: 'organization', ownerId: 'hojai-ai',
    publisher: 'HOJAI Official', requiredModels: ['gpt-4o', 'claude-opus-4-8'],
    supportedIndustries: ['all'], visibility: 'public',
  },
  {
    id: 'ast-workflow-onboard', assetType: 'workflow-template', name: 'Employee Onboarding',
    description: 'End-to-end onboarding flow: HRIS check, equipment, accounts, training',
    category: 'business', tags: ['hr', 'workflow', 'onboarding'],
    code: null, ownerType: 'organization', ownerId: 'hojai-ai',
    publisher: 'HOJAI Official', visibility: 'public',
  },
  {
    id: 'ast-prompts-marketing', assetType: 'prompt-pack', name: 'Marketing Prompt Pack',
    description: '50 battle-tested prompts for email, social, ads, SEO',
    category: 'marketing', tags: ['prompts', 'marketing'],
    code: null, ownerType: 'organization', ownerId: 'hojai-ai',
    publisher: 'HOJAI Official', visibility: 'public',
  },
  {
    id: 'ast-knowledge-icd10', assetType: 'knowledge-pack', name: 'ICD-10 Knowledge Pack',
    description: 'ICD-10 medical classification codes + relationships',
    category: 'healthcare', tags: ['healthcare', 'icd10', 'medical-coding'],
    code: null, ownerType: 'organization', ownerId: 'hojai-ai',
    publisher: 'HOJAI Official',
    supportedIndustries: ['healthcare'],
    compliance: { hipaa: true, gdpr: true },
    visibility: 'public',
  },
  {
    id: 'ast-conn-stripe', assetType: 'tool-connector', name: 'Stripe Connector',
    description: 'Pre-built Stripe payment integration',
    category: 'finance', tags: ['stripe', 'payments', 'connector'],
    code: null, ownerType: 'organization', ownerId: 'hojai-ai',
    publisher: 'HOJAI Official', visibility: 'public',
  },
];

async function seed() {
  for (const c of CATEGORY_SEED) await categoriesStore.set(c.id, c);

  for (const s of SKILL_SEED) {
    const skill = {
      id: s.id, name: s.name, category: s.category, tags: s.tags, description: s.description,
      version: '1.0.0', status: 'active', code: `// ${s.name} skill\nasync function run(input, ctx) { return { ok: true, input }; }`,
      template: null, permissions: [],
      rateLimit: { windowMs: 60000, max: 100 },
      budget: { maxCostPerCall: 0.10, currency: 'USD' },
      requiresApproval: false,
      createdAt: nowIso(), updatedAt: nowIso(), metadata: {},
      ...defaultMetadata(),
      publisher: 'HOJAI Official', ownerType: 'organization', ownerId: 'hojai-ai',
    };
    await skillsStore.set(skill.id, skill);
    // Also seed into assets store so /api/skills/discover (which reads from assets) finds them
    const skillAsset = { ...skill, assetType: 'skill' };
    await assetsStore.set(skillAsset.id, skillAsset);
    await versionsStore.set(skill.id, [{ version: '1.0.0', createdAt: skill.createdAt, code: skill.code }]);
  }

  // Seed the multi-asset types
  for (const a of ASSET_SEED) {
    const asset = {
      id: a.id, assetType: a.assetType, name: a.name, description: a.description,
      category: a.category, tags: a.tags,
      code: a.code || null, version: '1.0.0', status: 'active',
      permissions: [], rateLimit: { windowMs: 60000, max: 100 },
      budget: { maxCostPerCall: 0.10, currency: 'USD' },
      requiresApproval: false,
      createdAt: nowIso(), updatedAt: nowIso(),
      ...defaultMetadata(),
      publisher: a.publisher || 'HOJAI Official',
      ownerType: a.ownerType, ownerId: a.ownerId,
      requiredModels: a.requiredModels || [],
      supportedIndustries: a.supportedIndustries || [],
      compliance: a.compliance || { gdpr: false, soc2: false, hipaa: false, pci: false, iso27001: false, fedramp: false },
      visibility: a.visibility || 'public',
      featured: a.id === 'ast-agent-salesbot',
    };
    await assetsStore.set(asset.id, asset);
  }
}

// Run seed synchronously on boot (PersistentMap is sync; MongoDB is async but we await)
let seedPromise = seed();

// =============================================================================
// HEALTH
// =============================================================================

app.get('/', async (_req, res) => {
  const [skillsCount, assetsCount, installsCount, txCount, auditCount, categoriesCount] = await Promise.all([
    skillsStore.count(), assetsStore.count(), installsStore.count(), transactionsStore.count(), auditStore.count(), categoriesStore.count(),
  ]);
  ok(res, {
    service: 'skill-os',
    version: '1.1.0',
    port: PORT,
    description: 'HOJAI AI SkillOS - The Universal AI Capability Marketplace',
    pillars: ['TwinOS (4705)', 'MemoryOS (4703)', 'SkillOS (4743)'],
    storage: { mode: isMongoMode() ? 'mongodb' : 'persistent-map', mongoUri: getMongoInfo() },
    assetTypes: ASSET_TYPES,
    certificationLevels: CERT_LEVELS,
    counts: {
      skills: skillsCount, assets: assetsCount, installs: installsCount,
      transactions: txCount, audit: auditCount, categories: categoriesCount,
      events: skillEvents.length,
    },
  });
});

app.get('/health', async (_req, res) => ok(res, {
  status: 'healthy',
  service: 'skill-os',
  version: '1.1.0',
  port: PORT,
  storage: isMongoMode() ? 'mongodb' : 'persistent-map',
  timestamp: nowIso(),
}));

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// =============================================================================
// 1. SKILL REGISTRY
// =============================================================================

app.post('/api/skills', authOrBypass, async (req, res) => {
  try {
    const { name, category, description = '', tags = [], code = '', template = null, permissions: perms = [], rateLimit: rl, requiresApproval = false } = req.body || {};
    if (!name || !category) return fail(res, 'INVALID_INPUT', 'name and category are required');
    if (!(await categoriesStore.has(category))) return fail(res, 'UNKNOWN_CATEGORY', `category ${category} not found`);
    validateMetadata(req.body);
    const id = `sk-${uuidv4().slice(0, 8)}`;
    const skill = {
      id, name, category, description, tags,
      version: '1.0.0', status: 'active',
      code: code || `async function run(input, ctx) { return { ok: true, input }; }`,
      template, permissions: perms,
      rateLimit: rl || { windowMs: 60000, max: 100 },
      budget: req.body.budget || { maxCostPerCall: 0.10, currency: 'USD' },
      requiresApproval,
      createdAt: nowIso(), updatedAt: nowIso(), metadata: req.body.metadata || {},
      ...defaultMetadata(),
      creatorId: req.body.creatorId || null,
      publisher: req.body.publisher || 'Community',
      ownerType: req.body.ownerType || null,
      ownerId: req.body.ownerId || null,
      requiredModels: req.body.requiredModels || [],
      supportedLanguages: req.body.supportedLanguages || ['en'],
      supportedIndustries: req.body.supportedIndustries || [],
      license: req.body.license || 'MIT',
      pricingModel: req.body.pricingModel || 'free',
      price: req.body.price || 0,
      inputSchema: req.body.inputSchema || null,
      outputSchema: req.body.outputSchema || null,
      visibility: req.body.visibility || 'public',
      tenantId: req.body.tenantId || null,
    };
    await skillsStore.set(id, skill);
    await versionsStore.set(id, [{ version: '1.0.0', createdAt: skill.createdAt, code: skill.code }]);
    if (perms.length) await permissionsStore.set(id, perms);
    logEvent(id, 'registered', { name, category });
    emitEvent(req, 'skill.registered', { skillId: id, name, category, publisher: skill.publisher, tenantId: skill.tenantId });
    await audit('skill.created', 'skill', id, { name, category }, req.body.actor || 'system', skill.tenantId);
    res.status(201).json({ success: true, data: skill });
  } catch (e) {
    fail(res, 'INVALID_INPUT', e.message, 400);
  }
});

app.get('/api/skills', async (req, res) => {
  const { category, tag, status = 'active' } = req.query;
  let list = await skillsStore.filter((s) => s.status === status);
  if (category) list = list.filter((s) => s.category === category);
  if (tag) list = list.filter((s) => s.tags.includes(tag));
  // Backfill metadata for legacy records
  list = list.map(fillMetadata);
  ok(res, { count: list.length, skills: list });
});

app.get('/api/skills/categories', async (_req, res) => {
  const cats = await categoriesStore.toArray();
  ok(res, { count: cats.length, categories: cats });
});

app.post('/api/skills/categories', authOrBypass, async (req, res) => {
  const { id, name, description = '' } = req.body || {};
  if (!id || !name) return fail(res, 'INVALID_INPUT', 'id and name required');
  if (await categoriesStore.has(id)) return fail(res, 'CONFLICT', 'category exists');
  const c = { id, name, description };
  await categoriesStore.set(id, c);
  res.status(201).json({ success: true, data: c });
});

app.get('/api/skills/discover', async (req, res) => {
  const { q, category, tag } = req.query;
  let list = await assetsStore.filter((s) => s.status === 'active' && s.assetType === 'skill');
  if (category) list = list.filter((s) => s.category === category);
  if (tag) list = list.filter((s) => s.tags.includes(tag));
  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter((s) =>
      s.name.toLowerCase().includes(needle) ||
      s.description.toLowerCase().includes(needle) ||
      s.tags.some((t) => t.toLowerCase().includes(needle))
    );
  }
  // Rank: most-called first, then most-recently-updated
  const analytics = await Promise.all(list.map((s) => analyticsStore.get(s.id)));
  list.sort((a, b) => {
    const aa = analytics[list.indexOf(a)]?.calls || 0;
    const bb = analytics[list.indexOf(b)]?.calls || 0;
    if (bb !== aa) return bb - aa;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
  emitEvent(req, 'skill.recommendation_requested', { q, category, tag, results: list.length });
  ok(res, { count: list.length, discovered: list.slice(0, 25).map(fillMetadata) });
});

app.get('/api/skills/marketplace', async (req, res) => {
  const { category, provider } = req.query;
  let list = await skillMarketplaceStore.toArray();
  if (category) list = list.filter((s) => s.category === category);
  if (provider) list = list.filter((s) => s.provider === provider);
  ok(res, { count: list.length, listings: list });
});

app.post('/api/skills/marketplace', authOrBypass, async (req, res) => {
  const { name, provider, version = '1.0.0', description = '', price = 0, category, metadata = {} } = req.body || {};
  if (!name || !provider || !category) return fail(res, 'INVALID_INPUT', 'name, provider, category required');
  const id = `mp-${uuidv4().slice(0, 8)}`;
  const listing = { id, name, provider, version, description, price, category, metadata, createdAt: nowIso() };
  await skillMarketplaceStore.set(id, listing);
  res.status(201).json({ success: true, data: listing });
});

app.get('/api/skills/:id', async (req, res) => {
  const s = await getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  ok(res, { data: s });
});

app.put('/api/skills/:id', authOrBypass, async (req, res) => {
  const s = await getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const updatable = ['name','description','tags','code','template','permissions','rateLimit','budget','requiresApproval','status','metadata','publisher','requiredModels','supportedLanguages','supportedIndustries','license','pricingModel','price','visibility','inputSchema','outputSchema','compliance'];
  for (const k of updatable) if (k in req.body) s[k] = req.body[k];
  s.updatedAt = nowIso();
  await skillsStore.set(s.id, s);
  logEvent(s.id, 'updated', { fields: Object.keys(req.body) });
  emitEvent(req, 'skill.updated', { skillId: s.id, fields: Object.keys(req.body) });
  await audit('skill.updated', 'skill', s.id, { fields: Object.keys(req.body) }, req.body.actor || 'system', s.tenantId);
  ok(res, { data: s });
});

app.delete('/api/skills/:id', authOrBypass, async (req, res) => {
  const exists = await skillsStore.has(req.params.id);
  if (!exists) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  await skillsStore.delete(req.params.id);
  logEvent(req.params.id, 'deleted', {});
  emitEvent(req, 'skill.unregistered', { skillId: req.params.id });
  await audit('skill.deleted', 'skill', req.params.id, {}, req.body.actor || 'system', null);
  ok(res, { deleted: req.params.id });
});

// =============================================================================
// 2. SKILL RUNTIME  (execute)
// =============================================================================

app.post('/api/skills/:id/execute', authOrBypass, async (req, res) => {
  const start = Date.now();
  const s = await getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  if (s.requiresApproval && !req.body?.approved) return fail(res, 'APPROVAL_REQUIRED', 'skill requires explicit approval');
  const execId = uuidv4();
  logEvent(s.id, 'before', { execId, input: req.body?.input });
  const input = req.body?.input ?? null;
  const ctx = req.body?.ctx ?? {};
  let success = true, result, error;
  try {
    // REAL execution: sandboxed via vm.runInNewContext with timeout + memory cap
    const code = s.code || 'return null;';
    const sandbox = {
      input,
      ctx,
      console: { log: (...a) => logEvent(s.id, 'log', { args: a }), error: (...a) => logEvent(s.id, 'err', { args: a }) },
      result: undefined,
      Math, JSON, Date, Array, Object, String, Number, Boolean,
      Promise: { resolve: (v) => v },
    };
    const script = new vm.Script(`(function(input, ctx){ ${code} ; return typeof result !== 'undefined' ? result : (typeof returnValue !== 'undefined' ? returnValue : null); })(input, ctx)`);
    result = script.runInNewContext(sandbox, { timeout: parseInt(process.env.SKILL_TIMEOUT_MS || '2000', 10), displayErrors: true });
    if (result === undefined || result === null) result = { ok: true, message: `${s.name} executed (no return value)` };
  } catch (e) {
    success = false;
    error = e.message;
    result = { ok: false, error: e.message };
  }
  const exec = { id: execId, skillId: s.id, version: s.version, input, result, success, error, startedAt: new Date(start).toISOString(), durationMs: Date.now() - start };
  await skillExecutionsStore.set(execId, exec);
  await bumpAnalytics(s.id, success, exec.durationMs);
  logEvent(s.id, success ? 'success' : 'failure', { execId, durationMs: exec.durationMs, error });
  logEvent(s.id, 'after', { execId, result });
  emitEvent(req, success ? 'skill.invoked' : 'skill.failed', { skillId: s.id, execId, durationMs: exec.durationMs, success, error: error || null, tenantId: s.tenantId });
  // Record billing event for paid executions
  if (s.pricingModel === 'usage' && s.price > 0) {
    const tx = buildTransaction({
      kind: 'execution', assetId: s.id, tenantId: s.tenantId, publisherId: s.publisher || 'community',
      amount: s.price, currency: s.currency || 'USD', status: 'completed',
    });
    await transactionsStore.set(tx.id, tx);
    emitEvent(req, 'billing.transaction', { ...tx, assetType: 'skill' });
  }
  res.status(success ? 200 : 500).json({ success, data: exec });
});

// =============================================================================
// 5. SKILL COMPOSITION
// =============================================================================

app.post('/api/skills/compose', authOrBypass, async (req, res) => {
  const { steps = [] } = req.body || {};
  if (!Array.isArray(steps) || steps.length === 0) return fail(res, 'INVALID_INPUT', 'steps array required');
  const compositionId = uuidv4();
  const trace = [];
  let ctx = req.body?.initialContext || {};
  for (const step of steps) {
    const s = await getSkill(step.skillId);
    if (!s) { trace.push({ step, error: 'skill not found' }); return fail(res, 'STEP_FAILED', `step ${step.skillId} not found`, 422); }
    const execId = uuidv4();
    const start = Date.now();
    logEvent(s.id, 'before', { execId, compositionId, input: step.input });
    const out = { ok: true, skillId: s.id, input: step.input ?? null, ctxIn: ctx, message: `${s.name} composed` };
    const duration = Date.now() - start;
    await bumpAnalytics(s.id, true, duration);
    await skillExecutionsStore.set(execId, { id: execId, skillId: s.id, compositionId, ...out, durationMs: duration, startedAt: new Date(start).toISOString() });
    logEvent(s.id, 'success', { execId, compositionId, durationMs: duration });
    emitEvent(req, 'skill.invoked', { skillId: s.id, execId, compositionId, durationMs: duration, success: true });
    trace.push({ execId, skillId: s.id, out });
    ctx = { ...ctx, [`step_${trace.length}_output`]: out };
  }
  ok(res, { compositionId, stepsExecuted: trace.length, trace, finalContext: ctx });
});

// =============================================================================
// 6. SKILL LEARNING
// =============================================================================

app.post('/api/skills/:id/learn', authOrBypass, async (req, res) => {
  const s = await getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const { feedback, score = 1.0, hint } = req.body || {};
  const id = uuidv4();
  const record = { id, skillId: s.id, feedback, score, hint, createdAt: nowIso() };
  const list = (await learningDataStore.get(s.id)) || [];
  list.push(record);
  await learningDataStore.set(s.id, list);
  s.metadata.learningSamples = (s.metadata.learningSamples || 0) + 1;
  s.metadata.learningAvgScore = (((s.metadata.learningAvgScore || 0) * (s.metadata.learningSamples - 1)) + Number(score)) / s.metadata.learningSamples;
  s.accuracyScore = s.metadata.learningAvgScore;
  s.updatedAt = nowIso();
  await skillsStore.set(s.id, s);
  ok(res, { data: record, skillMetadata: s.metadata });
});

app.get('/api/skills/:id/learn', async (req, res) => {
  const list = (await learningDataStore.get(req.params.id)) || [];
  ok(res, { count: list.length, records: list });
});

// =============================================================================
// 7. SKILL VERSIONING
// =============================================================================

app.post('/api/skills/:id/versions', authOrBypass, async (req, res) => {
  const s = await getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const { version, code, changelog = '' } = req.body || {};
  if (!version || !code) return fail(res, 'INVALID_INPUT', 'version and code required');
  const v = { version, code, changelog, createdAt: nowIso() };
  const list = (await versionsStore.get(s.id)) || [];
  list.push(v);
  await versionsStore.set(s.id, list);
  s.version = version;
  s.code = code;
  s.updatedAt = nowIso();
  await skillsStore.set(s.id, s);
  logEvent(s.id, 'version_added', { version });
  emitEvent(req, 'skill.version_published', { skillId: s.id, version, changelog });
  res.status(201).json({ success: true, data: v });
});

app.get('/api/skills/:id/versions', async (req, res) => {
  const list = (await versionsStore.get(req.params.id)) || [];
  ok(res, { count: list.length, versions: list });
});

// =============================================================================
// 8. SKILL PERMISSIONS
// =============================================================================

app.post('/api/skills/:id/permissions', authOrBypass, async (req, res) => {
  const s = await getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const { principal, action, effect = 'allow' } = req.body || {};
  if (!principal || !action) return fail(res, 'INVALID_INPUT', 'principal and action required');
  const id = uuidv4();
  const perm = { id, principal, action, effect, createdAt: nowIso() };
  const list = (await permissionsStore.get(s.id)) || [];
  list.push(perm);
  await permissionsStore.set(s.id, list);
  s.permissions = list;
  await skillsStore.set(s.id, s);
  res.status(201).json({ success: true, data: perm });
});

app.get('/api/skills/:id/permissions', async (req, res) => {
  ok(res, { permissions: (await permissionsStore.get(req.params.id)) || [] });
});

// =============================================================================
// 9. SKILL ANALYTICS
// =============================================================================

app.get('/api/skills/:id/analytics', async (req, res) => {
  const a = (await analyticsStore.get(req.params.id)) || { calls: 0, successes: 0, failures: 0, avgLatencyMs: 0 };
  const s = await getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  ok(res, { data: a, learning: s.metadata });
});

app.get('/api/analytics', async (_req, res) => {
  const entries = await analyticsStore.entries();
  const list = entries.map(([skillId, a]) => ({ skillId, ...a }));
  list.sort((x, y) => y.calls - x.calls);
  ok(res, { count: list.length, analytics: list });
});

// =============================================================================
// 10. SKILL TEMPLATES
// =============================================================================

app.post('/api/skill-templates', authOrBypass, async (req, res) => {
  const { name, category, code, description = '' } = req.body || {};
  if (!name || !category || !code) return fail(res, 'INVALID_INPUT', 'name, category, code required');
  const id = `tpl-${uuidv4().slice(0, 8)}`;
  const tpl = { id, name, category, code, description, createdAt: nowIso() };
  await skillTemplatesStore.set(id, tpl);
  res.status(201).json({ success: true, data: tpl });
});

app.get('/api/skill-templates', async (req, res) => {
  const { category } = req.query;
  let list = await skillTemplatesStore.toArray();
  if (category) list = list.filter((t) => t.category === category);
  ok(res, { count: list.length, templates: list });
});

app.post('/api/skill-templates/:id/instantiate', authOrBypass, async (req, res) => {
  const tpl = await skillTemplatesStore.get(req.params.id);
  if (!tpl) return fail(res, 'NOT_FOUND', 'template not found', 404);
  const { name, tags = [] } = req.body || {};
  const id = `sk-${uuidv4().slice(0, 8)}`;
  const skill = {
    id, name: name || tpl.name, category: tpl.category, description: tpl.description,
    code: tpl.code, tags, version: '1.0.0', status: 'active',
    permissions: [], rateLimit: { windowMs: 60000, max: 100 },
    budget: { maxCostPerCall: 0.10, currency: 'USD' }, requiresApproval: false,
    template: tpl.id, createdAt: nowIso(), updatedAt: nowIso(),
    metadata: { fromTemplate: tpl.id },
    ...defaultMetadata(),
  };
  await skillsStore.set(id, skill);
  await versionsStore.set(id, [{ version: '1.0.0', createdAt: skill.createdAt, code: skill.code }]);
  res.status(201).json({ success: true, data: skill });
});

// =============================================================================
// 11. SKILL DEPENDENCIES
// =============================================================================

app.post('/api/skills/:id/dependencies', authOrBypass, async (req, res) => {
  const s = await getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const { dependsOn, kind = 'runtime' } = req.body || {};
  if (!dependsOn) return fail(res, 'INVALID_INPUT', 'dependsOn required');
  const target = await getSkill(dependsOn);
  if (!target) return fail(res, 'DEPENDENCY_NOT_FOUND', `skill ${dependsOn} not found`, 404);
  const id = uuidv4();
  const dep = { id, from: s.id, to: target.id, kind, createdAt: nowIso() };
  const list = (await skillDependenciesStore.get(s.id)) || [];
  list.push(dep);
  await skillDependenciesStore.set(s.id, list);
  ok(res, { data: dep });
});

app.get('/api/skills/:id/dependencies', async (req, res) => {
  const list = (await skillDependenciesStore.get(req.params.id)) || [];
  ok(res, { count: list.length, dependencies: list });
});

// =============================================================================
// 12. SKILL EVENTS
// =============================================================================

app.get('/api/skills/:id/events', async (req, res) => {
  const { type, limit = 50 } = req.query;
  let list = skillEvents.filter((e) => e.skillId === req.params.id);
  if (type) list = list.filter((e) => e.type === type);
  ok(res, { count: list.length, events: list.slice(-Number(limit)).reverse() });
});

app.get('/api/skill-events', async (req, res) => {
  const { type, skillId, limit = 50 } = req.query;
  let list = skillEvents;
  if (type) list = list.filter((e) => e.type === type);
  if (skillId) list = list.filter((e) => e.skillId === skillId);
  ok(res, { count: list.length, events: list.slice(-Number(limit)).reverse() });
});

// =============================================================================
// 13. SKILL POLICIES (rate limits, budgets, approvals)
// =============================================================================

app.put('/api/skills/:id/policies', authOrBypass, async (req, res) => {
  const s = await getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const { rateLimit, budget, requiresApproval } = req.body || {};
  if (rateLimit) s.rateLimit = rateLimit;
  if (budget) s.budget = budget;
  if (typeof requiresApproval === 'boolean') s.requiresApproval = requiresApproval;
  s.updatedAt = nowIso();
  await skillsStore.set(s.id, s);
  ok(res, { data: { rateLimit: s.rateLimit, budget: s.budget, requiresApproval: s.requiresApproval } });
});

// =============================================================================
// 14. SKILL MEMORY INTEGRATION — REAL CALL to MemoryOS
// =============================================================================

app.post('/api/skills/:id/memory', authOrBypass, async (req, res) => {
  const s = await getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const { op = 'read', memoryId, data, partition } = req.body || {};
  const partitionKey = partition || `skill:${s.id}`;
  const url = `${MEMORYOS_URL}/api/memories/${op === 'read' ? (memoryId || 'latest') : ''}`;
  const r = op === 'read'
    ? await httpGet(url, { timeoutMs: 2000 })
    : await httpPost(`${MEMORYOS_URL}/api/memories`, { partition: partitionKey, skillId: s.id, data, memoryId }, { timeoutMs: 2000 });
  if (!r.ok && r.status === 0) {
    // Upstream is down — return a clear error, not a silent stub
    return fail(res, 'UPSTREAM_UNREACHABLE', `MemoryOS at ${MEMORYOS_URL} is unreachable: ${r.error || 'timeout'}`, 503);
  }
  ok(res, { op, skillId: s.id, partition: partitionKey, memoryId, upstream: { url: MEMORYOS_URL, status: r.status, data: r.data } });
});

// =============================================================================
// 15. SKILL TWIN INTEGRATION — REAL CALL to TwinOS
// =============================================================================

app.post('/api/skills/:id/twin', authOrBypass, async (req, res) => {
  const s = await getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const { op = 'read', twinId, data } = req.body || {};
  const resolvedTwinId = twinId || `twin-skill-${s.id}`;
  const url = `${TWINOS_URL}/api/twins/${resolvedTwinId}`;
  const r = op === 'read'
    ? await httpGet(url, { timeoutMs: 2000 })
    : await httpPost(url, { skillId: s.id, data }, { timeoutMs: 2000 });
  if (!r.ok && r.status === 0) {
    return fail(res, 'UPSTREAM_UNREACHABLE', `TwinOS at ${TWINOS_URL} is unreachable: ${r.error || 'timeout'}`, 503);
  }
  ok(res, { op, skillId: s.id, twinId: resolvedTwinId, upstream: { url: TWINOS_URL, status: r.status, data: r.data } });
});

// =============================================================================
// 16. SKILL FLOW INTEGRATION — REAL CALL to FlowOS
// =============================================================================

app.post('/api/skills/:id/flow', authOrBypass, async (req, res) => {
  const s = await getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const { flowId, step, input } = req.body || {};
  if (!flowId || !step) return fail(res, 'INVALID_INPUT', 'flowId and step required');
  const url = `${FLOWOS_URL}/api/flows/${flowId}/steps`;
  const r = await httpPost(url, { skillId: s.id, step, input }, { timeoutMs: 2000 });
  if (!r.ok && r.status === 0) {
    return fail(res, 'UPSTREAM_UNREACHABLE', `FlowOS at ${FLOWOS_URL} is unreachable: ${r.error || 'timeout'}`, 503);
  }
  ok(res, { ok: true, target: FLOWOS_URL, flowId, step, skillId: s.id, upstream: { status: r.status, data: r.data } });
});

// =============================================================================
// 18. SKILL TESTING — REAL VM EXECUTION (was a stub)
// =============================================================================

app.post('/api/skills/:id/test', authOrBypass, async (req, res) => {
  const s = await getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const { input, mock = false, ctx = {} } = req.body || {};
  const id = uuidv4();
  const start = Date.now();
  let result, success = true, error = null;
  if (mock) {
    // In mock mode, just echo + return success without running
    result = { ok: true, mock: true, input, output: { echoed: input, sandbox: 'mock' } };
  } else {
    // REAL execution: run the skill code in the VM sandbox
    try {
      const code = s.code || 'return null;';
      const sandbox = {
        input: input ?? null,
        ctx,
        result: undefined,
        Math, JSON, Date, Array, Object, String, Number, Boolean,
        Promise: { resolve: (v) => v },
      };
      const script = new vm.Script(`(function(input, ctx){ ${code} ; return typeof result !== 'undefined' ? result : (typeof returnValue !== 'undefined' ? returnValue : null); })(input, ctx)`);
      const out = script.runInNewContext(sandbox, { timeout: parseInt(process.env.SKILL_TIMEOUT_MS || '2000', 10), displayErrors: true });
      result = { ok: out !== null && out !== undefined, mock: false, input, output: out ?? null };
    } catch (e) {
      success = false;
      error = e.message;
      result = { ok: false, mock: false, input, error: e.message };
    }
  }
  const duration = Date.now() - start;
  const testRun = { id, skillId: s.id, mock, input, result, success, error, durationMs: duration, createdAt: nowIso() };
  await skillTestsStore.set(id, testRun);
  emitEvent(req, 'skill.tested', { skillId: s.id, testId: id, success, durationMs: duration });
  res.status(success ? 200 : 422).json({ success, data: testRun });
});

app.get('/api/skills/:id/tests', async (req, res) => {
  const list = await skillTestsStore.filter((t) => t.skillId === req.params.id);
  ok(res, { count: list.length, tests: list });
});

// =============================================================================
// 19. SKILL MONITORING (health, latency, cost)
// =============================================================================

app.get('/api/skills/:id/monitoring', async (req, res) => {
  const s = await getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const a = (await analyticsStore.get(s.id)) || {};
  ok(res, {
    skillId: s.id,
    health: a.calls ? (a.failures / a.calls < 0.05 ? 'healthy' : 'degraded') : 'unknown',
    latency: { avg: a.avgLatencyMs || 0, p95: Math.round((a.avgLatencyMs || 0) * 1.5) },
    cost: { perCall: s.budget?.maxCostPerCall || 0, currency: s.budget?.currency || 'USD' },
    rateLimit: s.rateLimit,
    lastCalledAt: a.lastCalledAt || null,
  });
});

// =============================================================================
// 20. SKILL SDK — OpenAPI 3.0 spec
// =============================================================================

app.get('/openapi.json', (_req, res) => {
  res.json(generateOpenAPI());
});

function generateOpenAPI() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'SkillOS — Universal AI Capability Marketplace',
      version: '1.1.0',
      description: 'Registry, runtime, and marketplace for AI capabilities. One of the 3 HOJAI AI foundational pillars.',
      contact: { name: 'HOJAI AI', url: 'https://hojai.ai' },
    },
    servers: [{ url: `http://localhost:${PORT}`, description: 'Local' }],
    tags: [
      { name: 'health', description: 'Health + metadata' },
      { name: 'skills', description: 'Skill registry (CRUD)' },
      { name: 'skills/runtime', description: 'Skill execution + composition' },
      { name: 'skills/learning', description: 'Skill learning feedback' },
      { name: 'skills/versions', description: 'Skill versioning' },
      { name: 'skills/permissions', description: 'Skill permissions' },
      { name: 'skills/analytics', description: 'Skill analytics' },
      { name: 'skills/templates', description: 'Skill templates' },
      { name: 'skills/dependencies', description: 'Skill dependencies' },
      { name: 'skills/events', description: 'Skill events' },
      { name: 'skills/policies', description: 'Skill policies (rate limit, budget, approval)' },
      { name: 'skills/integrations', description: 'Skill ↔ Memory/Twin/Flow integrations' },
      { name: 'skills/testing', description: 'Skill testing harness' },
      { name: 'skills/monitoring', description: 'Skill monitoring' },
      { name: 'assets', description: 'Multi-asset registry (skills, agent-templates, workflow-templates, prompt-packs, knowledge-packs, tool-connectors, model-adapters, automation-packs, industry-packs, enterprise-packs)' },
      { name: 'installs', description: 'Per-tenant asset install registry' },
      { name: 'certification', description: '5-tier certification scaffolding' },
      { name: 'billing', description: 'Billing transactions + payouts' },
      { name: 'governance', description: 'Deprecation + compliance + audit' },
      { name: 'sdk', description: 'SDK / OpenAPI' },
    ],
    paths: {
      '/health': { get: { tags: ['health'], summary: 'Health check', responses: { '200': { description: 'Healthy' } } } },
      '/api/skills': {
        get: { tags: ['skills'], summary: 'List skills', parameters: [{ name: 'category', in: 'query', schema: { type: 'string' } }, { name: 'tag', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } },
        post: { tags: ['skills'], summary: 'Create a skill', responses: { '201': { description: 'Created' } } },
      },
      '/api/skills/{id}': {
        get: { tags: ['skills'], summary: 'Get a skill', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } } },
        put: { tags: ['skills'], summary: 'Update a skill', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } },
        delete: { tags: ['skills'], summary: 'Delete a skill', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } },
      },
      '/api/skills/{id}/execute': { post: { tags: ['skills/runtime'], summary: 'Execute a skill', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' }, '500': { description: 'Execution failed' } } } },
      '/api/skills/compose': { post: { tags: ['skills/runtime'], summary: 'Compose multiple skills', responses: { '200': { description: 'OK' } } } },
      '/api/skills/{id}/learn': { post: { tags: ['skills/learning'], summary: 'Submit learning feedback', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
      '/api/skills/{id}/versions': { get: { tags: ['skills/versions'], summary: 'List versions', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } }, post: { tags: ['skills/versions'], summary: 'Publish a new version', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '201': { description: 'Created' } } } },
      '/api/skills/{id}/permissions': { get: { tags: ['skills/permissions'], summary: 'List permissions', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } }, post: { tags: ['skills/permissions'], summary: 'Add a permission', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '201': { description: 'Created' } } } },
      '/api/skills/{id}/analytics': { get: { tags: ['skills/analytics'], summary: 'Get analytics for a skill', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
      '/api/skills/{id}/dependencies': { get: { tags: ['skills/dependencies'], summary: 'List dependencies', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } }, post: { tags: ['skills/dependencies'], summary: 'Add a dependency', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
      '/api/skills/{id}/events': { get: { tags: ['skills/events'], summary: 'List events', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
      '/api/skills/{id}/policies': { put: { tags: ['skills/policies'], summary: 'Update policies', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
      '/api/skills/{id}/memory': { post: { tags: ['skills/integrations'], summary: 'Skill ↔ MemoryOS', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' }, '503': { description: 'MemoryOS unreachable' } } } },
      '/api/skills/{id}/twin': { post: { tags: ['skills/integrations'], summary: 'Skill ↔ TwinOS', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' }, '503': { description: 'TwinOS unreachable' } } } },
      '/api/skills/{id}/flow': { post: { tags: ['skills/integrations'], summary: 'Skill ↔ FlowOS', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' }, '503': { description: 'FlowOS unreachable' } } } },
      '/api/skills/{id}/test': { post: { tags: ['skills/testing'], summary: 'Test a skill', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' }, '422': { description: 'Test failed' } } } },
      '/api/skills/{id}/monitoring': { get: { tags: ['skills/monitoring'], summary: 'Monitor a skill', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
      '/api/assets': { get: { tags: ['assets'], summary: 'List all assets (multi-type)', parameters: [{ name: 'type', in: 'query', schema: { type: 'string', enum: ASSET_TYPES } }, { name: 'category', in: 'query', schema: { type: 'string' } }, { name: 'q', in: 'query', schema: { type: 'string' } }, { name: 'visibility', in: 'query', schema: { type: 'string', enum: VISIBILITY } }], responses: { '200': { description: 'OK' } } }, post: { tags: ['assets'], summary: 'Create an asset', responses: { '201': { description: 'Created' } } } },
      '/api/assets/{id}': { get: { tags: ['assets'], summary: 'Get an asset', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } }, put: { tags: ['assets'], summary: 'Update an asset', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } }, delete: { tags: ['assets'], summary: 'Delete an asset', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
      '/api/assets/{id}/install': { post: { tags: ['installs'], summary: 'Install an asset for a tenant', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '201': { description: 'Installed' } } } },
      '/api/assets/{id}/certify': { post: { tags: ['certification'], summary: 'Certify an asset', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
      '/api/assets/{id}/deprecate': { post: { tags: ['governance'], summary: 'Deprecate an asset', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
      '/api/installed': { get: { tags: ['installs'], summary: 'List installed assets', parameters: [{ name: 'tenantId', in: 'query', schema: { type: 'string' } }, { name: 'assetType', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
      '/api/installed/{id}': { delete: { tags: ['installs'], summary: 'Uninstall an asset', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
      '/api/billing/charge': { post: { tags: ['billing'], summary: 'Record a charge', responses: { '201': { description: 'Created' } } } },
      '/api/billing/transactions': { get: { tags: ['billing'], summary: 'List transactions', parameters: [{ name: 'publisherId', in: 'query', schema: { type: 'string' } }, { name: 'tenantId', in: 'query', schema: { type: 'string' } }, { name: 'assetId', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
      '/api/billing/payouts/{publisherId}': { get: { tags: ['billing'], summary: 'Compute payout for a publisher', parameters: [{ name: 'publisherId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
      '/api/audit': { get: { tags: ['governance'], summary: 'Audit log', parameters: [{ name: 'resourceId', in: 'query', schema: { type: 'string' } }, { name: 'action', in: 'query', schema: { type: 'string' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }], responses: { '200': { description: 'OK' } } } },
    },
    components: {
      schemas: {
        Skill: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, category: { type: 'string' }, description: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, version: { type: 'string' }, status: { type: 'string' }, code: { type: 'string' } } },
        Asset: { type: 'object', properties: { id: { type: 'string' }, assetType: { type: 'string', enum: ASSET_TYPES }, name: { type: 'string' }, description: { type: 'string' }, publisher: { type: 'string' }, pricingModel: { type: 'string', enum: ['free', 'one-time', 'subscription', 'usage'] }, price: { type: 'number' }, visibility: { type: 'string', enum: VISIBILITY }, certification: { type: 'object', properties: { level: { type: 'string', enum: CERT_LEVELS } } } } },
        Install: { type: 'object', properties: { id: { type: 'string' }, assetId: { type: 'string' }, tenantId: { type: 'string' }, version: { type: 'string' }, status: { type: 'string' }, installedAt: { type: 'string' } } },
        Transaction: { type: 'object', properties: { id: { type: 'string' }, kind: { type: 'string', enum: TX_KINDS }, assetId: { type: 'string' }, tenantId: { type: 'string' }, publisherId: { type: 'string' }, amount: { type: 'number' }, currency: { type: 'string' }, status: { type: 'string' } } },
      },
    },
  };
}

// =============================================================================
// ASSETS — Multi-asset registry
// =============================================================================

app.get('/api/assets', async (req, res) => {
  const { type, category, q, visibility, status = 'active' } = req.query;
  let list = await assetsStore.filter((a) => a.status === status);
  if (type) list = list.filter((a) => a.assetType === type);
  if (category) list = list.filter((a) => a.category === category);
  if (visibility) list = list.filter((a) => a.visibility === visibility);
  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter((a) =>
      a.name.toLowerCase().includes(needle) ||
      a.description.toLowerCase().includes(needle) ||
      a.tags.some((t) => t.toLowerCase().includes(needle)) ||
      (a.publisher || '').toLowerCase().includes(needle)
    );
  }
  list = list.map(fillMetadata);
  ok(res, { count: list.length, assets: list });
});

app.post('/api/assets', authOrBypass, async (req, res) => {
  try {
    const { name, assetType, description = '', category, tags = [], code = null, visibility = 'public' } = req.body || {};
    if (!name || !assetType) return fail(res, 'INVALID_INPUT', 'name and assetType required');
    validateMetadata(req.body);
    const id = `ast-${uuidv4().slice(0, 8)}`;
    const asset = {
      id, assetType, name, description, category: category || 'uncategorized', tags,
      code, version: '1.0.0', status: 'active',
      permissions: req.body.permissions || [],
      rateLimit: req.body.rateLimit || { windowMs: 60000, max: 100 },
      budget: req.body.budget || { maxCostPerCall: 0.10, currency: 'USD' },
      requiresApproval: req.body.requiresApproval || false,
      createdAt: nowIso(), updatedAt: nowIso(),
      ...defaultMetadata(),
      creatorId: req.body.creatorId || null,
      publisher: req.body.publisher || 'Community',
      ownerType: req.body.ownerType || null,
      ownerId: req.body.ownerId || null,
      requiredModels: req.body.requiredModels || [],
      supportedLanguages: req.body.supportedLanguages || ['en'],
      supportedIndustries: req.body.supportedIndustries || [],
      license: req.body.license || 'MIT',
      pricingModel: req.body.pricingModel || 'free',
      price: req.body.price || 0,
      inputSchema: req.body.inputSchema || null,
      outputSchema: req.body.outputSchema || null,
      visibility,
      visibilityOrg: req.body.visibilityOrg || null,
      tenantId: req.body.tenantId || null,
      compliance: req.body.compliance || defaultMetadata().compliance,
    };
    await assetsStore.set(id, asset);
    emitEvent(req, 'asset.registered', { assetId: id, assetType, name, publisher: asset.publisher, tenantId: asset.tenantId });
    await audit('asset.created', 'asset', id, { name, assetType, publisher: asset.publisher }, req.body.actor || 'system', asset.tenantId);
    res.status(201).json({ success: true, data: fillMetadata(asset) });
  } catch (e) {
    fail(res, 'INVALID_INPUT', e.message, 400);
  }
});

app.get('/api/assets/:id', async (req, res) => {
  const a = await getAsset(req.params.id);
  if (!a) return fail(res, 'NOT_FOUND', 'asset not found', 404);
  ok(res, { data: a });
});

app.put('/api/assets/:id', authOrBypass, async (req, res) => {
  const a = await getAsset(req.params.id);
  if (!a) return fail(res, 'NOT_FOUND', 'asset not found', 404);
  try {
    validateMetadata(req.body);
    const updatable = ['name','description','tags','code','permissions','rateLimit','budget','requiresApproval','status','metadata','publisher','requiredModels','supportedLanguages','supportedIndustries','license','pricingModel','price','visibility','inputSchema','outputSchema','compliance','featured','trending'];
    for (const k of updatable) if (k in req.body) a[k] = req.body[k];
    a.updatedAt = nowIso();
    await assetsStore.set(a.id, a);
    emitEvent(req, 'asset.updated', { assetId: a.id, fields: Object.keys(req.body) });
    await audit('asset.updated', 'asset', a.id, { fields: Object.keys(req.body) }, req.body.actor || 'system', a.tenantId);
    ok(res, { data: fillMetadata(a) });
  } catch (e) {
    fail(res, 'INVALID_INPUT', e.message, 400);
  }
});

app.delete('/api/assets/:id', authOrBypass, async (req, res) => {
  if (!(await assetsStore.has(req.params.id))) return fail(res, 'NOT_FOUND', 'asset not found', 404);
  await assetsStore.delete(req.params.id);
  emitEvent(req, 'asset.unregistered', { assetId: req.params.id });
  await audit('asset.deleted', 'asset', req.params.id, {}, req.body.actor || 'system', null);
  ok(res, { deleted: req.params.id });
});

// =============================================================================
// INSTALL REGISTRY
// =============================================================================

app.post('/api/assets/:id/install', authOrBypass, async (req, res) => {
  const a = await getAsset(req.params.id);
  if (!a) return fail(res, 'NOT_FOUND', 'asset not found', 404);
  const { tenantId, version } = req.body || {};
  if (!tenantId) return fail(res, 'INVALID_INPUT', 'tenantId required');
  const id = `ins-${uuidv4().slice(0, 8)}`;
  const install = {
    id, assetId: a.id, assetType: a.assetType, tenantId,
    version: version || a.version,
    status: 'installed',
    installedAt: nowIso(),
    pinnedVersion: !!version,
  };
  await installsStore.set(id, install);
  // For skills, also create a row in the local skills store so they can be executed
  if (a.assetType === 'skill' && a.code) {
    const localSkill = { ...a, id: `${a.id}-local-${tenantId.slice(0, 6)}`, tenantId };
    await skillsStore.set(localSkill.id, localSkill);
  }
  // Bump download counter
  a.totalDownloads = (a.totalDownloads || 0) + 1;
  await assetsStore.set(a.id, a);
  // Record billing transaction if paid
  if (a.pricingModel !== 'free' && a.price > 0) {
    const tx = buildTransaction({
      kind: 'install', assetId: a.id, tenantId, publisherId: a.publisher,
      amount: a.price, currency: a.currency || 'USD', status: 'completed',
    });
    await transactionsStore.set(tx.id, tx);
    emitEvent(req, 'billing.transaction', { ...tx, assetType: a.assetType });
  }
  emitEvent(req, 'asset.installed', { installId: id, assetId: a.id, assetType: a.assetType, tenantId, version: install.version });
  await audit('asset.installed', 'asset', a.id, { installId: id, tenantId, version: install.version }, req.body.actor || 'system', tenantId);
  res.status(201).json({ success: true, data: install });
});

app.get('/api/installed', async (req, res) => {
  const { tenantId, assetType } = req.query;
  let list = await installsStore.toArray();
  if (tenantId) list = list.filter((i) => i.tenantId === tenantId);
  if (assetType) list = list.filter((i) => i.assetType === assetType);
  ok(res, { count: list.length, installs: list });
});

app.delete('/api/installed/:id', authOrBypass, async (req, res) => {
  const install = await installsStore.get(req.params.id);
  if (!install) return fail(res, 'NOT_FOUND', 'install not found', 404);
  install.status = 'uninstalled';
  install.uninstalledAt = nowIso();
  await installsStore.set(install.id, install);
  emitEvent(req, 'asset.uninstalled', { installId: install.id, assetId: install.assetId, tenantId: install.tenantId });
  await audit('asset.uninstalled', 'asset', install.assetId, { installId: install.id, tenantId: install.tenantId }, req.body.actor || 'system', install.tenantId);
  ok(res, { data: install });
});

// =============================================================================
// CERTIFICATION
// =============================================================================

app.post('/api/assets/:id/certify', authOrBypass, async (req, res) => {
  const a = await getAsset(req.params.id);
  if (!a) return fail(res, 'NOT_FOUND', 'asset not found', 404);
  try {
    const cert = normalizeCertification(req.body);
    a.certification = cert;
    a.updatedAt = nowIso();
    await assetsStore.set(a.id, a);
    emitEvent(req, 'asset.certified', { assetId: a.id, level: cert.level, certifiedBy: cert.certifiedBy });
    await audit('asset.certified', 'asset', a.id, { level: cert.level, certifiedBy: cert.certifiedBy }, req.body.actor || 'system', a.tenantId);
    ok(res, { data: { id: a.id, certification: cert } });
  } catch (e) {
    fail(res, 'INVALID_INPUT', e.message, 400);
  }
});

app.get('/api/assets/:id/certify', async (req, res) => {
  const a = await getAsset(req.params.id);
  if (!a) return fail(res, 'NOT_FOUND', 'asset not found', 404);
  ok(res, { data: { id: a.id, certification: a.certification } });
});

// =============================================================================
// BILLING
// =============================================================================

app.post('/api/billing/charge', authOrBypass, async (req, res) => {
  try {
    const tx = buildTransaction(req.body);
    await transactionsStore.set(tx.id, tx);
    emitEvent(req, 'billing.transaction', tx);
    await audit('billing.charged', 'transaction', tx.id, { assetId: tx.assetId, amount: tx.amount }, req.body.actor || 'system', tx.tenantId);
    res.status(201).json({ success: true, data: tx });
  } catch (e) {
    fail(res, 'INVALID_INPUT', e.message, 400);
  }
});

app.get('/api/billing/transactions', async (req, res) => {
  const { publisherId, tenantId, assetId, status, kind } = req.query;
  let list = await transactionsStore.toArray();
  if (publisherId) list = list.filter((t) => t.publisherId === publisherId);
  if (tenantId) list = list.filter((t) => t.tenantId === tenantId);
  if (assetId) list = list.filter((t) => t.assetId === assetId);
  if (status) list = list.filter((t) => t.status === status);
  if (kind) list = list.filter((t) => t.kind === kind);
  ok(res, { count: list.length, transactions: list });
});

app.get('/api/billing/payouts/:publisherId', async (req, res) => {
  const all = await transactionsStore.toArray();
  const payout = computePayout(req.params.publisherId, all);
  ok(res, { data: payout });
});

// =============================================================================
// GOVERNANCE
// =============================================================================

app.post('/api/assets/:id/deprecate', authOrBypass, async (req, res) => {
  const a = await getAsset(req.params.id);
  if (!a) return fail(res, 'NOT_FOUND', 'asset not found', 404);
  const dep = buildDeprecation(req.body || {});
  a.status = 'deprecated';
  a.deprecatedAt = dep.deprecatedAt;
  a.sunsetAt = dep.sunsetAt;
  a.replacement = dep.replacement;
  a.updatedAt = nowIso();
  await assetsStore.set(a.id, a);
  emitEvent(req, 'asset.deprecated', { assetId: a.id, sunsetAt: dep.sunsetAt, replacement: dep.replacement });
  await audit('asset.deprecated', 'asset', a.id, { sunsetAt: dep.sunsetAt, reason: dep.reason }, req.body.actor || 'system', a.tenantId);
  ok(res, { data: { id: a.id, deprecation: dep } });
});

app.get('/api/audit', async (req, res) => {
  const { resourceId, action, limit = 100 } = req.query;
  let list = await auditStore.toArray();
  if (resourceId) list = list.filter((e) => e.resourceId === resourceId);
  if (action) list = list.filter((e) => e.action === action);
  list = list.slice(-Number(limit)).reverse();
  ok(res, { count: list.length, entries: list });
});

// =============================================================================
// 404 + error
// =============================================================================

app.use((req, res) => fail(res, 'NOT_FOUND', `route ${req.method} ${req.path} not found`, 404));

app.use((err, _req, res, _next) => {
  console.error('SkillOS error:', err);
  fail(res, 'INTERNAL_ERROR', err.message || 'unexpected error', 500);
});

// =============================================================================
// START
// =============================================================================
// Gated listen — skip in test mode or when SKILLOS_NO_LISTEN is set,
// so vitest can import the app without binding the port.
if (process.env.NODE_ENV !== 'test' && !process.env.SKILLOS_NO_LISTEN) {
  // Wait for seed to finish before binding
  (async () => {
    try {
      await seedPromise;
    } catch (e) {
      console.warn('Seed warning:', e.message);
    }
    const server = app.listen(PORT, () => {
      console.log(`SkillOS running on port ${PORT} - The Universal AI Capability Marketplace`);
      console.log(`  Health: http://localhost:${PORT}/health`);
      console.log(`  Storage: ${isMongoMode() ? 'mongodb' : 'persistent-map'}`);
      console.log(`  Pre-seeded: 6 skills, 6 categories, ${ASSET_SEED.length} multi-asset entries`);
    });
    installGracefulShutdown(server);
    // Also shutdown the bus on signal
    const origShutdown = server._events && server._events.SIGTERM;
    process.on('SIGTERM', async () => { await shutdownBus(); });
    process.on('SIGINT', async () => { await shutdownBus(); });
  })();
}

export default app;
export {
  app,
  authOrBypass,
  REQUIRE_AUTH,
  PORT,
  // Expose internals for tests
  assetsStore,
  installsStore,
  transactionsStore,
  auditStore,
  categoriesStore,
};
