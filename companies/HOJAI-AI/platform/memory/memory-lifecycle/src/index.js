// Memory Lifecycle OS - TTL, compaction, pruning, archival, GDPR. Port 4899
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson, upsert } from './store.js';

const app = express();
const PORT = 4899;
app.use(express.json());

// Memories CRUD
app.get('/api/memories', function(req, res) {
  const q = req.query;
  let mems = readJson('memories.json') || [];
  if (q.owner) mems = mems.filter(function(m) { return m.owner === q.owner; });
  if (q.type) mems = mems.filter(function(m) { return m.type === q.type; });
  if (q.tags) mems = mems.filter(function(m) { return q.tags.split(',').every(function(t) { return m.tags && m.tags.indexOf(t) >= 0; }); });
  if (q.minConfidence) mems = mems.filter(function(m) { return m.confidence >= parseFloat(q.minConfidence); });
  if (q.archived !== undefined) mems = mems.filter(function(m) { return m.isArchived === (q.archived === 'true'); });
  res.json({ memories: mems, count: mems.length });
});

app.get('/api/memories/:id', function(req, res) {
  const mem = (readJson('memories.json') || []).find(function(m) { return m.id === req.params.id; });
  if (!mem) return res.status(404).json({ error: 'Not found' });
  res.json(mem);
});

