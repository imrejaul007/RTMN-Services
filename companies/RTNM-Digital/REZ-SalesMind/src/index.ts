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

// Routes
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
import { socialMediaRoutes } from './routes/socialMedia.js';
import { multiChannelFollowUpRoutes } from './routes/multiChannelFollowUp.js';
import { unifiedCommsRoutes } from './routes/unifiedComms.js';
import { sutarOSRoutes } from './routes/sutarOS.js';
import { copilotRoutes } from './routes/copilot.js';
import { customerOpsRoutes } from './routes/customerOps.js';

const app = express();
const PORT = process.env.PORT || 5175;
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',');

// Security
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '1mb' }));

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

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'REZ SalesMind', version: '2.4.0', timestamp: new Date().toISOString() });
});

// Routes
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
app.use('/api/social', writeLimiter, socialMediaRoutes);
app.use('/api/followup', writeLimiter, multiChannelFollowUpRoutes);
app.use('/api/comms', writeLimiter, unifiedCommsRoutes);
app.use('/api/sutar', writeLimiter, sutarOSRoutes);
app.use('/api/copilot', writeLimiter, copilotRoutes);
app.use('/api/customer-ops', writeLimiter, customerOpsRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));
// Error
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
  ws.send(JSON.stringify({ type: 'connected', message: 'REZ SalesMind connected' }));
  const interval = setInterval(() => {
    if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'ping' }));
  }, 30000);
  ws.on('close', () => clearInterval(interval));
});

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });

server.listen(PORT, () => {
  console.log(`🚀 REZ SalesMind v2.4.0 running on port ${PORT}`);
});

export default app;
