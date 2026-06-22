/**
 * Hojai Model Router - Main Entry Point
 * Port: 4712
 *
 * Intelligent LLM Provider Routing Service for HOJAI AI
 * Routes requests to appropriate LLM providers based on task type
 */

import express, { Application } from 'express';
import config from './config';
import { errorHandler, notFoundHandler } from './middleware/error';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { authMiddleware } from './middleware/auth';
import routerRoutes from './routes/router';
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

// API routes with auth and rate limiting
app.use('/api', authMiddleware, rateLimitMiddleware, routerRoutes);

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
    service: 'model-router',
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
    console.log('║              HOJAI MODEL ROUTER SERVICE                      ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  Port:        ${PORT}                                          ║`);
    console.log(`║  Environment: ${config.nodeEnv.padEnd(42)}║`);
    console.log(`║  Version:     ${config.version.padEnd(42)}║`);
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║  Endpoints:                                                 ║');
    console.log('║    GET  /health              Health check                  ║');
    console.log('║    GET  /health/ready        Readiness probe               ║');
    console.log('║    GET  /health/live         Liveness probe                ║');
    console.log('║    POST /api/route           Route request to model         ║');
    console.log('║    POST /api/fallback       Handle provider fallback       ║');
    console.log('║    GET  /api/providers      List available providers      ║');
    console.log('║    GET  /api/costs          Get cost estimates            ║');
    console.log('║    GET  /api/stats          Get router statistics          ║');
    console.log('║    DELETE /api/stats        Reset statistics               ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║  Task Routing:                                             ║');
    console.log('║    chat      -> GPT-4o-mini (cost optimized)                ║');
    console.log('║    embed     -> OpenAI embeddings                          ║');
    console.log('║    classify  -> Claude 3.5 Sonnet (analysis)               ║');
    console.log('║    complete  -> GPT-4o-mini                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
  });
}

start();

export default app;
