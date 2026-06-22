// ============================================================================
// SUTAR GoalOS - Main Entry Point
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';

// Services
import { GoalService } from './services/goalService.js';
import { OKRService } from './services/okrService.js';
import { MilestoneService } from './services/milestoneService.js';
import { DecompositionService } from './services/decompositionService.js';
import { ProgressService } from './services/progressService.js';
import { IntegrationService } from './services/integrationService.js';

// Validators
import {
  CreateGoalRequestSchema,
  UpdateGoalRequestSchema,
  ListGoalsQuerySchema,
  DecomposeGoalRequestSchema,
  CreateMilestoneRequestSchema,
  UpdateMilestoneRequestSchema,
  CreateOKRRequestSchema,
  UpdateKeyResultRequestSchema,
  UpdateProgressRequestSchema,
  GetAnalyticsQuerySchema,
  GoalIdParamSchema,
  UpdateObjectiveRequestSchema,
} from './validators/goal.js';

// Types
import type {
  ApiResponse,
  HealthResponse,
  HealthCheckResult,
} from './types/index.js';

// ============================================================================
// Configuration
// ============================================================================

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4242;
const START_TIME = Date.now();
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const DECISION_ENGINE_URL = process.env.DECISION_ENGINE_URL || 'http://localhost:4240';
const SIMULATION_OS_URL = process.env.SIMULATION_OS_URL || 'http://localhost:4241';
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error';

// ============================================================================
// Initialize Services
// ============================================================================

const goalService = new GoalService();
const okrService = new OKRService();
const milestoneService = new MilestoneService();
const integrationService = new IntegrationService(DECISION_ENGINE_URL, SIMULATION_OS_URL);
const decompositionService = new DecompositionService(goalService, integrationService);
const progressService = new ProgressService(goalService, okrService, milestoneService);

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
app.use(express.json({ limit: '1mb' }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', requestId);
  (req as any).requestId = requestId;
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
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 400 ? 'error' : 'info',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      requestId: (req as any).requestId,
      ip: req.ip,
    };

    if (LOG_LEVEL === 'debug' || res.statusCode >= 400) {
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

async function checkDependencyHealth(url: string, name: string): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${url}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return {
        status: 'pass',
        latencyMs: Date.now() - start,
        message: `${name} connected`,
      };
    }

    return {
      status: 'warn',
      latencyMs: Date.now() - start,
      message: `${name} returned ${response.status}`,
    };
  } catch {
    return {
      status: 'fail',
      latencyMs: Date.now() - start,
      message: `${name} unreachable`,
    };
  }
}

// ============================================================================
// Health Endpoints
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  const response: HealthResponse = {
    status: 'healthy',
    service: 'sutar-goal-os',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
  };
  res.json(response);
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - START_TIME) / 1000);

  const [decisionEngine, simulationOs] = await Promise.all([
    checkDependencyHealth(DECISION_ENGINE_URL, 'Decision Engine'),
    checkDependencyHealth(SIMULATION_OS_URL, 'SimulationOS'),
  ]);

  const checks: Record<string, HealthCheckResult> = {
    decisionEngine,
    simulationOs,
    goals: {
      status: 'pass',
      message: `Loaded ${goalService.getStats().total} goals`,
    },
    okrs: {
      status: 'pass',
      message: `Loaded ${okrService.getStats().total} OKR sets`,
    },
  };

  const allPassing = Object.values(checks).every(c => c.status === 'pass' || c.status === 'warn');
  const anyFailing = Object.values(checks).some(c => c.status === 'fail');

  const response: HealthResponse = {
    status: allPassing && !anyFailing ? 'healthy' : anyFailing ? 'unhealthy' : 'degraded',
    service: 'sutar-goal-os',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime,
    checks,
  };

  res.status(anyFailing ? 503 : 200).json(response);
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

// ============================================================================
// API Info Endpoint
// ============================================================================

