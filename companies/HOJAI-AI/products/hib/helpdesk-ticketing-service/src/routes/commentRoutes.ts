/**
 * Comment Routes - Express routes for comment operations
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ticketService } from '../services/ticketService';
import { CommentType } from '../models/Comment';
import logger from 'utils/logger.js';

export const commentRoutes = Router();

const commentSchema = z.object({
  content: z.string().min(1),
  author: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email(),
    role: z.enum(['customer', 'agent', 'admin', 'system']),
  }),
  type: z.nativeEnum(CommentType).optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string(),
    size: z.number(),
  })).optional(),
});

/**
 * GET /api/tickets/:ticketId/comments
 * Get all comments for a ticket
 */
commentRoutes.get('/:ticketId/comments', async (req: Request, res: Response) => {
  try {
    const includeInternal = req.query.includeInternal === 'true';
    const comments = await ticketService.getTicketComments(req.params.ticketId, includeInternal);
    res.json({ success: true, data: comments });
  } catch (error) {
    logger.error('Failed to get comments', { error, ticketId: req.params.ticketId });
    res.status(500).json({ success: false, error: 'Failed to get comments' });
  }
});

/**
 * POST /api/tickets/:ticketId/comments
 * Add a comment to a ticket
 */
commentRoutes.post('/:ticketId/comments', async (req: Request, res: Response) => {
  try {
    const validated = commentSchema.parse(req.body);
    const comment = await ticketService.addComment(
      req.params.ticketId,
      validated.content,
      validated.author,
      validated.type || CommentType.PUBLIC,
      validated.attachments
    );
    if (!comment) {
      res.status(404).json({ success: false, error: 'Ticket not found' });
      return;
    }
    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    logger.error('Failed to add comment', { error, ticketId: req.params.ticketId });
    res.status(500).json({ success: false, error: 'Failed to add comment' });
  }
});

export default commentRoutes;