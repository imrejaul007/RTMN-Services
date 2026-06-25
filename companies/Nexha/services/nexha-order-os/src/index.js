/**
 * Nexha OrderOS — Main Entry Point
 * Port: 4371
 *
 * Per-company purchase order lifecycle.
 * Tenant-scoped via x-tenant-id header.
 *
 * ADR-??? Phase 2 (2026-06-25).
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import orderRoutes from './routes/order.routes.js';

const PORT = parseInt(process.env.PORT || '4371', 10);
const START = Date.now();

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 60000, max: 200 }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] [order-os] ${req.method} ${req.path}`);
  next();
});

app.use(orderRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error('[order-os] error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal error' });
});

app.listen(PORT, () => {
  console.log(`[order-os] Nexha OrderOS listening on :${PORT}`);
  console.log(`[order-os] Ready in ${Math.round((Date.now() - START) / 1000)}s`);
});

process.on('SIGTERM', () => { console.log('[order-os] shutting down'); process.exit(0); });
process.on('SIGINT', () => { console.log('[order-os] shutting down'); process.exit(0); });