app.get('/api/v1/info', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    name: 'sutar-goal-os',
    description: 'Goal OS - Goal decomposition, OKR system, and milestone tracking',
    version: '1.0.0',
    port: PORT,
    environment: ENVIRONMENT,
    features: [
      'Goal CRUD operations',
      'Goal decomposition into sub-goals',
      'OKR system (Objectives and Key Results)',
      'Milestone tracking',
      'Progress calculation',
      'Achievement detection',
      'Goal status management',
      'Priority levels',
      'Deadline tracking',
      'Integration with Decision Engine',
      'Integration with SimulationOS',
    ],
    endpoints: {
      goals: {
        list: 'GET /api/v1/goals',
        create: 'POST /api/v1/goals',
        get: 'GET /api/v1/goals/:id',
        update: 'PUT /api/v1/goals/:id',
        delete: 'DELETE /api/v1/goals/:id',
        decompose: 'POST /api/v1/goals/:id/decompose',
        progress: 'GET /api/v1/goals/:id/progress',
        analytics: 'GET /api/v1/goals/:id/analytics',
      },
      okrs: {
        list: 'GET /api/v1/goals/:id/okrs',
        create: 'POST /api/v1/goals/:id/okrs',
        get: 'GET /api/v1/goals/:id/okrs/:okrId',
        update: 'PUT /api/v1/goals/:id/okrs/:okrId',
        delete: 'DELETE /api/v1/goals/:id/okrs/:okrId',
        updateKeyResult: 'PUT /api/v1/goals/:id/okrs/:okrId/key-results/:krId',
      },
      milestones: {
        list: 'GET /api/v1/goals/:id/milestones',
        create: 'POST /api/v1/goals/:id/milestones',
        get: 'GET /api/v1/goals/:id/milestones/:milestoneId',
        update: 'PUT /api/v1/goals/:id/milestones/:milestoneId',
        delete: 'DELETE /api/v1/goals/:id/milestones/:milestoneId',
      },
      stats: 'GET /api/v1/stats',
    },
  }));
});

// ============================================================================
// Goal CRUD Endpoints
// ============================================================================

// List goals
app.get('/api/v1/goals', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;

  try {
    const validated = ListGoalsQuerySchema.parse(req.query);

    const tags = validated.tags ? validated.tags.split(',').map(t => t.trim()) : undefined;

    const result = await goalService.list({
      status: validated.status,
      priority: validated.priority,
      category: validated.category,
      parentGoalId: validated.parentGoalId,
      tags,
      limit: validated.limit,
      offset: validated.offset,
    });

    res.json(apiResponse(true, result, undefined, requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), requestId));
    }
  }
});

// Create goal
app.post('/api/v1/goals', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;

  try {
    const validated = CreateGoalRequestSchema.parse(req.body);

    const goal = await goalService.create(validated);

    console.log(`[GOAL] Created: ${goal.id} - ${goal.title}`);

    res.status(201).json(apiResponse(true, goal, undefined, requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), requestId));
    }
  }
});

// Get goal
app.get('/api/v1/goals/:id', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { id } = req.params;

  try {
    const validated = GoalIdParamSchema.parse({ id });
    const goal = await goalService.get(validated.id);

    if (!goal) {
      res.status(404).json(apiResponse(false, undefined, 'Goal not found', requestId));
      return;
    }

    res.json(apiResponse(true, goal, undefined, requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), requestId));
    }
  }
});

// Update goal
app.put('/api/v1/goals/:id', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { id } = req.params;

  try {
    const validated = GoalIdParamSchema.parse({ id });
    const bodyValidated = UpdateGoalRequestSchema.parse(req.body);

    const goal = await goalService.update(validated.id, bodyValidated);

    if (!goal) {
      res.status(404).json(apiResponse(false, undefined, 'Goal not found', requestId));
      return;
    }

    console.log(`[GOAL] Updated: ${goal.id}`);

    res.json(apiResponse(true, goal, undefined, requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), requestId));
    }
  }
});

// Delete goal
app.delete('/api/v1/goals/:id', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { id } = req.params;

  try {
    const validated = GoalIdParamSchema.parse({ id });
    const deleted = await goalService.delete(validated.id);

    if (!deleted) {
      res.status(404).json(apiResponse(false, undefined, 'Goal not found', requestId));
      return;
    }

    console.log(`[GOAL] Deleted: ${id}`);

    res.json(apiResponse(true, { deleted: id }, undefined, requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), requestId));
    }
  }
});

// ============================================================================
// Goal Decomposition
// ============================================================================

