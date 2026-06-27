/**
 * genie-research — Research Agent (D2)
 *
 * Personal research assistant. Lets users:
 *   - run a research query (LLM-backed with multi-source synthesis)
 *   - cite the sources used
 *   - save findings as notes/reports
 *   - browse past research by topic
 *
 * Endpoints:
 *   GET    /health
 *   GET    /
 *   POST   /research/query/:userId                  — run a research query (LLM + sources)
 *   GET    /research/list/:userId                   — list past research
 *   GET    /research/get/:researchId                — get full research record
 *   DELETE /research/delete/:researchId/:userId     — delete research
 *   POST   /research/:researchId/save/:userId       — save as note (move to notes store)
 *   GET    /topics/:userId                          — distinct topics
 *   GET    /sources                                 — list seeded source catalog
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

const researchRoutes = require('./routes/research');

requireEnv(['JWT_SECRET']);
const PORT = parseInt(process.env.PORT || '4740', 10);
const SERVICE_NAME = 'genie-research';

const researchStore = new PersistentMap('research-items', { serviceName: SERVICE_NAME });
const sourcesStore = new PersistentMap('research-sources', { serviceName: SERVICE_NAME });

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
  res.json({ status: 'healthy', service: 'Genie Research Agent', port: PORT });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Genie Research Agent',
    tagline: 'Your personal research analyst. Queries → sources → synthesis.',
    endpoints: [
      'POST   /research/query/:userId',
      'GET    /research/list/:userId',
      'GET    /research/get/:researchId',
      'DELETE /research/delete/:researchId/:userId',
      'POST   /research/:researchId/save/:userId',
      'GET    /topics/:userId',
      'GET    /sources',
    ],
  });
});

app.use(requireAuth);

app.use('/', researchRoutes({ researchStore, sourcesStore }));

installReadinessRoutes(app, {
  serviceName: SERVICE_NAME,
  stores: [researchStore, sourcesStore],
});

// Seed: 5 source catalog + 2 sample research items
autoSeed([
  {
    store: sourcesStore,
    items: normalizeSeedData([
      { id: 'src-1', name: 'OpenAlex', type: 'academic', url: 'https://openalex.org', description: '200M+ scholarly works, free API.' },
      { id: 'src-2', name: 'arXiv', type: 'academic', url: 'https://arxiv.org', description: 'Pre-prints in physics, CS, math, biology.' },
      { id: 'src-3', name: 'Wikipedia', type: 'encyclopedia', url: 'https://en.wikipedia.org', description: 'General knowledge baseline.' },
      { id: 'src-4', name: 'PubMed', type: 'medical', url: 'https://pubmed.ncbi.nlm.nih.gov', description: 'Biomedical literature.' },
      { id: 'src-5', name: 'Google Scholar', type: 'academic', url: 'https://scholar.google.com', description: 'Broad academic search.' },
    ]),
  },
  {
    store: researchStore,
    items: normalizeSeedData([
      {
        id: 'rs-1', userId: 'user-001', topic: 'intermittent fasting',
        question: 'What does the evidence say about intermittent fasting for longevity?',
        summary: 'Mixed evidence. Some studies show metabolic benefits (insulin sensitivity, visceral fat) but no conclusive longevity benefit in humans. Animal studies are promising. Most experts recommend a sustainable pattern over fasting extremism.',
        sources: ['src-1', 'src-4', 'src-3'],
        keyPoints: [
          'IF improves insulin sensitivity in short-term studies (Mattson, 2018)',
          'No RCT shows IF extends human lifespan',
          'Animal models (mice) show ~10-20% lifespan extension with caloric restriction',
          'Sustainable eating patterns beat extreme fasting for most people',
        ],
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        source: 'llm',
      },
    ]),
  },
]);

const server = app.listen(PORT, () => {
  console.log(`Genie Research Agent running on port ${PORT}`);
});

installGracefulShutdown(server);