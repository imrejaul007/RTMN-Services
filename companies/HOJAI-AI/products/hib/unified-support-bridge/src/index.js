'use strict';

var express = require('express');
var cors = require('cors');
var helmet = require('helmet');
var morgan = require('morgan');
var crypto = require('crypto');

// ─── Modules ───────────────────────────────────────────────────────────────
var createStorage = require('./storage').createStorage;
var emailHandler = require('./emailHandler');
var whatsappWebhook = require('./whatsappWebhook');
var eventsModule = require('./events');

// ─── App Setup ───────────────────────────────────────────────────────────
var app = express();
var PORT = parseInt(process.env.PORT || '4885', 10);
var INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'dev-token';

// ─── Config ───────────────────────────────────────────────────────────────
var UNIFIED_INBOX_URL = process.env.UNIFIED_INBOX_URL || 'http://localhost:4870';
var TICKET_ENGINE_URL = process.env.TICKET_ENGINE_URL || 'http://localhost:4872';
var CORPID_URL = process.env.CORPID_URL || 'http://localhost:4702';

// ─── Webhook API Keys ────────────────────────────────────────────────────
var WEBHOOK_API_KEYS = {};
if (process.env.WEBHOOK_API_KEYS) {
  process.env.WEBHOOK_API_KEYS.split(',').forEach(function(k) { if (k.trim()) WEBHOOK_API_KEYS[k.trim()] = true; });
}

// ─── Rate Limiting ───────────────────────────────────────────────────────
var rateLimitMap = {};
var RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
var RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10);

function rateLimit(req, res, next) {
  var key = req.ip || 'unknown';
  var now = Date.now();
  var entry = rateLimitMap[key] || { count: 0, windowStart: now };
  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry = { count: 0, windowStart: now };
  }
  entry.count++;
  rateLimitMap[key] = entry;
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'rate_limit_exceeded', retryAfter: Math.ceil((entry.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000) });
  }
  next();
}

// ─── Webhook API Key Auth ────────────────────────────────────────────────
function webhookApiKeyAuth(req, res, next) {
  var keys = Object.keys(WEBHOOK_API_KEYS);
  if (keys.length === 0) return next(); // open in dev
  var key = req.headers['x-api-key'] || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
  if (!key || !WEBHOOK_API_KEYS[key]) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

// ─── Middleware ─────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('combined'));

// Capture raw body for WhatsApp HMAC verification
app.use(function(req, res, next) {
  if (req.method === 'GET') return next();
  var chunks = [];
  req.on('data', function(c) { chunks.push(c); });
  req.on('end', function() {
    req.rawBody = Buffer.concat(chunks).toString('utf8');
    var ct = (req.headers['content-type'] || '');
    if (ct.includes('application/json') && req.rawBody) {
      try { req.body = JSON.parse(req.rawBody); } catch(e) { req.body = {}; }
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      var params = new URLSearchParams(req.rawBody);
      req.body = Object.fromEntries(params);
    } else {
      req.body = {};
    }
    next();
  });
});

// ─── Storage ────────────────────────────────────────────────────────────
var storage = createStorage();

// ─── CorpID Cache ─────────────────────────────────────────────────────
var corpIdCache = {};
var CORPID_CACHE_TTL = 5 * 60 * 1000;

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

async function resolveCorpIdCustomer(email) {
  var nEmail = ((email || '').toLowerCase()).trim();
  if (!nEmail) return null;
  var cached = corpIdCache[nEmail];
  if (cached && Date.now() - cached.fetchedAt < CORPID_CACHE_TTL) return cached.customerId;

  var retries = 3;
  for (var attempt = 1; attempt <= retries; attempt++) {
    try {
      var controller = new AbortController();
      var timeout = setTimeout(function() { controller.abort(); }, 5000);
      var res = await fetch(CORPID_URL + '/api/identity/lookup?email=' + encodeURIComponent(nEmail), {
        signal: controller.signal,
        headers: { 'x-internal-token': INTERNAL_TOKEN }
      });
      clearTimeout(timeout);
      if (res.ok) {
        var data = await res.json();
        if (data.customerId) {
          corpIdCache[nEmail] = { customerId: data.customerId, fetchedAt: Date.now() };
          return data.customerId;
        }
      }
      return null;
    } catch(e) {
      if (attempt < retries) await sleep(500 * attempt);
    }
  }
  return null;
}

// ─── Normalize ────────────────────────────────────────────────────────
function normalizePhone(phone) {
  if (!phone) return null;
  var cleaned = String(phone).replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.length === 10) return '+91' + cleaned;
  if (cleaned.length === 12 && cleaned.startsWith('91')) return '+' + cleaned;
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length > 10) return '+' + cleaned;
  return null;
}