app.post('/api/v1/goals/:id/decompose', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { id } = req.params;

  try {
    const validated = GoalIdParamSchema.parse({ id });
    const bodyValidated = DecomposeGoalRequestSchema.parse(req.body);

    const goal = await goalService.get(validated.id);

    if (!goal) {
      res.status(404).json(apiResponse(false, undefined, 'Goal not found', requestId));
      return;
    }

    const result = await decompositionService.decompose(goal, bodyValidated);

    console.log(`[GOAL] Decomposed: ${goal.id} into ${result.subGoals.length} sub-goals`);

    res.json(apiResponse(true, result, undefined, requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), requestId));
    }
  }
});

// ============================================================================
// Goal Progress
// ============================================================================

app.get('/api/v1/goals/:id/progress', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { id } = req.params;

  try {
    const validated = GoalIdParamSchema.parse({ id });
    const goal = await goalService.get(validated.id);

    if (!goal) {
      res.status(404).json(apiResponse(false, undefined, 'Goal not found', requestId));
      return;
    }

    const progress = await progressService.calculateProgress(goal);

    res.json(apiResponse(true, progress, undefined, requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), requestId));
    }
  }
});

// ============================================================================
// Goal Analytics
// ============================================================================

app.get('/api/v1/goals/:id/analytics', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { id } = req.params;

  try {
    const validated = GoalIdParamSchema.parse({ id });
    const goal = await goalService.get(validated.id);

    if (!goal) {
      res.status(404).json(apiResponse(false, undefined, 'Goal not found', requestId));
      return;
    }

    const analytics = await progressService.getAnalytics(goal);

    res.json(apiResponse(true, analytics, undefined, requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), requestId));
    }
  }
});

// ============================================================================
// OKR Endpoints
// ============================================================================

// List OKRs for a goal
app.get('/api/v1/goals/:id/okrs', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { id } = req.params;

  try {
    const validated = GoalIdParamSchema.parse({ id });
    const goal = await goalService.get(validated.id);

    if (!goal) {
      res.status(404).json(apiResponse(false, undefined, 'Goal not found', requestId));
      return;
    }

    const okrs = await okrService.getByGoal(validated.id);

    res.json(apiResponse(true, { okrs, count: okrs.length }, undefined, requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), requestId));
    }
  }
});

// Create OKR for a goal
app.post('/api/v1/goals/:id/okrs', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { id } = req.params;

  try {
    const validated = GoalIdParamSchema.parse({ id });
    const bodyValidated = CreateOKRRequestSchema.parse(req.body);

    const goal = await goalService.get(validated.id);

    if (!goal) {
      res.status(404).json(apiResponse(false, undefined, 'Goal not found', requestId));
      return;
    }

    const okr = await okrService.create(validated.id, bodyValidated);
    goalService.addOKR(validated.id, okr.id);

    console.log(`[OKR] Created: ${okr.id} for goal ${goal.id}`);

    res.status(201).json(apiResponse(true, okr, undefined, requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), requestId));
    }
  }
});

// Get specific OKR
app.get('/api/v1/goals/:id/okrs/:okrId', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { id, okrId } = req.params;

  try {
    const validated = GoalIdParamSchema.parse({ id });
    const okr = await okrService.get(okrId);

    if (!okr) {
      res.status(404).json(apiResponse(false, undefined, 'OKR not found', requestId));
      return;
    }

    if (okr.goalId !== validated.id) {
      res.status(404).json(apiResponse(false, undefined, 'OKR not found for this goal', requestId));
      return;
    }

    res.json(apiResponse(true, okr, undefined, requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), requestId));
    }
  }
});

// Update OKR objective
app.put('/api/v1/goals/:id/okrs/:okrId', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { id, okrId } = req.params;

  try {
    const validated = GoalIdParamSchema.parse({ id });
    const bodyValidated = UpdateObjectiveRequestSchema.parse(req.body);

    const okr = await okrService.get(okrId);

    if (!okr) {
      res.status(404).json(apiResponse(false, undefined, 'OKR not found', requestId));
      return;
    }

    if (okr.goalId !== validated.id) {
      res.status(404).json(apiResponse(false, undefined, 'OKR not found for this goal', requestId));
      return;
    }

    const updated = await okrService.updateObjective(okr.objective.id, bodyValidated);

    res.json(apiResponse(true, updated, undefined, requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), requestId));
    }
  }
});

