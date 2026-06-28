import { requireAuth } from '@rtmn/shared/auth';
/**
 * Secrets OS - Encrypted Secrets Management
 * AES-256-GCM encryption, access logging, versioning
 * Port: 4872
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4872;
const START_TIME = Date.now();

// Encryption key from environment or generate
const ENCRYPTION_KEY = process.env.SECRETS_KEY
  ? Buffer.from(process.env.SECRETS_KEY, 'hex').slice(0, 32)
  : crypto.randomBytes(32);

const ALGORITHM = 'aes-256-gcm';

app.use(helmet());
app.use(cors());
app.use(express.json());

// Types
interface Secret {
  id: string;
  name: string;
  encryptedValue: string;
  metadata: Record<string, string>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  rotatedAt?: string;
  version: number;
  lastAccessedAt?: string;
  accessCount: number;
}

interface SecretAccess {
  id: string;
  secretId: string;
  accessedBy: string;
  accessType: 'read' | 'update' | 'delete' | 'rotate';
  accessedAt: string;
  ip: string;
  userAgent: string;
  success: boolean;
}

interface SecretVersion {
  id: string;
  secretId: string;
  encryptedValue: string;
  version: number;
  createdAt: string;
  rotatedBy: string;
}

// In-memory storage
const secrets = new Map<string, Secret>();
const accessLogs: SecretAccess[] = [];
const versions = new Map<string, SecretVersion[]>();
const apiKeys = new Map<string, { name: string; permissions: string[]; createdAt: string }>();

// Generate a random encryption key for demo
function generateKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Encrypt value
function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

// Decrypt value
function decrypt(ciphertext: string): string {
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) throw new Error('Invalid ciphertext format');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    throw new Error('Decryption failed');
  }
}

// Log access
function logAccess(secretId: string, accessedBy: string, accessType: SecretAccess['accessType'], req: Request, success: boolean): void {
  const log: SecretAccess = {
    id: uuidv4(),
    secretId,
    accessedBy,
    accessType,
    accessedAt: new Date().toISOString(),
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
    success,
  };
  accessLogs.push(log);

  // Keep only last 100000 logs
  if (accessLogs.length > 100000) {
    accessLogs.splice(0, accessLogs.length - 100000);
  }
}

// Validation schemas
const CreateSecretSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Name must be alphanumeric with underscores and hyphens'),
  value: z.string(),
  metadata: z.record(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

const UpdateSecretSchema = z.object({
  value: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

const RotateSecretSchema = z.object({
  newValue: z.string(),
  rotatePrevious: z.boolean().default(true),
});

const CreateApiKeySchema = z.object({
  name: z.string(),
  permissions: z.array(z.enum(['read', 'write', 'admin'])),
});

// Health endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'secrets-os',
    version: '1.0.0',
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    secrets: secrets.size,
    apiKeys: apiKeys.size,
    encryption: 'AES-256-GCM',
  });
});

app.get('/ready', (_req: Request, res: Response) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// Create secret
app.post('/api/secrets',requireAuth,  (req: Request, res: Response) => {
  try {
    const data = CreateSecretSchema.parse(req.body);

    if (secrets.has(data.name)) {
      return res.status(409).json({ error: 'Secret already exists' });
    }

    const now = new Date().toISOString();
    const id = uuidv4();
    const secret: Secret = {
      id,
      name: data.name,
      encryptedValue: encrypt(data.value),
      metadata: data.metadata || {},
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now,
      version: 1,
      accessCount: 0,
    };

    secrets.set(data.name, secret);
    versions.set(data.name, [{
      id: uuidv4(),
      secretId: id,
      encryptedValue: secret.encryptedValue,
      version: 1,
      createdAt: now,
      rotatedBy: req.get('x-user-email') || 'system',
    }]);

    logAccess(id, req.get('x-user-email') || 'system', 'update', req, true);

    res.status(201).json({
      id,
      name: data.name,
      metadata: secret.metadata,
      tags: secret.tags,
      version: secret.version,
      createdAt: secret.createdAt,
    });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: err.issues });
    res.status(500).json({ error: err.message });
  }
});

// List secrets (names only)
app.get('/api/secrets', (_req: Request, res: Response) => {
  const list = Array.from(secrets.values()).map(s => ({
    id: s.id,
    name: s.name,
    metadata: s.metadata,
    tags: s.tags,
    version: s.version,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    rotatedAt: s.rotatedAt,
    lastAccessedAt: s.lastAccessedAt,
    accessCount: s.accessCount,
  }));

  res.json({ total: list.length, secrets: list });
});

// Get secret value (decrypted)
app.get('/api/secrets/:name', (req: Request, res: Response) => {
  const secret = secrets.get(req.params.name);
  if (!secret) {
    logAccess('unknown', req.get('x-user-email') || 'unknown', 'read', req, false);
    return res.status(404).json({ error: 'Secret not found' });
  }

  const accessedBy = req.get('x-user-email') || req.get('x-api-key') || 'unknown';

  try {
    const value = decrypt(secret.encryptedValue);
    secret.lastAccessedAt = new Date().toISOString();
    secret.accessCount++;
    logAccess(secret.id, accessedBy, 'read', req, true);
    res.json({
      name: secret.name,
      value,
      metadata: secret.metadata,
      tags: secret.tags,
      version: secret.version,
    });
  } catch (err) {
    logAccess(secret.id, accessedBy, 'read', req, false);
    res.status(500).json({ error: 'Failed to decrypt secret' });
  }
});

// Update secret
app.put('/api/secrets/:name',requireAuth,  (req: Request, res: Response) => {
  const secret = secrets.get(req.params.name);
  if (!secret) return res.status(404).json({ error: 'Secret not found' });

  try {
    const data = UpdateSecretSchema.partial().parse(req.body);
    const accessedBy = req.get('x-user-email') || 'system';

    if (data.value) {
      secret.encryptedValue = encrypt(data.value);
      secret.version++;
      secret.rotatedAt = new Date().toISOString();

      // Save version history
      if (!versions.has(secret.name)) versions.set(secret.name, []);
      versions.get(secret.name)!.push({
        id: uuidv4(),
        secretId: secret.id,
        encryptedValue: secret.encryptedValue,
        version: secret.version,
        createdAt: secret.rotatedAt,
        rotatedBy: accessedBy,
      });
    }

    if (data.metadata) secret.metadata = { ...secret.metadata, ...data.metadata };
    if (data.tags) secret.tags = data.tags;
    secret.updatedAt = new Date().toISOString();

    logAccess(secret.id, accessedBy, 'update', req, true);

    res.json({
      success: true,
      name: secret.name,
      version: secret.version,
      updatedAt: secret.updatedAt,
    });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: err.issues });
    logAccess(secret.id, req.get('x-user-email') || 'system', 'update', req, false);
    res.status(500).json({ error: err.message });
  }
});

// Rotate secret
app.post('/api/secrets/:name/rotate',requireAuth,  (req: Request, res: Response) => {
  const secret = secrets.get(req.params.name);
  if (!secret) return res.status(404).json({ error: 'Secret not found' });

  try {
    const data = RotateSecretSchema.parse(req.body);
    const rotatedBy = req.get('x-user-email') || 'system';

    if (data.rotatePrevious) {
      // Save current version
      if (!versions.has(secret.name)) versions.set(secret.name, []);
      versions.get(secret.name)!.push({
        id: uuidv4(),
        secretId: secret.id,
        encryptedValue: secret.encryptedValue,
        version: secret.version,
        createdAt: secret.rotatedAt || secret.updatedAt,
        rotatedBy,
      });
    }

    secret.encryptedValue = encrypt(data.newValue);
    secret.version++;
    secret.rotatedAt = new Date().toISOString();
    secret.updatedAt = secret.rotatedAt;

    logAccess(secret.id, rotatedBy, 'rotate', req, true);

    res.json({
      success: true,
      name: secret.name,
      version: secret.version,
      rotatedAt: secret.rotatedAt,
    });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: err.issues });
    logAccess(secret.id, req.get('x-user-email') || 'system', 'rotate', req, false);
    res.status(500).json({ error: err.message });
  }
});

// Delete secret
app.delete('/api/secrets/:name',requireAuth,  (req: Request, res: Response) => {
  const secret = secrets.get(req.params.name);
  if (!secret) return res.status(404).json({ error: 'Secret not found' });

  const accessedBy = req.get('x-user-email') || 'system';

  secrets.delete(req.params.name);
  versions.delete(req.params.name);

  logAccess(secret.id, accessedBy, 'delete', req, true);

  res.json({ success: true });
});

// Access logs for a secret
app.get('/api/secrets/:name/logs', (req: Request, res: Response) => {
  const secret = secrets.get(req.params.name);
  if (!secret) return res.status(404).json({ error: 'Secret not found' });

  const logs = accessLogs
    .filter(l => l.secretId === secret.id)
    .sort((a, b) => new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime());

  res.json({ total: logs.length, logs });
});

// Get secret versions
app.get('/api/secrets/:name/versions', (req: Request, res: Response) => {
  const secret = secrets.get(req.params.name);
  if (!secret) return res.status(404).json({ error: 'Secret not found' });

  const vers = versions.get(req.params.name) || [];
  res.json({ total: vers.length, versions: vers, currentVersion: secret.version });
});

// Rollback to previous version
app.post('/api/secrets/:name/rollback',requireAuth,  (req: Request, res: Response) => {
  const secret = secrets.get(req.params.name);
  if (!secret) return res.status(404).json({ error: 'Secret not found' });

  const vers = versions.get(req.params.name);
  if (!vers || vers.length === 0) return res.status(400).json({ error: 'No previous versions available' });

  const previous = vers[vers.length - 1];
  secret.encryptedValue = previous.encryptedValue;
  secret.version++;
  secret.rotatedAt = new Date().toISOString();
  secret.updatedAt = secret.rotatedAt;

  const accessedBy = req.get('x-user-email') || 'system';
  logAccess(secret.id, accessedBy, 'rotate', req, true);

  res.json({ success: true, version: secret.version, rolledBackTo: previous.version });
});

// API Keys management
app.get('/api/keys', (_req: Request, res: Response) => {
  const keys = Array.from(apiKeys.entries()).map(([key, value]) => ({
    key: key.slice(0, 8) + '...' + key.slice(-4),
    fullKey: key,
    ...value,
  }));
  res.json({ total: keys.length, keys });
});

app.post('/api/keys',requireAuth,  (req: Request, res: Response) => {
  try {
    const data = CreateApiKeySchema.parse(req.body);
    const key = crypto.randomBytes(32).toString('hex');

    apiKeys.set(key, {
      name: data.name,
      permissions: data.permissions,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ key, name: data.name, permissions: data.permissions });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: err.issues });
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/keys/:key',requireAuth,  (req: Request, res: Response) => {
  if (!apiKeys.has(req.params.key)) return res.status(404).json({ error: 'API key not found' });
  apiKeys.delete(req.params.key);
  res.json({ success: true });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: unknown) => {
  console.error('[secrets-os] error:', err);
  res.status(500).json({ error: 'Internal error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`[secrets-os] listening on :${PORT}`);
  console.log(`[secrets-os] encryption: ${ALGORITHM}`);
  console.log(`[secrets-os] secrets: ${secrets.size}`);
});

export default app;
