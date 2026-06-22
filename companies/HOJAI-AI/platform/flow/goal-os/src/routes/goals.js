/**
 * Goal Routes - Goal creation, decomposition, tracking
 *
 * Spec features:
 * - Hierarchy levels (vision ... microaction)
 * - Categories (personal, business, product, commerce, operational, ai)
 * - Planning engine (POST /:id/plan)
 * - Dependency engine (dependsOn[], cycle detection, blocked-by)
 * - Prediction engine (POST /:id/predict-completion)
 * - Optimization engine (POST /:id/optimize)
 * - AI Goal Recommendation (POST /recommend)
 * - Analytics (completion-rate, by-category, at-risk)
 * - Hierarchy view (descendants, ancestors)
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { redis, GOAL_STATUS, PRIORITY } from '../index.js';
import { eventBusClient } from '../lib/event-bus-client.js';

const router = Router();

// ============= CONSTANTS =============

// Canonical hierarchy levels (top -> bottom)
const HIERARCHY_LEVELS = [
  'vision',
  'mission',
  'objective',
  'goal',
  'milestone',
  'epic',
  'feature',
  'task',
  'action',
  'microaction'
];

// Default level if not provided
const DEFAULT_LEVEL = 'goal';

const CATEGORIES = [
  'personal',
  'business',
  'product',
  'commerce',
  'operational',
  'ai'
];

const DEFAULT_CATEGORY = 'personal';

// Sub-level that an item at level X should decompose into
const DECOMPOSITION_CHILD_LEVEL = {
  vision: 'mission',
  mission: 'objective',
  objective: 'milestone',
  goal: 'milestone',
  milestone: 'task',
  epic: 'feature',
  feature: 'task',
  task: 'action',
  action: 'microaction',
  microaction: null // terminal
};

// ============= VALIDATION HELPERS =============

function isValidLevel(level) {
  return HIERARCHY_LEVELS.includes(level);
}

function isValidCategory(cat) {
  return CATEGORIES.includes(cat);
}

// ============= CREATE GOAL =============

router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      ownerCorpId,
      parentGoalId,
      priority,
      deadline,
      metrics,
      level,
      category,
      dependsOn
    } = req.body;

    if (!title || !ownerCorpId) {
      return res.status(400).json({ error: 'title and ownerCorpId are required' });
    }

    // Validate level
    if (level !== undefined && level !== null && !isValidLevel(level)) {
      return res.status(400).json({
        error: `Invalid level. Must be one of: ${HIERARCHY_LEVELS.join(', ')}`
      });
    }

    // Validate category
    if (category !== undefined && category !== null && !isValidCategory(category)) {
      return res.status(400).json({
        error: `Invalid category. Must be one of: ${CATEGORIES.join(', ')}`
      });
    }

    const goalLevel = level || DEFAULT_LEVEL;
    const goalCategory = category || DEFAULT_CATEGORY;

    // Validate parent exists & level ordering
    if (parentGoalId) {
      const parentRaw = await redis.get(`goal:${parentGoalId}`);
      if (!parentRaw) {
        return res.status(400).json({ error: `Parent goal ${parentGoalId} not found` });
      }
      const parent = JSON.parse(parentRaw);
      const parentIdx = HIERARCHY_LEVELS.indexOf(parent.level || DEFAULT_LEVEL);
      const childIdx = HIERARCHY_LEVELS.indexOf(goalLevel);
      if (childIdx <= parentIdx) {
        return res.status(400).json({
          error: `Child level "${goalLevel}" must be lower in hierarchy than parent level "${parent.level || DEFAULT_LEVEL}"`
        });
      }
    }

    // Validate dependencies exist
    let depArr = [];
    if (Array.isArray(dependsOn) && dependsOn.length > 0) {
      for (const depId of dependsOn) {
        const depRaw = await redis.get(`goal:${depId}`);
        if (!depRaw) {
          return res.status(400).json({ error: `Dependency goal ${depId} not found` });
        }
      }
      depArr = [...dependsOn];
    }

    const goalId = `goal_${uuidv4()}`;
    const now = new Date().toISOString();

    const goal = {
      id: goalId,
      title,
      description: description || '',
      ownerCorpId,
      parentGoalId: parentGoalId || null,
      level: goalLevel,
      category: goalCategory,
      dependsOn: depArr,
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

    // Index by level + category for analytics
    await redis.sadd(`goals:level:${goalLevel}`, goalId);
    await redis.sadd(`goals:category:${goalCategory}`, goalId);

    // Index dependencies
    for (const depId of depArr) {
      await redis.sadd(`goals:dependsOn:${depId}`, goalId);
    }

    // Add to active goals
    await redis.zadd('goals:active', Date.now(), goalId);

    // Phase A: emit goal.created event (fire-and-forget)
    // Subscribers (flow-orchestrator, agent-teaming) pick it up and act on it.
    process.stdout.write(`[goal-os] >>> publishing goal.created for goalId=${goal.id}\n`);
    try {
      const pubResult = await eventBusClient.publish('goal.created', {
        goalId: goal.id,
        title: goal.title,
        description: goal.description,
        category: goal.category,
        level: goal.level,
        priority: goal.priority,
        ownerCorpId: goal.ownerCorpId,
        deadline: goal.deadline,
        metrics: goal.metrics,
        source: 'goal-os',
        createdAt: goal.createdAt,
      });
      process.stdout.write(`[goal-os] >>> publish result: ok=${pubResult.ok} status=${pubResult.status}\n`);
    } catch (pubErr) {
      process.stdout.write(`[goal-os] >>> publish threw: ${pubErr.message || pubErr}\n`);
    }

    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= PATCH GOAL =============

router.patch('/:goalId', async (req, res) => {
  try {
    const { goalId } = req.params;
    const raw = await redis.get(`goal:${goalId}`);
    if (!raw) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    const goal = JSON.parse(raw);
    const now = new Date().toISOString();

    const allowed = [
      'title', 'description', 'priority', 'deadline', 'metrics',
      'status', 'progress', 'parentGoalId', 'level', 'category'
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'level' && !isValidLevel(req.body.level)) {
          return res.status(400).json({
            error: `Invalid level. Must be one of: ${HIERARCHY_LEVELS.join(', ')}`
          });
        }
        if (key === 'category' && !isValidCategory(req.body.category)) {
          return res.status(400).json({
            error: `Invalid category. Must be one of: ${CATEGORIES.join(', ')}`
          });
        }
        if (key === 'progress') {
          goal.progress = Math.max(0, Math.min(100, req.body.progress));
        } else {
          goal[key] = req.body[key];
        }
      }
    }

    goal.updatedAt = now;

    // Re-index level/category if changed
    if (req.body.level && req.body.level !== goal.level) {
      await redis.srem(`goals:level:${goal.level}`, goalId);
      await redis.sadd(`goals:level:${req.body.level}`, goalId);
    }
    if (req.body.category && req.body.category !== goal.category) {
      await redis.srem(`goals:category:${goal.category}`, goalId);
      await redis.sadd(`goals:category:${req.body.category}`, goalId);
    }

    await redis.set(`goal:${goalId}`, JSON.stringify(goal));
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= GET GOAL =============

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

// ============= DECOMPOSE (legacy) =============

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
      const childLevel = subGoal.level || DECOMPOSITION_CHILD_LEVEL[parent.level] || 'task';

      const childGoal = {
        id: subGoalId,
        title: subGoal.title,
        description: subGoal.description || '',
        ownerCorpId: subGoal.ownerCorpId || parent.ownerCorpId,
        parentGoalId: goalId,
        level: childLevel,
        category: subGoal.category || parent.category || DEFAULT_CATEGORY,
        dependsOn: [],
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
      await redis.sadd(`goals:level:${childLevel}`, subGoalId);
      await redis.sadd(`goals:category:${childGoal.category}`, subGoalId);
      await redis.zadd('goals:active', Date.now(), subGoalId);

      createdGoals.push(childGoal);
    }

    // Update parent
    parent.children = [...(parent.children || []), ...createdGoals.map(g => g.id)];
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

// ============= PATCH PROGRESS (legacy) =============

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

  if (completedCount === childIds.length && parsed.progress < 100) {
    parsed.progress = 100;
    parsed.status = GOAL_STATUS.COMPLETED;
    parsed.completedAt = new Date().toISOString();
    await redis.zrem('goals:active', parentGoalId);
  }

  await redis.set(`goal:${parentGoalId}`, JSON.stringify(parsed));
  await updateParentProgress(parsed.parentGoalId);
}

// ============= LIST OWNER GOALS =============

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

// ============= LIST ACTIVE GOALS =============

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

// ============================================================
// =============== NEW SPEC FEATURES =========================
// ============================================================

// ============= PLANNING ENGINE =============

router.post('/:goalId/plan', async (req, res) => {
  try {
    const { goalId } = req.params;
    const raw = await redis.get(`goal:${goalId}`);
    if (!raw) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    const parent = JSON.parse(raw);

    const level = parent.level || DEFAULT_LEVEL;
    const childLevel = DECOMPOSITION_CHILD_LEVEL[level];

    if (!childLevel) {
      return res.status(400).json({
        error: `Cannot decompose further: "${level}" is a terminal level`
      });
    }

    // Decide count + noun based on level
    let count;
    let noun;
    if (level === 'objective') {
      count = 3 + Math.floor(Math.random() * 3); // 3..5
      noun = 'milestone';
    } else if (level === 'milestone') {
      count = 3 + Math.floor(Math.random() * 5); // 3..7
      noun = 'task';
    } else if (level === 'vision') {
      count = 3;
      noun = 'mission';
    } else if (level === 'mission') {
      count = 3;
      noun = 'objective';
    } else if (level === 'goal') {
      count = 3 + Math.floor(Math.random() * 3); // 3..5
      noun = 'milestone';
    } else if (level === 'epic') {
      count = 4;
      noun = 'feature';
    } else if (level === 'feature') {
      count = 5;
      noun = 'task';
    } else if (level === 'task') {
      count = 3;
      noun = 'action';
    } else if (level === 'action') {
      count = 3;
      noun = 'microaction';
    } else {
      count = 3;
      noun = childLevel;
    }

    // Auto-priority based on parent deadline
    let autoPriority = PRIORITY.MEDIUM;
    if (parent.deadline) {
      const daysToDeadline = (new Date(parent.deadline) - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysToDeadline < 7) autoPriority = PRIORITY.CRITICAL;
      else if (daysToDeadline < 30) autoPriority = PRIORITY.HIGH;
      else if (daysToDeadline < 90) autoPriority = PRIORITY.MEDIUM;
      else autoPriority = PRIORITY.LOW;
    }

    const now = new Date().toISOString();
    const created = [];

    for (let i = 0; i < count; i++) {
      const subId = `goal_${uuidv4()}`;
      const item = {
        id: subId,
        title: `${parent.title} - ${noun} ${i + 1}`,
        description: `Auto-decomposed ${noun} for: ${parent.title}`,
        ownerCorpId: parent.ownerCorpId,
        parentGoalId: goalId,
        level: childLevel,
        category: parent.category || DEFAULT_CATEGORY,
        dependsOn: i > 0 ? [created[i - 1].id] : [], // sequential dependency chain
        status: GOAL_STATUS.PENDING,
        priority: autoPriority,
        deadline: parent.deadline || null,
        metrics: {},
        progress: 0,
        children: [],
        order: i + 1,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        autoGenerated: true
      };

      await redis.set(`goal:${subId}`, JSON.stringify(item));
      await redis.sadd(`goals:owner:${item.ownerCorpId}`, subId);
      await redis.sadd(`goals:parent:${goalId}`, subId);
      await redis.sadd(`goals:level:${childLevel}`, subId);
      await redis.sadd(`goals:category:${item.category}`, subId);
      if (item.dependsOn.length > 0) {
        for (const dep of item.dependsOn) {
          await redis.sadd(`goals:dependsOn:${dep}`, subId);
        }
      }
      await redis.zadd('goals:active', Date.now(), subId);

      created.push(item);
    }

    // Update parent's children list
    parent.children = [...(parent.children || []), ...created.map(g => g.id)];
    parent.updatedAt = now;
    await redis.set(`goal:${goalId}`, JSON.stringify(parent));

    res.status(201).json({
      parentGoalId: goalId,
      level,
      childLevel,
      count: created.length,
      subGoals: created
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= DEPENDENCY ENGINE =============

router.post('/:goalId/dependencies', async (req, res) => {
  try {
    const { goalId } = req.params;
    const { dependsOnIds } = req.body;

    if (!Array.isArray(dependsOnIds)) {
      return res.status(400).json({ error: 'dependsOnIds must be an array' });
    }

    const raw = await redis.get(`goal:${goalId}`);
    if (!raw) return res.status(404).json({ error: 'Goal not found' });
    const goal = JSON.parse(raw);

    // Verify each exists
    for (const depId of dependsOnIds) {
      const depRaw = await redis.get(`goal:${depId}`);
      if (!depRaw) {
        return res.status(400).json({ error: `Dependency goal ${depId} not found` });
      }
      if (depId === goalId) {
        return res.status(400).json({ error: 'A goal cannot depend on itself' });
      }
    }

    // Cycle check on the proposed graph
    const proposed = [...new Set([...(goal.dependsOn || []), ...dependsOnIds])];
    const cycle = await detectCycle(goalId, proposed);
    if (cycle) {
      return res.status(409).json({
        error: 'Adding these dependencies would create a cycle',
        cycle
      });
    }

    const oldDeps = goal.dependsOn || [];
    const added = [];
    for (const depId of dependsOnIds) {
      if (!oldDeps.includes(depId)) {
        await redis.sadd(`goals:dependsOn:${depId}`, goalId);
        added.push(depId);
      }
    }

    goal.dependsOn = proposed;
    goal.updatedAt = new Date().toISOString();
    await redis.set(`goal:${goalId}`, JSON.stringify(goal));

    res.json({ goalId, dependsOn: goal.dependsOn, added });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:goalId/dependencies/check-cycle', async (req, res) => {
  try {
    const { goalId } = req.params;
    const raw = await redis.get(`goal:${goalId}`);
    if (!raw) return res.status(404).json({ error: 'Goal not found' });
    const goal = JSON.parse(raw);

    const cycle = await detectCycle(goalId, goal.dependsOn || []);
    res.json({
      goalId,
      hasCycle: !!cycle,
      cycle: cycle || null,
      dependsOn: goal.dependsOn || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:goalId/blocked-by', async (req, res) => {
  try {
    const { goalId } = req.params;
    const raw = await redis.get(`goal:${goalId}`);
    if (!raw) return res.status(404).json({ error: 'Goal not found' });
    const goal = JSON.parse(raw);

    const blocking = [];
    for (const depId of goal.dependsOn || []) {
      const depRaw = await redis.get(`goal:${depId}`);
      if (depRaw) {
        const dep = JSON.parse(depRaw);
        blocking.push({
          id: dep.id,
          title: dep.title,
          status: dep.status,
          progress: dep.progress,
          isBlocking: dep.status !== GOAL_STATUS.COMPLETED
        });
      }
    }

    res.json({
      goalId,
      dependsOn: goal.dependsOn || [],
      blockedBy: blocking.filter(b => b.isBlocking),
      allDependencies: blocking
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DFS-based cycle detection for a directed graph rooted at goalId
async function detectCycle(rootId, dependsOnIds) {
  const visited = new Set();

  async function dfs(nodeId, path) {
    if (path.has(nodeId)) {
      // Extract the cycle from path
      const pathArr = [...path];
      const idx = pathArr.indexOf(nodeId);
      return [...pathArr.slice(idx), nodeId];
    }
    if (visited.has(nodeId)) return null;
    visited.add(nodeId);
    path.add(nodeId);

    const nodeRaw = await redis.get(`goal:${nodeId}`);
    if (!nodeRaw) {
      path.delete(nodeId);
      return null;
    }
    const node = JSON.parse(nodeRaw);

    // Outgoing edges = goals that depend on this node
    const outgoing = await redis.smembers(`goals:dependsOn:${nodeId}`);

    // Also consider the proposed dependencies if this is the root
    let toVisit = outgoing;
    if (nodeId === rootId) {
      toVisit = [...new Set([...outgoing, ...dependsOnIds])];
    }

    for (const next of toVisit) {
      const result = await dfs(next, path);
      if (result) return result;
    }

    path.delete(nodeId);
    return null;
  }

  return await dfs(rootId, new Set());
}

// ============= PREDICTION ENGINE =============

router.post('/:goalId/predict-completion', async (req, res) => {
  try {
    const { goalId } = req.params;
    const raw = await redis.get(`goal:${goalId}`);
    if (!raw) return res.status(404).json({ error: 'Goal not found' });
    const goal = JSON.parse(raw);

    const now = Date.now();
    const createdAt = new Date(goal.createdAt).getTime();
    const daysSinceStart = Math.max(1, (now - createdAt) / (1000 * 60 * 60 * 24));
    const progress = goal.progress || 0;

    // Compute velocity from siblings (other goals under same parent or by owner)
    let siblingVelocity = null;
    let velocitySamples = 0;
    let totalVelocity = 0;

    if (goal.parentGoalId) {
      const siblingIds = await redis.smembers(`goals:parent:${goal.parentGoalId}`);
      for (const sid of siblingIds) {
        if (sid === goalId) continue;
        const sRaw = await redis.get(`goal:${sid}`);
        if (sRaw) {
          const s = JSON.parse(sRaw);
          if (s.progress > 0) {
            const sDays = Math.max(1, (now - new Date(s.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            totalVelocity += s.progress / sDays; // %/day
            velocitySamples++;
          }
        }
      }
    }

    if (velocitySamples > 0) {
      siblingVelocity = totalVelocity / velocitySamples;
    }

    // Fallback velocity from own progress
    let velocity;
    if (siblingVelocity !== null && siblingVelocity > 0) {
      velocity = siblingVelocity;
    } else if (progress > 0) {
      velocity = progress / daysSinceStart;
    } else {
      velocity = 1; // assume 1%/day default
    }

    const remaining = Math.max(0, 100 - progress);
    const daysToComplete = velocity > 0 ? remaining / velocity : Infinity;

    const predictedCompletion = new Date(now + daysToComplete * 24 * 60 * 60 * 1000).toISOString();

    let daysFromDeadline = null;
    if (goal.deadline) {
      daysFromDeadline = (new Date(goal.deadline).getTime() - now) / (1000 * 60 * 60 * 24);
    }

    // Confidence: higher when more samples & more progress
    let confidence = 0.5;
    if (velocitySamples >= 3) confidence += 0.2;
    if (progress > 50) confidence += 0.15;
    if (progress > 0) confidence += 0.05;
    if (goal.deadline) confidence += 0.05;
    confidence = Math.min(0.95, confidence);

    // Risk level
    let riskLevel = 'low';
    if (daysFromDeadline !== null) {
      if (daysToComplete > daysFromDeadline) {
        const overshoot = daysToComplete - daysFromDeadline;
        if (overshoot > 30) riskLevel = 'critical';
        else if (overshoot > 14) riskLevel = 'high';
        else if (overshoot > 0) riskLevel = 'medium';
      }
    } else if (velocity < 0.5) {
      riskLevel = 'high';
    } else if (velocity < 1) {
      riskLevel = 'medium';
    }

    res.json({
      goalId,
      currentProgress: progress,
      daysSinceStart: Math.round(daysSinceStart * 10) / 10,
      velocityPercentPerDay: Math.round(velocity * 100) / 100,
      velocitySource: siblingVelocity !== null ? 'siblings' : (progress > 0 ? 'self' : 'default'),
      siblingSamples: velocitySamples,
      remainingPercent: remaining,
      estimatedDaysToComplete: Math.round(daysToComplete * 10) / 10,
      predictedCompletion,
      confidence: Math.round(confidence * 100) / 100,
      daysFromDeadline: daysFromDeadline !== null ? Math.round(daysFromDeadline * 10) / 10 : null,
      riskLevel
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= OPTIMIZATION ENGINE =============

router.post('/:goalId/optimize', async (req, res) => {
  try {
    const { goalId } = req.params;
    const raw = await redis.get(`goal:${goalId}`);
    if (!raw) return res.status(404).json({ error: 'Goal not found' });
    const goal = JSON.parse(raw);

    // Gather all descendants (BFS) so we can plan at the leaf-execution level
    const allIds = [];
    const queue = [goalId];
    while (queue.length > 0) {
      const current = queue.shift();
      const childIds = await redis.smembers(`goals:parent:${current}`);
      for (const cid of childIds) {
        allIds.push(cid);
        queue.push(cid);
      }
    }

    // Materialize descendants
    const nodes = [];
    for (const id of allIds) {
      const nodeRaw = await redis.get(`goal:${id}`);
      if (nodeRaw) nodes.push(JSON.parse(nodeRaw));
    }

    if (nodes.length === 0) {
      return res.json({
        goalId,
        orderedTasks: [],
        message: 'No sub-goals to optimize. Run /plan first.'
      });
    }

    // Topological sort considering dependsOn
    const idMap = new Map(nodes.map(n => [n.id, n]));
    const indegree = new Map(nodes.map(n => [n.id, 0]));
    const adj = new Map(nodes.map(n => [n.id, []]));

    for (const n of nodes) {
      for (const dep of n.dependsOn || []) {
        if (idMap.has(dep)) {
          adj.get(dep).push(n.id);
          indegree.set(n.id, indegree.get(n.id) + 1);
        }
      }
    }

    // Priority scoring for tie-breaking: lower priority number = higher priority,
    // earlier deadline wins, then by id for stability.
    function score(n) {
      const priorityScore = (n.priority || PRIORITY.MEDIUM) * 100000;
      const deadlineScore = n.deadline
        ? Math.floor(new Date(n.deadline).getTime() / (1000 * 60 * 60))
        : Number.MAX_SAFE_INTEGER;
      return priorityScore + deadlineScore;
    }

    // Kahn's algorithm with priority tie-break
    const ready = nodes
      .filter(n => indegree.get(n.id) === 0)
      .sort((a, b) => score(a) - score(b));

    const ordered = [];
    while (ready.length > 0) {
      const next = ready.shift();
      ordered.push(next);

      for (const childId of adj.get(next.id) || []) {
        indegree.set(childId, indegree.get(childId) - 1);
        if (indegree.get(childId) === 0) {
          const childNode = idMap.get(childId);
          // re-sort ready queue (insertion)
          const idx = ready.findIndex(r => score(r) > score(childNode));
          if (idx === -1) ready.push(childNode);
          else ready.splice(idx, 0, childNode);
        }
      }
    }

    const hasCycle = ordered.length !== nodes.length;

    res.json({
      goalId,
      hasCycle,
      totalTasks: nodes.length,
      orderedTasks: ordered.map((n, idx) => ({
        order: idx + 1,
        id: n.id,
        title: n.title,
        level: n.level,
        priority: n.priority,
        deadline: n.deadline,
        status: n.status,
        progress: n.progress,
        dependsOn: n.dependsOn || []
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= AI GOAL RECOMMENDATION =============

router.post('/recommend', async (req, res) => {
  try {
    const { ownerCorpId, context } = req.body || {};
    if (!ownerCorpId) {
      return res.status(400).json({ error: 'ownerCorpId is required' });
    }

    const ctx = context || {};
    const recentFailures = Array.isArray(ctx.recentFailures) ? ctx.recentFailures : [];
    const recentSuccesses = Array.isArray(ctx.recentSuccesses) ? ctx.recentSuccesses : [];
    const businessArea = ctx.businessArea || 'general';

    // Pull owner's existing goals for awareness
    const ownerGoalIds = await redis.smembers(`goals:owner:${ownerCorpId}`);
    const existingTitles = [];
    for (const gid of ownerGoalIds) {
      const gr = await redis.get(`goal:${gid}`);
      if (gr) existingTitles.push(JSON.parse(gr).title.toLowerCase());
    }

    // Rule-based generator: avoid duplicating existing goals,
    // pull from failure/success themes, and bias toward businessArea.
    const failureThemes = recentFailures.map(f => (f.title || '').toLowerCase());
    const successThemes = recentSuccesses.map(s => (s.title || '').toLowerCase());

    const catalog = [
      { title: 'Increase monthly recurring revenue by 15%', category: 'business', level: 'objective', area: 'sales' },
      { title: 'Reduce customer churn rate below 5%', category: 'business', level: 'objective', area: 'retention' },
      { title: 'Launch v2 product with AI-powered recommendations', category: 'product', level: 'objective', area: 'product' },
      { title: 'Automate order processing with SUTAR agents', category: 'operational', level: 'goal', area: 'operations' },
      { title: 'Expand to 3 new industry verticals', category: 'business', level: 'mission', area: 'growth' },
      { title: 'Achieve 99.9% uptime across all services', category: 'operational', level: 'goal', area: 'operations' },
      { title: 'Deploy AI copilot for sales team', category: 'ai', level: 'goal', area: 'sales' },
      { title: 'Build digital twin for top 100 customers', category: 'commerce', level: 'goal', area: 'product' },
      { title: 'Reach 10,000 active marketplace providers', category: 'commerce', level: 'objective', area: 'marketplace' },
      { title: 'Improve AI recommendation accuracy to 95%', category: 'ai', level: 'goal', area: 'ai' },
      { title: 'Establish quarterly OKR review process', category: 'operational', level: 'goal', area: 'operations' },
      { title: 'Build strategic partnerships with 5 enterprise clients', category: 'business', level: 'goal', area: 'partnerships' }
    ];

    const candidates = catalog
      .filter(c => !existingTitles.some(t => t.includes(c.title.toLowerCase().slice(0, 18))))
      .map(c => {
        let reasoning = `Aligns with business area "${businessArea}".`;
        let score = 50;

        if (c.area === businessArea) {
          score += 25;
          reasoning += ` Direct match to business area.`;
        }

        if (failureThemes.length > 0) {
          // Boost if title addresses common failure words
          for (const f of failureThemes) {
            if (f && (c.title.toLowerCase().includes(f.split(' ')[0]))) {
              score += 10;
              reasoning += ` Addresses past failure pattern.`;
              break;
            }
          }
        }

        if (successThemes.length > 0) {
          for (const s of successThemes) {
            if (s && (c.title.toLowerCase().includes(s.split(' ')[0]))) {
              score += 10;
              reasoning += ` Builds on past success pattern.`;
              break;
            }
          }
        }

        return {
          title: c.title,
          category: c.category,
          level: c.level,
          score,
          reasoning
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    res.json({
      ownerCorpId,
      businessArea,
      recommendations: candidates,
      contextUsed: {
        recentFailures: recentFailures.length,
        recentSuccesses: recentSuccesses.length,
        existingGoals: existingTitles.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= ANALYTICS =============

router.get('/analytics/completion-rate', async (req, res) => {
  try {
    const { ownerCorpId } = req.query;
    let goalIds = [];

    if (ownerCorpId) {
      goalIds = await redis.smembers(`goals:owner:${ownerCorpId}`);
    } else {
      // Scan all goals via level indexes
      const ids = new Set();
      for (const lvl of HIERARCHY_LEVELS) {
        const lvlIds = await redis.smembers(`goals:level:${lvl}`);
        for (const i of lvlIds) ids.add(i);
      }
      goalIds = [...ids];
    }

    let total = 0;
    let completed = 0;
    for (const id of goalIds) {
      const r = await redis.get(`goal:${id}`);
      if (r) {
        total++;
        const g = JSON.parse(r);
        if (g.status === GOAL_STATUS.COMPLETED) completed++;
      }
    }

    const rate = total > 0 ? Math.round((completed / total) * 10000) / 100 : 0;
    res.json({
      ownerCorpId: ownerCorpId || 'all',
      total,
      completed,
      rate
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/analytics/by-category', async (req, res) => {
  try {
    const { ownerCorpId } = req.query;
    const counts = {};
    for (const cat of CATEGORIES) {
      counts[cat] = 0;
    }

    let goalIds = [];
    if (ownerCorpId) {
      goalIds = await redis.smembers(`goals:owner:${ownerCorpId}`);
    } else {
      const ids = new Set();
      for (const lvl of HIERARCHY_LEVELS) {
        const lvlIds = await redis.smembers(`goals:level:${lvl}`);
        for (const i of lvlIds) ids.add(i);
      }
      goalIds = [...ids];
    }

    for (const id of goalIds) {
      const r = await redis.get(`goal:${id}`);
      if (r) {
        const g = JSON.parse(r);
        const cat = g.category || DEFAULT_CATEGORY;
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }

    res.json({
      ownerCorpId: ownerCorpId || 'all',
      counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/analytics/at-risk', async (req, res) => {
  try {
    const { ownerCorpId } = req.query;
    let goalIds = [];

    if (ownerCorpId) {
      goalIds = await redis.smembers(`goals:owner:${ownerCorpId}`);
    } else {
      const ids = new Set();
      for (const lvl of HIERARCHY_LEVELS) {
        const lvlIds = await redis.smembers(`goals:level:${lvl}`);
        for (const i of lvlIds) ids.add(i);
      }
      goalIds = [...ids];
    }

    const now = Date.now();
    const atRisk = [];

    for (const id of goalIds) {
      const r = await redis.get(`goal:${id}`);
      if (!r) continue;
      const g = JSON.parse(r);
      if (g.status === GOAL_STATUS.COMPLETED || g.status === GOAL_STATUS.CANCELLED) continue;
      if (!g.deadline) continue;

      const deadlineMs = new Date(g.deadline).getTime();
      const daysLeft = (deadlineMs - now) / (1000 * 60 * 60 * 24);

      // At risk: <30 days to deadline & not complete, OR progress < 50% with <14 days left
      const isRisk = (daysLeft < 30 && g.progress < 100) || (g.progress < 50 && daysLeft < 14);
      if (!isRisk) continue;

      let severity = 'low';
      if (daysLeft < 0) severity = 'critical';
      else if (daysLeft < 7) severity = 'high';
      else if (daysLeft < 14) severity = 'medium';

      atRisk.push({
        id: g.id,
        title: g.title,
        level: g.level,
        category: g.category,
        progress: g.progress,
        status: g.status,
        deadline: g.deadline,
        daysUntilDeadline: Math.round(daysLeft * 10) / 10,
        severity
      });
    }

    atRisk.sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline);

    res.json({
      ownerCorpId: ownerCorpId || 'all',
      count: atRisk.length,
      atRisk
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= HIERARCHY VIEWS =============

router.get('/:goalId/descendants', async (req, res) => {
  try {
    const { goalId } = req.params;
    const raw = await redis.get(`goal:${goalId}`);
    if (!raw) return res.status(404).json({ error: 'Goal not found' });
    const root = JSON.parse(raw);

    async function buildTree(node) {
      const childIds = await redis.smembers(`goals:parent:${node.id}`);
      const children = [];
      for (const cid of childIds) {
        const cr = await redis.get(`goal:${cid}`);
        if (cr) {
          const child = JSON.parse(cr);
          children.push(await buildTree(child));
        }
      }
      children.sort((a, b) => (a.order || 0) - (b.order || 0));
      return {
        id: node.id,
        title: node.title,
        level: node.level,
        category: node.category,
        status: node.status,
        progress: node.progress,
        order: node.order || 0,
        children
      };
    }

    const tree = await buildTree(root);
    const counts = countNodes(tree);
    res.json({
      rootId: goalId,
      tree,
      totalNodes: counts.total,
      maxDepth: counts.depth
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function countNodes(node) {
  let total = 1;
  let depth = 1;
  for (const c of node.children || []) {
    const sub = countNodes(c);
    total += sub.total;
    depth = Math.max(depth, 1 + sub.depth);
  }
  return { total, depth };
}

router.get('/:goalId/ancestors', async (req, res) => {
  try {
    const { goalId } = req.params;
    const chain = [];
    let currentId = goalId;

    while (currentId) {
      const raw = await redis.get(`goal:${currentId}`);
      if (!raw) break;
      const node = JSON.parse(raw);
      chain.unshift({
        id: node.id,
        title: node.title,
        level: node.level,
        category: node.category,
        status: node.status,
        progress: node.progress
      });
      currentId = node.parentGoalId || null;
    }

    res.json({
      goalId,
      chain,
      depth: chain.length,
      topLevel: chain.length > 0 ? chain[0].level : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= METADATA =============

router.get('/meta/levels', (req, res) => {
  res.json({ levels: HIERARCHY_LEVELS, default: DEFAULT_LEVEL });
});

router.get('/meta/categories', (req, res) => {
  res.json({ categories: CATEGORIES, default: DEFAULT_CATEGORY });
});

export default router;
