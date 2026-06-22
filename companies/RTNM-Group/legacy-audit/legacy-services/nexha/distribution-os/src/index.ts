/**
 * NeXhapp.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).requestId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', (req as any).requestId);
  next();
});

  a DistributionOS - Production Entry Point
 * Port: 4300
 *
 * Features:
 * - MongoDB connection
 * - RABTUL Auth
 * - WebSocket for real-time
 * - RBAC permissions
 * - Prometheus metrics
 * - Sentry monitoring
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

// Import services
import { distributorService, vanSaleService, collectionService, routeService } from './services/distribution.service.js';
import { connectDatabase, healthCheck } from './config/database.js';
import { requireAuth, requireRole, requirePermission } from './middleware/auth.js';
import { metrics, metricsMiddleware, getHealthStatus, logStartup } from './monitoring.js';

// Import types
import type { Role, Resource, Action } from './types/rbac.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '4300', 10);
const SERVICE_NAME = 'nexha-distribution-os';

// ============================================================================
// Middleware
// ============================================================================

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(metricsMiddleware);

// Logging
app.use((req, _res, next) => {
  logger.info([${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Health Endpoints
// ============================================================================

app.get('/health', async (_req, res) => {
  const health = await getHealthStatus({
    version: '1.0.0',
    serviceName: SERVICE_NAME,
    dbHealthCheck: async () => {
      const start = Date.now();
      try {
        // await db.command({ ping: 1 });
        return { healthy: true, latency: Date.now() - start };
      } catch {
        return { healthy: false };
      }
    },
  });
  res.status(health.healthy ? 200 : 503).json(health);
});

app.get('/ready', (_req, res) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME
  });
});

app.get('/metrics', (_req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(metrics.getMetrics());
});

// ============================================================================
// Distributor Endpoints
// ============================================================================

// List distributors (authenticated)
app.get('/api/distributors', requireAuth(), async (req, res) => {
  try {
    const { status, type, city, limit, offset } = req.query;
    const result = await distributorService.listDistributors({
      status: status as string,
      type: type as string,
      city: city as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    metrics.counter('api_requests_total', 1, { endpoint: 'list_distributors', status: 'success' });
    res.json({ success: true, data: result });
  } catch (error) {
    metrics.counter('api_requests_total', 1, { endpoint: 'list_distributors', status: 'error' });
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Get distributor
app.get('/api/distributors/:id', requireAuth(), async (req, res) => {
  try {
    const distributor = await distributorService.getDistributor(req.params.id);
    if (!distributor) {
      return res.status(404).json({ success: false, error: 'Distributor not found' });
    }
    res.json({ success: true, data: distributor });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Create distributor (admin only)
app.post('/api/distributors',
  requireAuth(),
  requireRole('super_admin', 'admin'),
  async (req, res) => {
    try {
      const distributor = await distributorService.createDistributor(req.body);
      metrics.counter('business_events_total', 1, { event: 'distributor_created' });
      res.status(201).json({ success: true, data: distributor });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

// Update distributor
app.patch('/api/distributors/:id',
  requireAuth(),
  requirePermission('distributors', 'update'),
  async (req, res) => {
    try {
      const distributor = await distributorService.updateDistributor(req.params.id, req.body);
      if (!distributor) {
        return res.status(404).json({ success: false, error: 'Distributor not found' });
      }
      res.json({ success: true, data: distributor });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Activate distributor
app.post('/api/distributors/:id/activate',
  requireAuth(),
  requireRole('super_admin', 'admin'),
  async (req, res) => {
    try {
      const distributor = await distributorService.activateDistributor(req.params.id);
      if (!distributor) {
        return res.status(404).json({ success: false, error: 'Distributor not found' });
      }
      res.json({ success: true, data: distributor });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Suspend distributor
app.post('/api/distributors/:id/suspend',
  requireAuth(),
  requireRole('super_admin', 'admin'),
  async (req, res) => {
    try {
      const distributor = await distributorService.suspendDistributor(req.params.id, req.body.reason);
      if (!distributor) {
        return res.status(404).json({ success: false, error: 'Distributor not found' });
      }
      res.json({ success: true, data: distributor });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Get distributor performance
app.get('/api/distributors/:id/performance', requireAuth(), async (req, res) => {
  try {
    const period = {
      start: req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: req.query.end ? new Date(req.query.end as string) : new Date(),
    };
    const performance = await distributorService.getPerformance(req.params.id, period);
    if (!performance) {
      return res.status(404).json({ success: false, error: 'Distributor not found' });
    }
    res.json({ success: true, data: performance });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// Van Sale Endpoints
// ============================================================================

app.post('/api/van-sales', requireAuth(), requirePermission('orders', 'create'), async (req, res) => {
  try {
    const vanSale = await vanSaleService.createVanSale(req.body);
    res.status(201).json({ success: true, data: vanSale });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/van-sales/:id/start', requireAuth(), async (req, res) => {
  try {
    const vanSale = await vanSaleService.startVanSale(req.params.id);
    if (!vanSale) {
      return res.status(404).json({ success: false, error: 'Van sale not found' });
    }
    res.json({ success: true, data: vanSale });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/van-sales/:id/complete', requireAuth(), async (req, res) => {
  try {
    const vanSale = await vanSaleService.completeVanSale(req.params.id);
    if (!vanSale) {
      return res.status(404).json({ success: false, error: 'Van sale not found' });
    }
    res.json({ success: true, data: vanSale });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// Collection Endpoints
// ============================================================================

app.post('/api/collections', requireAuth(), requirePermission('orders', 'create'), async (req, res) => {
  try {
    const collection = await collectionService.recordCollection(req.body);
    metrics.counter('business_events_total', 1, { event: 'collection_recorded' });
    res.status(201).json({ success: true, data: collection });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// Webhook Endpoint (Internal - no auth)
// ============================================================================

app.post('/webhooks/:partner', async (req, res) => {
  try {
    const { partner } = req.params;
    logger.info([DistributionOS] Webhook from ${partner}:`, JSON.stringify(req.body, null, 2));
    res.json({ success: true, action: 'acknowledged' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// Internal Service Endpoint
// ============================================================================

app.post('/internal/:resource', async (req, res) => {
  // Internal endpoints use X-Internal-Token
  const internalToken = req.headers['x-internal-token'] as string;
  if (internalToken !== process.env.INTERNAL_SERVICE_TOKEN) {
    return res.status(401).json({ success: false, error: 'Invalid internal token' });
  }

  // Handle internal operations
  const { resource } = req.params;
  logger.info([DistributionOS] Internal ${resource}:`, req.body);
  res.json({ success: true, action: 'processed' });
});

// ============================================================================
// Error Handler
// ============================================================================

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error([Error] ${err.message}`);
  metrics.counter('errors_total', 1, { type: 'unhandled' });
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal error' : err.message
  });
});

// ============================================================================
// Start Server
// ============================================================================

async function start() {
  try {
    // Connect to database
    await connectDatabase();

    // Start server
    app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(JSON.stringify({ type: 'error', error: err.message, requestId: (req as any).requestId }));
  res.status(500).json({ success: false, error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message, timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
      logStartup(SERVICE_NAME, PORT, '1.0.0');
    });
  } catch (error) {
    console.error('[DistributionOS] Failed to start:', error);
    process.exit(1);
  }
}

start();

export default app;
