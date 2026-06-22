import { Router, Request, Response } from 'express';
import { strategyService, CreateGoalDto, GoalQuery } from '../services/strategyService';

const router = Router();

/**
 * Create a new strategic goal
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'X-Tenant-Id required' });
    }

    const dto: CreateGoalDto = {
      ...req.body,
      createdBy: req.headers['x-user-id'] as string || 'system',
      tenantId
    };

    const goal = await strategyService.createGoal(dto);

    res.status(201).json({ success: true, data: goal });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * List all goals
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'X-Tenant-Id required' });
    }

    const query: GoalQuery = {
      tenantId,
      status: req.query.status as string,
      type: req.query.type as string,
      quarter: req.query.quarter as string,
      department: req.query.department as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    };

    const result = await strategyService.listGoals(query);

    res.json({
      success: true,
      data: result.goals,
      pagination: {
        total: result.total,
        page: query.page || 1,
        limit: query.limit || 20
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Get goal by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'X-Tenant-Id required' });
    }

    const goal = await strategyService.getGoal(req.params.id, tenantId);

    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    res.json({ success: true, data: goal });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Update goal
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'X-Tenant-Id required' });
    }

    const goal = await strategyService.updateGoal(req.params.id, tenantId, req.body);

    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    res.json({ success: true, data: goal });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Approve goal
 */
router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'X-Tenant-Id required' });
    }

    const approverId = req.headers['x-user-id'] as string || 'system';
    const goal = await strategyService.approveGoal(req.params.id, tenantId, approverId);

    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    res.json({ success: true, data: goal });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Start execution (sync to SUTAR)
 */
router.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'X-Tenant-Id required' });
    }

    const goal = await strategyService.startExecution(req.params.id, tenantId);

    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found or not approved' });
    }

    res.json({ success: true, data: goal });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Sync progress from SUTAR
 */
router.post('/:id/sync', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'X-Tenant-Id required' });
    }

    const goal = await strategyService.syncProgress(req.params.id, tenantId);

    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    res.json({ success: true, data: goal });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Cancel goal
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'X-Tenant-Id required' });
    }

    const { reason } = req.body;
    const goal = await strategyService.cancelGoal(req.params.id, tenantId, reason);

    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    res.json({ success: true, data: goal });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Dashboard stats
 */
router.get('/stats/dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'X-Tenant-Id required' });
    }

    const stats = await strategyService.getDashboard(tenantId);

    res.json({ success: true, data: stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
