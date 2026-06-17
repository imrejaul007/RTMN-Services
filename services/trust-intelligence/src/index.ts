import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import scoreRoutes from './routes/score';
import verifyRoutes from './routes/verify';
import flagsRoutes from './routes/flags';

// Import logger
import logger from './utils/logger';

// Import services for background tasks
import { verificationService } from './services/verification';

const app = express();

// Configuration
const PORT = process.env.PORT || 4953;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trust_intelligence';
const SERVICE_NAME = process.env.SERVICE_NAME || 'trust-intelligence';
const SERVICE_VERSION = process.env.SERVICE_VERSION || '1.0.0';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip,
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    port: PORT,
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Service info endpoint
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    name: SERVICE_NAME,
    version: SERVICE_VERSION,
    port: PORT,
    description: 'Trust Intelligence - calculates and manages trust scores',
    endpoints: {
      score: '/api/score',
      verify: '/api/verify',
      flags: '/api/flags',
      health: '/health',
      info: '/api/info',
    },
    entityTypes: ['customer', 'merchant', 'agent', 'vendor', 'partner', 'device'],
    features: [
      'Trust score calculation',
      'Multi-factor scoring',
      'Verification management',
      'Risk flag detection',
      'Fraud analysis',
      'Entity linking',
      'Trust trends',
      'Multi-tenant support',
    ],
  });
});

// API routes
app.use('/api/score', scoreRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/flags', flagsRoutes);

// Trust API routes (alternative paths)
app.use('/api/trust/score', scoreRoutes);
app.use('/api/trust/verify', verifyRoutes);
app.use('/api/trust/flags', flagsRoutes);

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Background tasks
let verificationExpiryInterval: NodeJS.Timeout;

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    logger.info('Connecting to MongoDB...', { uri: MONGODB_URI });

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info('Connected to MongoDB successfully');

    // Create indexes
    await createIndexes();

    // Start background tasks
    startBackgroundTasks();

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Trust Intelligence Service started`, {
        port: PORT,
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        url: `http://localhost:${PORT}`,
        endpoints: {
          health: `http://localhost:${PORT}/health`,
          info: `http://localhost:${PORT}/api/info`,
          score: `http://localhost:${PORT}/api/score`,
          verify: `http://localhost:${PORT}/api/verify`,
          flags: `http://localhost:${PORT}/api/flags`,
        },
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Create MongoDB indexes
async function createIndexes() {
  try {
    logger.info('Creating database indexes...');

    // Indexes are defined in the models, this just ensures they're created
    await mongoose.connection.db!.admin().ping();

    logger.info('Database indexes ready');
  } catch (error) {
    logger.warn('Error creating indexes', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Background tasks
function startBackgroundTasks() {
  // Verification expiry check - every hour
  verificationExpiryInterval = setInterval(async () => {
    try {
      const expiredCount = await verificationService.expireVerifications();
      if (expiredCount > 0) {
        logger.info(`Expired ${expiredCount} verifications in background task`);
      }
    } catch (error) {
      logger.error('Error in verification expiry task', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, 60 * 60 * 1000); // 1 hour

  logger.info('Background tasks started');
}

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  // Clear intervals
  if (verificationExpiryInterval) {
    clearInterval(verificationExpiryInterval);
  }

  // Close MongoDB connection
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', {
    reason,
  });
});

// Start the server
startServer();

export default app;
