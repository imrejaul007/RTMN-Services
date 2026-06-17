import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Subscription } from '../models/Subscription';
import { logger } from '../services/logger';

const router = Router();

// Validation schemas
const createSubscriptionSchema = z.object({
  tenantId: z.string().min(1),
  customerId: z.string().min(1),
  plan: z.object({
    name: z.string().min(1),
    price: z.number().positive(),
    interval: z.enum(['day', 'week', 'month', 'year']),
    features: z.array(z.string()).optional(),
    trialDays: z.number().int().min(0).optional()
  }),
  billing: z.object({
    nextBilling: z.string().datetime().optional(),
    paymentMethod: z.enum(['card', 'bank', 'wallet', 'other']).optional(),
    paymentMethodId: z.string().optional(),
    autoRenew: z.boolean().optional()
  }).optional(),
  usage: z.object({
    current: z.number().min(0).optional(),
    limit: z.number().positive().optional(),
    unit: z.string().optional()
  }).optional(),
  startDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional()
});

const updateSubscriptionSchema = z.object({
  plan: z.object({
    name: z.string().min(1).optional(),
    price: z.number().positive().optional(),
    interval: z.enum(['day', 'week', 'month', 'year']).optional(),
    features: z.array(z.string()).optional()
  }).optional(),
  status: z.enum(['active', 'paused', 'cancelled', 'expired', 'trial']).optional(),
  billing: z.object({
    nextBilling: z.string().datetime().optional(),
    paymentMethod: z.enum(['card', 'bank', 'wallet', 'other']).optional(),
    autoRenew: z.boolean().optional()
  }).optional(),
  usage: z.object({
    current: z.number().min(0).optional(),
    limit: z.number().positive().optional()
  }).optional()
});

// Calculate next billing date
const calculateNextBilling = (interval: string, startDate: Date): Date => {
  const nextBilling = new Date(startDate);
  switch (interval) {
    case 'day': nextBilling.setDate(nextBilling.getDate() + 1); break;
    case 'week': nextBilling.setDate(nextBilling.getDate() + 7); break;
    case 'month': nextBilling.setMonth(nextBilling.getMonth() + 1); break;
    case 'year': nextBilling.setFullYear(nextBilling.getFullYear() + 1); break;
  }
  return nextBilling;
};

