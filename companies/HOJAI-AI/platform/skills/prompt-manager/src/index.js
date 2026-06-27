/**
 * RTMN Prompt Manager v1.0
 *
 * Centralized prompt template management for the HOJAI AI ecosystem.
 * Modeled after prompt-layer tools (PromptLayer / LangSmith Hub / Helicone).
 *
 * Features:
 *  - Versioned prompt templates with full history and rollback
 *  - Variable extraction + validation against {{varName}} / {{varName|default}} syntax
 *  - Render endpoint that resolves variables and returns model hints
 *  - A/B experiments with weighted variant selection and event tracking
 *  - Audit log of every template / version / experiment / render action
 *  - Full-text search across template names, descriptions, and tags
 *
 * @author HOJAI AI - Training & Model Platform Division (Division 7)
 * @version 1.0.0
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4771;
const SERVICE_NAME = 'prompt-manager';

// ============ CONSTANTS ============

const VALID_CATEGORIES = new Set([
  'sales', 'marketing', 'support', 'analysis', 'creative', 'system', 'other'
]);

const VALID_EXPERIMENT_STATUSES = new Set(['draft', 'running', 'completed', 'abandoned']);

// In-memory counters for /api/stats. Render and event counts come from
// the audit log, but we keep hot counters so /stats is O(1).
const counters = {
  renders: 0,
  abEvents: 0
};

// ============ IN-MEMORY STORAGE ============
//
// Storage is three Maps plus an audit log, all in-memory. See the TODOs
// at the bottom for the production hardening roadmap (Postgres, Redis,
// Object Store for rendered-output samples, etc).

/** @type {Map<string, object>} templateId -> template record */
const templates = new PersistentMap('templates', { serviceName: 'prompt-manager' });

/** @type {Map<string, string>} slug -> templateId (slug index) */
const slugIndex = new PersistentMap('slug-index', { serviceName: 'prompt-manager' });

/** @type {Map<string, object>} experimentId -> experiment record */
const experiments = new PersistentMap('experiments', { serviceName: 'prompt-manager' });

/** @type {Array<object>} append-only audit log */
const auditLog = [];

// ============ HELPERS ============

/**
 * Identify the requesting principal from headers.
 * @param {import('express').Request} req
 * @returns {string}
 */
function principalOf(req) {
  return (
    req.headers['x-actor'] ||
    req.headers['x-principal'] ||
    req.headers['x-user-id'] ||
    (req.headers.authorization ? 'auth:' + req.headers.authorization.slice(0, 12) : 'anonymous')
  );
}

/**
 * Record an entry in the audit log.
 * @param {object} entry
 */
function audit(entry) {
  const record = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...entry
  };
  auditLog.push(record);
  // Keep audit log bounded in this in-memory stub.
  if (auditLog.length > 10000) auditLog.shift();
  return record;
}

/**
 * Validate that a slug contains only URL-safe characters.
 * @param {string} slug
 */
function isValidSlug(slug) {
  return typeof slug === 'string' && /^[a-z0-9][a-z0-9-_]{0,79}$/.test(slug);
}

/**
 * Extract {{varName}} or {{varName|default}} placeholders from a template
 * string. Duplicates are returned once, in first-seen order.
 * @param {string} text
 * @returns {string[]} list of variable names
 */
function extractVariables(text) {
  if (typeof text !== 'string') return [];
  const seen = new Set();
  const ordered = [];
  const re = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\|\s*([^}]*?)\s*)?\}\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    if (!seen.has(name)) {
      seen.add(name);
      ordered.push(name);
    }
  }
  return ordered;
}

/**
 * Parse a default-value clause (text after `|` inside a placeholder).
 * @param {string|undefined} clause
 */
function parseDefault(clause) {
  if (clause === undefined) return undefined;
  const trimmed = String(clause).trim();
  if (trimmed === '') return '';
  // Strip surrounding quotes if present.
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Render a template string with the given variables.
 * Supports {{var}} and {{var|default}} syntax.
 * @param {string} text
 * @param {object} variables
 * @returns {{rendered:string, missing:string[]}}
 */
function renderTemplate(text, variables) {
  const missing = [];
  const rendered = String(text).replace(
    /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\|\s*([^}]*?)\s*)?\}\}/g,
    (_full, name, defClause) => {
      if (variables && Object.prototype.hasOwnProperty.call(variables, name)) {
        const v = variables[name];
        return v === null || v === undefined ? '' : String(v);
      }
      if (defClause !== undefined) {
        return parseDefault(defClause);
      }
      missing.push(name);
      return '';
    }
  );
  return { rendered, missing };
}

/**
 * Look up a template by id OR slug.
 * @param {string} idOrSlug
 * @returns {object|null}
 */
