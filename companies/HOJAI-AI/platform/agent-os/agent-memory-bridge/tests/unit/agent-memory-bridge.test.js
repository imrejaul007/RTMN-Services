'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const idx = require('../../src/index');
const {
  validateMemory, normalizeMemory, computeConfidence, scoreMatch,
  searchByQuery, filterByType, filterByTag, rankMemories,
  summarizeTypes, averageConfidence,
  ensurePartition, loadMemories, saveMemories, findMemory, listAll,
  syncToMemoryOS,
  app, SERVICE_NAME, PORT, VERSION,
  VALID_TYPES, MEMORY_OS_URL,
} = idx;

// ---------- Validation: validateMemory ----------

test('validateMemory accepts a minimal valid memory', () => {
  const errs = validateMemory({ agentId: 'agt_1', type: 'fact', content: 'user likes coffee' });
  assert.deepEqual(errs, []);
});

test('validateMemory accepts each valid type', () => {
  for (const t of VALID_TYPES) {
    const errs = validateMemory({ agentId: 'a', type: t, content: 'x' });
    assert.deepEqual(errs, [], `expected no errors for type ${t}`);
  }
});

test('validateMemory rejects missing agentId', () => {
  const errs = validateMemory({ type: 'fact', content: 'x' });
  assert.ok(errs.some((e) => e.includes('agentId')));
});

test('validateMemory rejects invalid type', () => {
  const errs = validateMemory({ agentId: 'a', type: 'unknown', content: 'x' });
  assert.ok(errs.some((e) => e.includes('type must be')));
});

test('validateMemory rejects empty content', () => {
  const errs = validateMemory({ agentId: 'a', type: 'fact', content: '' });
  assert.ok(errs.some((e) => e.includes('content')));
});

test('validateMemory rejects non-array tags', () => {
  const errs = validateMemory({ agentId: 'a', type: 'fact', content: 'x', tags: 'nope' });
  assert.ok(errs.some((e) => e.includes('tags')));
});

test('validateMemory rejects non-string tag entries', () => {
  const errs = validateMemory({ agentId: 'a', type: 'fact', content: 'x', tags: [1, 2] });
  assert.ok(errs.some((e) => e.includes('tags')));
});

test('validateMemory rejects out-of-range confidence', () => {
  const errs1 = validateMemory({ agentId: 'a', type: 'fact', content: 'x', confidence: 1.5 });
  const errs2 = validateMemory({ agentId: 'a', type: 'fact', content: 'x', confidence: -0.1 });
  assert.ok(errs1.some((e) => e.includes('confidence')));
  assert.ok(errs2.some((e) => e.includes('confidence')));
});

test('validateMemory handles null', () => {
  const errs = validateMemory(null);
  assert.ok(errs.length > 0);
});

// ---------- normalizeMemory ----------

test('normalizeMemory assigns id with mem_ prefix', () => {
  const m = normalizeMemory({ agentId: 'a', type: 'fact', content: 'x' }, null);
  assert.ok(m.id && m.id.startsWith('mem_'));
  assert.equal(m.agentId, 'a');
  assert.equal(m.type, 'fact');
  assert.equal(m.content, 'x');
  assert.equal(m.syncedToMemoryOS, false);
  assert.equal(m.syncAttempts, 0);
});

test('normalizeMemory preserves existing fields when body omits them', () => {
  const existing = { id: 'mem_1', agentId: 'agt_1', type: 'fact', content: 'old', createdAt: '2020' };
  const m = normalizeMemory({ agentId: 'agt_1' }, existing);
  assert.equal(m.id, 'mem_1');
  assert.equal(m.type, 'fact');
  assert.equal(m.content, 'old');
});

test('normalizeMemory defaults tags to empty array', () => {
  const m = normalizeMemory({ agentId: 'a', type: 'fact', content: 'x' }, null);
  assert.deepEqual(m.tags, []);
});

