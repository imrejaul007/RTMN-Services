/**
 * GENIE Slack Service - Main Entry Point
 * Version: 1.0.0 | Date: June 1, 2026
 * Purpose: Slack workspace integration for GENIE Personal Intelligence OS
 *
 * Tagline: "You don't use Genie. You talk to Genie."
 *
 * Port: 4711
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { createLogger } from './utils/logger.js';
import slackRoutes from './routes/slackRoutes.js';

const SERVICE_NAME = 'genie-slack-service';
const SERVICE_VERSION = '1.0.0';
const PORT = parseInt(process.env.PORT || '4711', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/genie-slack';
const NODE_ENV = process.env.NODE_ENV || 'development';

const logger = createLogger(SERVICE_NAME);
const app = express();

// Security
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], scriptSrc: ["'self'"], imgSrc: ["'self'", 'data:', 'https:'] } },
  crossOriginEmbedderPolicy: false,
}));

const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['*'];
app.use(cors({ origin: corsOrigins, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'] }));

// Rate Limiting
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' }, meta: { timestamp: new Date().toISOString() } },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req.headers['x-tenant-id'] as string) || req.ip || 'unknown',
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  res.setHeader('X-Request-Id', requestId);
  logger.info('request', { requestId, method: req.method, path: req.path });
  res.on('finish', () => logger.info('response', { requestId, status: res.statusCode, duration: Date.now() - startTime }));
  next();
});

// Health endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: SERVICE_VERSION, timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  const mongoState = mongoose.connection.readyState;
  res.json({ status: mongoState === 1 ? 'ready' : 'not_ready', checks: { mongodb: mongoState === 1 ? 'connected' : 'disconnected' }, timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/slack', slackRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' }, meta: { timestamp: new Date().toISOString() } });
});

// Error handler
interface AppError extends Error {
  code?: string;
  statusCode?: number;
}

app.use((err: AppError, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('error', { error: err.message, stack: err.stack, code: err.code });
  res.status(err.statusCode || 500).json({
    success: false,
    error: { code: err.code || 'INTERNAL_ERROR', message: NODE_ENV === 'production' ? 'An error occurred' : err.message },
    meta: { timestamp: new Date().toISOString() }
  });
});

// Database
async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000 });
    logger.info('mongodb_connected');
  } catch (error) {
    logger.error('mongodb_connection_failed', { error: error instanceof Error ? error.message : 'Unknown' });
    throw error;
  }
}

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  logger.info('shutdown', { signal });
  await mongoose.connection.close();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start
async function start(): Promise<void> {
  try {
    logger.info('starting', { service: SERVICE_NAME, version: SERVICE_VERSION, port: PORT });
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   GENIE Slack Service                                        ║
║   Personal Intelligence OS                                    ║
║                                                              ║
║   Status:  RUNNING                                           ║
║   Port:    ${PORT.toString().padEnd(51)}║
║   Version: ${SERVICE_VERSION.padEnd(51)}║
║                                                              ║
║   "You don't use Genie. You talk to Genie."                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('start_failed', { error: error instanceof Error ? error.message : 'Unknown' });
    process.exit(1);
  }
}

start();
export default app;