function findTemplate(idOrSlug) {
  if (templates.has(idOrSlug)) return templates.get(idOrSlug);
  const id = slugIndex.get(idOrSlug);
  return id ? templates.get(id) || null : null;
}

/**
 * Project a template into a safe public view.
 * @param {object} t
 */
function toTemplateView(t) {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description || '',
    category: t.category,
    tags: t.tags || [],
    variables: t.variables || [],
    version: t.version,
    currentVersion: t.currentVersion,
    versionCount: t.versions.length,
    modelHints: t.modelHints || {},
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    createdBy: t.createdBy
  };
}

/**
 * Project a version into a public view (includes template text).
 * @param {object} v
 */
function toVersionView(v) {
  return {
    id: v.id,
    templateId: v.templateId,
    version: v.version,
    template: v.template,
    modelHints: v.modelHints || {},
    createdAt: v.createdAt,
    createdBy: v.createdBy,
    changeNote: v.changeNote || ''
  };
}

/**
 * Project an experiment into a public view.
 * @param {object} e
 */
function toExperimentView(e) {
  return {
    id: e.id,
    name: e.name,
    templateId: e.templateId,
    templateSlug: e.templateSlug,
    variants: e.variants,
    status: e.status,
    metrics: e.metrics,
    startDate: e.startDate,
    endDate: e.endDate || null,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    createdBy: e.createdBy
  };
}

/**
 * Pick an experiment variant using weighted random selection.
 * @param {object} experiment
 * @returns {number} the chosen version number
 */
function pickVariant(experiment) {
  const total = experiment.variants.reduce((s, v) => s + (v.weight || 0), 0);
  if (total <= 0) {
    return experiment.variants[0].version;
  }
  let r = Math.random() * total;
  for (const v of experiment.variants) {
    r -= (v.weight || 0);
    if (r <= 0) return v.version;
  }
  return experiment.variants[experiment.variants.length - 1].version;
}

/**
 * Recompute aggregated metrics for an experiment from its event log.
 * @param {object} experiment
 */
function recomputeMetrics(experiment) {
  const m = {};
  for (const v of experiment.variants) {
    m[v.version] = {
      impressions: 0,
      conversions: 0,
      conversionRate: 0,
      avgLatencyMs: 0,
      _latencySum: 0,
      _latencyCount: 0
    };
  }
  for (const ev of experiment.events) {
    const bucket = m[ev.variantVersion];
    if (!bucket) continue;
    if (ev.eventType === 'impression') {
      bucket.impressions += 1;
    } else if (ev.eventType === 'conversion') {
      bucket.conversions += 1;
    }
    if (typeof ev.latencyMs === 'number' && ev.latencyMs >= 0) {
      bucket._latencySum += ev.latencyMs;
      bucket._latencyCount += 1;
    }
  }
  // Finalize derived fields, then strip internal accumulators.
  const finalMetrics = {};
  for (const [v, b] of Object.entries(m)) {
    b.conversionRate = b.impressions > 0 ? b.conversions / b.impressions : 0;
    b.avgLatencyMs = b._latencyCount > 0 ? Math.round(b._latencySum / b._latencyCount) : 0;
    delete b._latencySum;
    delete b._latencyCount;
    finalMetrics[v] = b;
  }
  experiment.metrics = finalMetrics;
}

// ============ SEED DATA ============
//
// Three example templates covering system / sales / support, plus one
// running experiment on the welcome message.

