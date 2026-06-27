/**
 * HOJAI AI Architect Service
 * Port 4390
 *
 * Interview engine that generates company.blueprint.yaml from founder ideas.
 * Acts as the "world-class CTO" that interviews founders.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import interviewRoutes from './routes/interview.js';
import blueprintRoutes from './routes/blueprint.js';
import { getQuestionCount } from './questions/index.js';
import { getInterviewStats } from './interview-store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PORT = process.env.PORT || 4390;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', 'data');

// Ensure data directory exists
import { mkdirSync } from 'fs';
mkdirSync(DATA_DIR, { recursive: true });

// Create Express app
const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}


// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
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
    service: 'ai-architect',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', async (req, res) => {
  try {
    const stats = getInterviewStats();
    res.json({
      status: 'ready',
      service: 'ai-architect',
      version: '1.0.0',
      questionCount: getQuestionCount(),
      interviews: stats.total,
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
app.use('/api/v1/interview', interviewRoutes);
app.use('/api/v1/blueprint', blueprintRoutes);

// API documentation endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    service: 'HOJAI AI Architect',
    version: '1.0.0',
    description: 'Interview engine that generates company.blueprint.yaml from founder ideas',
    endpoints: {
      interview: {
        'POST /api/v1/interview/start': 'Start a new interview with a company idea',
        'POST /api/v1/interview/:id/answer': 'Submit an answer to the current question',
        'GET /api/v1/interview/:id': 'Get interview state with all answers',
        'POST /api/v1/interview/:id/complete': 'Force-complete an interview',
        'DELETE /api/v1/interview/:id': 'Delete an interview',
        'GET /api/v1/interview/stats/all': 'Get interview statistics'
      },
      blueprint: {
        'GET /api/v1/blueprint/:id': 'Get blueprint by interview ID',
        'GET /api/v1/blueprint/:id/summary': 'Get blueprint summary for display'
      }
    },
    questionCount: getQuestionCount()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'HOJAI AI Architect',
    tagline: 'The AI Architect — Where AI-native companies are born',
    description: 'Interview engine that generates company.blueprint.yaml from founder ideas',
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
║     🤖 HOJAI AI ARCHITECT — PORT ${PORT}                            ║
║                                                                  ║
║     The AI Architect — Where AI-native companies are born        ║
║                                                                  ║
║     ${getQuestionCount()} questions to design your perfect company                     ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║     Endpoints:                                                   ║
║       GET  /              — Service info                         ║
║       GET  /health        — Health check                        ║
║       GET  /ready         — Readiness probe                     ║
║       GET  /api/v1        — API documentation                  ║
║                                                                  ║
║       POST /api/v1/interview/start     — Start interview       ║
║       POST /api/v1/interview/:id/answer — Answer question       ║
║       GET  /api/v1/interview/:id       — Get interview          ║
║       POST /api/v1/interview/:id/complete — Complete            ║
║                                                                  ║
║       GET  /api/v1/blueprint/:id       — Get blueprint          ║
║       GET  /api/v1/blueprint/:id/summary — Summary             ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
