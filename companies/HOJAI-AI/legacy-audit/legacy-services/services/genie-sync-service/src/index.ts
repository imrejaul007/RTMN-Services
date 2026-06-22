/**
 * GENIE Sync Service - Main Entry Point
 * Version: 1.0.0 | Date: June 13, 2026
 * Purpose: Cross-service data synchronization for Genie
 *
 * Tagline: "You don't use Genie. You talk to Genie."
 *
 * Port: 4707
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createLogger } from './utils/logger.js';
import syncRoutes from './routes/syncRoutes.js';

const PORT = parseInt(process.env.PORT || '4707', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVICE_NAME = 'genie-sync-service';
const SERVICE_VERSION = '1.0.0';

const logger = createLogger(SERVICE_NAME);
const app = express();

// Security
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } } }));
app.use(cors({ origin: '*', credentials: true }));
app.use(rateLimit({ windowMs: 60000, max: 100, message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } } }));
app.use(express.json({ limit: '10mb' }));
app.use(compression());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  res.setHeader('X-Request-Id', requestId);
  logger.info('request_start', { requestId, method: req.method, path: req.path });
  res.on('finish', () => logger.info('request_end', { requestId, status: res.statusCode, duration: Date.now() - start }));
  next();
});

// Health endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: SERVICE_VERSION, timestamp: new Date().toISOString() });
});
app.get('/health/live', (_req: Request, res: Response) => res.json({ status: 'ok' }));
app.get('/health/ready', (_req: Request, res: Response) => res.json({ status: 'ready' }));

// Routes
app.use('/api/sync', syncRoutes);

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('error', { error: err.message });
  res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } });
});

// Start server
async function start(): Promise<void> {
  try {
    logger.info('service_starting', { service: SERVICE_NAME, port: PORT });
    app.listen(PORT, () => {
      console.log(`\n╔═══════════════════════════════════════════╗\n║  GENIE Sync Service - RUNNING          ║\n║  Port: ${PORT.toString().padEnd(35)}║\n║  "You don't use Genie. You talk to Genie."║\n╚═══════════════════════════════════════════╝\n`);
    });
  } catch (error) {
    logger.error('start_failed', { error });
    process.exit(1);
  }
}

process.on('SIGTERM', () => { process.exit(0); });
process.on('SIGINT', () => { process.exit(0); });
start();