(function seed() {
  const now = new Date().toISOString();

  // 1) Welcome message (system)
  const t1Id = uuidv4();
  const t1Versions = [
    {
      id: uuidv4(),
      templateId: t1Id,
      version: 1,
      template: 'Welcome to HOJAI AI, {{name}}! We are glad to have you here.',
      modelHints: { preferredTier: 'fast', preferProvider: 'hojai', maxTokens: 128, temperature: 0.7 },
      createdAt: now,
      createdBy: 'system:seed',
      changeNote: 'initial version'
    },
    {
      id: uuidv4(),
      templateId: t1Id,
      version: 2,
      template: 'Hi {{name|Guest}}, welcome aboard HOJAI AI! Your account is ready at {{company}}.',
      modelHints: { preferredTier: 'fast', preferProvider: 'hojai', maxTokens: 128, temperature: 0.7 },
      createdAt: now,
      createdBy: 'system:seed',
      changeNote: 'added company fallback'
    }
  ];
  templates.set(t1Id, {
    id: t1Id,
    slug: 'welcome-message',
    name: 'Welcome Message',
    description: 'Sent to new users immediately after signup.',
    category: 'system',
    tags: ['onboarding', 'greeting'],
    variables: [
      { name: 'name', description: 'User full name', defaultValue: 'Guest', required: false },
      { name: 'company', description: 'User company name', required: false }
    ],
    versions: t1Versions,
    version: 2,
    currentVersion: 2,
    modelHints: { preferredTier: 'fast', preferProvider: 'hojai', maxTokens: 128, temperature: 0.7 },
    createdAt: now,
    updatedAt: now,
    createdBy: 'system:seed'
  });
  slugIndex.set('welcome-message', t1Id);

  // 2) Sales cold email (sales)
  const t2Id = uuidv4();
  const t2V1 = {
    id: uuidv4(),
    templateId: t2Id,
    version: 1,
    template:
      "Hi {{firstName}},\n\nI noticed {{company}} is in the {{industry}} space. " +
      "We're helping similar teams cut their prompt iteration time by 60%.\n\n" +
      "Worth a 15-minute call this week?\n\n— {{senderName}}",
    modelHints: { preferredTier: 'balanced', preferProvider: 'openai', maxTokens: 256, temperature: 0.6 },
    createdAt: now,
    createdBy: 'system:seed',
    changeNote: 'initial version'
  };
  templates.set(t2Id, {
    id: t2Id,
    slug: 'sales-cold-email',
    name: 'Sales Cold Email',
    description: 'Outbound cold email used by the sales agent for first-touch outreach.',
    category: 'sales',
    tags: ['outbound', 'email', 'lead-gen'],
    variables: [
      { name: 'firstName', description: 'Prospect first name', required: true },
      { name: 'company', description: 'Prospect company', required: true },
      { name: 'industry', description: 'Prospect industry', required: true },
      { name: 'senderName', description: 'Sender display name', defaultValue: 'The HOJAI Team', required: false }
    ],
    versions: [t2V1],
    version: 1,
    currentVersion: 1,
    modelHints: { preferredTier: 'balanced', preferProvider: 'openai', maxTokens: 256, temperature: 0.6 },
    createdAt: now,
    updatedAt: now,
    createdBy: 'system:seed'
  });
  slugIndex.set('sales-cold-email', t2Id);

  // 3) Customer support response (support) — with conditional {{tier}} blocks.
  const t3Id = uuidv4();
  const t3V1 = {
    id: uuidv4(),
    templateId: t3Id,
    version: 1,
    template:
      "Hi {{customerName}},\n\n" +
      "Thanks for reaching out about '{{subject}}'.\n\n" +
      "{{#if tier==premium}}As a Premium customer, your issue is being escalated to our priority queue and you will hear back within 1 hour.{{#else}}Our team will get back to you within 24 hours.{{/if}}\n\n" +
      "Reference number: {{ticketId}}\n\n— HOJAI Support",
    modelHints: { preferredTier: 'balanced', preferProvider: 'hojai', maxTokens: 512, temperature: 0.4 },
    createdAt: now,
    createdBy: 'system:seed',
    changeNote: 'initial version with tier-based branching'
  };
  templates.set(t3Id, {
    id: t3Id,
    slug: 'customer-support-response',
    name: 'Customer Support Response',
    description: 'Auto-drafted reply for support tickets. Adapts tone based on customer tier.',
    category: 'support',
    tags: ['support', 'auto-reply', 'tiered'],
    variables: [
      { name: 'customerName', description: 'Customer name', required: true },
      { name: 'subject', description: 'Ticket subject', required: true },
      { name: 'ticketId', description: 'Ticket reference id', required: true },
      { name: 'tier', description: 'Customer tier (premium | standard)', required: false }
    ],
    versions: [t3V1],
    version: 1,
    currentVersion: 1,
    modelHints: { preferredTier: 'balanced', preferProvider: 'hojai', maxTokens: 512, temperature: 0.4 },
    createdAt: now,
    updatedAt: now,
    createdBy: 'system:seed'
  });
  slugIndex.set('customer-support-response', t3Id);

  // 4) Example experiment on welcome-message (50/50)
  const expId = uuidv4();
  experiments.set(expId, {
    id: expId,
    name: 'Welcome Message v1 vs v2',
    templateId: t1Id,
    templateSlug: 'welcome-message',
    variants: [
      { version: 1, weight: 0.5 },
      { version: 2, weight: 0.5 }
    ],
    status: 'running',
    metrics: {},
    events: [],
    startDate: now,
    endDate: null,
    createdAt: now,
    updatedAt: now,
    createdBy: 'system:seed'
  });
  recomputeMetrics(experiments.get(expId));
})();

// ============ EXPRESS APP ============

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
app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '1mb' }));

// ============ HEALTH ============

/**
 * GET /health (redirect to /api/health for consistency with other RTMN services).
 */
app.get('/health', (req, res) => res.redirect(301, '/api/health'));

