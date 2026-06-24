'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const idx = require('../../src/index');
const {
  validateCapability, normalizeCapability, isValidSchema,
  hasPrerequisites, findCapability, byCategory, searchByName, listAll,
  preventSelfRef, wouldCreateCycle, topoSort, resolveChain,
  loadCapabilities, saveCapabilities, loadPrerequisites, savePrerequisites,
  summarizeCapability, findAgentsForCapability,
  app, SERVICE_NAME, PORT, VERSION,
  VALID_CATEGORIES,
} = idx;

// ---------- Validation: validateCapability ----------

test('validateCapability accepts a minimal valid capability', () => {
  const errs = validateCapability({ name: 'negotiate', category: 'BUSINESS', description: 'd' });
  assert.deepEqual(errs, []);
});

test('validateCapability rejects missing name', () => {
  const errs = validateCapability({ category: 'TECHNICAL', description: 'd' });
  assert.ok(errs.some((e) => e.includes('name')));
});

test('validateCapability rejects invalid category', () => {
  const errs = validateCapability({ name: 'x', category: 'BOGUS', description: 'd' });
  assert.ok(errs.some((e) => e.includes('category must be')));
});

test('validateCapability accepts every VALID_CATEGORIES entry', () => {
  for (const cat of VALID_CATEGORIES) {
    const errs = validateCapability({ name: 'x', category: cat, description: 'd' });
    assert.deepEqual(errs, [], `category ${cat} should validate`);
  }
});

test('validateCapability rejects missing description', () => {
  const errs = validateCapability({ name: 'x', category: 'TECHNICAL' });
  assert.ok(errs.some((e) => e.includes('description')));
});

test('validateCapability rejects non-object inputSchema', () => {
  const errs = validateCapability({ name: 'x', category: 'TECHNICAL', description: 'd', inputSchema: 'nope' });
  assert.ok(errs.some((e) => e.includes('inputSchema')));
});

test('validateCapability rejects inputSchema without type', () => {
  const errs = validateCapability({ name: 'x', category: 'TECHNICAL', description: 'd', inputSchema: { foo: 'bar' } });
  assert.ok(errs.some((e) => e.includes('inputSchema')));
});

test('validateCapability rejects non-object outputSchema', () => {
  const errs = validateCapability({ name: 'x', category: 'TECHNICAL', description: 'd', outputSchema: [] });
  assert.ok(errs.some((e) => e.includes('outputSchema')));
});

test('validateCapability rejects non-array examples', () => {
  const errs = validateCapability({ name: 'x', category: 'TECHNICAL', description: 'd', examples: 'nope' });
  assert.ok(errs.some((e) => e.includes('examples')));
});

test('validateCapability handles null', () => {
  const errs = validateCapability(null);
  assert.ok(errs.length > 0);
});

// ---------- normalizeCapability ----------

test('normalizeCapability assigns id with cap_ prefix', () => {
  const c = normalizeCapability({ name: 'x', category: 'TECHNICAL', description: 'd' }, null);
  assert.ok(c.id && c.id.startsWith('cap_'));
  assert.equal(c.name, 'x');
  assert.ok(c.inputSchema && c.inputSchema.type === 'object');
});

test('normalizeCapability preserves existing fields when body omits them', () => {
  const existing = { id: 'cap_1', name: 'n', category: 'TECHNICAL', description: 'd', createdAt: '2020' };
  const c = normalizeCapability({ description: 'updated' }, existing);
  assert.equal(c.id, 'cap_1');
  assert.equal(c.name, 'n');
  assert.equal(c.description, 'updated');
});

test('isValidSchema returns true for { type: "object" }', () => {
  assert.equal(isValidSchema({ type: 'object' }), true);
  assert.equal(isValidSchema({ type: 'string' }), true);
});

test('isValidSchema returns false for non-objects and missing type', () => {
  assert.equal(isValidSchema(null), false);
  assert.equal(isValidSchema({}), false);
  assert.equal(isValidSchema([]), false);
  assert.equal(isValidSchema('nope'), false);
});

// ---------- hasPrerequisites ----------

test('hasPrerequisites returns true for cap with prereqs', () => {
  const c = { prerequisites: ['cap_a', 'cap_b'] };
  assert.equal(hasPrerequisites(c), true);
});

test('hasPrerequisites returns false for cap without prereqs', () => {
  const c = { prerequisites: [] };
  assert.equal(hasPrerequisites(c), false);
});

