/**
 * REZ API Key Rotation Service
 *
 * Secure API key management with automatic rotation
 * Port: 4075
 *
 * Features:
 * - API key generation
 * - Automatic rotation
 * - Usage tracking
 * - Access control
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

const PORT = parseInt(process.env.PORT || '4075', 10);

// Types
type KeyStatus = 'active' | 'rotating' | 'expired' | 'revoked';
type KeyPermission = 'read' | 'write' | 'admin';

interface APIKey {
  id: string;
  key_id: string;
  key_prefix: string;
  name: string;
  owner_id: string;
  owner_type: 'user' | 'company' | 'service';
  permissions: KeyPermission[];
  status: KeyStatus;
  scopes: string[];
  created_at: string;
  expires_at: string;
  last_used?: string;
  rotation_period_days: number;
  auto_rotate: boolean;
  usage_count: number;
  usage_limit?: number;
  metadata: Record<string, unknown>;
}

interface KeyRotation {
  id: string;
  key_id: string;
  old_key_id: string;
  new_key_id: string;
  reason: 'scheduled' | 'manual' | 'compromised' | 'expired';
  rotated_at: string;
  rotated_by: string;
}

interface AccessLog {
  id: string;
  key_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  ip_address?: string;
  timestamp: string;
}

// In-memory storage
const apiKeys = new Map<string, APIKey>();
const rotations = new Map<string, KeyRotation[]>();
const accessLogs = new Map<string, AccessLog[]>();

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'rez-api-key-rotation',
    version: '1.0.0',
    active_keys: Array.from(apiKeys.values()).filter(k => k.status === 'active').length,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// KEY MANAGEMENT
// ============================================

// Generate new API key
app.post('/api/keys', (req: Request, res: Response) => {
  try {
    const { name, owner_id, owner_type, permissions, scopes, rotation_days, auto_rotate, usage_limit, metadata } = req.body;

    if (!name || !owner_id) {
      res.status(400).json({ error: 'Missing required fields: name, owner_id' });
      return;
    }

    // Generate key
    const keyId = `key_${uuidv4()}`;
    const rawKey = crypto.randomBytes(32).toString('hex');
    const keyPrefix = rawKey.substring(0, 8);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const expiresAt = rotation_days
      ? new Date(Date.now() + rotation_days * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const apiKey: APIKey = {
      id: keyHash,
      key_id: keyId,
      key_prefix: keyPrefix,
      name,
      owner_id,
      owner_type: owner_type || 'user',
      permissions: permissions || ['read'],
      status: 'active',
      scopes: scopes || [],
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
      rotation_period_days: rotation_days || 90,
      auto_rotate: auto_rotate !== false,
      usage_count: 0,
      usage_limit: usage_limit,
      metadata: metadata || {}
    };

    apiKeys.set(keyId, apiKey);
    rotations.set(keyId, []);

    res.json({
      success: true,
      api_key: {
        ...apiKey,
        // Only return full key on creation
        key: `${keyPrefix}_${rawKey}`
      }
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// List API keys
app.get('/api/keys', (req: Request, res: Response) => {
  const { owner_id, owner_type, status } = req.query;

  let result = Array.from(apiKeys.values());

  if (owner_id) result = result.filter(k => k.owner_id === owner_id);
  if (owner_type) result = result.filter(k => k.owner_type === owner_type);
  if (status) result = result.filter(k => k.status === status);

  // Don't expose full keys
  result = result.map(k => ({
    ...k,
    key: undefined,
    id: k.key_id // Use key_id instead of hash
  }));

  res.json({ keys: result, count: result.length });
});

// Get key details
app.get('/api/keys/:keyId', (req: Request, res: Response) => {
  const key = apiKeys.get(req.params.keyId);

  if (!key) {
    res.status(404).json({ error: 'API key not found' });
    return;
  }

  res.json({
    ...key,
    key: undefined,
    id: key.key_id
  });
});

// Update key
app.put('/api/keys/:keyId', (req: Request, res: Response) => {
  const key = apiKeys.get(req.params.keyId);

  if (!key) {
    res.status(404).json({ error: 'API key not found' });
    return;
  }

  const { name, permissions, scopes, auto_rotate, usage_limit, metadata } = req.body;

  if (name) key.name = name;
  if (permissions) key.permissions = permissions;
  if (scopes) key.scopes = scopes;
  if (auto_rotate !== undefined) key.auto_rotate = auto_rotate;
  if (usage_limit !== undefined) key.usage_limit = usage_limit;
  if (metadata) key.metadata = { ...key.metadata, ...metadata };

  apiKeys.set(key.key_id, key);

  res.json({ success: true, key: { ...key, key: undefined, id: key.key_id } });
});

// Revoke key
app.post('/api/keys/:keyId/revoke', (req: Request, res: Response) => {
  const key = apiKeys.get(req.params.keyId);

  if (!key) {
    res.status(404).json({ error: 'API key not found' });
    return;
  }

  key.status = 'revoked';
  apiKeys.set(key.key_id, key);

  res.json({ success: true, message: 'API key revoked' });
});

// ============================================
// KEY VALIDATION
// ============================================

// Validate API key
app.post('/api/keys/validate', (req: Request, res: Response) => {
  const { api_key, endpoint, method } = req.body;

  if (!api_key) {
    res.status(400).json({ error: 'Missing required field: api_key' });
    return;
  }

  // Parse key
  const parts = api_key.split('_');
  if (parts.length !== 2) {
    res.json({ valid: false, error: 'Invalid key format' });
    return;
  }

  const [, rawKey] = parts;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  // Find key
  let foundKey: APIKey | undefined;
  for (const key of apiKeys.values()) {
    if (key.id === keyHash) {
      foundKey = key;
      break;
    }
  }

  if (!foundKey) {
    res.json({ valid: false, error: 'API key not found' });
    return;
  }

  // Check status
  if (foundKey.status !== 'active') {
    res.json({ valid: false, error: `Key is ${foundKey.status}` });
    return;
  }

  // Check expiration
  if (new Date(foundKey.expires_at) < new Date()) {
    foundKey.status = 'expired';
    apiKeys.set(foundKey.key_id, foundKey);
    res.json({ valid: false, error: 'Key has expired' });
    return;
  }

  // Check usage limit
  if (foundKey.usage_limit && foundKey.usage_count >= foundKey.usage_limit) {
    res.json({ valid: false, error: 'Usage limit exceeded' });
    return;
  }

  // Update usage
  foundKey.usage_count++;
  foundKey.last_used = new Date().toISOString();
  apiKeys.set(foundKey.key_id, foundKey);

  // Log access
  const log: AccessLog = {
    id: uuidv4(),
    key_id: foundKey.key_id,
    endpoint: endpoint || 'unknown',
    method: method || 'unknown',
    status_code: 200,
    timestamp: new Date().toISOString()
  };

  const keyLogs = accessLogs.get(foundKey.key_id) || [];
  keyLogs.push(log);
  accessLogs.set(foundKey.key_id, keyLogs);

  res.json({
    valid: true,
    key_id: foundKey.key_id,
    permissions: foundKey.permissions,
    scopes: foundKey.scopes,
    owner_id: foundKey.owner_id
  });
});

// ============================================
// KEY ROTATION
// ============================================

// Rotate key
app.post('/api/keys/:keyId/rotate', (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const key = apiKeys.get(req.params.keyId);

    if (!key) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }

    if (key.status === 'revoked') {
      res.status(400).json({ error: 'Cannot rotate revoked key' });
      return;
    }

    // Generate new key
    const newRawKey = crypto.randomBytes(32).toString('hex');
    const newKeyPrefix = newRawKey.substring(0, 8);
    const newKeyHash = crypto.createHash('sha256').update(newRawKey).digest('hex');

    const oldKeyId = key.key_id;
    const newKeyId = `key_${uuidv4()}`;

    // Record rotation
    const rotation: KeyRotation = {
      id: uuidv4(),
      key_id: newKeyId,
      old_key_id: oldKeyId,
      new_key_id: newKeyId,
      reason: reason || 'manual',
      rotated_at: new Date().toISOString(),
      rotated_by: 'api'
    };

    const keyRotations = rotations.get(oldKeyId) || [];
    keyRotations.push(rotation);
    rotations.set(oldKeyId, keyRotations);

    // Update key
    key.id = newKeyHash;
    key.key_id = newKeyId;
    key.key_prefix = newKeyPrefix;
    key.status = 'active';
    key.created_at = new Date().toISOString();
    key.expires_at = new Date(Date.now() + key.rotation_period_days * 24 * 60 * 60 * 1000).toISOString();
    key.usage_count = 0;

    apiKeys.set(newKeyId, key);

    res.json({
      success: true,
      new_key: {
        ...key,
        key: `${newKeyPrefix}_${newRawKey}`
      },
      rotation
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get rotation history
app.get('/api/keys/:keyId/rotations', (req: Request, res: Response) => {
  const history = rotations.get(req.params.keyId) || [];
  res.json({ rotations: history, count: history.length });
});

// ============================================
// USAGE STATISTICS
// ============================================

// Get key usage
app.get('/api/keys/:keyId/usage', (req: Request, res: Response) => {
  const key = apiKeys.get(req.params.keyId);

  if (!key) {
    res.status(404).json({ error: 'API key not found' });
    return;
  }

  const logs = accessLogs.get(req.params.keyId) || [];

  res.json({
    key_id: key.key_id,
    usage_count: key.usage_count,
    usage_limit: key.usage_limit,
    usage_percentage: key.usage_limit ? (key.usage_count / key.usage_limit * 100).toFixed(2) + '%' : 'unlimited',
    last_used: key.last_used,
    recent_calls: logs.slice(-10)
  });
});

// ============================================
// ACCESS LOGS
// ============================================

app.get('/api/keys/:keyId/logs', (req: Request, res: Response) => {
  const logs = accessLogs.get(req.params.keyId) || [];
  const { since, until, limit = 100 } = req.query;

  let result = logs;

  if (since) result = result.filter(l => new Date(l.timestamp) >= new Date(since as string));
  if (until) result = result.filter(l => new Date(l.timestamp) <= new Date(until as string));

  result = result.slice(-(parseInt(limit as string)));

  res.json({ logs: result, count: result.length });
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[APIKeyRotation Error]', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  logger.info(REZ API Key Rotation - Port ${PORT}`);
  logger.info(  → Generate: POST /api/keys`);
  logger.info(  → List: GET /api/keys`);
  logger.info(  → Validate: POST /api/keys/validate`);
  logger.info(  → Rotate: POST /api/keys/:id/rotate`);
  logger.info(  → Usage: GET /api/keys/:id/usage`);
  logger.info(  → Logs: GET /api/keys/:id/logs`);
});

export default app;
