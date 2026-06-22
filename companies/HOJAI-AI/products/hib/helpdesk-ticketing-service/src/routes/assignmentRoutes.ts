/**
 * Assignment Routes - Express routes for assignment operations
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ticketService } from '../services/ticketService';
import { AssignmentType } from '../models/Assignment';
import logger from 'utils/logger.js';

export const assignmentRoutes = Router();

const assignSchema = z.object({
  assignedBy: z.string().min(1),
  assignedTo: z.string().min(1),
  assignedTeam: z.string().optional(),
  type: z.nativeEnum(AssignmentType),
  reason: z.string().optional(),
});

/**
 * GET /api/tickets/:ticketId/assignments
 * Get assignment history for a ticket
 */
assignmentRoutes.get('/:ticketId/assignments', async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.activeOnly !== 'false';
    const assignments = await ticketService.getTicketAssignments(req.params.ticketId, activeOnly);
    res.json({ success: true, data: assignments });
  } catch (error) {
    logger.error('Failed to get assignments', { error, ticketId: req.params.ticketId });
    res.status(500).json({ success: false, error: 'Failed to get assignments' });
  }
});

/**
 * POST /api/tickets/:ticketId/assignments
 * Assign ticket to agent or team
 */
assignmentRoutes.post('/:ticketId/assignments', async (req: Request, res: Response) => {
  try {
    const validated = assignSchema.parse(req.body);
    const assignment = await ticketService.assignTicket(
      req.params.ticketId,
      validated.assignedBy,
      validated.assignedTo,
      validated.type,
      validated.reason,
      validated.assignedTeam
    );
    if (!assignment) {
      res.status(404).json({ success: false, error: 'Ticket not found' });
      return;
    }
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    logger.error('Failed to assign ticket', { error, ticketId: req.params.ticketId });
    res.status(500).json({ success: false, error: 'Failed to assign ticket' });
  }
});

export default assignmentRoutes;