test('hasPrerequisites handles null', () => {
  assert.equal(hasPrerequisites(null), false);
});

// ---------- findCapability / listAll ----------

test('findCapability returns matching capability or null', () => {
  const arr = [{ id: 'cap_1', name: 'n' }];
  assert.equal(findCapability(arr, 'cap_1').id, 'cap_1');
  assert.equal(findCapability(arr, 'nope'), null);
});

test('findCapability handles null arr or id', () => {
  assert.equal(findCapability(null, 'cap_1'), null);
  assert.equal(findCapability([], null), null);
});

test('listAll returns same array', () => {
  const arr = [{ id: 'cap_1' }];
  assert.equal(listAll(arr), arr);
});

test('listAll handles non-array', () => {
  assert.deepEqual(listAll(null), []);
});

// ---------- byCategory ----------

test('byCategory filters by category', () => {
  const arr = [{ category: 'TECHNICAL' }, { category: 'BUSINESS' }];
  assert.equal(byCategory(arr, 'TECHNICAL').length, 1);
  assert.equal(byCategory(arr, 'BUSINESS').length, 1);
});

test('byCategory returns all when category is missing', () => {
  const arr = [{ category: 'TECHNICAL' }, { category: 'BUSINESS' }];
  assert.equal(byCategory(arr, undefined).length, 2);
});

test('byCategory handles null', () => {
  assert.deepEqual(byCategory(null, 'TECHNICAL'), []);
});

// ---------- searchByName ----------

test('searchByName matches substring in name (case-insensitive)', () => {
  const arr = [{ name: 'Negotiate SaaS' }, { name: 'Write Code' }];
  assert.equal(searchByName(arr, 'negotiate').length, 1);
  assert.equal(searchByName(arr, 'NEGOTIATE').length, 1);
});

test('searchByName matches substring in description', () => {
  const arr = [{ name: 'X', description: 'Negotiate SaaS contracts' }];
  assert.equal(searchByName(arr, 'contracts').length, 1);
});

test('searchByName returns all when query is missing', () => {
  const arr = [{ name: 'X' }, { name: 'Y' }];
  assert.equal(searchByName(arr, undefined).length, 2);
});

// ---------- preventSelfRef ----------

test('preventSelfRef returns true when ids match', () => {
  assert.equal(preventSelfRef('cap_a', 'cap_a'), true);
});

test('preventSelfRef returns false when ids differ', () => {
  assert.equal(preventSelfRef('cap_a', 'cap_b'), false);
});

test('preventSelfRef returns false for null inputs', () => {
  assert.equal(preventSelfRef(null, 'cap_a'), false);
  assert.equal(preventSelfRef('cap_a', null), false);
});

// ---------- wouldCreateCycle ----------

test('wouldCreateCycle detects direct self-reference', () => {
  const caps = [{ id: 'cap_a' }];
  const prereqs = [];
  assert.equal(wouldCreateCycle(caps, prereqs, 'cap_a', 'cap_a'), true);
});

test('wouldCreateCycle detects A->B->A via BFS', () => {
  // cap_a depends on cap_b, cap_b depends on cap_a
  const caps = [{ id: 'cap_a' }, { id: 'cap_b' }];
  const prereqs = [
    { capabilityId: 'cap_a', prerequisiteId: 'cap_b' },
    { capabilityId: 'cap_b', prerequisiteId: 'cap_a' },
  ];
  // Adding another edge in either direction is a cycle
  assert.equal(wouldCreateCycle(caps, prereqs, 'cap_a', 'cap_b'), true);
});

test('wouldCreateCycle detects longer chain A->B->C, adding A->C should NOT be a cycle', () => {
  // cap_a depends on cap_b, cap_b depends on cap_c
  const caps = [{ id: 'cap_a' }, { id: 'cap_b' }, { id: 'cap_c' }];
  const prereqs = [
    { capabilityId: 'cap_a', prerequisiteId: 'cap_b' },
    { capabilityId: 'cap_b', prerequisiteId: 'cap_c' },
  ];
  // cap_a -> cap_c is fine (cap_c is a prereq of cap_b, which is a prereq of cap_a — adding direct dep is OK)
  assert.equal(wouldCreateCycle(caps, prereqs, 'cap_a', 'cap_c'), false);
  // cap_c -> cap_a is a cycle
  assert.equal(wouldCreateCycle(caps, prereqs, 'cap_c', 'cap_a'), true);
});

