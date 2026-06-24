/**
 * agent-security unit tests
 * Run with: node --test tests/unit/agent-security.test.js
 *
 * Requires env vars:
 *   JWT_SECRET  (>= 32 chars)
 *   SECRETS_PEPPER (>= 32 chars)
 */

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const http = require('node:http');

// Set env vars BEFORE requiring the service
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-32-chars-min-aaaaaaaaaaa';
process.env.SECRETS_PEPPER = process.env.SECRETS_PEPPER || 'test-pepper-32-chars-min-bbbbbbbbbbbb';
process.env.INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'test-internal-token';
process.env.PORT = process.env.PORT || '4797';
// Ensure unique data dir per test run
const DATA_DIR = `/tmp/agent-security-test-${Date.now()}`;
process.env.AGENT_SECURITY_DATA_DIR = DATA_DIR;

// Use a unique ephemeral port to avoid collisions
process.env.PORT = '0'; // tell the app to use an ephemeral port; we'll discover it

const mod = require('../../src/index.js');
const app = mod.app;

let server;
let baseUrl;
let internalToken;

test.before(async () => {
  internalToken = process.env.INTERNAL_SERVICE_TOKEN;
  if (!app) throw new Error('No app exported from src/index.js');
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  // Best-effort cleanup of test data dir
  try {
    const fs = require('node:fs');
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  } catch (_) { /* ignore */ }
});

// ---------- helpers ----------

function req(method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(baseUrl + urlPath);
    const data = body ? Buffer.from(JSON.stringify(body)) : null;
    const opts = {
      method,
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': data.length } : {}),
        ...headers,
      },
    };
    const r = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = raw ? JSON.parse(raw) : null; } catch (_) { json = raw; }
        resolve({ status: res.statusCode, body: json });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

const authH = () => ({ 'X-Internal-Token': internalToken });

// ---------- health ----------

test('GET /api/health returns healthy status', async () => {
  const res = await req('GET', '/api/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'healthy');
  assert.strictEqual(res.body.service, 'agent-security');
});

// ---------- registration ----------

test('POST /api/agents/register creates a new agent and returns plaintext key once', async () => {
  const res = await req('POST', '/api/agents/register', {
    agentId: 'agent-unit-1',
    name: 'Unit Agent 1',
    permissions: ['read', 'write'],
  }, authH());
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.agentId, 'agent-unit-1');
  assert.match(res.body.apiKey, /^rtk_/);
  assert.strictEqual(res.body.permissions.length, 2);
});

test('POST /api/agents/register rejects duplicate agentId', async () => {
  const res = await req('POST', '/api/agents/register', {
    agentId: 'agent-unit-1',
    name: 'Duplicate',
  }, authH());
  assert.strictEqual(res.status, 409);
  assert.strictEqual(res.body.error, 'AGENT_EXISTS');
});

test('POST /api/agents/register rejects missing fields', async () => {
  const res = await req('POST', '/api/agents/register', { name: 'no-id' }, authH());
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error, 'VALIDATION_ERROR');
});

test('POST /api/agents/register rejects unauthorized caller', async () => {
  const res = await req('POST', '/api/agents/register', {
    agentId: 'noauth-agent',
    name: 'No Auth',
  });
  assert.strictEqual(res.status, 401);
});

// ---------- authentication ----------

test('POST /api/agents/auth returns JWT for valid key', async () => {
  // First register
  const reg = await req('POST', '/api/agents/register', {
    agentId: 'agent-auth-1',
    name: 'Auth Agent',
  }, authH());
  assert.strictEqual(reg.status, 201);

  const auth = await req('POST', '/api/agents/auth', {
    agentId: 'agent-auth-1',
    apiKey: reg.body.apiKey,
  });
  assert.strictEqual(auth.status, 200);
  assert.match(auth.body.token, /^eyJ/);
  assert.strictEqual(auth.body.agentId, 'agent-auth-1');
});

test('POST /api/agents/auth rejects invalid key', async () => {
  const res = await req('POST', '/api/agents/auth', {
    agentId: 'agent-auth-1',
    apiKey: 'rtk_bogus_key',
  });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error, 'INVALID_CREDENTIALS');
});

