/**
 * Data Catalog Service
 * Memory data indexing and discovery
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

const catalogs = new Map();
const indexes = new Map();
const dataItems = new Map();

function genId(prefix = 'cat') { return `${prefix}_${crypto.randomBytes(6).toString('hex')}`; }

// Catalogs
app.post('/api/catalogs', requireInternal, (req, res) => {
  const { name, description, schema, owner } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const id = genId('catalog');
  catalogs.set(id, { id, name, description: description || '', schema: schema || {}, owner: owner || 'system', createdAt: new Date().toISOString(), itemCount: 0 });
  res.status(201).json({ id, catalog: catalogs.get(id) });
});

app.get('/api/catalogs', (req, res) => {
  const { owner, search } = req.query;
  let result = Array.from(catalogs.values());
  if (owner) result = result.filter(c => c.owner === owner);
  if (search) result = result.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  res.json({ catalogs: result, total: result.length });
});

app.get('/api/catalogs/:id', (req, res) => {
  const c = catalogs.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Catalog not found' });
  res.json({ catalog: c });
});

app.delete('/api/catalogs/:id', requireInternal, (req, res) => {
  if (!catalogs.has(req.params.id)) return res.status(404).json({ error: 'Catalog not found' });
  catalogs.delete(req.params.id);
  res.json({ message: 'Catalog deleted' });
});

// Data Items
app.post('/api/items', requireInternal, (req, res) => {
  const { catalogId, name, type, data, tags, metadata } = req.body;
  if (!catalogId || !name) return res.status(400).json({ error: 'catalogId and name are required' });
  if (!catalogs.has(catalogId)) return res.status(404).json({ error: 'Catalog not found' });
  const id = genId('item');
  const item = { id, catalogId, name, type: type || 'document', data, tags: tags || [], metadata: metadata || {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  dataItems.set(id, item);
  catalogs.get(catalogId).itemCount++;
  res.status(201).json({ id, item });
});

app.get('/api/items', (req, res) => {
  const { catalogId, type, tag, search } = req.query;
  let result = Array.from(dataItems.values());
  if (catalogId) result = result.filter(i => i.catalogId === catalogId);
  if (type) result = result.filter(i => i.type === type);
  if (tag) result = result.filter(i => i.tags.includes(tag));
  if (search) result = result.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  res.json({ items: result, total: result.length });
});

app.get('/api/items/:id', (req, res) => {
  const item = dataItems.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json({ item });
});

app.delete('/api/items/:id', requireInternal, (req, res) => {
  const item = dataItems.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  const cat = catalogs.get(item.catalogId);
  if (cat) cat.itemCount--;
  dataItems.delete(req.params.id);
  res.json({ message: 'Item deleted' });
});

// Indexes
app.post('/api/indexes', requireInternal, (req, res) => {
  const { name, catalogId, fields, type } = req.body;
  if (!name || !catalogId) return res.status(400).json({ error: 'name and catalogId are required' });
  const id = genId('idx');
  indexes.set(id, { id, name, catalogId, fields: fields || [], type: type || 'btree', createdAt: new Date().toISOString() });
  res.status(201).json({ id, index: indexes.get(id) });
});

app.get('/api/indexes', (req, res) => {
  const { catalogId } = req.query;
  let result = Array.from(indexes.values());
  if (catalogId) result = result.filter(i => i.catalogId === catalogId);
  res.json({ indexes: result, total: result.length });
});

app.delete('/api/indexes/:id', requireInternal, (req, res) => {
  if (!indexes.has(req.params.id)) return res.status(404).json({ error: 'Index not found' });
  indexes.delete(req.params.id);
  res.json({ message: 'Index deleted' });
});

// Stats
app.get('/api/stats', (req, res) => {
  res.json({ catalogs: catalogs.size, items: dataItems.size, indexes: indexes.size, itemsByType: Array.from(dataItems.values()).reduce((acc, i) => { acc[i.type] = (acc[i.type] || 0) + 1; return acc; }, {}) });
});

app.get('/health', (req, res) => res.json({ service: 'data-catalog', status: 'healthy', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 4797;
app.listen(PORT, () => console.log(`Data Catalog running on port ${PORT}`));
export default app;