// Create subscription
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createSubscriptionSchema.parse(req.body);
    const startDate = data.startDate ? new Date(data.startDate) : new Date();
    const status = data.plan.trialDays && data.plan.trialDays > 0 ? 'trial' : 'active';
    const trialEnd = data.plan.trialDays ? new Date(startDate.getTime() + data.plan.trialDays * 24 * 60 * 60 * 1000) : undefined;

    const subscription = new Subscription({
      subscriptionId: `SUB-${uuidv4().substring(0, 8).toUpperCase()}`,
      tenantId: data.tenantId,
      customerId: data.customerId,
      plan: data.plan,
      status,
      billing: {
        nextBilling: data.billing?.nextBilling
          ? new Date(data.billing.nextBilling)
          : calculateNextBilling(data.plan.interval, startDate),
        paymentMethod: data.billing?.paymentMethod,
        paymentMethodId: data.billing?.paymentMethodId,
        autoRenew: data.billing?.autoRenew ?? true
      },
      usage: data.usage,
      startDate,
      trialEnd,
      metadata: data.metadata
    });

    await subscription.save();
    logger.info('Subscription created', { subscriptionId: subscription.subscriptionId });
    res.status(201).json(subscription);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Failed to create subscription', { error });
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Get all subscriptions with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tenantId, customerId, status, limit = 50, offset = 0 } = req.query;

    const filter: Record<string, unknown> = {};
    if (tenantId) filter.tenantId = tenantId;
    if (customerId) filter.customerId = customerId;
    if (status) filter.status = status;

    const subscriptions = await Subscription.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit));

    const total = await Subscription.countDocuments(filter);

    res.json({
      data: subscriptions,
      pagination: { total, limit: Number(limit), offset: Number(offset) }
    });
  } catch (error) {
    logger.error('Failed to fetch subscriptions', { error });
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// Get subscription by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const subscription = await Subscription.findOne({
      $or: [
        { subscriptionId: req.params.id },
        { _id: req.params.id }
      ]
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json(subscription);
  } catch (error) {
    logger.error('Failed to fetch subscription', { error });
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Update subscription
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = updateSubscriptionSchema.parse(req.body);
    const subscription = await Subscription.findOne({
      $or: [
        { subscriptionId: req.params.id },
        { _id: req.params.id }
      ]
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (data.plan) {
      subscription.plan = { ...subscription.plan, ...data.plan };
    }
    if (data.status) {
      subscription.status = data.status;
    }
    if (data.billing) {
      subscription.billing = { ...subscription.billing, ...data.billing };
      if (data.billing.nextBilling) {
        subscription.billing.nextBilling = new Date(data.billing.nextBilling);
      }
    }
    if (data.usage) {
      subscription.usage = { ...subscription.usage, ...data.usage };
    }

    await subscription.save();
    logger.info('Subscription updated', { subscriptionId: subscription.subscriptionId });
    res.json(subscription);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Failed to update subscription', { error });
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// Pause subscription
router.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const subscription = await Subscription.findOne({
      $or: [
        { subscriptionId: req.params.id },
        { _id: req.params.id }
      ]
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (subscription.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot pause cancelled subscription' });
    }

    await subscription.pause();
    logger.info('Subscription paused', { subscriptionId: subscription.subscriptionId });
    res.json({ message: 'Subscription paused', subscription });
  } catch (error) {
    logger.error('Failed to pause subscription', { error });
    res.status(500).json({ error: 'Failed to pause subscription' });
  }
});

// Resume subscription
router.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const subscription = await Subscription.findOne({
      $or: [
        { subscriptionId: req.params.id },
        { _id: req.params.id }
      ]
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    await subscription.resume();
    logger.info('Subscription resumed', { subscriptionId: subscription.subscriptionId });
    res.json({ message: 'Subscription resumed', subscription });
  } catch (error) {
    logger.error('Failed to resume subscription', { error });
    res.status(500).json({ error: 'Failed to resume subscription' });
  }
});

// Cancel subscription
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { immediate = false } = req.body;
    const subscription = await Subscription.findOne({
      $or: [
        { subscriptionId: req.params.id },
        { _id: req.params.id }
      ]
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    await subscription.cancel();

    if (immediate) {
      subscription.status = 'cancelled';
      subscription.endDate = new Date();
    }

    await subscription.save();
    logger.info('Subscription cancelled', { subscriptionId: subscription.subscriptionId });
    res.json({ message: 'Subscription cancelled', subscription });
  } catch (error) {
    logger.error('Failed to cancel subscription', { error });
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Renew subscription
router.post('/:id/renew', async (req: Request, res: Response) => {
  try {
    const subscription = await Subscription.findOne({
      $or: [
        { subscriptionId: req.params.id },
        { _id: req.params.id }
      ]
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    await subscription.renew();
    logger.info('Subscription renewed', { subscriptionId: subscription.subscriptionId });
    res.json({ message: 'Subscription renewed', subscription });
  } catch (error) {
    logger.error('Failed to renew subscription', { error });
    res.status(500).json({ error: 'Failed to renew subscription' });
  }
});

// Delete subscription
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const subscription = await Subscription.findOneAndDelete({
      $or: [
        { subscriptionId: req.params.id },
        { _id: req.params.id }
      ]
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    logger.info('Subscription deleted', { subscriptionId: subscription.subscriptionId });
    res.json({ message: 'Subscription deleted', subscriptionId: subscription.subscriptionId });
  } catch (error) {
    logger.error('Failed to delete subscription', { error });
    res.status(500).json({ error: 'Failed to delete subscription' });
  }
});

export default router;
