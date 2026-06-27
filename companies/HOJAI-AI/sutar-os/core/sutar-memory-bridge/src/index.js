/**
 * SUTAR OS — Memory Bridge (port 4143)
 *
 * Routes memory access through SUTAR intents. Instead of having agents
 * directly call /services/memory-os (4703), they publish a "remember" or
 * "recall" intent to SUTAR, and this bridge persists those as memory records
 * tagged with intent metadata.
 *
 * Layer: 2 (Twin + Memory + Identity + Agent ID)
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { setupSecurity, strictLimiter } = require('@rtmn/shared/security');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuid } = require('uuid');
const axios = require('axios');
const rezIntel = require('./rez-intel-client');

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

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4143;
const SERVICE_NAME = 'sutar-memory-bridge';
setupSecurity(app, { serviceName: 'sutar-memory-bridge' });
const MEMORYOS_URL = process.env.MEMORYOS_URL || 'http://localhost:4703';
const memoryOsClient = axios.create({ baseURL: MEMORYOS_URL, timeout: 2000 });

// Local store of intent-tagged memory records (in addition to memoryOS)
const intentMemories = new PersistentMap('intent-memories', { serviceName: 'sutar-memory-bridge' });
const audit = [];

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok', service: SERVICE_NAME, sutarLayer: 2, port: PORT,
    counts: { memories: intentMemories.size, audit: audit.length },
    capabilities: ['remember', 'recall', 'recall-by-intent', 'intent-types'],
    timestamp: new Date().toISOString(),
  });
});

const INTENT_KINDS = ['remember', 'recall', 'forget', 'reflect'];

// ---------- Remember (write) ----------

app.post('/api/memory/remember',requireAuth,  (req, res) => {
  const { twinId, intentType, content, tags = [], importance = 'normal' } = req.body || {};
  if (!twinId || !intentType || !content) return res.status(400).json({ error: 'twinId, intentType, content required' });
  const id = uuid();
  const record = {
    id, twinId, intentType, content, tags, importance,
    createdAt: new Date().toISOString(),
  };
  intentMemories.set(id, record);
  audit.push({ kind: 'remember', twinId, intentType, id, at: Date.now() });
  res.status(201).json(record);
});

// ---------- Recall (read) ----------

app.post('/api/memory/recall',requireAuth,  (req, res) => {
  const { twinId, query, intentType, limit = 20 } = req.body || {};
  if (!twinId) return res.status(400).json({ error: 'twinId required' });

  let results = Array.from(intentMemories.values()).filter(r => r.twinId === twinId);
  if (intentType) results = results.filter(r => r.intentType === intentType);
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(r =>
      r.content.toLowerCase().includes(q) ||
      (r.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }
  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  results = results.slice(0, limit);

  audit.push({ kind: 'recall', twinId, query, intentType, count: results.length, at: Date.now() });
  res.json({ count: results.length, records: results });
});

// ---------- Recall by intent type (analytics) ----------

app.get('/api/memory/recall-by-intent/:intentType', (req, res) => {
  const results = Array.from(intentMemories.values()).filter(r => r.intentType === req.params.intentType);
  res.json({ intentType: req.params.intentType, count: results.length, records: results });
});

// ---------- Forget ----------

app.delete('/api/memory/:id',requireAuth,  (req, res) => {
  const r = intentMemories.get(req.params.id);
  if (!r) return res.status(404).json({ error: 'not found' });
  intentMemories.delete(req.params.id);
  audit.push({ kind: 'forget', twinId: r.twinId, id: req.params.id, at: Date.now() });
  res.json({ deleted: true, id: req.params.id });
});

// ---------- Intent types ----------

app.get('/api/memory/intent-types', (_req, res) => {
  res.json({ kinds: INTENT_KINDS });
});

// ---------- Bridge to underlying MemoryOS ----------

app.get('/api/memoryos/proxy/:twinId', async (req, res) => {
  try {
    const r = await memoryOsClient.get(`/api/memories/${encodeURIComponent(req.params.twinId)}`);
    res.json({ source: 'memory-os', ...r.data });
  } catch (err) {
    res.status(err.response?.status || 502).json({ error: err.message, targetUrl: MEMORYOS_URL });
  }
});

app.get('/api/audit', (_req, res) => {
  res.json({ count: audit.length, audit: audit.slice(-100) });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// REZ Intelligence endpoints
app.get('/rez-intel-status', async (req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({ rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED, rezIntelUrl: rezIntel.REZ_INTEL_URL, rezIntelHealthy: isHealthy });
});

app.post('/api/enrich', requireInternal, async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body || {};
  const enriched = await rezIntel.enrichAgentContext({ agentRole, userId, companyId, query, context }).catch(() => null);
  res.json({ enriched, source: enriched ? 'rez-intel' : 'unavailable' });
});

// Additional REZ Intelligence endpoints (shallow pattern)
app.post('/api/intel/classify-intent', requireAuth, async (req, res) => {
  try {
    const intent = await rezIntel.classifyIntent({ ...req.body }).catch(() => null);
    res.json({ success: !!intent, intent, source: intent ? 'rez-intel' : 'unavailable', fallback: !intent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/intel/next-best-action', requireAuth, async (req, res) => {
  try {
    const action = await rezIntel.getNextBestAction({ ...req.query }).catch(() => null);
    res.json({ success: !!action, action, source: action ? 'rez-intel' : 'unavailable', fallback: !action });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`${SERVICE_NAME} listening on :${PORT}`);
});
installGracefulShutdown(server);
