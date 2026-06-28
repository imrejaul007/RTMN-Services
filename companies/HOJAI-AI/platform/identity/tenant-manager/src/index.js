/**
 * @file Tenant Manager Service
 * @description RTMN Foundation Division - Multi-tenant data isolation, project
 *              grouping, role-based membership, API key management, and usage
 *              metering. Required before any B2B offering is exposed.
 *
 * @layer    Foundation (Layer 1)
 * @division Division 1 - Foundation
 * @owner    HOJAI AI
 * @port     4747
 *
 * TODO(integration): Replace in-memory Maps with Postgres + per-tenant row-level
 *                    security policies (see Foundation Doc §3.2 - Persistence).
 * TODO(integration): Sync users with CorpID (port 4702) so member.email -> userId
 *                    resolution is single source of truth.
 * TODO(integration): Hook plan-limit enforcement to Billing (services/billing)
 *                    so usage against monthlyRequestLimit triggers invoices.
 * TODO(integration): Enforce multi-region data residency - reject writes to a
 *                    tenant from outside its declared `region`.
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

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
const PORT = process.env.PORT || 4747;
const SERVICE_NAME = 'tenant-manager';

// ---------------------------------------------------------------------------
// Auth bypass (tests + local dev)
// ---------------------------------------------------------------------------
// Set TENANT_MANAGER_REQUIRE_AUTH=false to disable JWT validation.
// Set TENANT_MANAGER_NO_LISTEN=true (or NODE_ENV=test) to skip the listen()
// call so vitest can import the app without binding the port.
const TENANT_MANAGER_REQUIRE_AUTH =
  (process.env.TENANT_MANAGER_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';
const TENANT_MANAGER_NO_LISTEN =
  (process.env.TENANT_MANAGER_NO_LISTEN ?? '').toLowerCase() === 'true' ||
  process.env.NODE_ENV === 'test';
const authOrBypass = (req, res, next) =>
  TENANT_MANAGER_REQUIRE_AUTH ? requireAuth(req, res, next) : next();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Simple structured request logger
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - started;
    // eslint-disable-next-line no-console
    console.log(`[tenant-manager] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// ---------------------------------------------------------------------------
// Constants & Catalogs
// ---------------------------------------------------------------------------

/** @typedef {'free' | 'starter' | 'pro' | 'enterprise'} Plan */

/** Plan limits - used for both display and (future) enforcement */
const PLAN_LIMITS = Object.freeze({
  free:       { maxUsers: 3,    maxProjects: 1,   monthlyRequestLimit: 10_000 },
  starter:    { maxUsers: 10,   maxProjects: 5,   monthlyRequestLimit: 100_000 },
  pro:        { maxUsers: 50,   maxProjects: 25,  monthlyRequestLimit: 1_000_000 },
  enterprise: { maxUsers: 5000, maxProjects: 500, monthlyRequestLimit: 50_000_000 },
});

/** @typedef {'owner' | 'admin' | 'member' | 'viewer' | 'billing'} Role */
const VALID_ROLES = Object.freeze(['owner', 'admin', 'member', 'viewer', 'billing']);

/** @typedef {'active' | 'suspended' | 'deleted'} TenantStatus */
const VALID_STATUS = Object.freeze(['active', 'suspended', 'deleted']);

/** @typedef {'us-east' | 'us-west' | 'eu-west' | 'eu-central' | 'ap-south' | 'ap-east' | 'me-central'} Region */
const VALID_REGIONS = Object.freeze([
  'us-east', 'us-west', 'eu-west', 'eu-central',
  'ap-south', 'ap-east', 'me-central',
]);

// ---------------------------------------------------------------------------
// In-memory storage
// TODO(persistence): Replace with Postgres + RLS. See Foundation Doc §3.2.
// ---------------------------------------------------------------------------

