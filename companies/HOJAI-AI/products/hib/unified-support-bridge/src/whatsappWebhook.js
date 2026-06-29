'use strict';

var crypto = require('crypto');

function verifyWhatsAppChallenge(query, expectedToken) {
  var mode = query['hub.mode'];
  var token = query['hub.verify_token'];
  var challenge = query['hub.challenge'];
  if (mode !== 'subscribe') return { verified: false, challenge: null, error: 'unknown_mode' };
  if (token !== expectedToken) return { verified: false, challenge: null, error: 'token_mismatch' };
  return { verified: true, challenge: challenge, error: null };
}

function verifyMetaSignature(rawBody, signature, appSecret) {
  if (!signature || !rawBody) return false;
  var expected = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  var hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(rawBody);
  var computed = hmac.digest('hex');
  try { return Buffer.compare(Buffer.from(computed), Buffer.from(expected)) === 0; }
  catch (e) { return false; }
}

function verifyTwilioSignature(rawBody, signature, authToken) {
  if (!signature || !rawBody) return false;
  var expected = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  var hmac = crypto.createHmac('sha256', authToken);
  hmac.update(rawBody);
  var computed = hmac.digest('hex');
  try { return Buffer.compare(Buffer.from(computed), Buffer.from(expected)) === 0; }
  catch (e) { return false; }
}

function normalizePhone(phone) {
  if (!phone) return null;
  var cleaned = String(phone).replace(/[^\d+]/g, '');
  if (cleaned.length === 10) return '+91' + cleaned;
  if (cleaned.length === 12 && cleaned.startsWith('91')) return '+' + cleaned;
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length > 10) return '+' + cleaned;
  return null;
}

function parseWhatsAppPayload(body) {
  if (body && body.entry) {
    var entry = body.entry[0];
    var changes = entry && entry.changes && entry.changes[0];
    var value = changes && changes.value;
    var messages = value && value.messages ? value.messages : [];
    return messages.map(function(msg) {
      var result = {
        messageId: msg.id,
        from: normalizePhone(msg.from),
        contactName: null,
        messageType: msg.type,
        text: msg.text ? msg.text.body : null,
        timestamp: new Date(),
        raw: msg,
      };
      var contacts = value.contacts || [];
      for (var ci = 0; ci < contacts.length; ci++) {
        if (contacts[ci].wa_id === msg.from) {
          result.contactName = contacts[ci].profile ? contacts[ci].profile.name : null;
          break;
        }
      }
      return result;
    });
  }
  // Simple dev/test format: { from, text, contactName }
  if (body && body.from && (body.text || body.message)) {
    return [{
      messageId: body.id || body.messageId || 'wa-' + Date.now(),
      from: normalizePhone(body.from),
      contactName: body.contactName || null,
      messageType: 'text',
      text: body.text || body.message,
      timestamp: new Date(),
      raw: body,
    }];
  }
  // Twilio WhatsApp format
  if (body && body.From && body.Body) {
    return [{
      messageId: body.MessageSid || 'tw-' + Date.now(),
      from: normalizePhone(body.From ? body.From.replace('whatsapp:', '') : body.from),
      contactName: null,
      messageType: 'text',
      text: body.Body,
      timestamp: new Date(),
      raw: body,
    }];
  }
  return [];
}

async function registerMetaWebhook(accessToken, phoneNumberId, webhookUrl, verifyToken) {
  var url = 'https://graph.facebook.com/v18.0/' + phoneNumberId + '/whatsapp_business_webhooks';
  var params = 'access_token=' + encodeURIComponent(accessToken);
  try {
    var res = await fetch(url + '?' + params, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { webhook_url: webhookUrl, webhook_verify_token: verifyToken } }),
    });
    var data = await res.json();
    if (res.ok) return { success: true, data: data };
    return { success: false, error: (data.error && data.error.message) || 'Unknown error', data: data };
  } catch (e) { return { success: false, error: e.message }; }
}

async function register360dialogWebhook(apiKey, webhookUrl, verifyToken) {
  try {
    var res = await fetch('https://waba.360dialog.io/v1/configs/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'D360-API-Key': apiKey },
      body: JSON.stringify({ webhook_url: webhookUrl, webhook_verify_token: verifyToken }),
    });
    var data = await res.json();
    if (res.ok) return { success: true, data: data };
    return { success: false, error: data.error || 'Unknown error', data: data };
  } catch (e) { return { success: false, error: e.message }; }
}

async function registerTwilioWebhook(accountSid, authToken, whatsappNumber, webhookUrl) {
  try {
    var num = whatsappNumber ? whatsappNumber.replace(/[^0-9]/g, '') : '';
    var res = await fetch('https://flex-api.twilio.com/v1/Channels/WA' + num, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(accountSid + ':' + authToken).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messaging_service_sid: '', inbound_url: webhookUrl, target: whatsappNumber }),
    });
    var data = await res.json();
    if (res.ok) return { success: true, data: data };
    return { success: false, error: data.message || 'Unknown error', data: data };
  } catch (e) { return { success: false, error: e.message }; }
}

