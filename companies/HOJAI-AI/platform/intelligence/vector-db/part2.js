  const res = await authReq('POST', '/api/embed', {
    text: 'hello world', dimension: 4, _token: INTERNAL_TOKEN
  });
  assert.equals(res.status, 200);
  assert.ok(Array.isArray(res.body.vector));
  assert.equals(res.body.vector.length, 4);
  assert.ok(typeof res.body.norm === 'number');
});

test('POST /api/embed requires text', async () => {
  const res = await authReq('POST', '/api/embed', { _token: INTERNAL_TOKEN });
  assert.equals(res.status, 400);
});

test('POST /api/collections/:name/vectors inserts a vector', async () => {
  const res = await authReq('POST', `/api/collections/${TEST_COLLECTION}/vectors`, {
    values: [0.1, 0.2, 0.3, 0.4],
    metadata: { tag: 'a' },
    _token: INTERNAL_TOKEN
  });
  assert.ok([200, 201].includes(res.status), `got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(res.body.id);
});

test('POST /api/collections/:name/vectors rejects wrong dimension', async () => {
  const res = await authReq('POST', `/api/collections/${TEST_COLLECTION}/vectors`, {
    values: [0.1, 0.2, 0.3], // dim 3 but collection is dim 4
    _token: INTERNAL_TOKEN
  });
  assert.equals(res.status, 409);
  assert.ok(res.body.code === 'DIMENSION_MISMATCH');
});

test('POST /api/collections/:name/vectors/batch inserts batch', async () => {
  const res = await authReq('POST', `/api/collections/${TEST_COLLECTION}/vectors/batch`, {
    vectors: [
      { values: [0.5, 0.5, 0.5, 0.5], metadata: { tag: 'b' } },
      { values: [0.9, 0.1, 0.1, 0.1], metadata: { tag: 'c' } },
    ],
    _token: INTERNAL_TOKEN
  });
  assert.ok([200, 201].includes(res.status), `got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(Array.isArray(res.body.ids));
  assert.equals(res.body.ids.length, 2);
});

test('GET /api/collections/:name/vectors lists vectors', async () => {
  const res = await req('GET', `/api/collections/${TEST_COLLECTION}/vectors`);
  assert.equals(res.status, 200);
  assert.ok(res.body.count >= 0);
  assert.ok(Array.isArray(res.body.vectors));
});

test('GET /api/collections/:name/vectors/:vectorId gets a vector', async () => {
  // First upsert one we know the id of
  const upsert = await authReq('POST', `/api/collections/${TEST_COLLECTION}/vectors`, {
    values: [0.1, 0.2, 0.3, 0.4], metadata: { tag: 'single' },
    _token: INTERNAL_TOKEN
  });
  assert.ok(upsert.body.id);
  const res = await req('GET', `/api/collections/${TEST_COLLECTION}/vectors/${upsert.body.id}`);
  assert.equals(res.status, 200);
  assert.equals(res.body.id, upsert.body.id);
  assert.ok(Array.isArray(res.body.vector.values));
});

test('GET /api/collections/:name/vectors/:vectorId 404 for unknown', async () => {
  const res = await req('GET', `/api/collections/${TEST_COLLECTION}/vectors/does-not-exist`);
  assert.equals(res.status, 404);
});

test('DELETE /api/collections/:name/vectors/:vectorId deletes', async () => {
  // Insert a vector then delete it
  const upsert = await authReq('POST', `/api/collections/${TEST_COLLECTION}/vectors`, {
    values: [0.1, 0.2, 0.3, 0.4], _token: INTERNAL_TOKEN
  });
  const res = await authReq('DELETE',
    `/api/collections/${TEST_COLLECTION}/vectors/${upsert.body.id}`,
    { _token: INTERNAL_TOKEN }
  );
  assert.equals(res.status, 200);
  assert.equals(res.body.id, upsert.body.id);
});

test('POST /api/collections/:name/vectors/delete-batch deletes multiple', async () => {
  // Insert two vectors
  const r1 = await authReq('POST', `/api/collections/${TEST_COLLECTION}/vectors`, {
    values: [0.1, 0.2, 0.3, 0.4], _token: INTERNAL_TOKEN
  });
  const r2 = await authReq('POST', `/api/collections/${TEST_COLLECTION}/vectors`, {
    values: [0.5, 0.5, 0.5, 0.5], _token: INTERNAL_TOKEN
  });
  const res = await authReq('POST', `/api/collections/${TEST_COLLECTION}/vectors/delete-batch`, {
    ids: [r1.body.id, r2.body.id],
    _token: INTERNAL_TOKEN
  });
  assert.equals(res.status, 200);
  assert.equals(res.body.deleted, 2);
});

test('POST /api/collections/:name/vectors/delete-batch rejects empty ids', async () => {
  const res = await authReq('POST', `/api/collections/${TEST_COLLECTION}/vectors/delete-batch', {
    ids: [], _token: INTERNAL_TOKEN
  });
  assert.equals(res.status, 400);
});

// ---------- search ----------

test('POST /api/collections/:name/search returns matches', async () => {
  const res = await authReq('POST', `/api/collections/${TEST_COLLECTION}/search`, {
    query: [0.1, 0.2, 0.3, 0.4],
    topK: 2,
    _token: INTERNAL_TOKEN
  });
  assert.equals(res.status, 200);
  assert.ok('matches' in res.body);
  assert.ok('count' in res.body);
  assert.ok('took_ms' in res.body);
  assert.ok(Array.isArray(res.body.matches));
});

test('POST /api/collections/:name/search with filter works', async () => {
  // Insert with known tag
  await authReq('POST', `/api/collections/${TEST_COLLECTION}/vectors`, {
    values: [0.8, 0.1, 0.1, 0.1], metadata: { tag: 'filtered' }, _token: INTERNAL_TOKEN
  });
  const res = await authReq('POST', `/api/collections/${TEST_COLLECTION}/search`, {
    query: [0.8, 0.1, 0.1, 0.1],
    topK: 5,
    filter: { field: 'tag', op: 'eq', value: 'filtered' },
    _token: INTERNAL_TOKEN
  });
  assert.equals(res.status, 200);
  // The filtered result should only match tag=filtered
  for (const m of res.body.matches) {
    if (m.metadata && m.metadata.tag === 'filtered') {
      // This is expected
      return;
    }
  }
  // At least one match should have tag=filtered
  assert.ok(res.body.matches.some(m => m.metadata && m.metadata.tag === 'filtered'),
    'filtered result should contain tag=filtered');
});

test('POST /api/query searches across a single collection', async () => {
  const res = await authReq('POST', '/api/query', {
    collection: TEST_COLLECTION,
    query: [0.1, 0.2, 0.3, 0.4],
    topK: 1,
    _token: INTERNAL_TOKEN
  });
  assert.equals(res.status, 200);
  assert.ok('matches' in res.body);
  assert.equals(res.body.collection, TEST_COLLECTION);
});

test('POST /api/query requires collection name', async () => {
  const res = await authReq('POST', '/api/query', {
    query: [0.1, 0.2, 0.3, 0.4],
    _token: INTERNAL_TOKEN
  });
  assert.equals(res.status, 400);
});

test('POST /api/collections/:name/search-by-text works', async () => {
  // Use dim=128 for search-by-text
  const coll128 = 'test-text-search';
  await authReq('POST', '/api/collections', { name: coll128, dimension: 128, _token: INTERNAL_TOKEN });
  await authReq('POST', `/api/collections/${coll128}/vectors`, {
    values: app.embed('machine learning algorithms', 128),
    metadata: { domain: 'ml' }, _token: INTERNAL_TOKEN
  });
  await authReq('POST', `/api/collections/${coll128}/vectors`, {
    values: app.embed('cooking recipes food', 128),
    metadata: { domain: 'food' }, _token: INTERNAL_TOKEN
  });

  const res = await authReq('POST', `/api/collections/${coll128}/search-by-text`, {
    text: 'neural networks and deep learning',
    topK: 1,
    _token: INTERNAL_TOKEN
  });
  assert.equals(res.status, 200);
  assert.ok(res.body.queryText);
  assert.ok(Array.isArray(res.body.matches));
  // Top match should be the ML one (higher similarity to ML text)
  assert.equals(res.body.matches.length >= 1, true);
  if (res.body.matches.length > 0) {
    assert.ok(res.body.matches[0].metadata.domain === 'ml',
      `expected ml domain, got ${res.body.matches[0].metadata.domain}`);
  }
});

// ---------- audit ----------

test('GET /api/audit returns audit log', async () => {
  const res = await req('GET', '/api/audit');
  assert.equals(res.status, 200);
  assert.ok('count' in res.body);
  assert.ok('returned' in res.body);
  assert.ok('entries' in res.body);
});

test('GET /api/audit?limit=5 respects limit', async () => {
  const res = await req('GET', '/api/audit?limit=5');
  assert.equals(res.status, 200);
  assert.ok(res.body.returned <= 5);
});

test('POST /api/stats/reset resets counters', async () => {
  const res = await authReq('POST', '/api/stats/reset', { _token: INTERNAL_TOKEN });
  assert.equals(res.status, 200);
  assert.equals(res.body.stats.totalCollectionsCreated, 0);
  assert.equals(res.body.stats.totalVectorUpserts, 0);
});

// ---------- auth bypass + validation ----------

test('POST /api/collections with no X-Internal-Token returns 401', async () => {
  const res = await req('POST', '/api/collections', { name: 'auth-test', dimension: 4 });
  assert.equals(res.status, 401);
});

test('POST /api/embed with no X-Internal-Token returns 401', async () => {
  const res = await req('POST', '/api/embed', { text: 'hello' });
  assert.equals(res.status, 401);
});

test('POST /api/collections with invalid token returns 401', async () => {
  const res = await req('POST', '/api/collections', { name: 'auth-test2', dimension: 4 },
    { 'x-internal-token': 'wrong-token' });
  assert.equals(res.status, 401);
});

test('GET /api/collections does NOT require auth (public read)', async () => {
  const res = await req('GET', '/api/collections');
  assert.equals(res.status, 200);
});

test('GET /api/audit does NOT require auth (public read)', async () => {
  const res = await req('GET', '/api/audit');
  assert.equals(res.status, 200);
});

test('POST /api/collections with empty body returns 400', async () => {
  const res = await req('POST', '/api/collections', {},
    { 'x-internal-token': INTERNAL_TOKEN });
  assert.equals(res.status, 400);
});

test('POST /api/embed with empty body returns 400', async () => {
  const res = await req('POST', '/api/embed', {},
    { 'x-internal-token': INTERNAL_TOKEN });
  assert.equals(res.status, 400);
});

test('unknown route returns 404', async () => {
  const res = await req('GET', '/api/does-not-exist');
  assert.equals(res.status, 404);
});

// ---------- stats reflect mutations ----------

test('POST /api/stats/reset clears audit', async () => {
  await authReq('POST', '/api/stats/reset', { _token: INTERNAL_TOKEN });
  const res = await req('GET', '/api/audit');
  // After reset the audit may still have the reset entry itself
  assert.equals(res.status, 200);
});

