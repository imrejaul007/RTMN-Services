/**
 * Life Simulation API — Express server
 * Spec Part 34: Life Simulation
 * Port: 4752
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { runSimulation } from './services/scenarioBuilder.js';
import { SimulationResult } from '../src/types/simulation.js';
import Redis from 'ioredis';

const PORT = parseInt(process.env.PORT || '4752', 10);
const SERVICE_NAME = 'genie-life-simulation';
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
const SimulateSchema = z.object({
  userId: z.string().min(1),
  scenario: z.string().min(1),
  parameters: z.record(z.unknown()).optional(),
  horizonMonths: z.number().optional(),
});

// POST /api/simulation/run — Run what-if simulation
app.post('/api/simulation/run', async (req, res, next) => {
  try {
    const data = SimulateSchema.parse(req.body);
    const result = await runSimulation(data);

    // Store for later retrieval
    await redis.set(`simulation:${result.scenarioId}`, JSON.stringify(result));

    res.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/simulation/:scenarioId — Get saved scenario
app.get('/api/simulation/:scenarioId', async (req, res, next) => {
  try {
    const data = await redis.get(`simulation:${req.params.scenarioId}`);
    if (!data) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Scenario not found' },
      });
    }

    const result: SimulationResult = JSON.parse(data);
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
║      ${SERVICE_NAME.toUpperCase()} v1.0.0            ║
║      Life Simulation — "What if I move to Dubai?"       ║
╠══════════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                       ║
║  Status:      RUNNING                                       ║
║  Features:                                                 ║
║    ✓ Move scenarios (impact analysis)                   ║
║    ✓ Hiring scenarios (cost/benefit)                    ║
║    ✓ Work hours impact                                     ║
║    ✓ Exercise impact (health)                            ║
║    ✓ Savings projections                                   ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log(`[${SERVICE_NAME}] SIGTERM received`);
  server.close(() => process.exit(0));
});

export default app;