/**
 * GENIE Personal Twin Service - Main Entry Point
 * Version: 1.0.0 | Date: June 15, 2026
 * Purpose: Personal Twin for Genie - Individual user digital twin
 *
 * Tagline: "Your Personal Intelligence, Simplified"
 *
 * Port: 4708
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import twinRoutes from './routes/twinRoutes.js';

const PORT = parseInt(process.env.PORT || '4708', 10);
const SERVICE_NAME = 'genie-personal-twin-service';

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(rateLimit({ windowMs: 60000, max: 100, message: { success: false, error: { code: 'RATE_LIMIT' } }));
app.use(express.json({ limit: '10mb' }));
app.use(compression());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = `req_${Date.now()}`;
  res.setHeader('X-Request-Id', requestId);
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: SERVICE_NAME, message: 'request', requestId, method: req.method, path: req.path }));
  next();
});

// Health
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});
app.get('/health/live', (_req: Request, res: Response) => res.json({ status: 'ok' }));
app.get('/health/ready', (_req: Request, res: Response) => res.json({ status: 'ready' }));

// API
app.use('/api', twinRoutes);

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
});

// Error
app.use((err: Error, _req: Request, res: Response) => {
  console.error(JSON.stringify({ service: SERVICE_NAME, error: err.message }));
  res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } });
});

// Start
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║  GENIE Personal Twin Service           ║
║  Your Digital Twin                    ║
║  Port: ${PORT.toString().padEnd(33)}║
║  "You don't use Genie. Talk to Genie."║
╚═══════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

export default app;
