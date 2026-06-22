import express, { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { initRedis, closeRedis } from './utils/redis.js';
import routes from './routes/index.js';
import {
  authMiddleware,
  metricsMiddleware,
  metricsHandler,
  healthHandler,
  customerRecordsTotal,
} from './middleware/index.js';
import { Customer360Model } from './models/index.js';

// Create Express app
const app: Express = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Metrics middleware
app.use(metricsMiddleware);

// Trust proxy (for load balancers)
app.set('trust proxy', 1);

// Health check endpoint (no auth)
app.get('/health', healthHandler);

// Metrics endpoint (no auth)
app.get('/metrics', metricsHandler);

// Protected routes with auth
app.use('/api', authMiddleware, routes);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'customer-graph-360',
    version: '1.0.0',
    description: 'Unified 360-degree customer view',
    endpoints: {
      health: '/health',
      metrics: '/metrics',
      api: '/api/customer/:userId',
    },
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', { error: err instanceof Error ? err.message : String(err) });

  res.status(500).json({
    success: false,
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
});

// Connect to MongoDB
async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.mongodbUri);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// Connect to Redis
async function connectRedis(): Promise<void> {
  try {
    await initRedis();
    logger.info('Connected to Redis');
  } catch (error) {
    logger.warn('Redis connection failed, continuing without cache:', error);
  }
}

// Update metrics
async function updateMetrics(): Promise<void> {
  try {
    const count = await Customer360Model.countDocuments();
    customerRecordsTotal.set(count);
  } catch (error) {
    logger.error('Failed to update metrics:', { error: error instanceof Error ? error.message : String(error) });
  }
}

// Start server
async function start(): Promise<void> {
  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();

    // Update initial metrics
    await updateMetrics();

    // Set up periodic metrics update
    setInterval(updateMetrics, 60000); // Every minute

    // Start listening
    const server = app.listen(config.port, () => {
      logger.info(`Customer Graph 360 service running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
      logger.info(`Metrics: http://localhost:${config.port}/metrics`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await mongoose.connection.close();
          logger.info('MongoDB connection closed');

          await closeRedis();
          logger.info('Redis connection closed');

          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', { error: error instanceof Error ? error.message : String(error) });
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
}

// Start the application
start();

export default app;