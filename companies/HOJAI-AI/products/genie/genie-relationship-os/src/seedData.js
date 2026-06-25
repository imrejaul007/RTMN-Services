/**
 * Genie Relationship OS — seed data
 *
 * Each PersistentMap in this service is keyed by `userId` and stores an
 * array of records (people, interactions, reminders, …).  The seed below
 * creates one demo user (`user-demo-1`) with a small personal network so
 * the dashboard, health, and reminder endpoints have something to show.
 */

import { normalizeSeedData, autoSeed } from '@rtmn/shared/lib/genie-readiness';

const USER_ID = 'user-demo-1';

const people = [
  {
    id: 'person-demo-001',
    userId: USER_ID,
    name: 'Anaya Khan',
    relationshipType: 'best_friend',
    category: 'friend',
    importance: 9,
    phone: '+971-555-0101',
    email: 'anaya@example.com',
    birthday: '1992-03-14',
    lastContact: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['college', 'travel-buddy'],
    notes: 'Met at university; loves hiking and indie music.',
  },
  {
    id: 'person-demo-002',
    userId: USER_ID,
    name: 'Marcus Lee',
    relationshipType: 'colleague',
    category: 'professional',
    importance: 7,
    phone: '+1-415-555-0142',
    email: 'marcus@startup.example',
    birthday: '1988-11-02',
    lastContact: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['product', 'ai'],
    notes: 'Co-founder of a small AI tooling startup.',
  },
  {
    id: 'person-demo-003',
    userId: USER_ID,
    name: 'Priya Sharma',
    relationshipType: 'sister',
    category: 'family',
    importance: 10,
    phone: '+91-98765-43210',
    email: 'priya.s@example.com',
    birthday: '1990-07-22',
    lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['family', 'sibling'],
    notes: 'Younger sister; wedding in November.',
  },
  {
    id: 'person-demo-004',
    userId: USER_ID,
    name: 'Daniel Ortega',
    relationshipType: 'mentor',
    category: 'professional',
    importance: 8,
    email: 'daniel.ortega@example.com',
    birthday: '1975-05-30',
    lastContact: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['mentor', 'finance'],
    notes: 'Met at industry conference 2024.',
  },
  {
    id: 'person-demo-005',
    userId: USER_ID,
    name: 'Yuki Tanaka',
    relationshipType: 'close_friend',
    category: 'friend',
    importance: 7,
    email: 'yuki.tanaka@example.com',
    birthday: '1993-09-09',
    lastContact: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['climbing', 'design'],
    notes: 'Climbing partner; runs a design studio in Tokyo.',
  },
];

const interactions = [
  {
    id: 'intx-demo-001',
    userId: USER_ID,
    personId: 'person-demo-001',
    type: 'call',
    summary: 'Caught up about her new role at the travel startup.',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    sentiment: 'positive',
  },
  {
    id: 'intx-demo-002',
    userId: USER_ID,
    personId: 'person-demo-002',
    type: 'meeting',
    summary: 'Quarterly product review at his office.',
    timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    sentiment: 'neutral',
  },
  {
    id: 'intx-demo-003',
    userId: USER_ID,
    personId: 'person-demo-003',
    type: 'message',
    summary: 'Discussed wedding venue options.',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    sentiment: 'positive',
  },
];

const reminders = [
  {
    id: 'rem-demo-001',
    userId: USER_ID,
    personId: 'person-demo-002',
    type: 'reconnect',
    remindAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Marcus — quarterly check-in overdue by a week.',
    status: 'pending',
  },
  {
    id: 'rem-demo-002',
    userId: USER_ID,
    personId: 'person-demo-004',
    type: 'birthday',
    remindAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    note: "Daniel's birthday coming up — send a card.",
    status: 'pending',
  },
];

const relationshipHealth = [
  {
    userId: USER_ID,
    score: 78,
    lastUpdated: new Date().toISOString(),
    weakestTies: ['person-demo-004'],
    strongestTies: ['person-demo-001', 'person-demo-003'],
  },
];

const giftIdeas = [
  {
    id: 'gift-demo-001',
    userId: USER_ID,
    personId: 'person-demo-001',
    title: 'Indoor herb garden kit',
    reason: 'Anaya mentioned wanting fresh basil for cooking.',
    estimatedPrice: 45,
    status: 'idea',
  },
  {
    id: 'gift-demo-002',
    userId: USER_ID,
    personId: 'person-demo-003',
    title: 'Engagement photo frame',
    reason: 'For Priya & Rahul engagement photos.',
    estimatedPrice: 60,
    status: 'purchased',
  },
];

/**
 * Apply seed data into the service's PersistentMap stores.  Each store is
 * keyed by userId and the value is an array — so instead of calling
 * autoSeed's normal `store.set(item.id, item)` flow, we write the entire
 * array under the demo userId, and only if the store is empty.
 */
export function applySeeds(stores, opts = {}) {
  const { serviceName = 'genie-relationship-os' } = opts;
  const plans = [
    { store: stores.people, value: people },
    { store: stores.interactions, value: interactions },
    { store: stores.reminders, value: reminders },
    { store: stores.relationshipHealth, value: relationshipHealth },
    { store: stores.giftIdeas, value: giftIdeas },
  ];
  let seededCount = 0;
  for (const plan of plans) {
    if (!plan.store) continue;
    if (plan.store.size > 0) continue;
    plan.store.set(USER_ID, plan.value);
    seededCount += plan.value.length;
  }
  if (seededCount > 0) {
    console.log(`[${serviceName}] seed: inserted ${seededCount} items for ${USER_ID}`);
    return true;
  }
  return false;
}

export {
  USER_ID,
  people,
  interactions,
  reminders,
  relationshipHealth,
  giftIdeas,
};