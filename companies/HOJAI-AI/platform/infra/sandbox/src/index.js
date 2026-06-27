/**
 * Sandbox (port 4100)
 *
 * Developer Platform service: a free, isolated test environment.
 *
 * What a sandbox gives a developer:
 *   - a tenantId + apiKey they can use against the rest of HOJAI AI
 *   - an isolated TwinOS namespace (twins scoped to the sandbox)
 *   - an isolated MemoryOS namespace (memory scoped to the sandbox)
 *   - a TTL — sandboxes auto-expire
 *   - request/response logs scoped to the sandbox for debugging
 *   - a reset endpoint so devs can wipe and retry
 *
 * In production this would proxy to the real services and inject the
 * tenantId/apiKey on every call. Here we keep the lifecycle, scoping,
 * and reset machinery real, and a per-sandbox request log.
 *
 * Port: 4100
 * Pattern: in-memory + Express 5
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.SANDBOX_PORT || 4100;
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
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// =============================================================================
// STORES
// =============================================================================

const sandboxes = new PersistentMap('sandboxes', { serviceName: 'sandbox' });   // id -> sandbox record
const logs = new PersistentMap('logs', { serviceName: 'sandbox' });        // sandboxId -> [{at, method, path, status, durationMs}]
const audit = [];

// =============================================================================
// HELPERS
// =============================================================================

function newApiKey() {
  return 'sk_sb_' + crypto.randomBytes(20).toString('hex');
}

function newSandboxId() {
  return 'sb-' + uuidv4().slice(0, 8);
}

function ttlIso(ttlSeconds) {
  return new Date(Date.now() + ttlSeconds * 1000).toISOString();
}

function auditLog(entry) {
  audit.push({ id: uuidv4(), at: new Date().toISOString(), ...entry });
  if (audit.length > 5000) audit.splice(0, audit.length - 5000);
}

// Reap expired sandboxes
setInterval(() => {
  const now = Date.now();
  for (const [id, sb] of sandboxes) {
    if (sb.status === 'active' && new Date(sb.expiresAt).getTime() < now) {
      sb.status = 'expired';
      auditLog({ kind: 'expired', sandboxId: id });
    }
  }
}, 60_000);

// =============================================================================
// ROUTES
// =============================================================================

app.get('/health', (_req, res) => {
  const active = Array.from(sandboxes.values()).filter((s) => s.status === 'active').length;
  res.json({
    status: 'healthy',
    service: 'sandbox',
    version: '1.0.0',
    port: PORT,
    counts: {
      sandboxes: sandboxes.size,
      active,
      expired: sandboxes.size - active,
    },
    capabilities: [
      'create-sandbox', 'list-sandboxes', 'get-sandbox', 'delete-sandbox',
      'reset-sandbox', 'extend-sandbox',
      'sandbox-log', 'log-call',
    ],
  });
});
app.get('/', (_req, res) => res.redirect('/health'));

// ── Lifecycle ──────────────────────────────────────────────────────────────

// Default TTL = 24h; max = 30 days
app.post('/api/sandboxes',requireAuth,  (req, res) => {
  const { owner, label, ttlSeconds, region } = req.body || {};
  const ttl = Math.min(parseInt(ttlSeconds) || 86400, 30 * 86400);
  const id = newSandboxId();
  const apiKey = newApiKey();
  const sandbox = {
    id,
    owner: owner || 'anonymous',
    label: label || `${id}-sandbox`,
    region: region || 'us-east',
    apiKey,
    scopes: ['twins:read', 'twins:write', 'memory:read', 'memory:write', 'skills:execute'],
    twinNamespace: `sb-${id}`,
    memoryNamespace: `sb-${id}`,
    status: 'active',
    createdAt: new Date().toISOString(),
    expiresAt: ttlIso(ttl),
    callCount: 0,
  };
  sandboxes.set(id, sandbox);
  logs.set(id, []);
  auditLog({ kind: 'sandbox-created', sandboxId: id, owner: sandbox.owner, ttlSeconds: ttl });
  // Show the apiKey ONLY at creation time.
  res.status(201).json(sandbox);
});

app.get('/api/sandboxes', (_req, res) => {
  const list = Array.from(sandboxes.values()).map((s) => ({ ...s, apiKey: '***' }));
  res.json({ count: list.length, sandboxes: list });
});

app.get('/api/sandboxes/:id', (req, res) => {
  const sb = sandboxes.get(req.params.id);
  if (!sb) return res.status(404).json({ error: 'sandbox not found' });
  res.json({ ...sb, apiKey: '***' });
});

app.delete('/api/sandboxes/:id',requireAuth,  (req, res) => {
  const sb = sandboxes.get(req.params.id);
  if (!sb) return res.status(404).json({ error: 'sandbox not found' });
  sb.status = 'deleted';
  sb.deletedAt = new Date().toISOString();
  auditLog({ kind: 'sandbox-deleted', sandboxId: sb.id });
  res.status(204).end();
});

app.post('/api/sandboxes/:id/reset',requireAuth,  (req, res) => {
  const sb = sandboxes.get(req.params.id);
  if (!sb) return res.status(404).json({ error: 'sandbox not found' });
  sb.status = 'active';
  sb.callCount = 0;
  logs.set(sb.id, []);
  sb.resetAt = new Date().toISOString();
  sb.apiKey = newApiKey(); // rotate key on reset
  auditLog({ kind: 'sandbox-reset', sandboxId: sb.id });
  res.json({ ...sb });  // show new key after reset
});

app.post('/api/sandboxes/:id/extend',requireAuth,  (req, res) => {
  const sb = sandboxes.get(req.params.id);
  if (!sb) return res.status(404).json({ error: 'sandbox not found' });
  const add = Math.min(parseInt((req.body || {}).ttlSeconds) || 86400, 30 * 86400);
  sb.expiresAt = ttlIso(add);
  sb.status = 'active';
  auditLog({ kind: 'sandbox-extended', sandboxId: sb.id, add });
  res.json({ ...sb, apiKey: '***' });
});

// ── Per-sandbox log ────────────────────────────────────────────────────────

// App-level: log a call (consumers can call this for their own debugging).
app.post('/api/sandboxes/:id/log',requireAuth,  (req, res) => {
  const sb = sandboxes.get(req.params.id);
  if (!sb) return res.status(404).json({ error: 'sandbox not found' });
  const { method, path, status, durationMs } = req.body || {};
  const arr = logs.get(sb.id) || [];
  arr.push({ at: new Date().toISOString(), method: method || 'GET', path: path || '/', status: status || 200, durationMs: durationMs || 0 });
  if (arr.length > 1000) arr.splice(0, arr.length - 1000);
  logs.set(sb.id, arr);
  sb.callCount += 1;
  res.status(201).json({ ok: true, callCount: sb.callCount });
});

app.get('/api/sandboxes/:id/log', (req, res) => {
  const arr = logs.get(req.params.id) || [];
  res.json({ count: arr.length, entries: arr });
});

// ── Audit ──────────────────────────────────────────────────────────────────

app.get('/api/audit', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
  res.json({ entries: audit.slice(-limit) });
});

// =============================================================================
// 404 + error handling
// =============================================================================

app.use((_req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[sandbox]', err);
  res.status(500).json({ error: err.message || 'internal error' });
});

// =============================================================================
// START
// =============================================================================
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[sandbox] listening on :${PORT}`);
});
installGracefulShutdown(server);

export default app;
