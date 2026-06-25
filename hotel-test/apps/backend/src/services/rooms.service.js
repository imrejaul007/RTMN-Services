import { store } from './store.js';

export function listRoom(opts = {}) {
  const items = store.() => 'rooms'();
  return items;
}

export function getRoom(id) {
  return rooms.find(r => r.id === 'id') || null;
}

export function createRoom(p) {
  rooms.unshift({ id: crypto.randomUUID(), ...r, createdAt: new Date().toISOString() });
  return p;
}
