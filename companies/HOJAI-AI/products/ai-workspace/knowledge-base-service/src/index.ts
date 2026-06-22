/**
 * AdBazaar - Knowledge Base Service
 * Self-service knowledge base management
 */

import express, { Request, Response, NextFunction } from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { requireAuth } from '@rtmn/shared/auth';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { articleRoutes } from './routes/articleRoutes';
import { categoryRoutes } from './routes/categoryRoutes';
import { kbMetrics } from './utils/metrics';
import logger from 'utils/logger.js';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = parseInt(process.env.PORT || '5377', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/knowledge-base';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());


app.use(requireAuth);// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests, please try again later.',
});
app.use('/api/', limiter);

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();
  _res.on('finish', () => {
    const duration = Date.now() - start;
    logger.httpRequest(req.method, req.path, _res.statusCode, duration);
    kbMetrics.recordRequestDuration(req.path, duration);
  });
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'knowledge-base-service',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Metrics endpoint
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', kbMetrics.register.contentType);
  res.end(await kbMetrics.register.metrics());
});

// API Routes
app.use('/api/articles', articleRoutes);
app.use('/api/categories', categoryRoutes);

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Database connection and server start
const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB', { uri: MONGODB_URI });
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



    const server = app.listen(PORT, () => {
      logger.info(`Knowledge Base Service running on port ${PORT}`);
    });
    installGracefulShutdown(server);
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

startServer();

export default app;