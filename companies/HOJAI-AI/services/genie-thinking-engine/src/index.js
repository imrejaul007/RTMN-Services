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
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

import analysisRoutes from './routes/analysis.js';
import brainstormingRoutes from './routes/brainstorming.js';
import decisionRoutes from './routes/decision.js';
import researchRoutes from './routes/research.js';

const app = express();
const PORT = process.env.PORT || 4719;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Storage
const storage = {
  sessions: new Map(),
  analyses: new Map(),
  sessions: new Map()
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

app.listen(PORT, () => {
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

export default app;