/** @type {Map<string, object>} tenantId -> tenant */
const tenants = new PersistentMap('tenants', { serviceName: 'tenant-manager' });
/** @type {Map<string, object>} slug -> tenantId (uniqueness index) */
const tenantSlugs = new PersistentMap('tenant-slugs', { serviceName: 'tenant-manager' });
/** @type {Map<string, object>} projectId -> project */
const projects = new PersistentMap('projects', { serviceName: 'tenant-manager' });
/** @type {Map<string, object>} apiKeyHash -> apiKey record (lookup index) */
const apiKeysByHash = new PersistentMap('api-keys-by-hash', { serviceName: 'tenant-manager' });
/** @type {Array<object>} usage events (append-only log) */
const usageEvents = [];
/** @type {Array<object>} global audit log (append-only) */
const auditLog = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Write one audit entry. Append-only. */
function audit(tenantId, action, actor, payload) {
  const entry = {
    id: uuidv4(),
    tenantId: tenantId || null,
    action,
    actor: actor || 'system',
    payload: payload || {},
    timestamp: new Date().toISOString(),
  };
  auditLog.push(entry);
  return entry;
}

/** Generate a 32-char random key (url-safe, no padding). */
function generateApiKey() {
  return crypto.randomBytes(24).toString('base64')
    .replace(/\+/g, '0').replace(/\//g, '0').replace(/=+$/g, '')
    .slice(0, 32);
}

/** Hash a key for at-rest storage. */
function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/** Build a safe response (strip hash, keep metadata). */
function publicKeyView(record) {
  if (!record) return null;
  const { keyHash, ...safe } = record;
  return safe;
}

/** Lookup tenant or 404. */
function getTenantOr404(req, res) {
  const tenant = tenants.get(req.params.id);
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return null;
  }
  return tenant;
}

/** Lookup project or 404. */
function getProjectOr404(req, res) {
  const project = projects.get(req.params.projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return null;
  }
  return project;
}

// ---------------------------------------------------------------------------
// Tenant CRUD
// ---------------------------------------------------------------------------

/**
 * POST /api/tenants
 * Create a new tenant. `name` and `slug` are required.
 */
