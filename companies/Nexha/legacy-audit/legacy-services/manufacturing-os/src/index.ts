import { logger } from '../../shared/logger';
/**
 * NeXha ManufacturingOS - Production Entry Point
 * Port: 4330
 *
 * Security Features:
 * - Authentication via RABTUL Auth Service
 * - Role-based access control (RBAC)
 * - Webhook signature verification
 * - Rate limiting
 * - Input validation with Zod
 * - CORS configuration
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { bomService, productionService, qualityService, mrpService } from './services/manufacturing.service.js';
import { connectDatabase } from './config/database.js';
import { requireAuth, requireRole, requirePermission, requireInternalToken } from '../../shared/auth-middleware/src/index.js';
import { createWebhookMiddleware } from '../../shared/webhook-sdk/src/index.js';
import { validateRequest } from './middleware/validation.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '4330', 10);
const SERVICE_NAME = 'nexha-manufacturing-os';

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

app.get('/health', (_req, res) => {
  res.json({
    service: SERVICE_NAME,
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/ready', (_req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

app.get('/metrics', (_req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('# ManufacturingOS metrics placeholder');
});

// ============================================================================
// BOM Endpoints (Protected)
// ============================================================================

app.post('/api/boms',
  requireAuth(),
  requireRole('super_admin', 'admin', 'manufacturer'),
  validateRequest('createBOM'),
  async (req, res) => {
    try {
      const bom = await bomService.createBOM(req.body);
      res.status(201).json({ success: true, data: bom });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/boms/:id',
  requireAuth(),
  requirePermission('boms', 'read'),
  async (req, res) => {
    try {
      const bom = await bomService.getBOM(req.params.id);
      if (!bom) return res.status(404).json({ success: false, error: 'BOM not found' });
      res.json({ success: true, data: bom });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/boms/product/:productId',
  requireAuth(),
  requirePermission('boms', 'read'),
  async (req, res) => {
    try {
      const bom = await bomService.getBOMByProduct(req.params.productId);
      if (!bom) return res.status(404).json({ success: false, error: 'BOM not found for product' });
      res.json({ success: true, data: bom });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Production Endpoints (Protected)
// ============================================================================

app.post('/api/production/orders',
  requireAuth(),
  requirePermission('production', 'create'),
  validateRequest('createProductionOrder'),
  async (req, res) => {
    try {
      const order = await productionService.createOrder(req.body);
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/production/orders/:id/start',
  requireAuth(),
  requirePermission('production', 'update'),
  async (req, res) => {
    try {
      const order = await productionService.startProduction(req.params.id);
      if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
      res.json({ success: true, data: order });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/production/orders/:id/complete',
  requireAuth(),
  requirePermission('production', 'update'),
  validateRequest('completeProduction'),
  async (req, res) => {
    try {
      const batch = await productionService.completeProduction(req.params.id, req.body.quantity);
      if (!batch) return res.status(404).json({ success: false, error: 'Order not found' });
      res.json({ success: true, data: batch });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/production/orders',
  requireAuth(),
  requirePermission('production', 'read'),
  async (req, res) => {
    try {
      const orders = await productionService.getOrders({
        status: req.query.status as 'pending' | 'in_progress' | 'completed' | 'cancelled' | undefined,
      });
      res.json({ success: true, data: orders });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Quality Endpoints (Protected)
// ============================================================================

app.post('/api/batches/:id/quality-check',
  requireAuth(),
  requireRole('super_admin', 'admin', 'manufacturer'),
  validateRequest('addQualityCheck'),
  async (req, res) => {
    try {
      const batch = await qualityService.addQualityCheck(
        req.params.id,
        req.body.check,
        req.body.result,
        req.body.notes
      );
      if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' });
      res.json({ success: true, data: batch });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/batches/:id/approve',
  requireAuth(),
  requireRole('super_admin', 'admin', 'manufacturer'),
  async (req, res) => {
    try {
      const batch = await qualityService.approveBatch(req.params.id);
      if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' });
      res.json({ success: true, data: batch });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/batches/:id/release',
  requireAuth(),
  requireRole('super_admin', 'admin', 'manufacturer'),
  async (req, res) => {
    try {
      const batch = await qualityService.releaseBatch(req.params.id);
      if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' });
      res.json({ success: true, data: batch });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// MRP Endpoints (Protected)
// ============================================================================

app.get('/api/mrp/requirements/:productId',
  requireAuth(),
  requirePermission('mrp', 'read'),
  async (req, res) => {
    try {
      const requirements = await mrpService.calculateRequirements(
        req.params.productId,
        parseInt(req.query.quantity as string, 10) || 1
      );
      res.json({ success: true, data: requirements });
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
  logger.error('[ManufacturingOS] WEBHOOK_SECRET environment variable is not set — webhooks will be rejected');
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
      logger.info(`[ManufacturingOS] Verified webhook from ${partner}:`, JSON.stringify(req.body, null, 2));
      res.json({ success: true, action: 'acknowledged' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
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
      logger.info(`[ManufacturingOS] Internal ${resource}:`, req.body);
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
    logger.info(`\nNeXha ManufacturingOS - Port ${PORT}\n`);
  } catch (error) {
    logger.error('[ManufacturingOS] Failed to start:', error);
    process.exit(1);
  }
});

export default app;