function normalizeEmail(email) {
  if (!email) return null;
  return ((email.toLowerCase()).trim()).replace(/\s+/g, '');
}

// ─── Customer Identity Resolution ──────────────────────────────────────
async function resolveCustomerId(opts) {
  opts = opts || {};
  var phone = opts.phone;
  var email = opts.email;
  var appUserId = opts.appUserId;
  var name = opts.name;
  var metadata = opts.metadata || {};

  var nPhone = normalizePhone(phone);
  var nEmail = normalizeEmail(email);

  // Fast path: direct channel lookup
  if (nPhone) {
    var ex = await storage.findCustomerByChannel('phone', nPhone);
    if (ex) return ex;
  }
  if (nEmail) {
    var ex = await storage.findCustomerByChannel('email', nEmail);
    if (ex) return ex;
  }
  if (appUserId) {
    var ex = await storage.findCustomerByChannel('app', appUserId);
    if (ex) return ex;
  }

  // Cross-channel: appUserId given but customer exists via phone/email
  if (appUserId && (nPhone || nEmail)) {
    var foundId = null;
    if (nPhone) foundId = await storage.findCustomerByChannel('phone', nPhone);
    if (!foundId && nEmail) foundId = await storage.findCustomerByChannel('email', nEmail);
    if (foundId) {
      if (nPhone) await storage.registerChannelLink(foundId, 'phone', nPhone);
      if (nEmail) await storage.registerChannelLink(foundId, 'email', nEmail);
      await storage.registerChannelLink(foundId, 'app', appUserId);
      return foundId;
    }
  }

  // CorpID lookup
  if (nEmail) {
    var corpId = await resolveCorpIdCustomer(nEmail);
    if (corpId) {
      await storage.registerChannelLink(corpId, 'email', nEmail);
      if (nPhone) await storage.registerChannelLink(corpId, 'phone', nPhone);
      if (appUserId) await storage.registerChannelLink(corpId, 'app', appUserId);
      await storage.upsertCustomer({ customerId: corpId, phone: nPhone, email: nEmail, appUserId: appUserId, name: name || null, channels: ['email'].concat(nPhone ? ['phone'] : []).concat(appUserId ? ['app'] : []), metadata: metadata, linkedFromCorpId: true });
      eventsModule.emitCustomerLinked({ customerId: corpId, phone: nPhone, email: nEmail, appUserId: appUserId, source: 'corpid' });
      return corpId;
    }
  }

  // Create new
  var customerId = 'cust-' + crypto.randomUUID().slice(0, 12);
  await storage.upsertCustomer({ customerId: customerId, phone: nPhone, email: nEmail, appUserId: appUserId, name: name || null, channels: [], metadata: metadata });
  if (nPhone) await storage.registerChannelLink(customerId, 'phone', nPhone);
  if (nEmail) await storage.registerChannelLink(customerId, 'email', nEmail);
  if (appUserId) await storage.registerChannelLink(customerId, 'app', appUserId);
  return customerId;
}

