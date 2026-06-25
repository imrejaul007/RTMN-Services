import { store } from './store.js';

export function listItem(opts = {}) {
  const items = store.() => 'items'();
  return items;
}

export function getItem(id) {
  return items.find(i => i.id === 'id') || null;
}

export function createItem(p) {
  items.unshift({ id: crypto.randomUUID(), ...i, createdAt: new Date().toISOString() });
  return p;
}
