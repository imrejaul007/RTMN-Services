// Agent Security (4186)
// Capability tokens, sandboxed execution policies, threat detection.
// Solves Division 04 P0: "Agent Security" — capability tokens + sandboxed execution.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('tiny'));

const PORT = process.env.PORT || 4186;
const SERVICE = 'agent-security';

const agents = new Map();        // agentId -> { id, name, owner, scopes, status, created }
const capabilityTokens = new Map(); // tokenId -> { id, jti, agent_id, capabilities, constraints, expires_at }
const policies = new Map();      // policyId -> { id, name, rules, sandbox_type, created }
const auditLog = new Map();      // entryId -> { id, agent_id, action, decision, reason, ts }
const threats = new Map();       // threatId -> { id, agent_id, severity, type, description, ts, resolved }

const ok = (data) => ({ ok: true, ...data });
const fail = (msg, code = 400) => ({ ok: false, error: msg });

const SENSITIVE_PATTERNS = [
  { pattern: /password|secret|api[_-]?key|token/i, severity: 'high', type: 'credential_exposure' },
  { pattern: /drop\s+table|delete\s+from|truncate/i, severity: 'critical', type: 'sql_injection' },
  { pattern: /\b(eval|exec|spawn|child_process)\b/i, severity: 'high', type: 'code_injection' },
  { pattern: /\.\.\//g, severity: 'medium', type: 'path_traversal' },
  { pattern: /curl|wget|nc\s+/i, severity: 'high', type: 'network_exfil' }
];

function detectThreats(input) {
  const found = [];
  const text = typeof input === 'string' ? input : JSON.stringify(input);
  SENSITIVE_PATTERNS.forEach(p => {
    if (p.pattern.test(text)) {
      found.push({ severity: p.severity, type: p.type, snippet: text.slice(0, 100) });
    }
  });
  return found;
}

function seed() {
  // Policies
  const policySeeds = [
    { name: 'strict-readonly', rules: { allow_network: false, allow_filesystem: false, max_memory_mb: 64, max_cpu_ms: 1000 },
      sandbox_type: 'worker_threads' },
    { name: 'standard', rules: { allow_network: true, allow_filesystem: false, max_memory_mb: 256, max_cpu_ms: 5000 },
      sandbox_type: 'worker_threads' },
    { name: 'privileged', rules: { allow_network: true, allow_filesystem: true, max_memory_mb: 1024, max_cpu_ms: 30000 },
      sandbox_type: 'subprocess' }
  ];
  policySeeds.forEach(p => {
    const id = uuid();
    policies.set(id, { id, ...p, created: new Date().toISOString() });
  });
  // Agents
  const agentSeeds = [
    { name: 'sales-assistant', owner: 'sales-team', scopes: ['read:contacts', 'write:leads'] },
    { name: 'support-bot', owner: 'support-team', scopes: ['read:tickets', 'write:responses'] },
    { name: 'finance-agent', owner: 'finance-team', scopes: ['read:invoices', 'write:reports'] }
  ];
  agentSeeds.forEach(a => {
    const id = uuid();
    agents.set(id, { id, ...a, status: 'active', created: new Date().toISOString() });
  });
}

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE,
  endpoints: ['/api/agents', '/api/capability-tokens', '/api/capability-tokens/verify',
              '/api/policies', '/api/audit', '/api/threats', '/api/scan']
})));

// Agents
app.get('/api/agents', (_req, res) => res.json(ok({ agents: [...agents.values()] })));
app.post('/api/agents', (req, res) => {
  const { name, owner, scopes = [] } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  const a = { id, name, owner: owner || 'unknown', scopes, status: 'active', created: new Date().toISOString() };
  agents.set(id, a);
  res.status(201).json(ok({ agent: a }));
});
app.post('/api/agents/:id/quarantine', (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json(fail('agent not found'));
  a.status = 'quarantined';
  agents.set(a.id, a);
  res.json(ok({ agent: a }));
});

