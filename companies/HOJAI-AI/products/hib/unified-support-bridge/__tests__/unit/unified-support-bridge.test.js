/**
 * Unified Support Bridge v2.0 — Unit Tests
 * Tests all production features: identity resolution, channel webhooks,
 * conversation merging, email normalization, events, merge API.
 */

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('http');

// ─── Test Server ─────────────────────────────────────────────
const TEST_PORT = 4886;
let baseUrl;

before(async () => {
  process.env.PORT = TEST_PORT.toString();
  process.env.USE_REDIS = 'false';
  process.env.USE_MONGODB = 'false';
  process.env.UNIFIED_INBOX_URL = `http://localhost:${TEST_PORT}`;
  process.env.TICKET_ENGINE_URL = `http://localhost:${TEST_PORT}`;
  process.env.CORPID_URL = `http://localhost:${TEST_PORT}`;
  process.env.WHATSAPP_VERIFY_TOKEN = 'test-verify-token';
  process.env.WHATSAPP_APP_SECRET = 'test-app-secret';
  process.env.SMTP_PORT = '0'; // Disable SMTP in tests

  const { app } = require('../../src/index.js');
  await new Promise((resolve) => app.listen(TEST_PORT, resolve));
  baseUrl = `http://localhost:${TEST_PORT}`;
});

// ─── HTTP helpers ─────────────────────────────────────────────
function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data || '{}') }); }
        catch { resolve({ status: res.statusCode, body }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

const get = (path, headers) => req('GET', path, null, headers);
const post = (path, body, headers) => req('POST', path, body, headers);
const postRaw = (path, body, headers) => req('POST', path, body, headers); // same for v2

// ─── TESTS ─────────────────────────────────────────────────

describe('Health', () => {
  it('returns health with features', async () => {
    const r = await get('/health');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.status, 'healthy');
    assert.strictEqual(r.body.version, '2.0.0');
    assert.ok(Array.isArray(r.body.features));
    assert.ok(r.body.features.includes('sse-events'));
    assert.ok(r.body.features.includes('smtp-receiver'));
    assert.strictEqual(r.body.storage, 'in-memory');
  });
});

describe('Customer Identity — Phone', () => {
  it('resolves from phone + normalizes to E.164', async () => {
    const r = await post('/api/customers/resolve', { phone: '8123456789', name: 'Priya' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.customer.phone, '+918123456789');
  });

  it('normalizes various phone formats', async () => {
    const r1 = await post('/api/customers/resolve', { phone: '+1-415-555-1234' });
    assert.strictEqual(r1.body.customer.phone, '+14155551234');

    const r2 = await post('/api/customers/resolve', { phone: '9876543210' });
    assert.strictEqual(r2.body.customer.phone, '+919876543210');
  });

  it('returns same customerId for same phone', async () => {
    const r1 = await post('/api/customers/resolve', { phone: '9900001111', name: 'Ravi' });
    const r2 = await post('/api/customers/resolve', { phone: '9900001111', name: 'Ravi Kumar' });
    assert.strictEqual(r1.body.customerId, r2.body.customerId);
  });

  it('returns 400 if no identifier', async () => {
    const r = await post('/api/customers/resolve', {});
    assert.strictEqual(r.status, 400);
  });
});

describe('Customer Identity — Email', () => {
  it('resolves from email + lowercases', async () => {
    const r = await post('/api/customers/resolve', { email: 'Priya@TechCorp.COM', name: 'Priya' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.customer.email, 'priya@techcorp.com');
  });

  it('returns same customerId for same email', async () => {
    const r1 = await post('/api/customers/resolve', { email: 'duplicate@test.com' });
    const r2 = await post('/api/customers/resolve', { email: 'DUPLICATE@TEST.COM' });
    assert.strictEqual(r1.body.customerId, r2.body.customerId);
  });
});

describe('Customer Identity — AppUserId', () => {
  it('resolves from appUserId', async () => {
    const r = await post('/api/customers/resolve', { appUserId: 'usr_abc123', name: 'Vikram' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.customer.appUserId, 'usr_abc123');
  });
});

describe('Cross-Channel Linking', () => {
  it('links appUserId to existing customer (same person)', async () => {
    // Step 1: customer starts on WhatsApp
    const r1 = await post('/api/webhooks/whatsapp', { from: '+919700001111', text: 'Hi from WhatsApp' });
    const custId = r1.body.customerId;
    assert.ok(custId.startsWith('cust-'));

    // Step 2: same customer uses the app — resolves to same customerId
    const r2 = await post('/api/webhooks/app', {
      appUserId: 'usr_crosschannel',
      message: 'Hi from app',
      platform: 'do-app',
      contactName: 'Same Person',
    });

    assert.strictEqual(r2.status, 200);
    assert.strictEqual(r2.body.customerId, custId, 'App should resolve to same customer as WhatsApp');

    // Step 3: get all conversations for customer
    const allConvs = await get(`/api/customers/${custId}/conversations`);
    assert.ok(allConvs.body.conversations.length >= 2);
  });

  it('link endpoint links additional identifiers', async () => {
    const r1 = await post('/api/customers/resolve', { phone: '91000000001', name: 'Anita' });
    const custId = r1.body.customerId;

    await post('/api/customers/link', { customerId: custId, email: 'anita@company.com' });

    // Resolve by email — should get same customerId
    const r2 = await post('/api/customers/resolve', { email: 'anita@company.com' });
    assert.strictEqual(r2.body.customerId, custId);
  });
});

describe('WhatsApp Webhook', () => {
  it('receives WhatsApp message and creates customer + conversation', async () => {
    const r = await post('/api/webhooks/whatsapp', {
      from: '+919876543210',
      contactName: 'Rahul Verma',
      text: 'Where is my order?',
    });

    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.received, true);
    assert.ok(r.body.customerId.startsWith('cust-'));
    assert.ok(r.body.conversationId);
    assert.strictEqual(r.body.customer.phone, '+919876543210');
  });

  it('continues existing WhatsApp conversation', async () => {
    const r1 = await post('/api/webhooks/whatsapp', { from: '+919900001111', text: 'First message' });
    const r2 = await post('/api/webhooks/whatsapp', { from: '+919900001111', text: 'Second message' });

    assert.strictEqual(r1.body.conversationId, r2.body.conversationId);
    assert.strictEqual(r1.body.customerId, r2.body.customerId);
  });

  it('returns 400 for missing phone', async () => {
    const r = await post('/api/webhooks/whatsapp', { text: 'Hello' });
    assert.strictEqual(r.status, 400);
  });
});

describe('WhatsApp Webhook — Verification Challenge', () => {
  it('accepts valid challenge token', async () => {
    const r = await get('/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=abc123');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body, 'abc123');
  });

  it('rejects wrong token', async () => {
    const r = await get('/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=xyz');
    assert.strictEqual(r.status, 403);
  });
});

describe('Email Webhook', () => {
  it('receives email and creates conversation', async () => {
    const r = await post('/api/webhooks/email', {
      from: 'amit@enterprise.com',
      subject: 'Billing Issue',
      text: 'I was charged twice for my order.',
    });

    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.received, true);
    assert.strictEqual(r.body.customer.email, 'amit@enterprise.com');
    assert.strictEqual(r.body.subject, 'Billing Issue');
  });

  it('returns 400 for missing from email', async () => {
    const r = await post('/api/webhooks/email', { subject: 'Test', text: 'Hello' });
    assert.strictEqual(r.status, 400);
  });
});

describe('App Webhook', () => {
  it('receives app message and creates conversation', async () => {
    const r = await post('/api/webhooks/app', {
      appUserId: 'usr_do_test',
      message: 'How do I change my password?',
      platform: 'do-app',
      contactName: 'Vikram Patel',
    });

    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.received, true);
    assert.ok(r.body.customerId.startsWith('cust-'));
    assert.ok(r.body.conversationId);
  });

  it('returns 400 for missing appUserId', async () => {
    const r = await post('/api/webhooks/app', { message: 'Hello' });
    assert.strictEqual(r.status, 400);
  });
});

