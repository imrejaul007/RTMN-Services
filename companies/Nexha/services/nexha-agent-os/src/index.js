/**
 * Nexha AgentOS — Main Entry Point
 * Port: 4372
 *
 * AI workforce: CEO, Marketing, Finance, Procurement, Customer Care agents.
 * Tenant-scoped via x-tenant-id header.
 *
 * ADR-??? Phase 3 (2026-06-25).
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import agentRoutes from './routes/agent.routes.js';

const PORT = parseInt(process.env.PORT || '4372', 10);
const START = Date.now();

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 60000, max: 200 }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] [agent-os] ${req.method} ${req.path}`);
  next();
});

app.use(agentRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error('[agent-os] error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal error' });
});

app.listen(PORT, () => {
  console.log(`[agent-os] Nexha AgentOS listening on :${PORT}`);
  console.log(`[agent-os] Ready in ${Math.round((Date.now() - START) / 1000)}s`);
});

process.on('SIGTERM', () => { console.log('[agent-os] shutting down'); process.exit(0); });
process.on('SIGINT', () => { console.log('[agent-os] shutting down'); process.exit(0); });
