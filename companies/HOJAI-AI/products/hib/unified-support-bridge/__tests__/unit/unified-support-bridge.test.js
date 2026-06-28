/**
 * Unified Support Bridge — Unit Tests
 * Tests customer identity resolution, channel webhooks, and conversation merging
 */

const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert');

// ─── Mock external services ────────────────────────────────────
// We mock fetch to avoid real HTTP calls to unified-inbox/ticket-engine/CorpID

const mockUnifiedInbox = {};
const mockTicketEngine = {};
const mockCorpId = {};

function createMockFetch() {
  return async (url, options) => {
    const body = options?.body ? JSON.parse(options.body) : {};

    // Unified Inbox mock
    if (url.includes('localhost:4870')) {
      const path = url.replace('http://localhost:4870', '');
      if (path === '/api/conversations' && options.method === 'POST') {
        const id = `conv-${Date.now()}`;
        mockUnifiedInbox[id] = body;
        return { ok: true, json: async () => ({ conversation: { id, ...body } }) };
      }
      if (path.startsWith('/api/conversations/') && path.endsWith('/messages') && options.method === 'POST') {
        return { ok: true, json: async () => ({ success: true }) };
      }
      if (path.match(/^\/api\/conversations\/[^/]+$/) && options.method === 'GET') {
        const id = path.split('/')[3];
        return { ok: true, json: async () => ({ conversation: mockUnifiedInbox[id] || { id } }) };
      }
    }

    // Ticket Engine mock
    if (url.includes('localhost:4872')) {
      if (path === '/api/tickets' && options.method === 'POST') {
        const id = `TKT-${Date.now()}`;
        return { ok: true, json: async () => ({ ticket: { id, ...body } }) };
      }
    }

    // CorpID mock — not found (simulating no existing identity)
    if (url.includes('localhost:4702')) {
      return { ok: false };
    }

    return { ok: false };
  };
}

// ─── Mock fetch globally ────────────────────────────────────────
let originalFetch;
beforeEach(() => {
  originalFetch = global.fetch;
  global.fetch = createMockFetch();
});

const { afterEach, after } = require('node:test');
afterEach(() => {
  global.fetch = originalFetch;
});

// ─── Import the service (after mocking) ─────────────────────────
const { app } = (() => {
  // Clear module cache to allow re-require with mocked fetch
  delete require.cache[require.resolve('../../src/index.js')];
  return { app: require('../../src/index.js') };
})();

// Minimal supertest-like helper using native http
function createTestClient(app) {
  const http = require('http');
  const { URL } = require('url');

  function makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(`http://localhost:4885${path}`);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data || '{}') });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  return {
    get: (path, headers) => makeRequest('GET', path, null, headers),
    post: (path, body, headers) => makeRequest('POST', path, body, headers),
    patch: (path, body, headers) => makeRequest('PATCH', path, body, headers),
  };
}

// Start server for tests
let server;
let client;

beforeEach(() => {
  // Server is already started by require, get reference
  client = createTestClient(app);
});

// ─── TESTS ─────────────────────────────────────────────────────

