/**
 * Secrets Manager - Encrypted credential storage
 * Note: In production, use proper encryption (e.g., AES-256-GCM with HMAC)
 * This is a simplified implementation for demonstration
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Simple encryption (in production, use proper key management)
const ENCRYPTION_KEY = process.env.SECRETS_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

function encrypt(plaintext) {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encrypted) {
  try {
    const [ivHex, authTagHex, ciphertext] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch {
    return null;
  }
}

// In-memory stores
const secrets = new Map();       // id -> secret (encrypted)
const accessLogs = new Map();    // id -> access log

// ── Secrets ─────────────────────────────────────────────────────────────────

export function createSecret({ name, value, userId, projectId, type = 'api-key', metadata = {} }) {
  const id = uuidv4();

  // Encrypt the secret value
  const encryptedValue = encrypt(value);

  const secret = {
    id,
    name,
    encryptedValue,
    type,
    userId,
    projectId,
    metadata,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastAccessedAt: null,
    accessCount: 0
  };

  secrets.set(id, secret);

  // Log creation
  logAccess(id, userId, 'create');

  return {
    id: secret.id,
    name: secret.name,
    type: secret.type,
    userId: secret.userId,
    projectId: secret.projectId,
    metadata: secret.metadata,
    version: secret.version,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt
  };
}

export function getSecret(id, userId) {
  const secret = secrets.get(id);
  if (!secret) return null;

  // Check access
  if (secret.userId !== userId) {
    return null;
  }

  // Decrypt value
  const decryptedValue = decrypt(secret.encryptedValue);

  // Update access stats
  secret.lastAccessedAt = new Date().toISOString();
  secret.accessCount++;
  secrets.set(id, secret);

  // Log access
  logAccess(id, userId, 'read');

  return {
    id: secret.id,
    name: secret.name,
    value: decryptedValue,
    type: secret.type,
    userId: secret.userId,
    projectId: secret.projectId,
    metadata: secret.metadata,
    version: secret.version,
    createdAt: secret.createdAt,
    lastAccessedAt: secret.lastAccessedAt,
    accessCount: secret.accessCount
  };
}

export function listSecrets({ userId, projectId, type } = {}) {
  let results = [];

  for (const secret of secrets.values()) {
    if (userId && secret.userId !== userId) continue;
    if (projectId && secret.projectId !== projectId) continue;
    if (type && secret.type !== type) continue;

    results.push({
      id: secret.id,
      name: secret.name,
      type: secret.type,
      userId: secret.userId,
      projectId: secret.projectId,
      metadata: secret.metadata,
      version: secret.version,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
      lastAccessedAt: secret.lastAccessedAt,
      accessCount: secret.accessCount
    });
  }

  return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function updateSecret(id, { name, value, userId, metadata }) {
  const secret = secrets.get(id);
  if (!secret) return null;

  if (secret.userId !== userId) return null;

  if (name) secret.name = name;
  if (value) {
    secret.encryptedValue = encrypt(value);
    secret.version++;
  }
  if (metadata) secret.metadata = { ...secret.metadata, ...metadata };
  secret.updatedAt = new Date().toISOString();

  secrets.set(id, secret);
  logAccess(id, userId, 'update');

  return {
    id: secret.id,
    name: secret.name,
    type: secret.type,
    userId: secret.userId,
    projectId: secret.projectId,
    metadata: secret.metadata,
    version: secret.version,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt
  };
}

export function deleteSecret(id, userId) {
  const secret = secrets.get(id);
  if (!secret) return false;

  if (secret.userId !== userId) return false;

  logAccess(id, userId, 'delete');
  return secrets.delete(id);
}

// ── Access Logging ─────────────────────────────────────────────────────────

function logAccess(secretId, userId, action) {
  const logId = uuidv4();
  const log = {
    id: logId,
    secretId,
    userId,
    action,
    timestamp: new Date().toISOString(),
    ip: null
  };

  if (!accessLogs.has(secretId)) {
    accessLogs.set(secretId, []);
  }
  accessLogs.get(secretId).push(log);
}

export function getAccessLog(secretId, { limit = 50 } = {}) {
  const logs = accessLogs.get(secretId) || [];
  return logs
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

// ── Rotation ──────────────────────────────────────────────────────────────

export function rotateSecret(id, userId) {
  const secret = secrets.get(id);
  if (!secret) return null;

  if (secret.userId !== userId) return null;

  // Generate new value
  const newValue = crypto.randomBytes(32).toString('base64');
  secret.encryptedValue = encrypt(newValue);
  secret.version++;
  secret.updatedAt = new Date().toISOString();

  secrets.set(id, secret);
  logAccess(id, userId, 'rotate');

  return {
    id: secret.id,
    name: secret.name,
    value: newValue,
    type: secret.type,
    version: secret.version,
    updatedAt: secret.updatedAt
  };
}

// ── Stats ──────────────────────────────────────────────────────────────

export function getStats() {
  const typeCounts = {};
  for (const s of secrets.values()) {
    typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
  }
  return {
    totalSecrets: secrets.size,
    byType: typeCounts
  };
}