// Delete OKR
app.delete('/api/v1/goals/:id/okrs/:okrId', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { id, okrId } = req.params;

  try {
    const validated = GoalIdParamSchema.parse({ id });
    const okr = await okrService.get(okrId);

    if (!okr) {
      res.status(404).json(apiResponse(false, undefined, 'OKR not found', requestId));
      return;
    }

    if (okr.goalId !== validated.id) {
      res.status(404).json(apiResponse(false, undefined, 'OKR not found for this goal', requestId));
      return;
    }

    await okrService.delete(okrId);

    res.json(apiResponse(true, { deleted: okrId }, undefined, requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), requestId));
    }
  }
});

// Update Key Result
app.put('/api/v1/goals/:id/okrs/:okrId/key-results/:krId', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { id, okrId, krId } = req.params;

  try {
    const validated = GoalIdParamSchema.parse({ id });
    const bodyValidated = UpdateKeyResultRequestSchema.parse(req.body);

    const okr = await okrService.get(okrId);

    if (!okr) {
      res.status(404).json(apiResponse(false, undefined, 'OKR not found', requestId));
      return;
    }

    if (okr.goalId !== validated.id) {
      res.status(404).json(apiResponse(false, undefined, 'OKR not found for this goal', requestId));
      return;
    }

    const kr = await okrService.getKeyResult(krId);

    if (!kr) {
      res.status(404).json(apiResponse(false, undefined, 'Key Result not found', requestId));
      return;
    }

    const updated = await okrService.updateKeyResult(krId, bodyValidated);

    res.json(apiResponse(true, updated, undefined, requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), requestId));
    }
  }
});

// ============================================================================
// Milestone Endpoints
// ============================================================================

// List milestones for a goal
app.get('/api/v1/goals/:id/milestones', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { id } = req.params;

  try {
    const validated = GoalIdParamSchema.parse({ id });
    const goal = await goalService.get(validated.id);

    if (!goal) {
      res.status(404).json(apiResponse(false, undefined, 'Goal not found', requestId));
      return;
    }

    const milestones = await milestoneService.getByGoal(validated.id);

    res.json(apiResponse(true, { milestones, count: milestones.length }, undefined, requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), requestId));
    }
  }
});

// Create milestone for a goal
app.post('/api/v1/goals/:id/milestones', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { id } = req.params;

  try {
    const validated = GoalIdParamSchema.parse({ id });
    const bodyValidated = CreateMilestoneRequestSchema.parse(req.body);

    const goal = await goalService.get(validated.id);

    if (!goal) {
      res.status(404).json(apiResponse(false, undefined, 'Goal not found', requestId));
      return;
    }

    const milestone = await milestoneService.create(validated.id, bodyValidated);
    goalService.addMilestone(validated.id, milestone.id);

    console.log(`[MILESTONE] Created: ${milestone.id} for goal ${goal.id}`);

    res.status(201).json(apiResponse(true, milestone, undefined, requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), requestId));
    }
  }
});

// Get specific milestone
app.get('/api/v1/goals/:id/milestones/:milestoneId', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { id, milestoneId } = req.params;

  try {
    const validated = GoalIdParamSchema.parse({ id });
    const milestone = await milestoneService.get(milestoneId);

    if (!milestone) {
      res.status(404).json(apiResponse(false, undefined, 'Milestone not found', requestId));
      return;
    }

    if (milestone.goalId !== validated.id) {
      res.status(404).json(apiResponse(false, undefined, 'Milestone not found for this goal', requestId));
      return;
    }

    res.json(apiResponse(true, milestone, undefined, requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), requestId));
    }
  }
});

// Update milestone
app.put('/api/v1/goals/:id/milestones/:milestoneId', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { id, milestoneId } = req.params;

  try {
    const validated = GoalIdParamSchema.parse({ id });
    const bodyValidated = UpdateMilestoneRequestSchema.parse(req.body);

    const milestone = await milestoneService.get(milestoneId);

    if (!milestone) {
      res.status(404).json(apiResponse(false, undefined, 'Milestone not found', requestId));
      return;
    }

    if (milestone.goalId !== validated.id) {
      res.status(404).json(apiResponse(false, undefined, 'Milestone not found for this goal', requestId));
      return;
    }

    const updated = await milestoneService.update(milestoneId, bodyValidated);

    res.json(apiResponse(true, updated, undefined, requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), requestId));
    }
  }
});

