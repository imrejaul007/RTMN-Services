'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const idx = require('../../src/index');
const {
  validateTool, normalizeTool, validateSchema, validateMethod,
  byKind, byMethod, searchByName, findTool, checkRateLimit,
  buildInvocation, summarizeInvocations, listAll,
  loadTools, saveTools, appendInvocation, loadInvocations,
  app, SERVICE_NAME, PORT, VERSION,
  VALID_METHODS, VALID_KINDS, TOOLS_FILE, INVOCATIONS_FILE,
} = idx;

// ---------- Validation: validateTool ----------

test('validateTool accepts a minimal valid remote tool', () => {
  const errs = validateTool({
    name: 'search-web',
    kind: 'remote',
    method: 'GET',
    endpoint: 'https://example.com/search',
  });
  assert.deepEqual(errs, []);
});

test('validateTool accepts a minimal valid local tool', () => {
  const errs = validateTool({ name: 'calc', kind: 'local' });
  assert.deepEqual(errs, []);
});

test('validateTool rejects missing name', () => {
  const errs = validateTool({ kind: 'remote', method: 'GET', endpoint: 'https://x' });
  assert.ok(errs.some((e) => e.includes('name')));
});

test('validateTool rejects empty name', () => {
  const errs = validateTool({ name: '   ', kind: 'remote', method: 'GET', endpoint: 'https://x' });
  assert.ok(errs.some((e) => e.includes('name')));
});

test('validateTool rejects invalid kind', () => {
  const errs = validateTool({ name: 'x', kind: 'magical', method: 'GET', endpoint: 'https://x' });
  assert.ok(errs.some((e) => e.includes('kind')));
});

test('validateTool rejects remote tool without endpoint', () => {
  const errs = validateTool({ name: 'x', kind: 'remote', method: 'GET' });
  assert.ok(errs.some((e) => e.toLowerCase().includes('endpoint')));
});

test('validateTool rejects invalid method', () => {
  const errs = validateTool({ name: 'x', kind: 'remote', method: 'FOO', endpoint: 'https://x' });
  assert.ok(errs.some((e) => e.includes('method')));
});

test('validateTool rejects non-URL endpoint', () => {
  const errs = validateTool({ name: 'x', kind: 'remote', method: 'GET', endpoint: 'not a url' });
  assert.ok(errs.some((e) => e.toLowerCase().includes('endpoint')));
});

test('validateTool rejects non-object inputSchema', () => {
  const errs = validateTool({ name: 'x', inputSchema: 'not-an-object' });
  assert.ok(errs.some((e) => e.toLowerCase().includes('inputschema')));
});

test('validateTool rejects inputSchema without type', () => {
  const errs = validateTool({ name: 'x', inputSchema: { properties: {} } });
  assert.ok(errs.some((e) => e.toLowerCase().includes('inputschema.type')));
});

test('validateTool rejects non-positive rateLimit', () => {
  const errs = validateTool({ name: 'x', rateLimit: 0 });
  assert.ok(errs.some((e) => e.toLowerCase().includes('ratelimit')));
});

test('validateTool rejects non-integer rateLimit', () => {
  const errs = validateTool({ name: 'x', rateLimit: 1.5 });
  assert.ok(errs.some((e) => e.toLowerCase().includes('ratelimit')));
});

test('validateTool handles null body', () => {
  const errs = validateTool(null);
  assert.ok(errs.length > 0);
});

test('validateSchema accepts a valid schema', () => {
  assert.deepEqual(validateSchema({ type: 'object' }, 's'), []);
});

test('validateSchema rejects non-object', () => {
  const errs = validateSchema('x', 's');
  assert.ok(errs.length > 0);
});

test('validateMethod returns null for null/undefined', () => {
  assert.equal(validateMethod(null), null);
  assert.equal(validateMethod(undefined), null);
});

test('validateMethod rejects non-string', () => {
  assert.ok(validateMethod(123));
});

test('validateMethod rejects unknown', () => {
  assert.ok(validateMethod('FOO'));
});

// ---------- normalizeTool ----------

test('normalizeTool assigns id with tool_ prefix', () => {
  const t = normalizeTool({ name: 'x', kind: 'remote', method: 'GET', endpoint: 'https://x' }, null);
  assert.ok(t.id && t.id.startsWith('tool_'));
  assert.equal(t.kind, 'remote');
  assert.ok(t.createdAt);
  assert.ok(t.updatedAt);
});

