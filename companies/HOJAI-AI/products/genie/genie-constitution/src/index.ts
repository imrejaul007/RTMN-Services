/**
 * Personal Constitution API — Express server
 * Spec Part 32: Personal Constitution
 * Port: 4743
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { ConstitutionStorage } from './services/constitutionStorage.js';
import { extractValues, extractValuesPattern } from './services/valueExtractor.js';
import { checkAction } from './services/boundaryEnforcer.js';

const PORT = parseInt(process.env.PORT || '4743', 10);
const SERVICE_NAME = 'genie-constitution';

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
const ConstitutionSchema = z.object({
  userId: z.string().min(1),
  always: z.array(z.string()).optional(),
  never: z.array(z.string()).optional(),
  requiresApproval: z.array(z.string()).optional(),
  values: z.array(z.object({
    name: z.string(),
    weight: z.number().min(0).max(1),
    examples: z.array(z.string()).optional(),
  })).optional(),
  ethicsLevel: z.enum(['basic', 'standard', 'strict']).optional(),
});

const CheckSchema = z.object({
  userId: z.string().min(1),
  action: z.string().min(1),
  context: z.string().optional(),
  recipients: z.array(z.string()).optional(),
  amount: z.number().optional(),
  category: z.string().optional(),
});

const ExtractValuesSchema = z.object({
  userId: z.string().min(1),
  text: z.string().min(1),
  context: z.string().optional(),
  addToConstitution: z.boolean().optional(),
});

// GET /api/constitution/:userId — Get constitution
app.get('/api/constitution/:userId', async (req, res, next) => {
  try {
    const constitution = await ConstitutionStorage.getOrDefault(req.params.userId);
    res.json({
      success: true,
      data: constitution,
      meta: { userId: req.params.userId, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/constitution — Create/update
app.post('/api/constitution', async (req, res, next) => {
  try {
    const data = ConstitutionSchema.parse(req.body);
    const existing = await ConstitutionStorage.get(data.userId);

    const constitution = {
      userId: data.userId,
      always: data.always || existing?.always || [],
      never: data.never || existing?.never || [],
      requiresApproval: data.requiresApproval || existing?.requiresApproval || [],
      values: data.values || existing?.values || [],
      ethicsLevel: data.ethicsLevel || existing?.ethicsLevel || 'standard',
      updatedAt: new Date(),
      createdAt: existing?.createdAt || new Date(),
    };

    await ConstitutionStorage.save(constitution);

    res.json({
      success: true,
      data: constitution,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/constitution/check — Check if action allowed
app.post('/api/constitution/check', async (req, res, next) => {
  try {
    const data = CheckSchema.parse(req.body);
    const constitution = await ConstitutionStorage.getOrDefault(data.userId);
    const result = await checkAction(constitution, data);

    res.json({
      success: true,
      data: result,
      meta: { userId: data.userId, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/constitution/values/extract — Extract values from text
app.post('/api/constitution/values/extract', async (req, res, next) => {
  try {
    const data = ExtractValuesSchema.parse(req.body);
    const values = await extractValues(data.text, data.context);

    // Optionally add to constitution
    if (data.addToConstitution && values.length > 0) {
      const constitution = await ConstitutionStorage.getOrDefault(data.userId);

      // Merge values (avoid duplicates)
      const existingNames = new Set(constitution.values.map(v => v.name));
      const newValues = values.filter(v => !existingNames.has(v.name));

      constitution.values = [...constitution.values, ...newValues];
      constitution.updatedAt = new Date();

      await ConstitutionStorage.save(constitution);
    }

    res.json({
      success: true,
      data: { values, addedToConstitution: data.addToConstitution || false },
      meta: { userId: data.userId, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/constitution/:userId/values — Get extracted values
app.get('/api/constitution/:userId/values', async (req, res, next) => {
  try {
    const constitution = await ConstitutionStorage.getOrDefault(req.params.userId);
    res.json({
      success: true,
      data: constitution.values,
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
║      ${SERVICE_NAME.toUpperCase()} v1.0.0               ║
║      Personal Constitution — "What would I never do?"     ║
╠══════════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                       ║
║  Status:      RUNNING                                       ║
║  Features:                                                 ║
║    ✓ Always / Never / RequiresApproval rules            ║
║    ✓ Core values with weights                             ║
║    ✓ Action validation                                     ║
║    ✓ Value extraction from feedback                       ║
║    ✓ Multi-level ethics                                    ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log(`[${SERVICE_NAME}] SIGTERM received`);
  server.close(() => process.exit(0));
});

export default app;