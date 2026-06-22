/**
 * RTMN Secrets Manager v1.0 (security-hardened)
 *
 * Centralized secret storage for the RTMN ecosystem.
 * Modeled after HashiCorp Vault / AWS Secrets Manager.
 *
 * SECURITY FIXES (HOJAI C-1):
 *  - All endpoints (read AND write) now require authentication.
 *    Previously GET endpoints (list / value / versions / audit) had no auth
 *    at all — any unauthenticated caller could fetch raw secret values.
 *  - Internal service-to-service auth uses timing-safe comparison against
 *    INTERNAL_SERVICE_TOKEN (no insecure default).
 *  - User-facing requests require a JWT issued by CorpID (issuer verified).
 *  - Write/rotate/delete require role-based authorization.
 *  - Audit log is append-only with hash-chained entries (HMAC-SHA256).
 *
 * Features:
 *  - Create / read / update / delete secrets with versioning
 *  - Manual and auto-rotation tracking
 *  - Full audit log of every secret operation
 *  - Bulk get for service startup hydration
 *  - Per-secret metadata, tags, and description
 *
 * @author HOJAI AI - Foundation Division
 * @version 1.1.0
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { requireEnv } from '@rtmn/shared/lib/env';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import {
  tryVerify as sharedTryVerify,
  timingSafeEqual as sharedTimingSafeEqual,
  AuditLog,
  initializeSecrets,
} from '@rtmn/security-shared';

const PORT = parseInt(process.env.PORT || '4744', 10);
const SERVICE_NAME = 'secrets-manager';
const DAY_MS = 24 * 60 * 60 * 1000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// SECURITY FIX: refuse to start in production without secrets. JWT_SECRET
// must be present so we can verify CorpID-issued tokens. INTERNAL_SERVICE_TOKEN
// is required for service-to-service auth.
if (IS_PRODUCTION) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error(
      '[secrets-manager] JWT_SECRET (>= 32 chars) is required in production'
    );
  }
  if (!process.env.INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN.length < 32) {
    throw new Error(
      '[secrets-manager] INTERNAL_SERVICE_TOKEN (>= 32 chars) is required in production'
    );
  }
  if (!process.env.AUDIT_HMAC_SECRET || process.env.AUDIT_HMAC_SECRET.length < 32) {
    throw new Error(
      '[secrets-manager] AUDIT_HMAC_SECRET (>= 32 chars) is required in production'
    );
  }
}

// Trigger shared secret validation. Throws if JWT_SECRET missing/short.
try { initializeSecrets(); } catch (e) { if (IS_PRODUCTION) throw e; }

const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

// ============ IN-MEMORY STORAGE ============

/** @type {Map<string, object>} name -> secret record */
const secrets = new PersistentMap('secrets', { serviceName: 'secrets-manager' });

// SECURITY FIX: append-only audit log with HMAC chain.
const audit = new AuditLog({
  secret: process.env.AUDIT_HMAC_SECRET || 'dev-only-audit-secret-do-not-use-in-prod',
  retentionMs: 90 * 24 * 60 * 60 * 1000,
});

/**
 * Append a secrets-manager-specific event to the audit log.
 * Maps our (secretName, op, principal) tuple onto AuditLog's required
 * (type, actorId) schema. The full event payload is preserved in `metadata`
 * so existing audit consumers see the same shape as before.
 */
function auditOp(req, op, success, extra = {}) {
  audit.append({
    type: `secret.${op}`,
    actorId: principalOf(req),
    actorType: req.auth?.isInternalCall ? 'service' : 'user',
    targetType: 'secret',
    targetId: extra.secretName || null,
    ip: req.ip,
    metadata: { op, success, ...extra },
  });
}

// ============ HELPERS ============

/**
 * Get the requesting principal (user/service) from a verified request.
 * @param {import('express').Request} req
 * @returns {string}
 */
function principalOf(req) {
  if (req.auth?.user) {
    return req.auth.user.id || req.auth.user.email || 'user';
  }
  if (req.auth?.isInternalCall) return 'internal:' + (req.headers['x-actor'] || 'unknown');
  return 'anonymous';
}

