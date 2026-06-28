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
 *   - Event-bus activation (16 event topics)
 *   - 4 stub → real conversions (memory, twin, flow, test)
 *   - Persistence abstraction (PersistentMap + optional MongoDB)
 *   - OpenAPI 3.0 spec generation with dynamic router walking
 *
 * Phase 2 (June 23, 2026) — Per-tenant isolation, version pin/rollback/upgrade/history, CLI, TS SDK, semantic vector search.
 *
 * Phase 3 (June 23, 2026) — AI creator economy: personal libraries, training dataset pipeline,
 *   model adapters, reviews + reputation + leaderboard, monetization dashboard, packs,
 *   agent enhancement, CorpID integration.
 *
 * Port: 4743
 * Pattern: in-memory + file-backed PersistentMap (default), MongoDB (opt-in via MONGODB_URI)
 */

import express from 'express';
import { mkdirSync, writeFileSync } from 'node:fs';
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
import { tenantScope, filterByTenant, stampTenant, isValidTenantId, GLOBAL } from './services/tenancy.js';
import { embed, indexAsset as indexAssetVec, removeAsset as removeAssetVec, query as vectorQuery, healthy as vectorHealthy, config as vectorConfig } from './services/embeddings.js';
import { resolveOwner, ownerExists, resolveOwners, config as corpidConfig } from './services/corpid.js';
import {
  buildDataset, buildDatasetVersion, finalizeDataset, addExamples, normalizeExamples,
  computeStats, buildModelAdapter, isValidStatus as isValidDatasetStatus, DATASET_STATUSES,
} from './services/datasets.js';
import {
  buildJob, estimateCost, submitToBackend, pollBackend, updateFromBackend,
  JOB_STATUSES, METHODS as TRAINING_METHODS, config as trainingConfig,
} from './services/training.js';
import {
  buildReview, aggregateReviews, sortReviews, setPublisherResponse,
  applyVote, flagReview, REVIEW_STATUSES, VALID_RATINGS,
} from './services/reviews.js';
import {
  buildReputation, buildLeaderboard, BADGES,
} from './services/reputation.js';
import {
  buildPlan, buildSubscription, buildPayout, buildDashboard,
  PLAN_INTERVALS, PLAN_MODELS, SUBSCRIPTION_STATUSES, PAYOUT_STATUSES, PAYOUT_METHODS,
} from './services/monetization.js';
import {
  buildLibrary, resolveDependencies, planPackInstall, buildEnhancement,
  PACK_INSTALL_BEHAVIORS,
} from './services/enhancement.js';

const PORT = process.env.PORT || 4743;
const REQUIRE_AUTH = (process.env.SKILLOS_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';

const authOrBypass = (req, res, next) => (REQUIRE_AUTH ? requireAuth(req, res, next) : next());

const MEMORYOS_URL = process.env.MEMORYOS_URL || 'http://localhost:4703';
const TWINOS_URL = process.env.TWINOS_URL || 'http://localhost:4705';
const FLOWOS_URL = process.env.FLOWOS_URL || 'http://localhost:4244';

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


requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// =============================================================================
// STORES
// =============================================================================

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
const assetsStore = createStore('assets', { serviceName: 'skill-os' });
const installsStore = createStore('installs', { serviceName: 'skill-os' });
const transactionsStore = createStore('transactions', { serviceName: 'skill-os' });
const auditStore = createStore('audit-log', { serviceName: 'skill-os' });
const librariesStore = createStore('libraries', { serviceName: 'skill-os' });
const datasetsStore = createStore('datasets', { serviceName: 'skill-os' });
const trainingJobsStore = createStore('training-jobs', { serviceName: 'skill-os' });
const modelAdaptersStore = createStore('model-adapters', { serviceName: 'skill-os' });
const reviewsStore = createStore('reviews', { serviceName: 'skill-os' });
const pricingPlansStore = createStore('pricing-plans', { serviceName: 'skill-os' });
const subscriptionsStore = createStore('subscriptions', { serviceName: 'skill-os' });
const payoutsStore = createStore('payouts', { serviceName: 'skill-os' });
const enhancementsStore = createStore('enhancements', { serviceName: 'skill-os' });

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

const ASSET_SEED = [
  { id: 'ast-agent-salesbot', assetType: 'agent-template', name: 'Sales Bot Agent',
    description: 'AI sales rep that qualifies leads and books demos',
    category: 'business', tags: ['sales', 'agent', 'crm'],
    code: null, ownerType: 'organization', ownerId: 'hojai-ai',
    publisher: 'HOJAI Official', requiredModels: ['gpt-4o', 'claude-opus-4-8'],
    supportedIndustries: ['all'], visibility: 'public' },
  { id: 'ast-workflow-onboard', assetType: 'workflow-template', name: 'Employee Onboarding',
    description: 'End-to-end onboarding flow: HRIS check, equipment, accounts, training',
    category: 'business', tags: ['hr', 'workflow', 'onboarding'],
    code: null, ownerType: 'organization', ownerId: 'hojai-ai',
    publisher: 'HOJAI Official', visibility: 'public' },
  { id: 'ast-prompts-marketing', assetType: 'prompt-pack', name: 'Marketing Prompt Pack',
    description: '50 battle-tested prompts for email, social, ads, SEO',
    category: 'marketing', tags: ['prompts', 'marketing'],
    code: null, ownerType: 'organization', ownerId: 'hojai-ai',
    publisher: 'HOJAI Official', visibility: 'public' },
  { id: 'ast-knowledge-icd10', assetType: 'knowledge-pack', name: 'ICD-10 Knowledge Pack',
    description: 'ICD-10 medical classification codes + relationships',
    category: 'healthcare', tags: ['healthcare', 'icd10', 'medical-coding'],
    code: null, ownerType: 'organization', ownerId: 'hojai-ai',
    publisher: 'HOJAI Official',
    supportedIndustries: ['healthcare'],
    compliance: { hipaa: true, gdpr: true },
    visibility: 'public' },
  { id: 'ast-conn-stripe', assetType: 'tool-connector', name: 'Stripe Connector',
    description: 'Pre-built Stripe payment integration',
    category: 'finance', tags: ['stripe', 'payments', 'connector'],
    code: null, ownerType: 'organization', ownerId: 'hojai-ai',
    publisher: 'HOJAI Official', visibility: 'public' },
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
    const skillAsset = { ...skill, assetType: 'skill' };
    await assetsStore.set(skillAsset.id, skillAsset);
    await versionsStore.set(skill.id, [{ version: '1.0.0', createdAt: skill.createdAt, code: skill.code }]);
  }

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
  const allAssets = await assetsStore.toArray();
  Promise.all(allAssets.map((a) => indexAssetVec(a).catch(() => {}))).catch(() => {});
}

let seedPromise = seed();

// =============================================================================
// HEALTH
// =============================================================================

