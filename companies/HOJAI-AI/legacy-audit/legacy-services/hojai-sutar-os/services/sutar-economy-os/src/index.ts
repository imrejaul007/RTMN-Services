/**
 * SUTAR Economy OS - Main Application
 * Layer 10: Karma points, earnings, transactions, billing, escrow, and integrations
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

// Import services
import { karmaService, KARMA_TIERS, KARMA_POINT_CONFIG, getTierProgress } from './services/karma.service.js';
import { transactionService } from './services/transaction.service.js';
import { balanceService, SUPPORTED_CURRENCIES, EXCHANGE_RATES } from './services/balance.service.js';
import { billingService } from './services/billing.service.js';
import { earningsService } from './services/earnings.service.js';
import { paymentService } from './services/payment.service.js';
import { escrowService } from './services/escrow.service.js';
import { leaderboardService } from './services/leaderboard.service.js';
import { redemptionService } from './services/redemption.service.js';
import { integrationService } from './services/integration.service.js';

// Import types
import type { KarmaAction, TransactionType, TransactionStatus, BillingStatus, BillingCycle, EarningSource } from './types/index.js';

// ============================================
// App Configuration
// ============================================

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4251;
const START_TIME = Date.now();

// ============================================
// Middleware
// ============================================

app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// Helper Functions
// ============================================

const apiResponse = <T>(success: boolean, data?: T, error?: string) => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString(),
  requestId: uuidv4()
});

// ============================================
// Health & Info Endpoints
// ============================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'sutar-economy-os',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    port: PORT
  });
});

app.get('/api/v1/info', (_req, res) => {
  res.json(apiResponse(true, {
    name: 'sutar-economy-os',
    description: 'Economy OS - Economic flow, Karma system, and integrations',
    version: '1.0.0',
    features: [
      'Karma points system with tier-based rewards',
      'Transaction management with CRUD operations',
      'Balance management with multi-currency support',
      'Billing and invoicing',
      'Earnings tracking for agents and services',
      'Payment processing with multiple methods',
      'Escrow system for secure transactions',
      'Leaderboard for top earners',
      'Point redemption marketplace',
      'Contract OS integration (port 4190)',
      'Trust Engine integration (port 4180)'
    ],
    supportedCurrencies: SUPPORTED_CURRENCIES.map(c => c.code),
    karmaTiers: Object.keys(KARMA_TIERS)
  }));
});

// ============================================
// Karma Endpoints
// ============================================

/**
 * GET /api/v1/karma/:entityId
 * Get karma balance for an entity
 */
