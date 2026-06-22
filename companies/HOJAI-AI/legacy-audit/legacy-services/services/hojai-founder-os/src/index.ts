/**
 * HOJAI FounderOS - Main Entry Point
 * Company Building Tools and AI-Powered Executive Briefings
 */

import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import { v4 as uuid } from 'uuid';

// Routes
import businessModelRoutes from './routes/businessModel.js';
import gtmRoutes from './routes/gtm.js';
import fundraisingRoutes from './routes/fundraising.js';
import hiringRoutes from './routes/hiring.js';
import marketAnalysisRoutes from './routes/marketAnalysis.js';
import briefingRoutes from './routes/briefings.js';
import analyticsRoutes from './routes/analytics.js';

import { createLogger } from './utils/logger.js';

const logger = createLogger('server');
const PORT = process.env.PORT || 4260;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-founder-os';
const isProduction = process.env.NODE_ENV === 'production';

const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

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

/**
 * GET /health
 * Basic health check
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'hojai-founder-os',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /health/live
 * Liveness probe - indicates the service is running
 */
app.get('/health/live', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    service: 'hojai-founder-os',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /health/ready
 * Readiness probe - indicates the service is ready to accept traffic
 */
app.get('/health/ready', async (req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const isReady = mongoStatus === 'connected';

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    checks: {
      mongodb: mongoStatus
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

app.use('/api/business-model', businessModelRoutes);
app.use('/api/gtm', gtmRoutes);
app.use('/api/fundraising', fundraisingRoutes);
app.use('/api/hiring', hiringRoutes);
app.use('/api/market-analysis', marketAnalysisRoutes);
app.use('/api/briefing', briefingRoutes);
app.use('/api/analytics', analyticsRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
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

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('unhandled_error', {
    error: err.message,
    stack: isProduction ? undefined : err.stack,
    path: req.path
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

      console.log('\n╔══════════════════════════════════════════════════════════════╗');
      console.log('║                                                              ║');
      console.log('║   🏢 HOJAI FounderOS                                          ║');
      console.log('║      Company Building Tools & AI-Powered Briefings            ║');
      console.log('║                                                              ║');
      console.log('╠══════════════════════════════════════════════════════════════╣');
      console.log('║                                                              ║');
      console.log(`║   Port:        ${PORT}                                          ║`);
      console.log('║                                                              ║');
      console.log('║   Features:                                                   ║');
      console.log('║   - Business Model Canvas                                     ║');
      console.log('║   - GTM Strategy Planning                                     ║');
      console.log('║   - Fundraising Planning                                      ║');
      console.log('║   - Hiring Plans                                              ║');
      console.log('║   - Market Analysis                                           ║');
      console.log('║   - AI Executive Briefings                                    ║');
      console.log('║                                                              ║');
      console.log('║   Integrations:                                               ║');
      console.log('║   - Revenue Intelligence                                      ║');
      console.log('║   - Customer Intelligence                                     ║');
      console.log('║   - Product Intelligence                                      ║');
      console.log('║   - GoalOS                                                    ║');
      console.log('║   - Meeting Intelligence                                      ║');
      console.log('║   - Workforce                                                 ║');
      console.log('║                                                              ║');
      console.log('╠══════════════════════════════════════════════════════════════╣');
      console.log('║                                                              ║');
      console.log(`║   Health:     http://localhost:${PORT}/health                     ║`);
      console.log(`║   Ready:      http://localhost:${PORT}/health/ready                ║`);
      console.log('║                                                              ║');
      console.log('╚══════════════════════════════════════════════════════════════╝');
    });
  } catch (error) {
    logger.error('server_start_failed', {
      error: (error as Error).message
    });
    process.exit(1);
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGTERM', async () => {
  logger.info('server_shutting_down', { signal: 'SIGTERM' });
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('server_shutting_down', { signal: 'SIGINT' });
  await mongoose.disconnect();
  process.exit(0);
});

// Start the server
startServer();

export default app;