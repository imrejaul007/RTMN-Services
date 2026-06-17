import { Router, Request, Response } from 'express';
import { FlagModel } from '../models/Flag';

const router = Router();

/**
 * GET /api/flags
 * List all feature flags with optional filters
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { enabled, environment, tags } = req.query;

    const filters: {
      enabled?: boolean;
      environment?: string;
      tags?: string[];
    } = {};

    if (enabled !== undefined) {
      filters.enabled = enabled === 'true';
    }
    if (environment) {
      filters.environment = environment as string;
    }
    if (tags) {
      filters.tags = (tags as string).split(',');
    }

    const flags = FlagModel.findAll(filters);

    res.json({
      success: true,
      data: flags,
      count: flags.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch flags',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/flags/stats
 * Get flag statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = FlagModel.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/flags/:key
 * Get flag by key
 */
router.get('/:key', (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { environment } = req.query;

    const flag = FlagModel.findByKey(
      key,
      environment as string | undefined
    );

    if (!flag) {
      return res.status(404).json({
        success: false,
        error: 'Flag not found',
        message: `No flag found with key "${key}"`
      });
    }

    res.json({
      success: true,
      data: flag
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch flag',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/flags
 * Create a new feature flag
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const flag = FlagModel.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Flag created successfully',
      data: flag
    });
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('already exists')
      ? 409
      : 400;

    res.status(statusCode).json({
      success: false,
      error: 'Failed to create flag',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/flags/:id
 * Update a feature flag
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const flag = FlagModel.update(id, req.body);

    if (!flag) {
      return res.status(404).json({
        success: false,
        error: 'Flag not found',
        message: `No flag found with id "${id}"`
      });
    }

    res.json({
      success: true,
      message: 'Flag updated successfully',
      data: flag
    });
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('already exists')
      ? 409
      : 400;

    res.status(statusCode).json({
      success: false,
      error: 'Failed to update flag',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/flags/:id
 * Delete a feature flag
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = FlagModel.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Flag not found',
        message: `No flag found with id "${id}"`
      });
    }

    res.json({
      success: true,
      message: 'Flag deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete flag',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/flags/:id/toggle
 * Toggle flag enabled status
 */
router.post('/:id/toggle', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const flag = FlagModel.toggle(id);

    if (!flag) {
      return res.status(404).json({
        success: false,
        error: 'Flag not found',
        message: `No flag found with id "${id}"`
      });
    }

    res.json({
      success: true,
      message: `Flag ${flag.enabled ? 'enabled' : 'disabled'} successfully`,
      data: flag
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to toggle flag',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/flags/:id/rules
 * Add a targeting rule to a flag
 */
router.post('/:id/rules', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const flag = FlagModel.addRule(id, req.body);

    if (!flag) {
      return res.status(404).json({
        success: false,
        error: 'Flag not found',
        message: `No flag found with id "${id}"`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Rule added successfully',
      data: flag
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add rule',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/flags/:id/rules/:ruleId
 * Remove a targeting rule from a flag
 */
router.delete('/:id/rules/:ruleId', (req: Request, res: Response) => {
  try {
    const { id, ruleId } = req.params;
    const flag = FlagModel.removeRule(id, ruleId);

    if (!flag) {
      return res.status(404).json({
        success: false,
        error: 'Flag or rule not found',
        message: `No flag found with id "${id}" or rule with id "${ruleId}"`
      });
    }

    res.json({
      success: true,
      message: 'Rule removed successfully',
      data: flag
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to remove rule',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PATCH /api/flags/:id/rollout
 * Update rollout percentage
 */
router.patch('/:id/rollout', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { percentage, startDate, endDate } = req.body;

    const flag = FlagModel.updateRollout(id, percentage, startDate, endDate);

    if (!flag) {
      return res.status(404).json({
        success: false,
        error: 'Flag not found',
        message: `No flag found with id "${id}"`
      });
    }

    res.json({
      success: true,
      message: 'Rollout updated successfully',
      data: flag
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Failed to update rollout',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/flags/:id/clone
 * Clone flag to another environment
 */
router.post('/:id/clone', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { targetEnvironment } = req.body;

    if (!['development', 'staging', 'production'].includes(targetEnvironment)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid target environment',
        message: 'Target environment must be development, staging, or production'
      });
    }

    const flag = FlagModel.clone(
      id,
      targetEnvironment as 'development' | 'staging' | 'production'
    );

    if (!flag) {
      return res.status(404).json({
        success: false,
        error: 'Flag not found',
        message: `No flag found with id "${id}"`
      });
    }

    res.status(201).json({
      success: true,
      message: `Flag cloned to ${targetEnvironment}`,
      data: flag
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clone flag',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
