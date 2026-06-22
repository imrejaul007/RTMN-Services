import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

import nextStepRoutes from './routes/nextStepRoutes';
import { errorHandler, requestLogger } from './middleware/validation';
import { logger } from './utils/logger';
import { schedulerService } from './services/schedulerService';
import { proactiveService } from './services/proactiveService';

// ============================================
// APP INITIALIZATION
// ============================================

const app = express();
const PORT = process.env.PORT || 4597;
const SERVICE_NAME = 'next-step-intelligence-service';

// ============================================
// MIDDLEWARE
// ============================================

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:4000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Tenant-Id', 'X-User-Role'],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// ============================================
// RATE LIMITING
// ============================================

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const extractionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 extraction requests per minute
  message: {
    success: false,
    error: 'Too many extraction requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 analytics requests per minute
  message: {
    success: false,
    error: 'Too many analytics requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', generalLimiter);
app.use('/api/nextstep/extract', extractionLimiter);
app.use('/api/nextstep', analyticsLimiter);

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.json({
    success: true,
    service: SERVICE_NAME,
    version: process.env.npm_package_version || '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB',
    },
  });
});

app.get('/ready', async (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  if (!dbConnected) {
    res.status(503).json({
      success: false,
      service: SERVICE_NAME,
      ready: false,
      checks: {
        database: false,
      },
    });
    return;
  }

  res.json({
    success: true,
    service: SERVICE_NAME,
    ready: true,
    checks: {
      database: true,
    },
  });
});

// ============================================
// API ROUTES
// ============================================

app.use('/api/nextstep', nextStepRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: SERVICE_NAME,
    description: 'Next-Step Intelligence Service - Extract and proactively remind customers of next actions',
    version: '1.0.0',
    documentation: {
      endpoints: {
        extract: 'POST /api/nextstep/extract',
        create: 'POST /api/nextstep/create',
        list: 'GET /api/nextstep/:customerId',
        get: 'GET /api/nextstep/detail/:stepId',
        update: 'PUT /api/nextstep/:stepId',
        complete: 'PUT /api/nextstep/:stepId/complete',
        snooze: 'PUT /api/nextstep/:stepId/snooze',
        delete: 'DELETE /api/nextstep/:stepId',
        upcoming: 'GET /api/nextstep/:customerId/upcoming',
        overdue: 'GET /api/nextstep/:customerId/overdue',
        proactive: 'POST /api/nextstep/:customerId/proactive',
        analytics: 'GET /api/nextstep/:customerId/analytics',
        schedule: 'POST /api/nextstep/schedule',
        health: 'GET /health',
        ready: 'GET /ready',
      },
    },
  });
});

// ============================================
// ERROR HANDLING
// ============================================

app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
});

// ============================================
// DATABASE CONNECTION
// ============================================

async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nextstep';

  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info('Connected to MongoDB', { uri: mongoUri.replace(/\/\/.*@/, '//<credentials>@') });

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
    throw error;
  }
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down gracefully`);

  // Stop accepting new requests
  server.close(async () => {
    logger.info('HTTP server closed');

    // Stop scheduler
    schedulerService.stop();

    // Close database connection
    try {
      await mongoose.connection.close();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection', { error });
    }

    process.exit(0);
  });

  // Force exit after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

// ============================================
// SERVER STARTUP
// ============================================

let server: ReturnType<typeof app.listen>;

async function startServer(): Promise<void> {
  // Ensure log directory exists
  const logDir = process.env.LOG_DIR || './logs';
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Connect to database
  await connectDatabase();

  // Start HTTP server
  server = app.listen(PORT, () => {
    logger.info(`${SERVICE_NAME} started`, {
      port: PORT,
      nodeEnv: process.env.NODE_ENV || 'development',
      mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    });

    console.log(`\n🚀 ${SERVICE_NAME} running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   API: http://localhost:${PORT}/api/nextstep`);
    console.log(`   Docs: http://localhost:${PORT}/\n`);
  });

  // Register shutdown handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
  });
}

// Start the server
startServer().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});

export { app };
