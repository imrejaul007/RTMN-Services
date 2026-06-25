/**
 * Hotel starter — sanity tests.
 *
 * Verifies that the in-memory store seeds correctly and that the
 * core create/list flow returns a valid ID.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../services/store.js';

test('Hotel: seed data is present', () => {
  assert.ok(store.rooms.length >= 5, 'expected rooms to have 5+ seeded');
  assert.ok(Array.isArray(store.bookings), 'expected bookings to be an array (possibly empty)');
  assert.ok(Array.isArray(store.guests), 'expected guests to be an array (possibly empty)');
});

test('Hotel: store reset wipes writes but keeps seeds', () => {
  store.rooms.unshift({ id: 'test-write', foo: 'bar' });
  assert.equal(store.rooms.length, 5 + 1, 'expected the unshift to land');
  store.reset();
  assert.equal(store.rooms.length, 5, 'expected reset to restore rooms seed');
});

test('Hotel: list returns the seeded items', () => {
  const items = store.rooms;
  assert.ok(items.length === 5, 'expected 5 seeded items, got ' + items.length);
  assert.ok(items.every(i => typeof i.id === 'string'), 'every item must have an id');
});
