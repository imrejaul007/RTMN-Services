import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
// ============================================================================
// SUTAR Decision Engine - Main Entry Point
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';

import { DecisionEngine } from './services/decisionEngine.js';
import { PolicyEngine } from './services/policyEngine.js';
import { RiskAssessmentService } from './services/riskAssessment.js';
import { rankOptions, rankerDiagnostics } from './services/optionRanker.js';
import { emit as emitEvent, shutdown as shutdownEvents } from './services/events.js';
import {
  DecisionRequestSchema,
  SimulationRequestSchema,
  HealthCheckQuerySchema,
  StatsQuerySchema,
} from './validators/simulation.js';
import { RankRequestSchema } from './validators/ranking.js';
import type {
  ApiResponse,
  HealthResponse,
  HealthCheckResult,
  Decision,
  DecisionStats,
  SimulationResult,
} from './types/index.js';
import { DecisionType } from './types/index.js';
import * as rezIntel from './rez-intel-client.js';

// ============================================================================
// Configuration
// ============================================================================

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4290;
const START_TIME = Date.now();
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const SIMULATION_OS_URL = process.env.SIMULATION_OS_URL || 'http://localhost:4241';
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error';

// ============================================================================
// Initialize Services
// ============================================================================

const decisionEngine = new DecisionEngine(SIMULATION_OS_URL);
const policyEngine = new PolicyEngine();
const riskAssessmentService = new RiskAssessmentService();

// ============================================================================
// Create Express App
// ============================================================================

const app = express();

// ============================================================================
// Middleware
// ============================================================================

// Security headers
app.use(helmet());

// CORS
app.use(cors());

// Body parsing
app.use(express.json());

// Request ID middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { success: false, error: 'Too many requests, please try again later', timestamp: new Date().toISOString() },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50, // More restrictive for API endpoints
  message: { success: false, error: 'Too many API requests, please try again later', timestamp: new Date().toISOString() },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use('/api/', apiLimiter);

// Structured logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();

  _res.on('finish', () => {
    const duration = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: LOG_LEVEL,
      method: req.method,
      path: req.path,
      status: _res.statusCode,
      duration: `${duration}ms`,
      requestId: req.headers['x-request-id'],
      ip: req.ip,
    };

    if (LOG_LEVEL === 'debug' || _res.statusCode >= 400) {
      console.log(JSON.stringify(logEntry));
    } else if (LOG_LEVEL === 'info') {
      console.log(JSON.stringify({ ...logEntry, level: undefined }));
    }
  });

  next();
});

// ============================================================================
// Helper Functions
// ============================================================================

function apiResponse<T>(success: boolean, data?: T, error?: string, requestId?: string): ApiResponse<T> {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

function handleZodError(error: ZodError): string {
  return error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
}

async function checkSimulationOSHealth(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${SIMULATION_OS_URL}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return {
        status: 'pass',
        latencyMs: Date.now() - start,
        message: 'SimulationOS connected',
      };
    }

    return {
      status: 'warn',
      latencyMs: Date.now() - start,
      message: `SimulationOS returned ${response.status}`,
    };
  } catch {
    return {
      status: 'fail',
      latencyMs: Date.now() - start,
      message: 'SimulationOS unreachable',
    };
  }
}

// ============================================================================
// Health Endpoints
// ============================================================================

// Basic health check
app.get('/health', async (_req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - START_TIME) / 1000);

  const response: HealthResponse = {
    status: 'healthy',
    service: 'sutar-decision-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime,
  };

  res.json(response);
});

// Readiness check (includes dependencies)
app.get('/health/ready', async (_req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - START_TIME) / 1000);
  const simulationOsHealth = await checkSimulationOSHealth();

  const checks: Record<string, HealthCheckResult> = {
    simulationOS: simulationOsHealth,
    policies: {
      status: 'pass',
      message: `Loaded ${policyEngine.getAllPolicies().length} policies`,
    },
    ranker: {
      status: rankerDiagnostics().healthy ? 'pass' : 'fail',
      message: rankerDiagnostics().healthy
        ? 'Multi-option ranker self-test passed'
        : 'Ranker self-test failed',
    },
  };

  const allPassing = Object.values(checks).every(c => c.status === 'pass' || c.status === 'warn');
  const anyFailing = Object.values(checks).some(c => c.status === 'fail');

  const response: HealthResponse = {
    status: allPassing && !anyFailing ? 'healthy' : anyFailing ? 'unhealthy' : 'degraded',
    service: 'sutar-decision-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime,
    checks,
  };

  res.status(anyFailing ? 503 : 200).json(response);
});

