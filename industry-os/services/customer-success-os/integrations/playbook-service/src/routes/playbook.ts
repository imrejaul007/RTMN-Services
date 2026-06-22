/**
 * Playbook Routes - API endpoints
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { playbookService } from '../services/playbookService';
import { executionService } from '../services/executionService';
import { logger } from '../utils/logger';

const router = Router();

const createPlaybookSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['onboarding', 'engagement', 'retention', 'expansion', 'winback']),
  triggers: z.array(z.object({
    type: z.string(),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.string(),
      value: z.any(),
    })),
    logic: z.enum(['and', 'or']).optional(),
  })),
  actions: z.array(z.object({
    order: z.number(),
    type: z.string(),
    config: z.any(),
    conditions: z.array(z.any()).optional(),
  })),
  conditions: z.any().optional(),
});

const triggerSchema = z.object({
  type: z.string(),
  healthScore: z.number().optional(),
  churnRisk: z.number().optional(),
  npsScore: z.number().optional(),
  previousNps: z.number().optional(),
  daysSinceActivity: z.number().optional(),
  paymentDelay: z.number().optional(),
  milestone: z.string().optional(),
});

// POST /api/playbooks - Create playbook
router.post('/', async (req: Request, res: Response) => {
  try {
    const parseResult = createPlaybookSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, error: 'Validation error', details: parseResult.error.errors });
      return;
    }

    const playbook = await playbookService.createPlaybook(parseResult.data);
    res.status(201).json({ success: true, data: playbook });
  } catch (error) {
    logger.error('Error creating playbook', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/playbooks/:id - Get playbook
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const playbook = await playbookService.getPlaybook(req.params.id);
    if (!playbook) {
      res.status(404).json({ success: false, error: 'Playbook not found' });
      return;
    }
    res.json({ success: true, data: playbook });
  } catch (error) {
    logger.error('Error getting playbook', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/playbooks/:id - Update playbook
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const playbook = await playbookService.updatePlaybook(req.params.id, req.body);
    if (!playbook) {
      res.status(404).json({ success: false, error: 'Playbook not found' });
      return;
    }
    res.json({ success: true, data: playbook });
  } catch (error) {
    logger.error('Error updating playbook', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/playbooks/:id/trigger - Trigger playbook
router.post('/:id/trigger', async (req: Request, res: Response) => {
  try {
    const { customerId, triggeredBy, ...triggerData } = req.body;
    if (!customerId) {
      res.status(400).json({ success: false, error: 'customerId is required' });
      return;
    }

    const parseResult = triggerSchema.safeParse(triggerData);
    if (!parseResult.success) {
      res.status(400).json({ success: false, error: 'Validation error', details: parseResult.error.errors });
      return;
    }

    const trigger = await playbookService.triggerPlaybook(
      req.params.id,
      customerId,
      { ...parseResult.data, type: parseResult.data.type || 'manual' },
      triggeredBy || 'api'
    );

    if (!trigger) {
      res.status(200).json({ success: true, data: { triggered: false, reason: 'Conditions not met' } });
      return;
    }

    res.status(201).json({ success: true, data: trigger });
  } catch (error) {
    logger.error('Error triggering playbook', { error });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

// POST /api/playbooks/executions/:triggerId - Execute playbook
router.post('/executions/:triggerId', async (req: Request, res: Response) => {
  try {
    const execution = await executionService.executePlaybook(req.params.triggerId);
    res.json({ success: true, data: execution });
  } catch (error) {
    logger.error('Error executing playbook', { error });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

// GET /api/playbooks/:id/executions - Get executions
router.get('/:id/executions', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const executions = await playbookService.getExecutions(req.params.id, limit);
    res.json({ success: true, data: { count: executions.length, executions } });
  } catch (error) {
    logger.error('Error getting executions', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/playbooks - Get all playbooks
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = {
      category: req.query.category as string,
      status: req.query.status as string,
    };

    const playbooks = await playbookService.getAllPlaybooks(filters);
    res.json({ success: true, data: { count: playbooks.length, playbooks } });
  } catch (error) {
    logger.error('Error getting playbooks', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;