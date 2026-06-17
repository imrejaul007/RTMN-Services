// ============================================================================
// BOA OS - Strategy Layer (Port 4100)
// Main Express Server Entry Point
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { authMiddleware, optionalAuth } from './middleware/auth';
import { apiRateLimit } from './middleware/rateLimit';
import { eventBus } from './utils/eventBus';

import strategyRoutes from './routes/strategy';
import objectiveRoutes from './routes/objective';
import roadmapRoutes from './routes/roadmap';
import kpiRoutes from './routes/kpi';
import alignmentRoutes from './routes/alignment';

import { goalSyncService } from './services/goalSync';
import { strategicAlignmentService } from './services/strategicAlignment';
import { strategyEngine } from './services/strategyEngine';
import { objectiveService } from './services/objectiveService';

const app = express();
const START_TIME = Date.now();

// ============================================================================
// Middleware
// ============================================================================
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);

// Strict Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));

// Strict CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (origin, cb) => origin && ALLOWED_ORIGINS.includes(origin) ? cb(null, true) : cb(new Error('Not allowed'))
    : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Internal-Token'],
  maxAge: 86400,
}));

app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

// Request ID Tracing
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// Global rate limiting
app.use(apiRateLimit);

// ============================================================================
// Health & Info Endpoints (Public)
// ============================================================================
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: config.serviceName,
    version: config.version,
    environment: config.environment,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1/info', optionalAuth, (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      name: config.serviceName,
      description: 'BOA OS - Strategy Layer (Above SUTAR OS) - transforms high-level business objectives into executable plans synced to SUTAR OS GoalOS',
      version: config.version,
      layer: 'Strategy',
      architecture: 'BOA-OS → SUTAR-OS',
      features: [
        'Vision/Mission/Strategy management',
        'Strategic Pillars with themes',
        'OKR/Objectives with Key Results',
        'Roadmap with Milestones',
        'KPI tracking with auto-status',
        'SWOT analysis generation',
        'Strategic alignment assessment',
        'Goal sync to SUTAR GoalOS',
        'Real-time progress reporting',
        'Multi-business-unit alignment',
        'Event-driven updates',
      ],
      endpoints: {
        strategy: '/api/v1/strategy',
        objective: '/api/v1/objective',
        roadmap: '/api/v1/roadmap',
        kpi: '/api/v1/kpi',
        alignment: '/api/v1/alignment',
        sync: '/api/v1/sync',
      },
      externalServices: {
        sutarGoalOS: config.sutarGoalOSUrl,
        sutarDecisionEngine: config.sutarDecisionEngineUrl,
        eventBus: config.eventBusUrl,
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// API Routes (All require authentication)
// ============================================================================
app.use('/api/v1/strategy', authMiddleware, strategyRoutes);
app.use('/api/v1/objective', authMiddleware, objectiveRoutes);
app.use('/api/v1/roadmap', authMiddleware, roadmapRoutes);
app.use('/api/v1/kpi', authMiddleware, kpiRoutes);
app.use('/api/v1/alignment', authMiddleware, alignmentRoutes);

// ============================================================================
// Sync Endpoint - Bridge to SUTAR OS (Authenticated)
// ============================================================================
app.post('/api/v1/sync/objective/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const objective = objectiveService.getById(req.params.id);
    const result = await goalSyncService.syncObjective(objective);
    if (result.status === 'synced') {
      objectiveService.update(objective.id, { sutarGoalId: result.sutarGoalId });
    }
    res.json({ success: result.status !== 'failed', data: result, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

app.post('/api/v1/sync/strategy/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const strategy = strategyEngine.getStrategy(req.params.id);
    if (!strategy) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Strategy not found' }, timestamp: new Date().toISOString() });
    const objectives = strategyEngine.getObjectivesByStrategy(strategy.id);
    const results = await goalSyncService.syncStrategy(strategy, objectives);
    const successful = results.filter(r => r.status === 'synced');
    successful.forEach(r => {
      const obj = objectives.find(o => o.id === r.objectiveId);
      if (obj) obj.sutarGoalId = r.sutarGoalId;
    });
    res.json({
      success: true,
      data: { strategyId: strategy.id, total: results.length, synced: successful.length, failed: results.filter(r => r.status === 'failed').length, results },
      timestamp: new Date().toISOString(),
    });
  } catch (error) { next(error); }
});

app.post('/api/v1/sync/progress/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const objective = objectiveService.getById(req.params.id);
    const success = await goalSyncService.pushProgressUpdate(objective);
    res.json({ success, data: { objectiveId: objective.id, progress: objective.progress }, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

// ============================================================================
// Combined Insights Endpoint (Authenticated)
// ============================================================================
app.get('/api/v1/insights', authMiddleware, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const objectiveSummary = objectiveService.getProgressSummary();
    const alignmentAggregate = strategicAlignmentService.getAggregateAlignment();
    const allStrategies = strategyEngine.getAllStrategies();
    res.json({
      success: true,
      data: {
        strategies: { total: allStrategies.length, active: allStrategies.filter(s => s.status === 'active').length, draft: allStrategies.filter(s => s.status === 'draft').length },
        objectives: objectiveSummary,
        alignment: alignmentAggregate,
        generatedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) { next(error); }
});

// ============================================================================
// Event Handlers (Internal service auth)
// ============================================================================
app.post('/api/v1/event', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, data } = req.body;
    logger.info(`[EVENT] ${type}:`, data);
    // Process event from other services
    if (type === 'sutar.goal.progress-updated') {
      logger.debug(`[BOA] Received SUTAR progress update for goal ${data?.goalId}: ${data?.progress}%`);
    } else if (type === 'sutar.goal.completed') {
      logger.info(`[BOA] SUTAR goal ${data?.goalId} completed`);
    }
    res.json({ success: true, data: { eventId: uuidv4(), type, status: 'processed' }, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

// ============================================================================
// 404 & Error Handlers
// ============================================================================
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================================
// Start Server
// ============================================================================
if (require.main === module) {
  app.listen(config.port, () => {
    logger.info(`BOA-OS (Strategy Layer) running on port ${config.port}`);
    logger.info(`Environment: ${config.environment}`);
    logger.info(`SUTAR GoalOS: ${config.sutarGoalOSUrl}`);
    logger.info(`Event Bus: ${config.eventBusUrl}`);

    // Publish ready event
    eventBus.publish('boa.os.ready', {
      service: 'boa-os',
      port: config.port,
      version: config.version,
      capabilities: ['strategy', 'objective', 'roadmap', 'kpi', 'alignment', 'swot', 'goal-sync'],
    });
  });
}

export default app;
