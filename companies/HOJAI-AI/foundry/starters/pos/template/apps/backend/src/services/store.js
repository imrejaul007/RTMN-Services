/**
 * POS — in-memory store (v0).
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
    "id": "sku1",
    "barcode": "8901234500011",
    "name": "Tata Salt 1kg",
    "price": 28,
    "stock": 200,
    "category": "grocery"
  },
  {
    "id": "sku2",
    "barcode": "8901234500028",
    "name": "Amul Butter 500g",
    "price": 270,
    "stock": 50,
    "category": "dairy"
  },
  {
    "id": "sku3",
    "barcode": "8901234500035",
    "name": "Maggi Noodles 4pk",
    "price": 56,
    "stock": 300,
    "category": "instant"
  },
  {
    "id": "sku4",
    "barcode": "8901234500042",
    "name": "Coca-Cola 750ml",
    "price": 40,
    "stock": 120,
    "category": "beverage"
  }
],
  sales: [],
  receipts: [],

  reset() {
    const SEEDS = {
  "products": [
    {
      "id": "sku1",
      "barcode": "8901234500011",
      "name": "Tata Salt 1kg",
      "price": 28,
      "stock": 200,
      "category": "grocery"
    },
    {
      "id": "sku2",
      "barcode": "8901234500028",
      "name": "Amul Butter 500g",
      "price": 270,
      "stock": 50,
      "category": "dairy"
    },
    {
      "id": "sku3",
      "barcode": "8901234500035",
      "name": "Maggi Noodles 4pk",
      "price": 56,
      "stock": 300,
      "category": "instant"
    },
    {
      "id": "sku4",
      "barcode": "8901234500042",
      "name": "Coca-Cola 750ml",
      "price": 40,
      "stock": 120,
      "category": "beverage"
    }
  ],
  "sales": [],
  "receipts": []
};
    for (const k of Object.keys(SEEDS)) {
      store[k].length = 0;
      store[k].push(...JSON.parse(JSON.stringify(SEEDS[k])));
    }
  }
};

// Make store available on globalThis for routes that use globalThis.store.<key>.
globalThis.store = store;
