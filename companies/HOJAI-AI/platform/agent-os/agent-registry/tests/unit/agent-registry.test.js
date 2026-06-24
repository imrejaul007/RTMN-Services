'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const idx = require('../../src/index');
const {
  validateAgent, normalizeAgent, normalizeVersion,
  nextVersion, isExpired, searchByCapability, searchByType, searchByStatus,
  toSummary, snapshotAgent, buildVersionSummary,
  loadAgents, saveAgents, loadVersions, saveVersions, appendVersion,
  findAgent, findIndex, listAll,
  app, SERVICE_NAME, PORT, VERSION,
  VALID_TYPES, VALID_STATUSES, DEFAULT_HEARTBEAT_TTL_MS,
} = idx;

// ---------- Validation: validateAgent ----------

test('validateAgent accepts a minimal valid agent', () => {
  const errs = validateAgent({ name: 'shopper', type: 'genie', owner: 'team-a' });
  assert.deepEqual(errs, []);
});

test('validateAgent accepts each valid type', () => {
  for (const t of VALID_TYPES) {
    const errs = validateAgent({ name: 'n', type: t, owner: 'o' });
    assert.deepEqual(errs, [], `type ${t} should be valid`);
  }
});

test('validateAgent accepts each valid status', () => {
  for (const s of VALID_STATUSES) {
    const errs = validateAgent({ name: 'n', type: 'genie', owner: 'o', status: s });
    assert.deepEqual(errs, [], `status ${s} should be valid`);
  }
});

test('validateAgent rejects missing name', () => {
  const errs = validateAgent({ type: 'genie', owner: 'o' });
  assert.ok(errs.some((e) => e.includes('name')));
});

test('validateAgent rejects invalid type', () => {
  const errs = validateAgent({ name: 'n', type: 'robot', owner: 'o' });
  assert.ok(errs.some((e) => e.includes('type must be')));
});

test('validateAgent rejects missing owner', () => {
  const errs = validateAgent({ name: 'n', type: 'genie' });
  assert.ok(errs.some((e) => e.includes('owner')));
});

test('validateAgent rejects invalid status', () => {
  const errs = validateAgent({ name: 'n', type: 'genie', owner: 'o', status: 'weird' });
  assert.ok(errs.some((e) => e.includes('status must be')));
});

test('validateAgent rejects non-string-array capabilities', () => {
  const errs = validateAgent({ name: 'n', type: 'genie', owner: 'o', capabilities: 'a' });
  assert.ok(errs.some((e) => e.includes('capabilities')));
});

test('validateAgent rejects array metadata', () => {
  const errs = validateAgent({ name: 'n', type: 'genie', owner: 'o', metadata: [1, 2] });
  assert.ok(errs.some((e) => e.includes('metadata')));
});

test('validateAgent handles null body', () => {
  const errs = validateAgent(null);
  assert.ok(errs.length > 0);
});

test('validateAgent in partial mode allows missing required fields', () => {
  const errs = validateAgent({}, { partial: true });
  assert.deepEqual(errs, []);
});

test('validateAgent in partial mode still validates type when provided', () => {
  const errs = validateAgent({ type: 'bad' }, { partial: true });
  assert.ok(errs.some((e) => e.includes('type must be')));
});

// ---------- normalizeAgent ----------

test('normalizeAgent assigns id with agt_ prefix', () => {
  const a = normalizeAgent({ name: 'n', type: 'genie', owner: 'o' }, null);
  assert.ok(a.id && a.id.startsWith('agt_'));
  assert.equal(a.status, 'draft');
  assert.equal(a.version, '1.0.0');
  assert.deepEqual(a.capabilities, []);
});

test('normalizeAgent preserves existing fields when body omits them', () => {
  const existing = { id: 'agt_1', name: 'n', type: 'genie', owner: 'o', createdAt: '2020' };
  const a = normalizeAgent({ name: 'n2' }, existing);
  assert.equal(a.id, 'agt_1');
  assert.equal(a.owner, 'o');
  assert.equal(a.createdAt, '2020');
  assert.equal(a.name, 'n2');
});

