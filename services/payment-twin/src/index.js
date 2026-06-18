/**
 * RTMN Payment Twin Service
 * Manages payment transactions, refunds, chargebacks, and payouts
 *
 * Twin Types:
 * - Payment: Payment transaction
 * - Refund: Refund transaction
 * - Chargeback: Chargeback dispute
 * - Payout: Merchant payout
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

import {
  requireAuth,
  optionalAuth,
  preventPrototypePollution,
  sanitizeSearchInput,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  requestId,
  requestLogger,
  logger,
  defaultLimiter,
  authLimiter,
  strictLimiter
} from '@rtmn/twinos-shared';

const app = express();
const PORT = process.env.PORT || 4886;
const SERVICE_NAME = 'payment-twin';

// ============ MIDDLEWARE ============

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));
app.use(requestId);
app.use(requestLogger);

// ============ IN-MEMORY STORAGE ============

const payments = new Map();
const refunds = new Map();
const chargebacks = new Map();
const payouts = new Map();

// Idempotency tracking for operations
const idempotencyKeys = new Map();

// ============ TWIN STATUSES ============

const PAYMENT_STATUS = {
  PENDING: 'pending',
  AUTHORIZED: 'authorized',
  CAPTURED: 'captured',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

const REFUND_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REJECTED: 'rejected'
};

const CHARGEBACK_STATUS = {
  INITIATED: 'initiated',
  UNDER_REVIEW: 'under_review',
  RESOLVED: 'resolved',
  WON: 'won',
  LOST: 'lost'
};

const PAYOUT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

const PAYMENT_METHODS = ['card', 'bank_transfer', 'wallet', 'cash', 'crypto'];
const CARD_BRANDS = ['visa', 'mastercard', 'amex', 'discover', 'jcb'];

// ============ TWIN FACTORY ============

function createTwin(type, data) {
  const now = new Date().toISOString();
  return {
    id: `${type}-${uuidv4().slice(0, 8)}`,
    type,
    ...data,
    status: data.status || 'active',
    health: 'healthy',
    version: 1,
    createdAt: now,
    updatedAt: now,
    _metadata: {
      service: SERVICE_NAME,
      twinVersion: '1.0.0'
    }
  };
}

// ============ PSP INTEGRATION (MOCK) ============

const PSP_MOCK_RESPONSES = {
  authorize: async (amount, currency, paymentMethod) => {
    // Simulate PSP authorization
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      success: true,
      pspReference: `PSP-${uuidv4().slice(0, 12)}`,
      authCode: Math.random().toString(36).substring(2, 10).toUpperCase()
    };
  },
  capture: async (pspReference, amount) => {
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      success: true,
      pspReference,
      captureId: `CAP-${uuidv4().slice(0, 8)}`
    };
  },
  refund: async (pspReference, amount) => {
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      success: true,
      pspReference,
      refundId: `REF-${uuidv4().slice(0, 8)}`
    };
  },
  payout: async (amount, destination) => {
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      success: true,
      pspReference: `PO-${uuidv4().slice(0, 8)}`,
      estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    };
  }
};

// ============ FRAUD DETECTION (MOCK) ============

async function detectFraud(payment) {
  // Mock fraud detection - always returns safe for demo
  const riskScore = Math.random() * 0.3; // 0-30% risk
  const riskLevel = riskScore < 0.1 ? 'low' : riskScore < 0.2 ? 'medium' : 'high';

  return {
    isSafe: riskScore < 0.25,
    riskScore: Math.round(riskScore * 100),
    riskLevel,
    flags: riskScore > 0.15 ? ['velocity_check'] : [],
    recommendation: riskScore < 0.25 ? 'approve' : 'review'
  };
}

// ============ PAYMENT TWIN ENDPOINTS ============

/**
 * GET /api/twins/payments
 * List payments with pagination and filtering
 */
