/**
 * BLR AI Marketplace — Reputation Aggregator (port 4258)
 *
 * Aggregate reputation signals from multiple sources into a single
 * canonical score per entity (agent, twin, contract, organization).
 * Sources include: agent-reputation (4820), contract history,
 * memory attestations, network-routing reliability.
 *
 * Layer: 7 (Exploration + Discovery + Evaluator + Reputation + ROI)
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuid } = require('uuid');
const axios = require('axios');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4258;
const SERVICE_NAME = 'sutar-reputation-aggregator';

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const REPUTATION_URL = process.env.REPUTATION_URL || 'http://localhost:4820';
const reputationClient = axios.create({ baseURL: REPUTATION_URL, timeout: 1500 });

// entityId -> { scores: {source: score}, aggregate, lastUpdated }
const entities = new PersistentMap('entities', { serviceName: 'blr-reputation-aggregator' });
const audit = [];

const SOURCES = ['agent-reputation', 'contracts', 'network-routing', 'memory-attestations', 'manual'];

function aggregate(scores) {
  const values = Object.values(scores).filter(v => typeof v === 'number');
  if (values.length === 0) return 0;
  const sum = values.reduce((s, x) => s + x, 0);
  return +(sum / values.length).toFixed(2);
}

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok', service: SERVICE_NAME, sutarLayer: 7, port: PORT,
    counts: { entities: entities.size, audit: audit.length },
    sources: SOURCES,
    capabilities: ['entities-register', 'entities-list', 'entities-get', 'entities-add-score', 'entities-rank', 'entities-sync'],
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/entities',requireAuth,  (req, res) => {
  const { entityId, type = 'agent', sources = {} } = req.body || {};
  if (!entityId) return res.status(400).json({ error: 'entityId required' });
  const e = { entityId, type, scores: sources, aggregate: aggregate(sources), lastUpdated: new Date().toISOString() };
  entities.set(entityId, e);
  audit.push({ kind: 'register', entityId, at: Date.now() });
  res.status(201).json(e);
});

app.get('/api/entities', (req, res) => {
  let list = Array.from(entities.values());
  if (req.query.type) list = list.filter(e => e.type === req.query.type);
  list.sort((a, b) => b.aggregate - a.aggregate);
  res.json({ count: list.length, entities: list });
});

app.get('/api/entities/:id', (req, res) => {
  const e = entities.get(req.params.id);
  if (!e) return res.status(404).json({ error: 'unknown entity' });
  res.json(e);
});

app.post('/api/entities/:id/scores',requireAuth,  (req, res) => {
  const { source, score } = req.body || {};
  if (!SOURCES.includes(source)) return res.status(400).json({ error: `source must be one of: ${SOURCES.join(',')}` });
  const n = parseFloat(score);
  if (isNaN(n) || n < 0 || n > 100) return res.status(400).json({ error: 'score must be 0-100' });
  const e = entities.get(req.params.id);
  if (!e) return res.status(404).json({ error: 'unknown entity' });
  e.scores[source] = n;
  e.aggregate = aggregate(e.scores);
  e.lastUpdated = new Date().toISOString();
  audit.push({ kind: 'add-score', entityId: req.params.id, source, score: n, at: Date.now() });
  res.json(e);
});

// Top-N ranking across all entities (optionally by type)
app.get('/api/leaderboard', (req, res) => {
  const { type, n = 10 } = req.query;
  let list = Array.from(entities.values());
  if (type) list = list.filter(e => e.type === type);
  list.sort((a, b) => b.aggregate - a.aggregate);
  res.json({
    count: list.length,
    top: list.slice(0, parseInt(n)),
  });
});

// Sync from agent-reputation (4820) — best-effort
app.post('/api/entities/:id/sync',requireAuth,  async (req, res) => {
  const e = entities.get(req.params.id);
  if (!e) return res.status(404).json({ error: 'unknown entity' });
  try {
    const r = await reputationClient.get(`/api/agents/${encodeURIComponent(req.params.id)}/reputation`);
    const score = r.data?.score ?? r.data?.reputation ?? 75;
    e.scores['agent-reputation'] = score;
    e.aggregate = aggregate(e.scores);
    e.lastUpdated = new Date().toISOString();
    res.json(e);
  } catch (err) {
    res.status(502).json({ error: err.message, targetUrl: REPUTATION_URL });
  }
});

app.get('/api/audit', (_req, res) => {
  res.json({ count: audit.length, audit: audit.slice(-100) });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`${SERVICE_NAME} listening on :${PORT}`);
});
installGracefulShutdown(server);
