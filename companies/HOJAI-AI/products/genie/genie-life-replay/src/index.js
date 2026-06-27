const { requireAuth } = require('@rtmn/shared/auth');
const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { installReadinessRoutes, autoSeed, normalizeSeedData } = require('@rtmn/shared/lib/genie-readiness');
const { llmComplete, isLLMAvailable } = require('@rtmn/shared/lib/llm');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');

const replayRoutes = require('./routes/replay');
const statsRoutes = require('./routes/stats');
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


// Phase A: persistent stores for cached replay summaries
const replayStore = new PersistentMap('replays', { serviceName: 'genie-life-replay' });
const insightsStore = new PersistentMap('insights-cache', { serviceName: 'genie-life-replay' });

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4730;

// Service URLs (defaults to localhost)
const SERVICES = {
  memory: process.env.MEMORY_URL || 'http://localhost:4810',
  wellness: process.env.WELLNESS_URL || 'http://localhost:4723',
  spiritual: process.env.SPIRITUAL_URL || 'http://localhost:4729',
  money: process.env.MONEY_URL || 'http://localhost:4724',
  relationship: process.env.RELATIONSHIP_URL || 'http://localhost:4718',
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use(requireAuth);

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/replay', replayRoutes({ replayStore, services: SERVICES }));
app.use('/stats', statsRoutes({ services: SERVICES }));
app.use('/insights', insightsRoutes({ insightsStore, services: SERVICES }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Genie Life Replay', port: PORT });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Genie Life Replay',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    endpoints: [
      '/health - Service health',
      '/replay/period/:userId - Generate a replay for a period (monthly/yearly)',
      '/replay/history/:userId - List all replays for a user',
      '/replay/get/:replayId - Get a specific replay',
      '/stats/summary/:userId - Quick stats summary',
      '/stats/thematic/:userId - Theme frequency over a period',
      '/insights/themes - Discover themes across memories',
      '/insights/highlights/:userId - Highlight moments'
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

// Readiness probe
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// Phase A: production-readiness routes
installReadinessRoutes(app, { serviceName: 'genie-life-replay' });

// Phase A: idempotent demo data seeding
const seedPlans = [
  {
    store: replayStore,
    items: normalizeSeedData([
      {
        id: 'r1',
        userId: 'user-001',
        period: 'monthly',
        periodStart: '2026-05-01',
        periodEnd: '2026-05-31',
        title: 'May 2026 — A Month of Quiet Wins',
        summary: 'May was a month of quiet wins. You finished a major project at work, deepened your meditation practice, and reconnected with two old friends.',
        highlights: [
          'Shipped the Q2 product roadmap',
          'Meditation streak: 21 days',
          'Reconnected with Mom and Sara'
        ],
        themes: ['focus', 'gratitude', 'relationships'],
        stats: { memories: 47, moods: 22, prayers: 8, gratitudes: 20, meditations: 21, sleepAvg: 7.2 },
        createdAt: '2026-06-01T09:00:00Z'
      },
      {
        id: 'r2',
        userId: 'user-001',
        period: 'yearly',
        periodStart: '2025-01-01',
        periodEnd: '2025-12-31',
        title: '2025 — A Year of Becoming',
        summary: '2025 was a year of becoming. You launched a new business, traveled to four countries, and learned to sit in silence. The through-line: choosing presence over productivity.',
        highlights: [
          'Launched HOJAI SUTAR OS',
          'Traveled: Tokyo, Lisbon, Dubai, Mexico City',
          'Read 23 books',
          'Meditation total: 142 hours'
        ],
        themes: ['career', 'travel', 'mindfulness', 'learning'],
        stats: { memories: 612, moods: 180, prayers: 95, gratitudes: 240, meditations: 178, sleepAvg: 7.0 },
        createdAt: '2026-01-04T10:00:00Z'
      }
    ]),
  },
  {
    store: insightsStore,
    items: normalizeSeedData([
      {
        id: 'i1',
        userId: 'user-001',
        periodStart: '2026-06-01',
        periodEnd: '2026-06-24',
        themes: { work: 12, family: 8, health: 5, gratitude: 7, spirituality: 4 },
        topWords: ['meeting', 'kids', 'morning', 'walk', 'meditation', 'gratitude', 'sleep'],
        createdAt: '2026-06-24T12:00:00Z'
      }
    ]),
  },
];
const seeded = autoSeed(seedPlans, { serviceName: 'genie-life-replay' });
if (seeded) console.log('[genie-life-replay] demo data seeded');

const server = app.listen(PORT, () => {
  console.log(`🎬 Genie Life Replay running on port ${PORT}`);
});
installGracefulShutdown(server);

module.exports = app;