/**
 * SUTAR Agent Economy - Karma Points and Agent Commerce
 * Port: 4251
 *
 * Provides economic infrastructure for agent-to-agent commerce:
 * - Karma points (reputation currency)
 * - SLBs (Service Level Bonds)
 * - Agent payments
 * - Escrow management
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import Redis from 'ioredis';

import economyRoutes from './routes/economy.js';
import paymentRoutes from './routes/payments.js';

const app = express();
const PORT = process.env.PORT || 4251;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// Redis
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Currency types
const CURRENCY = {
  KARMA: 'karma',     // Reputation points
  SLB: 'slb',        // Service Level Bonds
  REZ: 'rez'         // Platform currency
};

// Transaction types
const TX_TYPE = {
  PAYMENT: 'payment',
  ESCROW_DEPOSIT: 'escrow_deposit',
  ESCROW_RELEASE: 'escrow_release',
  ESCROW_REFUND: 'escrow_refund',
  KARMA_EARN: 'karma_earn',
  KARMA_BURN: 'karma_burn',
  SLB_STAKE: 'slb_stake',
  SLB_SLASH: 'slb_slash'
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      duration: Date.now() - start,
      status: res.statusCode
    });
  });
  next();
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    res.json({
      status: 'healthy',
      service: 'agent-economy',
      version: '1.0.0',
      port: PORT,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Routes
app.use('/api/economy', economyRoutes);
app.use('/api/payments', paymentRoutes);

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Agent Economy running on port ${PORT}`);
  logger.info('Currencies:', Object.values(CURRENCY).join(', '));
});

export { app, redis, CURRENCY, TX_TYPE };
