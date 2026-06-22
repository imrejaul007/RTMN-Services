import { Router, Request, Response } from 'express';
import { FlowExecutor } from '../services';
import { Conversation, Message } from '../models';

const router = Router();

// Initialize FlowExecutor (would need Redis in production)
let flowExecutor: FlowExecutor | null = null;

const getFlowExecutor = (): FlowExecutor => {
  if (!flowExecutor) {
    // In production, pass Redis client
    flowExecutor = new FlowExecutor(null as any);
  }
  return flowExecutor;
};

// Start conversation
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { botId, userId, channel, metadata } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!botId || !userId || !channel) {
      return res.status(400).json({
        success: false,
        error: 'botId, userId, and channel are required'
      });
    }

    const executor = getFlowExecutor();
    const conversation = await executor.startConversation(
      botId,
      tenantId,
      userId,
      channel,
      metadata
    );

    res.status(201).json({ success: true, data: conversation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process message
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { sessionId, message, metadata } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and message are required'
      });
    }

    const executor = getFlowExecutor();
    const result = await executor.processMessage(sessionId, message, metadata);

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get conversation by session
router.get('/session/:sessionId', async (req: res: Response) => {
  try {
    const conversation = await Conversation.findOne({
      sessionId: req.params.sessionId
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    res.json({ success: true, data: conversation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get conversation messages
router.get('/:id/messages', async (req: res: Response) => {
  try {
    const { limit, before } = req.query;

    const messages = await Message.findByConversation(
      req.params.id,
      limit ? parseInt(limit as string) : 50,
      before ? new Date(before as string) : undefined
    );

    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get active conversations for user
router.get('/user/:userId', async (req: res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const conversations = await Conversation.find({
      userId: req.params.userId,
      tenantId,
      status: 'active'
    }).sort({ lastActivityAt: -1 });

    res.json({ success: true, data: conversations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// End conversation
router.post('/:id/end', async (req: res: Response) => {
  try {
    const { endedBy, reason } = req.body;

    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    await conversation.end(endedBy || 'bot', reason);

    res.json({ success: true, data: conversation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Transfer to agent
router.post('/:id/transfer', async (req: res: Response) => {
  try {
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ success: false, error: 'Agent ID required' });
    }

    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    await conversation.transferToAgent(agentId);

    res.json({ success: true, data: conversation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get conversation statistics
router.get('/stats/summary', async (req: res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { botId } = req.query;

    const match: any = { tenantId };
    if (botId) match.botId = botId;

    const stats = await Conversation.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      active: 0,
      ended: 0,
      handoff: 0,
      total: 0
    };

    stats.forEach((s) => {
      result[s._id as keyof typeof result] = s.count;
      result.total += s.count;
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
