import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Channel, Platform } from '../models/Channel';

const router = Router();

// Validation schemas
const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  platform: z.enum(['instagram', 'telegram', 'facebook', 'twitter']),
  credentials: z.record(z.string()).optional(),
  settings: z.object({
    autoReply: z.boolean().optional(),
    autoReplyDelay: z.number().optional(),
    notifications: z.boolean().optional(),
    syncInterval: z.number().optional()
  }).optional(),
  metadata: z.record(z.string()).optional()
});

const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  credentials: z.record(z.string()).optional(),
  settings: z.object({
    autoReply: z.boolean().optional(),
    autoReplyDelay: z.number().optional(),
    notifications: z.boolean().optional(),
    syncInterval: z.number().optional()
  }).optional(),
  status: z.enum(['active', 'inactive', 'error', 'pending']).optional(),
  metadata: z.record(z.string()).optional()
});

// Get all channels
router.get('/', async (_req: Request, res: Response) => {
  try {
    const channels = await Channel.find().sort({ createdAt: -1 });

    const formattedChannels = channels.map(channel => ({
      id: channel._id,
      name: channel.name,
      platform: channel.platform,
      status: channel.status,
      webhookUrl: channel.webhookUrl,
      settings: channel.settings,
      metadata: Object.fromEntries(channel.metadata || new Map()),
      lastSync: channel.lastSync,
      errorMessage: channel.errorMessage,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt
    }));

    res.json({
      success: true,
      data: formattedChannels,
      count: channels.length
    });
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channels'
    });
  }
});

// Get channels by platform
router.get('/platform/:platform', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const validPlatforms: Platform[] = ['instagram', 'telegram', 'facebook', 'twitter'];

    if (!validPlatforms.includes(platform as Platform)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid platform. Must be one of: instagram, telegram, facebook, twitter'
      });
    }

    const channels = await Channel.find({ platform }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: channels,
      count: channels.length
    });
  } catch (error) {
    console.error('Error fetching channels by platform:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channels'
    });
  }
});

// Get single channel
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const channel = await Channel.findById(req.params.id);

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: channel._id,
        name: channel.name,
        platform: channel.platform,
        credentials: Object.fromEntries(channel.credentials || new Map()),
        status: channel.status,
        webhookUrl: channel.webhookUrl,
        settings: channel.settings,
        metadata: Object.fromEntries(channel.metadata || new Map()),
        lastSync: channel.lastSync,
        errorMessage: channel.errorMessage,
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching channel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channel'
    });
  }
});

// Create channel
router.post('/', async (req: Request, res: Response) => {
  try {
    const validationResult = createChannelSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationResult.error.errors
      });
    }

    const { name, platform, credentials, settings, metadata } = validationResult.data;

    // Check if channel already exists for this platform
    const existingChannel = await Channel.findOne({ name, platform });
    if (existingChannel) {
      return res.status(409).json({
        success: false,
        error: 'Channel with this name already exists for this platform'
      });
    }

    const channel = new Channel({
      name,
      platform,
      credentials: credentials || {},
      settings: settings || {},
      metadata: metadata || {},
      status: 'pending'
    });

    await channel.save();

    res.status(201).json({
      success: true,
      message: 'Channel created successfully',
      data: {
        id: channel._id,
        name: channel.name,
        platform: channel.platform,
        status: channel.status,
        webhookUrl: channel.webhookUrl,
        settings: channel.settings,
        metadata: Object.fromEntries(channel.metadata || new Map()),
        createdAt: channel.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating channel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create channel'
    });
  }
});

// Update channel
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const validationResult = updateChannelSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationResult.error.errors
      });
    }

    const channel = await Channel.findById(req.params.id);

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    const { name, credentials, settings, status, metadata } = validationResult.data;

    if (name !== undefined) channel.name = name;
    if (credentials !== undefined) {
      Object.entries(credentials).forEach(([key, value]) => {
        channel.credentials.set(key, value);
      });
    }
    if (settings !== undefined) {
      Object.assign(channel.settings, settings);
    }
    if (status !== undefined) channel.status = status;
    if (metadata !== undefined) {
      Object.entries(metadata).forEach(([key, value]) => {
        channel.metadata.set(key, value);
      });
    }

    await channel.save();

    res.json({
      success: true,
      message: 'Channel updated successfully',
      data: {
        id: channel._id,
        name: channel.name,
        platform: channel.platform,
        status: channel.status,
        webhookUrl: channel.webhookUrl,
        settings: channel.settings,
        metadata: Object.fromEntries(channel.metadata || new Map()),
        updatedAt: channel.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating channel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update channel'
    });
  }
});

// Delete channel
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const channel = await Channel.findByIdAndDelete(req.params.id);

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

// Activate channel
router.post('/:id/activate', async (req: Request, res: Response) => {
  try {
    const channel = await Channel.findById(req.params.id);

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    channel.status = 'active';
    channel.errorMessage = undefined;
    await channel.save();

    res.json({
      success: true,
      message: 'Channel activated successfully',
      data: {
        id: channel._id,
        status: channel.status
      }
    });
  } catch (error) {
    console.error('Error activating channel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate channel'
    });
  }
});

// Deactivate channel
router.post('/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const channel = await Channel.findById(req.params.id);

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    channel.status = 'inactive';
    await channel.save();

    res.json({
      success: true,
      message: 'Channel deactivated successfully',
      data: {
        id: channel._id,
        status: channel.status
      }
    });
  } catch (error) {
    console.error('Error deactivating channel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate channel'
    });
  }
});

// Get channel status summary
router.get('/stats/summary', async (_req: Request, res: Response) => {
  try {
    const stats = await Channel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const platformStats = await Channel.aggregate([
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        byStatus: stats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {} as Record<string, number>),
        byPlatform: platformStats.reduce((acc, stat) => {
          acc[stat._id] = {
            total: stat.count,
            active: stat.active
          };
          return acc;
        }, {} as Record<string, { total: number; active: number }>)
      }
    });
  } catch (error) {
    console.error('Error fetching channel stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channel stats'
    });
  }
});

export default router;