// ---------- computeConfidence ----------

test('computeConfidence returns base value when no access info', () => {
  const m = { confidence: 0.5, accessCount: 0, lastAccessedAt: null };
  const c = computeConfidence(m);
  assert.ok(Math.abs(c - 0.5) < 1e-9, `expected ~0.5, got ${c}`);
});

test('computeConfidence adds recency boost when accessed recently', () => {
  const now = Date.now();
  const m = { confidence: 0.5, accessCount: 0, lastAccessedAt: new Date(now - 1000).toISOString() };
  const c = computeConfidence(m);
  // recency boost = +0.1, no freq boost -> 0.6
  assert.ok(Math.abs(c - 0.6) < 1e-9, `expected ~0.6, got ${c}`);
});

test('computeConfidence decays recency boost linearly over 30 days', () => {
  const now = Date.now();
  // ~15 days old -> halfway between 1 day and 30 days window
  const ageMs = 15 * 24 * 60 * 60 * 1000;
  const m = { confidence: 0.5, accessCount: 0, lastAccessedAt: new Date(now - ageMs).toISOString() };
  const c = computeConfidence(m);
  // recencyBoost ~ 0.05, total ~ 0.55
  assert.ok(c > 0.5 && c < 0.6, `expected between 0.5 and 0.6, got ${c}`);
});

test('computeConfidence returns 0 recency boost after 30 days', () => {
  const now = Date.now();
  const m = { confidence: 0.5, accessCount: 0, lastAccessedAt: new Date(now - 31 * 24 * 60 * 60 * 1000).toISOString() };
  const c = computeConfidence(m);
  assert.ok(Math.abs(c - 0.5) < 1e-9, `expected ~0.5, got ${c}`);
});

test('computeConfidence adds frequency boost with log2', () => {
  const now = Date.now();
  // accessCount=3, last accessed 31 days ago (no recency boost)
  const m = { confidence: 0.5, accessCount: 3, lastAccessedAt: new Date(now - 31 * 24 * 60 * 60 * 1000).toISOString() };
  const c = computeConfidence(m);
  // freq = 0.05 * log2(4) = 0.1 -> 0.6
  const expected = 0.5 + 0.05 * Math.log2(3 + 1);
  assert.ok(Math.abs(c - expected) < 1e-9, `expected ${expected}, got ${c}`);
});

test('computeConfidence caps frequency boost at 0.3', () => {
  const now = Date.now();
  const m = { confidence: 0.5, accessCount: 100000, lastAccessedAt: new Date(now - 31 * 24 * 60 * 60 * 1000).toISOString() };
  const c = computeConfidence(m);
  // Without recency: 0.5 + min(0.3, ...) = 0.8
  assert.ok(Math.abs(c - 0.8) < 1e-9, `expected ~0.8, got ${c}`);
});

test('computeConfidence clamps to [0,1]', () => {
  const m = { confidence: 0.95, accessCount: 100000, lastAccessedAt: new Date().toISOString() };
  const c = computeConfidence(m);
  assert.ok(c >= 0 && c <= 1, `expected clamp, got ${c}`);
  assert.equal(c, 1);
});

test('computeConfidence handles null', () => {
  const c = computeConfidence(null);
  assert.ok(typeof c === 'number');
});

// ---------- scoreMatch ----------

test('scoreMatch returns 0 when content does not contain query', () => {
  const m = { content: 'foo bar', type: 'fact', tags: ['x'] };
  assert.equal(scoreMatch(m, 'baz'), 0);
});

test('scoreMatch returns base score on substring match', () => {
  const m = { content: 'user likes coffee', type: 'fact', tags: [] };
  const s = scoreMatch(m, 'coffee');
  assert.ok(Math.abs(s - 0.5) < 1e-9, `expected ~0.5, got ${s}`);
});

