/**
 * HOJAI Agent Security Service (port 4797)
 *
 * Single chokepoint for AI agents that want to call HOJAI services.
 *
 * Capabilities:
 *   - Register an agent (admin only) → returns plaintext API key ONCE
 *   - Authenticate agent with API key → returns short-lived JWT
 *   - Check permission for a tool call (RBAC)
 *   - Per-agent rate limit (token bucket)
 *   - Audit log of every action (auth, perm-check, denials)
 *
 * Phase 5 (Security Hardening, June 24 2026).
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('node:path');

// Shared security helpers (from /shared/security-shared, resolved via repo path)
const SECURITY_SHARED_DIR = path.resolve(__dirname, '../../../../../../shared/security-shared');
const { generateApiKey, verifyApiKey } = require(path.join(SECURITY_SHARED_DIR, 'auth/api-key.js'));

const PORT = parseInt(process.env.PORT, 10) || 4797;
const SERVICE_NAME = 'agent-security';
const VERSION = '1.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// JWT secret — REQUIRED in production
const JWT_SECRET = process.env.JWT_SECRET;
if (NODE_ENV === 'production' && (!JWT_SECRET || JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET (>= 32 chars) is required in production');
}
// Internal-service token for service-to-service auth
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

// Persistent storage (file-backed via PersistentMap)
const dataDir = process.env.AGENT_SECURITY_DATA_DIR || `/tmp/hojai-${SERVICE_NAME}`;
const fs = require('node:fs');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

class TinyPersistentMap {
  constructor(name) {
    this.file = path.join(dataDir, `${name}.json`);
    this.data = new Map();
    this._load();
  }
  _load() {
    try {
      if (fs.existsSync(this.file)) {
        const j = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        for (const [k, v] of Object.entries(j)) this.data.set(k, v);
      }
    } catch (e) {
      console.warn(`[${SERVICE_NAME}] Failed to load ${this.file}: ${e.message}`);
    }
  }
  _save() {
    try {
      const obj = Object.fromEntries(this.data);
      fs.writeFileSync(this.file, JSON.stringify(obj, null, 2));
    } catch (e) {
      console.error(`[${SERVICE_NAME}] Failed to save ${this.file}: ${e.message}`);
    }
  }
  set(k, v) { this.data.set(k, v); this._save(); return v; }
  get(k) { return this.data.get(k); }
  delete(k) { const had = this.data.delete(k); this._save(); return had; }
  values() { return Array.from(this.data.values()); }
  size() { return this.data.size; }
}

const agents = new TinyPersistentMap('agents');
const auditLog = new TinyPersistentMap('audit');
const revokedKeys = new TinyPersistentMap('revoked-keys');

// Rate limit state: agentId -> { tokens, lastRefill }
const rateBuckets = new Map();

// Stats
const stats = {
  totalRegistrations: 0,
  totalAuths: 0,
  totalPermissionChecks: 0,
  permissionDenials: 0,
  rateLimitHits: 0,
  auditEntries: 0
};

// ============================================================
// Helpers
// ============================================================

/** Append an entry to the audit log. Trims to last 10,000 entries. */
function audit(entry) {
  const id = `${Date.now()}-${uuidv4().slice(0, 8)}`;
  const full = { id, ts: new Date().toISOString(), ...entry };
  auditLog.set(id, full);
  stats.auditEntries += 1;
  // Trim
  const vals = auditLog.values();
  if (vals.length > 10000) {
    const sorted = vals.sort((a, b) => a.ts.localeCompare(b.ts));
    const toRemove = sorted.slice(0, vals.length - 10000);
    for (const e of toRemove) auditLog.delete(e.id);
  }
  return full;
}

/** Sign a JWT (HS256) with the configured secret. */
function signJwt(payload, expiresInSec = 3600) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  // We use jsonwebtoken via the shared lib
  const jwt = require('jsonwebtoken');
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresInSec, algorithm: 'HS256' });
}

