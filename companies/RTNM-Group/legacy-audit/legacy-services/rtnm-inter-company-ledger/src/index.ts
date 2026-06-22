import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import config from './config';
import logger from './utils/logger';
import intercompanyLedgerRoutes from './routes/intercompany-ledger.routes';

// Create Express app
const app: Express = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();
  _res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(req, _res, duration);
  });
  next();
});

// Health check endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'rtnm-inter-company-ledger',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    // Check MongoDB connection
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    if (mongoStatus !== 'connected') {
      res.status(503).json({
        status: 'not ready',
        checks: {
          mongodb: mongoStatus,
        },
      });
      return;
    }

    res.json({
      status: 'ready',
      checks: {
        mongodb: mongoStatus,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

// API routes
app.use('/api', intercompanyLedgerRoutes);

// Metrics endpoint (Prometheus format)
app.get('/metrics', (_req: Request, res: Response) => {
  const metrics = `
# HELP rtnm_ledger_uptime_seconds Service uptime in seconds
# TYPE rtnm_ledger_uptime_seconds gauge
rtnm_ledger_uptime_seconds${process.uptime()}

# HELP rtnm_ledger_memory_bytes Process memory usage
# TYPE rtnm_ledger_memory_bytes gauge
rtnm_ledger_memory_bytes{type="heap"}${process.memoryUsage().heapUsed}
rtnm_ledger_memory_bytes{type="rss"}${process.memoryUsage().rss}
  `.trim();

  res.set('Content-Type', 'text/plain');
  res.send(metrics);
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
  logger.error('Unhandled error', { error: err.message, stack: err.stack });

  res.status(500).json({
    success: false,
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
});

// Database connection
const connectDB = async (): Promise<void> => {
  try {
    logger.info('Connecting to MongoDB...', { uri: config.mongodb.uri });

    await mongoose.connect(config.mongodb.uri, config.mongodb.options);

    logger.info('MongoDB connected successfully');

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
    logger.error('Failed to connect to MongoDB', { error });
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error during shutdown', { error });
  }

  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async (): Promise<void> => {
  await connectDB();

  app.listen(config.port, () => {
    logger.info(`RTNM Inter-Company Ledger Service started`, {
      port: config.port,
      nodeEnv: config.nodeEnv,
      url: `http://localhost:${config.port}`,
    });
    logger.info('Available routes:', {
      health: `GET /health`,
      ready: `GET /health/ready`,
      entries: `POST /api/entries`,
      getEntries: `GET /api/entries/:corpId`,
      balance: `GET /api/balance/:corpId`,
      balances: `GET /api/balances`,
      reconciliation: `POST /api/reconciliation`,
      settlement: `GET /api/settlement/:fromCorpId/:toCorpId`,
      stats: `GET /api/stats`,
      companies: `GET /api/companies`,
    });
  });
};

startServer().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});

export default app;