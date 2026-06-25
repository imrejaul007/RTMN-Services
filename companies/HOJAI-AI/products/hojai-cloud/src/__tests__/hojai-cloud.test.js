/**
 * Tests for the hojai-cloud HTTP API + helpers.
 *
 * Uses Node's built-in test runner (node --test) and starts the Express app
 * on a random local port via http.createServer. We disable auth for the bulk
 * of the tests via HOJAI_CLOUD_REQUIRE_AUTH=false so the assertions stay
 * focused on routing + persistence. The auth path is tested separately.
 *
 * What this covers:
 *   • GET  /api/v1/health         (service info)
 *   • GET  /api/v1/ready          (readiness)
 *   • GET  /                       (service info endpoint list)
 *   • POST /api/v1/deploy         (happy path with a fixture backend)
 *   • POST /api/v1/deploy         (re-deploy same name → reuses port + id)
 *   • POST /api/v1/deploy         (rejects missing name / manifest)
 *   • POST /api/v1/deploy         (rejects when no files and no prior deploy)
 *   • GET  /api/v1/deployments    (list)
 *   • GET  /api/v1/deployments/:id (one)
 *   • GET  /api/v1/deployments/:id (404 for unknown id)
 *   • DELETE /api/v1/deployments/:id (teardown)
 *   • Bearer auth (401 missing, 403 wrong key, 200 with right key)
 *   • findFreePort() helper        (allocates distinct ports)
 *   • safeSubdomain() helper       (sluggifies arbitrary names)
 */

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

// IMPORTANT: set env BEFORE requiring the app so the module picks them up
process.env.HOJAI_CLOUD_REQUIRE_AUTH = 'false';
process.env.HOJAI_CLOUD_STORAGE = path.join(
  os.tmpdir(),
  `hojai-cloud-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
);
process.env.HOJAI_CLOUD_PORT_RANGE_START = '8900';
process.env.HOJAI_CLOUD_PORT_RANGE_END = '8910';
process.env.HOJAI_PUBLIC_HOST = 'hojai.test';
process.env.HOJAI_PUBLIC_SCHEME = 'https';

const cloudApp = require('../index');
const { app, deployments, portAssignments, findFreePort, safeSubdomain } = cloudApp;

let server;
let port;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  // best-effort cleanup of test storage
  try { fs.rmSync(process.env.HOJAI_CLOUD_STORAGE, { recursive: true, force: true }); } catch {}
});

beforeEach(() => {
  // Reset registry between tests so the port range doesn't fill up.
  deployments.clear();
  portAssignments.clear();
});

function request(method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path: urlPath,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...headers
        }
      },
      (res) => {
        const chunks = [];
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

/**
 * Build a tiny self-contained backend fixture that uses only the
 * built-in `node:http` module — no external deps, so the deployed
 * project doesn't need its own node_modules. The service binds to
 * the PORT env var and exposes a /health endpoint.
 */
function fixtureBackendSrc() {
  return `
const http = require('node:http');
const port = parseInt(process.env.PORT || '0', 10);
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', from: 'fixture' }));
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ hello: 'world' }));
  }
});
server.listen(port, '127.0.0.1');
`.trim();
}

function makeFilesObject() {
  return {
    'apps/backend/src/index.js': fixtureBackendSrc()
  };
}

// ── Service endpoints ──────────────────────────────────────────────────────

test('GET /api/v1/health returns service info', async () => {
  const r = await request('GET', '/api/v1/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'ok');
  assert.equal(r.body.service, 'hojai-cloud');
  assert.equal(r.body.publicHost, 'hojai.test');
  assert.equal(typeof r.body.port, 'number');
  assert.equal(typeof r.body.deployments, 'number');
  assert.equal(typeof r.body.portsInUse, 'number');
});

test('GET /api/v1/ready returns ready', async () => {
  const r = await request('GET', '/api/v1/ready');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'ready');
});

test('GET / returns the service info + endpoint list', async () => {
  const r = await request('GET', '/');
  assert.equal(r.status, 200);
  assert.equal(r.body.service, 'hojai-cloud');
  assert.ok(Array.isArray(r.body.endpoints));
  assert.ok(r.body.endpoints.includes('POST /api/v1/deploy'));
  assert.equal(r.body.publicHost, 'hojai.test');
  assert.equal(r.body.scheme, 'https');
});

// ── Deploy: validation ─────────────────────────────────────────────────────

test('POST /api/v1/deploy rejects missing name', async () => {
  const r = await request('POST', '/api/v1/deploy', { manifest: { name: 'x' } });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /name/);
});

test('POST /api/v1/deploy rejects missing manifest', async () => {
  const r = await request('POST', '/api/v1/deploy', { name: 'x' });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /manifest/);
});

test('POST /api/v1/deploy rejects when no files and no prior deployment', async () => {
  const r = await request('POST', '/api/v1/deploy', {
    name: 'fresh-no-files',
    manifest: { name: 'fresh-no-files', type: 'marketplace' }
  });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /no files/);
});

// ── Deploy: happy path ─────────────────────────────────────────────────────

test('POST /api/v1/deploy spawns a backend and returns a live URL', async () => {
  const r = await request('POST', '/api/v1/deploy', {
    name: 'happy-app',
    type: 'marketplace',
    manifest: { name: 'happy-app', type: 'marketplace', template: 'marketplace' },
    runtime: 'node-express',
    files: makeFilesObject()
  });

  if (r.status !== 201) {
    assert.fail(`expected 201, got ${r.status}: ${r.text}`);
  }
  assert.equal(r.body.status, 'live');
  assert.equal(r.body.url, 'https://happy-app.hojai.test');
  assert.ok(r.body.projectId, 'projectId is set');
  assert.ok(r.body.deploymentId, 'deploymentId is set');
  assert.equal(typeof r.body.port, 'number');
  assert.ok(r.body.port >= 8900 && r.body.port <= 8910, 'port is in test range');

  // The backend should be reachable on its assigned port
  const live = await new Promise((resolve) => {
    http.get(`http://127.0.0.1:${r.body.port}/health`, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body }); }
      });
    }).on('error', (e) => resolve({ status: 0, body: null, error: e.message }));
  });
  assert.equal(live.status, 200, 'backend health endpoint reachable');
  assert.equal(live.body.status, 'ok');
  assert.equal(live.body.from, 'fixture');

  // Clean up the spawned backend so other tests aren't affected
  const dep = deployments.get(r.body.deploymentId);
  if (dep && dep.pid) { try { process.kill(dep.pid, 'SIGTERM'); } catch {} }
  deployments.delete(r.body.deploymentId);
});

