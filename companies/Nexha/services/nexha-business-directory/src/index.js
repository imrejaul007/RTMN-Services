/**
 * nexha-business-directory — main entry (ADR-0009 Phase 3).
 *
 * Express service exposing the canonical Business Directory of
 * companies + agents + capabilities + trust linkage in the Nexha
 * network. MongoDB-backed (mongoose). JWT + internal-token auth
 * (same pattern as the other nexha-* services).
 *
 * Port: 4360  (per the ADR-0009 plan)
 */

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import routes from './routes/index.js';
import * as svc from './services/directoryService.js';
import { tenantFrom } from './middleware/auth.js';

const SERVICE_NAME = 'nexha-business-directory';
const PORT = parseInt(process.env.PORT || '4360', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexha_directory';

const app = express();
const START_TIME = Date.now();

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', credentials: true }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

// Global rate limit (100 req/min/IP) — strict on writes (20 req/min/IP).
app.use(rateLimit({ windowMs: 60 * 1000, max: 100 }));

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
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.get('/ready', (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ ready, mongodb: mongoose.connection.readyState });
});

app.get('/', (_req, res) => {
  res.json({
    name: SERVICE_NAME,
    description: 'Nexha Business Directory — companies, agents, capabilities, trust.',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      companies: ['POST /api/v1/companies', 'GET /api/v1/companies', 'GET /api/v1/companies/:id'],
      agents: ['POST /api/v1/companies/:id/agents', 'GET /api/v1/companies/:id/agents'],
      search: ['GET /api/v1/capabilities'],
      trust: ['GET /api/v1/trust?companyIds=co-1,co-2'],
    },
  });
});

// ─────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────

app.use('/api/v1', routes);

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

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    // eslint-disable-next-line no-console
    console.log(`[${SERVICE_NAME}] MongoDB connected at ${MONGODB_URI}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[${SERVICE_NAME}] MongoDB connect failed:`, err.message);
    process.exit(1);
  }

  if (process.env.SEED_DEMO_DATA === 'true') {
    try {
      const seeded = await svc.seedDemoCompanies();
      // eslint-disable-next-line no-console
      console.log(`[${SERVICE_NAME}] seeded ${seeded} demo companies`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[${SERVICE_NAME}] demo seed failed:`, err.message);
    }
  }

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[${SERVICE_NAME}] listening on :${PORT}`);
  });
}

// Module entry guard (so tests can import the app without binding a port).
const ENTRY =
  process.argv[1] &&
  (process.argv[1].endsWith('index.js') || process.argv[1].endsWith('index.ts'));

if (ENTRY) {
  start().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(`[${SERVICE_NAME}] fatal startup error:`, err);
    process.exit(1);
  });
}

export { app, tenantFrom };
export default app;
