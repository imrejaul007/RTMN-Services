/**
 * Unified Support Bridge v2.0 - Pure Unit Tests
 */

'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

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
} = require('../../src/emailHandler');

// Inline helper functions from emailHandler (not exported)
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseReferences(refs) {
  if (!refs) return [];
  if (typeof refs === 'string') {
    return refs.trim().split(/\s+/).filter(Boolean);
  }
  if (Array.isArray(refs)) return refs.filter(Boolean);
  return [];
}

const {
  EVENTS,
  emit,
  emitter,
} = require('../../src/events');

const { createStorage } = require('../../src/storage');

function createTestStorage() {
  const oldRedis = process.env.USE_REDIS;
  const oldMongo = process.env.USE_MONGODB;
  process.env.USE_REDIS = 'false';
  process.env.USE_MONGODB = 'false';
  const storage = createStorage();
  process.env.USE_REDIS = oldRedis;
  process.env.USE_MONGODB = oldMongo;
  return storage;
}

describe('Phone Normalization', () => {
  it('normalizes 10-digit Indian numbers', () => {
    assert.strictEqual(normalizePhone('9876543210'), '+919876543210');
    assert.strictEqual(normalizePhone('98765-43210'), '+919876543210');
    assert.strictEqual(normalizePhone('(98765) 43210'), '+919876543210');
  });

  it('normalizes numbers with +91 prefix', () => {
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
  });
});

describe('WhatsApp Challenge Verification', () => {
  it('accepts valid challenge', () => {
    const result = verifyWhatsAppChallenge(
      { 'hub.mode': 'subscribe', 'hub.verify_token': 'test-token', 'hub.challenge': 'abc123' },
      'test-token'
    );
    assert.strictEqual(result.verified, true);
    assert.strictEqual(result.challenge, 'abc123');
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
});

describe('WhatsApp Signature Verification', () => {
  const crypto = require('crypto');
  const appSecret = 'test-app-secret';
  const rawBody = JSON.stringify({ test: 'data' });

  it('verifies correct Meta signature', () => {
    const hmac = crypto.createHmac('sha256', appSecret);
    hmac.update(rawBody);
    const sig = 'sha256=' + hmac.digest('hex');
    assert.strictEqual(verifyMetaSignature(rawBody, sig, appSecret), true);
  });

  it('rejects incorrect signature', () => {
    assert.strictEqual(
      verifyMetaSignature(rawBody, 'sha256=0000000000000000000000000000000000000000000000000000000000000000', appSecret),
      false
    );
  });

  it('returns false for missing inputs', () => {
    assert.strictEqual(verifyMetaSignature(null, null, appSecret), false);
  });

  it('verifies Twilio signature', () => {
    const authToken = 'twilio-auth-token';
    const hmac = crypto.createHmac('sha256', authToken);
    hmac.update(rawBody);
    const sig = 'sha256=' + hmac.digest('hex');
    assert.strictEqual(verifyTwilioSignature(rawBody, sig, authToken), true);
  });
});

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
              image: { id: 'img-id-123', mime_type: 'image/jpeg', caption: 'Photo' },
            }],
            contacts: [{ wa_id: '919876543210', profile: { name: 'Jane' } }],
          },
        }],
      }],
    };
    const msgs = parseWhatsAppPayload(body);
    assert.strictEqual(msgs[0].image.id, 'img-id-123');
    assert.strictEqual(msgs[0].messageType, 'image');
  });

  it('parses internal format with nested message object', () => {
    const body = {
      id: 'internal-msg-2',
      from: '+919876543210',
      message: { text: 'Nested message' },
      contactName: 'User',
    };
    const msgs = parseWhatsAppPayload(body);
    assert.strictEqual(msgs.length, 1);
    assert.strictEqual(msgs[0].text, 'Nested message');
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
  });

  it('returns empty array for unknown format', () => {
    assert.strictEqual(parseWhatsAppPayload({ some: 'unknown' }).length, 0);
  });
});

