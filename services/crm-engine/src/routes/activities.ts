import { Router, Response } from 'express';
import { z } from 'zod';
import { Activity, ActivityType } from '../models';
import { AuthRequest, requireTenantId } from '../middleware';

const router = Router();

const activitySchema = z.object({
  type: z.nativeEnum(ActivityType),
  description: z.string().min(1),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  date: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateActivitySchema = activitySchema.partial();

// Get all activities
router.get('/', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '50', type, contactId, dealId } = req.query;
    const tenantId = req.tenantId!;

    const query: Record<string, unknown> = { tenantId };

    if (type) {
      query.type = type;
    }

    if (contactId) {
      query.contactId = contactId;
    }

    if (dealId) {
      query.dealId = dealId;
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .populate('contactId', 'name email company')
        .populate('dealId', 'title value stage')
        .skip(skip)
        .limit(limitNum)
        .sort({ date: -1 }),
      Activity.countDocuments(query),
    ]);

    res.json({
      data: activities,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Get activity by ID
router.get('/:id', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    })
      .populate('contactId', 'name email company')
      .populate('dealId', 'title value stage');

    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    res.json({ data: activity });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Create activity
router.post('/', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const validated = activitySchema.parse(req.body);
    const tenantId = req.tenantId!;

    const activity = new Activity({
      ...validated,
      tenantId,
      date: validated.date ? new Date(validated.date) : new Date(),
    });

    await activity.save();

    // Populate references
    await activity.populate('contactId', 'name email company');
    await activity.populate('dealId', 'title value stage');

    res.status(201).json({ data: activity });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Error creating activity:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// Update activity
router.put('/:id', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const validated = updateActivitySchema.parse(req.body);

    const updateData: Record<string, unknown> = { ...validated };
    if (validated.date) {
      updateData.date = new Date(validated.date);
    }

    const activity = await Activity.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('contactId', 'name email company')
      .populate('dealId', 'title value stage');

    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    res.json({ data: activity });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Error updating activity:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

// Delete activity
router.delete('/:id', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const activity = await Activity.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId,
    });

    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    res.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

export default router;