describe('Unified Support Bridge — Health', () => {
  it('should return health status', async () => {
    const res = await client.get('/health');
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
    const res = await client.post('/api/customers/resolve', {
      phone: '8123456789',
      name: 'Priya Sharma',
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.customerId.startsWith('cust-'));
    assert.strictEqual(res.body.customer.phone, '+918123456789'); // normalized to E.164
    assert.strictEqual(res.body.customer.name, 'Priya Sharma');
  });

  it('should resolve customer from email', async () => {
    const res = await client.post('/api/customers/resolve', {
      email: 'Priya@TechCorp.com',
      name: 'Priya Sharma',
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.customer.email, 'priya@techcorp.com'); // lowercase
  });

  it('should resolve customer from appUserId', async () => {
    const res = await client.post('/api/customers/resolve', {
      appUserId: 'usr_12345',
      name: 'Priya Sharma',
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.customer.appUserId, 'usr_12345');
  });

  it('should return same customerId for same phone (idempotent)', async () => {
    const r1 = await client.post('/api/customers/resolve', { phone: '9876543210', name: 'Ravi Kumar' });
    const r2 = await client.post('/api/customers/resolve', { phone: '9876543210', name: 'Ravi K' });
    assert.strictEqual(r1.body.customerId, r2.body.customerId);
  });

  it('should return 400 if no identifier provided', async () => {
    const res = await client.post('/api/customers/resolve', {});
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes('phone, email, or appUserId'));
  });

  it('should normalize phone in various formats', async () => {
    // 10-digit → +91
    const r1 = await client.post('/api/customers/resolve', { phone: '8123456789' });
    assert.strictEqual(r1.body.customer.phone, '+918123456789');

    // Already E.164
    const r2 = await client.post('/api/customers/resolve', { phone: '+14155551234' });
    assert.strictEqual(r2.body.customer.phone, '+14155551234');

    // With dashes/spaces
    const r3 = await client.post('/api/customers/resolve', { phone: '+91-81234-56789' });
    assert.strictEqual(r3.body.customer.phone, '+918123456789');
  });

  it('should link additional identifiers to existing customer', async () => {
    // First: create customer with phone
    const r1 = await client.post('/api/customers/resolve', { phone: '9000000001', name: 'Anita' });
    const custId = r1.body.customerId;

    // Then: link email to same customer
    const r2 = await client.post('/api/customers/link', {
      customerId: custId,
      email: 'anita@company.com',
    });
    assert.strictEqual(r2.status, 200);
    assert.strictEqual(r2.body.customer.email, 'anita@company.com');
    assert.strictEqual(r2.body.customer.phone, '+919000000001');

    // Now resolve by email — should get same customerId
    const r3 = await client.post('/api/customers/resolve', { email: 'anita@company.com' });
    assert.strictEqual(r3.body.customerId, custId);
  });

  it('should list all customers', async () => {
    const res = await client.get('/api/customers');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.count >= 0);
    assert.ok(Array.isArray(res.body.customers));
  });
});

describe('WhatsApp Webhook', () => {
  it('should receive WhatsApp message and resolve customer', async () => {
    const res = await client.post('/api/webhooks/whatsapp', {
      from: '+919876543210',
      contactName: 'Rahul Verma',
      text: 'My order #12345 is delayed',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.received, true);
    assert.ok(res.body.customerId.startsWith('cust-'));
    assert.ok(res.body.conversationId);
    assert.strictEqual(res.body.customer.phone, '+919876543210');
    assert.strictEqual(res.body.customer.name, 'Rahul Verma');
  });

  it('should handle Meta WhatsApp webhook format', async () => {
    const res = await client.post('/api/webhooks/whatsapp', {
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
    assert.strictEqual(res.body.customer.name, 'Sneha Reddy');
  });

  it('should return 400 for missing phone', async () => {
    const res = await client.post('/api/webhooks/whatsapp', { text: 'Hello' });
    assert.strictEqual(res.status, 400);
  });

  it('should continue existing WhatsApp conversation', async () => {
    // First message
    const r1 = await client.post('/api/webhooks/whatsapp', {
      from: '+919900001111',
      text: 'First message',
    });

    // Second message from same phone — should reuse conversation
    const r2 = await client.post('/api/webhooks/whatsapp', {
      from: '+919900001111',
      text: 'Second message',
    });

    assert.strictEqual(r1.body.conversationId, r2.body.conversationId);
    assert.strictEqual(r1.body.customerId, r2.body.customerId);
  });
});

describe('Email Webhook', () => {
  it('should receive email and resolve customer', async () => {
    const res = await client.post('/api/webhooks/email', {
      from: 'amit@enterprise.com',
      subject: 'Urgent: Payment issue',
      text: 'I was charged twice for my subscription.',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.received, true);
    assert.ok(res.body.customerId.startsWith('cust-'));
    assert.strictEqual(res.body.customer.email, 'amit@enterprise.com');
    assert.strictEqual(res.body.subject, 'Urgent: Payment issue');
  });

  it('should handle SendGrid format', async () => {
    const res = await client.post('/api/webhooks/email', {
      from: 'noreply@marketing.com',
      fromName: 'Marketing Team',
      subject: 'New Offers!',
      text: 'Check out our latest deals.',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.customer.email, 'noreply@marketing.com');
  });

  it('should return 400 for missing from email', async () => {
    const res = await client.post('/api/webhooks/email', {
      subject: 'Test',
      text: 'Hello',
    });
    assert.strictEqual(res.status, 400);
  });
});

describe('App Webhook', () => {
  it('should receive app message and resolve customer', async () => {
    const res = await client.post('/api/webhooks/app', {
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
    const res = await client.post('/api/webhooks/app', { message: 'Hello' });
    assert.strictEqual(res.status, 400);
  });
});

describe('Cross-Channel Linking', () => {
  it('should link WhatsApp + Email + App to same customer', async () => {
    const phone = '+919700001111';
    const email = 'multichannel@test.com';

    // Step 1: WhatsApp message
    const r1 = await client.post('/api/webhooks/whatsapp', {
      from: phone,
      text: 'Hi, I sent an email earlier',
    });
    const custId = r1.body.customerId;
    const whatsappConv = r1.body.conversationId;

    // Step 2: Link email to same customer
    await client.post('/api/customers/link', { customerId: custId, email });

    // Step 3: Email from same customer
    const r2 = await client.post('/api/webhooks/email', {
      from: email,
      subject: 'Following up',
      text: 'Did you get my WhatsApp?',
    });
    assert.strictEqual(r2.body.customerId, custId);

    // Step 4: App message from same customer
    const r3 = await client.post('/api/webhooks/app', {
      appUserId: 'usr_multichannel',
      message: 'App follow-up',
    });
    assert.strictEqual(r3.body.customerId, custId);

    // Step 5: Get all conversations for customer
    const allConvs = await client.get(`/api/customers/${custId}/conversations`);
    assert.ok(allConvs.body.conversations.length >= 3);
    assert.strictEqual(allConvs.body.customerId, custId);
  });
});

describe('Conversation Merge', () => {
  it('should merge two conversations', async () => {
    // Create two conversations
    const r1 = await client.post('/api/webhooks/whatsapp', { from: '+919800001111', text: 'WhatsApp msg' });
    const r2 = await client.post('/api/webhooks/app', { appUserId: 'usr_merge_test', message: 'App msg' });

    const conv1 = r1.body.conversationId;
    const conv2 = r2.body.conversationId;

    // Merge
    const res = await client.post(`/api/conversations/${conv1}/merge`, {
      mergeWith: [conv2],
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.primaryConversationId, conv1);
    assert.ok(res.body.mergedFrom.includes(conv2));
    assert.ok(res.body.channels.includes('whatsapp'));
    assert.ok(res.body.channels.includes('chat'));
  });

  it('should reject merge of different customers', async () => {
    const r1 = await client.post('/api/webhooks/whatsapp', { from: '+919800001112', text: 'Customer A' });
    const r2 = await client.post('/api/webhooks/whatsapp', { from: '+919800001113', text: 'Customer B' });

    const res = await client.post(`/api/conversations/${r1.body.conversationId}/merge`, {
      mergeWith: [r2.body.conversationId],
    });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('different customers'));
  });

  it('should reject merge with less than 2 conversations', async () => {
    const r1 = await client.post('/api/webhooks/whatsapp', { from: '+919800001114', text: 'Solo' });
    const res = await client.post(`/api/conversations/${r1.body.conversationId}/merge`, { mergeWith: [] });
    assert.strictEqual(res.status, 400);
  });

  it('should return linked conversations', async () => {
    const r1 = await client.post('/api/webhooks/whatsapp', { from: '+919800001115', text: 'First' });
    const conv1 = r1.body.conversationId;

    // Merge with a new one
    const r2 = await client.post('/api/webhooks/app', { appUserId: 'usr_linked', message: 'Second' });
    await client.post(`/api/conversations/${conv1}/merge`, { mergeWith: [r2.body.conversationId] });

    const linked = await client.get(`/api/conversations/${conv1}/linked`);
    assert.strictEqual(linked.status, 200);
    assert.strictEqual(linked.body.conversationId, conv1);
    assert.ok(linked.body.linked.length >= 1);
  });
});

describe('Ticket Creation from Conversation', () => {
  it('should create ticket from conversation', async () => {
    const r = await client.post('/api/webhooks/whatsapp', { from: '+919800001116', text: 'Help!' });
    const res = await client.post(`/api/conversations/${r.body.conversationId}/ticket`, {
      category: 'technical',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.ticketId.startsWith('TKT-'));
  });
});

describe('Stats Endpoint', () => {
  it('should return bridge statistics', async () => {
    const res = await client.get('/api/stats');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(typeof res.body.stats.totalCustomers === 'number');
    assert.ok(typeof res.body.stats.totalConversations === 'number');
    assert.ok(res.body.stats.byChannel);
  });
});

describe('404 Handler', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await client.get('/api/nonexistent');
    assert.strictEqual(res.status, 404);
  });
});

// ─── Server lifecycle ───────────────────────────────────────────
after(() => {
  if (server) server.close();
});
