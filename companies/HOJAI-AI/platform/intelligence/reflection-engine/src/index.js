/**
 * RTMN Reflection Engine v1.0
 * Self-reflection / quality scoring across dimensions.
 * @port 4787
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4787;
const SERVICE_NAME = 'reflection-engine';

const REFLECTION_ENGINE_REQUIRE_AUTH =
  (process.env.REFLECTION_ENGINE_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';
const REFLECTION_ENGINE_NO_LISTEN =
  (process.env.REFLECTION_ENGINE_NO_LISTEN ?? '').toLowerCase() === 'true' ||
  process.env.NODE_ENV === 'test';
const authOrBypass = (req, res, next) =>
  REFLECTION_ENGINE_REQUIRE_AUTH ? requireAuth(req, res, next) : next();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  const s = Date.now();
  res.on('finish', () => console.log(`[reflection-engine] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now()-s}ms)`));
  next();
});

const auditLog = [];
const reflections = new PersistentMap('reflections', { serviceName: SERVICE_NAME });

const DIMENSIONS = Object.freeze({
  clarity:     { name: 'clarity',     description: 'How clear and understandable is the text',         weight: 1.0, indicators: ['clear', 'simple', 'concise', 'brief', 'obvious'] },
  accuracy:    { name: 'accuracy',    description: 'How accurate / factually correct is the content',   weight: 1.2, indicators: ['verified', 'confirmed', 'accurate', 'correct', 'source'] },
  completeness:{ name: 'completeness',description: 'How thorough and complete is the response',        weight: 1.0, indicators: ['complete', 'thorough', 'comprehensive', 'all', 'including'] },
  tone:        { name: 'tone',        description: 'How appropriate is the tone for the context',       weight: 0.8, indicators: ['polite', 'professional', 'friendly', 'helpful', 'respectful'] },
  relevance:   { name: 'relevance',   description: 'How relevant to the question / context',            weight: 1.1, indicators: ['relevant', 'related', 'applies', 'pertinent', 'on-topic'] },
});

function scoreText(text, dimensions) {
  const lower = text.toLowerCase();
  const dims = dimensions || Object.keys(DIMENSIONS);
  const scores = {};
  let total = 0, totalWeight = 0;
  for (const d of dims) {
    if (!DIMENSIONS[d]) continue;
    const def = DIMENSIONS[d];
    let hits = 0;
    for (const ind of def.indicators) {
      if (lower.includes(ind)) hits++;
    }
    // Length-based signal + keyword hits
    const lengthScore = Math.min(1, text.length / 200);
    const kwScore = hits / def.indicators.length;
    const score = Math.min(1, lengthScore * 0.4 + kwScore * 0.6);
    scores[d] = Number(score.toFixed(3));
    total += score * def.weight;
    totalWeight += def.weight;
  }
  return {
    scores,
    overall: totalWeight > 0 ? Number((total / totalWeight).toFixed(3)) : 0,
  };
}

function feedbackFor(scores) {
  const fb = [];
  for (const [dim, score] of Object.entries(scores)) {
    if (score < 0.4) fb.push(`${dim}: low score (${score}) — consider adding more ${DIMENSIONS[dim]?.indicators.slice(0,2).join(', ')}`);
    else if (score > 0.8) fb.push(`${dim}: strong (${score})`);
  }
  return fb;
}

function audit(action, actor, payload) {
  const e = { id: uuidv4(), service: SERVICE_NAME, action, actor: actor || 'system', payload: payload || {}, timestamp: new Date().toISOString() };
  auditLog.push(e);
  return e;
}

// POST /api/reflect
app.post('/api/reflect', authOrBypass, (req, res) => {
  const { text, dimensions, actor } = req.body || {};
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text (string) is required' });
  const { scores, overall } = scoreText(text, dimensions);
  const ref = {
    id: uuidv4(),
    text: text.slice(0, 500),
    scores,
    overall,
    feedback: feedbackFor(scores),
    createdAt: new Date().toISOString(),
  };
  reflections.set(ref.id, ref);
  audit('reflect.score', actor || req.body?.actor || 'system', { id: ref.id, overall });
  res.status(201).json(ref);
});

// POST /api/reflect/compare
app.post('/api/reflect/compare', authOrBypass, (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items (non-empty array) is required' });
  const ranked = items.map((it, i) => {
    const { scores, overall } = scoreText(it.text || '', it.dimensions);
    return { index: i, id: it.id || null, text: (it.text || '').slice(0, 200), scores, overall };
  }).sort((a, b) => b.overall - a.overall);
  audit('reflect.compare', req.body?.actor || 'system', { count: items.length });
  res.json({ ranked, winner: ranked[0]?.index, count: ranked.length });
});

// GET /api/reflect/dimensions
app.get('/api/reflect/dimensions', (req, res) => {
  res.json({ dimensions: Object.values(DIMENSIONS), count: Object.keys(DIMENSIONS).length });
});

// GET /api/reflect (list)
app.get('/api/reflect', (req, res) => {
  const { limit } = req.query;
  const list = Array.from(reflections.values());
  const max = Math.min(parseInt(limit, 10) || 100, 1000);
  res.json({ reflections: list.slice(-max).reverse(), count: list.length });
});

// GET /api/reflect/audit
app.get('/api/reflect/audit', (req, res) => {
  const { action, limit } = req.query;
  let entries = auditLog;
  if (action) entries = entries.filter(e => e.action === action);
  const max = Math.min(parseInt(limit, 10) || 200, 5000);
  res.json({ entries: entries.slice(-max).reverse(), count: entries.length });
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT, dimensions: Object.keys(DIMENSIONS).length }));
app.get('/api/health', (req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT, reflections: reflections.size, audits: auditLog.length, uptime: process.uptime() }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

app.use((err, req, res, next) => { console.error('[reflection-engine] error:', err); res.status(500).json({ error: 'Internal server error', message: err.message }); });

let server = null;
if (require.main === module && !REFLECTION_ENGINE_NO_LISTEN) {
  server = app.listen(PORT, () => console.log(`reflection-engine running on port ${PORT}`));
  installGracefulShutdown(server);
}

module.exports = app;
module.exports.app = app;
module.exports.authOrBypass = authOrBypass;
module.exports.REFLECTION_ENGINE_REQUIRE_AUTH = REFLECTION_ENGINE_REQUIRE_AUTH;
module.exports.REFLECTION_ENGINE_NO_LISTEN = REFLECTION_ENGINE_NO_LISTEN;
module.exports.SERVICE_NAME = SERVICE_NAME;
module.exports.DIMENSIONS = DIMENSIONS;
module.exports.scoreText = scoreText;