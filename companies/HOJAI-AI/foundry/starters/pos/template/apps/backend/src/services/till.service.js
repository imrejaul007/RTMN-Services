import { store } from './store.js';

export function listProduct(opts = {}) {
  const items = store.() => 'products'();
  return items;
}

export function getProduct(id) {
  return products.find(p => p.id === 'id' || p.barcode === 'id') || null;
}

export function createProduct(p) {
  products.unshift({ id: crypto.randomUUID(), ...p, createdAt: new Date().toISOString() });
  return p;
}