test('scoreMatch adds type boost when type matches filter', () => {
  const m = { content: 'user likes coffee', type: 'fact', tags: [] };
  const s = scoreMatch(m, 'coffee', 'fact');
  assert.ok(Math.abs(s - 0.7) < 1e-9, `expected ~0.7, got ${s}`);
});

test('scoreMatch adds tag boost when tag matches filter', () => {
  const m = { content: 'user likes coffee', type: 'fact', tags: ['beverage'] };
  const s = scoreMatch(m, 'coffee', null, 'beverage');
  assert.ok(Math.abs(s - 0.8) < 1e-9, `expected ~0.8, got ${s}`);
});

test('scoreMatch combines type and tag boosts', () => {
  const m = { content: 'user likes coffee', type: 'fact', tags: ['beverage'] };
  const s = scoreMatch(m, 'coffee', 'fact', 'beverage');
  assert.ok(Math.abs(s - 1.0) < 1e-9, `expected ~1.0, got ${s}`);
});

test('scoreMatch is case-insensitive', () => {
  const m = { content: 'COFFEE please', type: 'fact', tags: [] };
  const s = scoreMatch(m, 'coffee');
  assert.equal(s, 0.5);
});

test('scoreMatch returns 0 for empty query', () => {
  const m = { content: 'foo', type: 'fact', tags: [] };
  assert.equal(scoreMatch(m, ''), 0);
  assert.equal(scoreMatch(m, '   '), 0);
});

test('scoreMatch handles null memory', () => {
  assert.equal(scoreMatch(null, 'foo'), 0);
});

// ---------- searchByQuery / filterByType / filterByTag ----------

test('filterByType narrows by type', () => {
  const arr = [{ type: 'fact' }, { type: 'preference' }, { type: 'fact' }];
  assert.equal(filterByType(arr, 'fact').length, 2);
});

test('filterByType returns all when type missing', () => {
  const arr = [{ type: 'fact' }, { type: 'preference' }];
  assert.equal(filterByType(arr, undefined).length, 2);
});

test('filterByType handles null array', () => {
  assert.deepEqual(filterByType(null, 'fact'), []);
});

test('filterByTag narrows by tag (case-insensitive)', () => {
  const arr = [
    { tags: ['FOO'] },
    { tags: ['bar'] },
    { tags: ['foo', 'baz'] },
  ];
  assert.equal(filterByTag(arr, 'foo').length, 2);
});

test('filterByTag returns all when tag missing', () => {
  const arr = [{ tags: ['a'] }, { tags: [] }];
  assert.equal(filterByTag(arr, undefined).length, 2);
});

test('searchByQuery returns sorted by score', () => {
  const arr = [
    { content: 'user likes tea', type: 'fact', tags: [] },
    { content: 'COFFEE is great', type: 'fact', tags: ['beverage'] },
    { content: 'unrelated', type: 'fact', tags: [] },
  ];
  const r = searchByQuery(arr, 'coffee');
  assert.equal(r.length, 1);
  assert.ok(r[0].content.includes('COFFEE'));
});

test('searchByQuery applies type filter before scoring', () => {
  const arr = [
    { content: 'coffee for breakfast', type: 'fact', tags: [] },
    { content: 'coffee for dessert', type: 'preference', tags: [] },
  ];
  const r = searchByQuery(arr, 'coffee', 'fact');
  assert.equal(r.length, 1);
  assert.equal(r[0].type, 'fact');
});

test('searchByQuery handles null array', () => {
  assert.deepEqual(searchByQuery(null, 'x'), []);
});

// ---------- rankMemories ----------

test('rankMemories sorts by confidence descending', () => {
  const now = Date.now();
  const recent = new Date(now - 1000).toISOString();
  const old = new Date(now - 31 * 24 * 60 * 60 * 1000).toISOString();
  const arr = [
    { confidence: 0.5, accessCount: 0, lastAccessedAt: old },
    { confidence: 0.5, accessCount: 0, lastAccessedAt: recent },
  ];
  const r = rankMemories(arr);
  assert.ok(r[0].lastAccessedAt === recent);
});

