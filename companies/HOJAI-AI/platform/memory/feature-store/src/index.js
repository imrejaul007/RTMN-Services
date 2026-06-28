/**
 * Feature Store Service
 * Pre-computed memory features
 */
import express from 'express';
import crypto from 'crypto';

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

app.use(express.json());

const featureGroups = new Map();
const features = new Map();
const featureViews = new Map();

function genId(prefix = 'fg') { return `${prefix}_${crypto.randomBytes(6).toString('hex')}`; }

// Feature Groups
app.post('/api/groups', requireInternal, (req, res) => {
  const { name, description, entity, schema } = req.body;
  if (!name || !entity) return res.status(400).json({ error: 'name and entity are required' });
  const id = genId('fg');
  featureGroups.set(id, { id, name, description: description || '', entity, schema: schema || {}, version: 1, createdAt: new Date().toISOString() });
  res.status(201).json({ id, group: featureGroups.get(id) });
});

app.get('/api/groups', (req, res) => {
  const { entity } = req.query;
  let result = Array.from(featureGroups.values());
  if (entity) result = result.filter(g => g.entity === entity);
  res.json({ groups: result, total: result.length });
});

app.get('/api/groups/:id', (req, res) => {
  const g = featureGroups.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Group not found' });
  res.json({ group: g });
});

// Features
app.post('/api/features', requireInternal, (req, res) => {
  const { groupId, name, type, description, defaultValue } = req.body;
  if (!groupId || !name || !type) return res.status(400).json({ error: 'groupId, name, and type are required' });
  if (!featureGroups.has(groupId)) return res.status(404).json({ error: 'Group not found' });
  const id = genId('ftr');
  features.set(id, { id, groupId, name, type, description: description || '', defaultValue, createdAt: new Date().toISOString() });
  res.status(201).json({ id, feature: features.get(id) });
});

app.get('/api/features', (req, res) => {
  const { groupId, type } = req.query;
  let result = Array.from(features.values());
  if (groupId) result = result.filter(f => f.groupId === groupId);
  if (type) result = result.filter(f => f.type === type);
  res.json({ features: result, total: result.length });
});

app.get('/api/features/:id', (req, res) => {
  const f = features.get(req.params.id);
  if (!f) return res.status(404).json({ error: 'Feature not found' });
  res.json({ feature: f });
});

// Feature Values
app.post('/api/values', requireInternal, (req, res) => {
  const { featureId, entityId, value, timestamp } = req.body;
  if (!featureId || !entityId || value === undefined) return res.status(400).json({ error: 'featureId, entityId, and value are required' });
  const key = `${featureId}:${entityId}`;
  const entry = { featureId, entityId, value, timestamp: timestamp || new Date().toISOString() };
  res.status(201).json({ key, entry });
});

app.get('/api/values', (req, res) => {
  const { featureId, entityId } = req.query;
  res.json({ values: [], total: 0 }); // Simplified - actual implementation would query storage
});

// Feature Views
app.post('/api/views', requireInternal, (req, res) => {
  const { name, groupIds, description } = req.body;
  if (!name || !groupIds) return res.status(400).json({ error: 'name and groupIds are required' });
  const id = genId('fv');
  featureViews.set(id, { id, name, groupIds, description: description || '', createdAt: new Date().toISOString() });
  res.status(201).json({ id, view: featureViews.get(id) });
});

app.get('/api/views', (req, res) => {
  res.json({ views: Array.from(featureViews.values()), total: featureViews.size });
});

app.get('/api/views/:id', (req, res) => {
  const v = featureViews.get(req.params.id);
  if (!v) return res.status(404).json({ error: 'View not found' });
  res.json({ view: v });
});

// Stats
app.get('/api/stats', (req, res) => {
  res.json({ groups: featureGroups.size, features: features.size, views: featureViews.size });
});

app.get('/health', (req, res) => res.json({ service: 'feature-store', status: 'healthy', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 4799;
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


app.listen(PORT, () => console.log(`Feature Store running on port ${PORT}`));
export default app;