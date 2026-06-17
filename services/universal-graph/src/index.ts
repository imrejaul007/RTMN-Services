import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import winston from 'winston';

import nodesRouter from './routes/nodes';
import edgesRouter from './routes/edges';
import queryRouter from './routes/query';
import pathRouter from './routes/path';
import recommendationsRouter from './routes/recommendations';

// Load environment variables
dotenv.config();

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Express app
const app = express();
const PORT = process.env.PORT || 4937;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'universal-graph',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Service info
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Universal Business Graph Engine',
    description: 'Connects all entities in one unified graph',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      health: 'GET /health',
      nodes: {
        list: 'GET /api/nodes',
        create: 'POST /api/nodes',
        get: 'GET /api/nodes/:nodeId',
        update: 'PATCH /api/nodes/:nodeId',
        delete: 'DELETE /api/nodes/:nodeId',
        batch: 'POST /api/nodes/batch',
      },
      edges: {
        list: 'GET /api/edges',
        create: 'POST /api/edges',
        get: 'GET /api/edges/:edgeId',
        update: 'PATCH /api/edges/:edgeId',
        delete: 'DELETE /api/edges/:edgeId',
        nodeEdges: 'GET /api/edges/node/:nodeId',
        neighbors: 'GET /api/edges/neighbors/:nodeId',
        batch: 'POST /api/edges/batch',
      },
      query: {
        stats: 'GET /api/query/stats',
        traverse: 'POST /api/query/traverse',
        aggregate: 'POST /api/query/aggregate',
        search: 'POST /api/query/search',
        subgraph: 'GET /api/query/subgraph/:nodeId',
        analyze: 'GET /api/query/analyze/:nodeId',
        commonNeighbors: 'GET /api/query/common-neighbors/:nodeId1/:nodeId2',
        entityConnections: 'GET /api/query/entity-connections',
      },
      path: {
        shortest: 'POST /api/path/shortest',
        all: 'POST /api/path/all',
        reachable: 'POST /api/path/reachable',
        connected: 'GET /api/path/connected/:sourceNodeId/:targetNodeId',
        chain: 'GET /api/path/chain/:entityType1/:entityId1/:entityType2/:entityId2',
        connectors: 'GET /api/path/connectors/:entityType1/:entityType2',
      },
      recommendations: {
        collaborative: 'POST /api/recommendations/collaborative',
        content: 'POST /api/recommendations/content',
        related: 'GET /api/recommendations/related/:nodeId',
        alsoBought: 'GET /api/recommendations/also-bought/:nodeId',
        forEntity: 'GET /api/recommendations/for-entity/:entityType/:entityId',
        popular: 'GET /api/recommendations/popular/:entityType',
        crossSell: 'GET /api/recommendations/cross-sell/:nodeId',
        trending: 'GET /api/recommendations/trending/:entityType',
      },
    },
  });
});

// Routes
app.use('/api/nodes', nodesRouter);
app.use('/api/edges', edgesRouter);
app.use('/api/query', queryRouter);
app.use('/api/path', pathRouter);
app.use('/api/recommendations', recommendationsRouter);

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/universal_graph';

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    // Continue without database for demo purposes
    logger.warn('Running without database - limited functionality');
  }
}

// Start server
async function startServer() {
  await connectToDatabase();

  app.listen(PORT, () => {
    logger.info(`Universal Business Graph Engine running on port ${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`API docs: http://localhost:${PORT}/`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await mongoose.connection.close();
  process.exit(0);
});

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export { app, logger };
