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
const { requireAuth } = require('@rtmn/shared/auth');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const rezIntel = require('./rez-intel-client');
const intentEngine = require('./intent-engine');
const sutarRouter = require('./sutar-router');
const whatsappChannel = require('./channels/whatsapp');

const PORT = parseInt(process.env.WIDGET_BACKEND_PORT || '5380');
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || 'dev-key';
const REQUIRE_AUTH = process.env.WIDGET_REQUIRE_AUTH !== 'false';

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


// ── CORS ─────────────────────────────────────────────────────────────────
// Explicit whitelist via ALLOWED_ORIGINS env var (comma-separated).
// Defaults to empty (no cross-origin requests allowed) unless NODE_ENV=test.
const rawOrigins = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = rawOrigins
  ? rawOrigins.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

const corsOptions = {
  origin: allowedOrigins.length > 0
    ? allowedOrigins
    : process.env.NODE_ENV === 'test' ? '*' : false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Internal-Token'],
  exposedHeaders: ['X-Request-Id'],
  credentials: true
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));

// ── Rate Limiter (BUG-06: 100 req/min per companyId) ──────────────────────
// Key: extract companyId from JSON body (POST) or query string (GET).
// Falls back to IP when companyId is not yet available (e.g., unauthenticated).
const widgetRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  // BUG-06: per-companyId rate limiting instead of per-IP
  keyGenerator: (req) => {
    // POST /api/v1/widget/message — companyId is in the JSON body
    if (req.method === 'POST' && req.body && req.body.companyId) {
      return `company:${req.body.companyId}`;
    }
    // GET endpoints — fall back to API key if present, else IP
    const auth = req.get('Authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (token) return `key:${token}`;
    return req.ip;
  },
  handler: (req, res) => {
    const companyId = req.body && req.body.companyId;
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: `Rate limit exceeded. Max 100 requests/minute per companyId.${companyId ? ` (companyId: ${companyId})` : ''}`
    });
  },
  skip: (req) => {
    // Skip health/ready/status endpoints — they are cheap and should not count against limits.
    const skipPaths = ['/health', '/ready', '/rez-intel-status'];
    return skipPaths.includes(req.path);
  }
});

app.use('/api/v1/widget', widgetRateLimiter);

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
// JSON file persistence to /tmp/ — survives restarts within the same container/pod.
// Persist to MongoDB / MemoryOS later for cross-instance sharing.
const DATA_DIR = '/tmp/widget-conversations';

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function conversationFilePath(visitorId) {
  // Sanitize visitorId to be a safe filename (UUIDs are safe; arbitrary strings get stripped)
  const safe = visitorId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, `conv_${safe}.json`);
}

function loadConversation(visitorId) {
  const filePath = conversationFilePath(visitorId);
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`[widget] failed to load conversation ${visitorId}:`, err.message);
    }
  }
  return null;
}

function saveConversation(visitorId, data) {
  const filePath = conversationFilePath(visitorId);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`[widget] failed to save conversation ${visitorId}:`, err.message);
  }
}

// In-memory cache backed by JSON files on disk.
// A Proxy wrapper auto-saves to disk on every property write.
const conversations = new Map(); // visitorId -> proxied conversation object

// Ensure data directory exists at startup
ensureDataDir();

function getConversation(visitorId) {
  if (!conversations.has(visitorId)) {
    // Try loading from disk first
    const persisted = loadConversation(visitorId);
    const base = persisted || {
      visitorId,
      messages: [],
      user: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Wrap in a Proxy so ANY property mutation triggers a save
    const proxied = new Proxy(base, {
      set(target, prop, value) {
        target[prop] = value;
        saveConversation(visitorId, target);
        return true;
      },
      deleteProperty(target, prop) {
        delete target[prop];
        saveConversation(visitorId, target);
        return true;
      }
    });

    conversations.set(visitorId, proxied);
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
  if (token !== HOJAI_API_KEY) {
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
app.post('/api/v1/widget/message',requireAuth,  apiKeyAuth, async (req, res) => {
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

app.post('/api/v1/widget/identify',requireAuth,  apiKeyAuth, (req, res) => {
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

// ─── WhatsApp channel ──────────────────────────────────────────────────
// Routes widget visitor messages to a WhatsApp number via the HOJAI WhatsApp OS.
// See ./channels/whatsapp for full API.
app.use('/api/v1/widget/channels/whatsapp', whatsappChannel.router);

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
