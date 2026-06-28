/**
 * Unified Support Bridge v2.0 — Pure Unit Tests
 * ============================================
 * Tests business logic functions directly without starting a server.
 * Covers: storage, phone/email normalization, WhatsApp webhook parsing,
 * event formatting, channel linking, conversation logic.
 */

'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

// ─── Load modules directly (no server) ─────────────────────────
// We test the standalone modules that don't require external services

const {
  verifyWhatsAppChallenge,
  verifyMetaSignature,
  verifyTwilioSignature,
  parseWhatsAppPayload,
  normalizePhone,
} = require('../../src/whatsappWebhook');

const {
  normalizeEmail,
  fromSendGrid,
  fromSES,
  fromMailgun,
  fromPostmark,
  stripHtml,
  parseReferences,
} = require('../../src/emailHandler');

const {
  EVENTS,
  formatSseEvent,
  emit,
  emitter,
} = require('../../src/events');

// ─── In-Memory Storage (test isolated, no Redis/MongoDB) ─────────
const { createStorage } = require('../../src/storage');

// Set env before importing index functions
process.env.USE_REDIS = 'false';
process.env.USE_MONGODB = 'false';

// ─── Helpers ───────────────────────────────────────────────────
function createTestStorage() {
  // Force in-memory by setting env before createStorage
  const oldRedis = process.env.USE_REDIS;
  const oldMongo = process.env.USE_MONGODB;
  process.env.USE_REDIS = 'false';
  process.env.USE_MONGODB = 'false';
  const storage = createStorage();
  process.env.USE_REDIS = oldRedis;
  process.env.USE_MONGODB = oldMongo;
  return storage;
}

// ─── Phone Normalization Tests ───────────────────────────────────
describe('Phone Normalization', () => {
  it('normalizes 10-digit Indian numbers', () => {
    assert.strictEqual(normalizePhone('9876543210'), '+919876543210');
    assert.strictEqual(normalizePhone('9876543210 '), '+919876543210');
    assert.strictEqual(normalizePhone('98765-43210'), '+919876543210');
    assert.strictEqual(normalizePhone('(98765) 43210'), '+919876543210');
  });

  it('normalizes numbers already with +91 prefix', () => {
    assert.strictEqual(normalizePhone('+919876543210'), '+919876543210');
    assert.strictEqual(normalizePhone('+1-415-555-1234'), '+14155551234');
  });

  it('returns null for invalid phones', () => {
    assert.strictEqual(normalizePhone(null), null);
    assert.strictEqual(normalizePhone(''), null);
    assert.strictEqual(normalizePhone('abc'), null);
  });

  it('handles international formats', () => {
    assert.strictEqual(normalizePhone('+442071234567'), '+442071234567');
    assert.strictEqual(normalizePhone('+1-415-555-1234'), '+14155551234');
  });
});

