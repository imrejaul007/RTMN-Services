import { logger } from '../../shared/logger';
/**
 * NeXha ProcurementOS - Production Entry Point
 * Port: 4320
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
import { supplierService, marketplaceService, rfqService, orderService, capabilityService } from './services/procurement.service.js';
import { supplierAgentService } from './services/agent.service.js';
import { dealStateMachine } from './services/deal.service.js';
import { supplierBuyerAgent, type SupplierProfile, type SupplierQuote } from './services/supplier-buyer.service.js';
import { commerceFeed, type FeedItemType } from './services/commerce-feed.service.js';
import { nexhaSutarBridge } from './services/nexus-sutar-bridge.service.js';
import { reputationPipeline } from './services/reputation-pipeline.service.js';
import { commerceMemory } from './services/commerce-network.service.js';
import { connectDatabase } from './config/database.js';
import { requireAuth, requireRole, requirePermission, requireInternalToken } from '../../shared/auth-middleware/src/index.js';
import { createWebhookMiddleware } from '../../shared/webhook-sdk/src/index.js';
import { validateRequest } from './middleware/validation.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '4320', 10);
const SERVICE_NAME = 'nexha-procurement-os';

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
  res.send('# ProcurementOS metrics placeholder');
});

// ============================================================================
// Supplier Endpoints (Protected)
// ============================================================================

app.post('/api/suppliers',
  requireAuth(),
  requireRole('super_admin', 'admin', 'supplier_owner'),
  validateRequest('registerSupplier'),
  async (req, res) => {
    try {
      const supplier = await supplierService.registerSupplier(req.body);
      res.status(201).json({ success: true, data: supplier });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/suppliers',
  requireAuth(),
  requirePermission('suppliers', 'read'),
  async (req, res) => {
    try {
      const suppliers = await supplierService.searchSuppliers({
        category: req.query.category as string,
        verified: req.query.verified === 'true',
        minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
      });
      res.json({ success: true, data: suppliers });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/suppliers/:id',
  requireAuth(),
  requirePermission('suppliers', 'read'),
  async (req, res) => {
    try {
      const supplier = await supplierService.getSupplier(req.params.id);
      if (!supplier) return res.status(404).json({ success: false, error: 'Supplier not found' });
      res.json({ success: true, data: supplier });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Marketplace Endpoints (Protected)
// ============================================================================

app.get('/api/marketplace/products',
  requireAuth(),
  requirePermission('orders', 'read'),
  async (req, res) => {
    try {
      const products = await marketplaceService.listProducts({
        category: req.query.category as string,
        inStock: req.query.inStock === 'true',
      });
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Capability Matching Endpoints (Protected)
// ============================================================================

// Get supplier capabilities
app.get('/api/suppliers/:id/capabilities',
  requireAuth(),
  requirePermission('suppliers', 'read'),
  async (req, res) => {
    try {
      const capabilities = await capabilityService.getCapabilities(req.params.id);
      if (!capabilities) {
        return res.status(404).json({ success: false, error: 'Capabilities not found for this supplier' });
      }
      res.json({ success: true, data: capabilities });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Register/update supplier capabilities
app.post('/api/suppliers/:id/capabilities',
  requireAuth(),
  requirePermission('suppliers', 'update'),
  async (req, res) => {
    try {
      const capabilities = await capabilityService.setCapabilities(req.params.id, req.body);
      res.json({ success: true, data: capabilities });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Match suppliers to requirements
app.get('/api/suppliers/match',
  requireAuth(),
  requirePermission('suppliers', 'read'),
  async (req, res) => {
    try {
      const { category, minQuantity, maxPrice, requiredCertifications, deliveryRegions, maxLeadTimeDays, paymentTerms } = req.query;

      if (!category || !minQuantity || !maxPrice) {
        return res.status(400).json({ success: false, error: 'category, minQuantity, and maxPrice are required' });
      }

      // Get all suppliers for matching
      const allSuppliers = await supplierService.searchSuppliers({});

      const matches = await capabilityService.matchSuppliers({
        category: category as string,
        minQuantity: parseInt(minQuantity as string, 10),
        maxPrice: parseFloat(maxPrice as string),
        requiredCertifications: requiredCertifications ? (requiredCertifications as string).split(',') : undefined,
        deliveryRegions: deliveryRegions ? (deliveryRegions as string).split(',') : [],
        maxLeadTimeDays: maxLeadTimeDays ? parseInt(maxLeadTimeDays as string, 10) : 30,
        paymentTerms: paymentTerms ? (paymentTerms as string).split(',') : ['Net 30'],
      }, allSuppliers.suppliers);

      res.json({ success: true, data: matches });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// RFQ Endpoints (Protected)
// ============================================================================

app.post('/api/rfqs',
  requireAuth(),
  requirePermission('rfqs', 'create'),
  validateRequest('createRFQ'),
  async (req, res) => {
    try {
      const rfq = await rfqService.createRFQ(req.body.buyerId, req.body.buyerName, req.body);
      res.status(201).json({ success: true, data: rfq });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/rfqs/:id',
  requireAuth(),
  requirePermission('rfqs', 'read'),
  async (req, res) => {
    try {
      const rfq = await rfqService.getRFQ(req.params.id);
      if (!rfq) return res.status(404).json({ success: false, error: 'RFQ not found' });
      res.json({ success: true, data: rfq });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/rfqs/:id/open',
  requireAuth(),
  requirePermission('rfqs', 'update'),
  async (req, res) => {
    try {
      const rfq = await rfqService.openRFQ(req.params.id);
      if (!rfq) return res.status(404).json({ success: false, error: 'RFQ not found' });
      res.json({ success: true, data: rfq });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/rfqs/:id/quotes',
  requireAuth(),
  requireRole('super_admin', 'admin', 'supplier_owner', 'supplier_manager'),
  validateRequest('submitQuote'),
  async (req, res) => {
    try {
      const quote = await rfqService.submitQuote(
        req.params.id,
        req.body.supplierId,
        req.body.supplierName,
        req.body
      );
      if (!quote) return res.status(404).json({ success: false, error: 'RFQ not found' });
      res.status(201).json({ success: true, data: quote });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/rfqs/:id/award/:quoteId',
  requireAuth(),
  requirePermission('rfqs', 'update'),
  async (req, res) => {
    try {
      const rfq = await rfqService.awardQuote(req.params.id, req.params.quoteId);
      if (!rfq) return res.status(404).json({ success: false, error: 'RFQ not found' });
      res.json({ success: true, data: rfq });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Order Endpoints (Protected)
// ============================================================================

app.post('/api/orders/from-quote/:quoteId',
  requireAuth(),
  requirePermission('orders', 'create'),
  async (req, res) => {
    try {
      const order = await orderService.createFromQuote(req.params.quoteId);
      if (!order) return res.status(404).json({ success: false, error: 'Quote not found' });
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/orders/:id/confirm',
  requireAuth(),
  requirePermission('orders', 'update'),
  async (req, res) => {
    try {
      const order = await orderService.confirmOrder(req.params.id);
      if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
      res.json({ success: true, data: order });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.patch('/api/orders/:id/status',
  requireAuth(),
  requirePermission('orders', 'update'),
  validateRequest('updateOrderStatus'),
  async (req, res) => {
    try {
      const order = await orderService.updateStatus(req.params.id, req.body.status);
      if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
      res.json({ success: true, data: order });
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
  logger.error('[ProcurementOS] WEBHOOK_SECRET environment variable is not set — webhooks will be rejected');
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
      logger.info(`[ProcurementOS] Verified webhook from ${partner}:`, JSON.stringify(req.body, null, 2));
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
      logger.info(`[ProcurementOS] Internal ${resource}:`, req.body);
      res.json({ success: true, action: 'processed' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// STAYOWN HOTEL PROCUREMENT INTEGRATION
// ============================================================================

import axios from 'axios';

const STAYOWN_URL = process.env.STAYOWN_URL || 'http://localhost:3899';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

const getInternalHeaders = () => ({
  'X-Internal-Token': INTERNAL_SERVICE_TOKEN,
  'Content-Type': 'application/json',
});

/**
 * Get hotel supply requirements
 */