test('wouldCreateCycle returns false for unrelated caps', () => {
  const caps = [{ id: 'cap_a' }, { id: 'cap_b' }];
  const prereqs = [];
  assert.equal(wouldCreateCycle(caps, prereqs, 'cap_a', 'cap_b'), false);
});

test('wouldCreateCycle handles null', () => {
  assert.equal(wouldCreateCycle(null, [], 'cap_a', 'cap_b'), false);
});

// ---------- topoSort ----------

test('topoSort returns prereqs-first order for linear chain', () => {
  const caps = [
    { id: 'cap_a' }, { id: 'cap_b' }, { id: 'cap_c' },
  ];
  // a -> b -> c (a depends on b, b depends on c) — so order: c, b, a
  const prereqs = [
    { capabilityId: 'cap_a', prerequisiteId: 'cap_b' },
    { capabilityId: 'cap_b', prerequisiteId: 'cap_c' },
  ];
  const r = topoSort(caps, prereqs);
  assert.equal(r.error, null);
  assert.deepEqual(r.order, ['cap_c', 'cap_b', 'cap_a']);
});

test('topoSort returns cycle_detected for cyclic graph', () => {
  const caps = [{ id: 'cap_a' }, { id: 'cap_b' }];
  const prereqs = [
    { capabilityId: 'cap_a', prerequisiteId: 'cap_b' },
    { capabilityId: 'cap_b', prerequisiteId: 'cap_a' },
  ];
  const r = topoSort(caps, prereqs);
  assert.equal(r.error, 'cycle_detected');
  assert.deepEqual(r.order, []);
});

test('topoSort returns all caps with no prereqs', () => {
  const caps = [{ id: 'cap_a' }, { id: 'cap_b' }];
  const r = topoSort(caps, []);
  assert.equal(r.error, null);
  assert.equal(r.order.length, 2);
});

test('topoSort handles null', () => {
  const r = topoSort(null, []);
  assert.equal(r.error, 'cycle_detected');
});

// ---------- resolveChain ----------

test('resolveChain returns null for no match', () => {
  const r = resolveChain([{ id: 'cap_a', name: 'X', description: 'Y' }], [], 'zzz_nothing_matches');
  assert.equal(r, null);
});

test('resolveChain returns matching cap and its prereqs in topo order', () => {
  const caps = [
    { id: 'cap_neg', name: 'negotiate SaaS', description: 'negotiate' },
    { id: 'cap_res', name: 'research vendors', description: 'research' },
    { id: 'cap_cmp', name: 'compare prices', description: 'compare' },
  ];
  // cap_neg -> cap_res -> cap_cmp
  const prereqs = [
    { capabilityId: 'cap_neg', prerequisiteId: 'cap_res' },
    { capabilityId: 'cap_res', prerequisiteId: 'cap_cmp' },
  ];
  const r = resolveChain(caps, prereqs, 'negotiate SaaS contract');
  assert.ok(r);
  assert.equal(r.match.id, 'cap_neg');
  assert.deepEqual(r.order, ['cap_cmp', 'cap_res', 'cap_neg']);
  assert.equal(r.capabilities.length, 3);
});

test('resolveChain handles null', () => {
  assert.equal(resolveChain(null, [], 'x'), null);
  assert.equal(resolveChain([], null, 'x'), null);
  assert.equal(resolveChain([], [], null), null);
});

// ---------- Storage ----------

test('saveCapabilities + loadCapabilities round-trips', () => {
  const orig = loadCapabilities();
  saveCapabilities([{ id: 'cap_x', name: 'X' }]);
  const loaded = loadCapabilities();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, 'cap_x');
  saveCapabilities(orig); // restore
});

test('loadCapabilities returns [] when file missing', () => {
  // The function always returns [] when file doesn't exist
  const orig = loadCapabilities();
  saveCapabilities([]); // empty
  assert.deepEqual(loadCapabilities(), []);
  saveCapabilities(orig);
});

test('savePrerequisites + loadPrerequisites round-trips', () => {
  const orig = loadPrerequisites();
  savePrerequisites([{ capabilityId: 'cap_a', prerequisiteId: 'cap_b' }]);
  const loaded = loadPrerequisites();
  assert.equal(loaded.length, 1);
  savePrerequisites(orig);
});

// ---------- summarizeCapability ----------