/**
 * GET /api/health — liveness + service stats.
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    version: '1.0.0',
    stats: {
      templates: templates.size,
      versions: Array.from(templates.values()).reduce((s, t) => s + t.versions.length, 0),
      experiments: experiments.size,
      runningExperiments: Array.from(experiments.values()).filter(e => e.status === 'running').length,
      renders: counters.renders,
      abEvents: counters.abEvents,
      auditEntries: auditLog.length
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/stats — same numbers as /api/health, dedicated endpoint.
 */
app.get('/api/stats', (req, res) => {
  const running = Array.from(experiments.values()).filter(e => e.status === 'running').length;
  const completed = Array.from(experiments.values()).filter(e => e.status === 'completed').length;
  res.json({
    templates: templates.size,
    versions: Array.from(templates.values()).reduce((s, t) => s + t.versions.length, 0),
    experiments: experiments.size,
    experimentsRunning: running,
    experimentsCompleted: completed,
    renders: counters.renders,
    abEvents: counters.abEvents,
    auditEntries: auditLog.length,
    timestamp: new Date().toISOString()
  });
});

// ============ TEMPLATE CRUD ============

/**
 * POST /api/templates — create a new template.
 * Body: { slug, name, description?, category, initialTemplate, variables?, tags?, modelHints? }
 */
app.post('/api/templates',requireAuth,  (req, res) => {
  const { slug, name, description, category, initialTemplate, variables, tags, modelHints } = req.body || {};
  if (!slug || !isValidSlug(slug)) {
    return res.status(400).json({ error: 'slug is required and must match /^[a-z0-9][a-z0-9-_]{0,79}$/' });
  }
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name (string) is required' });
  }
  if (!category || !VALID_CATEGORIES.has(category)) {
    return res.status(400).json({ error: `category must be one of: ${Array.from(VALID_CATEGORIES).join(', ')}` });
  }
  if (typeof initialTemplate !== 'string' || initialTemplate.trim() === '') {
    return res.status(400).json({ error: 'initialTemplate (non-empty string) is required' });
  }
  if (slugIndex.has(slug)) {
    return res.status(409).json({ error: `Template with slug "${slug}" already exists` });
  }

  // Extract variables from the initial template body; if the caller passed
  // a `variables` array, merge defaults from it.
  const extracted = extractVariables(initialTemplate);
  const providedVars = Array.isArray(variables) ? variables : [];
  const providedMap = new Map(providedVars.map(v => [v.name, v]));
  const mergedVars = extracted.map(name => {
    const p = providedMap.get(name);
    return p
      ? {
          name,
          description: p.description || '',
          defaultValue: p.defaultValue,
          required: typeof p.required === 'boolean' ? p.required : true
        }
      : { name, description: '', defaultValue: undefined, required: true };
  });

  const now = new Date().toISOString();
  const id = uuidv4();
  const versionId = uuidv4();
  const firstVersion = {
    id: versionId,
    templateId: id,
    version: 1,
    template: initialTemplate,
    modelHints: modelHints || {},
    createdAt: now,
    createdBy: principalOf(req),
    changeNote: 'initial version'
  };

  const record = {
    id,
    slug,
    name,
    description: description || '',
    category,
    tags: Array.isArray(tags) ? tags : [],
    variables: mergedVars,
    versions: [firstVersion],
    version: 1,
    currentVersion: 1,
    modelHints: modelHints || {},
    createdAt: now,
    updatedAt: now,
    createdBy: principalOf(req)
  };

  templates.set(id, record);
  slugIndex.set(slug, id);

  audit({
    type: 'template.create',
    templateId: id,
    slug,
    category,
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });

  res.status(201).json({
    message: 'Template created',
    template: toTemplateView(record),
    version: toVersionView(firstVersion)
  });
});

/**
 * GET /api/templates — list all templates.
 * Optional filters: ?category=, ?tag=
 */
app.get('/api/templates', (req, res) => {
  let list = Array.from(templates.values());
  if (req.query.category) {
    const cat = String(req.query.category);
    list = list.filter(t => t.category === cat);
  }
  if (req.query.tag) {
    const tag = String(req.query.tag);
    list = list.filter(t => Array.isArray(t.tags) && t.tags.includes(tag));
  }
  res.json({
    count: list.length,
    templates: list.map(toTemplateView)
  });
});

/**
 * GET /api/templates/:idOrSlug
 */
app.get('/api/templates/:idOrSlug', (req, res) => {
  const t = findTemplate(req.params.idOrSlug);
  if (!t) return res.status(404).json({ error: 'Template not found' });
  res.json({ template: toTemplateView(t) });
});

/**
 * PATCH /api/templates/:idOrSlug — update mutable metadata (name, description,
 * category, tags, variables). Body must contain at least one updatable field.
 */
