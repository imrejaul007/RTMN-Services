import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

// Types
import {
  ApiResponse,
  HealthResponse,
  EvaluateRequest,
  AssignRequest,
  ConsensusRequest,
  CollaborateRequest,
  Evaluation,
  Task,
  PerformanceReport,
} from './types/index.js';

// Utils
import { logger, generateRequestId } from './utils/logger.js';
import {
  EvaluateRequestSchema,
  AssignRequestSchema,
  ConsensusRequestSchema,
  CollaborateRequestSchema,
  validateRequest,
} from './utils/validation.js';
import { defaultRateLimiter, strictRateLimiter } from './utils/rateLimiter.js';

// Services
import { agentRegistry } from './services/agentRegistry.js';
import { taskManager } from './services/taskManager.js';
import { evaluationService } from './services/evaluationService.js';
import { taskAssignmentService } from './services/taskAssignment.js';
import { consensusService } from './services/consensusService.js';
import { collaborationService } from './services/collaborationService.js';
import { performanceService } from './services/performanceService.js';
import { agentNetworkClient, decisionEngineClient } from './services/externalServices.js';

// Configuration
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4257;
const START_TIME = Date.now();
const SERVICE_VERSION = '1.0.0';

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(defaultRateLimiter.middleware());

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || generateRequestId();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  logger.setRequestId(requestId);
  next();
});

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Response helper
function apiResponse<T>(success: boolean, data?: T, error?: string, requestId?: string): ApiResponse<T> {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

// Error handler
function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json(apiResponse(false, undefined, 'Internal server error'));
}

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const agentNetworkHealthy = await agentNetworkClient.healthCheck();
  const decisionEngineHealthy = await decisionEngineClient.healthCheck();

  const health: HealthResponse = {
    status: 'healthy',
    service: 'sutar-multi-agent-evaluator',
    version: SERVICE_VERSION,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    dependencies: {
      agentNetwork: agentNetworkHealthy ? 'healthy' : 'degraded',
      decisionEngine: decisionEngineHealthy ? 'healthy' : 'degraded',
    },
  };

  res.json(health);
});

// Service info endpoint
app.get('/api/v1/info', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    name: 'sutar-multi-agent-evaluator',
    description: 'Multi-Agent Evaluator Service',
    version: SERVICE_VERSION,
    features: [
      'Multi-agent task coordination',
      'Agent evaluation and scoring',
      'Task assignment algorithms',
      'Performance tracking',
      'Consensus building',
      'Agent collaboration patterns',
      'Agent Network integration (port 4155)',
      'Decision Engine integration (port 4240)',
    ],
    endpoints: [
      'POST /api/v1/evaluate - Evaluate agents',
      'POST /api/v1/assign - Assign task to agents',
      'GET /api/v1/agents/:id/performance - Agent performance',
      'POST /api/v1/consensus - Build consensus',
      'GET /api/v1/tasks/:id/evaluation - Task evaluation',
      'POST /api/v1/collaborate - Start collaboration',
    ],
  }));
});

// POST /api/v1/evaluate - Evaluate agents
app.post('/api/v1/evaluate', strictRateLimiter.middleware(), async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;

  try {
    const validation = validateRequest(EvaluateRequestSchema, req.body);
    if (!validation.success) {
      res.status(400).json(apiResponse(false, undefined, validation.error, requestId));
      return;
    }

    const { agentIds, taskId, criteria } = validation.data as EvaluateRequest;
    logger.info('Evaluating agents', { agentIds, taskId });

    const evaluations = await evaluationService.evaluateAgents({ agentIds, taskId, criteria });

    res.json(apiResponse(true, {
      evaluations,
      summary: evaluationService.compareAgents(agentIds),
    }, undefined, requestId));
  } catch (error) {
    logger.error('Evaluation failed', { error: String(error) });
    res.status(500).json(apiResponse(false, undefined, String(error), requestId));
  }
});

