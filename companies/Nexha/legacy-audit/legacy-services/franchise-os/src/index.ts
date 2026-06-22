import { logger } from '../../shared/logger';
/**
 * NeXha FranchiseOS - Production Entry Point
 * Port: 4310
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
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { franchiseService, brandService, royaltyService, complianceService } from './services/franchise.service.js';
import { connectDatabase } from './config/database.js';
import { requireAuth, requireRole, requirePermission, requireInternalToken } from '../../shared/auth-middleware/src/index.js';
import { verifyWebhookSignature, createWebhookMiddleware } from '../../shared/webhook-sdk/src/index.js';
import { validateRequest } from './middleware/validation.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '4310', 10);
const SERVICE_NAME = 'nexha-franchise-os';

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
  res.send('# FranchiseOS metrics placeholder');
});

// ============================================================================
// Franchise Endpoints (Protected)
// ============================================================================

app.post('/api/franchises',
  requireAuth(),
  requireRole('super_admin', 'admin', 'franchise_owner'),
  validateRequest('createFranchise'),
  async (req, res) => {
    try {
      const franchise = await franchiseService.createFranchise(req.body);
      res.status(201).json({ success: true, data: franchise });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/franchises',
  requireAuth(),
  requirePermission('franchises', 'read'),
  async (req, res) => {
    try {
      const { brandId, status, city, limit, offset } = req.query;
      const result = await franchiseService.listFranchises({
        brandId: brandId as string,
        status: status as 'active' | 'inactive' | 'suspended' | 'pending_onboarding' | 'terminated' | undefined,
        city: city as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/franchises/:id',
  requireAuth(),
  requirePermission('franchises', 'read'),
  async (req, res) => {
    try {
      const franchise = await franchiseService.getFranchise(req.params.id);
      if (!franchise) {
        return res.status(404).json({ success: false, error: 'Franchise not found' });
      }
      res.json({ success: true, data: franchise });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.patch('/api/franchises/:id',
  requireAuth(),
  requirePermission('franchises', 'update'),
  validateRequest('updateFranchise'),
  async (req, res) => {
    try {
      const franchise = await franchiseService.updateFranchise(req.params.id, req.body);
      if (!franchise) {
        return res.status(404).json({ success: false, error: 'Franchise not found' });
      }
      res.json({ success: true, data: franchise });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/franchises/:id/activate',
  requireAuth(),
  requireRole('super_admin', 'admin'),
  async (req, res) => {
    try {
      const franchise = await franchiseService.activateFranchise(req.params.id);
      if (!franchise) {
        return res.status(404).json({ success: false, error: 'Franchise not found' });
      }
      res.json({ success: true, data: franchise });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/franchises/:id/suspend',
  requireAuth(),
  requireRole('super_admin', 'admin'),
  validateRequest('suspendFranchise'),
  async (req, res) => {
    try {
      const franchise = await franchiseService.suspendFranchise(req.params.id, req.body.reason);
      if (!franchise) {
        return res.status(404).json({ success: false, error: 'Franchise not found' });
      }
      res.json({ success: true, data: franchise });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/franchises/:id/performance',
  requireAuth(),
  requirePermission('franchises', 'update'),
  validateRequest('updatePerformance'),
  async (req, res) => {
    try {
      const franchise = await franchiseService.updatePerformance(req.params.id, req.body);
      if (!franchise) {
        return res.status(404).json({ success: false, error: 'Franchise not found' });
      }
      res.json({ success: true, data: franchise });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Brand Endpoints (Protected)
// ============================================================================

app.post('/api/brands',
  requireAuth(),
  requireRole('super_admin', 'admin'),
  validateRequest('createBrand'),
  async (req, res) => {
    try {
      const brand = await brandService.createBrand(req.body);
      res.status(201).json({ success: true, data: brand });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/brands',
  requireAuth(),
  requirePermission('franchises', 'read'),
  async (_req, res) => {
    try {
      const brands = await brandService.listBrands();
      res.json({ success: true, data: brands });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/brands/:id',
  requireAuth(),
  requirePermission('franchises', 'read'),
  async (req, res) => {
    try {
      const brand = await brandService.getBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ success: false, error: 'Brand not found' });
      }
      res.json({ success: true, data: brand });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/brands/:id/stats',
  requireAuth(),
  requirePermission('franchises', 'read'),
  async (req, res) => {
    try {
      const stats = await brandService.getBrandStats(req.params.id);
      if (!stats) {
        return res.status(404).json({ success: false, error: 'Brand not found' });
      }
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Royalty Endpoints (Protected)
// ============================================================================

app.post('/api/franchises/:id/royalty/calculate',
  requireAuth(),
  requirePermission('franchises', 'read'),
  async (req, res) => {
    try {
      const period = {
        start: req.body.start ? new Date(req.body.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: req.body.end ? new Date(req.body.end) : new Date(),
      };
      const calculation = await royaltyService.calculateRoyalty(req.params.id, period);
      if (!calculation) {
        return res.status(404).json({ success: false, error: 'Franchise not found or no royalty config' });
      }
      res.json({ success: true, data: calculation });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/franchises/:id/royalty',
  requireAuth(),
  requirePermission('franchises', 'read'),
  async (req, res) => {
    try {
      const { status } = req.query;
      const calculations = await royaltyService.getCalculations({
        franchiseId: req.params.id,
        status: status as 'pending' | 'paid' | 'waived' | undefined,
      });
      res.json({ success: true, data: calculations });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/franchises/:id/royalty/:calcId/pay',
  requireAuth(),
  requireRole('super_admin', 'admin', 'franchise_owner'),
  async (req, res) => {
    try {
      const calculation = await royaltyService.markPaid(req.params.calcId);
      if (!calculation) {
        return res.status(404).json({ success: false, error: 'Calculation not found' });
      }
      res.json({ success: true, data: calculation });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Compliance Monitoring Endpoints (Protected)
// ============================================================================

// Schedule a new compliance audit
app.post('/api/franchises/:id/compliance/audit',
  requireAuth(),
  requireRole('super_admin', 'admin', 'franchise_owner'),
  async (req, res) => {
    try {
      const franchise = await franchiseService.getFranchise(req.params.id);
      if (!franchise) {
        return res.status(404).json({ success: false, error: 'Franchise not found' });
      }
      const audit = await complianceService.scheduleAudit({
        franchiseId: franchise.id,
        franchiseName: franchise.franchiseeName,
        brandId: franchise.brandId,
        brandName: franchise.brandName,
        auditorId: (req as any).user?.id || 'system',
        auditorName: (req as any).user?.name || 'System',
        scheduledDate: new Date(req.body.scheduledDate || Date.now() + 7 * 24 * 60 * 60 * 1000),
        checklistItems: req.body.checklistItems || getDefaultChecklistItems(franchise.type),
      });
      res.status(201).json({ success: true, data: audit });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Get compliance report for a franchise
app.get('/api/franchises/:id/compliance',
  requireAuth(),
  requirePermission('audit', 'read'),
  async (req, res) => {
    try {
      const report = await complianceService.getComplianceReport(req.params.id);
      if (!report) {
        return res.status(404).json({ success: false, error: 'No compliance data found' });
      }
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Get compliance audits for a franchise
app.get('/api/franchises/:id/compliance/audits',
  requireAuth(),
  requirePermission('audit', 'read'),
  async (req, res) => {
    try {
      const audits = await complianceService.getAuditsByFranchise(req.params.id);
      res.json({ success: true, data: audits });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Get audit by ID
app.get('/api/franchises/:franchiseId/compliance/audits/:auditId',
  requireAuth(),
  requirePermission('audit', 'read'),
  async (req, res) => {
    try {
      const audit = await complianceService.getAudit(req.params.auditId);
      if (!audit) {
        return res.status(404).json({ success: false, error: 'Audit not found' });
      }
      res.json({ success: true, data: audit });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Complete a checklist item during an audit
app.post('/api/franchises/:franchiseId/compliance/audits/:auditId/checklist/:checklistId',
  requireAuth(),
  requireRole('super_admin', 'admin', 'franchise_owner'),
  async (req, res) => {
    try {
      const { status, notes } = req.body;
      const audit = await complianceService.completeChecklistItem(
        req.params.auditId,
        req.params.checklistId,
        status,
        (req as any).user?.id || 'system',
        notes
      );
      if (!audit) {
        return res.status(404).json({ success: false, error: 'Audit or checklist item not found' });
      }
      res.json({ success: true, data: audit });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Complete an audit
app.post('/api/franchises/:franchiseId/compliance/audits/:auditId/complete',
  requireAuth(),
  requireRole('super_admin', 'admin', 'franchise_owner'),
  async (req, res) => {
    try {
      const audit = await complianceService.completeAudit(req.params.auditId, req.body.notes);
      if (!audit) {
        return res.status(404).json({ success: false, error: 'Audit not found' });
      }
      res.json({ success: true, data: audit });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Get compliance violations for a franchise
app.get('/api/franchises/:id/compliance/violations',
  requireAuth(),
  requirePermission('audit', 'read'),
  async (req, res) => {
    try {
      const { status } = req.query;
      const violations = await complianceService.getViolationsByFranchise(
        req.params.id,
        status as any
      );
      res.json({ success: true, data: violations });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Create a compliance violation
app.post('/api/franchises/:id/compliance/violations',
  requireAuth(),
  requireRole('super_admin', 'admin', 'franchise_owner'),
  async (req, res) => {
    try {
      const violation = await complianceService.createViolation({
        franchiseId: req.params.id,
        ...req.body,
      });
      res.status(201).json({ success: true, data: violation });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

// Resolve a violation
app.post('/api/franchises/:franchiseId/compliance/violations/:violationId/resolve',
  requireAuth(),
  requireRole('super_admin', 'admin', 'franchise_owner'),
  async (req, res) => {
    try {
      const resolvedBy = (req as any).user?.id || 'system';
      const violation = await complianceService.resolveViolation(
        req.params.violationId,
        resolvedBy,
        req.body.notes
      );
      if (!violation) {
        return res.status(404).json({ success: false, error: 'Violation not found' });
      }
      res.json({ success: true, data: violation });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Escalate a violation
app.post('/api/franchises/:franchiseId/compliance/violations/:violationId/escalate',
  requireAuth(),
  requireRole('super_admin', 'admin', 'franchise_owner'),
  async (req, res) => {
    try {
      const violation = await complianceService.escalateViolation(req.params.violationId);
      if (!violation) {
        return res.status(404).json({ success: false, error: 'Violation not found });
      }
      res.json({ success: true, data: violation });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Helper: default checklist items based on franchise type
function getDefaultChecklistItems(type: string): Array<{ category: any; item: string }> {
  return [
    { category: 'branding', item: 'Brand logo displayed correctly' },
    { category: 'branding', item: 'Signage as per brand guidelines' },
    { category: 'operations', item: 'Standard operating hours maintained' },
    { category: 'operations', item: 'Staff uniform compliant with brand' },
    { category: 'hygiene', item: 'Cleanliness standards met' },
    { category: 'hygiene', item: 'Food safety protocols followed' },
    { category: 'training', item: 'Staff trained on brand standards' },
    { category: 'training', item: 'Product knowledge up to date' },
    { category: 'documentation', item: 'Licenses and permits valid' },
    { category: 'documentation', item: 'Records maintained properly' },
    { category: 'safety', item: 'Fire safety equipment functional' },
    { category: 'safety', item: 'Emergency exits clear' },
  ];
}

// ============================================================================
// Webhook Endpoint (Signature Verified)
// ============================================================================

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  logger.error('[FranchiseOS] WEBHOOK_SECRET environment variable is not set — webhooks will be rejected');
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
      logger.info(`[FranchiseOS] Verified webhook from ${partner}:`, JSON.stringify(req.body, null, 2));
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
      logger.info(`[FranchiseOS] Internal ${resource}:`, req.body);
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
    logger.info(`\nNeXha FranchiseOS - Port ${PORT}\n`);
  } catch (error) {
    logger.error('[FranchiseOS] Failed to start:', error);
    process.exit(1);
  }
});

export default app;
