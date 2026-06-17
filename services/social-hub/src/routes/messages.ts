import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SocialMessage, MessageType, MessageDirection } from '../models/SocialMessage';
import { Channel, Platform } from '../models/Channel';

const router = Router();

// Validation schemas
const sendMessageSchema = z.object({
  platform: z.enum(['instagram', 'telegram', 'facebook', 'twitter']),
  recipientId: z.string().min(1),
  content: z.object({
    type: z.enum(['text', 'image', 'video', 'audio', 'document']).default('text'),
    text: z.string().optional(),
    mediaUrl: z.string().url().optional(),
    caption: z.string().optional()
  }),
  channelId: z.string().optional()
});

const updateMessageSchema = z.object({
  status: z.enum(['received', 'processing', 'processed', 'failed', 'sent', 'delivered', 'read']).optional(),
  customerId: z.string().optional(),
  processed: z.boolean().optional(),
  tags: z.array(z.string()).optional()
});

// Get all messages with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      platform,
      channelId,
      threadId,
      customerId,
      direction,
      status,
      processed,
      limit = 50,
      offset = 0
    } = req.query;

    const filter: Record<string, unknown> = {};

    if (platform) filter.platform = platform;
    if (channelId) filter.channelId = channelId;
    if (threadId) filter.threadId = threadId;
    if (customerId) filter.customerId = customerId;
    if (direction) filter.direction = direction;
    if (status) filter.status = status;
    if (processed !== undefined) filter.processed = processed === 'true';

    const messages = await SocialMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .populate('channelId', 'name platform status');

    const total = await SocialMessage.countDocuments(filter);

    res.json({
      success: true,
      data: messages,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + messages.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// Get single message
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const message = await SocialMessage.findById(req.params.id)
      .populate('channelId', 'name platform status');

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch message'
    });
  }
});

// Get messages by thread
router.get('/thread/:threadId', async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;
    const { limit = 100 } = req.query;

    const messages = await SocialMessage.find({ threadId })
      .sort({ createdAt: 1 })
      .limit(Number(limit))
      .populate('channelId', 'name platform status');

    res.json({
      success: true,
      data: messages,
      count: messages.length
    });
  } catch (error) {
    console.error('Error fetching thread messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch thread messages'
    });
  }
});

// Get messages by sender
router.get('/sender/:senderId', async (req: Request, res: Response) => {
  try {
    const { senderId } = req.params;
    const { platform, limit = 50 } = req.query;

    const filter: Record<string, unknown> = { senderId };
    if (platform) filter.platform = platform;

    const messages = await SocialMessage.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('channelId', 'name platform status');

    // Group by thread
    const threads = messages.reduce((acc, msg) => {
      if (!acc[msg.threadId]) {
        acc[msg.threadId] = [];
      }
      acc[msg.threadId].push(msg);
      return acc;
    }, {} as Record<string, typeof messages>);

    res.json({
      success: true,
      data: {
        threads,
        totalMessages: messages.length
      }
    });
  } catch (error) {
    console.error('Error fetching sender messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sender messages'
    });
  }
});

// Send message
router.post('/send', async (req: Request, res: Response) => {
  try {
    const validationResult = sendMessageSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationResult.error.errors
      });
    }

    const { platform, recipientId, content, channelId } = validationResult.data;

    // Find channel
    let channel;
    if (channelId) {
      channel = await Channel.findById(channelId);
    } else {
      channel = await Channel.findOne({ platform, status: 'active' });
    }

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'No active channel found for this platform'
      });
    }

    // Import connectors dynamically based on platform
    let result: { success: boolean; messageId?: string; error?: string };

    switch (platform) {
      case 'instagram':
        const { default: instagramConnector } = await import('../connectors/instagram');
        result = await instagramConnector.sendMessage(channel, recipientId, content);
        break;
      case 'telegram':
        const { default: telegramConnector } = await import('../connectors/telegram');
        result = await telegramConnector.sendMessage(channel, recipientId, content);
        break;
      case 'facebook':
        const { default: facebookConnector } = await import('../connectors/facebook');
        result = await facebookConnector.sendMessage(channel, recipientId, content);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported platform: ${platform}`
        });
    }

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send message'
      });
    }

    // Store sent message
    const threadId = `${platform}-${channel._id}-${recipientId}`;
    const message = new SocialMessage({
      platform,
      platformMessageId: result.messageId || `outbound-${Date.now()}`,
      senderId: recipientId,
      recipientId: channel.metadata.get('userId') || 'self',
      channelId: channel._id,
      content: {
        type: content.type,
        text: content.text,
        mediaUrl: content.mediaUrl,
        caption: content.caption
      },
      threadId,
      direction: 'outbound',
      status: 'sent',
      processed: true,
      processedAt: new Date()
    });

    await message.save();

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        id: message._id,
        platformMessageId: message.platformMessageId,
        threadId: message.threadId
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

// Update message
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const validationResult = updateMessageSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationResult.error.errors
      });
    }

    const message = await SocialMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    const { status, customerId, processed, tags } = validationResult.data;

    if (status !== undefined) {
      message.status = status;
      if (status === 'read' || status === 'processed') {
        message.processed = true;
        message.processedAt = new Date();
      }
    }

    if (customerId !== undefined) message.customerId = customerId;
    if (processed !== undefined) {
      message.processed = processed;
      if (processed) message.processedAt = new Date();
    }
    if (tags !== undefined) {
      message.metadata.set('tags', tags);
    }

    await message.save();

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: message
    });
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update message'
    });
  }
});

// Mark thread as read
router.post('/thread/:threadId/read', async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;

    const result = await SocialMessage.markThreadAsRead(threadId);

    res.json({
      success: true,
      message: 'Thread marked as read',
      data: { threadId }
    });
  } catch (error) {
    console.error('Error marking thread as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark thread as read'
    });
  }
});

// Get unread count
router.get('/stats/unread', async (req: Request, res: Response) => {
  try {
    const { platform, channelId } = req.query;

    const filter: Record<string, unknown> = {
      direction: 'inbound',
      status: { $ne: 'read' },
      processed: false
    };

    if (platform) filter.platform = platform;
    if (channelId) filter.channelId = channelId;

    const count = await SocialMessage.countDocuments(filter);

    // Also get by platform
    const byPlatform = await SocialMessage.aggregate([
      {
        $match: {
          direction: 'inbound',
          status: { $ne: 'read' },
          processed: false
        }
      },
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        total: count,
        byPlatform: byPlatform.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {} as Record<string, number>)
      }
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unread count'
    });
  }
});

// Delete message
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const message = await SocialMessage.findByIdAndDelete(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message'
    });
  }
});

export default router;