// POST /api/v1/assign - Assign task to agents
app.post('/api/v1/assign', strictRateLimiter.middleware(), async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;

  try {
    const validation = validateRequest(AssignRequestSchema, req.body);
    if (!validation.success) {
      res.status(400).json(apiResponse(false, undefined, validation.error, requestId));
      return;
    }

    const { taskId, preferredAgents, requiredCapabilities, priority } = validation.data as AssignRequest;
    logger.info('Assigning task', { taskId, preferredAgents, requiredCapabilities, priority });

    const result = await taskAssignmentService.assignTask({
      taskId,
      preferredAgents,
      requiredCapabilities,
      priority,
    });

    res.json(apiResponse(true, result, undefined, requestId));
  } catch (error) {
    logger.error('Task assignment failed', { error: String(error) });
    res.status(500).json(apiResponse(false, undefined, String(error), requestId));
  }
});

// GET /api/v1/agents/:id/performance - Agent performance
app.get('/api/v1/agents/:id/performance', async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;
  const { id } = req.params;

  try {
    const agent = agentRegistry.getAgent(id);
    if (!agent) {
      res.status(404).json(apiResponse(false, undefined, 'Agent not found', requestId));
      return;
    }

    const report = performanceService.getPerformanceReport(id);
    if (!report) {
      res.status(500).json(apiResponse(false, undefined, 'Failed to generate performance report', requestId));
      return;
    }

    res.json(apiResponse(true, report, undefined, requestId));
  } catch (error) {
    logger.error('Performance report failed', { error: String(error), agentId: id });
    res.status(500).json(apiResponse(false, undefined, String(error), requestId));
  }
});

// POST /api/v1/consensus - Build consensus
app.post('/api/v1/consensus', strictRateLimiter.middleware(), async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;

  try {
    const validation = validateRequest(ConsensusRequestSchema, req.body);
    if (!validation.success) {
      res.status(400).json(apiResponse(false, undefined, validation.error, requestId));
      return;
    }

    const { taskId, agentIds, decisionType, context } = validation.data as ConsensusRequest;
    logger.info('Building consensus', { taskId, agentIds, decisionType });

    const result = await consensusService.buildConsensus({
      taskId,
      agentIds,
      decisionType,
      context: context || {},
    });

    res.json(apiResponse(true, result, undefined, requestId));
  } catch (error) {
    logger.error('Consensus building failed', { error: String(error) });
    res.status(500).json(apiResponse(false, undefined, String(error), requestId));
  }
});

// GET /api/v1/tasks/:id/evaluation - Task evaluation
app.get('/api/v1/tasks/:id/evaluation', async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;
  const { id } = req.params;

  try {
    const task = taskManager.getTask(id);
    if (!task) {
      res.status(404).json(apiResponse(false, undefined, 'Task not found', requestId));
      return;
    }

    const evaluations = evaluationService.getEvaluationsByTask(id);
    const stats = evaluationService.getEvaluationStatistics();

    res.json(apiResponse(true, {
      task,
      evaluations,
      statistics: stats,
    }, undefined, requestId));
  } catch (error) {
    logger.error('Task evaluation retrieval failed', { error: String(error), taskId: id });
    res.status(500).json(apiResponse(false, undefined, String(error), requestId));
  }
});

// POST /api/v1/collaborate - Start collaboration
app.post('/api/v1/collaborate', strictRateLimiter.middleware(), async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;

  try {
    const validation = validateRequest(CollaborateRequestSchema, req.body);
    if (!validation.success) {
      res.status(400).json(apiResponse(false, undefined, validation.error, requestId));
      return;
    }

    const { taskId, agentIds, maxRounds, strategy } = validation.data as CollaborateRequest;
    logger.info('Starting collaboration', { taskId, agentIds, strategy });

    const session = await collaborationService.startCollaboration({
      taskId,
      agentIds,
      maxRounds,
      strategy,
    });

    res.json(apiResponse(true, session, undefined, requestId));
  } catch (error) {
    logger.error('Collaboration start failed', { error: String(error) });
    res.status(500).json(apiResponse(false, undefined, String(error), requestId));
  }
});

// Additional utility endpoints

// List all agents
app.get('/api/v1/agents', (_req: Request, res: Response) => {
  const agents = agentRegistry.getAllAgents();
  res.json(apiResponse(true, {
    agents,
    total: agents.length,
    available: agentRegistry.getAvailableAgents().length,
  }));
});