app.get('/api/v1/karma/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const balance = await karmaService.getKarmaBalance(entityId);

    if (!balance) {
      return res.status(404).json(apiResponse(false, undefined, 'Karma record not found'));
    }

    res.json(apiResponse(true, balance));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/karma/:entityId/tier
 * Get tier information for an entity
 */
app.get('/api/v1/karma/:entityId/tier', async (req, res) => {
  try {
    const { entityId } = req.params;
    const tierInfo = await karmaService.getTierInfo(entityId);

    if (!tierInfo) {
      return res.status(404).json(apiResponse(false, undefined, 'Karma record not found'));
    }

    res.json(apiResponse(true, tierInfo));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/karma/tiers
 * Get all available karma tiers
 */
app.get('/api/v1/karma/tiers', async (_req, res) => {
  try {
    const tiers = Object.values(KARMA_TIERS);
    res.json(apiResponse(true, { tiers }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/karma/actions
 * Get all karma action configurations
 */
app.get('/api/v1/karma/actions', async (_req, res) => {
  try {
    res.json(apiResponse(true, { actions: KARMA_POINT_CONFIG }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * POST /api/v1/karma/earn
 * Earn karma points with category
 */
app.post('/api/v1/karma/earn', async (req, res) => {
  try {
    const { entityId, entityType, action, points, reason, referenceId, metadata } = req.body;

    if (!entityId || !entityType || !action) {
      return res.status(400).json(apiResponse(false, undefined, 'Missing required fields: entityId, entityType, action'));
    }

    const history = await karmaService.earnKarma({
      entityId,
      entityType,
      action,
      points,
      reason,
      referenceId,
      metadata
    });

    res.json(apiResponse(true, { history }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * POST /api/v1/karma/spend
 * Spend karma points
 */
app.post('/api/v1/karma/spend', async (req, res) => {
  try {
    const { entityId, points, reason, referenceId, metadata } = req.body;

    if (!entityId || !points || !reason) {
      return res.status(400).json(apiResponse(false, undefined, 'Missing required fields: entityId, points, reason'));
    }

    const history = await karmaService.spendKarma({
      entityId,
      points,
      reason,
      referenceId,
      metadata
    });

    res.json(apiResponse(true, { history }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/karma/:entityId/history
 * Get karma history for an entity
 */
app.get('/api/v1/karma/:entityId/history', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { page, limit, action, startDate, endDate } = req.query;

    const result = await karmaService.getKarmaHistory(entityId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      action: action as KarmaAction,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    res.json(apiResponse(true, result));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/karma/:entityId/progress
 * Get tier progress for an entity
 */
app.get('/api/v1/karma/:entityId/progress', async (req, res) => {
  try {
    const { entityId } = req.params;
    const balance = await karmaService.getKarmaBalance(entityId);

    if (!balance) {
      return res.status(404).json(apiResponse(false, undefined, 'Karma record not found'));
    }

    const progress = getTierProgress(balance.points);
    res.json(apiResponse(true, progress));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/karma/leaderboard
 * Get karma leaderboard
 */
app.get('/api/v1/karma/leaderboard', async (req, res) => {
  try {
    const { limit } = req.query;
    const leaderboard = await karmaService.getLeaderboard(limit ? parseInt(limit as string) : 10);
    res.json(apiResponse(true, { leaderboard }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================
// Transaction Endpoints
// ============================================

/**
 * POST /api/v1/transactions
 * Create a new transaction
 */
app.post('/api/v1/transactions', async (req, res) => {
  try {
    const transaction = await transactionService.createTransaction(req.body);
    res.status(201).json(apiResponse(true, { transaction }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/transactions/:transactionId
 * Get transaction by ID
 */
app.get('/api/v1/transactions/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const transaction = await transactionService.getTransaction(transactionId);

    if (!transaction) {
      return res.status(404).json(apiResponse(false, undefined, 'Transaction not found'));
    }

    res.json(apiResponse(true, { transaction }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/transactions/entity/:entityId
 * Get transactions for an entity
 */
app.get('/api/v1/transactions/entity/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const {
      page, limit, type, status, category, currency,
      startDate, endDate, minAmount, maxAmount, sortBy, sortOrder
    } = req.query;

    const result = await transactionService.getTransactions(entityId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      type: type as TransactionType,
      status: status as TransactionStatus,
      category: category as 'inflow' | 'outflow' | 'internal',
      currency: currency as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined,
      sortBy: sortBy as 'createdAt' | 'amount' | 'type',
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    res.json(apiResponse(true, result));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * PATCH /api/v1/transactions/:transactionId/status
 * Update transaction status
 */
app.patch('/api/v1/transactions/:transactionId/status', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { status, failureReason } = req.body;

    if (!status) {
      return res.status(400).json(apiResponse(false, undefined, 'Status is required'));
    }

    const transaction = await transactionService.updateTransactionStatus(
      transactionId,
      status,
      failureReason
    );

    if (!transaction) {
      return res.status(404).json(apiResponse(false, undefined, 'Transaction not found'));
    }

    res.json(apiResponse(true, { transaction }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * POST /api/v1/transactions/:transactionId/reverse
 * Reverse a transaction
 */
app.post('/api/v1/transactions/:transactionId/reverse', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { reason } = req.body;

    const transaction = await transactionService.reverseTransaction(transactionId, reason || 'Manual reversal');

    if (!transaction) {
      return res.status(404).json(apiResponse(false, undefined, 'Transaction not found'));
    }

    res.json(apiResponse(true, { transaction }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================
// Balance Endpoints
// ============================================

/**
 * GET /api/v1/balances/:entityId
 * Get balance for an entity
 */
app.get('/api/v1/balances/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { currency } = req.query;

    if (currency) {
      const balance = await balanceService.getBalance(entityId, currency as string);
      if (!balance) {
        return res.status(404).json(apiResponse(false, undefined, 'Balance not found'));
      }
      return res.json(apiResponse(true, { balance }));
    }

    const result = await balanceService.getTotalBalanceInBaseCurrency(entityId);
    res.json(apiResponse(true, result));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * POST /api/v1/balances/:entityId/deposit
 * Add funds to balance
 */
app.post('/api/v1/balances/:entityId/deposit', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { amount, currency, referenceId, referenceType, entityType } = req.body;

    if (!amount || !entityType) {
      return res.status(400).json(apiResponse(false, undefined, 'Missing required fields: amount, entityType'));
    }

    const balance = await balanceService.addFunds(
      entityId,
      entityType,
      amount,
      currency || 'USD'
    );

    res.json(apiResponse(true, { balance }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * POST /api/v1/balances/:entityId/withdraw
 * Withdraw funds from balance
 */
app.post('/api/v1/balances/:entityId/withdraw', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { amount, currency, referenceId, referenceType } = req.body;

    if (!amount) {
      return res.status(400).json(apiResponse(false, undefined, 'Amount is required'));
    }

    const balance = await balanceService.deductFunds(
      entityId,
      amount,
      currency || 'USD'
    );

    res.json(apiResponse(true, { balance }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/balances/currencies
 * Get supported currencies
 */
app.get('/api/v1/balances/currencies', async (_req, res) => {
  try {
    const currencies = balanceService.getSupportedCurrencies();
    const rates = EXCHANGE_RATES;
    res.json(apiResponse(true, { currencies, exchangeRates: rates }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================
// Billing Endpoints
// ============================================

/**
 * POST /api/v1/billing/:entityId/invoices
 * Generate invoice
 */
app.post('/api/v1/billing/:entityId/invoices', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { entityType, cycle, currency, lineItems, dueDate, metadata } = req.body;

    if (!entityType || !lineItems || lineItems.length === 0) {
      return res.status(400).json(apiResponse(false, undefined, 'Missing required fields: entityType, lineItems'));
    }

    const invoice = await billingService.createInvoice({
      entityId,
      entityType,
      cycle,
      currency,
      lineItems,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      metadata
    });

    res.status(201).json(apiResponse(true, { invoice }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/billing/:entityId/invoices
 * List invoices for an entity
 */
app.get('/api/v1/billing/:entityId/invoices', async (req, res) => {
  try {
    const { entityId } = req.params;
    const {
      page, limit, status, cycle, currency,
      startDate, endDate, sortBy, sortOrder
    } = req.query;

    const result = await billingService.getInvoices(entityId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as BillingStatus,
      cycle: cycle as BillingCycle,
      currency: currency as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      sortBy: sortBy as 'createdAt' | 'dueDate' | 'total',
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    res.json(apiResponse(true, result));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/billing/invoices/:billingId
 * Get invoice by ID
 */
app.get('/api/v1/billing/invoices/:billingId', async (req, res) => {
  try {
    const { billingId } = req.params;
    const invoice = await billingService.getInvoice(billingId);

    if (!invoice) {
      return res.status(404).json(apiResponse(false, undefined, 'Invoice not found'));
    }

    res.json(apiResponse(true, { invoice }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * PATCH /api/v1/billing/invoices/:billingId/status
 * Update invoice status
 */
app.patch('/api/v1/billing/invoices/:billingId/status', async (req, res) => {
  try {
    const { billingId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json(apiResponse(false, undefined, 'Status is required'));
    }

    const invoice = await billingService.updateInvoiceStatus(billingId, status);

    if (!invoice) {
      return res.status(404).json(apiResponse(false, undefined, 'Invoice not found'));
    }

    res.json(apiResponse(true, { invoice }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * POST /api/v1/billing/invoices/:billingId/pay
 * Add payment to invoice
 */
app.post('/api/v1/billing/invoices/:billingId/pay', async (req, res) => {
  try {
    const { billingId } = req.params;
    const { amount, paymentMethod, transactionId } = req.body;

    const invoice = await billingService.addPayment(billingId, amount, paymentMethod, transactionId);

    if (!invoice) {
      return res.status(404).json(apiResponse(false, undefined, 'Invoice not found'));
    }

    res.json(apiResponse(true, { invoice }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================
// Earnings Endpoints
// ============================================

/**
 * POST /api/v1/earnings
 * Create earning record
 */
app.post('/api/v1/earnings', async (req, res) => {
  try {
    const earning = await earningsService.createEarning(req.body);
    res.status(201).json(apiResponse(true, { earning }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/earnings/entity/:entityId
 * Get earnings for an entity
 */
app.get('/api/v1/earnings/entity/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { page, limit, source, status, startDate, endDate, sortBy, sortOrder } = req.query;

    const result = await earningsService.getEarnings(entityId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      source: source as EarningSource,
      status: status as 'pending' | 'calculated' | 'paid' | 'cancelled',
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      sortBy: sortBy as 'createdAt' | 'amount' | 'source',
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    res.json(apiResponse(true, result));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/earnings/leaderboard
 * Get top earners
 */
app.get('/api/v1/earnings/leaderboard', async (req, res) => {
  try {
    const { period, limit } = req.query;
    const periodStart = new Date();
    const periodEnd = new Date();

    // Calculate period
    switch (period) {
      case 'daily':
        periodStart.setDate(periodStart.getDate() - 1);
        break;
      case 'weekly':
        periodStart.setDate(periodStart.getDate() - 7);
        break;
      case 'monthly':
        periodStart.setMonth(periodStart.getMonth() - 1);
        break;
      default:
        periodStart.setFullYear(periodStart.getFullYear() - 1);
    }

    const leaderboard = await earningsService.getTopEarners(
      periodStart,
      periodEnd,
      limit ? parseInt(limit as string) : 10
    );

    res.json(apiResponse(true, { leaderboard }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * POST /api/v1/earnings/calculate
 * Calculate earnings for a period
 */
app.post('/api/v1/earnings/calculate', async (req, res) => {
  try {
    const { entityId, periodStart, periodEnd, source, applyTrustMultiplier, trustScore } = req.body;

    if (!entityId || !periodStart || !periodEnd) {
      return res.status(400).json(apiResponse(false, undefined, 'Missing required fields: entityId, periodStart, periodEnd'));
    }

    const summary = await earningsService.calculateEarnings(entityId, new Date(periodStart), new Date(periodEnd), {
      source,
      applyTrustMultiplier,
      trustScore
    });

    res.json(apiResponse(true, { summary }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================
// Escrow Endpoints
// ============================================

/**
 * POST /api/v1/escrow/create
 * Create escrow
 */
app.post('/api/v1/escrow/create', async (req, res) => {
  try {
    const {
      senderId, recipientId, amount, currency, title,
      description, releaseCondition, milestones, expiresAt, metadata
    } = req.body;

    if (!senderId || !recipientId || !amount || !title || !releaseCondition) {
      return res.status(400).json(apiResponse(false, undefined, 'Missing required fields'));
    }

    const escrow = await escrowService.createEscrow({
      senderId,
      recipientId,
      amount,
      currency,
      title,
      description,
      releaseCondition,
      milestones,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      metadata
    });

    res.status(201).json(apiResponse(true, { escrow }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * POST /api/v1/escrow/:escrowId/fund
 * Fund escrow
 */
app.post('/api/v1/escrow/:escrowId/fund', async (req, res) => {
  try {
    const { escrowId } = req.params;
    const { funderId } = req.body;

    if (!funderId) {
      return res.status(400).json(apiResponse(false, undefined, 'Funder ID is required'));
    }

    const escrow = await escrowService.fundEscrow(escrowId, funderId);
    res.json(apiResponse(true, { escrow }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * POST /api/v1/escrow/release
 * Release escrow
 */
app.post('/api/v1/escrow/release', async (req, res) => {
  try {
    const { escrowId, releaserId } = req.body;

    if (!escrowId || !releaserId) {
      return res.status(400).json(apiResponse(false, undefined, 'Escrow ID and releaser ID are required'));
    }

    const escrow = await escrowService.releaseEscrow(escrowId, releaserId);
    res.json(apiResponse(true, { escrow }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/escrow/:escrowId
 * Get escrow by ID
 */
app.get('/api/v1/escrow/:escrowId', async (req, res) => {
  try {
    const { escrowId } = req.params;
    const escrow = await escrowService.getEscrow(escrowId);

    if (!escrow) {
      return res.status(404).json(apiResponse(false, undefined, 'Escrow not found'));
    }

    res.json(apiResponse(true, { escrow }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/escrow/entity/:entityId
 * Get escrows for an entity
 */
app.get('/api/v1/escrow/entity/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { page, limit, role, status, startDate, endDate } = req.query;

    const result = await escrowService.getEscrows(entityId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      role: role as 'sender' | 'recipient' | 'both',
      status: status as 'pending' | 'funded' | 'released' | 'cancelled' | 'expired' | 'disputed',
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    res.json(apiResponse(true, result));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * POST /api/v1/escrow/:escrowId/cancel
 * Cancel escrow
 */
app.post('/api/v1/escrow/:escrowId/cancel', async (req, res) => {
  try {
    const { escrowId } = req.params;
    const { cancellerId, reason } = req.body;

    if (!cancellerId || !reason) {
      return res.status(400).json(apiResponse(false, undefined, 'Canceller ID and reason are required'));
    }

    const escrow = await escrowService.cancelEscrow(escrowId, cancellerId, reason);
    res.json(apiResponse(true, { escrow }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================
// Payment Endpoints
// ============================================

/**
 * POST /api/v1/payments/process
 * Process payment
 */
app.post('/api/v1/payments/process', async (req, res) => {
  try {
    const payment = await paymentService.processPayment(req.body);
    res.status(201).json(apiResponse(true, { payment }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * POST /api/v1/payments/refund
 * Initiate refund
 */
app.post('/api/v1/payments/refund', async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;

    if (!paymentId || !reason) {
      return res.status(400).json(apiResponse(false, undefined, 'Payment ID and reason are required'));
    }

    const refund = await paymentService.initiateRefund({ paymentId, amount, reason });
    res.json(apiResponse(true, { refund }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/payments/:paymentId
 * Get payment by ID
 */
app.get('/api/v1/payments/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await paymentService.getPayment(paymentId);

    if (!payment) {
      return res.status(404).json(apiResponse(false, undefined, 'Payment not found'));
    }

    res.json(apiResponse(true, { payment }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/payments/entity/:entityId
 * Get payments for an entity
 */
app.get('/api/v1/payments/entity/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { page, limit, status, methodType, startDate, endDate } = req.query;

    const result = await paymentService.getPayments(entityId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled',
      methodType: methodType as 'card' | 'bank_transfer' | 'wallet' | 'crypto' | 'escrow',
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    res.json(apiResponse(true, result));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * POST /api/v1/payments/methods
 * Add payment method
 */
app.post('/api/v1/payments/methods', async (req, res) => {
  try {
    const method = await paymentService.addPaymentMethod(req.body);
    res.status(201).json(apiResponse(true, { method }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/payments/methods/:entityId
 * Get payment methods for entity
 */
app.get('/api/v1/payments/methods/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const methods = await paymentService.getPaymentMethods(entityId);
    res.json(apiResponse(true, { methods }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================
// Redemption Endpoints
// ============================================

/**
 * GET /api/v1/redemption/options
 * Get available redemption options
 */
app.get('/api/v1/redemption/options', async (req, res) => {
  try {
    const { entityId } = req.query;

    if (!entityId) {
      return res.status(400).json(apiResponse(false, undefined, 'Entity ID is required'));
    }

    const options = await redemptionService.getAvailableOptions(entityId as string);
    res.json(apiResponse(true, { options }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * POST /api/v1/redemption/redeem
 * Redeem karma points
 */
app.post('/api/v1/redemption/redeem', async (req, res) => {
  try {
    const { entityId, optionId, quantity } = req.body;

    if (!entityId || !optionId) {
      return res.status(400).json(apiResponse(false, undefined, 'Entity ID and option ID are required'));
    }

    const redemption = await redemptionService.redeemPoints(entityId, optionId, quantity);
    res.json(apiResponse(true, { redemption }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/redemption/:entityId
 * Get redemptions for an entity
 */
app.get('/api/v1/redemption/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { page, limit, status, type, startDate, endDate } = req.query;

    const result = await redemptionService.getRedemptions(entityId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled',
      type: type as 'voucher' | 'feature_access' | 'badge' | 'service' | 'cash',
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    res.json(apiResponse(true, result));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * POST /api/v1/redemption/voucher/validate
 * Validate voucher code
 */
app.post('/api/v1/redemption/voucher/validate', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json(apiResponse(false, undefined, 'Voucher code is required'));
    }

    const result = await redemptionService.validateVoucherCode(code);
    res.json(apiResponse(true, result));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * POST /api/v1/redemption/voucher/use
 * Use voucher code
 */
app.post('/api/v1/redemption/voucher/use', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json(apiResponse(false, undefined, 'Voucher code is required'));
    }

    const result = await redemptionService.useVoucherCode(code);

    if (!result.success) {
      return res.status(400).json(apiResponse(false, undefined, result.error));
    }

    res.json(apiResponse(true, { redemption: result.redemption }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================
// Leaderboard Endpoints
// ============================================

/**
 * GET /api/v1/leaderboard/:category
 * Get leaderboard
 */
app.get('/api/v1/leaderboard/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { period, limit, offset } = req.query;

    const leaderboard = await leaderboardService.getLeaderboard(
      (period as 'daily' | 'weekly' | 'monthly' | 'all_time') || 'monthly',
      category as 'earnings' | 'karma' | 'transactions' | 'contracts',
      {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      }
    );

    if (!leaderboard) {
      return res.json(apiResponse(true, { leaderboard: null, message: 'Leaderboard not cached. Generate via other endpoints.' }));
    }

    res.json(apiResponse(true, { leaderboard }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/leaderboard/:category/trending
 * Get trending entries
 */
app.get('/api/v1/leaderboard/:category/trending', async (req, res) => {
  try {
    const { category } = req.params;
    const { period, limit } = req.query;

    const trending = await leaderboardService.getTrendingEntries(
      (period as 'daily' | 'weekly' | 'monthly' | 'all_time') || 'monthly',
      category as 'earnings' | 'karma' | 'transactions' | 'contracts',
      limit ? parseInt(limit as string) : 10
    );

    res.json(apiResponse(true, { trending }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/achievements/:entityId
 * Get achievements for an entity
 */
app.get('/api/v1/achievements/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { type, limit, sortBy, sortOrder } = req.query;

    const achievements = await leaderboardService.getAchievements(entityId, {
      type: type as 'milestone' | 'streak' | 'rank' | 'special',
      limit: limit ? parseInt(limit as string) : undefined,
      sortBy: sortBy as 'earnedAt' | 'points',
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    const totalPoints = await leaderboardService.getTotalAchievementPoints(entityId);

    res.json(apiResponse(true, { achievements, totalPoints }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================
// Integration Endpoints
// ============================================

/**
 * GET /api/v1/integration/trust/:entityId
 * Get trust score for entity
 */
app.get('/api/v1/integration/trust/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const trustScore = await integrationService.getTrustScore(entityId);
    res.json(apiResponse(true, { trustScore }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/integration/profile/:entityId
 * Get comprehensive entity profile
 */
app.get('/api/v1/integration/profile/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const profile = await integrationService.getEntityProfile(entityId);
    res.json(apiResponse(true, { profile }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * POST /api/v1/integration/payment/process
 * Process payment with trust and karma integration
 */
app.post('/api/v1/integration/payment/process', async (req, res) => {
  try {
    const { entityId, amount, currency, referenceId } = req.body;

    if (!entityId || !amount) {
      return res.status(400).json(apiResponse(false, undefined, 'Entity ID and amount are required'));
    }

    const result = await integrationService.processPaymentWithIntegration(entityId, amount, currency, referenceId);
    res.json(apiResponse(true, result));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * POST /api/v1/integration/validate
 * Validate transaction with trust and karma checks
 */
app.post('/api/v1/integration/validate', async (req, res) => {
  try {
    const { entityId, amount } = req.body;

    if (!entityId || !amount) {
      return res.status(400).json(apiResponse(false, undefined, 'Entity ID and amount are required'));
    }

    const result = await integrationService.validateTransaction(entityId, amount);
    res.json(apiResponse(true, result));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/integration/health
 * Health check for external services
 */
app.get('/api/v1/integration/health', async (_req, res) => {
  try {
    const health = await integrationService.healthCheck();
    res.json(apiResponse(true, { health }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/integration/dashboard/:entityId
 * Get dashboard summary
 */
app.get('/api/v1/integration/dashboard/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const summary = await integrationService.getDashboardSummary(entityId);
    res.json(apiResponse(true, { summary }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * POST /api/v1/integration/karma/award
 * Award karma with contract and trust integration
 */
app.post('/api/v1/integration/karma/award', async (req, res) => {
  try {
    const { contractId, entityId, action, reason } = req.body;

    if (!contractId || !entityId || !action) {
      return res.status(400).json(apiResponse(false, undefined, 'Contract ID, entity ID, and action are required'));
    }

    const result = await integrationService.awardContractKarma(contractId, entityId, action, reason || 'Contract milestone');
    res.json(apiResponse(true, result));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================
// Intent & Event Handlers
// ============================================

app.post('/api/v1/intent', async (req, res) => {
  try {
    const { type, payload } = req.body;
    console.log(`[INTENT] ${type}:`, payload);
    res.json(apiResponse(true, { intentId: uuidv4(), type, status: 'received' }));
  } catch (e) {
    res.status(400).json(apiResponse(false, undefined, String(e)));
  }
});

app.post('/api/v1/event', async (req, res) => {
  try {
    const { type, data } = req.body;
    console.log(`[EVENT] ${type}:`, data);
    res.json(apiResponse(true, { eventId: uuidv4(), type, status: 'processed' }));
  } catch (e) {
    res.status(400).json(apiResponse(false, undefined, String(e)));
  }
});

// ============================================
// Statistics Endpoints
// ============================================

/**
 * GET /api/v1/stats/karma
 * Get karma tier statistics
 */
app.get('/api/v1/stats/karma', async (_req, res) => {
  try {
    const stats = await karmaService.getTierStatistics();
    res.json(apiResponse(true, { statistics: stats }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/stats/transactions/:entityId
 * Get transaction statistics
 */
app.get('/api/v1/stats/transactions/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json(apiResponse(false, undefined, 'Start date and end date are required'));
    }

    const stats = await transactionService.getTransactionStatistics(
      entityId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json(apiResponse(true, { statistics: stats }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

/**
 * GET /api/v1/stats/earnings/:entityId
 * Get earnings statistics
 */
app.get('/api/v1/stats/earnings/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json(apiResponse(false, undefined, 'Start date and end date are required'));
    }

    const stats = await earningsService.getEarningsStatistics(
      entityId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json(apiResponse(true, { statistics: stats }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================
// Error Handling
// ============================================

app.use((_req, res) => {
  res.status(404).json(apiResponse(false, undefined, 'Not found'));
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json(apiResponse(false, undefined, err.message || 'Internal server error'));
});

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
  console.log(`SUTAR-ECONOMY-OS running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API info: http://localhost:${PORT}/api/v1/info`);
});

export default app;
