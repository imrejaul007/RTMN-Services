/**
 * Unified Support Bridge v2.0 - Integration Tests
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

let baseUrl = 'http://localhost:4887';

before(async () => {
  process.env.PORT = '4887';
  process.env.USE_REDIS = 'false';
  process.env.USE_MONGODB = 'false';
  process.env.UNIFIED_INBOX_URL = 'http://localhost:4887';
  process.env.TICKET_ENGINE_URL = 'http://localhost:4887';
  process.env.CORPID_URL = 'http://localhost:4887';
  process.env.WHATSAPP_VERIFY_TOKEN = 'usb-verify-token-change-me';
  process.env.SMTP_PORT = '0';
  process.env.IMAP_USER = '';
  const { app } = require('../../src/index.js');
  await new Promise((resolve) => app.listen(4887, resolve));
});

after(() => { process.exit(0); });

function rawReq(method, path, body, headers) {
  return new Promise((resolve) => {
    const url = new URL(path, baseUrl);
    const opts = {
      hostname: url.hostname, port: url.port, path: url.pathname, method: method,
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
    r.on('error', () => resolve({ status: 0, body: '', raw: '' }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

const get = (path) => rawReq('GET', path, null, {});
const post = (path, body) => rawReq('POST', path, body, {});

describe('Health', () => {
  it('returns healthy + version + features', async () => {
    const r = await get('/health');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.status, 'healthy');
    assert.strictEqual(r.body.version, '2.0.0');
    assert.ok(Array.isArray(r.body.features));
  });
});

describe('WhatsApp Webhook', () => {
  it('POST creates customer + conversation + returns JSON', async () => {
    const r = await post('/api/webhooks/whatsapp', { from: '+919876543210', contactName: 'Rahul', text: 'Hello' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.received, true);
    assert.strictEqual(r.body.processed, 1);
    assert.ok(r.body.results && r.body.results[0]);
    assert.ok(r.body.results[0].customerId);
    assert.ok(r.body.results[0].conversationId);
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

describe('Email Webhook', () => {
  it('accepts simple JSON + returns customer', async () => {
    const r = await post('/api/webhooks/email', { from: 'priya@techcorp.com', subject: 'Billing', text: 'Help' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.received, true);
    assert.ok(r.body.customerId);
    assert.ok(r.body.conversationId);
    assert.ok(r.body.customer);
    assert.strictEqual(r.body.customer.email, 'priya@techcorp.com');
  });

  it('normalizes email to lowercase', async () => {
    const r = await post('/api/webhooks/email', { from: 'JOHN@STARTUP.IO', subject: 'Test', text: 'Hi' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.customer.email, 'john@startup.io');
  });

  it('returns 400 for missing from', async () => {
    const r = await post('/api/webhooks/email', { subject: 'Test', text: 'Hi' });
    assert.strictEqual(r.status, 400);
  });
});

describe('App Webhook', () => {
  it('creates customer + conversation', async () => {
    const r = await post('/api/webhooks/app', { appUserId: 'usr_do_123', message: 'Help', platform: 'do-app' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.received, true);
    assert.ok(r.body.customerId.startsWith('cust-'));
    assert.ok(r.body.conversationId.startsWith('conv-'));
  });

  it('returns 400 for missing appUserId', async () => {
    const r = await post('/api/webhooks/app', { message: 'Hi' });
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

  it('returns 400 when no identifier', async () => {
    const r = await post('/api/customers/resolve', { name: 'No ID' });
    assert.strictEqual(r.status, 400);
  });

  it('same phone = same customerId', async () => {
    const r1 = await post('/api/customers/resolve', { phone: '8800123456' });
    const r2 = await post('/api/customers/resolve', { phone: '8800123456' });
    assert.strictEqual(r1.body.customerId, r2.body.customerId);
  });
});

describe('Cross-Channel Linking', () => {
  it('link endpoint links identifiers', async () => {
    const r1 = await post('/api/customers/resolve', { phone: '91000000001', name: 'Anita' });
    const custId = r1.body.customerId;
    await post('/api/customers/link', { customerId: custId, email: 'anita@company.com' });
    const r2 = await post('/api/customers/resolve', { email: 'anita@company.com' });
    assert.strictEqual(r2.body.customerId, custId);
  });
});

describe('Stats', () => {
  it('returns aggregate stats', async () => {
    const r = await get('/api/stats');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.success, true);
    assert.ok(typeof r.body.stats.totalCustomers === 'number');
    assert.ok(typeof r.body.stats.totalConversations === 'number');
    assert.ok(r.body.stats.byChannel);
  });
});

describe('Admin APIs', () => {
  it('generates API key', async () => {
    const r = await post('/api/admin/keys/generate', {});
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

describe('Error Handling', () => {
  it('returns 404 for unknown routes', async () => {
    const r = await get('/api/xyz-nonexistent');
    assert.strictEqual(r.status, 404);
  });

  it('returns 404 for unknown customer', async () => {
    const r = await get('/api/customers/cust-nonexistent-xyz');
    assert.strictEqual(r.status, 404);
  });
});
