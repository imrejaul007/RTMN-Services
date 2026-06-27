/**
 * HOJAI Studio - CDN Manager
 * Edge caching and distribution
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
const PORT = 4776;
app.use(express.json());

const zones = new Map(); // zoneId -> config
const cache = []; // cache entries
const purges = []; // purge history

// REST API - Create Zone
app.post('/api/zones', requireInternal, (req, res) => {
  const { projectId, name, origin, settings = {} } = req.body;
  const zone = {
    id: uuidv4(),
    projectId,
    name,
    origin,
    settings: {
      ttl: settings.ttl || 3600,
      cacheAll: settings.cacheAll || false,
      compression: settings.compression || true,
      ...settings
    },
    status: 'active',
    createdAt: new Date().toISOString()
  };
  zones.set(zone.id, zone);
  res.json(zone);
});

// REST API - Get Zone
app.get('/api/zones/:id', (req, res) => {
  const zone = zones.get(req.params.id);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });
  res.json(zone);
});

// REST API - List Zones
app.get('/api/zones', (req, res) => {
  const { projectId } = req.query;
  let list = Array.from(zones.values());
  if (projectId) list = list.filter(z => z.projectId === projectId);
  res.json(list);
});

// REST API - Purge Cache
app.post('/api/zones/:id/purge', requireInternal, (req, res) => {
  const { urls, everything = false } = req.body;
  const zone = zones.get(req.params.id);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });

  const purge = {
    id: uuidv4(),
    zoneId: zone.id,
    urls: urls || [],
    everything,
    status: 'completed',
    purgedAt: new Date().toISOString()
  };
  purges.push(purge);

  res.json(purge);
});

// REST API - Add Cache Rule
app.post('/api/zones/:id/rules', requireInternal, (req, res) => {
  const zone = zones.get(req.params.id);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });

  const rule = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  zone.settings.rules = zone.settings.rules || [];
  zone.settings.rules.push(rule);
  res.json(rule);
});

// REST API - Get Stats
app.get('/api/zones/:id/stats', (req, res) => {
  const zone = zones.get(req.params.id);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });

  res.json({
    zoneId: zone.id,
    hits: Math.round(10000 + Math.random() * 90000),
    misses: Math.round(100 + Math.random() * 900),
    bandwidth: Math.round(100 + Math.random() * 9900),
    bandwidthFormatted: `${(100 + Math.random() * 9900).toFixed(1)} MB`,
    cacheHitRate: `${(90 + Math.random() * 9).toFixed(1)}%`,
    requests: Math.round(50000 + Math.random() * 450000)
  });
});

// REST API - Create Distribution
app.post('/api/distributions', requireInternal, (req, res) => {
  const { zoneId, cnames, enabled = true } = req.body;
  const zone = zones.get(zoneId);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });

  const distribution = {
    id: uuidv4(),
    zoneId,
    domain: `${zone.name}.cdn.hojai.app`,
    cnames: cnames || [],
    enabled,
    status: 'deployed',
    createdAt: new Date().toISOString()
  };
  res.json(distribution);
});

// REST API - Invalidate
app.post('/api/invalidate', requireInternal, (req, res) => {
  const { zoneId, paths } = req.body;
  const invalidation = {
    id: uuidv4(),
    zoneId,
    paths,
    status: 'completed',
    createdAt: new Date().toISOString()
  };
  res.json(invalidation);
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'cdn-manager', zones: zones.size }));
app.listen(PORT, () => console.log(`CDN Manager running on port ${PORT}`));