app.patch('/api/templates/:idOrSlug',requireAuth,  (req, res) => {
  const t = findTemplate(req.params.idOrSlug);
  if (!t) return res.status(404).json({ error: 'Template not found' });
  const { name, description, category, tags, variables, modelHints } = req.body || {};
  if (name === undefined && description === undefined && category === undefined &&
      tags === undefined && variables === undefined && modelHints === undefined) {
    return res.status(400).json({ error: 'At least one updatable field is required' });
  }
  if (category !== undefined && !VALID_CATEGORIES.has(category)) {
    return res.status(400).json({ error: `category must be one of: ${Array.from(VALID_CATEGORIES).join(', ')}` });
  }
  if (name !== undefined) t.name = name;
  if (description !== undefined) t.description = description;
  if (category !== undefined) t.category = category;
  if (tags !== undefined) {
    if (!Array.isArray(tags)) return res.status(400).json({ error: 'tags must be an array' });
    t.tags = tags;
  }
  if (variables !== undefined) {
    if (!Array.isArray(variables)) return res.status(400).json({ error: 'variables must be an array' });
    t.variables = variables;
  }
  if (modelHints !== undefined) {
    if (typeof modelHints !== 'object' || Array.isArray(modelHints)) {
      return res.status(400).json({ error: 'modelHints must be an object' });
    }
    t.modelHints = modelHints;
  }
  t.updatedAt = new Date().toISOString();

  audit({
    type: 'template.update',
    templateId: t.id,
    slug: t.slug,
    principal: principalOf(req),
    success: true,
    ip: req.ip,
    fields: Object.keys(req.body || {})
  });

  res.json({ message: 'Template updated', template: toTemplateView(t) });
});

/**
 * DELETE /api/templates/:idOrSlug — remove the template, all its versions,
 * and any experiments that reference it.
 */
app.delete('/api/templates/:idOrSlug',requireAuth,  (req, res) => {
  const t = findTemplate(req.params.idOrSlug);
  if (!t) return res.status(404).json({ error: 'Template not found' });

  // Cascade-delete experiments that point at this template.
  const droppedExperiments = [];
  for (const [eid, e] of experiments.entries()) {
    if (e.templateId === t.id) {
      experiments.delete(eid);
      droppedExperiments.push(eid);
    }
  }

  templates.delete(t.id);
  slugIndex.delete(t.slug);

  audit({
    type: 'template.delete',
    templateId: t.id,
    slug: t.slug,
    principal: principalOf(req),
    success: true,
    ip: req.ip,
    droppedExperiments
  });

  res.json({
    message: 'Template deleted',
    id: t.id,
    slug: t.slug,
    droppedExperiments
  });
});

// ============ VERSIONING ============

/**
 * POST /api/templates/:idOrSlug/versions — add a new version.
 * Body: { template, changeNote?, modelHints? }
 */
app.post('/api/templates/:idOrSlug/versions',requireAuth,  (req, res) => {
  const t = findTemplate(req.params.idOrSlug);
  if (!t) return res.status(404).json({ error: 'Template not found' });
  const { template, changeNote, modelHints } = req.body || {};
  if (typeof template !== 'string' || template.trim() === '') {
    return res.status(400).json({ error: 'template (non-empty string) is required' });
  }
  const newVersion = t.version + 1;
  const now = new Date().toISOString();
  const versionRecord = {
    id: uuidv4(),
    templateId: t.id,
    version: newVersion,
    template,
    modelHints: modelHints || t.modelHints || {},
    createdAt: now,
    createdBy: principalOf(req),
    changeNote: changeNote || ''
  };
  t.versions.push(versionRecord);
  t.version = newVersion;
  t.currentVersion = newVersion;
  t.updatedAt = now;

  // Refresh the extracted variable list based on the new body.
  const extracted = extractVariables(template);
  const existingMap = new Map((t.variables || []).map(v => [v.name, v]));
  t.variables = extracted.map(name => existingMap.get(name) || { name, description: '', required: true });

  audit({
    type: 'template.version.add',
    templateId: t.id,
    slug: t.slug,
    version: newVersion,
    changeNote: changeNote || '',
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });

  res.status(201).json({
    message: 'New version created',
    template: toTemplateView(t),
    version: toVersionView(versionRecord)
  });
});

/**
 * GET /api/templates/:idOrSlug/versions — full version history.
 */
app.get('/api/templates/:idOrSlug/versions', (req, res) => {
  const t = findTemplate(req.params.idOrSlug);
  if (!t) return res.status(404).json({ error: 'Template not found' });
  res.json({
    templateId: t.id,
    slug: t.slug,
    currentVersion: t.currentVersion,
    count: t.versions.length,
    versions: t.versions.map(v => ({
      version: v.version,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
      changeNote: v.changeNote || '',
      isCurrent: v.version === t.currentVersion,
      modelHints: v.modelHints || {}
    }))
  });
});

