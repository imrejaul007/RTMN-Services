/**
 * HOJAI Blueprint Compiler Service
 * Port 4391
 *
 * Converts company.blueprint.yaml into generated project files.
 * Then optionally deploys to HOJAI Cloud.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import compileRoutes from './routes/compile.js';
import { getAllJobs } from './compiler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PORT = process.env.PORT || 4391;
const HOST = process.env.HOST || '0.0.0.0';

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'blueprint-compiler',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  try {
    const jobs = getAllJobs();
    res.json({
      status: 'ready',
      service: 'blueprint-compiler',
      version: '1.0.0',
      activeJobs: jobs.filter(j => j.state === 'compiling' || j.state === 'deploying').length,
      totalJobs: jobs.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error.message
    });
  }
});

// API Routes
app.use('/api/v1/compile', compileRoutes);

// API documentation
app.get('/api/v1', (req, res) => {
  res.json({
    service: 'HOJAI Blueprint Compiler',
    version: '1.0.0',
    description: 'Converts company.blueprint.yaml into generated project files',
    endpoints: {
      compile: {
        'POST /api/v1/compile': 'Start compilation from blueprint',
        'GET /api/v1/compile/:id': 'Get compilation status',
        'GET /api/v1/compile/:id/status': 'Poll compilation + deploy status',
        'GET /api/v1/compile/:id/files': 'Get compiled files',
        'GET /api/v1/compile/:id/download': 'Download all files',
        'POST /api/v1/compile/:id/deploy': 'Deploy to HOJAI Cloud',
        'GET /api/v1/compile': 'List all compile jobs'
      }
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'HOJAI Blueprint Compiler',
    tagline: 'Where blueprints become businesses',
    description: 'Converts company.blueprint.yaml into generated project files',
    version: '1.0.0',
    port: PORT,
    docs: '/api/v1',
    health: '/health',
    ready: '/ready'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    hint: 'Visit /api/v1 for available endpoints'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║     🏗️  HOJAI BLUEPRINT COMPILER — PORT ${PORT}                        ║
║                                                                  ║
║     Where blueprints become businesses                             ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║     Endpoints:                                                   ║
║       GET  /              — Service info                         ║
║       GET  /health        — Health check                        ║
║       GET  /ready         — Readiness probe                     ║
║       GET  /api/v1        — API documentation                  ║
║                                                                  ║
║       POST /api/v1/compile         — Start compilation          ║
║       GET  /api/v1/compile/:id    — Get status                 ║
║       GET  /api/v1/compile/:id/status — Poll status           ║
║       GET  /api/v1/compile/:id/files — Get files               ║
║       POST /api/v1/compile/:id/deploy — Deploy to cloud         ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
