/**
 * HOJAI AI Recommendation Engine
 *
 * Express server for rule-based + embedding similarity recommendations
 * Port: 4742
 */

import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import recommendationRoutes from './routes/recommendationRoutes.js';
import { logger } from './utils/logger.js';
import { initializeMockData, getDataStats } from './services/dataStore.js';

const PORT = parseInt(process.env.PORT ?? '4742', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

// Create Express app
const app: Express = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Tenant-ID'],
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    contentLength: req.get('content-length'),
  });
  next();
});

// Root health check
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'hojai-recommendation-engine',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    docs: {
      recommend: 'POST /api/recommend',
      userRecommend: 'GET /api/recommend/:userId',
      trending: 'GET /api/trending',
      similar: 'POST /api/similar',
      health: 'GET /api/health',
    },
  });
});

// API routes
app.use('/api', recommendationRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
    timestamp: new Date().toISOString(),
  });
});

// Initialize and start server
async function start(): Promise<void> {
  // Initialize mock data
  initializeMockData();

  // Log data stats
  const stats = getDataStats();
  logger.info(`Data store initialized: ${stats.productCount} products, ${stats.purchaseCount} purchases`);

  // Start server
  

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'recommendation-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
app.listen(PORT, HOST, () => {
    logger.info('='.repeat(60));
    logger.info('HOJAI Recommendation Engine started');
    logger.info('='.repeat(60));
    logger.info(`Listening on ${HOST}:${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/api/health`);
    logger.info(`Recommend: POST http://localhost:${PORT}/api/recommend`);
    logger.info(`User recommend: GET http://localhost:${PORT}/api/recommend/:userId`);
    logger.info(`Trending: GET http://localhost:${PORT}/api/trending`);
    logger.info(`Similar: POST http://localhost:${PORT}/api/similar`);
    logger.info(`Stats: GET http://localhost:${PORT}/api/stats`);
    logger.info('='.repeat(60));
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
start().catch((error) => {
  logger.error('Failed to start server', { error: error.message });
  process.exit(1);
});

export default app;
