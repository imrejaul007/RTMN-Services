/**
 * Logistics starter — sanity tests.
 *
 * Verifies that the in-memory store seeds correctly and that the
 * core create/list flow returns a valid ID.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../services/store.js';

test('Logistics: seed data is present', () => {
  assert.ok(store.vehicles.length >= 4, 'expected vehicles to have 4+ seeded');
  assert.ok(Array.isArray(store.dispatches), 'expected dispatches to be an array (possibly empty)');
  assert.ok(Array.isArray(store.shipments), 'expected shipments to be an array (possibly empty)');
});

test('Logistics: store reset wipes writes but keeps seeds', () => {
  store.vehicles.unshift({ id: 'test-write', foo: 'bar' });
  assert.equal(store.vehicles.length, 4 + 1, 'expected the unshift to land');
  store.reset();
  assert.equal(store.vehicles.length, 4, 'expected reset to restore vehicles seed');
});

test('Logistics: list returns the seeded items', () => {
  const items = store.vehicles;
  assert.ok(items.length === 4, 'expected 4 seeded items, got ' + items.length);
  assert.ok(items.every(i => typeof i.id === 'string'), 'every item must have an id');
});
