/**
 * Health Intelligence API — Express server
 * Spec Part 28: Health Intelligence
 * Port: 4748
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { analyzeSleep } from './services/sleepOptimizer.js';
import { detectGastricTriggers } from './services/gastricDetector.js';
import { predictBurnout } from './services/burnoutPredictor.js';

const PORT = parseInt(process.env.PORT || '4748', 10);
const SERVICE_NAME = 'genie-health-intelligence';

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

// GET /api/health/:userId — Dashboard
app.get('/api/health/:userId', async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const [sleep, burnout] = await Promise.all([
      analyzeSleep(userId),
      predictBurnout(userId),
    ]);

    res.json({
      success: true,
      data: { sleep, burnout },
      meta: { userId, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/health/:userId/sleep
app.get('/api/health/:userId/sleep', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const insight = await analyzeSleep(req.params.userId, days);
    res.json({
      success: true,
      data: insight,
      meta: { userId: req.params.userId, days, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/health/:userId/gastric
app.get('/api/health/:userId/gastric', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 60;
    const result = await detectGastricTriggers(req.params.userId, days);
    res.json({
      success: true,
      data: result,
      meta: { userId: req.params.userId, days, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/health/:userId/burnout
app.get('/api/health/:userId/burnout', async (req, res, next) => {
  try {
    const risk = await predictBurnout(req.params.userId);
    res.json({
      success: true,
      data: risk,
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
║      ${SERVICE_NAME.toUpperCase()} v1.0.0          ║
║      Health Intelligence — Sleep, Food, Burnout           ║
╠══════════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                       ║
║  Status:      RUNNING                                       ║
║  Features:                                                 ║
║    �� Sleep optimization (trends, quality)               ║
║    ✓ Gastric trigger detection (food → symptoms)        ║
║    ✓ Burnout prediction (multi-factor)                   ║
║    ✓ Energy tracking                                       ║
║    ✓ Personalized recommendations                          ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log(`[${SERVICE_NAME}] SIGTERM received`);
  server.close(() => process.exit(0));
});

export default app;