app.get('/api/twins/payments', requireAuth, defaultLimiter, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, customerId, search, startDate, endDate } = req.query;
  const businessId = req.user.businessId;

  let results = Array.from(payments.values())
    .filter(p => p.businessId === businessId);

  // Apply filters
  if (status) {
    results = results.filter(p => p.status === status);
  }
  if (customerId) {
    results = results.filter(p => p.customerId === customerId);
  }
  if (search) {
    const query = sanitizeSearchInput(search);
    results = results.filter(p =>
      p.id.includes(query) ||
      p.paymentReference?.includes(query) ||
      p.pspReference?.includes(query)
    );
  }
  if (startDate) {
    results = results.filter(p => new Date(p.createdAt) >= new Date(startDate));
  }
  if (endDate) {
    results = results.filter(p => new Date(p.createdAt) <= new Date(endDate));
  }

  // Sort by createdAt desc
  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Pagination
  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const start = (parseInt(page) - 1) * parseInt(limit);

  res.json({
    success: true,
    twins: results.slice(start, start + parseInt(limit)),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages
    }
  });
}));

/**
 * POST /api/twins/payments
 * Create new payment twin
 */
app.post('/api/twins/payments', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { idempotencyKey, customerId, orderId, amount, currency, paymentMethod, cardDetails, billingAddress, description } =
    preventPrototypePollution(req.body);

  // Idempotency check
  if (idempotencyKey) {
    const cached = idempotencyKeys.get(idempotencyKey);
    if (cached) {
      logger.info('Payment returned from idempotency cache', { idempotencyKey });
      return res.json({ success: true, twin: cached, idempotent: true });
    }
  }

  // Validation
  if (!customerId || !amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Customer ID and valid amount required' }
    });
  }

  if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_PAYMENT_METHOD', message: `Payment method must be one of: ${PAYMENT_METHODS.join(', ')}` }
    });
  }

  // Fraud detection
  const fraudCheck = await detectFraud({ amount, customerId, paymentMethod });

  if (!fraudCheck.isSafe) {
    logger.warn('Payment flagged for fraud review', { customerId, amount, fraudCheck });
    return res.status(403).json({
      success: false,
      error: { code: 'FRAUD_DETECTED', message: 'Payment flagged for review', fraudCheck }
    });
  }

  // PSP Authorization
  const pspAuth = await PSP_MOCK_RESPONSES.authorize(amount, currency || 'USD', paymentMethod);

  if (!pspAuth.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'PSP_ERROR', message: 'Payment authorization failed' }
    });
  }

  // Create payment twin
  const payment = createTwin('payment', {
    customerId,
    businessId: req.user.businessId,
    orderId,
    amount,
    currency: currency || 'USD',
    paymentMethod: paymentMethod || 'card',
    cardDetails: cardDetails ? {
      brand: cardDetails.brand || 'visa',
      last4: cardDetails.last4 || '4242',
      expMonth: cardDetails.expMonth,
      expYear: cardDetails.expYear
    } : null,
    billingAddress,
    description,
    status: PAYMENT_STATUS.AUTHORIZED,
    paymentReference: `PAY-${Date.now().toString(36).toUpperCase()}`,
    pspReference: pspAuth.pspReference,
    authCode: pspAuth.authCode,
    capturedAmount: 0,
    refundedAmount: 0,
    fraudCheck,
    metadata: {}
  });

  payments.set(payment.id, payment);

  // Cache idempotency result
  if (idempotencyKey) {
    idempotencyKeys.set(idempotencyKey, payment);
    setTimeout(() => idempotencyKeys.delete(idempotencyKey), 24 * 60 * 60 * 1000);
  }

  logger.info('Payment twin created', {
    twinId: payment.id,
    paymentReference: payment.paymentReference,
    amount,
    businessId: req.user.businessId
  });

  res.status(201).json({
    success: true,
    twin: payment
  });
}));

/**
 * GET /api/twins/payment/:id
 * Get payment twin by ID
 */
