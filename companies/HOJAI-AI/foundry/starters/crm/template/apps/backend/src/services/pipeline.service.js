import { store } from './store.js';

export function listLead(opts = {}) {
  const items = store.() => 'leads'();
  return items;
}

export function getLead(id) {
  return leads.find(l => l.id === 'id') || null;
}

export function createLead(p) {
  leads.unshift({ id: crypto.randomUUID(), ...l, stage: l.stage || "new", createdAt: new Date().toISOString() });
  return p;
}
