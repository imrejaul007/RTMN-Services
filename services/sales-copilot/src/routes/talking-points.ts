import { Router, Request, Response } from 'express';
import { generateTalkingPoints } from '../services/talkingPoints';
import { ApiResponse, TalkingPoint } from '../types';

const router = Router();

/**
 * GET /api/sales/talking-points/:leadId
 * Generate AI-powered talking points for a specific lead
 */
router.get('/talking-points/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const { context, industry, recentNotes } = req.query;

    if (!leadId) {
      const response: ApiResponse = {
        success: false,
        error: 'Lead ID is required'
      };
      return res.status(400).json(response);
    }

    const talkingPoints = await generateTalkingPoints({
      leadId,
      context: context as string | undefined,
      industry: industry as string | undefined,
      recentNotes: recentNotes as string | undefined
    });

    const response: ApiResponse<TalkingPoint[]> = {
      success: true,
      data: talkingPoints,
      message: `Generated ${talkingPoints.length} talking points for lead ${leadId}`
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate talking points'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/sales/talking-points/:leadId/context
 * Get talking points based on conversation history
 */
router.get('/talking-points/:leadId/context', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const { limit } = req.query;

    // Get conversation history
    const { Conversation } = await import('../models/Conversation');
    const conversations = await Conversation.find({ leadId })
      .sort({ createdAt: -1 })
      .limit(Number(limit) || 5);

    const context = conversations.map(c => ({
      type: c.type,
      content: c.content,
      sentiment: c.sentiment,
      date: c.createdAt
    }));

    const response: ApiResponse = {
      success: true,
      data: context
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get context'
    };
    res.status(500).json(response);
  }
});

export default router;
