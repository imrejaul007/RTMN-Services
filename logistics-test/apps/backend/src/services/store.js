/**
 * Logistics — in-memory store (v0).
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
  vehicles: [
  {
    "id": "v1",
    "plate": "MH12AB1234",
    "type": "mini-truck",
    "capacityKg": 500,
    "driver": "Suresh Yadav",
    "status": "idle"
  },
  {
    "id": "v2",
    "plate": "KA03CD5678",
    "type": "truck",
    "capacityKg": 5000,
    "driver": "Mohammed Ali",
    "status": "enroute"
  },
  {
    "id": "v3",
    "plate": "DL05EF9012",
    "type": "van",
    "capacityKg": 1500,
    "driver": "Ramesh Kumar",
    "status": "idle"
  },
  {
    "id": "v4",
    "plate": "TN09GH3456",
    "type": "bike",
    "capacityKg": 50,
    "driver": "Lakshmi Devi",
    "status": "idle"
  }
],
  dispatches: [],
  shipments: [],

  reset() {
    const SEEDS = {
  "vehicles": [
    {
      "id": "v1",
      "plate": "MH12AB1234",
      "type": "mini-truck",
      "capacityKg": 500,
      "driver": "Suresh Yadav",
      "status": "idle"
    },
    {
      "id": "v2",
      "plate": "KA03CD5678",
      "type": "truck",
      "capacityKg": 5000,
      "driver": "Mohammed Ali",
      "status": "enroute"
    },
    {
      "id": "v3",
      "plate": "DL05EF9012",
      "type": "van",
      "capacityKg": 1500,
      "driver": "Ramesh Kumar",
      "status": "idle"
    },
    {
      "id": "v4",
      "plate": "TN09GH3456",
      "type": "bike",
      "capacityKg": 50,
      "driver": "Lakshmi Devi",
      "status": "idle"
    }
  ],
  "dispatches": [],
  "shipments": []
};
    for (const k of Object.keys(SEEDS)) {
      store[k].length = 0;
      store[k].push(...JSON.parse(JSON.stringify(SEEDS[k])));
    }
  }
};

// Make store available on globalThis for routes that use globalThis.store.<key>.
globalThis.store = store;
