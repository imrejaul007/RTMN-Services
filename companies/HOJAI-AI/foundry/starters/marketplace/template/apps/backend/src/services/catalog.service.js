/**
 * Catalog service — product search + retrieval.
 * Backed by an in-memory store in v0. Swap to Mongo for production.
 */

import store from './store.js';

export function listProducts({ category, q, limit = 50 } = {}) {
  let items = [...store.products.values()];
  if (category) items = items.filter(p => p.category === category);
  if (q) {
    const needle = q.toLowerCase();
    items = items.filter(p => p.title.toLowerCase().includes(needle));
  }
  return items.slice(0, Number(limit));
}

export function getProduct(id) {
  return store.products.get(id) || null;
}

export function createProduct(req) {
  if (!req.title) throw new Error('title required');
  const id = crypto.randomUUID();
  const product = { id, createdAt: new Date().toISOString(), stock: 0, ...req };
  store.products.set(id, product);
  return product;
}
