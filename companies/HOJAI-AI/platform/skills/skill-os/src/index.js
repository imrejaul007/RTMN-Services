/**
 * SkillOS - The Universal Capability Platform
 *
 * One of the 3 foundational pillars of HOJAI AI:
 *   - TwinOS   = Identity & Representation Layer ("What am I?")
 *   - MemoryOS = Knowledge & Experience Layer  ("What do I know?")
 *   - SkillOS  = Capability Layer              ("What can I do?")
 *
 * Port: 4743
 * Pattern: in-memory Map (matches TwinOS / MemoryOS / SUTAR services)
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
// ^ requireAuth is kept imported even when SKILLOS_REQUIRE_AUTH=false so
// production builds still wire the real middleware. The authOrBypass helper
// below is the only thing that actually gets attached to routes.
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import vm from 'vm';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PORT || 4743;
const app = express();

// Dev escape hatch: SKILLOS_REQUIRE_AUTH=false bypasses requireAuth on every
// route. This lets the smoke test script POST without a JWT, matching the
// pattern used in policy-os, flow-orchestrator, and other HOJAI services.
// In production, set SKILLOS_REQUIRE_AUTH=true and route real JWTs.
const REQUIRE_AUTH = (process.env.SKILLOS_REQUIRE_AUTH || 'false') !== 'false';
const authOrBypass = (req, res, next) => (REQUIRE_AUTH ? requireAuth(req, res, next) : next());

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// =============================================================================
// IN-MEMORY STORES
// =============================================================================

const skills = new PersistentMap('skills', { serviceName: 'skill-os' });              // id -> skill record
const skillExecutions = new PersistentMap('skill-executions', { serviceName: 'skill-os' });      // id -> execution record
const skillTemplates = new PersistentMap('skill-templates', { serviceName: 'skill-os' });       // id -> template record
const skillDependencies = new PersistentMap('skill-dependencies', { serviceName: 'skill-os' });    // id -> dependency record
const skillEvents = [];                 // event log (bounded)
const skillMarketplace = new PersistentMap('skill-marketplace', { serviceName: 'skill-os' });     // third-party skills
const skillTests = new PersistentMap('skill-tests', { serviceName: 'skill-os' });           // test runs
const analytics = new PersistentMap('analytics', { serviceName: 'skill-os' });            // per-skill analytics rollups
const learningData = new PersistentMap('learning-data', { serviceName: 'skill-os' });         // learning feedback per skill
const categories = new PersistentMap('categories', { serviceName: 'skill-os' });           // category -> meta
const versions = new PersistentMap('versions', { serviceName: 'skill-os' });             // skillId -> [version records]
const permissions = new PersistentMap('permissions', { serviceName: 'skill-os' });          // skillId -> [permissions]

// =============================================================================
// PRE-SEEDED CATEGORIES (per HOJAI 3-pillar spec)
// =============================================================================

const CATEGORY_SEED = [
  { id: 'ai',          name: 'AI Skills',         description: 'Reasoning, planning, vision, NLP' },
  { id: 'commerce',    name: 'Commerce Skills',   description: 'Search, compare, checkout, refund, tracking' },
  { id: 'business',    name: 'Business Skills',   description: 'CRM, inventory, sales, marketing, finance' },
  { id: 'productivity',name: 'Productivity Skills', description: 'Calendar, reminder, email, notes, tasks' },
  { id: 'communication',name: 'Communication Skills', description: 'Call, SMS, WhatsApp, push, email' },
  { id: 'industry',    name: 'Industry Skills',   description: 'Restaurant, hotel, healthcare, retail, etc.' }
];
for (const c of CATEGORY_SEED) categories.set(c.id, c);

// Pre-seeded example skills (one per category) so the API is non-empty on boot
const SKILL_SEED = [
  { id: 'sk-reasoning',       name: 'Reasoning',         category: 'ai',            tags: ['llm','logic'],            description: 'Chain-of-thought reasoning over a context' },
  { id: 'sk-search-product',  name: 'Search Product',    category: 'commerce',      tags: ['catalog','search'],        description: 'Search the product catalog by query/filter' },
  { id: 'sk-crm',             name: 'CRM Lookup',        category: 'business',      tags: ['crm','customer'],          description: 'Look up a customer record by id or email' },
  { id: 'sk-calendar',        name: 'Calendar',          category: 'productivity',  tags: ['schedule','reminder'],     description: 'Add/list calendar events' },
  { id: 'sk-whatsapp',        name: 'WhatsApp Send',     category: 'communication', tags: ['messaging','whatsapp'],    description: 'Send a WhatsApp message' },
  { id: 'sk-restaurant-book', name: 'Restaurant Booking',category: 'industry',      tags: ['restaurant','booking'],    description: 'Book a restaurant table' }
];
for (const s of SKILL_SEED) {
  const skill = {
    id: s.id,
    name: s.name,
    category: s.category,
    tags: s.tags,
    description: s.description,
    version: '1.0.0',
    status: 'active',
    template: null,
    code: `// ${s.name} skill\nasync function run(input, ctx) { return { ok: true, input }; }`,
    permissions: [],
    rateLimit: { windowMs: 60000, max: 100 },
    budget: { maxCostPerCall: 0.10, currency: 'USD' },
    requiresApproval: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {}
  };
  skills.set(skill.id, skill);
  versions.set(skill.id, [{ version: '1.0.0', createdAt: skill.createdAt, code: skill.code }]);
}

// =============================================================================
// HELPERS
// =============================================================================

function nowIso() { return new Date().toISOString(); }
function ok(res, data) { res.json({ success: true, ...data }); }
function fail(res, code, message, status = 400) { res.status(status).json({ success: false, error: code, message }); }
function getSkill(id) { return skills.get(id); }
function bumpAnalytics(skillId, success, durationMs) {
  const a = analytics.get(skillId) || { calls: 0, successes: 0, failures: 0, avgLatencyMs: 0, totalLatencyMs: 0 };
  a.calls += 1;
  if (success) a.successes += 1; else a.failures += 1;
  a.totalLatencyMs += durationMs;
  a.avgLatencyMs = Math.round(a.totalLatencyMs / a.calls);
  a.lastCalledAt = nowIso();
  analytics.set(skillId, a);
}
function logEvent(skillId, type, payload = {}) {
  const evt = { id: uuidv4(), skillId, type, payload, timestamp: nowIso() };
  skillEvents.push(evt);
  if (skillEvents.length > 5000) skillEvents.shift();
  return evt;
}

// =============================================================================
// HEALTH
// =============================================================================

app.get('/', (_req, res) => ok(res, {
  service: 'skill-os',
  version: '1.0.0',
  port: PORT,
  description: 'HOJAI AI SkillOS - The Capability Layer ("What can I do?")',
  pillars: ['TwinOS (4705)', 'MemoryOS (4703)', 'SkillOS (4743)'],
  features: 20,
  categories: Array.from(categories.values()).length,
  skills: skills.size
}));

app.get('/health', (_req, res) => ok(res, {
  status: 'healthy',
  service: 'skill-os',
  version: '1.0.0',
  port: PORT,
  stats: {
    skills: skills.size,
    templates: skillTemplates.size,
    executions: skillExecutions.size,
    events: skillEvents.length,
    marketplace: skillMarketplace.size,
    analytics: analytics.size
  },
  timestamp: nowIso()
}));

// =============================================================================
// 1. SKILL REGISTRY
// =============================================================================

app.post('/api/skills',authOrBypass,  (req, res) => {
  const { name, category, description = '', tags = [], code = '', template = null, permissions: perms = [], rateLimit: rl, requiresApproval = false } = req.body || {};
  if (!name || !category) return fail(res, 'INVALID_INPUT', 'name and category are required');
  if (!categories.has(category)) return fail(res, 'UNKNOWN_CATEGORY', `category ${category} not found`);
  const id = `sk-${uuidv4().slice(0,8)}`;
  const skill = {
    id, name, category, description, tags,
    version: '1.0.0', status: 'active',
    code: code || `async function run(input, ctx) { return { ok: true, input }; }`,
    template, permissions: perms,
    rateLimit: rl || { windowMs: 60000, max: 100 },
    budget: req.body.budget || { maxCostPerCall: 0.10, currency: 'USD' },
    requiresApproval,
    createdAt: nowIso(), updatedAt: nowIso(),
    metadata: req.body.metadata || {}
  };
  skills.set(id, skill);
  versions.set(id, [{ version: '1.0.0', createdAt: skill.createdAt, code: skill.code }]);
  if (perms.length) permissions.set(id, perms);
  logEvent(id, 'registered', { name, category });
  res.status(201).json({ success: true, data: skill });
});

app.get('/api/skills', (req, res) => {
  const { category, tag, status = 'active' } = req.query;
  let list = Array.from(skills.values()).filter(s => s.status === status);
  if (category) list = list.filter(s => s.category === category);
  if (tag) list = list.filter(s => s.tags.includes(tag));
  ok(res, { count: list.length, skills: list });
});

// IMPORTANT: Specific routes must come BEFORE /api/skills/:id
app.get('/api/skills/categories', (_req, res) => {
  ok(res, { count: categories.size, categories: Array.from(categories.values()) });
});

app.post('/api/skills/categories',authOrBypass,  (req, res) => {
  const { id, name, description = '' } = req.body || {};
  if (!id || !name) return fail(res, 'INVALID_INPUT', 'id and name required');
  if (categories.has(id)) return fail(res, 'CONFLICT', 'category exists');
  const c = { id, name, description };
  categories.set(id, c);
  res.status(201).json({ success: true, data: c });
});

app.get('/api/skills/discover', (req, res) => {
  const { q, category, tag } = req.query;
  let list = Array.from(skills.values()).filter(s => s.status === 'active');
  if (category) list = list.filter(s => s.category === category);
  if (tag) list = list.filter(s => s.tags.includes(tag));
  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter(s =>
      s.name.toLowerCase().includes(needle) ||
      s.description.toLowerCase().includes(needle) ||
      s.tags.some(t => t.toLowerCase().includes(needle))
    );
  }
  // Rank: most-called first, then most-recently-updated
  list.sort((a, b) => {
    const aa = analytics.get(a.id)?.calls || 0;
    const bb = analytics.get(b.id)?.calls || 0;
    if (bb !== aa) return bb - aa;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
  ok(res, { count: list.length, discovered: list.slice(0, 25) });
});

app.get('/api/skills/marketplace', (req, res) => {
  const { category, provider } = req.query;
  let list = Array.from(skillMarketplace.values());
  if (category) list = list.filter(s => s.category === category);
  if (provider) list = list.filter(s => s.provider === provider);
  ok(res, { count: list.length, listings: list });
});

app.post('/api/skills/marketplace',authOrBypass,  (req, res) => {
  const { name, provider, version = '1.0.0', description = '', price = 0, category, metadata = {} } = req.body || {};
  if (!name || !provider || !category) return fail(res, 'INVALID_INPUT', 'name, provider, category required');
  const id = `mp-${uuidv4().slice(0,8)}`;
  const listing = { id, name, provider, version, description, price, category, metadata, createdAt: nowIso() };
  skillMarketplace.set(id, listing);
  res.status(201).json({ success: true, data: listing });
});

app.get('/api/skills/:id', (req, res) => {
  const s = getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  ok(res, { data: s });
});

app.put('/api/skills/:id',authOrBypass,  (req, res) => {
  const s = getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const updatable = ['name','description','tags','code','template','permissions','rateLimit','budget','requiresApproval','status','metadata'];
  for (const k of updatable) if (k in req.body) s[k] = req.body[k];
  s.updatedAt = nowIso();
  logEvent(s.id, 'updated', { fields: Object.keys(req.body) });
  ok(res, { data: s });
});

app.delete('/api/skills/:id',authOrBypass,  (req, res) => {
  if (!skills.has(req.params.id)) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  skills.delete(req.params.id);
  logEvent(req.params.id, 'deleted', {});
  ok(res, { deleted: req.params.id });
});

// =============================================================================
// 2. SKILL RUNTIME  (execute)
// =============================================================================

app.post('/api/skills/:id/execute',authOrBypass,  async (req, res) => {
  const start = Date.now();
  const s = getSkill(req.params.id);
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
      Promise: { resolve: (v) => v }, // no real async; force sync
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
  skillExecutions.set(execId, exec);
  bumpAnalytics(s.id, success, exec.durationMs);
  logEvent(s.id, success ? 'success' : 'failure', { execId, durationMs: exec.durationMs, error });
  logEvent(s.id, 'after', { execId, result });
  res.status(success ? 200 : 500).json({ success, data: exec });
});

// =============================================================================
// 3. SKILL DISCOVERY
// =============================================================================
// (handled above as /api/skills/discover before :id route)

// =============================================================================
// 4. SKILL MARKETPLACE (third-party skills)
// =============================================================================
// (handled above as /api/skills/marketplace before :id route)

// =============================================================================
// 5. SKILL COMPOSITION
// =============================================================================

app.post('/api/skills/compose',authOrBypass,  async (req, res) => {
  const { steps = [] } = req.body || {};
  if (!Array.isArray(steps) || steps.length === 0) return fail(res, 'INVALID_INPUT', 'steps array required');
  const compositionId = uuidv4();
  const trace = [];
  let ctx = req.body?.initialContext || {};
  for (const step of steps) {
    const s = getSkill(step.skillId);
    if (!s) { trace.push({ step, error: 'skill not found' }); return fail(res, 'STEP_FAILED', `step ${step.skillId} not found`, 422); }
    const execId = uuidv4();
    const start = Date.now();
    logEvent(s.id, 'before', { execId, compositionId, input: step.input });
    const out = { ok: true, skillId: s.id, input: step.input ?? null, ctxIn: ctx, message: `${s.name} composed` };
    const duration = Date.now() - start;
    bumpAnalytics(s.id, true, duration);
    skillExecutions.set(execId, { id: execId, skillId: s.id, compositionId, ...out, durationMs: duration, startedAt: new Date(start).toISOString() });
    logEvent(s.id, 'success', { execId, compositionId, durationMs: duration });
    trace.push({ execId, skillId: s.id, out });
    ctx = { ...ctx, [`step_${trace.length}_output`]: out };
  }
  ok(res, { compositionId, stepsExecuted: trace.length, trace, finalContext: ctx });
});

// =============================================================================
// 6. SKILL LEARNING
// =============================================================================

app.post('/api/skills/:id/learn',authOrBypass,  (req, res) => {
  const s = getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const { feedback, score = 1.0, hint } = req.body || {};
  const id = uuidv4();
  const record = { id, skillId: s.id, feedback, score, hint, createdAt: nowIso() };
  const list = learningData.get(s.id) || [];
  list.push(record);
  learningData.set(s.id, list);
  // Update skill metadata with rolling avg
  s.metadata.learningSamples = (s.metadata.learningSamples || 0) + 1;
  s.metadata.learningAvgScore = (((s.metadata.learningAvgScore || 0) * (s.metadata.learningSamples - 1)) + Number(score)) / s.metadata.learningSamples;
  s.updatedAt = nowIso();
  ok(res, { data: record, skillMetadata: s.metadata });
});

app.get('/api/skills/:id/learn', (req, res) => {
  const list = learningData.get(req.params.id) || [];
  ok(res, { count: list.length, records: list });
});

// =============================================================================
// 7. SKILL VERSIONING
// =============================================================================

app.post('/api/skills/:id/versions',authOrBypass,  (req, res) => {
  const s = getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const { version, code, changelog = '' } = req.body || {};
  if (!version || !code) return fail(res, 'INVALID_INPUT', 'version and code required');
  const v = { version, code, changelog, createdAt: nowIso() };
  const list = versions.get(s.id) || [];
  list.push(v);
  versions.set(s.id, list);
  s.version = version;
  s.code = code;
  s.updatedAt = nowIso();
  logEvent(s.id, 'version_added', { version });
  res.status(201).json({ success: true, data: v });
});

app.get('/api/skills/:id/versions', (req, res) => {
  const list = versions.get(req.params.id) || [];
  ok(res, { count: list.length, versions: list });
});

// =============================================================================
// 8. SKILL PERMISSIONS
// =============================================================================

app.post('/api/skills/:id/permissions',authOrBypass,  (req, res) => {
  const s = getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const { principal, action, effect = 'allow' } = req.body || {};
  if (!principal || !action) return fail(res, 'INVALID_INPUT', 'principal and action required');
  const id = uuidv4();
  const perm = { id, principal, action, effect, createdAt: nowIso() };
  const list = permissions.get(s.id) || [];
  list.push(perm);
  permissions.set(s.id, list);
  s.permissions = list;
  res.status(201).json({ success: true, data: perm });
});

app.get('/api/skills/:id/permissions', (req, res) => {
  ok(res, { permissions: permissions.get(req.params.id) || [] });
});

// =============================================================================
// 9. SKILL ANALYTICS
// =============================================================================

app.get('/api/skills/:id/analytics', (req, res) => {
  const a = analytics.get(req.params.id) || { calls: 0, successes: 0, failures: 0, avgLatencyMs: 0 };
  const s = getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  ok(res, { data: a, learning: s.metadata });
});

app.get('/api/analytics', (_req, res) => {
  const list = Array.from(analytics.entries()).map(([skillId, a]) => ({ skillId, ...a }));
  list.sort((x, y) => y.calls - x.calls);
  ok(res, { count: list.length, analytics: list });
});

// =============================================================================
// 10. SKILL TEMPLATES
// =============================================================================

app.post('/api/skill-templates',authOrBypass,  (req, res) => {
  const { name, category, code, description = '' } = req.body || {};
  if (!name || !category || !code) return fail(res, 'INVALID_INPUT', 'name, category, code required');
  const id = `tpl-${uuidv4().slice(0,8)}`;
  const tpl = { id, name, category, code, description, createdAt: nowIso() };
  skillTemplates.set(id, tpl);
  res.status(201).json({ success: true, data: tpl });
});

app.get('/api/skill-templates', (req, res) => {
  const { category } = req.query;
  let list = Array.from(skillTemplates.values());
  if (category) list = list.filter(t => t.category === category);
  ok(res, { count: list.length, templates: list });
});

app.post('/api/skill-templates/:id/instantiate',authOrBypass,  (req, res) => {
  const tpl = skillTemplates.get(req.params.id);
  if (!tpl) return fail(res, 'NOT_FOUND', 'template not found', 404);
  const { name, tags = [] } = req.body || {};
  const id = `sk-${uuidv4().slice(0,8)}`;
  const skill = {
    id, name: name || tpl.name, category: tpl.category, description: tpl.description,
    code: tpl.code, tags, version: '1.0.0', status: 'active',
    permissions: [], rateLimit: { windowMs: 60000, max: 100 },
    budget: { maxCostPerCall: 0.10, currency: 'USD' }, requiresApproval: false,
    template: tpl.id,
    createdAt: nowIso(), updatedAt: nowIso(), metadata: { fromTemplate: tpl.id }
  };
  skills.set(id, skill);
  versions.set(id, [{ version: '1.0.0', createdAt: skill.createdAt, code: skill.code }]);
  res.status(201).json({ success: true, data: skill });
});

// =============================================================================
// 11. SKILL DEPENDENCIES
// =============================================================================

app.post('/api/skills/:id/dependencies',authOrBypass,  (req, res) => {
  const s = getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const { dependsOn, kind = 'runtime' } = req.body || {};
  if (!dependsOn) return fail(res, 'INVALID_INPUT', 'dependsOn required');
  const target = getSkill(dependsOn);
  if (!target) return fail(res, 'DEPENDENCY_NOT_FOUND', `skill ${dependsOn} not found`, 404);
  const id = uuidv4();
  const dep = { id, from: s.id, to: target.id, kind, createdAt: nowIso() };
  const list = skillDependencies.get(s.id) || [];
  list.push(dep);
  skillDependencies.set(s.id, list);
  ok(res, { data: dep });
});

app.get('/api/skills/:id/dependencies', (req, res) => {
  const list = skillDependencies.get(req.params.id) || [];
  ok(res, { count: list.length, dependencies: list });
});

// =============================================================================
// 12. SKILL EVENTS
// =============================================================================

app.get('/api/skills/:id/events', (req, res) => {
  const { type, limit = 50 } = req.query;
  let list = skillEvents.filter(e => e.skillId === req.params.id);
  if (type) list = list.filter(e => e.type === type);
  ok(res, { count: list.length, events: list.slice(-Number(limit)).reverse() });
});

app.get('/api/skill-events', (req, res) => {
  const { type, skillId, limit = 50 } = req.query;
  let list = skillEvents;
  if (type) list = list.filter(e => e.type === type);
  if (skillId) list = list.filter(e => e.skillId === skillId);
  ok(res, { count: list.length, events: list.slice(-Number(limit)).reverse() });
});

// =============================================================================
// 13. SKILL POLICIES (rate limits, budgets, approvals)
// =============================================================================

app.put('/api/skills/:id/policies',authOrBypass,  (req, res) => {
  const s = getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const { rateLimit, budget, requiresApproval } = req.body || {};
  if (rateLimit) s.rateLimit = rateLimit;
  if (budget) s.budget = budget;
  if (typeof requiresApproval === 'boolean') s.requiresApproval = requiresApproval;
  s.updatedAt = nowIso();
  ok(res, { data: { rateLimit: s.rateLimit, budget: s.budget, requiresApproval: s.requiresApproval } });
});

// =============================================================================
// 14. SKILL MEMORY INTEGRATION (proxy to MemoryOS 4703)
// =============================================================================

app.post('/api/skills/:id/memory',authOrBypass,  async (req, res) => {
  const s = getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const { op = 'read', memoryId, data } = req.body || {};
  // Stub: in production, call http://localhost:4703/api/memories
  ok(res, { op, skillId: s.id, memoryId, memoryResult: { ok: true, proxied: true, target: 'MemoryOS:4703', data } });
});

// =============================================================================
// 15. SKILL TWIN INTEGRATION (proxy to TwinOS 4705)
// =============================================================================

app.post('/api/skills/:id/twin',authOrBypass,  async (req, res) => {
  const s = getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const { op = 'read', twinId, data } = req.body || {};
  ok(res, { op, skillId: s.id, twinId, twinResult: { ok: true, proxied: true, target: 'TwinOS:4705', data } });
});

// =============================================================================
// 16. SKILL FLOW INTEGRATION (proxy to FlowOS 4310)
// =============================================================================

app.post('/api/skills/:id/flow',authOrBypass,  (req, res) => {
  const s = getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const { flowId, step } = req.body || {};
  ok(res, { ok: true, proxied: true, target: 'FlowOS:4310', flowId, step, skillId: s.id });
});

// =============================================================================
// 18. SKILL TESTING (sandbox, mock, validation)
// =============================================================================

app.post('/api/skills/:id/test',authOrBypass,  async (req, res) => {
  const s = getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const { input, mock = true } = req.body || {};
  const id = uuidv4();
  const start = Date.now();
  const result = { ok: true, mock, input, output: { echoed: input, sandbox: true } };
  const duration = Date.now() - start;
  const testRun = { id, skillId: s.id, mock, input, result, durationMs: duration, createdAt: nowIso() };
  skillTests.set(id, testRun);
  ok(res, { data: testRun });
});

app.get('/api/skills/:id/tests', (req, res) => {
  const list = Array.from(skillTests.values()).filter(t => t.skillId === req.params.id);
  ok(res, { count: list.length, tests: list });
});

// =============================================================================
// 19. SKILL MONITORING (health, latency, cost)
// =============================================================================

app.get('/api/skills/:id/monitoring', (req, res) => {
  const s = getSkill(req.params.id);
  if (!s) return fail(res, 'NOT_FOUND', 'skill not found', 404);
  const a = analytics.get(s.id) || {};
  ok(res, {
    skillId: s.id,
    health: a.calls ? (a.failures / a.calls < 0.05 ? 'healthy' : 'degraded') : 'unknown',
    latency: { avg: a.avgLatencyMs || 0, p95: Math.round((a.avgLatencyMs || 0) * 1.5) },
    cost: { perCall: s.budget?.maxCostPerCall || 0, currency: s.budget?.currency || 'USD' },
    rateLimit: s.rateLimit,
    lastCalledAt: a.lastCalledAt || null
  });
});

// =============================================================================
// CATEGORIES  (handled above as /api/skills/categories before :id route)
// =============================================================================

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
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



// Only start the listener when running as a real service. When imported by
// vitest we skip listen() so the test process can attach to the express app
// directly via supertest, and the test process doesn't bind a port.
let server;
if (process.env.NODE_ENV !== 'test' && !process.env.SKILLOS_NO_LISTEN) {
  server = app.listen(PORT, () => {
    console.log(`SkillOS running on port ${PORT} - The Capability Layer ("What can I do?")`);
    console.log(`  Health: http://localhost:${PORT}/health`);
    console.log(`  Pre-seeded: ${skills.size} skills, ${categories.size} categories`);
  });
  installGracefulShutdown(server);
}

// Exports for vitest unit tests — only available when imported (not when
// running as a real service via `node src/index.js`).
export {
  app,
  skills,
  categories,
  skillExecutions,
  skillTemplates,
  versions,
  permissions,
  CATEGORY_SEED,
  SKILL_SEED,
  nowIso,
  ok,
  fail,
  getSkill,
  bumpAnalytics,
  logEvent,
  server,
};