app.get('/', async (_req, res) => {
  const [skillsCount, assetsCount, installsCount, txCount, auditCount, categoriesCount] = await Promise.all([
    skillsStore.count(), assetsStore.count(), installsStore.count(), transactionsStore.count(), auditStore.count(), categoriesStore.count(),
  ]);
  const vectorOk = await vectorHealthy();
  ok(res, {
    service: 'skill-os',
    version: '1.3.0',
    port: PORT,
    description: 'HOJAI AI SkillOS - The Universal AI Capability Marketplace',
    pillars: ['TwinOS (4705)', 'MemoryOS (4703)', 'SkillOS (4743)'],
    storage: { mode: isMongoMode() ? 'mongodb' : 'persistent-map', mongoUri: getMongoInfo() },
    vectorDb: { url: vectorConfig.VECTOR_DB_URL, healthy: vectorOk, collection: vectorConfig.COLLECTION_NAME },
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
  version: '1.3.0',
  port: PORT,
  storage: isMongoMode() ? 'mongodb' : 'persistent-map',
  timestamp: nowIso(),
}));

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

app.get('/openapi.json', (_req, res) => {
  res.json(generateOpenAPI(app));
});

/**
 * Walk the live Express router and return a `{ [path]: { method: { ... } } }`
 * map for any route not already in the hand-curated spec.
 */
function collectLivePaths(expressApp) {
  const out = {};
  if (!expressApp || !expressApp._router) return out;
  const seen = new Set();
  function walk(stack, prefix = '') {
    for (const layer of stack || []) {
      if (layer.route) {
        const path = prefix + layer.route.path;
        if (seen.has(path)) continue;
        seen.add(path);
        const oaPath = path.replace(/:([a-zA-Z_]\w*)/g, '{$1}');
        out[oaPath] = out[oaPath] || {};
        for (const stack of layer.route.stack) {
          const method = stack.method;
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
            out[oaPath][method] = {
              tags: ['auto-generated'],
              summary: `${method.toUpperCase()} ${path}`,
              responses: { '200': { description: 'OK' } },
            };
          }
        }
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        let mountPath = '';
        if (layer.regexp && layer.regexp.fast_slash) {
          mountPath = '';
        } else {
          mountPath = layer.regexp?.source
            ? layer.regexp.source.replace(/\\\//g, '/').replace(/\^/, '').replace(/\?.*$/, '').replace(/\/\(\?=\\\/\|\$\).*$/, '')
            : '';
          if (mountPath && !mountPath.startsWith('/')) mountPath = '/' + mountPath;
        }
        walk(layer.handle.stack, mountPath);
      }
    }
  }
  walk(expressApp._router.stack);
  return out;
}

function generateOpenAPI(expressApp) {
  const livePaths = collectLivePaths(expressApp);

  return {
    openapi: '3.0.3',
    info: {
      title: 'SkillOS — Universal AI Capability Marketplace',
      version: '1.3.0',
      description: 'Registry, runtime, and marketplace for AI capabilities. One of the 3 HOJAI AI foundational pillars.',
      contact: { name: 'HOJAI AI', url: 'https://hojai.ai' },
    },
    servers: [{ url: `http://localhost:${PORT}`, description: 'Local' }],
    tags: [
      { name: 'health', description: 'Health + metadata' },
      { name: 'skills', description: 'Skill registry (CRUD)' },
      { name: 'assets', description: 'Multi-asset registry' },
      { name: 'installs', description: 'Per-tenant asset install registry' },
      { name: 'billing', description: 'Billing transactions + payouts' },
      { name: 'governance', description: 'Deprecation + compliance + audit' },
      { name: 'sdk', description: 'SDK / OpenAPI' },
    ],
    paths: {
      '/': { get: { tags: ['health'], summary: 'Service metadata + counts', responses: { '200': { description: 'OK' } } } },
      '/health': { get: { tags: ['health'], summary: 'Health check', responses: { '200': { description: 'Healthy' } } } },
      '/ready': { get: { tags: ['health'], summary: 'Readiness probe', responses: { '200': { description: 'Ready' } } } },
      '/openapi.json': { get: { tags: ['sdk'], summary: 'OpenAPI 3.0 spec', responses: { '200': { description: 'OK' } } } },
      '/api/skills': { get: { tags: ['skills'], summary: 'List skills', responses: { '200': { description: 'OK' } } }, post: { tags: ['skills'], summary: 'Create a skill', responses: { '201': { description: 'Created' } } } },
      '/api/skills/{id}': { get: { tags: ['skills'], summary: 'Get a skill', responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } } }, put: { tags: ['skills'], summary: 'Update a skill', responses: { '200': { description: 'OK' } } }, delete: { tags: ['skills'], summary: 'Delete a skill', responses: { '200': { description: 'OK' } } } },
      '/api/skills/{id}/execute': { post: { tags: ['skills'], summary: 'Execute a skill', responses: { '200': { description: 'OK' }, '500': { description: 'Execution failed' } } } },
      '/api/skills/compose': { post: { tags: ['skills'], summary: 'Compose multiple skills', responses: { '200': { description: 'OK' } } } },
      '/api/skills/{id}/learn': { post: { tags: ['skills'], summary: 'Submit learning feedback', responses: { '200': { description: 'OK' } } } },
      '/api/skills/{id}/versions': { get: { tags: ['skills'], summary: 'List versions', responses: { '200': { description: 'OK' } } }, post: { tags: ['skills'], summary: 'Publish a new version', responses: { '201': { description: 'Created' } } } },
      '/api/skills/{id}/permissions': { get: { tags: ['skills'], summary: 'List permissions', responses: { '200': { description: 'OK' } } }, post: { tags: ['skills'], summary: 'Add a permission', responses: { '201': { description: 'Created' } } } },
      '/api/skills/{id}/analytics': { get: { tags: ['skills'], summary: 'Get analytics for a skill', responses: { '200': { description: 'OK' } } } },
      '/api/skills/{id}/dependencies': { get: { tags: ['skills'], summary: 'List dependencies', responses: { '200': { description: 'OK' } } }, post: { tags: ['skills'], summary: 'Add a dependency', responses: { '200': { description: 'OK' } } } },
      '/api/skills/{id}/events': { get: { tags: ['skills'], summary: 'List events', responses: { '200': { description: 'OK' } } } },
      '/api/skills/{id}/policies': { put: { tags: ['skills'], summary: 'Update policies', responses: { '200': { description: 'OK' } } } },
      '/api/skills/{id}/memory': { post: { tags: ['skills'], summary: 'Skill ↔ MemoryOS', responses: { '200': { description: 'OK' }, '503': { description: 'MemoryOS unreachable' } } } },
      '/api/skills/{id}/twin': { post: { tags: ['skills'], summary: 'Skill ↔ TwinOS', responses: { '200': { description: 'OK' }, '503': { description: 'TwinOS unreachable' } } } },
      '/api/skills/{id}/flow': { post: { tags: ['skills'], summary: 'Skill ↔ FlowOS', responses: { '200': { description: 'OK' }, '503': { description: 'FlowOS unreachable' } } } },
      '/api/skills/{id}/test': { post: { tags: ['skills'], summary: 'Test a skill', responses: { '200': { description: 'OK' }, '422': { description: 'Test failed' } } } },
      '/api/skills/{id}/monitoring': { get: { tags: ['skills'], summary: 'Monitor a skill', responses: { '200': { description: 'OK' } } } },
      '/api/assets': { get: { tags: ['assets'], summary: 'List all assets (multi-type)', responses: { '200': { description: 'OK' } } }, post: { tags: ['assets'], summary: 'Create an asset', responses: { '201': { description: 'Created' } } } },
      '/api/assets/{id}': { get: { tags: ['assets'], summary: 'Get an asset', responses: { '200': { description: 'OK' } } }, put: { tags: ['assets'], summary: 'Update an asset', responses: { '200': { description: 'OK' } } }, delete: { tags: ['assets'], summary: 'Delete an asset', responses: { '200': { description: 'OK' } } } },
      '/api/assets/{id}/install': { post: { tags: ['installs'], summary: 'Install an asset for a tenant', responses: { '201': { description: 'Installed' } } } },
      '/api/assets/{id}/certify': { post: { tags: ['governance'], summary: 'Certify an asset', responses: { '200': { description: 'OK' } } } },
      '/api/assets/{id}/deprecate': { post: { tags: ['governance'], summary: 'Deprecate an asset', responses: { '200': { description: 'OK' } } } },
      '/api/installed': { get: { tags: ['installs'], summary: 'List installed assets', responses: { '200': { description: 'OK' } } } },
      '/api/installed/{id}': { delete: { tags: ['installs'], summary: 'Uninstall an asset', responses: { '200': { description: 'OK' } } } },
      '/api/billing/charge': { post: { tags: ['billing'], summary: 'Record a charge', responses: { '201': { description: 'Created' } } } },
      '/api/billing/transactions': { get: { tags: ['billing'], summary: 'List transactions', responses: { '200': { description: 'OK' } } } },
      '/api/billing/payouts/{publisherId}': { get: { tags: ['billing'], summary: 'Compute payout for a publisher', responses: { '200': { description: 'OK' } } } },
      '/api/audit': { get: { tags: ['governance'], summary: 'Audit log', responses: { '200': { description: 'OK' } } } },
      ...livePaths,
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
// 1. SKILL REGISTRY
// =============================================================================

app.post('/api/skills',requireAuth,  authOrBypass, async (req, res) => {
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
  list = list.map(fillMetadata);
  ok(res, { count: list.length, skills: list });
});

app.get('/api/skills/categories', async (_req, res) => {
  const cats = await categoriesStore.toArray();
  ok(res, { count: cats.length, categories: cats });
});

app.post('/api/skills/categories',requireAuth,  authOrBypass, async (req, res) => {
  const { id, name, description = '' } = req.body || {};
  if (!id || !name) return fail(res, 'INVALID_INPUT', 'id and name required');
  if (await categoriesStore.has(id)) return fail(res, 'CONFLICT', 'category exists');
  const c = { id, name, description };
  await categoriesStore.set(id, c);
  res.status(201).json({ success: true, data: c });
});

app.get('/api/skills/discover', async (req, res) => {
  const { q, category, tag, semantic } = req.query;
  if (semantic === 'true' && q) {
    const matches = await vectorQuery(String(q), 25);
    if (matches === null) {
      return fail(res, 'UPSTREAM_UNREACHABLE', `vector-db at ${vectorConfig.VECTOR_DB_URL} is unreachable`, 503);
    }
    if (matches.length === 0) {
      return ok(res, { count: 0, discovered: [], mode: 'semantic' });
    }
    const assets = await Promise.all(matches.map((m) => getAsset(m.id)));
    const ranked = assets.filter(Boolean).map((a, i) => ({ ...a, _score: matches[i]?.score }));
    return ok(res, { count: ranked.length, discovered: ranked.map((a) => { delete a._score; return fillMetadata(a); }), mode: 'semantic' });
  }
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
  const analytics = await Promise.all(list.map((s) => analyticsStore.get(s.id)));
  list.sort((a, b) => {
    const aa = analytics[list.indexOf(a)]?.calls || 0;
    const bb = analytics[list.indexOf(b)]?.calls || 0;
    if (bb !== aa) return bb - aa;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
  emitEvent(req, 'skill.recommendation_requested', { q, category, tag, results: list.length });
  ok(res, { count: list.length, discovered: list.slice(0, 25).map(fillMetadata), mode: 'keyword' });
});

app.get('/api/discover/semantic', async (req, res) => {
  const { q, k = 10, type } = req.query;
  if (!q) return fail(res, 'INVALID_INPUT', 'q (query) is required');
  const matches = await vectorQuery(String(q), Number(k) || 10);
  if (matches === null) {
    return fail(res, 'UPSTREAM_UNREACHABLE', `vector-db at ${vectorConfig.VECTOR_DB_URL} is unreachable`, 503);
  }
  const assets = await Promise.all(matches.map((m) => getAsset(m.id)));
  let results = assets.filter(Boolean).map((a, i) => ({ ...a, score: matches[i]?.score }));
  if (type) results = results.filter((a) => a.assetType === type);
  ok(res, { count: results.length, results });
});

app.get('/api/recommend', async (req, res) => {
  const { for: forId, k = 5 } = req.query;
  if (!forId) return fail(res, 'INVALID_INPUT', '?for=<assetId> is required');
  const a = await getAsset(forId);
  if (!a) return fail(res, 'NOT_FOUND', 'asset not found', 404);
  const text = [a.name, a.description, ...(a.tags || []), a.category].filter(Boolean).join(' ');
  const matches = await vectorQuery(text, Number(k) + 1 || 6);
  if (matches === null) {
    return fail(res, 'UPSTREAM_UNREACHABLE', `vector-db at ${vectorConfig.VECTOR_DB_URL} is unreachable`, 503);
  }
  const filtered = matches.filter((m) => m.id !== forId).slice(0, Number(k) || 5);
  const assets = await Promise.all(filtered.map((m) => getAsset(m.id)));
  const results = assets.filter(Boolean).map((a, i) => ({ ...a, score: filtered[i]?.score }));
  ok(res, { count: results.length, for: forId, results });
});

app.get('/api/skills/marketplace', async (req, res) => {
  const { category, provider } = req.query;
  let list = await skillMarketplaceStore.toArray();
  if (category) list = list.filter((s) => s.category === category);
  if (provider) list = list.filter((s) => s.provider === provider);
  ok(res, { count: list.length, listings: list });
});

app.post('/api/skills/marketplace',requireAuth,  authOrBypass, async (req, res) => {
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

app.put('/api/skills/:id',requireAuth,  authOrBypass, async (req, res) => {
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

app.delete('/api/skills/:id',requireAuth,  authOrBypass, async (req, res) => {
  if (!(await skillsStore.has(req.params.id))) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  await skillsStore.delete(req.params.id);
  logEvent(req.params.id, 'deleted', {});
  emitEvent(req, 'skill.unregistered', { skillId: req.params.id });
  await audit('skill.deleted', 'skill', req.params.id, {}, req.body.actor || 'system', null);
  ok(res, { deleted: req.params.id });
});

// =============================================================================
// 2. SKILL RUNTIME
// =============================================================================

app.post('/api/skills/:id/execute',requireAuth,  authOrBypass, async (req, res) => {
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
    const code = s.code || 'return null;';
    const sandbox = {
      input, ctx,
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

app.post('/api/skills/compose',requireAuth,  authOrBypass, async (req, res) => {
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

app.post('/api/skills/:id/learn',requireAuth,  authOrBypass, async (req, res) => {
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

app.post('/api/skills/:id/versions',requireAuth,  authOrBypass, async (req, res) => {
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

app.post('/api/skills/:id/permissions',requireAuth,  authOrBypass, async (req, res) => {
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

app.post('/api/skill-templates',requireAuth,  authOrBypass, async (req, res) => {
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

app.post('/api/skill-templates/:id/instantiate',requireAuth,  authOrBypass, async (req, res) => {
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

app.post('/api/skills/:id/dependencies',requireAuth,  authOrBypass, async (req, res) => {
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
// 13. SKILL POLICIES
// =============================================================================

app.put('/api/skills/:id/policies',requireAuth,  authOrBypass, async (req, res) => {
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
// 14-16. SKILL INTEGRATIONS (real upstream calls)
// =============================================================================

app.post('/api/skills/:id/memory',requireAuth,  authOrBypass, async (req, res) => {
  const s = await getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const { op = 'read', memoryId, data, partition } = req.body || {};
  const partitionKey = partition || `skill:${s.id}`;
  const url = `${MEMORYOS_URL}/api/memories/${op === 'read' ? (memoryId || 'latest') : ''}`;
  const r = op === 'read'
    ? await httpGet(url, { timeoutMs: 2000 })
    : await httpPost(`${MEMORYOS_URL}/api/memories`, { partition: partitionKey, skillId: s.id, data, memoryId }, { timeoutMs: 2000 });
  if (!r.ok && r.status === 0) {
    return fail(res, 'UPSTREAM_UNREACHABLE', `MemoryOS at ${MEMORYOS_URL} is unreachable: ${r.error || 'timeout'}`, 503);
  }
  ok(res, { op, skillId: s.id, partition: partitionKey, memoryId, upstream: { url: MEMORYOS_URL, status: r.status, data: r.data } });
});

app.post('/api/skills/:id/twin',requireAuth,  authOrBypass, async (req, res) => {
  // Accept either a skill id (in skillsStore) or an asset id of type=skill (in assetsStore)
  let s = await getSkill(req.params.id);
  if (!s) {
    const a = await getAsset(req.params.id);
    if (a && a.assetType === 'skill') s = a;
  }
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

app.post('/api/skills/:id/flow',requireAuth,  authOrBypass, async (req, res) => {
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
// 18. SKILL TESTING (real VM execution)
// =============================================================================

app.post('/api/skills/:id/test',requireAuth,  authOrBypass, async (req, res) => {
  let s = await getSkill(req.params.id);
  if (!s) {
    const a = await getAsset(req.params.id);
    if (a && a.assetType === 'skill') s = a;
  }
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const { input, mock = false, ctx = {} } = req.body || {};
  const id = uuidv4();
  const start = Date.now();
  let result, success = true, error = null;
  if (mock) {
    result = { ok: true, mock: true, input, output: { echoed: input, sandbox: 'mock' } };
  } else {
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
// 19. SKILL MONITORING
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
// MULTI-ASSET REGISTRY
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

app.post('/api/assets',requireAuth,  authOrBypass, async (req, res) => {
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
    indexAssetVec(asset).catch(() => {});
    if (assetType === 'pack') {
      const memberIds = Array.isArray(req.body.memberAssetIds) ? req.body.memberAssetIds : [];
      const installBehavior = PACK_INSTALL_BEHAVIORS.includes(req.body.installBehavior) ? req.body.installBehavior : 'best-effort';
      asset.memberAssetIds = memberIds;
      asset.installBehavior = installBehavior;
      await assetsStore.set(id, asset);
    }
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

app.put('/api/assets/:id',requireAuth,  authOrBypass, async (req, res) => {
  const a = await getAsset(req.params.id);
  if (!a) return fail(res, 'NOT_FOUND', 'asset not found', 404);
  try {
    validateMetadata(req.body);
    const updatable = ['name','description','tags','code','version','permissions','rateLimit','budget','requiresApproval','status','metadata','publisher','requiredModels','supportedLanguages','supportedIndustries','license','pricingModel','price','visibility','inputSchema','outputSchema','compliance','featured','trending'];
    for (const k of updatable) if (k in req.body) a[k] = req.body[k];
    a.updatedAt = nowIso();
    await assetsStore.set(a.id, a);
    emitEvent(req, 'asset.updated', { assetId: a.id, fields: Object.keys(req.body) });
    await audit('asset.updated', 'asset', a.id, { fields: Object.keys(req.body) }, req.body.actor || 'system', a.tenantId);
    indexAssetVec(a).catch(() => {});
    ok(res, { data: fillMetadata(a) });
  } catch (e) {
    fail(res, 'INVALID_INPUT', e.message, 400);
  }
});

app.delete('/api/assets/:id',requireAuth,  authOrBypass, async (req, res) => {
  if (!(await assetsStore.has(req.params.id))) return fail(res, 'NOT_FOUND', 'asset not found', 404);
  await assetsStore.delete(req.params.id);
  emitEvent(req, 'asset.unregistered', { assetId: req.params.id });
  await audit('asset.deleted', 'asset', req.params.id, {}, req.body.actor || 'system', null);
  removeAssetVec(req.params.id).catch(() => {});
  ok(res, { deleted: req.params.id });
});

// =============================================================================
// INSTALL REGISTRY
// =============================================================================

app.post('/api/assets/:id/install',requireAuth,  authOrBypass, async (req, res) => {
  const a = await getAsset(req.params.id);
  if (!a) return fail(res, 'NOT_FOUND', 'asset not found', 404);
  const { tenantId, version } = req.body || {};
  if (!tenantId) return fail(res, 'INVALID_INPUT', 'tenantId required');
  const id = `ins-${uuidv4().slice(0, 8)}`;
  const initialVersion = version || a.version;
  const install = {
    id, assetId: a.id, assetType: a.assetType, tenantId,
    version: initialVersion,
    status: 'installed',
    installedAt: nowIso(),
    pinnedVersion: !!version,
    versionHistory: [{ version: initialVersion, action: 'install', at: nowIso() }],
  };
  await installsStore.set(id, install);
  if (a.assetType === 'skill' && a.code) {
    const localSkill = { ...a, id: `${a.id}-local-${tenantId.slice(0, 6)}`, tenantId, version: initialVersion };
    await skillsStore.set(localSkill.id, localSkill);
  }
  a.totalDownloads = (a.totalDownloads || 0) + 1;
  await assetsStore.set(a.id, a);
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
  const scope = tenantScope(req, { allowQuery: true });
  let list = await installsStore.toArray();
  if (!scope.isGlobal) {
    list = list.filter((i) => !i.tenantId || i.tenantId === scope.tenantId);
  }
  if (tenantId) list = list.filter((i) => i.tenantId === tenantId);
  if (assetType) list = list.filter((i) => i.assetType === assetType);
  ok(res, { count: list.length, installs: list, scope: { tenantId: scope.tenantId, isGlobal: scope.isGlobal } });
});

app.delete('/api/installed/:id',requireAuth,  authOrBypass, async (req, res) => {
  const install = await installsStore.get(req.params.id);
  if (!install) return fail(res, 'NOT_FOUND', 'install not found', 404);
  install.status = 'uninstalled';
  install.uninstalledAt = nowIso();
  await installsStore.set(install.id, install);
  emitEvent(req, 'asset.uninstalled', { installId: install.id, assetId: install.assetId, tenantId: install.tenantId });
  await audit('asset.uninstalled', 'asset', install.assetId, { installId: install.id, tenantId: install.tenantId }, req.body.actor || 'system', install.tenantId);
  ok(res, { data: install });
});

app.post('/api/installed/:id/pin',requireAuth,  authOrBypass, async (req, res) => {
  const install = await installsStore.get(req.params.id);
  if (!install) return fail(res, 'NOT_FOUND', 'install not found', 404);
  install.pinnedVersion = true;
  install.pinnedAt = nowIso();
  install.versionHistory.push({ version: install.version, action: 'pin', at: nowIso() });
  await installsStore.set(install.id, install);
  emitEvent(req, 'asset.pinned', { installId: install.id, assetId: install.assetId, version: install.version });
  await audit('install.pinned', 'install', install.id, { version: install.version }, req.body.actor || 'system', install.tenantId);
  ok(res, { data: install });
});

app.post('/api/installed/:id/upgrade',requireAuth,  authOrBypass, async (req, res) => {
  const install = await installsStore.get(req.params.id);
  if (!install) return fail(res, 'NOT_FOUND', 'install not found', 404);
  const asset = await getAsset(install.assetId);
  if (!asset) return fail(res, 'NOT_FOUND', 'asset no longer exists', 404);
  if (install.pinnedVersion) {
    return fail(res, 'PINNED', 'install is pinned — unpin first to upgrade', 409);
  }
  const fromVersion = install.version;
  install.version = asset.version;
  install.versionHistory.push({ version: asset.version, action: 'upgrade', from: fromVersion, at: nowIso() });
  install.upgradedAt = nowIso();
  await installsStore.set(install.id, install);
  emitEvent(req, 'asset.upgraded', { installId: install.id, assetId: install.assetId, from: fromVersion, to: asset.version });
  await audit('install.upgraded', 'install', install.id, { from: fromVersion, to: asset.version }, req.body.actor || 'system', install.tenantId);
  ok(res, { data: install });
});

app.post('/api/installed/:id/rollback',requireAuth,  authOrBypass, async (req, res) => {
  const install = await installsStore.get(req.params.id);
  if (!install) return fail(res, 'NOT_FOUND', 'install not found', 404);
  const history = install.versionHistory || [];
  const current = install.version;
  let previous = null;
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    if (entry.version !== current) { previous = entry.version; break; }
  }
  if (!previous) {
    return fail(res, 'NO_PREVIOUS_VERSION', 'no previous version in history to rollback to', 409);
  }
  install.version = previous;
  install.versionHistory.push({ version: previous, action: 'rollback', from: current, at: nowIso() });
  install.rolledBackAt = nowIso();
  await installsStore.set(install.id, install);
  emitEvent(req, 'asset.rolled_back', { installId: install.id, assetId: install.assetId, from: current, to: previous });
  await audit('install.rolled_back', 'install', install.id, { from: current, to: previous }, req.body.actor || 'system', install.tenantId);
  ok(res, { data: install });
});

app.get('/api/installed/:id/history', async (req, res) => {
  const install = await installsStore.get(req.params.id);
  if (!install) return fail(res, 'NOT_FOUND', 'install not found', 404);
  ok(res, {
    installId: install.id,
    assetId: install.assetId,
    currentVersion: install.version,
    pinned: !!install.pinnedVersion,
    history: install.versionHistory || [],
  });
});

// =============================================================================
// CERTIFICATION
// =============================================================================

app.post('/api/assets/:id/certify',requireAuth,  authOrBypass, async (req, res) => {
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

app.post('/api/billing/charge',requireAuth,  authOrBypass, async (req, res) => {
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
  const scope = tenantScope(req, { allowQuery: true });
  let list = await transactionsStore.toArray();
  if (!scope.isGlobal) {
    list = list.filter((t) => !t.tenantId || t.tenantId === scope.tenantId);
  }
  if (publisherId) list = list.filter((t) => t.publisherId === publisherId);
  if (tenantId) list = list.filter((t) => t.tenantId === tenantId);
  if (assetId) list = list.filter((t) => t.assetId === assetId);
  if (status) list = list.filter((t) => t.status === status);
  if (kind) list = list.filter((t) => t.kind === kind);
  ok(res, { count: list.length, transactions: list, scope: { tenantId: scope.tenantId, isGlobal: scope.isGlobal } });
});

app.get('/api/billing/payouts/:publisherId', async (req, res) => {
  const all = await transactionsStore.toArray();
  const payout = computePayout(req.params.publisherId, all);
  ok(res, { data: payout });
});

// =============================================================================
// GOVERNANCE
// =============================================================================

app.post('/api/assets/:id/deprecate',requireAuth,  authOrBypass, async (req, res) => {
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
  const scope = tenantScope(req, { allowQuery: true });
  let list = await auditStore.toArray();
  if (!scope.isGlobal) {
    list = list.filter((e) => !e.tenantId || e.tenantId === scope.tenantId);
  }
  if (resourceId) list = list.filter((e) => e.resourceId === resourceId);
  if (action) list = list.filter((e) => e.action === action);
  list = list.slice(-Number(limit)).reverse();
  ok(res, { count: list.length, entries: list, scope: { tenantId: scope.tenantId, isGlobal: scope.isGlobal } });
});

// =============================================================================
// PHASE 3: PERSONAL SKILL LIBRARIES
// =============================================================================

app.post('/api/libraries',requireAuth,  authOrBypass, async (req, res) => {
  try {
    const lib = buildLibrary(req.body);
    await librariesStore.set(lib.id, lib);
    emitEvent(req, 'library.created', { libraryId: lib.id, ownerId: lib.ownerId });
    await audit('library.created', 'library', lib.id, { name: lib.name, ownerId: lib.ownerId }, req.body.actor || 'system', null);
    res.status(201).json({ success: true, data: lib });
  } catch (e) { fail(res, 'INVALID_INPUT', e.message, 400); }
});

app.get('/api/libraries', async (req, res) => {
  const { ownerId, visibility } = req.query;
  let list = await librariesStore.toArray();
  if (ownerId) list = list.filter((l) => l.ownerId === ownerId);
  if (visibility) list = list.filter((l) => l.visibility === visibility);
  ok(res, { count: list.length, libraries: list });
});

app.get('/api/libraries/:id', async (req, res) => {
  const lib = await librariesStore.get(req.params.id);
  if (!lib) return fail(res, 'NOT_FOUND', 'library not found', 404);
  ok(res, { data: lib });
});

app.put('/api/libraries/:id',requireAuth,  authOrBypass, async (req, res) => {
  const lib = await librariesStore.get(req.params.id);
  if (!lib) return fail(res, 'NOT_FOUND', 'library not found', 404);
  const updatable = ['name', 'description', 'visibility'];
  for (const k of updatable) if (k in req.body) lib[k] = req.body[k];
  lib.updatedAt = nowIso();
  await librariesStore.set(lib.id, lib);
  ok(res, { data: lib });
});

app.delete('/api/libraries/:id',requireAuth,  authOrBypass, async (req, res) => {
  if (!(await librariesStore.has(req.params.id))) return fail(res, 'NOT_FOUND', 'library not found', 404);
  await librariesStore.delete(req.params.id);
  ok(res, { deleted: req.params.id });
});

app.post('/api/libraries/:id/skills/:assetId',requireAuth,  authOrBypass, async (req, res) => {
  const lib = await librariesStore.get(req.params.id);
  if (!lib) return fail(res, 'NOT_FOUND', 'library not found', 404);
  const a = await assetsStore.get(req.params.assetId);
  if (!a) return fail(res, 'NOT_FOUND', 'asset not found', 404);
  if (!lib.skillIds.includes(req.params.assetId)) {
    lib.skillIds.push(req.params.assetId);
    lib.updatedAt = nowIso();
    await librariesStore.set(lib.id, lib);
  }
  ok(res, { data: lib });
});

app.delete('/api/libraries/:id/skills/:assetId',requireAuth,  authOrBypass, async (req, res) => {
  const lib = await librariesStore.get(req.params.id);
  if (!lib) return fail(res, 'NOT_FOUND', 'library not found', 404);
  lib.skillIds = lib.skillIds.filter((s) => s !== req.params.assetId);
  lib.updatedAt = nowIso();
  await librariesStore.set(lib.id, lib);
  ok(res, { data: lib });
});

app.get('/api/libraries/:id/skills', async (req, res) => {
  const lib = await librariesStore.get(req.params.id);
  if (!lib) return fail(res, 'NOT_FOUND', 'library not found', 404);
  const skills = await Promise.all(lib.skillIds.map((id) => assetsStore.get(id)));
  const valid = skills.filter(Boolean).map(fillMetadata);
  ok(res, { count: valid.length, skills: valid });
});

app.post('/api/libraries/:id/agents/:agentId',requireAuth,  authOrBypass, async (req, res) => {
  const lib = await librariesStore.get(req.params.id);
  if (!lib) return fail(res, 'NOT_FOUND', 'library not found', 404);
  const agent = await resolveOwner(req.params.agentId, { expectedType: 'agent' });
  if (!agent.exists) return fail(res, 'AGENT_NOT_FOUND', `agent ${req.params.agentId} not found`, 404);
  if (!lib.agentRefs.includes(req.params.agentId)) {
    lib.agentRefs.push(req.params.agentId);
    lib.updatedAt = nowIso();
    await librariesStore.set(lib.id, lib);
    emitEvent(req, 'library.bound_to_agent', { libraryId: lib.id, agentId: req.params.agentId });
  }
  ok(res, { data: lib });
});

// =============================================================================
// PHASE 3: TRAINING DATASETS
// =============================================================================

app.post('/api/datasets',requireAuth,  authOrBypass, async (req, res) => {
  try {
    const ds = buildDataset(req.body);
    await datasetsStore.set(ds.id, ds);
    emitEvent(req, 'dataset.created', { datasetId: ds.id, ownerId: ds.ownerId, skillId: ds.skillId });
    res.status(201).json({ success: true, data: ds });
  } catch (e) { fail(res, 'INVALID_INPUT', e.message, 400); }
});

app.get('/api/datasets', async (req, res) => {
  const { ownerId, skillId, status } = req.query;
  let list = await datasetsStore.toArray();
  if (ownerId) list = list.filter((d) => d.ownerId === ownerId);
  if (skillId) list = list.filter((d) => d.skillId === skillId);
  if (status) list = list.filter((d) => d.status === status);
  ok(res, { count: list.length, datasets: list });
});

app.get('/api/datasets/:id', async (req, res) => {
  const ds = await datasetsStore.get(req.params.id);
  if (!ds) return fail(res, 'NOT_FOUND', 'dataset not found', 404);
  ok(res, { data: ds });
});

app.put('/api/datasets/:id',requireAuth,  authOrBypass, async (req, res) => {
  const ds = await datasetsStore.get(req.params.id);
  if (!ds) return fail(res, 'NOT_FOUND', 'dataset not found', 404);
  if (ds.status !== 'draft') return fail(res, 'NOT_DRAFT', 'cannot edit a finalized or archived dataset', 409);
  const updatable = ['name', 'description', 'tags'];
  for (const k of updatable) if (k in req.body) ds[k] = req.body[k];
  ds.updatedAt = nowIso();
  await datasetsStore.set(ds.id, ds);
  ok(res, { data: ds });
});

app.post('/api/datasets/:id/examples',requireAuth,  authOrBypass, async (req, res) => {
  const ds = await datasetsStore.get(req.params.id);
  if (!ds) return fail(res, 'NOT_FOUND', 'dataset not found', 404);
  try {
    const { examples } = req.body || {};
    if (!Array.isArray(examples)) return fail(res, 'INVALID_INPUT', 'examples must be an array');
    const updated = addExamples(ds, examples);
    await datasetsStore.set(ds.id, updated);
    ok(res, { data: updated });
  } catch (e) { fail(res, 'INVALID_INPUT', e.message, 400); }
});

app.post('/api/datasets/:id/finalize',requireAuth,  authOrBypass, async (req, res) => {
  const ds = await datasetsStore.get(req.params.id);
  if (!ds) return fail(res, 'NOT_FOUND', 'dataset not found', 404);
  try {
    const finalized = finalizeDataset(ds);
    await datasetsStore.set(ds.id, finalized);
    emitEvent(req, 'dataset.finalized', { datasetId: ds.id });
    ok(res, { data: finalized });
  } catch (e) { fail(res, 'INVALID_INPUT', e.message, 400); }
});

app.post('/api/datasets/:id/version',requireAuth,  authOrBypass, async (req, res) => {
  const parent = await datasetsStore.get(req.params.id);
  if (!parent) return fail(res, 'NOT_FOUND', 'dataset not found', 404);
  try {
    const next = buildDatasetVersion(parent, req.body || {});
    await datasetsStore.set(next.id, next);
    emitEvent(req, 'dataset.versioned', { datasetId: next.id, parentVersionId: parent.id, version: next.version });
    res.status(201).json({ success: true, data: next });
  } catch (e) { fail(res, 'INVALID_INPUT', e.message, 400); }
});

app.delete('/api/datasets/:id',requireAuth,  authOrBypass, async (req, res) => {
  const ds = await datasetsStore.get(req.params.id);
  if (!ds) return fail(res, 'NOT_FOUND', 'dataset not found', 404);
  ds.status = 'archived';
  ds.archivedAt = nowIso();
  await datasetsStore.set(ds.id, ds);
  ok(res, { data: ds });
});

// =============================================================================
// PHASE 3: TRAINING JOBS
// =============================================================================

app.post('/api/training/jobs',requireAuth,  authOrBypass, async (req, res) => {
  try {
    const job = buildJob(req.body);
    await trainingJobsStore.set(job.id, job);
    const r = await submitToBackend(job);
    if (r.ok && r.backendId) {
      job.backendId = r.backendId;
      await trainingJobsStore.set(job.id, job);
    }
    emitEvent(req, 'training.submitted', { jobId: job.id, datasetId: job.datasetId, backendOk: r.ok, backendError: r.error || null });
    res.status(201).json({ success: true, data: job, backend: r });
  } catch (e) { fail(res, 'INVALID_INPUT', e.message, 400); }
});

app.get('/api/training/jobs', async (req, res) => {
  const { ownerId, skillId, status } = req.query;
  let list = await trainingJobsStore.toArray();
  if (ownerId) list = list.filter((j) => j.createdBy === ownerId);
  if (skillId) list = list.filter((j) => j.skillId === skillId);
  if (status) list = list.filter((j) => j.status === status);
  ok(res, { count: list.length, jobs: list });
});

app.get('/api/training/jobs/:id', async (req, res) => {
  const job = await trainingJobsStore.get(req.params.id);
  if (!job) return fail(res, 'NOT_FOUND', 'job not found', 404);
  ok(res, { data: job });
});

app.post('/api/training/jobs/:id/sync',requireAuth,  authOrBypass, async (req, res) => {
  const job = await trainingJobsStore.get(req.params.id);
  if (!job) return fail(res, 'NOT_FOUND', 'job not found', 404);
  if (!job.backendId) {
    return fail(res, 'NO_BACKEND', 'job has no backend id (backend was unreachable at submit time); manual status update required', 409);
  }
  const r = await pollBackend(job.backendId);
  if (!r.ok) {
    return fail(res, 'BACKEND_UNREACHABLE', `backend poll failed: ${r.error}`, 503);
  }
  const updated = updateFromBackend(job, r.status);
  await trainingJobsStore.set(updated.id, updated);
  if (updated.status === 'completed' && updated.resultModelAdapterId && !(await modelAdaptersStore.has(updated.resultModelAdapterId))) {
    const adapter = buildModelAdapter({
      name: `${updated.skillId} (${updated.method} on ${updated.baseModel})`,
      skillId: updated.skillId,
      ownerId: updated.createdBy,
      baseModel: updated.baseModel,
      method: updated.method,
      datasetId: updated.datasetId,
      jobId: updated.id,
    });
    adapter.id = updated.resultModelAdapterId;
    await modelAdaptersStore.set(adapter.id, adapter);
    emitEvent(req, 'training.completed', { jobId: updated.id, adapterId: adapter.id });
  }
  ok(res, { data: updated });
});

app.post('/api/training/jobs/:id/cancel',requireAuth,  authOrBypass, async (req, res) => {
  const job = await trainingJobsStore.get(req.params.id);
  if (!job) return fail(res, 'NOT_FOUND', 'job not found', 404);
  if (!['queued', 'running'].includes(job.status)) {
    return fail(res, 'NOT_CANCELLABLE', `cannot cancel a ${job.status} job`, 409);
  }
  job.status = 'cancelled';
  job.completedAt = nowIso();
  await trainingJobsStore.set(job.id, job);
  emitEvent(req, 'training.cancelled', { jobId: job.id });
  ok(res, { data: job });
});

// =============================================================================
// PHASE 3: MODEL ADAPTERS
// =============================================================================

app.post('/api/adapters',requireAuth,  authOrBypass, async (req, res) => {
  try {
    const adapter = buildModelAdapter(req.body);
    await modelAdaptersStore.set(adapter.id, adapter);
    res.status(201).json({ success: true, data: adapter });
  } catch (e) { fail(res, 'INVALID_INPUT', e.message, 400); }
});

app.get('/api/adapters', async (req, res) => {
  const { ownerId, skillId, baseModel } = req.query;
  let list = await modelAdaptersStore.toArray();
  if (ownerId) list = list.filter((a) => a.ownerId === ownerId);
  if (skillId) list = list.filter((a) => a.skillId === skillId);
  if (baseModel) list = list.filter((a) => a.baseModel === baseModel);
  ok(res, { count: list.length, adapters: list });
});

app.get('/api/adapters/:id', async (req, res) => {
  const a = await modelAdaptersStore.get(req.params.id);
  if (!a) return fail(res, 'NOT_FOUND', 'adapter not found', 404);
  ok(res, { data: a });
});

app.put('/api/adapters/:id',requireAuth,  authOrBypass, async (req, res) => {
  const a = await modelAdaptersStore.get(req.params.id);
  if (!a) return fail(res, 'NOT_FOUND', 'adapter not found', 404);
  const updatable = ['name', 'status', 'endpoint'];
  for (const k of updatable) if (k in req.body) a[k] = req.body[k];
  a.updatedAt = nowIso();
  await modelAdaptersStore.set(a.id, a);
  ok(res, { data: a });
});

// =============================================================================
// PHASE 3: REVIEWS
// =============================================================================

app.post('/api/assets/:id/reviews',requireAuth,  authOrBypass, async (req, res) => {
  try {
    const a = await assetsStore.get(req.params.id);
    if (!a) return fail(res, 'NOT_FOUND', 'asset not found', 404);
    const review = buildReview({ ...req.body, assetId: req.params.id });
    await reviewsStore.set(review.id, review);
    emitEvent(req, 'review.created', { reviewId: review.id, assetId: a.id, rating: review.rating });
    await audit('review.created', 'asset', a.id, { rating: review.rating, reviewerId: review.reviewerId }, req.body.actor || 'system', null);
    res.status(201).json({ success: true, data: review });
  } catch (e) { fail(res, 'INVALID_INPUT', e.message, 400); }
});

app.get('/api/assets/:id/reviews', async (req, res) => {
  const { rating, sort = 'helpful', limit = 50 } = req.query;
  let list = await reviewsStore.filter((r) => r.assetId === req.params.id);
  if (rating) list = list.filter((r) => r.rating === Number(rating));
  list = sortReviews(list, String(sort));
  list = list.slice(0, Number(limit));
  const agg = aggregateReviews(await reviewsStore.filter((r) => r.assetId === req.params.id && r.status === 'published'));
  ok(res, { count: list.length, reviews: list, aggregate: agg });
});

app.get('/api/reviews/:id', async (req, res) => {
  const r = await reviewsStore.get(req.params.id);
  if (!r) return fail(res, 'NOT_FOUND', 'review not found', 404);
  ok(res, { data: r });
});

app.put('/api/reviews/:id',requireAuth,  authOrBypass, async (req, res) => {
  const r = await reviewsStore.get(req.params.id);
  if (!r) return fail(res, 'NOT_FOUND', 'review not found', 404);
  const updatable = ['rating', 'title', 'body', 'pros', 'cons'];
  for (const k of updatable) if (k in req.body) r[k] = req.body[k];
  r.updatedAt = nowIso();
  await reviewsStore.set(r.id, r);
  ok(res, { data: r });
});

app.delete('/api/reviews/:id',requireAuth,  authOrBypass, async (req, res) => {
  if (!(await reviewsStore.has(req.params.id))) return fail(res, 'NOT_FOUND', 'review not found', 404);
  await reviewsStore.delete(req.params.id);
  ok(res, { deleted: req.params.id });
});

app.post('/api/reviews/:id/helpful',requireAuth,  authOrBypass, async (req, res) => {
  const r = await reviewsStore.get(req.params.id);
  if (!r) return fail(res, 'NOT_FOUND', 'review not found', 404);
  const kind = req.body?.vote === 'unhelpful' ? 'unhelpful' : 'helpful';
  const updated = applyVote(r, kind);
  await reviewsStore.set(r.id, updated);
  ok(res, { data: updated });
});

app.post('/api/reviews/:id/response',requireAuth,  authOrBypass, async (req, res) => {
  const r = await reviewsStore.get(req.params.id);
  if (!r) return fail(res, 'NOT_FOUND', 'review not found', 404);
  try {
    const updated = setPublisherResponse(r, req.body?.response || '');
    await reviewsStore.set(r.id, updated);
    ok(res, { data: updated });
  } catch (e) { fail(res, 'INVALID_INPUT', e.message, 400); }
});

app.post('/api/reviews/:id/flag',requireAuth,  authOrBypass, async (req, res) => {
  const r = await reviewsStore.get(req.params.id);
  if (!r) return fail(res, 'NOT_FOUND', 'review not found', 404);
  const updated = flagReview(r, req.body?.reason);
  await reviewsStore.set(r.id, updated);
  await audit('review.flagged', 'asset', r.assetId, { reviewId: r.id, reason: req.body?.reason }, req.body.actor || 'system', null);
  ok(res, { data: updated });
});

// =============================================================================
// PHASE 3: CREATOR PROFILES & LEADERBOARD
// =============================================================================

app.get('/api/creators/leaderboard', async (req, res) => {
  const { category, sortBy = 'trustScore', limit = 50 } = req.query;
  const allAssets = await assetsStore.toArray();
  const publisherSet = new Set();
  for (const a of allAssets) if (a.publisher) publisherSet.add(a.publisher);
  const profiles = [];
  for (const pub of publisherSet) {
    const assets = allAssets.filter((a) => a.publisher === pub);
    const assetIds = assets.map((a) => a.id);
    const reviews = await reviewsStore.filter((r) => assetIds.includes(r.assetId));
    const transactions = await transactionsStore.filter((t) => t.publisherId === pub);
    const installs = await installsStore.filter((i) => assetIds.includes(i.assetId));
    profiles.push(buildReputation(pub, { assets, reviews, transactions, installs }));
  }
  const board = buildLeaderboard(profiles, { category, sortBy: String(sortBy), limit: Number(limit) });
  ok(res, { count: board.length, leaderboard: board });
});

app.get('/api/creators/:creatorId', async (req, res) => {
  const creatorId = req.params.creatorId;
  const assets = await assetsStore.filter((a) => a.publisher === creatorId);
  const assetIds = assets.map((a) => a.id);
  const reviews = await reviewsStore.filter((r) => assetIds.includes(r.assetId));
  const transactions = await transactionsStore.filter((t) => t.publisherId === creatorId);
  const installs = await installsStore.filter((i) => assetIds.includes(i.assetId));
  const rep = buildReputation(creatorId, { assets, reviews, transactions, installs });
  ok(res, { data: rep });
});

app.get('/api/creators/:creatorId/assets', async (req, res) => {
  const list = await assetsStore.filter((a) => a.publisher === req.params.creatorId);
  ok(res, { count: list.length, assets: list.map(fillMetadata) });
});

// =============================================================================
// PHASE 3: PRICING PLANS
// =============================================================================

app.post('/api/assets/:id/plans',requireAuth,  authOrBypass, async (req, res) => {
  try {
    const a = await assetsStore.get(req.params.id);
    if (!a) return fail(res, 'NOT_FOUND', 'asset not found', 404);
    const plan = buildPlan({ ...req.body, assetId: req.params.id });
    await pricingPlansStore.set(plan.id, plan);
    res.status(201).json({ success: true, data: plan });
  } catch (e) { fail(res, 'INVALID_INPUT', e.message, 400); }
});

app.get('/api/assets/:id/plans', async (req, res) => {
  const list = await pricingPlansStore.filter((p) => p.assetId === req.params.id);
  ok(res, { count: list.length, plans: list });
});

app.put('/api/plans/:id',requireAuth,  authOrBypass, async (req, res) => {
  const p = await pricingPlansStore.get(req.params.id);
  if (!p) return fail(res, 'NOT_FOUND', 'plan not found', 404);
  const updatable = ['name', 'price', 'interval', 'features', 'limits', 'active', 'trialDays'];
  for (const k of updatable) if (k in req.body) p[k] = req.body[k];
  p.updatedAt = nowIso();
  await pricingPlansStore.set(p.id, p);
  ok(res, { data: p });
});

app.delete('/api/plans/:id',requireAuth,  authOrBypass, async (req, res) => {
  const p = await pricingPlansStore.get(req.params.id);
  if (!p) return fail(res, 'NOT_FOUND', 'plan not found', 404);
  p.active = false;
  await pricingPlansStore.set(p.id, p);
  ok(res, { deleted: p.id });
});

// =============================================================================
// PHASE 3: SUBSCRIPTIONS
// =============================================================================

app.post('/api/subscriptions',requireAuth,  authOrBypass, async (req, res) => {
  try {
    const { planId } = req.body || {};
    if (!planId) return fail(res, 'INVALID_INPUT', 'planId required');
    const plan = await pricingPlansStore.get(planId);
    if (!plan) return fail(res, 'NOT_FOUND', 'plan not found', 404);
    const asset = await assetsStore.get(plan.assetId);
    const sub = buildSubscription({ ...req.body, planId, assetId: plan.assetId, plan: plan.name, monthlyPrice: plan.price, currency: plan.currency, interval: plan.interval, trialDays: plan.trialDays });
    await subscriptionsStore.set(sub.id, sub);
    if (sub.monthlyPrice > 0) {
      const tx = buildTransaction({
        kind: 'subscription', assetId: plan.assetId, tenantId: sub.tenantId,
        publisherId: asset?.publisher || 'community',
        amount: sub.monthlyPrice, currency: sub.currency, status: 'completed',
        pricingModel: 'subscription',
      });
      await transactionsStore.set(tx.id, tx);
    }
    emitEvent(req, 'subscription.started', { subscriptionId: sub.id, assetId: plan.assetId, tenantId: sub.tenantId });
    res.status(201).json({ success: true, data: sub });
  } catch (e) { fail(res, 'INVALID_INPUT', e.message, 400); }
});

app.get('/api/subscriptions', async (req, res) => {
  const { tenantId, assetId, status } = req.query;
  let list = await subscriptionsStore.toArray();
  if (tenantId) list = list.filter((s) => s.tenantId === tenantId);
  if (assetId) list = list.filter((s) => s.assetId === assetId);
  if (status) list = list.filter((s) => s.status === status);
  ok(res, { count: list.length, subscriptions: list });
});

app.put('/api/subscriptions/:id',requireAuth,  authOrBypass, async (req, res) => {
  const s = await subscriptionsStore.get(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'subscription not found', 404);
  const updatable = ['status', 'autoRenew'];
  for (const k of updatable) if (k in req.body) s[k] = req.body[k];
  if (req.body?.status === 'cancelled') s.cancelledAt = nowIso();
  s.updatedAt = nowIso();
  await subscriptionsStore.set(s.id, s);
  emitEvent(req, 'subscription.updated', { subscriptionId: s.id, status: s.status });
  ok(res, { data: s });
});

// =============================================================================
// PHASE 3: PAYOUTS
// =============================================================================

app.post('/api/billing/payouts',requireAuth,  authOrBypass, async (req, res) => {
  try {
    const payout = buildPayout(req.body);
    await payoutsStore.set(payout.id, payout);
    emitEvent(req, 'payout.requested', { payoutId: payout.id, publisherId: payout.publisherId, amount: payout.amount });
    res.status(201).json({ success: true, data: payout });
  } catch (e) { fail(res, 'INVALID_INPUT', e.message, 400); }
});

app.get('/api/billing/payouts', async (req, res) => {
  const { publisherId, status } = req.query;
  let list = await payoutsStore.toArray();
  if (publisherId) list = list.filter((p) => p.publisherId === publisherId);
  if (status) list = list.filter((p) => p.status === status);
  ok(res, { count: list.length, payouts: list });
});

app.put('/api/billing/payouts/:id',requireAuth,  authOrBypass, async (req, res) => {
  const p = await payoutsStore.get(req.params.id);
  if (!p) return fail(res, 'NOT_FOUND', 'payout not found', 404);
  const updatable = ['status', 'notes', 'destination'];
  for (const k of updatable) if (k in req.body) p[k] = req.body[k];
  if (req.body?.status === 'approved') p.approvedAt = nowIso();
  if (req.body?.status === 'completed') p.completedAt = nowIso();
  await payoutsStore.set(p.id, p);
  emitEvent(req, 'payout.updated', { payoutId: p.id, status: p.status });
  ok(res, { data: p });
});

// =============================================================================
// PHASE 3: PUBLISHER DASHBOARD
// =============================================================================

app.get('/api/dashboard/publisher/:publisherId', async (req, res) => {
  const publisherId = req.params.publisherId;
  const period = req.query.from && req.query.to ? { from: req.query.from, to: req.query.to } : undefined;
  const assets = await assetsStore.filter((a) => a.publisher === publisherId);
  const transactions = await transactionsStore.toArray();
  const installs = await installsStore.toArray();
  const payouts = await payoutsStore.toArray();
  const dashboard = buildDashboard(publisherId, { assets, transactions, installs, payouts, period });
  ok(res, { data: dashboard });
});

// =============================================================================
// PHASE 3: ENHANCEMENT (AGENTS + PACKS)
// =============================================================================

app.post('/api/agents/:agentId/enhance',requireAuth,  authOrBypass, async (req, res) => {
  try {
    const { skillIds, libraryId, tenantId, installedBy } = req.body || {};
    if (!Array.isArray(skillIds) || skillIds.length === 0) return fail(res, 'INVALID_INPUT', 'skillIds required');
    const agent = await resolveOwner(req.params.agentId, { expectedType: 'agent' });
    if (!agent.exists) return fail(res, 'AGENT_NOT_FOUND', `agent ${req.params.agentId} not found`, 404);
    const enh = buildEnhancement({ agentId: req.params.agentId, libraryId, skillIds, tenantId, installedBy: installedBy || 'system' });
    await enhancementsStore.set(enh.id, enh);
    for (const skillId of skillIds) {
      const a = await assetsStore.get(skillId);
      if (!a) continue;
      const install = {
        id: `ins-${uuidv4().slice(0, 8)}`,
        assetId: skillId, assetType: a.assetType, tenantId: tenantId || `agent:${req.params.agentId}`,
        version: a.version, status: 'installed', installedAt: nowIso(),
        pinnedVersion: false, versionHistory: [{ version: a.version, action: 'install', at: nowIso() }],
        agentId: req.params.agentId,
      };
      await installsStore.set(install.id, install);
    }
    emitEvent(req, 'agent.enhanced', { enhancementId: enh.id, agentId: req.params.agentId, skillCount: skillIds.length });
    res.status(201).json({ success: true, data: enh });
  } catch (e) { fail(res, 'INVALID_INPUT', e.message, 400); }
});

app.get('/api/agents/:agentId/skills', async (req, res) => {
  const enhancements = await enhancementsStore.filter((e) => e.agentId === req.params.agentId);
  const skillIdSet = new Set();
  for (const e of enhancements) for (const s of e.skillIds) skillIdSet.add(s);
  const skills = await Promise.all(Array.from(skillIdSet).map((id) => assetsStore.get(id)));
  ok(res, { count: skills.filter(Boolean).length, agentId: req.params.agentId, skills: skills.filter(Boolean).map(fillMetadata) });
});

app.post('/api/assets/:id/install-pack',requireAuth,  authOrBypass, async (req, res) => {
  try {
    const pack = await assetsStore.get(req.params.id);
    if (!pack) return fail(res, 'NOT_FOUND', 'pack not found', 404);
    if (pack.assetType !== 'pack') return fail(res, 'NOT_A_PACK', 'asset is not a pack', 400);
    const { tenantId, autoResolve = true } = req.body || {};
    if (!tenantId) return fail(res, 'INVALID_INPUT', 'tenantId required');
    let memberIds = [...(pack.memberAssetIds || [])];
    if (autoResolve) {
      const allIds = new Set(memberIds);
      for (const id of memberIds) {
        const deps = (await skillDependenciesStore.get(id)) || [];
        for (const d of deps) allIds.add(d.to || d);
      }
      memberIds = Array.from(allIds);
    }
    const installs = [];
    for (const memberId of memberIds) {
      const a = await assetsStore.get(memberId);
      if (!a) continue;
      const install = {
        id: `ins-${uuidv4().slice(0, 8)}`,
        assetId: a.id, assetType: a.assetType, tenantId,
        version: a.version, status: 'installed', installedAt: nowIso(),
        pinnedVersion: false, versionHistory: [{ version: a.version, action: 'install', at: nowIso() }],
        packId: pack.id,
      };
      await installsStore.set(install.id, install);
      installs.push(install);
      a.totalDownloads = (a.totalDownloads || 0) + 1;
      await assetsStore.set(a.id, a);
    }
    emitEvent(req, 'pack.installed', { packId: pack.id, tenantId, memberCount: installs.length });
    res.status(201).json({ success: true, packId: pack.id, installedCount: installs.length, installs });
  } catch (e) { fail(res, 'INVALID_INPUT', e.message, 400); }
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
if (process.env.NODE_ENV !== 'test' && !process.env.SKILLOS_NO_LISTEN) {
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
      console.log(`  Pre-seeded: 6 skills, 6 categories, 5 multi-asset entries`);
    });
    installGracefulShutdown(server);
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
  skillsStore,
  skillExecutionsStore,
  skillTemplatesStore,
  skillDependenciesStore,
  skillTestsStore,
  analyticsStore,
  learningDataStore,
  categoriesStore,
  versionsStore,
  permissionsStore,
  skillMarketplaceStore,
  assetsStore,
  installsStore,
  transactionsStore,
  auditStore,
  librariesStore,
  datasetsStore,
  trainingJobsStore,
  modelAdaptersStore,
  reviewsStore,
  pricingPlansStore,
  subscriptionsStore,
  payoutsStore,
  enhancementsStore,
};
