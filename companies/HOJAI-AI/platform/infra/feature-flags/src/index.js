/**
 * RTMN Feature Flags Service
 *
 * A centralized feature flag system for safe rollouts, kill switches,
 * A/B testing, and dynamic configuration across the RTMN ecosystem.
 *
 * Modeled after LaunchDarkly / Unleash / Flagsmith.
 *
 * Port: 4745
 *
 * @module feature-flags
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = 4745;

// Security & middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ============================================================
// In-memory stores
// TODO: Replace with persistent storage (Postgres / MongoDB)
// ============================================================

/** @type {Map<string, Object>} flagKey -> flag definition */
const flags = new PersistentMap('flags', { serviceName: 'feature-flags' });

/** @type {Map<string, Object>} segmentKey -> segment definition */
const segments = new PersistentMap('segments', { serviceName: 'feature-flags' });

/** @type {Array<Object>} Chronological audit log of all changes */
const auditLog = [];

/** @type {Map<string, Array<Object>>} flagKey -> change history entries */
const flagHistory = new PersistentMap('flag-history', { serviceName: 'feature-flags' });

/** @type {Map<string, number>} flagKey -> total evaluation count */
const evaluationCounts = new PersistentMap('evaluation-counts', { serviceName: 'feature-flags' });

// ============================================================
// Helpers
// ============================================================

/**
 * Append an audit log entry.
 * @param {string} action - The action performed (create, update, delete, toggle, etc.)
 * @param {string} resource - Resource type (flag, segment, rule)
 * @param {string} resourceKey - Resource identifier
 * @param {Object} [details] - Optional payload with change details
 */
function audit(action, resource, resourceKey, details = {}) {
  const entry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    action,
    resource,
    resourceKey,
    details,
  };
  auditLog.push(entry);
  // Keep audit log bounded
  if (auditLog.length > 5000) auditLog.shift();
}

/**
 * Record a change against a flag's history timeline.
 * @param {string} flagKey - The flag key
 * @param {string} action - The change action
 * @param {Object} [details] - Optional payload
 */
function recordHistory(flagKey, action, details = {}) {
  const entry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    action,
    details,
  };
  if (!flagHistory.has(flagKey)) flagHistory.set(flagKey, []);
  const history = flagHistory.get(flagKey);
  history.push(entry);
  if (history.length > 500) history.shift();
}

/**
 * Validate the supported flag types.
 * @param {string} type
 * @returns {boolean}
 */
function isValidFlagType(type) {
  return ['boolean', 'string', 'number', 'json'].includes(type);
}

/**
 * Consistent hash a string into [0, 100).
 * Used to bucket users for percentage rollouts.
 * @param {string} input
 * @returns {number} integer in [0, 100)
 */
function hashToBucket(input) {
  // FNV-1a 32-bit hash for stable, simple consistent hashing
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash % 100;
}

/**
 * Evaluate a single condition against a context.
 * @param {Object} condition - { attribute, op, values }
 * @param {Object} context - Evaluation context { userId, tenantId, attributes }
 * @returns {boolean}
 */
function evaluateCondition(condition, context) {
  const { attribute, op, values } = condition;
  if (!attribute || !op || !Array.isArray(values)) return false;

  // Resolve attribute value: top-level fields (userId, tenantId) or attributes.*
  let attrValue;
  if (context[attribute] !== undefined) {
    attrValue = context[attribute];
  } else if (context.attributes && context.attributes[attribute] !== undefined) {
    attrValue = context.attributes[attribute];
  } else {
    // Missing attribute: only `eq` against undefined-equivalent values
    if (op === 'neq') return true;
    return false;
  }

  switch (op) {
    case 'eq':
      return values.includes(attrValue);
    case 'neq':
      return !values.includes(attrValue);
    case 'in':
      return values.includes(attrValue);
    case 'nin':
      return !values.includes(attrValue);
    case 'gt':
      return Number(attrValue) > Number(values[0]);
    case 'lt':
      return Number(attrValue) < Number(values[0]);
    case 'contains':
      if (Array.isArray(attrValue)) return attrValue.some(v => values.includes(v));
      if (typeof attrValue === 'string') return values.some(v => String(v) !== '' && attrValue.includes(String(v)));
      return false;
    case 'regex':
      try {
        return values.some(v => new RegExp(String(v)).test(String(attrValue)));
      } catch (e) {
        return false;
      }
    default:
      return false;
  }
}

