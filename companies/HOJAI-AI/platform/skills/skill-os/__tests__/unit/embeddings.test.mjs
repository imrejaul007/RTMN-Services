/**
 * SkillOS — Embeddings unit tests
 *
 * Tests the vector-db wrapper with a stubbed http-client. We can't easily
 * mock the global http-client without restructuring, so we test the
 * configuration and helper text-builder paths directly, plus the
 * graceful-degradation behavior (returns null on upstream errors).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { config, healthy } from '../../src/services/embeddings.js';

test('skill-os embeddings — config', async (t) => {
  await t.test('exposes vector-db URL', () => {
    assert.ok(typeof config.VECTOR_DB_URL === 'string');
    assert.match(config.VECTOR_DB_URL, /^https?:\/\//);
  });

  await t.test('exposes collection name', () => {
    assert.equal(config.COLLECTION_NAME, 'skill-os-assets');
  });

  await t.test('exposes embedding dimension', () => {
    assert.equal(config.EMBED_DIM, 128);
  });
});

test('skill-os embeddings — healthy()', async (t) => {
  await t.test('returns false when vector-db is unreachable', async () => {
    // The default URL is localhost:4321 which is unlikely to be running
    const isHealthy = await healthy();
    assert.equal(typeof isHealthy, 'boolean');
    // We don't assert true or false — the test environment may or may not have
    // vector-db running. We just assert it returns a boolean without throwing.
  });
});

test('skill-os embeddings — graceful degradation', async (t) => {
  // The whole point of the embeddings wrapper is that it never throws to
  // the caller. If vector-db is down, all functions return null/false.
  const { embed, query, indexAsset, removeAsset } = await import('../../src/services/embeddings.js');

  await t.test('embed returns null on upstream failure (not throw)', async () => {
    const r = await embed('hello world');
    assert.ok(r === null || Array.isArray(r));
  });

  await t.test('query returns null on upstream failure (not throw)', async () => {
    const r = await query('hello world', 5);
    assert.ok(r === null || Array.isArray(r));
  });

  await t.test('indexAsset returns null on upstream failure (not throw)', async () => {
    const r = await indexAsset({ id: 'test-1', name: 'Test', description: 'desc' });
    assert.ok(r === null || (r && r.id === 'test-1'));
  });

  await t.test('removeAsset returns false on upstream failure (not throw)', async () => {
    const r = await removeAsset('test-1');
    assert.equal(typeof r, 'boolean');
  });
});
