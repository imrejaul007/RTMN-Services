import express, { Application, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import familySupportRoutes from './routes/familySupportRoutes';
import { errorHandler, notFoundHandler } from './middleware/validation';
import { logger } from './utils/logger';
import { linkageService } from './services/linkageService';
import { delegationService } from './services/delegationService';
import { notificationService } from './services/notificationService';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 4599;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'error' : 'info';

    logger[level]('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const healthCheck = {
    status: 'ok',
    service: 'hojai-family-support-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongoose: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };

  try {
    // Check MongoDB connection
    await mongoose.connection.db?.admin().ping();
    healthCheck.mongoose = 'connected';
  } catch {
    healthCheck.mongoose = 'disconnected';
    healthCheck.status = 'degraded';
  }

  const statusCode = healthCheck.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

// Readiness check
app.get('/ready', async (req: Request, res: Response) => {
  try {
    await mongoose.connection.db?.admin().ping();
    res.json({ ready: true });
  } catch {
    res.status(503).json({ ready: false, error: 'Database not connected' });
  }
});

// API routes
app.use('/api/v1', familySupportRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Database connection
const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/family-support-service';

  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    logger.info('Connected to MongoDB', { uri: mongoUri.replace(/\/\/.*@/, '//<credentials>@') });

    // Create indexes
    await createIndexes();

  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
    process.exit(1);
  }
};

// Create database indexes
const createIndexes = async (): Promise<void> => {
  try {
    const { FamilySupportLink, SupportDelegation, FamilyNotification, SupportShare, CareCircleLink, EmergencyAccess, FamilySupportHistory } = await import('./models/familySupport');

    await Promise.all([
      // FamilySupportLink indexes
      FamilySupportLink.collection.createIndex({ ownerId: 1, familyMemberId: 1 }, { unique: true }),
      FamilySupportLink.collection.createIndex({ ownerId: 1, status: 1 }),
      FamilySupportLink.collection.createIndex({ familyMemberId: 1 }),

      // SupportDelegation indexes
      SupportDelegation.collection.createIndex({ ownerId: 1, delegateId: 1 }),
      SupportDelegation.collection.createIndex({ delegateId: 1, status: 1 }),
      SupportDelegation.collection.createIndex({ expiresAt: 1 }),

      // FamilyNotification indexes
      FamilyNotification.collection.createIndex({ recipientId: 1, sentAt: -1 }),
      FamilyNotification.collection.createIndex({ relatedCustomerId: 1, type: 1 }),

      // SupportShare indexes
      SupportShare.collection.createIndex({ ownerId: 1, status: 1 }),

      // CareCircleLink indexes
      CareCircleLink.collection.createIndex({ customerId: 1, careCircleId: 1 }, { unique: true }),

      // EmergencyAccess indexes
      EmergencyAccess.collection.createIndex({ customerId: 1, active: 1 }),

      // FamilySupportHistory indexes
      FamilySupportHistory.collection.createIndex({ customerId: 1, timestamp: -1 }),
      FamilySupportHistory.collection.createIndex({ familyMemberId: 1, timestamp: -1 })
    ]);

    logger.info('Database indexes created successfully');

  } catch (error) {
    logger.error('Failed to create indexes', { error });
  }
};

// Background jobs
const startBackgroundJobs = (): void => {
  // Deactivate expired family links every hour
  setInterval(async () => {
    try {
      const deactivatedLinks = await linkageService.deactivateExpiredLinks();
      if (deactivatedLinks > 0) {
        logger.info('Deactivated expired family links', { count: deactivatedLinks });
      }
    } catch (error) {
      logger.error('Failed to deactivate expired links', { error });
    }
  }, 60 * 60 * 1000); // Every hour

  // Expire old delegations every hour
  setInterval(async () => {
    try {
      const expiredDelegations = await delegationService.expireOldDelegations();
      if (expiredDelegations > 0) {
        logger.info('Expired old delegations', { count: expiredDelegations });
      }
    } catch (error) {
      logger.error('Failed to expire old delegations', { error });
    }
  }, 60 * 60 * 1000); // Every hour

  // Cleanup old notifications every day
  setInterval(async () => {
    try {
      const cleanedUp = await notificationService.cleanupOldNotifications(90);
      if (cleanedUp > 0) {
        logger.info('Cleaned up old notifications', { count: cleanedUp });
      }
    } catch (error) {
      logger.error('Failed to cleanup old notifications', { error });
    }
  }, 24 * 60 * 60 * 1000); // Every day

  logger.info('Background jobs started');
};

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    // Close database connection
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    } catch (error) {
      logger.error('Error closing MongoDB connection', { error });
    }

    process.exit(0);
  });

  // Force exit after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Start server
let server: ReturnType<Application['listen']>;

const startServer = async (): Promise<void> => {
  await connectDB();

  server = app.listen(PORT, () => {
    logger.info(`Family Support Service started`, {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    });

    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`API base: http://localhost:${PORT}/api/v1`);

    // Start background jobs
    startBackgroundJobs();
  });

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.fatalWithException('Uncaught exception', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', {
      reason,
      promise: promise.toString()
    });
  });
};

startServer().catch((error) => {
  logger.fatalWithException('Failed to start server', error);
  process.exit(1);
});

export default app;