test('normalizeAgent merges metadata when provided', () => {
  const existing = { id: 'a', name: 'n', type: 'genie', owner: 'o', metadata: { k: 1 } };
  const a = normalizeAgent({ metadata: { k: 2, j: 3 } }, existing);
  assert.equal(a.metadata.k, 2);
  assert.equal(a.metadata.j, 3);
});

// ---------- nextVersion ----------

test('nextVersion bumps patch on 1.0.0', () => {
  assert.equal(nextVersion('1.0.0'), '1.0.1');
});

test('nextVersion increments past 9', () => {
  assert.equal(nextVersion('1.0.9'), '1.0.10');
});

test('nextVersion returns 1.0.0 for null/invalid input', () => {
  assert.equal(nextVersion(null), '1.0.0');
  assert.equal(nextVersion('bad'), '1.0.0');
  assert.equal(nextVersion('1.0'), '1.0.0');
});

// ---------- isExpired ----------

test('isExpired returns false for agent with no heartbeat', () => {
  const a = { id: 'a', lastHeartbeat: null };
  assert.equal(isExpired(a), false);
});

test('isExpired returns true when heartbeat older than TTL', () => {
  const old = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const a = { id: 'a', lastHeartbeat: old };
  assert.equal(isExpired(a, 5 * 60 * 1000), true);
});

test('isExpired returns false when heartbeat is recent', () => {
  const recent = new Date(Date.now() - 1000).toISOString();
  const a = { id: 'a', lastHeartbeat: recent };
  assert.equal(isExpired(a, 5 * 60 * 1000), false);
});

test('isExpired handles null agent', () => {
  assert.equal(isExpired(null), true);
});

test('isExpired returns true for unparseable heartbeat', () => {
  const a = { id: 'a', lastHeartbeat: 'not-a-date' };
  assert.equal(isExpired(a), true);
});

// ---------- Search filters ----------

test('searchByType filters by type', () => {
  const arr = [{ type: 'genie' }, { type: 'merchant' }];
  assert.equal(searchByType(arr, 'genie').length, 1);
});

test('searchByType returns all when type missing', () => {
  const arr = [{ type: 'genie' }, { type: 'merchant' }];
  assert.equal(searchByType(arr, undefined).length, 2);
});

test('searchByStatus filters by status', () => {
  const arr = [{ status: 'active' }, { status: 'paused' }];
  assert.equal(searchByStatus(arr, 'active').length, 1);
});

test('searchByCapability filters by capability', () => {
  const arr = [{ capabilities: ['search', 'chat'] }, { capabilities: ['search'] }, { capabilities: [] }];
  const r = searchByCapability(arr, 'chat');
  assert.equal(r.length, 1);
});

test('searchByCapability returns all when capability missing', () => {
  const arr = [{ capabilities: ['x'] }, { capabilities: [] }];
  assert.equal(searchByCapability(arr, undefined).length, 2);
});

// ---------- toSummary / snapshotAgent / buildVersionSummary ----------

test('toSummary returns summary object with expired flag', () => {
  const a = { id: 'agt_1', name: 'n', version: '1.0.0', type: 'genie', status: 'active', owner: 'o', capabilities: ['x'], tools: [], skills: [], createdAt: 'c', updatedAt: 'u', lastHeartbeat: null };
  const s = toSummary(a);
  assert.equal(s.id, 'agt_1');
  assert.equal(s.expired, false);
  assert.deepEqual(s.capabilities, ['x']);
});

test('toSummary handles null', () => {
  assert.equal(toSummary(null), null);
});

