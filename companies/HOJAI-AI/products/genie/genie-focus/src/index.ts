/**
 * FocusOS API — Express server
 * Spec Part 31: FocusOS
 * Port: 4753
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { DeepWorkTracker } from './services/deepWorkTracker.js';
import { findOptimalTimes, generateInsights } from './services/scheduleOptimizer.js';

const PORT = parseInt(process.env.PORT || '4753', 10);
const SERVICE_NAME = 'genie-focus';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, service: SERVICE_NAME });
});

// Schemas
const StartSchema = z.object({
  userId: z.string().min(1),
  category: z.string().min(1),
  notes: z.string().optional(),
});

const EndSchema = z.object({
  quality: z.enum(['excellent', 'good', 'fair', 'poor']),
  interruptions: z.number().min(0).default(0),
});

// GET /api/focus/:userId — Dashboard
app.get('/api/focus/:userId', async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const [stats, insights] = await Promise.all([
      DeepWorkTracker.getStats(userId, 30),
      generateInsights(userId),
    ]);

    res.json({
      success: true,
      data: { stats, insights },
      meta: { userId, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/focus/start — Start focus session
app.post('/api/focus/start', async (req, res, next) => {
  try {
    const data = StartSchema.parse(req.body);
    const session = await DeepWorkTracker.start(data.userId, data.category, data.notes);
    res.json({
      success: true,
      data: session,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/focus/:sessionId/end — End session
app.post('/api/focus/:sessionId/end', async (req, res, next) => {
  try {
    const data = EndSchema.parse(req.body);
    const session = await DeepWorkTracker.end(req.params.sessionId, data.quality, data.interruptions);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      });
    }
    res.json({
      success: true,
      data: session,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/focus/:userId/optimal — Get optimal meeting times
app.get('/api/focus/:userId/optimal', async (req, res, next) => {
  try {
    const times = await findOptimalTimes(req.params.userId);
    res.json({
      success: true,
      data: times,
      meta: { userId: req.params.userId, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/focus/:userId/insights — Get insights
app.get('/api/focus/:userId/insights', async (req, res, next) => {
  try {
    const insights = await generateInsights(req.params.userId);
    res.json({
      success: true,
      data: insights,
      meta: { userId: req.params.userId, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[${SERVICE_NAME}] Error:`, err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL', message: err.message },
  });
});

const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║      ${SERVICE_NAME.toUpperCase()} v1.0.0                 ║
║      FocusOS — Deep work intelligence                      ║
╠══════════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                       ║
║  Status:      RUNNING                                       ║
║  Features:                                                 ║
║    ✓ Focus session tracking                               ║
║    ✓ Quality scoring                                       ║
║    ✓ Optimal time recommendations                          ║
║    ✓ Productivity insights                                  ║
║    ✓ Interruption analysis                                  ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log(`[${SERVICE_NAME}] SIGTERM received`);
  server.close(() => process.exit(0));
});

export default app;