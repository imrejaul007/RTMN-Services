/**
 * BLR AI Marketplace — Discovery Engine (port 4256)
 *
 * Universal search across the RTMN ecosystem. Single endpoint that fans
 * out to local indexes of services, agents, twins, and intents. Returns
 * ranked results with relevance + source attribution.
 *
 * Endpoints:
 *   POST /api/index                   Index a document (service / agent / twin / intent)
 *   POST /api/index/bulk              Bulk-index documents
 *   DELETE /api/index/:id             Remove from index
 *   POST /api/search                  Universal search across all kinds
 *   POST /api/search/services         Search only services
 *   POST /api/search/agents           Search only agents
 *   POST /api/search/twins            Search only twins
 *   POST /api/search/intents          Search only intents
 *   GET  /api/indexes                 List indexes + counts
 *   GET  /api/indexes/:kind           List entries in a kind (with paging)
 *   GET  /health
 */

const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuid } = require('uuid');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4256;
const SERVICE_NAME = 'sutar-discovery-engine';

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// ---------- Indexes (file-backed via PersistentMap) ----------
const indexes = {
  service: new PersistentMap('index-services', { serviceName: 'discovery-engine' }),
  agent: new PersistentMap('index-agents', { serviceName: 'discovery-engine' }),
  twin: new PersistentMap('index-twins', { serviceName: 'discovery-engine' }),
  intent: new PersistentMap('index-intents', { serviceName: 'discovery-engine' })
};

// ---------- Seed catalog ----------
function seed() {
  const services = [
    { name: 'HOJAI Intelligence', port: 4881, tags: ['ai', 'llm', 'router', 'inference'], description: 'Multi-model LLM router with 25 agents, 53 capabilities' },
    { name: 'Fine-Tuning Pipeline', port: 4776, tags: ['training', 'lora', 'qlora', 'ai'], description: 'LoRA/QLoRA/Prefix/IA3/Full fine-tune orchestrator' },
    { name: 'Synthetic Data Gen', port: 4777, tags: ['training', 'data', 'synthetic'], description: '5-domain bank dataset generator' },
    { name: 'GPU Cluster Manager', port: 4778, tags: ['gpu', 'scheduling', 'h100', 'a100'], description: 'GPU nodes, priority scheduling, label matching' },
    { name: 'SUTAR Intent Bus', port: 4154, tags: ['sutar', 'intent', 'pub-sub'], description: 'Pub/sub agent intent broadcast with claim/resolve' },
    { name: 'SUTAR Usage Tracker', port: 4252, tags: ['sutar', 'metering', 'billing'], description: 'Usage metering, plans, quotas, billing, revenue share' },
    { name: 'SUTAR Simulation OS', port: 4241, tags: ['sutar', 'simulation', 'what-if'], description: 'What-if scenario analysis with 4 templates' },
    { name: 'Agent Marketplace', port: 4845, tags: ['marketplace', 'agents', 'listings'], description: 'Discovery + listings + reviews for AI agents' },
    { name: 'Decision Engine', port: 4240, tags: ['decision', 'policy'], description: 'AI policy decisions with multi-criteria' },
    { name: 'Trust Engine', port: 4180, tags: ['trust', 'reputation'], description: 'Agent reputation scoring' },
    { name: 'Negotiation AI', port: 4850, tags: ['negotiation', 'multi-agent'], description: 'Advanced ML negotiation strategies' },
    { name: 'MemoryOS', port: 4703, tags: ['memory', 'knowledge'], description: 'Personal AI memory and knowledge graph' },
    { name: 'TwinOS Hub', port: 4705, tags: ['twins', 'digital-twin'], description: 'Central digital twin registry' }
  ];
  for (const s of services) {
    const id = uuid();
    indexes.service.set(id, { id, url: `http://localhost:${s.port}`, ...s, indexedAt: Date.now() });
  }

  const agents = [
    { name: 'fineTuning', description: 'LoRA/QLoRA fine-tune orchestration, dataset lifecycle', tags: ['ai', 'training'] },
    { name: 'syntheticData', description: 'Generate labeled training data from 5 domain banks', tags: ['ai', 'data'] },
    { name: 'gpuCluster', description: 'Allocate GPUs, monitor utilization', tags: ['ai', 'gpu'] },
    { name: 'sutarIntentBus', description: 'Pub/sub broadcast of agent intents', tags: ['sutar', 'messaging'] },
    { name: 'sutarUsageTracker', description: 'Meter usage, enforce quotas, generate invoices', tags: ['sutar', 'billing'] },
    { name: 'sutarSimulation', description: 'What-if scenario analysis', tags: ['sutar', 'simulation'] },
    { name: 'inference', description: 'Multi-model LLM routing', tags: ['ai', 'inference'] },
    { name: 'retrieval', description: 'Knowledge retrieval (vector + graph)', tags: ['ai', 'rag'] }
  ];
  for (const a of agents) {
    const id = uuid();
    indexes.agent.set(id, { id, ...a, indexedAt: Date.now() });
  }

  const twins = [
    { name: 'commerce.customer', description: 'Customer profile, LTV, segments', tags: ['commerce', 'customer'] },
    { name: 'commerce.order', description: 'Order lifecycle', tags: ['commerce', 'order'] },
    { name: 'commerce.wallet', description: 'Digital wallet', tags: ['commerce', 'wallet'] },
    { name: 'people.employee', description: 'Employee profile', tags: ['hr', 'employee'] },
    { name: 'hospitality.hotel', description: 'Hotel property', tags: ['hospitality', 'hotel'] },
    { name: 'healthcare.patient', description: 'Patient record', tags: ['healthcare', 'patient'] }
  ];
  for (const t of twins) {
    const id = uuid();
    indexes.twin.set(id, { id, ...t, indexedAt: Date.now() });
  }
}

