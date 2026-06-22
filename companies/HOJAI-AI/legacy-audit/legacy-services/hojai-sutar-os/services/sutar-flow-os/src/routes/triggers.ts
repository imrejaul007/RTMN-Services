/**
 * SUTAR Flow OS - Trigger Routes
 * Handles trigger CRUD and testing
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { triggerService } from '../services/triggerService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createResponse, createErrorResponse, CreateTriggerSchema, UpdateTriggerSchema, TriggerType } from '../types/index.js';

const router = Router();
router.use(tenantMiddleware());

// ============================================================================
// TRIGGER ROUTES
// ============================================================================

/**
 * GET /triggers
 * List triggers
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const flowId = req.query.flowId as string;
    const type = req.query.type as TriggerType;
    const isActive = req.query.isActive !== undefined
      ? req.query.isActive === 'true'
      : undefined;

    const triggers = await triggerService.list(tenantId, { flowId, type, isActive });
    res.json(createResponse({ triggers }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /triggers
 * Create a new trigger
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;

    const validation = CreateTriggerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid trigger data', { errors: validation.error.issues }));
    }

    const trigger = await triggerService.create(tenantId, validation.data);
    res.status(201).json(createResponse({ trigger }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /triggers/:id
 * Update a trigger
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const validation = UpdateTriggerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid trigger data', { errors: validation.error.issues }));
    }

    const trigger = await triggerService.update(tenantId, id, validation.data);
    if (!trigger) {
      return res.status(404).json(createErrorResponse('NOT_FOUND', 'Trigger not found'));
    }

    res.json(createResponse({ trigger }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /triggers/:id
 * Delete a trigger
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const deleted = await triggerService.delete(tenantId, id);
    if (!deleted) {
      return res.status(404).json(createErrorResponse('NOT_FOUND', 'Trigger not found'));
    }

    res.json(createResponse({ deleted: true }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /triggers/:id/test
 * Test a trigger
 */
router.post('/:id/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { id } = req.params;

    const result = await triggerService.testTrigger(tenantId, id);
    if (!result.success) {
      return res.status(400).json(createErrorResponse('TRIGGER_ERROR', result.error || 'Trigger test failed'));
    }

    res.json(createResponse({ runId: result.runId }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

export default router;
