/**
 * In-memory stores for v0. Replace with Mongo/Postgres in production.
 * Kept as a single export so a future db.js can swap implementations
 * without touching the rest of the app.
 */

import { randomUUID } from 'node:crypto';

const stores = {
  products:   new Map(),
  rfqs:       new Map(),
  quotes:     new Map(),
  orders:     new Map(),
  shipments:  new Map(),
  invoices:   new Map()
};

function seed() {
  if (stores.products.size > 0) return;
  const sample = [
    { title: 'Aluminium Extrusion 6063',  category: 'materials',   priceInr: 320,  unit: 'kg' },
    { title: 'Cotton Kurta — Hand-block',  category: 'apparel',     priceInr: 850,  unit: 'piece' },
    { title: 'Basmati Rice Premium 1121',  category: 'food',        priceInr: 145,  unit: 'kg' },
    { title: 'Spice Mix — Garam Masala',   category: 'food',        priceInr: 420,  unit: 'kg' },
    { title: 'Leather Wallet — Brown',     category: 'apparel',     priceInr: 1200, unit: 'piece' }
  ];
  for (const p of sample) {
    const id = randomUUID();
    stores.products.set(id, { id, ...p, stock: 500, createdAt: new Date().toISOString() });
  }
}
seed();

export default {
  products: stores.products,
  rfqs: stores.rfqs,
  quotes: stores.quotes,
  orders: stores.orders,
  shipments: stores.shipments,
  invoices: stores.invoices,
  reset() { for (const m of Object.values(stores)) m.clear(); seed(); }
};
