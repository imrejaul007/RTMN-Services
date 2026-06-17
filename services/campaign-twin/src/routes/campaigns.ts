import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Campaign, ICampaign } from '../models/Campaign';

const router = Router();

// Validation schemas
const createCampaignSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  objective: z.enum(['awareness', 'consideration', 'conversion', 'retention']),
  type: z.enum(['email', 'sms', 'social', 'ads', 'seo', 'content', 'influencer']),
  status: z.enum(['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled']).optional(),
  channels: z.array(z.object({
    channel: z.string(),
    budget: z.number().min(0),
    spent: z.number().min(0).optional(),
    currency: z.string().optional()
  })).optional(),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
  targetAudience: z.object({
    demographics: z.record(z.any()).optional(),
    interests: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional()
  }).optional(),
  tags: z.array(z.string()).optional(),
  createdBy: z.string().optional()
});

const updateCampaignSchema = createCampaignSchema.partial();

// Create a new campaign
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = createCampaignSchema.parse(req.body);
    const campaignId = `CMP-${uuidv4().substring(0, 8).toUpperCase()}`;

    const campaign = new Campaign({
      campaignId,
      ...validatedData,
      startDate: new Date(validatedData.startDate),
      endDate: new Date(validatedData.endDate),
      metrics: {
        impressions: 0,
        clicks: 0,
        leads: 0,
        conversions: 0,
        revenue: 0
      },
      roi: {
        calculated: false,
        value: 0
      }
    });

    await campaign.save();

    res.status(201).json({
      success: true,
      data: campaign
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    } else {
      console.error('Error creating campaign:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create campaign'
      });
    }
  }
});

// Get all campaigns with filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      status,
      type,
      objective,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query: Record<string, any> = {};

    if (tenantId) query.tenantId = tenantId;
    if (status) query.status = status;
    if (type) query.type = type;
    if (objective) query.objective = objective;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    const sortOptions: Record<string, 1 | -1> = {
      [sortBy as string]: sortOrder === 'asc' ? 1 : -1
    };

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Campaign.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: campaigns,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns'
    });
  }
});

// Get a single campaign by ID
router.get('/:campaignId', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const campaign = await Campaign.findOne({ campaignId }).lean();

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign'
    });
  }
});

// Update a campaign
router.put('/:campaignId', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const validatedData = updateCampaignSchema.parse(req.body);

    if (validatedData.startDate) {
      validatedData.startDate = new Date(validatedData.startDate as any);
    }
    if (validatedData.endDate) {
      validatedData.endDate = new Date(validatedData.endDate as any);
    }

    const campaign = await Campaign.findOneAndUpdate(
      { campaignId },
      { ...validatedData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    } else {
      console.error('Error updating campaign:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update campaign'
      });
    }
  }
});

// Delete a campaign
router.delete('/:campaignId', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const campaign = await Campaign.findOneAndDelete({ campaignId });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete campaign'
    });
  }
});

// Update campaign status
router.patch('/:campaignId/status', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const campaign = await Campaign.findOneAndUpdate(
      { campaignId },
      { status, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('Error updating campaign status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign status'
    });
  }
});

// Update campaign metrics
router.patch('/:campaignId/metrics', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { metrics } = req.body;

    const campaign = await Campaign.findOne({ campaignId });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Update metrics
    campaign.metrics = {
      ...campaign.metrics,
      ...metrics
    };

    await campaign.save();

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('Error updating campaign metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign metrics'
    });
  }
});

// Get campaigns by tenant
router.get('/tenant/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { status, type } = req.query;

    const query: Record<string, any> = { tenantId };
    if (status) query.status = status;
    if (type) query.type = type;

    const campaigns = await Campaign.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: campaigns,
      count: campaigns.length
    });
  } catch (error) {
    console.error('Error fetching tenant campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenant campaigns'
    });
  }
});

// Get campaign statistics
router.get('/:campaignId/stats', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const campaign = await Campaign.findOne({ campaignId }).lean();

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Calculate statistics
    const totalBudget = campaign.channels.reduce((sum, ch) => sum + ch.budget, 0);
    const totalSpent = campaign.channels.reduce((sum, ch) => sum + ch.spent, 0);
    const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const stats = {
      campaignId: campaign.campaignId,
      name: campaign.name,
      status: campaign.status,
      period: {
        start: campaign.startDate,
        end: campaign.endDate
      },
      financial: {
        totalBudget,
        totalSpent,
        remaining: totalBudget - totalSpent,
        budgetUtilization: Math.round(budgetUtilization * 100) / 100
      },
      performance: {
        ...campaign.metrics,
        roi: campaign.roi
      },
      channels: campaign.channels.map(ch => ({
        channel: ch.channel,
        budget: ch.budget,
        spent: ch.spent,
        utilization: ch.budget > 0 ? (ch.spent / ch.budget) * 100 : 0
      }))
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign statistics'
    });
  }
});

export default router;
