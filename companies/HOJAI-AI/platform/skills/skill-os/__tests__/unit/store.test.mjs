/**
 * SkillOS — Storage abstraction unit tests
 *
 * Tests the createStore() factory in both modes:
 *   1. PersistentMap (default — no MONGODB_URI)
 *   2. MongoDB mode is opt-in (not tested without a real MongoDB)
 *
 * Verifies the unified API surface (get/set/has/delete/size/values/entries/filter/clear).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, isMongoMode } from '../../src/store.js';

test('skill-os store — PersistentMap mode (default)', async (t) => {
  await t.test('default mode is persistent-map', () => {
    assert.equal(isMongoMode(), false);
  });

  await t.test('createStore returns object with mode and name', () => {
    const s = createStore('test-collection-' + Date.now(), { serviceName: 'skill-os-test' });
    assert.equal(s.mode, 'persistent-map');
    assert.ok(s.name.startsWith('test-collection-'));
  });

  await t.test('set/get round-trip', async () => {
    const s = createStore('roundtrip-' + Date.now(), { serviceName: 'skill-os-test' });
    await s.set('a', { name: 'Alice', age: 30 });
    const v = await s.get('a');
    assert.equal(v.name, 'Alice');
    assert.equal(v.age, 30);
  });

  await t.test('has returns true after set, false after delete', async () => {
    const s = createStore('has-' + Date.now(), { serviceName: 'skill-os-test' });
    await s.set('k', { v: 1 });
    assert.equal(await s.has('k'), true);
    await s.delete('k');
    assert.equal(await s.has('k'), false);
  });

  await t.test('get returns undefined for missing key', async () => {
    const s = createStore('missing-' + Date.now(), { serviceName: 'skill-os-test' });
    const v = await s.get('nope');
    assert.equal(v, undefined);
  });

  await t.test('size reflects number of entries', async () => {
    const s = createStore('size-' + Date.now(), { serviceName: 'skill-os-test' });
    assert.equal(s.size, 0);
    await s.set('a', { v: 1 });
    assert.equal(s.size, 1);
    await s.set('b', { v: 2 });
    assert.equal(s.size, 2);
  });

  await t.test('values() returns array of all records', async () => {
    const s = createStore('values-' + Date.now(), { serviceName: 'skill-os-test' });
    await s.set('a', { v: 1 });
    await s.set('b', { v: 2 });
    const arr = await s.values();
    assert.equal(arr.length, 2);
    const values = arr.map((x) => x.v).sort();
    assert.deepEqual(values, [1, 2]);
  });

  await t.test('entries() returns [key, value] pairs', async () => {
    const s = createStore('entries-' + Date.now(), { serviceName: 'skill-os-test' });
    await s.set('a', { v: 1 });
    await s.set('b', { v: 2 });
    const e = await s.entries();
    assert.equal(e.length, 2);
    const map = Object.fromEntries(e);
    assert.equal(map.a.v, 1);
    assert.equal(map.b.v, 2);
  });

  await t.test('toArray() is alias for values()', async () => {
    const s = createStore('toarray-' + Date.now(), { serviceName: 'skill-os-test' });
    await s.set('a', { v: 1 });
    const a = await s.toArray();
    const v = await s.values();
    assert.deepEqual(a, v);
  });

  await t.test('filter() returns matching records', async () => {
    const s = createStore('filter-' + Date.now(), { serviceName: 'skill-os-test' });
    await s.set('a', { kind: 'skill' });
    await s.set('b', { kind: 'agent' });
    await s.set('c', { kind: 'skill' });
    const skills = await s.filter((r) => r.kind === 'skill');
    assert.equal(skills.length, 2);
  });

  await t.test('clear() removes all entries', async () => {
    const s = createStore('clear-' + Date.now(), { serviceName: 'skill-os-test' });
    await s.set('a', { v: 1 });
    await s.set('b', { v: 2 });
    await s.clear();
    assert.equal(s.size, 0);
    assert.equal(await s.has('a'), false);
  });

  await t.test('count() returns the same as size in this mode', async () => {
    const s = createStore('count-' + Date.now(), { serviceName: 'skill-os-test' });
    await s.set('a', { v: 1 });
    assert.equal(await s.count(), 1);
  });

  await t.test('records survive overwrite (no implicit delete)', async () => {
    const s = createStore('overwrite-' + Date.now(), { serviceName: 'skill-os-test' });
    await s.set('a', { v: 1 });
    await s.set('a', { v: 2 });
    const v = await s.get('a');
    assert.equal(v.v, 2);
  });
});
