// Tests for ai-studio-api (4900) gateway + marketplace
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'studio-api-'));
}

function setEnv(obj) {
  const prev = {};
  for (const k of Object.keys(obj)) {
    prev[k] = process.env[k];
    process.env[k] = obj[k];
  }
  return prev;
}

function restoreEnv(prev) {
  for (const k of Object.keys(prev)) {
    if (prev[k] === undefined) delete process.env[k];
    else process.env[k] = prev[k];
  }
}

let testCounter = 0;
function uniquePort() {
  testCounter += 1;
  return 33000 + (testCounter * 41) % 1000;
}

function startService(env) {
  return new Promise((resolve, reject) => {
    const prev = setEnv(env);
    delete require.cache[require.resolve('../src/index.js')];
    let mod;
    try {
      mod = require('../src/index.js');
    } catch (e) {
      restoreEnv(prev);
      return reject(e);
    }
    const app = mod.createApp();
    const server = app.listen(parseInt(env.PORT, 10), () => {
      resolve({ mod, server, port: parseInt(env.PORT, 10), prev, dataDir: env.DATA_DIR });
    });
    server.on('error', (e) => {
      restoreEnv(prev);
      reject(e);
    });
  });
}

function stopService(handle) {
  return new Promise((resolve) => {
    handle.server.close(() => {
      restoreEnv(handle.prev);
      resolve();
    });
  });
}

function request(port, method, p, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      method,
      path: p,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        let parsed = null;
        try { parsed = buf ? JSON.parse(buf) : null; } catch { parsed = buf; }
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Helper to start a mock sub-service
function startMockService(port, responder) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let buf = '';
      req.on('data', (c) => (buf += c));
      req.on('end', () => {
        let body = null;
        try { body = buf ? JSON.parse(buf) : null; } catch {}
        try {
          responder(req, res, body);
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'mock_threw', message: e.message }));
        }
      });
    });
    server.listen(port, () => resolve({ server, port }));
  });
}

function stopMockService(handle) {
  return new Promise((r) => handle.server.close(r));
}

// Spawn a fake sub-service and start the gateway with its port overridden.
async function withGatewayAndFakeSub({ fakePort, responder, token }, runTests) {
  // Start fake upstream first
  const fake = await startMockService(fakePort, responder);
  const gwPort = uniquePort();
  const prev = setEnv({
    PORT: String(gwPort),
    DATA_DIR: makeTmpDir(),
    INTERNAL_TOKEN: token || 'gw-token',
  });
  delete require.cache[require.resolve('../src/index.js')];
  const mod = require('../src/index.js');
  mod.SUB_SERVICES.projects.port = fakePort;
  const app = mod.createApp();
  let server;
  await new Promise((resolve, reject) => {
    server = app.listen(gwPort, () => resolve());
    server.on('error', reject);
  });
  try {
    await runTests({ gwPort, mod });
  } finally {
    if (server) await new Promise((r) => server.close(() => r()));
    if (fake) await stopMockService(fake);
    restoreEnv(prev);
  }
}

test('Catalog and health endpoints', async () => {
  const env = { PORT: String(uniquePort()), DATA_DIR: makeTmpDir() };
  const handle = await startService(env);
  try {
    const r1 = await request(handle.port, 'GET', '/');
    assert.strictEqual(r1.status, 200);
    assert.strictEqual(r1.body.service, 'ai-studio-api');
    assert.strictEqual(r1.body.port, 4900);
    assert.strictEqual(r1.body.sub_services.length, 9);
    const ports = r1.body.sub_services.map((s) => s.port);
    [4901, 4902, 4903, 4904, 4905, 4906, 4907, 4908, 4909].forEach((p) => {
      assert.ok(ports.includes(p), `expected port ${p} in catalog`);
    });

    const r2 = await request(handle.port, 'GET', '/health');
    assert.strictEqual(r2.status, 200);
    assert.strictEqual(r2.body.status, 'ok');

    const r3 = await request(handle.port, 'GET', '/ready');
    assert.strictEqual(r3.status, 200);
    assert.ok(r3.body.probes);
    assert.strictEqual(Object.keys(r3.body.probes).length, 9);
    // All sub-services unreachable in test (nothing listening on 4901-4909)
    assert.strictEqual(r3.body.healthy, 0);
  } finally {
    await stopService(handle);
  }
});

