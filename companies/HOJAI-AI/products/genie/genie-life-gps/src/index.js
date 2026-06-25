/**
 * Genie Life GPS - Goal Tracking & Next Best Action
 *
 * This service powers Life GPS feature:
 * - Goal tracking and progress
 * - Next best action recommendations
 * - Future self analysis
 * - Gap analysis
 * - Milestone celebrations
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

import goalsRoutes from './routes/goals.js';
import gpsRoutes from './routes/gps.js';
import futureRoutes from './routes/future.js';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4721;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());


app.use(requireAuth);// Storage
const storage = {
  lifeGoals: new PersistentMap('collection-1', { serviceName: 'genie-life-gps' }), // userId -> life goals
  milestones: new PersistentMap('collection-2', { serviceName: 'genie-life-gps' }), // userId -> milestones
  recommendations: new PersistentMap('collection-3', { serviceName: 'genie-life-gps' }) // userId -> recommendations
};

app.locals.storage = storage;

// Seed demo data (idempotent — only fills empty stores)
const seedPlans = [
  {
    store: storage.lifeGoals,
    items: normalizeSeedData([
      { id: 'goal-lf-1', userId: 'user-001', title: 'Run a half marathon by Dec 2026', category: 'health', progress: 0.45, targetDate: '2026-12-31' },
      { id: 'goal-lf-2', userId: 'user-001', title: 'Launch v2 of product', category: 'career', progress: 0.65, targetDate: '2026-09-30' },
      { id: 'goal-lf-3', userId: 'user-002', title: 'Save INR 30L for house down payment', category: 'finance', progress: 0.32, targetDate: '2027-03-31' },
      { id: 'goal-lf-4', userId: 'user-003', title: 'Read 24 books this year', category: 'learning', progress: 0.58, targetDate: '2026-12-31' },
      { id: 'goal-lf-5', userId: 'user-002', title: 'Move to senior engineer', category: 'career', progress: 0.20, targetDate: '2027-06-30' },
    ]),
  },
  {
    store: storage.milestones,
    items: normalizeSeedData([
      { id: 'mile-lf-1', userId: 'user-001', goalId: 'goal-lf-2', title: 'Ship beta to 50 customers', reached: true, reachedAt: '2026-06-10T12:00:00Z' },
      { id: 'mile-lf-2', userId: 'user-001', goalId: 'goal-lf-2', title: 'GA launch', reached: false, targetDate: '2026-09-30' },
      { id: 'mile-lf-3', userId: 'user-001', goalId: 'goal-lf-1', title: 'Run 10K in under 60 min', reached: true, reachedAt: '2026-06-15T08:00:00Z' },
      { id: 'mile-lf-4', userId: 'user-002', goalId: 'goal-lf-3', title: 'Save first 10L', reached: true, reachedAt: '2026-05-01T12:00:00Z' },
      { id: 'mile-lf-5', userId: 'user-003', goalId: 'goal-lf-4', title: 'Read 12 books (halfway)', reached: true, reachedAt: '2026-06-20T20:00:00Z' },
    ]),
  },
  {
    store: storage.recommendations,
    items: normalizeSeedData([
      { id: 'rec-lf-1', userId: 'user-001', goalId: 'goal-lf-2', action: 'Block 4 hours Wed/Fri for v2 polish', priority: 'high', createdAt: '2026-06-22T10:00:00Z' },
      { id: 'rec-lf-2', userId: 'user-001', goalId: 'goal-lf-1', action: 'Add a 5K tempo run this week', priority: 'medium', createdAt: '2026-06-22T10:00:00Z' },
      { id: 'rec-lf-3', userId: 'user-002', goalId: 'goal-lf-3', action: 'Automate monthly SIP increase', priority: 'high', createdAt: '2026-06-23T11:00:00Z' },
      { id: 'rec-lf-4', userId: 'user-003', goalId: 'goal-lf-4', action: 'Join a 2-book-a-month challenge', priority: 'low', createdAt: '2026-06-21T09:00:00Z' },
    ]),
  },
];
const seeded = autoSeed(seedPlans, { serviceName: 'genie-life-gps' });
if (seeded) console.log('[genie-life-gps] demo data seeded');

// Routes
app.use('/', goalsRoutes);
app.use('/', gpsRoutes);
app.use('/', futureRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'genie-life-gps',
    port: PORT,
    version: '1.0.0',
    capabilities: [
      'life-goals',
      'next-best-action',
      'future-self',
      'gap-analysis',
      'milestones',
      'progress-tracking',
      'recommendations'
    ],
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, service: 'genie-life-gps' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: err.message });
});

// Readiness routes — /api/llm-health, /api/db-health, /api/readiness
installReadinessRoutes(app, { serviceName: 'genie-life-gps' });

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           GENIE LIFE GPS v1.0.0                            ║
║                                                                ║
║  🧭 Life Navigation & Goal Tracking                       ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                               ║
║                                                                ║
║  Features:                                                     ║
║  • Life Goals & Vision                                        ║
║  • Next Best Action                                           ║
║  • Future Self Analysis                                       ║
║  • Gap Analysis                                               ║
║  • Milestone Tracking                                         ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

export default app;