/**
 * Compute whether a secret is overdue for rotation.
 */
function needsRotation(secret) {
  if (!secret.rotationDays || !secret.lastRotatedAt) return false;
  const elapsed = Date.now() - new Date(secret.lastRotatedAt).getTime();
  return elapsed > secret.rotationDays * DAY_MS;
}

/**
 * Project a secret record into a safe metadata-only view.
 */
function toMetadataView(s) {
  return {
    name: s.name,
    description: s.description || '',
    currentVersion: s.currentVersion,
    versionCount: s.versions.length,
    rotationDays: s.rotationDays,
    lastRotatedAt: s.lastRotatedAt,
    expiresAt: s.expiresAt,
    needsRotation: needsRotation(s),
    tags: s.tags || {},
    metadata: s.metadata || {},
    createdAt: s.createdAt,
    updatedAt: s.updatedAt
  };
}

/**
 * Generate a new opaque value for auto-rotation.
 */
function generateRotatedValue() {
  return 'rot-' + uuidv4().replace(/-/g, '');
}

// ============ AUTH MIDDLEWARE ============

/**
 * SECURITY FIX (HOJAI C-1): All endpoints now go through authMiddleware.
 * - Service-to-service: timing-safe compare against INTERNAL_SERVICE_TOKEN.
 * - User-facing: real JWT verification (issuer='rtmn-corpid', audience='rtmn-api').
 *
 * Every request that reaches a route handler is authenticated.
 */
function authMiddleware(req, res, next) {
  // 1. Service-to-service
  const presented = req.headers['x-internal-token'];
  if (presented && INTERNAL_TOKEN) {
    try {
      if (sharedTimingSafeEqual(String(presented), INTERNAL_TOKEN)) {
        req.auth = {
          isInternalCall: true,
          role: 'service',
          user: { id: 'internal:' + (req.headers['x-actor'] || 'service'), role: 'service' },
        };
        return next();
      }
    } catch (_) { /* fall through */ }
  }

  // 2. User-facing JWT
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const decoded = sharedTryVerify(token, { issuer: 'rtmn-corpid', audience: 'rtmn-api' });
    if (decoded) {
      req.auth = {
        isInternalCall: false,
        role: decoded.role || 'user',
        user: {
          id: decoded.sub || decoded.userId || 'unknown',
          role: decoded.role || 'user',
          organizationId: decoded.organizationId,
          permissions: decoded.permissions || [],
        },
      };
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Provide either x-internal-token header or Authorization: Bearer <jwt>',
  });
}

/**
 * Role check. service role bypasses (service-to-service is internal/elevated).
 */
function requireRole(...allowed) {
  return (req, res, next) => {
    const role = req.auth?.role;
    if (!role) return res.status(401).json({ error: 'Unauthorized' });
    if (req.auth.isInternalCall) return next(); // internal services are trusted
    if (!allowed.includes(role)) {
      return res.status(403).json({ error: 'Forbidden', message: `Requires role: ${allowed.join(' or ')}` });
    }
    next();
  };
}

// ============ EXPRESS APP ============

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });

app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// SECURITY FIX: enforce auth on EVERY API route (mounting on /api so that
// /health and the root path can stay public for liveness probes).
app.use('/api', authMiddleware);

// ============ HEALTH ============

app.get('/health', (req, res) => res.redirect(301, '/api/health'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    version: '1.1.0',
    stats: {
      secrets: secrets.size,
      auditEntries: audit.size(),
      needingRotation: Array.from(secrets.values()).filter(needsRotation).length
    },
    timestamp: new Date().toISOString()
  });
});

// ============ SECRET CRUD ============

