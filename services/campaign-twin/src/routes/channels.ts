import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Channel } from '../models/Channel';

const router = Router();

// Validation schemas
const createChannelSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(1).max(100),
  type: z.enum(['email', 'sms', 'social', 'ads', 'seo', 'content', 'influencer', 'display', 'video']),
  provider: z.string().optional(),
  config: z.object({
    apiKey: z.string().optional(),
    accountId: z.string().optional(),
    audienceSize: z.number().optional(),
    reach: z.number().optional(),
    frequency: z.number().optional(),
    avgCpc: z.number().optional(),
    avgCpm: z.number().optional(),
    dailyBudget: z.number().optional(),
    lifetimeBudget: z.number().optional(),
    biddingStrategy: z.string().optional(),
    targetingOptions: z.record(z.any()).optional()
  }).optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'pending']).optional(),
  isEnabled: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
});

const updateChannelSchema = createChannelSchema.partial();

// Create a new channel
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = createChannelSchema.parse(req.body);
    const channelId = `CH-${uuidv4().substring(0, 8).toUpperCase()}`;

    const channel = new Channel({
      channelId,
      ...validatedData,
      credentials: {
        encrypted: true,
        lastUpdated: new Date()
      }
    });

    await channel.save();

    res.status(201).json({
      success: true,
      data: channel
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    } else {
      console.error('Error creating channel:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create channel'
      });
    }
  }
});

// Get all channels with filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      type,
      status,
      isEnabled,
      page = '1',
      limit = '50'
    } = req.query;

    const query: Record<string, any> = {};

    if (tenantId) query.tenantId = tenantId;
    if (type) query.type = type;
    if (status) query.status = status;
    if (isEnabled !== undefined) query.isEnabled = isEnabled === 'true';

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    const [channels, total] = await Promise.all([
      Channel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Channel.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: channels,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channels'
    });
  }
});

// Get a single channel by ID
router.get('/:channelId', async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findOne({ channelId }).lean();

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    res.json({
      success: true,
      data: channel
    });
  } catch (error) {
    console.error('Error fetching channel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channel'
    });
  }
});

// Update a channel
router.put('/:channelId', async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const validatedData = updateChannelSchema.parse(req.body);

    const channel = await Channel.findOneAndUpdate(
      { channelId },
      { ...validatedData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    res.json({
      success: true,
      data: channel
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    } else {
      console.error('Error updating channel:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update channel'
      });
    }
  }
});

// Delete a channel
router.delete('/:channelId', async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findOneAndDelete({ channelId });

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    res.json({
      success: true,
      message: 'Channel deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting channel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete channel'
    });
  }
});

// Update channel status
router.patch('/:channelId/status', async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'inactive', 'suspended', 'pending'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const channel = await Channel.findOneAndUpdate(
      { channelId },
      { status, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    res.json({
      success: true,
      data: channel
    });
  } catch (error) {
    console.error('Error updating channel status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update channel status'
    });
  }
});

// Get channels by tenant
router.get('/tenant/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { type, status } = req.query;

    const query: Record<string, any> = { tenantId };
    if (type) query.type = type;
    if (status) query.status = status;

    const channels = await Channel.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Group by type
    const grouped = channels.reduce((acc: Record<string, any[]>, ch) => {
      if (!acc[ch.type]) {
        acc[ch.type] = [];
      }
      acc[ch.type].push(ch);
      return acc;
    }, {});

    res.json({
      success: true,
      data: channels,
      grouped,
      count: channels.length
    });
  } catch (error) {
    console.error('Error fetching tenant channels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenant channels'
    });
  }
});

// Get channel types summary
router.get('/types/summary', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;

    const matchStage: Record<string, any> = {};
    if (tenantId) matchStage.tenantId = tenantId;

    const summary = await Channel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          inactive: {
            $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          type: '$_id',
          total: '$count',
          active: 1,
          inactive: 1,
          _id: 0
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching channel summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channel summary'
    });
  }
});

export default router;
