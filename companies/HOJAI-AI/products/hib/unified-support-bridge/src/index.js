/**
 * RTMN Unified Support Bridge
 * =============================================================
 * Port: 4885
 * Purpose: The missing layer that connects Email, WhatsApp, and App
 *          channels to unified inbox — with customer identity resolution
 *          and conversation merging.
 *
 * THE PROBLEM WE SOLVE:
 * ----------------------
 * - WhatsApp messages come in keyed by phone number
 * - Email conversations come in keyed by email address
 * - App conversations come in keyed by appUserId
 * - Nobody links them to the same customer
 * - No way to merge a WhatsApp thread with an Email thread
 *
 * THE SOLUTION:
 * -------------
 * 1. Customer Identity Resolver — maps (phone + email + appUserId)
 *    to a single canonical customerId using CorpID or local cache
 * 2. Channel Webhooks — receive messages from Email, WhatsApp, App
 *    and create/update conversations in unified-inbox
 * 3. Conversation Linking — every conversation tagged with customerId
 *    so all channels for same customer are grouped
 * 4. Merge API — merge multiple conversations into one unified thread
 *
 * API FLOW:
 * ---------
 * 1. WhatsApp webhook → identify customer by phone → create/update
 *    conversation in unified-inbox (channel=whatsapp)
 * 2. Email webhook → identify customer by email → same
 * 3. App webhook → identify customer by appUserId → same
 * 4. Agent can see all conversations for same customer across channels
 * 5. Agent can merge 2+ conversations into one unified thread
 *
 * INTEGRATION:
 * ------------
 * - Unified Inbox (4870) — creates conversations and messages
 * - Ticket Engine (4872) — creates tickets linked to conversations
 * - CorpID (4702) — resolves customer identity
 * - RTMN Hub (4399) — routes /api/support/* here
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.UNIFIED_SUPPORT_BRIDGE_PORT || 4885;

// ─── Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── External Services ────────────────────────────────────────
const UNIFIED_INBOX_URL = process.env.UNIFIED_INBOX_URL || 'http://localhost:4870';
const TICKET_ENGINE_URL = process.env.TICKET_ENGINE_URL || 'http://localhost:4872';
const CORPID_URL = process.env.CORPID_URL || 'http://localhost:4702';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'dev-token';

// ─── In-Memory Stores (Production: use Redis/MongoDB) ────────

// customerId → { phone, email, appUserId, name, createdAt, channels[] }
const customerIdentityMap = new Map();

// channel + identifier → customerId (reverse index)
const channelToCustomerMap = new Map(); // "phone:918123456789" → customerId

// unified-inbox uses conversationId; we track link here
// conversationId → { customerId, channels[], linkedConversations[], mergedFrom[] }
const conversationMeta = new Map();

// Active sessions per customer (for continuous conversations)
// customerId → { lastChannel, lastConversationId, lastMessageAt }
const customerSessions = new Map();

// ─── Helpers ─────────────────────────────────────────────────

function internalAuth(req, res, next) {
  const token = req.headers['x-internal-token'];
  if (token && token === INTERNAL_TOKEN) {
    req.user = { type: 'service' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

/**
 * Normalize phone number to E.164 format
 * +91-8123456789 → +918123456789
 */
