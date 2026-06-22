// ============================================================================
// SUTAR SimulationOS - Main Entry Point
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';

import { MonteCarloEngine } from './services/monteCarlo.js';
import { ScenarioService } from './services/scenarioService.js';
import {
  RunSimulationRequestSchema,
  WhatIfRequestSchema,
  CompareScenariosRequestSchema,
  ListSimulationsQuerySchema,
  IntentPayloadSchema,
  EventPayloadSchema,
} from './validators/simulation.js';
import type {
  ApiResponse,
  HealthResponse,
  SimulationResult,
  SimulationEvent,
} from './types/index.js';

// ============================================================================
// Configuration
// ============================================================================

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4241;
const START_TIME = Date.now();
const API_KEY = process.env.API_KEY || 'sim-dev-key-change-in-production';
const ENVIRONMENT = process.env.NODE_ENV || 'development';

// ============================================================================
// Initialize Services
// ============================================================================

const monteCarloEngine = new MonteCarloEngine();
const scenarioService = new ScenarioService();

// ============================================================================
// Create Express App
// ============================================================================

const app = express();

// ============================================================================
// Security Middleware
// ============================================================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:4200'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, error: 'Too many requests, please try again later', timestamp: new Date().toISOString() },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request timeout
app.use((req: Request, res: Response, next: NextFunction) => {
  const timeout = setTimeout(() => {
    if (!res.writableEnded) {
      res.status(408).json({
        success: false,
        error: 'Request timeout',
        timestamp: new Date().toISOString(),
      });
    }
  }, 30000); // 30 second timeout

  res.on('finish', () => clearTimeout(timeout));
  next();
});

// Parse JSON with size limit
app.use(express.json({ limit: '1mb' }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', requestId);
  req.requestId = requestId;
  next();
});

// ============================================================================
// Logging Middleware
// ============================================================================

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 400 ? 'error' : 'info',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      requestId: (req as any).requestId,
      ip: req.ip,
    }));
  });
  next();
});

// Extend Request type
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

// ============================================================================
// API Response Helper
// ============================================================================

const apiResponse = <T>(success: boolean, data?: T, error?: string, requestId?: string): ApiResponse<T> => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString(),
  requestId,
});

// ============================================================================
// Validation Error Handler
// ============================================================================

const handleZodError = (error: ZodError): string => {
  return error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
};

// ============================================================================
// Health Endpoints
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  const response: HealthResponse = {
    status: 'healthy',
    service: 'sutar-simulation-os',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
  };
  res.json(apiResponse(true, response));
});

app.get('/health/ready', (_req: Request, res: Response) => {
  // Check if service is ready to accept traffic
  const isReady = true; // Add dependency checks here
  if (isReady) {
    res.json(apiResponse(true, { ready: true, timestamp: new Date().toISOString() }));
  } else {
    res.status(503).json(apiResponse(false, { ready: false }, 'Service not ready'));
  }
});

app.get('/health/live', (_req: Request, res: Response) => {
  // Kubernetes liveness probe
  res.json(apiResponse(true, { alive: true, timestamp: new Date().toISOString() }));
});

// ============================================================================
// Info Endpoint
// ============================================================================

app.get('/api/v1/info', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    name: 'sutar-simulation-os',
    description: 'Simulation OS - What-if analysis, Monte Carlo simulation, and scenario testing',
    version: '1.0.0',
    features: [
      'Scenario testing',
      'Impact prediction',
      'Confidence scoring',
      'Monte Carlo simulation',
      'What-if analysis',
      'Risk assessment',
      'Scenario comparison',
    ],
    supportedTypes: [
      'PRICING',
      'OFFER',
      'CASHBACK',
      'BUNDLE',
      'STAFFING',
      'INVENTORY',
      'PROCUREMENT',
      'DEMAND',
      'RISK',
      'CUSTOM',
    ],
    environment: ENVIRONMENT,
  }));
});

// ============================================================================
// Simulation Endpoints
// ============================================================================

/**
 * POST /api/v1/simulations
 * Run a new simulation
 */
app.post('/api/v1/simulations', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validated = RunSimulationRequestSchema.parse(req.body);

    // Create simulation request
    const simulationRequest = {
      name: validated.name,
      type: validated.type,
      parameters: validated.parameters,
      iterations: validated.iterations,
      confidenceLevel: validated.confidenceLevel,
      metadata: validated.metadata,
    };

    // Run simulation
    const result = monteCarloEngine.run(simulationRequest);

    // Store result
    scenarioService.store(result);

    // Publish event (fire and forget)
    publishEvent('SIMULATION_COMPLETED', result);

    res.status(201).json(apiResponse(true, {
      simulationId: result.id,
      status: 'completed',
      result,
    }, undefined, req.requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), req.requestId));
    } else {
      console.error('Simulation error:', error);
      res.status(500).json(apiResponse(false, undefined, String(error), req.requestId));
    }
  }
});

/**
 * GET /api/v1/simulations
 * List all simulations
 */
app.get('/api/v1/simulations', (req: Request, res: Response) => {
  try {
    const validated = ListSimulationsQuerySchema.parse(req.query);

    const simulations = scenarioService.list({
      type: validated.type,
      status: validated.status,
      limit: validated.limit,
      offset: validated.offset,
    });

    const total = scenarioService.count({
      type: validated.type,
      status: validated.status,
    });

    res.json(apiResponse(true, {
      simulations,
      total,
      limit: validated.limit,
      offset: validated.offset,
    }, undefined, req.requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), req.requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), req.requestId));
    }
  }
});

/**
 * GET /api/v1/simulations/:id
 * Get a specific simulation
 */