app.post('/api/tenants',requireAuth,  authOrBypass,  (req, res) => {
  const { name, slug, plan, status, metadata, settings, region } = req.body || {};
  if (!name || !slug) {
    return res.status(400).json({ error: 'name and slug are required' });
  }
  if (tenantSlugs.has(slug)) {
    return res.status(409).json({ error: `slug '${slug}' is already in use` });
  }
  const chosenPlan = plan || 'free';
  if (!PLAN_LIMITS[chosenPlan]) {
    return res.status(400).json({ error: `unknown plan '${chosenPlan}'`, allowed: Object.keys(PLAN_LIMITS) });
  }
  const chosenRegion = region || 'us-east';
  if (!VALID_REGIONS.includes(chosenRegion)) {
    return res.status(400).json({ error: `unknown region '${chosenRegion}'`, allowed: VALID_REGIONS });
  }
  const chosenStatus = status || 'active';
  if (!VALID_STATUS.includes(chosenStatus)) {
    return res.status(400).json({ error: `unknown status '${chosenStatus}'`, allowed: VALID_STATUS });
  }

  const tenant = {
    id: uuidv4(),
    name,
    slug,
    plan: chosenPlan,
    status: chosenStatus,
    metadata: metadata || {},
    settings: settings || {},
    region: chosenRegion,
    limits: PLAN_LIMITS[chosenPlan],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tenants.set(tenant.id, tenant);
  tenantSlugs.set(slug, tenant.id);
  audit(tenant.id, 'tenant.create', req.body?.actor || 'system', { name, slug, plan: chosenPlan });
  res.status(201).json(tenant);
});

/** GET /api/tenants - list with optional filters */
app.get('/api/tenants', (req, res) => {
  const { status, plan, region } = req.query;
  let list = Array.from(tenants.values());
  if (status) list = list.filter(t => t.status === status);
  if (plan)   list = list.filter(t => t.plan   === plan);
  if (region) list = list.filter(t => t.region === region);
  res.json({ tenants: list, count: list.length });
});

/** GET /api/tenants/:id */
app.get('/api/tenants/:id', (req, res) => {
  const tenant = getTenantOr404(req, res);
  if (!tenant) return;
  res.json(tenant);
});

/** GET /api/tenants/by-slug/:slug */
app.get('/api/tenants/by-slug/:slug', (req, res) => {
  const id = tenantSlugs.get(req.params.slug);
  if (!id) return res.status(404).json({ error: `No tenant with slug '${req.params.slug}'` });
  res.json(tenants.get(id));
});

/** PUT /api/tenants/:id - partial update */
app.put('/api/tenants/:id',requireAuth,  authOrBypass,  (req, res) => {
  const tenant = getTenantOr404(req, res);
  if (!tenant) return;
  const { name, plan, metadata, settings, region } = req.body || {};
  if (plan && !PLAN_LIMITS[plan]) {
    return res.status(400).json({ error: `unknown plan '${plan}'` });
  }
  if (region && !VALID_REGIONS.includes(region)) {
    return res.status(400).json({ error: `unknown region '${region}'` });
  }
  if (name)              tenant.name     = name;
  if (plan)              { tenant.plan = plan; tenant.limits = PLAN_LIMITS[plan]; }
  if (metadata)          tenant.metadata = { ...tenant.metadata, ...metadata };
  if (settings)          tenant.settings = { ...tenant.settings, ...settings };
  if (region)            tenant.region   = region;
  tenant.updatedAt = new Date().toISOString();
  audit(tenant.id, 'tenant.update', req.body?.actor || 'system', { plan, region });
  res.json(tenant);
});

/** DELETE /api/tenants/:id - soft delete (status='deleted') */
app.delete('/api/tenants/:id',requireAuth,  authOrBypass,  (req, res) => {
  const tenant = getTenantOr404(req, res);
  if (!tenant) return;
  tenant.status = 'deleted';
  tenant.updatedAt = new Date().toISOString();
  audit(tenant.id, 'tenant.delete', req.body?.actor || 'system', {});
  res.json({ message: 'Tenant soft-deleted', tenant });
});

/** POST /api/tenants/:id/suspend */
app.post('/api/tenants/:id/suspend',requireAuth,  authOrBypass,  (req, res) => {
  const tenant = getTenantOr404(req, res);
  if (!tenant) return;
  tenant.status = 'suspended';
  tenant.updatedAt = new Date().toISOString();
  audit(tenant.id, 'tenant.suspend', req.body?.actor || 'system', {});
  res.json({ message: 'Tenant suspended', tenant });
});

/** POST /api/tenants/:id/activate */
app.post('/api/tenants/:id/activate',requireAuth,  authOrBypass,  (req, res) => {
  const tenant = getTenantOr404(req, res);
  if (!tenant) return;
  tenant.status = 'active';
  tenant.updatedAt = new Date().toISOString();
  audit(tenant.id, 'tenant.activate', req.body?.actor || 'system', {});
  res.json({ message: 'Tenant activated', tenant });
});

// ---------------------------------------------------------------------------
// Projects - sub-organizations within a tenant
// ---------------------------------------------------------------------------

/** POST /api/tenants/:id/projects */
app.post('/api/tenants/:id/projects',requireAuth,  authOrBypass,  (req, res) => {
  const tenant = getTenantOr404(req, res);
  if (!tenant) return;
  const { name, slug, metadata } = req.body || {};
  if (!name || !slug) {
    return res.status(400).json({ error: 'name and slug are required' });
  }
  // Enforce tenant limit
  const projectCount = Array.from(projects.values()).filter(p => p.tenantId === tenant.id).length;
  if (projectCount >= tenant.limits.maxProjects) {
    return res.status(403).json({
      error: 'Project limit reached for this tenant',
      limit: tenant.limits.maxProjects,
      plan: tenant.plan,
    });
  }
  // slug uniqueness within tenant
  const collision = Array.from(projects.values()).find(
    p => p.tenantId === tenant.id && p.slug === slug
  );
  if (collision) {
    return res.status(409).json({ error: `project slug '${slug}' already exists in this tenant` });
  }
  const project = {
    id: uuidv4(),
    tenantId: tenant.id,
    name,
    slug,
    metadata: metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  projects.set(project.id, project);
  audit(tenant.id, 'project.create', req.body?.actor || 'system', { projectId: project.id, slug });
  res.status(201).json(project);
});

/** GET /api/tenants/:id/projects */
app.get('/api/tenants/:id/projects', (req, res) => {
  const tenant = getTenantOr404(req, res);
  if (!tenant) return;
  const list = Array.from(projects.values()).filter(p => p.tenantId === tenant.id);
  res.json({ projects: list, count: list.length });
});

/** GET /api/projects/:projectId */
app.get('/api/projects/:projectId', (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;
  res.json(project);
});

/** PUT /api/projects/:projectId */
app.put('/api/projects/:projectId',requireAuth,  authOrBypass,  (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;
  const { name, metadata } = req.body || {};
  if (name) project.name = name;
  if (metadata) project.metadata = { ...project.metadata, ...metadata };
  project.updatedAt = new Date().toISOString();
  audit(project.tenantId, 'project.update', req.body?.actor || 'system', { projectId: project.id });
  res.json(project);
});

/** DELETE /api/projects/:projectId */
app.delete('/api/projects/:projectId',requireAuth,  authOrBypass,  (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;
  projects.delete(project.id);
  audit(project.tenantId, 'project.delete', req.body?.actor || 'system', { projectId: project.id });
  res.json({ message: 'Project deleted', projectId: project.id });
});

// ---------------------------------------------------------------------------
// Members - users in a tenant with roles and optional project scoping
// ---------------------------------------------------------------------------

/**
 * Attach a members collection onto each tenant lazily.
 * We don't use a separate Map because membership is always accessed through
 * its tenant - keeps the data model simple and matches the audit grouping.
 */

function ensureMembers(tenant) {
  if (!tenant.members) tenant.members = [];
  return tenant.members;
}

/** POST /api/tenants/:id/members */
app.post('/api/tenants/:id/members',requireAuth,  authOrBypass,  (req, res) => {
  const tenant = getTenantOr404(req, res);
  if (!tenant) return;
  const { userId, email, role, projectIds } = req.body || {};
  if (!userId || !email) {
    return res.status(400).json({ error: 'userId and email are required' });
  }
  const chosenRole = role || 'member';
  if (!VALID_ROLES.includes(chosenRole)) {
    return res.status(400).json({ error: `unknown role '${chosenRole}'`, allowed: VALID_ROLES });
  }
  const members = ensureMembers(tenant);
  if (members.length >= tenant.limits.maxUsers) {
    return res.status(403).json({
      error: 'User limit reached for this tenant',
      limit: tenant.limits.maxUsers,
      plan: tenant.plan,
    });
  }
  if (members.some(m => m.userId === userId)) {
    return res.status(409).json({ error: `user '${userId}' is already a member` });
  }
  const member = {
    userId,
    email,
    role: chosenRole,
    projectIds: Array.isArray(projectIds) ? projectIds : [],
    joinedAt: new Date().toISOString(),
  };
  members.push(member);
  audit(tenant.id, 'member.add', req.body?.actor || 'system', { userId, role: chosenRole });
  res.status(201).json(member);
});

/** GET /api/tenants/:id/members */
app.get('/api/tenants/:id/members', (req, res) => {
  const tenant = getTenantOr404(req, res);
  if (!tenant) return;
  res.json({ members: ensureMembers(tenant), count: tenant.members.length });
});

/** PUT /api/tenants/:id/members/:userId */
app.put('/api/tenants/:id/members/:userId',requireAuth,  authOrBypass,  (req, res) => {
  const tenant = getTenantOr404(req, res);
  if (!tenant) return;
  const { role, projectIds } = req.body || {};
  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `unknown role '${role}'` });
  }
  const member = ensureMembers(tenant).find(m => m.userId === req.params.userId);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  if (role)       member.role       = role;
  if (projectIds) member.projectIds = Array.isArray(projectIds) ? projectIds : [];
  audit(tenant.id, 'member.update', req.body?.actor || 'system', { userId: member.userId, role: member.role });
  res.json(member);
});

