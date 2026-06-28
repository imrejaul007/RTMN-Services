/**
 * PolicyOS — Webhook Route Tests
 *
 * Tests for:
 *  - POST /api/webhooks
 *  - GET  /api/webhooks
 *  - GET  /api/webhooks/:id
 *  - DELETE /api/webhooks/:id
 *  - POST /api/webhooks/:id/test
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const SERVICE_TOKEN = 'webhook-test-token';

let server;
let port;

async function startApp() {
  try {
    const authMod = await import('../../src/middleware/auth.js');
    authMod._resetAuthState?.();
  } catch { /* ignore */ }

  process.env.PORT = '0';
  process.env.POLICYOS_REQUIRE_AUTH = 'true';
  process.env.NODE_ENV = 'test';
  process.env.POLICYOS_SERVICE_TOKEN = SERVICE_TOKEN;
  process.env.JWT_SECRET = 'test-secret-32-chars-min-aaaaaaaaaaa';
  process.env.HOJAI_DATA_DIR = '/tmp/policy-os-webhooks-test';

  const url = new URL('../../src/index.js', import.meta.url);
  url.searchParams.set('bust', `${Date.now()}-${Math.random()}`);
  await import(url.href);
}

async function api(path, method = 'GET', body) {
  return new Promise((resolve) => {
    const headers = {
      'x-internal-token': SERVICE_TOKEN,
      'Content-Type': 'application/json',
    };
    const bodyStr = body ? JSON.stringify(body) : null;
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);
    const opts = { hostname: '127.0.0.1', port, path, method, headers };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, body: data }); }
      });
    });
    req.on('error', () => resolve({ status: 0, body: null }));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

before(async () => {
  await startApp();
  // Get the app from the module
  let attempts = 0;
  while (attempts < 50) {
    try {
      const mod = await import('../../src/index.js');
      const app = mod.default || mod.app;
      if (app && app.listen) {
        await new Promise((resolve) => {
          server = app.listen(0, '127.0.0.1', (err) => {
            if (err) { attempts++; setTimeout(resolve, 100); return; }
            port = server.address().port;
            resolve();
          });
        });
        if (port) break;
      }
    } catch { /* wait */ }
    attempts++;
    await new Promise(r => setTimeout(r, 50));
  }
  if (!port) throw new Error('Could not start app');
});

after(() => { server?.close(); });

// ── POST /api/webhooks ─────────────────────────────────────────────────────────

test('POST /api/webhooks — creates webhook with valid url and events', async () => {
  const res = await api('/api/webhooks', 'POST', {
    url: 'https://example.com/webhook',
    events: ['policy.created'],
  });
  assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(res.body.ok);
  assert.ok(res.body.webhook?.id?.startsWith('wh-'));
  assert.strictEqual(res.body.webhook.url, 'https://example.com/webhook');
  assert.strictEqual(res.body.webhook.events[0], 'policy.created');
  assert.ok(res.body.webhook.secret?.length > 10);
  assert.strictEqual(res.body.webhook.active, true);
});

test('POST /api/webhooks — rejects missing url', async () => {
  const res = await api('/api/webhooks', 'POST', { events: ['policy.created'] });
  assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(res.body.error?.toLowerCase().includes('url'));
});

test('POST /api/webhooks — rejects non-array events', async () => {
  const res = await api('/api/webhooks', 'POST', { url: 'https://example.com/wh', events: 'not-an-array' });
  assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}: ${JSON.stringify(res.body)}`);
});

test('POST /api/webhooks — rejects empty events array', async () => {
  const res = await api('/api/webhooks', 'POST', { url: 'https://example.com/wh', events: [] });
  assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}: ${JSON.stringify(res.body)}`);
});

test('POST /api/webhooks — rejects javascript: URL (XSS)', async () => {
  const res = await api('/api/webhooks', 'POST', { url: 'javascript:alert(1)', events: ['policy.created'] });
  assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(res.body.error?.toLowerCase().includes('url'));
});

test('POST /api/webhooks — rejects internal IP (ssrf)', async () => {
  const res = await api('/api/webhooks', 'POST', { url: 'http://127.0.0.1:22', events: ['policy.created'] });
  assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(res.body.error?.toLowerCase().includes('url'));
});

