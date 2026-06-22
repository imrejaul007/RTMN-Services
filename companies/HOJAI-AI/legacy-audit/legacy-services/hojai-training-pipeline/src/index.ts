/**
 * HOJAI Training Pipeline - Main Entry Point
 * Port: 4880
 * Continuous Learning / Training Pipeline Service
 *
 * Learn from: Chat conversations, User actions, Corrections, Feedback loops
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

import { connectDatabase, disconnectDatabase } from './models/learning.js';
import trainingRoutes from './routes/training.js';
import { logger } from './utils/logger.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = parseInt(process.env.PORT || '4880');
const HOST = process.env.HOST || '0.0.0.0';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-training';

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Tenant-ID'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] as string || uuidv4();
  res.setHeader('X-Request-ID', req.headers['x-request-id']);
  next();
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const latencyMs = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      latencyMs,
      requestId: req.headers['x-request-id']
    });
  });

  next();
});

// ============================================================================
// HEALTH ENDPOINTS
// ============================================================================

/**
 * GET /health
 * Basic health check
 */
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'hojai-training-pipeline',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /health/ready
 * Readiness check (includes database connectivity)
 */
app.get('/health/ready', async (req: Request, res: Response) => {
  try {
    // Could add database ping here
    res.status(200).json({
      status: 'ready',
      service: 'hojai-training-pipeline',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      service: 'hojai-training-pipeline',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /health/live
 * Liveness check
 */
app.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

// Training pipeline routes
app.use('/api/training', trainingRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    service: 'HOJAI Training Pipeline',
    description: 'Continuous Learning / Training Pipeline Service',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      health: '/health',
      capture: 'POST /api/training/capture',
      conversation: 'POST /api/training/conversation',
      action: 'POST /api/training/action',
      correction: 'POST /api/training/correction',
      feedback: 'POST /api/training/feedback',
      signal: 'POST /api/training/signal',
      signalBatch: 'POST /api/training/signal/batch',
      patterns: 'GET /api/training/patterns',
      insights: 'GET /api/training/insights',
      batch: 'POST /api/training/batch',
      archive: 'POST /api/training/archive'
    },
    learningSources: {
      chat: 'Conversations, Questions, Follow-ups',
      signal: 'Clicks, Views, Searches',
      event: 'Task completion, Task failure, Escalations',
      conversion: 'Purchases, Signups, Feedback'
    },
    stages: {
      short_term: 'Real-time, Current conversation, Quick adjustments',
      long_term: 'Persistent, Learned patterns, User preferences',
      model: 'Batch, General knowledge, Domain expertise'
    }
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id']
    }
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    requestId: req.headers['x-request-id'],
    path: req.path
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An internal error occurred'
        : err.message
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id']
    }
  });
});

// ============================================================================
// SERVER LIFECYCLE
// ============================================================================

let server: ReturnType<typeof app.listen> | null = null;

async function startServer(): Promise<void> {
  try {
    // Connect to database
    logger.info('Connecting to MongoDB...', { uri: MONGODB_URI });
    await connectDatabase(MONGODB_URI);

    // Start server
    server = app.listen(PORT, HOST, () => {
      logger.info(`HOJAI Training Pipeline started`, {
        host: HOST,
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server', { error: error instanceof Error ? error.message : 'Unknown' });
    process.exit(1);
  }
}

async function gracefulShutdown(): Promise<void> {
  logger.info('Received shutdown signal, closing server...');

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await disconnectDatabase();
        logger.info('Database connection closed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error: error instanceof Error ? error.message : 'Unknown' });
        process.exit(1);
      }
    });
  }

  // Force exit after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

// Start the server
startServer();

export { app };
