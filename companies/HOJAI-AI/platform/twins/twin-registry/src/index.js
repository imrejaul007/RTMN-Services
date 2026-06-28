// Twin Registry - Twin types, instances, relationships. Port 4903
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson, upsert } from './store.js';

const app = express();
const PORT = 4903;
app.use(express.json());

// Twin Types CRUD
app.get('/api/types', function(req, res) {
  res.json({ types: readJson('types.json') || [], count: (readJson('types.json') || []).length });
});

app.get('/api/types/:id', function(req, res) {
  const t = (readJson('types.json') || []).find(function(x) { return x.id === req.params.id; });
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});

app.post('/api/types', function(req, res) {
  var b = req.body;
  if (!b.name) return res.status(400).json({ error: 'name required' });
  const t = { id: uuidv4(), name: b.name, description: b.description || '', schema: b.schema || {}, attributes: b.attributes || [], relationships: b.relationships || [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  upsert('types.json', t);
  res.status(201).json(t);
});

app.put('/api/types/:id', function(req, res) {
  const types = readJson('types.json') || [];
  const idx = types.findIndex(function(t) { return t.id === req.params.id; });
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  var b = req.body;
  if (b.name) types[idx].name = b.name;
  if (b.description !== undefined) types[idx].description = b.description;
  if (b.schema) types[idx].schema = b.schema;
  if (b.attributes) types[idx].attributes = b.attributes;
  if (b.relationships) types[idx].relationships = b.relationships;
  types[idx].updatedAt = new Date().toISOString();
  writeJson('types.json', types);
  res.json(types[idx]);
});

app.delete('/api/types/:id', function(req, res) {
  const types = readJson('types.json') || [];
  if (!types.find(function(t) { return t.id === req.params.id; })) return res.status(404).json({ error: 'Not found' });
  writeJson('types.json', types.filter(function(t) { return t.id !== req.params.id; }));
  res.json({ deleted: true });
});

// Twin Instances CRUD
app.get('/api/instances', function(req, res) {
  var q = req.query;
  var inst = readJson('instances.json') || [];
  if (q.typeId) inst = inst.filter(function(i) { return i.typeId === q.typeId; });
  if (q.tags) inst = inst.filter(function(i) { return q.tags.split(',').every(function(tag) { return i.tags && i.tags.indexOf(tag) >= 0; }); });
  if (q.q) { var lq = q.q.toLowerCase(); inst = inst.filter(function(i) { return i.name.toLowerCase().indexOf(lq) >= 0; }); }
  res.json({ instances: inst, count: inst.length });
});

app.get('/api/instances/:id', function(req, res) {
  const i = (readJson('instances.json') || []).find(function(x) { return x.id === req.params.id; });
  if (!i) return res.status(404).json({ error: 'Not found' });
  res.json(i);
});

app.post('/api/instances', function(req, res) {
  var b = req.body;
  if (!b.typeId || !b.name) return res.status(400).json({ error: 'typeId and name required' });
  const inst = { id: uuidv4(), typeId: b.typeId, name: b.name, data: b.data || {}, tags: b.tags || [], status: b.status || 'active', version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  upsert('instances.json', inst);
  res.status(201).json(inst);
});

app.put('/api/instances/:id', function(req, res) {
  const insts = readJson('instances.json') || [];
  const idx = insts.findIndex(function(i) { return i.id === req.params.id; });
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  var b = req.body;
  if (b.name) insts[idx].name = b.name;
  if (b.data) insts[idx].data = b.data;
  if (b.tags) insts[idx].tags = b.tags;
  if (b.status) insts[idx].status = b.status;
  insts[idx].updatedAt = new Date().toISOString();
  writeJson('instances.json', insts);
  res.json(insts[idx]);
});

app.delete('/api/instances/:id', function(req, res) {
  const insts = readJson('instances.json') || [];
  if (!insts.find(function(i) { return i.id === req.params.id; })) return res.status(404).json({ error: 'Not found' });
  writeJson('instances.json', insts.filter(function(i) { return i.id !== req.params.id; }));
  res.json({ deleted: true });
});

// Versioning
app.get('/api/instances/:id/versions', function(req, res) {
  res.json({ versions: (readJson('versions.json') || []).filter(function(v) { return v.instanceId === req.params.id; }), count: 0 });
});

app.post('/api/instances/:id/versions', function(req, res) {
  const insts = readJson('instances.json') || [];
  const inst = insts.find(function(x) { return x.id === req.params.id; });
  if (!inst) return res.status(404).json({ error: 'Instance not found' });
  var versions = readJson('versions.json') || [];
  versions.push({ instanceId: inst.id, version: inst.version, name: inst.name, data: inst.data, createdAt: new Date().toISOString() });
  writeJson('versions.json', versions);
  inst.version++;
  inst.updatedAt = new Date().toISOString();
  writeJson('instances.json', insts);
  res.json({ bumped: inst.version, previous: versions[versions.length - 1] });
});

// Relationships
app.get('/api/instances/:id/relationships', function(req, res) {
  const rels = (readJson('relationships.json') || []).filter(function(r) { return r.fromId === req.params.id || r.toId === req.params.id; });
  res.json({ relationships: rels, count: rels.length });
});

app.post('/api/instances/:id/relationships', function(req, res) {
  var b = req.body;
  if (!b.toId || !b.type) return res.status(400).json({ error: 'toId and type required' });
  const rel = { id: uuidv4(), fromId: req.params.id, toId: b.toId, type: b.type, metadata: b.metadata || {}, createdAt: new Date().toISOString() };
  upsert('relationships.json', rel);
  res.status(201).json(rel);
});

app.delete('/api/instances/:id/relationships/:relId', function(req, res) {
  const rels = readJson('relationships.json') || [];
  if (!rels.find(function(r) { return r.id === req.params.relId; })) return res.status(404).json({ error: 'Relationship not found' });
  writeJson('relationships.json', rels.filter(function(r) { return r.id !== req.params.relId; }));
  res.json({ deleted: true });
});

// Analytics
app.get('/api/stats', function(req, res) {
  var insts = readJson('instances.json') || [];
  var rels = readJson('relationships.json') || [];
  var types = readJson('types.json') || [];
  var byType = {};
  var byStatus = {};
  insts.forEach(function(i) { byType[i.typeId] = (byType[i.typeId] || 0) + 1; byStatus[i.status] = (byStatus[i.status] || 0) + 1; });
  res.json({ totalTypes: types.length, totalInstances: insts.length, totalRelationships: rels.length, byType: byType, byStatus: byStatus });
});

app.get('/health', function(req, res) { res.json({ service: 'twin-registry', status: 'healthy' }); });
app.get('/ready', function(req, res) { res.json({ ready: true }); });

var server = app.listen(PORT, function() { console.log('Twin Registry running on port ' + PORT); });
export default server;
