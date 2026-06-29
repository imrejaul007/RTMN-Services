/**
 * Dream Journal API — Express server
 * Spec Part 33: Dream Journal
 * Port: 4754
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { DreamCapture } from './services/dreamCapture.js';
import { detectPatterns } from './services/patternDetector.js';

const PORT = parseInt(process.env.PORT || '4754', 10);
const SERVICE_NAME = 'genie-dreams';

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
const CaptureSchema = z.object({
  userId: z.string().min(1),
  description: z.string().min(1),
  dreamDate: z.string().optional(),
  vividness: z.number().min(1).max(10).optional(),
  lucidity: z.boolean().optional(),
});

// POST /api/dreams/capture — Capture dream
app.post('/api/dreams/capture', async (req, res, next) => {
  try {
    const data = CaptureSchema.parse(req.body);
    const dream = await DreamCapture.capture(
      data.userId,
      data.description,
      data.dreamDate ? new Date(data.dreamDate) : new Date(),
      data.vividness,
      data.lucidity
    );
    res.json({
      success: true,
      data: dream,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dreams/:userId — Get dream history
app.get('/api/dreams/:userId', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const dreams = await DreamCapture.getHistory(req.params.userId, limit);
    res.json({
      success: true,
      data: dreams,
      meta: { count: dreams.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dreams/patterns/:userId — Get pattern insights
app.get('/api/dreams/patterns/:userId', async (req, res, next) => {
  try {
    const insights = await detectPatterns(req.params.userId);
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
║      Dream Journal — Capture, interpret, patterns       ║
╠══════════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                       ║
║  Status:      RUNNING                                       ║
║  Features:                                                 ║
║    ✓ Voice/text dream capture                            ║
║    ✓ AI interpretation (symbols, themes, emotions)     ║
║    ✓ Recurring pattern detection                          ║
║    ✓ Person/location/emotion frequency                    ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log(`[${SERVICE_NAME}] SIGTERM received`);
  server.close(() => process.exit(0));
});

export default app;