// Liveness check (always returns 200 if running)
app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

// ============================================================================
// API Endpoints
// ============================================================================

// Service info
app.get('/api/v1/info', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    name: 'sutar-decision-engine',
    description: 'Decision Engine - Policy evaluation and risk assessment',
    version: '1.0.0',
    port: PORT,
    environment: ENVIRONMENT,
    features: [
      'Policy-based decision engine',
      'Risk assessment with scoring',
      'Condition evaluation (eq, ne, gt, lt, gte, lte, in, contains)',
      'What-if simulation with SimulationOS',
      'Multi-option ranking across cost, time, risk, trust (Phase B.2)',
      '10 decision types: OFFER, CASHBACK, PERSONALIZATION, ROUTING, FRAUD, PRICING, NEXT_ACTION, RETENTION, APPROVAL, RISK',
    ],
    endpoints: {
      decide: 'POST /api/v1/decide',
      simulate: 'POST /api/v1/decide/simulate',
      rank: 'POST /api/v1/rank',
      policies: 'GET /api/v1/policies',
      stats: 'GET /api/v1/stats',
    },
  }));
});

// Main decision endpoint
app.post('/api/v1/decide',requireAuth,  async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;

  try {
    // Validate request
    const validationResult = DecisionRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json(apiResponse(
        false,
        undefined,
        `Validation error: ${handleZodError(validationResult.error)}`,
        requestId
      ));
      return;
    }

    const { context, skipRiskAssessment, overridePolicyId } = validationResult.data;

    console.log(`[DECISION] Request ${requestId}: ${context.decisionType}`, {
      userId: context.userId,
      amount: context.amount,
    });

    // Make decision
    const decision = await decisionEngine.makeDecision({
      context,
      skipRiskAssessment,
      overridePolicyId,
    });

    console.log(`[DECISION] Result ${requestId}: ${decision.outcome} (${decision.riskAssessment.level})`, {
      riskScore: decision.riskAssessment.overallScore,
      confidence: decision.confidence,
      processingTime: `${decision.processingTimeMs}ms`,
    });

    emitEvent(req, 'decision.made', {
      decisionId: decision.id,
      decisionType: context.decisionType,
      outcome: decision.outcome,
      riskLevel: decision.riskAssessment.level,
      riskScore: decision.riskAssessment.overallScore,
      confidence: decision.confidence,
      policyId: decision.policyId,
      processingTimeMs: decision.processingTimeMs,
    });

    res.json(apiResponse(true, decision, undefined, requestId));
  } catch (error) {
    console.error(`[DECISION] Error ${requestId}:`, error);

    res.status(500).json(apiResponse(
      false,
      undefined,
      `Internal error: ${error instanceof Error ? error.message : String(error)}`,
      requestId
    ));
  }
});

// Simulation endpoint
app.post('/api/v1/decide/simulate',requireAuth,  async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;

  try {
    // Validate request
    const validationResult = SimulationRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json(apiResponse(
        false,
        undefined,
        `Validation error: ${handleZodError(validationResult.error)}`,
        requestId
      ));
      return;
    }

    const { context, scenarioVariations, comparePolicies } = validationResult.data;

    console.log(`[SIMULATE] Request ${requestId}: ${scenarioVariations.length} variations`, {
      decisionType: context.decisionType,
      variations: scenarioVariations.map(v => v.name),
    });

    // Run simulation
    const result = await decisionEngine.simulateWithSimulationOS({
      context,
      scenarioVariations,
      comparePolicies,
    });

    console.log(`[SIMULATE] Result ${requestId}: ${result.variations.length} variations analyzed`, {
      baselineOutcome: result.baselineDecision.outcome,
      executionTime: `${result.executionTimeMs}ms`,
    });

    res.json(apiResponse(true, result, undefined, requestId));
  } catch (error) {
    console.error(`[SIMULATE] Error ${requestId}:`, error);

    res.status(500).json(apiResponse(
      false,
      undefined,
      `Internal error: ${error instanceof Error ? error.message : String(error)}`,
      requestId
    ));
  }
});

