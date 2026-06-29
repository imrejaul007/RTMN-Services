/**
 * Ambient Intelligence API — Express server
 * Spec Part 25: Ambient Intelligence
 * Port: 4746
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import Redis from 'ioredis';
import { collectAmbientSignals } from './services/ambientDetector.js';
import { generateAlerts } from './services/alertEngine.js';
import { AmbientAlert } from './types/alert.js';

const PORT = parseInt(process.env.PORT || '4746', 10);
const SERVICE_NAME = 'genie-ambient';
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

// GET /api/ambient/:userId — Get current ambient signals
app.get('/api/ambient/:userId', async (req, res, next) => {
  try {
    const signals = await collectAmbientSignals(req.params.userId);
    res.json({
      success: true,
      data: signals,
      meta: { userId: req.params.userId, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/ambient/alerts/:userId — Get active alerts
app.get('/api/ambient/alerts/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const signals = await collectAmbientSignals(userId);
    const alerts = await generateAlerts(signals);

    // Filter dismissed and expired
    const activeAlerts = alerts.filter(a => {
      if (a.dismissed) return false;
      if (a.expiresAt && new Date(a.expiresAt) < new Date()) return false;
      return true;
    });

    // Store in Redis
    for (const alert of activeAlerts) {
      await redis.set(`alert:${alert.id}`, JSON.stringify(alert));
      await redis.sadd(`user:${userId}:alerts`, alert.id);
    }

    res.json({
      success: true,
      data: activeAlerts,
      meta: {
        count: activeAlerts.length,
        userId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/ambient/check — Force check and generate alerts
app.post('/api/ambient/check', async (req, res, next) => {
  try {
    const schema = z.object({ userId: z.string().min(1) });
    const { userId } = schema.parse(req.body);

    const signals = await collectAmbientSignals(userId);
    const alerts = await generateAlerts(signals);

    res.json({
      success: true,
      data: { signals, alerts },
      meta: { userId, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/ambient/:alertId/dismiss — Dismiss alert
app.post('/api/ambient/:alertId/dismiss', async (req, res, next) => {
  try {
    const alert = await redis.get(`alert:${req.params.alertId}`);
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Alert not found' },
      });
    }

    const parsed: AmbientAlert = JSON.parse(alert);
    parsed.dismissed = true;

    await redis.set(`alert:${req.params.alertId}`, JSON.stringify(parsed));

    res.json({
      success: true,
      data: { dismissed: true },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/ambient/:alertId/act — Mark action taken
app.post('/api/ambient/:alertId/act', async (req, res, next) => {
  try {
    const alert = await redis.get(`alert:${req.params.alertId}`);
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Alert not found' },
      });
    }

    const parsed: AmbientAlert = JSON.parse(alert);
    parsed.actedOn = req.body.actionId || 'unknown';

    await redis.set(`alert:${req.params.alertId}`, JSON.stringify(parsed));

    res.json({
      success: true,
      data: { actedOn: parsed.actedOn },
      meta: { timestamp: new Date().toISOString() },
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
║      ${SERVICE_NAME.toUpperCase()} v1.0.0                  ║
║      Ambient Intelligence — "You look tired"             ║
╠══════════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                       ║
║  Status:      RUNNING                                       ║
║  Features:                                                 ║
║    ✓ Wellness alerts (sleep, energy)                     ║
║    ✓ Relationship alerts (contact gaps)                  ║
║    ✓ Mindfulness reminders (lunch, water, reflect)        ║
║    ✓ Work overload alerts                                  ║
║    ✓ Non-intrusive actions                                  ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log(`[${SERVICE_NAME}] SIGTERM received`);
  server.close(() => process.exit(0));
});

export default app;