import express, { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from './config';
import contractRoutes from './routes/contract.routes';
import { logger } from './utils/logger';

// Initialize Express app
const app: Express = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMax,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
});

// Health check endpoints
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'contract-os',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/health/ready', async (req: Request, res: Response) => {
  try {
    // Check MongoDB connection
    const mongoState = mongoose.connection.readyState;
    const mongoReady = mongoState === 1;

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memOk = memUsage.heapUsed < 500 * 1024 * 1024; // 500MB threshold

    if (!mongoReady) {
      res.status(503).json({
        status: 'not_ready',
        checks: {
          mongodb: mongoReady ? 'connected' : 'disconnected',
          memory: memOk ? 'ok' : 'high',
        },
      });
      return;
    }

    res.json({
      status: 'ready',
      checks: {
        mongodb: 'connected',
        memory: memOk ? 'ok' : 'high',
      },
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'error',
      error: error.message,
    });
  }
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/contracts', contractRoutes);

// Stats endpoint
app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const { Contract } = await import('./models/contract.model');
    const total = await Contract.countDocuments();
    const active = await Contract.countDocuments({ status: 'active' });
    const pending = await Contract.countDocuments({ status: 'pending_signature' });

    res.json({
      success: true,
      data: {
        total,
        active,
        pending,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
        uptime: process.uptime(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    success: false,
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
    ...(config.nodeEnv !== 'production' && { stack: err.stack }),
  });
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    logger.info('Connected to MongoDB', { uri: config.mongodb.uri });
  } catch (error: any) {
    logger.error('Failed to connect to MongoDB', { error: error.message });
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await connectDB();

  app.listen(config.port, () => {
    logger.info(`ContractOS service started`, {
      port: config.port,
      nodeEnv: config.nodeEnv,
      pid: process.pid,
    });
    logger.info(`Health check: http://localhost:${config.port}/health`);
    logger.info(`API: http://localhost:${config.port}/api/contracts`);
  });
};

// Handle graceful shutdown
const shutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);

  mongoose.connection.close()
    .then(() => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Error during shutdown', { error: err.message });
      process.exit(1);
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

// Start the server
startServer().catch((err) => {
  logger.error('Failed to start server', { error: err.message });
  process.exit(1);
});

export default app;