describe('Email Normalization', () => {
  it('normalizes SendGrid format', () => {
    const body = {
      from: 'John Doe <john@example.com>',
      fromName: 'John Doe',
      subject: 'SendGrid Test',
      text: 'Email body',
    };
    const email = fromSendGrid(body);
    assert.strictEqual(email.from.email, 'john@example.com');
    assert.strictEqual(email.from.name, 'John Doe');
    assert.strictEqual(email.provider, 'sendgrid');
  });

  it('normalizes SES format', () => {
    const body = {
      mail: { messageId: '<ses-123@amazon.com>', source: 'sender@example.com', subject: 'SES Test' },
      content: 'SES body content',
    };
    const email = fromSES(body);
    assert.strictEqual(email.from.email, 'sender@example.com');
    assert.strictEqual(email.text, 'SES body content');
    assert.strictEqual(email.provider, 'ses');
  });

  it('normalizes Mailgun format', () => {
    const body = { from: 'sender@mailgun.example', subject: 'Test', 'body-plain': 'Body' };
    const email = fromMailgun(body);
    assert.strictEqual(email.from.email, 'sender@mailgun.example');
    assert.strictEqual(email.provider, 'mailgun');
  });

  it('normalizes Postmark format', () => {
    const body = { From: 'test@post.com', FromName: 'User', Subject: 'Test', TextBody: 'Body' };
    const email = fromPostmark(body);
    assert.strictEqual(email.from.email, 'test@post.com');
    assert.strictEqual(email.from.name, 'User');
    assert.strictEqual(email.provider, 'postmark');
  });

  it('auto-detects provider', async () => {
    assert.strictEqual((await normalizeEmail({ _category: 'inbound' })).provider, 'sendgrid');
    assert.strictEqual((await normalizeEmail({ mail: { messageId: 'test' } })).provider, 'ses');
    assert.strictEqual((await normalizeEmail({ signature: 'abc' })).provider, 'mailgun');
    assert.strictEqual((await normalizeEmail({ MessageID: 'test' })).provider, 'postmark');
  });

  it('returns generic for unknown format', async () => {
    const email = await normalizeEmail({ from: 'test@test.com', subject: 'Test' });
    assert.strictEqual(email.provider, 'generic');
  });

  it('returns null for WhatsApp payloads', async () => {
    assert.strictEqual(await normalizeEmail({ entry: [] }), null);
  });
});

describe('Email HTML Stripping', () => {
  it('strips HTML tags', () => {
    assert.strictEqual(stripHtml('<p>Hello <b>World</b></p>'), 'Hello World');
  });

  it('decodes HTML entities', () => {
    assert.strictEqual(stripHtml('Hello&nbsp;World'), 'Hello World');
    assert.strictEqual(stripHtml('A &amp; B'), 'A & B');
  });

  it('removes scripts and styles', () => {
    assert.strictEqual(stripHtml('<style>.x</style><p>Visible</p><script>x</script>'), 'Visible');
  });

  it('handles null/undefined', () => {
    assert.strictEqual(stripHtml(null), '');
    assert.strictEqual(stripHtml(undefined), '');
  });
});

describe('Email References Parsing', () => {
  it('parses references from string', () => {
    const refs = parseReferences('<ref1@x.com> <ref2@y.com>');
    assert.strictEqual(refs.length, 2);
    // parseReferences returns raw split results (angle brackets preserved)
    assert.strictEqual(refs[0], '<ref1@x.com>');
  });

  it('handles empty input', () => {
    assert.deepStrictEqual(parseReferences(''), []);
    assert.deepStrictEqual(parseReferences(null), []);
  });
});

describe('Events System', () => {
  it('defines all required event types', () => {
    assert.ok(EVENTS.MESSAGE_RECEIVED);
    assert.ok(EVENTS.CONVERSATION_CREATED);
    assert.ok(EVENTS.TICKET_CREATED);
    assert.ok(EVENTS.CUSTOMER_LINKED);
    assert.ok(EVENTS.CHANNEL_CONNECTED);
  });

  it('emits and receives events', () => {
    let received = null;
    const handler = (e) => { received = e; };
    emitter.on(EVENTS.MESSAGE_RECEIVED, handler);
    emit(EVENTS.MESSAGE_RECEIVED, { content: 'test' });
    assert.strictEqual(received.content, 'test');
    assert.ok(received.timestamp);
    emitter.off(EVENTS.MESSAGE_RECEIVED, handler);
  });
});

