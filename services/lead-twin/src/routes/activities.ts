import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Activity, ActivityType } from '../models/Activity';
import { Lead } from '../models/Lead';

const router = Router();

// Validation schemas
const CreateActivitySchema = z.object({
  type: z.nativeEnum(ActivityType),
  description: z.string().min(1).max(1000),
  performedBy: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  type: z.nativeEnum(ActivityType).optional(),
  performedBy: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// Create activity for a lead
router.post('/:leadId/activities', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { leadId } = req.params;
    const validatedData = CreateActivitySchema.parse(req.body);

    // Verify lead exists
    const lead = await Lead.findOne({
      tenantId,
      leadId,
      isDeleted: false,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      });
    }

    const activity = new Activity({
      tenantId,
      activityId: `ACT-${uuidv4()}`,
      leadId,
      ...validatedData,
      metadata: validatedData.metadata || {},
    });

    await activity.save();

    // Recalculate score if this is an engagement activity
    if ([ActivityType.CALL, ActivityType.EMAIL, ActivityType.MEETING].includes(validatedData.type)) {
      const { default: scoringService } = await import('../services/scoring');
      const newScore = await scoringService.calculateScore(lead);
      lead.score = newScore;
      await lead.save();
    }

    res.status(201).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    console.error('Create activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create activity',
    });
  }
});

// Get activities for a lead
router.get('/:leadId/activities', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { leadId } = req.params;
    const queryParams = QuerySchema.parse(req.query);

    // Verify lead exists
    const lead = await Lead.findOne({
      tenantId,
      leadId,
      isDeleted: false,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      });
    }

    const filter: Record<string, unknown> = {
      tenantId,
      leadId,
      isDeleted: false,
    };

    if (queryParams.type) filter.type = queryParams.type;
    if (queryParams.performedBy) filter.performedBy = queryParams.performedBy;

    if (queryParams.startDate || queryParams.endDate) {
      filter.createdAt = {};
      if (queryParams.startDate) {
        (filter.createdAt as Record<string, Date>).$gte = queryParams.startDate;
      }
      if (queryParams.endDate) {
        (filter.createdAt as Record<string, Date>).$lte = queryParams.endDate;
      }
    }

    const skip = (queryParams.page - 1) * queryParams.limit;

    const [activities, total] = await Promise.all([
      Activity.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(queryParams.limit),
      Activity.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: activities,
      pagination: {
        page: queryParams.page,
        limit: queryParams.limit,
        total,
        pages: Math.ceil(total / queryParams.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get activities',
    });
  }
});

// Get activity by ID
router.get('/activity/:activityId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { activityId } = req.params;

    const activity = await Activity.findOne({
      tenantId,
      activityId,
      isDeleted: false,
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found',
      });
    }

    res.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get activity',
    });
  }
});

// Delete activity (soft delete)
router.delete('/activity/:activityId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { activityId } = req.params;

    const activity = await Activity.findOneAndUpdate(
      {
        tenantId,
        activityId,
        isDeleted: false,
      },
      {
        isDeleted: true,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found',
      });
    }

    res.json({
      success: true,
      message: 'Activity deleted successfully',
    });
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete activity',
    });
  }
});

// Get activity timeline for a lead (grouped by date)
router.get('/:leadId/activities/timeline', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { leadId } = req.params;

    // Verify lead exists
    const lead = await Lead.findOne({
      tenantId,
      leadId,
      isDeleted: false,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      });
    }

    const activities = await Activity.find({
      tenantId,
      leadId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .select('activityId type description performedBy createdAt metadata');

    // Group by date
    const timeline: Record<string, typeof activities> = {};
    activities.forEach((activity) => {
      const dateKey = activity.createdAt.toISOString().split('T')[0];
      if (!timeline[dateKey]) {
        timeline[dateKey] = [];
      }
      timeline[dateKey].push(activity);
    });

    res.json({
      success: true,
      data: {
        lead: {
          leadId: lead.leadId,
          name: lead.name,
        },
        timeline: Object.entries(timeline).map(([date, items]) => ({
          date,
          activities: items,
        })),
      },
    });
  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get timeline',
    });
  }
});

// Get activity statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const [byType, recentActivity, topPerformers] = await Promise.all([
      Activity.aggregate([
        { $match: { tenantId, isDeleted: false } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Activity.aggregate([
        { $match: { tenantId, isDeleted: false } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 30 },
      ]),
      Activity.aggregate([
        { $match: { tenantId, isDeleted: false, performedBy: { $exists: true } } },
        { $group: { _id: '$performedBy', activityCount: { $sum: 1 } } },
        { $sort: { activityCount: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        byType: byType.map((t) => ({ type: t._id, count: t.count })),
        recentActivity: recentActivity.map((r) => ({ date: r._id, count: r.count })),
        topPerformers: topPerformers.map((p) => ({ performer: p._id, activityCount: p.activityCount })),
      },
    });
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
    });
  }
});

export default router;