test('snapshotAgent returns deep-cloned arrays/objects', () => {
  const a = { id: 'a', name: 'n', version: '1.0.0', type: 'genie', status: 'active', owner: 'o', capabilities: ['x'], tools: ['t'], skills: [], metadata: { k: 1 }, createdAt: 'c', updatedAt: 'u', lastHeartbeat: null };
  const s = snapshotAgent(a);
  s.capabilities.push('y');
  s.metadata.k = 99;
  assert.deepEqual(a.capabilities, ['x']);
  assert.equal(a.metadata.k, 1);
});

test('snapshotAgent handles null gracefully', () => {
  const s = snapshotAgent(null);
  assert.equal(s.id, undefined);
  assert.deepEqual(s.capabilities, []);
  assert.deepEqual(s.metadata, {});
});

test('buildVersionSummary returns summary object', () => {
  const v = { id: 'ver_1', agentId: 'agt_1', version: '1.0.0', createdAt: 'c' };
  const s = buildVersionSummary(v);
  assert.equal(s.id, 'ver_1');
  assert.equal(s.agentId, 'agt_1');
});

test('buildVersionSummary handles null', () => {
  assert.equal(buildVersionSummary(null), null);
});

// ---------- findAgent / findIndex / listAll ----------

test('findAgent returns matching agent or null', () => {
  const arr = [{ id: 'agt_1' }];
  assert.equal(findAgent(arr, 'agt_1').id, 'agt_1');
  assert.equal(findAgent(arr, 'nope'), null);
});

test('findIndex returns -1 when not found', () => {
  const arr = [{ id: 'agt_1' }];
  assert.equal(findIndex(arr, 'nope'), -1);
});

test('listAll returns same array', () => {
  const arr = [{ a: 1 }];
  assert.equal(listAll(arr), arr);
});

// ---------- normalizeVersion ----------

test('normalizeVersion assigns id with ver_ prefix', () => {
  const a = { id: 'agt_1', version: '1.0.0' };
  const v = normalizeVersion(a, { foo: 'bar' });
  assert.ok(v.id && v.id.startsWith('ver_'));
  assert.equal(v.agentId, 'agt_1');
  assert.equal(v.version, '1.0.0');
  assert.deepEqual(v.snapshot, { foo: 'bar' });
});

// ---------- HTTP integration ----------

function startTestServer() {
  return new Promise((resolve) => {
    const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-registry-test-'));
    process.env.AGENT_REGISTRY_DATA_DIR = testDataDir;
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
  assert.equal(body.service, 'agent-registry');
  assert.equal(body.port, 4803);
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

test('HTTP: POST /api/agents creates an agent', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/agents`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'shopper', type: 'genie', owner: 'team-a', capabilities: ['search', 'chat'] }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.id && body.id.startsWith('agt_'));
  assert.equal(body.name, 'shopper');
  assert.equal(body.status, 'draft');
  assert.deepEqual(body.capabilities, ['search', 'chat']);
  srv.close();
});

test('HTTP: POST /api/agents validates body and returns 400', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/agents`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'genie', owner: 'o' }), // missing name
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'validation');
  srv.close();
});

test('HTTP: GET /api/agents lists agents with filters', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/agents`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a1', type: 'genie', owner: 'o' }),
  });
  await fetch(`http://localhost:${port}/api/agents`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a2', type: 'merchant', owner: 'o' }),
  });
  const res = await fetch(`http://localhost:${port}/api/agents?type=merchant`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.agents[0].name, 'a2');
  srv.close();
});

test('HTTP: GET /api/agents/search filters by capability', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/agents`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a1', type: 'genie', owner: 'o', capabilities: ['translate'] }),
  });
  await fetch(`http://localhost:${port}/api/agents`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a2', type: 'genie', owner: 'o', capabilities: ['search'] }),
  });
  const res = await fetch(`http://localhost:${port}/api/agents/search?capability=translate`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.agents[0].name, 'a1');
  srv.close();
});