test('summarizeCapability returns summary', () => {
  const c = { id: 'cap_1', name: 'n', category: 'TECHNICAL', description: 'd', inputSchema: { type: 'object' }, outputSchema: { type: 'object' }, examples: [], prerequisites: ['cap_0'], createdAt: 'c', updatedAt: 'u' };
  const s = summarizeCapability(c);
  assert.equal(s.id, 'cap_1');
  assert.equal(s.prerequisites.length, 1);
});

test('summarizeCapability handles null', () => {
  assert.equal(summarizeCapability(null), null);
});

// ---------- findAgentsForCapability ----------

test('findAgentsForCapability returns [] when agent-registry data is missing', () => {
  // The default repo layout has an empty agent-registry/data dir.
  // This may or may not have an agents.json — either way the function must be safe.
  const result = findAgentsForCapability('cap_nonexistent');
  assert.ok(Array.isArray(result));
});

// ---------- HTTP integration ----------

function startTestServer() {
  return new Promise((resolve) => {
    const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capability-store-test-'));
    process.env.CAPABILITY_STORE_DATA_DIR = testDataDir;
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
  assert.equal(body.service, 'capability-store');
  assert.equal(body.port, 4804);
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

test('HTTP: POST /api/capabilities creates a capability', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'negotiate', category: 'BUSINESS', description: 'd', examples: ['ex1'] }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.id && body.id.startsWith('cap_'));
  assert.equal(body.name, 'negotiate');
  srv.close();
});

test('HTTP: POST /api/capabilities validates body and returns 400', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'x' }), // missing category & description
  });
  assert.equal(res.status, 400);
  srv.close();
});

test('HTTP: GET /api/capabilities lists all', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', category: 'TECHNICAL', description: 'd' }),
  });
  const res = await fetch(`http://localhost:${port}/api/capabilities`);
  const body = await res.json();
  assert.equal(body.count, 1);
  srv.close();
});

test('HTTP: GET /api/capabilities?category= filters by category', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', category: 'TECHNICAL', description: 'd' }),
  });
  await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'b', category: 'BUSINESS', description: 'd' }),
  });
  const res = await fetch(`http://localhost:${port}/api/capabilities?category=BUSINESS`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.capabilities[0].category, 'BUSINESS');
  srv.close();
});

test('HTTP: GET /api/capabilities/search?name= filters by name', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'negotiate SaaS', category: 'BUSINESS', description: 'd' }),
  });
  await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'write code', category: 'TECHNICAL', description: 'd' }),
  });
  const res = await fetch(`http://localhost:${port}/api/capabilities/search?name=negotiate`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.capabilities[0].name, 'negotiate SaaS');
  srv.close();
});

test('HTTP: GET /api/capabilities/:id returns capability', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', category: 'TECHNICAL', description: 'd' }),
  });
  const c = await create.json();
  const res = await fetch(`http://localhost:${port}/api/capabilities/${c.id}`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, c.id);
  srv.close();
});

test('HTTP: GET /api/capabilities/:id 404 when missing', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/capabilities/cap_does_not_exist`);
  assert.equal(res.status, 404);
  srv.close();
});

test('HTTP: PATCH /api/capabilities/:id updates fields', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', category: 'TECHNICAL', description: 'd' }),
  });
  const c = await create.json();
  const patch = await fetch(`http://localhost:${port}/api/capabilities/${c.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: 'updated' }),
  });
  assert.equal(patch.status, 200);
  const body = await patch.json();
  assert.equal(body.description, 'updated');
  srv.close();
});

test('HTTP: DELETE /api/capabilities/:id removes capability', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', category: 'TECHNICAL', description: 'd' }),
  });
  const c = await create.json();
  const del = await fetch(`http://localhost:${port}/api/capabilities/${c.id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  const get = await fetch(`http://localhost:${port}/api/capabilities/${c.id}`);
  assert.equal(get.status, 404);
  srv.close();
});

test('HTTP: POST /api/capabilities/:id/prerequisites adds prereq', async () => {
  const { srv, port } = await startTestServer();
  // Create two caps
  const a = await (await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', category: 'TECHNICAL', description: 'd' }),
  })).json();
  const b = await (await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'b', category: 'TECHNICAL', description: 'd' }),
  })).json();
  // Add a depends on b
  const res = await fetch(`http://localhost:${port}/api/capabilities/${a.id}/prerequisites`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prerequisiteId: b.id }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.prerequisites.includes(b.id));
  srv.close();
});

