/**
 * Tests for the widget backend HTTP API.
 * Uses Node's built-in test runner + direct function calls (no supertest).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

// Set env BEFORE requiring the app
process.env.WIDGET_REQUIRE_AUTH = 'false';
process.env.WIDGET_BACKEND_PORT = '0'; // unused — we don't actually start the server

const { app, conversations, getConversation } = require('../index');

// Helper: make a fake request via Express's req/res mocking
// We test the route handlers via in-memory conversations after using the app's
// request pipeline directly. Simpler: import express and use http.

const http = require('node:http');
const express = require('express');

function startTestServer() {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
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
          resolve({ status: res.statusCode, headers: res.headers, body: json, text });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

test('GET /health returns ok', async () => {
  const { server, port } = await startTestServer();
  try {
    const res = await request(port, 'GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'widget-backend');
  } finally {
    server.close();
  }
});

test('GET /ready returns supported intents', async () => {
  const { server, port } = await startTestServer();
  try {
    const res = await request(port, 'GET', '/ready');
    assert.equal(res.status, 200);
    assert.equal(res.body.ready, true);
    assert.ok(Array.isArray(res.body.supportedIntents));
    assert.ok(res.body.supportedIntents.includes('product_search'));
  } finally {
    server.close();
  }
});

test('GET /api/v1/widget/intents returns intent list', async () => {
  const { server, port } = await startTestServer();
  try {
    const res = await request(port, 'GET', '/api/v1/widget/intents');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.intents.length >= 10);
    const ps = res.body.data.intents.find((i) => i.name === 'product_search');
    assert.ok(ps);
    assert.equal(ps.agent, 'sales');
  } finally {
    server.close();
  }
});

test('POST /api/v1/widget/message handles greeting', async () => {
  const { server, port } = await startTestServer();
  try {
    const res = await request(port, 'POST', '/api/v1/widget/message', {
      companyId: 'maya',
      visitorId: 'v-test-1',
      message: 'hi',
      user: { name: 'TestUser' }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.reply.includes('TestUser'));
    assert.equal(res.body.data.intent, 'greeting');
    assert.equal(res.body.data.agent, 'assistant');
  } finally {
    server.close();
  }
});

test('POST /api/v1/widget/message classifies product_search', async () => {
  const { server, port } = await startTestServer();
  try {
    const res = await request(port, 'POST', '/api/v1/widget/message', {
      companyId: 'maya',
      visitorId: 'v-test-2',
      message: 'show me black hoodies'
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.intent, 'product_search');
  } finally {
    server.close();
  }
});

test('POST /api/v1/widget/message rejects missing companyId', async () => {
  const { server, port } = await startTestServer();
  try {
    const res = await request(port, 'POST', '/api/v1/widget/message', {
      visitorId: 'v1',
      message: 'hi'
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /companyId/);
  } finally {
    server.close();
  }
});

test('POST /api/v1/widget/message rejects missing visitorId', async () => {
  const { server, port } = await startTestServer();
  try {
    const res = await request(port, 'POST', '/api/v1/widget/message', {
      companyId: 'maya',
      message: 'hi'
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /visitorId/);
  } finally {
    server.close();
  }
});

test('POST /api/v1/widget/message rejects missing message', async () => {
  const { server, port } = await startTestServer();
  try {
    const res = await request(port, 'POST', '/api/v1/widget/message', {
      companyId: 'maya',
      visitorId: 'v1'
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /message/);
  } finally {
    server.close();
  }
});

test('POST /api/v1/widget/identify stores user', async () => {
  const { server, port } = await startTestServer();
  try {
    const res = await request(port, 'POST', '/api/v1/widget/identify', {
      visitorId: 'v-test-ident',
      user: { id: 'u1', email: 'a@b.com' }
    });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.user, { id: 'u1', email: 'a@b.com' });
  } finally {
    server.close();
  }
});

test('GET /api/v1/widget/conversation/:visitorId returns history', async () => {
  const { server, port } = await startTestServer();
  try {
    // Send a message first
    await request(port, 'POST', '/api/v1/widget/message', {
      companyId: 'maya',
      visitorId: 'v-conv-1',
      message: 'hi'
    });
    // Then fetch
    const res = await request(port, 'GET', '/api/v1/widget/conversation/v-conv-1');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.visitorId, 'v-conv-1');
    assert.equal(res.body.data.messages.length, 2);
    assert.equal(res.body.data.messages[0].role, 'user');
    assert.equal(res.body.data.messages[1].role, 'assistant');
  } finally {
    server.close();
  }
});

test('GET /api/v1/widget/conversation/:visitorId returns 404 for unknown', async () => {
  const { server, port } = await startTestServer();
  try {
    const res = await request(port, 'GET', '/api/v1/widget/conversation/v-unknown');
    assert.equal(res.status, 404);
  } finally {
    server.close();
  }
});

test('Auth: enabled when HOJAI_API_KEY set + bad key rejected', async () => {
  // Restart with auth enabled
  delete require.cache[require.resolve('../index')];
  process.env.WIDGET_REQUIRE_AUTH = 'true';
  process.env.HOJAI_API_KEY = 'secret-test-key';
  const { app: authApp } = require('../index');

  const server = await new Promise((resolve) => {
    const s = http.createServer(authApp);
    s.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;

  try {
    // Without token
    const r1 = await request(port, 'POST', '/api/v1/widget/message', {
      companyId: 'maya', visitorId: 'v1', message: 'hi'
    });
    assert.equal(r1.status, 401);

    // With wrong token
    const r2 = await request(port, 'POST', '/api/v1/widget/message', {
      companyId: 'maya', visitorId: 'v1', message: 'hi'
    }, { Authorization: 'Bearer wrong-key' });
    assert.equal(r2.status, 401);

    // With valid token
    const r3 = await request(port, 'POST', '/api/v1/widget/message', {
      companyId: 'maya', visitorId: 'v1', message: 'hi'
    }, { Authorization: 'Bearer secret-test-key' });
    assert.equal(r3.status, 200);
  } finally {
    server.close();
    // Reset
    process.env.WIDGET_REQUIRE_AUTH = 'false';
    delete process.env.HOJAI_API_KEY;
  }
});
