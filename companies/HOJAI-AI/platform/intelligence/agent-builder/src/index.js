/**
 * RTMN Agent Builder v1.0
 * Agent template/blueprint builder.
 * @port 4791
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
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4791;
const SERVICE_NAME = 'agent-builder';

const AGENT_BUILDER_REQUIRE_AUTH =
  (process.env.AGENT_BUILDER_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';
const AGENT_BUILDER_NO_LISTEN =
  (process.env.AGENT_BUILDER_NO_LISTEN ?? '').toLowerCase() === 'true' ||
  process.env.NODE_ENV === 'test';
const authOrBypass = (req, res, next) =>
  AGENT_BUILDER_REQUIRE_AUTH ? requireAuth(req, res, next) : next();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => { const s = Date.now(); res.on('finish', () => console.log(`[agent-builder] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now()-s}ms)`)); next(); });

const blueprints = new PersistentMap('blueprints', { serviceName: SERVICE_NAME });
const agents = new PersistentMap('agents', { serviceName: SERVICE_NAME });
const auditLog = [];

function audit(action, actor, payload) {
  const e = { id: uuidv4(), service: SERVICE_NAME, action, actor: actor || 'system', payload: payload || {}, timestamp: new Date().toISOString() };
  auditLog.push(e); return e;
}

// POST /api/blueprints
app.post('/api/blueprints', authOrBypass, (req, res) => {
  const { name, systemPrompt, tools, model, knowledge, actor } = req.body || {};
  if (!name || !systemPrompt) return res.status(400).json({ error: 'name and systemPrompt are required' });
  const bp = {
    id: uuidv4(),
    name,
    systemPrompt,
    tools: Array.isArray(tools) ? tools : [],
    model: model || 'hojai-base',
    knowledge: knowledge || null,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  blueprints.set(bp.id, bp);
  audit('blueprint.create', actor || 'system', { id: bp.id, name });
  res.status(201).json(bp);
});

// GET /api/blueprints
app.get('/api/blueprints', (req, res) => {
  const list = Array.from(blueprints.values());
  res.json({ blueprints: list, count: list.length });
});

// GET /api/blueprints/:id
app.get('/api/blueprints/:id', (req, res) => {
  const bp = blueprints.get(req.params.id);
  if (!bp) return res.status(404).json({ error: 'Blueprint not found' });
  res.json(bp);
});

// PUT /api/blueprints/:id
app.put('/api/blueprints/:id', authOrBypass, (req, res) => {
  const bp = blueprints.get(req.params.id);
  if (!bp) return res.status(404).json({ error: 'Blueprint not found' });
  const { name, systemPrompt, tools, model, knowledge, actor } = req.body || {};
  if (name) bp.name = name;
  if (systemPrompt) bp.systemPrompt = systemPrompt;
  if (tools) bp.tools = Array.isArray(tools) ? tools : [];
  if (model) bp.model = model;
  if (knowledge !== undefined) bp.knowledge = knowledge;
  bp.version += 1;
  bp.updatedAt = new Date().toISOString();
  blueprints.set(bp.id, bp);
  audit('blueprint.update', actor || 'system', { id: bp.id, version: bp.version });
  res.json(bp);
});

// DELETE /api/blueprints/:id
app.delete('/api/blueprints/:id', authOrBypass, (req, res) => {
  const bp = blueprints.get(req.params.id);
  if (!bp) return res.status(404).json({ error: 'Blueprint not found' });
  blueprints.delete(req.params.id);
  audit('blueprint.delete', req.body?.actor || 'system', { id: req.params.id });
  res.json({ message: 'Blueprint deleted', id: req.params.id });
});

// POST /api/blueprints/:id/instantiate
app.post('/api/blueprints/:id/instantiate', authOrBypass, (req, res) => {
  const bp = blueprints.get(req.params.id);
  if (!bp) return res.status(404).json({ error: 'Blueprint not found' });
  const { name, actor } = req.body || {};
  const agent = {
    id: uuidv4(),
    blueprintId: bp.id,
    name: name || `${bp.name}-${Date.now()}`,
    config: { systemPrompt: bp.systemPrompt, tools: bp.tools, model: bp.model, knowledge: bp.knowledge },
    status: 'ready',
    createdAt: new Date().toISOString(),
  };
  agents.set(agent.id, agent);
  audit('agent.instantiate', actor || 'system', { blueprintId: bp.id, agentId: agent.id });
  res.status(201).json(agent);
});

// GET /api/agents (instantiated)
app.get('/api/agents', (req, res) => {
  const list = Array.from(agents.values());
  res.json({ agents: list, count: list.length });
});

// GET /api/builder/audit
app.get('/api/builder/audit', (req, res) => {
  const { action, limit } = req.query;
  let entries = auditLog;
  if (action) entries = entries.filter(e => e.action === action);
  const max = Math.min(parseInt(limit, 10) || 200, 5000);
  res.json({ entries: entries.slice(-max).reverse(), count: entries.length });
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT }));
app.get('/api/health', (req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT, blueprints: blueprints.size, agents: agents.size, audits: auditLog.length, uptime: process.uptime() }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

app.use((err, req, res, next) => { console.error('[agent-builder] error:', err); res.status(500).json({ error: 'Internal server error', message: err.message }); });

let server = null;
if (require.main === module && !AGENT_BUILDER_NO_LISTEN) {
  server = app.listen(PORT, () => console.log(`agent-builder running on port ${PORT}`));
  installGracefulShutdown(server);
}

module.exports = app;
module.exports.app = app;
module.exports.authOrBypass = authOrBypass;
module.exports.AGENT_BUILDER_REQUIRE_AUTH = AGENT_BUILDER_REQUIRE_AUTH;
module.exports.AGENT_BUILDER_NO_LISTEN = AGENT_BUILDER_NO_LISTEN;
module.exports.SERVICE_NAME = SERVICE_NAME;