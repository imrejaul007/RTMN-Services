import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

import { config } from './config';
import { logger, updateStartTime } from './utils/logger';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware';
import { healthCheck, readinessCheck, livenessCheck } from './middleware/health.middleware';
import { authMiddleware, requestIdMiddleware } from './middleware/auth';

async function connectToDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.mongodbUri);
    logger.info('Connected to MongoDB', { uri: config.mongodbUri.replace(/\/\/.*@/, '//<credentials>@') });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
    throw error;
  }
}

function createApp(): Application {
  const app = express();

  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigin,
    credentials: true
  }));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
      success: false,
      error: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(limiter);

  app.get('/health', healthCheck);
  app.get('/ready', readinessCheck);
  app.get('/live', livenessCheck);

  // Apply auth to API routes
  app.use('/api/v1', authMiddleware, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

async function startServer(): Promise<void> {
  updateStartTime();

  await connectToDatabase();

  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info(`REZ Identity Service started`, {
      port: config.port,
      nodeEnv: config.nodeEnv,
      nodeVersion: process.version
    });
  });

  const gracefulShutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received, shutting down gracefully`);

    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});

export { createApp, connectToDatabase };