test('POST /api/webhooks — accepts custom secret', async () => {
  const res = await api('/api/webhooks', 'POST', {
    url: 'https://example.com/wh',
    events: ['policy.created'],
    secret: 'my-custom-secret',
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.webhook.secret, 'my-custom-secret');
});

test('POST /api/webhooks — respects active=false', async () => {
  const res = await api('/api/webhooks', 'POST', {
    url: 'https://example.com/wh',
    events: ['policy.created'],
    active: false,
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.webhook.active, false);
});

// ── GET /api/webhooks ──────────────────────────────────────────────────────────

test('GET /api/webhooks — lists webhooks without secrets', async () => {
  // First create one
  await api('/api/webhooks', 'POST', { url: 'https://example.com/wh', events: ['policy.created'] });
  const res = await api('/api/webhooks');
  assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(res.body.count >= 1);
  assert.ok(Array.isArray(res.body.webhooks));
  // Secrets must not be exposed
  for (const wh of res.body.webhooks) {
    assert.strictEqual(wh.secret, undefined, 'secret should not be exposed in list');
    assert.ok(wh.id?.startsWith('wh-'));
  }
});

// ── GET /api/webhooks/:id ─────────────────────────────────────────────────────

test('GET /api/webhooks/:id — returns webhook without secret', async () => {
  // Create one
  const create = await api('/api/webhooks', 'POST', { url: 'https://example.com/wh', events: ['policy.created'] });
  const id = create.body.webhook.id;
  const res = await api(`/api/webhooks/${id}`);
  assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.strictEqual(res.body.id, id);
  assert.strictEqual(res.body.secret, undefined, 'secret should not be exposed');
});

test('GET /api/webhooks/:id — 404 for unknown id', async () => {
  const res = await api('/api/webhooks/wh-does-not-exist');
  assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}: ${JSON.stringify(res.body)}`);
});

// ── DELETE /api/webhooks/:id ───────────────────────────────────────────────────

test('DELETE /api/webhooks/:id — deletes webhook', async () => {
  // Create one
  const create = await api('/api/webhooks', 'POST', { url: 'https://example.com/wh', events: ['policy.created'] });
  const id = create.body.webhook.id;
  const res = await api(`/api/webhooks/${id}`, 'DELETE');
  assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(res.body.deleted);
  assert.strictEqual(res.body.webhookId, id);
});

test('DELETE /api/webhooks/:id — 404 for unknown id', async () => {
  const res = await api('/api/webhooks/wh-nonexistent', 'DELETE');
  assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}: ${JSON.stringify(res.body)}`);
});

// ── POST /api/webhooks/:id/test ────────────────────────────────────────────────

test('POST /api/webhooks/:id/test — returns delivery result for unreachable URL', async () => {
  // Create one pointing to an unreachable but valid domain (passes URL validation)
  const create = await api('/api/webhooks', 'POST', {
    url: 'https://this-domain-definitely-does-not-exist-123456.invalid/path',
    events: ['policy.created'],
  });
  // If URL validation blocked it (internal IP check), fall back to reachable URL
  const id = create.body.webhook?.id;
  if (!id) {
    // URL was blocked; use a real but unreachable URL
    const fallback = await api('/api/webhooks', 'POST', {
      url: 'https://10.255.255.1/test',
      events: ['policy.created'],
    });
    const fid = fallback.body.webhook?.id;
    assert.ok(fid, 'Failed to create test webhook: ' + JSON.stringify(fallback.body));
    const res = await api(`/api/webhooks/${fid}/test`, 'POST');
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body.ok === 'boolean');
    assert.ok(res.body.delivery);
    assert.strictEqual(res.body.delivery.status, 'failed');
    return;
  }
  const res = await api(`/api/webhooks/${id}/test`, 'POST');
  assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(typeof res.body.ok === 'boolean');
  assert.ok(res.body.delivery);
  assert.ok(res.body.delivery.id);
  assert.ok(res.body.delivery.status === 'failed' || res.body.delivery.status === 'success');
});

test('POST /api/webhooks/:id/test — 404 for unknown webhook', async () => {
  const res = await api('/api/webhooks/wh-nonexistent/test', 'POST');
  assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}: ${JSON.stringify(res.body)}`);
});

// ── Auth ───────────────────────────────────────────────────────────────────────

test('webhooks require authentication', async () => {
  const opts = { hostname: '127.0.0.1', port, path: '/api/webhooks', method: 'GET', headers: {} };
  const res = await new Promise((resolve) => {
    const req = http.request(opts, (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => {
        try { resolve({ status: r.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: r.statusCode, body: d }); }
      });
    });
    req.on('error', () => resolve({ status: 0, body: null }));
    req.end();
  });
  assert.strictEqual(res.status, 401, 'Should reject unauthenticated request');
});