test('HTTP: POST /api/capabilities/:id/prerequisites rejects self-reference', async () => {
  const { srv, port } = await startTestServer();
  const a = await (await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', category: 'TECHNICAL', description: 'd' }),
  })).json();
  const res = await fetch(`http://localhost:${port}/api/capabilities/${a.id}/prerequisites`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prerequisiteId: a.id }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'self_reference');
  srv.close();
});

test('HTTP: POST /api/capabilities/:id/prerequisites rejects missing prereq', async () => {
  const { srv, port } = await startTestServer();
  const a = await (await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', category: 'TECHNICAL', description: 'd' }),
  })).json();
  const res = await fetch(`http://localhost:${port}/api/capabilities/${a.id}/prerequisites`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prerequisiteId: 'cap_nope' }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'prerequisite_not_found');
  srv.close();
});

test('HTTP: POST /api/capabilities/:id/prerequisites rejects cycle', async () => {
  const { srv, port } = await startTestServer();
  // a depends on b
  const a = await (await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', category: 'TECHNICAL', description: 'd' }),
  })).json();
  const b = await (await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'b', category: 'TECHNICAL', description: 'd' }),
  })).json();
  await fetch(`http://localhost:${port}/api/capabilities/${a.id}/prerequisites`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prerequisiteId: b.id }),
  });
  // Now try b depends on a (cycle)
  const res = await fetch(`http://localhost:${port}/api/capabilities/${b.id}/prerequisites`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prerequisiteId: a.id }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'cycle_detected');
  srv.close();
});

test('HTTP: DELETE /api/capabilities/:id/prerequisites/:prereqId removes prereq', async () => {
  const { srv, port } = await startTestServer();
  const a = await (await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', category: 'TECHNICAL', description: 'd' }),
  })).json();
  const b = await (await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'b', category: 'TECHNICAL', description: 'd' }),
  })).json();
  await fetch(`http://localhost:${port}/api/capabilities/${a.id}/prerequisites`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prerequisiteId: b.id }),
  });
  const del = await fetch(`http://localhost:${port}/api/capabilities/${a.id}/prerequisites/${b.id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  srv.close();
});

test('HTTP: DELETE capability cascades prereq edges', async () => {
  const { srv, port, idx: i2 } = await startTestServer();
  const a = await (await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', category: 'TECHNICAL', description: 'd' }),
  })).json();
  const b = await (await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'b', category: 'TECHNICAL', description: 'd' }),
  })).json();
  await fetch(`http://localhost:${port}/api/capabilities/${a.id}/prerequisites`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prerequisiteId: b.id }),
  });
  // Sanity: the edge exists
  let prereqsBefore = i2.loadPrerequisites();
  assert.ok(prereqsBefore.some((e) => e.capabilityId === a.id && e.prerequisiteId === b.id));
  // Delete a — should cascade-delete the edge from a -> b
  const del = await fetch(`http://localhost:${port}/api/capabilities/${a.id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  // Edge should be gone
  const prereqsAfter = i2.loadPrerequisites();
  assert.equal(prereqsAfter.filter((e) => e.capabilityId === a.id || e.prerequisiteId === a.id).length, 0);
  // Cap should be gone
  assert.equal(i2.loadCapabilities().find((c) => c.id === a.id), undefined);
  srv.close();
});

test('HTTP: POST /api/capabilities/resolve returns chain for matching goal', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'negotiate SaaS', category: 'BUSINESS', description: 'negotiate' }),
  });
  const res = await fetch(`http://localhost:${port}/api/capabilities/resolve`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal: 'negotiate SaaS' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.match.name, 'negotiate SaaS');
  assert.equal(body.count, 1);
  srv.close();
});

test('HTTP: POST /api/capabilities/resolve 404 for no match', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/capabilities/resolve`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal: 'zzz_no_such_capability_xyz' }),
  });
  assert.equal(res.status, 404);
  srv.close();
});

test('HTTP: GET /api/capabilities/:id/agents returns [] when registry empty', async () => {
  const { srv, port } = await startTestServer();
  const a = await (await fetch(`http://localhost:${port}/api/capabilities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', category: 'TECHNICAL', description: 'd' }),
  })).json();
  const res = await fetch(`http://localhost:${port}/api/capabilities/${a.id}/agents`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.capabilityId, a.id);
  assert.ok(Array.isArray(body.agents));
  srv.close();
});

test('HTTP: unknown route returns 404', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/no-such-route`);
  assert.equal(res.status, 404);
  srv.close();
});
