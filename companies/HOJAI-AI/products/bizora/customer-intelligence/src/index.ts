import 'dotenv/config';
import express, { Application, Request, Response } from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { requireAuth } from '@rtmn/shared/auth';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { errorHandler, notFoundHandler, requestLogger } from './utils/helpers';
import logger from './utils/logger';

// Import routes
import customersRouter from './routes/customers';
import segmentsRouter from './routes/segments';
import identityRouter from './routes/identity';
import riskRouter from './routes/risk';
import metricsRouter from './routes/metrics';

// Import models to register them with mongoose
import './models/Customer';
import './models/IdentityLink';
import './models/RiskEvent';

const app: Application = express();
const PORT = process.env.PORT || 5311;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

app.use(requireAuth);app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.json({
    service: 'hojai-customer-intelligence',
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    }
  });
});

// API Info endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'Customer Intelligence Service (CDP)',
    description: 'Customer Data Platform - Single source of truth for every customer',
    version: '1.0.0',
    endpoints: {
      customers: '/api/customers',
      segments: '/api/segments',
      identity: '/api/identity',
      risk: '/api/risk',
      metrics: '/api/metrics'
    },
    documentation: '/api/docs'
  });
});

// API Routes
app.use('/api/customers', customersRouter);
app.use('/api/segments', segmentsRouter);
app.use('/api/identity', identityRouter);
app.use('/api/risk', riskRouter);
app.use('/api/metrics', metricsRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-cdp';

async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB', { uri: MONGODB_URI });
  } catch (error) {
    logger.error('MongoDB connection error', { error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

// Start server
async function startServer(): Promise<void> {
  await connectDatabase();
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



  const server = app.listen(PORT, () => {
    logger.info(`Customer Intelligence Service started`, {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    });
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           Customer Intelligence Service (CDP)                   ║
║               Single Source of Truth for Customers             ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:  ✅ Running                                           ║
║  Port:    ${PORT}                                               ║
║  Health:  http://localhost:${PORT}/health                        ║
║  API:     http://localhost:${PORT}/api                           ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                    ║
║  📊 Customers  → /api/customers                                ║
║  🏷️  Segments   → /api/segments                                ║
║  🔗 Identity   → /api/identity                                 ║
║  ⚠️  Risk      → /api/risk                                    ║
║  📈 Metrics    → /api/metrics                                  ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  });
  installGracefulShutdown(server);
}

startServer().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});

export default app;
