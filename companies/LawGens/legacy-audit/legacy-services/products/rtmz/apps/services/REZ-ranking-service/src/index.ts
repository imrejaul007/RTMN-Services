import express, { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import logger from './utils/logger';
import rankRoutes from './routes/rank';
import experimentRoutes from './routes/experiments';
import feedbackRoutes from './routes/feedback';
import featureRoutes from './routes/features';
import { getHealthStatus, getReadinessCheck, getLivenessCheck, initHealthChecks } from './health';
import { featureService } from './services/featureService';
import { experimentService } from './services/experimentService';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5006;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration
    });
  });
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute
  message: { error: 'Too many requests, please try again later' }
});
app.use(limiter);

// Health routes
app.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await getHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({ status: 'unhealthy', error: 'Health check failed' });
  }
});

app.get('/health/ready', async (req: Request, res: Response) => {
  try {
    const { ready, checks } = await getReadinessCheck();
    res.status(ready ? 200 : 503).json({ ready, checks });
  } catch (error) {
    res.status(503).json({ ready: false, error: 'Readiness check failed' });
  }
});

app.get('/health/live', async (req: Request, res: Response) => {
  const { alive } = await getLivenessCheck();
  res.status(alive ? 200 : 503).json({ alive });
});

// API routes
app.use('/api/v1', rankRoutes);
app.use('/api/v1', experimentRoutes);
app.use('/api/v1', feedbackRoutes);
app.use('/api/v1', featureRoutes);

// Root redirect to health
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'REZ Ranking Service',
    version: '1.0.0',
    status: 'running',
    docs: '/health'
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Initialize services
async function initializeServices(): Promise<void> {
  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez_ranking';

  try {
    await mongoose.connect(mongoUri);
    logger.info('MongoDB connected', { uri: mongoUri });
  } catch (error) {
    logger.error('MongoDB connection failed', { error });
    throw error;
  }

  // Initialize Redis
  let redisClient: Redis | null = null;

  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn('Redis connection failed, operating without cache');
          return null;
        }
        return Math.min(times * 100, 3000);
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis error', { error: err.message });
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    // Wait for initial connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        logger.warn('Redis connection timeout, continuing without cache');
        resolve();
      }, 5000);

      redisClient!.on('ready', () => {
        clearTimeout(timeout);
        resolve();
      });

      redisClient!.on('error', (err) => {
        clearTimeout(timeout);
        logger.warn('Redis initial error', { error: err.message });
        resolve(); // Continue anyway
      });
    });
  } catch (error) {
    logger.warn('Redis initialization failed, continuing without cache', { error });
    redisClient = null;
  }

  // Initialize health checks with Redis client
  initHealthChecks(redisClient, process.env.ML_SERVICE_URL || 'http://localhost:5007');

  logger.info('All services initialized');
}

// Graceful shutdown
async function shutdown(): Promise<void> {
  logger.info('Shutting down...');

  try {
    await mongoose.connection.close();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('MongoDB disconnect error', { error });
  }

  try {
    await featureService.close();
    await experimentService.close();
    logger.info('Services closed');
  } catch (error) {
    logger.error('Service close error', { error });
  }

  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
async function start(): Promise<void> {
  try {
    await initializeServices();

    app.listen(PORT, () => {
      logger.info(`REZ Ranking Service started`, {
        port: PORT,
        env: process.env.NODE_ENV || 'development'
      });
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API base: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

start();

export { app };
