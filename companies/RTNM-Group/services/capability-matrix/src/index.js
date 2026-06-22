/**
 * RTMN Capability Matrix Engine
 *
 * Formal inheritance model connecting companies to Industry OS capabilities.
 * Enables capabilities to propagate from Industry OS to individual company instances.
 *
 * Port: 3013
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import Redis from 'ioredis';

// Routes
import matrixRoutes from './routes/matrix.js';
import inheritanceRoutes from './routes/inheritance.js';
import propagationRoutes from './routes/propagation.js';
import capabilityRoutes from './routes/capability.js';

const app = express();
const PORT = process.env.PORT || 3013;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Capability categories
export const CAPABILITY_CATEGORIES = {
  TECHNICAL: 'TECHNICAL',
  BUSINESS: 'BUSINESS',
  OPERATIONS: 'OPERATIONS',
  CREATIVE: 'CREATIVE',
  ANALYTICS: 'ANALYTICS',
  SUPPORT: 'SUPPORT',
  HR: 'HR',
  LEADERSHIP: 'LEADERSHIP',
  DOMAIN: 'DOMAIN'
};

// Proficiency levels
export const PROFICIENCY_LEVELS = {
  BEGINNER: { value: 1, name: 'Beginner', description: 'Basic understanding' },
  INTERMEDIATE: { value: 2, name: 'Intermediate', description: 'Working knowledge' },
  ADVANCED: { value: 3, name: 'Advanced', description: 'Expert usage' },
  EXPERT: { value: 4, name: 'Expert', description: 'Master level' }
};

// Entity types that can have capabilities
export const ENTITY_TYPES = {
  HUMAN: 'HUMAN',
  AGENT: 'AGENT',
  TEAM: 'TEAM',
  ORGANIZATION: 'ORGANIZATION'
};

// Source types for capabilities
export const SOURCE_TYPES = {
  INDUSTRY: 'INDUSTRY',
  COMPANY: 'COMPANY',
  PRODUCT: 'PRODUCT',
  SERVICE: 'SERVICE'
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
      service: 'capability-matrix',
      version: '1.0.0',
      port: PORT,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'RTMN Capability Matrix Engine',
    version: '1.0.0',
    description: 'Formal inheritance engine for RTMN capabilities',
    port: PORT,
    endpoints: [
      'GET /api/capabilities',
      'POST /api/capabilities',
      'GET /api/matrix/:corpId',
      'POST /api/matrix/inherit',
      'POST /api/matrix/propagate',
      'GET /api/inheritance/:capabilityId'
    ]
  });
});

// Routes
app.use('/api/matrix', matrixRoutes);
app.use('/api/inheritance', inheritanceRoutes);
app.use('/api/propagation', propagationRoutes);
app.use('/api/capabilities', capabilityRoutes);

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Capability Matrix Engine running on port ${PORT}`);
});

export { app, redis, logger };
