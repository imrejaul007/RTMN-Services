/**
 * genie-wellness-agent — Wellness Agent (D3)
 *
 * Full health tracking replacing the 66-LOC stub. Tracks:
 *   - metrics: weight, sleep, steps, water, mood, energy (daily entries)
 *   - workouts: cardio, strength, yoga, etc.
 *   - meals: food log with calories/macros
 *   - goals: targets with progress
 *   - insights: weekly summary + AI recommendations
 *
 * Endpoints:
 *   GET    /health
 *   GET    /
 *   GET    /metrics/:userId                            — list (?type, ?from, ?to)
 *   POST   /metrics/:userId                            — log a metric
 *   DELETE /metrics/:entryId/:userId                   — delete
 *   GET    /workouts/:userId
 *   POST   /workouts/:userId
 *   GET    /meals/:userId                              — list (?day)
 *   POST   /meals/:userId
 *   GET    /goals/:userId
 *   POST   /goals/:userId
 *   POST   /goals/:goalId/progress/:userId            — bump progress
 *   GET    /insights/:userId                          — weekly summary + AI tips
 *   GET    /dashboard/:userId                          — today's snapshot
 */

const { requireAuth } = require('@rtmn/shared/auth');
const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { installReadinessRoutes, autoSeed, normalizeSeedData } = require('@rtmn/shared/lib/genie-readiness');
const { callLLM } = require('@rtmn/shared/lib/llm');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const helmet = require('helmet');

const wellnessRoutes = require('./routes/wellness');

requireEnv(['JWT_SECRET']);
const PORT = parseInt(process.env.PORT || '4741', 10);
const SERVICE_NAME = 'genie-wellness-agent';

const metricsStore = new PersistentMap('wellness-metrics', { serviceName: SERVICE_NAME });
const workoutsStore = new PersistentMap('wellness-workouts', { serviceName: SERVICE_NAME });
const mealsStore = new PersistentMap('wellness-meals', { serviceName: SERVICE_NAME });
const goalsStore = new PersistentMap('wellness-goals', { serviceName: SERVICE_NAME });

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
  res.json({ status: 'healthy', service: 'Genie Wellness Agent', port: PORT });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Genie Wellness Agent',
    tagline: 'Your personal health HQ. Metrics, workouts, meals, goals, insights.',
    endpoints: [
      'GET    /metrics/:userId', 'POST   /metrics/:userId', 'DELETE /metrics/:entryId/:userId',
      'GET    /workouts/:userId', 'POST   /workouts/:userId',
      'GET    /meals/:userId', 'POST   /meals/:userId',
      'GET    /goals/:userId', 'POST   /goals/:userId', 'POST   /goals/:goalId/progress/:userId',
      'GET    /insights/:userId',
      'GET    /dashboard/:userId',
    ],
  });
});

app.use(requireAuth);

app.use('/', wellnessRoutes({ metricsStore, workoutsStore, mealsStore, goalsStore }));

installReadinessRoutes(app, {
  serviceName: SERVICE_NAME,
  stores: [metricsStore, workoutsStore, mealsStore, goalsStore],
});

// Seed: 7 days of metrics + 3 workouts + 5 meals + 3 goals for user-001
const today = new Date();
const daysAgo = (n) => new Date(today.getTime() - n * 86400000).toISOString().slice(0, 10);
const metrics = [];
for (let i = 6; i >= 0; i--) {
  const date = daysAgo(i);
  metrics.push({ id: `m-${date}-weight`, userId: 'user-001', type: 'weight', value: 72 + Math.random() * 0.5 - 0.25, unit: 'kg', date, createdAt: new Date().toISOString() });
  metrics.push({ id: `m-${date}-sleep`, userId: 'user-001', type: 'sleep', value: 7 + Math.random() * 1.5, unit: 'h', date, createdAt: new Date().toISOString() });
  metrics.push({ id: `m-${date}-steps`, userId: 'user-001', type: 'steps', value: 7000 + Math.floor(Math.random() * 4000), unit: 'steps', date, createdAt: new Date().toISOString() });
  metrics.push({ id: `m-${date}-water`, userId: 'user-001', type: 'water', value: 1.5 + Math.random() * 1.5, unit: 'L', date, createdAt: new Date().toISOString() });
  metrics.push({ id: `m-${date}-mood`, userId: 'user-001', type: 'mood', value: 6 + Math.floor(Math.random() * 4), unit: '1-10', date, createdAt: new Date().toISOString() });
  metrics.push({ id: `m-${date}-energy`, userId: 'user-001', type: 'energy', value: 5 + Math.floor(Math.random() * 5), unit: '1-10', date, createdAt: new Date().toISOString() });
}

autoSeed([
  {
    store: metricsStore,
    items: normalizeSeedData(metrics),
  },
  {
    store: workoutsStore,
    items: normalizeSeedData([
      { id: 'wo-1', userId: 'user-001', type: 'cardio', title: 'Morning run', duration: 30, calories: 280, date: daysAgo(0), intensity: 'moderate' },
      { id: 'wo-2', userId: 'user-001', type: 'strength', title: 'Upper body', duration: 45, calories: 220, date: daysAgo(2), intensity: 'high' },
      { id: 'wo-3', userId: 'user-001', type: 'yoga', title: 'Evening yoga', duration: 25, calories: 80, date: daysAgo(4), intensity: 'low' },
    ]),
  },
  {
    store: mealsStore,
    items: normalizeSeedData([
      { id: 'ml-1', userId: 'user-001', name: 'Oatmeal + berries', calories: 350, protein: 12, carbs: 60, fat: 8, meal: 'breakfast', date: daysAgo(0) },
      { id: 'ml-2', userId: 'user-001', name: 'Chicken salad', calories: 480, protein: 35, carbs: 30, fat: 22, meal: 'lunch', date: daysAgo(0) },
      { id: 'ml-3', userId: 'user-001', name: 'Salmon + rice', calories: 600, protein: 40, carbs: 65, fat: 20, meal: 'dinner', date: daysAgo(0) },
      { id: 'ml-4', userId: 'user-001', name: 'Greek yogurt', calories: 180, protein: 15, carbs: 18, fat: 5, meal: 'snack', date: daysAgo(0) },
      { id: 'ml-5', userId: 'user-001', name: 'Protein shake', calories: 220, protein: 30, carbs: 12, fat: 4, meal: 'snack', date: daysAgo(1) },
    ]),
  },
  {
    store: goalsStore,
    items: normalizeSeedData([
      { id: 'gl-1', userId: 'user-001', title: 'Sleep 8h/night', metric: 'sleep', target: 8, unit: 'h', period: 'daily', progress: 0 },
      { id: 'gl-2', userId: 'user-001', title: '10K steps/day', metric: 'steps', target: 10000, unit: 'steps', period: 'daily', progress: 0 },
      { id: 'gl-3', userId: 'user-001', title: 'Drink 3L water', metric: 'water', target: 3, unit: 'L', period: 'daily', progress: 0 },
      { id: 'gl-4', userId: 'user-001', title: 'Workout 5x/week', metric: 'workouts', target: 5, unit: 'sessions', period: 'weekly', progress: 0 },
    ]),
  },
]);

const server = app.listen(PORT, () => {
  console.log(`Genie Wellness Agent running on port ${PORT}`);
});

installGracefulShutdown(server);