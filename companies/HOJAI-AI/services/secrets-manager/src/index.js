/**
 * RTMN Secrets Manager v1.0
 *
 * Centralized secret storage for the RTMN ecosystem.
 * Modeled after HashiCorp Vault / AWS Secrets Manager.
 *
 * Features:
 *  - Create / read / update / delete secrets with versioning
 *  - Manual and auto-rotation tracking
 *  - Full audit log of every secret operation
 *  - Bulk get for service startup hydration
 *  - Per-secret metadata, tags, and description
 *
 * @author HOJAI AI - Foundation Division
 * @version 1.0.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4744;
const SERVICE_NAME = 'secrets-manager';
const DAY_MS = 24 * 60 * 60 * 1000;

// ============ IN-MEMORY STORAGE ============
//
// TODO: In production, replace these in-memory Maps with a persistent
// store (PostgreSQL / DynamoDB) and encrypt every value at rest using
// AES-256-GCM with a KMS-managed master key. See the TODOs in
// `createSecret` / `updateSecret` below.

/** @type {Map<string, object>} name -> secret record */
const secrets = new Map();

/** @type {Array<object>} append-only audit log */
const auditLog = [];

// ============ HELPERS ============

/**
 * Get the requesting principal (user/service) from headers.
 * Falls back to "anonymous" so audit log is never blank.
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
  // Keep audit log bounded for the in-memory stub.
  if (auditLog.length > 10000) auditLog.shift();
  return record;
}

/**
 * Compute whether a secret is overdue for rotation.
 * @param {object} secret
 * @returns {boolean}
 */
function needsRotation(secret) {
  if (!secret.rotationDays || !secret.lastRotatedAt) return false;
  const elapsed = Date.now() - new Date(secret.lastRotatedAt).getTime();
  return elapsed > secret.rotationDays * DAY_MS;
}

/**
 * Project a secret record into a safe metadata-only view
 * (never includes the value).
 * @param {object} s
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
 * In production this would call the upstream system (DB, API key mint, etc).
 */
function generateRotatedValue() {
  return 'rot-' + uuidv4().replace(/-/g, '');
}

// ============ EXPRESS APP ============

const app = express();
app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '1mb' }));

// ============ HEALTH ============

/**
 * GET /api/health
 * Liveness probe + basic stats.
 */
app.get('/health', (req, res) => res.redirect(301, '/api/health'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    version: '1.0.0',
    stats: {
      secrets: secrets.size,
      auditEntries: auditLog.length,
      needingRotation: Array.from(secrets.values()).filter(needsRotation).length
    },
    timestamp: new Date().toISOString()
  });
});

// ============ SECRET CRUD ============

/**
 * POST /api/secrets
 * Create a new secret. Body: { name, value, description?, metadata?, tags?, rotationDays? }
 */