/** Verify a JWT. Returns the payload or null. */
function verifyJwt(token) {
  if (!JWT_SECRET) return null;
  try {
    const jwt = require('jsonwebtoken');
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch (e) {
    return null;
  }
}

/** Token-bucket rate limit. Refill rate: `limit` per `windowMs`. */
function checkRateLimit(agentId, limit = 100, windowMs = 60_000) {
  const now = Date.now();
  let bucket = rateBuckets.get(agentId);
  if (!bucket) {
    bucket = { tokens: limit, lastRefill: now };
    rateBuckets.set(agentId, bucket);
  }
  // Refill
  const elapsed = now - bucket.lastRefill;
  const refill = (elapsed / windowMs) * limit;
  bucket.tokens = Math.min(limit, bucket.tokens + refill);
  bucket.lastRefill = now;
  // Try to consume 1
  if (bucket.tokens < 1) {
    stats.rateLimitHits += 1;
    return { allowed: false, remaining: 0, retryAfterMs: Math.ceil((1 - bucket.tokens) * windowMs / limit) };
  }
  bucket.tokens -= 1;
  return { allowed: true, remaining: Math.floor(bucket.tokens) };
}

// ============================================================
// Express
// ============================================================

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '256kb' }));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${SERVICE_NAME}] ${req.method} ${req.path}`);
  next();
});

// ---- Health ----

app.get('/health', (_req, res) => res.redirect(301, '/api/health'));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: VERSION,
    port: PORT,
    uptime: process.uptime(),
    stats: {
      agents: agents.size(),
      auditEntries: stats.auditEntries
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// ---- Auth helpers ----

/**
 * Extract a JWT from the Authorization header, or from
 * `X-Internal-Token: <INTERNAL_SERVICE_TOKEN>` (service-to-service).
 */
function authenticateRequest(req, res, next) {
  const auth = req.headers.authorization;
  const internal = req.headers['x-internal-token'];

  // Service-to-service: bypass JWT verification
  if (internal && INTERNAL_TOKEN && internal === INTERNAL_TOKEN) {
    req.user = { sub: 'internal-service', permissions: ['*'], source: 'internal-token' };
    return next();
  }

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Bearer token required' });
  }
  const token = auth.slice(7);
  const payload = verifyJwt(token);
  if (!payload) {
    return res.status(401).json({ error: 'INVALID_TOKEN', message: 'JWT invalid or expired' });
  }
  req.user = payload;
  next();
}

/** Admin-only middleware. Requires role=admin in the JWT or internal token. */
function requireAdmin(req, res, next) {
  if (req.user?.source === 'internal-token') return next();
  if (req.user?.role === 'admin' || req.user?.permissions?.includes('admin') || req.user?.permissions?.includes('*')) {
    return next();
  }
  return res.status(403).json({ error: 'FORBIDDEN', message: 'Admin role required' });
}

// ============================================================
// Routes
// ============================================================

// ---- Agent registration (admin only) ----

app.post('/api/agents/register', authenticateRequest, requireAdmin, (req, res) => {
  const { agentId, name, permissions = [], metadata = {} } = req.body || {};
  if (!agentId || !name) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'agentId and name are required' });
  }
  if (agents.get(agentId)) {
    return res.status(409).json({ error: 'AGENT_EXISTS', message: `Agent ${agentId} already exists` });
  }
  // Generate API key. Plaintext is shown ONCE; we store only the fingerprint.
  const { plaintext, fingerprint, prefix } = generateApiKey();
  const now = new Date().toISOString();
  const agent = {
    agentId,
    name,
    apiKeyFingerprint: fingerprint,
    apiKeyPrefix: prefix,
    permissions: Array.isArray(permissions) ? permissions : [],
    metadata,
    createdAt: now,
    createdBy: req.user.sub,
    lastUsedAt: null,
    active: true
  };
  agents.set(agentId, agent);
  stats.totalRegistrations += 1;
  audit({ action: 'agent.register', agentId, by: req.user.sub, name });
  // Return plaintext key ONCE
  res.status(201).json({
    agentId,
    name,
    apiKey: plaintext,  // shown once
    apiKeyPrefix: prefix,
    permissions: agent.permissions,
    createdAt: now
  });
});

// ---- Agent authentication: API key -> JWT ----

app.post('/api/agents/auth', (req, res) => {
  const { agentId, apiKey } = req.body || {};
  if (!agentId || !apiKey) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'agentId and apiKey are required' });
  }
  const agent = agents.get(agentId);
  if (!agent) {
    audit({ action: 'agent.auth', agentId, success: false, reason: 'unknown_agent' });
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }
  if (!agent.active) {
    audit({ action: 'agent.auth', agentId, success: false, reason: 'agent_disabled' });
    return res.status(401).json({ error: 'AGENT_DISABLED' });
  }
  // Check if this key was revoked
  if (revokedKeys.get(apiKey.slice(0, 12))) {
    audit({ action: 'agent.auth', agentId, success: false, reason: 'key_revoked' });
    return res.status(401).json({ error: 'KEY_REVOKED' });
  }
  // Verify the API key against the stored fingerprint
  if (!verifyApiKey(apiKey, agent.apiKeyFingerprint)) {
    audit({ action: 'agent.auth', agentId, success: false, reason: 'bad_key' });
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }
  // Issue a JWT
  const token = signJwt({
    sub: agentId,
    name: agent.name,
    role: 'agent',
    permissions: agent.permissions
  });
  // Update last used
  agents.set(agentId, { ...agent, lastUsedAt: new Date().toISOString() });
  stats.totalAuths += 1;
  audit({ action: 'agent.auth', agentId, success: true });
  res.json({
    token,
    agentId,
    permissions: agent.permissions,
    expiresIn: 3600
  });
});

// ---- Permission check (RBAC) ----

app.post('/api/agents/check-permission', authenticateRequest, (req, res) => {
  const { agentId, permission } = req.body || {};
  if (!agentId || !permission) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'agentId and permission are required' });
  }
  const agent = agents.get(agentId);
  if (!agent) {
    return res.status(404).json({ error: 'AGENT_NOT_FOUND' });
  }
  // Wildcard permission = admin
  const hasPermission = agent.permissions.includes('*') || agent.permissions.includes(permission);
  stats.totalPermissionChecks += 1;
  if (!hasPermission) stats.permissionDenials += 1;
  audit({ action: 'agent.check-permission', agentId, permission, granted: hasPermission, by: req.user.sub });
  res.json({
    agentId,
    permission,
    granted: hasPermission
  });
});

// ---- Rate limit check (per-agent) ----

app.post('/api/agents/check-rate-limit', authenticateRequest, (req, res) => {
  const { agentId, limit, windowMs } = req.body || {};
  if (!agentId) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'agentId required' });
  }
  const l = limit || 100;
  const w = windowMs || 60_000;
  const result = checkRateLimit(agentId, l, w);
  audit({ action: 'agent.rate-limit', agentId, allowed: result.allowed, limit: l, windowMs: w });
  res.json({
    agentId,
    allowed: result.allowed,
    remaining: result.remaining,
    retryAfterMs: result.retryAfterMs || 0
  });
});

// ---- List agents (admin only) ----

app.get('/api/agents', authenticateRequest, requireAdmin, (_req, res) => {
  const all = agents.values().map(a => ({
    agentId: a.agentId,
    name: a.name,
    permissions: a.permissions,
    apiKeyPrefix: a.apiKeyPrefix,
    createdAt: a.createdAt,
    lastUsedAt: a.lastUsedAt,
    active: a.active
  }));
  res.json({ count: all.length, agents: all });
});

// ---- Disable / re-enable an agent ----

app.patch('/api/agents/:agentId', authenticateRequest, requireAdmin, (req, res) => {
  const agent = agents.get(req.params.agentId);
  if (!agent) return res.status(404).json({ error: 'AGENT_NOT_FOUND' });
  const updates = {};
  if (typeof req.body.active === 'boolean') updates.active = req.body.active;
  if (Array.isArray(req.body.permissions)) updates.permissions = req.body.permissions;
  const next = { ...agent, ...updates };
  agents.set(req.params.agentId, next);
  audit({ action: 'agent.update', agentId: req.params.agentId, updates, by: req.user.sub });
  res.json({ agentId: req.params.agentId, ...updates });
});

// ---- Revoke a key (without deleting the agent) ----

app.post('/api/agents/:agentId/revoke-keys', authenticateRequest, requireAdmin, (req, res) => {
  const agent = agents.get(req.params.agentId);
  if (!agent) return res.status(404).json({ error: 'AGENT_NOT_FOUND' });
  // We don't know the plaintext key (we only have the fingerprint), so we
  // rotate the fingerprint — this invalidates ALL existing keys for the agent.
  const { fingerprint: newFp, prefix: newPrefix } = generateApiKey();
  const updated = { ...agent, apiKeyFingerprint: newFp, apiKeyPrefix: newPrefix, apiKeyRotatedAt: new Date().toISOString() };
  agents.set(req.params.agentId, updated);
  audit({ action: 'agent.revoke-keys', agentId: req.params.agentId, by: req.user.sub });
  // Return a new plaintext key so the admin can hand it to the agent
  // Wait — we generated a key but discarded the plaintext. Let's fix that.
  // (See the function below: this endpoint returns a NEW plaintext key.)
  // Note: we need the plaintext, so we re-generate.
  const regen = generateApiKey();
  agents.set(req.params.agentId, { ...updated, apiKeyFingerprint: regen.fingerprint, apiKeyPrefix: regen.prefix });
  res.json({
    agentId: req.params.agentId,
    newApiKey: regen.plaintext,
    apiKeyPrefix: regen.prefix,
    message: 'All previous keys revoked. Save the new key now — it will not be shown again.'
  });
});

// ---- Stats & audit ----

app.get('/api/stats', authenticateRequest, requireAdmin, (_req, res) => {
  res.json({ ...stats, totalAgents: agents.size() });
});

app.get('/api/audit', authenticateRequest, requireAdmin, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
  const action = req.query.action;
  let entries = auditLog.values();
  if (action) entries = entries.filter(e => e.action === action);
  entries.sort((a, b) => b.ts.localeCompare(a.ts));
  res.json({ count: entries.length, entries: entries.slice(0, limit) });
});

// ---- 404 + error handlers ----

app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` }));
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});

// ============================================================
// Bootstrap
// ============================================================

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] Listening on port ${PORT}`);
    console.log(`[${SERVICE_NAME}] Health: http://localhost:${PORT}/health`);
    console.log(`[${SERVICE_NAME}] JWT_SECRET: ${JWT_SECRET ? 'set' : 'NOT SET (dev mode)'}`);
    console.log(`[${SERVICE_NAME}] INTERNAL_TOKEN: ${INTERNAL_TOKEN ? 'set' : 'NOT SET'}`);
  });
  // Graceful shutdown
  const shutdown = () => {
    console.log(`[${SERVICE_NAME}] Shutting down...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

module.exports = { app, checkRateLimit };