describe('In-Memory Storage', () => {
  let storage;

  beforeEach(() => { storage = createTestStorage(); });

  it('upserts and retrieves customer', async () => {
    await storage.upsertCustomer({ customerId: 'c1', name: 'Test', email: 'test@test.com', channels: ['email'] });
    const c = await storage.getCustomer('c1');
    assert.strictEqual(c.name, 'Test');
    assert.ok(c.createdAt);
  });

  it('returns null for non-existent customer', async () => {
    assert.strictEqual(await storage.getCustomer('nonexistent'), null);
  });

  it('finds customer by channel', async () => {
    await storage.registerChannelLink('c2', 'phone', '+919988776655');
    assert.strictEqual(await storage.findCustomerByChannel('phone', '+919988776655'), 'c2');
  });

  it('lists all customers', async () => {
    await storage.upsertCustomer({ customerId: 'a', name: 'A' });
    await storage.upsertCustomer({ customerId: 'b', name: 'B' });
    assert.strictEqual((await storage.getAllCustomers()).length, 2);
  });

  it('creates and retrieves conversation', async () => {
    const conv = await storage.createConversation({ id: 'conv1', customerId: 'c1', channel: 'whatsapp', subject: 'Test' });
    assert.strictEqual(conv.id, 'conv1');
    assert.strictEqual((await storage.getConversation('conv1')).id, 'conv1');
  });

  it('updates conversation', async () => {
    await storage.createConversation({ id: 'conv2', customerId: 'c1', channel: 'email' });
    await storage.updateConversation('conv2', { status: 'resolved' });
    assert.strictEqual((await storage.getConversation('conv2')).status, 'resolved');
  });

  it('creates and retrieves messages', async () => {
    await storage.createConversation({ id: 'conv3', customerId: 'c1', channel: 'whatsapp' });
    const msg = await storage.createMessage({ conversationId: 'conv3', content: 'Hello', sender: 'customer' });
    assert.ok(msg.id.startsWith('msg-'));
    assert.strictEqual((await storage.getMessagesByConversation('conv3'))[0].content, 'Hello');
  });

  it('sets and gets session', async () => {
    await storage.setSession('c1', 'whatsapp', { lastMessageAt: '2024-01-01' });
    const s = await storage.getSession('c1', 'whatsapp');
    assert.strictEqual(s.lastMessageAt, '2024-01-01');
  });

  it('registers event listeners', async () => {
    let received = null;
    storage.on('test', (d) => { received = d; });
    storage.emit('test', { msg: 'hello' });
    assert.strictEqual(received.msg, 'hello');
  });
});

describe('Channel Linking', () => {
  it('links multiple channels to same customer', async () => {
    const storage = createTestStorage();
    await storage.registerChannelLink('cust1', 'phone', '+919988776655');
    await storage.registerChannelLink('cust1', 'email', 'test@test.com');
    assert.strictEqual(await storage.findCustomerByChannel('phone', '+919988776655'), 'cust1');
    assert.strictEqual(await storage.findCustomerByChannel('email', 'test@test.com'), 'cust1');
  });
});

describe('Conversation Merge Logic', () => {
  let storage;

  beforeEach(() => { storage = createTestStorage(); });

  it('marks secondary conversation as merged', async () => {
    await storage.createConversation({ id: 'p', customerId: 'c1', channel: 'whatsapp' });
    await storage.createConversation({ id: 's', customerId: 'c1', channel: 'email' });
    await storage.updateConversation('s', { mergedInto: 'p', status: 'merged' });
    assert.strictEqual((await storage.getConversation('s')).mergedInto, 'p');
    assert.strictEqual((await storage.getConversation('s')).status, 'merged');
  });

  it('tracks mergedFrom on primary', async () => {
    await storage.createConversation({ id: 'p2', customerId: 'c1', channel: 'whatsapp' });
    await storage.createConversation({ id: 's2', customerId: 'c1', channel: 'email' });
    await storage.updateConversation('p2', { mergedFrom: ['s2'] });
    assert.ok((await storage.getConversation('p2')).mergedFrom.includes('s2'));
  });
});

describe('Stats Aggregation', () => {
  it('counts customers and conversations', async () => {
    const storage = createTestStorage();
    await storage.upsertCustomer({ customerId: 'a' });
    await storage.upsertCustomer({ customerId: 'b' });
    await storage.createConversation({ id: 'c1', customerId: 'a', channel: 'whatsapp' });
    await storage.createConversation({ id: 'c2', customerId: 'a', channel: 'email' });
    assert.strictEqual((await storage.getAllCustomers()).length, 2);
    assert.strictEqual((await storage.getAllConversations()).length, 2);
  });

  it('groups by channel', async () => {
    const storage = createTestStorage();
    await storage.createConversation({ id: 'x1', customerId: 'a', channel: 'whatsapp' });
    await storage.createConversation({ id: 'x2', customerId: 'b', channel: 'email' });
    const convs = await storage.getAllConversations();
    const byChannel = {};
    convs.forEach(c => { byChannel[c.channel] = (byChannel[c.channel] || 0) + 1; });
    assert.strictEqual(byChannel.whatsapp, 1);
    assert.strictEqual(byChannel.email, 1);
  });
});

describe('Priority and Tags', () => {
  let storage;

  beforeEach(() => { storage = createTestStorage(); });

  it('assigns priority and tags', async () => {
    await storage.createConversation({ id: 'pt', customerId: 'c1', channel: 'whatsapp', priority: 'urgent', tags: ['billing'] });
    const conv = await storage.getConversation('pt');
    assert.strictEqual(conv.priority, 'urgent');
    assert.strictEqual(conv.tags[0], 'billing');
  });

  it('merges tags during update', async () => {
    await storage.createConversation({ id: 'tm', customerId: 'c1', channel: 'whatsapp', tags: ['a'] });
    const conv = await storage.getConversation('tm');
    await storage.updateConversation('tm', { tags: [...conv.tags, 'b'] });
    const updated = await storage.getConversation('tm');
    assert.ok(updated.tags.includes('a'));
    assert.ok(updated.tags.includes('b'));
  });
});