app.post('/api/secrets', requireRole('admin', 'superadmin'), (req, res) => {
  const { name, value, description, metadata, tags, rotationDays } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name (string) is required' });
  }
  if (typeof value !== 'string') {
    return res.status(400).json({ error: 'value (string) is required' });
  }
  if (secrets.has(name)) {
    return res.status(409).json({ error: `Secret "${name}" already exists` });
  }

  const now = new Date().toISOString();
  const firstVersion = { version: 1, value, createdAt: now, createdBy: principalOf(req) };

  const record = {
    name,
    value,
    versions: [firstVersion],
    currentVersion: 1,
    description: description || '',
    metadata: metadata || {},
    tags: tags || {},
    rotationDays: rotationDays || null,
    lastRotatedAt: now,
    expiresAt: rotationDays ? new Date(Date.now() + rotationDays * DAY_MS).toISOString() : null,
    createdAt: now,
    updatedAt: now
  };

  secrets.set(name, record);
  auditOp(req, 'create', true, { secretName: name });

  res.status(201).json({ message: 'Secret created', secret: toMetadataView(record) });
});

/**
 * SECURITY FIX (HOJAI C-1): Previously had no auth at all. Now requires
 * authentication (any authenticated principal can list metadata; values
 * are never returned by this endpoint).
 */
app.get('/api/secrets', (req, res) => {
  const list = Array.from(secrets.values()).map(toMetadataView);
  res.json({ count: list.length, secrets: list });
});

/**
 * SECURITY FIX (HOJAI C-1): Previously had no auth at all. Now requires auth.
 */
app.get('/api/secrets/:name', (req, res) => {
  const s = secrets.get(req.params.name);
  if (!s) return res.status(404).json({ error: 'Secret not found' });
  res.json({ secret: toMetadataView(s) });
});

/**
 * SECURITY FIX (HOJAI C-1): Previously had no auth at all — anyone could
 * fetch raw secret values. Now requires authentication + a sensitive role
 * (admin or superadmin or internal-service).
 */
app.get('/api/secrets/:name/value', requireRole('admin', 'superadmin'), (req, res) => {
  const s = secrets.get(req.params.name);
  if (!s) {
    auditOp(req, 'read-value', false, { secretName: req.params.name });
    return res.status(404).json({ error: 'Secret not found' });
  }
  const version = s.versions.find(v => v.version === s.currentVersion);
  auditOp(req, 'read-value', true, { secretName: req.params.name });
  res.json({
    name: s.name,
    version: s.currentVersion,
    value: version ? version.value : s.value,
    createdAt: version ? version.createdAt : s.lastRotatedAt
  });
});

app.put('/api/secrets/:name', requireRole('admin', 'superadmin'), (req, res) => {
  const s = secrets.get(req.params.name);
  if (!s) return res.status(404).json({ error: 'Secret not found' });

  const { value, description, metadata, tags, rotationDays } = req.body || {};
  const now = new Date().toISOString();
  const principal = principalOf(req);

  if (typeof value === 'string' && value !== s.value) {
    const newVersion = s.currentVersion + 1;
    s.versions.push({ version: newVersion, value, createdAt: now, createdBy: principal });
    s.currentVersion = newVersion;
    s.value = value;
    s.lastRotatedAt = now;
  }
  if (description !== undefined) s.description = description;
  if (metadata !== undefined) s.metadata = metadata;
  if (tags !== undefined) s.tags = tags;
  if (rotationDays !== undefined) {
    s.rotationDays = rotationDays;
    s.expiresAt = rotationDays ? new Date(Date.now() + rotationDays * DAY_MS).toISOString() : null;
  }
  s.updatedAt = now;
  secrets.set(s.name, s);

  auditOp(req, 'update', true, { secretName: s.name });
  res.json({ message: 'Secret updated', secret: toMetadataView(s) });
});

app.delete('/api/secrets/:name', requireRole('admin', 'superadmin'), (req, res) => {
  const s = secrets.get(req.params.name);
  if (!s) return res.status(404).json({ error: 'Secret not found' });
  secrets.delete(req.params.name);
  auditOp(req, 'delete', true, { secretName: req.params.name });
  res.json({ message: 'Secret deleted', name: req.params.name });
});

// ============ VERSIONS / ROTATION / AUDIT ============

