/**
 * TwinOS Query Engine
 * Port: 4884
 *
 * Natural language query interface to TwinOS graph operations.
 *
 * Accepts natural language queries and translates them to graph operations
 * against the TwinOS Graph Engine (port 4715).
 *
 * Routes:
 * - GET  /health                    - Health check
 * - GET  /ready                     - Readiness check
 * - GET  /api/query/health          - Graph engine connectivity check
 * - POST /api/query                 - Execute NL query
 * - POST /api/query/batch           - Batch query execution
 * - GET  /api/query/parse           - Parse query without executing
 * - GET  /api/query/intents         - List supported intents
 * - GET  /api/query/examples        - Get example queries
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

import queryRoutes from './routes/query.js';

const PORT = process.env.PORT || 4884;
const GRAPH_ENGINE_URL = process.env.GRAPH_ENGINE_URL || 'http://localhost:4883';

// ─── App setup ───────────────────────────────────────────────────────────────

const app = express();

// Security & middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Routes ─────────────────────────────────────────────────────────────────

// Health checks
app.get('/health', (req, res) => {
  res.json({
    service: 'twinos-query-engine',
    version: '1.0.0',
    status: 'healthy',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${GRAPH_ENGINE_URL}/health`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response.ok) {
      return res.json({
        status: 'ready',
        graphEngine: 'connected',
        graphEngineUrl: GRAPH_ENGINE_URL
      });
    }

    return res.status(503).json({
      status: 'not_ready',
      graphEngine: `unavailable (${response.status})`
    });
  } catch (err) {
    return res.status(503).json({
      status: 'not_ready',
      graphEngine: `unreachable: ${err.message}`,
      graphEngineUrl: GRAPH_ENGINE_URL
    });
  }
});

// Graph engine health (proxy)
app.get('/api/query/health', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${GRAPH_ENGINE_URL}/health`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      return res.json({
        graphEngine: 'healthy',
        url: GRAPH_ENGINE_URL,
        data
      });
    }

    return res.status(response.status).json({
      graphEngine: 'unhealthy',
      status: response.status
    });
  } catch (err) {
    return res.status(503).json({
      graphEngine: 'unreachable',
      error: err.message
    });
  }
});

// Mount query routes
app.use('/api/query', queryRoutes);

// ─── Error handling ──────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`TwinOS Query Engine listening on port ${PORT}`);
  console.log(`Graph Engine URL: ${GRAPH_ENGINE_URL}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  GET  /health                    - Health check`);
  console.log(`  GET  /ready                     - Readiness check`);
  console.log(`  GET  /api/query/health          - Graph engine connectivity`);
  console.log(`  POST /api/query                 - Execute NL query`);
  console.log(`  POST /api/query/batch           - Batch query execution`);
  console.log(`  GET  /api/query/parse?q=<query> - Parse query`);
  console.log(`  GET  /api/query/intents         - List supported intents`);
  console.log(`  GET  /api/query/examples        - Get example queries`);
  console.log('');
});

export default app;