function tokenize(s) {
  return (s || '').toLowerCase().match(/[a-z0-9_]+/g) || [];
}

function scoreDoc(doc, queryTokens) {
  const text = [doc.name, doc.description, ...(doc.tags || [])].join(' ').toLowerCase();
  const tokens = tokenize(text);
  let score = 0;
  for (const qt of queryTokens) {
    if ((doc.name || '').toLowerCase() === qt) score += 10;
    else if ((doc.name || '').toLowerCase().includes(qt)) score += 5;
    if ((doc.description || '').toLowerCase().includes(qt)) score += 2;
    if ((doc.tags || []).some(t => t.toLowerCase() === qt)) score += 3;
    if (tokens.includes(qt)) score += 1;
  }
  return score;
}

function searchKind(kind, queryTokens, limit) {
  const idx = indexes[kind];
  if (!idx) return [];
  return Array.from(idx.values())
    .map(d => ({ ...d, score: scoreDoc(d, queryTokens) }))
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ---------- Health ----------
app.get('/health', (_req, res) => {
  const counts = {};
  for (const [k, idx] of Object.entries(indexes)) counts[k] = idx.size;
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    sutarLayer: 7,
    layer: 'Discovery / Universal Search',
    port: PORT,
    counts,
    timestamp: new Date().toISOString()
  });
});

// ---------- Indexing ----------
app.post('/api/index',requireAuth,  (req, res) => {
  const { kind, doc } = req.body || {};
  if (!kind || !indexes[kind]) return res.status(400).json({ error: `kind must be one of ${Object.keys(indexes).join(', ')}` });
  if (!doc || !doc.name) return res.status(400).json({ error: 'doc with name required' });
  const id = doc.id || uuid();
  const entry = { id, ...doc, indexedAt: Date.now() };
  indexes[kind].set(id, entry);
  res.status(201).json({ kind, id, entry });
});

app.post('/api/index/bulk',requireAuth,  (req, res) => {
  const { kind, docs } = req.body || {};
  if (!kind || !indexes[kind]) return res.status(400).json({ error: `kind must be one of ${Object.keys(indexes).join(', ')}` });
  if (!Array.isArray(docs)) return res.status(400).json({ error: 'docs must be an array' });
  const ids = [];
  for (const doc of docs) {
    const id = doc.id || uuid();
    indexes[kind].set(id, { id, ...doc, indexedAt: Date.now() });
    ids.push(id);
  }
  res.status(201).json({ kind, count: ids.length, ids });
});

app.delete('/api/index/:id',requireAuth,  (req, res) => {
  for (const idx of Object.values(indexes)) {
    if (idx.has(req.params.id)) {
      idx.delete(req.params.id);
      return res.json({ deleted: true });
    }
  }
  res.status(404).json({ error: 'Document not found' });
});

// ---------- Search ----------
app.post('/api/search',requireAuth,  (req, res) => {
  const { query, limit = 10, kinds } = req.body || {};
  if (!query) return res.status(400).json({ error: 'query required' });
  const tokens = tokenize(query);
  const targetKinds = kinds && kinds.length ? kinds.filter(k => indexes[k]) : Object.keys(indexes);
  const all = [];
  for (const kind of targetKinds) {
    const results = searchKind(kind, tokens, limit);
    for (const r of results) all.push({ kind, ...r });
  }
  all.sort((a, b) => b.score - a.score);
  res.json({ query, tokens, count: all.length, results: all.slice(0, limit) });
});

for (const kind of ['services', 'agents', 'twins', 'intents']) {
  const singular = kind.replace(/s$/, '');
  app.post(`/api/search/${kind}`,requireAuth,  (req, res) => {
    const { query, limit = 10 } = req.body || {};
    if (!query) return res.status(400).json({ error: 'query required' });
    const tokens = tokenize(query);
    const results = searchKind(singular, tokens, limit);
    res.json({ kind, query, count: results.length, results });
  });
}

// ---------- Indexes ----------
app.get('/api/indexes', (_req, res) => {
  const counts = {};
  for (const [k, idx] of Object.entries(indexes)) counts[k] = idx.size;
  res.json({ counts, kinds: Object.keys(indexes) });
});

app.get('/api/indexes/:kind', (req, res) => {
  const idx = indexes[req.params.kind];
  if (!idx) return res.status(404).json({ error: 'Kind not found' });
  const limit = Number(req.query.limit) || 100;
  const offset = Number(req.query.offset) || 0;
  const rows = Array.from(idx.values()).slice(offset, offset + limit);
  res.json({ kind: req.params.kind, total: idx.size, count: rows.length, offset, results: rows });
});

// ---------- Root ----------
app.get('/', (_req, res) => {
  res.json({
    service: SERVICE_NAME,
    sutar: 'Layer 7 — Discovery / Universal Search',
    port: PORT,
    kinds: Object.keys(indexes),
    endpoints: [
      'POST /api/index',
      'POST /api/index/bulk',
      'DELETE /api/index/:id',
      'POST /api/search',
      'POST /api/search/{services|agents|twins|intents}',
      'GET  /api/indexes',
      'GET  /api/indexes/:kind',
      'GET  /health'
    ]
  });
});

// ---------- Boot ----------
seed();
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


const server = app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] listening on http://localhost:${PORT}`);
  for (const [k, idx] of Object.entries(indexes)) console.log(`  - ${k}: ${idx.size} entries`);
});

// Graceful shutdown — flush all indexes before exit
installGracefulShutdown(server, async () => {
  await Promise.allSettled([
    indexes.service.flush(),
    indexes.agent.flush(),
    indexes.twin.flush(),
    indexes.intent.flush(),
  ]);
  Object.values(indexes).forEach((m) => m.stopAutoFlush());
});