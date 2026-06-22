/**
 * Escalation Routes - Express routes for escalation operations
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { escalationService } from '../services/escalationService';
import { EscalationLevel, EscalationReason, EscalationStatus } from '../models/Escalation';
import logger from '../utils/logger';

export const escalationRoutes = Router();

// Validation schemas
const createEscalationSchema = z.object({
  ticketId: z.string().min(1),
  targetLevel: z.nativeEnum(EscalationLevel),
  reason: z.nativeEnum(EscalationReason),
  triggeredBy: z.string().min(1),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const escalateSchema = z.object({
  targetLevel: z.nativeEnum(EscalationLevel),
  escalatedBy: z.string().min(1),
  notes: z.string().optional(),
  assignedTo: z.string().optional(),
  assignedTeam: z.string().optional(),
});

const resolveSchema = z.object({
  resolvedBy: z.string().min(1),
  notes: z.string().optional(),
});

const cancelSchema = z.object({
  cancelledBy: z.string().min(1),
  reason: z.string().optional(),
});

/**
 * POST /api/escalations
 * Create a new escalation
 */
escalationRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const validated = createEscalationSchema.parse(req.body);
    const escalation = await escalationService.createEscalation(validated);
    res.status(201).json({ success: true, data: escalation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    logger.error('Failed to create escalation', { error });
    res.status(500).json({ success: false, error: 'Failed to create escalation' });
  }
});

/**
 * GET /api/escalations
 * Get all escalations with filters
 */
escalationRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const {
      status,
      ticketId,
      currentLevel,
      assignedTo,
      assignedTeam,
      page = '1',
      limit = '20',
    } = req.query;

    const filter = {
      status: status as EscalationStatus | undefined,
      ticketId: ticketId as string | undefined,
      currentLevel: currentLevel as EscalationLevel | undefined,
      assignedTo: assignedTo as string | undefined,
      assignedTeam: assignedTeam as string | undefined,
    };

    const result = await escalationService.getEscalations(
      filter,
      parseInt(page as string, 10),
      parseInt(limit as string, 10)
    );

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to get escalations', { error });
    res.status(500).json({ success: false, error: 'Failed to get escalations' });
  }
});

/**
 * GET /api/escalations/:id
 * Get escalation by ID
 */
escalationRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const escalation = await escalationService.getEscalationById(req.params.id);
    if (!escalation) {
      res.status(404).json({ success: false, error: 'Escalation not found' });
      return;
    }
    res.json({ success: true, data: escalation });
  } catch (error) {
    logger.error('Failed to get escalation', { error, escalationId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to get escalation' });
  }
});

/**
 * POST /api/escalations/:id/escalate
 * Escalate to next level
 */
escalationRoutes.post('/:id/escalate', async (req: Request, res: Response) => {
  try {
    const validated = escalateSchema.parse(req.body);
    const escalation = await escalationService.escalate(
      req.params.id,
      validated.targetLevel,
      validated.escalatedBy,
      validated.notes,
      validated.assignedTo,
      validated.assignedTeam
    );
    if (!escalation) {
      res.status(404).json({ success: false, error: 'Escalation not found' });
      return;
    }
    res.json({ success: true, data: escalation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    logger.error('Failed to escalate', { error, escalationId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to escalate' });
  }
});

/**
 * POST /api/escalations/:id/resolve
 * Resolve escalation
 */
escalationRoutes.post('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const validated = resolveSchema.parse(req.body);
    const escalation = await escalationService.resolveEscalation(
      req.params.id,
      validated.resolvedBy,
      validated.notes
    );
    if (!escalation) {
      res.status(404).json({ success: false, error: 'Escalation not found' });
      return;
    }
    res.json({ success: true, data: escalation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    logger.error('Failed to resolve escalation', { error, escalationId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to resolve escalation' });
  }
});

/**
 * POST /api/escalations/:id/cancel
 * Cancel escalation
 */
escalationRoutes.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const validated = cancelSchema.parse(req.body);
    const escalation = await escalationService.cancelEscalation(
      req.params.id,
      validated.cancelledBy,
      validated.reason
    );
    if (!escalation) {
      res.status(404).json({ success: false, error: 'Escalation not found' });
      return;
    }
    res.json({ success: true, data: escalation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    logger.error('Failed to cancel escalation', { error, escalationId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to cancel escalation' });
  }
});

/**
 * GET /api/escalations/:id/history
 * Get escalation history
 */
escalationRoutes.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const history = await escalationService.getEscalationHistory(req.params.id);
    res.json({ success: true, data: history });
  } catch (error) {
    logger.error('Failed to get history', { error, escalationId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to get history' });
  }
});

/**
 * GET /api/escalations/ticket/:ticketId/history
 * Get ticket escalation history
 */
escalationRoutes.get('/ticket/:ticketId/history', async (req: Request, res: Response) => {
  try {
    const history = await escalationService.getTicketEscalationHistory(req.params.ticketId);
    res.json({ success: true, data: history });
  } catch (error) {
    logger.error('Failed to get ticket history', { error, ticketId: req.params.ticketId });
    res.status(500).json({ success: false, error: 'Failed to get history' });
  }
});

/**
 * POST /api/escalations/evaluate
 * Evaluate rules and trigger escalations (for internal use)
 */
escalationRoutes.post('/evaluate', async (req: Request, res: Response) => {
  try {
    const ticketData = req.body;
    const escalations = await escalationService.evaluateAndEscalate(ticketData);
    res.json({ success: true, data: escalations });
  } catch (error) {
    logger.error('Failed to evaluate escalations', { error });
    res.status(500).json({ success: false, error: 'Failed to evaluate' });
  }
});

export default escalationRoutes;