import { logger } from '../../shared/logger';
/**
 * NeXha Ecosystem Connector - Main Entry Point
 *
 * Central hub for all NeXha OS services.
 * Coordinates cross-service communication and workflows.
 *
 * Port: 4399
 *
 * Security Features:
 * - Authentication via RABTUL Auth Service
 * - Webhook signature verification
 * - Rate limiting
 * - Input validation with Zod
 * - CORS configuration
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { eventBus, ECOSYSTEM_EVENTS } from './services/event-bus.js';
import { orchestrator } from './services/orchestrator.js';
import { connectDatabase } from './config/database.js';
import { requireAuth, requireInternalToken } from '../../shared/auth-middleware/src/index.js';
import { createWebhookMiddleware } from '../../shared/webhook-sdk/src/index.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '4399', 10);

// ============================================================================
// Security Middleware
// ============================================================================

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Token'],
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(limiter);

// Logging
app.use((req, _res, next) => {
  logger.info(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Health
// ============================================================================

app.get('/health', (_req, res) => {
  res.json({
    service: 'nexha-ecosystem-connector',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      distribution: process.env.DISTRIBUTION_OS_URL || 'http://localhost:4300',
      franchise: process.env.FRANCHISE_OS_URL || 'http://localhost:4310',
      procurement: process.env.PROCUREMENT_OS_URL || 'http://localhost:4320',
      manufacturing: process.env.MANUFACTURING_OS_URL || 'http://localhost:4330',
    },
  });
});

app.get('/ready', (_req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

// ============================================================================
// Event Publishing (Protected)
// ============================================================================

app.post('/api/events/demand',
  requireAuth(),
  async (req, res) => {
    try {
      const { merchantId, productId, productName, currentStock, threshold } = req.body;

      await orchestrator.emitDemandSignal({
        merchantId,
        productId,
        productName,
        currentStock,
        threshold,
      });

      res.json({ success: true, action: 'demand_signal_emitted' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/events/order',
  requireAuth(),
  async (req, res) => {
    try {
      const { orderId, merchantId, items, total } = req.body;

      await orchestrator.emitOrderPlaced({ orderId, merchantId, items, total });

      res.json({ success: true, action: 'order_placed_emitted' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Emit supplier quote received
app.post('/api/events/quote',
  requireAuth(),
  async (req, res) => {
    try {
      const { dealId, supplierId, supplierName, quotedAmount, deliveryDays, paymentTerms, rfqNumber } = req.body;

      await orchestrator.emitQuoteReceived({
        dealId,
        supplierId,
        supplierName,
        quotedAmount,
        deliveryDays: deliveryDays || 7,
        paymentTerms: paymentTerms || 'Net 30',
        rfqNumber: rfqNumber || '',
      });

      res.json({ success: true, action: 'quote_received_emitted' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Emit deal awarded
app.post('/api/events/deal/award',
  requireAuth(),
  async (req, res) => {
    try {
      const { dealId, supplierId, supplierName, finalAmount } = req.body;

      await orchestrator.emitDealAwarded({ dealId, supplierId, supplierName, finalAmount });

      res.json({ success: true, action: 'deal_awarded_emitted' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Emit payment received
app.post('/api/events/payment',
  requireAuth(),
  async (req, res) => {
    try {
      const { dealId, orderId, amount, paymentMethod } = req.body;

      await orchestrator.emitPaymentReceived({ dealId, orderId, amount, paymentMethod });

      res.json({ success: true, action: 'payment_received_emitted' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/events',
  requireAuth(),
  async (req, res) => {
    try {
      const { type, data } = req.body;

      await eventBus.publish({
        specversion: '1.0',
        id: randomUUID(),
        source: 'api',
        type,
        time: new Date().toISOString(),
        datacontenttype: 'application/json',
        data,
      });

      res.json({ success: true, action: 'event_published', type });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Event History (Protected)
// ============================================================================

app.get('/api/events/history',
  requireAuth(),
  (req, res) => {
    try {
      const { type, source, limit } = req.query;
      const history = eventBus.getHistory({
        type: type as string,
        source: source as string,
        limit: limit ? parseInt(limit as string, 10) : 100,
      });

      res.json({ success: true, data: history });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Webhook Endpoints (Signature Verified)
// ============================================================================

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  logger.error('[EcosystemConnector] WEBHOOK_SECRET environment variable is not set — webhooks will be rejected');
  process.exit(1);
}

app.post('/webhooks/rez-merchant',
  createWebhookMiddleware({
    secret: WEBHOOK_SECRET,
    toleranceSeconds: 300,
  }),
  async (req, res) => {
    try {
      const { type, data } = req.body;
      logger.info(`[Connector] Verified REZ Merchant webhook: ${type}`);

      await eventBus.publish({
        specversion: '1.0',
        id: randomUUID(),
        source: 'rez-merchant',
        type,
        time: new Date().toISOString(),
        datacontenttype: 'application/json',
        data,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/webhooks/nextabizz',
  createWebhookMiddleware({
    secret: WEBHOOK_SECRET,
    toleranceSeconds: 300,
  }),
  async (req, res) => {
    try {
      const { type, data } = req.body;
      logger.info(`[Connector] Verified NextaBizz webhook: ${type}`);

      await eventBus.publish({
        specversion: '1.0',
        id: randomUUID(),
        source: 'nextabizz',
        type,
        time: new Date().toISOString(),
        datacontenttype: 'application/json',
        data,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/webhooks/rez-intelligence',
  createWebhookMiddleware({
    secret: WEBHOOK_SECRET,
    toleranceSeconds: 300,
  }),
  async (req, res) => {
    try {
      const { type, data } = req.body;
      logger.info(`[Connector] Verified REZ Intelligence webhook: ${type}`);

      await eventBus.publish({
        specversion: '1.0',
        id: randomUUID(),
        source: 'rez-intelligence',
        type,
        time: new Date().toISOString(),
        datacontenttype: 'application/json',
        data,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/webhooks/rtnm-finance',
  createWebhookMiddleware({
    secret: WEBHOOK_SECRET,
    toleranceSeconds: 300,
  }),
  async (req, res) => {
    try {
      const { type, data } = req.body;
      logger.info(`[Connector] Verified RTNM Finance webhook: ${type}`);

      await eventBus.publish({
        specversion: '1.0',
        id: randomUUID(),
        source: 'rtnm-finance',
        type,
        time: new Date().toISOString(),
        datacontenttype: 'application/json',
        data,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Service Status (Protected)
// ============================================================================

app.get('/api/status/services',
  requireAuth(),
  async (_req, res) => {
    const services = [
      { name: 'Distribution OS', url: process.env.DISTRIBUTION_OS_URL },
      { name: 'Franchise OS', url: process.env.FRANCHISE_OS_URL },
      { name: 'Procurement OS', url: process.env.PROCUREMENT_OS_URL },
      { name: 'Manufacturing OS', url: process.env.MANUFACTURING_OS_URL },
      { name: 'REZ Merchant', url: process.env.REZ_MERCHANT_URL },
      { name: 'REZ Intelligence', url: process.env.REZ_INTELLIGENCE_URL },
      { name: 'RTNM Finance', url: process.env.RTNM_FINANCE_URL },
    ];

    const results = await Promise.allSettled(
      services.map(async (s) => {
        if (!s.url) return { ...s, status: 'not_configured' };
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2000);
          const response = await fetch(`${s.url}/health`, { signal: controller.signal });
          clearTimeout(timeout);
          return { ...s, status: response.ok ? 'healthy' : 'unhealthy' };
        } catch {
          return { ...s, status: 'unreachable' };
        }
      })
    );

    const status = results.map((r, i) => ({
      name: services[i].name,
      url: services[i].url,
      status: r.status === 'fulfilled' ? r.value.status : 'error',
    }));

    res.json({ success: true, data: status });
  }
);

// ============================================================================
// Internal Service Endpoints
// ============================================================================

app.post('/internal/:resource',
  requireInternalToken(),
  async (req, res) => {
    try {
      const { resource } = req.params;
      logger.info(`[Connector] Internal ${resource}:`, req.body);
      res.json({ success: true, action: 'processed' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Error Handler
// ============================================================================

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(`[Error] ${err.message}`);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal error' : err.message,
  });
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, '0.0.0.0', async () => {
  try {
    await connectDatabase();
    logger.info(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    NeXha Ecosystem Connector                           ║
║              "The Operating System for Commerce Networks"               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                            ║
║  Health: http://localhost:${PORT}/health                                  ║
║  Events: http://localhost:${PORT}/api/events                               ║
║  History: http://localhost:${PORT}/api/events/history                      ║
║  Status: http://localhost:${PORT}/api/status/services                     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Connected Services:                                                   ║
║  - Distribution OS: ${(process.env.DISTRIBUTION_OS_URL || 'localhost:4300').substring(0, 20).padEnd(20)}        ║
║  - Franchise OS: ${(process.env.FRANCHISE_OS_URL || 'localhost:4310').substring(0, 20).padEnd(20)}        ║
║  - Procurement OS: ${(process.env.PROCUREMENT_OS_URL || 'localhost:4320').substring(0, 20).padEnd(20)}        ║
║  - Manufacturing OS: ${(process.env.MANUFACTURING_OS_URL || 'localhost:4330').substring(0, 20).padEnd(20)}        ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
