/**
 * Hojai Model Registry - Main Entry Point
 * Port: 4711
 *
 * ML Model Registry Service for HOJAI AI
 * Manages model versions, stages, and metadata
 */

import express, { Application } from 'express';
import config from './config';
import { errorHandler, notFoundHandler } from './middleware/error';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { authMiddleware } from './middleware/auth';
import modelRoutes from './routes/models';
import healthRoutes from './routes/health';

const app: Application = express();
const PORT = config.port;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Health routes (no auth required)
app.use('/health', healthRoutes);
app.use('/', healthRoutes);

// API routes with auth and rate limiting
app.use('/api/models', authMiddleware, rateLimitMiddleware, modelRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
async function shutdown(): Promise<void> {
  console.log('Shutting down gracefully...');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
function start(): void {
  

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'model-registry',
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
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║           HOJAI MODEL REGISTRY SERVICE                        ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  Port:        ${PORT}                                          ║`);
    console.log(`║  Environment: ${config.nodeEnv.padEnd(42)}║`);
    console.log(`║  Version:     ${config.version.padEnd(42)}║`);
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║  Endpoints:                                                 ║');
    console.log('║    GET  /health              Health check                    ║');
    console.log('║    POST /api/models          Register model                  ║');
    console.log('║    GET  /api/models          List all models                 ║');
    console.log('║    GET  /api/models/:name    Get model versions             ║');
    console.log('║    GET  /api/models/:name/latest  Get latest version        ║');
    console.log('║    GET  /api/models/:name/:version   Get specific version   ║');
    console.log('║    PUT  /api/models/:name/:version/stage  Update stage      ║');
    console.log('║    DELETE /api/models/:name/:version  Delete version        ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
  });
}

start();

export default app;
