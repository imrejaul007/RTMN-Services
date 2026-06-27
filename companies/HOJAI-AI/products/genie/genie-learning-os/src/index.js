/**
 * Genie Learning OS - Languages, Business School, Skills
 *
 * This service powers Learning OS pillar:
 * - Languages (7 languages with speaking practice)
 * - Business School (MBA curriculum)
 * - Skills (coding, design, cooking, etc.)
 * - Personalized curriculum
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { requireAuth } from '@rtmn/shared/auth';
import { installReadinessRoutes, autoSeed, normalizeSeedData } from '@rtmn/shared/lib/genie-readiness';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

import languageRoutes from './routes/language.js';
import businessRoutes from './routes/business.js';
import skillsRoutes from './routes/skills.js';
import curriculumRoutes from './routes/curriculum.js';

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
const PORT = process.env.PORT || 4722;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());


app.use(requireAuth);const storage = { enrollments: new PersistentMap('collection-1', { serviceName: 'genie-learning-os' }), progress: new PersistentMap('collection-2', { serviceName: 'genie-learning-os' }) };
app.locals.storage = storage;

// Seed demo data (idempotent — only fills empty stores)
const seedPlans = [
  {
    store: storage.enrollments,
    items: normalizeSeedData([
      { id: 'enroll-ln-1', userId: 'user-001', courseId: 'spanish-101', trackId: 'spanish', enrolledAt: '2026-06-01T10:00:00Z' },
      { id: 'enroll-ln-2', userId: 'user-001', courseId: 'mba-finance', trackId: 'business-school', enrolledAt: '2026-06-05T14:00:00Z' },
      { id: 'enroll-ln-3', userId: 'user-002', courseId: 'react-advanced', trackId: 'skills', enrolledAt: '2026-06-10T09:00:00Z' },
      { id: 'enroll-ln-4', userId: 'user-003', courseId: 'french-101', trackId: 'french', enrolledAt: '2026-06-12T11:30:00Z' },
      { id: 'enroll-ln-5', userId: 'user-002', courseId: 'system-design', trackId: 'skills', enrolledAt: '2026-06-15T15:00:00Z' },
    ]),
  },
  {
    store: storage.progress,
    items: normalizeSeedData([
      { id: 'prog-ln-1', userId: 'user-001', courseId: 'spanish-101', lessonsCompleted: 8, lessonsTotal: 20, lastLessonAt: '2026-06-22T19:00:00Z' },
      { id: 'prog-ln-2', userId: 'user-001', courseId: 'mba-finance', lessonsCompleted: 3, lessonsTotal: 12, lastLessonAt: '2026-06-21T20:00:00Z' },
      { id: 'prog-ln-3', userId: 'user-002', courseId: 'react-advanced', lessonsCompleted: 14, lessonsTotal: 15, lastLessonAt: '2026-06-23T18:00:00Z' },
      { id: 'prog-ln-4', userId: 'user-003', courseId: 'french-101', lessonsCompleted: 1, lessonsTotal: 20, lastLessonAt: '2026-06-18T19:30:00Z' },
    ]),
  },
];
const seeded = autoSeed(seedPlans, { serviceName: 'genie-learning-os' });
if (seeded) console.log('[genie-learning-os] demo data seeded');

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'genie-learning-os',
    port: PORT,
    version: '1.0.0',
    capabilities: ['languages', 'business-school', 'skills', 'curriculum'],
    timestamp: new Date().toISOString()
  });
});
app.get('/ready', (req, res) => res.json({ ready: true }));

app.use('/', languageRoutes);
app.use('/', businessRoutes);
app.use('/', skillsRoutes);
app.use('/', curriculumRoutes);

// Readiness routes — /api/llm-health, /api/db-health, /api/readiness
installReadinessRoutes(app, { serviceName: 'genie-learning-os' });

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           GENIE LEARNING OS v1.0.0                        ║
║                                                                ║
║  📚 Learn Languages, Business, Skills                     ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                               ║
║                                                                ║
║  Features:                                                     ║
║  • 7 Languages with Speaking Practice                         ║
║  • Business School (MBA Curriculum)                          ║
║  • Technical & Life Skills                                   ║
║  • Personalized Learning Paths                                ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

export default app;
