/**
 * WhatsApp Webhook Manager
 * =========================
 * Handles WhatsApp webhook verification and routing for Meta, Twilio, and 360dialog.
 *
 * WhatsApp requires you to verify a webhook endpoint with a challenge token
 * before it will send you messages. This module handles:
 *
 * 1. Webhook verification (GET challenge response)
 * 2. Message signing verification (X-Hub-Signature-256)
 * 3. Multi-provider abstraction (Meta, Twilio, 360dialog)
 * 4. Webhook registration via provider APIs
 *
 * Supported providers:
 * - Meta WhatsApp Cloud API
 * - Twilio WhatsApp
 * - 360dialog
 */

const crypto = require('crypto');

/**
 * Verify WhatsApp Cloud API webhook
 * GET /webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>
 */
function verifyWhatsAppChallenge(query, expectedToken) {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode !== 'subscribe') {
    return { verified: false, challenge: null, error: 'unknown_mode' };
  }

  if (token !== expectedToken) {
    return { verified: false, challenge: null, error: 'token_mismatch' };
  }

  return { verified: true, challenge, error: null };
}

/**
 * Verify Meta WhatsApp message signature
 * X-Hub-Signature-256: sha256=<signature>
 *
 * The signature is HMAC-SHA256 of the raw request body, using the webhook verify token
 * as the key (or the app secret for production).
 */
function verifyMetaSignature(rawBody, signature, appSecret) {
  if (!signature || !rawBody) return false;

  const expected = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  const hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(rawBody);
  const computed = hmac.digest('hex');

  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expected));
}

/**
 * Verify Twilio WhatsApp signature
 * Uses Twilio's auth token as the signing key.
 */
function verifyTwilioSignature(rawBody, signature, authToken) {
  if (!signature || !rawBody) return false;

  const expected = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  const hmac = crypto.createHmac('sha256', authToken);
  hmac.update(rawBody);
  const computed = hmac.digest('hex');

  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expected));
}

/**
 * Parse WhatsApp Cloud API webhook payload
 * Normalizes Meta's format to our internal WhatsAppMessage format.
 */
function parseWhatsAppPayload(body, rawBody = null) {
  // Meta WhatsApp Cloud API format
  if (body.entry) {
    const entry = body.entry[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages || [];

    return messages.map((msg) => ({
      messageId: msg.id,
      from: normalizePhone(msg.from),
      contactName: value?.contacts?.find(c => c.wa_id === msg.from)?.profile?.name || null,
      messageType: msg.type,
      text: msg.text?.body || null,
      image: msg.image ? {
        id: msg.image.id,
        mimeType: msg.image.mime_type,
        sha256: msg.image.sha256,
        caption: msg.image.caption,
      } : null,
      audio: msg.audio ? {
        id: msg.audio.id,
        mimeType: msg.audio.mime_type,
        voice: msg.audio.voice,
      } : null,
      video: msg.video ? {
        id: msg.video.id,
        mimeType: msg.video.mime_type,
        caption: msg.video.caption,
      } : null,
      document: msg.document ? {
        id: msg.document.id,
        mimeType: msg.document.mime_type,
        filename: msg.document.filename,
        caption: msg.document.caption,
      } : null,
      location: msg.location ? {
        latitude: msg.location.latitude,
        longitude: msg.location.longitude,
        name: msg.location.name,
        address: msg.location.address,
      } : null,
      sticker: msg.sticker ? { id: msg.sticker.id } : null,
      reaction: msg.reaction ? { emoji: msg.reaction.emoji, messageId: msg.reaction.message_id } : null,
      timestamp: parseInt(msg.timestamp, 10) ? new Date(parseInt(msg.timestamp, 10) * 1000) : new Date(),
      raw: msg,
    }));
  }

  // Our own whatsapp-os format
  if (body.from && body.message) {
    return [{
      messageId: body.id || body.messageId || `wa-${Date.now()}`,
      from: normalizePhone(body.from),
      contactName: body.contactName || body.profile?.name || null,
      messageType: body.messageType || 'text',
      text: body.text || body.message?.text || null,
      timestamp: body.timestamp ? new Date(parseInt(body.timestamp, 10) * 1000) : new Date(),
      raw: body,
    }];
  }

  // Twilio format (x-www-form-urlencoded)
  if (body.From && body.Body) {
    return [{
      messageId: body.MessageSid || `tw-${Date.now()}`,
      from: normalizePhone(body.From?.replace('whatsapp:', '')),
      contactName: null,
      messageType: 'text',
      text: body.Body,
      timestamp: body.Timestamp ? new Date(body.Timestamp) : new Date(),
      raw: body,
    }];
  }

  return [];
}

/**
 * Normalize WhatsApp phone number to E.164
 */
function normalizePhone(phone) {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 13) return `+${cleaned}`;
  if (cleaned.length === 10) return `+91${cleaned}`;
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length > 10) return `+${cleaned}`;
  return null;
}

/**
 * Webhook Registration via Provider APIs
 * These functions register your webhook URL with the provider so they start sending events.
 */

// Register with Meta WhatsApp Cloud API
async function registerMetaWebhook(accessToken, phoneNumberId, webhookUrl, verifyToken) {
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/whatsapp_business_webhooks`;

  try {
    const params = new URLSearchParams({
      access_token: accessToken,
    });

    const res = await fetch(`${url}?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          webhook_url: webhookUrl,
          webhook_verify_token: verifyToken,
        },
      }),
    });

    const data = await res.json();
    if (res.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.error?.message || 'Unknown error', data };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Register with 360dialog