// Get specific agent
app.get('/api/v1/agents/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const agent = agentRegistry.getAgent(id);

  if (!agent) {
    res.status(404).json(apiResponse(false, undefined, 'Agent not found'));
    return;
  }

  res.json(apiResponse(true, agent));
});

// List all tasks
app.get('/api/v1/tasks', (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const tasks = status ? taskManager.getTasksByStatus(status as any) : taskManager.getAllTasks();

  res.json(apiResponse(true, {
    tasks,
    total: tasks.length,
    statistics: taskManager.getTaskStatistics(),
  }));
});

// Create task
app.post('/api/v1/tasks', async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;

  try {
    const { type, description, priority, requiredCapabilities } = req.body;

    if (!type || !description || !priority || !requiredCapabilities) {
      res.status(400).json(apiResponse(false, undefined, 'Missing required fields: type, description, priority, requiredCapabilities', requestId));
      return;
    }

    const task = taskManager.createTask(type, description, priority, requiredCapabilities);
    res.status(201).json(apiResponse(true, task, undefined, requestId));
  } catch (error) {
    logger.error('Task creation failed', { error: String(error) });
    res.status(500).json(apiResponse(false, undefined, String(error), requestId));
  }
});

// Get collaboration session
app.get('/api/v1/collaborations/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const session = collaborationService.getSession(id);

  if (!session) {
    res.status(404).json(apiResponse(false, undefined, 'Collaboration session not found'));
    return;
  }

  res.json(apiResponse(true, session));
});

// Get team performance
app.get('/api/v1/team/performance', (_req: Request, res: Response) => {
  const teamPerformance = performanceService.getTeamPerformance();
  res.json(apiResponse(true, teamPerformance));
});

// Get evaluation statistics
app.get('/api/v1/evaluations/statistics', (_req: Request, res: Response) => {
  const stats = evaluationService.getEvaluationStatistics();
  res.json(apiResponse(true, stats));
});

// Abort collaboration session
app.delete('/api/v1/collaborations/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const success = collaborationService.abortSession(id);

  if (!success) {
    res.status(400).json(apiResponse(false, undefined, 'Cannot abort session in current state'));
    return;
  }

  res.json(apiResponse(true, { message: 'Session aborted successfully' }));
});

// Intent endpoint for system integration
app.post('/api/v1/intent', async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;

  try {
    const { type, payload } = req.body;
    logger.info(`[INTENT] ${type}:`, payload);

    // Handle different intent types
    let response: any = { intentId: uuidv4(), type, status: 'received' };

    switch (type) {
      case 'evaluate_agents':
        const evalResult = await evaluationService.evaluateAgents(payload);
        response = { ...response, result: evalResult, status: 'processed' };
        break;
      case 'assign_task':
        const assignResult = await taskAssignmentService.assignTask(payload);
        response = { ...response, result: assignResult, status: 'processed' };
        break;
      case 'build_consensus':
        const consensusResult = await consensusService.buildConsensus(payload);
        response = { ...response, result: consensusResult, status: 'processed' };
        break;
      case 'start_collaboration':
        const collabResult = await collaborationService.startCollaboration(payload);
        response = { ...response, result: collabResult, status: 'processed' };
        break;
    }

    res.json(apiResponse(true, response, undefined, requestId));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error), requestId));
  }
});

// Event endpoint for system integration
app.post('/api/v1/event', async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;

  try {
    const { type, data } = req.body;
    logger.info(`[EVENT] ${type}:`, data);

    // Handle event updates
    if (type === 'task_completed' && data?.taskId && data?.agentId) {
      agentRegistry.recordTaskCompletion(
        data.agentId,
        data.success ?? true,
        data.score ?? 0.8,
        data.responseTime ?? 1000
      );
    }

    res.json(apiResponse(true, { eventId: uuidv4(), type, status: 'processed' }, undefined, requestId));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error), requestId));
  }
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json(apiResponse(false, undefined, 'Not found'));
});

// Error handler middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`SUTAR-MULTI-AGENT-EVALUATOR service started`, {
    port: PORT,
    version: SERVICE_VERSION,
    timestamp: new Date().toISOString(),
  });
  console.log(`SUTAR-MULTI-AGENT-EVALUATOR running on port ${PORT}`);
});

export default app;
