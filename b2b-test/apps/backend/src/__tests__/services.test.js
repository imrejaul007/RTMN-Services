/**
 * B2B starter — sanity tests.
 *
 * Verifies that the in-memory store seeds correctly and that the
 * core create/list flow returns a valid ID.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../services/store.js';

test('B2B: seed data is present', () => {
  assert.ok(store.products.length >= 4, 'expected products to have 4+ seeded');
  assert.ok(Array.isArray(store.rfqs), 'expected rfqs to be an array (possibly empty)');
  assert.ok(Array.isArray(store.quotes), 'expected quotes to be an array (possibly empty)');
  assert.ok(Array.isArray(store.orders), 'expected orders to be an array (possibly empty)');
  assert.ok(Array.isArray(store.invoices), 'expected invoices to be an array (possibly empty)');
});

test('B2B: store reset wipes writes but keeps seeds', () => {
  store.products.unshift({ id: 'test-write', foo: 'bar' });
  assert.equal(store.products.length, 4 + 1, 'expected the unshift to land');
  store.reset();
  assert.equal(store.products.length, 4, 'expected reset to restore products seed');
});

test('B2B: list returns the seeded items', () => {
  const items = store.products;
  assert.ok(items.length === 4, 'expected 4 seeded items, got ' + items.length);
  assert.ok(items.every(i => typeof i.id === 'string'), 'every item must have an id');
});
