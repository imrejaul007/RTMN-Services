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
import { leadRoutes } from './routes/leads.js';
import { salesRoutes } from './routes/sales.js';
import aiRouter from './routes/ai.js';
import { insightRoutes } from './routes/insights.js';
import defaultRouter from './routes/ecosystem.js';
import { integrationRoutes } from './routes/integrations.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { transcriptionRoutes } from './routes/transcription.js';
import { voicemailRoutes } from './routes/voicemail.js';
import { campaignRoutes } from './routes/campaign.js';
import { autonomousSDRRoutes } from './routes/autonomousSDR.js';
import { crmRoutes } from './routes/crm.js';
import { handleWebSocket } from './services/websocketHandler.js';

const app = express();
const PORT = process.env.PORT || 5170;
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',');

// Security
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({ windowMs: 60000, max: 100, message: { error: 'Too many requests' } });
const writeLimiter = rateLimit({ windowMs: 60000, max: 20, message: { error: 'Too many writes' } });
app.use('/api', apiLimiter);

// Auth
const authMiddleware = (req: Request, res: Response, next: () => void) => {
  const token = req.headers['x-internal-token'];
  if (!token || token !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
app.use('/api', authMiddleware);

// Health (public)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'REZ SalesMind', version: '2.3.0', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/leads', leadsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/ai', aiRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/ecosystem', defaultRouter);
app.use('/api/integrations', integrationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/transcription', transcriptionRoutes);
app.use('/api/voicemail', voicemailRoutes);
app.use('/api/campaign', writeLimiter, campaignRoutes);
app.use('/api/sdr', writeLimiter, autonomousSDRRoutes);
app.use('/api/crm', writeLimiter, crmRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, _next: () => void) => {
  console.error(`Error: ${err.message}`);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Server + WebSocket
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  if (url.searchParams.get('token') !== INTERNAL_TOKEN) {
    ws.close(1008, 'Invalid token');
    return;
  }
  handleWebSocket(ws);
});

// Graceful shutdown
process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });

server.listen(PORT, () => {
  console.log(`REZ SalesMind v2.3.0 running on port ${PORT}`);
});

export default app;