test('normalizeTool preserves existing fields when body omits them', () => {
  const existing = { id: 'tool_1', name: 'x', kind: 'remote', method: 'GET', endpoint: 'https://x', createdAt: '2020' };
  const t = normalizeTool({ description: 'new desc' }, existing);
  assert.equal(t.id, 'tool_1');
  assert.equal(t.name, 'x');
  assert.equal(t.description, 'new desc');
});

// ---------- Filters ----------

test('byKind filters by kind', () => {
  const arr = [{ kind: 'local' }, { kind: 'remote' }, { kind: 'local' }];
  assert.equal(byKind(arr, 'local').length, 2);
  assert.equal(byKind(arr, 'remote').length, 1);
});

test('byKind returns all when kind missing', () => {
  const arr = [{ kind: 'local' }, { kind: 'remote' }];
  assert.equal(byKind(arr, undefined).length, 2);
});

test('byMethod filters by method', () => {
  const arr = [{ method: 'GET' }, { method: 'POST' }];
  assert.equal(byMethod(arr, 'GET').length, 1);
});

test('byMethod returns all when method missing', () => {
  const arr = [{ method: 'GET' }, { method: 'POST' }];
  assert.equal(byMethod(arr, undefined).length, 2);
});

test('searchByName filters substring case-insensitive', () => {
  const arr = [{ name: 'SearchWeb' }, { name: 'Calculator' }, { name: 'WebSearch' }];
  const out = searchByName(arr, 'search', undefined);
  assert.equal(out.length, 2);
});

test('searchByName also filters by kind', () => {
  const arr = [{ name: 'x', kind: 'local' }, { name: 'x', kind: 'remote' }];
  assert.equal(searchByName(arr, 'x', 'local').length, 1);
});

test('searchByName returns all when filters missing', () => {
  const arr = [{ name: 'a' }, { name: 'b' }];
  assert.equal(searchByName(arr, undefined, undefined).length, 2);
});

test('findTool returns matching tool or null', () => {
  const arr = [{ id: 'tool_1', name: 'a' }];
  assert.equal(findTool(arr, 'tool_1').name, 'a');
  assert.equal(findTool(arr, 'nope'), null);
});

test('listAll returns same array', () => {
  const arr = [{ id: 'tool_1' }];
  assert.equal(listAll(arr), arr);
});

// ---------- Rate limiting ----------

test('checkRateLimit allows when limit is null', () => {
  const r = checkRateLimit('tool_x', null);
  assert.equal(r.allowed, true);
});

test('checkRateLimit allows when limit is undefined', () => {
  const r = checkRateLimit('tool_y', undefined);
  assert.equal(r.allowed, true);
});

test('checkRateLimit allows up to limit', () => {
  const r1 = checkRateLimit('tool_z', 2);
  const r2 = checkRateLimit('tool_z', 2);
  assert.equal(r1.allowed, true);
  assert.equal(r2.allowed, true);
});

test('checkRateLimit blocks after limit', () => {
  checkRateLimit('tool_q', 1);
  const r = checkRateLimit('tool_q', 1);
  assert.equal(r.allowed, false);
  assert.equal(r.remaining, 0);
});

// ---------- Invocations ----------

test('buildInvocation assigns id with inv_ prefix', () => {
  const inv = buildInvocation({ toolId: 'tool_1', ok: true, statusCode: 200 });
  assert.ok(inv.id && inv.id.startsWith('inv_'));
  assert.equal(inv.toolId, 'tool_1');
  assert.ok(inv.startedAt);
});

test('summarizeInvocations counts success/failure', () => {
  const invs = [
    { ok: true, durationMs: 10 },
    { ok: false, durationMs: 20 },
    { ok: true, durationMs: 30 },
  ];
  const s = summarizeInvocations(invs);
  assert.equal(s.total, 3);
  assert.equal(s.success, 2);
  assert.equal(s.failure, 1);
  assert.equal(s.avgDurationMs, 20);
});

test('summarizeInvocations handles empty array', () => {
  const s = summarizeInvocations([]);
  assert.equal(s.total, 0);
  assert.equal(s.avgDurationMs, 0);
});

// ---------- Storage: loadTools / saveTools ----------

test('saveTools + loadTools roundtrip', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-registry-test-store-'));
  process.env.TOOL_REGISTRY_DATA_DIR = tmp;
  delete require.cache[require.resolve('../../src/index')];
  const i2 = require('../../src/index');
  const tools = [{ id: 'tool_a', name: 'a' }];
  i2.saveTools(tools);
  const back = i2.loadTools();
  assert.equal(back.length, 1);
  assert.equal(back[0].id, 'tool_a');
});