// ─── Conversation Management ────────────────────────────────────────────
async function getOrCreateConversation(opts) {
  var customerId = opts.customerId;
  var channel = opts.channel;
  var subject = opts.subject;
  var priority = opts.priority || 'medium';
  var tags = opts.tags || [];
  var externalRef = opts.externalRef;

  var session = await storage.getSession(customerId, channel);
  if (session && session.lastConversationId) {
    var customer = await storage.getCustomer(customerId);
    return { conversationId: session.lastConversationId, isNew: false, customerId: customerId, channel: channel, customer: customer };
  }

  var conversationId = 'conv-' + crypto.randomUUID().slice(0, 12);
  await storage.createConversation({
    id: conversationId,
    customerId: customerId,
    channel: channel,
    subject: subject || ('Support - ' + channel),
    priority: priority,
    status: 'open',
    tags: tags.concat(['source:' + channel]),
    externalRef: externalRef
  });

  await storage.setSession(customerId, channel, {
    lastConversationId: conversationId,
    lastMessageAt: new Date().toISOString(),
    externalRef: externalRef
  });

  eventsModule.emitConversationCreated({ conversationId: conversationId, customerId: customerId, channel: channel, subject: subject, priority: priority });

  var customer = await storage.getCustomer(customerId);
  return { conversationId: conversationId, isNew: true, customerId: customerId, channel: channel, customer: customer };
}

async function addMessage(opts) {
  var msg = await storage.createMessage({
    conversationId: opts.conversationId,
    content: opts.content,
    sender: opts.sender,
    channel: opts.channel,
    direction: opts.direction || 'inbound'
  });

  eventsModule.emitMessageReceived({ messageId: msg.id, conversationId: opts.conversationId, channel: opts.channel, direction: opts.direction, sender: opts.sender });

  // Forward to unified-inbox
  fetch(UNIFIED_INBOX_URL + '/api/conversations/' + opts.conversationId + '/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-token': INTERNAL_TOKEN },
    body: JSON.stringify({ content: opts.content, sender: opts.sender, type: 'message' })
  }).catch(function() {});

  return msg;
}

// ─── WhatsApp Webhook ──────────────────────────────────────────────────
var WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'usb-verify-token-change-me';
var whatsapp = whatsappWebhook.createWhatsAppWebhookMiddleware({
  verifyToken: WHATSAPP_VERIFY_TOKEN,
  appSecret: process.env.WHATSAPP_APP_SECRET || WHATSAPP_VERIFY_TOKEN,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  provider: process.env.WHATSAPP_PROVIDER || 'meta',
  onMessages: async function(msg) {
    var customerId = await resolveCustomerId({
      phone: msg.from,
      name: msg.contactName,
      metadata: { source: 'whatsapp', messageId: msg.messageId }
    });
    var result = await getOrCreateConversation({
      customerId: customerId,
      channel: 'whatsapp',
      subject: 'WhatsApp - ' + (msg.contactName || msg.from),
      externalRef: msg.messageId
    });
    if (msg.text) {
      await addMessage({
        conversationId: result.conversationId,
        content: msg.text,
        sender: 'customer',
        channel: 'whatsapp',
        direction: 'inbound',
        metadata: { customerName: msg.contactName, messageId: msg.messageId, messageType: msg.messageType }
      });
    }
    await storage.setSession(customerId, 'whatsapp', { lastConversationId: result.conversationId, lastMessageAt: new Date().toISOString() });
  }
});

// ─── Routes ───────────────────────────────────────────────────────────────

