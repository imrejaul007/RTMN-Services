/**
 * Unified Support Bridge v2.0 - Integration Tests
 * Tests all HTTP endpoints with a running server
 */

'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

const BASE = 'http://localhost:4886';

let baseUrl;
let started = false;

// ─── Server ─────────────────────────────────────────────────────
before(async () => {
  process.env.PORT = '4886';
  process.env.USE_REDIS = 'false';
  process.env.USE_MONGODB = 'false';
  process.env.UNIFIED_INBOX_URL = BASE;
  process.env.TICKET_ENGINE_URL = BASE;
  process.env.CORPID_URL = BASE;
  process.env.WHATSAPP_VERIFY_TOKEN = 'test-verify';
  process.env.WHATSAPP_APP_SECRET = '';
  process.env.SMTP_PORT = '0';
  process.env.IMAP_USER = '';

  const { app } = require('../../src/index.js');
  await new Promise((resolve) => app.listen(4886, resolve));
  baseUrl = BASE;
  started = true;
});

after(() => {
  if (started) {
    // Force exit
    process.exit(0);
  }
});

// ─── HTTP Helpers ───────────────────────────────────────────────
function req(method, path, body, headers) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
    };
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data || '{}') }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

const get = (path, h) => req('GET', path, null, h);
const post = (path, body, h) => req('POST', path, body, h);

// ─── Tests ───────────────────────────────────────────────────────

describe('Health', () => {
  it('returns healthy status with features', async () => {
    const r = await get('/health');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.status, 'healthy');
    assert.strictEqual(r.body.version, '2.0.0');
    assert.ok(Array.isArray(r.body.features));
    assert.ok(Array.isArray(r.body.channels));
    assert.ok(r.body.features.includes('identity-resolution'));
    assert.ok(r.body.features.includes('conversation-merge'));
    assert.ok(r.body.features.includes('sse-events'));
  });

  it('reports upstream connectivity', async () => {
    const r = await get('/health');
    assert.ok(r.body.upstream);
    assert.ok('unifiedInbox' in r.body.upstream);
    assert.ok('ticketEngine' in r.body.upstream);
    assert.ok('corpid' in r.body.upstream);
  });
});

describe('WhatsApp Webhook', () => {
  it('accepts GET challenge with correct token', async () => {
    const r = await get('/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test-verify&hub.challenge=ABC123');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body, 'ABC123');
  });

  it('rejects GET challenge with wrong token', async () => {
    const r = await get('/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=XYZ');
    assert.strictEqual(r.status, 403);
  });

  it('accepts POST message in dev mode (no signature)', async () => {
    const r = await post('/api/webhooks/whatsapp', {
      from: '+919876543210',
      contactName: 'Rahul Verma',
      text: 'Hello, I need help with my order',
    });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.received, true);
    assert.ok(r.body.customerId);
    assert.ok(r.body.conversationId);
  });

  it('continues existing conversation', async () => {
    const r1 = await post('/api/webhooks/whatsapp', { from: '+919990000111', text: 'First message' });
    const r2 = await post('/api/webhooks/whatsapp', { from: '+919990000111', text: 'Second message' });
    assert.strictEqual(r1.body.conversationId, r2.body.conversationId);
    assert.strictEqual(r1.body.customerId, r2.body.customerId);
  });

  it('normalizes phone formats', async () => {
    const r1 = await post('/api/webhooks/whatsapp', { from: '9876543210', text: 'Test' });
    assert.strictEqual(r1.body.customer.phone, '+919876543210');
    const r2 = await post('/api/webhooks/whatsapp', { from: '+91-98765-43210', text: 'Test' });
    assert.strictEqual(r2.body.customer.phone, '+919876543210');
  });
});

describe('Email Webhook', () => {
  it('accepts simple JSON format', async () => {
    const r = await post('/api/webhooks/email', {
      from: 'priya@techcorp.com',
      subject: 'Billing Issue',
      text: 'I was charged twice for my order',
    });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.received, true);
    assert.ok(r.body.customerId);
    assert.strictEqual(r.body.customer.email, 'priya@techcorp.com');
  });

  it('normalizes email to lowercase', async () => {
    const r = await post('/api/webhooks/email', {
      from: 'JOHN@STARTUP.IO',
      subject: 'Test',
      text: 'Hello',
    });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.customer.email, 'john@startup.io');
  });

  it('returns 400 for missing from email', async () => {
    const r = await post('/api/webhooks/email', { subject: 'Test', text: 'Hello' });
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.error.includes('from'));
  });

  it('links email reply to existing conversation via inReplyTo', async () => {
    const r1 = await post('/api/webhooks/email', {
      from: 'amit@enterprise.com',
      subject: 'Help needed',
      text: 'First message',
      messageId: 'msg-001',
    });
    const r2 = await post('/api/webhooks/email', {
      from: 'amit@enterprise.com',
      subject: 'Re: Help needed',
      text: 'Follow up',
      inReplyTo: 'msg-001',
    });
    assert.strictEqual(r1.body.customerId, r2.body.customerId);
  });
});

