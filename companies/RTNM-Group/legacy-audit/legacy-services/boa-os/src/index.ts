import express, { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuid } from 'uuid';
import goalsRouter from './routes/goals';
import opportunitiesRouter from './routes/opportunities';
import { createLogger } from './utils/logger';
import { publishEvent } from './services/eventBus';

const logger = createLogger('boa-os');
const app: Express = express();

const PORT = process.env.PORT || 4100;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/boa-os';
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVICE_NAME = 'boa-os';

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-User-Id', 'X-Request-Id']
}));
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = (req.headers['x-request-id'] as string) || uuid();

  res.on('finish', () => {
    logger.info('request_completed', {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - startTime
    });
  });

  res.setHeader('X-Request-ID', requestId);
  next();
});

// Health endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const isReady = mongoStatus === 'connected';
  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    checks: { mongodb: mongoStatus },
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/goals', goalsRouter);
app.use('/api/opportunities', opportunitiesRouter);

// Service info
app.get('/api/info', (_req: Request, res: Response) => {
  res.json({
    service: SERVICE_NAME,
    version: '1.0.0',
    description: 'BOA OS - Strategic Planning & Portfolio Management',
    type: 'Strategy Layer',
    layer: 'Above SUTAR OS',
    endpoints: {
      goals: '/api/goals',
      opportunities: '/api/opportunities'
    }
  });
});

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('unhandled_error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('mongodb_connected', { uri: MONGODB_URI.replace(/\/\/.*@/, '//****@') });
  } catch (error) {
    logger.error('mongodb_connection_failed', { error: String(error) });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('shutdown_signal', { signal: 'SIGTERM' });
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('shutdown_signal', { signal: 'SIGINT' });
  await mongoose.connection.close();
  process.exit(0);
});

// Start server
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    logger.info('server_started', { service: SERVICE_NAME, port: PORT, env: NODE_ENV });
    console.log(`
╔══════════════════════════════════════════════════════════╗
║  BOA OS - Strategic Planning Layer                       ║
║  Port: ${String(PORT).padEnd(41)}║
║  Version: 1.0.0                                           ║
║  Status: RUNNING                                         ║
╚══════════════════════════════════════════════════════════╝
    `);
  });
};

startServer();

export default app;
