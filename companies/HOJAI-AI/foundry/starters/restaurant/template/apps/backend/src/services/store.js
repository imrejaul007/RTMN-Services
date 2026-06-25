/**
 * Restaurant — in-memory store (v0).
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
  menu: [
  {
    "id": "m1",
    "name": "Butter Chicken",
    "price": 380,
    "category": "mains",
    "veg": false,
    "available": true
  },
  {
    "id": "m2",
    "name": "Paneer Tikka",
    "price": 320,
    "category": "mains",
    "veg": true,
    "available": true
  },
  {
    "id": "m3",
    "name": "Garlic Naan",
    "price": 80,
    "category": "breads",
    "veg": true,
    "available": true
  },
  {
    "id": "m4",
    "name": "Dal Makhani",
    "price": 280,
    "category": "mains",
    "veg": true,
    "available": true
  },
  {
    "id": "m5",
    "name": "Gulab Jamun",
    "price": 120,
    "category": "dessert",
    "veg": true,
    "available": true
  }
],
  tables: [
  {
    "id": "t1",
    "number": 1,
    "seats": 2,
    "status": "free"
  },
  {
    "id": "t2",
    "number": 2,
    "seats": 4,
    "status": "free"
  },
  {
    "id": "t3",
    "number": 3,
    "seats": 4,
    "status": "occupied"
  },
  {
    "id": "t4",
    "number": 4,
    "seats": 6,
    "status": "free"
  },
  {
    "id": "t5",
    "number": 5,
    "seats": 8,
    "status": "reserved"
  }
],
  orders: [],

  reset() {
    const SEEDS = {
  "menu": [
    {
      "id": "m1",
      "name": "Butter Chicken",
      "price": 380,
      "category": "mains",
      "veg": false,
      "available": true
    },
    {
      "id": "m2",
      "name": "Paneer Tikka",
      "price": 320,
      "category": "mains",
      "veg": true,
      "available": true
    },
    {
      "id": "m3",
      "name": "Garlic Naan",
      "price": 80,
      "category": "breads",
      "veg": true,
      "available": true
    },
    {
      "id": "m4",
      "name": "Dal Makhani",
      "price": 280,
      "category": "mains",
      "veg": true,
      "available": true
    },
    {
      "id": "m5",
      "name": "Gulab Jamun",
      "price": 120,
      "category": "dessert",
      "veg": true,
      "available": true
    }
  ],
  "tables": [
    {
      "id": "t1",
      "number": 1,
      "seats": 2,
      "status": "free"
    },
    {
      "id": "t2",
      "number": 2,
      "seats": 4,
      "status": "free"
    },
    {
      "id": "t3",
      "number": 3,
      "seats": 4,
      "status": "occupied"
    },
    {
      "id": "t4",
      "number": 4,
      "seats": 6,
      "status": "free"
    },
    {
      "id": "t5",
      "number": 5,
      "seats": 8,
      "status": "reserved"
    }
  ],
  "orders": []
};
    for (const k of Object.keys(SEEDS)) {
      store[k].length = 0;
      store[k].push(...JSON.parse(JSON.stringify(SEEDS[k])));
    }
  }
};

// Make store available on globalThis for routes that use globalThis.store.<key>.
globalThis.store = store;
