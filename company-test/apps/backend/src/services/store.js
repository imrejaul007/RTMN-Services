/**
 * Company — in-memory store (v0).
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
  employees: [
  {
    "id": "e1",
    "name": "Asha Patel",
    "role": "Sales Manager",
    "dept": "Sales",
    "salary": 1200000,
    "joinedAt": "2024-03-15"
  },
  {
    "id": "e2",
    "name": "Vikram Singh",
    "role": "Engineer",
    "dept": "Engineering",
    "salary": 1800000,
    "joinedAt": "2023-07-01"
  },
  {
    "id": "e3",
    "name": "Priya Iyer",
    "role": "Marketing Lead",
    "dept": "Marketing",
    "salary": 1100000,
    "joinedAt": "2025-01-10"
  },
  {
    "id": "e4",
    "name": "Rejaul Karim",
    "role": "Founder / CEO",
    "dept": "Exec",
    "salary": 2400000,
    "joinedAt": "2022-01-01"
  }
],
  departments: [
  {
    "id": "d1",
    "name": "Sales",
    "headcount": 8,
    "budget": 8000000
  },
  {
    "id": "d2",
    "name": "Engineering",
    "headcount": 14,
    "budget": 22000000
  },
  {
    "id": "d3",
    "name": "Marketing",
    "headcount": 5,
    "budget": 6000000
  },
  {
    "id": "d4",
    "name": "Finance",
    "headcount": 3,
    "budget": 4500000
  },
  {
    "id": "d5",
    "name": "HR",
    "headcount": 2,
    "budget": 2000000
  }
],
  payrolls: [],

  reset() {
    const SEEDS = {
  "employees": [
    {
      "id": "e1",
      "name": "Asha Patel",
      "role": "Sales Manager",
      "dept": "Sales",
      "salary": 1200000,
      "joinedAt": "2024-03-15"
    },
    {
      "id": "e2",
      "name": "Vikram Singh",
      "role": "Engineer",
      "dept": "Engineering",
      "salary": 1800000,
      "joinedAt": "2023-07-01"
    },
    {
      "id": "e3",
      "name": "Priya Iyer",
      "role": "Marketing Lead",
      "dept": "Marketing",
      "salary": 1100000,
      "joinedAt": "2025-01-10"
    },
    {
      "id": "e4",
      "name": "Rejaul Karim",
      "role": "Founder / CEO",
      "dept": "Exec",
      "salary": 2400000,
      "joinedAt": "2022-01-01"
    }
  ],
  "departments": [
    {
      "id": "d1",
      "name": "Sales",
      "headcount": 8,
      "budget": 8000000
    },
    {
      "id": "d2",
      "name": "Engineering",
      "headcount": 14,
      "budget": 22000000
    },
    {
      "id": "d3",
      "name": "Marketing",
      "headcount": 5,
      "budget": 6000000
    },
    {
      "id": "d4",
      "name": "Finance",
      "headcount": 3,
      "budget": 4500000
    },
    {
      "id": "d5",
      "name": "HR",
      "headcount": 2,
      "budget": 2000000
    }
  ],
  "payrolls": []
};
    for (const k of Object.keys(SEEDS)) {
      store[k].length = 0;
      store[k].push(...JSON.parse(JSON.stringify(SEEDS[k])));
    }
  }
};

// Make store available on globalThis for routes that use globalThis.store.<key>.
globalThis.store = store;
