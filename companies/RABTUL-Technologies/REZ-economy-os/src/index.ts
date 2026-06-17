import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import { config } from './config';
import { logger } from './utils/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authMiddleware, internalAuth } from './middleware/auth';
import { rateLimit } from './middleware/rateLimit';

import karmaRouter from './routes/karma';
import creditRouter from './routes/credit';
import accountsRouter from './routes/accounts';
import transactionsRouter from './routes/transactions';
import escrowRouter from './routes/escrow';
import profilesRouter from './routes/profiles';

const app = express();
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);

// Request ID Tracing
app.use((req: Request, res: Response, next) => {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// Strict Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));

// Strict CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (origin, cb) => origin && ALLOWED_ORIGINS.includes(origin) ? cb(null, true) : cb(new Error('Not allowed'))
    : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Internal-Token'],
  maxAge: 86400,
}));

// Security & parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Global rate limiting
app.use(rateLimit({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.maxRequests }));

// Root info
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'rez-economy-os',
    version: '1.0.0',
    description: 'RABTUL Economy OS - Agent Economy, Karma, Credit Scoring, Double-Entry Ledger',
    port: config.port,
    features: [
      'Karma points with tier system (bronze/silver/gold/platinum/diamond)',
      'Credit scoring (25% credit history + 25% payment + 25% dispute + 25% delivery)',
      'Wallet accounts with multi-currency support',
      'Double-entry ledger with automatic balance verification',
      'Escrow holding with release/refund/dispute',
      'Atomic transactions with idempotency',
      'Transaction reversal with linked audit trail',
    ],
    endpoints: {
      karma: '/api/v1/karma',
      credit: '/api/v1/credit',
      accounts: '/api/v1/accounts',
      transactions: '/api/v1/transactions',
      escrow: '/api/v1/escrow',
      profiles: '/api/v1/profiles',
    },
    events: {
      published: [
        'economy.transaction.created',
        'economy.transaction.completed',
        'economy.transaction.failed',
        'economy.transaction.reversed',
        'economy.karma.awarded',
        'economy.karma.penalized',
        'economy.karma.tier.changed',
        'economy.credit.updated',
        'economy.credit.tier.changed',
        'economy.escrow.held',
        'economy.escrow.released',
        'economy.escrow.disputed',
        'economy.account.frozen',
        'economy.account.activated',
      ],
    },
  });
});

// Health
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: config.serviceName, port: config.port, timestamp: new Date().toISOString() });
});

// API routes (all require authentication)
app.use('/api/v1/karma', authMiddleware, karmaRouter);
app.use('/api/v1/credit', authMiddleware, creditRouter);
app.use('/api/v1/accounts', authMiddleware, accountsRouter);
app.use('/api/v1/transactions', authMiddleware, transactionsRouter);
app.use('/api/v1/escrow', authMiddleware, escrowRouter);
app.use('/api/v1/profiles', authMiddleware, profilesRouter);

// 404 and error handling
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info(`╔══════════════════════════════════════════════════════╗`);
  logger.info(`║   REZ-economy-os - RABTUL Agent Economy Service      ║`);
  logger.info(`╠══════════════════════════════════════════════════════╣`);
  logger.info(`║   Port: ${config.port.toString().padEnd(45)}║`);
  logger.info(`║   Env:  ${config.nodeEnv.padEnd(45)}║`);
  logger.info(`║   Event Bus: ${(config.eventBusEnabled ? config.eventBusUrl : 'disabled').padEnd(40)}║`);
  logger.info(`╚══════════════════════════════════════════════════════╝`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;