describe('App Webhook', () => {
  it('creates customer and conversation', async () => {
    const r = await post('/api/webhooks/app', {
      appUserId: 'usr_do_123',
      message: 'How do I track my order?',
      platform: 'do-app',
      contactName: 'Vikram Patel',
    });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.received, true);
    assert.ok(r.body.customerId.startsWith('cust-'));
    assert.ok(r.body.conversationId.startsWith('conv-'));
    assert.strictEqual(r.body.isNew, true);
  });

  it('accepts userId as alias for appUserId', async () => {
    const r = await post('/api/webhooks/app', { userId: 'usr_alias', message: 'Hello' });
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.customerId);
  });

  it('returns 400 for missing appUserId', async () => {
    const r = await post('/api/webhooks/app', { message: 'Hello' });
    assert.strictEqual(r.status, 400);
  });
});

describe('Customer Identity', () => {
  it('resolves from phone', async () => {
    const r = await post('/api/customers/resolve', { phone: '9900001111', name: 'Sarah' });
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.customerId.startsWith('cust-'));
    assert.strictEqual(r.body.customer.phone, '+919900001111');
  });

  it('resolves from email', async () => {
    const r = await post('/api/customers/resolve', { email: 'sarah@startup.io', name: 'Sarah' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.customer.email, 'sarah@startup.io');
  });

  it('resolves from appUserId', async () => {
    const r = await post('/api/customers/resolve', { appUserId: 'usr_app_456', name: 'Alex' });
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.customerId.startsWith('cust-'));
  });

  it('returns 400 when no identifier provided', async () => {
    const r = await post('/api/customers/resolve', { name: 'No ID' });
    assert.strictEqual(r.status, 400);
  });

  it('returns same customerId for same phone', async () => {
    const r1 = await post('/api/customers/resolve', { phone: '8800123456' });
    const r2 = await post('/api/customers/resolve', { phone: '8800123456' });
    assert.strictEqual(r1.body.customerId, r2.body.customerId);
  });

  it('returns same customerId for same email (case-insensitive)', async () => {
    const r1 = await post('/api/customers/resolve', { email: 'Duplicate@Test.COM' });
    const r2 = await post('/api/customers/resolve', { email: 'duplicate@test.com' });
    assert.strictEqual(r1.body.customerId, r2.body.customerId);
  });
});

describe('Cross-Channel Linking', () => {
  it('links appUserId to existing customer via phone', async () => {
    // Customer starts on WhatsApp
    const r1 = await post('/api/webhooks/whatsapp', { from: '+919988776655', text: 'From WhatsApp' });
    const custId = r1.body.customerId;

    // Same person uses the app - should link to same customer
    const r2 = await post('/api/webhooks/app', { appUserId: 'usr_same_person', message: 'From app' });

    assert.strictEqual(r2.status, 200);
    assert.strictEqual(r2.body.customerId, custId);

    // Check customer has both channels
    const cust = await get('/api/customers/' + custId);
    assert.ok(cust.body.customer.channels.includes('phone'));
    assert.ok(cust.body.customer.channels.includes('app'));
  });

  it('link endpoint links additional identifiers', async () => {
    const r1 = await post('/api/customers/resolve', { phone: '91000000001', name: 'Anita' });
    const custId = r1.body.customerId;

    await post('/api/customers/link', { customerId: custId, email: 'anita@company.com' });

    const r2 = await post('/api/customers/resolve', { email: 'anita@company.com' });
    assert.strictEqual(r2.body.customerId, custId);
  });
});

