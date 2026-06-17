import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Lead, LeadStage, LeadSource } from '../models/Lead';
import { Activity, ActivityType } from '../models/Activity';
import scoringService from '../services/scoring';

const router = Router();

// Validation schemas
const CreateLeadSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  source: z.nativeEnum(LeadSource).optional(),
  ownerId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateLeadSchema = CreateLeadSchema.partial();

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  stage: z.nativeEnum(LeadStage).optional(),
  source: z.nativeEnum(LeadSource).optional(),
  temperature: z.enum(['hot', 'warm', 'cold']).optional(),
  ownerId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'score.total', 'name', 'stage']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Helper to create activity log
const createActivity = async (
  tenantId: string,
  leadId: string,
  type: ActivityType,
  description: string,
  performedBy?: string,
  metadata?: Record<string, unknown>,
  previousValue?: unknown,
  newValue?: unknown
) => {
  const activity = new Activity({
    tenantId,
    activityId: `ACT-${uuidv4()}`,
    leadId,
    type,
    description,
    performedBy,
    metadata,
    previousValue,
    newValue,
  });
  await activity.save();
  return activity;
};

// Create a new lead
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const validatedData = CreateLeadSchema.parse(req.body);

    const lead = new Lead({
      tenantId,
      leadId: `LEAD-${uuidv4()}`,
      ...validatedData,
      score: {
        total: 0,
        factors: [],
        lastCalculated: new Date(),
      },
      enrichment: {},
      tags: validatedData.tags || [],
      metadata: validatedData.metadata || {},
    });

    await lead.save();

    // Create activity for lead creation
    await createActivity(
      tenantId,
      lead.leadId,
      ActivityType.NOTE,
      `Lead created: ${lead.name}`,
      undefined,
      { source: lead.source }
    );

    res.status(201).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    console.error('Create lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create lead',
    });
  }
});

// Get all leads with filtering and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const queryParams = QuerySchema.parse(req.query);

    const filter: Record<string, unknown> = {
      tenantId,
      isDeleted: false,
    };

    if (queryParams.stage) filter.stage = queryParams.stage;
    if (queryParams.source) filter.source = queryParams.source;
    if (queryParams.temperature) filter.temperature = queryParams.temperature;
    if (queryParams.ownerId) filter.ownerId = queryParams.ownerId;

    if (queryParams.search) {
      filter.$or = [
        { name: { $regex: queryParams.search, $options: 'i' } },
        { email: { $regex: queryParams.search, $options: 'i' } },
        { company: { $regex: queryParams.search, $options: 'i' } },
      ];
    }

    const skip = (queryParams.page - 1) * queryParams.limit;
    const sortDirection = queryParams.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [queryParams.sortBy]: sortDirection };

    const [leads, total] = await Promise.all([
      Lead.find(filter).sort(sort).skip(skip).limit(queryParams.limit),
      Lead.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: leads,
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
    console.error('Get leads error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leads',
    });
  }
});

// Get lead by ID
router.get('/:leadId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { leadId } = req.params;

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

    res.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get lead',
    });
  }
});

// Update lead
router.put('/:leadId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { leadId } = req.params;
    const validatedData = UpdateLeadSchema.parse(req.body);

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

    // Track stage changes
    if (validatedData.stage && validatedData.stage !== lead.stage) {
      await createActivity(
        tenantId,
        leadId,
        ActivityType.STAGE_CHANGE,
        `Stage changed from ${lead.stage} to ${validatedData.stage}`,
        undefined,
        {},
        lead.stage,
        validatedData.stage
      );
    }

    // Update fields
    Object.assign(lead, validatedData);
    await lead.save();

    res.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    console.error('Update lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lead',
    });
  }
});

// Delete lead (soft delete)
router.delete('/:leadId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { leadId } = req.params;

    const lead = await Lead.findOneAndUpdate(
      {
        tenantId,
        leadId,
        isDeleted: false,
      },
      {
        isDeleted: true,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      });
    }

    await createActivity(
      tenantId,
      leadId,
      ActivityType.NOTE,
      `Lead deleted`,
      undefined,
      { deletedBy: req.headers['x-user-id'] || 'system' }
    );

    res.json({
      success: true,
      message: 'Lead deleted successfully',
    });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete lead',
    });
  }
});

