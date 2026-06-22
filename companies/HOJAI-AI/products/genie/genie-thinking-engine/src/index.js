/**
 * Genie Thinking Engine - Deep Reasoning & Analysis
 *
 * This service powers Genie's Intelligence OS pillar.
 * It provides:
 * - Deep thinking
 * - Brainstorming
 * - Decision analysis
 * - SWOT analysis
 * - Root cause analysis
 * - First-principles thinking
 * - Scenario simulation
 * - Research assistance
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { requireAuth } from '@rtmn/shared/auth';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

import analysisRoutes from './routes/analysis.js';
import brainstormingRoutes from './routes/brainstorming.js';
import decisionRoutes from './routes/decision.js';
import researchRoutes from './routes/research.js';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4719;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());


app.use(requireAuth);// Storage
const storage = {
  sessions: new PersistentMap('collection-1', { serviceName: 'genie-thinking-engine' }),
  analyses: new PersistentMap('collection-2', { serviceName: 'genie-thinking-engine' }),
  decisions: new PersistentMap('collection-3', { serviceName: 'genie-thinking-engine' })
};

app.locals.storage = storage;

// Routes
app.use('/', analysisRoutes);
app.use('/', brainstormingRoutes);
app.use('/', decisionRoutes);
app.use('/', researchRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'genie-thinking-engine',
    port: PORT,
    version: '1.0.0',
    capabilities: [
      'deep-thinking',
      'brainstorming',
      'decision-analysis',
      'swot-analysis',
      'root-cause',
      'first-principles',
      'scenario-simulation',
      'research'
    ],
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, service: 'genie-thinking-engine' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: err.message });
});

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           GENIE THINKING ENGINE v1.0.0                    ║
║                                                                ║
║  🧠 Deep Reasoning & Analysis                               ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                               ║
║                                                                ║
║  Features:                                                     ║
║  • Deep Thinking                                               ║
║  • Brainstorming                                               ║
║  • Decision Analysis                                           ║
║  • SWOT Analysis                                               ║
║  • Root Cause Analysis                                         ║
║  • First Principles                                            ║
║  • Scenario Simulation                                         ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

export default app;