describe('Conversation Merge', () => {
  it('merges two conversations from same customer', async () => {
    const r1 = await post('/api/webhooks/whatsapp', { from: '+919988001122', text: 'WhatsApp issue' });
    const conv1 = r1.body.conversationId;
    const custId = r1.body.customerId;

    const r2 = await post('/api/webhooks/app', { appUserId: 'usr_merge_test', message: 'App follow-up' });
    const conv2 = r2.body.conversationId;

    const merge = await post('/api/conversations/' + conv1 + '/merge', { mergeWith: [conv2] });
    assert.strictEqual(merge.status, 200);
    assert.strictEqual(merge.body.success, true);
    assert.strictEqual(merge.body.primaryConversationId, conv1);
    assert.ok(merge.body.mergedFrom.includes(conv2));
    assert.ok(merge.body.channels.includes('whatsapp'));
    assert.ok(merge.body.channels.includes('chat'));
    assert.strictEqual(merge.body.customerId, custId);
  });

  it('rejects merge from different customers', async () => {
    const r1 = await post('/api/webhooks/whatsapp', { from: '+919988001133', text: 'Customer A' });
    const r2 = await post('/api/webhooks/whatsapp', { from: '+919988001144', text: 'Customer B' });
    const merge = await post('/api/conversations/' + r1.body.conversationId + '/merge', { mergeWith: [r2.body.conversationId] });
    assert.strictEqual(merge.status, 400);
    assert.ok(merge.body.error.includes('different'));
  });

  it('rejects merge with < 2 conversations', async () => {
    const r = await post('/api/webhooks/whatsapp', { from: '+919988001155', text: 'Solo' });
    const merge = await post('/api/conversations/' + r.body.conversationId + '/merge', { mergeWith: [] });
    assert.strictEqual(merge.status, 400);
  });

  it('returns linked conversations', async () => {
    const r1 = await post('/api/webhooks/whatsapp', { from: '+919988001166', text: 'First' });
    const r2 = await post('/api/webhooks/app', { appUserId: 'usr_linked', message: 'Second' });
    await post('/api/conversations/' + r1.body.conversationId + '/merge', { mergeWith: [r2.body.conversationId] });

    const linked = await get('/api/conversations/' + r1.body.conversationId + '/linked');
    assert.strictEqual(linked.status, 200);
    assert.ok(linked.body.linkedConversations.length >= 1);
  });
});

describe('Customer API', () => {
  it('lists all customers', async () => {
    const r = await get('/api/customers');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.customers));
    assert.strictEqual(typeof r.body.count, 'number');
  });

  it('gets customer with conversations', async () => {
    const r1 = await post('/api/customers/resolve', { phone: '9990001111' });
    const r2 = await post('/api/webhooks/whatsapp', { from: '+919990001111', text: 'Test' });

    const cust = await get('/api/customers/' + r2.body.customerId);
    assert.strictEqual(cust.status, 200);
    assert.ok(cust.body.customer);
    assert.ok(Array.isArray(cust.body.conversations));
  });

  it('gets customer conversations sorted by date', async () => {
    const r1 = await post('/api/webhooks/whatsapp', { from: '+919990001222', text: 'Msg1' });
    const r2 = await post('/api/webhooks/whatsapp', { from: '+919990001222', text: 'Msg2' });

    const convs = await get('/api/customers/' + r1.body.customerId + '/conversations');
    assert.strictEqual(convs.status, 200);
    assert.strictEqual(convs.body.customerId, r1.body.customerId);
    assert.strictEqual(convs.body.totalConversations, 1); // Same conversation
  });

  it('returns 404 for unknown customer', async () => {
    const r = await get('/api/customers/cust-does-not-exist');
    assert.strictEqual(r.status, 404);
  });
});

describe('Stats', () => {
  it('returns aggregate statistics', async () => {
    const r = await get('/api/stats');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.success, true);
    assert.ok(typeof r.body.stats.totalCustomers === 'number');
    assert.ok(typeof r.body.stats.totalConversations === 'number');
    assert.ok(r.body.stats.byChannel);
    assert.ok(typeof r.body.stats.multiChannelCustomers === 'number');
  });
});

describe('Admin APIs', () => {
  it('generates API key', async () => {
    const r = await post('/api/admin/keys/generate');
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.success);
    assert.ok(r.body.key);
    assert.ok(r.body.key.length === 64); // 32 bytes hex
    assert.ok(r.body.keyId.startsWith('key-'));
  });

  it('checks WhatsApp webhook status', async () => {
    const r = await get('/api/admin/webhooks/whatsapp/status');
    assert.strictEqual(r.status, 200);
    assert.ok('url' in r.body);
    assert.ok('reachable' in r.body);
    assert.ok('publicUrlConfigured' in r.body);
  });
});

describe('SSE Events', () => {
  it('SSE stream connects and sends connected event', async () => {
    const r = await new Promise((resolve) => {
      const events = [];
      const req = http.get(baseUrl + '/api/events/stream', (res) => {
        res.on('data', (c) => events.push(c.toString()));
        setTimeout(() => {
          res.destroy();
          resolve({ status: res.statusCode, events: events.join('') });
        }, 1000);
      });
      req.on('error', reject);
    });
    assert.strictEqual(r.status, 200);
    assert.ok(r.events.includes('event: connected'));
    assert.ok(r.events.includes('"connectionId"'));
  });
});

describe('Error Handling', () => {
  it('returns 404 for unknown routes', async () => {
    const r = await get('/api/nonexistent-route-xyz');
    assert.strictEqual(r.status, 404);
  });

  it('returns 404 for unknown customer', async () => {
    const r = await get('/api/customers/cust-nonexistent');
    assert.strictEqual(r.status, 404);
  });

  it('returns 404 for unknown conversation', async () => {
    const r = await get('/api/conversations/conv-nonexistent/linked');
    assert.strictEqual(r.status, 404);
  });
});
