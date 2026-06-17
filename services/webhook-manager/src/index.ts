import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import logger from './services/logger';
import webhooksRouter from './routes/webhooks';
import eventsRouter from './routes/events';
import deliveriesRouter from './routes/deliveries';
import { retryService } from './services/retry';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 4987;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const retryStats = retryService.getRetryStats();

  res.json({
    status: 'healthy',
    service: 'webhook-manager',
    port: PORT,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    retryProcessor: {
      pendingRetries: retryStats.pending,
      scheduledRetries: retryStats.scheduled,
      maxAttempts: retryStats.maxAttempts,
    },
  });
});

// Readiness check endpoint
app.get('/ready', (req: Request, res: Response) => {
  res.json({
    ready: true,
    service: 'webhook-manager',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/webhooks', webhooksRouter);
app.use('/api/events', eventsRouter);
app.use('/api/deliveries', deliveriesRouter);

// API documentation endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    service: 'Webhook Manager',
    version: '1.0.0',
    description: 'Webhook orchestration and management service',
    endpoints: {
      health: 'GET /health',
      webhooks: {
        list: 'GET /api/webhooks',
        get: 'GET /api/webhooks/:id',
        create: 'POST /api/webhooks',
        update: 'PUT /api/webhooks/:id',
        toggle: 'PATCH /api/webhooks/:id/toggle',
        delete: 'DELETE /api/webhooks/:id',
        test: 'POST /api/webhooks/:id/test',
        regenerateSecret: 'POST /api/webhooks/:id/regenerate-secret',
        stats: 'GET /api/webhooks/:id/stats',
      },
      events: {
        list: 'GET /api/events',
        get: 'GET /api/events/:id',
        create: 'POST /api/events',
        types: 'GET /api/events/types',
        registerType: 'POST /api/events/types',
        retry: 'POST /api/events/:id/retry',
        subscriptions: {
          list: 'GET /api/events/subscriptions/list',
          create: 'POST /api/events/subscriptions',
          get: 'GET /api/events/subscriptions/:id',
          delete: 'DELETE /api/events/subscriptions/:id',
        },
        stats: 'GET /api/events/stats/summary',
      },
      deliveries: {
        list: 'GET /api/deliveries',
        get: 'GET /api/deliveries/:id',
        retry: 'POST /api/deliveries/:id/retry',
        stats: 'GET /api/deliveries/stats/overview',
        byWebhook: 'GET /api/deliveries/webhook/:webhookId',
        byEvent: 'GET /api/deliveries/event/:eventId',
        cleanup: 'DELETE /api/deliveries/cleanup',
      },
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  retryService.stop();

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Webhook Manager service started`, {
    port: PORT,
    nodeEnv: process.env.NODE_ENV || 'development',
    pid: process.pid,
  });

  logger.info('Available endpoints:', {
    health: `http://localhost:${PORT}/health`,
    api: `http://localhost:${PORT}/api`,
    webhooks: `http://localhost:${PORT}/api/webhooks`,
    events: `http://localhost:${PORT}/api/events`,
    deliveries: `http://localhost:${PORT}/api/deliveries`,
  });
});

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
