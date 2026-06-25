import { store } from './store.js';

export function listItems() { return store.items; }
export function getItem(id) { return store.items.find(i => i.id === id) || null; }

export function createPO({ supplierId, items, expectedAt }) {
  const ids = (items || []).map(i => i.itemId);
  const itemsFull = store.items.filter(i => ids.includes(i.id));
  const totalInr = itemsFull.reduce((sum, it, idx) => sum + it.cost * (items[idx].qty || 1), 0);
  const po = { id: crypto.randomUUID(), supplierId, items: items || [], totalInr, expectedAt: expectedAt || null, status: 'sent', createdAt: new Date().toISOString() };
  store.pos.unshift(po);
  return po;
}

export function listPOs() { return store.pos; }

export function createLedgerEntry({ account, debit, credit, memo }) {
  const entry = { id: crypto.randomUUID(), account: account || 'general', debit: Number(debit) || 0, credit: Number(credit) || 0, memo: memo || '', createdAt: new Date().toISOString() };
  store.ledger.unshift(entry);
  return entry;
}

export function listLedger() { return store.ledger; }