/**
 * GET /api/templates/:idOrSlug/versions/:version — one version's full body.
 */
app.get('/api/templates/:idOrSlug/versions/:version', (req, res) => {
  const t = findTemplate(req.params.idOrSlug);
  if (!t) return res.status(404).json({ error: 'Template not found' });
  const v = parseInt(req.params.version, 10);
  const found = t.versions.find(x => x.version === v);
  if (!found) return res.status(404).json({ error: `Version ${req.params.version} not found` });
  res.json({ version: toVersionView(found), isCurrent: t.currentVersion === v });
});

/**
 * POST /api/templates/:idOrSlug/rollback — point currentVersion at an
 * existing version. Does NOT delete anything; the version chain is preserved.
 * Body: { version }
 */
app.post('/api/templates/:idOrSlug/rollback',requireAuth,  (req, res) => {
  const t = findTemplate(req.params.idOrSlug);
  if (!t) return res.status(404).json({ error: 'Template not found' });
  const target = parseInt(req.body && req.body.version, 10);
  if (!Number.isInteger(target)) {
    return res.status(400).json({ error: 'version (integer) is required' });
  }
  const exists = t.versions.find(v => v.version === target);
  if (!exists) return res.status(404).json({ error: `Version ${target} does not exist` });
  const previous = t.currentVersion;
  t.currentVersion = target;
  t.modelHints = exists.modelHints || t.modelHints;
  t.updatedAt = new Date().toISOString();

  audit({
    type: 'template.rollback',
    templateId: t.id,
    slug: t.slug,
    fromVersion: previous,
    toVersion: target,
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });

  res.json({
    message: 'Template rolled back',
    template: toTemplateView(t),
    fromVersion: previous,
    toVersion: target
  });
});

// ============ RENDER ============

/**
 * POST /api/templates/:idOrSlug/render
 * Body: { variables: {...}, version?: number, experimentId?: string }
 *
 * - If `experimentId` is supplied and references a running experiment on this
 *   template, a weighted-random variant version is chosen.
 * - If `version` is supplied, that specific version is rendered.
 * - Otherwise the current version is rendered.
 *
 * Required variables that are missing cause the render to fail with 400.
 */
app.post('/api/templates/:idOrSlug/render',requireAuth,  (req, res) => {
  const t = findTemplate(req.params.idOrSlug);
  if (!t) return res.status(404).json({ error: 'Template not found' });
  const { variables, version, experimentId } = req.body || {};
  const vars = (variables && typeof variables === 'object') ? variables : {};

  let chosenVersion = t.currentVersion;
  let experimentContext = null;

  if (experimentId) {
    const exp = experiments.get(experimentId);
    if (!exp) return res.status(404).json({ error: 'Experiment not found' });
    if (exp.templateId !== t.id) {
      return res.status(400).json({ error: 'Experiment does not target this template' });
    }
    if (exp.status !== 'running') {
      return res.status(400).json({ error: `Experiment is not running (status=${exp.status})` });
    }
    chosenVersion = pickVariant(exp);
    experimentContext = { experimentId: exp.id, experimentName: exp.name };
  } else if (version !== undefined) {
    const v = parseInt(version, 10);
    if (!Number.isInteger(v)) return res.status(400).json({ error: 'version must be an integer' });
    if (!t.versions.find(x => x.version === v)) {
      return res.status(404).json({ error: `Version ${v} not found` });
    }
    chosenVersion = v;
  }

  const versionRec = t.versions.find(v => v.version === chosenVersion);
  const { rendered, missing } = renderTemplate(versionRec.template, vars);

  // Enforce required-variable contract from the template metadata.
  const requiredMissing = (t.variables || [])
    .filter(v => v.required)
    .filter(v => !(vars && Object.prototype.hasOwnProperty.call(vars, v.name)) && v.defaultValue === undefined)
    .map(v => v.name);

  const allMissing = Array.from(new Set([...missing, ...requiredMissing]));

  counters.renders += 1;
  audit({
    type: 'render',
    templateId: t.id,
    slug: t.slug,
    version: chosenVersion,
    experimentId: experimentContext ? experimentContext.experimentId : null,
    principal: principalOf(req),
    success: allMissing.length === 0,
    missingVariables: allMissing,
    ip: req.ip
  });

  res.json({
    rendered,
    modelHints: versionRec.modelHints || t.modelHints || {},
    version: chosenVersion,
    isCurrent: chosenVersion === t.currentVersion,
    missingVariables: allMissing,
    experiment: experimentContext,
    templateId: t.id,
    slug: t.slug
  });
});