test('rankMemories handles null array', () => {
  assert.deepEqual(rankMemories(null), []);
});

// ---------- summarizeTypes / averageConfidence ----------

test('summarizeTypes counts by type', () => {
  const arr = [
    { type: 'fact' }, { type: 'fact' }, { type: 'preference' }, { type: 'context' },
  ];
  const s = summarizeTypes(arr);
  assert.equal(s.fact, 2);
  assert.equal(s.preference, 1);
  assert.equal(s.experience, 0);
  assert.equal(s.context, 1);
});

test('summarizeTypes handles null array', () => {
  const s = summarizeTypes(null);
  assert.deepEqual(s, { fact: 0, preference: 0, experience: 0, context: 0 });
});

test('averageConfidence returns mean confidence', () => {
  const arr = [
    { confidence: 0.6, accessCount: 0, lastAccessedAt: null },
    { confidence: 0.4, accessCount: 0, lastAccessedAt: null },
  ];
  const c = averageConfidence(arr);
  assert.ok(Math.abs(c - 0.5) < 1e-9);
});

test('averageConfidence returns 0 for empty array', () => {
  assert.equal(averageConfidence([]), 0);
});

// ---------- Storage helpers ----------

test('ensurePartition creates file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'amb-test-'));
  process.env.AGENT_MEMORY_BRIDGE_DATA_DIR = dir;
  delete require.cache[require.resolve('../../src/index')];
  const i2 = require('../../src/index');
  const p = i2.ensurePartition('agt_x');
  assert.ok(fs.existsSync(p));
});

test('loadMemories / saveMemories round-trip', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'amb-test-'));
  process.env.AGENT_MEMORY_BRIDGE_DATA_DIR = dir;
  delete require.cache[require.resolve('../../src/index')];
  const i2 = require('../../src/index');
  const mem = { id: 'mem_1', agentId: 'a', type: 'fact', content: 'x' };
  i2.saveMemories('a', [mem]);
  const loaded = i2.loadMemories('a');
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, 'mem_1');
});

test('findMemory returns memory or null', () => {
  const arr = [{ id: 'mem_1' }, { id: 'mem_2' }];
  assert.equal(findMemory(arr, 'mem_2').id, 'mem_2');
  assert.equal(findMemory(arr, 'nope'), null);
});

test('listAll handles non-array', () => {
  assert.deepEqual(listAll(null), []);
  assert.deepEqual(listAll(undefined), []);
});

// ---------- syncToMemoryOS ----------

test('syncToMemoryOS returns failure for invalid memory', async () => {
  const r = await syncToMemoryOS(null);
  assert.equal(r.ok, false);
});

// ---------- HTTP integration ----------

function startTestServer() {
  return new Promise((resolve) => {
    const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-memory-bridge-test-'));
    process.env.AGENT_MEMORY_BRIDGE_DATA_DIR = testDataDir;
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
  assert.equal(body.service, 'agent-memory-bridge');
  assert.equal(body.port, 4811);
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

test('HTTP: POST /api/agents/:agentId/memories creates memory', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/agents/agt_1/memories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'fact', content: 'user likes coffee', tags: ['beverage'] }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.id && body.id.startsWith('mem_'));
  assert.equal(body.agentId, 'agt_1');
  assert.equal(body.type, 'fact');
  srv.close();
});

test('HTTP: POST /api/agents/:agentId/memories validates body', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/agents/agt_1/memories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'invalid' }),
  });
  assert.equal(res.status, 400);
  srv.close();
});

