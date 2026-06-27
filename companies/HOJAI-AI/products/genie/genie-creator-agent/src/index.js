/**
 * genie-creator-agent — Creator Agent (D5)
 *
 * Content creation workspace: drafts, templates, publishing calendar.
 * Pairs with Marketing OS / Media OS. Helps you ship content consistently.
 *
 * Endpoints:
 *   GET    /health
 *   GET    /
 *   GET    /templates                                  — list all templates
 *   GET    /templates/:templateId                      — template detail
 *   GET    /drafts/by-user/:userId                     — list drafts
 *   POST   /drafts/by-user/:userId                     — create draft
 *   GET    /drafts/:draftId                            — draft detail
 *   PATCH  /drafts/:draftId                            — update draft
 *   DELETE /drafts/:draftId                            — delete draft
 *   POST   /drafts/:draftId/publish                    — mark published
 *   GET    /calendar/by-user/:userId                   — publishing calendar
 *   POST   /calendar/by-user/:userId                   — schedule content
 *   GET    /stats/:userId                              — content stats
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

const creatorRoutes = require('./routes/creator');

requireEnv(['JWT_SECRET']);
const PORT = parseInt(process.env.PORT || '4743', 10);
const SERVICE_NAME = 'genie-creator-agent';

const templatesStore = new PersistentMap('creator-templates', { serviceName: SERVICE_NAME });
const draftsStore = new PersistentMap('creator-drafts', { serviceName: SERVICE_NAME });
const calendarStore = new PersistentMap('creator-calendar', { serviceName: SERVICE_NAME });
const assetsStore = new PersistentMap('creator-assets', { serviceName: SERVICE_NAME });

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
  res.json({ status: 'healthy', service: 'Genie Creator Agent', port: PORT });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Genie Creator Agent',
    tagline: 'Your content studio. Drafts, templates, and a publishing calendar.',
    endpoints: [
      'GET    /templates', 'GET    /templates/:templateId',
      'GET    /drafts/by-user/:userId', 'POST   /drafts/by-user/:userId',
      'GET    /drafts/:draftId', 'PATCH  /drafts/:draftId', 'DELETE /drafts/:draftId',
      'POST   /drafts/:draftId/publish',
      'GET    /calendar/by-user/:userId', 'POST   /calendar/by-user/:userId',
      'GET    /stats/:userId',
    ],
  });
});

app.use(requireAuth);

app.use('/', creatorRoutes({ templatesStore, draftsStore, calendarStore, assetsStore }));

installReadinessRoutes(app, {
  serviceName: SERVICE_NAME,
  stores: [templatesStore, draftsStore, calendarStore, assetsStore],
});

// Seed: 6 templates + 4 drafts + 3 calendar entries
autoSeed([
  {
    store: templatesStore,
    items: normalizeSeedData([
      {
        id: 'tpl-blog', name: 'Blog Post', category: 'long-form',
        description: '1500-2000 word blog post with intro, 3-5 sections, conclusion',
        structure: ['Hook (1 paragraph)', 'Problem statement', 'Main argument (3-5 sections with H2s)', 'Examples/data', 'Conclusion + CTA'],
        exampleTopics: ['How X solves Y', 'Lessons from building Z', 'The future of W'],
        avgLength: 1500,
      },
      {
        id: 'tpl-twitter', name: 'Twitter Thread', category: 'social',
        description: '7-10 tweet thread that teaches one concept',
        structure: ['Tweet 1: Hook + promise', 'Tweets 2-8: One idea per tweet', 'Tweet 9: Summary', 'Tweet 10: CTA + follow'],
        exampleTopics: ['Why most people fail at X', 'A counterintuitive insight about Y', '5 things I learned doing Z'],
        avgLength: 280,
      },
      {
        id: 'tpl-instagram', name: 'Instagram Caption', category: 'social',
        description: '150-300 word caption with hook, story, and CTA',
        structure: ['Hook (1 line)', 'Story or insight (2-3 short paragraphs)', 'Lesson', 'CTA (save/share/comment)'],
        exampleTopics: ['Behind the scenes', 'Day in the life', 'Quick tip'],
        avgLength: 220,
      },
      {
        id: 'tpl-video', name: 'YouTube Video Script', category: 'video',
        description: '8-15 min video script with intro hook, body, and outro',
        structure: ['Cold open (5-10s)', 'Intro (30s) + what we cover', 'Main content (3-5 sections)', 'B-roll notes', 'Outro + subscribe CTA'],
        exampleTopics: ['Tutorial', 'Essay/commentary', 'Vlog', 'Product review'],
        avgLength: 1500,
      },
      {
        id: 'tpl-podcast', name: 'Podcast Episode Outline', category: 'audio',
        description: '30-60 min episode outline with intro, segments, and questions',
        structure: ['Cold open', 'Intro music + show name', 'Guest intro (2 min)', 'Origin story question', 'Main questions (5-7)', 'Lightning round', 'Where to find guest', 'Outro'],
        exampleTopics: ['Founder interview', 'Expert deep-dive', 'Solo episode'],
        avgLength: 600,
      },
      {
        id: 'tpl-newsletter', name: 'Email Newsletter', category: 'email',
        description: '500-800 word newsletter with 3-5 curated items',
        structure: ['Subject line options (3)', 'Personal intro (2-3 sentences)', '3-5 curated items with commentary', 'One deeper dive', 'Sign-off + reply prompt'],
        exampleTopics: ['Weekly roundup', 'Industry digest', 'Personal update + 3 links'],
        avgLength: 600,
      },
    ]),
  },
  {
    store: draftsStore,
    items: normalizeSeedData([
      {
        id: 'dr-1', userId: 'user-001', title: 'Why founders should learn to code',
        templateId: 'tpl-blog', status: 'draft',
        body: 'Draft intro: every great founder I know can code...', wordCount: 23,
        tags: ['startup', 'founder'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: 'dr-2', userId: 'user-001', title: '5 lessons from launching in 30 days',
        templateId: 'tpl-twitter', status: 'in-review',
        body: 'Tweet 1: We launched in 30 days. Here\'s what surprised me...', wordCount: 12,
        tags: ['launch', 'startup'], createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: 'dr-3', userId: 'user-001', title: 'A morning routine that works',
        templateId: 'tpl-instagram', status: 'draft',
        body: 'Hook: The first 60 minutes shape your whole day...', wordCount: 8,
        tags: ['lifestyle'], createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: 'dr-4', userId: 'user-001', title: 'How we hit 1K users in week 1',
        templateId: 'tpl-newsletter', status: 'published',
        body: 'Subject: We hit 1K users in week 1. Here\'s how.', wordCount: 8,
        tags: ['growth'], publishedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
    ]),
  },
  {
    store: calendarStore,
    items: normalizeSeedData([
      {
        id: 'cal-1', userId: 'user-001', title: 'Blog: Why founders should code',
        type: 'publish', channel: 'blog', date: new Date(Date.now() + 2 * 86400000).toISOString(),
        draftId: 'dr-1', status: 'scheduled',
      },
      {
        id: 'cal-2', userId: 'user-001', title: 'Thread: 5 lessons from launching',
        type: 'publish', channel: 'twitter', date: new Date(Date.now() + 4 * 86400000).toISOString(),
        draftId: 'dr-2', status: 'scheduled',
      },
      {
        id: 'cal-3', userId: 'user-001', title: 'Newsletter: 1K users recap',
        type: 'publish', channel: 'email', date: new Date(Date.now() - 3 * 86400000).toISOString(),
        draftId: 'dr-4', status: 'published',
      },
    ]),
  },
]);

const server = app.listen(PORT, () => {
  console.log(`Genie Creator Agent running on port ${PORT}`);
});

installGracefulShutdown(server);
