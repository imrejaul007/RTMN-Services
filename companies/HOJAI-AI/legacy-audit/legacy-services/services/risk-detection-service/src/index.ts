import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Import routes
import riskRoutes from './routes/riskRoutes';

// Import models for index creation
import './models/risk';

// Import services for scheduled tasks
import { fallRiskService } from './services/fallRiskService';
import { woundRiskService } from './services/woundRiskService';
import { alertService } from './services/alertService';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Application = express();
const PORT = process.env.PORT || 4604;

// ==================== SECURITY MIDDLEWARE ====================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== RATE LIMITING ====================

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiter for sensitive endpoints
const strictLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 10,
  message: {
    success: false,
    error: 'Too many requests to this endpoint, please try again later'
  }
});

// Alert rate limiter
const alertLimiter = rateLimit({
  windowMs: 60000,
  max: 30,
  message: {
    success: false,
    error: 'Too many alerts, please try again later'
  }
});

app.use('/api/', generalLimiter);
app.use('/api/risk/alerts', alertLimiter);

// ==================== REQUEST ID & LOGGING ====================

app.use((req: Request, _res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  logger.info(`${req.method} ${req.path}`, {
    requestId: req.headers['x-request-id'],
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  next();
});

// ==================== HEALTH CHECK ====================

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'hojai-risk-detection-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/ready', async (_req: Request, res: Response) => {
  try {
    // Check MongoDB connection
    const mongoState = mongoose.connection.readyState;
    const mongoReady = mongoState === 1;

    if (!mongoReady) {
      res.status(503).json({
        status: 'not ready',
        mongodb: mongoState === 0 ? 'disconnected' : 'connecting'
      });
      return;
    }

    res.json({
      status: 'ready',
      mongodb: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: 'Health check failed'
    });
  }
});

// ==================== API ROUTES ====================

app.use('/api/risk', riskRoutes);

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    requestId: req.headers['x-request-id']
  });

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// ==================== DATABASE CONNECTION ====================

const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/risk-detection';

  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    logger.info('MongoDB connected successfully', { uri: mongoUri.replace(/\/\/.*@/, '//<credentials>@') });

    // Create indexes
    await createIndexes();

  } catch (error) {
    logger.error('MongoDB connection failed', { error });
    process.exit(1);
  }
};

const createIndexes = async (): Promise<void> => {
  try {
    // Indexes are defined in the model file
    // This ensures they're created on startup
    logger.info('Database indexes ensured');
  } catch (error) {
    logger.error('Error creating indexes', { error });
  }
};

// ==================== SCHEDULED TASKS ====================

const setupScheduledTasks = (): void => {
  // Check for overdue assessments every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Running overdue assessments check');

    try {
      // Get overdue fall assessments
      const overdueFallAssessments = await fallRiskService.getOverdueAssessments();

      for (const assessment of overdueFallAssessments) {
        await alertService.sendRiskAlert(
          assessment.patientId,
          'fall',
          assessment.riskLevel,
          {
            type: 'overdue_assessment',
            score: assessment.score,
            recommendations: ['Complete overdue fall risk assessment'],
            metadata: { assessmentId: assessment._id.toString() }
          }
        );
        await fallRiskService.markAssessmentAlerted(assessment._id.toString());
      }

      // Get overdue wound assessments
      const overdueWoundAssessments = await woundRiskService.getOverdueWoundAssessments();

      for (const assessment of overdueWoundAssessments) {
        await alertService.sendRiskAlert(
          assessment.patientId,
          'wound',
          assessment.assessmentScore > 50 ? 'high' : 'moderate' as any,
          {
            type: 'overdue_assessment',
            recommendations: ['Complete overdue wound assessment'],
            metadata: { assessmentId: assessment._id.toString() }
          }
        );
        await woundRiskService.markAssessmentAlerted(assessment._id.toString());
      }

      logger.info(`Processed ${overdueFallAssessments.length} overdue fall assessments and ${overdueWoundAssessments.length} wound assessments`);
    } catch (error) {
      logger.error('Error in overdue assessments check', { error });
    }
  });

  // Escalate unacknowledged alerts every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Running alert escalation check');

    try {
      const activeAlerts = await alertService.getActiveAlerts();

      for (const alert of activeAlerts) {
        if (alert.alertSent && alert.sentAt) {
          const sentTime = new Date(alert.sentAt).getTime();
          const now = Date.now();
          const minutesSinceSent = (now - sentTime) / (1000 * 60);

          // Escalate if not acknowledged within 15 minutes
          if (minutesSinceSent > 15 && alert.status !== 'acknowledged') {
            await alertService.escalateAlert(alert._id.toString());
            logger.warn(`Alert ${alert._id} escalated after ${minutesSinceSent.toFixed(0)} minutes`);
          }
        }
      }
    } catch (error) {
      logger.error('Error in alert escalation check', { error });
    }
  });

  // Daily statistics logging
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running daily statistics check');

    try {
      const alertStats = await alertService.getAlertStatistics();
      logger.info('Daily alert statistics', alertStats);
    } catch (error) {
      logger.error('Error in daily statistics check', { error });
    }
  });

  logger.info('Scheduled tasks configured');
};

// ==================== GRACEFUL SHUTDOWN ====================

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received, starting graceful shutdown`);

  // Stop accepting new requests
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close MongoDB connection
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection', { error });
  }

  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection', { reason });
});

// ==================== SERVER START ====================

let server: ReturnType<typeof app.listen>;

const startServer = async (): Promise<void> => {
  // Connect to database
  await connectDB();

  // Setup scheduled tasks
  setupScheduledTasks();

  // Start HTTP server
  server = app.listen(PORT, () => {
    logger.info(`Risk Detection Service started on port ${PORT}`, {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    });

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║           HOJAI RISK DETECTION SERVICE                        ║
║                                                              ║
║  Status:    RUNNING                                          ║
║  Port:      ${PORT.toString().padEnd(51)}║
║  Env:       ${(process.env.NODE_ENV || 'development').padEnd(51)}║
║                                                              ║
║  Endpoints:                                                 ║
║  - Health:   http://localhost:${PORT}/health                    ║
║  - Ready:    http://localhost:${PORT}/ready                    ║
║  - API:      http://localhost:${PORT}/api/risk                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
  });
};

startServer().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});

export default app;
