/**
 * Anticipation Engine API — Express server
 * Spec Part 36: Anticipation Engine
 * Port: 4745
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import Redis from 'ioredis';
import { aggregateContext } from './services/contextAggregator.js';
import { generatePredictions } from './services/predictiveEngine.js';
import { notifyPrediction, notifyAll } from './services/proactiveNotifier.js';

const PORT = parseInt(process.env.PORT || '4745', 10);
const SERVICE_NAME = 'genie-anticipation';
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

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
const PredictSchema = z.object({
  userId: z.string().min(1),
  notify: z.boolean().optional(),
});

const DismissSchema = z.object({
  predictionId: z.string().min(1),
  until: z.string().optional(), // ISO date
});

// GET /api/anticipations/:userId — Get predictions for user
app.get('/api/anticipations/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Aggregate context
    const context = await aggregateContext(userId);

    // Generate predictions
    const allPredictions = await generatePredictions(context);

    // Filter dismissed
    const activePredictions = allPredictions.filter(p => {
      if (p.dismissed) return false;
      if (p.dismissedUntil && new Date(p.dismissedUntil) > new Date()) return false;
      if (p.expiresAt && new Date(p.expiresAt) < new Date()) return false;
      return true;
    });

    res.json({
      success: true,
      data: activePredictions,
      meta: {
        total: allPredictions.length,
        active: activePredictions.length,
        userId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/anticipations/check — Generate fresh predictions
app.post('/api/anticipations/check', async (req, res, next) => {
  try {
    const { userId, notify } = PredictSchema.parse(req.body);

    const context = await aggregateContext(userId);
    const predictions = await generatePredictions(context);

    // Optionally notify
    let notifyResults: Array<{ id: string; sent: boolean }> = [];
    if (notify) {
      notifyResults = await notifyAll(predictions);
    }

    // Store predictions in Redis for later retrieval
    for (const pred of predictions) {
      await redis.set(`prediction:${pred.id}`, JSON.stringify(pred));
      await redis.sadd(`user:${userId}:predictions`, pred.id);
    }

    res.json({
      success: true,
      data: {
        predictions,
        notified: notify ? notifyResults : null,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/anticipations/:id/dismiss — Dismiss prediction
app.post('/api/anticipations/:id/dismiss', async (req, res, next) => {
  try {
    const data = DismissSchema.parse(req.body);

    const pred = await redis.get(`prediction:${data.predictionId}`);
    if (!pred) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Prediction not found' },
      });
    }

    const prediction = JSON.parse(pred);
    prediction.dismissed = true;
    prediction.dismissedUntil = data.until || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await redis.set(`prediction:${data.predictionId}`, JSON.stringify(prediction));

    res.json({
      success: true,
      data: { dismissed: true, until: prediction.dismissedUntil },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/anticipations/:id/act — Mark as acted on
app.post('/api/anticipations/:id/act', async (req, res, next) => {
  try {
    const pred = await redis.get(`prediction:${req.params.id}`);
    if (!pred) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Prediction not found' },
      });
    }

    const prediction = JSON.parse(pred);
    prediction.actedOn = true;
    await redis.set(`prediction:${req.params.id}`, JSON.stringify(prediction));

    res.json({
      success: true,
      data: { actedOn: true },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/anticipations/active/:userId — Get only active (not dismissed, not expired)
app.get('/api/anticipations/active/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const ids = await redis.smembers(`user:${userId}:predictions`);

    if (ids.length === 0) {
      return res.json({ success: true, data: [], meta: { count: 0 } });
    }

    const pipeline = redis.pipeline();
    ids.forEach(id => pipeline.get(`prediction:${id}`));
    const results = await pipeline.exec();

    const now = new Date();
    const predictions = results
      ?.filter(([err, val]) => !err && val)
      ?.map(([_, val]) => JSON.parse(val as string))
      ?.filter((p: any) => {
        if (p.dismissed) return false;
        if (p.dismissedUntil && new Date(p.dismissedUntil) > now) return false;
        if (p.expiresAt && new Date(p.expiresAt) < now) return false;
        return true;
      }) || [];

    res.json({
      success: true,
      data: predictions,
      meta: { count: predictions.length, timestamp: new Date().toISOString() },
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
║      Anticipation Engine — "Flight tomorrow, pack tonight" ║
╠══════════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                       ║
║  Status:      RUNNING                                       ║
║  Features:                                                 ║
║    ✓ Travel predictions (flights, packing)              ║
║    ✓ Follow-up predictions (investors, customers)        ║
║    ✓ Relationship predictions (birthdays, anniversaries)║
║    ✓ Work predictions (deadlines, meetings)             ║
║    ✓ Health predictions (appointments, meds)              ║
║    ✓ Proactive notifications via RAZO                      ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log(`[${SERVICE_NAME}] SIGTERM received`);
  server.close(() => process.exit(0));
});

export default app;