/**
 * NeXhapp.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).requestId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', (req as any).requestId);
  next();
});

  a Ecosystem Connector - Main Entry Point
 *
 * Central hub for all NeXha OS services.
 * Coordinates cross-service communication and workflows.
 *
 * Port: 4399
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { eventBus, ECOSYSTEM_EVENTS } from './services/event-bus.js';
import { orchestrator } from './services/orchestrator.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '4399', 10);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Logging
app.use((req, _res, next) => {
  logger.info([${new Date().toISOString()}] ${req.method} ${req.path}`);
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
// Event Publishing
// ============================================================================

// Publish demand signal
app.post('/api/events/demand', async (req, res) => {
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
});

// Publish order placed
app.post('/api/events/order', async (req, res) => {
  try {
    const { orderId, merchantId, items, total } = req.body;

    await orchestrator.emitOrderPlaced({ orderId, merchantId, items, total });

    res.json({ success: true, action: 'order_placed_emitted' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Publish custom event
app.post('/api/events', async (req, res) => {
  try {
    const { type, data } = req.body;

    await eventBus.publish({
      specversion: '1.0',
      id: crypto.randomUUID(),
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
});

// ============================================================================
// Event History
// ============================================================================

app.get('/api/events/history', (req, res) => {
  try {
    const { type, source, limit } = req.query;
    const history = eventBus.getHistory({
      type: type as string,
      source: source as string,
      limit: limit ? parseInt(limit as string) : 100,
    });

    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// Webhook Endpoints (Receive events from other services)
// ============================================================================

// Receive from REZ Merchant
app.post('/webhooks/rez-merchant', async (req, res) => {
  try {
    const { type, data } = req.body;
    logger.info([Connector] REZ Merchant webhook: ${type}`);

    await eventBus.publish({
      specversion: '1.0',
      id: crypto.randomUUID(),
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
});

// Receive from NextaBizz
app.post('/webhooks/nextabizz', async (req, res) => {
  try {
    const { type, data } = req.body;
    logger.info([Connector] NextaBizz webhook: ${type}`);

    await eventBus.publish({
      specversion: '1.0',
      id: crypto.randomUUID(),
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
});

// Receive from REZ Intelligence
app.post('/webhooks/rez-intelligence', async (req, res) => {
  try {
    const { type, data } = req.body;
    logger.info([Connector] REZ Intelligence webhook: ${type}`);

    await eventBus.publish({
      specversion: '1.0',
      id: crypto.randomUUID(),
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
});

// Receive from RTNM Finance
app.post('/webhooks/rtnm-finance', async (req, res) => {
  try {
    const { type, data } = req.body;
    logger.info([Connector] RTNM Finance webhook: ${type}`);

    await eventBus.publish({
      specversion: '1.0',
      id: crypto.randomUUID(),
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
});

// ============================================================================
// Service Status
// ============================================================================

app.get('/api/status/services', async (_req, res) => {
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
        const response = await fetch(`${s.url}/health`, { timeout: 2000 });
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
});

// ============================================================================
// Start Server
// ============================================================================

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found', timestamp: new Date().toISOString() });
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(JSON.stringify({ type: 'error', error: err.message, requestId: (req as any).requestId }));
  res.status(500).json({ success: false, error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message, timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(
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
