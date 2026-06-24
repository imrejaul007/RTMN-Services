/**
 * Phase 14.3 — Execution Engine unit tests
 * Covers: runHandler, runWithConcurrency, and HTTP /health.
 */
const TEST_DATA_DIR = '/tmp/exec-test-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
process.env.EXECUTION_ENGINE_DATA_DIR = TEST_DATA_DIR;

// Use a fake dependency-graph URL that doesn't resolve; we only test local logic.
process.env.DEPENDENCY_GRAPH_URL = 'http://127.0.0.1:1';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');

const { app, runHandler, runWithConcurrency } = require('../../src/index');

// ---------- runHandler ----------

test('runHandler: no handler -> ok skipped', async () => {
  const r = await runHandler(undefined, { id: 'a' }, {});
  assert.equal(r.ok, true);
  assert.equal(r.skipped, true);
});

test('runHandler: echo handler echoes input', async () => {
  const task = { id: 'a', name: 'alpha' };
  const r = await runHandler({ type: 'echo' }, task, { wave: 0 });
  assert.equal(r.ok, true);
  assert.equal(r.echoed.task.id, 'a');
  assert.equal(r.echoed.ctx.wave, 0);
});

test('runHandler: sleep handler waits for ms', async () => {
  const start = Date.now();
  const r = await runHandler({ type: 'sleep', ms: 50 }, {}, {});
  const elapsed = Date.now() - start;
  assert.equal(r.ok, true);
  assert.ok(elapsed >= 45, `slept only ${elapsed}ms`);
});

test('runHandler: fail handler returns ok:false', async () => {
  const r = await runHandler({ type: 'fail', error: 'forced' }, {}, {});
  assert.equal(r.ok, false);
  assert.equal(r.error, 'forced');
});

test('runHandler: unknown handler type returns error', async () => {
  const r = await runHandler({ type: 'nonsense' }, {}, {});
  assert.equal(r.ok, false);
  assert.ok(r.error.includes('unknown'));
});

test('runHandler: webhook handler with non-resolving URL fails gracefully', async () => {
  const r = await runHandler(
    { type: 'webhook', url: 'http://127.0.0.1:1/x', timeoutMs: 500 },
    { id: 'a' },
    {}
  );
  assert.equal(r.ok, false);
  assert.ok(typeof r.error === 'string', `expected string error, got: ${r.error}`);
});

test('runHandler: webhook handler hits a local echo server', async () => {
  // Spin up a tiny server
  const srv = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: body }));
    });
  });
  await new Promise((r) => srv.listen(0, r));
  const port = srv.address().port;
  const r = await runHandler(
    { type: 'webhook', url: `http://127.0.0.1:${port}/hook`, method: 'POST' },
    { id: 'task1' },
    {}
  );
  srv.close();
  assert.equal(r.ok, true);
  assert.equal(r.status, 200);
});

// ---------- runWithConcurrency ----------

test('runWithConcurrency: processes all items in order', async () => {
  const items = [1, 2, 3, 4, 5];
  const results = await runWithConcurrency(items, 2, async (x, i) => {
    await new Promise((r) => setTimeout(r, 5));
    return x * 10;
  });
  assert.deepEqual(results, [10, 20, 30, 40, 50]);
});

test('runWithConcurrency: respects concurrency limit', async () => {
  let active = 0, maxActive = 0;
  const items = Array.from({ length: 10 }, (_, i) => i);
  await runWithConcurrency(items, 3, async (x) => {
    active++;
    if (active > maxActive) maxActive = active;
    await new Promise((r) => setTimeout(r, 20));
    active--;
    return x;
  });
  assert.ok(maxActive <= 3, `max concurrency ${maxActive} > 3`);
});

test('runWithConcurrency: handles 0 items', async () => {
  const r = await runWithConcurrency([], 5, async () => 'x');
  assert.deepEqual(r, []);
});

test('runWithConcurrency: errors in workers reject the promise', async () => {
  // runWithConcurrency does NOT catch worker errors; callers must handle them.
  // This documents the contract: any unhandled exception propagates via Promise.all.
  const items = [1, 2, 3];
  await assert.rejects(
    () => runWithConcurrency(items, 2, async (x) => {
      if (x === 2) throw new Error('boom');
      return x;
    }),
    /boom/
  );
});

// ---------- HTTP ----------

test('HTTP: /api/health returns healthy', async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const port = server.address().port;
  const r = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = JSON.parse(Buffer.concat(chunks).toString());
        resolve({ status: res.statusCode, body });
      });
    }).on('error', reject);
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.service, 'execution-engine');
});

test('HTTP: POST /api/runs without graphId -> 400', async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const port = server.address().port;
  const data = JSON.stringify({});
  const r = await new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path: '/api/runs', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          resolve({ status: res.statusCode, body });
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'VALIDATION_ERROR');
});

test('teardown: remove data dir', () => {
  try { fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
});