/**
 * RTMN WhatsApp OS (port 4860)
 *
 * Orchestration layer for WhatsApp Business API across multiple providers.
 * Designed to be region-friendly (360dialog in EU, Twilio worldwide, Meta direct in NA).
 *
 * Provider abstraction: pick one in WHATSAPP_PROVIDER env or via /api/providers/switch
 * Default provider is "mock" so the service is fully runnable without API keys.
 *
 * Capabilities:
 *  - send text / template / media messages (with mock fallback)
 *  - 6 seeded templates (order_update, booking_confirm, payment_received, otp, welcome, appointment_reminder)
 *  - conversation state tracking per phone number
 *  - inbound webhook simulation via /api/webhook/simulate
 *  - provider switching + health per provider
 *  - session templates (24h window tracking)
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

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
const PORT = process.env.PORT || 4860;

app.use(helmet());
app.use(cors());
app.use(express.json());

// ----------------------------- Provider Abstraction -----------------------------

const providers = {
  mock: {
    name: 'mock',
    label: 'Mock Provider (no API key required)',
    sendMessage: async (to, payload) => ({
      providerMessageId: `mock_${uuidv4().slice(0, 12)}`,
      provider: 'mock',
      to,
      payload,
      status: 'sent',
      sentAt: new Date().toISOString(),
      cost: 0,
      note: 'No provider call made — message stored in mock outbox.',
    }),
    healthCheck: async () => ({ status: 'ok', mode: 'mock' }),
  },
  '360dialog': {
    name: '360dialog',
    label: '360dialog (EU/LATAM)',
    apiBase: 'https://waba.360dialog.io/v1',
    sendMessage: async (to, payload) => ({
      providerMessageId: `360d_${uuidv4().slice(0, 12)}`,
      provider: '360dialog',
      to,
      payload,
      status: 'queued',
      sentAt: new Date().toISOString(),
      note: 'Provider call would be POST {apiBase}/messages with API key in D360-API-KEY header.',
    }),
    healthCheck: async () => ({ status: 'configured', mode: 'live', requiresApiKey: 'D360-API-KEY' }),
  },
  twilio: {
    name: 'twilio',
    label: 'Twilio (global)',
    apiBase: 'https://api.twilio.com/2010-04-01',
    sendMessage: async (to, payload) => ({
      providerMessageId: `tw_${uuidv4().slice(0, 12)}`,
      provider: 'twilio',
      to,
      payload,
      status: 'queued',
      sentAt: new Date().toISOString(),
      note: 'Provider call would be POST to Twilio Messages API with AccountSid + AuthToken.',
    }),
    healthCheck: async () => ({ status: 'configured', mode: 'live', requiresApiKey: 'TWILIO_AUTH_TOKEN' }),
  },
  meta: {
    name: 'meta',
    label: 'Meta Cloud API (NA)',
    apiBase: 'https://graph.facebook.com/v18.0',
    sendMessage: async (to, payload) => ({
      providerMessageId: `meta_${uuidv4().slice(0, 12)}`,
      provider: 'meta',
      to,
      payload,
      status: 'queued',
      sentAt: new Date().toISOString(),
      note: 'Provider call would be POST {apiBase}/{phone-id}/messages with Bearer token.',
    }),
    healthCheck: async () => ({ status: 'configured', mode: 'live', requiresApiKey: 'META_ACCESS_TOKEN' }),
  },
};

let currentProvider = process.env.WHATSAPP_PROVIDER || 'mock';

// ----------------------------- In-memory storage -----------------------------

const messages = new PersistentMap('messages', { serviceName: 'whatsapp-os' });          // messageId -> { ... }
const conversations = new PersistentMap('conversations', { serviceName: 'whatsapp-os' });     // phone -> { lastMessageAt, sessionWindowExpiresAt, messageCount }
const templates = new PersistentMap('templates', { serviceName: 'whatsapp-os' });         // templateId -> { name, language, category, body, status }
const contacts = new PersistentMap('contacts', { serviceName: 'whatsapp-os' });          // phone -> { name, optedIn, lastSeenAt, tags }

const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h WhatsApp session window

// ----------------------------- Seeded templates -----------------------------

const seedTemplates = [
  {
    id: 'tpl-order-update',
    name: 'order_update',
    language: 'en',
    category: 'utility',
    body: 'Hi {{name}}! Your order #{{orderId}} is now {{status}}. Track it here: {{link}}',
    variables: ['name', 'orderId', 'status', 'link'],
  },
  {
    id: 'tpl-booking-confirm',
    name: 'booking_confirm',
    language: 'en',
    category: 'utility',
    body: '✅ Booking confirmed for {{guestName}} at {{propertyName}} on {{checkIn}}. Confirmation: {{code}}',
    variables: ['guestName', 'propertyName', 'checkIn', 'code'],
  },
  {
    id: 'tpl-payment-received',
    name: 'payment_received',
    language: 'en',
    category: 'utility',
    body: '💰 Payment of {{amount}} {{currency}} received. Receipt: {{receiptUrl}}',
    variables: ['amount', 'currency', 'receiptUrl'],
  },
  {
    id: 'tpl-otp',
    name: 'otp_code',
    language: 'en',
    category: 'authentication',
    body: 'Your verification code is {{code}}. Valid for 10 minutes. Do not share.',
    variables: ['code'],
  },
  {
    id: 'tpl-welcome',
    name: 'welcome',
    language: 'en',
    category: 'marketing',
    body: '👋 Welcome to {{brand}}, {{name}}! Reply STOP to opt out. Reply HELP for help.',
    variables: ['brand', 'name'],
  },
  {
    id: 'tpl-appointment-reminder',
    name: 'appointment_reminder',
    language: 'en',
    category: 'utility',
    body: '⏰ Reminder: appointment with {{provider}} on {{datetime}} at {{location}}.',
    variables: ['provider', 'datetime', 'location'],
  },
];
seedTemplates.forEach(t => templates.set(t.id, { ...t, status: 'approved', createdAt: new Date().toISOString() }));

// ----------------------------- Helpers -----------------------------

const renderTemplate = (template, vars) =>
  template.body.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`));

const getOrCreateConversation = (phone) => {
  let convo = conversations.get(phone);
  const now = Date.now();
  if (!convo) {
    convo = { phone, lastMessageAt: new Date().toISOString(), messageCount: 0, sessionWindowExpiresAt: new Date(now + SESSION_WINDOW_MS).toISOString() };
    conversations.set(phone, convo);
  } else if (now - new Date(convo.sessionWindowExpiresAt).getTime() > 0) {
    convo.sessionWindowExpiresAt = new Date(now + SESSION_WINDOW_MS).toISOString();
  }
  convo.lastMessageAt = new Date().toISOString();
  convo.messageCount = (convo.messageCount || 0) + 1;
  return convo;
};

// ----------------------------- Health -----------------------------

app.get('/health', async (_req, res) => {
  const providerHealth = await providers[currentProvider].healthCheck();
  res.json({
    status: 'healthy',
    service: 'whatsapp-os',
    version: '1.0.0',
    port: PORT,
    provider: currentProvider,
    providerHealth,
    counts: {
      templates: templates.size,
      messages: messages.size,
      conversations: conversations.size,
      contacts: contacts.size,
    },
    timestamp: new Date().toISOString(),
  });
});

// ----------------------------- Provider endpoints -----------------------------

app.get('/api/providers', (_req, res) => {
  res.json({ providers: Object.values(providers).map(p => ({ name: p.name, label: p.label })), current: currentProvider });
});

app.post('/api/providers/switch',requireAuth,  (req, res) => {
  const { provider } = req.body;
  if (!providers[provider]) return res.status(400).json({ error: 'unknown_provider', available: Object.keys(providers) });
  currentProvider = provider;
  res.json({ switched: provider, current: currentProvider });
});

// ----------------------------- Templates -----------------------------

app.get('/api/templates', (_req, res) => {
  res.json({ templates: [...templates.values()], count: templates.size });
});

app.get('/api/templates/:id', (req, res) => {
  const tpl = templates.get(req.params.id);
  if (!tpl) return res.status(404).json({ error: 'not_found' });
  res.json(tpl);
});

app.post('/api/templates',requireAuth,  (req, res) => {
  const { name, language, category, body, variables } = req.body || {};
  if (!name || !body) return res.status(400).json({ error: 'name_and_body_required' });
  const id = `tpl-${uuidv4().slice(0, 8)}`;
  const tpl = { id, name, language: language || 'en', category: category || 'utility', body, variables: variables || [], status: 'pending', createdAt: new Date().toISOString() };
  templates.set(id, tpl);
  res.status(201).json(tpl);
});

app.post('/api/templates/:id/render',requireAuth,  (req, res) => {
  const tpl = templates.get(req.params.id);
  if (!tpl) return res.status(404).json({ error: 'not_found' });
  const rendered = renderTemplate(tpl, req.body || {});
  res.json({ templateId: tpl.id, rendered });
});

// ----------------------------- Send -----------------------------

app.post('/api/messages/send',requireAuth,  async (req, res) => {
  const { to, type = 'text', text, templateId, templateVars, mediaUrl } = req.body || {};
  if (!to) return res.status(400).json({ error: 'to_required' });

  let payload;
  if (type === 'template') {
    if (!templateId) return res.status(400).json({ error: 'templateId_required_for_template_type' });
    const tpl = templates.get(templateId);
    if (!tpl) return res.status(404).json({ error: 'template_not_found' });
    const body = renderTemplate(tpl, templateVars || {});
    payload = { type: 'template', template: { name: tpl.name, language: { code: tpl.language }, components: [{ type: 'body', parameters: Object.values(templateVars || {}).map(v => ({ type: 'text', text: String(v) })) }] }, preview: body };
  } else if (type === 'media') {
    payload = { type: 'media', mediaUrl, caption: text };
  } else {
    payload = { type: 'text', text: { body: text || '' } };
  }

  const result = await providers[currentProvider].sendMessage(to, payload);
  const id = `msg-${uuidv4().slice(0, 12)}`;
  const msg = { id, to, type, direction: 'outbound', provider: currentProvider, providerMessageId: result.providerMessageId, payload, status: result.status, sentAt: result.sentAt, cost: result.cost };
  messages.set(id, msg);
  getOrCreateConversation(to);
  res.status(201).json(msg);
});

// ----------------------------- Inbound (webhook simulation) -----------------------------

app.post('/api/webhook/simulate',requireAuth,  (req, res) => {
  const { from, text, contactName } = req.body || {};
  if (!from || !text) return res.status(400).json({ error: 'from_and_text_required' });
  const id = `msg-${uuidv4().slice(0, 12)}`;
  const msg = { id, from, to: 'business', text, direction: 'inbound', provider: currentProvider, receivedAt: new Date().toISOString() };
  messages.set(id, msg);
  getOrCreateConversation(from);
  if (contactName) {
    const c = contacts.get(from) || { phone: from, firstSeenAt: new Date().toISOString() };
    c.name = contactName;
    c.lastSeenAt = new Date().toISOString();
    contacts.set(from, c);
  }
  res.status(201).json({ received: msg, autoReplyHint: 'Consider calling POST /api/messages/send to auto-reply.' });
});

// ----------------------------- Conversations -----------------------------

app.get('/api/conversations', (_req, res) => {
  res.json({ conversations: [...conversations.values()], count: conversations.size });
});

app.get('/api/conversations/:phone', (req, res) => {
  const convo = conversations.get(req.params.phone);
  if (!convo) return res.status(404).json({ error: 'not_found' });
  const phone = req.params.phone;
  const phoneMessages = [...messages.values()].filter(m => m.to === phone || m.from === phone).sort((a, b) => new Date(a.sentAt || a.receivedAt) - new Date(b.sentAt || b.receivedAt));
  res.json({ conversation: convo, messages: phoneMessages });
});

// ----------------------------- Contacts -----------------------------

app.get('/api/contacts', (_req, res) => {
  res.json({ contacts: [...contacts.values()], count: contacts.size });
});

app.post('/api/contacts',requireAuth,  (req, res) => {
  const { phone, name, optedIn = true, tags = [] } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'phone_required' });
  const c = { phone, name, optedIn, tags, lastSeenAt: new Date().toISOString(), createdAt: new Date().toISOString() };
  contacts.set(phone, c);
  res.status(201).json(c);
});

// ----------------------------- Message log -----------------------------

app.get('/api/messages', (req, res) => {
  const { direction, phone, limit = 100 } = req.query;
  let out = [...messages.values()];
  if (direction) out = out.filter(m => m.direction === direction);
  if (phone) out = out.filter(m => m.to === phone || m.from === phone);
  out = out.slice(-parseInt(limit, 10));
  res.json({ messages: out, count: out.length });
});

// ----------------------------- 404 -----------------------------

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`[whatsapp-os] listening on ${PORT} — provider: ${currentProvider}`);
});
installGracefulShutdown(server);
