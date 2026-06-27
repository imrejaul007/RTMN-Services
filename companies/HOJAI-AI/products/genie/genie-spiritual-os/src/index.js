const { requireAuth } = require('@rtmn/shared/auth');
const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { installReadinessRoutes, autoSeed, normalizeSeedData } = require('@rtmn/shared/lib/genie-readiness');
const cors = require('cors');
const helmet = require('helmet');

const prayerRoutes = require('./routes/prayer');
const gratitudeRoutes = require('./routes/gratitude');
const reflectionRoutes = require('./routes/reflection');
const meditationRoutes = require('./routes/meditation');
const insightsRoutes = require('./routes/insights');

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


// Phase A: persistent stores for spiritual practice data
const prayersStore = new PersistentMap('prayers', { serviceName: 'genie-spiritual-os' });
const gratitudeStore = new PersistentMap('gratitude', { serviceName: 'genie-spiritual-os' });
const reflectionsStore = new PersistentMap('reflections', { serviceName: 'genie-spiritual-os' });
const meditationsStore = new PersistentMap('meditations', { serviceName: 'genie-spiritual-os' });

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4729;

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
app.use('/prayer', prayerRoutes);
app.use('/gratitude', gratitudeRoutes);
app.use('/reflection', reflectionRoutes);
app.use('/meditation', meditationRoutes);
app.use('/insights', insightsRoutes);

// Phase A: persistent store endpoints (prayers / gratitude / reflections / meditations)
app.get('/api/spiritual/prayers', (req, res) => {
  const items = Array.from(prayersStore.entries()).map(([k, v]) => ({ id: k, ...v }));
  res.json({ total: items.length, prayers: items });
});
app.get('/api/spiritual/gratitude', (req, res) => {
  const items = Array.from(gratitudeStore.entries()).map(([k, v]) => ({ id: k, ...v }));
  res.json({ total: items.length, gratitude: items });
});
app.get('/api/spiritual/reflections', (req, res) => {
  const items = Array.from(reflectionsStore.entries()).map(([k, v]) => ({ id: k, ...v }));
  res.json({ total: items.length, reflections: items });
});
app.get('/api/spiritual/meditations', (req, res) => {
  const items = Array.from(meditationsStore.entries()).map(([k, v]) => ({ id: k, ...v }));
  res.json({ total: items.length, meditations: items });
});

// Health check
app.get('/health', (req, res) => { res.json({ status: 'healthy', service: 'Genie Spiritual OS', port: PORT }); });
app.get('/', (req, res) => {
  res.json({
    service: 'Genie Spiritual OS',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    endpoints: [
      '/health - Spiritual health overview',
      '/prayer - Prayer requests, answered prayers, prayer streaks',
      '/gratitude - Daily gratitude entries',
      '/reflection - Journaling and deep reflection',
      '/meditation - Meditation session logs and stats',
      '/insights - AI spiritual insights and trends'
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
installReadinessRoutes(app, { serviceName: 'genie-spiritual-os' });

// Phase A: idempotent demo-data seeding
const seedPlans = [
  {
    store: prayersStore,
    items: normalizeSeedData([
      { id: 'p1', userId: 'user-001', text: 'For my family’s health and safety', category: 'family', answered: true, answeredAt: '2026-06-15', tags: ['family', 'health'] },
      { id: 'p2', userId: 'user-001', text: 'For clarity on the next career step', category: 'guidance', answered: false, tags: ['work', 'guidance'] },
      { id: 'p3', userId: 'user-001', text: 'Gratitude for a beautiful morning', category: 'gratitude', answered: true, answeredAt: '2026-06-22', tags: ['gratitude'] },
      { id: 'p4', userId: 'user-002', text: 'For peace in times of uncertainty', category: 'peace', answered: false, tags: ['peace'] },
      { id: 'p5', userId: 'user-003', text: 'For my children’s success', category: 'family', answered: false, tags: ['family', 'children'] },
    ]),
  },
  {
    store: gratitudeStore,
    items: normalizeSeedData([
      { id: 'g1', userId: 'user-001', items: ['Morning sunshine', 'A good cup of coffee', 'My partner’s laugh'], mood: 'happy', date: '2026-06-23' },
      { id: 'g2', userId: 'user-001', items: ['Finishing a tough project', 'Call from an old friend', 'Quiet evening at home'], mood: 'content', date: '2026-06-22' },
      { id: 'g3', userId: 'user-002', items: ['A great workout', 'Healthy lunch', 'New book'], mood: 'energized', date: '2026-06-23' },
      { id: 'g4', userId: 'user-003', items: ['Family dinner together', 'Children laughing', 'A peaceful walk'], mood: 'grateful', date: '2026-06-23' },
      { id: 'g5', userId: 'user-003', items: ['Safe travels', 'Good night’s sleep'], mood: 'thankful', date: '2026-06-22' },
    ]),
  },
  {
    store: reflectionsStore,
    items: normalizeSeedData([
      { id: 'r1', userId: 'user-001', title: 'On patience', body: 'Patience is not passive. It is the courage to trust the process.', mood: 'thoughtful', themes: ['patience', 'trust'], date: '2026-06-21' },
      { id: 'r2', userId: 'user-001', title: 'Quiet morning thoughts', body: 'The world is quieter before sunrise. That silence is full of answers.', mood: 'peaceful', themes: ['silence', 'clarity'], date: '2026-06-19' },
      { id: 'r3', userId: 'user-002', title: 'Why I run', body: 'I run not to escape but to arrive — at myself, at the present.', mood: 'focused', themes: ['running', 'presence'], date: '2026-06-20' },
      { id: 'r4', userId: 'user-003', title: 'A lesson from my daughter', body: 'She reminded me that joy can be as simple as jumping in puddles.', mood: 'joyful', themes: ['joy', 'children'], date: '2026-06-18' },
    ]),
  },
  {
    store: meditationsStore,
    items: normalizeSeedData([
      { id: 'm1', userId: 'user-001', type: 'breath', minutes: 10, focus: 'calm', completedAt: '2026-06-23T07:15:00Z' },
      { id: 'm2', userId: 'user-001', type: 'body-scan', minutes: 15, focus: 'sleep', completedAt: '2026-06-22T22:30:00Z' },
      { id: 'm3', userId: 'user-002', type: 'mantra', minutes: 20, focus: 'focus', completedAt: '2026-06-23T06:30:00Z' },
      { id: 'm4', userId: 'user-003', type: 'loving-kindness', minutes: 12, focus: 'compassion', completedAt: '2026-06-23T08:00:00Z' },
      { id: 'm5', userId: 'user-003', type: 'breath', minutes: 8, focus: 'calm', completedAt: '2026-06-22T07:00:00Z' },
    ]),
  },
];
const seeded = autoSeed(seedPlans, { serviceName: 'genie-spiritual-os' });
if (seeded) console.log('[genie-spiritual-os] demo data seeded');



const server = app.listen(PORT, () => {
  console.log(`\u{1F54C} Genie Spiritual OS running on port ${PORT}`);
});
installGracefulShutdown(server);

module.exports = app;