/**
 * nexha-acp-messaging — Express app entry point.
 *
 * Listens on PORT (default 4340 per ADR-0010 Phase 4). Wires:
 *   - helmet, cors, compression, json parser, request logging
 *   - routes
 *   - default error handler
 *   - MongoDB connection (MONGODB_URI)
 *
 * ADR-0010 Phase 4 (2026-06-22): per-tenant Agent Commerce Protocol with
 * persistent negotiation state + message logs.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoose from 'mongoose';

import router from './routes/index.js';

const app = express();
const PORT = parseInt(process.env.PORT || '4340', 10);

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

app.get('/', (_req, res) => {
  res.json({
    service: 'nexha-acp-messaging',
    version: '1.0.0',
    description: 'Per-tenant ACP (Agent Commerce Protocol) with persistent negotiation state + message logs.',
    adr: 'ADR-0010 Phase 4',
    endpoints: [
      'POST   /api/negotiations',
      'GET    /api/negotiations',
      'GET    /api/negotiations/:id',
      'GET    /api/negotiations/:id/messages',
      'POST   /api/negotiations/:id/messages',
      'GET    /api/stats',
      'POST   /api/validate',
      'GET    /health',
    ],
    messageTypes: ['QUERY', 'QUOTE', 'COUNTER', 'ACCEPT', 'REJECT', 'ORDER', 'TRACK', 'DISPUTE'],
  });
});

app.use(router);

// Default error handler.
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal error' });
});

async function start() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexha-acp-messaging';
  try {
    await mongoose.connect(uri);
    console.log(`[nexha-acp-messaging] Connected to MongoDB at ${uri.replace(/:[^:@/]+@/, ':***@')}`);
  } catch (err) {
    console.error('[nexha-acp-messaging] MongoDB connection failed:', err.message);
    // Don't crash — tests use mongodb-memory-server, prod should fail-fast via env check.
    if (process.env.NODE_ENV === 'production') process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`[nexha-acp-messaging] Listening on :${PORT}`);
  });
}

// Only auto-start when run directly (not when imported by tests).
const isDirectRun = import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  start();
}

export { app, start };