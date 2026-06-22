/**
 * Ticket Routes - Express routes for ticket operations
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ticketService, CreateTicketInput } from '../services/ticketService';
import { TicketStatus, TicketPriority, TicketCategory } from '../models/Ticket';
import { AssignmentType } from '../models/Assignment';
import { CommentType } from '../models/Comment';
import logger from 'utils/logger.js';

export const ticketRoutes = Router();

// Validation schemas
const createTicketSchema = z.object({
  subject: z.string().min(1).max(500),
  description: z.string().min(1),
  priority: z.nativeEnum(TicketPriority).optional(),
  category: z.nativeEnum(TicketCategory),
  customerId: z.string().min(1),
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  tags: z.array(z.string()).optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string(),
    size: z.number(),
  })).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateTicketSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const assignTicketSchema = z.object({
  assignedBy: z.string().min(1),
  assignedTo: z.string().min(1),
  assignedTeam: z.string().optional(),
  type: z.nativeEnum(AssignmentType),
  reason: z.string().optional(),
});

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
 * POST /api/tickets
 * Create a new ticket
 */
ticketRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const validated = createTicketSchema.parse(req.body);
    const ticket = await ticketService.createTicket(validated as CreateTicketInput);
    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    logger.error('Failed to create ticket', { error });
    res.status(500).json({ success: false, error: 'Failed to create ticket' });
  }
});

/**
 * GET /api/tickets
 * Get all tickets with filters
 */
ticketRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const { status, priority, category, assignedTo, assignedTeam, customerId, page = '1', limit = '20', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const filter = {
      status: status as TicketStatus | undefined,
      priority: priority as TicketPriority | undefined,
      category: category as TicketCategory | undefined,
      assignedTo: assignedTo as string | undefined,
      assignedTeam: assignedTeam as string | undefined,
      customerId: customerId as string | undefined,
    };

    const result = await ticketService.getTickets(filter, {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to get tickets', { error });
    res.status(500).json({ success: false, error: 'Failed to get tickets' });
  }
});

/**
 * GET /api/tickets/:id
 * Get ticket by ID
 */
ticketRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const ticket = await ticketService.getTicketById(req.params.id);
    if (!ticket) {
      res.status(404).json({ success: false, error: 'Ticket not found' });
      return;
    }
    res.json({ success: true, data: ticket });
  } catch (error) {
    logger.error('Failed to get ticket', { error, ticketId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to get ticket' });
  }
});

/**
 * PUT /api/tickets/:id
 * Update ticket
 */
ticketRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const validated = updateTicketSchema.parse(req.body);
    const ticket = await ticketService.updateTicket(req.params.id, validated);
    if (!ticket) {
      res.status(404).json({ success: false, error: 'Ticket not found' });
      return;
    }
    res.json({ success: true, data: ticket });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    logger.error('Failed to update ticket', { error, ticketId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to update ticket' });
  }
});

/**
 * POST /api/tickets/:id/assign
 * Assign ticket to agent or team
 */
ticketRoutes.post('/:id/assign', async (req: Request, res: Response) => {
  try {
    const validated = assignTicketSchema.parse(req.body);
    const assignment = await ticketService.assignTicket(
      req.params.id,
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
    res.json({ success: true, data: assignment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    logger.error('Failed to assign ticket', { error, ticketId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to assign ticket' });
  }
});

/**
 * POST /api/tickets/:id/respond
 * Add response/comment to ticket
 */
ticketRoutes.post('/:id/respond', async (req: Request, res: Response) => {
  try {
    const validated = commentSchema.parse(req.body);
    const comment = await ticketService.addComment(
      req.params.id,
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
    logger.error('Failed to add comment', { error, ticketId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to add comment' });
  }
});

/**
 * GET /api/tickets/:id/comments
 * Get ticket comments
 */
ticketRoutes.get('/:id/comments', async (req: Request, res: Response) => {
  try {
    const includeInternal = req.query.includeInternal === 'true';
    const comments = await ticketService.getTicketComments(req.params.id, includeInternal);
    res.json({ success: true, data: comments });
  } catch (error) {
    logger.error('Failed to get comments', { error, ticketId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to get comments' });
  }
});

/**
 * GET /api/tickets/:id/assignments
 * Get ticket assignment history
 */
ticketRoutes.get('/:id/assignments', async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.activeOnly !== 'true';
    const assignments = await ticketService.getTicketAssignments(req.params.id, activeOnly);
    res.json({ success: true, data: assignments });
  } catch (error) {
    logger.error('Failed to get assignments', { error, ticketId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to get assignments' });
  }
});

/**
 * POST /api/tickets/:id/resolve
 * Resolve ticket
 */
ticketRoutes.post('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { resolution } = req.body;
    const ticket = await ticketService.resolveTicket(req.params.id, resolution);
    if (!ticket) {
      res.status(404).json({ success: false, error: 'Ticket not found' });
      return;
    }
    res.json({ success: true, data: ticket });
  } catch (error) {
    logger.error('Failed to resolve ticket', { error, ticketId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to resolve ticket' });
  }
});

/**
 * POST /api/tickets/:id/close
 * Close ticket
 */
ticketRoutes.post('/:id/close', async (req: Request, res: Response) => {
  try {
    const ticket = await ticketService.closeTicket(req.params.id);
    if (!ticket) {
      res.status(404).json({ success: false, error: 'Ticket not found' });
      return;
    }
    res.json({ success: true, data: ticket });
  } catch (error) {
    logger.error('Failed to close ticket', { error, ticketId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to close ticket' });
  }
});

/**
 * GET /api/tickets/stats
 * Get ticket statistics
 */
ticketRoutes.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await ticketService.getStatistics();
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Failed to get statistics', { error });
    res.status(500).json({ success: false, error: 'Failed to get statistics' });
  }
});

export default ticketRoutes;