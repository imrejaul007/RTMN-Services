/**
 * RTMN Intent Engine v1.0
 *
 * Intent detection: classify user queries into intents via keyword/pattern matching.
 *
 * @port 4786
 */

const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const PORT = parseInt(process.env.PORT || '4786', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'intent-engine-internal-token';
const SERVICE_NAME = 'intent-engine';
const VERSION = '1.0.0';

const INTENT_ENGINE_REQUIRE_AUTH =
  (process.env.INTENT_ENGINE_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';
const INTENT_ENGINE_NO_LISTEN =
  (process.env.INTENT_ENGINE_NO_LISTEN ?? '').toLowerCase() === 'true' ||
  process.env.NODE_ENV === 'test';

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN)
    return res.status(401).json({ error: 'unauthorized' });
  next();
}

const authOrBypass = (req, res, next) =>
  INTENT_ENGINE_REQUIRE_AUTH ? requireInternal(req, res, next) : next();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => console.log(`[intent-engine] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started}ms)`));
  next();
});

const auditLog = [];
const INTENT_CATALOG = Object.freeze({
  search:    { name: 'search',    description: 'User wants to find information',                keywords: ['find', 'search', 'look up', 'where', 'what is'] },
  buy:       { name: 'buy',       description: 'User wants to purchase something',             keywords: ['buy', 'purchase', 'order', 'checkout', 'cart'] },
  cancel:    { name: 'cancel',    description: 'User wants to cancel a service or order',      keywords: ['cancel', 'stop', 'terminate', 'unsubscribe'] },
  support:   { name: 'support',   description: 'User needs help or has a problem',             keywords: ['help', 'issue', 'problem', 'support', 'broken', 'error'] },
  compare:   { name: 'compare',   description: 'User wants to compare options',                keywords: ['compare', 'vs', 'versus', 'difference', 'better'] },
  recommend: { name: 'recommend', description: 'User wants a recommendation',                  keywords: ['recommend', 'suggest', 'best', 'top', 'should i'] },
  track:     { name: 'track',     description: 'User wants to track an order or shipment',      keywords: ['track', 'where is', 'status', 'shipped', 'delivery'] },
  return:    { name: 'return',    description: 'User wants to return a product',               keywords: ['return', 'refund', 'exchange', 'send back'] },
  greet:     { name: 'greet',     description: 'User is greeting or making small talk',        keywords: ['hi', 'hello', 'hey', 'good morning', 'thanks'] },
});

function detectIntent(text) {
  const lower = text.toLowerCase();
  const matches = [];
  for (const [name, def] of Object.entries(INTENT_CATALOG)) {
    for (const kw of def.keywords) {
      const re = new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (re.test(lower)) {
        matches.push({ intent: name, matchedKeyword: kw });
        break;
      }
    }
  }
  if (matches.length === 0) {
    return { intent: 'unknown', confidence: 0.5, alternatives: Object.keys(INTENT_CATALOG) };
  }
  matches.sort((a, b) => b.intent.length - a.intent.length);
  return {
    intent: matches[0].intent,
    confidence: Math.min(0.99, 0.7 + matches.length * 0.05),
    alternatives: matches.slice(1).map(m => m.intent),
  };
}

function audit(action, actor, payload) {
  const e = { id: uuidv4(), service: SERVICE_NAME, action, actor: actor || 'system', payload: payload || {}, timestamp: new Date().toISOString() };
  auditLog.push(e);
  return e;
}

// POST /api/intent
app.post('/api/intent',requireAuth,  authOrBypass, (req, res) => {
  const { text, actor } = req.body || {};
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text (string) is required' });
  const result = detectIntent(text);
  audit('intent.detect', actor || 'system', { text: text.slice(0, 80), intent: result.intent });
  res.json({ text, ...result });
});

// POST /api/intent/batch
app.post('/api/intent/batch',requireAuth,  authOrBypass, (req, res) => {
  const { texts, actor } = req.body || {};
  if (!Array.isArray(texts) || texts.length === 0) return res.status(400).json({ error: 'texts (non-empty array) is required' });
  const results = texts.map(t => ({ text: t, ...detectIntent(t) }));
  audit('intent.batch', actor || 'system', { count: texts.length });
  res.json({ results, count: results.length });
});

// GET /api/intent/catalog
app.get('/api/intent/catalog', (req, res) => {
  res.json({ intents: Object.values(INTENT_CATALOG), count: Object.keys(INTENT_CATALOG).length });
});

// GET /api/intent/audit
app.get('/api/intent/audit', (req, res) => {
  const { action, limit } = req.query;
  let entries = auditLog;
  if (action) entries = entries.filter(e => e.action === action);
  const max = Math.min(parseInt(limit, 10) || 200, 5000);
  res.json({ entries: entries.slice(-max).reverse(), count: entries.length });
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT, intents: Object.keys(INTENT_CATALOG).length }));
app.get('/api/health', (req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT, audits: auditLog.length, uptime: process.uptime() }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

app.use((err, req, res, next) => { console.error('[intent-engine] error:', err); res.status(500).json({ error: 'Internal server error', message: err.message }); });

if (require.main === module && !INTENT_ENGINE_NO_LISTEN) {
  const server = app.listen(PORT, () => console.log(`intent-engine running on port ${PORT}`));
  process.on('SIGTERM', () => { console.log('[intent-engine] SIGTERM'); server.close(() => process.exit(0)); });
  process.on('SIGINT',  () => { console.log('[intent-engine] SIGINT');  server.close(() => process.exit(0)); });
}

module.exports = app;
module.exports.app = app;
module.exports.PORT = PORT;
module.exports.SERVICE_NAME = SERVICE_NAME;
module.exports.VERSION = VERSION;
module.exports.authOrBypass = authOrBypass;
module.exports.INTENT_ENGINE_REQUIRE_AUTH = INTENT_ENGINE_REQUIRE_AUTH;
module.exports.INTENT_ENGINE_NO_LISTEN = INTENT_ENGINE_NO_LISTEN;
module.exports.INTENT_CATALOG = INTENT_CATALOG;
module.exports.detectIntent = detectIntent;
