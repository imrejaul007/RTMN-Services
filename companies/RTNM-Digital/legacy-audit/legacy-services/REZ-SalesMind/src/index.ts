/**
 * REZ SalesMind - AI Sales Intelligence Platform
 * Port: 5170 (Professional OS in RTNM Port Registry)
 *
 * Formerly REZ Atlas - Renamed to reflect AI-powered sales intelligence
 *
 * Integrations:
 * - HOJAI AI: Web Intelligence, Merchant Intelligence, Lead Service, Knowledge Graph, TwinOS
 * - REZ CRM Hub: Unified CRM data (port 4056)
 * - REZ Identity Hub: Unified identity (port 4702)
 * - Genie Voice: Communication (port 4760)
 * - AssetMind: Financial forecasting (port 5200)
 * - AdBazaar: Campaign management (port 4300)
 */

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { HojaiAIClient } from './services/hojaiClient.js';
import { AdBazaarClient } from './services/adbazaarClient.js';
import { REZCRMClient } from './services/rezCRMClient.js';
import { IntelligenceEngine } from './services/intelligenceEngine.js';
import { TwinService } from './services/twinService.js';
import { SignalAggregator } from './services/signalAggregator.js';
import { WebSocketHandler } from './services/websocketHandler.js';
import { salesRoutes } from './routes/sales.js';
import { insightRoutes } from './routes/insights.js';
import { leadRoutes } from './routes/leads.js';
import aiRoutes from './routes/ai.js';
import integrationRoutes from './routes/integrations.js';
import dashboardRoutes from './routes/dashboard.js';
import ecosystemRoutes from './routes/ecosystem.js';
import { fileURLToPath } from 'url';
import path from 'path';
import { authMiddleware } from './middleware/auth.js';
import { apiLimiter, writeLimiter } from './middleware/rateLimit.js';

// Port 5170 aligns with Professional OS in RTNM Port Registry
const PORT = process.env.PORT || 5170;
const app = express();
const server = createServer(app);

// Initialize services
const hojaiClient = new HojaiAIClient();
const adbazaarClient = new AdBazaarClient();
const rezCRMClient = new REZCRMClient();
const intelligenceEngine = new IntelligenceEngine(hojaiClient, adbazaarClient, rezCRMClient);
const twinService = new TwinService(hojaiClient, rezCRMClient);
const signalAggregator = new SignalAggregator(hojaiClient, adbazaarClient, rezCRMClient);
const wsHandler = new WebSocketHandler();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting
app.use('/api', apiLimiter);
app.use('/api/leads', writeLimiter);
app.use('/api/sales', writeLimiter);
app.use('/api/ecosystem', writeLimiter);

// Apply authentication
app.use(authMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'REZ SalesMind',
    version: '2.1.0',
    integrations: {
      hojaiAI: 'connected',
      adBazaar: 'connected',
      rezCRM: 'connected'
    },
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/sales', salesRoutes(intelligenceEngine, twinService, signalAggregator));
app.use('/api/insights', insightRoutes(intelligenceEngine, signalAggregator));
app.use('/api/ai', aiRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ecosystem', ecosystemRoutes);
app.use('/api/leads', leadRoutes(intelligenceEngine, hojaiClient));

// WebSocket for real-time signals
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => {
  wsHandler.handleConnection(ws);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      wsHandler.handleMessage(ws, message);
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  });
});

// Broadcast signals to connected clients
export const broadcastSignal = (signal: any) => {
  wsHandler.broadcast(signal);
};

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('SalesMind Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

server.listen(PORT, () => {
  console.log(`REZ SalesMind v2.1.0 running on port ${PORT}`);
  console.log('Integrations: HOJAI AI, AdBazaar, REZ CRM Hub');
  console.log('WebSocket: ws://localhost:' + PORT + '/ws');
});

export { app, server };
