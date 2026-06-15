/**
 * Goal Routes - Goal creation, decomposition, tracking
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { redis, GOAL_STATUS, PRIORITY } from '../index.js';

const router = Router();

/**
 * Create goal
 * POST /api/goals
 */
router.post('/', async (req, res) => {
  try {
    const { title, description, ownerCorpId, parentGoalId, priority, deadline, metrics } = req.body;

    if (!title || !ownerCorpId) {
      return res.status(400).json({ error: 'title and ownerCorpId are required' });
    }

    const goalId = `goal_${uuidv4()}`;
    const now = new Date().toISOString();

    const goal = {
      id: goalId,
      title,
      description: description || '',
      ownerCorpId,
      parentGoalId: parentGoalId || null,
      status: GOAL_STATUS.PENDING,
      priority: priority || PRIORITY.MEDIUM,
      deadline: deadline || null,
      metrics: metrics || {},
      progress: 0,
      children: [],
      createdAt: now,
      updatedAt: now,
      completedAt: null
    };

    // Store goal
    await redis.set(`goal:${goalId}`, JSON.stringify(goal));

    // Index by owner
    await redis.sadd(`goals:owner:${ownerCorpId}`, goalId);

    // Index by parent
    if (parentGoalId) {
      await redis.sadd(`goals:parent:${parentGoalId}`, goalId);
    }

    // Add to active goals
    await redis.zadd('goals:active', Date.now(), goalId);

    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get goal
 * GET /api/goals/:goalId
 */
router.get('/:goalId', async (req, res) => {
  try {
    const { goalId } = req.params;
    const goal = await redis.get(`goal:${goalId}`);

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const parsed = JSON.parse(goal);

    // Get children
    const childIds = await redis.smembers(`goals:parent:${goalId}`);
    const children = [];
    for (const childId of childIds) {
      const child = await redis.get(`goal:${childId}`);
      if (child) children.push(JSON.parse(child));
    }

    res.json({ ...parsed, children });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Decompose goal into sub-goals
 * POST /api/goals/:goalId/decompose
 */
router.post('/:goalId/decompose', async (req, res) => {
  try {
    const { goalId } = req.params;
    const { subGoals, strategy = 'sequential' } = req.body;

    const goal = await redis.get(`goal:${goalId}`);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const parent = JSON.parse(goal);
    const createdGoals = [];
    const now = new Date().toISOString();

    for (let i = 0; i < subGoals.length; i++) {
      const subGoal = subGoals[i];
      const subGoalId = `goal_${uuidv4()}`;

      const childGoal = {
        id: subGoalId,
        title: subGoal.title,
        description: subGoal.description || '',
        ownerCorpId: subGoal.ownerCorpId || parent.ownerCorpId,
        parentGoalId: goalId,
        status: GOAL_STATUS.PENDING,
        priority: subGoal.priority || PRIORITY.MEDIUM,
        deadline: subGoal.deadline || null,
        metrics: subGoal.metrics || {},
        progress: 0,
        children: [],
        order: strategy === 'sequential' ? i + 1 : i,
        createdAt: now,
        updatedAt: now,
        completedAt: null
      };

      await redis.set(`goal:${subGoalId}`, JSON.stringify(childGoal));
      await redis.sadd(`goals:owner:${childGoal.ownerCorpId}`, subGoalId);
      await redis.sadd(`goals:parent:${goalId}`, subGoalId);
      await redis.zadd('goals:active', Date.now(), subGoalId);

      createdGoals.push(childGoal);
    }

    // Update parent
    parent.children = [...parent.children, ...createdGoals.map(g => g.id)];
    parent.updatedAt = now;
    await redis.set(`goal:${goalId}`, JSON.stringify(parent));

    res.status(201).json({
      parentGoal: parent,
      subGoals: createdGoals,
      strategy
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update goal progress
 * PATCH /api/goals/:goalId/progress
 */
router.patch('/:goalId/progress', async (req, res) => {
  try {
    const { goalId } = req.params;
    const { progress, status, notes } = req.body;

    const goal = await redis.get(`goal:${goalId}`);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const parsed = JSON.parse(goal);
    const now = new Date().toISOString();

    if (progress !== undefined) {
      parsed.progress = Math.max(0, Math.min(100, progress));
    }

    if (status) {
      parsed.status = status;
      if (status === GOAL_STATUS.COMPLETED) {
        parsed.completedAt = now;
        // Remove from active goals
        await redis.zrem('goals:active', goalId);
      }
    }

    parsed.updatedAt = now;
    if (notes) {
      parsed.notes = parsed.notes || [];
      parsed.notes.push({ text: notes, timestamp: now });
    }

    await redis.set(`goal:${goalId}`, JSON.stringify(parsed));

    // Update parent progress
    await updateParentProgress(parsed.parentGoalId);

    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update parent goal progress based on children
 */
async function updateParentProgress(parentGoalId) {
  if (!parentGoalId) return;

  const parent = await redis.get(`goal:${parentGoalId}`);
  if (!parent) return;

  const parsed = JSON.parse(parent);
  const childIds = await redis.smembers(`goals:parent:${parentGoalId}`);

  if (childIds.length === 0) return;

  let totalProgress = 0;
  let completedCount = 0;

  for (const childId of childIds) {
    const child = await redis.get(`goal:${childId}`);
    if (child) {
      const childParsed = JSON.parse(child);
      totalProgress += childParsed.progress;
      if (childParsed.status === GOAL_STATUS.COMPLETED) completedCount++;
    }
  }

  parsed.progress = Math.round(totalProgress / childIds.length);
  parsed.updatedAt = new Date().toISOString();

  // Auto-complete if all children are done
  if (completedCount === childIds.length && parsed.progress < 100) {
    parsed.progress = 100;
    parsed.status = GOAL_STATUS.COMPLETED;
    parsed.completedAt = new Date().toISOString();
    await redis.zrem('goals:active', parentGoalId);
  }

  await redis.set(`goal:${parentGoalId}`, JSON.stringify(parsed));

  // Recursively update grandparent
  await updateParentProgress(parsed.parentGoalId);
}

/**
 * Get goals for owner
 * GET /api/goals/owner/:corpId
 */
router.get('/owner/:corpId', async (req, res) => {
  try {
    const { corpId } = req.params;
    const { status, limit = 50 } = req.query;

    const goalIds = await redis.smembers(`goals:owner:${corpId}`);
    const goals = [];

    for (const goalId of goalIds) {
      const goal = await redis.get(`goal:${goalId}`);
      if (goal) {
        const parsed = JSON.parse(goal);
        if (!status || parsed.status === status) {
          goals.push(parsed);
        }
      }
    }

    // Sort by priority then deadline
    goals.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
      return 0;
    });

    res.json({ goals: goals.slice(0, parseInt(limit)), total: goals.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get active goals
 * GET /api/goals/active
 */
router.get('/status/active', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const goalIds = await redis.zrange('goals:active', 0, parseInt(limit) - 1);
    const goals = [];

    for (const goalId of goalIds) {
      const goal = await redis.get(`goal:${goalId}`);
      if (goal) {
        goals.push(JSON.parse(goal));
      }
    }

    res.json({ goals, total: goals.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
