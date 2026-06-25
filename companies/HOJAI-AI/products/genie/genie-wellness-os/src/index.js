const { requireAuth } = require('@rtmn/shared/auth');
const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { installReadinessRoutes, autoSeed, normalizeSeedData } = require('@rtmn/shared/lib/genie-readiness');
const cors = require('cors');
const helmet = require('helmet');

const healthRoutes = require('./routes/health');
const sleepRoutes = require('./routes/sleep');
const nutritionRoutes = require('./routes/nutrition');
const mentalRoutes = require('./routes/mental');
const fitnessRoutes = require('./routes/fitness');
const insightsRoutes = require('./routes/insights');

const app = express();

// Phase A: persistent stores for demo data (mood/sleep/hydration entries)
const moodsStore = new PersistentMap('moods', { serviceName: 'genie-wellness-os' });
const sleepStore = new PersistentMap('sleep-logs', { serviceName: 'genie-wellness-os' });
const hydrationStore = new PersistentMap('hydration-logs', { serviceName: 'genie-wellness-os' });

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4723;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());


app.use(requireAuth);// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/health', healthRoutes);
app.use('/sleep', sleepRoutes);
app.use('/nutrition', nutritionRoutes);
app.use('/mental', mentalRoutes);
app.use('/fitness', fitnessRoutes);
app.use('/insights', insightsRoutes);

// Phase A: persistent store endpoints (mood / sleep / hydration)
app.get('/api/wellness/moods', (req, res) => {
  const items = Array.from(moodsStore.entries()).map(([k, v]) => ({ id: k, ...v }));
  res.json({ total: items.length, moods: items });
});
app.get('/api/wellness/sleep', (req, res) => {
  const items = Array.from(sleepStore.entries()).map(([k, v]) => ({ id: k, ...v }));
  res.json({ total: items.length, sleep: items });
});
app.get('/api/wellness/hydration', (req, res) => {
  const items = Array.from(hydrationStore.entries()).map(([k, v]) => ({ id: k, ...v }));
  res.json({ total: items.length, hydration: items });
});

// Health check
app.get('/health', (req, res) => { res.json({ status: 'healthy', service: 'Genie Wellness OS', port: PORT }); });
app.get('/', (req, res) => {
  res.json({
    service: 'Genie Wellness OS',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    endpoints: [
      '/health - Body metrics and vitals',
      '/sleep - Sleep tracking and analysis',
      '/nutrition - Diet and hydration',
      '/mental - Mental wellness and mindfulness',
      '/fitness - Exercise and activity tracking',
      '/insights - AI wellness insights and recommendations'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// Phase A: production-readiness routes (LLM + DB health + combined)
installReadinessRoutes(app, { serviceName: 'genie-wellness-os' });

// Phase A: idempotent demo-data seeding
const seedPlans = [
  {
    store: moodsStore,
    items: normalizeSeedData([
      { id: 'm1', userId: 'user-001', score: 7, note: 'Productive morning', tags: ['work', 'focused'] },
      { id: 'm2', userId: 'user-001', score: 5, note: 'Tired after long meeting', tags: ['work', 'tired'] },
      { id: 'm3', userId: 'user-002', score: 9, note: 'Great workout + sunshine', tags: ['fitness', 'outdoors'] },
      { id: 'm4', userId: 'user-002', score: 6, note: 'Decent day overall', tags: ['neutral'] },
      { id: 'm5', userId: 'user-003', score: 8, note: 'Family dinner — relaxed', tags: ['family', 'social'] },
    ]),
  },
  {
    store: sleepStore,
    items: normalizeSeedData([
      { id: 's1', userId: 'user-001', hours: 7.2, quality: 'good', bedtime: '23:10', wakeTime: '06:25' },
      { id: 's2', userId: 'user-001', hours: 6.0, quality: 'fair', bedtime: '00:30', wakeTime: '06:30' },
      { id: 's3', userId: 'user-002', hours: 8.1, quality: 'excellent', bedtime: '22:45', wakeTime: '06:55' },
      { id: 's4', userId: 'user-003', hours: 7.5, quality: 'good', bedtime: '23:30', wakeTime: '07:00' },
      { id: 's5', userId: 'user-003', hours: 5.8, quality: 'poor', bedtime: '01:15', wakeTime: '07:00' },
    ]),
  },
  {
    store: hydrationStore,
    items: normalizeSeedData([
      { id: 'h1', userId: 'user-001', glasses: 8, goal: 8, day: '2026-06-23' },
      { id: 'h2', userId: 'user-002', glasses: 10, goal: 8, day: '2026-06-23' },
      { id: 'h3', userId: 'user-003', glasses: 5, goal: 8, day: '2026-06-23' },
      { id: 'h4', userId: 'user-001', glasses: 7, goal: 8, day: '2026-06-22' },
      { id: 'h5', userId: 'user-002', glasses: 8, goal: 8, day: '2026-06-22' },
    ]),
  },
];
const seeded = autoSeed(seedPlans, { serviceName: 'genie-wellness-os' });
if (seeded) console.log('[genie-wellness-os] demo data seeded');



const server = app.listen(PORT, () => {
  console.log(`🧘 Genie Wellness OS running on port ${PORT}`);
});
installGracefulShutdown(server);

module.exports = app;