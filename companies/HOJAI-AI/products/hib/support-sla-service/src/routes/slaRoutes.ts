/**
 * SLA Routes - Express routes for SLA operations
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { slaService } from '../services/slaService';
import { alertService } from '../services/alertService';
import { SLAStatus, SLAType, SLAPriority } from '../models/SLA';
import { BreachSeverity } from '../models/Breach';
import { AlertType, AlertChannel } from '../models/Alert';
import logger from '../utils/logger';

export const slaRoutes = Router();

// Validation schemas
const createSlaSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  type: z.nativeEnum(SLAType),
  priority: z.nativeEnum(SLAPriority),
  category: z.string().optional(),
  targetHours: z.number().min(0),
  warningThreshold: z.number().min(0).max(100).optional(),
  ticketId: z.string().optional(),
  dueAt: z.string().datetime(),
});

const updateSlaSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  targetHours: z.number().min(0).optional(),
  warningThreshold: z.number().min(0).max(100).optional(),
  dueAt: z.string().datetime().optional(),
});

const createAlertSchema = z.object({
  slaId: z.string().min(1),
  ticketId: z.string().min(1),
  type: z.nativeEnum(AlertType),
  channel: z.nativeEnum(AlertChannel),
  recipient: z.string().min(1),
  subject: z.string().min(1),
  message: z.string().min(1),
});

/**
 * POST /api/sla
 * Create a new SLA
 */
slaRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const validated = createSlaSchema.parse(req.body);
    validated.dueAt = new Date(validated.dueAt);
    const sla = await slaService.createSLA(validated);
    res.status(201).json({ success: true, data: sla });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    logger.error('Failed to create SLA', { error });
    res.status(500).json({ success: false, error: 'Failed to create SLA' });
  }
});

/**
 * GET /api/sla
 * Get all SLAs with filters
 */
slaRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const {
      status,
      type,
      priority,
      category,
      ticketId,
      dueBefore,
      dueAfter,
      page = '1',
      limit = '20',
    } = req.query;

    const filter = {
      status: status as SLAStatus | undefined,
      type: type as SLAType | undefined,
      priority: priority as SLAPriority | undefined,
      category: category as string | undefined,
      ticketId: ticketId as string | undefined,
      dueBefore: dueBefore ? new Date(dueBefore as string) : undefined,
      dueAfter: dueAfter ? new Date(dueAfter as string) : undefined,
    };

    const result = await slaService.getSLAs(
      filter,
      parseInt(page as string, 10),
      parseInt(limit as string, 10)
    );

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to get SLAs', { error });
    res.status(500).json({ success: false, error: 'Failed to get SLAs' });
  }
});

/**
 * GET /api/sla/:id
 * Get SLA by ID
 */
slaRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const sla = await slaService.getSLAById(req.params.id);
    if (!sla) {
      res.status(404).json({ success: false, error: 'SLA not found' });
      return;
    }
    res.json({ success: true, data: sla });
  } catch (error) {
    logger.error('Failed to get SLA', { error, slaId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to get SLA' });
  }
});

/**
 * PUT /api/sla/:id
 * Update SLA
 */
slaRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const validated = updateSlaSchema.parse(req.body);
    if (validated.dueAt) validated.dueAt = new Date(validated.dueAt) as unknown as string;
    const sla = await slaService.updateSLA(req.params.id, validated);
    if (!sla) {
      res.status(404).json({ success: false, error: 'SLA not found' });
      return;
    }
    res.json({ success: true, data: sla });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    logger.error('Failed to update SLA', { error, slaId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to update SLA' });
  }
});

/**
 * GET /api/sla/ticket/:ticketId/status
 * Get SLA status for ticket
 */
slaRoutes.get('/ticket/:ticketId/status', async (req: Request, res: Response) => {
  try {
    const status = await slaService.getSLAStatusForTicket(req.params.ticketId);
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error('Failed to get SLA status', { error, ticketId: req.params.ticketId });
    res.status(500).json({ success: false, error: 'Failed to get SLA status' });
  }
});

