import { logger } from '../../shared/logger';
/**
 * NeXha DistributionOS - Production Entry Point
 * Port: 4300
 *
 * Security Features:
 * - Authentication via RABTUL Auth Service
 * - Role-based access control (RBAC)
 * - Webhook signature verification (UPDATED)
 * - Rate limiting
 * - Input validation with Zod
 * - CORS configuration
 * - Timing-safe token comparison (UPDATED)
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

// Import services
import {
  distributorService,
  vanSaleService,
  collectionService,
  routeService,
  returnsService,
} from './services/distribution.service.js';
import { connectDatabase, healthCheck } from './config/database.js';
import { requireAuth, requireRole, requirePermission, requireInternalToken } from '../../shared/auth-middleware/src/index.js';
import { createWebhookMiddleware } from '../../shared/webhook-sdk/src/index.js';

// Import types
import type { Role, Resource, Action } from './types/rbac.js';

// Simple in-memory metrics (replace with prom-client in production)
const metricsCounter = new Map<string, number>();
const counter = (name: string, _value: number, _labels?: Record<string, string>) => {
  metricsCounter.set(name, (metricsCounter.get(name) || 0) + 1);
};

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '4300', 10);
const SERVICE_NAME = 'nexha-distribution-os';

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

app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(limiter);

// Logging
app.use((req, _res, next) => {
  logger.info(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Health Endpoints
// ============================================================================

app.get('/health', async (_req, res) => {
  const dbHealth = await healthCheck();
  const health = {
    healthy: dbHealth.healthy,
    version: '1.0.0',
    service: SERVICE_NAME,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      database: dbHealth,
    },
  };
  res.status(health.healthy ? 200 : 503).json(health);
});

app.get('/ready', (_req, res) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME
  });
});

// ============================================================================
// Distributor Endpoints (Protected)
// ============================================================================

app.get('/api/distributors',
  requireAuth(),
  requirePermission('distributors', 'read'),
  async (req, res) => {
    try {
      const { status, type, city, limit, offset } = req.query;
      const result = await distributorService.listDistributors({
        status: status as string,
        type: type as string,
        city: city as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });
      counter('api_requests_total', 1, { endpoint: 'list_distributors', status: 'success' });
      res.json({ success: true, data: result });
    } catch (error) {
      counter('api_requests_total', 1, { endpoint: 'list_distributors', status: 'error' });
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/distributors/:id',
  requireAuth(),
  requirePermission('distributors', 'read'),
  async (req, res) => {
    try {
      const distributor = await distributorService.getDistributor(req.params.id);
      if (!distributor) {
        return res.status(404).json({ success: false, error: 'Distributor not found' });
      }
      res.json({ success: true, data: distributor });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/distributors',
  requireAuth(),
  requireRole('super_admin', 'admin'),
  async (req, res) => {
    try {
      const distributor = await distributorService.createDistributor(req.body);
      counter('business_events_total', 1, { event: 'distributor_created' });
      res.status(201).json({ success: true, data: distributor });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

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

app.get('/api/distributors/:id/performance',
  requireAuth(),
  requirePermission('distributors', 'read'),
  async (req, res) => {
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
  }
);

// ============================================================================
// Van Sale Endpoints (Protected)
// ============================================================================

app.post('/api/van-sales',
  requireAuth(),
  requirePermission('orders', 'create'),
  async (req, res) => {
    try {
      const vanSale = await vanSaleService.createVanSale(req.body);
      res.status(201).json({ success: true, data: vanSale });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/van-sales/:id/start',
  requireAuth(),
  requirePermission('orders', 'update'),
  async (req, res) => {
    try {
      const vanSale = await vanSaleService.startVanSale(req.params.id);
      if (!vanSale) {
        return res.status(404).json({ success: false, error: 'Van sale not found' });
      }
      res.json({ success: true, data: vanSale });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/van-sales/:id/complete',
  requireAuth(),
  requirePermission('orders', 'update'),
  async (req, res) => {
    try {
      const vanSale = await vanSaleService.completeVanSale(req.params.id);
      if (!vanSale) {
        return res.status(404).json({ success: false, error: 'Van sale not found' });
      }
      res.json({ success: true, data: vanSale });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Collection Endpoints (Protected)
// ============================================================================

app.post('/api/collections',
  requireAuth(),
  requirePermission('orders', 'create'),
  async (req, res) => {
    try {
      const collection = await collectionService.recordCollection(req.body);
      counter('business_events_total', 1, { event: 'collection_recorded' });
      res.status(201).json({ success: true, data: collection });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/collections',
  requireAuth(),
  requirePermission('orders', 'read'),
  async (req, res) => {
    try {
      const { distributorId, status, retailerId } = req.query;
      const collections = await collectionService.getCollectionsByDistributor(
        distributorId as string,
        { status: status as string, retailerId: retailerId as string }
      );
      res.json({ success: true, data: collections });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Route Optimization Endpoints (Protected)
// ============================================================================

app.post('/api/routes/:id/optimize',
  requireAuth(),
  requirePermission('orders', 'update'),
  async (req, res) => {
    try {
      const { trafficFactor, startLatitude, startLongitude } = req.body;
      const route = await routeService.optimizeRoute(req.params.id, {
        trafficFactor: trafficFactor ?? 0.3,
        startLatitude: startLatitude ?? 0,
        startLongitude: startLongitude ?? 0,
      });
      if (!route) {
        return res.status(404).json({ success: false, error: 'Route not found' });
      }
      counter('business_events_total', 1, { event: 'route_optimized' });
      res.json({ success: true, data: route });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/routes/:id/stops/:seq',
  requireAuth(),
  requirePermission('orders', 'update'),
  async (req, res) => {
    try {
      const { status } = req.body;
      const route = await routeService.markStopVisited(
        req.params.id,
        parseInt(req.params.seq, 10),
        status || 'visited'
      );
      if (!route) {
        return res.status(404).json({ success: false, error: 'Route or stop not found' });
      }
      res.json({ success: true, data: route });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Delivery Tracking Endpoints (Protected)
// ============================================================================

app.post('/api/van-sales/:id/delivery',
  requireAuth(),
  requirePermission('orders', 'update'),
  async (req, res) => {
    try {
      const parsed = DeliveryUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.message });
      }
      const input = { ...parsed.data, vanSaleId: req.params.id };
      const vanSale = await vanSaleService.recordDeliveryUpdate(input);
      if (!vanSale) {
        return res.status(404).json({ success: false, error: 'Van sale not found' });
      }
      counter('business_events_total', 1, { event: 'delivery_update' });
      res.json({ success: true, data: vanSale });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/van-sales/:id/delivery',
  requireAuth(),
  requirePermission('orders', 'read'),
  async (req, res) => {
    try {
      const updates = await vanSaleService.getDeliveryUpdates(req.params.id);
      res.json({ success: true, data: updates });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Returns Handling Endpoints (Protected)
// ============================================================================

app.post('/api/returns',
  requireAuth(),
  requirePermission('orders', 'create'),
  async (req, res) => {
    try {
      const parsed = CreateReturnSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.message });
      }
      const returnReq = await returnsService.createReturn(parsed.data);
      counter('business_events_total', 1, { event: 'return_created' });
      res.status(201).json({ success: true, data: returnReq });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/returns',
  requireAuth(),
  requirePermission('orders', 'read'),
  async (req, res) => {
    try {
      const { distributorId, status } = req.query;
      const returns = await returnsService.getReturnsByDistributor(
        distributorId as string,
        { status: status as string }
      );
      res.json({ success: true, data: returns });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/returns/:id',
  requireAuth(),
  requirePermission('orders', 'read'),
  async (req, res) => {
    try {
      const returnReq = await returnsService.getReturn(req.params.id);
      if (!returnReq) {
        return res.status(404).json({ success: false, error: 'Return not found' });
      }
      res.json({ success: true, data: returnReq });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/returns/:id/approve',
  requireAuth(),
  requirePermission('orders', 'approve'),
  async (req, res) => {
    try {
      const userId = (req as { user?: { id: string } }).user?.id || 'system';
      const returnReq = await returnsService.approveReturn(req.params.id, userId);
      if (!returnReq) {
        return res.status(404).json({ success: false, error: 'Return not found' });
      }
      counter('business_events_total', 1, { event: 'return_approved' });
      res.json({ success: true, data: returnReq });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/returns/:id/reject',
  requireAuth(),
  requirePermission('orders', 'delete'),
  async (req, res) => {
    try {
      const { reason } = req.body;
      const returnReq = await returnsService.rejectReturn(req.params.id, reason || 'Rejected');
      if (!returnReq) {
        return res.status(404).json({ success: false, error: 'Return not found' });
      }
      res.json({ success: true, data: returnReq });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/returns/:id/receive',
  requireAuth(),
  requirePermission('orders', 'update'),
  async (req, res) => {
    try {
      const { itemsReceived } = req.body;
      const returnReq = await returnsService.markReceived(req.params.id, itemsReceived);
      if (!returnReq) {
        return res.status(404).json({ success: false, error: 'Return not found' });
      }
      counter('business_events_total', 1, { event: 'return_received' });
      res.json({ success: true, data: returnReq });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/returns/:id/refund',
  requireAuth(),
  requirePermission('orders', 'update'),
  async (req, res) => {
    try {
      const returnReq = await returnsService.processRefund(req.params.id);
      if (!returnReq) {
        return res.status(404).json({ success: false, error: 'Return not found' });
      }
      counter('business_events_total', 1, { event: 'refund_processed' });
      res.json({ success: true, data: returnReq });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Webhook Endpoint (Signature Verified)
// ============================================================================

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  logger.error('[DistributionOS] WEBHOOK_SECRET environment variable is not set — webhooks will be rejected');
  process.exit(1);
}

app.post('/webhooks/:partner',
  createWebhookMiddleware({
    secret: WEBHOOK_SECRET,
    toleranceSeconds: 300,
  }),
  async (req, res) => {
    try {
      const { partner } = req.params;
      logger.info(`[DistributionOS] Verified webhook from ${partner}:`, JSON.stringify(req.body, null, 2));
      res.json({ success: true, action: 'acknowledged' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Internal Service Endpoint (Timing-Safe)
// ============================================================================

app.post('/internal/:resource',
  requireInternalToken(),
  async (req, res) => {
    try {
      const { resource } = req.params;
      logger.info(`[DistributionOS] Internal ${resource}:`, req.body);
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
  counter('errors_total', 1, { type: 'unhandled' });
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
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`[DistributionOS] Running on port ${PORT}`);
    });

    // Graceful shutdown
    server.on('SIGTERM', () => {
      logger.info('[DistributionOS] SIGTERM received, shutting down');
      server.close(() => process.exit(0));
    });
    server.on('SIGINT', () => {
      logger.info('[DistributionOS] SIGINT received, shutting down');
      server.close(() => process.exit(0));
    });
  } catch (error) {
    logger.error('[DistributionOS] Failed to start:', error);
    process.exit(1);
  }
}

start();

export default app;