/**
 * POST /api/render — render an ad-hoc template string. No versioning, no
 * experiment selection. Useful for one-off prompts. Body: { templateText, variables }
 */
app.post('/api/render',requireAuth,  (req, res) => {
  const { templateText, variables } = req.body || {};
  if (typeof templateText !== 'string' || templateText === '') {
    return res.status(400).json({ error: 'templateText (string) is required' });
  }
  const vars = (variables && typeof variables === 'object') ? variables : {};
  const { rendered, missing } = renderTemplate(templateText, vars);
  counters.renders += 1;
  audit({
    type: 'render.adhoc',
    principal: principalOf(req),
    success: missing.length === 0,
    missingVariables: missing,
    ip: req.ip
  });
  res.json({
    rendered,
    missingVariables: missing,
    variables: extractVariables(templateText)
  });
});

// ============ EXPERIMENTS ============

/**
 * POST /api/experiments — create an A/B experiment on a template.
 * Body: { name, templateId, variants: [{ version, weight }], status? }
 */
app.post('/api/experiments',requireAuth,  (req, res) => {
  const { name, templateId, variants, status } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name (string) is required' });
  }
  const t = findTemplate(templateId);
  if (!t) return res.status(404).json({ error: 'templateId (id or slug) does not match any template' });
  if (!Array.isArray(variants) || variants.length < 2) {
    return res.status(400).json({ error: 'variants must be an array of at least 2 entries' });
  }
  for (const v of variants) {
    if (!Number.isInteger(v.version) || !t.versions.find(x => x.version === v.version)) {
      return res.status(400).json({ error: `variant.version ${v.version} is not a valid template version` });
    }
    if (typeof v.weight !== 'number' || v.weight < 0) {
      return res.status(400).json({ error: 'variant.weight must be a non-negative number' });
    }
  }
  const expStatus = status || 'draft';
  if (!VALID_EXPERIMENT_STATUSES.has(expStatus)) {
    return res.status(400).json({ error: `status must be one of: ${Array.from(VALID_EXPERIMENT_STATUSES).join(', ')}` });
  }

  const now = new Date().toISOString();
  const id = uuidv4();
  const record = {
    id,
    name,
    templateId: t.id,
    templateSlug: t.slug,
    variants: variants.map(v => ({ version: v.version, weight: v.weight })),
    status: expStatus,
    metrics: {},
    events: [],
    startDate: expStatus === 'running' ? now : null,
    endDate: null,
    createdAt: now,
    updatedAt: now,
    createdBy: principalOf(req)
  };
  experiments.set(id, record);
  recomputeMetrics(record);

  audit({
    type: 'experiment.create',
    experimentId: id,
    templateId: t.id,
    slug: t.slug,
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });

  res.status(201).json({
    message: 'Experiment created',
    experiment: toExperimentView(record)
  });
});

/**
 * GET /api/experiments — list all experiments. Optional filter: ?status=, ?templateId=
 */
app.get('/api/experiments', (req, res) => {
  let list = Array.from(experiments.values());
  if (req.query.status) {
    const s = String(req.query.status);
    list = list.filter(e => e.status === s);
  }
  if (req.query.templateId) {
    const tid = String(req.query.templateId);
    list = list.filter(e => e.templateId === tid);
  }
  res.json({ count: list.length, experiments: list.map(toExperimentView) });
});

/**
 * GET /api/experiments/:id — get one experiment with full metrics.
 */
app.get('/api/experiments/:id', (req, res) => {
  const e = experiments.get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Experiment not found' });
  recomputeMetrics(e); // keep metrics fresh
  res.json({ experiment: toExperimentView(e) });
});

/**
 * PATCH /api/experiments/:id — update status, variants, name. Adjusts
 * startDate / endDate automatically based on status transitions.
 */
