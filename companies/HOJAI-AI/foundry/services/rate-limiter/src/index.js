/**
 * HOJAI Studio - Rate Limiter
 * API protection and throttling
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

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
const PORT = 4778;
app.use(express.json());

const limits = new Map(); // key -> limit config
const requests = []; // request log

// Default limits
limits.set('default', { requests: 100, window: 60, by: 'ip' });
limits.set('auth', { requests: 5, window: 60, by: 'ip' });
limits.set('api', { requests: 1000, window: 3600, by: 'api_key' });

// REST API - Check Rate Limit
app.get('/api/check', (req, res) => {
  const { key = 'default', identifier } = req.query;
  const limit = limits.get(key) || limits.get('default');

  const now = Date.now();
  const windowStart = now - (limit.window * 1000);

  const recentRequests = requests.filter(r =>
    r.key === key && r.identifier === identifier && r.timestamp > windowStart
  );

  const remaining = Math.max(0, limit.requests - recentRequests.length);
  const reset = Math.ceil((windowStart + (limit.window * 1000)) / 1000);

  res.json({
    key,
    limit: limit.requests,
    remaining,
    reset,
    resetIn: limit.window,
    by: limit.by
  });
});

// REST API - Record Request
app.post('/api/record', requireInternal, (req, res) => {
  const { key = 'default', identifier, success = true } = req.body;

  requests.push({
    id: uuidv4(),
    key,
    identifier,
    success,
    timestamp: Date.now()
  });

  // Cleanup old requests
  const cutoff = Date.now() - (3600 * 1000);
  requests.splice(0, requests.length, ...requests.filter(r => r.timestamp > cutoff));

  res.json({ recorded: true });
});

// REST API - Create/Update Limit
app.post('/api/limits', requireInternal, (req, res) => {
  const { key, requests, window, by = 'ip' } = req.body;
  limits.set(key, { requests, window, by });
  res.json(limits.get(key));
});

// REST API - List Limits
app.get('/api/limits', (req, res) => res.json(Array.from(limits.entries()).map(([key, config]) => ({ key, ...config }))));

// REST API - Delete Limit
app.delete('/api/limits/:key', requireInternal, (req, res) => {
  if (!limits.has(req.params.key)) return res.status(404).json({ error: 'Not found' });
  limits.delete(req.params.key);
  res.json({ deleted: true });
});

// REST API - Analytics
app.get('/api/analytics', (req, res) => {
  const { key, window = 3600 } = req.query;
  const cutoff = Date.now() - (parseInt(window) * 1000);
  const filtered = requests.filter(r => r.timestamp > cutoff && (!key || r.key === key));

  res.json({
    total: filtered.length,
    successful: filtered.filter(r => r.success).length,
    rateLimited: filtered.filter(r => !r.success).length,
    uniqueIdentifiers: new Set(filtered.map(r => r.identifier)).size
  });
});

// REST API - Get Quota
app.get('/api/quota/:identifier', (req, res) => {
  const { identifier } = req.params;
  const quotas = [];

  limits.forEach((config, key) => {
    const windowStart = Date.now() - (config.window * 1000);
    const count = requests.filter(r => r.key === key && r.identifier === identifier && r.timestamp > windowStart).length;
    quotas.push({ key, limit: config.requests, used: count, remaining: Math.max(0, config.requests - count) });
  });

  res.json({ identifier, quotas });
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'rate-limiter', limits: limits.size }));
app.listen(PORT, () => console.log(`Rate Limiter running on port ${PORT}`));