/**
 * Evaluate all conditions of a rule (logical AND).
 * @param {Object} rule
 * @param {Object} context
 * @returns {boolean}
 */
function evaluateRule(rule, context) {
  if (!rule || !Array.isArray(rule.conditions)) return false;
  return rule.conditions.every(c => evaluateCondition(c, context));
}

/**
 * Evaluate a flag for a given context.
 * @param {Object} flag
 * @param {Object} context
 * @returns {{ value: *, variation: string|null, reason: string, ruleId: string|null }}
 */
function evaluateFlag(flag, context) {
  if (!flag.enabled) {
    return { value: flag.defaultValue, variation: null, reason: 'disabled', ruleId: null };
  }

  // Walk rules in order; first match wins
  if (Array.isArray(flag.rules)) {
    for (const rule of flag.rules) {
      if (!evaluateRule(rule, context)) continue;

      // Percentage rollout — consistent hashing on userId
      if (typeof rule.percentageRollout === 'number') {
        const userId = context.userId || context.attributes?.userId || 'anonymous';
        const bucket = hashToBucket(`${flag.key}:${userId}`);
        if (bucket >= rule.percentageRollout) {
          // User falls outside rollout; return default
          return { value: flag.defaultValue, variation: null, reason: 'percentage_rollout_miss', ruleId: rule.id };
        }
        // Inside rollout — return the chosen variation or default
        const variation = rule.variation !== undefined ? rule.variation : flag.defaultValue;
        return { value: variation, variation: rule.variation, reason: 'percentage_rollout_hit', ruleId: rule.id };
      }

      // Explicit variation
      if (rule.variation !== undefined) {
        return { value: rule.variation, variation: rule.variation, reason: 'rule_match', ruleId: rule.id };
      }

      // Rule matched but no variation specified — use default
      return { value: flag.defaultValue, variation: null, reason: 'rule_match_default', ruleId: rule.id };
    }
  }

  // No rules matched
  return { value: flag.defaultValue, variation: null, reason: 'default', ruleId: null };
}

/**
 * Increment evaluation counter for a flag.
 * @param {string} flagKey
 */
function recordEvaluation(flagKey) {
  evaluationCounts.set(flagKey, (evaluationCounts.get(flagKey) || 0) + 1);
}

// ============================================================
// Pre-seeded flags
// ============================================================

function seedFlags() {
  const seeds = [
    {
      key: 'ai-model-v2-rollout',
      name: 'AI Model v2 Rollout',
      description: 'Gradual rollout of the new AI model v2 — start with internal tenants only.',
      type: 'boolean',
      defaultValue: false,
      enabled: true,
      variations: [true, false],
      tags: ['ai', 'rollout', 'foundation'],
      owner: 'ai-platform',
      rules: [
        {
          id: uuidv4(),
          name: '10% rollout to internal tenants',
          segmentKey: null,
          conditions: [{ attribute: 'tenantType', op: 'eq', values: ['internal'] }],
          percentageRollout: 10,
          variation: true,
        },
      ],
    },
    {
      key: 'use-new-checkout',
      name: 'Use New Checkout Flow',
      description: 'Toggle the redesigned checkout experience.',
      type: 'boolean',
      defaultValue: false,
      enabled: true,
      variations: [true, false],
      tags: ['checkout', 'frontend'],
      owner: 'commerce',
      rules: [
        {
          id: uuidv4(),
          name: 'Enabled for Acme tenant',
          segmentKey: null,
          conditions: [{ attribute: 'tenantId', op: 'eq', values: ['acme'] }],
          variation: true,
        },
      ],
    },
    {
      key: 'max-tokens',
      name: 'Max AI Tokens',
      description: 'Maximum number of tokens for AI completions.',
      type: 'number',
      defaultValue: 4096,
      enabled: true,
      variations: [1024, 2048, 4096, 8192],
      tags: ['ai', 'limits'],
      owner: 'ai-platform',
      rules: [
        {
          id: uuidv4(),
          name: 'Higher limit for premium tenants',
          segmentKey: null,
          conditions: [{ attribute: 'plan', op: 'in', values: ['enterprise', 'premium'] }],
          variation: 8192,
        },
      ],
    },
    {
      key: 'recommendation-engine',
      name: 'Recommendation Engine Provider',
      description: 'Which recommendation engine provider to use.',
      type: 'string',
      defaultValue: 'openai',
      enabled: true,
      variations: ['openai', 'anthropic', 'local'],
      tags: ['ai', 'recommendations'],
      owner: 'ai-platform',
      rules: [
        {
          id: uuidv4(),
          name: 'EU tenants use local provider (GDPR)',
          segmentKey: null,
          conditions: [{ attribute: 'region', op: 'eq', values: ['eu'] }],
          variation: 'local',
        },
        {
          id: uuidv4(),
          name: 'Beta tenants use Anthropic',
          segmentKey: null,
          conditions: [{ attribute: 'beta', op: 'eq', values: [true] }],
          variation: 'anthropic',
        },
      ],
    },
  ];

  for (const flag of seeds) {
    flag.createdAt = new Date().toISOString();
    flag.updatedAt = flag.createdAt;
    flags.set(flag.key, flag);
    recordHistory(flag.key, 'created', { seeded: true });
  }
}

