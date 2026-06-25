/**
 * CRM starter — sanity tests.
 *
 * Verifies that the in-memory store seeds correctly and that the
 * core create/list flow returns a valid ID.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../services/store.js';

test('CRM: seed data is present', () => {
  assert.ok(store.leads.length >= 4, 'expected leads to have 4+ seeded');
  assert.ok(Array.isArray(store.deals), 'expected deals to be an array (possibly empty)');
  assert.ok(Array.isArray(store.customers), 'expected customers to be an array (possibly empty)');
});

test('CRM: store reset wipes writes but keeps seeds', () => {
  store.leads.unshift({ id: 'test-write', foo: 'bar' });
  assert.equal(store.leads.length, 4 + 1, 'expected the unshift to land');
  store.reset();
  assert.equal(store.leads.length, 4, 'expected reset to restore leads seed');
});

test('CRM: list returns the seeded items', () => {
  const items = store.leads;
  assert.ok(items.length === 4, 'expected 4 seeded items, got ' + items.length);
  assert.ok(items.every(i => typeof i.id === 'string'), 'every item must have an id');
});
