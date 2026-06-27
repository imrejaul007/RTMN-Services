/**
 * Decision Replay System - Main Entry Point
 * Port 4910 - Full chain replay from agent → decision → negotiation → contract → economy
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { registerReplayRoutes } from './routes/replay.js';

const PORT = parseInt(process.env.PORT || '4910', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'decision-replay-token';

// Create Express app
const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health endpoints
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'decision-replay-system',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (_req, res) => {
  res.json({ ok: true, ready: true });
});

// Internal auth middleware
function requireInternal(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) {
    res.status(401).json({ error: 'unauthorized', message: 'Invalid or missing internal token' });
    return;
  }
  next();
}

// Optional auth middleware (for dashboard access)
function maybeAuth(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (req.headers['x-internal-token'] === INTERNAL_TOKEN) {
    (req as any).isInternal = true;
  }
  next();
}

// Register routes
registerReplayRoutes(app);

// Apply auth to API routes
app.use('/api/replay', maybeAuth);

// Protected endpoints
app.post('/api/replay/*', requireInternal);

// Service info
app.get('/api/info', (_req, res) => {
  res.json({
    service: 'decision-replay-system',
    version: '1.0.0',
    port: PORT,
    description: 'Full chain replay from agent → decision → negotiation → contract → economy',
    endpoints: {
      record: 'POST /api/replay/record - Record decision event',
      updateSpan: 'PUT /api/replay/:traceId/:spanId - Update span',
      endSpan: 'POST /api/replay/:traceId/:spanId/end - End span',
      getTrace: 'GET /api/replay/:traceId - Get full trace',
      getTimeline: 'GET /api/replay/:traceId/timeline - Get visual timeline',
      getPerformance: 'GET /api/replay/:traceId/performance - Get performance analysis',
      listTraces: 'GET /api/replay - List traces',
      export: 'POST /api/replay/:traceId/export - Export trace',
      analytics: 'GET /api/replay/analytics/summary - Get analytics',
    },
    features: [
      'Span-based tracing',
      'Time travel debugging',
      'Branch comparison',
      'Performance analysis',
      'Cost attribution',
      'Timeline visualization',
    ],
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Endpoint not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'internal_error',
    message: err.message || 'An unexpected error occurred',
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ Decision Replay System listening on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   API: http://localhost:${PORT}/api/replay`);
    console.log(`   Info: http://localhost:${PORT}/api/info`);
    console.log('');
    console.log('Features:');
    console.log('  - Span-based tracing');
    console.log('  - Time travel debugging');
    console.log('  - Branch comparison');
    console.log('  - Performance analysis');
    console.log('  - Cost attribution');
  });
}

export { app };