/**
 * POST /api/sla/:id/met
 * Mark SLA as met
 */
slaRoutes.post('/:id/met', async (req: Request, res: Response) => {
  try {
    const sla = await slaService.markSLAMet(req.params.id);
    if (!sla) {
      res.status(404).json({ success: false, error: 'SLA not found' });
      return;
    }
    res.json({ success: true, data: sla });
  } catch (error) {
    logger.error('Failed to mark SLA met', { error, slaId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to mark SLA met' });
  }
});

/**
 * POST /api/sla/:id/pause
 * Pause SLA
 */
slaRoutes.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const sla = await slaService.pauseSLA(req.params.id);
    if (!sla) {
      res.status(404).json({ success: false, error: 'SLA not found or not active' });
      return;
    }
    res.json({ success: true, data: sla });
  } catch (error) {
    logger.error('Failed to pause SLA', { error, slaId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to pause SLA' });
  }
});

/**
 * POST /api/sla/:id/resume
 * Resume SLA
 */
slaRoutes.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const sla = await slaService.resumeSLA(req.params.id);
    if (!sla) {
      res.status(404).json({ success: false, error: 'SLA not found or not paused' });
      return;
    }
    res.json({ success: true, data: sla });
  } catch (error) {
    logger.error('Failed to resume SLA', { error, slaId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to resume SLA' });
  }
});

/**
 * GET /api/sla/breaches
 * Get all SLA breaches
 */
slaRoutes.get('/breaches', async (req: Request, res: Response) => {
  try {
    const { severity, page = '1', limit = '20' } = req.query;
    const result = await slaService.getBreaches(
      parseInt(page as string, 10),
      parseInt(limit as string, 10),
      severity as BreachSeverity | undefined
    );
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to get breaches', { error });
    res.status(500).json({ success: false, error: 'Failed to get breaches' });
  }
});

/**
 * GET /api/sla/analytics
 * Get SLA analytics
 */
slaRoutes.get('/analytics', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, type, priority } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ success: false, error: 'startDate and endDate are required' });
      return;
    }

    const analytics = await slaService.getAnalytics(
      new Date(startDate as string),
      new Date(endDate as string),
      type as SLAType | undefined,
      priority as SLAPriority | undefined
    );

    res.json({ success: true, data: analytics });
  } catch (error) {
    logger.error('Failed to get analytics', { error });
    res.status(500).json({ success: false, error: 'Failed to get analytics' });
  }
});

/**
 * POST /api/sla/alerts
 * Create a new alert
 */
slaRoutes.post('/alerts', async (req: Request, res: Response) => {
  try {
    const validated = createAlertSchema.parse(req.body);
    const alert = await alertService.createAlert(validated);
    res.status(201).json({ success: true, data: alert });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    logger.error('Failed to create alert', { error });
    res.status(500).json({ success: false, error: 'Failed to create alert' });
  }
});

/**
 * GET /api/sla/alerts/:id
 * Get alert by ID
 */
slaRoutes.get('/alerts/:id', async (req: Request, res: Response) => {
  try {
    const alert = await alertService.getAlertById(req.params.id);
    if (!alert) {
      res.status(404).json({ success: false, error: 'Alert not found' });
      return;
    }
    res.json({ success: true, data: alert });
  } catch (error) {
    logger.error('Failed to get alert', { error, alertId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to get alert' });
  }
});

/**
 * POST /api/sla/alerts/:id/acknowledge
 * Acknowledge alert
 */
slaRoutes.post('/alerts/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { acknowledgedBy } = req.body;
    const alert = await alertService.acknowledgeAlert(req.params.id, acknowledgedBy);
    if (!alert) {
      res.status(404).json({ success: false, error: 'Alert not found' });
      return;
    }
    res.json({ success: true, data: alert });
  } catch (error) {
    logger.error('Failed to acknowledge alert', { error, alertId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to acknowledge alert' });
  }
});

export default slaRoutes;