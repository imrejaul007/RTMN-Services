import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { BillingCycle } from '../models/BillingCycle';
import { Subscription } from '../models/Subscription';
import { logger } from '../services/logger';

const router = Router();

// Validation schemas
const createBillingCycleSchema = z.object({
  tenantId: z.string().min(1),
  subscriptionId: z.string().min(1),
  customerId: z.string().min(1),
  planId: z.string().optional(),
  amount: z.number().min(0),
  currency: z.string().default('USD'),
  paymentMethod: z.enum(['card', 'bank', 'wallet', 'other']).optional(),
  paymentMethodId: z.string().optional(),
  dueDate: z.string().datetime(),
  billingPeriod: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  invoiceNumber: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

const updateBillingCycleSchema = z.object({
  status: z.enum(['pending', 'completed', 'failed', 'refunded', 'cancelled']).optional(),
  paymentMethod: z.enum(['card', 'bank', 'wallet', 'other']).optional(),
  transactionId: z.string().optional(),
  failureReason: z.string().optional()
});

// Generate invoice number
const generateInvoiceNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${year}${month}-${random}`;
};

// Create billing cycle
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createBillingCycleSchema.parse(req.body);

    // Verify subscription exists
    const subscription = await Subscription.findOne({
      $or: [
        { subscriptionId: data.subscriptionId },
        { _id: data.subscriptionId }
      ]
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const billingCycle = new BillingCycle({
      billingId: `BILL-${uuidv4().substring(0, 8).toUpperCase()}`,
      tenantId: data.tenantId,
      subscriptionId: subscription.subscriptionId,
      customerId: data.customerId,
      planId: data.planId,
      amount: data.amount || subscription.plan.price,
      currency: data.currency,
      status: 'pending',
      paymentMethod: data.paymentMethod || subscription.billing.paymentMethod,
      paymentMethodId: data.paymentMethodId || subscription.billing.paymentMethodId,
      dueDate: new Date(data.dueDate),
      billingPeriod: {
        start: new Date(data.billingPeriod.start),
        end: new Date(data.billingPeriod.end)
      },
      invoiceNumber: data.invoiceNumber || generateInvoiceNumber(),
      metadata: data.metadata
    });

    await billingCycle.save();
    logger.info('Billing cycle created', { billingId: billingCycle.billingId });
    res.status(201).json(billingCycle);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Failed to create billing cycle', { error });
    res.status(500).json({ error: 'Failed to create billing cycle' });
  }
});

// Get all billing cycles with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tenantId, subscriptionId, customerId, status, startDate, endDate, limit = 50, offset = 0 } = req.query;

    const filter: Record<string, unknown> = {};
    if (tenantId) filter.tenantId = tenantId;
    if (subscriptionId) filter.subscriptionId = subscriptionId;
    if (customerId) filter.customerId = customerId;
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter['billingPeriod.start'] = {};
      if (startDate) (filter['billingPeriod.start'] as Record<string, Date>).$gte = new Date(startDate as string);
      if (endDate) (filter['billingPeriod.start'] as Record<string, Date>).$lte = new Date(endDate as string);
    }

    const billingCycles = await BillingCycle.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit));

    const total = await BillingCycle.countDocuments(filter);

    res.json({
      data: billingCycles,
      pagination: { total, limit: Number(limit), offset: Number(offset) }
    });
  } catch (error) {
    logger.error('Failed to fetch billing cycles', { error });
    res.status(500).json({ error: 'Failed to fetch billing cycles' });
  }
});

// Get billing cycle by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const billingCycle = await BillingCycle.findOne({
      $or: [
        { billingId: req.params.id },
        { _id: req.params.id }
      ]
    });

    if (!billingCycle) {
      return res.status(404).json({ error: 'Billing cycle not found' });
    }

    res.json(billingCycle);
  } catch (error) {
    logger.error('Failed to fetch billing cycle', { error });
    res.status(500).json({ error: 'Failed to fetch billing cycle' });
  }
});

// Update billing cycle
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = updateBillingCycleSchema.parse(req.body);
    const billingCycle = await BillingCycle.findOne({
      $or: [
        { billingId: req.params.id },
        { _id: req.params.id }
      ]
    });

    if (!billingCycle) {
      return res.status(404).json({ error: 'Billing cycle not found' });
    }

    Object.assign(billingCycle, data);
    await billingCycle.save();
    logger.info('Billing cycle updated', { billingId: billingCycle.billingId });
    res.json(billingCycle);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Failed to update billing cycle', { error });
    res.status(500).json({ error: 'Failed to update billing cycle' });
  }
});

// Mark billing as paid
router.post('/:id/pay', async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.body;
    const billingCycle = await BillingCycle.findOne({
      $or: [
        { billingId: req.params.id },
        { _id: req.params.id }
      ]
    });

    if (!billingCycle) {
      return res.status(404).json({ error: 'Billing cycle not found' });
    }

    await billingCycle.markPaid(transactionId);

    // Update subscription's last billing date
    const subscription = await Subscription.findOne({ subscriptionId: billingCycle.subscriptionId });
    if (subscription) {
      subscription.billing.lastBilling = new Date();
      await subscription.save();
    }

    logger.info('Billing marked as paid', { billingId: billingCycle.billingId });
    res.json({ message: 'Billing marked as paid', billingCycle });
  } catch (error) {
    logger.error('Failed to mark billing as paid', { error });
    res.status(500).json({ error: 'Failed to mark billing as paid' });
  }
});

// Mark billing as failed
router.post('/:id/fail', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const billingCycle = await BillingCycle.findOne({
      $or: [
        { billingId: req.params.id },
        { _id: req.params.id }
      ]
    });

    if (!billingCycle) {
      return res.status(404).json({ error: 'Billing cycle not found' });
    }

    await billingCycle.markFailed(reason || 'Payment failed');
    logger.info('Billing marked as failed', { billingId: billingCycle.billingId, reason });
    res.json({ message: 'Billing marked as failed', billingCycle });
  } catch (error) {
    logger.error('Failed to mark billing as failed', { error });
    res.status(500).json({ error: 'Failed to mark billing as failed' });
  }
});

// Refund billing
router.post('/:id/refund', async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    const billingCycle = await BillingCycle.findOne({
      $or: [
        { billingId: req.params.id },
        { _id: req.params.id }
      ]
    });

    if (!billingCycle) {
      return res.status(404).json({ error: 'Billing cycle not found' });
    }

    if (billingCycle.status !== 'completed') {
      return res.status(400).json({ error: 'Can only refund completed billing cycles' });
    }

    await billingCycle.refund(amount);
    logger.info('Billing refunded', { billingId: billingCycle.billingId, amount });
    res.json({ message: 'Billing refunded', billingCycle });
  } catch (error) {
    logger.error('Failed to refund billing', { error });
    res.status(500).json({ error: 'Failed to refund billing' });
  }
});

// Get billing history for subscription
router.get('/subscription/:subscriptionId', async (req: Request, res: Response) => {
  try {
    const billingCycles = await BillingCycle.findBySubscription(req.params.subscriptionId);
    res.json({ data: billingCycles });
  } catch (error) {
    logger.error('Failed to fetch subscription billing history', { error });
    res.status(500).json({ error: 'Failed to fetch billing history' });
  }
});

// Get billing history for customer
router.get('/customer/:customerId', async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    const billingCycles = await BillingCycle.findByCustomer(req.params.customerId, Number(limit));
    res.json({ data: billingCycles });
  } catch (error) {
    logger.error('Failed to fetch customer billing history', { error });
    res.status(500).json({ error: 'Failed to fetch billing history' });
  }
});

// Get pending due billings
router.get('/pending/due', async (req: Request, res: Response) => {
  try {
    const { days = 0 } = req.query;
    const billingCycles = await BillingCycle.findPendingDue(Number(days));
    res.json({ data: billingCycles });
  } catch (error) {
    logger.error('Failed to fetch pending due billings', { error });
    res.status(500).json({ error: 'Failed to fetch pending billings' });
  }
});

export default router;