app.get('/api/twins/payment/:id', requireAuth, asyncHandler(async (req, res) => {
  const payment = payments.get(req.params.id);

  if (!payment) {
    return res.status(404).json({
      success: false,
      error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' }
    });
  }

  // Check business scope
  if (payment.businessId !== req.user.businessId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'Access denied' }
    });
  }

  // Get related twins
  const paymentRefunds = Array.from(refunds.values()).filter(r => r.paymentId === payment.id);

  res.json({
    success: true,
    twin: {
      ...payment,
      refunds: paymentRefunds
    }
  });
}));

/**
 * PUT /api/twins/payment/:id
 * Update payment twin
 */
app.put('/api/twins/payment/:id', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { idempotencyKey, description, metadata } = preventPrototypePollution(req.body);

  const payment = payments.get(req.params.id);

  if (!payment) {
    return res.status(404).json({
      success: false,
      error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' }
    });
  }

  // Check business scope
  if (payment.businessId !== req.user.businessId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'Access denied' }
    });
  }

  // Idempotency check
  if (idempotencyKey) {
    const cached = idempotencyKeys.get(idempotencyKey);
    if (cached) {
      return res.json({ success: true, twin: cached, idempotent: true });
    }
  }

  // Update allowed fields only
  if (description !== undefined) {
    payment.description = description;
  }
  if (metadata) {
    payment.metadata = { ...payment.metadata, ...metadata };
  }

  payment.updatedAt = new Date().toISOString();
  payment.version++;

  // Cache idempotency result
  if (idempotencyKey) {
    idempotencyKeys.set(idempotencyKey, payment);
    setTimeout(() => idempotencyKeys.delete(idempotencyKey), 24 * 60 * 60 * 1000);
  }

  res.json({
    success: true,
    twin: payment
  });
}));

/**
 * DELETE /api/twins/payment/:id
 * Cancel/delete payment twin
 */
app.delete('/api/twins/payment/:id', requireAuth, asyncHandler(async (req, res) => {
  const payment = payments.get(req.params.id);

  if (!payment) {
    return res.status(404).json({
      success: false,
      error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' }
    });
  }

  // Check business scope
  if (payment.businessId !== req.user.businessId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'Access denied' }
    });
  }

  // Can only cancel pending/authorized payments
  if (![PAYMENT_STATUS.PENDING, PAYMENT_STATUS.AUTHORIZED].includes(payment.status)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATE', message: 'Only pending or authorized payments can be cancelled' }
    });
  }

  payment.status = PAYMENT_STATUS.CANCELLED;
  payment.updatedAt = new Date().toISOString();
  payment.cancelledAt = new Date().toISOString();
  payment.cancelledBy = req.user.id;

  logger.info('Payment twin cancelled', { twinId: payment.id, businessId: req.user.businessId });

  res.json({
    success: true,
    twin: payment
  });
}));

/**
 * POST /api/twins/payment/:id/capture
 * Capture authorized payment
 */
app.post('/api/twins/payment/:id/capture', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { idempotencyKey, amount } = preventPrototypePollution(req.body);

  const payment = payments.get(req.params.id);

  if (!payment) {
    return res.status(404).json({
      success: false,
      error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' }
    });
  }

  // Check business scope
  if (payment.businessId !== req.user.businessId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'Access denied' }
    });
  }

  // Idempotency check
  if (idempotencyKey) {
    const cached = idempotencyKeys.get(idempotencyKey);
    if (cached) {
      return res.json({ success: true, twin: cached, idempotent: true });
    }
  }

  // Can only capture authorized payments
  if (payment.status !== PAYMENT_STATUS.AUTHORIZED) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATE', message: 'Only authorized payments can be captured' }
    });
  }

  const captureAmount = amount || payment.amount;

  if (captureAmount > payment.amount - payment.capturedAmount) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_AMOUNT', message: 'Capture amount exceeds remaining authorized amount' }
    });
  }

  // PSP Capture
  const pspCapture = await PSP_MOCK_RESPONSES.capture(payment.pspReference, captureAmount);

  if (!pspCapture.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'PSP_ERROR', message: 'Payment capture failed' }
    });
  }

  payment.capturedAmount += captureAmount;
  payment.captureId = pspCapture.captureId;
  payment.capturedAt = new Date().toISOString();
  payment.updatedAt = new Date().toISOString();
  payment.version++;

  if (payment.capturedAmount >= payment.amount) {
    payment.status = PAYMENT_STATUS.CAPTURED;
  }

  // Cache idempotency result
  if (idempotencyKey) {
    idempotencyKeys.set(idempotencyKey, payment);
    setTimeout(() => idempotencyKeys.delete(idempotencyKey), 24 * 60 * 60 * 1000);
  }

  logger.info('Payment captured', {
    twinId: payment.id,
    amount: captureAmount,
    totalCaptured: payment.capturedAmount
  });

  res.json({
    success: true,
    twin: payment
  });
}));