test('appendInvocation + loadInvocations append correctly', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-registry-test-store-'));
  process.env.TOOL_REGISTRY_DATA_DIR = tmp;
  delete require.cache[require.resolve('../../src/index')];
  const i2 = require('../../src/index');
  i2.appendInvocation({ id: 'inv_1', toolId: 't', ok: true });
  i2.appendInvocation({ id: 'inv_2', toolId: 't', ok: false });
  const invs = i2.loadInvocations();
  assert.equal(invs.length, 2);
  assert.equal(invs[0].id, 'inv_1');
  assert.equal(invs[1].id, 'inv_2');
});

// ---------- HTTP integration ----------

function startTestServer() {
  return new Promise((resolve) => {
    const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-registry-test-'));
    process.env.TOOL_REGISTRY_DATA_DIR = testDataDir;
    delete require.cache[require.resolve('../../src/index')];
    const idx2 = require('../../src/index');
    const srv = idx2.app.listen(0, () => resolve({ srv, port: srv.address().port, dataDir: testDataDir, idx: idx2 }));
  });
}

test('HTTP: GET /health works', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.service, 'tool-registry');
  assert.equal(body.port, 4805);
  srv.close();
});

test('HTTP: GET /ready works', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/ready`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ready, true);
  srv.close();
});

test('HTTP: POST /api/tools creates a remote tool', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'search', kind: 'remote', method: 'GET', endpoint: 'https://example.com/search' }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.id && body.id.startsWith('tool_'));
  assert.equal(body.kind, 'remote');
  srv.close();
});

test('HTTP: POST /api/tools validates body and returns 400', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'remote' }), // missing name
  });
  assert.equal(res.status, 400);
  srv.close();
});

test('HTTP: GET /api/tools lists tools', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', kind: 'remote', method: 'GET', endpoint: 'https://a' }),
  });
  await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'b', kind: 'local' }),
  });
  const res = await fetch(`http://localhost:${port}/api/tools`);
  const body = await res.json();
  assert.equal(body.count, 2);
  srv.close();
});

test('HTTP: GET /api/tools?kind=remote filters by kind', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', kind: 'remote', method: 'GET', endpoint: 'https://a' }),
  });
  await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'b', kind: 'local' }),
  });
  const res = await fetch(`http://localhost:${port}/api/tools?kind=remote`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.tools[0].kind, 'remote');
  srv.close();
});

test('HTTP: GET /api/tools?method=POST filters by method', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', kind: 'remote', method: 'GET', endpoint: 'https://a' }),
  });
  await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'b', kind: 'remote', method: 'POST', endpoint: 'https://b' }),
  });
  const res = await fetch(`http://localhost:${port}/api/tools?method=POST`);
  const body = await res.json();
  assert.equal(body.count, 1);
  srv.close();
});

test('HTTP: GET /api/tools?name=substring filters by name substring', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'search-web', kind: 'remote', method: 'GET', endpoint: 'https://a' }),
  });
  await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'calculator', kind: 'local' }),
  });
  const res = await fetch(`http://localhost:${port}/api/tools?name=search`);
  const body = await res.json();
  assert.equal(body.count, 1);
  srv.close();
});

test('HTTP: GET /api/tools/search returns matching tools', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'web-search', kind: 'remote', method: 'GET', endpoint: 'https://a' }),
  });
  await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'calculator', kind: 'local' }),
  });
  const res = await fetch(`http://localhost:${port}/api/tools/search?name=web`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.tools[0].name, 'web-search');
  srv.close();
});

test('HTTP: GET /api/tools/search?kind=local filters by kind', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'calc', kind: 'local' }),
  });
  await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'search', kind: 'remote', method: 'GET', endpoint: 'https://a' }),
  });
  const res = await fetch(`http://localhost:${port}/api/tools/search?kind=local`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.tools[0].kind, 'local');
  srv.close();
});

test('HTTP: GET /api/tools/:id returns tool', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'x', kind: 'local' }),
  });
  const t = await create.json();
  const get = await fetch(`http://localhost:${port}/api/tools/${t.id}`);
  assert.equal(get.status, 200);
  const body = await get.json();
  assert.equal(body.id, t.id);
  srv.close();
});