// Health
app.get('/health', async function(req, res) {
  var customers = await storage.getAllCustomers();
  var conversations = await storage.getAllConversations();
  var sessions = [];
  for (var ci = 0; ci < customers.length; ci++) {
    var ss = await storage.getSessionsByCustomer(customers[ci].customerId);
    sessions = sessions.concat(ss);
  }

  var upstream = {};
  try {
    var c1 = new AbortController(); var t1 = setTimeout(function() { c1.abort(); }, 2000);
    var r1 = await fetch(UNIFIED_INBOX_URL + '/health', { signal: c1.signal });
    clearTimeout(t1);
    upstream.unifiedInbox = r1.ok ? 'healthy' : 'degraded';
  } catch(e) { upstream.unifiedInbox = 'unreachable'; }

  try {
    var c2 = new AbortController(); var t2 = setTimeout(function() { c2.abort(); }, 2000);
    var r2 = await fetch(TICKET_ENGINE_URL + '/health', { signal: c2.signal });
    clearTimeout(t2);
    upstream.ticketEngine = r2.ok ? 'healthy' : 'degraded';
  } catch(e) { upstream.ticketEngine = 'unreachable'; }

  try {
    var c3 = new AbortController(); var t3 = setTimeout(function() { c3.abort(); }, 2000);
    var r3 = await fetch(CORPID_URL + '/health', { signal: c3.signal });
    clearTimeout(t3);
    upstream.corpid = r3.ok ? 'healthy' : 'degraded';
  } catch(e) { upstream.corpid = 'unreachable'; }

  res.json({
    status: 'healthy',
    service: 'unified-support-bridge',
    version: '2.0.0',
    port: PORT,
    storage: process.env.USE_REDIS ? 'redis' : process.env.USE_MONGODB ? 'mongodb' : 'in-memory',
    upstream: upstream,
    counts: { customers: customers.length, conversations: conversations.length, sessions: sessions.length },
    channels: ['email', 'whatsapp', 'app', 'chat', 'phone', 'instagram', 'twitter', 'facebook'],
    features: ['identity-resolution', 'cross-channel-linking', 'conversation-merge', 'channel-webhooks', 'sse-events', 'smtp-receiver', 'imap-polling', 'rate-limiting', 'webhook-auth'],
    timestamp: new Date().toISOString()
  });
});

// WhatsApp Webhook
app.all('/api/webhooks/whatsapp', async function(req, res) {
  await whatsapp.handleRequest(req, res);
});

// WhatsApp Registration
app.post('/api/admin/webhooks/whatsapp/register', rateLimit, async function(req, res) {
  var provider = req.body.provider;
  var baseUrl = process.env.WEBHOOK_PUBLIC_URL || ('http://localhost:' + PORT);
  var webhookUrl = baseUrl + '/api/webhooks/whatsapp';
  var verifyToken = WHATSAPP_VERIFY_TOKEN;
  var result = null;

  if (provider === 'meta') {
    result = await whatsappWebhook.registerMetaWebhook(req.body.accessToken, req.body.phoneNumberId, webhookUrl, verifyToken);
  } else if (provider === '360dialog') {
    result = await whatsappWebhook.register360dialogWebhook(req.body.apiKey, webhookUrl, verifyToken);
  } else if (provider === 'twilio') {
    result = await whatsappWebhook.registerTwilioWebhook(req.body.accountSid, req.body.authToken, (req.body.whatsappNumber || ''), webhookUrl);
  } else {
    return res.status(400).json({ error: 'Unknown provider. Use: meta, 360dialog, twilio' });
  }

  console.log('[webhook] Registration result:', JSON.stringify(result));
  res.json(result);
});

// WhatsApp Status Check
app.get('/api/admin/webhooks/whatsapp/status', async function(req, res) {
  var baseUrl = process.env.WEBHOOK_PUBLIC_URL || ('http://localhost:' + PORT);
  var webhookUrl = baseUrl + '/api/webhooks/whatsapp';
  try {
    var c = new AbortController(); var t = setTimeout(function() { c.abort(); }, 5000);
    var r = await fetch(webhookUrl + '?hub.mode=subscribe&hub.verify_token=test&hub.challenge=ok', { signal: c.signal });
    clearTimeout(t);
    var body = await r.text();
    var reachable = r.status === 200 && body === 'ok';
    res.json({ url: webhookUrl, reachable: reachable, statusCode: r.status, publicUrlConfigured: !!process.env.WEBHOOK_PUBLIC_URL,
      message: reachable ? 'OK' : 'NOT reachable from internet. Set WEBHOOK_PUBLIC_URL.' });
  } catch(e) {
    res.json({ url: webhookUrl, reachable: false, error: e.message, publicUrlConfigured: false,
      message: 'Cannot reach webhook. Set WEBHOOK_PUBLIC_URL.' });
  }
});

