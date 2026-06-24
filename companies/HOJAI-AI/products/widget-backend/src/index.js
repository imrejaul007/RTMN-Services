/**
 * HOJAI Widget Backend
 *
 * Port: 5380
 * Purpose: Receive widget messages, classify intent, enrich with REZ
 * Intelligence, route to the right SUTAR agent, return natural language
 * response (with optional rich content: products, bookings, etc).
 *
 * Endpoints:
 *   POST /api/v1/widget/message       — main visitor message handler
 *   GET  /api/v1/widget/intents       — list supported intents + agents
 *   POST /api/v1/widget/identify      — bind a user identity (for memory)
 *   GET  /api/v1/widget/conversation/:visitorId — fetch conversation history
 *   GET  /health
 *   GET  /ready
 *   GET  /rez-intel-status
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const rezIntel = require('./rez-intel-client');
const intentEngine = require('./intent-engine');
const sutarRouter = require('./sutar-router');

const PORT = parseInt(process.env.WIDGET_BACKEND_PORT || '5380');
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || 'dev-key';
const REQUIRE_AUTH = process.env.WIDGET_REQUIRE_AUTH !== 'false';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));

// ─── Serve widget bundle + demo ──────────────────────────────────────────
// Find the @hojai/widget-core dist (CJS or ESM build)
function findWidgetBundle() {
  const candidates = [
    path.resolve(__dirname, '../../sdk/hojai-widget-core/dist/index.cjs'),
    path.resolve(__dirname, '../../../sdk/hojai-widget-core/dist/index.cjs'),
    path.resolve(__dirname, '../../../../sdk/hojai-widget-core/dist/index.cjs')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const WIDGET_BUNDLE = findWidgetBundle();

app.get('/widget.js', (_req, res) => {
  if (!WIDGET_BUNDLE) {
    return res.status(404).type('text/plain').send(
      '// Widget bundle not found. Build @hojai/widget-core first: cd companies/HOJAI-AI/sdk/hojai-widget-core && npm run build'
    );
  }
  res.type('application/javascript');
  fs.createReadStream(WIDGET_BUNDLE).pipe(res);
});

app.get('/snippet.js', (_req, res) => {
  const candidates = [
    path.resolve(__dirname, '../../sdk/hojai-widget-core/src/snippet.js'),
    path.resolve(__dirname, '../../../sdk/hojai-widget-core/src/snippet.js'),
    path.resolve(__dirname, '../../../../sdk/hojai-widget-core/src/snippet.js')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      res.type('application/javascript');
      return fs.createReadStream(p).pipe(res);
    }
  }
  res.status(404).type('text/plain').send('// snippet.js not found');
});

// Serve demo HTML for local testing
app.get('/', (_req, res) => {
  const demoPath = path.resolve(__dirname, '../demo/index.html');
  if (fs.existsSync(demoPath)) {
    return res.type('text/html').sendFile(demoPath);
  }
  res.status(404).type('text/plain').send('Demo not found');
});

// ─── Data stores ────────────────────────────────────────────────────────
// In-memory for MVP. Persist to MongoDB / MemoryOS later.
const conversations = new Map(); // visitorId -> { messages, user, createdAt, updatedAt }

function getConversation(visitorId) {
  if (!conversations.has(visitorId)) {
    conversations.set(visitorId, {
      visitorId,
      messages: [],
      user: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
  return conversations.get(visitorId);
}

// ─── Auth (lightweight — replace with CorpID bearer in production) ──────
function apiKeyAuth(req, res, next) {
  if (!REQUIRE_AUTH) return next();
  const auth = req.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing Authorization header' });
  }
  if (token !== HOJAI_API_KEY && !token.startsWith('pk_live_') && !token.startsWith('pk_test_')) {
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }
  req.widgetAuth = { token };
  next();
}

// ─── Routes ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'widget-backend',
    version: '1.0.0',
    uptime: process.uptime(),
    rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED,
    rezIntelUrl: rezIntel.REZ_INTEL_URL
  });
});

app.get('/ready', async (_req, res) => {
  const rezHealthy = await rezIntel.checkRezIntelHealth().catch(() => false);
  const agentHealth = await sutarRouter.checkAgentHealth().catch(() => ({}));
  res.json({
    ready: true,
    rezIntelHealthy: rezHealthy,
    agents: agentHealth,
    supportedIntents: Object.keys(intentEngine.INTENTS)
  });
});

app.get('/api/v1/widget/intents', (_req, res) => {
  res.json({
    success: true,
    data: {
      intents: Object.entries(intentEngine.INTENTS).map(([name, def]) => ({
        name,
        description: def.description,
        agent: def.agent,
        sutarAgent: sutarRouter.INTENT_AGENT_MAP[name] || null,
        examples: def.examples
      }))
    }
  });
});

// Show SUTAR agent wiring status — useful for debugging & the dashboard.
app.get('/api/v1/widget/agents', async (_req, res) => {
  const health = await sutarRouter.checkAgentHealth().catch(() => ({}));
  res.json({
    success: true,
    data: {
      endpoints: sutarRouter.AGENT_ENDPOINTS,
      intentMap: sutarRouter.INTENT_AGENT_MAP,
      health
    }
  });
});

app.get('/rez-intel-status', async (_req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth().catch(() => false);
  res.json({
    rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED,
    rezIntelUrl: rezIntel.REZ_INTEL_URL,
    rezIntelHealthy: isHealthy
  });
});

// Main handler — receives visitor messages from the widget.
app.post('/api/v1/widget/message', apiKeyAuth, async (req, res) => {
  const start = Date.now();
  try {
    const {
      companyId,
      visitorId,
      message,
      user,
      context = {},
      history = []
    } = req.body || {};

    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    if (!visitorId) return res.status(400).json({ success: false, error: 'visitorId is required' });
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'message is required (string)' });
    }

    // 1. Load / create conversation
    const conversation = getConversation(visitorId);
    if (user) conversation.user = { ...conversation.user, ...user };

    // 2. Classify intent (uses REZ Intel if available, else local fallback)
    const intentResult = await intentEngine.classify({
      message,
      companyId,
      visitorId,
      user: conversation.user,
      context,
      history: history.concat(conversation.messages.slice(-10))
    });

    // 3. Enrich with REZ Intelligence (graceful if unavailable)
    const enriched = await rezIntel.enrichAgentContext({
      agentRole: intentResult.agent,
      userId: visitorId,
      companyId,
      query: message,
      context: { ...context, intent: intentResult.intent }
    }).catch(() => null);

    // 4. Route to SUTAR agent
    const agentResult = await sutarRouter.route({
      agentRole: intentResult.agent,
      intent: intentResult.intent,
      companyId,
      visitorId,
      message,
      context: { ...context, enriched },
      user: conversation.user
    });

    // 5. Compose response
    const assistantMsg = {
      messageId: 'm_' + uuidv4().slice(0, 12),
      reply: agentResult.reply,
      rich: agentResult.rich || null,
      intent: intentResult.intent,
      agent: intentResult.agent,
      confidence: intentResult.confidence,
      enriched: !!enriched,
      routingSource: agentResult.source || 'unknown'
    };

    // 6. Persist both messages
    conversation.messages.push({
      id: 'm_' + uuidv4().slice(0, 12),
      role: 'user',
      content: message,
      timestamp: Date.now()
    });
    conversation.messages.push({
      id: assistantMsg.messageId,
      role: 'assistant',
      content: assistantMsg.reply,
      rich: assistantMsg.rich,
      intent: assistantMsg.intent,
      agent: assistantMsg.agent,
      timestamp: Date.now()
    });
    conversation.updatedAt = Date.now();

    // Cap conversation history to last 50 messages
    if (conversation.messages.length > 50) {
      conversation.messages = conversation.messages.slice(-50);
    }

    res.json({
      success: true,
      data: assistantMsg,
      meta: {
        latencyMs: Date.now() - start,
        intentSource: intentResult.source,
        enrichmentSource: enriched ? 'rez-intel' : 'unavailable',
        routingSource: agentResult.source || 'unknown'
      }
    });
  } catch (err) {
    console.error('[widget] message handler failed:', err);
    res.status(500).json({
      success: false,
      error: 'Internal error',
      message: err.message
    });
  }
});

app.post('/api/v1/widget/identify', apiKeyAuth, (req, res) => {
  const { visitorId, user } = req.body || {};
  if (!visitorId) return res.status(400).json({ success: false, error: 'visitorId is required' });
  if (!user || typeof user !== 'object') {
    return res.status(400).json({ success: false, error: 'user object is required' });
  }
  const conversation = getConversation(visitorId);
  conversation.user = { ...conversation.user, ...user };
  conversation.updatedAt = Date.now();
  res.json({ success: true, data: { visitorId, user: conversation.user } });
});

app.get('/api/v1/widget/conversation/:visitorId', apiKeyAuth, (req, res) => {
  const conv = conversations.get(req.params.visitorId);
  if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });
  res.json({
    success: true,
    data: {
      visitorId: conv.visitorId,
      user: conv.user,
      messages: conv.messages,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt
    }
  });
});

// ─── 404 ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Not found: ${req.method} ${req.path}` });
});

// ─── Error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[widget] unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ─── Boot ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[widget-backend] listening on :${PORT}`);
  console.log(`[widget-backend] rez-intel: ${rezIntel.REZ_INTEL_ENABLED ? rezIntel.REZ_INTEL_URL : 'disabled'}`);
  console.log(`[widget-backend] auth: ${REQUIRE_AUTH ? 'required' : 'disabled (dev mode)'}`);
  if (WIDGET_BUNDLE) {
    console.log(`[widget-backend] widget bundle: ${WIDGET_BUNDLE}`);
  } else {
    console.log(`[widget-backend] widget bundle: NOT FOUND (build @hojai/widget-core first)`);
  }
});

module.exports = { app, getConversation, conversations };