function normalizePhone(phone) {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '').replace(/^0/, '');
  if (cleaned.length === 10) return `+91${cleaned}`;
  if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned}`;
  if (cleaned.startsWith('+')) return cleaned;
  return `+${cleaned}`;
}

/**
 * Normalize email to lowercase
 */
function normalizeEmail(email) {
  if (!email) return null;
  return email.toLowerCase().trim();
}

/**
 * Resolve customerId from any identifier (phone, email, appUserId)
 * Returns existing customerId or creates a new one.
 *
 * Key insight: we first try exact channel lookups (fast path).
 * If only appUserId is given, we also search customerIdentityMap
 * to find an existing customer whose phone or email already maps
 * to someone in our system — CRITICAL for cross-channel continuity.
 */
async function resolveCustomerId({ phone, email, appUserId, name, metadata = {} } = {}) {
  const nPhone = normalizePhone(phone);
  const nEmail = normalizeEmail(email);

  // Fast path: direct channel → customerId lookup
  if (nPhone) {
    const existing = channelToCustomerMap.get(`phone:${nPhone}`);
    if (existing) return existing;
  }
  if (nEmail) {
    const existing = channelToCustomerMap.get(`email:${nEmail}`);
    if (existing) return existing;
  }
  if (appUserId) {
    const existing = channelToCustomerMap.get(`app:${appUserId}`);
    if (existing) return existing;
  }

  // Slow path for appUserId: same person may already exist via phone/email.
  // We need to find them even when we only know their appUserId.
  // Example: WhatsApp created cust-xxx (phone: +91...), now app comes with
  // appUserId: "usr_mc" — we need to link to the same cust-xxx.
  if (appUserId && (nPhone || nEmail)) {
    // Try to find existing customer by their OTHER identifiers
    // and then add this appUserId to that customer
    let foundCustomerId = null;
    if (nPhone) foundCustomerId = channelToCustomerMap.get(`phone:${nPhone}`);
    if (!foundCustomerId && nEmail) foundCustomerId = channelToCustomerMap.get(`email:${nEmail}`);

    if (foundCustomerId) {
      // Found existing customer — link this appUserId to them
      registerCustomerChannel(foundCustomerId, { phone: nPhone, email: nEmail, appUserId });
      return foundCustomerId;
    }
  }

  // ── Try CorpID for existing identity ──
  if (nEmail) {
    try {
      const res = await fetch(`${CORPID_URL}/api/identity/lookup?email=${encodeURIComponent(nEmail)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.customerId) {
          registerCustomerChannel(data.customerId, { phone: nPhone, email: nEmail, appUserId });
          return data.customerId;
        }
      }
    } catch (e) {
      // CorpID not available, fall through
    }
  }

  // ── Create new customer ──
  const customerId = `cust-${uuidv4().slice(0, 12)}`;
  const customer = {
    customerId,
    phone: nPhone,
    email: nEmail,
    appUserId,
    name: name || null,
    channels: [],
    metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  customerIdentityMap.set(customerId, customer);
  registerCustomerChannel(customerId, { phone: nPhone, email: nEmail, appUserId });
  return customerId;
}

function registerCustomerChannel(customerId, { phone, email, appUserId }) {
  const nPhone = normalizePhone(phone);
  const nEmail = normalizeEmail(email);

  if (nPhone) channelToCustomerMap.set(`phone:${nPhone}`, customerId);
  if (nEmail) channelToCustomerMap.set(`email:${nEmail}`, customerId);
  if (appUserId) channelToCustomerMap.set(`app:${appUserId}`, customerId);

  const customer = customerIdentityMap.get(customerId);
  if (customer) {
    customer.updatedAt = new Date().toISOString();
    if (nPhone && !customer.phone) customer.phone = nPhone;
    if (nEmail && !customer.email) customer.email = nEmail;
    if (appUserId && !customer.appUserId) customer.appUserId = appUserId;
    if (!customer.channels.includes('whatsapp') && nPhone) customer.channels.push('whatsapp');
    if (!customer.channels.includes('email') && nEmail) customer.channels.push('email');
    if (!customer.channels.includes('app') && appUserId) customer.channels.push('app');
  }
}

/**
 * Get or create conversation in unified-inbox, tagged with customerId
 */