// Generate API Key
app.post('/api/admin/keys/generate', async function(req, res) {
  var key = crypto.randomBytes(32).toString('hex');
  var keyId = 'key-' + crypto.randomUUID().slice(0, 8);
  console.log('[admin] New API key: ' + keyId + ' = ' + key);
  res.json({ success: true, keyId: keyId, key: key, message: 'Set WEBHOOK_API_KEYS env var and restart.' });
});

// Email Webhook
app.post('/api/webhooks/email', webhookApiKeyAuth, rateLimit, async function(req, res) {
  var email = emailHandler.normalizeEmail(req.body, req.headers);
  if (!email) return res.status(400).json({ error: 'Invalid email format' });

  var nFrom = normalizeEmail((email.from || {}).email);
  if (!nFrom) return res.status(400).json({ error: 'from_email_required' });

  var customerId = await resolveCustomerId({
    email: nFrom,
    name: (email.from || {}).name || null,
    metadata: { source: 'email', messageId: email.messageId, subject: email.subject, provider: email.provider }
  });

  var conversationId = null;
  var isNew = true;

  if (email.inReplyTo) {
    var convs = await storage.getConversationsByCustomer(customerId);
    for (var i = 0; i < convs.length; i++) {
      if (convs[i].externalRef === email.inReplyTo) {
        conversationId = convs[i].id;
        isNew = false;
        break;
      }
    }
  }

  if (!conversationId) {
    var result = await getOrCreateConversation({
      customerId: customerId,
      channel: 'email',
      subject: email.subject,
      externalRef: email.messageId
    });
    conversationId = result.conversationId;
    isNew = result.isNew;
  }

  if (email.text) {
    await addMessage({
      conversationId: conversationId,
      content: email.text,
      sender: 'customer',
      channel: 'email',
      direction: 'inbound',
      metadata: { messageId: email.messageId, subject: email.subject, provider: email.provider }
    });
  }

  res.json({ received: true, customerId: customerId, conversationId: conversationId, isNew: isNew, messageId: email.messageId });
});

// App Webhook
app.post('/api/webhooks/app', webhookApiKeyAuth, rateLimit, async function(req, res) {
  var body = req.body;
  var uid = body.appUserId || body.userId;
  if (!uid) return res.status(400).json({ error: 'appUserId or userId required' });

  var customerId = await resolveCustomerId({
    appUserId: uid,
    name: body.contactName || body.customerName || null,
    metadata: { source: 'app', platform: body.platform || 'do-app', sessionId: body.sessionId }
  });

  var result = await getOrCreateConversation({
    customerId: customerId,
    channel: 'chat',
    subject: 'In-app - ' + (body.contactName || body.customerName || uid),
    externalRef: body.sessionId
  });

  if (body.message) {
    await addMessage({
      conversationId: result.conversationId,
      content: body.message,
      sender: 'customer',
      channel: 'chat',
      direction: 'inbound',
      metadata: { customerName: body.contactName || body.customerName, sessionId: body.sessionId, platform: body.platform }
    });
    await storage.setSession(customerId, 'chat', { lastConversationId: result.conversationId, lastMessageAt: new Date().toISOString() });
  }

  res.json({ received: true, customerId: customerId, conversationId: result.conversationId, isNew: result.isNew, sessionId: body.sessionId || result.conversationId });
});

