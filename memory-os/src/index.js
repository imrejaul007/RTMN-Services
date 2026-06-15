/**
 * MemoryOS - Personal AI Memory Service
 * Port: 4703
 *
 * Provides persistent memory for every CorpID:
 * - Episodic: Experiences, events
 * - Semantic: Facts, knowledge
 * - Procedural: Skills, how-tos
 * - Relational: Connections, relationships
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import Redis from 'ioredis';

import memoryRoutes from './routes/memory.js';
import contextRoutes from './routes/context.js';

const app = express();
const PORT = process.env.PORT || 4703;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// Redis for memory storage
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Memory types
const MEMORY_TYPES = {
  EPISODIC: 'episodic',    // Experiences, events
  SEMANTIC: 'semantic',    // Facts, knowledge
  PROCEDURAL: 'procedural', // Skills, how-tos
  RELATIONAL: 'relational'  // Connections, relationships
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
      service: 'memory-os',
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
  const totalMemories = await redis.scard('memory:entities');
  res.json({
    totalEntities: totalMemories,
    memoryTypes: Object.keys(MEMORY_TYPES)
  });
});

// Routes
app.use('/api/memories', memoryRoutes);
app.use('/api/context', contextRoutes);

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  logger.info(`MemoryOS running on port ${PORT}`);
  logger.info('Memory types:', Object.values(MEMORY_TYPES).join(', '));
});

export { app, redis, MEMORY_TYPES };