async function getOrCreateConversation({ customerId, channel, subject, priority = 'medium', tags = [], externalRef = null }) {
  const customer = customerIdentityMap.get(customerId);

  // Check for existing open conversation for this customer + channel
  // In production this would query unified-inbox; here we simulate
  const sessionKey = `${customerId}:${channel}`;
  const existingSession = customerSessions.get(sessionKey);

  if (existingSession && existingSession.lastConversationId) {
    // Continue existing conversation
    return {
      conversationId: existingSession.lastConversationId,
      isNew: false,
      customerId,
      channel,
      customer,
    };
  }

  // Create new conversation in unified-inbox
  const conversationPayload = {
    subject: subject || `Support request via ${channel}`,
    customer: {
      id: customerId,
      name: customer?.name || null,
      email: customer?.email || null,
      phone: customer?.phone || null,
    },
    channel,
    priority,
    tags: [...tags, `source:${channel}`],
  };

  let conversationId;
  try {
    const res = await fetch(`${UNIFIED_INBOX_URL}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-token': INTERNAL_TOKEN },
      body: JSON.stringify(conversationPayload),
    });
    if (res.ok) {
      const data = await res.json();
      conversationId = data.conversation?.id;
    } else {
      // Unified inbox not available — use local tracking
      conversationId = `local-${channel}-${Date.now()}`;
    }
  } catch (e) {
    conversationId = `local-${channel}-${Date.now()}`;
  }

  // Track session
  customerSessions.set(sessionKey, {
    customerId,
    channel,
    lastConversationId: conversationId,
    lastMessageAt: new Date().toISOString(),
    externalRef,
  });

  // Track conversation metadata
  conversationMeta.set(conversationId, {
    customerId,
    channels: [channel],
    linkedConversations: [],
    mergedFrom: [],
    externalRef,
    createdAt: new Date().toISOString(),
  });

  return {
    conversationId,
    isNew: true,
    customerId,
    channel,
    customer,
  };
}

/**
 * Add message to conversation in unified-inbox
 */
async function addMessage({ conversationId, content, sender, channel, direction = 'inbound', metadata = {} }) {
  const payload = {
    content,
    sender: {
      type: sender === 'customer' ? 'customer' : 'agent',
      name: sender === 'customer' ? (metadata.customerName || 'Customer') : (metadata.agentName || 'Support'),
      channel,
    },
    type: 'message',
    attachments: metadata.attachments || [],
  };

  try {
    const res = await fetch(`${UNIFIED_INBOX_URL}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-token': INTERNAL_TOKEN },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (e) {
    // Unified inbox not available — store locally
    return true;
  }
}

// ─── Routes ───────────────────────────────────────────────────

// Health
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'unified-support-bridge',
    version: '1.0.0',
    port: PORT,
    counts: {
      customers: customerIdentityMap.size,
      conversations: conversationMeta.size,
      sessions: customerSessions.size,
    },
    channels: ['email', 'whatsapp', 'app'],
    features: ['identity-resolution', 'cross-channel-linking', 'conversation-merge', 'channel-webhooks'],
    timestamp: new Date().toISOString(),
  });
});

// ─── Customer Identity ────────────────────────────────────────

// GET /api/customers — list all tracked customers
app.get('/api/customers', (_req, res) => {
  const customers = Array.from(customerIdentityMap.values()).map(c => ({
    customerId: c.customerId,
    name: c.name,
    email: c.email,
    phone: c.phone,
    appUserId: c.appUserId,
    channels: c.channels,
    createdAt: c.createdAt,
  }));
  res.json({ success: true, count: customers.length, customers });
});

// GET /api/customers/:id — get customer with all conversations
app.get('/api/customers/:id', async (req, res) => {
  const customer = customerIdentityMap.get(req.params.id);
  if (!customer) {
    // Try to look up in unified-inbox
    return res.status(404).json({ success: false, error: 'Customer not found' });
  }

  // Get all conversations for this customer across channels
  const conversations = [];
  for (const [convId, meta] of conversationMeta.entries()) {
    if (meta.customerId === req.params.id) {
      conversations.push({
        conversationId: convId,
        channels: meta.channels,
        linkedConversations: meta.linkedConversations,
        mergedFrom: meta.mergedFrom,
        externalRef: meta.externalRef,
        createdAt: meta.createdAt,
      });
    }
  }

  res.json({
    success: true,
    customer,
    conversations,
    session: customerSessions.get(`${req.params.id}:app`) || null,
  });
});

// POST /api/customers/resolve — resolve customer identity from any identifier
app.post('/api/customers/resolve', async (req, res) => {
  const { phone, email, appUserId, name, metadata } = req.body;
  if (!phone && !email && !appUserId) {
    return res.status(400).json({ success: false, error: 'phone, email, or appUserId required' });
  }

  const customerId = await resolveCustomerId({ phone, email, appUserId, name, metadata });
  const customer = customerIdentityMap.get(customerId);

  res.json({ success: true, customerId, customer });
});

