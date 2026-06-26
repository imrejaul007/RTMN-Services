/**
 * Employee Twin Facade - Unified API
 *
 * Single unified API connecting all 4 twin services:
 * - Twin Learning OS (4735)
 * - Twin Feedback OS (4736)
 * - Twin Execution OS (4737)
 * - Salar OS (4710)
 *
 * Port: 4739
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const PORT = parseInt(process.env.PORT || '4739', 10);
const REQUEST_ID_HEADER = 'x-request-id';

// Service URLs
const SERVICES = {
  twinLearningOS: process.env.TWIN_LEARNING_OS_URL || 'http://localhost:4735',
  twinFeedbackOS: process.env.TWIN_FEEDBACK_OS_URL || 'http://localhost:4736',
  twinExecutionOS: process.env.TWIN_EXECUTION_OS_URL || 'http://localhost:4737',
  salarOS: process.env.SALAR_OS_URL || 'http://localhost:4710',
  memoryOS: process.env.MEMORY_OS_URL || 'http://localhost:4703',
};

// Express app
const app = express();

// Types
interface AppError extends Error {
  statusCode?: number;
}

// ============================================================
// MIDDLEWARE
// ============================================================

app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).requestId = req.headers[REQUEST_ID_HEADER] as string || uuidv4();
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

morgan.token('request-id', (req: Request) => (req as any).requestId);
app.use(morgan('combined', {
  skip: (req: Request) => req.url === '/health' || req.url === '/ready',
}));

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function callService(
  serviceName: keyof typeof SERVICES,
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${SERVICES[serviceName]}${path}`;
  const requestId = (options.headers as any)?.['x-request-id'] || uuidv4();

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': requestId,
        ...options.headers,
      },
    });

    if (!response.ok) {
      console.error(`[Facade] ${serviceName} returned ${response.status}: ${path}`);
      return null;
    }

    return await response.json();
  } catch (error: any) {
    console.error(`[Facade] Failed to call ${serviceName}${path}:`, error.message);
    return null;
  }
}

function calculateHealthLevel(score: number): 'new' | 'developing' | 'healthy' {
  if (score < 30) return 'new';
  if (score < 70) return 'developing';
  return 'healthy';
}

// ============================================================
// ERROR HANDLING
// ============================================================

const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = (req as any).requestId;

  console.error(`[Error] ${requestId}:`, {
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    requestId,
  });
};

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

app.use(errorHandler);

// ============================================================
// HEALTH ENDPOINTS
// ============================================================

app.get('/health', async (_req: Request, res: Response) => {
  // Check downstream services
  const [learningHealth, feedbackHealth, executionHealth] = await Promise.all([
    callService('twinLearningOS', '/health'),
    callService('twinFeedbackOS', '/health'),
    callService('twinExecutionOS', '/health'),
  ]);

  const healthyCount = [learningHealth, feedbackHealth, executionHealth]
    .filter(h => h?.status === 'healthy').length;

  res.json({
    status: healthyCount === 3 ? 'healthy' : healthyCount >= 2 ? 'degraded' : 'unhealthy',
    service: 'employee-twin-facade',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    dependencies: {
      twinLearningOS: learningHealth?.status || 'unknown',
      twinFeedbackOS: feedbackHealth?.status || 'unknown',
      twinExecutionOS: executionHealth?.status || 'unknown',
    },
    healthyServices: healthyCount,
    totalServices: 3,
  });
});

app.get('/ready', (_req: Request, res: Response) => {
  res.json({
    ready: true,
    service: 'employee-twin-facade',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// TWIN CONTEXT ENDPOINTS
// ============================================================

// Get complete twin context
app.get('/api/twin/:employeeId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId } = req.params;
    const requestId = (req as any).requestId;

    // Fetch from all services in parallel
    const [health, patterns, tasks, feedback] = await Promise.all([
      callService('twinLearningOS', `/api/health/${employeeId}`, {
        headers: { 'x-request-id': requestId },
      }),
      callService('twinLearningOS', `/api/patterns/${employeeId}`, {
        headers: { 'x-request-id': requestId },
      }),
      callService('twinExecutionOS', `/api/queue/${employeeId}`, {
        headers: { 'x-request-id': requestId },
      }),
      callService('twinFeedbackOS', `/api/confidence/${employeeId}`, {
        headers: { 'x-request-id': requestId },
      }),
    ]);

    // Get employee info from Salar OS
    const employeeInfo = await callService('salarOS', `/api/human-twin/${employeeId}`, {
      headers: { 'x-request-id': requestId },
    });

    const twinContext = {
      employeeId,
      timestamp: new Date().toISOString(),
      health: {
        coverage: health?.data?.coverage || 0,
        score: health?.data?.score || 0,
        level: calculateHealthLevel(health?.data?.score || 0),
        twinsPopulated: health?.data?.twinsPopulated || 0,
        twinsTotal: 9,
      },
      summary: {
        name: employeeInfo?.name || 'Unknown',
        role: employeeInfo?.role || 'Employee',
        level: Math.floor((health?.data?.score || 0) / 20),
        totalPatterns: patterns?.data?.total || 0,
        activeTasks: tasks?.data?.byStatus?.pending || 0,
        pendingFeedback: 0,
        keyStrengths: patterns?.data?.patterns?.slice(0, 3).map((p: any) => p.capability) || [],
        growthAreas: ['Communication', 'Decision Making'],
      },
      stats: {
        totalTasks: tasks?.data?.total || 0,
        completedTasks: tasks?.data?.byStatus?.completed || 0,
        failedTasks: tasks?.data?.byStatus?.failed || 0,
        confidence: feedback?.data?.overallConfidence || 0,
        patternsLearned: patterns?.data?.total || 0,
      },
    };

    res.json({
      success: true,
      data: twinContext,
    });
  } catch (err) {
    next(err);
  }
});

// Get twin health
app.get('/api/twin/:employeeId/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId } = req.params;
    const requestId = (req as any).requestId;

    const health = await callService('twinLearningOS', `/api/health/${employeeId}`, {
      headers: { 'x-request-id': requestId },
    });

    res.json({
      success: true,
      data: {
        employeeId,
        coverage: health?.data?.coverage || 0,
        score: health?.data?.score || 0,
        level: calculateHealthLevel(health?.data?.score || 0),
        twinsPopulated: health?.data?.twinsPopulated || 0,
        twinsTotal: 9,
        recommendations: health?.data?.recommendations || [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get learned patterns
app.get('/api/twin/:employeeId/patterns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId } = req.params;
    const requestId = (req as any).requestId;

    const [learningPatterns, feedbackPatterns] = await Promise.all([
      callService('twinLearningOS', `/api/patterns/${employeeId}`, {
        headers: { 'x-request-id': requestId },
      }),
      callService('twinFeedbackOS', `/api/patterns/${employeeId}`, {
        headers: { 'x-request-id': requestId },
      }),
    ]);

    res.json({
      success: true,
      data: {
        employeeId,
        patterns: {
          learning: learningPatterns?.data?.patterns || [],
          corrections: feedbackPatterns?.data?.patterns || [],
        },
        total: (learningPatterns?.data?.total || 0) + (feedbackPatterns?.data?.total || 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// EVENT & FEEDBACK ENDPOINTS
// ============================================================

// Record learning event
app.post('/api/twin/:employeeId/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId } = req.params;
    const { type, context, choice, reasoning } = req.body;

    if (!type) {
      const error: AppError = new Error('Missing required field: type');
      error.statusCode = 400;
      throw error;
    }

    const requestId = (req as any).requestId;

    const result = await callService('twinLearningOS', '/api/events', {
      method: 'POST',
      headers: { 'x-request-id': requestId },
      body: JSON.stringify({
        employeeId,
        type,
        context,
        choice,
        reasoning,
        timestamp: new Date().toISOString(),
      }),
    });

    res.status(201).json({
      success: true,
      data: {
        eventId: result?.data?.eventId,
        employeeId,
        type,
        processed: true,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Submit feedback
app.post('/api/twin/:employeeId/feedback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId } = req.params;
    const { capability, feedbackType, twinAction, correction, currentConfidence } = req.body;

    if (!capability || !feedbackType) {
      const error: AppError = new Error('Missing required fields: capability, feedbackType');
      error.statusCode = 400;
      throw error;
    }

    const requestId = (req as any).requestId;

    const result = await callService('twinFeedbackOS', '/api/feedback', {
      method: 'POST',
      headers: { 'x-request-id': requestId },
      body: JSON.stringify({
        employeeId,
        capability,
        feedbackType,
        twinAction,
        correction,
        currentConfidence,
      }),
    });

    res.status(201).json({
      success: true,
      data: {
        feedbackId: result?.data?.feedbackId,
        newConfidence: result?.data?.newConfidence,
        twinsUpdated: result?.data?.twinsUpdated,
        patternLearned: result?.data?.patternLearned,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get feedback history
app.get('/api/twin/:employeeId/feedback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId } = req.params;
    const requestId = (req as any).requestId;

    const result = await callService('twinFeedbackOS', `/api/feedback/${employeeId}`, {
      headers: { 'x-request-id': requestId },
    });

    res.json({
      success: true,
      data: result?.data || {
        employeeId,
        totalFeedback: 0,
        byType: {},
        recent: [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// TASK ENDPOINTS
// ============================================================

// Create task
app.post('/api/twin/:employeeId/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId } = req.params;
    const { description, taskType, capability, context, priority } = req.body;

    if (!description || !taskType) {
      const error: AppError = new Error('Missing required fields: description, taskType');
      error.statusCode = 400;
      throw error;
    }

    const requestId = (req as any).requestId;

    const result = await callService('twinExecutionOS', '/api/tasks', {
      method: 'POST',
      headers: { 'x-request-id': requestId },
      body: JSON.stringify({
        employeeId,
        description,
        taskType,
        capability,
        context,
        priority,
      }),
    });

    res.status(201).json({
      success: true,
      data: {
        taskId: result?.data?.taskId,
        status: result?.data?.status,
        autoApprove: result?.data?.autoApprove,
        confidence: result?.data?.confidence,
        requiresApproval: result?.data?.requiresApproval,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get task queue
app.get('/api/twin/:employeeId/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId } = req.params;
    const { status } = req.query;
    const requestId = (req as any).requestId;

    const url = status ? `/api/queue/${employeeId}?status=${status}` : `/api/queue/${employeeId}`;

    const result = await callService('twinExecutionOS', url, {
      headers: { 'x-request-id': requestId },
    });

    res.json({
      success: true,
      data: result?.data || {
        employeeId,
        total: 0,
        byStatus: {},
        tasks: [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// Approve task
app.post('/api/twin/:employeeId/tasks/:taskId/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId, taskId } = req.params;
    const requestId = (req as any).requestId;

    const result = await callService('twinExecutionOS', `/api/tasks/${taskId}/approve`, {
      method: 'POST',
      headers: { 'x-request-id': requestId },
    });

    res.json({
      success: true,
      data: result?.data,
    });
  } catch (err) {
    next(err);
  }
});

// Reject task
app.post('/api/twin/:employeeId/tasks/:taskId/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId, taskId } = req.params;
    const { reason } = req.body;
    const requestId = (req as any).requestId;

    const result = await callService('twinExecutionOS', `/api/tasks/${taskId}/reject`, {
      method: 'POST',
      headers: { 'x-request-id': requestId },
      body: JSON.stringify({ reason }),
    });

    res.json({
      success: true,
      data: result?.data,
    });
  } catch (err) {
    next(err);
  }
});

// Get execution history
app.get('/api/twin/:employeeId/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId } = req.params;
    const { days = '7' } = req.query;
    const requestId = (req as any).requestId;

    const result = await callService('twinExecutionOS', `/api/history/${employeeId}?days=${days}`, {
      headers: { 'x-request-id': requestId },
    });

    res.json({
      success: true,
      data: result?.data || {
        employeeId,
        period: `${days} days`,
        totalTasks: 0,
        completed: 0,
        failed: 0,
        tasks: [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// CAPABILITY ENDPOINTS
// ============================================================

// Get capability breakdown
app.get('/api/twin/:employeeId/capabilities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId } = req.params;
    const requestId = (req as any).requestId;

    const [confidence, salarCapabilities] = await Promise.all([
      callService('twinFeedbackOS', `/api/confidence/${employeeId}`, {
        headers: { 'x-request-id': requestId },
      }),
      callService('salarOS', `/api/human-twin/${employeeId}/capabilities`, {
        headers: { 'x-request-id': requestId },
      }),
    ]);

    res.json({
      success: true,
      data: {
        employeeId,
        capabilities: confidence?.data?.capabilities || [],
        overallConfidence: confidence?.data?.overallConfidence || 0,
        totalFeedback: confidence?.data?.totalFeedback || 0,
        skillProfiles: salarCapabilities?.data?.capabilities || [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get RLHF training data
app.get('/api/twin/:employeeId/rlhf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId } = req.params;
    const requestId = (req as any).requestId;

    const result = await callService('twinFeedbackOS', `/api/rlhf/${employeeId}`, {
      headers: { 'x-request-id': requestId },
    });

    res.json({
      success: true,
      data: result?.data || {
        employeeId,
        trainingExamples: 0,
        examples: [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

let server: any;

const gracefulShutdown = (signal: string) => {
  console.log(`\n[${signal}] Received shutdown signal...`);
  console.log('[Facade] Closing server gracefully...');

  if (server) {
    server.close(() => {
      console.log('[Facade] Server closed successfully');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('[Facade] Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Facade] Unhandled Rejection at:', promise, 'reason:', reason);
});

// ============================================================
// START SERVER
// ============================================================

server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              Employee Twin Facade - Started                  ║
╠═══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}
║  Connected Services:                                       ║
║    - Twin Learning OS (4735)                               ║
║    - Twin Feedback OS (4736)                               ║
║    - Twin Execution OS (4737)                              ║
║    - Salar OS (4710)                                       ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
