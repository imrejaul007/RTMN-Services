/**
 * PolicyOS — API Key & Token Routes (Phase 0.4: Hardened)
 *
 * Phase 0.4 changes:
 *   - Revocation is SOFT (sets revokedAt timestamp, key stays in store)
 *   - POST /api/apikeys/:key/rotate — creates new key, invalidates old
 *   - GET /api/apikeys returns revokedAt/rotatedFrom for admin visibility
 *   - Expired keys are rejected at auth middleware (not deleted)
 *   - Admin cleanup: DELETE /api/apikeys/:key (hard delete, admin only)
 */

import { v4 as uuidv4 } from 'uuid';
import { signToken } from '../middleware/auth.js';

// Refresh token store: token → { sub, role, createdAt, expiresAt }
const refreshTokens = new Map();

export function registerApiKeyRoutes(app, {
  apiKeys,
  auditLog,
  customAuth,
  writeLimiter,
}) {
  function generateApiKey() {
    return `pk_${uuidv4().replace(/-/g, '')}${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  }

  // POST /api/apikeys — create a new API key
  app.post('/api/apikeys', customAuth, writeLimiter, (req, res) => {
    const body = req.body || {};
    if (!body.name) return res.status(400).json({ error: 'name is required' });
    if (req.auth && req.auth.role !== 'admin' && req.auth.role !== '*' && req.auth.type !== 'service') {
      return res.status(403).json({ error: 'Only admin can issue API keys' });
    }
    const key = generateApiKey();
    const expiresAt = body.expiresInMs ? Date.now() + body.expiresInMs : null;
    const record = {
      key,
      name: body.name,
      role: body.role || 'manager',
      createdAt: new Date().toISOString(),
      expiresAt,
      revokedAt: null,
      rotatedFrom: null,
    };
    apiKeys.set(key, record);
    auditLog({ type: 'apikey.created', actor: req.auth.role || 'unknown', details: { name: body.name, role: record.role } });
    res.status(201).json(record);
  });

  // GET /api/apikeys — list all keys (admin only, secrets redacted)
  app.get('/api/apikeys', customAuth, (req, res) => {
    if (req.auth && req.auth.role !== 'admin' && req.auth.type !== 'service') {
      return res.status(403).json({ error: 'Only admin can list API keys' });
    }
    const now = Date.now();
    const items = Array.from(apiKeys.values()).map((k) => ({
      keyPrefix: k.key ? k.key.slice(0, 8) : 'unknown',
      name: k.name,
      role: k.role,
      createdAt: k.createdAt,
      expiresAt: k.expiresAt,
      expired: k.expiresAt ? k.expiresAt < now : false,
      revokedAt: k.revokedAt,
      rotatedFrom: k.rotatedFrom,
      // Never expose full key or secret in listings
    }));
    res.json({ count: items.length, keys: items });
  });

  // GET /api/apikeys/:key — get key details (full record for owner)
  app.get('/api/apikeys/:key', customAuth, (req, res) => {
    const keyData = apiKeys.get(req.params.key);
    if (!keyData) return res.status(404).json({ error: 'API key not found' });
    const now = Date.now();
    const isExpired = keyData.expiresAt ? keyData.expiresAt < now : false;
    res.json({
      keyPrefix: keyData.key ? keyData.key.slice(0, 8) : 'unknown',
      name: keyData.name,
      role: keyData.role,
      createdAt: keyData.createdAt,
      expiresAt: keyData.expiresAt,
      expired: isExpired,
      revokedAt: keyData.revokedAt,
      rotatedFrom: keyData.rotatedFrom,
    });
  });

  // POST /api/apikeys/:key/rotate — rotate key (soft-revoke old, issue new)
  app.post('/api/apikeys/:key/rotate', customAuth, writeLimiter, (req, res) => {
    if (req.auth && req.auth.role !== 'admin' && req.auth.type !== 'service') {
      return res.status(403).json({ error: 'Only admin can rotate API keys' });
    }
    const oldKey = req.params.key;
    const oldData = apiKeys.get(oldKey);
    if (!oldData) return res.status(404).json({ error: 'API key not found' });

    // Soft-revoke old key (keep in store for audit trail)
    oldData.revokedAt = new Date().toISOString();
    oldData.revokedBy = req.auth.role || 'unknown';
    apiKeys.set(oldKey, oldData);

    // Issue new key with same metadata
    const newKey = generateApiKey();
    const expiresAt = oldData.expiresAt; // inherit original expiry
    const newRecord = {
      key: newKey,
      name: oldData.name,
      role: oldData.role,
      createdAt: new Date().toISOString(),
      expiresAt,
      revokedAt: null,
      rotatedFrom: oldKey.slice(0, 8), // link to old key for audit
    };
    apiKeys.set(newKey, newRecord);
    auditLog({
      type: 'apikey.rotated',
      actor: req.auth.role || 'unknown',
      details: { oldKeyPrefix: oldKey.slice(0, 8), newKeyPrefix: newKey.slice(0, 8) },
    });
    res.status(201).json({ message: 'Key rotated successfully', newKey });
  });

  // DELETE /api/apikeys/:key — hard delete (admin only, use rotate for soft-revoke)
  app.delete('/api/apikeys/:key', customAuth, writeLimiter, (req, res) => {
    if (req.auth && req.auth.role !== 'admin' && req.auth.type !== 'service') {
      return res.status(403).json({ error: 'Only admin can delete API keys' });
    }
    const existed = apiKeys.delete(req.params.key);
    if (!existed) return res.status(404).json({ error: 'API key not found' });
    auditLog({ type: 'apikey.deleted', actor: req.auth.role || 'unknown', details: { keyPrefix: req.params.key.slice(0, 8) } });
    res.json({ ok: true });
  });

  // POST /api/tokens (admin only — issues JWT with RS256/HS256 based on env)
  app.post('/api/tokens', customAuth, writeLimiter, async (req, res) => {
    const body = req.body || {};
    if (req.auth && req.auth.role !== 'admin' && req.auth.type !== 'service') {
      return res.status(403).json({ error: 'Only admin can issue tokens' });
    }
    if (!process.env.JWT_SECRET && !process.env.JWT_PUBLIC_KEY) {
      return res.status(500).json({ error: 'JWT not configured (set JWT_SECRET or JWT_PUBLIC_KEY)' });
    }
    try {
      const expiresInMs = body.expiresInMs || 24 * 60 * 60 * 1000;
      const token = await signToken(
        { sub: body.subject || 'issued-by-admin', role: body.role || 'manager' },
        expiresInMs,
      );
      res.status(201).json({
        token,
        expiresIn: expiresInMs,
        role: body.role || 'manager',
        alg: process.env.JWT_PUBLIC_KEY ? 'RS256' : 'HS256',
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/tokens/refresh — exchange refresh token for new access token
  app.post('/api/tokens/refresh', writeLimiter, async (req, res) => {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }
    const stored = refreshTokens.get(refreshToken);
    if (!stored) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    if (stored.expiresAt && stored.expiresAt < Date.now()) {
      refreshTokens.delete(refreshToken);
      return res.status(401).json({ error: 'Refresh token has expired' });
    }
    // Rotate: consume old refresh token, issue new access token
    refreshTokens.delete(refreshToken);
    const newRefreshToken = `rt_${uuidv4().replace(/-/g, '')}`;
    const newRefreshExpires = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
    refreshTokens.set(newRefreshToken, {
      sub: stored.sub,
      role: stored.role,
      createdAt: new Date().toISOString(),
      expiresAt: newRefreshExpires,
    });
    const accessExpiresMs = 60 * 60 * 1000; // 1 hour access token
    const accessToken = await signToken({ sub: stored.sub, role: stored.role }, accessExpiresMs);
    auditLog({
      type: 'token.refreshed',
      actor: stored.sub,
      details: { sub: stored.sub, role: stored.role },
    });
    res.json({
      accessToken,
      expiresIn: accessExpiresMs,
      refreshToken: newRefreshToken,
      refreshExpiresIn: 7 * 24 * 60 * 60 * 1000,
    });
  });
}