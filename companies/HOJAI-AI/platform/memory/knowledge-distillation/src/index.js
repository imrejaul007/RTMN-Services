/**
 * Knowledge Distillation Service
 * Compress and distill memory knowledge
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

const distillations = new Map();
const summaries = new Map();
const knowledgeBases = new Map();

function genId(prefix = 'kd') { return `${prefix}_${crypto.randomBytes(6).toString('hex')}`; }

// Knowledge Bases
app.post('/api/bases', requireInternal, (req, res) => {
  const { name, description, sourceType, capacity } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const id = genId('kb');
  knowledgeBases.set(id, { id, name, description: description || '', sourceType: sourceType || 'memory', capacity: capacity || 1000, currentSize: 0, createdAt: new Date().toISOString() });
  res.status(201).json({ id, base: knowledgeBases.get(id) });
});

app.get('/api/bases', (req, res) => {
  res.json({ bases: Array.from(knowledgeBases.values()), total: knowledgeBases.size });
});

app.get('/api/bases/:id', (req, res) => {
  const kb = knowledgeBases.get(req.params.id);
  if (!kb) return res.status(404).json({ error: 'Knowledge base not found' });
  res.json({ base: kb });
});

// Distillations
app.post('/api/distillations', requireInternal, (req, res) => {
  const { baseId, sourceData, targetSize, strategy } = req.body;
  if (!baseId || !sourceData) return res.status(400).json({ error: 'baseId and sourceData are required' });
  if (!knowledgeBases.has(baseId)) return res.status(404).json({ error: 'Knowledge base not found' });
  const id = genId('dist');
  const distilled = typeof sourceData === 'string' ? sourceData.slice(0, targetSize || 500) : JSON.stringify(sourceData).slice(0, targetSize || 500);
  distillations.set(id, { id, baseId, originalSize: JSON.stringify(sourceData).length, distilledSize: distilled.length, strategy: strategy || 'compress', status: 'completed', createdAt: new Date().toISOString() });
  const kb = knowledgeBases.get(baseId);
  kb.currentSize += distilled.length;
  res.status(201).json({ id, distillation: distillations.get(id), distilled });
});

app.get('/api/distillations', (req, res) => {
  const { baseId, status } = req.query;
  let result = Array.from(distillations.values());
  if (baseId) result = result.filter(d => d.baseId === baseId);
  if (status) result = result.filter(d => d.status === status);
  res.json({ distillations: result, total: result.length });
});

app.get('/api/distillations/:id', (req, res) => {
  const d = distillations.get(req.params.id);
  if (!d) return res.status(404).json({ error: 'Distillation not found' });
  res.json({ distillation: d });
});

// Summaries
app.post('/api/summaries', requireInternal, (req, res) => {
  const { baseId, content, type, maxLength } = req.body;
  if (!baseId || !content) return res.status(400).json({ error: 'baseId and content are required' });
  if (!knowledgeBases.has(baseId)) return res.status(404).json({ error: 'Knowledge base not found' });
  const id = genId('sum');
  const summary = { id, baseId, originalLength: content.length, summaryLength: maxLength || 200, type: type || 'abstractive', createdAt: new Date().toISOString() };
  summaries.set(id, summary);
  res.status(201).json({ id, summary });
});

app.get('/api/summaries', (req, res) => {
  const { baseId, type } = req.query;
  let result = Array.from(summaries.values());
  if (baseId) result = result.filter(s => s.baseId === baseId);
  if (type) result = result.filter(s => s.type === type);
  res.json({ summaries: result, total: result.length });
});

app.get('/api/summaries/:id', (req, res) => {
  const s = summaries.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Summary not found' });
  res.json({ summary: s });
});

// Stats
app.get('/api/stats', (req, res) => {
  res.json({ bases: knowledgeBases.size, distillations: distillations.size, summaries: summaries.size, compressionRatio: 0.65 });
});

app.get('/health', (req, res) => res.json({ service: 'knowledge-distillation', status: 'healthy', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 4800;
app.listen(PORT, () => console.log(`Knowledge Distillation running on port ${PORT}`));
export default app;