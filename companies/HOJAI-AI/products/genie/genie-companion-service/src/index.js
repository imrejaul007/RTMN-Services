/**
 * Genie Companion Service - Emotional AI, Mood Tracking, Journaling
 *
 * The heart of Genie's personal connection with users.
 * Builds emotional understanding, tracks moods, generates journals,
 * remembers personal stories, and creates a lifelong companion relationship.
 */

import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { installReadinessRoutes, autoSeed, normalizeSeedData } from '@rtmn/shared/lib/genie-readiness';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

import companionRoutes from './routes/companion.js';
import moodRoutes from './routes/mood.js';
import journalRoutes from './routes/journal.js';
import storyRoutes from './routes/story.js';
import emotionRoutes from './routes/emotion.js';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4716;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Auth — protect all routes by default
app.use(requireAuth);

// File-backed storage (survives process restarts)
const storage = {
  moods: new PersistentMap('moods', { serviceName: 'genie-companion-service' }),
  journals: new PersistentMap('journals', { serviceName: 'genie-companion-service' }),
  stories: new PersistentMap('stories', { serviceName: 'genie-companion-service' }),
  emotionalContext: new PersistentMap('emotional-context', { serviceName: 'genie-companion-service' }),
  relationshipLevels: new PersistentMap('relationship-levels', { serviceName: 'genie-companion-service' }),
  conversations: new PersistentMap('conversations', { serviceName: 'genie-companion-service' })
};

// Share storage with routes
app.locals.storage = storage;

// Routes
app.use('/', companionRoutes);
app.use('/mood', moodRoutes);
app.use('/journal', journalRoutes);
app.use('/story', storyRoutes);
app.use('/emotion', emotionRoutes);

// Phase A: persistent store endpoints (for readiness tests)
app.get('/api/companion/conversations', (req, res) => {
  const items = Array.from(storage.conversations.entries()).map(([k, v]) => ({ id: k, ...v }));
  res.json({ total: items.length, conversations: items });
});
app.get('/api/companion/moods', (req, res) => {
  const items = Array.from(storage.moods.entries()).map(([k, v]) => ({ id: k, ...v }));
  res.json({ total: items.length, moods: items });
});
app.get('/api/companion/journals', (req, res) => {
  const items = Array.from(storage.journals.entries()).map(([k, v]) => ({ id: k, ...v }));
  res.json({ total: items.length, journals: items });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'genie-companion-service',
    port: PORT,
    version: '1.0.0',
    capabilities: [
      'emotional-intelligence',
      'mood-tracking',
      'journaling',
      'story-memory',
      'relationship-building',
      'daily-checkins',
      'celebrations',
      'reflection-prompts'
    ],
    timestamp: new Date().toISOString()
  });
});

// Readiness check
app.get('/ready', async (req, res) => {
  const services = {
    companion: true,
    mood: true,
    journal: true,
    story: true,
    emotion: true
  };

  const allReady = Object.values(services).every(s => s);

  res.json({
    ready: allReady,
    services,
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Phase A: production-readiness routes (LLM + DB health + combined) — BEFORE 404 catch-all
installReadinessRoutes(app, { serviceName: 'genie-companion-service' });

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.path
  });
});

// Phase A: idempotent demo-data seeding (conversations + moods + journals)
const seedPlans = [
  {
    store: storage.conversations,
    items: normalizeSeedData([
      { id: 'conv1', userId: 'user-001', topic: 'career-growth', message: 'Thinking about my next role', sentiment: 'reflective', timestamp: '2026-06-22T10:30:00Z' },
      { id: 'conv2', userId: 'user-001', topic: 'morning-checkin', message: 'Feeling rested today', sentiment: 'positive', timestamp: '2026-06-23T07:45:00Z' },
      { id: 'conv3', userId: 'user-002', topic: 'weekend-plans', message: 'Hiking on Saturday?', sentiment: 'excited', timestamp: '2026-06-22T19:15:00Z' },
      { id: 'conv4', userId: 'user-002', topic: 'stress-relief', message: 'Work has been intense', sentiment: 'anxious', timestamp: '2026-06-21T22:00:00Z' },
      { id: 'conv5', userId: 'user-003', topic: 'family', message: 'Mom called — felt warm', sentiment: 'loving', timestamp: '2026-06-23T18:30:00Z' },
    ]),
  },
  {
    store: storage.moods,
    items: normalizeSeedData([
      { id: 'm1', userId: 'user-001', score: 7, note: 'Productive morning', energy: 'medium', tags: ['work', 'focused'] },
      { id: 'm2', userId: 'user-001', score: 5, note: 'Tired after long meeting', energy: 'low', tags: ['work', 'tired'] },
      { id: 'm3', userId: 'user-002', score: 9, note: 'Great workout + sunshine', energy: 'high', tags: ['fitness', 'outdoors'] },
      { id: 'm4', userId: 'user-002', score: 6, note: 'Decent day overall', energy: 'medium', tags: ['neutral'] },
      { id: 'm5', userId: 'user-003', score: 8, note: 'Family dinner — relaxed', energy: 'medium', tags: ['family', 'social'] },
    ]),
  },
  {
    store: storage.journals,
    items: normalizeSeedData([
      { id: 'j1', userId: 'user-001', title: 'A Quiet Sunday', content: 'Read a book, made biryani...', mood: 'peaceful' },
      { id: 'j2', userId: 'user-001', title: 'Code Review Reflections', content: 'Took longer than expected...', mood: 'thoughtful' },
      { id: 'j3', userId: 'user-002', title: 'Sunset Trail', content: 'Hiked Nandi Hills at dawn...', mood: 'energized' },
      { id: 'j4', userId: 'user-002', title: 'Mom\'s Recipe', content: 'Tried her sambar recipe today...', mood: 'nostalgic' },
      { id: 'j5', userId: 'user-003', title: 'Anniversary Dinner', content: 'Five years together...', mood: 'grateful' },
    ]),
  },
];
const seeded = autoSeed(seedPlans, { serviceName: 'genie-companion-service' });
if (seeded) console.log('[genie-companion-service] demo data seeded');

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           GENIE COMPANION SERVICE v1.0.0                      ║
║                                                                ║
║  ❤️  Emotional AI & Personal Connection                       ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                               ║
║                                                                ║
║  Features:                                                     ║
║  • Emotional Intelligence                                      ║
║  • Mood Tracking & Analysis                                    ║
║  • Journal Generation                                          ║
║  • Life Story Memory                                           ║
║  • Relationship Building                                       ║
║  • Daily Check-ins                                             ║
║  • Celebrations & Milestones                                   ║
║  • Reflection Prompts                                          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown — flush all PersistentMaps before exit
installGracefulShutdown(server, async () => {
  await Promise.allSettled([
    storage.moods.flush(),
    storage.journals.flush(),
    storage.stories.flush(),
    storage.emotionalContext.flush(),
    storage.relationshipLevels.flush(),
    storage.conversations.flush(),
  ]);
  Object.values(storage).forEach((m) => m.stopAutoFlush());
});

export default app;
