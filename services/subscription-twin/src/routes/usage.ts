import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Usage, UsageRecord } from '../models/Usage';
import { Subscription } from '../models/Subscription';
import { logger } from '../services/logger';

const router = Router();

// Validation schemas
const trackUsageSchema = z.object({
  tenantId: z.string().min(1),
  subscriptionId: z.string().min(1),
  customerId: z.string().min(1),
  type: z.enum(['api_calls', 'storage', 'users', 'transactions', 'custom']),
  amount: z.number(),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

const updateUsageSchema = z.object({
  type: z.enum(['api_calls', 'storage', 'users', 'transactions', 'custom']).optional(),
  value: z.number().min(0).optional(),
  unit: z.string().optional(),
  resetDate: z.string().datetime().optional()
});

const getOrCreateBillingPeriod = (subscription: any): { start: Date; end: Date } => {
  const now = new Date();
  const start = subscription.billing.lastBilling || subscription.startDate;
  const end = subscription.billing.nextBilling;

  return { start, end };
};

// Track usage
router.post('/track', async (req: Request, res: Response) => {
  try {
    const data = trackUsageSchema.parse(req.body);

    // Get subscription for billing period
    const subscription = await Subscription.findOne({
      $or: [
        { subscriptionId: data.subscriptionId },
        { _id: data.subscriptionId }
      ]
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const billingPeriod = getOrCreateBillingPeriod(subscription);

    // Find or create usage record for this period
    let usage = await Usage.findOne({
      subscriptionId: subscription.subscriptionId,
      type: data.type,
      billingPeriodStart: { $lte: billingPeriod.start },
      billingPeriodEnd: { $gte: billingPeriod.end }
    });

    const previousValue = usage?.value || 0;
    const newValue = previousValue + data.amount;

    // Record the usage event
    const usageRecord = new UsageRecord({
      recordId: `UR-${uuidv4().substring(0, 8).toUpperCase()}`,
      tenantId: data.tenantId,
      subscriptionId: subscription.subscriptionId,
      customerId: data.customerId,
      type: data.type,
      action: 'increment',
      amount: data.amount,
      previousValue,
      newValue,
      description: data.description,
      timestamp: new Date(),
      metadata: data.metadata
    });

    await usageRecord.save();

    // Update or create usage aggregate
    if (usage) {
      await usage.increment(data.amount);
    } else {
      usage = await Usage.create({
        usageId: `USG-${uuidv4().substring(0, 8).toUpperCase()}`,
        tenantId: data.tenantId,
        subscriptionId: subscription.subscriptionId,
        customerId: data.customerId,
        type: data.type,
        value: data.amount,
        unit: data.type === 'api_calls' ? 'calls' : data.type === 'storage' ? 'MB' : 'units',
        billingPeriodStart: billingPeriod.start,
        billingPeriodEnd: billingPeriod.end
      });
    }

    // Check if usage exceeds limit
    let overLimit = false;
    if (subscription.usage?.limit && newValue > subscription.usage.limit) {
      overLimit = true;
      logger.warn('Usage exceeded limit', {
        subscriptionId: subscription.subscriptionId,
        type: data.type,
        current: newValue,
        limit: subscription.usage.limit
      });
    }

    // Update subscription's current usage
    if (subscription.usage) {
      subscription.usage.current = newValue;
      await subscription.save();
    }

    logger.info('Usage tracked', {
      subscriptionId: subscription.subscriptionId,
      type: data.type,
      amount: data.amount,
      newValue
    });

    res.json({
      usageRecord,
      usage,
      overLimit,
      limit: subscription.usage?.limit
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Failed to track usage', { error });
    res.status(500).json({ error: 'Failed to track usage' });
  }
});

// Get usage for a subscription
router.get('/subscription/:subscriptionId', async (req: Request, res: Response) => {
  try {
    const { type, currentPeriod = 'true' } = req.query;

    const filter: Record<string, unknown> = { subscriptionId: req.params.subscriptionId };
    if (type) filter.type = type;

    if (currentPeriod === 'true') {
      const subscription = await Subscription.findOne({ subscriptionId: req.params.subscriptionId });
      if (subscription) {
        const billingPeriod = getOrCreateBillingPeriod(subscription);
        filter.billingPeriodStart = { $lte: billingPeriod.end };
        filter.billingPeriodEnd = { $gte: billingPeriod.start };
      }
    }

    const usage = await Usage.find(filter);
    res.json({ data: usage });
  } catch (error) {
    logger.error('Failed to fetch usage', { error });
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

// Get usage records
router.get('/records/:subscriptionId', async (req: Request, res: Response) => {
  try {
    const { type, limit = 100, offset = 0 } = req.query;

    const filter: Record<string, unknown> = { subscriptionId: req.params.subscriptionId };
    if (type) filter.type = type;

    const records = await UsageRecord.find(filter)
      .sort({ timestamp: -1 })
      .skip(Number(offset))
      .limit(Number(limit));

    const total = await UsageRecord.countDocuments(filter);

    res.json({
      data: records,
      pagination: { total, limit: Number(limit), offset: Number(offset) }
    });
  } catch (error) {
    logger.error('Failed to fetch usage records', { error });
    res.status(500).json({ error: 'Failed to fetch usage records' });
  }
});

// Update usage value directly
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = updateUsageSchema.parse(req.body);
    const usage = await Usage.findOne({
      $or: [
        { usageId: req.params.id },
        { _id: req.params.id }
      ]
    });

    if (!usage) {
      return res.status(404).json({ error: 'Usage not found' });
    }

    if (data.type) usage.type = data.type as any;
    if (data.value !== undefined) {
      const previousValue = usage.value;
      usage.value = data.value;
      // Create record for the change
      await UsageRecord.create({
        recordId: `UR-${uuidv4().substring(0, 8).toUpperCase()}`,
        tenantId: usage.tenantId,
        subscriptionId: usage.subscriptionId,
        customerId: usage.customerId,
        type: usage.type as any,
        action: 'set',
        amount: data.value - previousValue,
        previousValue,
        newValue: data.value,
        timestamp: new Date()
      });
    }
    if (data.unit) usage.unit = data.unit;
    if (data.resetDate) usage.resetDate = new Date(data.resetDate);

    await usage.save();
    logger.info('Usage updated', { usageId: usage.usageId });
    res.json(usage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Failed to update usage', { error });
    res.status(500).json({ error: 'Failed to update usage' });
  }
});

// Reset usage for a subscription
router.post('/subscription/:subscriptionId/reset', async (req: Request, res: Response) => {
  try {
    const { type } = req.body;
    const filter: Record<string, unknown> = { subscriptionId: req.params.subscriptionId };
    if (type) filter.type = type;

    const usages = await Usage.find(filter);
    const previousValues: Record<string, number> = {};

    for (const usage of usages) {
      previousValues[usage.type] = usage.value;
      await usage.reset();
    }

    // Create reset records
    await Promise.all(usages.map(usage =>
      UsageRecord.create({
        recordId: `UR-${uuidv4().substring(0, 8).toUpperCase()}`,
        tenantId: usage.tenantId,
        subscriptionId: usage.subscriptionId,
        customerId: usage.customerId,
        type: usage.type as any,
        action: 'reset',
        amount: previousValues[usage.type],
        previousValue: previousValues[usage.type],
        newValue: 0,
        timestamp: new Date()
      })
    ));

    // Update subscription usage
    const subscription = await Subscription.findOne({ subscriptionId: req.params.subscriptionId });
    if (subscription?.usage) {
      subscription.usage.current = 0;
      await subscription.save();
    }

    logger.info('Usage reset', { subscriptionId: req.params.subscriptionId, types: Object.keys(previousValues) });
    res.json({ message: 'Usage reset', types: Object.keys(previousValues) });
  } catch (error) {
    logger.error('Failed to reset usage', { error });
    res.status(500).json({ error: 'Failed to reset usage' });
  }
});

// Get usage analytics
router.get('/analytics/:tenantId', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, type } = req.query;

    const filter: Record<string, unknown> = { tenantId: req.params.tenantId };
    if (type) filter.type = type;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) (filter.timestamp as Record<string, Date>).$gte = new Date(startDate as string);
      if (endDate) (filter.timestamp as Record<string, Date>).$lte = new Date(endDate as string);
    }

    const records = await UsageRecord.find(filter);

    // Aggregate by type
    const byType: Record<string, { total: number; count: number; avg: number }> = {};
    for (const record of records) {
      if (!byType[record.type]) {
        byType[record.type] = { total: 0, count: 0, avg: 0 };
      }
      byType[record.type].total += record.amount;
      byType[record.type].count += 1;
    }

    for (const type of Object.keys(byType)) {
      byType[type].avg = byType[type].total / byType[type].count;
    }

    res.json({
      totalRecords: records.length,
      byType,
      dateRange: { start: startDate, end: endDate }
    });
  } catch (error) {
    logger.error('Failed to fetch usage analytics', { error });
    res.status(500).json({ error: 'Failed to fetch usage analytics' });
  }
});

export default router;
