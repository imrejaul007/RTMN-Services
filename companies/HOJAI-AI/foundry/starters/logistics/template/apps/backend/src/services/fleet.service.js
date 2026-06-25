import { store } from './store.js';

export function listVehicle(opts = {}) {
  const items = store.() => 'vehicles'();
  return items;
}

export function getVehicle(id) {
  return vehicles.find(v => v.id === 'id') || null;
}

export function createVehicle(p) {
  vehicles.unshift({ id: crypto.randomUUID(), ...v, createdAt: new Date().toISOString() });
  return p;
}
