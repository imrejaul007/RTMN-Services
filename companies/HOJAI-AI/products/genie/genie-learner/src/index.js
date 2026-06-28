/**
 * genie-learner — Learner Agent (D4)
 *
 * Pairs with the Teacher Agent (D1). Where Teacher is the LMS,
 * Learner is the *retention engine*: flashcards with spaced
 * repetition + curated learning paths.
 *
 * Endpoints:
 *   GET    /health
 *   GET    /
 *   GET    /decks/:userId                            — list decks
 *   POST   /decks/:userId                            — create deck
 *   GET    /decks/:deckId                            — deck + cards
 *   DELETE /decks/:deckId/:userId                    — delete deck
 *   POST   /decks/:deckId/cards/:userId              — add card (front/back/tags)
 *   DELETE /cards/:cardId/:userId                    — delete card
 *   GET    /decks/:deckId/review/:userId             — cards due today
 *   POST   /review/:cardId/:userId                   — review card (rating: again|hard|good|easy)
 *   GET    /paths                                   — list curated paths
 *   GET    /paths/:pathId                            — path detail
 *   GET    /users/:userId/streak                     — current streak + stats
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

const learnerRoutes = require('./routes/learner');

requireEnv(['JWT_SECRET']);
const PORT = parseInt(process.env.PORT || '4742', 10);
const SERVICE_NAME = 'genie-learner';

const decksStore = new PersistentMap('learner-decks', { serviceName: SERVICE_NAME });
const cardsStore = new PersistentMap('learner-cards', { serviceName: SERVICE_NAME });
const reviewsStore = new PersistentMap('learner-reviews', { serviceName: SERVICE_NAME });
const pathsStore = new PersistentMap('learner-paths', { serviceName: SERVICE_NAME });

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
  res.json({ status: 'healthy', service: 'Genie Learner Agent', port: PORT });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Genie Learner Agent',
    tagline: 'Spaced repetition + curated paths. Remember what you learn.',
    endpoints: [
      'GET    /decks/:userId', 'POST   /decks/:userId', 'GET    /decks/:deckId', 'DELETE /decks/:deckId/:userId',
      'POST   /decks/:deckId/cards/:userId', 'DELETE /cards/:cardId/:userId',
      'GET    /decks/:deckId/review/:userId', 'POST   /review/:cardId/:userId',
      'GET    /paths', 'GET    /paths/:pathId',
      'GET    /users/:userId/streak',
    ],
  });
});

app.use(requireAuth);

app.use('/', learnerRoutes({ decksStore, cardsStore, reviewsStore, pathsStore }));

installReadinessRoutes(app, {
  serviceName: SERVICE_NAME,
  stores: [decksStore, cardsStore, reviewsStore, pathsStore],
});

// Seed: 3 paths + 2 decks + 6 cards
autoSeed([
  {
    store: pathsStore,
    items: normalizeSeedData([
      {
        id: 'pth-spanish', title: 'Spanish for Travel (4 weeks)',
        description: 'Daily 15-min lessons. Survival fluency in 30 days.',
        weeks: 4, dailyMinutes: 15, modules: 20, tags: ['language', 'travel'],
        modules_list: [
          { week: 1, title: 'Greetings + basics', lessons: ['Hello/goodbye', 'Numbers 1-20', 'Ordering food'] },
          { week: 2, title: 'Getting around', lessons: ['Directions', 'Taxis/trains', 'Hotel check-in'] },
          { week: 3, title: 'Emergencies + shopping', lessons: ['Help phrases', 'Clothes/sizes', 'Markets'] },
          { week: 4, title: 'Social', lessons: ['Small talk', 'Invitations', 'Goodbyes'] },
        ],
      },
      {
        id: 'pth-pm', title: 'Product Management Foundations (6 weeks)',
        description: 'Become a PM. Strategy, discovery, delivery, metrics.',
        weeks: 6, dailyMinutes: 20, modules: 30, tags: ['business', 'career'],
        modules_list: [
          { week: 1, title: 'What PMs do', lessons: ['Discovery vs delivery', 'Stakeholders', 'Cadence'] },
          { week: 2, title: 'Discovery', lessons: ['User interviews', 'Jobs-to-be-done', 'Opportunity trees'] },
          { week: 3, title: 'Prioritization', lessons: ['RICE', 'MoSCoW', 'OKRs vs KPIs'] },
          { week: 4, title: 'Delivery', lessons: ['Specs', 'Working with eng', 'Launches'] },
          { week: 5, title: 'Metrics', lessons: ['North star', 'AARRR', 'Experiments'] },
          { week: 6, title: 'Strategy', lessons: ['Market sizing', 'Moats', 'Narrative'] },
        ],
      },
      {
        id: 'pth-mind', title: 'Mindfulness Foundations (4 weeks)',
        description: '15-min daily practice. Build the habit.',
        weeks: 4, dailyMinutes: 15, modules: 20, tags: ['wellness', 'mindfulness'],
        modules_list: [
          { week: 1, title: 'Breath', lessons: ['Box breathing', '4-7-8', 'Belly breath'] },
          { week: 2, title: 'Body scan', lessons: ['Feet to head', 'Sitting', 'Lying'] },
          { week: 3, title: 'Awareness', lessons: ['Sounds', 'Sensations', 'Thoughts'] },
          { week: 4, title: 'Compassion', lessons: ['Self-compassion', 'Loving-kindness', 'Forgiveness'] },
        ],
      },
    ]),
  },
  {
    store: decksStore,
    items: normalizeSeedData([
      { id: 'dk-spanish', userId: 'user-001', title: 'Spanish Vocab', description: 'Travel phrases', cardCount: 4, createdAt: new Date().toISOString() },
      { id: 'dk-pm', userId: 'user-001', title: 'PM Acronyms', description: 'Common PM frameworks', cardCount: 2, createdAt: new Date().toISOString() },
    ]),
  },
  {
    store: cardsStore,
    items: normalizeSeedData([
      { id: 'cd-1', deckId: 'dk-spanish', front: 'Hello', back: 'Hola', tags: ['greeting'], interval: 0, ease: 2.5, dueAt: new Date().toISOString(), reps: 0 },
      { id: 'cd-2', deckId: 'dk-spanish', front: 'Goodbye', back: 'Adiós', tags: ['greeting'], interval: 0, ease: 2.5, dueAt: new Date().toISOString(), reps: 0 },
      { id: 'cd-3', deckId: 'dk-spanish', front: 'Thank you', back: 'Gracias', tags: ['greeting'], interval: 0, ease: 2.5, dueAt: new Date(Date.now() + 86400000).toISOString(), reps: 1 },
      { id: 'cd-4', deckId: 'dk-spanish', front: 'Please', back: 'Por favor', tags: ['greeting'], interval: 0, ease: 2.5, dueAt: new Date().toISOString(), reps: 0 },
      { id: 'cd-5', deckId: 'dk-pm', front: 'RICE', back: 'Reach × Impact × Confidence / Effort', tags: ['framework'], interval: 0, ease: 2.5, dueAt: new Date().toISOString(), reps: 0 },
      { id: 'cd-6', deckId: 'dk-pm', front: 'AARRR', back: 'Acquisition / Activation / Retention / Revenue / Referral', tags: ['framework'], interval: 0, ease: 2.5, dueAt: new Date().toISOString(), reps: 0 },
    ]),
  },
]);
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`Genie Learner Agent running on port ${PORT}`);
});

installGracefulShutdown(server);