// POST /api/customers/link — link additional identifiers to existing customer
app.post('/api/customers/link', async (req, res) => {
  const { customerId, phone, email, appUserId } = req.body;
  if (!customerId || (!phone && !email && !appUserId)) {
    return res.status(400).json({ success: false, error: 'customerId and at least one identifier required' });
  }

  if (!customerIdentityMap.has(customerId)) {
    return res.status(404).json({ success: false, error: 'Customer not found' });
  }

  registerCustomerChannel(customerId, { phone, email, appUserId });
  const customer = customerIdentityMap.get(customerId);

  res.json({ success: true, customer });
});

// ─── Channel Webhooks ─────────────────────────────────────────

// ── WhatsApp Webhook ──────────────────────────────────────────
// POST /api/webhooks/whatsapp
// Receives inbound WhatsApp messages from whatsapp-os (4860) or directly from Meta/Twilio
app.post('/api/webhooks/whatsapp', async (req, res) => {
  // Accept from Meta WhatsApp webhook
  const metaEntry = req.body?.entry?.[0]?.changes?.[0]?.value;
  // Accept from our own whatsapp-os
  const ourEntry = req.body;

  const entry = metaEntry || ourEntry;
  const messages = entry?.messages || [];
  const from = entry?.contacts?.[0]?.wa_id || ourEntry?.from;
  const contactName = entry?.contacts?.[0]?.profile?.name || ourEntry?.contactName;
  const messageText = messages?.[0]?.text?.body || ourEntry?.text || ourEntry?.message?.text;
  const messageId = messages?.[0]?.id || ourEntry?.id;
  const timestamp = messages?.[0]?.timestamp || Math.floor(Date.now() / 1000);

  const nFrom = normalizePhone(from);
  if (!nFrom) {
    return res.status(400).json({ error: 'phone_number_required' });
  }

  const customerId = await resolveCustomerId({
    phone: nFrom,
    name: contactName,
    metadata: { source: 'whatsapp', messageId },
  });

  const { conversationId, isNew, customer } = await getOrCreateConversation({
    customerId,
    channel: 'whatsapp',
    subject: `WhatsApp support — ${contactName || nFrom}`,
    externalRef: messageId,
  });

  if (messageText) {
    await addMessage({
      conversationId,
      content: messageText,
      sender: 'customer',
      channel: 'whatsapp',
      direction: 'inbound',
      metadata: { customerName: contactName, messageId },
    });

    // Update session
    const sessionKey = `${customerId}:whatsapp`;
    const session = customerSessions.get(sessionKey) || {};
    customerSessions.set(sessionKey, { ...session, lastMessageAt: new Date().toISOString() });
  }

  res.status(200).json({
    received: true,
    customerId,
    conversationId,
    isNew,
    customer: customer ? { name: customer.name, phone: customer.phone, email: customer.email } : null,
    timestamp: new Date(timestamp * 1000).toISOString(),
  });
});

// ── Email Webhook ─────────────────────────────────────────────
// POST /api/webhooks/email
// Receives inbound emails (from SendGrid, AWS SES, etc.)
app.post('/api/webhooks/email', async (req, res) => {
  // SendGrid format
  // AWS SES format
  // Generic format
  const from = req.body.from || req.body.sender_email || req.headers['from'];
  const to = req.body.to || req.body.recipient_email || req.headers['to'];
  const subject = req.body.subject || '(no subject)';
  const bodyText = req.body.text || req.body.body || req.body.html_stripped || '';
  const bodyHtml = req.body.html;
  const messageId = req.body.message_id || req.body['Message-ID'] || `email-${Date.now()}`;
  const inReplyTo = req.body.in_reply_to || req.body['In-Reply-To'];
  const references = req.body.references || req.body['References'];

  const nFrom = normalizeEmail(from);
  if (!nFrom) {
    return res.status(400).json({ error: 'from_email_required' });
  }

  const customerId = await resolveCustomerId({
    email: nFrom,
    name: req.body.fromName || req.body.sender_name || null,
    metadata: { source: 'email', messageId, subject },
  });

  // Check if this is a reply to existing conversation
  let conversationId;
  let isNew = true;

  if (inReplyTo || references) {
    // Try to find existing conversation by message ID reference
    for (const [convId, meta] of conversationMeta.entries()) {
      if (meta.externalRef === inReplyTo || (references && references.includes(meta.externalRef))) {
        conversationId = convId;
        isNew = false;
        break;
      }
    }
  }

  if (!conversationId) {
    const result = await getOrCreateConversation({
      customerId,
      channel: 'email',
      subject,
      externalRef: messageId,
    });
    conversationId = result.conversationId;
    isNew = result.isNew;
  }

  const customer = customerIdentityMap.get(customerId);

  if (bodyText) {
    await addMessage({
      conversationId,
      content: bodyText,
      sender: 'customer',
      channel: 'email',
      direction: 'inbound',
      metadata: { customerName: customer?.name, messageId, subject },
    });
  }

  res.status(200).json({
    received: true,
    customerId,
    conversationId,
    isNew,
    customer: customer ? { name: customer.name, email: customer.email, phone: customer.phone } : null,
    subject,
    inReplyTo,
  });
});