/**
 * POST /api/twins/payment/:id/cancel
 * Cancel authorized payment
 */
app.post('/api/twins/payment/:id/cancel', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { idempotencyKey, reason } = preventPrototypePollution(req.body);

  const payment = payments.get(req.params.id);

  if (!payment) {
    return res.status(404).json({
      success: false,
      error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' }
    });
  }

  // Check business scope
  if (payment.businessId !== req.user.businessId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'Access denied' }
    });
  }

  // Idempotency check
  if (idempotencyKey) {
    const cached = idempotencyKeys.get(idempotencyKey);
    if (cached) {
      return res.json({ success: true, twin: cached, idempotent: true });
    }
  }

  // Can only cancel pending/authorized/captured payments
  if (![PAYMENT_STATUS.PENDING, PAYMENT_STATUS.AUTHORIZED, PAYMENT_STATUS.CAPTURED].includes(payment.status)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATE', message: 'Payment cannot be cancelled in current state' }
    });
  }

  payment.status = PAYMENT_STATUS.CANCELLED;
  payment.cancelledAt = new Date().toISOString();
  payment.cancelledBy = req.user.id;
  payment.cancelReason = reason;
  payment.updatedAt = new Date().toISOString();
  payment.version++;

  // Cache idempotency result
  if (idempotencyKey) {
    idempotencyKeys.set(idempotencyKey, payment);
    setTimeout(() => idempotencyKeys.delete(idempotencyKey), 24 * 60 * 60 * 1000);
  }

  logger.info('Payment cancelled', { twinId: payment.id, reason });

  res.json({
    success: true,
    twin: payment
  });
}));

/**
 * POST /api/twins/payment/:id/refund
 * Create refund for payment
 */
app.post('/api/twins/payment/:id/refund', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { idempotencyKey, amount, reason, items } = preventPrototypePollution(req.body);

  const payment = payments.get(req.params.id);

  if (!payment) {
    return res.status(404).json({
      success: false,
      error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' }
    });
  }

  // Check business scope
  if (payment.businessId !== req.user.businessId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'Access denied' }
    });
  }

  // Idempotency check
  if (idempotencyKey) {
    const cached = idempotencyKeys.get(idempotencyKey);
    if (cached) {
      return res.json({ success: true, twin: cached, idempotent: true });
    }
  }

  // Can only refund captured/completed payments
  if (![PAYMENT_STATUS.CAPTURED, PAYMENT_STATUS.COMPLETED].includes(payment.status)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATE', message: 'Only captured or completed payments can be refunded' }
    });
  }

  const refundAmount = amount || payment.capturedAmount - payment.refundedAmount;

  if (refundAmount > payment.capturedAmount - payment.refundedAmount) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_AMOUNT', message: 'Refund amount exceeds available amount' }
    });
  }

  // PSP Refund
  const pspRefund = await PSP_MOCK_RESPONSES.refund(payment.pspReference, refundAmount);

  // Create refund twin
  const refund = createTwin('refund', {
    paymentId: payment.id,
    customerId: payment.customerId,
    businessId: req.user.businessId,
    orderId: payment.orderId,
    amount: refundAmount,
    currency: payment.currency,
    reason: reason || 'customer_request',
    items,
    status: REFUND_STATUS.COMPLETED,
    refundReference: `REF-${Date.now().toString(36).toUpperCase()}`,
    pspRefundId: pspRefund.refundId,
    processedBy: req.user.id,
    processedAt: new Date().toISOString()
  });

  refunds.set(refund.id, refund);

  // Update payment
  payment.refundedAmount += refundAmount;
  payment.updatedAt = new Date().toISOString();
  payment.version++;

  if (payment.refundedAmount >= payment.capturedAmount) {
    payment.status = PAYMENT_STATUS.COMPLETED;
  }

  // Cache idempotency result
  if (idempotencyKey) {
    idempotencyKeys.set(idempotencyKey, refund);
    setTimeout(() => idempotencyKeys.delete(idempotencyKey), 24 * 60 * 60 * 1000);
  }

  logger.info('Refund created', {
    refundId: refund.id,
    paymentId: payment.id,
    amount: refundAmount
  });

  res.status(201).json({
    success: true,
    twin: refund,
    payment: payment
  });
}));