app.get('/api/hotels/:hotelId/requirements',
  requireAuth(),
  async (req, res) => {
    try {
      const { hotelId } = req.params;
      const response = await axios.get(
        `${STAYOWN_URL}/api/hotels/${hotelId}/procurement-requirements`,
        { headers: getInternalHeaders() }
      );
      res.json({ success: true, data: response.data });
    } catch (error) {
      logger.error('Get hotel requirements failed:', error);
      res.status(500).json({ success: false, error: 'Failed to get requirements' });
    }
  }
);

/**
 * Submit hotel supply order
 */
app.post('/api/hotels/:hotelId/orders',
  requireAuth(),
  async (req, res) => {
    try {
      const { hotelId } = req.params;
      const { items, deliveryDate, notes } = req.body;

      const response = await axios.post(
        `${STAYOWN_URL}/api/hotels/${hotelId}/supply-orders`,
        { items, deliveryDate, notes, source: 'nexha-procurement' },
        { headers: getInternalHeaders() }
      );
      res.status(201).json({ success: true, data: response.data });
    } catch (error) {
      logger.error('Submit hotel order failed:', error);
      res.status(500).json({ success: false, error: 'Failed to submit order' });
    }
  }
);

/**
 * Get approved suppliers for hotel category
 */
app.get('/api/hotels/:hotelId/approved-suppliers',
  requireAuth(),
  async (req, res) => {
    try {
      const { hotelId } = req.params;
      const { category } = req.query;

      const response = await axios.get(
        `${STAYOWN_URL}/api/hotels/${hotelId}/approved-suppliers`,
        { params: { category }, headers: getInternalHeaders() }
      );
      res.json({ success: true, data: response.data });
    } catch (error) {
      logger.error('Get approved suppliers failed:', error);
      res.status(500).json({ success: false, error: 'Failed to get suppliers' });
    }
  }
);