describe('Conversation Merge', () => {
  it('merges two conversations from same customer', async () => {
    const r1 = await post('/api/webhooks/whatsapp', { from: '+919800001111', text: 'WhatsApp issue' });
    const conv1 = r1.body.conversationId;
    const custId = r1.body.customerId;

    const r2 = await post('/api/webhooks/app', { appUserId: 'usr_merge_test', message: 'App follow-up' });
    const conv2 = r2.body.conversationId;

    // Merge conv1 + conv2
    const merge = await post(`/api/conversations/${conv1}/merge`, {
      mergeWith: [conv2],
    });

    assert.strictEqual(merge.status, 200);
    assert.strictEqual(merge.body.success, true);
    assert.strictEqual(merge.body.primaryConversationId, conv1);
    assert.ok(merge.body.mergedFrom.includes(conv2));
    assert.ok(merge.body.channels.includes('whatsapp'));
    assert.ok(merge.body.channels.includes('chat'));
  });

  it('rejects merge of different customers', async () => {
    const r1 = await post('/api/webhooks/whatsapp', { from: '+919800001112', text: 'Customer A' });
    const r2 = await post('/api/webhooks/whatsapp', { from: '+919800001113', text: 'Customer B' });

    const merge = await post(`/api/conversations/${r1.body.conversationId}/merge`, {
      mergeWith: [r2.body.conversationId],
    });

    assert.strictEqual(merge.status, 400);
    assert.ok(merge.body.error.includes('different customers'));
  });

  it('rejects merge with < 2 conversations', async () => {
    const r = await post('/api/webhooks/whatsapp', { from: '+919800001114', text: 'Solo' });
    const merge = await post(`/api/conversations/${r.body.conversationId}/merge`, { mergeWith: [] });
    assert.strictEqual(merge.status, 400);
  });

  it('returns linked conversations', async () => {
    const r1 = await post('/api/webhooks/whatsapp', { from: '+919800001115', text: 'First' });
    const conv1 = r1.body.conversationId;

    const r2 = await post('/api/webhooks/app', { appUserId: 'usr_linked', message: 'Second' });
    await post(`/api/conversations/${conv1}/merge`, { mergeWith: [r2.body.conversationId] });

    const linked = await get(`/api/conversations/${conv1}/linked`);
    assert.strictEqual(linked.status, 200);
    assert.ok(linked.body.linkedConversations.length >= 1);
  });
});

describe('Ticket Creation', () => {
  it('creates ticket from conversation', async () => {
    const r = await post('/api/webhooks/whatsapp', { from: '+919800001116', text: 'Help needed!' });
    const convId = r.body.conversationId;

    const ticket = await post(`/api/conversations/${convId}/ticket`, {
      category: 'technical',
    });

    assert.strictEqual(ticket.status, 200);
    assert.strictEqual(ticket.body.success, true);
    assert.ok(ticket.body.ticketId);
  });
});

describe('Stats', () => {
  it('returns bridge statistics', async () => {
    const r = await get('/api/stats');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.success, true);
    assert.ok(typeof r.body.stats.totalCustomers === 'number');
    assert.ok(typeof r.body.stats.totalConversations === 'number');
    assert.ok(r.body.stats.byChannel);
  });
});

describe('404 Handler', () => {
  it('returns 404 for unknown routes', async () => {
    const r = await get('/api/nonexistent');
    assert.strictEqual(r.status, 404);
  });
});