// ============ CHARGEBACK ENDPOINTS ============

/**
 * GET /api/twins/chargebacks
 * List chargebacks with pagination and filtering
 */
app.get('/api/twins/chargebacks', requireAuth, defaultLimiter, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const businessId = req.user.businessId;

  let results = Array.from(chargebacks.values())
    .filter(c => c.businessId === businessId);

  if (status) {
    results = results.filter(c => c.status === status);
  }
  if (search) {
    const query = sanitizeSearchInput(search);
    results = results.filter(c =>
      c.id.includes(query) ||
      c.chargebackReference?.includes(query) ||
      c.paymentId?.includes(query)
    );
  }

  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const start = (parseInt(page) - 1) * parseInt(limit);

  res.json({
    success: true,
    twins: results.slice(start, start + parseInt(limit)),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages
    }
  });
}));

/**
 * POST /api/twins/chargeback
 * Create chargeback (typically from PSP webhook)
 */
app.post('/api/twins/chargeback', strictLimiter, asyncHandler(async (req, res) => {
  const { paymentId, amount, reason, evidenceDeadline } = preventPrototypePollution(req.body);

  const payment = payments.get(paymentId);

  if (!payment) {
    return res.status(404).json({
      success: false,
      error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' }
    });
  }

  const chargeback = createTwin('chargeback', {
    paymentId,
    customerId: payment.customerId,
    businessId: payment.businessId,
    orderId: payment.orderId,
    amount,
    currency: payment.currency,
    reason: reason || 'fraudulent',
    status: CHARGEBACK_STATUS.INITIATED,
    chargebackReference: `CB-${Date.now().toString(36).toUpperCase()}`,
    evidenceDeadline: evidenceDeadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    evidence: [],
    resolution: null
  });

  chargebacks.set(chargeback.id, chargeback);

  logger.info('Chargeback created', {
    chargebackId: chargeback.id,
    paymentId,
    amount
  });

  res.status(201).json({
    success: true,
    twin: chargeback
  });
}));

/**
 * PUT /api/twins/chargeback/:id/evidence
 * Submit evidence for chargeback
 */
app.put('/api/twins/chargeback/:id/evidence', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { evidence, notes } = preventPrototypePollution(req.body);

  const chargeback = chargebacks.get(req.params.id);

  if (!chargeback) {
    return res.status(404).json({
      success: false,
      error: { code: 'CHARGEBACK_NOT_FOUND', message: 'Chargeback not found' }
    });
  }

  if (chargeback.businessId !== req.user.businessId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'Access denied' }
    });
  }

  chargeback.evidence.push({
    submittedBy: req.user.id,
    submittedAt: new Date().toISOString(),
    evidence,
    notes
  });

  chargeback.updatedAt = new Date().toISOString();
  chargeback.version++;

  logger.info('Chargeback evidence submitted', {
    chargebackId: chargeback.id,
    evidenceCount: chargeback.evidence.length
  });

  res.json({
    success: true,
    twin: chargeback
  });
}));

/**
 * PUT /api/twins/chargeback/:id/resolve
 * Resolve chargeback (typically from PSP webhook)
 */
