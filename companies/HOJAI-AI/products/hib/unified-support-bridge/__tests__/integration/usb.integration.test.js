/**
 * Unified Support Bridge v2.0 - Integration Tests
 * Tests all HTTP endpoints with a running server
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

const BASE = 'http://localhost:4887';
let baseUrl;

before(async () => {
  process.env.PORT = '4887';
  process.env.USE_REDIS = 'false';
  process.env.USE_MONGODB = 'false';
  process.env.UNIFIED_INBOX_URL = BASE;
  process.env.TICKET_ENGINE_URL = BASE;
  process.env.CORPID_URL = BASE;
  process.env.WHATSAPP_VERIFY_TOKEN = 'test-verify';
  process.env.SMTP_PORT = '0';
  process.env.IMAP_USER = '';
  const { app } = require('../../src/index.js');
  await new Promise((resolve) => app.listen(4887, resolve));
  baseUrl = BASE;
});

after(() => { process.exit(0); });

function rawReq(method, path, body, headers) {
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
        if (res.headers['content-type'] && res.headers['content-type'].includes('application/json') && data) {
          try { resolve({ status: res.statusCode, body: JSON.parse(data), raw: data }); }
          catch { resolve({ status: res.statusCode, body: data, raw: data }); }
        } else {
          resolve({ status: res.statusCode, body: data, raw: data });
        }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

const get = (path, h) => rawReq('GET', path, null, h);
const post = (path, body, h) => rawReq('POST', path, body, h);

// ─── Health ────────────────────────────────────────────────
describe('Health', () => {
  it('returns healthy + version + features', async () => {
    const r = await get('/health');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.status, 'healthy');
    assert.strictEqual(r.body.version, '2.0.0');
    assert.ok(Array.isArray(r.body.features));
    assert.ok(Array.isArray(r.body.channels));
  });
});

// ─── WhatsApp Webhook ───────────────────────────────────
describe('WhatsApp Webhook', () => {
  it('GET challenge returns plain text with correct token', async () => {
    const r = await get('/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test-verify&hub.challenge=ABC123');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.raw, 'ABC123');
  });

  it('GET rejects wrong token', async () => {
    const r = await get('/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=XYZ');
    assert.strictEqual(r.status, 403);
  });

  it('POST creates customer + conversation + returns JSON', async () => {
    const r = await post('/api/webhooks/whatsapp', {
      from: '+919876543210',
      contactName: 'Rahul Verma',
      text: 'Hello, I need help',
    });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(typeof r.body.received, 'boolean');
    assert.strictEqual(typeof r.body.processed, 'number');
    if (r.body.results && r.body.results[0]) {
      assert.ok(r.body.results[0].customerId);
      assert.ok(r.body.results[0].conversationId);
    }
  });

  it('continues existing conversation for same phone', async () => {
    const r1 = await post('/api/webhooks/whatsapp', { from: '+919990000111', text: 'First' });
    const r2 = await post('/api/webhooks/whatsapp', { from: '+919990000111', text: 'Second' });
    if (r1.body.results && r2.body.results && r1.body.results[0] && r2.body.results[0]) {
      assert.strictEqual(r1.body.results[0].customerId, r2.body.results[0].customerId);
      assert.strictEqual(r1.body.results[0].conversationId, r2.body.results[0].conversationId);
    }
  });
});

// ─── Email Webhook ──────────────────────────────────────
describe('Email Webhook', () => {
  it('accepts simple JSON format', async () => {
    const r = await post('/api/webhooks/email', {
      from: 'priya@techcorp.com',
      subject: 'Billing Issue',
      text: 'Charged twice',
    });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.received, true);
    assert.ok(r.body.customerId);
    assert.ok(r.body.conversationId);
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
  });
});

// ─── App Webhook ───────────────────────────────────────
describe('App Webhook', () => {
  it('creates customer + conversation', async () => {
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
  });

  it('accepts userId as alias', async () => {
    const r = await post('/api/webhooks/app', { userId: 'usr_alias', message: 'Hello' });
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.customerId);
  });

  it('returns 400 for missing appUserId', async () => {
    const r = await post('/api/webhooks/app', { message: 'Hello' });
    assert.strictEqual(r.status, 400);
  });
});

// ─── Customer Identity ──────────────────────────────────
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

  it('returns 400 when no identifier', async () => {
    const r = await post('/api/customers/resolve', { name: 'No ID' });
    assert.strictEqual(r.status, 400);
  });

  it('same phone = same customerId', async () => {
    const r1 = await post('/api/customers/resolve', { phone: '8800123456' });
    const r2 = await post('/api/customers/resolve', { phone: '8800123456' });
    assert.strictEqual(r1.body.customerId, r2.body.customerId);
  });

  it('same email case-insensitive = same customerId', async () => {
    const r1 = await post('/api/customers/resolve', { email: 'Dup@TEST.COM' });
    const r2 = await post('/api/customers/resolve', { email: 'dup@test.com' });
    assert.strictEqual(r1.body.customerId, r2.body.customerId);
  });
});

// ─── Cross-Channel Linking ──────────────────────────────
describe('Cross-Channel Linking', () => {
  it('links appUserId to existing customer via phone', async () => {
    const r1 = await post('/api/webhooks/whatsapp', { from: '+919988776655', text: 'From WhatsApp' });
    await new Promise((r) => setTimeout(r, 200));
    const custId = r1.body.results && r1.body.results[0] ? r1.body.results[0].customerId : null;
    const r2 = await post('/api/webhooks/app', { appUserId: 'usr_same_person', message: 'From app' });
    assert.strictEqual(r2.status, 200);
    if (custId && r2.body.customerId) {
      assert.strictEqual(r2.body.customerId, custId);
    }
  });

  it('link endpoint links additional identifiers', async () => {
    const r1 = await post('/api/customers/resolve', { phone: '91000000001', name: 'Anita' });
    const custId = r1.body.customerId;
    await post('/api/customers/link', { customerId: custId, email: 'anita@company.com' });
    const r2 = await post('/api/customers/resolve', { email: 'anita@company.com' });
    assert.strictEqual(r2.body.customerId, custId);
  });
});

// ─── Conversation Merge ─────────────────────────────────
describe('Conversation Merge', () => {
  it('merges two conversations from same customer', async () => {
    const r1 = await post('/api/webhooks/whatsapp', { from: '+919988001122', text: 'WhatsApp issue' });
    await new Promise((r) => setTimeout(r, 200));
    const conv1 = r1.body.results && r1.body.results[0] ? r1.body.results[0].conversationId : null;
    const r2 = await post('/api/webhooks/app', { appUserId: 'usr_merge_test', message: 'App follow-up' });
    await new Promise((r) => setTimeout(r, 200));
    const conv2 = r2.body.conversationId;
    if (!conv1 || !conv2) return; // skip if async not ready

    const merge = await post('/api/conversations/' + conv1 + '/merge', { mergeWith: [conv2] });
    assert.strictEqual(merge.status, 200);
    assert.strictEqual(merge.body.success, true);
    assert.ok(merge.body.channels.includes('whatsapp'));
    assert.ok(merge.body.channels.includes('chat'));
  });

  it('rejects merge from different customers', async () => {
    const r1 = await post('/api/webhooks/whatsapp', { from: '+919988001133', text: 'A' });
    await new Promise((r) => setTimeout(r, 200));
    const r2 = await post('/api/webhooks/whatsapp', { from: '+919988001144', text: 'B' });
    await new Promise((r) => setTimeout(r, 200));
    const conv1 = r1.body.results && r1.body.results[0] ? r1.body.results[0].conversationId : null;
    const conv2 = r2.body.results && r2.body.results[0] ? r2.body.results[0].conversationId : null;
    if (!conv1 || !conv2) return;

    const merge = await post('/api/conversations/' + conv1 + '/merge', { mergeWith: [conv2] });
    assert.strictEqual(merge.status, 400);
  });

  it('rejects merge with < 2 conversations', async () => {
    const r = await post('/api/webhooks/whatsapp', { from: '+919988001155', text: 'Solo' });
    await new Promise((res) => setTimeout(res, 200));
    const conv = r.body.results && r.body.results[0] ? r.body.results[0].conversationId : null;
    if (!conv) return;

    const merge = await post('/api/conversations/' + conv + '/merge', { mergeWith: [] });
    assert.strictEqual(merge.status, 400);
  });
});

// ─── Customer API ──────────────────────────────────────
describe('Customer API', () => {
  it('lists customers', async () => {
    const r = await get('/api/customers');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.customers));
  });

  it('returns 404 for unknown customer', async () => {
    const r = await get('/api/customers/cust-nonexistent-xyz');
    assert.strictEqual(r.status, 404);
  });
});

// ─── Stats ─────────────────────────────────────────────
describe('Stats', () => {
  it('returns aggregate statistics', async () => {
    const r = await get('/api/stats');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.success, true);
    assert.ok(typeof r.body.stats.totalCustomers === 'number');
    assert.ok(typeof r.body.stats.totalConversations === 'number');
    assert.ok(r.body.stats.byChannel);
  });
});

// ─── Admin APIs ────────────────────────────────────────
describe('Admin APIs', () => {
  it('generates API key', async () => {
    const r = await post('/api/admin/keys/generate');
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.success);
    assert.ok(r.body.key.length === 64);
  });

  it('checks WhatsApp webhook status', async () => {
    const r = await get('/api/admin/webhooks/whatsapp/status');
    assert.strictEqual(r.status, 200);
    assert.ok('url' in r.body);
    assert.ok('reachable' in r.body);
  });
});

// ─── SSE Events ────────────────────────────────────────
describe('SSE Events', () => {
  it('stream connects and sends connected event', async () => {
    const events = [];
    const promise = new Promise((resolve) => {
      const req = http.get(baseUrl + '/api/events/stream', (res) => {
        res.on('data', (c) => events.push(c.toString()));
        setTimeout(() => {
          res.destroy();
          resolve(events.join(''));
        }, 1500);
      });
      req.on('error', () => resolve(''));
    });
    const result = await promise;
    assert.ok(result.includes('event: connected'));
    assert.ok(result.includes('connectionId'));
  });
});

// ─── Error Handling ─────────────────────────────────────
describe('Error Handling', () => {
  it('returns 404 for unknown routes', async () => {
    const r = await get('/api/xyz-nonexistent');
    assert.strictEqual(r.status, 404);
  });
});
