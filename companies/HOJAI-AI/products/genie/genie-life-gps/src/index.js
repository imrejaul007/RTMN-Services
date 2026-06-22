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