// Delete milestone
app.delete('/api/v1/goals/:id/milestones/:milestoneId', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { id, milestoneId } = req.params;

  try {
    const validated = GoalIdParamSchema.parse({ id });
    const milestone = await milestoneService.get(milestoneId);

    if (!milestone) {
      res.status(404).json(apiResponse(false, undefined, 'Milestone not found', requestId));
      return;
    }

    if (milestone.goalId !== validated.id) {
      res.status(404).json(apiResponse(false, undefined, 'Milestone not found for this goal', requestId));
      return;
    }

    await milestoneService.delete(milestoneId);

    res.json(apiResponse(true, { deleted: milestoneId }, undefined, requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), requestId));
    }
  }
});

// ============================================================================
// Statistics Endpoint
// ============================================================================

app.get('/api/v1/stats', (_req: Request, res: Response) => {
  const goalStats = goalService.getStats();
  const okrStats = okrService.getStats();

  res.json(apiResponse(true, {
    goals: goalStats,
    okrs: okrStats,
  }));
});

// ============================================================================
// Integration Health Endpoint
// ============================================================================

app.get('/api/v1/integrations/health', async (_req: Request, res: Response) => {
  const health = await integrationService.getIntegrationHealth();
  res.json(apiResponse(true, health));
});

// ============================================================================
// Legacy Intent/Event Endpoints
// ============================================================================

app.post('/api/v1/intent', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;

  try {
    const { type, payload } = req.body;
    console.log(`[INTENT] ${type}:`, payload);
    res.json(apiResponse(true, { intentId: uuidv4(), type, status: 'received' }, undefined, requestId));
  } catch (e) {
    res.status(400).json(apiResponse(false, undefined, String(e), requestId));
  }
});

app.post('/api/v1/event', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;

  try {
    const { type, data } = req.body;
    console.log(`[EVENT] ${type}:`, data);
    res.json(apiResponse(true, { eventId: uuidv4(), type, status: 'processed' }, undefined, requestId));
  } catch (e) {
    res.status(400).json(apiResponse(false, undefined, String(e), requestId));
  }
});

// ============================================================================
// Error Handling
// ============================================================================

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

let server: ReturnType<typeof app.listen>;

const gracefulShutdown = (signal: string) => {
  console.log(`\n[SHUTDOWN] Received ${signal}, shutting down gracefully...`);

  if (server) {
    server.close(() => {
      console.log('[SHUTDOWN] HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

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

server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║           SUTAR GOAL OS v1.0.0 - Layer 3                              ║
║           "Goal decomposition, OKRs, and Milestones"                 ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Status:          RUNNING                                              ║
║  Port:            ${PORT}                                                   ║
║  Environment:     ${ENVIRONMENT.padEnd(50)}║
║  Decision Engine: ${DECISION_ENGINE_URL.padEnd(47)}║
║  SimulationOS:     ${SIMULATION_OS_URL.padEnd(47)}║
╠═══════════════════════════════════════════════════════════════════════╣
║  Endpoints:                                                          ║
║    GET/POST    /api/v1/goals           - List/Create goals           ║
║    GET/PUT/DELETE /api/v1/goals/:id    - Get/Update/Delete goal      ║
║    POST        /api/v1/goals/:id/decompose - Decompose goal          ║
║    GET         /api/v1/goals/:id/progress - Get progress             ║
║    GET         /api/v1/goals/:id/analytics - Get analytics           ║
║    GET/POST    /api/v1/goals/:id/okrs  - OKR management              ║
║    GET/POST    /api/v1/goals/:id/milestones - Milestone tracking     ║
║    GET         /api/v1/stats           - Statistics                  ║
║    GET         /health                 - Health check               ║
║    GET         /health/ready          - Readiness check            ║
╚═══════════════════════════════════════════════════════════════════════╝
  `);
});

export default app;