/**
 * sutar-tenant-instances — Express entrypoint.
 *
 * Port: SUTAR_TENANT_INSTANCES_PORT (default 4141)
 * Auth: dual mode (JWT with sutar:admin role OR x-internal-token)
 *
 * ADR-0010 Phase 9 (2026-06-22).
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoose from 'mongoose';
import routes from './routes/index.js';
import rezIntel from './rez-intel-client.js';

const PORT = parseInt(process.env.SUTAR_TENANT_INSTANCES_PORT || '4141', 10);
const MONGO_URI =
  process.env.SUTAR_TENANT_INSTANCES_MONGO_URI ||
  process.env.MONGO_URI ||
  'mongodb://localhost:27017/sutar_tenant_instances';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(routes);

// Generic error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[sutar-tenant-instances] error:', err);
  res.status(500).json({ error: err.message || 'internal error' });
});

async function start() {
  try {
    if (MONGO_URI && MONGO_URI !== 'memory') {
      await mongoose.connect(MONGO_URI);
      // eslint-disable-next-line no-console
      console.log(`[sutar-tenant-instances] connected to MongoDB at ${MONGO_URI}`);
    }

    // REZ Intelligence endpoints
    app.get('/rez-intel-status', async (_req, res) => {
      const isHealthy = await rezIntel.checkRezIntelHealth();
      res.json({ rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED, rezIntelUrl: rezIntel.REZ_INTEL_URL, rezIntelHealthy: isHealthy });
    });

    app.post('/api/enrich', async (req, res) => {
      const { agentRole, userId, companyId, query, context } = req.body || {};
      const enriched = await rezIntel.enrichAgentContext({ agentRole, userId, companyId, query, context }).catch(() => null);
      res.json({ enriched, source: enriched ? 'rez-intel' : 'unavailable' });
    });

    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`[sutar-tenant-instances] listening on :${PORT}`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[sutar-tenant-instances] startup error:', err);
    process.exit(1);
  }
}

start();

// Graceful shutdown
const shutdown = async () => {
  // eslint-disable-next-line no-console
  console.log('[sutar-tenant-instances] shutting down');
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app };