/**
 * Track hotel supply order
 */
app.get('/api/orders/:orderId/hotel-tracking',
  requireAuth(),
  async (req, res) => {
    try {
      const { orderId } = req.params;
      const response = await axios.get(
        `${STAYOWN_URL}/api/orders/${orderId}/hotel-tracking`,
        { headers: getInternalHeaders() }
      );
      res.json({ success: true, data: response.data });
    } catch (error) {
      logger.error('Track hotel order failed:', error);
      res.status(500).json({ success: false, error: 'Failed to track order' });
    }
  }
);

/**
 * Check StayOwn integration status
 */
app.get('/api/integration/stayown/status',
  async (_req, res) => {
    try {
      const response = await axios.get(`${STAYOWN_URL}/health`, { timeout: 5000 });
      res.json({
        success: true,
        data: {
          stayOwnConnected: response.status === 200,
          capabilities: [
            'hotel_requirements',
            'supply_orders',
            'approved_suppliers',
            'order_tracking',
          ],
        },
      });
    } catch (error) {
      res.json({
        success: true,
        data: {
          stayOwnConnected: false,
          capabilities: [],
        },
      });
    }
  }
);

// ============================================================================
// Supplier Agent Endpoints (Protected)
// ============================================================================

// Register supplier agent (webhook/API endpoint)
app.post('/api/agents/register',
  requireAuth(),
  async (req, res) => {
    try {
      const agent = supplierAgentService.registerAgent(req.body.supplierId, req.body);
      res.json({ success: true, data: agent });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Send RFQ to supplier via agent
app.post('/api/agents/rfq',
  requireAuth(),
  async (req, res) => {
    try {
      const message = await supplierAgentService.sendRFQToSupplier(req.body);
      res.status(201).json({ success: true, data: message });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Record supplier's quote response
app.post('/api/agents/response',
  requireAuth(),
  async (req, res) => {
    try {
      const session = await supplierAgentService.recordSupplierResponse(req.body);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Negotiation session not found' });
      }
      res.json({ success: true, data: session });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Get negotiation session
app.get('/api/agents/sessions/:dealId',
  requireAuth(),
  async (req, res) => {
    try {
      const session = supplierAgentService.getSession(req.params.dealId);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }
      res.json({ success: true, data: session });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Get messages for a deal
app.get('/api/agents/sessions/:dealId/messages',
  requireAuth(),
  async (req, res) => {
    try {
      const messages = supplierAgentService.getMessages(req.params.dealId);
      res.json({ success: true, data: messages });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Send reminder to supplier
app.post('/api/agents/sessions/:dealId/remind',
  requireAuth(),
  async (req, res) => {
    try {
      const { supplierId } = req.body;
      const message = await supplierAgentService.sendReminder(
        req.params.dealId,
        supplierId,
        req.body.message || 'Reminder: Please respond to the RFQ at your earliest convenience.'
      );
      if (!message) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }
      res.json({ success: true, data: message });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Send counter-offer
app.post('/api/agents/sessions/:dealId/counter',
  requireAuth(),
  async (req, res) => {
    try {
      const { counterAmount, deliveryDays, paymentTerms } = req.body;
      const session = await supplierAgentService.sendCounterOffer(
        req.params.dealId,
        counterAmount,
        deliveryDays,
        paymentTerms
      );
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }
      res.json({ success: true, data: session });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Deal State Machine Endpoints (Protected)
// ============================================================================

// Create a deal
app.post('/api/deals',
  requireAuth(),
  async (req, res) => {
    try {
      const deal = dealStateMachine.createDeal(req.body);
      res.status(201).json({ success: true, data: deal });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

// Get deal by ID
app.get('/api/deals/:id',
  requireAuth(),
  async (req, res) => {
    try {
      const deal = dealStateMachine.getDeal(req.params.id);
      if (!deal) {
        return res.status(404).json({ success: false, error: 'Deal not found' });
      }
      res.json({ success: true, data: deal });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Get deals by buyer
app.get('/api/deals',
  requireAuth(),
  async (req, res) => {
    try {
      const { buyerId, state } = req.query;
      const deals = dealStateMachine.getDealsByBuyer(buyerId as string, { state: state as any });
      res.json({ success: true, data: deals });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Record a supplier quote
app.post('/api/deals/:id/quotes',
  requireAuth(),
  async (req, res) => {
    try {
      const deal = dealStateMachine.recordQuote({ dealId: req.params.id, ...req.body });
      if (!deal) {
        return res.status(404).json({ success: false, error: 'Deal not found' });
      }
      res.status(201).json({ success: true, data: deal });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Award deal to supplier.
// Triggers policy-os evaluation. Possible responses:
//   200 { success: true, data: deal, decision }           — allowed, awarded
//   202 { success: true, pending: true, data: deal, decision } — needs approval
//   403 { success: false, code: 'POLICY_DENIED', decision }    — blocked
//   404 { success: false, error: 'Deal not found' }
app.post('/api/deals/:id/award',
  requireAuth(),
  async (req, res) => {
    try {
      const result = await dealStateMachine.awardDeal({ dealId: req.params.id, ...req.body });
      if (!result) {
        return res.status(404).json({ success: false, error: 'Deal not found or invalid award' });
      }
      const status = result.pending ? 202 : 200;
      res.status(status).json({
        success: true,
        pending: !!result.pending,
        data: result.deal,
        decision: result.decision,
      });
    } catch (error: any) {
      if (error && error.code === 'POLICY_DENIED') {
        return res.status(403).json({
          success: false,
          code: 'POLICY_DENIED',
          error: error.message,
          decision: error.decision,
        });
      }
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Approve a deal that is awaiting policy approval.
// Manager clicks "Approve" in the dashboard.
app.post('/api/deals/:id/approve',
  requireAuth(),
  async (req, res) => {
    try {
      const approver = (req.body && req.body.approver) || 'manager';
      const deal = dealStateMachine.approvePendingApproval(req.params.id, approver);
      if (!deal) {
        return res.status(404).json({ success: false, error: 'Deal not found' });
      }
      res.json({ success: true, data: deal });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Update fulfillment status
app.patch('/api/deals/:id/fulfillment',
  requireAuth(),
  async (req, res) => {
    try {
      const deal = dealStateMachine.updateFulfillment({ dealId: req.params.id, ...req.body });
      if (!deal) {
        return res.status(404).json({ success: false, error: 'Deal not found' });
      }
      res.json({ success: true, data: deal });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Settle payment
app.post('/api/deals/:id/payment',
  requireAuth(),
  async (req, res) => {
    try {
      const { amount } = req.body;
      const deal = dealStateMachine.settlePayment(req.params.id, amount);
      if (!deal) {
        return res.status(404).json({ success: false, error: 'Deal not found' });
      }
      res.json({ success: true, data: deal });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Cancel deal
app.post('/api/deals/:id/cancel',
  requireAuth(),
  async (req, res) => {
    try {
      const { reason } = req.body;
      const deal = dealStateMachine.cancelDeal(req.params.id, reason, (req as any).user?.id);
      if (!deal) {
        return res.status(404).json({ success: false, error: 'Deal not found' });
      }
      res.json({ success: true, data: deal });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Complete deal
app.post('/api/deals/:id/complete',
  requireAuth(),
  async (req, res) => {
    try {
      const deal = dealStateMachine.completeDeal(req.params.id);
      if (!deal) {
        return res.status(404).json({ success: false, error: 'Deal not found' });
      }
      res.json({ success: true, data: deal });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Get best quote for deal
app.get('/api/deals/:id/best-quote',
  requireAuth(),
  async (req, res) => {
    try {
      const quote = dealStateMachine.getBestQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ success: false, error: 'No quotes found' });
      }
      res.json({ success: true, data: quote });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Get deal statistics
app.get('/api/deals/stats/all',
  requireAuth(),
  async (_req, res) => {
    try {
      const stats = dealStateMachine.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// SELLER AGENT (Supplier) - Webhook for RFQ receipt
// ============================================================================

// Guest supplier registration (no auth required)
app.post('/api/sellers/register',
  async (req, res) => {
    try {
      const result = await supplierBuyerAgent.registerSupplier(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Supplier webhook endpoint (no auth required - guest access)
app.post('/api/sellers/rfq-webhook',
  async (req, res) => {
    try {
      // Accept guest token or supplier ID
      const { supplierId, guestToken, rfqId, action, counterAmount, counterTerms } = req.body;

      if (guestToken) {
        const supplier = supplierBuyerAgent.verifyGuestToken(guestToken);
        if (!supplier) {
          return res.status(401).json({ success: false, error: 'Invalid or expired guest token' });
        }
      }

      if (action === 'receive' || action === 'quote') {
        const quote = await supplierBuyerAgent.receiveRFQ(supplierId, rfqId, req.body);
        return res.json({ success: true, data: quote });
      }

      if (action === 'accept') {
        const quote = await supplierBuyerAgent.acceptRFQ(rfqId);
        return res.json({ success: true, data: quote });
      }

      if (action === 'reject') {
        const quote = await supplierBuyerAgent.rejectRFQ(rfqId, req.body.reason);
        return res.json({ success: true, data: quote });
      }

      if (action === 'counter') {
        const quote = await supplierBuyerAgent.sendCounterOffer(rfqId, counterAmount, counterTerms);
        return res.json({ success: true, data: quote });
      }

      res.status(400).json({ success: false, error: 'Invalid action' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Auto-generate quote for supplier
app.post('/api/sellers/auto-quote',
  async (req, res) => {
    try {
      const { supplierId, rfqId, checkInventory, negotiate } = req.body;
      const quote = await supplierBuyerAgent.autoGenerateQuote(supplierId, rfqId, req.body.items, { checkInventory: !!checkInventory, negotiate: !!negotiate });
      if (!quote) {
        return res.status(404).json({ success: false, error: 'Supplier not found' });
      }
      res.json({ success: true, data: quote });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Get pending RFQs for supplier
app.get('/api/sellers/:supplierId/rfqs',
  async (req, res) => {
    try {
      const rfqs = supplierBuyerAgent.getPendingRFQs(req.params.supplierId);
      res.json({ success: true, data: rfqs });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Upgrade guest supplier to verified
app.post('/api/sellers/upgrade',
  async (req, res) => {
    try {
      const { guestToken, gstin, documents } = req.body;
      const supplier = await supplierBuyerAgent.upgradeGuestToVerified(guestToken, gstin, documents || []);
      if (!supplier) {
        return res.status(404).json({ success: false, error: 'Invalid guest token' });
      }
      res.json({ success: true, data: supplier });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// COMMERCE FEED
// ============================================================================

// Post to commerce feed
app.post('/api/feed',
  requireAuth(),
  async (req, res) => {
    try {
      const item = commerceFeed.post({
        ...req.body,
        participantId: (req as any).user?.id || 'unknown',
        participantName: (req as any).user?.name || 'Unknown',
        participantType: req.body.participantType || 'supplier',
        audience: req.body.audience || 'industry',
        tags: req.body.tags || [],
      });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Get commerce feed
app.get('/api/feed',
  async (req, res) => {
    try {
      const { type, tags, participantId, limit } = req.query;
      const items = commerceFeed.getFeed({
        type: type as FeedItemType,
        tags: tags ? (tags as string).split(',') : undefined,
        participantId: participantId as string,
        limit: limit ? parseInt(limit as string) : 20,
      });
      res.json({ success: true, data: items });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// REPUTATION PIPELINE
// ============================================================================

// Record delivery event (triggers reputation update)
app.post('/api/reputation/delivery',
  requireAuth(),
  async (req, res) => {
    try {
      const event = reputationPipeline.recordDelivery(req.body);
      const reputation = reputationPipeline.getReputation(req.body.supplierId);
      res.json({ success: true, data: { event, reputation } });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Record quality event
app.post('/api/reputation/quality',
  requireAuth(),
  async (req, res) => {
    try {
      const event = reputationPipeline.recordQuality(req.body);
      const reputation = reputationPipeline.getReputation(req.body.supplierId);
      res.json({ success: true, data: { event, reputation } });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Get supplier reputation
app.get('/api/reputation/:supplierId',
  async (req, res) => {
    try {
      const reputation = reputationPipeline.getReputation(req.params.supplierId);
      if (!reputation) {
        return res.status(404).json({ success: false, error: 'Supplier not found' });
      }
      res.json({ success: true, data: reputation });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Get reputation leaderboard
app.get('/api/reputation/leaderboard',
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaders = reputationPipeline.getLeaderboard(limit);
      res.json({ success: true, data: leaders });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// COMMERCE MEMORY
// ============================================================================

// Record transaction memory
app.post('/api/memory/transaction',
  requireAuth(),
  async (req, res) => {
    try {
      commerceMemory.recordTransaction(req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Get supplier memory insights
app.get('/api/memory/suppliers/:supplierId',
  requireAuth(),
  async (req, res) => {
    try {
      const memory = commerceMemory.getSupplierMemory(req.params.supplierId);
      const insights = commerceMemory.getSupplierInsights(req.params.supplierId);
      const deliveryTrend = commerceMemory.getDeliveryTrend(req.params.supplierId);
      const priceTrends = commerceMemory.getSeasonalPatterns(req.params.supplierId, req.query.productName as string);
      res.json({ success: true, data: { memory, insights, deliveryTrend, priceTrends });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Get buyer patterns
app.get('/api/memory/buyers/:buyerId/patterns',
  requireAuth(),
  async (req, res) => {
    try {
      const patterns = commerceMemory.getBuyerPattern(req.params.buyerId);
      if (!patterns) {
        return res.status(404).json({ success: false, error: 'Buyer pattern not found' });
      }
      const predictions = commerceMemory.predictNextOrder(req.params.buyerId);
      res.json({ success: true, data: { patterns, predictions } });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// NEXHA-SUTAR BRIDGE EVENTS
// ============================================================================

// Emit inventory low event to SUTAR GoalOS
app.post('/api/bridge/inventory-low',
  requireAuth(),
  async (req, res) => {
    try {
      await nexhaSutarBridge.emitInventoryLow(req.body);
      res.json({ success: true, action: 'inventory_low_emitted' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Emit RFQ created to SUTAR Intent Bus
app.post('/api/bridge/rfq-created',
  requireAuth(),
  async (req, res) => {
    try {
      await nexhaBridge.emitRFQCreated(req.body);
      res.json({ success: true, action: 'rfq_created_emitted' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Emit order delivered to SUTAR Reputation + Memory
app.post('/api/bridge/order-delivered',
  requireAuth(),
  async (req, res) => {
    try {
      const { supplierId, buyerId, onTime, qualityPass, actualAmount, deliveryDays } = req.body;
      await nexhaSutarBridge.emitOrderDelivered({ dealId: req.body.dealId, supplierId, buyerId, onTime, qualityPass, actualAmount, deliveryDays });
      res.json({ success: true, action: 'order_delivered_emitted' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Get bridge event history
app.get('/api/bridge/history',
  requireAuth(),
  async (req, res) => {
    try {
      const history = nexhaSutarBridge.getHistory(20);
      const stats = nexhaSutarBridge.getStats();
      res.json({ success: true, data: { history, stats });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// Receive SUTAR events
app.post('/api/bridge/sutar-event',
  async (req, res) => {
    try {
      await nexhaSutarBridge.receiveSutarEvent(req.body);
      res.json({ success: true });
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
    logger.info(`\nNeXha ProcurementOS - Port ${PORT}\n`);
  } catch (error) {
    logger.error('[ProcurementOS] Failed to start:', error);
    process.exit(1);
  }
});

export default app;