test('HTTP: GET /api/tools/:id 404 when missing', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/tools/nope`);
  assert.equal(res.status, 404);
  srv.close();
});

test('HTTP: PATCH /api/tools/:id updates tool in place', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'x', kind: 'local' }),
  });
  const t = await create.json();
  const patch = await fetch(`http://localhost:${port}/api/tools/${t.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: 'updated' }),
  });
  assert.equal(patch.status, 200);
  const updated = await patch.json();
  assert.equal(updated.description, 'updated');
  // id must be preserved
  assert.equal(updated.id, t.id);
  srv.close();
});

test('HTTP: DELETE /api/tools/:id removes tool', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'x', kind: 'local' }),
  });
  const t = await create.json();
  const del = await fetch(`http://localhost:${port}/api/tools/${t.id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  const get = await fetch(`http://localhost:${port}/api/tools/${t.id}`);
  assert.equal(get.status, 404);
  srv.close();
});

test('HTTP: POST /api/tools/:id/invoke returns 400 for local tool', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'local-thing', kind: 'local' }),
  });
  const t = await create.json();
  const inv = await fetch(`http://localhost:${port}/api/tools/${t.id}/invoke`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { x: 1 } }),
  });
  assert.equal(inv.status, 400);
  const body = await inv.json();
  assert.equal(body.error, 'local_tool_invocation_not_supported');
  // Should also be recorded in invocations.jsonl
  const invs = await fetch(`http://localhost:${port}/api/invocations?toolId=${t.id}`);
  const invList = await invs.json();
  assert.equal(invList.count, 1);
  assert.equal(invList.invocations[0].ok, false);
  srv.close();
});

test('HTTP: POST /api/tools/:id/invoke 502 on bad upstream, records failure', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'bad-tool', kind: 'remote', method: 'GET', endpoint: 'http://127.0.0.1:1/nope' }),
  });
  const t = await create.json();
  const inv = await fetch(`http://localhost:${port}/api/tools/${t.id}/invoke`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { q: 'x' } }),
  });
  assert.equal(inv.status, 502);
  // Failure recorded
  const invs = await fetch(`http://localhost:${port}/api/invocations?toolId=${t.id}&ok=false`);
  const invList = await invs.json();
  assert.equal(invList.count, 1);
  assert.equal(invList.invocations[0].ok, false);
  srv.close();
});

test('HTTP: POST /api/tools/:id/invoke returns 429 when rate limit exceeded', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'limited',
      kind: 'remote',
      method: 'GET',
      endpoint: 'http://127.0.0.1:1/nope',
      rateLimit: 1,
    }),
  });
  const t = await create.json();
  // First invocation: even though upstream will fail, the rate-limit check passes
  await fetch(`http://localhost:${port}/api/tools/${t.id}/invoke`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { q: '1' } }),
  });
  // Second invocation: rate limit exceeded
  const inv2 = await fetch(`http://localhost:${port}/api/tools/${t.id}/invoke`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { q: '2' } }),
  });
  assert.equal(inv2.status, 429);
  const body = await inv2.json();
  assert.equal(body.error, 'rate_limit_exceeded');
  srv.close();
});

test('HTTP: GET /api/tools/:id/invocations returns tool-specific invocations', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 't', kind: 'local' }),
  });
  const t = await create.json();
  await fetch(`http://localhost:${port}/api/tools/${t.id}/invoke`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const res = await fetch(`http://localhost:${port}/api/tools/${t.id}/invocations`);
  const body = await res.json();
  assert.equal(body.toolId, t.id);
  assert.equal(body.count, 1);
  srv.close();
});

test('HTTP: GET /api/invocations filters by toolId', async () => {
  const { srv, port } = await startTestServer();
  const a = await (await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', kind: 'local' }),
  })).json();
  const b = await (await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'b', kind: 'local' }),
  })).json();
  await fetch(`http://localhost:${port}/api/tools/${a.id}/invoke`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  await fetch(`http://localhost:${port}/api/tools/${b.id}/invoke`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const res = await fetch(`http://localhost:${port}/api/invocations?toolId=${a.id}`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.invocations[0].toolId, a.id);
  srv.close();
});

test('HTTP: GET /api/invocations filters by ok=false', async () => {
  const { srv, port } = await startTestServer();
  const a = await (await fetch(`http://localhost:${port}/api/tools`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', kind: 'local' }),
  })).json();
  await fetch(`http://localhost:${port}/api/tools/${a.id}/invoke`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const res = await fetch(`http://localhost:${port}/api/invocations?ok=false`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.invocations[0].ok, false);
  srv.close();
});

test('HTTP: unknown route returns 404', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/no-such-route`);
  assert.equal(res.status, 404);
  srv.close();
});