// ============================================================================
// Multi-Option Ranking (Phase B.2)
// ============================================================================
// Given 2+ options scored on cost/time/risk/trust, return a ranked list
// with per-dimension breakdowns and a confidence score. See
// services/optionRanker.ts for the algorithm.

app.post('/api/v1/rank', requireAuth, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;

  try {
    const validationResult = RankRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json(apiResponse(
        false,
        undefined,
        `Validation error: ${handleZodError(validationResult.error)}`,
        requestId
      ));
      return;
    }

    const { options, weights } = validationResult.data;

    // Extra guard: at least one dimension must have a value across all options
    const anyDimension = options.some(o =>
      o.cost !== undefined || o.time !== undefined ||
      o.risk !== undefined || o.trust !== undefined
    );
    if (!anyDimension) {
      res.status(400).json(apiResponse(
        false,
        undefined,
        'at least one of cost/time/risk/trust must be provided across the options',
        requestId
      ));
      return;
    }

    const result = rankOptions(options, weights);

    console.log(`[RANK] ${requestId}: ${result.ranked.length} options ranked, winner=${result.winner.id} (score=${result.winner.score}, confidence=${result.confidence})`);

    emitEvent(req, 'decision.options.ranked', {
      winnerId: result.winner.id,
      winnerScore: result.winner.score,
      confidence: result.confidence,
      optionCount: result.ranked.length,
      weights,
    });

    res.json(apiResponse(true, result, undefined, requestId));
  } catch (error) {
    console.error(`[RANK] Error ${requestId}:`, error);
    res.status(500).json(apiResponse(
      false,
      undefined,
      `Internal error: ${error instanceof Error ? error.message : String(error)}`,
      requestId
    ));
  }
});

// Get all policies
app.get('/api/v1/policies', (_req: Request, res: Response) => {
  const policies = policyEngine.getAllPolicies();
  res.json(apiResponse(true, {
    policies,
    count: policies.length,
  }));
});

// Get policies by decision type
app.get('/api/v1/policies/:decisionType', (req: Request, res: Response) => {
  const decisionType = req.params.decisionType.toUpperCase() as DecisionType;

  if (!Object.values(DecisionType).includes(decisionType)) {
    res.status(400).json(apiResponse(
      false,
      undefined,
      `Invalid decision type: ${decisionType}. Valid types: ${Object.values(DecisionType).join(', ')}`
    ));
    return;
  }

  const policy = policyEngine.getPolicy(decisionType);

  if (!policy) {
    res.status(404).json(apiResponse(
      false,
      undefined,
      `No policy found for decision type: ${decisionType}`
    ));
    return;
  }

  res.json(apiResponse(true, policy));
});

// Get decision statistics
app.get('/api/v1/stats', (req: Request, res: Response) => {
  const stats = decisionEngine.getStats();
  res.json(apiResponse(true, stats));
});

// Reset statistics
app.post('/api/v1/stats/reset',requireAuth,  (_req: Request, res: Response) => {
  decisionEngine.resetStats();
  res.json(apiResponse(true, { message: 'Statistics reset successfully' }));
});

// Evaluate risk directly
app.post('/api/v1/risk/assess',requireAuth,  (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;

  try {
    const { context } = req.body;

    if (!context) {
      res.status(400).json(apiResponse(
        false,
        undefined,
        'Context is required',
        requestId
      ));
      return;
    }

    const riskAssessment = riskAssessmentService.assess(context);

    emitEvent(req, 'decision.risk.assessed', {
      riskLevel: riskAssessment.level,
      riskScore: riskAssessment.overallScore,
      decisionType: context.decisionType,
      amount: context.amount,
    });

    res.json(apiResponse(true, riskAssessment, undefined, requestId));
  } catch (error) {
    res.status(500).json(apiResponse(
      false,
      undefined,
      `Internal error: ${error instanceof Error ? error.message : String(error)}`,
      requestId
    ));
  }
});

// ============================================================================
// Legacy Endpoints (from stub)
// ============================================================================

app.post('/api/v1/intent',requireAuth,  async (req: Request, res: Response) => {
  try {
    const { type, payload } = req.body;
    console.log(`[INTENT] ${type}:`, payload);
    res.json(apiResponse(true, { intentId: uuidv4(), type, status: 'received' }));
  } catch (e) {
    res.status(400).json(apiResponse(false, undefined, String(e)));
  }
});

