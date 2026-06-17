import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// Routes
import briefingRoutes from './routes/briefing';
import scheduleRoutes from './routes/schedule';
import alertsRoutes from './routes/alerts';

// Load environment variables
dotenv.config();

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ai-briefing-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Request logging middleware
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  req.headers['x-request-id'] = requestId;
  logger.info({
    requestId,
    method: req.method,
    path: req.path,
    query: req.query
  });
  next();
};

// Error logging middleware
const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    requestId: req.headers['x-request-id'],
    error: err.message,
    stack: err.stack
  });
  next(err);
};

// Create Express app
const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(errorLogger);

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const health = {
    status: 'ok',
    service: 'ai-briefing-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Readiness check
app.get('/ready', async (req: Request, res: Response) => {
  const ready = mongoose.connection.readyState === 1;

  if (ready) {
    res.json({ status: 'ready', mongodb: 'connected' });
  } else {
    res.status(503).json({ status: 'not ready', mongodb: 'disconnected' });
  }
});

// API Routes
app.use('/api/briefings', briefingRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/alerts', alertsRoutes);

// API info endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    service: 'AI Briefing Service',
    version: '1.0.0',
    description: 'Daily morning briefings for executives',
    endpoints: {
      briefings: {
        'GET /api/briefings/tenant/:tenantId': 'Get all briefings for a tenant',
        'GET /api/briefings/:id': 'Get briefing by ID',
        'GET /api/briefings/tenant/:tenantId/date/:date': 'Get briefing by tenant and date',
        'POST /api/briefings/generate': 'Generate a new briefing',
        'POST /api/briefings/:id/send': 'Send briefing via configured channels',
        'GET /api/briefings/stats/:tenantId': 'Get briefing statistics'
      },
      schedule: {
        'GET /api/schedule': 'Get all schedules',
        'GET /api/schedule/:tenantId': 'Get schedule for tenant',
        'PUT /api/schedule/:tenantId': 'Update schedule',
        'PATCH /api/schedule/:tenantId/status': 'Enable/disable schedule',
        'POST /api/schedule/:tenantId/test': 'Send test notification',
        'DELETE /api/schedule/:tenantId': 'Remove schedule'
      },
      alerts: {
        'GET /api/alerts/tenant/:tenantId': 'Get all alerts for tenant',
        'GET /api/alerts/:id': 'Get alert by ID',
        'GET /api/alerts/tenant/:tenantId/summary': 'Get alert summary',
        'GET /api/alerts/tenant/:tenantId/at-risk': 'Get at-risk customer alerts',
        'GET /api/alerts/tenant/:tenantId/product-issues': 'Get product issue alerts',
        'POST /api/alerts': 'Create new alert',
        'PATCH /api/alerts/:id/acknowledge': 'Acknowledge alert',
        'POST /api/alerts/bulk-acknowledge': 'Acknowledge multiple alerts',
        'DELETE /api/alerts/:id': 'Delete alert'
      }
    }
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response) => {
  logger.error({
    requestId: req.headers['x-request-id'],
    error: err.message,
    stack: err.stack
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Database connection
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-briefing';

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info('Connected to MongoDB');

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    // Continue running without database for development
    logger.info('Running in degraded mode without database');
  }
};

// Start server
const PORT = process.env.PORT || 4897;

const startServer = async () => {
  // Connect to database
  await connectDB();

  // Initialize scheduler (singleton)
  const { BriefingScheduler } = await import('./services/scheduler');
  BriefingScheduler.getInstance();

  app.listen(PORT, () => {
    logger.info(`AI Briefing Service running on port ${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`API docs: http://localhost:${PORT}/api`);
  });
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  // Stop scheduler
  const { BriefingScheduler } = await import('./services/scheduler');
  BriefingScheduler.getInstance().stopAll();

  // Close database connection
  await mongoose.connection.close();

  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export { app };