// Customer Resolve
app.post('/api/customers/resolve', async function(req, res) {
  var body = req.body;
  if (!body.phone && !body.email && !body.appUserId) {
    return res.status(400).json({ success: false, error: 'phone, email, or appUserId required' });
  }
  var customerId = await resolveCustomerId(body);
  var customer = await storage.getCustomer(customerId);
  res.json({ success: true, customerId: customerId, customer: customer });
});

// Customer Link
app.post('/api/customers/link', async function(req, res) {
  var body = req.body;
  var customerId = body.customerId;
  if (!customerId || (!body.phone && !body.email && !body.appUserId)) {
    return res.status(400).json({ success: false, error: 'customerId and at least one identifier required' });
  }
  var existing = await storage.getCustomer(customerId);
  if (!existing) return res.status(404).json({ success: false, error: 'Customer not found' });
  if (body.phone) await storage.registerChannelLink(customerId, 'phone', normalizePhone(body.phone));
  if (body.email) await storage.registerChannelLink(customerId, 'email', normalizeEmail(body.email));
  if (body.appUserId) await storage.registerChannelLink(customerId, 'app', body.appUserId);
  var customer = await storage.getCustomer(customerId);
  res.json({ success: true, customer: customer });
});

// List Customers
app.get('/api/customers', async function(req, res) {
  var customers = await storage.getAllCustomers();
  res.json({ success: true, count: customers.length, customers: customers.map(function(c) {
    return { customerId: c.customerId, name: c.name, email: c.email, phone: c.phone, channels: c.channels, createdAt: c.createdAt };
  })});
});

// Get Customer
app.get('/api/customers/:id', async function(req, res) {
  var customer = await storage.getCustomer(req.params.id);
  if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
  var conversations = await storage.getConversationsByCustomer(req.params.id);
  res.json({ success: true, customer: customer, conversations: conversations });
});

// Get Customer Conversations
app.get('/api/customers/:id/conversations', async function(req, res) {
  var customer = await storage.getCustomer(req.params.id);
  if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
  var conversations = await storage.getConversationsByCustomer(req.params.id);
  conversations.sort(function(a, b) { return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0); });
  res.json({ success: true, customerId: req.params.id, customer: { name: customer.name, email: customer.email, channels: customer.channels }, conversations: conversations, totalConversations: conversations.length });
});

// Get Customer Activity
app.get('/api/customers/:id/activity', async function(req, res) {
  var customer = await storage.getCustomer(req.params.id);
  if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
  var messages = await storage.getMessagesByCustomer(req.params.id);
  res.json({
    success: true,
    customerId: req.params.id,
    totalMessages: messages.length,
    activity: messages.map(function(m) {
      return { messageId: m.id, content: (typeof m.content === 'string' ? m.content.substring(0, 100) : m.content), channel: m.channel, direction: m.direction, createdAt: m.createdAt };
    })
  });
});

// Merge Conversations
app.post('/api/conversations/:id/merge', async function(req, res) {
  var primaryId = req.params.id;
  var body = req.body || {};
  var mergeWith = body.mergeWith || [];
  var toMerge = (body.targetConversationId ? [body.targetConversationId] : []).concat(mergeWith);
  toMerge.unshift(primaryId);
  if (toMerge.length < 2) return res.status(400).json({ success: false, error: 'At least 2 conversations required' });

  var customerId = null;
  var toMergeList = [];
  for (var i = 0; i < toMerge.length; i++) {
    var conv = await storage.getConversation(toMerge[i]);
    if (!conv) return res.status(404).json({ success: false, error: 'Conversation ' + toMerge[i] + ' not found' });
    if (customerId && conv.customerId !== customerId) return res.status(400).json({ success: false, error: 'Cannot merge different customers' });
    customerId = conv.customerId;
    toMergeList.push(toMerge[i]);
  }

  var primary = toMergeList[0];
  var allChannels = {};
  for (var j = 0; j < toMergeList.length; j++) {
    var c = await storage.getConversation(toMergeList[j]);
    if (c && c.channel) allChannels[c.channel] = true;
  }

  await storage.updateConversation(primary, {
    linkedConversations: toMergeList.filter(function(id) { return id !== primary; }),
    mergedAt: new Date().toISOString()
  });

  for (var k = 1; k < toMergeList.length; k++) {
    await storage.updateConversation(toMergeList[k], { mergedInto: primary, status: 'merged', mergedAt: new Date().toISOString() });
  }

  eventsModule.emitConversationMerged({ primaryConversationId: primary, mergedFrom: toMergeList.filter(function(id) { return id !== primary; }), customerId: customerId, channels: Object.keys(allChannels) });

  var customer = await storage.getCustomer(customerId);
  res.json({ success: true, primaryConversationId: primary, mergedFrom: toMergeList.filter(function(id) { return id !== primary; }), customerId: customerId, channels: Object.keys(allChannels), customer: { name: customer ? customer.name : null, email: customer ? customer.email : null, phone: customer ? customer.phone : null } });
});

