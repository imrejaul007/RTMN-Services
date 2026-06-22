import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import { authMiddleware, rateLimitMiddleware, requestIdMiddleware, errorHandler, ALLOWED_ORIGINS } from './middleware/auth';
import playbookRoutes from './routes/playbook';
import { logger } from './utils/logger';
import { metricsMiddleware, metricsEndpoint } from './utils/metrics';

const PORT = parseInt(process.env.PORT || '5156');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/adbazaar_playbooks';

const app: Express = express();

app.use(requestIdMiddleware);
app.use(helmet());
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Token', 'X-Request-Id'],
  maxAge: 86400,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware);
app.use(rateLimitMiddleware);

app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip, query: req.query });
  next();
});

app.get('/health', async (_req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const status = mongoStatus === 'connected' ? 'healthy' : 'unhealthy';
  res.status(status === 'healthy' ? 200 : 503).json({
    status,
    service: 'customer-success-playbook-service',
    port: PORT,
    timestamp: new Date().toISOString(),
    mongodb: mongoStatus
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  const ready = mongoose.connection.readyState === 1;
  if (ready) {
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } else {
    res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString() });
  }
});

app.get('/metrics', metricsEndpoint);
app.use('/api/playbooks', authMiddleware, playbookRoutes);
app.use(errorHandler);
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB', { uri: MONGODB_URI });
  } catch (error) {
    logger.error('MongoDB connection failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down gracefully...');
  try {
    await mongoose.connection.close();
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Shutdown error', { error });
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function start(): Promise<void> {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      logger.info(`Customer Success Playbook Service started on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API: http://localhost:${PORT}/api/playbooks`);
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
}

start();

process.on('uncaughtException', (error) => {
  logger.error('UNCAUGHT EXCEPTION:', { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

export { app };