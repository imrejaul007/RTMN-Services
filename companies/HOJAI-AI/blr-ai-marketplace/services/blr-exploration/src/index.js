/**
 * BLR AI Marketplace — Exploration (port 4255)
 *
 * Curated exploration flows on top of /services/discovery-engine (4256).
 * Instead of letting users run free-text searches, this service offers
 * structured "explore" journeys that guide them through the ecosystem
 * (e.g. "I want to find an agent that can X" → guided query).
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
const axios = require('axios');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4255;
const SERVICE_NAME = 'sutar-exploration';

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

const DISCOVERY_URL = process.env.DISCOVERY_URL || 'http://localhost:4256';
const discoveryClient = axios.create({ baseURL: DISCOVERY_URL, timeout: 2000 });

// Pre-built exploration journeys
const JOURNEYS = [
  {
    id: 'find-agent-for-task',
    title: 'Find an agent that can do X',
    description: 'Search across all registered agents for one matching a capability.',
    steps: [
      { prompt: 'What do you want the agent to do?', inputKey: 'task' },
      { prompt: 'Any quality constraints?', inputKey: 'quality', optional: true },
      { action: 'search', resource: 'agents', filter: { capability: '$task' } },
      { action: 'rank', by: 'rating' },
    ],
  },
  {
    id: 'find-twin-for-entity',
    title: 'Find the twin that owns entity X',
    description: 'Locate the canonical twin for any entity (customer, order, asset, ...).',
    steps: [
      { prompt: 'Entity type?', inputKey: 'entityType' },
      { action: 'search', resource: 'twins', filter: { type: '$entityType' } },
    ],
  },
  {
    id: 'discover-services-by-capability',
    title: 'What services provide capability X?',
    description: 'Cross-service capability search.',
    steps: [
      { prompt: 'Capability?', inputKey: 'capability' },
      { action: 'search', resource: 'services', filter: { capability: '$capability' } },
    ],
  },
  {
    id: 'best-negotiator',
    title: 'Best negotiator for this intent',
    description: 'Find the highest-rated agent capable of handling a negotiation intent.',
    steps: [
      { prompt: 'Intent type?', inputKey: 'intentType' },
      { action: 'search', resource: 'agents', filter: { capability: 'negotiate' } },
      { action: 'rank', by: 'rating' },
      { action: 'take', n: 1 },
    ],
  },
];

const sessions = new PersistentMap('sessions', { serviceName: 'blr-exploration' });
const audit = [];

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok', service: SERVICE_NAME, sutarLayer: 7, port: PORT,
    counts: { journeys: JOURNEYS.length, sessions: sessions.size, audit: audit.length },
    capabilities: ['journeys-list', 'journeys-get', 'journeys-start', 'journeys-step', 'journeys-complete'],
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/journeys', (_req, res) => {
  res.json({ count: JOURNEYS.length, journeys: JOURNEYS });
});

app.get('/api/journeys/:id', (req, res) => {
  const j = JOURNEYS.find(x => x.id === req.params.id);
  if (!j) return res.status(404).json({ error: 'unknown journey' });
  res.json(j);
});

app.post('/api/journeys/:id/start',requireAuth,  (req, res) => {
  const j = JOURNEYS.find(x => x.id === req.params.id);
  if (!j) return res.status(404).json({ error: 'unknown journey' });
  const id = `ex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const session = { id, journeyId: j.id, startedAt: new Date().toISOString(), inputs: {}, stepIdx: 0, results: [] };
  sessions.set(id, session);
  audit.push({ kind: 'start', sessionId: id, journeyId: j.id, at: Date.now() });
  res.status(201).json({ session, firstPrompt: j.steps.find(s => s.prompt) });
});

async function runAction(step, inputs) {
  const params = {};
  for (const [k, v] of Object.entries(step.filter || {})) {
    params[k] = typeof v === 'string' && v.startsWith('$') ? inputs[v.slice(1)] : v;
  }
  try {
    const r = await discoveryClient.get(`/api/${step.resource}/search`, { params });
    let results = r.data.results || r.data.items || r.data.hits || [];
    if (step.rank && step.rank.by === 'rating') {
      results = [...results].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    if (step.take && step.take.n) results = results.slice(0, step.take.n);
    return { ok: true, results };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

app.post('/api/sessions/:id/step',requireAuth,  async (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'unknown session' });
  const { input } = req.body || {};
  const journey = JOURNEYS.find(j => j.id === session.journeyId);
  if (!journey) return res.status(500).json({ error: 'journey disappeared' });
  const step = journey.steps[session.stepIdx];
  if (!step) return res.status(400).json({ error: 'journey complete' });
  if (step.prompt) {
    session.inputs[step.inputKey] = input;
    session.stepIdx++;
    const next = journey.steps[session.stepIdx];
    if (next && next.action) {
      const result = await runAction(next, session.inputs);
      session.results.push({ step: next, result });
      session.stepIdx++;
      audit.push({ kind: 'step', sessionId: session.id, at: Date.now() });
      return res.json({ session, lastResult: result, journeyComplete: session.stepIdx >= journey.steps.length });
    }
    return res.json({ session, nextPrompt: journey.steps[session.stepIdx]?.prompt });
  }
  if (step.action) {
    const result = await runAction(step, session.inputs);
    session.results.push({ step, result });
    session.stepIdx++;
    audit.push({ kind: 'step', sessionId: session.id, at: Date.now() });
    return res.json({ session, lastResult: result, journeyComplete: session.stepIdx >= journey.steps.length });
  }
  res.status(400).json({ error: 'step type unknown' });
});

app.get('/api/sessions/:id', (req, res) => {
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'unknown session' });
  res.json(s);
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