app.put('/api/twins/chargeback/:id/resolve', strictLimiter, asyncHandler(async (req, res) => {
  const { status, resolution } = preventPrototypePollution(req.body);

  const chargeback = chargebacks.get(req.params.id);

  if (!chargeback) {
    return res.status(404).json({
      success: false,
      error: { code: 'CHARGEBACK_NOT_FOUND', message: 'Chargeback not found' }
    });
  }

  if (!Object.values(CHARGEBACK_STATUS).includes(status)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: 'Invalid chargeback status' }
    });
  }

  chargeback.status = status;
  chargeback.resolution = resolution;
  chargeback.resolvedAt = new Date().toISOString();
  chargeback.updatedAt = new Date().toISOString();

  logger.info('Chargeback resolved', {
    chargebackId: chargeback.id,
    status,
    resolution
  });

  res.json({
    success: true,
    twin: chargeback
  });
}));

// ============ PAYOUT ENDPOINTS ============

/**
 * GET /api/twins/payouts
 * List payouts with pagination and filtering
 */
app.get('/api/twins/payouts', requireAuth, defaultLimiter, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const businessId = req.user.businessId;

  let results = Array.from(payouts.values())
    .filter(p => p.businessId === businessId);

  if (status) {
    results = results.filter(p => p.status === status);
  }
  if (search) {
    const query = sanitizeSearchInput(search);
    results = results.filter(p =>
      p.id.includes(query) ||
      p.payoutReference?.includes(query)
    );
  }

  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const start = (parseInt(page) - 1) * parseInt(limit);

  res.json({
    success: true,
    twins: results.slice(start, start + parseInt(limit)),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages
    }
  });
}));

/**
 * POST /api/twins/payout
 * Create merchant payout request
 */
app.post('/api/twins/payout', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { idempotencyKey, amount, currency, destination, description } = preventPrototypePollution(req.body);

  // Idempotency check
  if (idempotencyKey) {
    const cached = idempotencyKeys.get(idempotencyKey);
    if (cached) {
      return res.json({ success: true, twin: cached, idempotent: true });
    }
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Valid amount required' }
    });
  }

  // PSP Payout
  const pspPayout = await PSP_MOCK_RESPONSES.payout(amount, destination);

  const payout = createTwin('payout', {
    businessId: req.user.businessId,
    amount,
    currency: currency || 'USD',
    destination,
    description,
    status: PAYOUT_STATUS.PROCESSING,
    payoutReference: `PO-${Date.now().toString(36).toUpperCase()}`,
    pspReference: pspPayout.pspReference,
    estimatedArrival: pspPayout.estimatedArrival,
    initiatedBy: req.user.id,
    initiatedAt: new Date().toISOString()
  });

  payouts.set(payout.id, payout);

  // Cache idempotency result
  if (idempotencyKey) {
    idempotencyKeys.set(idempotencyKey, payout);
    setTimeout(() => idempotencyKeys.delete(idempotencyKey), 24 * 60 * 60 * 1000);
  }

  logger.info('Payout created', {
    payoutId: payout.id,
    amount,
    businessId: req.user.businessId
  });

  res.status(201).json({
    success: true,
    twin: payout
  });
}));

/**
 * PUT /api/twins/payout/:id/cancel
 * Cancel pending payout
 */
app.put('/api/twins/payout/:id/cancel', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { reason } = preventPrototypePollution(req.body);

  const payout = payouts.get(req.params.id);

  if (!payout) {
    return res.status(404).json({
      success: false,
      error: { code: 'PAYOUT_NOT_FOUND', message: 'Payout not found' }
    });
  }

  if (payout.businessId !== req.user.businessId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'Access denied' }
    });
  }

  if (payout.status !== PAYOUT_STATUS.PENDING && payout.status !== PAYOUT_STATUS.PROCESSING) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATE', message: 'Payout cannot be cancelled in current state' }
    });
  }

  payout.status = PAYOUT_STATUS.CANCELLED;
  payout.cancelledAt = new Date().toISOString();
  payout.cancelledBy = req.user.id;
  payout.cancelReason = reason;
  payout.updatedAt = new Date().toISOString();

  logger.info('Payout cancelled', { payoutId: payout.id });

  res.json({
    success: true,
    twin: payout
  });
}));

