/**
 * Hojai Feature Store - Main Entry Point
 * Port: 4710
 */

import express, { Application } from 'express';
import config from './config';
import { redisService } from './services/redis';
import { errorHandler, notFoundHandler } from './middleware/error';
import { rateLimitMiddleware } from './middleware/rateLimit';
import featureRoutes from './routes/features';
import healthRoutes from './routes/health';

const app: Application = express();
const PORT = config.port;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Health routes (no auth required)
app.use('/', healthRoutes);

// API routes with auth and rate limiting
app.use('/api/features', rateLimitMiddleware, featureRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
async function shutdown(): Promise<void> {
  console.log('Shutting down gracefully...');
  await redisService.disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
async function start(): Promise<void> {
  try {
    // Connect to Redis
    console.log('Connecting to Redis...');
    await redisService.connect();

    // Start HTTP server
    

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'feature-store',
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
app.listen(PORT, () => {
      console.log(`Hojai Feature Store running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Redis: ${config.redis.host}:${config.redis.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