/** DELETE /api/tenants/:id/members/:userId */
app.delete('/api/tenants/:id/members/:userId',requireAuth,  authOrBypass,  (req, res) => {
  const tenant = getTenantOr404(req, res);
  if (!tenant) return;
  const idx = ensureMembers(tenant).findIndex(m => m.userId === req.params.userId);
  if (idx === -1) return res.status(404).json({ error: 'Member not found' });
  const removed = tenant.members.splice(idx, 1)[0];
  audit(tenant.id, 'member.remove', req.body?.actor || 'system', { userId: removed.userId });
  res.json({ message: 'Member removed', userId: removed.userId });
});

// ---------------------------------------------------------------------------
// API Keys - per tenant, for service-to-service auth
// ---------------------------------------------------------------------------

/** POST /api/tenants/:id/keys */
app.post('/api/tenants/:id/keys',requireAuth,  authOrBypass,  (req, res) => {
  const tenant = getTenantOr404(req, res);
  if (!tenant) return;
  const { name, scopes, expiresAt } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });

  const plaintext = generateApiKey();
  const keyHash   = hashApiKey(plaintext);
  const record = {
    id: uuidv4(),
    tenantId: tenant.id,
    name,
    scopes: Array.isArray(scopes) ? scopes : (scopes ? [scopes] : ['read']),
    keyPrefix: plaintext.slice(0, 8),     // shown in list view as a hint
    keyHash,                               // NEVER returned in responses
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt || null,
    revokedAt: null,
  };
  apiKeysByHash.set(keyHash, record);
  audit(tenant.id, 'key.create', req.body?.actor || 'system', { keyId: record.id, name });
  // IMPORTANT: plaintext is returned ONLY here, on create
  res.status(201).json({ ...publicKeyView(record), key: plaintext });
});

