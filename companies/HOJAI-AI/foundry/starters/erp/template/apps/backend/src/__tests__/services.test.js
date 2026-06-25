/**
 * ERP starter — sanity tests.
 *
 * Verifies that the in-memory store seeds correctly and that the
 * core create/list flow returns a valid ID.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../services/store.js';

test('ERP: seed data is present', () => {
  assert.ok(store.items.length >= 3, 'expected items to have 3+ seeded');
  assert.ok(Array.isArray(store.pos), 'expected pos to be an array (possibly empty)');
  assert.ok(Array.isArray(store.ledger), 'expected ledger to be an array (possibly empty)');
});

test('ERP: store reset wipes writes but keeps seeds', () => {
  store.items.unshift({ id: 'test-write', foo: 'bar' });
  assert.equal(store.items.length, 3 + 1, 'expected the unshift to land');
  store.reset();
  assert.equal(store.items.length, 3, 'expected reset to restore items seed');
});

test('ERP: list returns the seeded items', () => {
  const items = store.items;
  assert.ok(items.length === 3, 'expected 3 seeded items, got ' + items.length);
  assert.ok(items.every(i => typeof i.id === 'string'), 'every item must have an id');
});
