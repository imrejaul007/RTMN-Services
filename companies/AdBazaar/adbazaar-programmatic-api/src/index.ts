/**
 * AdBazaar Programmatic API
 *
 * OpenRTB 2.5 compliant DOOH exchange API.
 * Enables real-time bidding for digital out-of-home advertising.
 *
 * Features:
 * - OpenRTB Bid Request/Response
 * - Real-time auction
 * - Audience targeting
 * - DOOH-specific extensions
 *
 * Port: 4940
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

import { logger } from './utils/logger.js';
import { config, validateConfig } from './config/index.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { authenticateAny } from './middleware/auth.js';
import { errorHandler, asyncHandler } from './middleware/errorHandler.js';
import openRtbRoutes from './routes/openrtb.js';
import bidRoutes from './routes/bid.js';
import adminRoutes from './routes/admin.js';
import { register } from './services/metrics.js';
import promClient from 'prom-client';

// Initialize Prometheus
promClient.collectDefaultMetrics({ register });

// Load environment
dotenv.config();

// Validate configuration
validateConfig();

// Create Express app
const app: Express = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
}));

app.use(compression());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// ============================================================================
// HEALTH CHECKS
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'adbazaar-programmatic-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

app.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ============================================================================
// OPENRTB ENDPOINTS
// ============================================================================

// OpenRTB 2.5 compliant endpoints
app.use('/openrtb', openRtbRoutes);

// Bid endpoints
app.use('/bid', authenticateAny, bidRoutes);

// Admin endpoints
app.use('/admin', adminRoutes);

// ============================================================================
// API INFO
// ============================================================================

app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'AdBazaar Programmatic API',
    version: '1.0.0',
    description: 'OpenRTB 2.5 compliant DOOH exchange',
    openrtb: {
      version: '2.5',
      spec: 'https://www.iab.com/guidelines/real-time-bidding/',
    },
    endpoints: {
      bidRequest: 'POST /openrtb/bid',
      bidResponse: 'POST /openrtb/response',
      seatBid: 'POST /openrtb/seatbid',
    },
    features: [
      'Real-time bidding',
      'DOOH-specific extensions',
      'Audience targeting',
      'Geo targeting',
      'Frequency capping',
      'Attribution tracking',
    ],
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use(errorHandler);

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down...`);
  try {
    await disconnectRedis();
    process.exit(0);
  } catch (error) {
    logger.error('Shutdown error', { error });
    process.exit(1);
  }
}

// ============================================================================
// START SERVER
// ============================================================================

async function start() {
  try {
    // Connect to Redis
    logger.info('Connecting to Redis...');
    connectRedis();
    logger.info('Redis connected');

    // Start server
    app.listen(config.port, () => {
      logger.info(`
╔══════════════════════════════════════════════════════════════╗
║     AdBazaar Programmatic API v1.0.0                   ║
╠══════════════════════════════════════════════════════════════╣
║  Port:      ${String(config.port).padEnd(44)}║
║  Protocol:  OpenRTB 2.5                                 ║
╠══════════════════════════════════════════════════════════════╣
║  ENDPOINTS:                                           ║
║  POST /openrtb/bid     - Bid request                  ║
║  POST /bid              - Simplified bid endpoint       ║
║  GET  /admin/auctions  - Auction statistics           ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start', { error });
    process.exit(1);
  }
}

start();

export default app;