/** GET /api/tenants/:id/keys */
app.get('/api/tenants/:id/keys', (req, res) => {
  const tenant = getTenantOr404(req, res);
  if (!tenant) return;
  const list = Array.from(apiKeysByHash.values())
    .filter(k => k.tenantId === tenant.id)
    .map(publicKeyView);
  res.json({ keys: list, count: list.length });
});

/** DELETE /api/tenants/:id/keys/:keyId */
app.delete('/api/tenants/:id/keys/:keyId',requireAuth,  authOrBypass,  (req, res) => {
  const tenant = getTenantOr404(req, res);
  if (!tenant) return;
  const entry = Array.from(apiKeysByHash.values()).find(
    k => k.id === req.params.keyId && k.tenantId === tenant.id
  );
  if (!entry) return res.status(404).json({ error: 'API key not found' });
  entry.revokedAt = new Date().toISOString();
  // Keep the record so audits still resolve; hash lookup will be rejected below.
  audit(tenant.id, 'key.revoke', req.body?.actor || 'system', { keyId: entry.id });
  res.json({ message: 'API key revoked', keyId: entry.id });
});

/** POST /api/keys/validate - returns tenant + scopes if valid */
app.post('/api/keys/validate',requireAuth,  authOrBypass,  (req, res) => {
  const { key } = req.body || {};
  if (!key || typeof key !== 'string') {
    return res.status(400).json({ valid: false, error: 'key is required' });
  }
  const hash = hashApiKey(key);
  const record = apiKeysByHash.get(hash);
  if (!record) return res.status(404).json({ valid: false, error: 'Unknown key' });
  if (record.revokedAt) return res.status(401).json({ valid: false, error: 'Key revoked' });
  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
    return res.status(401).json({ valid: false, error: 'Key expired' });
  }
  const tenant = tenants.get(record.tenantId);
  if (!tenant || tenant.status !== 'active') {
    return res.status(403).json({ valid: false, error: 'Tenant not active' });
  }
  // Update last-used timestamp for observability
  record.lastUsedAt = new Date().toISOString();
  res.json({
    valid: true,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    scopes: record.scopes,
    keyId: record.id,
  });
});

// ---------------------------------------------------------------------------
// Usage / Metering - for billing
// ---------------------------------------------------------------------------

/** POST /api/tenants/:id/usage */
app.post('/api/tenants/:id/usage',requireAuth,  authOrBypass,  (req, res) => {
  const tenant = getTenantOr404(req, res);
  if (!tenant) return;
  const { metric, quantity, timestamp, metadata } = req.body || {};
  if (!metric || typeof quantity !== 'number') {
    return res.status(400).json({ error: 'metric (string) and quantity (number) are required' });
  }
  const event = {
    id: uuidv4(),
    tenantId: tenant.id,
    metric,
    quantity,
    timestamp: timestamp || new Date().toISOString(),
    metadata: metadata || {},
    recordedAt: new Date().toISOString(),
  };
  usageEvents.push(event);
  // TODO(integration): forward to Billing for invoice calculation.
  res.status(201).json(event);
});