app.post('/api/memories', function(req, res) {
  const b = req.body;
  if (!b.owner || !b.content) return res.status(400).json({ error: 'owner and content required' });
  const mem = { id: uuidv4(), owner: b.owner, content: b.content, type: b.type || 'fact', confidence: b.confidence !== undefined ? b.confidence : 1.0, tags: b.tags || [], expiresAt: b.expiresAt || null, metadata: b.metadata || {}, isArchived: false, compactCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  upsert('memories.json', mem);
  res.status(201).json(mem);
});

app.put('/api/memories/:id', function(req, res) {
  const mems = readJson('memories.json') || [];
  const idx = mems.findIndex(function(m) { return m.id === req.params.id; });
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  const b = req.body;
  if (b.content !== undefined) mems[idx].content = b.content;
  if (b.type !== undefined) mems[idx].type = b.type;
  if (b.confidence !== undefined) mems[idx].confidence = b.confidence;
  if (b.tags) mems[idx].tags = b.tags;
  if (b.expiresAt !== undefined) mems[idx].expiresAt = b.expiresAt;
  if (b.metadata) mems[idx].metadata = Object.assign({}, mems[idx].metadata || {}, b.metadata);
  mems[idx].updatedAt = new Date().toISOString();
  writeJson('memories.json', mems);
  res.json(mems[idx]);
});

app.delete('/api/memories/:id', function(req, res) {
  const mems = readJson('memories.json') || [];
  const mem = mems.find(function(m) { return m.id === req.params.id; });
  if (!mem) return res.status(404).json({ error: 'Not found' });
  triggerHooks('on-forget', mem);
  writeJson('memories.json', mems.filter(function(m) { return m.id !== req.params.id; }));
  res.json({ deleted: true });
});

// Expired
app.get('/api/memories/expired', function(req, res) {
  const now = new Date();
  const mems = (readJson('memories.json') || []).filter(function(m) { return m.expiresAt && new Date(m.expiresAt) < now && !m.isArchived; });
  res.json({ expired: mems, count: mems.length });
});

// Compaction
app.post('/api/compact', function(req, res) {
  const threshold = req.body.confidenceThreshold !== undefined ? req.body.confidenceThreshold : 0.7;
  let mems = readJson('memories.json') || [];
  const groups = {};
  mems.forEach(function(m) {
    const key = m.owner + ':' + (m.type || '') + ':' + (m.content || '').substring(0, 50).toLowerCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  });
  const toRemove = [];
  Object.values(groups).forEach(function(group) {
    if (group.length > 1) {
      group.sort(function(a, b) { return b.confidence - a.confidence; });
      const keep = group[0];
      group.slice(1).forEach(function(m) {
        toRemove.push(m.id);
        keep.compactCount = (keep.compactCount || 0) + 1;
        triggerHooks('on-compact', { kept: keep, removed: m });
      });
    }
  });
  if (toRemove.length > 0) {
    mems = mems.filter(function(m) { return toRemove.indexOf(m.id) < 0; });
    writeJson('memories.json', mems);
  }
  res.json({ compacted: toRemove.length, removed: toRemove });
});

// Pruning
app.post('/api/prune', function(req, res) {
  const minConf = req.body.minConfidence !== undefined ? req.body.minConfidence : 0.3;
  let mems = readJson('memories.json') || [];
  const toRemove = mems.filter(function(m) { return m.confidence < minConf && !m.isArchived; });
  if (toRemove.length > 0) {
    toRemove.forEach(function(m) { triggerHooks('on-forget', m); });
    mems = mems.filter(function(m) { return m.confidence >= minConf; });
    writeJson('memories.json', mems);
  }
  res.json({ pruned: toRemove.length, removed: toRemove.map(function(m) { return m.id; }) });
});

// Archival
app.post('/api/archive', function(req, res) {
  const days = req.body.olderThanDays !== undefined ? req.body.olderThanDays : 30;
  const cutoff = new Date(Date.now() - days * 86400000);
  let mems = readJson('memories.json') || [];
  let count = 0;
  mems = mems.map(function(m) {
    if (!m.isArchived && new Date(m.createdAt) < cutoff) {
      m.isArchived = true;
      m.archivedAt = new Date().toISOString();
      count++;
      triggerHooks('on-archive', m);
    }
    return m;
  });
  writeJson('memories.json', mems);
  res.json({ archived: count, cutoffDays: days });
});

// GDPR
app.post('/api/gdpr/delete', function(req, res) {
  const owner = req.body.owner;
  if (!owner) return res.status(400).json({ error: 'owner required' });
  let mems = readJson('memories.json') || [];
  const toDelete = mems.filter(function(m) { return m.owner === owner; });
  if (toDelete.length > 0) toDelete.forEach(function(m) { triggerHooks('on-forget', m); });
  mems = mems.filter(function(m) { return m.owner !== owner; });
  writeJson('memories.json', mems);
  res.json({ deleted: toDelete.length, owner: owner });
});

// Lifecycle hooks
app.get('/api/hooks', function(req, res) {
  res.json({ hooks: readJson('hooks.json') || [], count: (readJson('hooks.json') || []).length });
});

app.post('/api/hooks', function(req, res) {
  const b = req.body;
  if (!b.name || !b.event || !b.callback) return res.status(400).json({ error: 'name, event, callback required' });
  const hook = { id: uuidv4(), name: b.name, event: b.event, callback: b.callback, createdAt: new Date().toISOString() };
  upsert('hooks.json', hook);
  res.status(201).json(hook);
});

app.delete('/api/hooks/:id', function(req, res) {
  writeJson('hooks.json', (readJson('hooks.json') || []).filter(function(h) { return h.id !== req.params.id; }));
  res.json({ deleted: true });
});

function triggerHooks(event, memory) {
  const hooks = readJson('hooks.json') || [];
  hooks.filter(function(h) { return h.event === event; }).forEach(function(h) {
    console.log('[hook:' + h.name + '] ' + event + ' for memory ' + memory.id + ': ' + h.callback);
  });
}

// Stats
app.get('/api/stats', function(req, res) {
  const mems = readJson('memories.json') || [];
  const byType = {};
  mems.forEach(function(m) { byType[m.type || 'unknown'] = (byType[m.type || 'unknown'] || 0) + 1; });
  res.json({
    total: mems.length,
    expired: mems.filter(function(m) { return m.expiresAt && new Date(m.expiresAt) < new Date(); }).length,
    archived: mems.filter(function(m) { return m.isArchived; }).length,
    byType: byType,
    byConfidence: { high: mems.filter(function(m) { return m.confidence >= 0.8; }).length, mid: mems.filter(function(m) { return m.confidence >= 0.5 && m.confidence < 0.8; }).length, low: mems.filter(function(m) { return m.confidence < 0.5; }).length },
  });
});

app.get('/health', function(req, res) { res.json({ service: 'memory-lifecycle', status: 'healthy' }); });
app.get('/ready', function(req, res) { res.json({ ready: true }); });

const server = app.listen(PORT, function() { console.log('Memory Lifecycle OS running on port ' + PORT); });
export default server;