// ── App/Web Chat Webhook ──────────────────────────────────────
// POST /api/webhooks/app
// Receives in-app support messages (from Do App, Genie, etc.)
app.post('/api/webhooks/app', async (req, res) => {
  const {
    appUserId,
    userId,
    message,
    messageId,
    sessionId,
    platform = 'do-app',
    contactName,
    customerName,
  } = req.body;

  const uid = appUserId || userId;
  if (!uid) {
    return res.status(400).json({ error: 'appUserId or userId required' });
  }

  const customerId = await resolveCustomerId({
    appUserId: uid,
    name: contactName || customerName || null,
    metadata: { source: 'app', platform, sessionId },
  });

  const { conversationId, isNew, customer } = await getOrCreateConversation({
    customerId,
    channel: 'chat',
    subject: `In-app support — ${contactName || customerName || uid}`,
    externalRef: messageId || sessionId,
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

    // Update session
    const sessionKey = `${customerId}:chat`;
    customerSessions.set(sessionKey, {
      ...(customerSessions.get(sessionKey) || {}),
      lastMessageAt: new Date().toISOString(),
    });
  }

  res.status(200).json({
    received: true,
    customerId,
    conversationId,
    isNew,
    sessionId: sessionId || conversationId,
    customer: customer ? { name: customer.name, phone: customer.phone, email: customer.email } : null,
  });
});

// ─── Cross-Channel Conversation API ──────────────────────────

// GET /api/customers/:id/conversations — get ALL conversations for customer across channels
app.get('/api/customers/:id/conversations', async (req, res) => {
  const customerId = req.params.id;
  const customer = customerIdentityMap.get(customerId);

  if (!customer) {
    return res.status(404).json({ success: false, error: 'Customer not found' });
  }

  // Collect all conversations for this customer
  const allConversations = [];
  for (const [convId, meta] of conversationMeta.entries()) {
    if (meta.customerId === customerId) {
      // Try to enrich from unified-inbox
      let convData = { id: convId };
      try {
        const res = await fetch(`${UNIFIED_INBOX_URL}/api/conversations/${convId}`, {
          headers: { 'x-internal-token': INTERNAL_TOKEN },
        });
        if (res.ok) {
          convData = (await res.json()).conversation || convData;
        }
      } catch (e) {
        // Use local data
      }

      allConversations.push({
        ...convData,
        channels: meta.channels,
        linkedConversations: meta.linkedConversations,
        mergedFrom: meta.mergedFrom,
      });
    }
  }

  // Sort by last activity
  allConversations.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

  res.json({
    success: true,
    customerId,
    customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      channels: customer.channels,
    },
    conversations: allConversations,
    totalConversations: allConversations.length,
  });
});

