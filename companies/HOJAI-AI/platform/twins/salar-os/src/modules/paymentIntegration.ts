import { createLogger } from '@rtmn/shared/lib/logger';
const logger = createLogger('paymentIntegration');
/**
 * Salar OS - Payment Integration Service
 *
 * Connects to Stripe and Razorpay for marketplace payments
 */

import { Router, Request, Response } from 'express';
import mongoose, { Schema, model } from 'mongoose';
import { randomBytes } from 'crypto';

const router = Router();

// ============================================================================
// CONFIG
// ============================================================================

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const RAZORPAY_KEY = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const PAYMENT_WEBHOOK_URL = process.env.PAYMENT_WEBHOOK_URL || 'http://localhost:4710/payments/webhook';

// ============================================================================
// MONGODB SCHEMAS
// ============================================================================

const paymentSchema = new Schema({
  paymentId: { type: String, required: true, unique: true, index: true },
  orderId: String,

  // Customer
  customerId: String,
  customerEmail: String,

  // Amount
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },

  // Product
  productType: { type: String, enum: ['AGENT', 'SUBSCRIPTION', 'USAGE', 'MARKETPLACE'] },
  productId: String,

  // Status
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    default: 'PENDING',
  },

  // Provider
  provider: { type: String, enum: ['stripe', 'razorpay'] },

  // Metadata
  metadata: mongoose.Schema.Types.Mixed,

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  completedAt: Date,
  failedAt: Date,
});

const Payment = model('Payment', paymentSchema);

const subscriptionSchema = new Schema({
  subscriptionId: { type: String, required: true, unique: true, index: true },
  customerId: String,
  customerEmail: String,

  // Plan
  planType: { type: String, enum: ['BASIC', 'PRO', 'ENTERPRISE'] },
  priceId: String,

  // Billing
  amount: Number,
  currency: String,
  billingCycle: { type: String, enum: ['MONTHLY', 'YEARLY'] },

  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'CANCELLED', 'PAST_DUE', 'TRIAL'],
    default: 'TRIAL',
  },

  // Dates
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  trialEnd: Date,
  cancelledAt: Date,

  // Usage
  usageLimits: {
    agents: Number,
    apiCalls: Number,
    storage: Number,
  },
  usage: {
    agents: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 },
    storage: { type: Number, default: 0 },
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

subscriptionSchema.index({ customerId: 1, status: 1 });

const Subscription = model('Subscription', subscriptionSchema);

// ============================================================================
// HELPERS
// ============================================================================

function generateId(prefix: string = 'PAY'): string {
  return `${prefix}-${randomBytes(6).toString('hex').toUpperCase()}`;
}

// ============================================================================
// STRIPE ROUTES
// ============================================================================

/**
 * Create Stripe payment intent
 * POST /payments/stripe/intent
 */
router.post('/stripe/intent', async (req: Request, res: Response) => {
  try {
    const { amount, currency = 'inr', customerEmail, productType, productId, metadata } = req.body;

    if (!amount || !customerEmail) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'amount and customerEmail required' },
      });
    }

    if (!STRIPE_SECRET) {
      return res.status(503).json({
        success: false,
        error: { code: 'NOT_CONFIGURED', message: 'Stripe not configured' },
      });
    }

    // Create payment intent with Stripe
    const paymentIntent = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: String(amount * 100), // Stripe uses paisa
        currency,
        'metadata[productType]': productType || 'MARKETPLACE',
        'metadata[productId]': productId || '',
      }).toString(),
    });

    if (!paymentIntent.ok) {
      const error = await paymentIntent.text();
      throw new Error(`Stripe error: ${error}`);
    }

    const intentData = await paymentIntent.json();

    // Create payment record
    const payment = new Payment({
      paymentId: intentData.id,
      customerEmail,
      amount,
      currency,
      productType,
      productId,
      provider: 'stripe',
      status: 'PENDING',
      metadata,
    });
    await payment.save();

    res.json({
      success: true,
      data: {
        paymentId: intentData.id,
        clientSecret: intentData.client_secret,
        amount,
        currency,
      },
    });
  } catch (error: any) {
    logger.error('Stripe payment error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'PAYMENT_ERROR', message: error.message },
    });
  }
});

/**
 * Create Stripe checkout session
 * POST /payments/stripe/checkout
 */
router.post('/stripe/checkout', async (req: Request, res: Response) => {
  try {
    const { amount, currency = 'inr', customerEmail, productName, productId, successUrl, cancelUrl } = req.body;

    if (!STRIPE_SECRET) {
      return res.status(503).json({
        success: false,
        error: { code: 'NOT_CONFIGURED', message: 'Stripe not configured' },
      });
    }

    const session = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[0]': 'card',
        'line_items[0][price_data][currency]': currency,
        'line_items[0][price_data][product_data][name]': productName || 'Product',
        'line_items[0][price_data][unit_amount]': String(amount * 100),
        'mode': 'payment',
        'success_url': successUrl || `${PAYMENT_WEBHOOK_URL}/success`,
        'cancel_url': cancelUrl || `${PAYMENT_WEBHOOK_URL}/cancel`,
        'customer_email': customerEmail,
      }).toString(),
    });

    const sessionData = await session.json();

    res.json({
      success: true,
      data: {
        sessionId: sessionData.id,
        url: sessionData.url,
      },
    });
  } catch (error: any) {
    logger.error('Stripe checkout error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CHECKOUT_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// RAZORPAY ROUTES
// ============================================================================

/**
 * Create Razorpay order
 * POST /payments/razorpay/order
 */
router.post('/razorpay/order', async (req: Request, res: Response) => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'amount required' },
      });
    }

    if (!RAZORPAY_KEY || !RAZORPAY_SECRET) {
      return res.status(503).json({
        success: false,
        error: { code: 'NOT_CONFIGURED', message: 'Razorpay not configured' },
      });
    }

    const order = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${RAZORPAY_KEY}:${RAZORPAY_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount * 100, // Razorpay uses paise
        currency,
        receipt: receipt || generateId('RCP'),
        notes: notes || {},
      }),
    });

    const orderData = await order.json();

    if (orderData.error) {
      throw new Error(orderData.error.description);
    }

    // Create payment record
    const payment = new Payment({
      paymentId: orderData.id,
      orderId: orderData.id,
      amount,
      currency,
      provider: 'razorpay',
      status: 'PENDING',
      metadata: notes,
    });
    await payment.save();

    res.json({
      success: true,
      data: {
        orderId: orderData.id,
        amount: orderData.amount / 100,
        currency: orderData.currency,
      },
    });
  } catch (error: any) {
    logger.error('Razorpay order error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'ORDER_ERROR', message: error.message },
    });
  }
});

