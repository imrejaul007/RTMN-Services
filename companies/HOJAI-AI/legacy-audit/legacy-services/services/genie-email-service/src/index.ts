/**
 * GENIE Email Service - Main Entry Point
 * Version: 1.0.0 | Date: June 13, 2026
 * Purpose: Email management and analysis for Genie
 *
 * Tagline: "You don't use Genie. You talk to Genie."
 *
 * Port: 4710
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import emailRoutes from './routes/emailRoutes.js';

const PORT = parseInt(process.env.PORT || '4710', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVICE_NAME = 'genie-email-service';

const app = express();

// Security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

app.use(cors({ origin: '*', credentials: true }));
app.use(rateLimit({ windowMs: 60000, max: 100, message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } } }));
app.use(express.json({ limit: '10mb' }));
app.use(compression());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  res.setHeader('X-Request-Id', requestId);
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', service: SERVICE_NAME, message: 'request_start', requestId, method: req.method, path: req.path }));
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', service: SERVICE_NAME, message: 'request_end', requestId, status: res.statusCode, duration }));
  });
  next();
});

// Health endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});
app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/health/ready', (_req: Request, res: Response) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', emailRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' }, meta: { timestamp: new Date().toISOString() } });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', service: SERVICE_NAME, message: 'error', error: err.message }));
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: NODE_ENV === 'production' ? 'An error occurred' : err.message }, meta: { timestamp: new Date().toISOString() } });
});

// Start server
async function start(): Promise<void> {
  try {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', service: SERVICE_NAME, message: 'service_starting', port: PORT }));
    app.listen(PORT, () => {
      console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', service: SERVICE_NAME, message: 'service_started', port: PORT }));
      console.log(`
╔════════════════════════════════════════════════════════════╗
║  GENIE Email Service                                   ║
║  Personal Intelligence OS                               ║
║                                                            ║
║  Status:  RUNNING                                         ║
║  Port:    ${PORT.toString().padEnd(44)}║
║  Version:  1.0.0${' '.repeat(40)}║
║                                                            ║
║  "You don't use Genie. You talk to Genie."               ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', service: SERVICE_NAME, message: 'start_failed', error }));
    process.exit(1);
  }
}

process.on('SIGTERM', () => { console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', service: SERVICE_NAME, message: 'shutdown' })); process.exit(0); });
process.on('SIGINT', () => { console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', service: SERVICE_NAME, message: 'shutdown' })); process.exit(0); });

start();

export default app;
