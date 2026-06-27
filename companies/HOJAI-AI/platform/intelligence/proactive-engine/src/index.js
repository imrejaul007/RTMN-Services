/**
 * RTMN Proactive Engine v1.0
 * Proactive suggestions based on context.
 * @port 4789
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

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
const PORT = process.env.PORT || 4789;
const SERVICE_NAME = 'proactive-engine';

const PROACTIVE_ENGINE_REQUIRE_AUTH =
  (process.env.PROACTIVE_ENGINE_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';
const PROACTIVE_ENGINE_NO_LISTEN =
  (process.env.PROACTIVE_ENGINE_NO_LISTEN ?? '').toLowerCase() === 'true' ||
  process.env.NODE_ENV === 'test';
const authOrBypass = (req, res, next) =>
  PROACTIVE_ENGINE_REQUIRE_AUTH ? requireAuth(req, res, next) : next();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => { const s = Date.now(); res.on('finish', () => console.log(`[proactive-engine] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now()-s}ms)`)); next(); });

const rules = new PersistentMap('rules', { serviceName: SERVICE_NAME });
const auditLog = [];

function audit(action, actor, payload) {
  const e = { id: uuidv4(), service: SERVICE_NAME, action, actor: actor || 'system', payload: payload || {}, timestamp: new Date().toISOString() };
  auditLog.push(e); return e;
}

function evaluate(rule, context) {
  const trigger = rule.trigger || {};
  const conditions = trigger.conditions || [];
  if (conditions.length === 0) return true; // unconditional rule fires
  for (const cond of conditions) {
    const val = context?.[cond.key];
    switch (cond.op) {
      case 'eq': if (val !== cond.value) return false; break;
      case 'neq': if (val === cond.value) return false; break;
      case 'gt': if (!(Number(val) > Number(cond.value))) return false; break;
      case 'lt': if (!(Number(val) < Number(cond.value))) return false; break;
      case 'in': if (!Array.isArray(cond.value) || !cond.value.includes(val)) return false; break;
      case 'contains': if (typeof val !== 'string' || !val.includes(cond.value)) return false; break;
      default: break;
    }
  }
  return true;
}

// POST /api/proactive/rule
app.post('/api/proactive/rule', authOrBypass, (req, res) => {
  const { name, trigger, action, priority, actor } = req.body || {};
  if (!name || !action) return res.status(400).json({ error: 'name and action are required' });
  const rule = {
    id: uuidv4(),
    name,
    trigger: trigger || { conditions: [] },
    action,
    priority: priority || 5,
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  rules.set(rule.id, rule);
  audit('rule.create', actor || 'system', { id: rule.id, name });
  res.status(201).json(rule);
});

// GET /api/proactive/rules
app.get('/api/proactive/rules', (req, res) => {
  const list = Array.from(rules.values()).sort((a, b) => a.priority - b.priority);
  res.json({ rules: list, count: list.length });
});

// GET /api/proactive/rules/:id
app.get('/api/proactive/rules/:id', (req, res) => {
  const r = rules.get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Rule not found' });
  res.json(r);
});

// DELETE /api/proactive/rules/:id
app.delete('/api/proactive/rules/:id', authOrBypass, (req, res) => {
  const r = rules.get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Rule not found' });
  rules.delete(req.params.id);
  audit('rule.delete', req.body?.actor || 'system', { id: req.params.id });
  res.json({ message: 'Rule deleted', id: req.params.id });
});

// POST /api/proactive/suggest
app.post('/api/proactive/suggest', authOrBypass, (req, res) => {
  const { userId, context, actor, prefer } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const ctx = { userId, ...(context || {}) };
  let matched = Array.from(rules.values())
    .filter(r => r.enabled)
    .filter(r => evaluate(r, ctx))
    .sort((a, b) => a.priority - b.priority);
  if (prefer && Array.isArray(prefer)) {
    matched = matched.filter(r => prefer.includes(r.action?.type));
  }
  const suggestions = matched.slice(0, 5).map(r => ({
    ruleId: r.id,
    name: r.name,
    priority: r.priority,
    action: r.action,
  }));
  audit('proactive.suggest', actor || 'system', { userId, suggestionCount: suggestions.length });
  res.json({ userId, suggestions, count: suggestions.length, evaluated: matched.length });
});

// GET /api/proactive/audit
app.get('/api/proactive/audit', (req, res) => {
  const { action, limit } = req.query;
  let entries = auditLog;
  if (action) entries = entries.filter(e => e.action === action);
  const max = Math.min(parseInt(limit, 10) || 200, 5000);
  res.json({ entries: entries.slice(-max).reverse(), count: entries.length });
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT }));
app.get('/api/health', (req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT, rules: rules.size, audits: auditLog.length, uptime: process.uptime() }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

app.use((err, req, res, next) => { console.error('[proactive-engine] error:', err); res.status(500).json({ error: 'Internal server error', message: err.message }); });

let server = null;
if (require.main === module && !PROACTIVE_ENGINE_NO_LISTEN) {
  server = app.listen(PORT, () => console.log(`proactive-engine running on port ${PORT}`));
  installGracefulShutdown(server);
}

module.exports = app;
module.exports.app = app;
module.exports.authOrBypass = authOrBypass;
module.exports.PROACTIVE_ENGINE_REQUIRE_AUTH = PROACTIVE_ENGINE_REQUIRE_AUTH;
module.exports.PROACTIVE_ENGINE_NO_LISTEN = PROACTIVE_ENGINE_NO_LISTEN;
module.exports.SERVICE_NAME = SERVICE_NAME;
module.exports.evaluate = evaluate;