// Capability tokens (JWT-like, signed)
app.post('/api/capability-tokens', (req, res) => {
  const { agent_id, capabilities, constraints = {}, ttl_sec = 3600 } = req.body || {};
  if (!agent_id) return res.status(400).json(fail('agent_id required'));
  const agent = agents.get(agent_id);
  if (!agent) return res.status(404).json(fail('agent not found'));
  if (agent.status !== 'active') return res.status(403).json(fail(`agent ${agent.status}`));
  // Check requested caps are subset of agent's
  const unauthorized = capabilities.filter(c => !agent.scopes.includes(c));
  if (unauthorized.length) return res.status(403).json(fail(`agent lacks scopes: ${unauthorized.join(',')}`));
  const id = uuid();
  const jti = uuid();
  const expires = Math.floor(Date.now() / 1000) + ttl_sec;
  const sig = crypto.createHmac('sha256', process.env.SECRET || 'agent-security-default-secret')
    .update(`${id}.${agent_id}.${capabilities.join(',')}.${expires}`).digest('hex');
  const token = { id, jti, agent_id, capabilities, constraints, expires_at: new Date(expires * 1000).toISOString(),
    signature: sig };
  capabilityTokens.set(id, token);
  res.status(201).json(ok({ token }));
});

app.post('/api/capability-tokens/verify', (req, res) => {
  const { token, required_capability } = req.body || {};
  if (!token) return res.status(400).json(fail('token required'));
  const stored = capabilityTokens.get(token.id);
  if (!stored) return res.status(404).json(fail('token not found'));
  if (stored.id !== token.id) return res.status(401).json(fail('token id mismatch'));
  if (new Date(stored.expires_at) < new Date()) return res.status(401).json(fail('token expired'));
  if (required_capability && !stored.capabilities.includes(required_capability)) {
    return res.status(403).json(fail(`token missing capability: ${required_capability}`));
  }
  res.json(ok({ valid: true, agent_id: stored.agent_id, capabilities: stored.capabilities }));
});

// Policies
app.get('/api/policies', (_req, res) => res.json(ok({ policies: [...policies.values()] })));
app.post('/api/policies', (req, res) => {
  const { name, rules, sandbox_type = 'worker_threads' } = req.body || {};
  if (!name || !rules) return res.status(400).json(fail('name + rules required'));
  const id = uuid();
  const p = { id, name, rules, sandbox_type, created: new Date().toISOString() };
  policies.set(id, p);
  res.status(201).json(ok({ policy: p }));
});

// Threat scan
app.post('/api/scan', (req, res) => {
  const { agent_id, input } = req.body || {};
  const threats_found = detectThreats(input);
  // Log
  threats_found.forEach(t => {
    const tid = uuid();
    threats.set(tid, { id: tid, agent_id: agent_id || 'unknown', ...t, ts: new Date().toISOString(), resolved: false });
  });
  // Audit
  const aid = uuid();
  auditLog.set(aid, { id: aid, agent_id: agent_id || 'unknown', action: 'scan',
    decision: threats_found.length === 0 ? 'allow' : 'flag', reason: `${threats_found.length} threats found`,
    ts: new Date().toISOString() });
  res.json(ok({
    safe: threats_found.length === 0,
    threats: threats_found,
    recommendation: threats_found.some(t => t.severity === 'critical') ? 'block' :
                     threats_found.length > 0 ? 'review' : 'allow'
  }));
});

// Audit log
app.get('/api/audit', (req, res) => {
  const { agent_id, decision } = req.query;
  let list = [...auditLog.values()];
  if (agent_id) list = list.filter(e => e.agent_id === agent_id);
  if (decision) list = list.filter(e => e.decision === decision);
  res.json(ok({ audit: list }));
});

// Threats
app.get('/api/threats', (req, res) => {
  const { resolved, severity } = req.query;
  let list = [...threats.values()];
  if (resolved !== undefined) list = list.filter(t => String(t.resolved) === resolved);
  if (severity) list = list.filter(t => t.severity === severity);
  res.json(ok({ threats: list }));
});

app.post('/api/threats/:id/resolve', (req, res) => {
  const t = threats.get(req.params.id);
  if (!t) return res.status(404).json(fail('threat not found'));
  t.resolved = true;
  threats.set(t.id, t);
  res.json(ok({ threat: t }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));