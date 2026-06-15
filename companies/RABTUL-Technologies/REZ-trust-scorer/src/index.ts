import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import trustRouter from './routes/trust';

const app = express();

// Security & parsing middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Root info
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'rez-trust-scorer',
    version: '1.0.0',
    description: 'RABTUL Trust Scorer - Trust Score Calculation with 25/25/25/25 Weighted Formula',
    port: config.port,
    features: [
      'Trust scoring with 25% Credit History + 25% Payment History + 25% Dispute Rate + 25% Delivery Success',
      'Automatic trust tier calculation (excellent/good/fair/poor/untrusted)',
      'Trust event recording (payments, disputes, deliveries, reviews, SLA)',
      'Component-level score breakdown',
      'Bonus and penalty system',
      'Trust comparison across multiple entities',
      'Audit log for all trust changes',
      'Event-driven updates via Event Bus',
    ],
    endpoints: {
      trust: '/api/v1/trust',
    },
    formula: {
      creditHistory: `${config.trust.weights.creditHistory * 100}% - Account age, volume, count, diversity`,
      paymentHistory: `${config.trust.weights.paymentHistory * 100}% - On-time rate, avg payment time`,
      disputeRate: `${config.trust.weights.disputeRate * 100}% - Dispute rate, resolution rate, severity`,
      deliverySuccess: `${config.trust.weights.deliverySuccess * 100}% - Success rate, on-time rate, return rate`,
    },
    tiers: config.trust.tiers,
    events: {
      published: [
        'trust.calculated',
        'trust.updated',
        'trust.tier.changed',
        'trust.event.recorded',
        'trust.alert',
        'trust.anomaly.detected',
      ],
    },
  });
});

// Health
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: config.serviceName, port: config.port, timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/trust', trustRouter);

// 404 and error handling
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info(`╔══════════════════════════════════════════════════════╗`);
  logger.info(`║   REZ Trust Scorer - 25/25/25/25 Weighted Formula  ║`);
  logger.info(`╠══════════════════════════════════════════════════════╣`);
  logger.info(`║   Port: ${config.port.toString().padEnd(45)}║`);
  logger.info(`║   Env:  ${config.nodeEnv.padEnd(45)}║`);
  logger.info(`║   Event Bus: ${(config.eventBusEnabled ? config.eventBusUrl : 'disabled').padEnd(38)}║`);
  logger.info(`╚══════════════════════════════════════════════════════╝`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => { process.exit(0); });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => { process.exit(0); });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;