test('HTTP: GET /api/agents/:agentId/memories lists memories with filters', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/agents/agt_1/memories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'fact', content: 'x1', tags: ['a'] }),
  });
  await fetch(`http://localhost:${port}/api/agents/agt_1/memories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'preference', content: 'x2', tags: ['b'] }),
  });
  const r1 = await fetch(`http://localhost:${port}/api/agents/agt_1/memories`);
  const b1 = await r1.json();
  assert.equal(b1.count, 2);
  const r2 = await fetch(`http://localhost:${port}/api/agents/agt_1/memories?type=fact`);
  const b2 = await r2.json();
  assert.equal(b2.count, 1);
  assert.equal(b2.memories[0].type, 'fact');
  const r3 = await fetch(`http://localhost:${port}/api/agents/agt_1/memories?tag=b`);
  const b3 = await r3.json();
  assert.equal(b3.count, 1);
  srv.close();
});

test('HTTP: GET /api/agents/:agentId/memories/search returns matching memories', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/agents/agt_1/memories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'fact', content: 'user loves coffee in the morning' }),
  });
  await fetch(`http://localhost:${port}/api/agents/agt_1/memories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'preference', content: 'prefers tea at night' }),
  });
  const res = await fetch(`http://localhost:${port}/api/agents/agt_1/memories/search?q=coffee`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.ok(body.memories[0].content.includes('coffee'));
  srv.close();
});

test('HTTP: GET /api/agents/:agentId/memories/:memoryId returns one and increments accessCount', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/agents/agt_1/memories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'fact', content: 'x' }),
  });
  const created = await create.json();
  const get1 = await fetch(`http://localhost:${port}/api/agents/agt_1/memories/${created.id}`);
  const b1 = await get1.json();
  assert.equal(b1.accessCount, 1);
  const get2 = await fetch(`http://localhost:${port}/api/agents/agt_1/memories/${created.id}`);
  const b2 = await get2.json();
  assert.equal(b2.accessCount, 2);
  srv.close();
});

test('HTTP: PATCH /api/agents/:agentId/memories/:memoryId updates fields', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/agents/agt_1/memories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'fact', content: 'old', tags: ['a'] }),
  });
  const created = await create.json();
  const patch = await fetch(`http://localhost:${port}/api/agents/agt_1/memories/${created.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'new', tags: ['b', 'c'], confidence: 0.9 }),
  });
  assert.equal(patch.status, 200);
  const body = await patch.json();
  assert.equal(body.content, 'new');
  assert.deepEqual(body.tags, ['b', 'c']);
  assert.equal(body.confidence, 0.9);
  srv.close();
});

test('HTTP: DELETE /api/agents/:agentId/memories/:memoryId removes memory', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/agents/agt_1/memories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'fact', content: 'x' }),
  });
  const created = await create.json();
  const del = await fetch(`http://localhost:${port}/api/agents/agt_1/memories/${created.id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  const body = await del.json();
  assert.equal(body.deleted, true);
  const get = await fetch(`http://localhost:${port}/api/agents/agt_1/memories/${created.id}`);
  assert.equal(get.status, 404);
  srv.close();
});

test('HTTP: GET /api/agents/:agentId/sync-queue returns unsynced memories', async () => {
  // Point at an unreachable port so scheduleSync fails fast and predictably
  process.env.MEMORY_OS_URL = 'http://127.0.0.1:1';
  const { srv, port, idx: i2 } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/agents/agt_1/memories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'fact', content: 'x' }),
  });
  const created = await create.json();
  // Wait for the fire-and-forget sync to finish (timeout ~2s)
  await new Promise((r) => setTimeout(r, 2200));
  // Mark one as synced
  const memories = i2.loadMemories('agt_1');
  const target = memories.find((m) => m.id === created.id);
  target.syncedToMemoryOS = true;
  i2.saveMemories('agt_1', memories);

  // Add another unsynced one (and wait for its sync attempt to finish)
  await fetch(`http://localhost:${port}/api/agents/agt_1/memories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'fact', content: 'y' }),
  });
  await new Promise((r) => setTimeout(r, 2200));

  const res = await fetch(`http://localhost:${port}/api/agents/agt_1/sync-queue`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.pending[0].syncedToMemoryOS, false);
  srv.close();
});