app.post('/api/v1/event',requireAuth,  async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;
    console.log(`[EVENT] ${type}:`, data);
    res.json(apiResponse(true, { eventId: uuidv4(), type, status: 'processed' }));
  } catch (e) {
    res.status(400).json(apiResponse(false, undefined, String(e)));
  }
});

// ============================================================================
// Error Handling
// ============================================================================

// ============================================================================
// REZ Intelligence Integration (port 5370)
// Pattern: same as merchant-agents + 7 agents + 7 copilots
// Decision Engine uses these to enrich decision context before deciding.
// MUST be registered BEFORE the 404 catch-all below.
// ============================================================================
app.get('/rez-intel-status', async (_req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({
    rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED,
    rezIntelUrl: rezIntel.REZ_INTEL_URL,
    rezIntelHealthy: isHealthy
  });
});

app.post('/api/enrich', async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body;
  const enriched = await rezIntel.enrichAgentContext({ agentRole, userId, companyId, query, context }).catch(() => null);
  res.json({ enriched, source: enriched ? 'rez-intel' : 'unavailable' });
});

app.post('/api/v1/decide/enriched', async (req, res) => {
  // Decide with REZ Intel context enrichment
  const requestId = req.headers['x-request-id'] as string;
  try {
    const validationResult = DecisionRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validationResult.error)}`, requestId));
      return;
    }
    const { context } = validationResult.data;

    // Enrich with REZ Intel (intent + next-best-action) — fire-and-forget graceful degradation
    const [enriched, intent, nextAction] = await Promise.all([
      rezIntel.enrichAgentContext({
        agentRole: `decision-engine:${context.decisionType}`,
        userId: context.userId,
        companyId: context.userId,
        query: JSON.stringify({ decisionType: context.decisionType, amount: context.amount }),
        context: { decisionType: context.decisionType }
      }).catch(() => null),
      rezIntel.classifyIntent({
        userId: context.userId,
        query: context.decisionType
      }).catch(() => null),
      rezIntel.getNextBestAction({
        agentRole: 'decision-engine',
        userId: context.userId,
        currentAction: context.decisionType
      }).catch(() => null)
    ]);

    const decision = await decisionEngine.makeDecision({
      context,
      skipRiskAssessment: req.body.skipRiskAssessment,
      overridePolicyId: req.body.overridePolicyId
    });

    res.json(apiResponse(true, {
      decision,
      rezIntelContext: {
        enriched: enriched || null,
        intent: intent || null,
        nextBestAction: nextAction || null,
        source: enriched || intent || nextAction ? 'rez-intel' : 'unavailable'
      }
    }, undefined, requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, `Internal error: ${error instanceof Error ? error.message : String(error)}`, requestId));
  }
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json(apiResponse(false, undefined, 'Not found'));
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err);

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json(apiResponse(false, undefined, 'Invalid JSON body'));
    return;
  }

  res.status(500).json(apiResponse(false, undefined, 'Internal server error'));
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

const gracefulShutdown = (signal: string) => {
  console.log(`\n[SHUTDOWN] Received ${signal}, shutting down gracefully...`);

  // Stop accepting new connections
  server.close(async () => {
    console.log('[SHUTDOWN] HTTP server closed');
    try { await shutdownEvents(); } catch (_) { /* ignore */ }
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('[SHUTDOWN] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============================================================================
// Start Server
// ============================================================================
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           SUTAR DECISION ENGINE - Layer 4                        ║
║           "Should We Proceed?"                                  ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:     RUNNING                                           ║
║  Port:        ${PORT}                                              ║
║  Environment: ${ENVIRONMENT.padEnd(42)}║
║  SimulationOS: ${SIMULATION_OS_URL.padEnd(38)}║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                  ║
║    POST   /api/v1/decide        - Make a decision             ║
║    POST   /api/v1/decide/simulate - What-if simulation        ║
║    GET    /api/v1/policies      - List all policies           ║
║    GET    /api/v1/stats         - Decision statistics         ║
║    POST   /api/v1/risk/assess   - Direct risk assessment      ║
║    GET    /health               - Basic health check          ║
║    GET    /health/ready         - Readiness check             ║
║    GET    /health/live          - Liveness check             ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

export default app;
