import express, { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { logger } from './utils/logger';
import { errorHandler } from './middleware/validation';
import journeyRoutes from './routes/journeyRoutes';
import { companyRegistry } from './services/companyRegistry';
import { eventAggregator } from './services/eventAggregator';
import { webhookHandler } from './services/webhookHandler';

// Import models to register them with mongoose
import './models/journey';

const app: Express = express();
const PORT = process.env.PORT || 4598;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Company-ID'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Stricter rate limit for webhook endpoints
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: {
    success: false,
    error: 'Too many webhook requests'
  }
});

app.use('/api/webhook/', webhookLimiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
});

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// ============================================================================
// ROUTES
// ============================================================================

// Health check (no /api prefix)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'hojai-cross-company-journey',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/journey', journeyRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Error handler
app.use(errorHandler);

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

async function connectToDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-journey';

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    logger.info('Connected to MongoDB', { uri: mongoUri.replace(/\/\/.*@/, '//<credentials>@') });

    // Create indexes
    await createIndexes();
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    throw error;
  }
}

async function createIndexes(): Promise<void> {
  const { UnifiedJourney, JourneyEvent, CrossCompanyPattern, JourneySegment, JourneyMilestone, Company } = await import('./models/journey');

  try {
    // UnifiedJourney indexes
    await UnifiedJourney.collection.createIndex({ customerId: 1 }, { unique: true });
    await UnifiedJourney.collection.createIndex({ customerEmail: 1 });
    await UnifiedJourney.collection.createIndex({ customerPhone: 1 });
    await UnifiedJourney.collection.createIndex({ 'companies.companyId': 1 });
    await UnifiedJourney.collection.createIndex({ tags: 1 });
    await UnifiedJourney.collection.createIndex({ currentPhase: 1 });
    await UnifiedJourney.collection.createIndex({ healthStatus: 1 });
    await UnifiedJourney.collection.createIndex({ lastActivityDate: -1 });

    // JourneyEvent indexes
    await JourneyEvent.collection.createIndex({ eventId: 1 }, { unique: true });
    await JourneyEvent.collection.createIndex({ customerId: 1, timestamp: -1 });
    await JourneyEvent.collection.createIndex({ customerId: 1, companyId: 1, timestamp: -1 });
    await JourneyEvent.collection.createIndex({ customerId: 1, eventType: 1, timestamp: -1 });
    await JourneyEvent.collection.createIndex({ companyId: 1, timestamp: -1 });
    await JourneyEvent.collection.createIndex({ sessionId: 1 });
    await JourneyEvent.collection.createIndex({ channel: 1, timestamp: -1 });

    // CrossCompanyPattern indexes
    await CrossCompanyPattern.collection.createIndex({ patternId: 1 }, { unique: true });
    await CrossCompanyPattern.collection.createIndex({ customerId: 1, patternType: 1 });
    await CrossCompanyPattern.collection.createIndex({ customerId: 1, lastDetected: -1 });

    // JourneySegment indexes
    await JourneySegment.collection.createIndex({ segmentId: 1 }, { unique: true });
    await JourneySegment.collection.createIndex({ customerId: 1, startDate: -1 });

    // JourneyMilestone indexes
    await JourneyMilestone.collection.createIndex({ milestoneId: 1 }, { unique: true });
    await JourneyMilestone.collection.createIndex({ customerId: 1, milestoneType: 1 });
    await JourneyMilestone.collection.createIndex({ customerId: 1, achievedAt: -1 });

    // Company indexes
    await Company.collection.createIndex({ companyId: 1 }, { unique: true });
    await Company.collection.createIndex({ name: 1 });
    await Company.collection.createIndex({ type: 1, isActive: 1 });
    await Company.collection.createIndex({ isActive: 1, priority: -1 });

    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.warn('Some indexes may already exist', { error });
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    // Stop accepting new requests
    logger.info('Closing HTTP server...');

    // Shutdown services
    await eventAggregator.shutdown();
    await webhookHandler.shutdown();

    // Close database connection
    await mongoose.connection.close();
    logger.info('Database connection closed');

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  gracefulShutdown('uncaughtException').catch(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectToDatabase();

    // Initialize default companies
    await companyRegistry.initializeDefaultCompanies();

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Cross-Company Journey Service started`, {
        port: PORT,
        nodeEnv: process.env.NODE_ENV || 'development',
        mongoUri: (process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-journey').replace(/\/\/.*@/, '//<credentials>@')
      });

      logger.info(`API endpoints available at http://localhost:${PORT}/api`);
      logger.info(`Health check at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export { app };