// ---------- permission check ----------

test('POST /api/agents/check-permission grants granted permission', async () => {
  const res = await req('POST', '/api/agents/check-permission', {
    agentId: 'agent-unit-1',
    permission: 'read',
  }, authH());
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.granted, true);
});

test('POST /api/agents/check-permission denies ungranted permission', async () => {
  const res = await req('POST', '/api/agents/check-permission', {
    agentId: 'agent-unit-1',
    permission: 'admin',
  }, authH());
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.granted, false);
});

// ---------- rate limit ----------

test('POST /api/agents/check-rate-limit drains bucket then denies', async () => {
  // use a unique agentId for this test
  await req('POST', '/api/agents/register', {
    agentId: 'agent-rl-1',
    name: 'Rate Limit',
  }, authH());

  const cap = 3;
  const allowed = [];
  for (let i = 0; i < cap; i++) {
    const r = await req('POST', '/api/agents/check-rate-limit', {
      agentId: 'agent-rl-1',
      limit: cap,
      windowMs: 60_000,
    }, authH());
    allowed.push(r.body.allowed);
  }
  assert.deepStrictEqual(allowed, [true, true, true]);

  const blocked = await req('POST', '/api/agents/check-rate-limit', {
    agentId: 'agent-rl-1',
    limit: cap,
    windowMs: 60_000,
  }, authH());
  assert.strictEqual(blocked.body.allowed, false);
  assert.ok(blocked.body.retryAfterMs > 0);
});

// ---------- listing + stats + audit (admin only) ----------

test('GET /api/agents lists all agents (admin)', async () => {
  const res = await req('GET', '/api/agents', null, authH());
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.count >= 1);
  assert.ok(Array.isArray(res.body.agents));
});

test('GET /api/agents rejects unauthenticated', async () => {
  const res = await req('GET', '/api/agents');
  assert.strictEqual(res.status, 401);
});

test('GET /api/stats returns registration counters', async () => {
  const res = await req('GET', '/api/stats', null, authH());
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.totalRegistrations >= 1);
  assert.ok(res.body.totalAgents >= 1);
});

test('GET /api/audit returns audit entries', async () => {
  const res = await req('GET', '/api/audit', null, authH());
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body.entries));
  assert.ok(res.body.entries.length > 0);
});

// ---------- key revocation ----------

test('POST /api/agents/:agentId/revoke-keys rotates key (old key rejected)', async () => {
  const reg = await req('POST', '/api/agents/register', {
    agentId: 'agent-revoke-1',
    name: 'Revoke Me',
  }, authH());
  assert.strictEqual(reg.status, 201);
  const oldKey = reg.body.apiKey;

  // Old key works
  const ok = await req('POST', '/api/agents/auth', {
    agentId: 'agent-revoke-1',
    apiKey: oldKey,
  });
  assert.strictEqual(ok.status, 200);

  // Revoke
  const rev = await req('POST', '/api/agents/agent-revoke-1/revoke-keys', {}, authH());
  assert.strictEqual(rev.status, 200);
  assert.match(rev.body.newApiKey, /^rtk_/);
  assert.notStrictEqual(rev.body.newApiKey, oldKey);

  // Old key no longer works
  const fail = await req('POST', '/api/agents/auth', {
    agentId: 'agent-revoke-1',
    apiKey: oldKey,
  });
  assert.strictEqual(fail.status, 401);

  // New key works
  const ok2 = await req('POST', '/api/agents/auth', {
    agentId: 'agent-revoke-1',
    apiKey: rev.body.newApiKey,
  });
  assert.strictEqual(ok2.status, 200);
});

// ---------- update agent ----------

test('PATCH /api/agents/:agentId updates permissions', async () => {
  const res = await req('PATCH', '/api/agents/agent-unit-1', {
    permissions: ['read', 'write', 'execute'],
  }, authH());
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.permissions.includes('execute'));

  // New permission granted
  const check = await req('POST', '/api/agents/check-permission', {
    agentId: 'agent-unit-1',
    permission: 'execute',
  }, authH());
  assert.strictEqual(check.body.granted, true);
});
