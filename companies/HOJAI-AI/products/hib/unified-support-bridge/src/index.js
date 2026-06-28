/**
 * RTMN Unified Support Bridge — PRODUCTION VERSION
 * =============================================================
 * Port: 4885
 *
 * All the features of v1.0 PLUS:
 * - Redis/MongoDB storage (production-ready persistence)
 * - Real CorpID integration with retry + caching
 * - Email inbound (SMTP receiver + webhook)
 * - WhatsApp webhook verification (Meta/Twilio/360dialog)
 * - Real-time SSE + WebSocket events
 *
 * Run:
 *   npm start                # in-memory (dev)
 *   USE_REDIS=true npm start # Redis-backed
 *   USE_MONGODB=true npm start # MongoDB-backed
 *   USE_REDIS=true USE_MONGODB=true npm start # full production
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// ─── Modules ────────────────────────────────────────────────
const { createStorage } = require('./storage');
const { normalizeEmail: normalizeEmailFormat, createSmtpReceiver, createImapPoller } = require('./emailHandler');
const {
  createWhatsAppWebhookMiddleware,
  parseWhatsAppPayload,
  normalizePhone: normalizeWpPhone,
  registerMetaWebhook,
  register360dialogWebhook,
  registerTwilioWebhook,
} = require('./whatsappWebhook');
const {
  attachEventRoutes,
  emitMessageReceived,
  emitConversationCreated,
  emitConversationUpdated,
  emitConversationMerged,
  emitTicketCreated,
  emitCustomerLinked,
  emitEscalation,
  EVENTS,
} = require('./events');

// ─── App Setup ───────────────────────────────────────────────
const app = express();
const PORT = parseInt(process.env.PORT || '4885', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'dev-token';

// ─── Webhook API Keys ─────────────────────────────────────────
// Allowlist of API keys for webhook endpoints (Email, App).
// WhatsApp uses HMAC signature verification instead.
// Generate keys with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
const WEBHOOK_API_KEYS = new Set(
  (process.env.WEBHOOK_API_KEYS || '').split(',').filter(Boolean)
);

// ─── Rate Limiting (simple in-memory) ──────────────────────
// For production, use Redis-backed rate limiting.
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10);

function rateLimit(req, res, next) {
  const key = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { count: 0, windowStart: now };

  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }

  entry.count++;
  rateLimitMap.set(key, entry);

  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      error: 'rate_limit_exceeded',
      retryAfter: Math.ceil((entry.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000),
    });
  }
  next();
}

// ─── Webhook API Key Auth ──────────────────────────────────────
function webhookApiKeyAuth(req, res, next) {
  // Skip if no API keys configured (open in dev)
  if (WEBHOOK_API_KEYS.size === 0) return next();

  const key = req.headers['x-api-key'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  if (!key || !WEBHOOK_API_KEYS.has(key)) {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid or missing API key' });
  }
  next();
}

// ─── HMAC Signature for Email/Webhook ─────────────────────────
function verifyWebhookSignature(req, secret) {
  const signature = req.headers['x-signature'] || req.headers['x-webhook-signature'];
  if (!signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(req.rawBody || '').digest('hex');
  const sig = signature.replace(/^sha256=/, '');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

// ─── External Services ────────────────────────────────────────
const UNIFIED_INBOX_URL = process.env.UNIFIED_INBOX_URL || 'http://localhost:4870';
const TICKET_ENGINE_URL = process.env.TICKET_ENGINE_URL || 'http://localhost:4872';
const CORPID_URL = process.env.CORPID_URL || 'http://localhost:4702';

// ─── Middleware ─────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('combined'));

// Capture raw body BEFORE any parsing — needed for WhatsApp webhook signature verification.
// The webhook provider sends HMAC-signed raw bytes; we need them before JSON parsing.
app.use((req, res, next) => {
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    req.rawBody = Buffer.concat(chunks).toString('utf8');
    // Re-parse based on content type
    const ct = req.headers['content-type'] || '';
    if (ct.includes('application/json') && req.rawBody) {
      try { req.body = JSON.parse(req.rawBody); } catch { req.body = {}; }
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(req.rawBody);
      req.body = Object.fromEntries(params);
    }
    next();
  });
});

// ─── Storage (Redis/MongoDB/in-memory) ──────────────────────
const storage = createStorage();

// ─── CorpID Client (with retry + caching) ────────────────────
const coroidCache = new Map(); // email → { customerId, fetchedAt }
const CORPID_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function resolveCorpIdCustomer(email) {
  const nEmail = (email || '').toLowerCase().trim();
  if (!nEmail) return null;

  // Check cache first
  const cached = coroidCache.get(nEmail);
  if (cached && Date.now() - cached.fetchedAt < CORPID_CACHE_TTL) {
    return cached.customerId;
  }

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const res = await fetch(`${CORPID_URL}/api/identity/lookup?email=${encodeURIComponent(nEmail)}`, {
        signal: controller.signal,
        headers: { 'x-internal-token': INTERNAL_TOKEN },
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.customerId) {
          coroidCache.set(nEmail, { customerId: data.customerId, fetchedAt: Date.now() });
          return data.customerId;
        }
      }

      return null; // Not found, don't retry
    } catch (e) {
      lastError = e;
      if (e.name === 'AbortError') {
        console.warn(`[corpid] timeout on attempt ${attempt} for ${nEmail}`);
      } else {
        console.warn(`[corpid] error on attempt ${attempt}: ${e.message}`);
      }
      if (attempt < maxRetries) {
        await sleep(500 * attempt); // Exponential backoff
      }
    }
  }

  console.error(`[corpid] all ${maxRetries} attempts failed for ${nEmail}:`, lastError?.message);
  return null;
}

// ─── Phone/Email Normalization ──────────────────────────────
function normalizePhone(phone) {
  if (!phone) return null;
  const cleaned = String(phone).replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.length === 10) return `+91${cleaned}`;
  if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned}`;
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length > 10) return `+${cleaned}`;
  return null;
}

function normalizeEmailFormat2(email) {
  if (!email) return null;
  return email.toLowerCase().trim().replace(/\s+/g, '');
}

// ─── Customer Identity Resolution ────────────────────────────
async function resolveCustomerId({ phone, email, appUserId, name, metadata = {} } = {}) {
  const nPhone = normalizePhone(phone);
  const nEmail = normalizeEmailFormat2(email);

  // Fast path: direct channel lookups
  if (nPhone) {
    const existing = await storage.findCustomerByChannel('phone', nPhone);
    if (existing) return existing;
  }
  if (nEmail) {
    const existing = await storage.findCustomerByChannel('email', nEmail);
    if (existing) return existing;
  }
  if (appUserId) {
    const existing = await storage.findCustomerByChannel('app', appUserId);
    if (existing) return existing;
  }

  // Cross-channel: appUserId given but customer already exists via phone/email
  if (appUserId && (nPhone || nEmail)) {
    let foundId = null;
    if (nPhone) foundId = await storage.findCustomerByChannel('phone', nPhone);
    if (!foundId && nEmail) foundId = await storage.findCustomerByChannel('email', nEmail);
    if (foundId) {
      // Link appUserId to existing customer
      await storage.registerChannelLink(foundId, 'app', appUserId);
      if (nPhone) await storage.registerChannelLink(foundId, 'phone', nPhone);
      if (nEmail) await storage.registerChannelLink(foundId, 'email', nEmail);
      return foundId;
    }
  }

  // CorpID lookup
  if (nEmail) {
    const corpId = await resolveCorpIdCustomer(nEmail);
    if (corpId) {
      await storage.registerChannelLink(corpId, 'email', nEmail);
      if (nPhone) await storage.registerChannelLink(corpId, 'phone', nPhone);
      if (appUserId) await storage.registerChannelLink(corpId, 'app', appUserId);
      await storage.upsertCustomer({
        customerId: corpId,
        phone: nPhone,
        email: nEmail,
        appUserId,
        name: name || null,
        channels: ['email', ...(nPhone ? ['phone'] : []), ...(appUserId ? ['app'] : [])],
        metadata,
        linkedFromCorpId: true,
      });
      emitCustomerLinked({ customerId: corpId, phone: nPhone, email: nEmail, appUserId, source: 'corpid' });
      return corpId;
    }
  }

  // Create new customer
  const customerId = `cust-${uuidv4().slice(0, 12)}`;
  await storage.upsertCustomer({
    customerId,
    phone: nPhone,
    email: nEmail,
    appUserId,
    name: name || null,
    channels: [],
    metadata,
  });
  if (nPhone) await storage.registerChannelLink(customerId, 'phone', nPhone);
  if (nEmail) await storage.registerChannelLink(customerId, 'email', nEmail);
  if (appUserId) await storage.registerChannelLink(customerId, 'app', appUserId);

  return customerId;
}

// ─── Conversation Management ────────────────────────────────
async function getOrCreateConversation({ customerId, channel, subject, priority = 'medium', tags = [], externalRef = null }) {
  const customer = await storage.getCustomer(customerId);

  // Check for existing open conversation for this customer + channel
  const session = await storage.getSession(customerId, channel);
  if (session?.lastConversationId) {
    return { conversationId: session.lastConversationId, isNew: false, customerId, channel, customer };
  }

  // Create new conversation
  const conversationId = `conv-${uuidv4().slice(0, 12)}`;

  await storage.createConversation({
    id: conversationId,
    customerId,
    channel,
    subject: subject || `Support — ${channel}`,
    priority,
    status: 'open',
    tags: [...tags, `source:${channel}`],
    externalRef,
  });

  await storage.setSession(customerId, channel, {
    lastConversationId: conversationId,
    lastMessageAt: new Date().toISOString(),
    externalRef,
  });

  emitConversationCreated({
    conversationId,
    customerId,
    channel,
    subject,
    priority,
  });

  return { conversationId, isNew: true, customerId, channel, customer };
}

// ─── Message Handling ───────────────────────────────────
async function addMessage({ conversationId, content, sender, channel, direction = 'inbound', metadata = {} }) {
  const msg = await storage.createMessage({
    conversationId,
    content,
    sender,
    channel,
    direction,
    ...metadata,
  });

  emitMessageReceived({
    messageId: msg.id,
    conversationId,
    channel,
    direction,
    sender,
  });

  // Also forward to unified-inbox
  try {
    await fetch(`${UNIFIED_INBOX_URL}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-token': INTERNAL_TOKEN },
      body: JSON.stringify({ content, sender, type: 'message' }),
    });
  } catch (e) {
    // Best effort
  }

  return msg;
}

// ─── WhatsApp Webhook Middleware ─────────────────────────
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'usb-verify-token-change-me';
const whatsappWebhook = createWhatsAppWebhookMiddleware({
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'usb-verify-token-change-me',
  appSecret: process.env.WHATSAPP_APP_SECRET || process.env.WHATSAPP_VERIFY_TOKEN || 'usb-verify-token-change-me',
  authToken: process.env.TWILIO_AUTH_TOKEN,
  provider: process.env.WHATSAPP_PROVIDER || 'meta',
  onMessages: async (msg) => {
    const customerId = await resolveCustomerId({
      phone: msg.from,
      name: msg.contactName,
      metadata: { source: 'whatsapp', messageId: msg.messageId },
    });

    const { conversationId, isNew } = await getOrCreateConversation({
      customerId,
      channel: 'whatsapp',
      subject: `WhatsApp — ${msg.contactName || msg.from}`,
      externalRef: msg.messageId,
    });

    if (msg.text) {
      await addMessage({
        conversationId,
        content: msg.text,
        sender: 'customer',
        channel: 'whatsapp',
        direction: 'inbound',
        metadata: { customerName: msg.contactName, messageId: msg.messageId, messageType: msg.messageType },
      });
    }

    await storage.setSession(customerId, 'whatsapp', {
      lastConversationId: conversationId,
      lastMessageAt: new Date().toISOString(),
    });
  },
});

// ─── Routes ─────────────────────────────────────────────

// Health
app.get('/health', async (_req, res) => {
  const customers = await storage.getAllCustomers();
  const conversations = await storage.getAllConversations();
  const sessions = [];
  for (const c of customers) {
    const ss = await storage.getSessionsByCustomer(c.customerId);
    sessions.push(...ss);
  }

  // Check external service connectivity
  const upstreamHealth = {};
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2000);
    const r = await fetch(`${UNIFIED_INBOX_URL}/health`, { signal: controller.signal });
    clearTimeout(t);
    upstreamHealth.unifiedInbox = r.ok ? 'healthy' : 'degraded';
  } catch (e) { upstreamHealth.unifiedInbox = 'unreachable'; }

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2000);
    const r = await fetch(`${TICKET_ENGINE_URL}/health`, { signal: controller.signal });
    clearTimeout(t);
    upstreamHealth.ticketEngine = r.ok ? 'healthy' : 'degraded';
  } catch (e) { upstreamHealth.ticketEngine = 'unreachable'; }

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2000);
    const r = await fetch(`${CORPID_URL}/health`, { signal: controller.signal });
    clearTimeout(t);
    upstreamHealth.corpid = r.ok ? 'healthy' : 'degraded';
  } catch (e) { upstreamHealth.corpid = 'unreachable'; }

  res.json({
    status: 'healthy',
    service: 'unified-support-bridge',
    version: '2.0.0',
    port: PORT,
    storage: process.env.USE_REDIS ? 'redis' : process.env.USE_MONGODB ? 'mongodb' : 'in-memory',
    upstream: upstreamHealth,
    counts: { customers: customers.length, conversations: conversations.length, sessions: sessions.length },
    channels: ['email', 'whatsapp', 'app', 'chat', 'phone', 'instagram', 'twitter', 'facebook'],
    features: ['identity-resolution', 'cross-channel-linking', 'conversation-merge', 'channel-webhooks', 'sse-events', 'smtp-receiver', 'imap-polling', 'rate-limiting', 'webhook-auth'],
    timestamp: new Date().toISOString(),
  });
});

// ── WhatsApp Webhook ──────────────────────────────────
app.all('/api/webhooks/whatsapp', async (req, res) => {
  // rawBody is captured by middleware
  await whatsappWebhook.handleRequest(req, res);
});

// ── WhatsApp Webhook Registration ────────────────────────
// Register this service's webhook URL with Meta/Twilio/360dialog
// POST /api/admin/webhooks/whatsapp/register
app.post('/api/admin/webhooks/whatsapp/register', rateLimit, async (req, res) => {
  const { provider, accessToken, phoneNumberId, apiKey, accountSid, authToken } = req.body;
  const baseUrl = process.env.WEBHOOK_PUBLIC_URL || `http://localhost:${PORT}`;
  const webhookUrl = `${baseUrl}/api/webhooks/whatsapp`;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'usb-verify-token-change-me';

  let result;
  if (provider === 'meta') {
    if (!accessToken || !phoneNumberId) return res.status(400).json({ error: 'accessToken and phoneNumberId required' });
    result = await registerMetaWebhook(accessToken, phoneNumberId, webhookUrl, verifyToken);
  } else if (provider === '360dialog') {
    if (!apiKey) return res.status(400).json({ error: 'apiKey required' });
    result = await register360dialogWebhook(apiKey, webhookUrl, verifyToken);
  } else if (provider === 'twilio') {
    if (!accountSid || !authToken) return res.status(400).json({ error: 'accountSid and authToken required' });
    result = await registerTwilioWebhook(accountSid, authToken, req.body.whatsappNumber || '', webhookUrl);
  } else {
    return res.status(400).json({ error: 'Unknown provider. Use: meta, 360dialog, twilio' });
  }

  if (result.success) {
    console.log(`[webhook] Registered ${provider} webhook → ${webhookUrl}`);
  }

  res.json(result);
});

// ── Email Webhook ──────────────────────────────────────
app.post('/api/webhooks/email', webhookApiKeyAuth, rateLimit, async (req, res) => {
  // Normalize from any provider format
  const email = await normalizeEmailFormat(req.body, req.headers);
  if (!email) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const nFrom = normalizeEmailFormat2(email.from?.email);
  if (!nFrom) {
    return res.status(400).json({ error: 'from_email_required' });
  }

  const customerId = await resolveCustomerId({
    email: nFrom,
    name: email.from?.name || null,
    metadata: { source: 'email', messageId: email.messageId, subject: email.subject, provider: email.provider },
  });

  // Thread detection via inReplyTo
  let conversationId;
  let isNew = true;

  if (email.inReplyTo) {
    const convs = await storage.getConversationsByCustomer(customerId);
    for (const conv of convs) {
      if (conv.externalRef === email.inReplyTo) {
        conversationId = conv.id;
        isNew = false;
        break;
      }
    }
  }

  if (!conversationId) {
    const result = await getOrCreateConversation({
      customerId,
      channel: 'email',
      subject: email.subject,
      externalRef: email.messageId,
    });
    conversationId = result.conversationId;
    isNew = result.isNew;
  }

  const customer = await storage.getCustomer(customerId);

  if (email.text) {
    await addMessage({
      conversationId,
      content: email.text,
      sender: 'customer',
      channel: 'email',
      direction: 'inbound',
      metadata: { customerName: customer?.name, messageId: email.messageId, subject: email.subject, provider: email.provider },
    });
  }

  res.status(200).json({
    received: true,
    customerId,
    conversationId,
    isNew,
    messageId: email.messageId,
    customer: customer ? { name: customer.name, email: customer.email, phone: customer.phone } : null,
  });
});

// ── App Webhook ────────────────────────────────────────
app.post('/api/webhooks/app', webhookApiKeyAuth, rateLimit, async (req, res) => {
  const { appUserId, userId, message, sessionId, platform = 'do-app', contactName, customerName } = req.body;
  const uid = appUserId || userId;
  if (!uid) return res.status(400).json({ error: 'appUserId or userId required' });

  const customerId = await resolveCustomerId({
    appUserId: uid,
    name: contactName || customerName || null,
    metadata: { source: 'app', platform, sessionId },
  });

  const { conversationId, isNew, customer } = await getOrCreateConversation({
    customerId,
    channel: 'chat',
    subject: `In-app — ${contactName || customerName || uid}`,
    externalRef: sessionId,
  });

  if (message) {
    await addMessage({
      conversationId,
      content: message,
      sender: 'customer',
      channel: 'chat',
      direction: 'inbound',
      metadata: { customerName: contactName || customerName, sessionId, platform },
    });
    await storage.setSession(customerId, 'chat', { lastConversationId: conversationId, lastMessageAt: new Date().toISOString() });
  }

  res.status(200).json({ received: true, customerId, conversationId, isNew, sessionId: sessionId || conversationId });
});

// ── Customer Identity ───────────────────────────────────
app.post('/api/customers/resolve', async (req, res) => {
  const { phone, email, appUserId, name, metadata } = req.body;
  if (!phone && !email && !appUserId) {
    return res.status(400).json({ success: false, error: 'phone, email, or appUserId required' });
  }
  const customerId = await resolveCustomerId({ phone, email, appUserId, name, metadata });
  const customer = await storage.getCustomer(customerId);
  res.json({ success: true, customerId, customer });
});

app.post('/api/customers/link', async (req, res) => {
  const { customerId, phone, email, appUserId } = req.body;
  if (!customerId || (!phone && !email && !appUserId)) {
    return res.status(400).json({ success: false, error: 'customerId and at least one identifier required' });
  }
  const existing = await storage.getCustomer(customerId);
  if (!existing) return res.status(404).json({ success: false, error: 'Customer not found' });

  const nPhone = normalizePhone(phone);
  const nEmail = normalizeEmailFormat2(email);
  if (nPhone) await storage.registerChannelLink(customerId, 'phone', nPhone);
  if (nEmail) await storage.registerChannelLink(customerId, 'email', nEmail);
  if (appUserId) await storage.registerChannelLink(customerId, 'app', appUserId);

  const customer = await storage.getCustomer(customerId);
  res.json({ success: true, customer });
});

app.get('/api/customers', async (_req, res) => {
  const customers = await storage.getAllCustomers();
  res.json({ success: true, count: customers.length, customers: customers.map(c => ({
    customerId: c.customerId, name: c.name, email: c.email, phone: c.phone, channels: c.channels, createdAt: c.createdAt,
  })) });
});

app.get('/api/customers/:id', async (req, res) => {
  const customer = await storage.getCustomer(req.params.id);
  if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
  const conversations = await storage.getConversationsByCustomer(req.params.id);
  res.json({ success: true, customer, conversations });
});

// ── Cross-Channel Conversations ─────────────────────────
app.get('/api/customers/:id/conversations', async (req, res) => {
  const customer = await storage.getCustomer(req.params.id);
  if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
  const conversations = await storage.getConversationsByCustomer(req.params.id);
  conversations.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  res.json({ success: true, customerId: req.params.id, customer: { name: customer.name, email: customer.email, channels: customer.channels }, conversations, totalConversations: conversations.length });
});

app.get('/api/customers/:id/activity', async (req, res) => {
  const customer = await storage.getCustomer(req.params.id);
  if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
  const messages = await storage.getMessagesByCustomer(req.params.id);
  res.json({
    success: true,
    customerId: req.params.id,
    totalMessages: messages.length,
    activity: messages.map(m => ({
      messageId: m.id,
      content: typeof m.content === 'string' ? m.content.substring(0, 100) : m.content,
      channel: m.channel,
      direction: m.direction,
      createdAt: m.createdAt,
    })),
  });
});

// ── Conversation Merge ──────────────────────────────────
app.post('/api/conversations/:id/merge', async (req, res) => {
  const primaryId = req.params.id;
  const { mergeWith = [], targetConversationId } = req.body;
  const toMerge = targetConversationId ? [targetConversationId, ...mergeWith] : [primaryId, ...mergeWith];
  if (toMerge.length < 2) return res.status(400).json({ success: false, error: 'At least 2 conversations required' });

  let customerId = null;
  for (const convId of toMerge) {
    const conv = await storage.getConversation(convId);
    if (!conv) return res.status(404).json({ success: false, error: `Conversation ${convId} not found` });
    if (customerId && conv.customerId !== customerId) return res.status(400).json({ success: false, error: 'Cannot merge different customers' });
    customerId = conv.customerId;
  }

  const primary = toMerge[0];
  const allChannels = new Set([(await storage.getConversation(primary))?.channel]);
  for (const convId of toMerge) {
    const c = await storage.getConversation(convId);
    if (c) allChannels.add(c.channel);
  }

  await storage.updateConversation(primary, {
    tags: [...(toMerge.filter(id => id !== primary).map(id => `merged:${id}`))],
    linkedConversations: toMerge.filter(id => id !== primary),
    mergedAt: new Date().toISOString(),
  });

  for (const convId of toMerge) {
    if (convId !== primary) {
      await storage.updateConversation(convId, { mergedInto: primary, status: 'merged', mergedAt: new Date().toISOString() });
    }
  }

  emitConversationMerged({ primaryConversationId: primary, mergedFrom: toMerge.filter(id => id !== primary), customerId, channels: [...allChannels] });
  const customer = await storage.getCustomer(customerId);
  res.json({ success: true, primaryConversationId: primary, mergedFrom: toMerge.filter(id => id !== primary), customerId, channels: [...allChannels], customer: { name: customer?.name, email: customer?.email, phone: customer?.phone } });
});

app.get('/api/conversations/:id/linked', async (req, res) => {
  const conv = await storage.getConversation(req.params.id);
  if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });
  res.json({ success: true, conversationId: req.params.id, customerId: conv.customerId, linkedConversations: conv.linkedConversations || [], mergedFrom: conv.mergedFrom || [], mergedInto: conv.mergedInto || null });
});

// ── Ticket Creation ────────────────────────────────────
app.post('/api/conversations/:id/ticket', async (req, res) => {
  const conv = await storage.getConversation(req.params.id);
  if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });
  const customer = await storage.getCustomer(conv.customerId);

  try {
    const ticketRes = await fetch(`${TICKET_ENGINE_URL}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-token': INTERNAL_TOKEN },
      body: JSON.stringify({
        subject: conv.subject,
        description: `From ${conv.channel} conversation ${req.params.id}`,
        customer: { id: conv.customerId, name: customer?.name, email: customer?.email },
        priority: conv.priority || 'medium',
        category: req.body.category || 'general',
        tags: [...(conv.tags || []), `source:${conv.channel}`],
        source: conv.channel,
        conversationId: req.params.id,
      }),
    });

    if (ticketRes.ok) {
      const data = await ticketRes.json();
      emitTicketCreated({ ticketId: data.ticket?.id || data.id, conversationId: req.params.id, customerId: conv.customerId, channel: conv.channel });
      res.json({ success: true, ticketId: data.ticket?.id || data.id, ticket: data.ticket });
    } else {
      res.status(502).json({ success: false, error: 'Ticket engine unavailable' });
    }
  } catch (e) {
    res.status(502).json({ success: false, error: 'Ticket engine unreachable' });
  }
});

// ── Stats ─────────────────────────────────────────────
app.get('/api/stats', async (_req, res) => {
  const customers = await storage.getAllCustomers();
  const conversations = await storage.getAllConversations();
  const byChannel = {};
  for (const c of conversations) {
    byChannel[c.channel] = (byChannel[c.channel] || 0) + 1;
  }
  res.json({ success: true, stats: { totalCustomers: customers.length, totalConversations: conversations.length, byChannel, multiChannelCustomers: customers.filter(c => (c.channels?.length || 0) > 1).length } });
});

// ── Events ─────────────────────────────────────────────
attachEventRoutes(app);

// ── Email Inbound (SMTP) ────────────────────────────────
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '0', 10);
if (SMTP_PORT > 0) {
  const smtp = createSmtpReceiver(async (email) => {
    // Forward to email webhook handler
    const nFrom = normalizeEmailFormat2(email.from?.email);
    if (!nFrom) return;

    const customerId = await resolveCustomerId({
      email: nFrom,
      name: email.from?.name,
      metadata: { source: 'email', messageId: email.messageId, provider: 'smtp' },
    });

    const convs = await storage.getConversationsByCustomer(customerId);
    let conversationId;
    let isNew = true;

    if (email.inReplyTo) {
      for (const c of convs) {
        if (c.externalRef === email.inReplyTo) {
          conversationId = c.id;
          isNew = false;
          break;
        }
      }
    }

    if (!conversationId) {
      const result = await getOrCreateConversation({
        customerId,
        channel: 'email',
        subject: email.subject,
        externalRef: email.messageId,
      });
      conversationId = result.conversationId;
      isNew = result.isNew;
    }

    if (email.text) {
      await addMessage({
        conversationId,
        content: email.text,
        sender: 'customer',
        channel: 'email',
        direction: 'inbound',
        metadata: { messageId: email.messageId, subject: email.subject, provider: 'smtp' },
      });
    }

    console.log(`[smtp] processed email from ${nFrom} → conv ${conversationId}`);
  }, SMTP_PORT);

  smtp.listen(SMTP_PORT, () => {
    console.log(`[smtp] SMTP receiver listening on port ${SMTP_PORT}`);
  });
}

// ── IMAP Polling ─────────────────────────────────────
if (process.env.IMAP_USER && process.env.IMAP_PASSWORD) {
  const imap = createImapPoller(async (email) => {
    // Reuse same flow as SMTP
    const nFrom = normalizeEmailFormat2(email.from?.email);
    if (!nFrom) return;

    const customerId = await resolveCustomerId({
      email: nFrom,
      name: email.from?.name,
      metadata: { source: 'email', messageId: email.messageId, provider: 'imap' },
    });

    const convs = await storage.getConversationsByCustomer(customerId);
    let conversationId;

    if (email.inReplyTo) {
      for (const c of convs) {
        if (c.externalRef === email.inReplyTo) {
          conversationId = c.id;
          break;
        }
      }
    }

    if (!conversationId) {
      const result = await getOrCreateConversation({
        customerId,
        channel: 'email',
        subject: email.subject,
        externalRef: email.messageId,
      });
      conversationId = result.conversationId;
    }

    if (email.text) {
      await addMessage({
        conversationId,
        content: email.text,
        sender: 'customer',
        channel: 'email',
        direction: 'inbound',
        metadata: { messageId: email.messageId, provider: 'imap' },
      });
    }

    console.log(`[imap] processed email from ${nFrom}`);
  }, parseInt(process.env.IMAP_POLL_INTERVAL || '60000', 10));

  imap.start();
}

// ── 404 ────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

// ─── Start ────────────────────────────────────────────────────
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`[unified-support-bridge] v2.0 listening on ${PORT}`);
    console.log(`[unified-support-bridge] storage: ${process.env.USE_REDIS ? 'redis' : process.env.USE_MONGODB ? 'mongodb' : 'in-memory'}`);
    console.log(`[unified-support-bridge] corpid: ${CORPID_URL}`);
    console.log(`[unified-support-bridge] unified-inbox: ${UNIFIED_INBOX_URL}`);
    console.log(`[unified-support-bridge] ticket-engine: ${TICKET_ENGINE_URL}`);
    if (process.env.IMAP_USER) console.log(`[unified-support-bridge] imap: polling ${process.env.IMAP_HOST}`);
    if (SMTP_PORT > 0) console.log(`[unified-support-bridge] smtp: listening on ${SMTP_PORT}`);
  });

  // Attach WebSocket to same server
  const http = require('http');
  const { initWebSocket, initRedisPubSub } = require('./events');
  initWebSocket(server);

  if (process.env.REDIS_URL) {
    initRedisPubSub(process.env.REDIS_URL);
  }

  process.on('SIGTERM', () => { server.close(); process.exit(0); });
} else {
  module.exports = { app };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
