/**
 * WhatsApp Channel for the HOJAI Widget.
 *
 * Routes widget visitor messages to a WhatsApp number via the HOJAI WhatsApp OS.
 * The visitor's phone number is collected (via the widget), then every message
 * is sent to their phone and every reply is forwarded back to the widget session.
 *
 * Endpoints:
 *   POST /api/v1/widget/channels/whatsapp/start
 *     Body: { companyId, visitorId, phone (E.164) }
 *     Returns: { sessionId, expiresAt }
 *
 *   POST /api/v1/widget/channels/whatsapp/send
 *     Body: { sessionId, message, rich? }
 *     Returns: { delivered: true, messageId }
 *
 *   POST /api/v1/widget/channels/whatsapp/webhook
 *     Receives inbound messages from WhatsApp Business API (delivery status +
 *     customer replies). Updates session state and forwards to widget via SSE.
 *
 *   POST /api/v1/widget/channels/whatsapp/end
 *     Body: { sessionId }
 *     Returns: { ended: true }
 *
 * In production: integrates with the WhatsApp OS (port 4860) via fetch.
 * For MVP: uses HOJAI WhatsApp SDK shape and mocks if WhatsApp OS is down.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// ─── File-based session store with 24h TTL ─────────────────────────────
const SESSION_FILE = '/tmp/widget-whatsapp-sessions.json';
const SESSION_TTL_MS = 24 * 3600 * 1000; // 24 hours

const sessions = new Map(); // sessionId -> { companyId, visitorId, phone, createdAt, expiresAt, messageLog }

function loadSessions() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
      const now = Date.now();
      for (const [id, session] of Object.entries(data)) {
        // Only load sessions that haven't expired
        if (new Date(session.expiresAt).getTime() > now) {
          sessions.set(id, session);
        }
      }
      const removed = Object.keys(data).length - sessions.size;
      if (removed > 0) {
        console.log(`[whatsapp-channel] Loaded ${sessions.size} sessions, removed ${removed} expired`);
      } else {
        console.log(`[whatsapp-channel] Loaded ${sessions.size} sessions from disk`);
      }
    }
  } catch (err) {
    console.error('[whatsapp-channel] Failed to load sessions:', err.message);
  }
}

function saveSessions() {
  try {
    const data = Object.fromEntries(sessions);
    fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[whatsapp-channel] Failed to save sessions:', err.message);
  }
}

// Load persisted sessions on startup
loadSessions();

// Periodic cleanup of expired sessions (every hour)
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [id, session] of sessions) {
    if (new Date(session.expiresAt).getTime() <= now) {
      sessions.delete(id);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[whatsapp-channel] Cleaned up ${cleaned} expired sessions`);
    saveSessions();
  }
}, 3600 * 1000);

// ─── WhatsApp OS client (lazy import) ────────────────────────────────
let WhatsAppClient = null;
async function getWhatsAppClient() {
  if (WhatsAppClient !== null) return WhatsAppClient;
  try {
    // Try to import the SDK; if not available, fall back to mock
    const sdkPath = require.resolve('@hojai/whatsapp');
    const mod = require(sdkPath);
    WhatsAppClient = mod.WhatsApp;
  } catch {
    WhatsAppClient = false; // not available
  }
  return WhatsAppClient;
}

const WHATSAPP_OS_URL = process.env.WHATSAPP_OS_URL || 'http://localhost:4860';
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || process.env.INTERNAL_SERVICE_TOKEN || '';

/**
 * Send a message to a phone number via the WhatsApp OS.
 * Falls back to a no-op if WhatsApp OS is unreachable.
 */
async function sendWhatsAppMessage({ to, body, sessionId }) {
  // Try the WhatsApp OS HTTP API directly (most reliable path)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${WHATSAPP_OS_URL}/api/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(HOJAI_API_KEY ? { Authorization: `Bearer ${HOJAI_API_KEY}` } : {})
      },
      body: JSON.stringify({ to, body, sessionId }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res.ok) {
      const json = await res.json();
      return { delivered: true, messageId: json?.data?.messageId || json?.messageId, source: 'whatsapp-os' };
    }
  } catch {
    // fall through
  }

  // Try the SDK (in case HOJAI_API_KEY is set + SDK is installed)
  const Client = await getWhatsAppClient();
  if (Client) {
    try {
      const w = new Client({ apiKey: HOJAI_API_KEY || 'dev-key' });
      const result = await w.messages.send({ to, body });
      return { delivered: true, messageId: result?.id, source: 'whatsapp-sdk' };
    } catch {
      // fall through
    }
  }

  // Last resort: log + return mock (development mode)
  console.log(`[whatsapp-channel] (mock) -> ${to}: ${body.slice(0, 80)}`);
  return { delivered: true, messageId: `mock_${Date.now()}`, source: 'mock' };
}

