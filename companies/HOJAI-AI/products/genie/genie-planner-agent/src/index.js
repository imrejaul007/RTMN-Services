/**
 * genie-planner-agent — Planner Agent (D6)
 *
 * Daily/weekly planning workspace: todos, habits, time-blocks, goals.
 * Pairs with Calendar (genie-calendar) and TwinOS scheduling.
 *
 * Endpoints:
 *   GET    /health
 *   GET    /
 *   GET    /todos/by-user/:userId                  — list todos (filter: status, date, priority)
 *   POST   /todos/by-user/:userId                  — create todo
 *   PATCH  /todos/:todoId                          — update todo
 *   DELETE /todos/:todoId                          — delete todo
 *   POST   /todos/:todoId/complete                 — mark complete
 *   GET    /habits/by-user/:userId                 — list habits + today status
 *   POST   /habits/by-user/:userId                 — create habit
 *   POST   /habits/:habitId/log                    — log habit for date (default today)
 *   DELETE /habits/:habitId                        — delete habit
 *   GET    /blocks/by-user/:userId                 — list time blocks (filter: date)
 *   POST   /blocks/by-user/:userId                 — create time block
 *   DELETE /blocks/:blockId                        — delete block
 *   GET    /today/:userId                          — today's snapshot (todos + habits + blocks)
 *   GET    /stats/:userId                          — completion stats
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

const plannerRoutes = require('./routes/planner');

requireEnv(['JWT_SECRET']);
const PORT = parseInt(process.env.PORT || '4744', 10);
const SERVICE_NAME = 'genie-planner-agent';

const todosStore = new PersistentMap('planner-todos', { serviceName: SERVICE_NAME });
const habitsStore = new PersistentMap('planner-habits', { serviceName: SERVICE_NAME });
const habitLogsStore = new PersistentMap('planner-habit-logs', { serviceName: SERVICE_NAME });
const blocksStore = new PersistentMap('planner-blocks', { serviceName: SERVICE_NAME });

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

// Public health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Genie Planner Agent', port: PORT });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Genie Planner Agent',
    tagline: 'Your daily cockpit. Todos, habits, time-blocks.',
    endpoints: [
      'GET    /todos/by-user/:userId', 'POST   /todos/by-user/:userId',
      'PATCH  /todos/:todoId', 'DELETE /todos/:todoId', 'POST   /todos/:todoId/complete',
      'GET    /habits/by-user/:userId', 'POST   /habits/by-user/:userId',
      'POST   /habits/:habitId/log', 'DELETE /habits/:habitId',
      'GET    /blocks/by-user/:userId', 'POST   /blocks/by-user/:userId', 'DELETE /blocks/:blockId',
      'GET    /today/:userId', 'GET    /stats/:userId',
    ],
  });
});

app.use(requireAuth);

app.use('/', plannerRoutes({ todosStore, habitsStore, habitLogsStore, blocksStore }));

installReadinessRoutes(app, {
  serviceName: SERVICE_NAME,
  stores: [todosStore, habitsStore, habitLogsStore, blocksStore],
});

// Seed: 6 todos + 4 habits + 14 habit logs (4 habits × ~3-4 days) + 4 time blocks
const today = new Date().toISOString().slice(0, 10);
const days = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

const habitLogItems = [];
for (let h = 1; h <= 4; h++) {
  for (let d = 0; d < 4; d++) {
    // Log habit on d days ago (most habits, not all 4 days)
    if (d < 3 + (h % 2)) {
      habitLogItems.push({ id: `hl-${h}-${d}`, habitId: `hb-${h}`, userId: 'user-001', date: days(d) });
    }
  }
}

autoSeed([
  {
    store: todosStore,
    items: normalizeSeedData([
      { id: 'td-1', userId: 'user-001', title: 'Ship Genie demo video', priority: 'high', status: 'pending', due: today, tags: ['work', 'demo'], createdAt: new Date().toISOString() },
      { id: 'td-2', userId: 'user-001', title: 'Review pull request #42', priority: 'medium', status: 'pending', due: today, tags: ['work'], createdAt: new Date().toISOString() },
      { id: 'td-3', userId: 'user-001', title: 'Gym at 6pm', priority: 'medium', status: 'pending', due: today, tags: ['health'], createdAt: new Date().toISOString() },
      { id: 'td-4', userId: 'user-001', title: 'Call mom', priority: 'low', status: 'completed', due: days(1), tags: ['personal'], completedAt: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 'td-5', userId: 'user-001', title: 'Read 30 pages', priority: 'low', status: 'completed', due: days(2), tags: ['learning'], completedAt: new Date(Date.now() - 2 * 86400000).toISOString(), createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
      { id: 'td-6', userId: 'user-001', title: 'Plan Q3 OKRs', priority: 'high', status: 'pending', due: days(-3), tags: ['work', 'planning'], createdAt: new Date().toISOString() },
    ]),
  },
  {
    store: habitsStore,
    items: normalizeSeedData([
      { id: 'hb-1', userId: 'user-001', title: 'Meditate 10 min', frequency: 'daily', icon: '🧘', createdAt: new Date().toISOString() },
      { id: 'hb-2', userId: 'user-001', title: 'Read 30 min', frequency: 'daily', icon: '📚', createdAt: new Date().toISOString() },
      { id: 'hb-3', userId: 'user-001', title: 'Exercise', frequency: 'daily', icon: '🏃', createdAt: new Date().toISOString() },
      { id: 'hb-4', userId: 'user-001', title: 'No social media after 9pm', frequency: 'daily', icon: '📵', createdAt: new Date().toISOString() },
    ]),
  },
  {
    store: habitLogsStore,
    items: normalizeSeedData(habitLogItems),
  },
  {
    store: blocksStore,
    items: normalizeSeedData([
      { id: 'bk-1', userId: 'user-001', title: 'Deep work', start: `${today}T09:00:00.000Z`, end: `${today}T11:00:00.000Z`, type: 'focus', createdAt: new Date().toISOString() },
      { id: 'bk-2', userId: 'user-001', title: 'Lunch + walk', start: `${today}T12:00:00.000Z`, end: `${today}T13:00:00.000Z`, type: 'break', createdAt: new Date().toISOString() },
      { id: 'bk-3', userId: 'user-001', title: 'Team standup', start: `${today}T15:00:00.000Z`, end: `${today}T15:30:00.000Z`, type: 'meeting', createdAt: new Date().toISOString() },
      { id: 'bk-4', userId: 'user-001', title: 'Gym', start: `${today}T18:00:00.000Z`, end: `${today}T19:00:00.000Z`, type: 'health', createdAt: new Date().toISOString() },
    ]),
  },
]);
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`Genie Planner Agent running on port ${PORT}`);
});

installGracefulShutdown(server);
