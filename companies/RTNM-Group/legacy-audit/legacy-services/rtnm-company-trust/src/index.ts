import express, { Application, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import { logger } from './utils/logger';
import companyTrustRoutes from './routes/company-trust.routes';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
});
app.use(limiter);

// Health check endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: config.app.name,
    version: config.app.version,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    const mongoState = mongoose.connection.readyState;
    const isMongoReady = mongoState === 1;

    if (!isMongoReady) {
      return res.status(503).json({
        success: false,
        status: 'not ready',
        mongodb: 'disconnected',
      });
    }

    return res.status(200).json({
      success: true,
      status: 'ready',
      mongodb: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      status: 'error',
      error: 'Health check failed',
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

// API routes
app.use('/api', companyTrustRoutes);

// Metrics endpoint
app.get('/metrics', (_req: Request, res: Response) => {
  const mongoState = mongoose.connection.readyState;
  const stateMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    success: true,
    metrics: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      mongodb: stateMap[mongoState] || 'unknown',
      timestamp: new Date().toISOString(),
    },
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: config.app.env === 'development' ? err.message : undefined,
  });
});

// Database connection
const connectDB = async (): Promise<void> => {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received, shutting down gracefully...`);

  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    app.listen(config.port, () => {
      logger.info(`${config.app.name} v${config.app.version} started on port ${config.port}`);
      logger.info(`Environment: ${config.app.env}`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
      logger.info(`API docs: http://localhost:${config.port}/api`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;