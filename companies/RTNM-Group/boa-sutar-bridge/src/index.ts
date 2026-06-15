// BOA-SUTAR Bridge - Main Server (Port 4110)
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { eventBus } from './utils/eventBus';

import syncRoutes from './routes/sync';
import alignmentRoutes from './routes/alignment';
import feedbackRoutes from './routes/feedback';
import metricsRoutes from './routes/metrics';

import { boaClient } from './services/boaClient';
import { sutarClient } from './services/sutarClient';
import { syncService } from './services/syncService';
import { feedbackService } from './services/feedbackService';

const app = express();
const START_TIME = Date.now();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', async (_req: Request, res: Response) => {
  const [boa, sutar] = await Promise.all([boaClient.isHealthy(), sutarClient.isHealthy()]);
  res.json({
    status: boa && sutar ? 'healthy' : 'degraded',
    service: config.serviceName,
    version: config.version,
    environment: config.environment,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    dependencies: { boaOS: boa ? 'up' : 'down', sutarGoalOS: sutar ? 'up' : 'down' },
    timestamp: new Date().toISOString(),
  });
});

// Service info
app.get('/api/v1/info', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      name: config.serviceName,
      description: 'BOA-SUTAR Bridge - Bidirectional synchronization between BOA OS (Strategy) and SUTAR OS (Execution)',
      version: config.version,
      role: 'Strategy ↔ Execution Bridge',
      features: [
        'BOA → SUTAR goal sync',
        'SUTAR → BOA feedback',
        'Conflict detection and resolution',
        'Strategic alignment scoring',
        'Goal mapping (1:1, 1:N, N:1)',
        'Progress synchronization',
        'Feedback loop management',
        'Metrics aggregation',
        'Event-driven architecture',
      ],
      endpoints: {
        sync: '/api/v1/sync',
        alignment: '/api/v1/alignment',
        feedback: '/api/v1/feedback',
        metrics: '/api/v1/metrics',
      },
      externalServices: {
        boaOS: config.boaOSUrl,
        sutarGoalOS: config.sutarGoalOSUrl,
        sutarDecisionEngine: config.sutarDecisionEngineUrl,
        sutarMonitoring: config.sutarMonitoringUrl,
        eventBus: config.eventBusUrl,
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/v1/sync', syncRoutes);
app.use('/api/v1/alignment', alignmentRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/metrics', metricsRoutes);

// Event endpoint - receive SUTAR events
app.post('/api/v1/event', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, data } = req.body;
    logger.info(`[EVENT] ${type}`);

    if (type === 'sutar.goal.progress-updated' && data?.goalId) {
      const sync = syncService.getSyncBySutarGoal(data.goalId);
      if (sync) {
        feedbackService.capture({
          sutarGoalId: data.goalId,
          boaObjectiveId: sync.boaObjectiveId,
          feedbackType: 'progress',
          message: `SUTAR goal progress updated to ${data.progress}%`,
          data,
          severity: 'info',
        });
      }
    } else if (type === 'sutar.goal.completed' && data?.goalId) {
      const sync = syncService.getSyncBySutarGoal(data.goalId);
      if (sync) {
        feedbackService.capture({
          sutarGoalId: data.goalId,
          boaObjectiveId: sync.boaObjectiveId,
          feedbackType: 'completion',
          message: `SUTAR goal completed`,
          data,
          severity: 'info',
        });
      }
    } else if (type === 'sutar.goal.blocked' && data?.goalId) {
      const sync = syncService.getSyncBySutarGoal(data.goalId);
      if (sync) {
        feedbackService.capture({
          sutarGoalId: data.goalId,
          boaObjectiveId: sync.boaObjectiveId,
          feedbackType: 'blocker',
          message: data.reason || 'SUTAR goal blocked',
          data,
          severity: 'critical',
        });
      }
    }

    res.json({ success: true, data: { eventId: uuidv4(), type, status: 'processed' }, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

// 404 and error
app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    logger.info(`BOA-SUTAR-BRIDGE running on port ${config.port}`);
    logger.info(`Environment: ${config.environment}`);
    logger.info(`BOA OS: ${config.boaOSUrl}`);
    logger.info(`SUTAR GoalOS: ${config.sutarGoalOSUrl}`);

    eventBus.publish('bridge.ready', {
      service: 'boa-sutar-bridge',
      port: config.port,
      version: config.version,
    });
  });
}

export default app;