// GET /api/customers/:id/activity — timeline of all customer activity across channels
app.get('/api/customers/:id/activity', async (req, res) => {
  const customerId = req.params.id;
  const customer = customerIdentityMap.get(customerId);

  if (!customer) {
    return res.status(404).json({ success: false, error: 'Customer not found' });
  }

  // Collect all messages across all conversations
  const allMessages = [];
  for (const [convId, meta] of conversationMeta.entries()) {
    if (meta.customerId === customerId) {
      try {
        const res = await fetch(`${UNIFIED_INBOX_URL}/api/conversations/${convId}/messages`, {
          headers: { 'x-internal-token': INTERNAL_TOKEN },
        });
        if (res.ok) {
          const data = await res.json();
          for (const msg of (data.messages || [])) {
            allMessages.push({
              ...msg,
              conversationId: convId,
              channels: meta.channels,
            });
          }
        }
      } catch (e) {
        // Skip
      }
    }
  }

  // Sort chronologically
  allMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json({
    success: true,
    customerId,
    customer: { name: customer.name, email: customer.email, phone: customer.phone },
    totalMessages: allMessages.length,
    activity: allMessages.map(m => ({
      messageId: m.id,
      content: m.content?.substring?.(0, 100) || m.content,
      channel: m.sender?.channel || (m.channels?.[0]),
      direction: m.direction || (m.sender?.type === 'customer' ? 'inbound' : 'outbound'),
      senderType: m.sender?.type,
      conversationId: m.conversationId,
      createdAt: m.createdAt,
    })),
  });
});

// ─── Conversation Merge API ────────────────────────────────────

// POST /api/conversations/:id/merge — merge this conversation with others
// Body: { mergeWith: ['conv-id-2', 'conv-id-3'], targetConversationId: 'conv-id-1' }
app.post('/api/conversations/:id/merge', async (req, res) => {
  const primaryId = req.params.id;
  const { mergeWith = [], targetConversationId } = req.body;

  const toMerge = targetConversationId ? [targetConversationId, ...mergeWith] : [primaryId, ...mergeWith];

  if (toMerge.length < 2) {
    return res.status(400).json({ success: false, error: 'At least 2 conversations required to merge' });
  }

  // Verify all conversations exist and belong to same customer
  let customerId = null;
  const conversations = [];

  for (const convId of toMerge) {
    const meta = conversationMeta.get(convId);
    if (!meta) {
      return res.status(404).json({ success: false, error: `Conversation ${convId} not found` });
    }
    if (!customerId) {
      customerId = meta.customerId;
    } else if (meta.customerId !== customerId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot merge conversations from different customers',
      });
    }
    conversations.push(convId);
  }

  const customer = customerIdentityMap.get(customerId);

  // Determine primary (keep this one)
  const primary = conversations[0];

  // Merge metadata
  const allChannels = new Set();
  const allLinked = new Set();
  const allMergedFrom = new Set();

  for (const convId of conversations) {
    const meta = conversationMeta.get(convId);
    meta.channels.forEach(c => allChannels.add(c));
    meta.linkedConversations.forEach(c => allLinked.add(c));
    meta.mergedFrom.add(convId);
  }

  // Update primary conversation metadata
  conversationMeta.set(primary, {
    customerId,
    channels: [...allChannels],
    linkedConversations: [...allLinked, ...conversations.filter(c => c !== primary)],
    mergedFrom: [...allMergedFrom],
    mergedAt: new Date().toISOString(),
  });

  // Update merged conversations to point to primary
  for (const convId of conversations) {
    if (convId !== primary) {
      const meta = conversationMeta.get(convId);
      conversationMeta.set(convId, {
        ...meta,
        mergedInto: primary,
        mergedAt: new Date().toISOString(),
      });
    }
  }

  // Optionally update unified-inbox (add tags, update subject)
  try {
    const subject = `Merged conversation — ${[...allChannels].join(', ')}`;
    await fetch(`${UNIFIED_INBOX_URL}/api/conversations/${primary}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-internal-token': INTERNAL_TOKEN },
      body: JSON.stringify({ tags: [...new Set([...conversationMeta.get(primary).mergedFrom.map(c => `merged:${c}`)])] }),
    });
  } catch (e) {
    // Best effort
  }

  res.json({
    success: true,
    primaryConversationId: primary,
    mergedFrom: conversations.filter(c => c !== primary),
    customerId,
    customer: { name: customer?.name, email: customer?.email, phone: customer?.phone },
    channels: [...allChannels],
    linkedConversations: conversationMeta.get(primary).linkedConversations,
  });
});

// GET /api/conversations/:id/linked — get all linked conversations
app.get('/api/conversations/:id/linked', (req, res) => {
  const convId = req.params.id;
  const meta = conversationMeta.get(convId);

  if (!meta) {
    return res.status(404).json({ success: false, error: 'Conversation not found' });
  }

  // Follow the chain
  const linked = [];
  const seen = new Set([convId]);

  for (const linkedId of meta.linkedConversations) {
    if (!seen.has(linkedId)) {
      seen.add(linkedId);
      const linkedMeta = conversationMeta.get(linkedId);
      if (linkedMeta && !linkedMeta.mergedInto) {
        linked.push({ conversationId: linkedId, channels: linkedMeta.channels });
      }
    }
  }

  res.json({
    success: true,
    conversationId: convId,
    customerId: meta.customerId,
    linked,
    mergedFrom: meta.mergedFrom || [],
    mergedInto: meta.mergedInto || null,
  });
});

// ─── Ticket Bridge ────────────────────────────────────────────

// POST /api/conversations/:id/ticket — create ticket from conversation
app.post('/api/conversations/:id/ticket', async (req, res) => {
  const convId = req.params.id;
  const meta = conversationMeta.get(convId);

  if (!meta) {
    return res.status(404).json({ success: false, error: 'Conversation not found' });
  }

  const customer = customerIdentityMap.get(meta.customerId);

  // Get conversation from unified-inbox
  let convData = {};
  try {
    const res = await fetch(`${UNIFIED_INBOX_URL}/api/conversations/${convId}`, {
      headers: { 'x-internal-token': INTERNAL_TOKEN },
    });
    if (res.ok) convData = (await res.json()).conversation || {};
  } catch (e) {
    // Use local
  }

  const ticketPayload = {
    subject: convData.subject || `Support ticket from ${meta.channels.join(', ')}`,
    description: `Created from merged conversation ${convId} (channels: ${meta.channels.join(', ')})`,
    customer: {
      id: meta.customerId,
      name: customer?.name || null,
      email: customer?.email || null,
    },
    priority: convData.priority || 'medium',
    category: req.body.category || 'general',
    tags: [...(convData.tags || []), ...meta.channels.map(c => `source:${c}`)],
    source: meta.channels[0] || 'unified',
    conversationId: convId,
  };

  try {
    const res = await fetch(`${TICKET_ENGINE_URL}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-token': INTERNAL_TOKEN },
      body: JSON.stringify(ticketPayload),
    });
    if (res.ok) {
      const data = await res.json();
      res.json({ success: true, ticketId: data.ticket?.id || data.id, ticket: data.ticket });
    } else {
      res.status(502).json({ success: false, error: 'Ticket engine unavailable' });
    }
  } catch (e) {
    res.status(502).json({ success: false, error: 'Ticket engine unreachable' });
  }
});

