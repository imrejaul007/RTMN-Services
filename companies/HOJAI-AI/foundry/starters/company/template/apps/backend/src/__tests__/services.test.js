/**
 * Company starter — sanity tests.
 *
 * Verifies that the in-memory store seeds correctly and that the
 * core create/list flow returns a valid ID.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../services/store.js';

test('Company: seed data is present', () => {
  assert.ok(store.employees().length >= 4, 'expected employees to have 4+ seeded');
  assert.ok(store.departments().length >= 5, 'expected departments to have 5+ seeded');
  assert.ok(Array.isArray(store.payrolls()), 'expected payrolls to be an array (possibly empty)');
});

test('Company: store reset wipes writes but keeps seeds', () => {
  store.employees.unshift({ id: 'test-write', foo: 'bar' });
  assert.equal(store.employees().length, 4 + 1, 'expected the unshift to land');
  store.reset();
  assert.equal(store.employees().length, 4, 'expected reset to restore employees seed');
});

test('Company: list returns the seeded items', () => {
  const items = store.employees();
  assert.ok(items.length === 4, 'expected 4 seeded items, got ' + items.length);
  assert.ok(items.every(i => typeof i.id === 'string'), 'every item must have an id');
});
