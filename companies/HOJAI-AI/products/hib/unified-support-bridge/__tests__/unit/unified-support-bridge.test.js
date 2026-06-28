/**
 * Unified Support Bridge — Unit Tests
 * Tests customer identity resolution, channel webhooks, and conversation merging
 *
 * Tests use real HTTP — server starts on port 4886 (test port) before tests,
 * shuts down after.
 */

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { URL } = require('url');

// ─── Test server lifecycle ────────────────────────────────────
const TEST_PORT = 4886;
let baseUrl;

before(async () => {
  // Spawn test server
  process.env.PORT = TEST_PORT.toString();
  process.env.UNIFIED_INBOX_URL = `http://localhost:${TEST_PORT}`; // won't be used — we mock fetch
  process.env.TICKET_ENGINE_URL = `http://localhost:${TEST_PORT}`;
  process.env.CORPID_URL = `http://localhost:${TEST_PORT}`;

  const { app } = require('../../src/index.js');
  await new Promise((resolve) => app.listen(TEST_PORT, resolve));
  baseUrl = `http://localhost:${TEST_PORT}`;
});

after(() => {
  process.removeAllListeners('uncaughtException');
});

// ─── HTTP helpers ──────────────────────────────────────────────
function request(method, path, body = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data || '{}') });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const get = (path, headers) => request('GET', path, null, headers);
const post = (path, body, headers) => request('POST', path, body, headers);

// ─── TESTS ─────────────────────────────────────────────────────

