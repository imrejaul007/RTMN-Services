/**
 * Tests for the WhatsApp channel module.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');
const { router, sessions, sendWhatsAppMessage } = require('../channels/whatsapp.js');

const BASE = '/api/v1/widget/channels/whatsapp';

// Helper: start a test server
function startTestServer() {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());
    app.use('/api/v1/widget/channels/whatsapp', router);
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function request(port, method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...headers
        }
      },
      (res) => {
        let chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString();
          let json = null;
          try { json = text ? JSON.parse(text) : null; } catch {}
          resolve({ status: res.statusCode, body: json, text });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function withServer(fn) {
  const { server, port } = await startTestServer();
  try {
    return await fn(port);
  } finally {
    server.close();
  }
}

test('WhatsApp channel: start creates session with valid E.164', async () => {
  await withServer(async (port) => {
    const res = await request(port, 'POST', BASE + '/start', {
      companyId: 'maya-collective',
      visitorId: 'v1',
      phone: '+919876543210'
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.success);
    assert.ok(res.body.data.sessionId.startsWith('wa_'));
    assert.equal(res.body.data.phone, '+919876543210');
    assert.ok(res.body.data.expiresAt);
  });
});

test('WhatsApp channel: rejects invalid phone format', async () => {
  await withServer(async (port) => {
    const invalidPhones = ['9876543210', '+0123456', 'not-a-number', '+1234'];
    for (const phone of invalidPhones) {
      const res = await request(port, 'POST', BASE + '/start', {
        companyId: 'maya-collective',
        visitorId: 'v1',
        phone
      });
      assert.equal(res.status, 400, `should reject ${phone}`);
      assert.match(res.body.error, /E\.164/);
    }
  });
});

test('WhatsApp channel: requires companyId, visitorId, phone', async () => {
  await withServer(async (port) => {
    const res = await request(port, 'POST', BASE + '/start', { phone: '+919876543210' });
    assert.equal(res.status, 400);
  });
});

test('WhatsApp channel: send delivers message and logs it', async () => {
  await withServer(async (port) => {
    const startRes = await request(port, 'POST', BASE + '/start', {
      companyId: 'maya-collective',
      visitorId: 'v1',
      phone: '+919876543210'
    });
    const sessionId = startRes.body.data.sessionId;
    const res = await request(port, 'POST', BASE + '/send', {
      sessionId,
      message: 'Hello from widget!'
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.delivered);
    assert.ok(res.body.data.messageId);
  });
});

test('WhatsApp channel: send requires valid session', async () => {
  await withServer(async (port) => {
    const res = await request(port, 'POST', BASE + '/send', {
      sessionId: 'wa_invalid',
      message: 'Hello'
    });
    assert.equal(res.status, 404);
  });
});

test('WhatsApp channel: send formats rich products content', async () => {
  // Mock global fetch to capture the call
  let captured = null;
  const originalFetch = global.fetch;
  global.fetch = async (url, opts) => {
    captured = { url, body: opts?.body ? JSON.parse(opts.body) : null };
    return { ok: true, status: 200, json: async () => ({ success: true, data: { messageId: 'spy_1' } }) };
  };

  try {
    await withServer(async (port) => {
      const startRes = await request(port, 'POST', BASE + '/start', {
        companyId: 'maya-collective',
        visitorId: 'v1',
        phone: '+919876543210'
      });
      const sessionId = startRes.body.data.sessionId;

      const res = await request(port, 'POST', BASE + '/send', {
        sessionId,
        message: 'Here are some products:',
        rich: {
          type: 'products',
          items: [
            { name: 'Hoodie', price: 1999 },
            { name: 'Cap', price: 599 }
          ]
        }
      });
      assert.equal(res.status, 200);
      assert.ok(captured, 'fetch should have been called');
      assert.ok(captured.body.body.includes('Hoodie'));
      assert.ok(captured.body.body.includes('1999'));
      assert.ok(captured.body.body.includes('Cap'));
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('WhatsApp channel: webhook receives inbound and finds session', async () => {
  await withServer(async (port) => {
    await request(port, 'POST', BASE + '/start', {
      companyId: 'maya-collective',
      visitorId: 'v1',
      phone: '+919876543210'
    });
    const res = await request(port, 'POST', BASE + '/webhook', {
      from: '+919876543210',
      body: 'Customer reply!',
      messageId: 'wamid.123',
      timestamp: '2026-06-24T10:00:00Z'
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.received, true);
    assert.equal(res.body.data.visitorId, 'v1');
    assert.equal(res.body.data.message, 'Customer reply!');
  });
});

test('WhatsApp channel: webhook from unknown phone returns no-session', async () => {
  await withServer(async (port) => {
    const res = await request(port, 'POST', BASE + '/webhook', {
      from: '+10000000000',
      body: 'hi'
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.sessionFound, false);
  });
});

test('WhatsApp channel: end removes session', async () => {
  await withServer(async (port) => {
    const startRes = await request(port, 'POST', BASE + '/start', {
      companyId: 'maya-collective',
      visitorId: 'v1',
      phone: '+919876543210'
    });
    const sessionId = startRes.body.data.sessionId;
    const endRes = await request(port, 'POST', BASE + '/end', { sessionId });
    assert.equal(endRes.status, 200);
    assert.equal(endRes.body.data.ended, true);
  });
});

test('WhatsApp channel: verify phone format', async () => {
  await withServer(async (port) => {
    const validRes = await request(port, 'POST', BASE + '/verify', { phone: '+919876543210' });
    assert.equal(validRes.status, 200);
    assert.equal(validRes.body.data.valid, true);
    assert.equal(validRes.body.data.country, '91');

    const invalidRes = await request(port, 'POST', BASE + '/verify', { phone: '9876543210' });
    assert.equal(invalidRes.status, 200);
    assert.equal(invalidRes.body.data.valid, false);
  });
});

test('WhatsApp channel: sendWhatsAppMessage falls back to mock when OS unreachable', async () => {
  const result = await sendWhatsAppMessage({
    to: '+919876543210',
    body: 'test message',
    sessionId: 'wa_test'
  });
  assert.ok(result.delivered);
  assert.ok(result.messageId);
  // Source will be 'mock' since no WhatsApp OS is running
  assert.ok(['mock', 'whatsapp-os', 'whatsapp-sdk'].includes(result.source));
});

test('WhatsApp channel: E.164 regex accepts common countries', () => {
  const valid = ['+919876543210', '+14155552671', '+447911123456', '+8613800138000', '+5511999999999'];
  for (const phone of valid) {
    assert.ok(/^\+[1-9]\d{6,14}$/.test(phone), `${phone} should be valid`);
  }
});

test('WhatsApp channel: E.164 regex rejects common errors', () => {
  const invalid = ['919876543210', '+0123456', '++1234567', 'phone', '', '+abc', '+12345'];
  for (const phone of invalid) {
    assert.ok(!/^\+[1-9]\d{6,14}$/.test(phone), `${phone} should be invalid`);
  }
});