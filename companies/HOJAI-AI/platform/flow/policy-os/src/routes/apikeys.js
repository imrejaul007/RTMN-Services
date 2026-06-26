/**
 * PolicyOS — API Key & Token Routes
 */

import { v4 as uuidv4 } from 'uuid';
import { createServiceToken } from '../middleware/auth.js';

export function registerApiKeyRoutes(app, {
  apiKeys,
  auditLog,
  customAuth,
  writeLimiter,
}) {
  function generateApiKey() {
    return `pk_${uuidv4().replace(/-/g, '')}${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  }

  // POST /api/apikeys
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
    };
    apiKeys.set(key, record);
    auditLog({ type: 'apikey.created', actor: req.auth.role || 'unknown', details: { name: body.name, role: record.role } });
    res.status(201).json(record);
  });

  // GET /api/apikeys
  app.get('/api/apikeys', customAuth, (req, res) => {
    const items = Array.from(apiKeys.values()).map((k) => ({
      name: k.name, role: k.role, createdAt: k.createdAt, expiresAt: k.expiresAt,
    }));
    res.json({ count: items.length, keys: items });
  });

  // DELETE /api/apikeys/:key
  app.delete('/api/apikeys/:key', customAuth, writeLimiter, (req, res) => {
    if (req.auth && req.auth.role !== 'admin' && req.auth.type !== 'service') {
      return res.status(403).json({ error: 'Only admin can revoke API keys' });
    }
    const existed = apiKeys.delete(req.params.key);
    if (!existed) return res.status(404).json({ error: 'API key not found' });
    auditLog({ type: 'apikey.revoked', actor: req.auth.role || 'unknown', details: { keyPrefix: req.params.key.slice(0, 8) } });
    res.json({ ok: true });
  });

  // POST /api/tokens (admin only — issues HS256 JWT)
  app.post('/api/tokens', customAuth, writeLimiter, async (req, res) => {
    const body = req.body || {};
    if (req.auth && req.auth.role !== 'admin' && req.auth.type !== 'service') {
      return res.status(403).json({ error: 'Only admin can issue tokens' });
    }
    const jwt = await import('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT_SECRET not configured' });
    }
    const expiresIn = body.expiresInMs || 24 * 60 * 60 * 1000;
    const token = jwt.default.sign(
      { sub: body.subject || 'issued-by-admin', role: body.role || 'manager', iat: Math.floor(Date.now() / 1000), exp: Math.floor((Date.now() + expiresIn) / 1000) },
      jwtSecret,
      { algorithm: 'HS256' },
    );
    res.status(201).json({ token, expiresIn, role: body.role || 'manager' });
  });
}
