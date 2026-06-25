/**
 * CRM — in-memory store (v0).
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
  leads: [
  {
    "id": "l1",
    "name": "Anita Sharma",
    "company": "BrightMart",
    "email": "anita@brightmart.in",
    "stage": "new",
    "value": 250000
  },
  {
    "id": "l2",
    "name": "Rohan Mehta",
    "company": "MehtaFoods",
    "email": "rohan@mehtafoods.com",
    "stage": "qualified",
    "value": 480000
  },
  {
    "id": "l3",
    "name": "Sara Khan",
    "company": "NorthWindTech",
    "email": "sara@northwind.io",
    "stage": "demo",
    "value": 1200000
  },
  {
    "id": "l4",
    "name": "David Chen",
    "company": "BlueWave Labs",
    "email": "david@bluewave.co",
    "stage": "negotiation",
    "value": 3200000
  }
],
  deals: [],
  customers: [],

  reset() {
    const SEEDS = {
  "leads": [
    {
      "id": "l1",
      "name": "Anita Sharma",
      "company": "BrightMart",
      "email": "anita@brightmart.in",
      "stage": "new",
      "value": 250000
    },
    {
      "id": "l2",
      "name": "Rohan Mehta",
      "company": "MehtaFoods",
      "email": "rohan@mehtafoods.com",
      "stage": "qualified",
      "value": 480000
    },
    {
      "id": "l3",
      "name": "Sara Khan",
      "company": "NorthWindTech",
      "email": "sara@northwind.io",
      "stage": "demo",
      "value": 1200000
    },
    {
      "id": "l4",
      "name": "David Chen",
      "company": "BlueWave Labs",
      "email": "david@bluewave.co",
      "stage": "negotiation",
      "value": 3200000
    }
  ],
  "deals": [],
  "customers": []
};
    for (const k of Object.keys(SEEDS)) {
      store[k].length = 0;
      store[k].push(...JSON.parse(JSON.stringify(SEEDS[k])));
    }
  }
};

// Make store available on globalThis for routes that use globalThis.store.<key>.
globalThis.store = store;
