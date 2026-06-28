// Workflow Registry - Templates, versioning, categories, search. Port 4902
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson, upsert } from './store.js';

const app = express();
const PORT = 4902;
app.use(express.json());

// Templates CRUD
app.get('/api/templates', function(req, res) {
  const q = req.query;
  let tmpl = readJson('templates.json') || [];
  if (q.category) tmpl = tmpl.filter(function(t) { return t.category === q.category; });
  if (q.industry) tmpl = tmpl.filter(function(t) { return t.industry === q.industry; });
  if (q.tags) tmpl = tmpl.filter(function(t) { return q.tags.split(',').every(function(tag) { return t.tags && t.tags.indexOf(tag) >= 0; }); });
  if (q.q) { var lq = q.q.toLowerCase(); tmpl = tmpl.filter(function(t) { return t.name.toLowerCase().indexOf(lq) >= 0 || (t.description && t.description.toLowerCase().indexOf(lq) >= 0); }); }
  res.json({ templates: tmpl, count: tmpl.length });
});

app.get('/api/templates/:id', function(req, res) {
  const t = (readJson('templates.json') || []).find(function(x) { return x.id === req.params.id; });
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});

app.post('/api/templates', function(req, res) {
  const b = req.body;
  if (!b.name) return res.status(400).json({ error: 'name required' });
  const t = { id: uuidv4(), name: b.name, description: b.description || '', category: b.category || 'general', industry: b.industry || 'general', complexity: b.complexity || 'simple', tags: b.tags || [], nodes: b.nodes || [], edges: b.edges || [], author: b.author || 'anonymous', version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  upsert('templates.json', t);
  res.status(201).json(t);
});

app.put('/api/templates/:id', function(req, res) {
  const tmpl = readJson('templates.json') || [];
  const idx = tmpl.findIndex(function(t) { return t.id === req.params.id; });
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  var b = req.body;
  if (b.name) tmpl[idx].name = b.name;
  if (b.description !== undefined) tmpl[idx].description = b.description;
  if (b.category) tmpl[idx].category = b.category;
  if (b.industry) tmpl[idx].industry = b.industry;
  if (b.complexity) tmpl[idx].complexity = b.complexity;
  if (b.tags) tmpl[idx].tags = b.tags;
  if (b.nodes) tmpl[idx].nodes = b.nodes;
  if (b.edges) tmpl[idx].edges = b.edges;
  tmpl[idx].updatedAt = new Date().toISOString();
  writeJson('templates.json', tmpl);
  res.json(tmpl[idx]);
});

app.delete('/api/templates/:id', function(req, res) {
  const tmpl = readJson('templates.json') || [];
  if (!tmpl.find(function(t) { return t.id === req.params.id; })) return res.status(404).json({ error: 'Not found' });
  writeJson('templates.json', tmpl.filter(function(t) { return t.id !== req.params.id; }));
  res.json({ deleted: true });
});

// Versioning
app.get('/api/templates/:id/versions', function(req, res) {
  res.json({ versions: (readJson('versions.json') || []).filter(function(v) { return v.templateId === req.params.id; }), count: 0 });
});

app.post('/api/templates/:id/versions', function(req, res) {
  const tmpl = readJson('templates.json') || [];
  const t = tmpl.find(function(x) { return x.id === req.params.id; });
  if (!t) return res.status(404).json({ error: 'Template not found' });
  var versions = readJson('versions.json') || [];
  versions.push({ templateId: t.id, version: t.version, name: t.name, nodes: t.nodes, edges: t.edges, createdAt: new Date().toISOString() });
  writeJson('versions.json', versions);
  t.version++;
  t.updatedAt = new Date().toISOString();
  writeJson('templates.json', tmpl);
  res.json({ bumped: t.version, previous: versions[versions.length - 1] });
});

// Categories
app.get('/api/categories', function(req, res) {
  res.json({ categories: readJson('categories.json') || [], count: (readJson('categories.json') || []).length });
});

app.post('/api/categories', function(req, res) {
  var b = req.body;
  if (!b.name) return res.status(400).json({ error: 'name required' });
  var cat = { id: uuidv4(), name: b.name, type: b.type || 'use-case', description: b.description || '', createdAt: new Date().toISOString() };
  upsert('categories.json', cat);
  res.status(201).json(cat);
});

// Search
app.get('/api/search', function(req, res) {
  var q = req.query;
  var results = readJson('templates.json') || [];
  if (q.category) results = results.filter(function(t) { return t.category === q.category; });
  if (q.industry) results = results.filter(function(t) { return t.industry === q.industry; });
  if (q.complexity) results = results.filter(function(t) { return t.complexity === q.complexity; });
  if (q.tags) results = results.filter(function(t) { return q.tags.split(',').every(function(tag) { return t.tags && t.tags.indexOf(tag) >= 0; }); });
  if (q.q) { var lq = q.q.toLowerCase(); results = results.filter(function(t) { return t.name.toLowerCase().indexOf(lq) >= 0; }); }
  res.json({ results: results, count: results.length });
});

// Analytics
app.get('/api/analytics', function(req, res) {
  var tmpl = readJson('templates.json') || [];
  var byCategory = {};
  var byIndustry = {};
  var byComplexity = { simple: 0, medium: 0, complex: 0 };
  tmpl.forEach(function(t) { byCategory[t.category] = (byCategory[t.category] || 0) + 1; byIndustry[t.industry] = (byIndustry[t.industry] || 0) + 1; byComplexity[t.complexity] = (byComplexity[t.complexity] || 0) + 1; });
  res.json({ total: tmpl.length, byCategory: byCategory, byIndustry: byIndustry, byComplexity: byComplexity });
});

app.get('/health', function(req, res) { res.json({ service: 'workflow-registry', status: 'healthy' }); });
app.get('/ready', function(req, res) { res.json({ ready: true }); });

var server = app.listen(PORT, function() { console.log('Workflow Registry running on port ' + PORT); });
export default server;