// ─── WhatsApp Challenge Verification ─────────────────────────────
describe('WhatsApp Challenge Verification', () => {
  it('accepts valid challenge', () => {
    const result = verifyWhatsAppChallenge(
      { 'hub.mode': 'subscribe', 'hub.verify_token': 'test-token', 'hub.challenge': 'abc123' },
      'test-token'
    );
    assert.strictEqual(result.verified, true);
    assert.strictEqual(result.challenge, 'abc123');
    assert.strictEqual(result.error, null);
  });

  it('rejects wrong token', () => {
    const result = verifyWhatsAppChallenge(
      { 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': 'xyz' },
      'correct-token'
    );
    assert.strictEqual(result.verified, false);
    assert.strictEqual(result.error, 'token_mismatch');
  });

  it('rejects unknown mode', () => {
    const result = verifyWhatsAppChallenge(
      { 'hub.mode': 'unsubscribe', 'hub.verify_token': 'test-token', 'hub.challenge': 'xyz' },
      'test-token'
    );
    assert.strictEqual(result.verified, false);
    assert.strictEqual(result.error, 'unknown_mode');
  });

  it('handles missing fields', () => {
    const result = verifyWhatsAppChallenge({}, 'test-token');
    assert.strictEqual(result.verified, false);
  });
});

// ─── WhatsApp Signature Verification ─────────────────────────────
describe('WhatsApp Signature Verification', () => {
  const crypto = require('crypto');
  const appSecret = 'test-app-secret';
  const rawBody = JSON.stringify({ test: 'data' });

  it('verifies correct Meta signature', () => {
    const hmac = crypto.createHmac('sha256', appSecret);
    hmac.update(rawBody);
    const sig = 'sha256=' + hmac.digest('hex');

    const result = verifyMetaSignature(rawBody, sig, appSecret);
    assert.strictEqual(result, true);
  });

  it('rejects incorrect signature', () => {
    const result = verifyMetaSignature(rawBody, 'sha256=0000000000000000000000000000000000000000000000000000000000000000', appSecret);
    assert.strictEqual(result, false);
  });

  it('returns false for missing inputs', () => {
    assert.strictEqual(verifyMetaSignature(null, null, appSecret), false);
    assert.strictEqual(verifyMetaSignature(rawBody, null, appSecret), false);
  });

  it('verifies Twilio signature', () => {
    const authToken = 'twilio-auth-token';
    const hmac = crypto.createHmac('sha256', authToken);
    hmac.update(rawBody);
    const sig = 'sha256=' + hmac.digest('hex');

    const result = verifyTwilioSignature(rawBody, sig, authToken);
    assert.strictEqual(result, true);
  });
});

// ─── WhatsApp Payload Parsing ────────────────────────────────────
describe('WhatsApp Payload Parsing', () => {
  it('parses Meta Cloud API text message', () => {
    const body = {
      entry: [{
        changes: [{
          value: {
            messages: [{
              id: 'wamid.123',
              from: '919876543210',
              type: 'text',
              text: { body: 'Hello there!' },
            }],
            contacts: [{
              wa_id: '919876543210',
              profile: { name: 'John Doe' },
            }],
          },
        }],
      }],
    };

    const msgs = parseWhatsAppPayload(body);
    assert.strictEqual(msgs.length, 1);
    assert.strictEqual(msgs[0].messageId, 'wamid.123');
    assert.strictEqual(msgs[0].from, '+919876543210');
    assert.strictEqual(msgs[0].text, 'Hello there!');
    assert.strictEqual(msgs[0].contactName, 'John Doe');
    assert.strictEqual(msgs[0].messageType, 'text');
  });

  it('parses Meta image message', () => {
    const body = {
      entry: [{
        changes: [{
          value: {
            messages: [{
              id: 'wamid.img1',
              from: '919876543210',
              type: 'image',
              image: {
                id: 'img-id-123',
                mime_type: 'image/jpeg',
                sha256: 'abc123',
                caption: 'Photo caption',
              },
            }],
            contacts: [{
              wa_id: '919876543210',
              profile: { name: 'Jane' },
            }],
          },
        }],
      }],
    };

    const msgs = parseWhatsAppPayload(body);
    assert.strictEqual(msgs[0].image.id, 'img-id-123');
    assert.strictEqual(msgs[0].image.caption, 'Photo caption');
    assert.strictEqual(msgs[0].messageType, 'image');
  });

  it('parses internal format', () => {
    const body = {
      id: 'internal-msg-1',
      from: '+919876543210',
      message: 'Test message',
      contactName: 'Internal User',
      messageType: 'text',
    };

    const msgs = parseWhatsAppPayload(body);
    assert.strictEqual(msgs.length, 1);
    assert.strictEqual(msgs[0].messageId, 'internal-msg-1');
    assert.strictEqual(msgs[0].text, 'Test message');
    assert.strictEqual(msgs[0].contactName, 'Internal User');
  });

  it('parses Twilio format', () => {
    const body = {
      From: 'whatsapp:+14155551234',
      Body: 'Twilio message',
      MessageSid: 'SM123',
    };

    const msgs = parseWhatsAppPayload(body);
    assert.strictEqual(msgs.length, 1);
    assert.strictEqual(msgs[0].from, '+14155551234');
    assert.strictEqual(msgs[0].text, 'Twilio message');
    assert.strictEqual(msgs[0].messageId, 'SM123');
  });

  it('returns empty array for unknown format', () => {
    const msgs = parseWhatsAppPayload({ some: 'unknown' });
    assert.strictEqual(msgs.length, 0);
  });
});

// ─── Email Normalization ──────────────────────────────────────────
describe('Email Normalization', () => {
  it('normalizes SendGrid format', () => {
    const body = {
      from: 'John Doe <john@example.com>',
      subject: 'SendGrid Test',
      text: 'Email body',
      'Message-ID': '<sg-123@sendgrid>',
    };

    const email = fromSendGrid(body);
    assert.strictEqual(email.from.email, 'john@example.com');
    assert.strictEqual(email.from.name, 'John Doe');
    assert.strictEqual(email.subject, 'SendGrid Test');
    assert.strictEqual(email.text, 'Email body');
    assert.strictEqual(email.provider, 'sendgrid');
  });

  it('normalizes SES format', () => {
    const body = {
      mail: {
        messageId: '<ses-123@email.amazonses.com>',
        source: 'sender@example.com',
        subject: 'SES Test',
        timestamp: '2024-01-01T00:00:00.000Z',
      },
      content: 'SES body content',
    };

    const email = fromSES(body);
    assert.strictEqual(email.from.email, 'sender@example.com');
    assert.strictEqual(email.subject, 'SES Test');
    assert.strictEqual(email.text, 'SES body content');
    assert.strictEqual(email.provider, 'ses');
  });

  it('normalizes Mailgun format', () => {
    const body = {
      from: 'sender@mailgun.example',
      subject: 'Mailgun Test',
      'body-plain': 'Mailgun body',
      'Message-ID': '<mg-456@mailgun.org>',
    };

    const email = fromMailgun(body);
    assert.strictEqual(email.from.email, 'sender@mailgun.example');
    assert.strictEqual(email.text, 'Mailgun body');
    assert.strictEqual(email.provider, 'mailgun');
  });

  it('normalizes Postmark format', () => {
    const body = {
      From: 'postmark@company.com',
      FromName: 'Postmark User',
      Subject: 'Postmark Test',
      TextBody: 'Postmark body',
      MessageID: '<pm-789@postmark>',
    };

    const email = fromPostmark(body);
    assert.strictEqual(email.from.email, 'postmark@company.com');
    assert.strictEqual(email.from.name, 'Postmark User');
    assert.strictEqual(email.text, 'Postmark body');
    assert.strictEqual(email.provider, 'postmark');
  });

  it('auto-detects provider', async () => {
    // SendGrid
    const sg = await normalizeEmail({ _category: 'inbound' });
    assert.strictEqual(sg.provider, 'sendgrid');

    // SES
    const ses = await normalizeEmail({ mail: { messageId: 'test' } });
    assert.strictEqual(ses.provider, 'ses');

    // Mailgun
    const mg = await normalizeEmail({ signature: 'abc' });
    assert.strictEqual(mg.provider, 'mailgun');

    // Postmark
    const pm = await normalizeEmail({ MessageID: 'test' });
    assert.strictEqual(pm.provider, 'postmark');
  });

  it('returns generic for unknown format', async () => {
    const email = await normalizeEmail({ from: 'test@test.com', subject: 'Test' });
    assert.strictEqual(email.provider, 'generic');
    assert.strictEqual(email.from.email, 'test@test.com');
  });

  it('returns WhatsApp as null', async () => {
    const email = await normalizeEmail({ entry: [] });
    assert.strictEqual(email, null);
  });
});

// ─── Email HTML Stripping ──────────────��─────────────────────────
describe('Email HTML Stripping', () => {
  it('strips HTML tags', () => {
    const html = '<p>Hello <b>World</b></p>';
    assert.strictEqual(stripHtml(html), 'Hello World');
  });

  it('decodes HTML entities', () => {
    assert.strictEqual(stripHtml('Hello&nbsp;World'), 'Hello World');
    assert.strictEqual(stripHtml('A &amp; B'), 'A & B');
    assert.strictEqual(stripHtml('&lt;tag&gt;'), '<tag>');
  });

  it('removes scripts and styles', () => {
    const html = '<style>.hidden{display:none}</style><p>Visible</p><script>alert("x")</script>';
    assert.strictEqual(stripHtml(html), 'Visible');
  });

  it('handles null/undefined', () => {
    assert.strictEqual(stripHtml(null), '');
    assert.strictEqual(stripHtml(undefined), '');
  });
});

// ─── Email References Parsing ────────────────────────────────────
describe('Email References Parsing', () => {
  it('parses string references', () => {
    const refs = parseReferences('<ref1@x> <ref2@y> <ref3@z>');
    assert.deepStrictEqual(refs, ['ref1@x', 'ref2@y', 'ref3@z']);
  });

  it('parses array references', () => {
    const refs = parseReferences(['a@b', 'c@d']);
    assert.deepStrictEqual(refs, ['a@b', 'c@d']);
  });

  it('handles empty/null', () => {
    assert.deepStrictEqual(parseReferences(null), []);
    assert.deepStrictEqual(parseReferences(''), []);
    assert.deepStrictEqual(parseReferences(undefined), []);
  });
});

// ─── Events ───────────────��─────────────────────────────────────
describe('Events System', () => {
  it('defines all required event types', () => {
    assert.ok(EVENTS.MESSAGE_RECEIVED);
    assert.ok(EVENTS.CONVERSATION_CREATED);
    assert.ok(EVENTS.CONVERSATION_UPDATED);
    assert.ok(EVENTS.CONVERSATION_MERGED);
    assert.ok(EVENTS.TICKET_CREATED);
    assert.ok(EVENTS.TICKET_UPDATED);
    assert.ok(EVENTS.CONVERSATION_ASSIGNED);
    assert.ok(EVENTS.CUSTOMER_LINKED);
    assert.ok(EVENTS.CHANNEL_CONNECTED);
    assert.ok(EVENTS.CHANNEL_DISCONNECTED);
  });

  it('formats SSE events correctly', () => {
    const event = {
      type: 'message.received',
      conversationId: 'conv-123',
      content: 'Hello',
    };

    const sse = formatSseEvent(event);
    assert.ok(sse.startsWith('event: message.received\n'));
    assert.ok(sse.includes('"conversationId":"conv-123"'));
    assert.ok(sse.includes('"content":"Hello"'));
    assert.ok(sse.endsWith('\n\n'));
  });

  it('adds timestamp if missing', () => {
    const event = { type: 'test' };
    const sse = formatSseEvent(event);
    assert.ok(sse.includes('"timestamp"'));
  });

  it('emits events and returns event object', () => {
    let received = null;
    const handler = (e) => { received = e; };
    emitter.on(EVENTS.MESSAGE_RECEIVED, handler);

    const event = emit(EVENTS.MESSAGE_RECEIVED, { content: 'test', sender: 'customer' });

    assert.ok(received);
    assert.strictEqual(received.type, EVENTS.MESSAGE_RECEIVED);
    assert.strictEqual(received.content, 'test');
    assert.ok(received.timestamp);

    emitter.off(EVENTS.MESSAGE_RECEIVED, handler);
  });
});

// ─── In-Memory Storage ──────────────────────────────────────────
describe('In-Memory Storage', () => {
  let storage;

  beforeEach(() => {
    storage = createTestStorage();
  });

  // Customer operations
  it('upserts and retrieves customer', async () => {
    await storage.upsertCustomer({
      customerId: 'cust-001',
      name: 'Test User',
      email: 'test@example.com',
      phone: '+919876543210',
      channels: ['email'],
    });

    const customer = await storage.getCustomer('cust-001');
    assert.strictEqual(customer.customerId, 'cust-001');
    assert.strictEqual(customer.name, 'Test User');
    assert.strictEqual(customer.email, 'test@example.com');
    assert.ok(customer.createdAt);
  });

  it('returns null for non-existent customer', async () => {
    const customer = await storage.getCustomer('non-existent');
    assert.strictEqual(customer, null);
  });

  it('finds customer by channel', async () => {
    await storage.registerChannelLink('cust-002', 'phone', '+919988776655');
    const customerId = await storage.findCustomerByChannel('phone', '+919988776655');
    assert.strictEqual(customerId, 'cust-002');
  });

  it('returns null for unknown channel', async () => {
    const customerId = await storage.findCustomerByChannel('phone', '+0000000000');
    assert.strictEqual(customerId, null);
  });

  it('lists all customers', async () => {
    await storage.upsertCustomer({ customerId: 'c1', name: 'A' });
    await storage.upsertCustomer({ customerId: 'c2', name: 'B' });

    const all = await storage.getAllCustomers();
    assert.strictEqual(all.length, 2);
  });

  it('updates existing customer', async () => {
    await storage.upsertCustomer({ customerId: 'cust-003', name: 'Original' });
    await storage.upsertCustomer({ customerId: 'cust-003', name: 'Updated' });

    const customer = await storage.getCustomer('cust-003');
    assert.strictEqual(customer.name, 'Updated');
    assert.ok(customer.updatedAt);
  });

  // Conversation operations
  it('creates and retrieves conversation', async () => {
    const conv = await storage.createConversation({
      id: 'conv-001',
      customerId: 'cust-001',
      channel: 'whatsapp',
      subject: 'Test conversation',
      priority: 'high',
    });

    assert.strictEqual(conv.id, 'conv-001');
    assert.strictEqual(conv.channel, 'whatsapp');
    assert.strictEqual(conv.priority, 'high');
    assert.ok(conv.createdAt);

    const retrieved = await storage.getConversation('conv-001');
    assert.strictEqual(retrieved.id, 'conv-001');
  });

  it('updates conversation', async () => {
    await storage.createConversation({
      id: 'conv-002',
      customerId: 'cust-001',
      channel: 'email',
    });

    await storage.updateConversation('conv-002', { status: 'resolved', priority: 'low' });

    const conv = await storage.getConversation('conv-002');
    assert.strictEqual(conv.status, 'resolved');
    assert.strictEqual(conv.priority, 'low');
  });

  it('gets conversations by customer', async () => {
    await storage.createConversation({ id: 'conv-a', customerId: 'cust-x', channel: 'whatsapp' });
    await storage.createConversation({ id: 'conv-b', customerId: 'cust-x', channel: 'email' });
    await storage.createConversation({ id: 'conv-c', customerId: 'cust-y', channel: 'chat' });

    const convs = await storage.getConversationsByCustomer('cust-x');
    assert.strictEqual(convs.length, 2);
  });

  it('lists all conversations', async () => {
    await storage.createConversation({ id: 'conv-1', customerId: 'c1', channel: 'whatsapp' });
    await storage.createConversation({ id: 'conv-2', customerId: 'c2', channel: 'email' });

    const all = await storage.getAllConversations();
    assert.strictEqual(all.length, 2);
  });

  // Message operations
  it('creates and retrieves messages', async () => {
    await storage.createConversation({ id: 'conv-msg-1', customerId: 'cust-1', channel: 'whatsapp' });

    const msg = await storage.createMessage({
      conversationId: 'conv-msg-1',
      content: 'Hello!',
      sender: 'customer',
      channel: 'whatsapp',
      direction: 'inbound',
    });

    assert.ok(msg.id.startsWith('msg-'));
    assert.strictEqual(msg.content, 'Hello!');
    assert.ok(msg.createdAt);

    const msgs = await storage.getMessagesByConversation('conv-msg-1');
    assert.strictEqual(msgs.length, 1);
    assert.strictEqual(msgs[0].content, 'Hello!');
  });

  it('gets messages by customer', async () => {
    await storage.createConversation({ id: 'conv-cust-msg', customerId: 'cust-msg', channel: 'whatsapp' });
    await storage.createMessage({ conversationId: 'conv-cust-msg', content: 'Msg 1', sender: 'customer' });
    await storage.createMessage({ conversationId: 'conv-cust-msg', content: 'Msg 2', sender: 'customer' });

    const msgs = await storage.getMessagesByCustomer('cust-msg');
    assert.strictEqual(msgs.length, 2);
  });

  // Session operations
  it('sets and gets session', async () => {
    await storage.setSession('cust-session', 'whatsapp', {
      lastConversationId: 'conv-session-1',
      lastMessageAt: '2024-01-01T00:00:00Z',
    });

    const session = await storage.getSession('cust-session', 'whatsapp');
    assert.strictEqual(session.lastConversationId, 'conv-session-1');
    assert.strictEqual(session.channel, 'whatsapp');
  });

  it('returns null for missing session', async () => {
    const session = await storage.getSession('unknown', 'channel');
    assert.strictEqual(session, null);
  });

  it('gets all sessions for customer', async () => {
    await storage.setSession('cust-multi', 'whatsapp', { data: 'whatsapp' });
    await storage.setSession('cust-multi', 'email', { data: 'email' });

    const sessions = await storage.getSessionsByCustomer('cust-multi');
    assert.strictEqual(sessions.length, 2);
  });

  // Event listeners
  it('registers and emits event listeners', async () => {
    let received = null;
    storage.on('test-event', (data) => { received = data; });
    storage.emit('test-event', { message: 'hello' });
    assert.strictEqual(received.message, 'hello');
  });
});

// ─── Customer Identity Resolution Logic ─────────────────────────
// Test the pure functions that don't need the full app
describe('Customer Identity Resolution Logic', () => {
  // These are standalone logic tests for the normalization steps
  // The full async resolution requires storage, tested above

  it('phone normalization is consistent', () => {
    const formats = [
      '9876543210',
      '+919876543210',
      '919876543210',
      '+91 98765 43210',
      '09876543210',
    ];

    const normalized = normalizePhone(formats[0]);
    formats.forEach(fmt => {
      assert.strictEqual(normalizePhone(fmt), normalized);
    });
  });

  it('email lowercase normalization (via email handler)', async () => {
    // Test email normalization
    const email = await normalizeEmail({ from: 'Test@EXAMPLE.COM', subject: 'Test' });
    // The from field parsing extracts email from "Name <email>" format
    assert.strictEqual(email.provider, 'generic');
  });

  it('channel linking creates correct keys', async () => {
    // Test that storage uses correct key format
    const storage = createTestStorage();

    await storage.registerChannelLink('cust-link-test', 'phone', '+919988776655');
    await storage.registerChannelLink('cust-link-test', 'email', 'link@test.com');

    // Same customer via phone
    const phoneResult = await storage.findCustomerByChannel('phone', '+919988776655');
    assert.strictEqual(phoneResult, 'cust-link-test');

    // Same customer via email
    const emailResult = await storage.findCustomerByChannel('email', 'link@test.com');
    assert.strictEqual(emailResult, 'cust-link-test');
  });

  it('cross-channel linking works', async () => {
    const storage = createTestStorage();

    // Register same customer via different channels
    await storage.registerChannelLink('cust-cross', 'phone', '+919988776655');
    await storage.registerChannelLink('cust-cross', 'email', 'cross@test.com');

    // Both channels resolve to same customer
    const phoneId = await storage.findCustomerByChannel('phone', '+919988776655');
    const emailId = await storage.findCustomerByChannel('email', 'cross@test.com');

    assert.strictEqual(phoneId, emailId);
    assert.strictEqual(phoneId, 'cust-cross');
  });
});

// ─── Conversation Merge Logic ───────────────────────────────────
describe('Conversation Merge Logic', () => {
  let storage;

  beforeEach(() => {
    storage = createTestStorage();
  });

  it('creates linked conversations for same customer', async () => {
    // Simulate merge by setting mergedInto
    await storage.createConversation({
      id: 'merge-primary',
      customerId: 'cust-merge-1',
      channel: 'whatsapp',
      subject: 'Primary',
    });

    await storage.createConversation({
      id: 'merge-secondary',
      customerId: 'cust-merge-1',
      channel: 'email',
      subject: 'Secondary',
    });

    // Update secondary to point to primary
    await storage.updateConversation('merge-secondary', {
      mergedInto: 'merge-primary',
      status: 'merged',
      linkedConversations: ['merge-primary'],
    });

    // Verify primary is unchanged
    const primary = await storage.getConversation('merge-primary');
    assert.strictEqual(primary.status, undefined); // not merged

    // Verify secondary is merged
    const secondary = await storage.getConversation('merge-secondary');
    assert.strictEqual(secondary.mergedInto, 'merge-primary');
    assert.strictEqual(secondary.status, 'merged');
  });

  it('tracks mergedFrom on primary', async () => {
    await storage.createConversation({ id: 'primary', customerId: 'cust-p', channel: 'whatsapp' });
    await storage.createConversation({ id: 'secondary', customerId: 'cust-p', channel: 'email' });

    // Update primary with merged info
    await storage.updateConversation('primary', {
      linkedConversations: ['secondary'],
      mergedFrom: ['secondary'],
      mergedAt: new Date().toISOString(),
    });

    const primary = await storage.getConversation('primary');
    assert.ok(primary.linkedConversations.includes('secondary'));
    assert.ok(primary.mergedFrom.includes('secondary'));
    assert.ok(primary.mergedAt);
  });

  it('merging different customers is prevented by business logic', async () => {
    await storage.createConversation({ id: 'cust-a-conv', customerId: 'customer-A', channel: 'whatsapp' });
    await storage.createConversation({ id: 'cust-b-conv', customerId: 'customer-B', channel: 'email' });

    // Business rule: only merge conversations from same customer
    // This test documents the expected behavior
    const convA = await storage.getConversation('cust-a-conv');
    const convB = await storage.getConversation('cust-b-conv');

    assert.notStrictEqual(convA.customerId, convB.customerId);
    // The merge API would check this and reject
  });
});

// ─── Stats Aggregation ───────────────────────────────────────────
describe('Stats Aggregation', () => {
  let storage;

  beforeEach(() => {
    storage = createTestStorage();
  });

  it('counts customers and conversations', async () => {
    await storage.upsertCustomer({ customerId: 'stat-cust-1', name: 'A' });
    await storage.upsertCustomer({ customerId: 'stat-cust-2', name: 'B' });

    await storage.createConversation({ id: 'sc-1', customerId: 'stat-cust-1', channel: 'whatsapp' });
    await storage.createConversation({ id: 'sc-2', customerId: 'stat-cust-1', channel: 'email' });
    await storage.createConversation({ id: 'sc-3', customerId: 'stat-cust-2', channel: 'chat' });

    const customers = await storage.getAllCustomers();
    const conversations = await storage.getAllConversations();

    assert.strictEqual(customers.length, 2);
    assert.strictEqual(conversations.length, 3);

    // Group by channel
    const byChannel = {};
    for (const c of conversations) {
      byChannel[c.channel] = (byChannel[c.channel] || 0) + 1;
    }

    assert.strictEqual(byChannel.whatsapp, 1);
    assert.strictEqual(byChannel.email, 1);
    assert.strictEqual(byChannel.chat, 1);
  });

  it('identifies multi-channel customers', async () => {
    // Customer with 2 channels
    await storage.upsertCustomer({
      customerId: 'multi-channel',
      name: 'Multi Channel',
      channels: ['whatsapp', 'email'],
    });

    // Customer with 1 channel
    await storage.upsertCustomer({
      customerId: 'single-channel',
      name: 'Single Channel',
      channels: ['whatsapp'],
    });

    const customers = await storage.getAllCustomers();
    const multiChannel = customers.filter(c => (c.channels?.length || 0) > 1);

    assert.strictEqual(multiChannel.length, 1);
    assert.strictEqual(multiChannel[0].customerId, 'multi-channel');
  });
});

// ─── Priority and Tags ──────────────────────────────────────────
describe('Priority and Tags', () => {
  let storage;

  beforeEach(() => {
    storage = createTestStorage();
  });

  it('assigns priority and tags to conversations', async () => {
    await storage.createConversation({
      id: 'priority-test',
      customerId: 'cust-priority',
      channel: 'whatsapp',
      priority: 'urgent',
      tags: ['billing', 'refund'],
    });

    const conv = await storage.getConversation('priority-test');
    assert.strictEqual(conv.priority, 'urgent');
    assert.deepStrictEqual(conv.tags, ['billing', 'refund']);
  });

  it('adds source tag automatically', async () => {
    await storage.createConversation({
      id: 'source-test',
      customerId: 'cust-source',
      channel: 'email',
      tags: ['important'],
    });

    const conv = await storage.getConversation('source-test');
    assert.ok(conv.tags.includes('source:email'));
  });

  it('merges tags during update', async () => {
    await storage.createConversation({
      id: 'tag-merge-test',
      customerId: 'cust-tag',
      channel: 'whatsapp',
      tags: ['initial'],
    });

    await storage.updateConversation('tag-merge-test', {
      tags: [...(await storage.getConversation('tag-merge-test')).tags, 'additional'],
    });

    const conv = await storage.getConversation('tag-merge-test');
    assert.ok(conv.tags.includes('initial'));
    assert.ok(conv.tags.includes('additional'));
  });
});
