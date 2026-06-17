import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// Types and Models
import './types';
import { Dashboard, IDashboard } from './models/Dashboard';
import { Widget, IWidget } from './models/Widget';

// Routes
import dashboardRoutes from './routes/dashboard';
import widgetRoutes from './routes/widgets';
import insightsRoutes from './routes/insights';
import risksRoutes from './routes/risks';
import opportunitiesRoutes from './routes/opportunities';

// Services
import { MetricsService } from './services/metrics';
import { TrendsService } from './services/trends';
import { ForecastingService } from './services/forecasting';
import { AlertingService } from './services/alerting';

// Load environment variables
dotenv.config();

// ============================================================================
// Logger Configuration
// ============================================================================

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// ============================================================================
// Service Initialization
// ============================================================================

const metricsService = new MetricsService();
const trendsService = new TrendsService();
const forecastingService = new ForecastingService();
const alertingService = new AlertingService();

// ============================================================================
// Express Application Setup
// ============================================================================

const app: Application = express();
const PORT = process.env.PORT || 4896;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).requestId = uuidv4();
  res.setHeader('X-Request-ID', (req as any).requestId);
  next();
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      requestId: (req as any).requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: Date.now() - start,
    });
  });
  next();
});

// Tenant context middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'] as string || process.env.DEFAULT_TENANT || 'default';
  (req as any).tenantId = tenantId;
  (req as any).userId = req.headers['x-user-id'] as string;
  (req as any).roles = (req.headers['x-user-roles'] as string)?.split(',') || [];
  next();
});

// ============================================================================
// Health Check Endpoint
// ============================================================================

app.get('/health', async (req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  const health = {
    status: mongoStatus === 'connected' ? 'healthy' : 'degraded',
    service: 'executive-dashboard',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      mongodb: mongoStatus,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB',
      },
    },
  };

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// ============================================================================
// API Info Endpoint
// ============================================================================

app.get('/api', (req: Request, res: Response) => {
  res.json({
    service: 'Executive Dashboard',
    version: '1.0.0',
    description: 'Real-time insights for CEOs and executives',
    endpoints: {
      dashboards: '/api/dashboards',
      widgets: '/api/widgets',
      insights: '/api/insights',
      risks: '/api/risks',
      opportunities: '/api/opportunities',
      metrics: '/api/metrics',
      alerts: '/api/alerts',
      health: '/health',
    },
  });
});

// ============================================================================
// Mount Routes
// ============================================================================

app.use('/api/dashboards', dashboardRoutes);
app.use('/api/widgets', widgetRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/risks', risksRoutes);
app.use('/api/opportunities', opportunitiesRoutes);

// ============================================================================
// Real-time Updates Endpoints
// ============================================================================

// SSE endpoint for real-time updates
app.get('/api/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const tenantId = (req as any).tenantId;
  const requestId = (req as any).requestId;

  logger.info(`SSE connection established for tenant ${tenantId}`, { requestId });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', tenantId })}\n\n`);

  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
  }, 30000);

  // Send metrics update every 10 seconds
  const metricsInterval = setInterval(async () => {
    try {
      const metrics = await metricsService.getRealTimeMetrics(tenantId);
      res.write(`data: ${JSON.stringify({ type: 'metrics', data: metrics })}\n\n`);
    } catch (error) {
      logger.error('Error fetching real-time metrics', { error, tenantId });
    }
  }, 10000);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    clearInterval(metricsInterval);
    logger.info(`SSE connection closed for tenant ${tenantId}`, { requestId });
  });
});

// WebSocket upgrade handler (for future implementation)
app.ws('/api/ws', (ws, req) => {
  const tenantId = (req as any).tenantId || 'default';

  logger.info(`WebSocket connection established for tenant ${tenantId}`);

  ws.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message);
      logger.debug('WebSocket message received', { tenantId, type: data.type });

      switch (data.type) {
        case 'subscribe':
          // Handle subscription to specific metrics/streams
          ws.send(JSON.stringify({
            type: 'subscribed',
            channels: data.channels,
          }));
          break;

        case 'metrics_request':
          const metrics = await metricsService.getRealTimeMetrics(tenantId);
          ws.send(JSON.stringify({
            type: 'metrics_update',
            data: metrics,
          }));
          break;

        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Unknown message type',
          }));
      }
    } catch (error) {
      logger.error('WebSocket message error', { error });
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
      }));
    }
  });

  ws.on('close', () => {
    logger.info(`WebSocket connection closed for tenant ${tenantId}`);
  });
});

