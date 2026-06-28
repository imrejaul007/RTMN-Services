// Knowledge Registry - Asset CRUD, versioning, taxonomy, search. Port 4900
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson, upsert } from './store.js';

const app = express();
const PORT = 4900;
app.use(express.json());

// Assets CRUD
app.get('/api/assets', (req, res) => {
  const { type, tags, taxonomy, q } = req.query;
  let assets = readJson('assets.json') || [];
  if (type) assets = assets.filter(a => a.type === type);
  if (tags) assets = assets.filter(a => tags.split(',').every(t => a.tags && a.tags.includes(t)));
  if (taxonomy) assets = assets.filter(a => a.taxonomy === taxonomy);
  if (q) { const lq = q.toLowerCase(); assets = assets.filter(a => a.name.toLowerCase().includes(lq) || (a.content && a.content.toLowerCase().includes(lq))); }
  res.json({ assets, count: assets.length });
});

app.get('/api/assets/:id', (req, res) => {
  const asset = (readJson('assets.json') || []).find(a => a.id === req.params.id);
  if (!asset) return res.status(404).json({ error: 'Not found' });
  res.json(asset);
});

app.post('/api/assets', (req, res) => {
  const { name, type, content, tags, taxonomy, source, confidence, metadata } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type required' });
  const asset = { id: uuidv4(), name, type, content, tags: tags || [], taxonomy, source, confidence: confidence || 1.0, metadata: metadata || {}, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  upsert('assets.json', asset);
  res.status(201).json(asset);
});

app.put('/api/assets/:id', (req, res) => {
  const assets = readJson('assets.json') || [];
  const idx = assets.findIndex(a => a.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  const { name, type, content, tags, taxonomy, source, confidence, metadata } = req.body;
  if (name) assets[idx].name = name;
  if (type) assets[idx].type = type;
  if (content !== undefined) assets[idx].content = content;
  if (tags) assets[idx].tags = tags;
  if (taxonomy) assets[idx].taxonomy = taxonomy;
  if (source) assets[idx].source = source;
  if (confidence !== undefined) assets[idx].confidence = confidence;
  if (metadata) assets[idx].metadata = { ...assets[idx].metadata, ...metadata };
  assets[idx].updatedAt = new Date().toISOString();
  writeJson('assets.json', assets);
  res.json(assets[idx]);
});

app.delete('/api/assets/:id', (req, res) => {
  const assets = readJson('assets.json') || [];
  if (!assets.find(a => a.id === req.params.id)) return res.status(404).json({ error: 'Not found' });
  writeJson('assets.json', assets.filter(a => a.id !== req.params.id));
  res.json({ deleted: true });
});

// Versioning
app.get('/api/assets/:id/versions', (req, res) => {
  const versions = (readJson('versions.json') || []).filter(v => v.assetId === req.params.id);
  res.json({ versions, count: versions.length });
});

app.get('/api/assets/:id/versions/:version', (req, res) => {
  const version = (readJson('versions.json') || []).find(v => v.assetId === req.params.id && v.version === parseInt(req.params.version));
  if (!version) return res.status(404).json({ error: 'Version not found' });
  res.json(version);
});

app.post('/api/assets/:id/versions', (req, res) => {
  const assets = readJson('assets.json') || [];
  const asset = assets.find(a => a.id === req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  const versions = readJson('versions.json') || [];
  const versionRecord = { assetId: asset.id, version: asset.version, name: asset.name, type: asset.type, content: asset.content, createdAt: new Date().toISOString() };
  versions.push(versionRecord);
  writeJson('versions.json', versions);
  asset.version++;
  asset.updatedAt = new Date().toISOString();
  writeJson('assets.json', assets);
  res.json({ bumped: asset.version, previous: versionRecord });
});

// Taxonomy
app.get('/api/taxonomy', (req, res) => {
  res.json({ categories: readJson('taxonomy.json') || [], count: (readJson('taxonomy.json') || []).length });
});

app.post('/api/taxonomy', (req, res) => {
  const { name, parentId, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const cat = { id: uuidv4(), name, parentId: parentId || null, description: description || '', createdAt: new Date().toISOString() };
  upsert('taxonomy.json', cat);
  res.status(201).json(cat);
});

app.get('/api/taxonomy/:id/children', (req, res) => {
  const children = (readJson('taxonomy.json') || []).filter(c => c.parentId === req.params.id);
  res.json({ children, count: children.length });
});

// Search
app.get('/api/search', (req, res) => {
  const { q, type, tags, taxonomy } = req.query;
  let results = (readJson('assets.json') || []);
  if (type) results = results.filter(a => a.type === type);
  if (tags) results = results.filter(a => tags.split(',').every(t => a.tags && a.tags.includes(t)));
  if (taxonomy) results = results.filter(a => a.taxonomy === taxonomy);
  if (q) { const lq = q.toLowerCase(); results = results.filter(a => a.name.toLowerCase().includes(lq) || (a.content && a.content.toLowerCase().includes(lq))); }
  res.json({ results, count: results.length });
});

// Dependencies
app.get('/api/assets/:id/dependencies', (req, res) => {
  const deps = (readJson('dependencies.json') || []).filter(d => d.fromId === req.params.id);
  res.json({ dependencies: deps, count: deps.length });
});

app.post('/api/assets/:id/dependencies', (req, res) => {
  const { toId, type } = req.body;
  if (!toId) return res.status(400).json({ error: 'toId required' });
  const dep = { id: uuidv4(), fromId: req.params.id, toId, type: type || 'uses', createdAt: new Date().toISOString() };
  upsert('dependencies.json', dep);
  res.status(201).json(dep);
});

app.get('/api/assets/:id/dependents', (req, res) => {
  const deps = (readJson('dependencies.json') || []).filter(d => d.toId === req.params.id);
  res.json({ dependents: deps, count: deps.length });
});

app.delete('/api/assets/:id/dependencies/:depId', (req, res) => {
  const deps = (readJson('dependencies.json') || []).filter(d => d.id !== req.params.depId);
  writeJson('dependencies.json', deps);
  res.json({ deleted: true });
});

// Analytics
app.get('/api/stats', (req, res) => {
  const assets = readJson('assets.json') || [];
  const byType = {};
  const byTaxonomy = {};
  assets.forEach(a => { byType[a.type] = (byType[a.type] || 0) + 1; if (a.taxonomy) byTaxonomy[a.taxonomy] = (byTaxonomy[a.taxonomy] || 0) + 1; });
  res.json({ total: assets.length, byType, byTaxonomy, recentlyAdded: assets.filter(a => new Date(a.createdAt) > new Date(Date.now() - 7 * 86400 * 1000)).length });
});

app.get('/health', (req, res) => res.json({ service: 'knowledge-registry', status: 'healthy' }));
app.get('/ready', (req, res) => res.json({ ready: true }));

const server = app.listen(PORT, () => { console.log(`Knowledge Registry running on port ${PORT}`); });
export default server;
