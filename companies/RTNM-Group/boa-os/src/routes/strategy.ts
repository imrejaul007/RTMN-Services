// ============================================================================
// Strategy Routes
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { strategyEngine } from '../services/strategyEngine';
import { strategyModel } from '../models/Strategy';
import { validateStrategy } from '../validators/strategyValidator';
import { NotFoundError } from '../utils/errors';
import { eventBus } from '../utils/eventBus';

const router = Router();

/**
 * Create a new strategy with pillars and objectives
 * POST /api/v1/strategy
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    validateStrategy(req.body);
    const result = strategyEngine.createStrategy(req.body);

    // Persist
    result.strategy && strategyModel.upsert(result.strategy);
    result.pillars.forEach(p => strategyModel['strategicPillars']?.set?.(p.id, p));
    result.objectives.forEach(o => strategyModel['objectives']?.set?.(o.id, o));

    await eventBus.publish('boa.strategy.created', {
      strategyId: result.strategy.id,
      name: result.strategy.name,
      pillarCount: result.pillars.length,
      objectiveCount: result.objectives.length,
    });

    res.status(201).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) { next(error); }
});

/**
 * Get strategy by ID
 * GET /api/v1/strategy/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const strategy = strategyEngine.getStrategy(req.params.id);
    if (!strategy) throw new NotFoundError(`Strategy ${req.params.id}`);
    res.json({ success: true, data: strategy, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * List all strategies
 * GET /api/v1/strategy
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, owner } = req.query;
    const strategies = strategyEngine.getAllStrategies();
    let filtered = strategies;
    if (status) filtered = filtered.filter(s => s.status === status);
    if (owner) filtered = filtered.filter(s => s.owner === owner);
    res.json({ success: true, data: filtered, count: filtered.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Activate a strategy
 * POST /api/v1/strategy/:id/activate
 */
router.post('/:id/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const strategy = strategyEngine.getStrategy(req.params.id);
    if (!strategy) throw new NotFoundError(`Strategy ${req.params.id}`);
    strategy.status = 'active';
    strategy.updatedAt = new Date();
    await eventBus.publish('boa.strategy.activated', { strategyId: strategy.id, name: strategy.name });
    res.json({ success: true, data: strategy, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

/**
 * Get strategy summary
 * GET /api/v1/strategy/:id/summary
 */
router.get('/:id/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const strategy = strategyEngine.getStrategy(req.params.id);
    if (!strategy) throw new NotFoundError(`Strategy ${req.params.id}`);
    const objectives = strategyEngine.getObjectivesByStrategy(strategy.id);
    const progress = objectives.length > 0
      ? objectives.reduce((s, o) => s + o.progress, 0) / objectives.length
      : 0;
    res.json({
      success: true,
      data: {
        strategy,
        objectiveCount: objectives.length,
        avgProgress: Math.round(progress),
        statusBreakdown: {
          'on-track': objectives.filter(o => o.status === 'on-track').length,
          'at-risk': objectives.filter(o => o.status === 'at-risk').length,
          'off-track': objectives.filter(o => o.status === 'off-track').length,
          'completed': objectives.filter(o => o.status === 'completed').length,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) { next(error); }
});

export default router;
