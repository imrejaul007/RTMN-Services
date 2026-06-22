/**
 * HOJAI RAG Service - Main Entry Point
 * Port: 4731
 *
 * Retrieval Augmented Generation Service for HOJAI AI
 * Provides document storage, semantic search, and LLM-powered generation
 */

import express, { Application } from 'express';
import config from './config';
import { errorHandler, notFoundHandler } from './middleware/error';
import { rateLimitMiddleware, generationRateLimit } from './middleware/rateLimit';
import { authMiddleware } from './middleware/auth';
import documentRoutes from './routes/documents';
import searchRoutes from './routes/search';
import generateRoutes from './routes/generate';
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
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Health routes (no auth required)
app.use('/', healthRoutes);
app.use('/health', healthRoutes);

// API routes with auth and rate limiting
app.use('/api/documents', authMiddleware, rateLimitMiddleware, documentRoutes);
app.use('/api/search', authMiddleware, rateLimitMiddleware, searchRoutes);
app.use('/api/generate', authMiddleware, generationRateLimit, generateRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
async function shutdown(): Promise<void> {
  console.log('Shutting down HOJAI RAG Service...');
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
    service: 'rag',
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
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                    HOJAI RAG SERVICE                            ║');
    console.log('╠═══════════════════════════════════════════════════════════════════╣');
    console.log(`║  Port:         ${PORT}                                              ║`);
    console.log(`║  Environment:  ${config.nodeEnv.padEnd(47)}║`);
    console.log(`║  Version:      ${config.version.padEnd(47)}║`);
    console.log('╠═══════════════════════════════════════════════════════════════════╣');
    console.log('║  Endpoints:                                                   ║');
    console.log('║    GET  /health              Health check                      ║');
    console.log('║    GET  /health/ready        Readiness check                   ║');
    console.log('║    GET  /health/live         Liveness check                    ║');
    console.log('║    POST /api/documents        Add document                     ║');
    console.log('║    POST /api/documents/batch  Batch add documents              ║');
    console.log('║    GET  /api/documents       List all documents               ║');
    console.log('║    GET  /api/documents/:id   Get document by ID              ║');
    console.log('║    DELETE /api/documents/:id Delete document                  ║');
    console.log('║    POST /api/search          Semantic search                   ║');
    console.log('║    POST /api/generate        Generate with RAG context        ║');
    console.log('╠═══════════════════════════════════════════════════════════════════╣');
    console.log('║  Configuration:                                               ║');
    console.log(`║    LLM Provider:      ${config.llmProvider.padEnd(40)}║`);
    console.log(`║    OpenAI Model:      ${config.openaiModel.padEnd(40)}║`);
    console.log(`║    Embedding Model:   ${config.embeddingModel.padEnd(40)}║`);
    console.log(`║    Embedding Dims:    ${config.embeddingDimension.toString().padEnd(40)}║`);
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
  });
}

start();

export default app;