// ── Deploy: re-deploy (same name) ──────────────────────────────────────────

test('POST /api/v1/deploy reuses port + projectId when same name redeployed', async () => {
  const r1 = await request('POST', '/api/v1/deploy', {
    name: 'redeploy-app',
    manifest: { name: 'redeploy-app', type: 'marketplace' },
    files: makeFilesObject()
  });
  assert.equal(r1.status, 201, `first deploy: ${r1.text}`);
  const first = r1.body;
  assert.equal(first.status, 'live');

  const r2 = await request('POST', '/api/v1/deploy', {
    name: 'redeploy-app',
    manifest: { name: 'redeploy-app', type: 'marketplace' },
    files: makeFilesObject()
  });
  assert.equal(r2.status, 201, `second deploy: ${r2.text}`);
  assert.equal(r2.body.projectId, first.projectId, 'projectId is reused');
  assert.equal(r2.body.port, first.port, 'port is reused');
  assert.notEqual(r2.body.deploymentId, first.deploymentId, 'deploymentId is new');

  // Clean up
  const dep = deployments.get(r2.body.deploymentId);
  if (dep && dep.pid) { try { process.kill(dep.pid, 'SIGTERM'); } catch {} }
  deployments.delete(r2.body.deploymentId);
});

// ── List + get + delete ────────────────────────────────────────────────────

test('GET /api/v1/deployments lists current deployments', async () => {
  // Add a record directly to the in-memory map (we don't want to spawn
  // a backend just to test listing).
  deployments.set('test-list-1', {
    id: 'test-list-1', projectId: 'p1', projectName: 'list-app',
    subdomain: 'list-app', url: 'https://list-app.hojai.test',
    status: 'live', port: 8901, createdAt: 'now', updatedAt: 'now'
  });
  const r = await request('GET', '/api/v1/deployments');
  assert.equal(r.status, 200);
  assert.equal(r.body.count, 1);
  assert.equal(r.body.deployments[0].id, 'test-list-1');
  assert.equal(r.body.deployments[0].projectName, 'list-app');
});

