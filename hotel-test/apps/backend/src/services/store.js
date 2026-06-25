/**
 * Hotel — in-memory store (v0).
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
  rooms: [
  {
    "id": "r101",
    "number": "101",
    "type": "Deluxe",
    "rate": 7500,
    "status": "available"
  },
  {
    "id": "r102",
    "number": "102",
    "type": "Deluxe",
    "rate": 7500,
    "status": "available"
  },
  {
    "id": "r201",
    "number": "201",
    "type": "Suite",
    "rate": 14500,
    "status": "available"
  },
  {
    "id": "r202",
    "number": "202",
    "type": "Suite",
    "rate": 14500,
    "status": "occupied"
  },
  {
    "id": "r301",
    "number": "301",
    "type": "Presidential",
    "rate": 38000,
    "status": "available"
  }
],
  bookings: [],
  guests: [],

  reset() {
    const SEEDS = {
  "rooms": [
    {
      "id": "r101",
      "number": "101",
      "type": "Deluxe",
      "rate": 7500,
      "status": "available"
    },
    {
      "id": "r102",
      "number": "102",
      "type": "Deluxe",
      "rate": 7500,
      "status": "available"
    },
    {
      "id": "r201",
      "number": "201",
      "type": "Suite",
      "rate": 14500,
      "status": "available"
    },
    {
      "id": "r202",
      "number": "202",
      "type": "Suite",
      "rate": 14500,
      "status": "occupied"
    },
    {
      "id": "r301",
      "number": "301",
      "type": "Presidential",
      "rate": 38000,
      "status": "available"
    }
  ],
  "bookings": [],
  "guests": []
};
    for (const k of Object.keys(SEEDS)) {
      store[k].length = 0;
      store[k].push(...JSON.parse(JSON.stringify(SEEDS[k])));
    }
  }
};

// Make store available on globalThis for routes that use globalThis.store.<key>.
globalThis.store = store;
