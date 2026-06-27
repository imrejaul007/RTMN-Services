/**
 * genie-personal-twin — Personal Digital Twin (C2)
 *
 * "The avatar that knows you." Aggregates the user's data from across
 * the Genie ecosystem (memory, wellness, finance, calendar, relationships,
 * spiritual, simulation) and exposes a single, unified API that the rest
 * of the app can call to ask "what does the user look like today?".
 */

const { requireAuth } = require('@rtmn/shared/auth');
const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { installReadinessRoutes, autoSeed, normalizeSeedData } = require('@rtmn/shared/lib/genie-readiness');
const cors = require('cors');
const helmet = require('helmet');

const twinRoutes = require('./routes/twin');
const traitsRoutes = require('./routes/traits');
const momentsRoutes = require('./routes/moments');

requireEnv(['JWT_SECRET']);
const PORT = parseInt(process.env.PORT || '4733', 10);
const SERVICE_NAME = 'genie-personal-twin';

// Persistent stores
const twinsStore = new PersistentMap('personal-twins', { serviceName: SERVICE_NAME });
const traitsStore = new PersistentMap('traits', { serviceName: SERVICE_NAME });
const momentsStore = new PersistentMap('moments', { serviceName: SERVICE_NAME });

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
app.use(requireAuth);

// Routes
app.use('/twin', twinRoutes({ twinsStore, traitsStore, momentsStore }));
app.use('/traits', traitsRoutes({ traitsStore }));
app.use('/moments', momentsRoutes({ momentsStore, twinsStore }));

// Root
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Genie Personal Digital Twin', port: PORT });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Genie Personal Digital Twin',
    tagline: 'The avatar that knows you.',
    endpoints: [
      'GET    /twin/get/:userId       — Get full personal twin (aggregated)',
      'POST   /twin/update/:userId    — Update base attributes',
      'GET    /twin/summary/:userId   — Quick summary (headline + top traits)',
      'GET    /twin/mood/:userId      — Mood trajectory (last 30 days)',
      'POST   /traits/add/:userId     — Add a trait (interest/skill/value)',
      'GET    /traits/list/:userId    — List all traits',
      'DELETE /traits/remove/:userId/:traitId — Remove a trait',
      'POST   /moments/add/:userId    — Add a life moment (turning point)',
      'GET    /moments/list/:userId   — List moments in chronological order',
      'GET    /moments/get/:momentId  — Get a specific moment',
    ],
  });
});

// Readiness
installReadinessRoutes(app, {
  serviceName: SERVICE_NAME,
  stores: [twinsStore, traitsStore, momentsStore],
});

// Seed (Phase A): 1 user with full twin + 8 traits + 4 life moments
autoSeed([
  {
    store: twinsStore,
    items: normalizeSeedData([
      {
        id: 'twin-user-001',
        userId: 'user-001',
        name: 'You',
        pronouns: 'they/them',
        age: 32,
        location: 'Bengaluru, India',
        timezone: 'Asia/Kolkata',
        occupation: 'Founder & Engineer',
        relationshipStatus: 'Single',
        householdSize: 1,
        headline: 'Building something that matters.',
        bio: 'Founder, engineer, lifelong learner. Balancing ambition with inner growth.',
        mood: { current: 'focused', trend: 'up', score: 7.2 },
        energy: { current: 'high', score: 8.1 },
        focus: ['company', 'health', 'relationships'],
        updatedAt: new Date().toISOString(),
      }
    ]),
  },
  {
    store: traitsStore,
    items: normalizeSeedData([
      { id: 'tr-1', userId: 'user-001', category: 'value', name: 'Curiosity', strength: 9, examples: ['Loves reading', 'Asks why'], addedAt: new Date().toISOString() },
      { id: 'tr-2', userId: 'user-001', category: 'value', name: 'Integrity', strength: 10, examples: ['Honest in reviews'], addedAt: new Date().toISOString() },
      { id: 'tr-3', userId: 'user-001', category: 'skill', name: 'System design', strength: 8, examples: ['Architected SUTAR OS'], addedAt: new Date().toISOString() },
      { id: 'tr-4', userId: 'user-001', category: 'skill', name: 'Writing', strength: 7, examples: ['Investor decks'], addedAt: new Date().toISOString() },
      { id: 'tr-5', userId: 'user-001', category: 'interest', name: 'Meditation', strength: 8, examples: ['15 min daily'], addedAt: new Date().toISOString() },
      { id: 'tr-6', userId: 'user-001', category: 'interest', name: 'Long-distance running', strength: 6, examples: ['Half marathon 2025'], addedAt: new Date().toISOString() },
      { id: 'tr-7', userId: 'user-001', category: 'goal', name: 'Ship HOJAI platform', strength: 10, examples: ['Q3 2026 target'], addedAt: new Date().toISOString() },
      { id: 'tr-8', userId: 'user-001', category: 'fear', name: 'Stagnation', strength: 7, examples: ['Worries about pace'], addedAt: new Date().toISOString() },
    ]),
  },
  {
    store: momentsStore,
    items: normalizeSeedData([
      { id: 'mmt-1', userId: 'user-001', type: 'milestone', title: 'First startup exit', date: '2019-06-15', description: 'Sold first company, learned what I actually wanted to build', impact: 'high' },
      { id: 'mmt-2', userId: 'user-001', type: 'milestone', title: 'Started HOJAI', date: '2024-01-10', description: 'Quit job, went all-in on autonomous economy vision', impact: 'transformative' },
      { id: 'mmt-3', userId: 'user-001', type: 'relationship', title: 'Moved back to India', date: '2024-03-01', description: 'Closer to family, new chapter', impact: 'medium' },
      { id: 'mmt-4', userId: 'user-001', type: 'learning', title: 'Daily meditation practice', date: '2025-09-01', description: '90+ days streak, transformed sleep', impact: 'medium' },
    ]),
  },
]);

const server = app.listen(PORT, () => {
  console.log(`Genie Personal Digital Twin running on port ${PORT}`);
});

installGracefulShutdown(server);