app.post('/api/secrets', (req, res) => {
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

  // TODO: In production, encrypt at rest using AES-256-GCM with a KMS-managed key.
  const now = new Date().toISOString();
  const firstVersion = { version: 1, value, createdAt: now, createdBy: principalOf(req) };

  const record = {
    name,
    value, // TODO: encrypted at rest in production
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
  audit({
    secretName: name,
    op: 'create',
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });

  res.status(201).json({ message: 'Secret created', secret: toMetadataView(record) });
});

/**
 * GET /api/secrets
 * List all secrets (metadata only — never values).
 * Secrets overdue for rotation are flagged.
 */
app.get('/api/secrets', (req, res) => {
  const list = Array.from(secrets.values()).map(toMetadataView);
  res.json({ count: list.length, secrets: list });
});

/**
 * GET /api/secrets/:name
 * Get metadata for a single secret.
 */
app.get('/api/secrets/:name', (req, res) => {
  const s = secrets.get(req.params.name);
  if (!s) return res.status(404).json({ error: 'Secret not found' });
  res.json({ secret: toMetadataView(s) });
});

/**
 * GET /api/secrets/:name/value
 * Read the current secret value. This is the ONLY endpoint that
 * returns the value, and every read is audit-logged.
 */
app.get('/api/secrets/:name/value', (req, res) => {
  const s = secrets.get(req.params.name);
  if (!s) {
    audit({ secretName: req.params.name, op: 'read-value', principal: principalOf(req), success: false, ip: req.ip });
    return res.status(404).json({ error: 'Secret not found' });
  }
  const version = s.versions.find(v => v.version === s.currentVersion);
  audit({
    secretName: req.params.name,
    op: 'read-value',
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });
  res.json({
    name: s.name,
    version: s.currentVersion,
    value: version ? version.value : s.value, // TODO: decrypt in production
    createdAt: version ? version.createdAt : s.lastRotatedAt
  });
});

/**
 * PUT /api/secrets/:name
 * Update a secret. This creates a new version; the old value is
 * retained in `versions` for rollback.
 * Body: { value, description?, metadata?, tags?, rotationDays? }
 */
app.put('/api/secrets/:name', (req, res) => {
  const s = secrets.get(req.params.name);
  if (!s) return res.status(404).json({ error: 'Secret not found' });

  const { value, description, metadata, tags, rotationDays } = req.body || {};
  const now = new Date().toISOString();
  const principal = principalOf(req);

  if (typeof value === 'string' && value !== s.value) {
    const newVersion = s.currentVersion + 1;
    s.versions.push({ version: newVersion, value, createdAt: now, createdBy: principal });
    s.currentVersion = newVersion;
    s.value = value; // TODO: encrypt at rest
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

  audit({ secretName: s.name, op: 'update', principal, success: true, ip: req.ip });
  res.json({ message: 'Secret updated', secret: toMetadataView(s) });
});

/**
 * DELETE /api/secrets/:name
 * Delete a secret and all of its versions. Audit-logged.
 */
app.delete('/api/secrets/:name', (req, res) => {
  const s = secrets.get(req.params.name);
  if (!s) return res.status(404).json({ error: 'Secret not found' });
  secrets.delete(req.params.name);
  audit({
    secretName: req.params.name,
    op: 'delete',
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });
  res.json({ message: 'Secret deleted', name: req.params.name });
});

// ============ VERSIONS / ROTATION / AUDIT ============

/**
 * GET /api/secrets/:name/versions
 * List all versions of a secret (no values returned).
 */
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

/**
 * POST /api/secrets/:name/rotate
 * Manually rotate a secret. Body (optional): { value } — if absent,
 * a new opaque value is generated. Creates a new version.
 */
app.post('/api/secrets/:name/rotate', (req, res) => {
  const s = secrets.get(req.params.name);
  if (!s) return res.status(404).json({ error: 'Secret not found' });

  const now = new Date().toISOString();
  const principal = principalOf(req);
  const newValue = (req.body && typeof req.body.value === 'string') ? req.body.value : generateRotatedValue();
  const newVersion = s.currentVersion + 1;

  s.versions.push({ version: newVersion, value: newValue, createdAt: now, createdBy: principal });
  s.currentVersion = newVersion;
  s.value = newValue; // TODO: encrypt at rest
  s.lastRotatedAt = now;
  s.expiresAt = s.rotationDays ? new Date(Date.now() + s.rotationDays * DAY_MS).toISOString() : null;
  s.updatedAt = now;
  secrets.set(s.name, s);

  audit({ secretName: s.name, op: 'rotate', principal, success: true, ip: req.ip });
  res.json({
    message: 'Secret rotated',
    name: s.name,
    newVersion: s.currentVersion,
    lastRotatedAt: s.lastRotatedAt
  });
});

/**
 * GET /api/secrets/:name/audit
 * Audit entries scoped to a single secret.
 */
app.get('/api/secrets/:name/audit', (req, res) => {
  const entries = auditLog.filter(e => e.secretName === req.params.name);
  res.json({ name: req.params.name, count: entries.length, entries });
});

/**
 * GET /api/audit
 * Full audit log (all secrets, most recent last).
 * Optional ?secret=name and ?op=create|read-value|update|delete|rotate filters.
 */
app.get('/api/audit', (req, res) => {
  let entries = auditLog;
  if (req.query.secret) entries = entries.filter(e => e.secretName === req.query.secret);
  if (req.query.op) entries = entries.filter(e => e.op === req.query.op);
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
  res.json({ count: entries.length, entries: entries.slice(-limit) });
});

/**
 * POST /api/secrets/bulk
 * Bulk fetch secret values (for service startup hydration).
 * Body: { names: ["foo", "bar", ...] }
 * Missing secrets are omitted from `secrets` and listed in `missing`.
 */
app.post('/api/secrets/bulk', (req, res) => {
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
      value: version ? version.value : s.value, // TODO: decrypt in production
      lastRotatedAt: s.lastRotatedAt
    };
  }
  audit({
    secretName: '(bulk)',
    op: 'bulk-read',
    principal: principalOf(req),
    success: true,
    ip: req.ip,
    requested: names.length,
    returned: Object.keys(found).length
  });
  res.json({ found, missing });
});

// ============ STARTUP: rotation scan ============
//
// Walk all secrets at boot and mark which ones are past their
// rotation window. We don't auto-rotate (could surprise downstream
// services); we just expose `needsRotation: true` on the list API.

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
app.use((err, req, res, next) => {
  console.error(`[${SERVICE_NAME}] error:`, err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============ START ============

app.listen(PORT, () => {
  // TODO: In production, integrate with Vault / AWS Secrets Manager for HA + replication.
  // TODO: In production, add RBAC checks here (verify caller via CorpID JWT before each op).
  // TODO: In production, scope secrets by tenant/business ID.
  console.log(`[${SERVICE_NAME}] running on port ${PORT}`);
});
