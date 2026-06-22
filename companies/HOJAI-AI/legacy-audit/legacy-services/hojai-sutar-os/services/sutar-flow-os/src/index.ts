/**
 * SUTAR Flow OS - Main Server
 * Workflow orchestration, execution, and AI-powered optimization
 * Port: 4244
 */

import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import { v4 as uuid } from 'uuid';
import flowRoutes from './routes/flows.js';
import runRoutes from './routes/runs.js';
import triggerRoutes from './routes/triggers.js';
import analyticsRoutes from './routes/analytics.js';
import optimizationRoutes from './routes/optimization.js';
import { createLogger } from './utils/logger.js';
import { triggerService } from './services/triggerService.js';

const logger = createLogger('server');

const PORT = process.env.PORT || 4244;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sutar-flow-os';
const isProduction = process.env.NODE_ENV === 'production';

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Request-Id']
}));
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
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

// ============================================================================
// HEALTH ENDPOINTS
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'sutar-flow-os',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    service: 'sutar-flow-os',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/ready', async (req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(mongoStatus === 'connected' ? 200 : 503).json({
    status: mongoStatus === 'connected' ? 'ready' : 'not_ready',
    checks: { mongodb: mongoStatus },
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

app.use('/api/flows', flowRoutes);
app.use('/api/runs', runRoutes);
app.use('/api/triggers', triggerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/optimization', optimizationRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`
    }
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('unhandled_error', {
    error: err.message,
    stack: isProduction ? undefined : err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? 'Internal server error' : err.message
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`
    }
  });
});

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000
    });
    logger.info('mongodb_connected', {
      uri: MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@')
    });
  } catch (error) {
    logger.error('mongodb_connection_failed', {
      error: (error as Error).message
    });
    throw error;
  }
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer(): Promise<void> {
  logger.info('server_starting', { port: PORT });

  try {
    await connectDatabase();

    app.listen(PORT, () => {
      logger.info('server_started', { port: PORT });

      console.log('\n===========================================');
      console.log('   SUTAR Flow OS - Workflow Orchestration');
      console.log('===========================================');
      console.log(`   Port: ${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/health`);
      console.log(`   Ready: http://localhost:${PORT}/health/ready`);
      console.log('');
      console.log('   Features:');
      console.log('   - Flow Definition & Execution');
      console.log('   - Step-by-step Processing');
      console.log('   - Conditional Branching');
      console.log('   - Trigger Management');
      console.log('   - AI-powered Analytics');
      console.log('   - Bottleneck Detection');
      console.log('   - Workflow Optimization');
      console.log('===========================================\n');
    });
  } catch (error) {
    logger.error('server_start_failed', { error: (error as Error).message });
    process.exit(1);
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGTERM', async () => {
  logger.info('server_shutting_down', { signal: 'SIGTERM' });
  triggerService.stopAllSchedulers();
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('server_shutting_down', { signal: 'SIGINT' });
  triggerService.stopAllSchedulers();
  await mongoose.disconnect();
  process.exit(0);
});

// Start server
startServer();

export default app;
