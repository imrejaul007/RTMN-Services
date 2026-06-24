/**
 * Tests for agent-lifecycle-api gateway
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alapi-test-'));
process.env.PORT = '0';
process.env.INTERNAL_TOKEN = 'test-tok';

// Point all subservices at a local "never reachable" port so we can test the gateway
// in isolation. We'll spawn a fake subservice for proxy tests.
const indexPath = require.resolve('../src/index.js');
delete require.cache[indexPath];

const { createApp, SUB_SERVICES, ROUTE_MAP } = require('../src/index.js');
const TOKEN = 'test-tok';

function auth() { return { 'X-Internal-Token': TOKEN, 'Content-Type': 'application/json' }; }

test('SUB_SERVICES has 6 entries', () => {
  assert.strictEqual(Object.keys(SUB_SERVICES).length, 6);
  for (const k of ['versioning', 'testing', 'deployment', 'monitoring', 'rollback', 'deprecation']) {
    assert.ok(SUB_SERVICES[k]);
    assert.ok(SUB_SERVICES[k].url);
    assert.ok(SUB_SERVICES[k].port);
  }
});

test('ROUTE_MAP has 6 entries', () => {
  assert.strictEqual(ROUTE_MAP.length, 6);
  for (const r of ROUTE_MAP) {
    assert.ok(r.prefix.startsWith('/'));
    assert.ok(SUB_SERVICES[r.service]);
  }
});

test('root returns service catalog', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/`);
    assert.strictEqual(r.status, 200);
    const j = await r.json();
    assert.strictEqual(j.service, 'agent-lifecycle-api');
    assert.strictEqual(j.subservices.versioning.port, 4911);
    assert.strictEqual(j.subservices.deprecation.port, 4916);
  } finally { s.close(); }
});

test('ready returns ok', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/ready`);
    assert.strictEqual(r.status, 200);
  } finally { s.close(); }
});

test('rejects unauth requests to proxied routes', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/versioning/agents`);
    assert.strictEqual(r.status, 401);
  } finally { s.close(); }
});

test('release endpoint requires version', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/agents/a/release`, { method: 'POST', headers: auth(), body: '{}' });
    assert.strictEqual(r.status, 400);
  } finally { s.close(); }
});

test('release endpoint fails gracefully when subservices are unreachable', async () => {
  // The default URLs (localhost:4911 etc.) have no listeners, so this should return 502
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/agents/a/release`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ version: '1.0.0' }),
    });
    // 502 (unreachable) OR 502 (failed step)
    assert.strictEqual(r.status, 502);
    const j = await r.json();
    assert.ok(j.error);
  } finally { s.close(); }
});

test('health endpoint probes subservices and reports down', async () => {
  // No subservices running → should return 503 with all 'down'
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/health`);
    assert.strictEqual(r.status, 503);
    const j = await r.json();
    assert.ok(j.subservices);
    // All 6 should be down since nothing is listening
    for (const k of Object.keys(SUB_SERVICES)) {
      assert.ok(j.subservices[k].startsWith('down'));
    }
  } finally { s.close(); }
});

test('health endpoint reports up when fake subservice responds OK', async () => {
  // Spin up a fake "subservice" that responds to /health
  const fakeApp = require('express')();
  fakeApp.get('/health', (_req, res) => res.json({ ok: true }));
  fakeApp.get('/agents/:id/versions', (_req, res) => res.status(201).json({ id: 'fake', version: '1.0.0' }));
  const fake = fakeApp.listen(0);
  const fakePort = fake.address().port;

  // Override env so the gateway uses the fake server
  const oldEnv = process.env.VERSIONING_URL;
  process.env.VERSIONING_URL = `http://localhost:${fakePort}`;
  delete require.cache[require.resolve('../src/index.js')];
  const { createApp: createApp2 } = require('../src/index.js');
  try {
    const app = createApp2();
    const s = app.listen(0);
    try {
      const r = await fetch(`http://127.0.0.1:${s.address().port}/health`);
      const j = await r.json();
      assert.strictEqual(j.subservices.versioning, 'up');
    } finally { s.close(); }
  } finally {
    fake.close();
    if (oldEnv !== undefined) process.env.VERSIONING_URL = oldEnv; else delete process.env.VERSIONING_URL;
  }
});

test('proxy routes through versioning prefix to subservice', async () => {
  // Spin up a fake versioning service that responds to /agents/test-agent/versions GET
  const fakeApp = require('express')();
  fakeApp.use(require('express').json());
  fakeApp.get('/agents/:id/versions', (_req, res) => res.json({ agent_id: 'test-agent', count: 0, versions: [] }));
  fakeApp.post('/agents/:id/versions', (_req, res) => res.status(201).json({ id: 'fake', version: '9.9.9' }));
  const fake = fakeApp.listen(0);
  const fakePort = fake.address().port;
  const oldEnv = process.env.VERSIONING_URL;
  process.env.VERSIONING_URL = `http://localhost:${fakePort}`;
  delete require.cache[require.resolve('../src/index.js')];
  const { createApp: createApp2 } = require('../src/index.js');
  try {
    const app = createApp2();
    const s = app.listen(0);
    try {
      const r = await fetch(`http://127.0.0.1:${s.address().port}/versioning/agents/test-agent/versions`, { headers: auth() });
      assert.strictEqual(r.status, 200);
      const j = await r.json();
      assert.strictEqual(j.agent_id, 'test-agent');
      const r2 = await fetch(`http://127.0.0.1:${s.address().port}/versioning/agents/test-agent/versions`, { method: 'POST', headers: auth(), body: JSON.stringify({ version: '9.9.9' }) });
      assert.strictEqual(r2.status, 201);
    } finally { s.close(); }
  } finally {
    fake.close();
    if (oldEnv !== undefined) process.env.VERSIONING_URL = oldEnv; else delete process.env.VERSIONING_URL;
  }
});

test('release endpoint succeeds with fake subservices', async () => {
  // Fake versioning + testing + deployment
  const fakeV = require('express')();
  fakeV.use(require('express').json());
  fakeV.post('/agents/:id/versions', (_req, res) => res.status(201).json({ id: 'v1', version: _req.body.version }));
  const v = fakeV.listen(0);

  const fakeT = require('express')();
  fakeT.use(require('express').json());
  fakeT.post('/suites', (_req, res) => res.status(201).json({ key: 'fake' }));
  fakeT.post('/suites/:key/run', (_req, res) => res.status(201).json({ status: 'pass', summary: { passed: 1, failed: 0, total: 1, duration_ms: 1 } }));
  const t = fakeT.listen(0);

  const fakeD = require('express')();
  fakeD.use(require('express').json());
  fakeD.post('/deployments', (_req, res) => res.status(201).json({ id: 'd1', status: 'active', current_percent: 1 }));
  const d = fakeD.listen(0);

  const oldV = process.env.VERSIONING_URL;
  const oldT = process.env.TESTING_URL;
  const oldD = process.env.DEPLOYMENT_URL;
  process.env.VERSIONING_URL = `http://localhost:${v.address().port}`;
  process.env.TESTING_URL = `http://localhost:${t.address().port}`;
  process.env.DEPLOYMENT_URL = `http://localhost:${d.address().port}`;
  delete require.cache[require.resolve('../src/index.js')];
  const { createApp: createApp2 } = require('../src/index.js');
  try {
    const app = createApp2();
    const s = app.listen(0);
    try {
      const r = await fetch(`http://127.0.0.1:${s.address().port}/agents/release-test/release`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify({
          version: '1.0.0',
          config: { temp: 0.7 },
          suite: { name: 'basic', tests: [{ name: 't1', kind: 'unit' }] },
        }),
      });
      assert.strictEqual(r.status, 201);
      const j = await r.json();
      assert.strictEqual(j.agent_id, 'release-test');
      assert.strictEqual(j.testing_ok, true);
      assert.strictEqual(j.steps.length, 3);
    } finally { s.close(); }
  } finally {
    v.close(); t.close(); d.close();
    if (oldV !== undefined) process.env.VERSIONING_URL = oldV; else delete process.env.VERSIONING_URL;
    if (oldT !== undefined) process.env.TESTING_URL = oldT; else delete process.env.TESTING_URL;
    if (oldD !== undefined) process.env.DEPLOYMENT_URL = oldD; else delete process.env.DEPLOYMENT_URL;
  }
});

test('cleanup', () => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
});