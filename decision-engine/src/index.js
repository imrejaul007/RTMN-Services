/**
 * SUTAR Decision Engine - Policy and Authorization
 * Port: 4240
 *
 * Makes decisions based on:
 * - Policy compliance validation
 * - Risk assessment
 * - Authorization checks
 * - Trust score verification
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import Redis from 'ioredis';

import decisionRoutes from './routes/decisions.js';
import policyRoutes from './routes/policies.js';

const app = express();
const PORT = process.env.PORT || 4240;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// Redis
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Decision outcomes
const DECISION = {
  PROCEED: 'proceed',
  HOLD: 'hold',
  REJECT: 'reject',
  ESCALATE: 'escalate'
};

// Risk levels
const RISK = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
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
      service: 'decision-engine',
      version: '1.0.0',
      port: PORT,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Routes
app.use('/api/decisions', decisionRoutes);
app.use('/api/policies', policyRoutes);

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Decision Engine running on port ${PORT}`);
});

export { app, redis, DECISION, RISK };
