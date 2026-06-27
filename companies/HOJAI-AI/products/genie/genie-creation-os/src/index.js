const { requireAuth } = require('@rtmn/shared/auth');
const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { installReadinessRoutes, autoSeed, normalizeSeedData } = require('@rtmn/shared/lib/genie-readiness');
const cors = require('cors');
const helmet = require('helmet');

const contentRoutes = require('./routes/content');
const imageRoutes = require('./routes/image');
const videoRoutes = require('./routes/video');
const documentRoutes = require('./routes/document');
const audioRoutes = require('./routes/audio');
const templatesRoutes = require('./routes/templates');

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


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4298;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use(requireAuth);app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/content', contentRoutes);
app.use('/image', imageRoutes);
app.use('/video', videoRoutes);
app.use('/document', documentRoutes);
app.use('/audio', audioRoutes);
app.use('/templates', templatesRoutes);

// Health check
app.get('/health', (req, res) => { res.json({ status: 'healthy', service: 'Genie', port: PORT }); });
app.get('/', (req, res) => {
  res.json({
    service: 'Genie Creation OS',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    capabilities: [
      '/content - General content generation',
      '/image - AI image generation',
      '/video - Video creation and editing',
      '/document - Document creation (PDF, presentations)',
      '/audio - Text-to-speech, music',
      '/templates - Content templates'
    ]
  });
});

// PersistentMap-backed storage (parallel to in-route Maps; doesn't touch them)
const storage = {
  drafts: new PersistentMap('drafts', { serviceName: 'genie-creation-os' }),
  contentLibrary: new PersistentMap('content-library', { serviceName: 'genie-creation-os' }),
  imagePresets: new PersistentMap('image-presets', { serviceName: 'genie-creation-os' }),
  templates: new PersistentMap('templates', { serviceName: 'genie-creation-os' }),
};
app.locals.storage = storage;

// Seed demo data (idempotent — only fills empty stores)
const seedPlans = [
  {
    store: storage.drafts,
    items: normalizeSeedData([
      { id: 'draft-cr-1', userId: 'user-001', type: 'blog', title: 'Why Genie AI changes everything', status: 'in-progress', updatedAt: '2026-06-20T11:00:00Z' },
      { id: 'draft-cr-2', userId: 'user-002', type: 'social', title: 'Launch tweet thread', status: 'draft', updatedAt: '2026-06-21T09:30:00Z' },
      { id: 'draft-cr-3', userId: 'user-001', type: 'email', title: 'Onboarding sequence #1', status: 'review', updatedAt: '2026-06-22T14:00:00Z' },
      { id: 'draft-cr-4', userId: 'user-003', type: 'blog', title: 'From chef to founder', status: 'published', updatedAt: '2026-06-23T08:15:00Z' },
      { id: 'draft-cr-5', userId: 'user-002', type: 'newsletter', title: 'Weekly product digest', status: 'scheduled', updatedAt: '2026-06-23T16:45:00Z' },
    ]),
  },
  {
    store: storage.contentLibrary,
    items: normalizeSeedData([
      { id: 'content-cr-1', userId: 'user-001', type: 'blog', title: 'Autonomous AI for SMBs', wordCount: 1450, publishedAt: '2026-06-10T10:00:00Z' },
      { id: 'content-cr-2', userId: 'user-002', type: 'video', title: '30-second product teaser', durationSec: 30, publishedAt: '2026-06-12T14:00:00Z' },
      { id: 'content-cr-3', userId: 'user-001', type: 'social', title: 'Customer story: ZestBites', publishedAt: '2026-06-15T09:00:00Z' },
      { id: 'content-cr-4', userId: 'user-003', type: 'document', title: 'Restaurant pricing playbook', pages: 18, publishedAt: '2026-06-17T11:30:00Z' },
      { id: 'content-cr-5', userId: 'user-002', type: 'image', title: 'Brand hero — Q3', prompt: 'Modern office, natural light', publishedAt: '2026-06-19T15:00:00Z' },
    ]),
  },
  {
    store: storage.imagePresets,
    items: normalizeSeedData([
      { id: 'preset-cr-1', name: 'Cinematic', ratio: '16:9', style: 'cinematic', seed: 42 },
      { id: 'preset-cr-2', name: 'Product shot', ratio: '1:1', style: 'studio', seed: 7 },
      { id: 'preset-cr-3', name: 'Social square', ratio: '1:1', style: 'bold', seed: 13 },
      { id: 'preset-cr-4', name: 'Blog header', ratio: '16:9', style: 'editorial', seed: 99 },
    ]),
  },
  {
    store: storage.templates,
    items: normalizeSeedData([
      { id: 'tpl-cr-1', name: 'LinkedIn carousel', type: 'social', sections: 8, popular: true },
      { id: 'tpl-cr-2', name: 'Product launch blog', type: 'blog', sections: 6, popular: true },
      { id: 'tpl-cr-3', name: 'Investor pitch deck', type: 'document', sections: 14, popular: false },
      { id: 'tpl-cr-4', name: 'Podcast show notes', type: 'audio', sections: 5, popular: true },
    ]),
  },
];
const seeded = autoSeed(seedPlans, { serviceName: 'genie-creation-os' });
if (seeded) console.log('[genie-creation-os] demo data seeded');

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

// Readiness routes — /api/llm-health, /api/db-health, /api/readiness
installReadinessRoutes(app, { serviceName: 'genie-creation-os' });



const server = app.listen(PORT, () => {
  console.log(`🎨 Genie Creation OS running on port ${PORT}`);
});
installGracefulShutdown(server);

module.exports = app;