/**
 * RTMN Memory Network
 *
 * Provides hierarchical memory architecture:
 * - Personal Memory (Individual user)
 * - Business Memory (Company-wide context)
 * - Industry Memory (Industry knowledge)
 * - Ecosystem Memory (Cross-company context)
 * - Agent Memory (AI agent memories)
 *
 * Port: 4295
 */

import express from 'express';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import Redis from 'ioredis';

// Routes
import memoryRoutes from './routes/memory.js';
import tierRoutes from './routes/tiers.js';
import federationRoutes from './routes/federation.js';
import syncRoutes from './routes/sync.js';

const app = express();
const PORT = process.env.PORT || 4295;

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

// Memory Tiers - Hierarchical Architecture
export const MEMORY_TIERS = {
  PERSONAL: 'personal',         // Individual user memories
  BUSINESS: 'business',       // Company-wide context
  INDUSTRY: 'industry',       // Industry knowledge
  ECOSYSTEM: 'ecosystem',     // Cross-company context
  AGENT: 'agent'              // AI agent memories
};

// Memory Types within each tier
export const MEMORY_TYPES = {
  EPISODIC: 'episodic',       // Events and experiences
  SEMANTIC: 'semantic',       // Facts and knowledge
  PROCEDURAL: 'procedural',   // Skills and processes
  RELATIONAL: 'relational'    // Relationships and connections
};

// Privacy Levels
export const PRIVACY_LEVELS = {
  PRIVATE: 'private',         // Only owner can access
  TEAM: 'team',               // Team members can access
  COMPANY: 'company',         // Company-wide accessible
  INDUSTRY: 'industry',       // Industry-wide accessible
  PUBLIC: 'public'            // Everyone can access
};

// Priority Levels
export const PRIORITY_LEVELS = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 8,
  CRITICAL: 10
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
      service: 'memory-network',
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
    name: 'RTMN Memory Network',
    version: '1.0.0',
    description: 'Hierarchical memory architecture',
    port: PORT,
    tiers: Object.values(MEMORY_TIERS),
    types: Object.values(MEMORY_TYPES),
    endpoints: [
      'GET /api/memory/:corpId',
      'POST /api/memory/personal',
      'POST /api/memory/business',
      'POST /api/memory/industry',
      'POST /api/memory/ecosystem',
      'POST /api/memory/agent',
      'POST /api/memory/federate',
      'POST /api/memory/sync'
    ]
  });
});

// Routes
app.use('/api/memory', memoryRoutes);
app.use('/api/tiers', tierRoutes);
app.use('/api/federation', federationRoutes);
app.use('/api/sync', syncRoutes);

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


const server = app.listen(PORT, () => {
  logger.info(`Memory Network running on port ${PORT}`);
});
installGracefulShutdown(server);

export { app, redis, logger };
