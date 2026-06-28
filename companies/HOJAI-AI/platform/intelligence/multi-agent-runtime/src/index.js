/**
 * RTMN Multi-Agent Runtime v1.0
 * Multi-agent coordination: spawn/manage ephemeral agents, assign tasks, collect results.
 * @port 4790
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
const PORT = process.env.PORT || 4790;
const SERVICE_NAME = 'multi-agent-runtime';

const MULTI_AGENT_RUNTIME_REQUIRE_AUTH =
  (process.env.MULTI_AGENT_RUNTIME_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';
const MULTI_AGENT_RUNTIME_NO_LISTEN =
  (process.env.MULTI_AGENT_RUNTIME_NO_LISTEN ?? '').toLowerCase() === 'true' ||
  process.env.NODE_ENV === 'test';
const authOrBypass = (req, res, next) =>
  MULTI_AGENT_RUNTIME_REQUIRE_AUTH ? requireAuth(req, res, next) : next();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => { const s = Date.now(); res.on('finish', () => console.log(`[multi-agent-runtime] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now()-s}ms)`)); next(); });

const agents = new PersistentMap('agents', { serviceName: SERVICE_NAME });
const assignments = new PersistentMap('assignments', { serviceName: SERVICE_NAME });
const auditLog = [];

function audit(action, actor, payload) {
  const e = { id: uuidv4(), service: SERVICE_NAME, action, actor: actor || 'system', payload: payload || {}, timestamp: new Date().toISOString() };
  auditLog.push(e); return e;
}

const VALID_STATUSES = ['pending', 'running', 'completed', 'failed', 'cancelled'];

// POST /api/agents
app.post('/api/agents',requireAuth,  authOrBypass, (req, res) => {
  const { name, role, capabilities, actor } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const agent = {
    id: uuidv4(),
    name,
    role: role || 'worker',
    capabilities: Array.isArray(capabilities) ? capabilities : [],
    status: 'idle',
    createdAt: new Date().toISOString(),
  };
  agents.set(agent.id, agent);
  audit('agent.create', actor || 'system', { id: agent.id, name });
  res.status(201).json(agent);
});

// GET /api/agents
app.get('/api/agents', (req, res) => {
  const { status, role } = req.query;
  let list = Array.from(agents.values());
  if (status) list = list.filter(a => a.status === status);
  if (role) list = list.filter(a => a.role === role);
  res.json({ agents: list, count: list.length });
});

// GET /api/agents/:id
app.get('/api/agents/:id', (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });
  res.json(a);
});

// DELETE /api/agents/:id
app.delete('/api/agents/:id',requireAuth,  authOrBypass, (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });
  agents.delete(req.params.id);
  audit('agent.delete', req.body?.actor || 'system', { id: req.params.id });
  res.json({ message: 'Agent deleted', id: req.params.id });
});

// POST /api/agents/:id/assign
app.post('/api/agents/:id/assign',requireAuth,  authOrBypass, (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });
  const { task, priority, actor } = req.body || {};
  if (!task) return res.status(400).json({ error: 'task is required' });
  const assignment = {
    id: uuidv4(),
    agentId: a.id,
    task,
    priority: priority || 5,
    status: 'pending',
    createdAt: new Date().toISOString(),
    completedAt: null,
    result: null,
  };
  assignments.set(assignment.id, assignment);
  a.status = 'busy';
  agents.set(a.id, a);
  audit('agent.assign', actor || 'system', { assignmentId: assignment.id, agentId: a.id });
  res.status(201).json(assignment);
});

// GET /api/agents/:id/tasks
app.get('/api/agents/:id/tasks', (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });
  const tasks = Array.from(assignments.values()).filter(t => t.agentId === a.id);
  res.json({ tasks, count: tasks.length });
});

// POST /api/assignments/:id/complete
app.post('/api/assignments/:id/complete',requireAuth,  authOrBypass, (req, res) => {
  const t = assignments.get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Assignment not found' });
  const { result, status, actor } = req.body || {};
  const finalStatus = status || 'completed';
  if (!VALID_STATUSES.includes(finalStatus)) return res.status(400).json({ error: `unknown status '${finalStatus}'`, allowed: VALID_STATUSES });
  t.status = finalStatus;
  t.result = result !== undefined ? result : null;
  t.completedAt = new Date().toISOString();
  assignments.set(t.id, t);
  const a = agents.get(t.agentId);
  if (a) { a.status = 'idle'; agents.set(a.id, a); }
  audit('assignment.complete', actor || 'system', { id: t.id, status: finalStatus });
  res.json(t);
});

// GET /api/assignments (list all)
app.get('/api/assignments', (req, res) => {
  const { status, agentId, limit } = req.query;
  let list = Array.from(assignments.values());
  if (status) list = list.filter(t => t.status === status);
  if (agentId) list = list.filter(t => t.agentId === agentId);
  const max = Math.min(parseInt(limit, 10) || 100, 5000);
  res.json({ assignments: list.slice(-max).reverse(), count: list.length });
});

// GET /api/runtime/audit
app.get('/api/runtime/audit', (req, res) => {
  const { action, limit } = req.query;
  let entries = auditLog;
  if (action) entries = entries.filter(e => e.action === action);
  const max = Math.min(parseInt(limit, 10) || 200, 5000);
  res.json({ entries: entries.slice(-max).reverse(), count: entries.length });
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT }));
app.get('/api/health', (req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT, agents: agents.size, assignments: assignments.size, audits: auditLog.length, uptime: process.uptime() }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

app.use((err, req, res, next) => { console.error('[multi-agent-runtime] error:', err); res.status(500).json({ error: 'Internal server error', message: err.message }); });

let server = null;
if (require.main === module && !MULTI_AGENT_RUNTIME_NO_LISTEN) {
  server = app.listen(PORT, () => console.log(`multi-agent-runtime running on port ${PORT}`));
  installGracefulShutdown(server);
}

module.exports = app;
module.exports.app = app;
module.exports.authOrBypass = authOrBypass;
module.exports.MULTI_AGENT_RUNTIME_REQUIRE_AUTH = MULTI_AGENT_RUNTIME_REQUIRE_AUTH;
module.exports.MULTI_AGENT_RUNTIME_NO_LISTEN = MULTI_AGENT_RUNTIME_NO_LISTEN;
module.exports.SERVICE_NAME = SERVICE_NAME;