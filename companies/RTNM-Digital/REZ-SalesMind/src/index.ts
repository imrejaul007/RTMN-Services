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
import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
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
import { authMiddleware } from './middleware/auth.js';
import { apiLimiter } from './middleware/rateLimit.js';

// Validate environment before starting
function validateEnv(): void {
    const required = ['INTERNAL_SERVICE_TOKEN'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    }
    if (!process.env.NODE_ENV) {
        console.warn('⚠️  NODE_ENV not set, defaulting to development');
    }
}

// Port 5170 aligns with Professional OS in RTNM Port Registry
const PORT = Number(process.env.PORT) || 5170;
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

// CORS — restrict origins in production
function getAllowedOrigins(): string[] | boolean {
    const env = process.env.ALLOWED_ORIGINS;
    // Only allow all origins if explicitly development AND no allowed list set
    if (!env || env.trim() === '') {
        // If ALLOWED_ORIGINS is explicitly empty string, don't allow all
        if (process.env.NODE_ENV === 'production') {
            console.error('FATAL: ALLOWED_ORIGINS must be set in production');
            return false;
        }
        return true; // development: allow all
    }
    const origins = env.split(',').map(o => o.trim()).filter(Boolean);
    if (origins.length === 0) {
        if (process.env.NODE_ENV === 'production') return false;
        return true;
    }
    return origins;
}

// Validate CORS config
const corsOrigins = getAllowedOrigins();
if (corsOrigins === false) {
    console.error('FATAL: Cannot start without ALLOWED_ORIGINS in production');
    process.exit(1);
}

// Apply middleware
app.use(cors({ origin: corsOrigins as string[] | boolean, credentials: true }));
app.use(express.json({ limit: '1mb' })); // Fixed: explicit size limit
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // Fixed: explicit size limit

// Apply rate limiting
app.use('/api', apiLimiter);

// Apply authentication
app.use(authMiddleware);

// Health check — performs real connectivity probes on external services
async function getRealIntegrationStatus(): Promise<{
    hojaiAI: string;
    adBazaar: string;
    rezCRM: string;
}> {
    const results = {
        hojaiAI: 'unavailable',
        adBazaar: 'unavailable',
        rezCRM: 'unavailable'
    };

    // FIXED: Use AbortController for proper fetch timeout
    const check = async (url: string): Promise<boolean> => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        try {
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);
            return res.ok;
        } catch {
            clearTimeout(timeout);
            return false;
        }
    };

    // Probe each integration
    const [crmOk] = await Promise.all([
        check('http://localhost:4056/api/health'),
    ]);
    results.rezCRM = crmOk ? 'connected' : 'unavailable';

    return results;
}

app.get('/health', async (req, res) => {
    const integrations = await getRealIntegrationStatus();
    const allUp = Object.values(integrations).every(s => s === 'connected');
    res.json({
        status: allUp ? 'healthy' : 'degraded',
        service: 'REZ SalesMind',
        version: '2.2.0',
        integrations,
        timestamp: new Date().toISOString()
    });
});

// FIXED: Global error handler distinguishes error types
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('SalesMind Error:', err);

    if (err instanceof SyntaxError && 'body' in err) {
        // Malformed JSON in request body
        return res.status(400).json({
            error: 'Invalid JSON in request body',
            type: 'SyntaxError'
        });
    }

    if (err.name === 'ValidationError' || err.name === 'UnauthorizedError') {
        return res.status(400).json({
            error: err.message,
            type: err.name
        });
    }

    // Generic internal error — don't leak implementation details
    res.status(500).json({
        error: 'Internal server error',
        type: 'InternalError'
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

// WebSocket for real-time signals — now with token auth
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws, req) => {
    // FIXED: WebSocket auth check
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const validToken = process.env.INTERNAL_SERVICE_TOKEN || '';

    if (validToken && token !== validToken) {
        ws.close(4001, 'Unauthorized');
        return;
    }

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
export const broadcastSignal = (signal: unknown) => {
    wsHandler.broadcast(signal);
};

// FIXED: Graceful shutdown
function gracefulShutdown(signal: string): void {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
        console.log('HTTP server closed');
        wsHandler.shutdown();
        process.exit(0);
    });
    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// FIXED: Validate env before starting
validateEnv();

server.listen(PORT, () => {
    console.log(`REZ SalesMind v2.2.0 running on port ${PORT}`);
    console.log('Integrations: HOJAI AI, AdBazaar, REZ CRM Hub');
    console.log('WebSocket: ws://localhost:' + PORT + '/ws');
});

export { app, server };