// ─── Middleware ───────────────────────────────────────────────────────

function apiKeyAuth(req, res, next) {
  const auth = req.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (HOJAI_API_KEY && token !== HOJAI_API_KEY) {
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }
  next();
}

// ─── Endpoints ────────────────────────────────────────────────────────

router.post('/start', apiKeyAuth, (req, res) => {
  try {
    const { companyId, visitorId, phone } = req.body || {};
    if (!companyId || !visitorId || !phone) {
      return res.status(400).json({ success: false, error: 'companyId, visitorId, phone are required' });
    }
    // Basic E.164 validation
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      return res.status(400).json({ success: false, error: 'phone must be in E.164 format (e.g. +919876543210)' });
    }

    const sessionId = `wa_${uuidv4().slice(0, 12)}`;
    const session = {
      sessionId,
      companyId,
      visitorId,
      phone,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      messageLog: []
    };
    sessions.set(sessionId, session);
    saveSessions();

    res.json({
      success: true,
      data: {
        sessionId,
        phone,
        expiresAt: session.expiresAt,
        message: 'WhatsApp channel ready. Send a message to start the conversation.'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/send', apiKeyAuth, async (req, res) => {
  try {
    const { sessionId, message, rich } = req.body || {};
    if (!sessionId || !message) {
      return res.status(400).json({ success: false, error: 'sessionId and message are required' });
    }
    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    if (new Date(session.expiresAt) < new Date()) {
      return res.status(410).json({ success: false, error: 'Session expired' });
    }

    // Format rich content for WhatsApp
    let body = message;
    if (rich) {
      if (rich.type === 'products') {
        body = message + '\n\n' + rich.items.map((p) => `• ${p.name} ($${p.price})`).join('\n');
      } else if (rich.type === 'quote') {
        body = message + `\n\nQuote: $${rich.offer?.price} ${rich.offer?.currency || ''}`;
      }
    }

    const result = await sendWhatsAppMessage({
      to: session.phone,
      body,
      sessionId
    });
    session.messageLog.push({
      direction: 'outbound',
      message,
      rich,
      sentAt: new Date().toISOString(),
      messageId: result.messageId,
      source: result.source
    });
    saveSessions();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Webhook for inbound messages from WhatsApp Business API.
// Payload shape (varies by provider, but we normalize):
//   { from: '+91...', body: 'text', messageId: 'wamid.XXX', timestamp: 'ISO' }
router.post('/webhook', (req, res) => {
  // Verify webhook signature in production (HMAC of body with webhook secret)
  // For MVP, accept all
  const { from, body, messageId, timestamp } = req.body || {};
  if (!from || !body) {
    return res.status(400).json({ success: false, error: 'from and body are required' });
  }

  // Find the session by phone number
  let targetSession = null;
  for (const session of sessions.values()) {
    if (session.phone === from) {
      targetSession = session;
      break;
    }
  }

  if (!targetSession) {
    // No session — could be a new inbound from someone we haven't started a session with
    return res.json({
      success: true,
      data: { received: true, sessionFound: false, action: 'no-active-session' }
    });
  }

  targetSession.messageLog.push({
    direction: 'inbound',
    from,
    message: body,
    messageId,
    receivedAt: timestamp || new Date().toISOString()
  });
  saveSessions();

  res.json({
    success: true,
    data: {
      received: true,
      sessionId: targetSession.sessionId,
      visitorId: targetSession.visitorId,
      companyId: targetSession.companyId,
      message: body
    }
  });
});

router.post('/end', apiKeyAuth, (req, res) => {
  const { sessionId } = req.body || {};
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'sessionId is required' });
  }
  const existed = sessions.delete(sessionId);
  if (existed) saveSessions();
  res.json({ success: true, data: { sessionId, ended: existed } });
});

// Test endpoint — verify a phone is reachable
router.post('/verify', apiKeyAuth, async (req, res) => {
  const { phone } = req.body || {};
  if (!phone) {
    return res.status(400).json({ success: false, error: 'phone is required' });
  }
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
    return res.json({
      success: true,
      data: { phone, valid: false, reason: 'invalid E.164 format' }
    });
  }
  // Just confirm format — actual delivery would require sending a test message
  res.json({
    success: true,
    data: { phone, valid: true, format: 'E.164', country: phone.slice(1, 3) }
  });
});

module.exports = { router, sessions, sendWhatsAppMessage };