// Linked Conversations
app.get('/api/conversations/:id/linked', async function(req, res) {
  var conv = await storage.getConversation(req.params.id);
  if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });
  res.json({ success: true, conversationId: req.params.id, customerId: conv.customerId, linkedConversations: conv.linkedConversations || [], mergedFrom: conv.mergedFrom || [], mergedInto: conv.mergedInto || null });
});

// Create Ticket from Conversation
app.post('/api/conversations/:id/ticket', async function(req, res) {
  var conv = await storage.getConversation(req.params.id);
  if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });
  var customer = await storage.getCustomer(conv.customerId);
  try {
    var ticketRes = await fetch(TICKET_ENGINE_URL + '/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-token': INTERNAL_TOKEN },
      body: JSON.stringify({
        subject: conv.subject,
        description: 'From ' + conv.channel + ' conversation ' + req.params.id,
        customer: { id: conv.customerId, name: customer ? customer.name : null, email: customer ? customer.email : null },
        priority: conv.priority || 'medium',
        category: req.body.category || 'general',
        tags: (conv.tags || []).concat(['source:' + conv.channel]),
        source: conv.channel,
        conversationId: req.params.id
      })
    });
    if (ticketRes.ok) {
      var data = await ticketRes.json();
      eventsModule.emitTicketCreated({ ticketId: data.ticket ? data.ticket.id : data.id, conversationId: req.params.id, customerId: conv.customerId, channel: conv.channel });
      res.json({ success: true, ticketId: data.ticket ? data.ticket.id : data.id, ticket: data.ticket });
    } else {
      res.status(502).json({ success: false, error: 'Ticket engine unavailable' });
    }
  } catch(e) {
    res.status(502).json({ success: false, error: 'Ticket engine unreachable' });
  }
});

// Stats
app.get('/api/stats', async function(req, res) {
  var customers = await storage.getAllCustomers();
  var conversations = await storage.getAllConversations();
  var byChannel = {};
  for (var ci = 0; ci < conversations.length; ci++) {
    var ch = conversations[ci].channel;
    byChannel[ch] = (byChannel[ch] || 0) + 1;
  }
  res.json({ success: true, stats: {
    totalCustomers: customers.length,
    totalConversations: conversations.length,
    byChannel: byChannel,
    multiChannelCustomers: customers.filter(function(c) { return (c.channels || []).length > 1; }).length
  }});
});

// Events
eventsModule.attachEventRoutes(app);

// 404
app.use(function(req, res) { res.status(404).json({ error: 'not_found' }); });

