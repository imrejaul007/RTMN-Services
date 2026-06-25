/**
 * B2B — in-memory store (v0).
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
  products: [
  {
    "id": "p1",
    "title": "Industrial Bearing 6205",
    "unit": "piece",
    "price": 450,
    "moq": 100,
    "stock": 5000,
    "category": "industrial"
  },
  {
    "id": "p2",
    "title": "HDPE Granules — Virgin",
    "unit": "kg",
    "price": 180,
    "moq": 1000,
    "stock": 50000,
    "category": "chemicals"
  },
  {
    "id": "p3",
    "title": "SS 304 Sheet 2mm",
    "unit": "kg",
    "price": 320,
    "moq": 500,
    "stock": 8000,
    "category": "metals"
  },
  {
    "id": "p4",
    "title": "Cardboard Boxes (bulk)",
    "unit": "piece",
    "price": 28,
    "moq": 1000,
    "stock": 100000,
    "category": "packaging"
  }
],
  rfqs: [],
  quotes: [],
  orders: [],
  invoices: [],

  reset() {
    const SEEDS = {
  "products": [
    {
      "id": "p1",
      "title": "Industrial Bearing 6205",
      "unit": "piece",
      "price": 450,
      "moq": 100,
      "stock": 5000,
      "category": "industrial"
    },
    {
      "id": "p2",
      "title": "HDPE Granules — Virgin",
      "unit": "kg",
      "price": 180,
      "moq": 1000,
      "stock": 50000,
      "category": "chemicals"
    },
    {
      "id": "p3",
      "title": "SS 304 Sheet 2mm",
      "unit": "kg",
      "price": 320,
      "moq": 500,
      "stock": 8000,
      "category": "metals"
    },
    {
      "id": "p4",
      "title": "Cardboard Boxes (bulk)",
      "unit": "piece",
      "price": 28,
      "moq": 1000,
      "stock": 100000,
      "category": "packaging"
    }
  ],
  "rfqs": [],
  "quotes": [],
  "orders": [],
  "invoices": []
};
    for (const k of Object.keys(SEEDS)) {
      store[k].length = 0;
      store[k].push(...JSON.parse(JSON.stringify(SEEDS[k])));
    }
  }
};

// Make store available on globalThis for routes that use globalThis.store.<key>.
globalThis.store = store;
