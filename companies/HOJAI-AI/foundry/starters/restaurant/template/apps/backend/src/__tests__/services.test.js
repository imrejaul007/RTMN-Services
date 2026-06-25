/**
 * Restaurant starter — sanity tests.
 *
 * Verifies that the in-memory store seeds correctly and that the
 * core create/list flow returns a valid ID.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../services/store.js';

test('Restaurant: seed data is present', () => {
  assert.ok(store.menu.length >= 5, 'expected menu to have 5+ seeded');
  assert.ok(store.tables.length >= 5, 'expected tables to have 5+ seeded');
  assert.ok(Array.isArray(store.orders), 'expected orders to be an array (possibly empty)');
});

test('Restaurant: store reset wipes writes but keeps seeds', () => {
  store.menu.unshift({ id: 'test-write', foo: 'bar' });
  assert.equal(store.menu.length, 5 + 1, 'expected the unshift to land');
  store.reset();
  assert.equal(store.menu.length, 5, 'expected reset to restore menu seed');
});

test('Restaurant: list returns the seeded items', () => {
  const items = store.menu;
  assert.ok(items.length === 5, 'expected 5 seeded items, got ' + items.length);
  assert.ok(items.every(i => typeof i.id === 'string'), 'every item must have an id');
});
