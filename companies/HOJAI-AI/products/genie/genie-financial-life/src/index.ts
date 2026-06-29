/**
 * Financial LifeOS API — Express server
 * Spec Part 27: Financial LifeOS
 * Port: 4747
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { analyzeBurn } from './services/burnAnalyzer.js';
import { checkAffordability } from './services/affordabilityEngine.js';
import { simulate } from './services/futureSimulator.js';

const PORT = parseInt(process.env.PORT || '4747', 10);
const SERVICE_NAME = 'genie-financial-life';

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
const AffordSchema = z.object({
  userId: z.string().min(1),
  item: z.string().min(1),
  cost: z.number().min(0),
  category: z.string().optional(),
});

const SimSchema = z.object({
  userId: z.string().min(1),
  monthlySaving: z.number().min(0),
  years: z.number().min(1).max(50),
  expectedReturn: z.number().min(0).max(1).optional(),
});

// GET /api/financial/:userId — Dashboard
app.get('/api/financial/:userId', async (req, res, next) => {
  try {
    const burn = await analyzeBurn(req.params.userId, 'month');
    res.json({
      success: true,
      data: { burn },
      meta: { userId: req.params.userId, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/financial/:userId/burn — Burn analysis
app.get('/api/financial/:userId/burn', async (req, res, next) => {
  try {
    const period = (req.query.period as 'week' | 'month' | 'quarter' | 'year') || 'month';
    const burn = await analyzeBurn(req.params.userId, period);
    res.json({
      success: true,
      data: burn,
      meta: { userId: req.params.userId, period, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/financial/afford — Can I afford X?
app.post('/api/financial/afford', async (req, res, next) => {
  try {
    const data = AffordSchema.parse(req.body);
    const result = await checkAffordability(data);
    res.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/financial/simulation — Future simulation
app.post('/api/financial/simulation', async (req, res, next) => {
  try {
    const data = SimSchema.parse(req.body);
    const result = await simulate(
      data.userId,
      data.monthlySaving,
      data.years,
      data.expectedReturn
    );
    res.json({
      success: true,
      data: result,
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
║      ${SERVICE_NAME.toUpperCase()} v1.0.0             ║
║      Financial LifeOS — "Can I afford Dubai trip?"       ║
╠══��═══════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                       ║
║  Status:      RUNNING                                       ║
║  Features:                                                 ║
║    ✓ Burn rate analysis (weekly/monthly/quarterly)     ║
║    ✓ Affordability check ("Can I afford X?")            ║
║    ✓ Future simulation (compound interest)              ║
║    ✓ Goal impact analysis                                  ║
║    ✓ Trend detection (increasing/stable/decreasing)      ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log(`[${SERVICE_NAME}] SIGTERM received`);
  server.close(() => process.exit(0));
});

export default app;