// ─── Email Inbound (SMTP) ────────────────────────────────────────────────
var SMTP_PORT = parseInt(process.env.SMTP_PORT || '0', 10);
if (SMTP_PORT > 0) {
  var smtp = emailHandler.createSmtpReceiver(async function(email) {
    var nFrom = normalizeEmail((email.from || {}).email);
    if (!nFrom) return;
    var customerId = await resolveCustomerId({ email: nFrom, name: (email.from || {}).name || null, metadata: { source: 'email', messageId: email.messageId, provider: 'smtp' } });
    var convs = await storage.getConversationsByCustomer(customerId);
    var conversationId = null;
    if (email.inReplyTo) {
      for (var i = 0; i < convs.length; i++) {
        if (convs[i].externalRef === email.inReplyTo) { conversationId = convs[i].id; break; }
      }
    }
    if (!conversationId) {
      var result = await getOrCreateConversation({ customerId: customerId, channel: 'email', subject: email.subject, externalRef: email.messageId });
      conversationId = result.conversationId;
    }
    if (email.text) {
      await addMessage({ conversationId: conversationId, content: email.text, sender: 'customer', channel: 'email', direction: 'inbound', metadata: { messageId: email.messageId, provider: 'smtp' } });
    }
    console.log('[smtp] processed from ' + nFrom + ' -> conv ' + conversationId);
  }, SMTP_PORT);
  smtp.listen(SMTP_PORT, function() { console.log('[smtp] listening on ' + SMTP_PORT); });
}

// ─── IMAP Polling ──────────────────────────────────────────────────────
if (process.env.IMAP_USER && process.env.IMAP_PASSWORD) {
  var imap = emailHandler.createImapPoller(async function(email) {
    var nFrom = normalizeEmail((email.from || {}).email);
    if (!nFrom) return;
    var customerId = await resolveCustomerId({ email: nFrom, name: (email.from || {}).name || null, metadata: { source: 'email', messageId: email.messageId, provider: 'imap' } });
    var convs = await storage.getConversationsByCustomer(customerId);
    var conversationId = null;
    if (email.inReplyTo) {
      for (var i = 0; i < convs.length; i++) {
        if (convs[i].externalRef === email.inReplyTo) { conversationId = convs[i].id; break; }
      }
    }
    if (!conversationId) {
      var result = await getOrCreateConversation({ customerId: customerId, channel: 'email', subject: email.subject, externalRef: email.messageId });
      conversationId = result.conversationId;
    }
    if (email.text) {
      await addMessage({ conversationId: conversationId, content: email.text, sender: 'customer', channel: 'email', direction: 'inbound', metadata: { messageId: email.messageId, provider: 'imap' } });
    }
    console.log('[imap] processed from ' + nFrom);
  }, parseInt(process.env.IMAP_POLL_INTERVAL || '60000', 10));
  imap.start();
}

// ─── Start ─────────────────────────────────────────────────────────────
if (require.main === module) {
  var server = app.listen(PORT, function() {
    console.log('[unified-support-bridge] v2.0.0 listening on ' + PORT);
    console.log('[unified-support-bridge] storage: ' + (process.env.USE_REDIS ? 'redis' : process.env.USE_MONGODB ? 'mongodb' : 'in-memory'));
    console.log('[unified-support-bridge] corpid: ' + CORPID_URL);
    console.log('[unified-support-bridge] unified-inbox: ' + UNIFIED_INBOX_URL);
    console.log('[unified-support-bridge] ticket-engine: ' + TICKET_ENGINE_URL);
    if (process.env.IMAP_USER) console.log('[unified-support-bridge] imap: ' + process.env.IMAP_HOST);
    if (SMTP_PORT > 0) console.log('[unified-support-bridge] smtp: ' + SMTP_PORT);
  });

  // WebSocket
  try {
    eventsModule.initWebSocket(server);
  } catch(e) { console.log('[ws] disabled:', e.message); }

  // Redis pub/sub
  if (process.env.REDIS_URL) {
    eventsModule.initRedisPubSub(process.env.REDIS_URL).catch(function(e) {
      console.warn('[events] Redis pub/sub init failed:', e.message);
    });
  }

  process.on('SIGTERM', function() { server.close(); process.exit(0); });
} else {
  module.exports = { app: app };
}