/** GET /api/tenants/:id/usage - filter by metric, from, to */
app.get('/api/tenants/:id/usage', (req, res) => {
  const tenant = getTenantOr404(req, res);
  if (!tenant) return;
  const { metric, from, to, limit } = req.query;
  let list = usageEvents.filter(e => e.tenantId === tenant.id);
  if (metric) list = list.filter(e => e.metric === metric);
  if (from)   list = list.filter(e => new Date(e.timestamp) >= new Date(from));
  if (to)     list = list.filter(e => new Date(e.timestamp) <= new Date(to));
  const max = Math.min(parseInt(limit, 10) || 1000, 10_000);
  res.json({ events: list.slice(-max), count: list.length });
});

/** GET /api/tenants/:id/usage/aggregate - sum + count by metric */
app.get('/api/tenants/:id/usage/aggregate', (req, res) => {
  const tenant = getTenantOr404(req, res);
  if (!tenant) return;
  const { from, to } = req.query;
  const byMetric = {};
  for (const e of usageEvents) {
    if (e.tenantId !== tenant.id) continue;
    if (from && new Date(e.timestamp) < new Date(from)) continue;
    if (to   && new Date(e.timestamp) > new Date(to))   continue;
    if (!byMetric[e.metric]) byMetric[e.metric] = { metric: e.metric, count: 0, total: 0 };
    byMetric[e.metric].count += 1;
    byMetric[e.metric].total += e.quantity;
  }
  res.json({
    tenantId: tenant.id,
    metrics: Object.values(byMetric),
    plan: tenant.plan,
    monthlyRequestLimit: tenant.limits.monthlyRequestLimit,
  });
});

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

/** GET /api/tenants/:id/audit */
app.get('/api/tenants/:id/audit', (req, res) => {
  const tenant = getTenantOr404(req, res);
  if (!tenant) return;
  const { action, limit } = req.query;
  let entries = auditLog.filter(e => e.tenantId === tenant.id);
  if (action) entries = entries.filter(e => e.action === action);
  const max = Math.min(parseInt(limit, 10) || 200, 5_000);
  res.json({ entries: entries.slice(-max).reverse(), count: entries.length });
});

/** GET /api/audit - global */
app.get('/api/audit', (req, res) => {
  const { tenantId, action, limit } = req.query;
  let entries = auditLog;
  if (tenantId) entries = entries.filter(e => e.tenantId === tenantId);
  if (action)   entries = entries.filter(e => e.action === action);
  const max = Math.min(parseInt(limit, 10) || 200, 5_000);
  res.json({ entries: entries.slice(-max).reverse(), count: entries.length });
});

// ---------------------------------------------------------------------------
// Health & discovery
// ---------------------------------------------------------------------------

/** GET /health (unversioned, like other RTMN services) */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'TenantManager',
    division: 'HOJAI AI Foundation',
    port: PORT,
    plans: Object.keys(PLAN_LIMITS),
    roles: VALID_ROLES,
    regions: VALID_REGIONS,
    uptime: process.uptime(),
  });
});

/** GET /api/health (also exposed under /api for parity with hub proxy) */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'TenantManager',
    port: PORT,
    tenants: tenants.size,
    projects: projects.size,
    apiKeys: apiKeysByHash.size,
    usageEvents: usageEvents.length,
    auditEntries: auditLog.length,
  });
});

// ---------------------------------------------------------------------------
// Pre-seeded data - so the service is useful for demos & integration tests
// ---------------------------------------------------------------------------