describe('Unified Support Bridge — Health', () => {
  it('should return health status', async () => {
    const res = await get('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.strictEqual(res.body.service, 'unified-support-bridge');
    assert.ok(Array.isArray(res.body.channels));
    assert.ok(res.body.channels.includes('whatsapp'));
    assert.ok(res.body.channels.includes('email'));
    assert.ok(res.body.channels.includes('app'));
  });
});

describe('Customer Identity Resolution', () => {
  it('should resolve customer from phone number', async () => {
    const res = await post('/api/customers/resolve', {
      phone: '8123456789',
      name: 'Priya Sharma',
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.customerId.startsWith('cust-'));
    assert.strictEqual(res.body.customer.phone, '+918123456789'); // E.164
  });

  it('should resolve customer from email', async () => {
    const res = await post('/api/customers/resolve', {
      email: 'Priya@TechCorp.com',
      name: 'Priya Sharma',
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.customer.email, 'priya@techcorp.com'); // lowercase
  });

  it('should resolve customer from appUserId', async () => {
    const res = await post('/api/customers/resolve', {
      appUserId: 'usr_12345',
      name: 'Priya Sharma',
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.customer.appUserId, 'usr_12345');
  });

  it('should return same customerId for same phone (idempotent)', async () => {
    const r1 = await post('/api/customers/resolve', { phone: '9876543210', name: 'Ravi Kumar' });
    const r2 = await post('/api/customers/resolve', { phone: '9876543210', name: 'Ravi K' });
    assert.strictEqual(r1.body.customerId, r2.body.customerId);
  });

  it('should return 400 if no identifier provided', async () => {
    const res = await post('/api/customers/resolve', {});
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  it('should normalize phone in various formats', async () => {
    const r1 = await post('/api/customers/resolve', { phone: '8123456789' });
    assert.strictEqual(r1.body.customer.phone, '+918123456789');

    const r2 = await post('/api/customers/resolve', { phone: '+14155551234' });
    assert.strictEqual(r2.body.customer.phone, '+14155551234');

    const r3 = await post('/api/customers/resolve', { phone: '+91-81234-56789' });
    assert.strictEqual(r3.body.customer.phone, '+918123456789');
  });

  it('should link additional identifiers to existing customer', async () => {
    const r1 = await post('/api/customers/resolve', { phone: '9000000001', name: 'Anita' });
    const custId = r1.body.customerId;

    const r2 = await post('/api/customers/link', {
      customerId: custId,
      email: 'anita@company.com',
    });
    assert.strictEqual(r2.status, 200);
    assert.strictEqual(r2.body.customer.email, 'anita@company.com');

    // Resolve by email → same customerId
    const r3 = await post('/api/customers/resolve', { email: 'anita@company.com' });
    assert.strictEqual(r3.body.customerId, custId);
  });

  it('should list all customers', async () => {
    const res = await get('/api/customers');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.count >= 0);
  });

  it('should get single customer', async () => {
    const r = await post('/api/customers/resolve', { phone: '9000000002', name: 'Single' });
    const res = await get(`/api/customers/${r.body.customerId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.customer.name, 'Single');
  });

  it('should return 404 for unknown customer', async () => {
    const res = await get('/api/customers/cust-nonexistent');
    assert.strictEqual(res.status, 404);
  });
});

describe('WhatsApp Webhook', () => {
  it('should receive WhatsApp message and resolve customer', async () => {
    const res = await post('/api/webhooks/whatsapp', {
      from: '+919876543210',
      contactName: 'Rahul Verma',
      text: 'My order #12345 is delayed',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.received, true);
    assert.ok(res.body.customerId.startsWith('cust-'));
    assert.ok(res.body.conversationId);
    assert.strictEqual(res.body.customer.phone, '+919876543210');
  });

  it('should handle Meta WhatsApp webhook format', async () => {
    const res = await post('/api/webhooks/whatsapp', {
      entry: [{
        changes: [{
          value: {
            messages: [{ id: 'wamid-123', text: { body: 'Hello!' }, timestamp: '1719580000' }],
            contacts: [{ wa_id: '+919988776655', profile: { name: 'Sneha Reddy' } }],
          },
        }],
      }],
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.received, true);
    assert.strictEqual(res.body.customer.phone, '+919988776655');
  });

  it('should return 400 for missing phone', async () => {
    const res = await post('/api/webhooks/whatsapp', { text: 'Hello' });
    assert.strictEqual(res.status, 400);
  });

  it('should continue existing WhatsApp conversation', async () => {
    const r1 = await post('/api/webhooks/whatsapp', { from: '+919900001111', text: 'First' });
    const r2 = await post('/api/webhooks/whatsapp', { from: '+919900001111', text: 'Second' });

    assert.strictEqual(r1.body.conversationId, r2.body.conversationId);
    assert.strictEqual(r1.body.customerId, r2.body.customerId);
  });
});

describe('Email Webhook', () => {
  it('should receive email and resolve customer', async () => {
    const res = await post('/api/webhooks/email', {
      from: 'amit@enterprise.com',
      subject: 'Urgent: Payment issue',
      text: 'I was charged twice.',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.received, true);
    assert.ok(res.body.customerId.startsWith('cust-'));
    assert.strictEqual(res.body.customer.email, 'amit@enterprise.com');
    assert.strictEqual(res.body.subject, 'Urgent: Payment issue');
  });

  it('should return 400 for missing from email', async () => {
    const res = await post('/api/webhooks/email', { subject: 'Test', text: 'Hello' });
    assert.strictEqual(res.status, 400);
  });
});

describe('App Webhook', () => {
  it('should receive app message and resolve customer', async () => {
    const res = await post('/api/webhooks/app', {
      appUserId: 'usr_do_abc123',
      message: 'How do I update my profile?',
      platform: 'do-app',
      contactName: 'Vikram Patel',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.received, true);
    assert.ok(res.body.customerId.startsWith('cust-'));
    assert.strictEqual(res.body.customer.name, 'Vikram Patel');
    assert.ok(res.body.sessionId);
  });

  it('should return 400 for missing appUserId/userId', async () => {
    const res = await post('/api/webhooks/app', { message: 'Hello' });
    assert.strictEqual(res.status, 400);
  });
});

describe('Cross-Channel Linking', () => {
  it('should link WhatsApp + Email + App to same customer', async () => {
    const phone = '+919700001111';
    const email = 'multichannel@test.com';

    const r1 = await post('/api/webhooks/whatsapp', { from: phone, text: 'Hi' });
    const custId = r1.body.customerId;

    await post('/api/customers/link', { customerId: custId, email });

    const r2 = await post('/api/webhooks/email', { from: email, subject: 'Follow up', text: '?' });
    assert.strictEqual(r2.body.customerId, custId);

    const r3 = await post('/api/webhooks/app', { appUserId: 'usr_mc', message: 'App follow-up' });
    assert.strictEqual(r3.body.customerId, custId);

    const allConvs = await get(`/api/customers/${custId}/conversations`);
    assert.ok(allConvs.body.conversations.length >= 3);
  });
});

describe('Conversation Merge', () => {
  it('should merge two conversations', async () => {
    const r1 = await post('/api/webhooks/whatsapp', { from: '+919800001111', text: 'WhatsApp msg' });
    const r2 = await post('/api/webhooks/app', { appUserId: 'usr_merge_test', message: 'App msg' });

    const res = await post(`/api/conversations/${r1.body.conversationId}/merge`, {
      mergeWith: [r2.body.conversationId],
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.primaryConversationId, r1.body.conversationId);
    assert.ok(res.body.mergedFrom.includes(r2.body.conversationId));
    assert.ok(res.body.channels.includes('whatsapp'));
    assert.ok(res.body.channels.includes('chat'));
  });

  it('should reject merge of different customers', async () => {
    const r1 = await post('/api/webhooks/whatsapp', { from: '+919800001112', text: 'A' });
    const r2 = await post('/api/webhooks/whatsapp', { from: '+919800001113', text: 'B' });

    const res = await post(`/api/conversations/${r1.body.conversationId}/merge`, {
      mergeWith: [r2.body.conversationId],
    });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('different customers'));
  });

  it('should reject merge with less than 2 conversations', async () => {
    const r1 = await post('/api/webhooks/whatsapp', { from: '+919800001114', text: 'Solo' });
    const res = await post(`/api/conversations/${r1.body.conversationId}/merge`, { mergeWith: [] });
    assert.strictEqual(res.status, 400);
  });

  it('should return linked conversations', async () => {
    const r1 = await post('/api/webhooks/whatsapp', { from: '+919800001115', text: 'First' });
    const conv1 = r1.body.conversationId;

    const r2 = await post('/api/webhooks/app', { appUserId: 'usr_linked', message: 'Second' });
    await post(`/api/conversations/${conv1}/merge`, { mergeWith: [r2.body.conversationId] });

    const linked = await get(`/api/conversations/${conv1}/linked`);
    assert.strictEqual(linked.status, 200);
    assert.ok(linked.body.linked.length >= 1);
  });
});

describe('Ticket Creation from Conversation', () => {
  it('should create ticket from conversation', async () => {
    const r = await post('/api/webhooks/whatsapp', { from: '+919800001116', text: 'Help!' });
    const res = await post(`/api/conversations/${r.body.conversationId}/ticket`, {
      category: 'technical',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.ticketId.startsWith('TKT-'));
  });
});

describe('Stats Endpoint', () => {
  it('should return bridge statistics', async () => {
    const res = await get('/api/stats');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(typeof res.body.stats.totalCustomers === 'number');
    assert.ok(typeof res.body.stats.totalConversations === 'number');
    assert.ok(res.body.stats.byChannel);
  });
});

describe('404 Handler', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await get('/api/nonexistent');
    assert.strictEqual(res.status, 404);
  });
});
