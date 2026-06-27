const { requireAuth } = require('@rtmn/shared/auth');
const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { installReadinessRoutes, autoSeed, normalizeSeedData } = require('@rtmn/shared/lib/genie-readiness');
const { llmComplete, isLLMAvailable } = require('@rtmn/shared/lib/llm');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const adviceRoutes = require('./routes/advice');
const profileRoutes = require('./routes/profile');
const letterRoutes = require('./routes/letter');

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


// Phase A: persistent stores for future-self profiles, advice, letters
const profilesStore = new PersistentMap('future-profiles', { serviceName: 'genie-future-self' });
const adviceStore = new PersistentMap('future-advice', { serviceName: 'genie-future-self' });
const lettersStore = new PersistentMap('future-letters', { serviceName: 'genie-future-self' });

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4731;

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
app.use('/advice', adviceRoutes({ profilesStore, adviceStore }));
app.use('/profile', profileRoutes({ profilesStore }));
app.use('/letter', letterRoutes({ profilesStore, lettersStore }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Genie Future Self', port: PORT });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Genie Future Self',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    endpoints: [
      '/health - Service health',
      '/profile/get/:userId - Get or default user profile',
      '/profile/update/:userId - Set values/goals/priorities',
      '/advice/ask/:userId - Get advice from future self (POST {question, year})',
      '/advice/history/:userId - List all advice given',
      '/letter/write/:userId - Write a letter from future self to present self',
      '/letter/list/:userId - List all letters',
      '/letter/read/:letterId - Read a specific letter'
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
installReadinessRoutes(app, { serviceName: 'genie-future-self' });

// Phase A: idempotent demo data seeding
const seedPlans = [
  {
    store: profilesStore,
    items: normalizeSeedData([
      {
        id: 'fp-user-001',
        userId: 'user-001',
        values: ['family', 'health', 'creativity', 'growth', 'presence'],
        goals: ['Launch a meaningful product', 'Be a present parent', 'Read 30 books/year', 'Run a half-marathon'],
        priorities: ['Deep work', 'Family time', 'Health'],
        fears: ['Burning out', 'Losing curiosity'],
        hopes: ['Building something lasting', 'Healthy aging'],
        age: 35,
        year: 2026,
        updatedAt: '2026-06-01'
      }
    ]),
  },
  {
    store: adviceStore,
    items: normalizeSeedData([
      {
        id: 'a1',
        userId: 'user-001',
        question: 'Should I take this new job offer?',
        year: 2035,
        advice: 'Trust the version of yourself that has more data. At 35 you were weighing safety vs. growth — by 45 you\'ll wish you had chosen growth every time. But also: a job is a context, not an identity. Whatever you choose, your relationships and health will matter more than the title.',
        themes: ['career', 'growth', 'identity'],
        aiUsed: true,
        createdAt: '2026-06-15T10:00:00Z'
      },
      {
        id: 'a2',
        userId: 'user-001',
        question: 'How do I find time to read?',
        year: 2035,
        advice: 'You won\'t find time — you\'ll make it. Twenty minutes in the morning, no phone. Books finished compound. The ones you read this year will still be shaping your decisions a decade from now.',
        themes: ['learning', 'habits'],
        aiUsed: true,
        createdAt: '2026-06-10T08:00:00Z'
      }
    ]),
  },
  {
    store: lettersStore,
    items: normalizeSeedData([
      {
        id: 'l1',
        userId: 'user-001',
        year: 2040,
        subject: 'On your 50th birthday',
        body: `Dear 35-year-old me,

I know you're worried about whether you're on the right track. You are. The thing you keep postponing — the trip with the kids, the call to mom, the dinner with friends — those are the moments you'll remember.

You're doing better than you think. The product launch will work, but not the way you expected. The relationships are the work.

A few things I'd tell you:

1. Sleep more. Seriously. The trade-offs you think you're making don't add up.
2. The big risks you took in your late 30s all paid off. Take one more.
3. Stop optimizing your mornings. The best ones are the ones you don't plan.

Yours in time,
You-at-50`,
        createdAt: '2026-05-15T09:00:00Z'
      }
    ]),
  },
];
const seeded = autoSeed(seedPlans, { serviceName: 'genie-future-self' });
if (seeded) console.log('[genie-future-self] demo data seeded');

const server = app.listen(PORT, () => {
  console.log(`🔮 Genie Future Self running on port ${PORT}`);
});
installGracefulShutdown(server);

module.exports = app;