function createWhatsAppWebhookMiddleware(options) {
  options = options || {};
  var verifyToken = options.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN || 'change-me';
  var appSecret = options.appSecret || (process.env.WHATSAPP_APP_SECRET ? process.env.WHATSAPP_APP_SECRET : null);
  var authToken = options.authToken || process.env.TWILIO_AUTH_TOKEN;
  var provider = options.provider || process.env.WHATSAPP_PROVIDER || 'meta';
  var onMessages = options.onMessages || function() {};
  var onDeliveryStatus = options.onDeliveryStatus || function() {};
  var onReadReceipt = options.onReadReceipt || function() {};

  async function handleRequest(req, res) {
    var rawBody = req.rawBody || (req.body ? JSON.stringify(req.body) : '');

    // GET = webhook verification
    if (req.method === 'GET') {
      var result = verifyWhatsAppChallenge(req.query, verifyToken);
      if (result.verified) {
        res.set('Content-Type', 'text/plain');
        res.send(result.challenge);
      } else {
        res.status(403).send('Forbidden');
      }
      return { handled: true };
    }

    if (req.method !== 'POST') return { handled: false };

    // Verify signature
    var signature = req.headers['x-hub-signature-256'] || req.headers['x-twilio-signature'] || '';
    var signatureValid = true;

    if (provider === 'twilio' && authToken) {
      signatureValid = verifyTwilioSignature(rawBody, signature, authToken);
    } else if (provider === 'meta' && appSecret) {
      signatureValid = verifyMetaSignature(rawBody, signature, appSecret);
    }

    if (!signatureValid) {
      console.warn('[whatsapp-webhook] Invalid signature provider=' + provider + ' appSecret=' + (appSecret ? 'SET' : 'null'));
      res.status(403).send('Forbidden');
      return { handled: true };
    }

    var messages = parseWhatsAppPayload(req.body);
    var meta = { provider: provider, raw: req.body, timestamp: new Date() };

    // Handle delivery statuses
    if (req.body && req.body.entry && req.body.entry[0] && req.body.entry[0].changes && req.body.entry[0].changes[0] && req.body.entry[0].changes[0].value && req.body.entry[0].changes[0].value.statuses) {
      var statuses = req.body.entry[0].changes[0].value.statuses;
      res.status(200).send('OK');
      for (var si = 0; si < statuses.length; si++) {
        var st = statuses[si];
        onDeliveryStatus({
          messageId: st.id,
          status: st.status,
          timestamp: new Date(parseInt(st.timestamp, 10) * 1000),
          recipient: normalizePhone(st.recipient_id),
          metadata: st,
        }).catch(function(e) { console.error('[whatsapp-webhook] status error:', e); });
      }
      return { handled: true };
    }

    // Handle read receipts
    if (req.body && req.body.entry && req.body.entry[0] && req.body.entry[0].changes && req.body.entry[0].changes[0] && req.body.entry[0].changes[0].value && req.body.entry[0].changes[0].value.reads) {
      var reads = req.body.entry[0].changes[0].value.reads;
      res.status(200).send('OK');
      for (var ri = 0; ri < reads.length; ri++) {
        var rd = reads[ri];
        onReadReceipt({
          messageId: rd.message_id,
          timestamp: new Date(parseInt(rd.timestamp, 10) * 1000),
          recipient: normalizePhone(rd.actor_id),
        }).catch(function(e) { console.error('[whatsapp-webhook] read error:', e); });
      }
      return { handled: true };
    }

    // Handle messages - await for each so we can capture result
    if (messages.length > 0) {
      var results = [];
      for (var mi = 0; mi < messages.length; mi++) {
        try {
          var r = await onMessages(messages[mi], meta);
          results.push(r);
        } catch(e) {
          console.error('[whatsapp-webhook] message error:', e);
        }
      }
      res.status(200).json({ received: true, processed: messages.length, results: results });
    } else {
      res.status(200).json({ received: true, processed: 0 });
    }

    return { handled: true };
  }

  return {
    handleRequest: handleRequest,
    verifyWhatsAppChallenge: function(q) { return verifyWhatsAppChallenge(q, verifyToken); },
    verifyMetaSignature: function(body, sig) { return verifyMetaSignature(body, sig, appSecret); },
    verifyTwilioSignature: function(body, sig) { return verifyTwilioSignature(body, sig, authToken); },
    parseWhatsAppPayload: parseWhatsAppPayload,
    normalizePhone: normalizePhone,
  };
}

module.exports = {
  verifyWhatsAppChallenge: verifyWhatsAppChallenge,
  verifyMetaSignature: verifyMetaSignature,
  verifyTwilioSignature: verifyTwilioSignature,
  parseWhatsAppPayload: parseWhatsAppPayload,
  normalizePhone: normalizePhone,
  createWhatsAppWebhookMiddleware: createWhatsAppWebhookMiddleware,
  registerMetaWebhook: registerMetaWebhook,
  register360dialogWebhook: register360dialogWebhook,
  registerTwilioWebhook: registerTwilioWebhook,
};