async function register360dialogWebhook(apiKey, webhookUrl, verifyToken) {
  try {
    const res = await fetch('https://waba.360dialog.io/v1/configs/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'D360-API-Key': apiKey,
      },
      body: JSON.stringify({
        webhook_url: webhookUrl,
        webhook_verify_token: verifyToken,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.error || 'Unknown error', data };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Register with Twilio (via Twilio's webhook configuration API)
async function registerTwilioWebhook(accountSid, authToken, whatsappNumber, webhookUrl) {
  try {
    // Twilio uses a separate WhatsApp sandbox/config endpoint
    const res = await fetch(
      `https://flex-api.twilio.com/v1/Channels/WA${whatsappNumber.replace(/[^0-9]/g, '')}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_service_sid: '',
          inbound_url: webhookUrl,
          target: whatsappNumber,
        }),
      }
    );

    const data = await res.json();
    if (res.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.message || 'Unknown error', data };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * WhatsApp Webhook Router
 * Middleware that:
 * 1. Verifies challenge (GET) or signature (POST)
 * 2. Parses messages
 * 3. Calls your handler for each message
 */
function createWhatsAppWebhookMiddleware(options) {
  options = options || {};
  var verifyToken = options.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN || 'change-me';
  // Only verify signatures if appSecret is EXPLICITLY set (not the default placeholder)
  var appSecret = options.appSecret || (process.env.WHATSAPP_APP_SECRET && process.env.WHATSAPP_APP_SECRET !== verifyToken ? process.env.WHATSAPP_APP_SECRET : null);
  var authToken = options.authToken || process.env.TWILIO_AUTH_TOKEN;
  var provider = options.provider || process.env.WHATSAPP_PROVIDER || 'meta';
  var onMessages = options.onMessages || function() {};
  var onDeliveryStatus = options.onDeliveryStatus || function() {};
  var onReadReceipt = options.onReadReceipt || function() {};
    onReadReceipt = async (receipt) => {},
  } = options;

  async function handleRequest(req, res) {
    const rawBody = req.rawBody || JSON.stringify(req.body);

    // ── GET = webhook verification ──
    if (req.method === 'GET') {
      const result = verifyWhatsAppChallenge(req.query, verifyToken);
      if (result.verified) {
        console.log('[whatsapp-webhook] Verified! challenge:', result.challenge);
        res.set('Content-Type', 'text/plain');
        res.send(result.challenge);
      } else {
        console.warn('[whatsapp-webhook] Verification failed:', result.error);
        res.status(403).send('Forbidden');
      }
      return { handled: true };
    }

    // ── POST = incoming messages ──
    if (req.method !== 'POST') {
      return { handled: false };
    }

    // Verify signature based on provider
    const signature = req.headers['x-hub-signature-256'] ||
                      req.headers['x-twilio-signature'] || '';

    let signatureValid = true;
    if (provider === 'twilio' && authToken) {
      signatureValid = verifyTwilioSignature(rawBody, signature, authToken);
    } else if (provider === 'meta' && appSecret) {
      signatureValid = verifyMetaSignature(rawBody, signature, appSecret);
    }

    if (!signatureValid) {
      console.warn('[whatsapp-webhook] Invalid signature from provider:', provider);
      res.status(403).send('Forbidden');
      return { handled: true };
    }

    // Acknowledge immediately (Meta requires this within 20s)
    res.status(200).send('OK');

    // Parse and handle messages
    const messages = parseWhatsAppPayload(req.body, rawBody);
    const meta = {
      provider,
      raw: req.body,
      timestamp: new Date(),
    };

    // Handle message statuses (delivered, read, failed)
    if (req.body.entry?.[0]?.changes?.[0]?.value?.statuses) {
      for (const status of req.body.entry[0].changes[0].value.statuses) {
        await onDeliveryStatus({
          messageId: status.id,
          status: status.status, // sent | delivered | read | failed
          timestamp: new Date(parseInt(status.timestamp, 10) * 1000),
          recipient: normalizePhone(status.recipient_id),
          metadata: status,
        }).catch(e => console.error('[whatsapp-webhook] status handler error:', e));
      }
      return { handled: true };
    }

    // Handle read receipts
    if (req.body.entry?.[0]?.changes?.[0]?.value?.reads) {
      for (const read of req.body.entry[0].changes[0].value.reads) {
        await onReadReceipt({
          messageId: read.message_id,
          timestamp: new Date(parseInt(read.timestamp, 10) * 1000),
          recipient: normalizePhone(read.actor_id),
        }).catch(e => console.error('[whatsapp-webhook] read handler error:', e));
      }
      return { handled: true };
    }

    // Handle actual messages
    for (const msg of messages) {
      await onMessages(msg, meta).catch(e =>
        console.error('[whatsapp-webhook] message handler error:', e)
      );
    }

    return { handled: true };
  }

  return {
    handleRequest,
    verifyWhatsAppChallenge: (q) => verifyWhatsAppChallenge(q, verifyToken),
    verifyMetaSignature: (body, sig) => verifyMetaSignature(body, sig, appSecret),
    verifyTwilioSignature: (body, sig) => verifyTwilioSignature(body, sig, authToken),
    parseWhatsAppPayload,
    normalizePhone,
  };
}

module.exports = {
  verifyWhatsAppChallenge,
  verifyMetaSignature,
  verifyTwilioSignature,
  parseWhatsAppPayload,
  normalizePhone,
  createWhatsAppWebhookMiddleware,
  registerMetaWebhook,
  register360dialogWebhook,
  registerTwilioWebhook,
};
