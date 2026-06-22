/**
 * Hojai Flow Service - Voice-First AI Companion
 *
 * 5 Core Capabilities:
 * 1. Talk Naturally (Voice)
 * 2. Remembers Everything (Brain)
 * 3. Finds Instantly (Search)
 * 4. Performs Actions (Smart Actions)
 * 5. Learns Your Style (Persona)
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';

import personaRoutes from './routes/persona.js';
import brainRoutes from './routes/brain.js';
import actionsRoutes from './routes/actions.js';
import memoryRoutes from './routes/memory.js';
import organizationRoutes from './routes/organization.js';
import flowRuntimeRoutes from './routes/flowRuntime.js';
import intentRoutes from './routes/intent.js';

const app = express();
const PORT = parseInt(process.env.PORT || '4580', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-flow';

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '10mb' }));

// Health
app.get('/health', (_: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'hojai-flow',
    version: '1.0.0',
    capabilities: [
      'Talk Naturally',
      'Remembers Everything',
      'Finds Instantly',
      'Performs Actions',
      'Learns Your Style',
    ],
    timestamp: new Date().toISOString(),
  });
});

// Routes
// Personas - Personal/Org identity
app.use('/api/personas', personaRoutes);

// Brain - Contacts, Projects, Decisions
app.use('/api/brain', brainRoutes);

// Actions - Smart Actions & Approvals
app.use('/api/actions', actionsRoutes);

// Memory - Simplified memory types
app.use('/api/memory', memoryRoutes);

// Organization - Org knowledge, policies, products
app.use('/api/organizations', organizationRoutes);

// Flow Runtime - Action execution, persona routing
app.use('/api/flow', flowRuntimeRoutes);

// Intent - Intent detection, suggestions
app.use('/api/intent', intentRoutes);

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error('[HojaiFlow] Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal error' : err.message,
  });
});

// Start
async function start() {
  console.log('[HojaiFlow] Starting service...');
  console.log('[HojaiFlow] Capabilities: Talk, Remember, Search, Act, Learn');

  await mongoose.connect(MONGODB_URI);
  console.log('[MongoDB] Connected');

  app.listen(PORT, () => {
    console.log(`[HojaiFlow] Running on port ${PORT}`);
  });
}

start().catch(console.error);

export default app;
