import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Conversation } from '../models/Conversation';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const conversation = new Conversation({ conversationId: uuidv4(), userId: req.userId, orgId: req.orgId, clientId: req.clientId, mode: req.body.mode || 'chat', messages: [], isActive: true });
    await conversation.save();
    res.status(201).json(conversation);
  } catch (error) { logger.error('Error creating conversation:', error); res.status(500).json({ error: 'Failed to create conversation' }); }
});

router.post('/:conversationId/messages', async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    const conversation = await Conversation.findOne({ conversationId: req.params.conversationId, orgId: req.orgId, clientId: req.clientId });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    conversation.messages.push({ role: 'user', content, timestamp: new Date() });
    conversation.messages.push({ role: 'assistant', content: `AI response to: ${content}`, timestamp: new Date() });
    conversation.lastMessageAt = new Date();
    await conversation.save();
    res.json({ userMessage: conversation.messages[conversation.messages.length - 2], assistantMessage: conversation.messages[conversation.messages.length - 1] });
  } catch (error) { logger.error('Error sending message:', error); res.status(500).json({ error: 'Failed to send message' }); }
});

router.get('/:conversationId', async (req: AuthRequest, res: Response) => {
  try {
    const conversation = await Conversation.findOne({ conversationId: req.params.conversationId, orgId: req.orgId, clientId: req.clientId });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    res.json(conversation);
  } catch (error) { logger.error('Error fetching conversation:', error); res.status(500).json({ error: 'Failed to fetch conversation' }); }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const conversations = await Conversation.find({ orgId: req.orgId, clientId: req.clientId, userId: req.userId }).sort({ lastMessageAt: -1 }).limit(20);
    res.json({ conversations, total: conversations.length });
  } catch (error) { logger.error('Error listing conversations:', error); res.status(500).json({ error: 'Failed to list conversations' }); }
});

export default router;