test('GET /api/v1/deployments/:id returns the deployment or 404', async () => {
  deployments.set('test-get-1', {
    id: 'test-get-1', projectId: 'p2', projectName: 'get-app',
    subdomain: 'get-app', url: 'https://get-app.hojai.test',
    status: 'live', port: 8902, pid: 12345
  });
  const ok = await request('GET', '/api/v1/deployments/test-get-1');
  assert.equal(ok.status, 200);
  assert.equal(ok.body.id, 'test-get-1');

  const missing = await request('GET', '/api/v1/deployments/does-not-exist');
  assert.equal(missing.status, 404);
  assert.match(missing.body.error, /not found/);
});

test('DELETE /api/v1/deployments/:id removes the deployment', async () => {
  deployments.set('test-del-1', {
    id: 'test-del-1', projectId: 'p3', projectName: 'del-app',
    subdomain: 'del-app', url: 'https://del-app.hojai.test',
    status: 'live', port: 8903, pid: null  // no real process to kill
  });
  const r = await request('DELETE', '/api/v1/deployments/test-del-1');
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.id, 'test-del-1');
  assert.equal(deployments.has('test-del-1'), false, 'removed from registry');
});

test('DELETE /api/v1/deployments/:id returns 404 for unknown id', async () => {
  const r = await request('DELETE', '/api/v1/deployments/nope');
  assert.equal(r.status, 404);
});

// ── Auth ───────────────────────────────────────────────────────────────────
//
// The requireAuth helper is only exported when HOJAI_CLOUD_REQUIRE_AUTH
// is set at module load. To exercise it we re-require the module under
// a different env config.

test('auth: 401 when bearer token is missing, 403 when wrong, next() on right key', async () => {
  process.env.HOJAI_CLOUD_REQUIRE_AUTH = 'true';
  process.env.HOJAI_API_KEY = 'super-secret-key';
  delete require.cache[require.resolve('../index')];
  const { requireAuth: requireAuthOn } = require('../index');

  function makeRes() {
    return {
      _status: 0, _body: null,
      status(c) { this._status = c; return this; },
      json(b) { this._body = b; return this; }
    };
  }

  // 401 — missing
  {
    const req = { header: () => undefined };
    const res = makeRes();
    let nextCalled = false;
    requireAuthOn(req, res, () => { nextCalled = true; });
    assert.equal(res._status, 401);
    assert.match(res._body.error, /missing/);
    assert.equal(nextCalled, false);
  }

  // 403 — wrong key
  {
    const req = { header: () => 'Bearer wrong-key' };
    const res = makeRes();
    let nextCalled = false;
    requireAuthOn(req, res, () => { nextCalled = true; });
    assert.equal(res._status, 403);
    assert.match(res._body.error, /invalid/);
    assert.equal(nextCalled, false);
  }

  // 200 — right key (next() called)
  {
    const req = { header: () => 'Bearer super-secret-key' };
    const res = makeRes();
    let nextCalled = false;
    requireAuthOn(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────

test('findFreePort() returns distinct ports on repeated calls', async () => {
  const p1 = await findFreePort(8920, 8925);
  assert.ok(p1, 'p1 is truthy');
  portAssignments.set(p1, 'test-1');
  const p2 = await findFreePort(8920, 8925);
  assert.ok(p2, 'p2 is truthy');
  assert.notEqual(p1, p2, 'ports are distinct');
  assert.ok(p1 >= 8920 && p1 <= 8925, 'p1 in range');
  assert.ok(p2 >= 8920 && p2 <= 8925, 'p2 in range');
  portAssignments.delete(p1);
  portAssignments.delete(p2);
});

test('findFreePort() returns null when range is exhausted', async () => {
  // Mark the only port in the range as held.
  portAssignments.set(8940, 'test-exhaust');
  const r = await findFreePort(8940, 8940);
  assert.equal(r, null, 'no port available when single port in range is held');
  portAssignments.delete(8940);
});

test('safeSubdomain() sluggifies arbitrary names', () => {
  assert.equal(safeSubdomain('Hello World'), 'hello-world');
  assert.equal(safeSubdomain('My_App!!'), 'my-app');
  assert.equal(safeSubdomain('  foo bar baz  '), 'foo-bar-baz');
  assert.equal(safeSubdomain('a___b---c'), 'a-b-c');
  assert.equal(safeSubdomain('---hi---'), 'hi');
  assert.equal(safeSubdomain(''), 'project');
  assert.equal(safeSubdomain(null), 'project');
  const long = 'a'.repeat(100);
  assert.equal(safeSubdomain(long).length, 40);
  assert.equal(safeSubdomain('my-app-2'), 'my-app-2');
});
