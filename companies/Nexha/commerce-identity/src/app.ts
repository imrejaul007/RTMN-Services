import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { supplierRouter } from './routes/supplier.routes';
import { buyerRouter } from './routes/buyer.routes';
import { guestSupplierRouter } from './routes/guest.routes';
import { ratingRouter } from './routes/rating.routes';
import { corpidRouter } from './routes/corpid.routes';
import { authRouter } from './routes/auth.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { defaultLimiter, strictLimiter } from './middleware/rate-limit.middleware';
import { logger } from './config/logger';
import { disconnectDatabase } from './config/database';

export function createApp() {
  const app = express();

  app.use(helmet());

  // CORS — exact origin match only. Closes B-MISC-2 (the previous version
  // had `https://*.vercel.app` wildcard allowing any vercel.app subdomain).
  // Operators must list explicit origins in ALLOWED_ORIGINS.
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
    'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server).
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS rejection', { origin, allowedOrigins });
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      }
    },
    credentials: true,
  }));

  // Body parsers + cookie parser (Phase 5 / S-4 fix — JWT via httpOnly cookie)
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Lightweight access log
  app.use((req: Request, res: Response, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      logger.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
    });
    next();
  });

  // Apply default rate limit to all API routes (100 req/min/IP).
  app.use('/api', defaultLimiter);

  // Health check (no rate limit)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      service: 'commerce-identity',
      version: '1.0.0',
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Service routes
  app.use('/api/suppliers', supplierRouter);
  app.use('/api/buyers', buyerRouter);
  app.use('/api/guest-suppliers', guestSupplierRouter);
  app.use('/api/ratings', ratingRouter);
  app.use('/api/corpid', corpidRouter);
  app.use('/api/auth', authRouter);

  // Strict rate limit on the sensitive write endpoints (brute-force protection).
  // These must come AFTER the router mounts so they take precedence on those
  // specific paths; if mounted earlier they'd apply to the whole namespace.
  app.use('/api/auth/login', strictLimiter);
  app.use('/api/auth/register', strictLimiter);
  app.use('/api/corpid/issue', strictLimiter);
  app.use('/api/guest-suppliers/onboard', strictLimiter);
  app.use('/api/guest-suppliers/:guestId/verify-otp', strictLimiter);

  // Root info
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      service: 'NeXha Commerce Identity',
      version: '1.0.0',
      description: 'Universal identity for suppliers, buyers, and guests in the B2B commerce network',
      endpoints: {
        health: '/health',
        suppliers: '/api/suppliers',
        buyers: '/api/buyers',
        guestSuppliers: '/api/guest-suppliers',
        ratings: '/api/ratings',
        corpid: '/api/corpid',
        auth: '/api/auth',
      },
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export async function shutdownGracefully(server: { close: (cb?: () => void) => void }): Promise<void> {
  logger.info('Shutting down commerce-identity...');
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectDatabase();
  process.exit(0);
}
