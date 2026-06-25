/**
 * Nexha CatalogOS — Main Entry Point
 * Port: 4370
 *
 * Product catalog + variants + pricing + inventory + channel publishing.
 * Tenant-scoped via x-tenant-id header.
 *
 * ADR-??? Phase 1 (2026-06-25).
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import catalogRoutes from './routes/catalog.routes.js';

const PORT = parseInt(process.env.PORT || '4370', 10);
const START = Date.now();

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 60000, max: 200 }));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] [catalog-os] ${req.method} ${req.path}`);
  next();
});

app.use(catalogRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('[catalog-os] error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal error' });
});

app.listen(PORT, () => {
  console.log(`[catalog-os] Nexha CatalogOS listening on :${PORT}`);
  console.log(`[catalog-os] Ready in ${Math.round((Date.now() - START) / 1000)}s`);
});

process.on('SIGTERM', () => {
  console.log('[catalog-os] SIGTERM — shutting down');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[catalog-os] SIGINT — shutting down');
  process.exit(0);
});
