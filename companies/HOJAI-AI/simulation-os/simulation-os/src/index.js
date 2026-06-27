/**
 * RTMN Simulation OS
 *
 * Digital twin simulation and scenario modeling engine.
 * Integrates with unified twin architecture for predictive analysis.
 *
 * Port: 3018
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// Routes
import simulationRoutes from './routes/simulation.js';
import twinRoutes from './routes/twins.js';
import scenarioRoutes from './routes/scenarios.js';
import analyticsRoutes from './routes/analytics.js';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

const PORT = process.env.PORT || 3018;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Simulation Types
export const SIMULATION_TYPES = {
  MONTE_CARLO: 'monte_carlo',
  AGENT_BASED: 'agent_based',
  SYSTEM_DYNAMICS: 'system_dynamics',
  DISCRETE_EVENT: 'discrete_event',
  WHAT_IF: 'what_if'
};

// Twin States
export const TWIN_STATES = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  ARCHIVED: 'archived',
  FAILED: 'failed'
};

// Simulation Status
export const SIMULATION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Time Scales
export const TIME_SCALES = {
  REAL_TIME: 1,
  FAST: 10,
  ULTRA_FAST: 100,
  HYPER: 1000
};

// Scenario Categories
export const SCENARIO_CATEGORIES = {
  GROWTH: 'growth',
  RECESSION: 'recession',
  DISRUPTION: 'disruption',
  OPTIMIZATION: 'optimization',
  RISK: 'risk',
  OPPORTUNITY: 'opportunity'
};

// Twin Registry (connected to unified twin-os)
export const twinRegistry = new Map();

// Simulation Sessions
export const simulationSessions = new Map();

// Built-in Scenarios
export const BUILTIN_SCENARIOS = {
  market_expansion: {
    id: 'market_expansion',
    name: 'Market Expansion',
    description: 'Simulate expanding into new markets',
    category: SCENARIO_CATEGORIES.GROWTH,
    parameters: {
      marketSize: { min: 1000000, max: 100000000, default: 10000000 },
      adoptionRate: { min: 0.01, max: 0.5, default: 0.1 },
      timeHorizon: { min: 1, max: 10, default: 3 }
    }
  },
  cost_optimization: {
    id: 'cost_optimization',
    name: 'Cost Optimization',
    description: 'Optimize operational costs',
    category: SCENARIO_CATEGORIES.OPTIMIZATION,
    parameters: {
      currentCost: { min: 10000, max: 10000000, default: 100000 },
      targetReduction: { min: 0.05, max: 0.5, default: 0.2 },
      implementationTime: { min: 1, max: 24, default: 6 }
    }
  },
  risk_assessment: {
    id: 'risk_assessment',
    name: 'Risk Assessment',
    description: 'Assess operational and market risks',
    category: SCENARIO_CATEGORIES.RISK,
    parameters: {
      riskType: ['operational', 'market', 'financial', 'regulatory'],
      severityWeight: { min: 0.1, max: 1.0, default: 0.5 },
      likelihoodWeight: { min: 0.1, max: 1.0, default: 0.5 }
    }
  },
  demand_forecast: {
    id: 'demand_forecast',
    name: 'Demand Forecast',
    description: 'Forecast product/service demand',
    category: SCENARIO_CATEGORIES.GROWTH,
    parameters: {
      baseDemand: { min: 100, max: 1000000, default: 10000 },
      seasonalityFactor: { min: 0.5, max: 2.0, default: 1.0 },
      trendFactor: { min: -0.2, max: 0.5, default: 0.1 }
    }
  }
};

// Analytics Store
export const analyticsStore = {
  simulations: 0,
  totalRuntime: 0,
  twinUpdates: 0
};

export { logger };

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      duration: Date.now() - start,
      status: res.statusCode
    });
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'simulation-os',
    version: '1.0.0',
    port: PORT,
    sessions: simulationSessions.size,
    twins: twinRegistry.size,
    timestamp: new Date().toISOString()
  });
});

// Readiness probe
app.get('/ready', (req, res) => {
  res.json({ service: 'simulation-os', status: 'ready', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'RTMN Simulation OS',
    version: '1.0.0',
    description: 'Digital twin simulation and scenario modeling engine',
    port: PORT,
    capabilities: [
      'Twin simulation',
      'Scenario modeling',
      'What-if analysis',
      'Monte Carlo simulation',
      'Predictive analytics'
    ],
    endpoints: [
      'GET /api/simulation',
      'POST /api/simulation/run',
      'GET /api/twins',
      'POST /api/twins/create',
      'GET /api/scenarios',
      'POST /api/scenarios/run',
      'GET /api/analytics'
    ]
  });
});

// Routes
app.use('/api/simulation', simulationRoutes);
app.use('/api/twins', twinRoutes);
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Simulation OS running on port ${PORT}`);
  logger.info(`Built-in scenarios: ${Object.keys(BUILTIN_SCENARIOS).length}`);
});

export { app };
