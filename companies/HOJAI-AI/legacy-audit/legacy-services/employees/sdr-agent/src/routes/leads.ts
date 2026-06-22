// ============================================
// HOJAI AI - SDR Agent Lead Routes
// ============================================

import { Router, Request, Response } from 'express';
import { Lead, Contact, Company, Activity, Qualification } from '../models';
import { requireInternalAuth, extractTenant } from '../middleware/auth';
import {
  validateBody,
  LeadFiltersSchema,
  StageUpdateSchema,
  successResponse,
  errorResponse,
  paginatedResponse
} from '../utils/validation';
import { logger } from '../utils/logger';
import { LeadStage, LeadSource, LeadScore } from '../types';

const router = Router();

// Apply middleware
router.use(extractTenant);
router.use(requireInternalAuth);

/**
 * GET /api/leads
 * List leads with filtering and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req;

    // Parse query parameters
    const filters = {
      stage: req.query.stage as LeadStage | undefined,
      source: req.query.source as LeadSource | undefined,
      score: req.query.score as LeadScore | undefined,
      assignedTo: req.query.assignedTo as string | undefined
    };

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // Build query
    const query: Record<string, unknown> = { tenantId };

    if (filters.stage) query.stage = filters.stage;
    if (filters.source) query.source = filters.source;
    if (filters.score) query.score = filters.score;
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;

    // Get total count
    const total = await Lead.countDocuments(query);

    // Get leads with populated contact and company
    const leads = await Lead.find(query)
      .sort({ updatedAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('contactId')
      .populate('companyId')
      .lean();

    // Transform to response format
    const transformedLeads = leads.map(lead => ({
      id: lead._id.toString(),
      tenantId: lead.tenantId,
      contact: lead.contactId,
      company: lead.companyId,
      stage: lead.stage,
      source: lead.source,
      score: lead.score,
      scoreValue: lead.scoreValue,
      ownerId: lead.ownerId,
      assignedTo: lead.assignedTo,
      lastContactedAt: lead.lastContactedAt,
      nextFollowupAt: lead.nextFollowupAt,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt
    }));

    res.json(paginatedResponse(transformedLeads, total, limit, offset));
  } catch (error) {
    logger.error('Failed to list leads', { error, tenantId: req.tenantId });
    res.status(500).json(errorResponse(
      'LEADS_LIST_FAILED',
      'Failed to list leads'
    ));
  }
});

/**
 * GET /api/leads/:id
 * Get a specific lead with full details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;

    const lead = await Lead.findOne({ _id: id, tenantId })
      .populate('contactId')
      .populate('companyId')
      .lean();

    if (!lead) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Lead not found'));
    }

    // Get qualification
    const qualification = await Qualification.findOne({ leadId: lead._id }).lean();

    // Get recent activities
    const activities = await Activity.find({ leadId: lead._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json(successResponse({
      lead: {
        id: lead._id.toString(),
        tenantId: lead.tenantId,
        contact: lead.contactId,
        company: lead.companyId,
        stage: lead.stage,
        source: lead.source,
        score: lead.score,
        scoreValue: lead.scoreValue,
        ownerId: lead.ownerId,
        assignedTo: lead.assignedTo,
        lastContactedAt: lead.lastContactedAt,
        nextFollowupAt: lead.nextFollowupAt,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt
      },
      qualification,
      activities: activities.map(a => ({
        id: a._id.toString(),
        type: a.type,
        description: a.description,
        metadata: a.metadata,
        createdBy: a.createdBy,
        createdAt: a.createdAt
      }))
    }));
  } catch (error) {
    logger.error('Failed to get lead', { error, tenantId: req.tenantId });
    res.status(500).json(errorResponse(
      'LEAD_GET_FAILED',
      'Failed to get lead'
    ));
  }
});

/**
 * POST /api/leads
 * Create a new lead
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const { contactId, companyId, source, ownerId } = req.body;

    // Validate required fields
    if (!contactId || !companyId) {
      return res.status(400).json(errorResponse(
        'VALIDATION_ERROR',
        'contactId and companyId are required'
      ));
    }

    // Verify contact and company exist
    const contact = await Contact.findOne({ _id: contactId, tenantId });
    const company = await Company.findOne({ _id: companyId, tenantId });

    if (!contact) {
      return res.status(400).json(errorResponse('NOT_FOUND', 'Contact not found'));
    }
    if (!company) {
      return res.status(400).json(errorResponse('NOT_FOUND', 'Company not found'));
    }

    // Create lead
    const lead = await Lead.create({
      tenantId,
      contactId,
      companyId,
      source: source || LeadSource.COLD_OUTREACH,
      ownerId: ownerId || userId || 'system',
      stage: LeadStage.NEW,
      score: LeadScore.COLD,
      scoreValue: 0
    });

    // Log activity
    await Activity.create({
      tenantId,
      leadId: lead._id,
      type: 'stage_change',
      description: 'Lead created',
      metadata: { source },
      createdBy: userId || 'system'
    });

    logger.info('Lead created', { tenantId, leadId: lead._id });

    res.status(201).json(successResponse({
      id: lead._id.toString(),
      tenantId: lead.tenantId,
      contactId: lead.contactId.toString(),
      companyId: lead.companyId.toString(),
      stage: lead.stage,
      source: lead.source,
      score: lead.score,
      scoreValue: lead.scoreValue,
      ownerId: lead.ownerId,
      createdAt: lead.createdAt
    }, 'Lead created successfully'));
  } catch (error) {
    logger.error('Failed to create lead', { error, tenantId: req.tenantId });
    res.status(500).json(errorResponse(
      'LEAD_CREATE_FAILED',
      'Failed to create lead'
    ));
  }
});

/**
 * PUT /api/leads/:id/stage
 * Update lead stage
 */
