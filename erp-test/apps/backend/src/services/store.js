/**
 * ERP — in-memory store (v0).
 *
 * Replace with Mongo/Postgres when you're ready. Public API:
 *   - store.<entity> is the live array (mutate with .unshift, .find, .length)
 *   - store.reset() restores all entities to their seed values
 *
 * Example:
 *   import { store } from './store.js';
 *   store.products.unshift({ id: 'x', ... });
 *   const all = store.products.filter(p => p.stock > 0);
 */

export const store = {
  items: [
  {
    "id": "i1",
    "sku": "WIDGET-001",
    "name": "Standard Widget",
    "unit": "piece",
    "cost": 80,
    "price": 150,
    "stock": 500,
    "reorderLevel": 100
  },
  {
    "id": "i2",
    "sku": "GADGET-002",
    "name": "Premium Gadget",
    "unit": "piece",
    "cost": 400,
    "price": 850,
    "stock": 80,
    "reorderLevel": 50
  },
  {
    "id": "i3",
    "sku": "BOLT-M8-50",
    "name": "Bolt M8 × 50mm",
    "unit": "piece",
    "cost": 3,
    "price": 8,
    "stock": 8000,
    "reorderLevel": 2000
  }
],
  pos: [],
  ledger: [],

  reset() {
    const SEEDS = {
  "items": [
    {
      "id": "i1",
      "sku": "WIDGET-001",
      "name": "Standard Widget",
      "unit": "piece",
      "cost": 80,
      "price": 150,
      "stock": 500,
      "reorderLevel": 100
    },
    {
      "id": "i2",
      "sku": "GADGET-002",
      "name": "Premium Gadget",
      "unit": "piece",
      "cost": 400,
      "price": 850,
      "stock": 80,
      "reorderLevel": 50
    },
    {
      "id": "i3",
      "sku": "BOLT-M8-50",
      "name": "Bolt M8 × 50mm",
      "unit": "piece",
      "cost": 3,
      "price": 8,
      "stock": 8000,
      "reorderLevel": 2000
    }
  ],
  "pos": [],
  "ledger": []
};
    for (const k of Object.keys(SEEDS)) {
      store[k].length = 0;
      store[k].push(...JSON.parse(JSON.stringify(SEEDS[k])));
    }
  }
};

// Make store available on globalThis for routes that use globalThis.store.<key>.
globalThis.store = store;