function seed() {
  // Tenant
  const acmeId = uuidv4();
  const acme = {
    id: acmeId,
    name: 'Acme Corp',
    slug: 'acme-corp',
    plan: 'pro',
    status: 'active',
    metadata: { industry: 'manufacturing', source: 'pre-seed' },
    settings: { theme: 'dark', locale: 'en-US' },
    region: 'us-east',
    limits: PLAN_LIMITS.pro,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [],
  };
  tenants.set(acme.id, acme);
  tenantSlugs.set(acme.slug, acme.id);

  // Members
  acme.members.push({
    userId: 'user_owner_001',
    email: 'owner@acme.com',
    role: 'owner',
    projectIds: [],
    joinedAt: new Date().toISOString(),
  });
  acme.members.push({
    userId: 'user_admin_001',
    email: 'admin@acme.com',
    role: 'admin',
    projectIds: [],
    joinedAt: new Date().toISOString(),
  });

  // Project
  const projId = uuidv4();
  const project = {
    id: projId,
    tenantId: acme.id,
    name: 'Main App',
    slug: 'main-app',
    metadata: { framework: 'nextjs', source: 'pre-seed' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  projects.set(project.id, project);
  acme.members[0].projectIds = [project.id];
  acme.members[1].projectIds = [project.id];

  // API key
  const seedKeyPlain = generateApiKey();
  const seedKeyHash  = hashApiKey(seedKeyPlain);
  apiKeysByHash.set(seedKeyHash, {
    id: uuidv4(),
    tenantId: acme.id,
    name: 'Seed service key',
    scopes: ['read', 'write'],
    keyPrefix: seedKeyPlain.slice(0, 8),
    keyHash: seedKeyHash,
    createdAt: new Date().toISOString(),
    expiresAt: null,
    revokedAt: null,
  });
  // Stash the seed plaintext in a non-enumerable property so it can be printed
  // in the startup banner but not leaked through JSON serialization.
  Object.defineProperty(app.locals, 'seedApiKey', {
    value: seedKeyPlain, enumerable: false, writable: false, configurable: false,
  });

  // Usage events
  const now = Date.now();
  const seedUsage = [
    { metric: 'calls',        quantity: 142, timestamp: new Date(now - 4 * 86400000).toISOString(), metadata: { endpoint: '/api/orders' } },
    { metric: 'calls',        quantity: 198, timestamp: new Date(now - 3 * 86400000).toISOString(), metadata: { endpoint: '/api/orders' } },
    { metric: 'storage_gb',   quantity: 12.4, timestamp: new Date(now - 2 * 86400000).toISOString(), metadata: {} },
    { metric: 'ai_tokens',    quantity: 54000, timestamp: new Date(now - 1 * 86400000).toISOString(), metadata: { model: 'hojai-base' } },
    { metric: 'calls',        quantity: 221, timestamp: new Date(now).toISOString(), metadata: { endpoint: '/api/users' } },
  ];
  for (const u of seedUsage) {
    usageEvents.push({
      id: uuidv4(),
      tenantId: acme.id,
      metric: u.metric,
      quantity: u.quantity,
      timestamp: u.timestamp,
      metadata: u.metadata,
      recordedAt: new Date().toISOString(),
    });
  }

  // Audit
  audit(acme.id, 'seed.complete', 'system', { tenantId: acme.id, projectId: project.id });

  // eslint-disable-next-line no-console
  console.log('[tenant-manager] pre-seeded tenant "acme-corp" (id=' + acme.id + ')');
  // eslint-disable-next-line no-console
  console.log('[tenant-manager] pre-seeded API key (store now, only shown at startup): ' + seedKeyPlain);
}

seed();

// ---------------------------------------------------------------------------
// Error handler (last)
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error('[tenant-manager] unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ---------------------------------------------------------------------------
// Listen
// ---------------------------------------------------------------------------
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



let server = null;
if (require.main === module && !TENANT_MANAGER_NO_LISTEN) {
  server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log('TenantManager running on port ' + PORT);
    // eslint-disable-next-line no-console
    console.log('Health:    http://localhost:' + PORT + '/health');
    // eslint-disable-next-line no-console
    console.log('Tenants:   http://localhost:' + PORT + '/api/tenants');
  });
  installGracefulShutdown(server);
}

module.exports = app;
module.exports.app = app;
module.exports.authOrBypass = authOrBypass;
module.exports.TENANT_MANAGER_REQUIRE_AUTH = TENANT_MANAGER_REQUIRE_AUTH;
module.exports.TENANT_MANAGER_NO_LISTEN = TENANT_MANAGER_NO_LISTEN;
module.exports.SERVICE_NAME = SERVICE_NAME;