// Calculate lead score
router.post('/:leadId/score', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { leadId } = req.params;

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

    const previousScore = lead.score.total;
    const newScore = await scoringService.calculateScore(lead);

    lead.score = newScore;
    await lead.save();

    await createActivity(
      tenantId,
      leadId,
      ActivityType.SCORE_UPDATE,
      `Score updated from ${previousScore} to ${newScore.total}`,
      undefined,
      { factors: newScore.factors }
    );

    res.json({
      success: true,
      data: {
        previousScore,
        newScore,
      },
    });
  } catch (error) {
    console.error('Calculate score error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate score',
    });
  }
});

// Batch score calculation
router.post('/score/batch', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { leadIds } = req.body;

    let leads;
    if (leadIds && Array.isArray(leadIds)) {
      leads = await Lead.find({
        tenantId,
        leadId: { $in: leadIds },
        isDeleted: false,
      });
    } else {
      leads = await Lead.find({
        tenantId,
        isDeleted: false,
      });
    }

    const results = await Promise.all(
      leads.map(async (lead) => {
        const previousScore = lead.score.total;
        const newScore = await scoringService.calculateScore(lead);
        lead.score = newScore;
        await lead.save();

        return {
          leadId: lead.leadId,
          name: lead.name,
          previousScore,
          newScore: newScore.total,
        };
      })
    );

    res.json({
      success: true,
      data: results,
      summary: {
        total: results.length,
        improved: results.filter((r) => r.newScore > r.previousScore).length,
        declined: results.filter((r) => r.newScore < r.previousScore).length,
        unchanged: results.filter((r) => r.newScore === r.previousScore).length,
      },
    });
  } catch (error) {
    console.error('Batch score error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch calculate scores',
    });
  }
});

// Convert lead to contact
router.post('/:leadId/convert', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { leadId } = req.params;
    const { contactId } = req.body;

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

    if (lead.isConverted) {
      return res.status(400).json({
        success: false,
        error: 'Lead is already converted',
      });
    }

    lead.isConverted = true;
    lead.convertedAt = new Date();
    lead.stage = LeadStage.WON;
    if (contactId) {
      lead.convertedToContactId = contactId as unknown as typeof lead.convertedToContactId;
    }
    await lead.save();

    await createActivity(
      tenantId,
      leadId,
      ActivityType.CONVERSION,
      `Lead converted to contact`,
      undefined,
      { contactId }
    );

    res.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error('Convert lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to convert lead',
    });
  }
});

// Get lead statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const [stats, byStage, bySource, byTemperature, topLeads] = await Promise.all([
      Lead.aggregate([
        { $match: { tenantId, isDeleted: false } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            avgScore: { $avg: '$score.total' },
            hotLeads: { $sum: { $cond: [{ $eq: ['$temperature', 'hot'] }, 1, 0] } },
            warmLeads: { $sum: { $cond: [{ $eq: ['$temperature', 'warm'] }, 1, 0] } },
            coldLeads: { $sum: { $cond: [{ $eq: ['$temperature', 'cold'] }, 1, 0] } },
            converted: { $sum: { $cond: ['$isConverted', 1, 0] } },
          },
        },
      ]),
      Lead.aggregate([
        { $match: { tenantId, isDeleted: false } },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Lead.aggregate([
        { $match: { tenantId, isDeleted: false } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Lead.aggregate([
        { $match: { tenantId, isDeleted: false } },
        { $group: { _id: '$temperature', count: { $sum: 1 } } },
      ]),
      Lead.find({ tenantId, isDeleted: false, isConverted: false })
        .sort({ 'score.total': -1 })
        .limit(10)
        .select('leadId name email company score.total temperature'),
    ]);

    res.json({
      success: true,
      data: {
        overall: stats[0] || {
          total: 0,
          avgScore: 0,
          hotLeads: 0,
          warmLeads: 0,
          coldLeads: 0,
          converted: 0,
        },
        byStage: byStage.map((s) => ({ stage: s._id, count: s.count })),
        bySource: bySource.map((s) => ({ source: s._id, count: s.count })),
        byTemperature: byTemperature.map((t) => ({ temperature: t._id, count: t.count })),
        topLeads,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
    });
  }
});

export default router;
