import { logger } from '../../shared/logger';
/**
 * NeXha Trade Finance - Main Entry Point
 * Port: 4340
 *
 * Security Features:
 * - Authentication via RABTUL Auth Service
 * - Role-based access control (RBAC)
 * - Webhook signature verification
 * - Rate limiting
 * - Input validation with Zod
 * - CORS configuration
 * - FIXED: Math.random() replaced with crypto.randomInt()
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import {
  creditService,
  bnplService,
  loanService,
  invoiceService,
  fxService,
  disputeService,
} from './services/trade-finance.service.js';
import { connectDatabase } from './config/database.js';
import { requireAuth, requireRole, requirePermission, requireInternalToken } from '../../shared/auth-middleware/src/index.js';
import { createWebhookMiddleware } from '../../shared/webhook-sdk/src/index.js';
import { validateRequest } from './middleware/validation.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '4340', 10);
const SERVICE_NAME = 'nexha-trade-finance';

// ============================================================================
// Security Middleware
// ============================================================================

// Rate limiting - stricter for financial operations
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for financial operations
const financialLimiter = rateLimit({
  windowMs: 60000,
  max: 20,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many financial requests' } },
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
  res.send('# TradeFinance metrics placeholder');
});

// ============================================================================
// Credit Lines (Protected)
// ============================================================================

app.post('/api/credits/apply',
  financialLimiter,
  requireAuth(),
  requireRole('super_admin', 'admin', 'distributor_owner', 'merchant_owner', 'franchise_owner', 'supplier_owner'),
  validateRequest('applyForCredit'),
  async (req, res) => {
    try {
      const credit = await creditService.applyForCredit(req.body);
      res.status(201).json({ success: true, data: credit });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/credits/:id',
  requireAuth(),
  requirePermission('credits', 'read'),
  async (req, res) => {
    try {
      const credit = await creditService.getCreditLine(req.params.id);
      if (!credit) return res.status(404).json({ success: false, error: 'Credit line not found' });
      res.json({ success: true, data: credit });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/credits/business/:businessId',
  requireAuth(),
  requirePermission('credits', 'read'),
  async (req, res) => {
    try {
      const credit = await creditService.getCreditLineByBusiness(req.params.businessId);
      if (!credit) return res.status(404).json({ success: false, error: 'Credit line not found' });
      res.json({ success: true, data: credit });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/credits/:id/approve',
  requireAuth(),
  requireRole('super_admin', 'admin'),
  async (req, res) => {
    try {
      const credit = await creditService.approveCredit(req.params.id);
      if (!credit) return res.status(404).json({ success: false, error: 'Credit line not found' });
      res.json({ success: true, data: credit });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/credits/:id/use',
  financialLimiter,
  requireAuth(),
  requirePermission('credits', 'use'),
  validateRequest('useCredit'),
  async (req, res) => {
    try {
      const credit = await creditService.useCredit(req.params.id, req.body.amount);
      if (!credit) return res.status(400).json({ success: false, error: 'Insufficient credit or credit not found' });
      res.json({ success: true, data: credit });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// BNPL (Protected)
// ============================================================================

app.post('/api/bnpl/create',
  financialLimiter,
  requireAuth(),
  requirePermission('bnpl', 'create'),
  validateRequest('createBNPL'),
  async (req, res) => {
    try {
      const txn = await bnplService.createTransaction(req.body);
      res.status(201).json({ success: true, data: txn });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/bnpl/:id/pay',
  financialLimiter,
  requireAuth(),
  requirePermission('bnpl', 'pay'),
  validateRequest('bnplPayment'),
  async (req, res) => {
    try {
      const txn = await bnplService.makePayment(
        req.params.id,
        req.body.amount,
        req.body.method,
        req.body.reference
      );
      if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });
      res.json({ success: true, data: txn });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/bnpl/:id',
  requireAuth(),
  requirePermission('bnpl', 'read'),
  async (req, res) => {
    try {
      const txn = await bnplService.getTransaction(req.params.id);
      if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });
      res.json({ success: true, data: txn });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/bnpl/overdue',
  requireAuth(),
  requireRole('super_admin', 'admin'),
  async (_req, res) => {
    try {
      const overdue = await bnplService.getOverdueTransactions();
      res.json({ success: true, data: overdue });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Loans (Protected)
// ============================================================================

app.post('/api/loans/apply',
  financialLimiter,
  requireAuth(),
  requireRole('super_admin', 'admin', 'distributor_owner', 'merchant_owner', 'franchise_owner'),
  validateRequest('applyForLoan'),
  async (req, res) => {
    try {
      const loan = loanService.applyForLoan(req.body);
      res.status(201).json({ success: true, data: loan });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/loans/:id/approve',
  requireAuth(),
  requireRole('super_admin', 'admin'),
  async (req, res) => {
    try {
      const loan = await loanService.approveLoan(req.params.id);
      if (!loan) return res.status(404).json({ success: false, error: 'Loan not found' });
      res.json({ success: true, data: loan });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/loans/:id/pay',
  financialLimiter,
  requireAuth(),
  requirePermission('loans', 'pay'),
  validateRequest('loanPayment'),
  async (req, res) => {
    try {
      const loan = await loanService.makeEMIPayment(req.params.id, req.body.amount);
      if (!loan) return res.status(400).json({ success: false, error: 'Loan not found or not disbursed' });
      res.json({ success: true, data: loan });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Invoice Financing (Protected)
// ============================================================================

app.post('/api/invoices/finance',
  financialLimiter,
  requireAuth(),
  requireRole('super_admin', 'admin', 'distributor_owner'),
  validateRequest('financeInvoice'),
  async (req, res) => {
    try {
      const invoice = invoiceService.financeInvoice(req.body);
      res.status(201).json({ success: true, data: invoice });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/invoices/:id/disburse',
  requireAuth(),
  requireRole('super_admin', 'admin'),
  async (req, res) => {
    try {
      const invoice = await invoiceService.disburseInvoice(req.params.id);
      if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
      res.json({ success: true, data: invoice });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/invoices/:id/mark-paid',
  requireAuth(),
  requireRole('super_admin', 'admin'),
  async (req, res) => {
    try {
      const invoice = await invoiceService.markInvoicePaid(req.params.id);
      if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
      res.json({ success: true, data: invoice });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// FX / Currency Conversion Endpoints (Protected)
// ============================================================================

app.get('/api/fx/rates',
  requireAuth(),
  async (_req, res) => {
    try {
      const rates = fxService.getAllRates();
      res.json({ success: true, data: rates });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/fx/rates/:from/:to',
  requireAuth(),
  async (req, res) => {
    try {
      const rate = fxService.getRate(req.params.from.toUpperCase(), req.params.to.toUpperCase());
      if (!rate) {
        return res.status(404).json({ success: false, error: 'FX rate not found' });
      }
      res.json({ success: true, data: rate });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/fx/convert',
  requireAuth(),
  async (req, res) => {
    try {
      const { from, to, amount } = req.body;
      if (!from || !to || !amount) {
        return res.status(400).json({ success: false, error: 'from, to, and amount are required' });
      }
      const result = fxService.convert(from.toUpperCase(), to.toUpperCase(), parseFloat(amount));
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

// ============================================================================
// Dispute Resolution Endpoints (Protected)
// ============================================================================

app.post('/api/disputes',
  requireAuth(),
  async (req, res) => {
    try {
      const dispute = await disputeService.createDispute(req.body);
      res.status(201).json({ success: true, data: dispute });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/disputes',
  requireAuth(),
  async (req, res) => {
    try {
      const { status, type, entityId, limit } = req.query;
      const disputes = await disputeService.listDisputes({
        status: status as any,
        type: type as any,
        entityId: entityId as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.json({ success: true, data: disputes });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.get('/api/disputes/:id',
  requireAuth(),
  async (req, res) => {
    try {
      const dispute = await disputeService.getDispute(req.params.id);
      if (!dispute) {
        return res.status(404).json({ success: false, error: 'Dispute not found' });
      }
      res.json({ success: true, data: dispute });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/disputes/:id/evidence',
  requireAuth(),
  async (req, res) => {
    try {
      const dispute = await disputeService.addEvidence(req.params.id, req.body);
      if (!dispute) {
        return res.status(404).json({ success: false, error: 'Dispute not found' });
      }
      res.json({ success: true, data: dispute });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/disputes/:id/messages',
  requireAuth(),
  async (req, res) => {
    try {
      const { from, message } = req.body;
      if (!from || !message) {
        return res.status(400).json({ success: false, error: 'from and message are required' });
      }
      const dispute = await disputeService.addMessage(req.params.id, from, message);
      if (!dispute) {
        return res.status(404).json({ success: false, error: 'Dispute not found' });
      }
      res.json({ success: true, data: dispute });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/disputes/:id/escalate',
  requireAuth(),
  requireRole('super_admin', 'admin'),
  async (req, res) => {
    try {
      const dispute = await disputeService.escalate(req.params.id);
      if (!dispute) {
        return res.status(404).json({ success: false, error: 'Dispute not found' });
      }
      res.json({ success: true, data: dispute });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

app.post('/api/disputes/:id/resolve',
  requireAuth(),
  requireRole('super_admin', 'admin'),
  async (req, res) => {
    try {
      const { decision, resolvedBy, amount, action, notes } = req.body;
      if (!decision || !resolvedBy) {
        return res.status(400).json({ success: false, error: 'decision and resolvedBy are required' });
      }
      const dispute = await disputeService.resolveDispute(
        req.params.id,
        decision,
        resolvedBy,
        { amount, action, notes }
      );
      if (!dispute) {
        return res.status(404).json({ success: false, error: 'Dispute not found' });
      }
      res.json({ success: true, data: dispute });
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
  logger.error('[TradeFinance] WEBHOOK_SECRET environment variable is not set — webhooks will be rejected');
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
      logger.info(`[TradeFinance] Verified webhook from ${partner}:`, JSON.stringify(req.body, null, 2));
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
      logger.info(`[TradeFinance] Internal ${resource}:`, req.body);
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
    logger.info(`\nNeXha Trade Finance - Port ${PORT}\n`);
  } catch (error) {
    logger.error('[TradeFinance] Failed to start:', error);
    process.exit(1);
  }
});

export default app;
