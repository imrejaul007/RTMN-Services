/**
 * nexha-tenant-summary — main entry (ADR-0011 Phase 13, 2026-06-23).
 *
 * Read-only fan-out aggregator. No DB of its own.
 * Port: 4387.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import routes from './routes/index.js';

const SERVICE_NAME = 'nexha-tenant-summary';
const PORT = parseInt(process.env.PORT || '4387', 10);

const app = express();
const START_TIME = Date.now();

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', credentials: true }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

// Global rate limit (200 req/min/IP) — read-heavy but still protected.
app.use(rateLimit({ windowMs: 60 * 1000, max: 200 }));

// ─────────────────────────────────────────────────────────────────
// Health & info
// ─────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
  });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, service: SERVICE_NAME });
});

app.get('/', (_req, res) => {
  res.json({
    name: SERVICE_NAME,
    description: 'Nexha Tenant Summary — fan-out aggregator across all ADR-0010 services.',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      summary: 'GET /api/tenants/:tenantId/summary',
      section: 'GET /api/tenants/:tenantId/summary/:section',
      sources: 'GET /api/sources',
      upstreams: 'GET /api/health/upstreams',
    },
  });
});

// ─────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────

app.use('/api', routes);

// 404 + error handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(`[${SERVICE_NAME}] Unhandled error:`, err);
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err?.message || 'internal error' },
    });
  }
});

// ─────────────────────────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────────────────────────

const ENTRY =
  process.argv[1] &&
  (process.argv[1].endsWith('index.js') || process.argv[1].endsWith('index.ts'));

if (ENTRY) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[${SERVICE_NAME}] listening on :${PORT}`);
  });
}

export { app };
export default app;