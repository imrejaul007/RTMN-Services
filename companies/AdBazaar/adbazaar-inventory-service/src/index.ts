/**
 * AdBazaar Inventory Service
 *
 * Manages physical DOOH inventory (screens, billboards, locations).
 * This is the foundation for connecting media owners to advertisers.
 *
 * Features:
 * - Screen/asset registration and management
 * - Location intelligence
 * - Inventory catalog
 * - Capacity management
 * - Integration with HOJAI AI for audience data
 *
 * Port: 4900
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import promClient from 'prom-client';

import { logger } from './utils/logger.js';
import { config, validateConfig } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { authenticateAny } from './middleware/auth.js';
import { errorHandler, notFoundHandler, asyncHandler } from './middleware/errorHandler.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import { register } from './services/metrics.js';

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

app.get('/health', async (_req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const isHealthy = mongoStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    service: 'adbazaar-inventory-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      mongodb: mongoStatus,
    },
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1;
  if (mongoStatus) {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready', reason: 'MongoDB not connected' });
  }
});

app.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ============================================================================
// API ROUTES
// ============================================================================

// Public info endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'AdBazaar Inventory Service',
    version: '1.0.0',
    description: 'DOOH inventory management - screens, billboards, locations',
    endpoints: {
      inventory: '/api/inventory',
      locations: '/api/locations',
      screens: '/api/screens',
      networks: '/api/networks',
      search: '/api/search',
    },
    screenTypes: [
      'billboard_digital',
      'bus_shelter',
      'bus_interior',
      'metro_screen',
      'airport_display',
      'airport_gate',
      'airport_lounge',
      'mall_kiosk',
      'mall_directory',
      'restaurant_tv',
      'hotel_lobby',
      'hotel_room',
      'office_lobby',
      'office_elevator',
      'gym_screen',
      'salon_display',
      'cab_tablet',
    ],
  });
});

// Protected routes
app.use('/api/inventory', authenticateAny, inventoryRoutes);
app.use('/api/locations', authenticateAny, locationRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

let server: ReturnType<Express['listen']> | null = null;

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => resolve());
      });
    }

    await disconnectDatabase();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
}

// ============================================================================
// START SERVER
// ============================================================================

async function start() {
  try {
    validateConfig();

    // Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    await connectDatabase();
    logger.info('MongoDB connected');

    // Start HTTP server
    server = app.listen(config.port, () => {
      logger.info(`
╔══════════════════════════════════════════════════════════════╗
║        AdBazaar Inventory Service v1.0.0                  ║
╠══════════════════════════════════════════════════════════════╣
║  Port:     ${String(config.port).padEnd(45)}║
║  Env:      ${(process.env.NODE_ENV || 'development').padEnd(45)}║
╠══════════════════════════════════════════════════════════════╣
║  ENDPOINTS:                                              ║
║  POST /api/inventory/screens     - Register new screen    ║
║  GET  /api/inventory/screens    - List all screens        ║
║  GET  /api/inventory/screens/:id - Get screen details   ║
║  PUT  /api/inventory/screens/:id - Update screen          ║
║  POST /api/locations/areas      - Add location area       ║
║  GET  /api/locations/areas     - List areas             ║
║  GET  /api/locations/areas/:id  - Get area details       ║
╚══════════════════════════════════════════════════════════════╝
      `);

      logger.info('Inventory Service started', {
        port: config.port,
        environment: process.env.NODE_ENV,
      });
    });

    // Handle shutdown
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', { reason });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

start();

export default app;
