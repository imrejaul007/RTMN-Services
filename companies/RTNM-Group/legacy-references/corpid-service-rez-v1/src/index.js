/**
 * CorpID Service - Universal Identity for RTMN
 * Port: 4702
 *
 * Provides universal identity for all entities:
 * - Human (employee, customer, merchant, supplier)
 * - Business (company, franchise, partner)
 * - Agent (AI agent, automation, bot)
 * - Machine (IoT, equipment, device)
 * - Product (SKU, service, bundle)
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import Redis from 'ioredis';

import identityRoutes from './routes/identity.js';
import trustRoutes from './routes/trust.js';
import relationshipRoutes from './routes/relationships.js';
import agentRoutes from './routes/agents.js';

const app = express();
const PORT = process.env.PORT || 4702;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// Redis for persistence
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Entity type prefixes
const ENTITY_TYPES = {
  INDIVIDUAL: 'IND',  // Human
  BUSINESS: 'BIZ',   // Company
  SUPPLIER: 'SUP',    // Supplier
  MERCHANT: 'MER',    // Merchant
  DRIVER: 'DRV',      // Driver
  FRANCHISE: 'FRN',   // Franchise
  AGENT: 'AGT',       // AI Agent
  MACHINE: 'MCH',    // Machine/IoT
  PRODUCT: 'PRD'     // Product
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

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
      service: 'corpId-service',
      version: '1.0.0',
      port: PORT,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Stats
app.get('/stats', async (req, res) => {
  const stats = {
    totalEntities: await redis.scard('corpId:entities'),
    byType: {}
  };

  for (const [type, prefix] of Object.entries(ENTITY_TYPES)) {
    const keys = await redis.keys(`corpId:entity:${prefix}:*`);
    stats.byType[type] = keys.length;
  }

  res.json(stats);
});

// Routes
app.use('/api/identity', identityRoutes);
app.use('/api/trust', trustRoutes);
app.use('/api/relationships', relationshipRoutes);
app.use('/api/agents', agentRoutes);

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  logger.info(`CorpID Service running on port ${PORT}`);
  logger.info('Entity types:', Object.keys(ENTITY_TYPES).join(', '));
});

export { app, redis, ENTITY_TYPES };
