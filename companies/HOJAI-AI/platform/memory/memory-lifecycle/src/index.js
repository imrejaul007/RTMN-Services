// Memory Lifecycle OS - TTL, compaction, pruning, archival, GDPR. Port 4899
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson, upsert } from './store.js';

const app = express();
const PORT = 4899;
app.use(express.json());

// --- Memories CRUD ---
app.get('/api/memories', (req, res) => {
  const { owner, type, tags, minConfidence, archived } = req.query;
  let mems = readJson('memories.json') || [];
  if (owner) mems = mems.filter(m => m.owner === owner);
  if (type) mems = mems.filter(m => m.type === type);
  if (tags) mems = mems.filter(m => tags.split(',').every(t => m.tags && m.tags.includes(t)));
  if (minConfidence) mems = mems.filter(m => m.confidence >= parseFloat(minConfidence));
  if (archived !== undefined) mems = mems.filter(m => m.isArchived === (archived === 'true'));
  res.json({ memories: mems, count: mems.length });
});

app.get('/api/memories/:id', (req, res) => {
  const mem = (readJson('memories.json') || []).find(m => m.id === req.params.id);
  if (!mem) return res.status(404).json({ error: 'Not found' });
  res.json(mem);
});

app.post('/api/memories', (req, res) => {
  const { owner, content, type, confidence = 1.0, tags = [], expiresAt, metadata = {} } = req.body;
  if (!owner || !content) return res.status(400).json({ error: 'owner and content required' });
  const mem = { id: uuidv4(), owner, content, type, confidence, tags, expiresAt, metadata, isArchived: false, compactCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  upsert('memories.json', mem);
  res.status(201).json(mem);
});

app.put('/api/memories/:id', (req, res) => {
  const mems = readJson('memories.json') || [];
  const idx = mems.findIndex(m => m.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  const { content, type, confidence, tags, expiresAt, metadata } = req.body;
  if (content) mems[idx].content = content;
  if (type) mems[idx].type = type;
  if (confidence !== undefined) mems[idx].confidence = confidence;
  if (tags) mems[idx].tags = tags;
  if (expiresAt !== undefined) mems[idx].expiresAt = expiresAt;
  if (metadata) mems[idx].metadata = { ...mems[idx].metadata, ...metadata };
  mems[idx].updatedAt = new Date().toISOString();
  writeJson('memories.json', mems);
  res.json(mems[idx]);
});

app.delete('/api/memories/:id', (req, res) => {
  const mems = readJson('memories.json') || [];
  const mem = mems.find(m => m.id === req.params.id);
  if (!mem) return res.status(404).json({ error: 'Not found' });
  triggerHooks('on-forget', mem);
  writeJson('memories.json', mems.filter(m => m.id !== req.params.id));
  res.json({ deleted: true });
});

// --- TTL: expired memories ---
app.get('/api/memories/expired', (req, res) => {
  const now = new Date();
  const mems = (readJson('memories.json') || []).filter(m => m.expiresAt && new Date(m.expiresAt) < now && !m.isArchived);
  res.json({ expired: mems, count: mems.length });
});

// --- Compaction: merge redundant memories ---
app.post('/api/compact', (req, res) => {
  const { confidenceThreshold = 0.7 } = req.body;
  let mems = readJson('memories.json') || [];
  const toRemove = [];
  const groups = {};
  mems.forEach((m, i) => { const key = `${m.owner}:${m.type}:${m.content.substring(0, 50).toLowerCase()}`; if (!groups[key]) groups[key] = []; groups[key].push({ m, i }); });
  Object.values(groups).forEach(group => {
    if (group.length > 1) {
      const sorted = group.sort((a, b) => b.m.confidence - a.m.confidence);
      const keep = sorted[0].m;
      sorted.slice(1).forEach(({ m }) => { toRemove.push(m.id); keep.compactCount++; triggerHooks('on-compact', { kept: keep, removed: m }); });
    }
  });
  if (toRemove.length) {
    mems = mems.filter(m => !toRemove.includes(m.id));
    writeJson('memories.json', mems);
  }
  res.json({ compacted: toRemove.length, removed: toRemove });
});

// --- Pruning: remove low-confidence ---
app.post('/api/prune', (req, res) => {
  const { minConfidence = 0.3 } = req.body;
  let mems = readJson('memories.json') || [];
  const toRemove = mems.filter(m => m.confidence < minConfidence && !m.isArchived);
  if (toRemove.length) {
    toRemove.forEach(m => triggerHooks('on-forget', m));
    mems = mems.filter(m => m.confidence >= minConfidence);
    writeJson('memories.json', mems);
  }
  res.json({ pruned: toRemove.length, removed: toRemove.map(m => m.id) });
});

// --- Archival ---
app.post('/api/archive', (req, res) => {
  const { olderThanDays = 30 } = req.body;
  const cutoff = new Date(Date.now() - olderThanDays * 86400 * 1000);
  let mems = readJson('memories.json') || [];
  let archived = 0;
  mems = mems.map(m => {
    if (!m.isArchived && new Date(m.createdAt) < cutoff) { m.isArchived = true; m.archivedAt = new Date().toISOString(); archived++; triggerHooks('on-archive', m); return m; }
    return m;
  });
  writeJson('memories.json', mems);
  res.json({ archived, cutoffDays: olderThanDays });
});

// --- GDPR: delete all for owner ---
app.post('/api/gdpr/delete', (req, res) => {
  const { owner } = req.body;
  if (!owner) return res.status(400).json({ error: 'owner required' });
  let mems = readJson('memories.json') || [];
  const toDelete = mems.filter(m => m.owner === owner);
  if (toDelete.length) { toDelete.forEach(m => triggerHooks('on-forget', m)); }
  mems = mems.filter(m => m.owner !== owner);
  writeJson('memories.json', mems);
  res.json({ deleted: toDelete.length, owner });
});

// --- Lifecycle hooks ---
app.get('/api/hooks', (req, res) => {
  res.json({ hooks: readJson('hooks.json') || [], count: (readJson('hooks.json') || []).length });
});

app.post('/api/hooks', (req, res) => {
  const { name, event, callback } = req.body;
  if (!name || !event || !callback) return res.status(400).json({ error: 'name, event, callback required' });
  const hook = { id: uuidv4(), name, event, callback, createdAt: new Date().toISOString() };
  upsert('hooks.json', hook);
  res.status(201).json(hook);
});

app.delete('/api/hooks/:id', (req, res) => {
  const hooks = (readJson('hooks.json') || []).filter(h => h.id !== req.params.id);
  writeJson('hooks.json', hooks);
  res.json({ deleted: true });
});

function triggerHooks(event, memory) {
  const hooks = readJson('hooks.json') || [];
  hooks.filter(h => h.event === event).forEach(h => {
    console.log(`[hook:${h.name}] ${event} for memory ${memory.id}: ${h.callback}`);
  });
}

// --- Stats ---
app.get('/api/stats', (req, res) => {
  const mems = readJson('memories.json') || [];
  const total = mems.length;
  const expired = mems.filter(m => m.expiresAt && new Date(m.expiresAt) < new Date()).length;
  const archived = mems.filter(m => m.isArchived).length;
  const byType = mems.reduce((acc, m) => { acc[m.type || 'unknown'] = (acc[m.type || 'unknown'] || 0) + 1; return acc; }, {});
  const byConf = { high: mems.filter(m => m.confidence >= 0.8).length, mid: mems.filter(m => m.confidence >= 0.5 && m.confidence < 0.8).length, low: mems.filter(m => m.confidence < 0.5).length };
  res.json({ total, expired, archived, byType, byConfidence: byConf });
});

app.get('/health', (req, res) => res.json({ service: 'memory-lifecycle', status: 'healthy' }));
app.get('/ready', (req, res) => res.json({ ready: true }));

const server = app.listen(PORT, () => { console.log(`Memory Lifecycle OS running on port ${PORT}`); });
export default server;
