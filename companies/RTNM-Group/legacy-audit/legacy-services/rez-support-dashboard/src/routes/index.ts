import { Router } from 'express';
import { ConversationService } from '../services/conversationService.js';
import { AnalyticsService } from '../services/analyticsService.js';
import { AggregatorService } from '../services/aggregator.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitMiddleware } from '../middleware/rateLimit.js';
import { ChannelType, ConversationStatus, Priority, ReplyInput } from '../types/index.js';

const router = Router();
const conversationService = new ConversationService();
const analyticsService = new AnalyticsService();
const aggregatorService = new AggregatorService();

// Apply rate limiting and auth to all routes
router.use(rateLimitMiddleware);
router.use(authMiddleware);

// Inbox - Conversations
router.get('/inbox/conversations', async (req, res) => {
  try {
    const { channel, status, priority, agentId, search, page, limit } = req.query;

    const result = await conversationService.getConversations({
      channel: channel as ChannelType | undefined,
      status: status as ConversationStatus | undefined,
      priority: priority as Priority | undefined,
      agentId: agentId as string | undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.get('/inbox/conversations/:id', async (req, res) => {
  try {
    const conversation = await conversationService.getConversation(req.params.id);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

router.post('/inbox/conversations', async (req, res) => {
  try {
    const conversation = await conversationService.createConversation(req.body);
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

router.post('/inbox/conversations/:id/reply', async (req, res) => {
  try {
    const { content, attachments } = req.body as ReplyInput;
    const agentId = req.headers['x-agent-id'] as string || 'system';
    const agentName = req.headers['x-agent-name'] as string || 'System';

    const conversation = await conversationService.reply(req.params.id, { content, attachments }, agentId, agentName);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reply' });
  }
});

router.patch('/inbox/conversations/:id/assign', async (req, res) => {
  try {
    const { agentId, agentName } = req.body;
    const conversation = await conversationService.assignAgent(req.params.id, agentId, agentName);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign agent' });
  }
});

router.patch('/inbox/conversations/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const conversation = await conversationService.updateStatus(req.params.id, status);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.patch('/inbox/conversations/:id/priority', async (req, res) => {
  try {
    const { priority } = req.body;
    const conversation = await conversationService.updatePriority(req.params.id, priority);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update priority' });
  }
});

router.patch('/inbox/conversations/:id/tags', async (req, res) => {
  try {
    const { tags } = req.body;
    const conversation = await conversationService.addTags(req.params.id, tags);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tags' });
  }
});

router.patch('/inbox/conversations/:id/read', async (req, res) => {
  try {
    const conversation = await conversationService.markAsRead(req.params.id);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Analytics
router.get('/inbox/analytics', async (_req, res) => {
  try {
    const analytics = await analyticsService.getDashboardAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/inbox/agents/stats', async (_req, res) => {
  try {
    const stats = await analyticsService.getAgentStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agent stats' });
  }
});

router.get('/inbox/queue', async (_req, res) => {
  try {
    const queue = await analyticsService.getQueueByChannel();
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// Sync
router.post('/inbox/sync', async (_req, res) => {
  try {
    const result = await aggregatorService.syncAllConversations();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync conversations' });
  }
});

export default router;