app.get('/api/v1/simulations/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const simulation = scenarioService.get(id);

  if (!simulation) {
    res.status(404).json(apiResponse(false, undefined, 'Simulation not found', req.requestId));
    return;
  }

  res.json(apiResponse(true, simulation, undefined, req.requestId));
});

/**
 * DELETE /api/v1/simulations/:id
 * Delete a simulation
 */
app.delete('/api/v1/simulations/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const simulation = scenarioService.get(id);

  if (!simulation) {
    res.status(404).json(apiResponse(false, undefined, 'Simulation not found', req.requestId));
    return;
  }

  // Note: In-memory storage, deletion not persistent
  res.json(apiResponse(true, { deleted: id }, undefined, req.requestId));
});

// ============================================================================
// What-If Analysis Endpoints
// ============================================================================

/**
 * POST /api/v1/simulations/:id/whatif
 * Perform what-if analysis on a simulation
 */
app.post('/api/v1/simulations/:id/whatif', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validated = WhatIfRequestSchema.parse(req.body);

    // Override simulationId from params
    const whatIfRequest = {
      simulationId: id,
      variations: validated.variations,
    };

    const analysis = scenarioService.whatIfAnalysis(whatIfRequest.simulationId, whatIfRequest.variations);

    if (!analysis) {
      res.status(404).json(apiResponse(false, undefined, 'Simulation not found', req.requestId));
      return;
    }

    res.json(apiResponse(true, analysis, undefined, req.requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), req.requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), req.requestId));
    }
  }
});

// ============================================================================
// Scenario Comparison Endpoints
// ============================================================================

/**
 * POST /api/v1/simulations/compare
 * Compare multiple simulations
 */
app.post('/api/v1/simulations/compare', (req: Request, res: Response) => {
  try {
    const validated = CompareScenariosRequestSchema.parse(req.body);

    const comparison = scenarioService.compareScenarios(
      validated.simulationIds,
      validated.weights
    );

    if (!comparison) {
      res.status(400).json(apiResponse(false, undefined, 'Need at least 2 valid simulations to compare', req.requestId));
      return;
    }

    res.json(apiResponse(true, comparison, undefined, req.requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), req.requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), req.requestId));
    }
  }
});

// ============================================================================
// Legacy Intent/Event Endpoints
// ============================================================================

app.post('/api/v1/intent', async (req: Request, res: Response) => {
  try {
    const validated = IntentPayloadSchema.parse(req.body);
    const { type, payload } = validated;

    console.log(`[INTENT] ${type}:`, payload);

    // Handle simulation intents
    if (type === 'RUN_SIMULATION') {
      const simulationRequest = {
        name: payload.name as string || 'Intent Simulation',
        type: (payload.type as any) || 'CUSTOM',
        parameters: (payload.parameters as any) || {},
        iterations: payload.iterations as number,
        confidenceLevel: payload.confidenceLevel as number,
      };

      const result = monteCarloEngine.run(simulationRequest);
      scenarioService.store(result);

      res.json(apiResponse(true, {
        intentId: uuidv4(),
        type,
        status: 'completed',
        simulationId: result.id,
        result,
      }, undefined, req.requestId));
      return;
    }

    res.json(apiResponse(true, {
      intentId: uuidv4(),
      type,
      status: 'received',
    }, undefined, req.requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), req.requestId));
    } else {
      res.status(400).json(apiResponse(false, undefined, String(error), req.requestId));
    }
  }
});

app.post('/api/v1/event', async (req: Request, res: Response) => {
  try {
    const validated = EventPayloadSchema.parse(req.body);
    const { type, data } = validated;

    console.log(`[EVENT] ${type}:`, data);

    res.json(apiResponse(true, {
      eventId: uuidv4(),
      type,
      status: 'processed',
    }, undefined, req.requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), req.requestId));
    } else {
      res.status(400).json(apiResponse(false, undefined, String(error), req.requestId));
    }
  }
});

// ============================================================================
// Metrics Endpoint
// ============================================================================

app.get('/metrics', (_req: Request, res: Response) => {
  const simulations = scenarioService.list({ limit: 10000 });
  const completedCount = simulations.filter(s => s.status === 'completed').length;
  const failedCount = simulations.filter(s => s.status === 'failed').length;

  const metrics = {
    simulations_total: simulations.length,
    simulations_completed: completedCount,
    simulations_failed: failedCount,
    uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
    memory_usage_bytes: process.memoryUsage().heapUsed,
  };

  res.setHeader('Content-Type', 'text/plain');
  res.send(Object.entries(metrics)
    .map(([key, value]) => `${key} ${value}`)
    .join('\n'));
});

// ============================================================================
// 404 Handler
// ============================================================================

app.use((_req: Request, res: Response) => {
  res.status(404).json(apiResponse(false, undefined, 'Not found'));
});

// ============================================================================
// Error Handler
// ============================================================================

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json(apiResponse(false, undefined, 'Internal server error'));
});

// ============================================================================
// Event Publishing (Event Bus Integration)
// ============================================================================

async function publishEvent(type: SimulationEvent['type'], data: Partial<SimulationResult>): Promise<void> {
  const event: SimulationEvent = {
    type,
    simulationId: data.id || '',
    timestamp: new Date().toISOString(),
    data,
  };

  // In production, this would publish to the Event Bus
  // For now, just log the event
  console.log(`[EVENT] ${type}:`, JSON.stringify(event));
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

let server: ReturnType<typeof app.listen>;

const shutdown = (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`);

  // Stop accepting new connections
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ============================================================================
// Start Server
// ============================================================================

server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           SUTAR SIMULATION OS v1.0.0                          ║
║════════════════════════════════════════════════════════════════║
║  Port:     ${PORT}                                              ║
║  Env:      ${ENVIRONMENT.padEnd(54)}║
║  Status:   RUNNING                                             ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

export default app;