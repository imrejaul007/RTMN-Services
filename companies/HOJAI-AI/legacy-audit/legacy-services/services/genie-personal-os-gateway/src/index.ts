/**
 * GENIE Personal OS Gateway - Main Entry Point
 * Version: 1.0.0 | Date: June 13, 2026
 * Purpose: API Gateway - Orchestrates all Genie services
 *
 * Tagline: "You don't use Genie. You talk to Genie."
 *
 * Port: 4702
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createLogger } from './utils/logger.js';
import gatewayRoutes from './routes/gatewayRoutes.js';

const PORT = parseInt(process.env.PORT || '4702', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVICE_NAME = 'genie-personal-os-gateway';
const SERVICE_VERSION = '1.0.0';

const logger = createLogger(SERVICE_NAME);
const app = express();

// Security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['*'];
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-User-Id', 'X-Request-Id'],
}));

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
    meta: { timestamp: new Date().toISOString(), requestId: `req_${Date.now()}` },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', globalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  res.setHeader('X-Request-Id', requestId);

  logger.info('request_start', { requestId, method: req.method, path: req.path });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('request_end', { requestId, status: res.statusCode, duration });
  });

  next();
});

// Health endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/ready', (_req: Request, res: Response) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api', gatewayRoutes);

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'The requested resource was not found' },
    meta: { timestamp: new Date().toISOString(), requestId: `req_${Date.now()}` },
  });
});

// Error handler
app.use((err: Error & { code?: string }, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('request_error', { error: err.message, code: err.code });

  res.status(err.code === 'VALIDATION_ERROR' ? 400 : 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: NODE_ENV === 'production' ? 'An error occurred' : err.message,
    },
    meta: { timestamp: new Date().toISOString(), requestId: `req_${Date.now()}` },
  });
});

// Start server
async function start(): Promise<void> {
  try {
    logger.info('service_starting', { service: SERVICE_NAME, version: SERVICE_VERSION, port: PORT });

    app.listen(PORT, () => {
      logger.info('service_started', { service: SERVICE_NAME, port: PORT });

      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   GENIE Personal OS Gateway                                 ║
║   Personal Intelligence OS                                   ║
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
    logger.error('service_start_failed', { error });
    process.exit(1);
  }
}

process.on('SIGTERM', () => { logger.info('shutdown'); process.exit(0); });
process.on('SIGINT', () => { logger.info('shutdown'); process.exit(0); });

start();

export default app;