router.put('/:id/stage', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const { id } = req.params;
    const { stage, notes } = req.body;

    const lead = await Lead.findOne({ _id: id, tenantId });
    if (!lead) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Lead not found'));
    }

    const oldStage = lead.stage;
    lead.stage = stage;

    // Update score based on stage
    if (stage === LeadStage.CLOSED_WON) {
      lead.score = LeadScore.HOT;
      lead.scoreValue = 100;
    } else if (stage === LeadStage.CLOSED_LOST) {
      lead.score = LeadScore.UNQUALIFIED;
      lead.scoreValue = 0;
    }

    await lead.save();

    // Log activity
    await Activity.create({
      tenantId,
      leadId: lead._id,
      type: 'stage_change',
      description: notes || `Stage changed from ${oldStage} to ${stage}`,
      metadata: { oldStage, newStage: stage },
      createdBy: userId || 'system'
    });

    logger.info('Lead stage updated', { tenantId, leadId: id, oldStage, newStage: stage });

    res.json(successResponse({
      id: lead._id.toString(),
      stage: lead.stage,
      score: lead.score,
      scoreValue: lead.scoreValue,
      previousStage: oldStage
    }, 'Lead stage updated'));
  } catch (error) {
    logger.error('Failed to update lead stage', { error, tenantId: req.tenantId });
    res.status(500).json(errorResponse(
      'LEAD_STAGE_UPDATE_FAILED',
      'Failed to update lead stage'
    ));
  }
});

/**
 * PATCH /api/leads/:id
 * Update lead details
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const { id } = req.params;
    const updates = req.body;

    const allowedUpdates = ['assignedTo', 'ownerId', 'nextFollowupAt', 'metadata'];
    const updateData: Record<string, unknown> = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        updateData[key] = updates[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json(errorResponse(
        'VALIDATION_ERROR',
        'No valid fields to update'
      ));
    }

    const lead = await Lead.findOneAndUpdate(
      { _id: id, tenantId },
      updateData,
      { new: true }
    );

    if (!lead) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Lead not found'));
    }

    res.json(successResponse({
      id: lead._id.toString(),
      assignedTo: lead.assignedTo,
      ownerId: lead.ownerId,
      nextFollowupAt: lead.nextFollowupAt
    }));
  } catch (error) {
    logger.error('Failed to update lead', { error, tenantId: req.tenantId });
    res.status(500).json(errorResponse(
      'LEAD_UPDATE_FAILED',
      'Failed to update lead'
    ));
  }
});

/**
 * DELETE /api/leads/:id
 * Delete a lead
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;

    const lead = await Lead.findOneAndDelete({ _id: id, tenantId });

    if (!lead) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Lead not found'));
    }

    // Delete related records
    await Promise.all([
      Activity.deleteMany({ leadId: lead._id }),
      Qualification.deleteMany({ leadId: lead._id })
    ]);

    logger.info('Lead deleted', { tenantId, leadId: id });

    res.json(successResponse({ id }, 'Lead deleted'));
  } catch (error) {
    logger.error('Failed to delete lead', { error, tenantId: req.tenantId });
    res.status(500).json(errorResponse(
      'LEAD_DELETE_FAILED',
      'Failed to delete lead'
    ));
  }
});

/**
 * GET /api/leads/stats/summary
 * Get lead statistics summary
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req;

    const pipeline = [
      { $match: { tenantId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          byStage: { $push: '$stage' },
          byScore: { $push: '$score' }
        }
      }
    ];

    const [result] = await Lead.aggregate(pipeline);

    const stageDistribution: Record<string, number> = {};
    const scoreDistribution: Record<string, number> = {};

    if (result) {
      for (const stage of result.byStage) {
        stageDistribution[stage] = (stageDistribution[stage] || 0) + 1;
      }
      for (const score of result.byScore) {
        scoreDistribution[score] = (scoreDistribution[score] || 0) + 1;
      }
    }

    res.json(successResponse({
      total: result?.total || 0,
      stageDistribution,
      scoreDistribution,
      avgScore: result?.total ? Math.round(
        result.byScore.reduce((sum: number, s: string) => sum + (s === 'hot' ? 90 : s === 'warm' ? 65 : s === 'cold' ? 25 : 0), 0) / result.total
      ) : 0
    }));
  } catch (error) {
    logger.error('Failed to get lead stats', { error, tenantId: req.tenantId });
    res.status(500).json(errorResponse(
      'STATS_FAILED',
      'Failed to get lead statistics'
    ));
  }
});

export { router as leadRoutes };
