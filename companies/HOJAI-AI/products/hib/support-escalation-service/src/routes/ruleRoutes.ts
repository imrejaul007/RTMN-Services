/**
 * Rule Routes - Express routes for escalation rule operations
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ruleService } from '../services/ruleService';
import { RuleConditionType, RuleActionType } from '../models/Rule';
import logger from '../utils/logger';

export const ruleRoutes = Router();

// Validation schemas
const createRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  conditions: z.array(z.object({
    type: z.nativeEnum(RuleConditionType),
    operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than']),
    value: z.union([z.string(), z.number(), z.boolean()]),
  })).min(1),
  conditionLogic: z.enum(['AND', 'OR']).optional(),
  actions: z.array(z.object({
    type: z.nativeEnum(RuleActionType),
    value: z.string(),
  })).min(1),
  escalationLevel: z.string().min(1),
  targetTeam: z.string().optional(),
  targetUser: z.string().optional(),
  cooldownMinutes: z.number().optional(),
});

const updateRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  conditions: z.array(z.object({
    type: z.nativeEnum(RuleConditionType),
    operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than']),
    value: z.union([z.string(), z.number(), z.boolean()]),
  })).optional(),
  conditionLogic: z.enum(['AND', 'OR']).optional(),
  actions: z.array(z.object({
    type: z.nativeEnum(RuleActionType),
    value: z.string(),
  })).optional(),
  escalationLevel: z.string().optional(),
  targetTeam: z.string().optional(),
  targetUser: z.string().optional(),
  cooldownMinutes: z.number().optional(),
  isActive: z.boolean().optional(),
});

const reorderSchema = z.array(z.object({
  ruleId: z.string(),
  priority: z.number(),
}));

/**
 * POST /api/escalations/rules
 * Create a new escalation rule
 */
ruleRoutes.post('/rules', async (req: Request, res: Response) => {
  try {
    const validated = createRuleSchema.parse(req.body);
    const rule = await ruleService.createRule(validated);
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    logger.error('Failed to create rule', { error });
    res.status(500).json({ success: false, error: 'Failed to create rule' });
  }
});

/**
 * GET /api/escalations/rules
 * Get all escalation rules
 */
ruleRoutes.get('/rules', async (req: Request, res: Response) => {
  try {
    const { includeInactive = 'false' } = req.query;
    const rules = await ruleService.getRules(includeInactive === 'true');
    res.json({ success: true, data: rules });
  } catch (error) {
    logger.error('Failed to get rules', { error });
    res.status(500).json({ success: false, error: 'Failed to get rules' });
  }
});

/**
 * GET /api/escalations/rules/:id
 * Get rule by ID
 */
ruleRoutes.get('/rules/:id', async (req: Request, res: Response) => {
  try {
    const rule = await ruleService.getRuleById(req.params.id);
    if (!rule) {
      res.status(404).json({ success: false, error: 'Rule not found' });
      return;
    }
    res.json({ success: true, data: rule });
  } catch (error) {
    logger.error('Failed to get rule', { error, ruleId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to get rule' });
  }
});

/**
 * PUT /api/escalations/rules/:id
 * Update escalation rule
 */
ruleRoutes.put('/rules/:id', async (req: Request, res: Response) => {
  try {
    const validated = updateRuleSchema.parse(req.body);
    const rule = await ruleService.updateRule(req.params.id, validated);
    if (!rule) {
      res.status(404).json({ success: false, error: 'Rule not found' });
      return;
    }
    res.json({ success: true, data: rule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    logger.error('Failed to update rule', { error, ruleId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to update rule' });
  }
});

/**
 * DELETE /api/escalations/rules/:id
 * Delete escalation rule
 */
ruleRoutes.delete('/rules/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await ruleService.deleteRule(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Rule not found' });
      return;
    }
    res.json({ success: true, message: 'Rule deleted' });
  } catch (error) {
    logger.error('Failed to delete rule', { error, ruleId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to delete rule' });
  }
});

/**
 * POST /api/escalations/rules/:id/toggle
 * Toggle rule active status
 */
ruleRoutes.post('/rules/:id/toggle', async (req: Request, res: Response) => {
  try {
    const rule = await ruleService.toggleRule(req.params.id);
    if (!rule) {
      res.status(404).json({ success: false, error: 'Rule not found' });
      return;
    }
    res.json({ success: true, data: rule });
  } catch (error) {
    logger.error('Failed to toggle rule', { error, ruleId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to toggle rule' });
  }
});

/**
 * POST /api/escalations/rules/reorder
 * Reorder rule priorities
 */
ruleRoutes.post('/rules/reorder', async (req: Request, res: Response) => {
  try {
    const validated = reorderSchema.parse(req.body);
    await ruleService.updatePriorities(validated);
    res.json({ success: true, message: 'Rules reordered' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    logger.error('Failed to reorder rules', { error });
    res.status(500).json({ success: false, error: 'Failed to reorder rules' });
  }
});

/**
 * POST /api/escalations/rules/:id/test
 * Test rule against ticket data (dry run)
 */
ruleRoutes.post('/rules/:id/test', async (req: Request, res: Response) => {
  try {
    const ticketData = req.body;
    const result = await ruleService.testRule(req.params.id, ticketData);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to test rule', { error, ruleId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to test rule' });
  }
});

export default ruleRoutes;