/**
 * Verify Razorpay payment
 * POST /payments/razorpay/verify
 */
router.post('/razorpay/verify', async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing payment details' },
      });
    }

    // Verify signature
    const crypto = await import('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      // Update payment as failed
      await Payment.updateOne(
        { paymentId: razorpay_order_id },
        { $set: { status: 'FAILED', failedAt: new Date() } }
      );

      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'Payment verification failed' },
      });
    }

    // Update payment as completed
    await Payment.updateOne(
      { paymentId: razorpay_order_id },
      {
        $set: {
          status: 'COMPLETED',
          completedAt: new Date(),
          'metadata.paymentId': razorpay_payment_id,
        },
      }
    );

    res.json({
      success: true,
      data: {
        verified: true,
        paymentId: razorpay_payment_id,
      },
    });
  } catch (error: any) {
    logger.error('Razorpay verify error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'VERIFY_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Create subscription
 * POST /payments/subscriptions
 */
router.post('/subscriptions', async (req: Request, res: Response) => {
  try {
    const { customerId, customerEmail, planType, billingCycle = 'MONTHLY', usageLimits } = req.body;

    if (!customerId || !customerEmail || !planType) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' },
      });
    }

    // Calculate dates
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === 'YEARLY' ? 12 : 1));

    // Trial period
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 14);

    const subscription = new Subscription({
      subscriptionId: generateId('SUB'),
      customerId,
      customerEmail,
      planType: planType.toUpperCase(),
      billingCycle: billingCycle.toUpperCase(),
      amount: getPlanPrice(planType),
      currency: 'INR',
      status: 'TRIAL',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEnd,
      usageLimits: usageLimits || getPlanUsageLimits(planType),
      usage: {
        agents: 0,
        apiCalls: 0,
        storage: 0,
      },
    });

    await subscription.save();

    res.status(201).json({
      success: true,
      data: {
        subscriptionId: subscription.subscriptionId,
        status: subscription.status,
        trialEnd: subscription.trialEnd,
        planType: subscription.planType,
      },
    });
  } catch (error: any) {
    logger.error('Subscription error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SUBSCRIPTION_ERROR', message: error.message },
    });
  }
});

/**
 * Get subscription
 * GET /payments/subscriptions/:id
 */
router.get('/subscriptions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findOne({ subscriptionId: id }).lean();

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription not found' },
      });
    }

    res.json({
      success: true,
      data: subscription,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Update subscription usage
 * POST /payments/subscriptions/:id/usage
 */
router.post('/subscriptions/:id/usage', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { agents, apiCalls, storage } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (agents !== undefined) updates['usage.agents'] = agents;
    if (apiCalls !== undefined) updates['usage.apiCalls'] = apiCalls;
    if (storage !== undefined) updates['usage.storage'] = storage;

    const subscription = await Subscription.findOneAndUpdate(
      { subscriptionId: id },
      { $set: updates },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription not found' },
      });
    }

    // Check if usage exceeds limits
    const overLimits = [];
    if (subscription.usage.agents > (subscription.usageLimits?.agents || 0)) {
      overLimits.push('agents');
    }
    if (subscription.usage.apiCalls > (subscription.usageLimits?.apiCalls || 0)) {
      overLimits.push('apiCalls');
    }

    res.json({
      success: true,
      data: {
        subscriptionId: subscription.subscriptionId,
        usage: subscription.usage,
        limits: subscription.usageLimits,
        overLimits,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Cancel subscription
 * POST /payments/subscriptions/:id/cancel
 */
router.post('/subscriptions/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findOneAndUpdate(
      { subscriptionId: id },
      {
        $set: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription not found' },
      });
    }

    res.json({
      success: true,
      data: {
        subscriptionId: subscription.subscriptionId,
        status: 'CANCELLED',
        cancelledAt: subscription.cancelledAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// HELPERS
// ============================================================================

function getPlanPrice(planType: string): number {
  const prices: Record<string, number> = {
    BASIC: 999,
    PRO: 4999,
    ENTERPRISE: 19999,
  };
  return prices[planType.toUpperCase()] || 999;
}

function getPlanUsageLimits(planType: string): { agents: number; apiCalls: number; storage: number } {
  const limits: Record<string, any> = {
    BASIC: { agents: 5, apiCalls: 10000, storage: 10 },
    PRO: { agents: 25, apiCalls: 100000, storage: 100 },
    ENTERPRISE: { agents: 100, apiCalls: 1000000, storage: 1000 },
  };
  return limits[planType.toUpperCase()] || limits.BASIC;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { router as paymentRouter, Payment, Subscription };
export default router;