// ============ ANALYTICS ENDPOINTS ============

/**
 * GET /api/analytics/payments
 * Get payment analytics
 */
app.get('/api/analytics/payments', requireAuth, asyncHandler(async (req, res) => {
  const businessId = req.user.businessId;
  const { period = '30d' } = req.query;

  const allPayments = Array.from(payments.values())
    .filter(p => p.businessId === businessId);

  // Calculate period start
  const now = new Date();
  let periodStart;
  switch (period) {
    case '7d': periodStart = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
    case '30d': periodStart = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
    case '90d': periodStart = new Date(now - 90 * 24 * 60 * 60 * 1000); break;
    default: periodStart = new Date(0);
  }

  const periodPayments = allPayments.filter(p => new Date(p.createdAt) >= periodStart);
  const allRefunds = Array.from(refunds.values()).filter(r => r.businessId === businessId);
  const allChargebacks = Array.from(chargebacks.values()).filter(c => c.businessId === businessId);

  const analytics = {
    period,
    totalPayments: periodPayments.length,
    totalVolume: periodPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
    totalCaptured: periodPayments.reduce((sum, p) => sum + (p.capturedAmount || 0), 0),
    totalRefunded: periodPayments.reduce((sum, p) => sum + (p.refundedAmount || 0), 0),
    netVolume: periodPayments.reduce((sum, p) => sum + (p.capturedAmount || 0) - (p.refundedAmount || 0), 0),
    averagePaymentValue: periodPayments.length > 0
      ? periodPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / periodPayments.length
      : 0,
    byStatus: {},
    byPaymentMethod: {},
    byDay: {},
    fraudStats: {
      totalChecked: periodPayments.length,
      flagged: periodPayments.filter(p => p.fraudCheck?.riskLevel !== 'low').length,
      blocked: 0
    },
    chargebackStats: {
      total: allChargebacks.length,
      initiated: allChargebacks.filter(c => c.status === CHARGEBACK_STATUS.INITIATED).length,
      resolved: allChargebacks.filter(c => c.status === CHARGEBACK_STATUS.RESOLVED).length
    }
  };

  periodPayments.forEach(payment => {
    // By status
    analytics.byStatus[payment.status] = (analytics.byStatus[payment.status] || 0) + 1;

    // By payment method
    const method = payment.paymentMethod || 'unknown';
    if (!analytics.byPaymentMethod[method]) {
      analytics.byPaymentMethod[method] = { count: 0, volume: 0 };
    }
    analytics.byPaymentMethod[method].count++;
    analytics.byPaymentMethod[method].volume += payment.amount || 0;

    // By day
    const day = new Date(payment.createdAt).toISOString().slice(0, 10);
    if (!analytics.byDay[day]) {
      analytics.byDay[day] = { count: 0, volume: 0, captured: 0, refunded: 0 };
    }
    analytics.byDay[day].count++;
    analytics.byDay[day].volume += payment.amount || 0;
    analytics.byDay[day].captured += payment.capturedAmount || 0;
    analytics.byDay[day].refunded += payment.refundedAmount || 0;
  });

  res.json({
    success: true,
    analytics
  });
}));

// ============ HEALTH ENDPOINTS ============

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      payments: payments.size,
      refunds: refunds.size,
      chargebacks: chargebacks.size,
      payouts: payouts.size
    }
  });
});

app.get('/ready', (req, res) => {
  res.json({
    status: 'ready',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString()
  });
});

// ============ ERROR HANDLING ============

app.use(notFoundHandler);
app.use(errorHandler);

// ============ START SERVER ============

app.listen(PORT, () => {
  logger.info(`Payment Twin Service running on port ${PORT}`);
  logger.info(`   Managing ${payments.size} payments`);
});

export default app;