test('Marketplace: 5 templates seeded, listing and filtering', async () => {
  const env = { PORT: String(uniquePort()), DATA_DIR: makeTmpDir() };
  const handle = await startService(env);
  try {
    const r1 = await request(handle.port, 'GET', '/marketplace/templates');
    assert.strictEqual(r1.status, 200);
    assert.strictEqual(r1.body.total, 5);
    assert.strictEqual(r1.body.templates[0].installs >= r1.body.templates[1].installs, true);

    const r2 = await request(handle.port, 'GET', '/marketplace/templates?category=agent');
    assert.strictEqual(r2.body.total, 1);
    assert.strictEqual(r2.body.templates[0].id, 'tpl_chatbot_support');

    const r3 = await request(handle.port, 'GET', '/marketplace/templates?tag=rag');
    assert.strictEqual(r3.body.total, 1);

    const r4 = await request(handle.port, 'GET', '/marketplace/templates?q=content');
    assert.strictEqual(r4.body.total, 1);
    assert.strictEqual(r4.body.templates[0].name, 'Content Generation Workflow');

    const r5 = await request(handle.port, 'GET', '/marketplace/templates/tpl_chatbot_support');
    assert.strictEqual(r5.status, 200);
    assert.strictEqual(r5.body.name, 'Customer Support Chatbot');

    const r6 = await request(handle.port, 'GET', '/marketplace/templates/tpl_doesnotexist');
    assert.strictEqual(r6.status, 404);
  } finally {
    await stopService(handle);
  }
});

test('Marketplace: publish, install, stats', async () => {
  const env = { PORT: String(uniquePort()), DATA_DIR: makeTmpDir() };
  const handle = await startService(env);
  try {
    // Publish invalid category
    const bad = await request(handle.port, 'POST', '/marketplace/publish', {
      name: 'X', description: 'd', category: 'wrong',
    });
    assert.strictEqual(bad.status, 400);

    // Publish valid
    const pub = await request(handle.port, 'POST', '/marketplace/publish', {
      name: 'My Eval Pipeline',
      description: 'Custom eval suite',
      category: 'eval',
      tags: ['eval', 'custom'],
      author: 'alice',
    });
    assert.strictEqual(pub.status, 201);
    assert.ok(pub.body.id.startsWith('tpl_'));
    assert.strictEqual(pub.body.installs, 0);
    assert.strictEqual(pub.body.author, 'alice');

    // Install template (default seeded)
    const inst = await request(handle.port, 'POST', '/marketplace/install', {
      template_id: 'tpl_chatbot_support', project_id: 'proj_a', user_id: 'u1',
    });
    assert.strictEqual(inst.status, 201);
    assert.ok(inst.body.id.startsWith('inst_'));
    assert.strictEqual(inst.body.category, 'agent');

    // Install invalid template
    const instBad = await request(handle.port, 'POST', '/marketplace/install', {
      template_id: 'tpl_nope', project_id: 'proj_a', user_id: 'u1',
    });
    assert.strictEqual(instBad.status, 404);

    // Install missing fields
    const instMissing = await request(handle.port, 'POST', '/marketplace/install', {
      template_id: 'tpl_chatbot_support',
    });
    assert.strictEqual(instMissing.status, 400);

    // Installed list (project-scoped)
    const list = await request(handle.port, 'GET', '/marketplace/installed?project_id=proj_a');
    assert.strictEqual(list.body.total, 1);

    // Stats
    const stats = await request(handle.port, 'GET', '/marketplace/stats');
    assert.strictEqual(stats.status, 200);
    assert.strictEqual(stats.body.total_templates, 6);
    assert.ok(stats.body.by_category.eval >= 2);
    assert.ok(stats.body.top_templates[0].installs >= stats.body.top_templates[1].installs);

    // Install count increased
    const after = await request(handle.port, 'GET', '/marketplace/templates/tpl_chatbot_support');
    assert.strictEqual(after.body.installs, 1241);
  } finally {
    await stopService(handle);
  }
});

