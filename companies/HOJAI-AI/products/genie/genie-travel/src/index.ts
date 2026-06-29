/**
 * TravelOS API — Express server
 * Spec Part 29: TravelOS
 * Port: 4750
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { generatePackingList } from './services/packingAdvisor.js';
import { checkDocuments } from './services/documentTracker.js';
import { createJetLagPlan } from './services/jetLagOptimizer.js';

const PORT = parseInt(process.env.PORT || '4750', 10);
const SERVICE_NAME = 'genie-travel';

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
const PackingSchema = z.object({
  userId: z.string().min(1),
  tripId: z.string().min(1),
  destination: z.string().min(1),
  durationDays: z.number().min(1).max(60),
  purpose: z.string().optional(),
  season: z.enum(['summer', 'winter', 'spring', 'fall']).optional(),
});

const DocsSchema = z.object({
  userId: z.string().min(1),
  destination: z.string().min(1),
  departureDate: z.string().min(1),
});

const JetLagSchema = z.object({
  destination: z.string().min(1),
  departureDate: z.string().min(1),
});

// POST /api/travel/packing — Generate packing list
app.post('/api/travel/packing', async (req, res, next) => {
  try {
    const data = PackingSchema.parse(req.body);
    const result = generatePackingList(data);
    res.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/travel/documents/check — Check documents
app.post('/api/travel/documents/check', async (req, res, next) => {
  try {
    const data = DocsSchema.parse(req.body);
    const result = await checkDocuments(data.userId, data.destination, new Date(data.departureDate));
    res.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/travel/jetlag — Get jet lag plan
app.post('/api/travel/jetlag', async (req, res, next) => {
  try {
    const data = JetLagSchema.parse(req.body);
    const plan = createJetLagPlan(data.destination, new Date(data.departureDate));
    res.json({
      success: true,
      data: plan,
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
║      TravelOS — Pack tonight, flight tomorrow            ║
╠══════════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                       ║
║  Status:      RUNNING                                       ║
║  Features:                                                 ║
║    ✓ Packing list generation (season-aware)            ║
║    ✓ Document check (passport, visa, tickets)          ║
║    ✓ Jet lag adjustment plan                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log(`[${SERVICE_NAME}] SIGTERM received`);
  server.close(() => process.exit(0));
});

export default app;