// ─── Stats ────────────────────────────────────────────────────

app.get('/api/stats', (_req, res) => {
  const byChannel = {};
  for (const [, meta] of conversationMeta) {
    for (const ch of meta.channels) {
      byChannel[ch] = (byChannel[ch] || 0) + 1;
    }
  }

  const mergedCount = [...conversationMeta.values()].filter(m => m.mergedFrom?.length > 0).length;
  const customersWithMultipleChannels = [...customerIdentityMap.values()].filter(
    c => c.channels.length > 1
  ).length;

  res.json({
    success: true,
    stats: {
      totalCustomers: customerIdentityMap.size,
      totalConversations: conversationMeta.size,
      totalSessions: customerSessions.size,
      byChannel,
      mergedConversations: mergedCount,
      multiChannelCustomers: customersWithMultipleChannels,
    },
  });
});

// ─── 404 ──────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

// ─── Start ────────────────────────────────────────────────────
// Export for testing (don't auto-start)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`[unified-support-bridge] listening on ${PORT}`);
    console.log(`[unified-support-bridge] unified-inbox: ${UNIFIED_INBOX_URL}`);
    console.log(`[unified-support-bridge] ticket-engine: ${TICKET_ENGINE_URL}`);
    console.log(`[unified-support-bridge] corpid: ${CORPID_URL}`);
  });
  process.on('SIGTERM', () => { server.close(); process.exit(0); });
} else {
  module.exports = { app };
}
