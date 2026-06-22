import express, { Application, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from './config';
import logger from './utils/logger';
import companyTwinRoutes from './routes/company-twin.routes';

// ============================================
// EXPRESS APP SETUP
// ============================================

const app: Application = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet for security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Corp-Id'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ============================================
// BODY PARSING
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// REQUEST LOGGING
// ============================================

app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });
  });

  next();
});

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: config.service.name,
    version: config.service.version,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    // Check MongoDB connection
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    const isReady = mongoStatus === 'connected';

    res.status(isReady ? 200 : 503).json({
      success: isReady,
      status: isReady ? 'ready' : 'not ready',
      checks: {
        mongodb: mongoStatus,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      success: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// API ROUTES
// ============================================

// Company Twin routes
app.use('/twins', companyTwinRoutes);

// API info endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    service: config.service.name,
    version: config.service.version,
    description: config.service.description,
    endpoints: {
      twins: {
        'POST /twins': 'Create a new company twin',
        'GET /twins': 'Get all company twins',
        'GET /twins/:corpId': 'Get a specific company twin',
        'PUT /twins/:corpId': 'Update company twin',
        'PUT /twins/:corpId/budget': 'Update company twin budget',
        'PUT /twins/:corpId/policies': 'Update company twin policies',
        'PUT /twins/:corpId/ai-agent': 'Update company twin AI agent',
        'PUT /twins/:corpId/trust-rules': 'Update company twin trust rules',
        'DELETE /twins/:corpId': 'Delete company twin',
        'POST /twins/:corpId/activate': 'Activate company twin',
        'POST /twins/:corpId/suspend': 'Suspend company twin',
        'GET /twins/:corpId/summary': 'Get company twin summary',
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// DATABASE CONNECTION
// ============================================

async function connectToDatabase(): Promise<void> {
  try {
    const mongoUri = config.mongodb.uri;

    logger.info('Connecting to MongoDB...', { uri: mongoUri.replace(/\/\/.*@/, '//<credentials>@') });

    await mongoose.connect(mongoUri, {
      maxPoolSize: config.mongodb.options.maxPoolSize,
      minPoolSize: config.mongodb.options.minPoolSize,
      serverSelectionTimeoutMS: config.mongodb.options.serverSelectionTimeoutMS,
      socketTimeoutMS: config.mongodb.options.socketTimeoutMS,
    });

    logger.info('Connected to MongoDB successfully');

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to connect to MongoDB', { error: errorMessage });
    throw error;
  }
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Close MongoDB connection
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');

    // Give time for cleanup
    await new Promise((resolve) => setTimeout(resolve, 1000));

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error });
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  process.exit(1);
});

// ============================================
// START SERVER
// ============================================

async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectToDatabase();

    // Start Express server
    const port = config.port;
    const host = '0.0.0.0';

    app.listen(port, host, () => {
      logger.info(`Server started on ${host}:${port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Service: ${config.service.name} v${config.service.version}`);
      logger.info(`Health check: http://localhost:${port}/health`);
      logger.info(`API docs: http://localhost:${port}/api`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Export app for testing
export { app };

// Start the server
startServer();
