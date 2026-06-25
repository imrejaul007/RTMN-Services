/**
 * marketplace-listings service — Express entrypoint (port 4255).
 *
 * ADR-0010 Phase 5: Agent Marketplace (HOJAI AI).
 *
 * Public marketplace UI + listings + reviews, backed by:
 *   - nexha-business-directory (port 4360) for company/agent/capability linkage
 *   - nexha-sada-public (port 4191) for trust score enrichment (optional)
 *
 * Exports `app` for supertest and `start()` for direct invocation. Auto-starts
 * the listener only when invoked directly (`node src/index.js`) — NOT when
 * imported by tests.
 */

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import routes from './routes/index.js';
import { getInternalToken } from './middleware/auth.js';

const PORT = parseInt(process.env.MARKETPLACE_LISTINGS_PORT || '4255', 10);
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/marketplace_listings';

export const app = express();

// Security + body parsing + observability
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// Mount the marketplace routes
app.use('/', routes);

// Internal-token-protected internal sanity check (used by Hub's health aggregation)
app.get('/internal/sanity', (req, res) => {
  const token = getInternalToken();
  if (!token || req.get('x-internal-token') !== token) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  return res.json({
    ok: true,
    mongoState: mongoose.connection?.readyState ?? -1,
    timestamp: new Date().toISOString(),
  });
});

// 404 + error handler
app.use((_req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[marketplace-listings] unhandled error:', err);
  res.status(500).json({ error: err.message || 'internal error' });
});

let _server = null;

export async function start() {
  // Connect to MongoDB unless caller already has a connection (tests).
  if (mongoose.connection?.readyState !== 1) {
    await mongoose.connect(MONGODB_URI);
  }
  return new Promise((resolve) => {
    _server = app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`[marketplace-listings] listening on :${PORT} (mongo=${MONGODB_URI})`);
      resolve(_server);
    });
  });
}

export async function stop() {
  if (_server) {
    await new Promise((resolve) => _server.close(resolve));
    _server = null;
  }
  if (mongoose.connection?.readyState === 1) {
    await mongoose.disconnect();
  }
}

// Conditionally auto-start the listener when this file is run directly.
const isDirectRun = import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  start().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[marketplace-listings] failed to start:', err);
    process.exit(1);
  });
}