// Pre-seed an example segment
function seedSegments() {
  const segment = {
    key: 'internal-tenants',
    name: 'Internal Tenants',
    description: 'Tenants owned by HOJAI AI / RTMN team — used for canary rollouts.',
    rules: [
      { attribute: 'tenantType', op: 'eq', values: ['internal'] },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  segments.set(segment.key, segment);
}

// ============================================================
// Routes — Flags CRUD
// ============================================================

/**
 * POST /api/flags
 * Create a new feature flag.
 */
app.post('/api/flags',requireAuth,  (req, res) => {
  const { key, name, description, type, defaultValue, variations, rules, tags, owner } = req.body;
  if (!key || !name || !type) {
    return res.status(400).json({ error: 'key, name, and type are required' });
  }
  if (flags.has(key)) {
    return res.status(409).json({ error: `Flag '${key}' already exists` });
  }
  if (!isValidFlagType(type)) {
    return res.status(400).json({ error: `Invalid type. Must be one of: boolean, string, number, json` });
  }

  const flag = {
    key,
    name,
    description: description || '',
    type,
    defaultValue: defaultValue !== undefined ? defaultValue : null,
    enabled: true,
    variations: Array.isArray(variations) ? variations : [],
    rules: Array.isArray(rules) ? rules.map(r => ({ ...r, id: r.id || uuidv4() })) : [],
    tags: Array.isArray(tags) ? tags : [],
    owner: owner || 'unknown',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  flags.set(key, flag);
  audit('create', 'flag', key, { name, type });
  recordHistory(key, 'created', { name, type });
  res.status(201).json(flag);
});

/**
 * GET /api/flags
 * List all flags with optional filtering by tag or owner.
 */
app.get('/api/flags', (req, res) => {
  const { tag, owner } = req.query;
  let list = Array.from(flags.values());
  if (tag) list = list.filter(f => f.tags && f.tags.includes(tag));
  if (owner) list = list.filter(f => f.owner === owner);
  res.json({ count: list.length, flags: list });
});

/**
 * GET /api/flags/:key
 * Get details for a single flag.
 */
app.get('/api/flags/:key', (req, res) => {
  const flag = flags.get(req.params.key);
  if (!flag) return res.status(404).json({ error: `Flag '${req.params.key}' not found` });
  res.json(flag);
});

/**
 * PUT /api/flags/:key
 * Update an existing flag (full or partial).
 */
app.put('/api/flags/:key',requireAuth,  (req, res) => {
  const existing = flags.get(req.params.key);
  if (!existing) return res.status(404).json({ error: `Flag '${req.params.key}' not found` });

  const { name, description, type, defaultValue, variations, rules, tags, owner, enabled } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (type !== undefined) {
    if (!isValidFlagType(type)) return res.status(400).json({ error: 'Invalid flag type' });
    updates.type = type;
  }
  if (defaultValue !== undefined) updates.defaultValue = defaultValue;
  if (variations !== undefined) updates.variations = variations;
  if (rules !== undefined) updates.rules = rules.map(r => ({ ...r, id: r.id || uuidv4() }));
  if (tags !== undefined) updates.tags = tags;
  if (owner !== undefined) updates.owner = owner;
  if (enabled !== undefined) updates.enabled = !!enabled;

  Object.assign(existing, updates, { updatedAt: new Date().toISOString() });

  audit('update', 'flag', existing.key, updates);
  recordHistory(existing.key, 'updated', updates);
  res.json(existing);
});

/**
 * DELETE /api/flags/:key
 * Delete a flag permanently.
 */
app.delete('/api/flags/:key',requireAuth,  (req, res) => {
  const flag = flags.get(req.params.key);
  if (!flag) return res.status(404).json({ error: `Flag '${req.params.key}' not found` });
  flags.delete(req.params.key);
  audit('delete', 'flag', req.params.key, { name: flag.name });
  recordHistory(req.params.key, 'deleted', { name: flag.name });
  res.json({ message: `Flag '${req.params.key}' deleted`, key: req.params.key });
});

/**
 * POST /api/flags/:key/toggle
 * Quick on/off toggle for kill switches.
 */
app.post('/api/flags/:key/toggle',requireAuth,  (req, res) => {
  const flag = flags.get(req.params.key);
  if (!flag) return res.status(404).json({ error: `Flag '${req.params.key}' not found` });

  const { enabled } = req.body;
  flag.enabled = enabled !== undefined ? !!enabled : !flag.enabled;
  flag.updatedAt = new Date().toISOString();

  audit('toggle', 'flag', flag.key, { enabled: flag.enabled });
  recordHistory(flag.key, flag.enabled ? 'enabled' : 'disabled', { enabled: flag.enabled });
  res.json({ key: flag.key, enabled: flag.enabled });
});

/**
 * POST /api/flags/evaluate
 * Evaluate a flag for a context.
 * Body: { flagKey, context: { userId, tenantId, attributes } }
 */
app.post('/api/flags/evaluate',requireAuth,  (req, res) => {
  const { flagKey, context } = req.body;
  if (!flagKey) return res.status(400).json({ error: 'flagKey is required' });
  if (!context) return res.status(400).json({ error: 'context is required' });

  const flag = flags.get(flagKey);
  if (!flag) return res.status(404).json({ error: `Flag '${flagKey}' not found` });

  const result = evaluateFlag(flag, context);
  recordEvaluation(flagKey);

  res.json({
    flagKey,
    value: result.value,
    variation: result.variation,
    reason: result.reason,
    ruleId: result.ruleId,
    type: flag.type,
    evaluationCount: evaluationCounts.get(flagKey),
  });
});

/**
 * POST /api/flags/bulk-evaluate
 * Evaluate many flags in one call.
 * Body: { flagKeys: [...], context: {...} } — or — { flags: [...], context: {...} }
 */
app.post('/api/flags/bulk-evaluate',requireAuth,  (req, res) => {
  const { flagKeys, flags: flagList, context } = req.body;
  if (!context) return res.status(400).json({ error: 'context is required' });

  const keysToEvaluate = Array.isArray(flagKeys) ? flagKeys
    : Array.isArray(flagList) ? flagList
    : Array.from(flags.keys()); // empty -> evaluate all

  const results = {};
  for (const key of keysToEvaluate) {
    const flag = flags.get(key);
    if (!flag) {
      results[key] = { error: 'not_found' };
      continue;
    }
    const r = evaluateFlag(flag, context);
    results[key] = {
      value: r.value,
      variation: r.variation,
      reason: r.reason,
      ruleId: r.ruleId,
    };
    recordEvaluation(key);
  }

  res.json({ context, results });
});

/**
 * GET /api/flags/:key/history
 * Change history for a flag.
 */
app.get('/api/flags/:key/history', (req, res) => {
  const history = flagHistory.get(req.params.key);
  if (!history) return res.status(404).json({ error: `No history for flag '${req.params.key}'` });
  res.json({
    flagKey: req.params.key,
    count: history.length,
    history: history.slice().reverse(),
    evaluationCount: evaluationCounts.get(req.params.key) || 0,
  });
});

/**
 * POST /api/flags/:key/rules
 * Add a new targeting rule to a flag.
 */
app.post('/api/flags/:key/rules',requireAuth,  (req, res) => {
  const flag = flags.get(req.params.key);
  if (!flag) return res.status(404).json({ error: `Flag '${req.params.key}' not found` });

  const { name, segmentKey, conditions, variation, percentageRollout } = req.body;
  if (!Array.isArray(conditions)) {
    return res.status(400).json({ error: 'conditions array is required' });
  }

  const rule = {
    id: uuidv4(),
    name: name || `rule-${(flag.rules?.length || 0) + 1}`,
    segmentKey: segmentKey || null,
    conditions,
    variation: variation !== undefined ? variation : undefined,
    percentageRollout: typeof percentageRollout === 'number' ? percentageRollout : undefined,
  };

  if (!Array.isArray(flag.rules)) flag.rules = [];
  flag.rules.push(rule);
  flag.updatedAt = new Date().toISOString();

  audit('add_rule', 'flag', flag.key, { ruleId: rule.id, name: rule.name });
  recordHistory(flag.key, 'rule_added', { ruleId: rule.id, name: rule.name });
  res.status(201).json(rule);
});

/**
 * DELETE /api/flags/:key/rules/:ruleId
 * Remove a targeting rule from a flag.
 */
app.delete('/api/flags/:key/rules/:ruleId',requireAuth,  (req, res) => {
  const flag = flags.get(req.params.key);
  if (!flag) return res.status(404).json({ error: `Flag '${req.params.key}' not found` });

  const before = (flag.rules || []).length;
  flag.rules = (flag.rules || []).filter(r => r.id !== req.params.ruleId);
  if (flag.rules.length === before) {
    return res.status(404).json({ error: `Rule '${req.params.ruleId}' not found on flag '${req.params.key}'` });
  }
  flag.updatedAt = new Date().toISOString();

  audit('remove_rule', 'flag', flag.key, { ruleId: req.params.ruleId });
  recordHistory(flag.key, 'rule_removed', { ruleId: req.params.ruleId });
  res.json({ message: 'Rule removed', ruleId: req.params.ruleId, remainingRules: flag.rules.length });
});

// ============================================================
// Routes — Segments
// ============================================================

/**
 * GET /api/segments
 * List all segments.
 */
app.get('/api/segments', (req, res) => {
  res.json({ count: segments.size, segments: Array.from(segments.values()) });
});

/**
 * POST /api/segments
 * Create a new user segment.
 */
app.post('/api/segments',requireAuth,  (req, res) => {
  const { key, name, rules, description } = req.body;
  if (!key || !name) return res.status(400).json({ error: 'key and name are required' });
  if (segments.has(key)) return res.status(409).json({ error: `Segment '${key}' already exists` });

  const segment = {
    key,
    name,
    description: description || '',
    rules: Array.isArray(rules) ? rules : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  segments.set(key, segment);
  audit('create', 'segment', key, { name });
  res.status(201).json(segment);
});

// ============================================================
// Routes — Audit & Health
// ============================================================

/**
 * GET /api/audit
 * Return recent audit log entries (most recent first).
 */
app.get('/api/audit', (req, res) => {
  const { limit = 100, resource, action } = req.query;
  let entries = auditLog.slice().reverse();
  if (resource) entries = entries.filter(e => e.resource === resource);
  if (action) entries = entries.filter(e => e.action === action);
  const cap = Math.min(parseInt(limit, 10) || 100, 1000);
  res.json({ count: entries.length, entries: entries.slice(0, cap) });
});

/**
 * GET /api/health
 * Service health check.
 */
app.get('/health', (req, res) => res.redirect(301, '/api/health'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'feature-flags',
    port: PORT,
    flagCount: flags.size,
    segmentCount: segments.size,
    auditEntries: auditLog.length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// Boot
// ============================================================

seedFlags();
seedSegments();
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`Feature Flags service running on port ${PORT}`);
  console.log(`  Health:  http://localhost:${PORT}/api/health`);
  console.log(`  Flags:   http://localhost:${PORT}/api/flags`);
  console.log(`  Audit:   http://localhost:${PORT}/api/audit`);
});
installGracefulShutdown(server);

// TODO: Persistence — replace in-memory Maps with a database (Postgres recommended).
// TODO: RBAC via CorpID — restrict flag mutations to authorized owners/admins.
// TODO: Multi-tenant scoping — namespace flags by tenantId to avoid key collisions.
// TODO: Real-time flag updates via Event Bus — publish flag.changed events for SDKs to subscribe.
