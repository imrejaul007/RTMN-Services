/**
 * Widget Automation - Routes
 *
 * Endpoints:
 * - GET /api/automation/rules
 * - GET /api/automation/rules/:ruleId
 * - POST /api/automation/rules
 * - PUT /api/automation/rules/:ruleId
 * - DELETE /api/automation/rules/:ruleId
 * - POST /api/automation/trigger/:ruleId
 * - GET /api/automation/executions/:visitorId
 * - GET /api/automation/actions/pending
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  getAllRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
  triggerRule,
  getExecutionHistory,
  getPendingActions,
  executeAction,
  DEFAULT_RULES,
} from '../index.js';
import { logger } from '../logger.js';

const router = Router();

// Validation schemas
const ruleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  trigger: z.string().min(1),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in']),
    value: z.any(),
  })).optional(),
  actions: z.array(z.object({
    type: z.enum(['email', 'whatsapp', 'notify']),
    delay: z.number().min(0),
    template: z.string(),
  })).min(1),
});

const triggerSchema = z.object({
  visitorId: z.string().min(1).max(255),
  context: z.record(z.any()).optional(),
});

/**
 * GET /api/automation/rules
 * Get all automation rules
 */
router.get('/rules', (req, res) => {
  const rules = getAllRules();
  res.json({
    success: true,
    data: {
      rules,
      defaultRules: DEFAULT_RULES.map(r => r.id),
    },
  });
});

/**
 * GET /api/automation/rules/:ruleId
 * Get a specific rule
 */
router.get('/rules/:ruleId', (req, res) => {
  const { ruleId } = req.params;
  const rule = getRule(ruleId);

  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  res.json({
    success: true,
    data: rule,
  });
});

/**
 * POST /api/automation/rules
 * Create a new automation rule
 */
router.post('/rules', async (req, res, next) => {
  try {
    const validation = ruleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const rule = createRule(validation.data);

    logger.info({
      event: 'rule_created',
      ruleId: rule.id,
      name: rule.name,
    });

    res.status(201).json({
      success: true,
      data: rule,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/automation/rules/:ruleId
 * Update an automation rule
 */
router.put('/rules/:ruleId', async (req, res, next) => {
  try {
    const { ruleId } = req.params;

    const updateSchema = ruleSchema.partial();
    const validation = updateSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const rule = updateRule(ruleId, validation.data);

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    logger.info({
      event: 'rule_updated',
      ruleId,
      updates: Object.keys(validation.data),
    });

    res.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/automation/rules/:ruleId/toggle
 * Enable or disable a rule
 */
router.patch('/rules/:ruleId/toggle', async (req, res, next) => {
  try {
    const { ruleId } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    const rule = updateRule(ruleId, { enabled });

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    logger.info({
      event: 'rule_toggled',
      ruleId,
      enabled,
    });

    res.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/automation/rules/:ruleId
 * Delete an automation rule
 */
router.delete('/rules/:ruleId', (req, res) => {
  const { ruleId } = req.params;
  const deleted = deleteRule(ruleId);

  if (!deleted) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  logger.info({ event: 'rule_deleted', ruleId });

  res.json({
    success: true,
    message: 'Rule deleted successfully',
  });
});

/**
 * POST /api/automation/trigger/:ruleId
 * Manually trigger a rule for a visitor
 */
router.post('/trigger/:ruleId', async (req, res, next) => {
  try {
    const { ruleId } = req.params;

    const validation = triggerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const { visitorId, context } = validation.data;
    const execution = triggerRule(ruleId, visitorId, context || {});

    if (!execution) {
      return res.status(400).json({
        error: 'Rule not found, disabled, or conditions not met',
        ruleId,
        visitorId,
      });
    }

    logger.info({
      event: 'rule_triggered',
      ruleId,
      visitorId,
      executionId: execution.id,
    });

    res.json({
      success: true,
      data: execution,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/automation/executions/:visitorId
 * Get execution history for a visitor
 */
router.get('/executions/:visitorId', (req, res) => {
  const { visitorId } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  const history = getExecutionHistory(visitorId, {
    limit: parseInt(limit),
    offset: parseInt(offset),
  });

  res.json({
    success: true,
    data: history,
  });
});

/**
 * GET /api/automation/executions
 * Get all executions (optionally filtered)
 */
router.get('/executions', (req, res) => {
  const { visitorId, limit = 20, offset = 0 } = req.query;

  const history = getExecutionHistory(visitorId, {
    limit: parseInt(limit),
    offset: parseInt(offset),
  });

  res.json({
    success: true,
    data: history,
  });
});

/**
 * GET /api/automation/actions/pending
 * Get pending scheduled actions (for worker polling)
 */
router.get('/actions/pending', async (req, res) => {
  const pending = getPendingActions();

  res.json({
    success: true,
    data: {
      count: pending.length,
      actions: pending.slice(0, 100), // Limit to 100 at a time
    },
  });
});

/**
 * POST /api/automation/actions/:actionId/execute
 * Execute a pending action (for worker)
 */
router.post('/actions/:actionId/execute', async (req, res, next) => {
  try {
    const { actionId } = req.params;

    // Find the action in pending actions
    const pending = getPendingActions();
    const action = pending.find(a => a.id === actionId);

    if (!action) {
      return res.status(404).json({ error: 'Action not found or already executed' });
    }

    const result = await executeAction(action);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/automation/triggers
 * Get available trigger types
 */
router.get('/triggers', (req, res) => {
  res.json({
    success: true,
    data: {
      triggers: [
        { id: 'cart_abandoned', name: 'Cart Abandoned', description: 'When a visitor abandons their cart' },
        { id: 'email_subscribed', name: 'Email Subscribed', description: 'When a visitor subscribes via email' },
        { id: 'purchase_completed', name: 'Purchase Completed', description: 'When a visitor completes a purchase' },
        { id: 'inactivity', name: 'Inactivity', description: 'When a visitor is inactive for X days' },
        { id: 'birthday', name: 'Birthday', description: 'On the visitor\'s birthday' },
        { id: 'page_visit', name: 'Page Visit', description: 'When a specific page is visited' },
        { id: 'product_view', name: 'Product View', description: 'When a product page is viewed' },
        { id: 'manual', name: 'Manual', description: 'Triggered manually via API' },
      ],
      actionTypes: ['email', 'whatsapp', 'notify'],
      operators: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in'],
    },
  });
});

export default router;