// ============================================================================
// Dashboard Widgets API
// ============================================================================

app.get('/api/metrics', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { category, period } = req.query;

    const metrics = await metricsService.getMetrics(tenantId, {
      category: category as string,
      period: period as string,
    });

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Error fetching metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics',
    });
  }
});

app.get('/api/metrics/health-score', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const healthScore = await metricsService.calculateHealthScore(tenantId);

    res.json({
      success: true,
      data: healthScore,
    });
  } catch (error) {
    logger.error('Error calculating health score', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to calculate health score',
    });
  }
});

app.get('/api/metrics/financial', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { period } = req.query;

    const financial = await metricsService.getFinancialMetrics(tenantId, {
      period: period as string,
    });

    res.json({
      success: true,
      data: financial,
    });
  } catch (error) {
    logger.error('Error fetching financial metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch financial metrics',
    });
  }
});

app.get('/api/metrics/sla', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const slaData = await metricsService.getSLACompliance(tenantId);

    res.json({
      success: true,
      data: slaData,
    });
  } catch (error) {
    logger.error('Error fetching SLA compliance', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SLA compliance',
    });
  }
});

app.get('/api/team/performance', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const performance = await metricsService.getTeamPerformance(tenantId);

    res.json({
      success: true,
      data: performance,
    });
  } catch (error) {
    logger.error('Error fetching team performance', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team performance',
    });
  }
});

app.get('/api/products/performance', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const performance = await metricsService.getProductPerformance(tenantId);

    res.json({
      success: true,
      data: performance,
    });
  } catch (error) {
    logger.error('Error fetching product performance', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product performance',
    });
  }
});

app.get('/api/trends', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { metric, period } = req.query;

    const trends = await trendsService.analyzeTrends(tenantId, {
      metric: metric as string,
      period: period as string,
    });

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    logger.error('Error analyzing trends', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to analyze trends',
    });
  }
});

app.post('/api/forecast', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { metric, horizon } = req.body;

    const forecast = await forecastingService.forecast(tenantId, {
      metric,
      horizon: horizon || 30,
    });

    res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    logger.error('Error generating forecast', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate forecast',
    });
  }
});

// ============================================================================
// Alerts API
// ============================================================================

app.get('/api/alerts', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { status, severity } = req.query;

    const alerts = await alertingService.getAlerts(tenantId, {
      status: status as string,
      severity: severity as string,
    });

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    logger.error('Error fetching alerts', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts',
    });
  }
});

app.post('/api/alerts', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const alertData = req.body;

    const alert = await alertingService.createAlert(tenantId, alertData);

    res.status(201).json({
      success: true,
      data: alert,
    });
  } catch (error) {
    logger.error('Error creating alert', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to create alert',
    });
  }
});

app.patch('/api/alerts/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;
    const userId = (req as any).userId;

    const alert = await alertingService.acknowledgeAlert(tenantId, id, userId);

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    logger.error('Error acknowledging alert', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert',
    });
  }
});

app.patch('/api/alerts/:id/resolve', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;
    const userId = (req as any).userId;

    const alert = await alertingService.resolveAlert(tenantId, id, userId);

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    logger.error('Error resolving alert', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
    });
  }
});

// ============================================================================
// Error Handling
// ============================================================================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

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
    requestId: (req as any).requestId,
  });
});

// ============================================================================
// Database Connection and Server Start
// ============================================================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/executive_dashboard';

const startServer = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB', { uri: MONGODB_URI });

    // Initialize services
    await alertingService.initialize(tenantId => metricsService.getRealTimeMetrics(tenantId));
    logger.info('Services initialized');

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Executive Dashboard Service running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API docs: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
});

// Start the server
startServer();

export default app;
