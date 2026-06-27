/**
 * genie-household — Household OS (C7)
 *
 * Multi-user shared family/group space. Multiple Genie users belong to
 * one household and share:
 *   - members: who's in the household + roles
 *   - lists: shared shopping/to-do/packing/etc. lists
 *   - meals: weekly meal plan
 *   - chores: recurring tasks assigned to members
 *   - events: shared calendar (birthdays, anniversaries, trips)
 *
 * Endpoints (per household):
 *   - GET    /household/get/:householdId                       — full household
 *   - GET    /household/list/:userId                           — list households a user is in
 *   - POST   /household/create/:userId                         — create new household
 *   - POST   /household/:householdId/members/add/:userId       — add member
 *   - DELETE /household/:householdId/members/remove/:userId    — remove member
 *   - POST   /household/:householdId/lists/add/:userId         — add list item
 *   - GET    /household/:householdId/lists/list                — list items (with ?category filter)
 *   - POST   /household/:householdId/lists/check/:itemId/:userId — check off item
 *   - POST   /household/:householdId/meals/add/:userId         — add meal to plan
 *   - GET    /household/:householdId/meals/week                — get this week's meals
 *   - POST   /household/:householdId/chores/add/:userId        — add chore
 *   - GET    /household/:householdId/chores/list               — list chores
 *   - POST   /household/:householdId/events/add/:userId        — add shared event
 *   - GET    /household/:householdId/events/list               — list events
 */

const { requireAuth } = require('@rtmn/shared/auth');
const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { installReadinessRoutes, autoSeed, normalizeSeedData } = require('@rtmn/shared/lib/genie-readiness');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const helmet = require('helmet');

const householdRoutes = require('./routes/household');

requireEnv(['JWT_SECRET']);
const PORT = parseInt(process.env.PORT || '4737', 10);
const SERVICE_NAME = 'genie-household';

const householdsStore = new PersistentMap('households', { serviceName: SERVICE_NAME });
const listsStore = new PersistentMap('household-lists', { serviceName: SERVICE_NAME });
const mealsStore = new PersistentMap('household-meals', { serviceName: SERVICE_NAME });
const choresStore = new PersistentMap('household-chores', { serviceName: SERVICE_NAME });
const eventsStore = new PersistentMap('household-events', { serviceName: SERVICE_NAME });

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
// Public health (no auth)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Genie Household OS', port: PORT });
});

app.use(requireAuth);

app.get('/', (req, res) => {
  res.json({
    service: 'Genie Household OS',
    tagline: 'One household, many people, shared lists + meals + chores.',
    endpoints: [
      'GET    /household/get/:householdId                       — full household',
      'GET    /household/list/:userId                           — user\'s households',
      'POST   /household/create/:userId                         — create household',
      'POST   /household/:id/members/add/:userId                — add member',
      'POST   /household/:id/lists/add/:userId                  — add list item',
      'GET    /household/:id/lists/list                         — list items (?category)',
      'POST   /household/:id/lists/check/:itemId/:userId        — check off item',
      'POST   /household/:id/meals/add/:userId                  — add meal',
      'GET    /household/:id/meals/week                         — get week\'s meals',
      'POST   /household/:id/chores/add/:userId                 — add chore',
      'GET    /household/:id/chores/list                        — list chores',
      'POST   /household/:id/events/add/:userId                 — add event',
      'GET    /household/:id/events/list                        — list events',
    ],
  });
});

app.use('/household', householdRoutes({
  householdsStore, listsStore, mealsStore, choresStore, eventsStore,
}));

installReadinessRoutes(app, {
  serviceName: SERVICE_NAME,
  stores: [householdsStore, listsStore, mealsStore, choresStore, eventsStore],
});

// Seed: 1 household with 3 members + items
autoSeed([
  {
    store: householdsStore,
    items: normalizeSeedData([
      {
        id: 'hh-shared-001',
        name: 'Our Home',
        ownerId: 'user-001',
        members: [
          { userId: 'user-001', name: 'You', role: 'owner', avatar: '👤' },
          { userId: 'user-002', name: 'Partner', role: 'adult', avatar: '👩' },
          { userId: 'user-003', name: 'Kiddo', role: 'child', avatar: '🧒' },
        ],
        timezone: 'Asia/Kolkata',
        createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      }
    ]),
  },
  {
    store: listsStore,
    items: normalizeSeedData([
      { id: 'li-1', householdId: 'hh-shared-001', category: 'shopping', text: 'Milk', addedBy: 'user-001', checked: false, addedAt: new Date().toISOString() },
      { id: 'li-2', householdId: 'hh-shared-001', category: 'shopping', text: 'Eggs', addedBy: 'user-002', checked: false, addedAt: new Date().toISOString() },
      { id: 'li-3', householdId: 'hh-shared-001', category: 'shopping', text: 'Bread', addedBy: 'user-001', checked: true, checkedBy: 'user-001', checkedAt: new Date().toISOString(), addedAt: new Date().toISOString() },
      { id: 'li-4', householdId: 'hh-shared-001', category: 'todo', text: 'Pay electricity bill', addedBy: 'user-002', checked: false, addedAt: new Date().toISOString() },
      { id: 'li-5', householdId: 'hh-shared-001', category: 'todo', text: 'Schedule kid\'s doctor visit', addedBy: 'user-001', checked: false, addedAt: new Date().toISOString() },
    ]),
  },
  {
    store: mealsStore,
    items: normalizeSeedData([
      { id: 'ml-mon', householdId: 'hh-shared-001', day: 'monday', meal: 'dinner', title: 'Pasta pomodoro', cook: 'user-001', notes: 'kiddo approved' },
      { id: 'ml-tue', householdId: 'hh-shared-001', day: 'tuesday', meal: 'dinner', title: 'Tacos', cook: 'user-002' },
      { id: 'ml-wed', householdId: 'hh-shared-001', day: 'wednesday', meal: 'dinner', title: 'Stir fry', cook: 'user-001' },
      { id: 'ml-thu', householdId: 'hh-shared-001', day: 'thursday', meal: 'dinner', title: 'Pizza night', cook: 'user-002' },
    ]),
  },
  {
    store: choresStore,
    items: normalizeSeedData([
      { id: 'ch-1', householdId: 'hh-shared-001', title: 'Take out trash', assignedTo: 'user-001', cadence: 'weekly', done: false },
      { id: 'ch-2', householdId: 'hh-shared-001', title: 'Vacuum living room', assignedTo: 'user-002', cadence: 'weekly', done: false },
      { id: 'ch-3', householdId: 'hh-shared-001', title: 'Water plants', assignedTo: 'user-003', cadence: 'daily', done: true },
    ]),
  },
  {
    store: eventsStore,
    items: normalizeSeedData([
      { id: 'ev-1', householdId: 'hh-shared-001', title: 'Kiddo\'s birthday', date: '2026-08-15', type: 'birthday', addedBy: 'user-001' },
      { id: 'ev-2', householdId: 'hh-shared-001', title: 'Anniversary dinner', date: '2026-09-10', type: 'anniversary', addedBy: 'user-002' },
      { id: 'ev-3', householdId: 'hh-shared-001', title: 'Family trip to Goa', date: '2026-12-20', type: 'trip', addedBy: 'user-001' },
    ]),
  },
]);

const server = app.listen(PORT, () => {
  console.log(`Genie Household OS running on port ${PORT}`);
});

installGracefulShutdown(server);