app.patch('/api/experiments/:id',requireAuth,  (req, res) => {
  const e = experiments.get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Experiment not found' });
  const { name, status, variants } = req.body || {};
  if (status !== undefined && !VALID_EXPERIMENT_STATUSES.has(status)) {
    return res.status(400).json({ error: `status must be one of: ${Array.from(VALID_EXPERIMENT_STATUSES).join(', ')}` });
  }
  if (variants !== undefined) {
    if (!Array.isArray(variants) || variants.length < 2) {
      return res.status(400).json({ error: 'variants must be an array of at least 2 entries' });
    }
    const t = templates.get(e.templateId);
    for (const v of variants) {
      if (!Number.isInteger(v.version) || !t.versions.find(x => x.version === v.version)) {
        return res.status(400).json({ error: `variant.version ${v.version} is not a valid template version` });
      }
      if (typeof v.weight !== 'number' || v.weight < 0) {
        return res.status(400).json({ error: 'variant.weight must be a non-negative number' });
      }
    }
    e.variants = variants.map(v => ({ version: v.version, weight: v.weight }));
  }
  const previousStatus = e.status;
  if (name !== undefined) e.name = name;
  if (status !== undefined) e.status = status;
  const now = new Date().toISOString();
  if (previousStatus !== 'running' && e.status === 'running') e.startDate = now;
  if (previousStatus === 'running' && (e.status === 'completed' || e.status === 'abandoned')) {
    e.endDate = now;
  }
  e.updatedAt = now;
  recomputeMetrics(e);

  audit({
    type: 'experiment.update',
    experimentId: e.id,
    principal: principalOf(req),
    success: true,
    ip: req.ip,
    fields: Object.keys(req.body || {}),
    previousStatus
  });

  res.json({ message: 'Experiment updated', experiment: toExperimentView(e) });
});

/**
 * POST /api/experiments/:id/event — record an impression or conversion.
 * Body: { variantVersion, eventType: 'impression'|'conversion', latencyMs?, metadata? }
 */
app.post('/api/experiments/:id/event',requireAuth,  (req, res) => {
  const e = experiments.get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Experiment not found' });
  const { variantVersion, eventType, latencyMs, metadata } = req.body || {};
  if (!Number.isInteger(variantVersion)) {
    return res.status(400).json({ error: 'variantVersion (integer) is required' });
  }
  if (!e.variants.find(v => v.version === variantVersion)) {
    return res.status(400).json({ error: `variantVersion ${variantVersion} is not part of this experiment` });
  }
  if (eventType !== 'impression' && eventType !== 'conversion') {
    return res.status(400).json({ error: "eventType must be 'impression' or 'conversion'" });
  }
  if (latencyMs !== undefined && (typeof latencyMs !== 'number' || latencyMs < 0)) {
    return res.status(400).json({ error: 'latencyMs must be a non-negative number when present' });
  }

  const event = {
    id: uuidv4(),
    variantVersion,
    eventType,
    latencyMs: typeof latencyMs === 'number' ? latencyMs : null,
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
    timestamp: new Date().toISOString()
  };
  e.events.push(event);
  counters.abEvents += 1;
  recomputeMetrics(e);

  audit({
    type: 'experiment.event',
    experimentId: e.id,
    variantVersion,
    eventType,
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });

  res.status(201).json({
    message: 'Event recorded',
    eventId: event.id,
    metrics: e.metrics
  });
});

// ============ AUDIT & SEARCH ============

/**
 * GET /api/audit — full audit log (all template + experiment + render events).
 * Optional filters: ?type=template.create, ?templateId=, ?experimentId=, ?limit=
 */
app.get('/api/audit', (req, res) => {
  let entries = auditLog;
  if (req.query.type) {
    const t = String(req.query.type);
    entries = entries.filter(e => e.type === t);
  }
  if (req.query.templateId) {
    const tid = String(req.query.templateId);
    entries = entries.filter(e => e.templateId === tid);
  }
  if (req.query.experimentId) {
    const eid = String(req.query.experimentId);
    entries = entries.filter(e => e.experimentId === eid);
  }
  if (req.query.principal) {
    const p = String(req.query.principal);
    entries = entries.filter(e => e.principal === p);
  }
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
  res.json({ count: entries.length, entries: entries.slice(-limit) });
});

/**
 * GET /api/search?q=... — full-text-ish search across template names,
 * descriptions, tags, and slugs. Case-insensitive substring match.
 */
app.get('/api/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ count: 0, query: '', results: [] });
  const results = Array.from(templates.values()).filter(t => {
    const hay = [
      t.name || '',
      t.description || '',
      t.slug || '',
      (t.tags || []).join(' '),
      t.category || ''
    ].join(' ').toLowerCase();
    return hay.includes(q);
  });
  res.json({
    count: results.length,
    query: q,
    results: results.map(toTemplateView)
  });
});

// ============ ERROR HANDLERS ============

app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));
app.use((err, req, res, next) => {
  console.error(`[${SERVICE_NAME}] error:`, err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============ START ============
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  // TODO: In production, replace in-memory Maps with Postgres + Redis for
  // HA and horizontal scaling. The current implementation is single-process
  // and loses all data on restart.
  // TODO: Add RBAC checks via CorpID JWT (verify caller before mutations).
  // TODO: Persist a sample of renders and AB events to Object Storage for
  // later evaluation of prompt quality drift.
  console.log(`[${SERVICE_NAME}] running on port ${PORT}`);
  console.log(`[${SERVICE_NAME}] seeded ${templates.size} templates, ${experiments.size} experiment(s)`);
});
installGracefulShutdown(server);