test('Proxy: forwards GET and POST to sub-service', async () => {
  await withGatewayAndFakeSub({
    fakePort: 34901,
    token: 'gw-token',
    responder: (req, res, body) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method === 'GET' && req.url === '/projects') {
        res.statusCode = 200;
        res.end(JSON.stringify({
          projects: [{ id: 'p1' }],
          total: 1,
          _proxy: req.headers['x-internal-token'] || null,
        }));
      } else if (req.method === 'POST' && req.url === '/projects') {
        res.end(JSON.stringify({
          id: 'p_new',
          name: body?.name,
          _proxy: req.headers['x-internal-token'] || null,
        }));
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'mock_not_found', url: req.url }));
      }
    },
  }, async ({ gwPort }) => {
    const r1 = await request(gwPort, 'GET', '/projects');
    assert.strictEqual(r1.status, 200);
    assert.strictEqual(r1.body.total, 1);
    assert.strictEqual(r1.body._proxy, 'gw-token');

    const r2 = await request(gwPort, 'POST', '/projects', { name: 'My Project' });
    assert.strictEqual(r2.status, 200);
    assert.strictEqual(r2.body.id, 'p_new');
    assert.strictEqual(r2.body.name, 'My Project');

    // Sub-path unknown -> 404 from upstream, propagated
    const r3 = await request(gwPort, 'GET', '/projects/some_unknown_path');
    assert.strictEqual(r3.status, 404);
  });
});

test('Proxy: returns 502 when upstream unreachable', async () => {
  const env = { PORT: String(uniquePort()), DATA_DIR: makeTmpDir() };
  const handle = await startService(env);
  try {
    const r = await request(handle.port, 'GET', '/projects');
    assert.strictEqual(r.status, 502);
    assert.strictEqual(r.body.error, 'upstream_unavailable');
    assert.strictEqual(r.body.target_port, 4901);
  } finally {
    await stopService(handle);
  }
});

test('Proxy: HTTP method preservation (PUT/DELETE)', async () => {
  await withGatewayAndFakeSub({
    fakePort: 34902,
    token: 'gw-token',
    responder: (req, res, body) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method === 'PUT') {
        res.end(JSON.stringify({ id: 'p1', updated: true, method: req.method, body }));
      } else if (req.method === 'DELETE') {
        res.end(JSON.stringify({ id: 'p1', deleted: true, method: req.method }));
      } else {
        res.end(JSON.stringify({ method: req.method, url: req.url }));
      }
    },
  }, async ({ gwPort }) => {
    const r1 = await request(gwPort, 'PUT', '/projects/p1', { name: 'updated' });
    assert.strictEqual(r1.status, 200);
    assert.strictEqual(r1.body.method, 'PUT');
    assert.strictEqual(r1.body.body.name, 'updated');

    const r2 = await request(gwPort, 'DELETE', '/projects/p1');
    assert.strictEqual(r2.status, 200);
    assert.strictEqual(r2.body.method, 'DELETE');
  });
});

test('Persistence: marketplace survives restart', async () => {
  const dir = makeTmpDir();
  const env1 = { PORT: String(uniquePort()), DATA_DIR: dir };
  const h1 = await startService(env1);
  try {
    await request(h1.port, 'POST', '/marketplace/publish', {
      name: 'Persistent Template', description: 'd', category: 'agent',
    });
  } finally { await stopService(h1); }

  const env2 = { PORT: String(uniquePort()), DATA_DIR: dir };
  const h2 = await startService(env2);
  try {
    const list = await request(h2.port, 'GET', '/marketplace/templates');
    assert.ok(list.body.templates.some((t) => t.name === 'Persistent Template'));
    assert.strictEqual(list.body.total, 6);
  } finally { await stopService(h2); }
});