test('HTTP: GET /api/agents/:id returns agent', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/agents`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', type: 'genie', owner: 'o' }),
  });
  const a = await create.json();
  const get = await fetch(`http://localhost:${port}/api/agents/${a.id}`);
  assert.equal(get.status, 200);
  const body = await get.json();
  assert.equal(body.id, a.id);
  srv.close();
});

test('HTTP: GET /api/agents/:id 404 when missing', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/agents/agt_does_not_exist`);
  assert.equal(res.status, 404);
  srv.close();
});

test('HTTP: PATCH /api/agents/:id updates and creates version snapshot', async () => {
  const { srv, port, idx: i2 } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/agents`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', type: 'genie', owner: 'o', capabilities: ['search'] }),
  });
  const a = await create.json();
  assert.equal(a.version, '1.0.0');

  const patch = await fetch(`http://localhost:${port}/api/agents/${a.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ capabilities: ['search', 'translate'] }),
  });
  assert.equal(patch.status, 200);
  const updated = await patch.json();
  assert.equal(updated.version, '1.0.1');
  assert.deepEqual(updated.capabilities, ['search', 'translate']);

  // Version snapshot recorded
  const versions = i2.loadVersions().filter((v) => v.agentId === a.id);
  assert.equal(versions.length, 2); // initial + after patch
  srv.close();
});

test('HTTP: PATCH /api/agents/:id returns 400 on bad payload', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/agents`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', type: 'genie', owner: 'o' }),
  });
  const a = await create.json();
  const patch = await fetch(`http://localhost:${port}/api/agents/${a.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'robot' }),
  });
  assert.equal(patch.status, 400);
  srv.close();
});

test('HTTP: DELETE /api/agents/:id removes the agent', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/agents`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', type: 'genie', owner: 'o' }),
  });
  const a = await create.json();
  const del = await fetch(`http://localhost:${port}/api/agents/${a.id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  const body = await del.json();
  assert.equal(body.deleted, true);
  const get = await fetch(`http://localhost:${port}/api/agents/${a.id}`);
  assert.equal(get.status, 404);
  srv.close();
});

test('HTTP: POST /api/agents/:id/heartbeat marks alive and clears expiry', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/agents`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', type: 'genie', owner: 'o' }),
  });
  const a = await create.json();
  const beat = await fetch(`http://localhost:${port}/api/agents/${a.id}/heartbeat`, { method: 'POST' });
  assert.equal(beat.status, 200);
  const body = await beat.json();
  assert.ok(body.lastHeartbeat);
  assert.equal(body.expired, false);
  srv.close();
});

test('HTTP: POST /api/agents/:id/heartbeat 404 when missing', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/agents/agt_nope/heartbeat`, { method: 'POST' });
  assert.equal(res.status, 404);
  srv.close();
});

test('HTTP: GET /api/agents/:id/versions lists snapshots', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/agents`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', type: 'genie', owner: 'o' }),
  });
  const a = await create.json();
  await fetch(`http://localhost:${port}/api/agents/${a.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'active' }),
  });
  const list = await fetch(`http://localhost:${port}/api/agents/${a.id}/versions`);
  assert.equal(list.status, 200);
  const body = await list.json();
  assert.equal(body.agentId, a.id);
  assert.equal(body.count, 2);
  srv.close();
});

test('HTTP: POST /api/agents/:id/versions creates explicit snapshot', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/agents`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', type: 'genie', owner: 'o' }),
  });
  const a = await create.json();
  const snap = await fetch(`http://localhost:${port}/api/agents/${a.id}/versions`, { method: 'POST' });
  assert.equal(snap.status, 201);
  const body = await snap.json();
  assert.ok(body.id && body.id.startsWith('ver_'));
  assert.equal(body.agentId, a.id);
  srv.close();
});

test('HTTP: unknown route returns 404', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/no-such-route`);
  assert.equal(res.status, 404);
  srv.close();
});
