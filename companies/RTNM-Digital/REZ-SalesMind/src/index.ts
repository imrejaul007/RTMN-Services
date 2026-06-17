/**
 * REZ SalesMind - AI-Powered Sales Intelligence Platform
 * Port: 5170 | Version: 2.3.0
 */
import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

// Route imports
import { leadRoutes } from './routes/leads.js';
import { salesRoutes } from './routes/sales.js';
import { aiRoutes } from './routes/ai.js';
import { insightRoutes } from './routes/insights.js';
import { ecosystemRoutes } from './routes/ecosystem.js';
import { integrationRoutes } from './routes/integrations.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { transcriptionRoutes } from './routes/transcription.js';
import { voicemailRoutes } from './routes/voicemail.js';
import { campaignRoutes } from './routes/campaign.js';
import { autonomousSDRRoutes } from './routes/autonomousSDR.js';
import { crmRoutes } from './routes/crm.js';

const app = express();
const PORT = process.env.PORT || 5170;
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',');

// Security middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({ windowMs: 60000, max: 100, message: { error: 'Too many requests' } });
const writeLimiter = rateLimit({ windowMs: 60000, max: 20, message: { error: 'Too many writes' } });
app.use('/api', apiLimiter);

// Auth middleware
const authMiddleware = (req: Request, res: Response, next: () => void) => {
  const token = req.headers['x-internal-token'];
  if (!token || token !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
app.use('/api', authMiddleware);

// Health check (public)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'REZ SalesMind', version: '2.3.0', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/leads', writeLimiter, leadRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/ai', writeLimiter, aiRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/ecosystem', writeLimiter, ecosystemRoutes);
app.use('/api/integrations', writeLimiter, integrationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/transcription', transcriptionRoutes);
app.use('/api/voicemail', voicemailRoutes);
app.use('/api/campaign', writeLimiter, campaignRoutes);
app.use('/api/sdr', writeLimiter, autonomousSDRRoutes);
app.use('/api/crm', writeLimiter, crmRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Error handler
app.use((err: Error, req: Request, res: Response, _next: () => void) => {
  console.error(`Error: ${err.message}`);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Create HTTP server
const server = createServer(app);

// WebSocket
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  if (token !== INTERNAL_TOKEN) {
    ws.close(1008, 'Invalid token');
    return;
  }
  // Send welcome message
  ws.send(JSON.stringify({ type: 'connected', message: 'REZ SalesMind WebSocket connected' }));

  // Heartbeat
  const interval = setInterval(() => {
    if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'ping' }));
  }, 30000);

  ws.on('close', () => clearInterval(interval));
});

// Graceful shutdown
process.on('SIGTERM', () => { console.log('SIGTERM received'); server.close(() => process.exit(0)); });
process.on('SIGINT', () => { console.log('SIGINT received'); server.close(() => process.exit(0)); });

server.listen(PORT, () => {
  console.log(`🚀 REZ SalesMind v2.3.0 running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
});

export default app;
