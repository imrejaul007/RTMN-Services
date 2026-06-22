import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { supplierRouter } from './routes/supplier.routes';
import { buyerRouter } from './routes/buyer.routes';
import { guestSupplierRouter } from './routes/guest.routes';
import { ratingRouter } from './routes/rating.routes';
import { corpidRouter } from './routes/corpid.routes';
import { authRouter } from './routes/auth.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { logger } from './config/logger';
import { disconnectDatabase } from './config/database';

export function createApp() {
  const app = express();

  app.use(helmet());
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,https://*.vercel.app')
    .split(',')
    .map((o) => o.trim());

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.some((pattern) => {
        if (pattern.startsWith('https://*.') || pattern.startsWith('http://*.')) {
          const domain = pattern.replace('https://', '').replace('http://', '').replace('*.', '');
          return origin.endsWith(domain) || origin.includes(domain);
        }
        return origin === pattern;
      })) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      }
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request log (lightweight)
  app.use((req: Request, res: Response, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      logger.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
    });
    next();
  });

  // Health check
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

  // Readiness probe
  app.get('/ready', (_req: Request, res: Response) => {
    res.json({ success: true, service: 'commerce-identity', status: 'ready', timestamp: new Date().toISOString() });
  });

  // Service routes
  app.use('/api/suppliers', supplierRouter);
  app.use('/api/buyers', buyerRouter);
  app.use('/api/guest-suppliers', guestSupplierRouter);
  app.use('/api/ratings', ratingRouter);
  app.use('/api/corpid', corpidRouter);
  app.use('/api/auth', authRouter);

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