test('HTTP: POST /api/agents/:agentId/recall returns top N', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/agents/agt_1/memories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'fact', content: 'coffee is great in the morning' }),
  });
  await fetch(`http://localhost:${port}/api/agents/agt_1/memories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'fact', content: 'tea is fine too' }),
  });
  const res = await fetch(`http://localhost:${port}/api/agents/agt_1/recall`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: 'coffee', limit: 1 }),
  });
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.ok(body.memories[0].content.includes('coffee'));
  srv.close();
});

test('HTTP: GET /api/agents/:agentId/stats returns aggregated stats', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/agents/agt_1/memories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'fact', content: 'x1', confidence: 0.8 }),
  });
  await fetch(`http://localhost:${port}/api/agents/agt_1/memories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'preference', content: 'x2', confidence: 0.6 }),
  });
  const res = await fetch(`http://localhost:${port}/api/agents/agt_1/stats`);
  const body = await res.json();
  assert.equal(body.total, 2);
  assert.equal(body.byType.fact, 1);
  assert.equal(body.byType.preference, 1);
  assert.ok(body.avgConfidence > 0);
  srv.close();
});

test('HTTP: POST /api/agents/:agentId/memories/:memoryId/sync queues retry', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/agents/agt_1/memories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'fact', content: 'x' }),
  });
  const created = await create.json();
  const sync = await fetch(`http://localhost:${port}/api/agents/agt_1/memories/${created.id}/sync`, { method: 'POST' });
  assert.equal(sync.status, 200);
  const body = await sync.json();
  assert.equal(body.retryQueued, true);
  srv.close();
});

test('HTTP: GET /api/agents/:agentId/memories/:memoryId 404 when missing', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/agents/agt_1/memories/mem_nope`);
  assert.equal(res.status, 404);
  srv.close();
});

test('HTTP: route ordering - /memories/search matches before /memories/:memoryId', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/agents/agt_1/memories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'fact', content: 'hello world' }),
  });
  const created = await create.json();
  // Hit /search - must not 404 with the memoryId interpretation
  const search = await fetch(`http://localhost:${port}/api/agents/agt_1/memories/search?q=hello`);
  assert.equal(search.status, 200);
  const sb = await search.json();
  assert.ok(Array.isArray(sb.memories));
  // Hit /:memoryId - should work normally
  const get = await fetch(`http://localhost:${port}/api/agents/agt_1/memories/${created.id}`);
  assert.equal(get.status, 200);
  srv.close();
});

test('HTTP: unknown route returns 404', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/no-such-route`);
  assert.equal(res.status, 404);
  srv.close();
});

test('HTTP: MemoryOS unreachable -> memory still created, marked unsynced', async () => {
  // Use a port where no MemoryOS is running
  process.env.MEMORY_OS_URL = 'http://localhost:1';
  const { srv, port, idx: i2 } = await startTestServer();
  delete i2.MEMORY_OS_URL;
  // Restart module with the bad URL
  const create = await fetch(`http://localhost:${port}/api/agents/agt_1/memories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'fact', content: 'x' }),
  });
  assert.equal(create.status, 201);
  const body = await create.json();
  // Wait briefly for the fire-and-forget sync to complete
  await new Promise((r) => setTimeout(r, 2500));
  const refreshed = i2.loadMemories('agt_1');
  const target = refreshed.find((m) => m.id === body.id);
  assert.equal(target.syncedToMemoryOS, false);
  assert.ok(target.syncAttempts >= 1);
  srv.close();
});

// Force-exit at end of file: background sync (setImmediate + fetch + setTimeout)
// holds the event loop open, which would prevent `node --test` from exiting cleanly.
const { after } = require('node:test');
after(() => {
  // Give any in-flight sync fetches a moment to settle, then force-exit.
  setTimeout(() => process.exit(0), 3000).unref();
});