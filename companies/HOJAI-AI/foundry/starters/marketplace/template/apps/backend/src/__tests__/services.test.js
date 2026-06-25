/**
 * Service-level tests for the marketplace starter.
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { listProducts, getProduct, createProduct } from '../services/catalog.service.js';
import { createRfq, createQuote, createOrder, listQuotes, listOrders } from '../services/order.service.js';
import store from '../services/store.js';
import { listAgents, runAgent } from '../agents/index.js';

test('seeded products include a Basmati Rice item', () => {
  const items = listProducts({ q: 'rice' });
  assert.ok(items.find(p => /rice/i.test(p.title)));
});

test('listProducts filters by category', () => {
  const items = listProducts({ category: 'food' });
  assert.ok(items.length > 0);
  assert.ok(items.every(p => p.category === 'food'));
});

test('createProduct assigns id + timestamps', () => {
  const p = createProduct({ title: 'Test Widget', category: 'misc', priceInr: 100 });
  assert.ok(p.id);
  assert.ok(p.createdAt);
  assert.equal(p.title, 'Test Widget');
  assert.equal(getProduct(p.id).title, 'Test Widget');
});

test('RFQ → Quote → Order flow works end-to-end', () => {
  const product = createProduct({ title: 'Flow Test', category: 'misc', priceInr: 500 });
  const rfq = createRfq({ buyerId: 'b-1', productId: product.id, quantity: 10 });
  const quote = createQuote({ rfqId: rfq.id, sellerId: 's-1', priceInr: 550 });
  const order = createOrder({ buyerId: 'b-1', productId: product.id, quantity: 10, priceInr: 5500 });

  const quotes = listQuotes(rfq.id);
  assert.equal(quotes.length, 1);
  assert.equal(quotes[0].priceInr, 550);

  const orders = listOrders({ buyerId: 'b-1' });
  assert.ok(orders.find(o => o.id === order.id));
});

test('all 5 default agents are registered', () => {
  const names = listAgents().map(a => a.name);
  assert.deepEqual(names.sort(), ['CEO', 'Finance', 'Procurement', 'Sales', 'Support']);
});

test('runAgent returns deterministic stub for known agents', async () => {
  const r = await runAgent('Sales', { rfqId: 'r-1', productId: 'p-1', quantity: 5 });
  assert.equal(r.agent, 'Sales');
  assert.equal(r.quantity, 5);
  assert.ok(r.quote);
});

test('runAgent throws for unknown agents', async () => {
  await assert.rejects(() => runAgent('Ghost', {}), /unknown agent/);
});

test('store reset wipes everything except seed', () => {
  createProduct({ title: 'Reset Probe', category: 'misc', priceInr: 1 });
  assert.ok(store.products.size > 5);
  store.reset();
  assert.equal(store.products.size, 5); // back to the 5 seed products
});