app.get('/api/secrets/:name/versions', (req, res) => {
  const s = secrets.get(req.params.name);
  if (!s) return res.status(404).json({ error: 'Secret not found' });
  res.json({
    name: s.name,
    currentVersion: s.currentVersion,
    versions: s.versions.map(v => ({
      version: v.version,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
      isCurrent: v.version === s.currentVersion
    }))
  });
});

app.post('/api/secrets/:name/rotate', requireRole('admin', 'superadmin'), (req, res) => {
  const s = secrets.get(req.params.name);
  if (!s) return res.status(404).json({ error: 'Secret not found' });

  const now = new Date().toISOString();
  const principal = principalOf(req);
  const newValue = (req.body && typeof req.body.value === 'string') ? req.body.value : generateRotatedValue();
  const newVersion = s.currentVersion + 1;

  s.versions.push({ version: newVersion, value: newValue, createdAt: now, createdBy: principal });
  s.currentVersion = newVersion;
  s.value = newValue;
  s.lastRotatedAt = now;
  s.expiresAt = s.rotationDays ? new Date(Date.now() + s.rotationDays * DAY_MS).toISOString() : null;
  s.updatedAt = now;
  secrets.set(s.name, s);

  auditOp(req, 'rotate', true, { secretName: s.name });
  res.json({
    message: 'Secret rotated',
    name: s.name,
    newVersion: s.currentVersion,
    lastRotatedAt: s.lastRotatedAt
  });
});

/**
 * SECURITY FIX: previously unauthenticated. Now requires admin/superadmin.
 * Filters audit entries for a single secret from the full log.
 */
app.get('/api/secrets/:name/audit', requireRole('admin', 'superadmin'), (req, res) => {
  const all = audit.list({ limit: 10000 });
  const entries = all.filter(e => e.metadata?.secretName === req.params.name);
  res.json({ name: req.params.name, count: entries.length, entries });
});

/**
 * SECURITY FIX: previously unauthenticated. Now requires admin/superadmin.
 */
app.get('/api/audit', requireRole('admin', 'superadmin'), (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
  let entries = audit.list({ limit: 10000 });
  if (req.query.secret) entries = entries.filter(e => e.metadata?.secretName === req.query.secret);
  if (req.query.op) entries = entries.filter(e => e.metadata?.op === req.query.op);
  entries = entries.slice(-limit);
  res.json({ count: entries.length, entries });
});

app.post('/api/secrets/bulk', (req, res) => {
  // Bulk read is sensitive (returns values). Require admin role.
  // Internal services get through via requireRole bypass.
  if (!req.auth.isInternalCall && !['admin', 'superadmin'].includes(req.auth.role)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Bulk read requires admin role or internal service token' });
  }
  const names = Array.isArray(req.body && req.body.names) ? req.body.names : null;
  if (!names) return res.status(400).json({ error: 'names (array of strings) is required' });

  const found = {};
  const missing = [];
  for (const n of names) {
    const s = secrets.get(n);
    if (!s) {
      missing.push(n);
      continue;
    }
    const version = s.versions.find(v => v.version === s.currentVersion);
    found[n] = {
      version: s.currentVersion,
      value: version ? version.value : s.value,
      lastRotatedAt: s.lastRotatedAt
    };
  }
  auditOp(req, 'bulk-read', true, {
    secretName: '(bulk)',
    requested: names.length,
    returned: Object.keys(found).length,
  });
  res.json({ found, missing });
});

// ============ STARTUP: rotation scan ============

(function scanForRotations() {
  const flagged = [];
  for (const s of secrets.values()) {
    if (needsRotation(s)) flagged.push(s.name);
  }
  if (flagged.length) {
    console.log(`[${SERVICE_NAME}] secrets overdue for rotation: ${flagged.join(', ')}`);
  }
})();

// ============ ERROR HANDLERS ============

app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));
app.use((err, req, res, _next) => {
  console.error(`[${SERVICE_NAME}] error:`, err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============ START ============
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] running on port ${PORT}`);
});installGracefulShutdown(server);
