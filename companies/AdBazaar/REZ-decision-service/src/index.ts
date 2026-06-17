/**
 * REZ Decision Service
 *
 * Ad decision engine for AdBazaar.
 * Handles targeting, frequency capping, auction, and attribution.
 *
 * Port: 4027
 *
 * Features:
 * - Targeting engine
 * - Frequency capping
 * - Auction engine
 * - Attribution tracking
 * - DOOH-specific extensions
 * - Real-time triggers
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import promClient from 'prom-client';

import { logger } from './utils/logger.js';
import { config } from './config/index.js';
import { connectRedis } from './config/redis.js';
import { verifyInternal } from './middleware/auth.js';
import { asyncHandler } from './middleware/errorHandler.js';

// Routes
import targetingRoutes from './routes/targeting.js';
import samplingRoutes from './routes/sampling.js';
import auctionRoutes from './routes/auction.js';
import analyticsRoutes from './routes/analytics.js';
import triggersRoutes from './routes/triggers.js';

// Services
import { targetingEngine } from './services/targeting.js';

promClient.collectDefaultMetrics();
dotenv.config();

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// Health checks
app.get('/health', async (_req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'healthy',
    service: 'rez-decision-service',
    version: '1.0.0',
    port: config.port,
    mongodb: mongoStatus,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

app.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// API info
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'REZ Decision Service',
    version: '1.0.0',
    description: 'Ad decision engine - targeting, frequency, auction',
    endpoints: {
      targeting: '/api/targeting',
      sampling: '/api/sampling',
      auction: '/api/auction',
      analytics: '/api/analytics',
      triggers: '/api/triggers',
    },
  });
});

// Targeting routes
app.use('/api/targeting', verifyInternal, targetingRoutes);

// Sampling routes
app.use('/api/sampling', verifyInternal, samplingRoutes);

// Auction routes
app.use('/api/auction', verifyInternal, auctionRoutes);

// Analytics routes
app.use('/api/analytics', verifyInternal, analyticsRoutes);

// Triggers routes
app.use('/api/triggers', verifyInternal, triggersRoutes);

// Error handler
app.use((err: Error, req: Request, res: Response, _next: any) => {
  logger.error('[Error]', { error: err.message, path: req.path });
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`[Shutdown] ${signal} received`);
  await mongoose.disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
async function start() {
  try {
    // Connect to Redis
    logger.info('Connecting to Redis...');
    connectRedis();

    // Connect to MongoDB (if configured)
    if (process.env.MONGODB_URI) {
      logger.info('Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Start server
    app.listen(config.port, () => {
      logger.info(`
╔══════════════════════════════════════════════════════════════╗
║     REZ Decision Service v1.0.0                    ║
║  Port: ${config.port}                                      ║
╠══════════════════════════════════════════════════════════════╣
║  Features:                                          ║
║  • Targeting engine                               ║
║  • Frequency capping                              ║
║  • Auction engine                                 ║
║  • Attribution tracking                          ║
║  • DOOH extensions                               ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('[Startup] Failed', { error });
    process.exit(1);
  }
}

start();

export default app;
