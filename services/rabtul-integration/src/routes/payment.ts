import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { RABTULPaymentProfile, PaymentIntent, createRABTULPaymentProfile } from '../models/RABTULProfile';

const router = Router();

// In-memory store for demo
const paymentProfiles = new Map<string, RABTULPaymentProfile>();
const paymentIntents = new Map<string, PaymentIntent>();

// RABTUL Payment Service URL
const RABTUL_PAYMENT_URL = process.env.RABTUL_PAYMENT_URL || 'http://localhost:4003';

/**
 * POST /api/payment/profile
 * Create or update payment profile
 */
router.post('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { corpid, paymentMethods, transactionLimits, riskLevel } = req.body;

    if (!corpid) {
      return res.status(400).json({ error: 'corpid is required' });
    }

    // Check if profile exists
    let profile = Array.from(paymentProfiles.values()).find(p => p.corpid === corpid);

    if (profile) {
      // Update existing profile
      profile = {
        ...profile,
        paymentMethods: paymentMethods || profile.paymentMethods,
        transactionLimits: transactionLimits || profile.transactionLimits,
        riskLevel: riskLevel || profile.riskLevel,
        updatedAt: new Date()
      };
    } else {
      // Create new profile
      profile = createRABTULPaymentProfile({
        corpid,
        paymentMethods,
        transactionLimits,
        riskLevel,
        fraudScore: 0
      });
    }

    paymentProfiles.set(profile.id, profile);

    // Sync to Payment Twin
    try {
      await axios.post(`${process.env.PAYMENT_TWIN_URL || 'http://localhost:3018'}/api/profile`, {
        id: profile.id,
        corpid: profile.corpid,
        riskLevel: profile.riskLevel,
        fraudScore: profile.fraudScore,
        paymentMethods: profile.paymentMethods.map(pm => pm.type),
        source: 'rabtul-payment'
      }, {
        headers: { 'X-Request-ID': req.headers['x-request-id'] }
      });
    } catch (err) {
      req.app.locals.logger?.warn('Failed to sync payment profile to Payment Twin', { error: err });
    }

    res.status(201).json({
      success: true,
      data: profile,
      message: profile ? 'Payment profile updated' : 'Payment profile created'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payment/profile/:corpid
 * Get payment profile by corpid
 */
router.get('/profile/:corpid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { corpid } = req.params;

    const profile = Array.from(paymentProfiles.values()).find(p => p.corpid === corpid);

    if (!profile) {
      return res.status(404).json({ error: 'Payment profile not found' });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payment/method
 * Add payment method
 */
router.post('/method', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { corpid, type, provider, last4, expiryMonth, expiryYear, isDefault } = req.body;

    if (!corpid || !type) {
      return res.status(400).json({ error: 'corpid and type are required' });
    }

    const profile = Array.from(paymentProfiles.values()).find(p => p.corpid === corpid);

    if (!profile) {
      return res.status(404).json({ error: 'Payment profile not found' });
    }

    const paymentMethod = {
      id: uuidv4(),
      type: type as 'card' | 'bank' | 'wallet' | 'upi',
      provider,
      last4,
      expiryMonth,
      expiryYear,
      isDefault: isDefault || false,
      status: 'active' as const
    };

    // If this is default, unset other defaults
    if (isDefault) {
      profile.paymentMethods.forEach(pm => pm.isDefault = false);
    }

    profile.paymentMethods.push(paymentMethod);
    profile.updatedAt = new Date();

    if (!profile.defaultMethod || isDefault) {
      profile.defaultMethod = paymentMethod.id;
    }

    paymentProfiles.set(profile.id, profile);

    res.status(201).json({
      success: true,
      data: {
        profile,
        paymentMethod
      },
      message: 'Payment method added'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/payment/method/:profileId/:methodId
 * Remove payment method
 */
router.delete('/method/:profileId/:methodId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profileId, methodId } = req.params;

    const profile = paymentProfiles.get(profileId);

    if (!profile) {
      return res.status(404).json({ error: 'Payment profile not found' });
    }

    const methodIndex = profile.paymentMethods.findIndex(pm => pm.id === methodId);

    if (methodIndex === -1) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    const removedMethod = profile.paymentMethods.splice(methodIndex, 1)[0];

    // If removed method was default, assign new default
    if (profile.defaultMethod === methodId && profile.paymentMethods.length > 0) {
      profile.defaultMethod = profile.paymentMethods[0].id;
      profile.paymentMethods[0].isDefault = true;
    }

    profile.updatedAt = new Date();
    paymentProfiles.set(profileId, profile);

    res.json({
      success: true,
      data: {
        profile,
        removedMethod
      },
      message: 'Payment method removed'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payment/intent
 * Create payment intent
 */
router.post('/intent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { corpid, amount, currency, paymentMethodId, metadata } = req.body;

    if (!corpid || !amount) {
      return res.status(400).json({ error: 'corpid and amount are required' });
    }

    const profile = Array.from(paymentProfiles.values()).find(p => p.corpid === corpid);

    if (!profile) {
      return res.status(404).json({ error: 'Payment profile not found' });
    }

    // Check transaction limits
    if (amount > profile.transactionLimits.perTransaction) {
      return res.status(400).json({
        error: 'Amount exceeds per-transaction limit',
        limit: profile.transactionLimits.perTransaction
      });
    }

    const intent: PaymentIntent = {
      id: `pi_${uuidv4()}`,
      corpid,
      amount,
      currency: currency || 'INR',
      status: 'created',
      paymentMethodId,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    paymentIntents.set(intent.id, intent);

    res.status(201).json({
      success: true,
      data: intent
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payment/intent/:id
 * Get payment intent
 */
router.get('/intent/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const intent = paymentIntents.get(id);

    if (!intent) {
      return res.status(404).json({ error: 'Payment intent not found' });
    }

    res.json({
      success: true,
      data: intent
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payment/intent/:id/confirm
 * Confirm payment intent
 */
router.post('/intent/:id/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { paymentMethodId } = req.body;

    const intent = paymentIntents.get(id);

    if (!intent) {
      return res.status(404).json({ error: 'Payment intent not found' });
    }

    if (intent.status !== 'created') {
      return res.status(400).json({ error: `Cannot confirm intent with status: ${intent.status}` });
    }

    // Update intent status
    intent.status = 'processing';
    intent.paymentMethodId = paymentMethodId || intent.paymentMethodId;
    intent.updatedAt = new Date();

    paymentIntents.set(id, intent);

    // In production, this would call the actual payment gateway
    // For demo, we'll auto-complete after a short delay
    setTimeout(() => {
      intent.status = 'succeeded';
      intent.updatedAt = new Date();
      paymentIntents.set(id, intent);

      // Sync to Payment Twin
      try {
        axios.post(`${process.env.PAYMENT_TWIN_URL || 'http://localhost:3018'}/api/payment`, {
          intentId: intent.id,
          corpid: intent.corpid,
          amount: intent.amount,
          currency: intent.currency,
          status: 'completed',
          source: 'rabtul-payment'
        }).catch(() => {});
      } catch {}
    }, 1000);

    res.json({
      success: true,
      data: intent,
      message: 'Payment processing'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payment/intent/:id/cancel
 * Cancel payment intent
 */
router.post('/intent/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const intent = paymentIntents.get(id);

    if (!intent) {
      return res.status(404).json({ error: 'Payment intent not found' });
    }

    if (intent.status === 'succeeded') {
      return res.status(400).json({ error: 'Cannot cancel completed payment' });
    }

    intent.status = 'cancelled';
    intent.updatedAt = new Date();

    paymentIntents.set(id, intent);

    res.json({
      success: true,
      data: intent,
      message: 'Payment cancelled'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payment/verify
 * Verify payment method
 */
router.get('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentMethodId, amount } = req.query;

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'paymentMethodId is required' });
    }

    // In production, this would verify with the payment gateway
    const verification = {
      valid: true,
      paymentMethodId,
      amount: amount || 0,
      riskCheck: {
        score: 10,
        flags: []
      },
      verifiedAt: new Date()
    };

    res.json({
      success: true,
      data: verification
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payment/refund
 * Process refund
 */
router.post('/refund', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentIntentId, amount, reason } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'paymentIntentId is required' });
    }

    const intent = paymentIntents.get(paymentIntentId);

    if (!intent) {
      return res.status(404).json({ error: 'Payment intent not found' });
    }

    if (intent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Can only refund completed payments' });
    }

    const refundAmount = amount || intent.amount;
    const refundId = `re_${uuidv4()}`;

    const refund = {
      id: refundId,
      paymentIntentId,
      amount: refundAmount,
      currency: intent.currency,
      status: 'completed',
      reason,
      createdAt: new Date()
    };

    // Sync to Payment Twin
    try {
      await axios.post(`${process.env.PAYMENT_TWIN_URL || 'http://localhost:3018'}/api/refund`, {
        refundId,
        originalIntentId: paymentIntentId,
        corpid: intent.corpid,
        amount: refundAmount,
        currency: intent.currency,
        source: 'rabtul-payment'
      }, {
        headers: { 'X-Request-ID': req.headers['x-request-id'] }
      });
    } catch (err) {
      req.app.locals.logger?.warn('Failed to sync refund to Payment Twin', { error: err });
    }

    res.status(201).json({
      success: true,
      data: refund,
      message: 'Refund processed'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
