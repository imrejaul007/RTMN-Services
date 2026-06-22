import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { memoryService } from '../services/memoryService.js';

const router = express.Router();

const AddMessageSchema = z.object({
  conversationId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  attachments: z.array(z.object({
    type: z.enum(['image', 'document', 'link']),
    url: z.string()
  })).optional(),
  aiMetadata: z.object({
    model: z.string().optional(),
    tokens: z.number().optional(),
    confidence: z.number().optional(),
    intent: z.string().optional()
  }).optional()
});

/**
 * GET /api/conversations
 * Get conversation
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const { userId, conversationId } = req.query;

    const conversation = await memoryService.getConversation({
      tenantId,
      userId: userId as string,
      conversationId: conversationId as string
    });

    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    res.json({ success: true, data: conversation });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/conversations/messages
 * Add message to conversation
 */
router.post('/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const validated = AddMessageSchema.parse(req.body);
    const message = await memoryService.addMessage({
      tenantId,
      conversationId: validated.conversationId,
      message: {
        role: validated.role,
        content: validated.content,
        attachments: validated.attachments,
        aiMetadata: validated.aiMetadata
      }
    });

    res.status(201).json({ success: true, data: message });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    next(error);
  }
});

export default router;
