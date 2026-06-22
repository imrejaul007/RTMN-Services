/**
 * Goal Routes - Goal graph management
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { GOAL_TYPES, GOAL_STATUS } from '../types/graphTypes.js';

const router = express.Router();

/**
 * POST /goal
 * Create a new goal
 */
router.post('/goal', async (req, res) => {
  const { userId, title, description, type, deadline, milestones, metrics, priority } = req.body;
  const storage = req.app.locals.graphStorage;

  if (!userId || !title) {
    return res.status(400).json({
      success: false,
      error: 'userId and title are required'
    });
  }

  if (!storage.goals.has(userId)) {
    storage.goals.set(userId, []);
  }

  const goal = {
    id: uuidv4(),
    userId,
    title,
    description,
    type: type || GOAL_TYPES.SHORT_TERM,
    status: GOAL_STATUS.ACTIVE,
    priority: priority || 5, // 1-10
    deadline,
    milestones: milestones || [],
    progress: 0,
    metrics: metrics || [],
    achievements: [],
    obstacles: [],
    reflections: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null
  };

  storage.goals.get(userId).push(goal);

  res.json({ success: true, goal });
});

/**
 * GET /goal/:userId
 * Get all goals
 */
router.get('/goal/:userId', async (req, res) => {
  const { userId } = req.params;
  const { status, type } = req.query;
  const storage = req.app.locals.graphStorage;

  let goals = storage.goals.get(userId) || [];

  if (status) {
    goals = goals.filter(g => g.status === status);
  }

  if (type) {
    goals = goals.filter(g => g.type === type);
  }

  // Sort by priority and deadline
  goals.sort((a, b) => {
    if (a.status !== b.status) {
      const statusOrder = { active: 0, on_hold: 1, completed: 2, abandoned: 3 };
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return b.priority - a.priority;
  });

  res.json({
    success: true,
    goals,
    count: goals.length
  });
});

/**
 * GET /goal/:userId/:goalId
 * Get specific goal
 */
router.get('/goal/:userId/:goalId', async (req, res) => {
  const { userId, goalId } = req.params;
  const storage = req.app.locals.graphStorage;

  const goals = storage.goals.get(userId) || [];
  const goal = goals.find(g => g.id === goalId);

  if (!goal) {
    return res.status(404).json({ success: false, error: 'Goal not found' });
  }

  res.json({ success: true, goal });
});

/**
 * PUT /goal/:userId/:goalId
 * Update goal
 */
router.put('/goal/:userId/:goalId', async (req, res) => {
  const { userId, goalId } = req.params;
  const updates = req.body;
  const storage = req.app.locals.graphStorage;

  const goals = storage.goals.get(userId) || [];
  const index = goals.findIndex(g => g.id === goalId);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Goal not found' });
  }

  goals[index] = {
    ...goals[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  storage.goals.set(userId, goals);

  res.json({ success: true, goal: goals[index] });
});

/**
 * POST /goal/:userId/:goalId/progress
 * Update progress
 */
router.post('/goal/:userId/:goalId/progress', async (req, res) => {
  const { userId, goalId } = req.params;
  const { progress, note } = req.body;
  const storage = req.app.locals.graphStorage;

  const goals = storage.goals.get(userId) || [];
  const index = goals.findIndex(g => g.id === goalId);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Goal not found' });
  }

  const oldProgress = goals[index].progress;
  goals[index].progress = Math.min(100, Math.max(0, progress));

  if (note) {
    goals[index].achievements.push({
      type: 'progress',
      from: oldProgress,
      to: goals[index].progress,
      note,
      timestamp: new Date().toISOString()
    });
  }

  // Auto-complete if 100%
  if (goals[index].progress >= 100 && goals[index].status === GOAL_STATUS.ACTIVE) {
    goals[index].status = GOAL_STATUS.COMPLETED;
    goals[index].completedAt = new Date().toISOString();
  }

  goals[index].updatedAt = new Date().toISOString();
  storage.goals.set(userId, goals);

  res.json({
    success: true,
    goal: goals[index],
    progress: goals[index].progress
  });
});

/**
 * POST /goal/:userId/:goalId/milestone
 * Add milestone
 */
router.post('/goal/:userId/:goalId/milestone', async (req, res) => {
  const { userId, goalId } = req.params;
  const { title, targetDate, completed } = req.body;
  const storage = req.app.locals.graphStorage;

  const goals = storage.goals.get(userId) || [];
  const index = goals.findIndex(g => g.id === goalId);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Goal not found' });
  }

  const milestone = {
    id: uuidv4(),
    title,
    targetDate,
    completed: completed || false,
    completedAt: completed ? new Date().toISOString() : null
  };

  goals[index].milestones.push(milestone);
  goals[index].updatedAt = new Date().toISOString();

  storage.goals.set(userId, goals);

  res.json({ success: true, milestone });
});

/**
 * POST /goal/:userId/:goalId/complete
 * Mark goal as completed
 */
router.post('/goal/:userId/:goalId/complete', async (req, res) => {
  const { userId, goalId } = req.params;
  const { reflection } = req.body;
  const storage = req.app.locals.graphStorage;

  const goals = storage.goals.get(userId) || [];
  const index = goals.findIndex(g => g.id === goalId);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Goal not found' });
  }

  goals[index].status = GOAL_STATUS.COMPLETED;
  goals[index].completedAt = new Date().toISOString();
  goals[index].progress = 100;
  goals[index].updatedAt = new Date().toISOString();

  if (reflection) {
    goals[index].reflections.push({
      type: 'completion',
      content: reflection,
      timestamp: new Date().toISOString()
    });
  }

  storage.goals.set(userId, goals);

  res.json({ success: true, goal: goals[index] });
});

/**
 * GET /goal/:userId/stats
 * Get goal statistics
 */
router.get('/goal/:userId/stats', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.graphStorage;

  const goals = storage.goals.get(userId) || [];

  const stats = {
    total: goals.length,
    active: goals.filter(g => g.status === GOAL_STATUS.ACTIVE).length,
    completed: goals.filter(g => g.status === GOAL_STATUS.COMPLETED).length,
    onHold: goals.filter(g => g.status === GOAL_STATUS.ON_HOLD).length,
    abandoned: goals.filter(g => g.status === GOAL_STATUS.ABANDONED).length,
    averageProgress: 0,
    completionRate: 0,
    byType: {},
    upcomingDeadlines: []
  };

  if (goals.length > 0) {
    stats.averageProgress = Math.round(
      goals.reduce((a, g) => a + g.progress, 0) / goals.length
    );
    stats.completionRate = Math.round((stats.completed / goals.length) * 100);
  }

  // By type
  goals.forEach(g => {
    stats.byType[g.type] = (stats.byType[g.type] || 0) + 1;
  });

  // Upcoming deadlines (next 7 days)
  const sevenDays = new Date();
  sevenDays.setDate(sevenDays.getDate() + 7);

  stats.upcomingDeadlines = goals
    .filter(g => g.deadline && new Date(g.deadline) <= sevenDays && g.status === GOAL_STATUS.ACTIVE)
    .map(g => ({
      id: g.id,
      title: g.title,
      deadline: g.deadline,
      daysLeft: Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24)),
      progress: g.progress
    }))
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  res.json({ success: true, stats });
});

/**
 * DELETE /goal/:userId/:goalId
 * Delete goal
 */
router.delete('/goal/:userId/:goalId', async (req, res) => {
  const { userId, goalId } = req.params;
  const storage = req.app.locals.graphStorage;

  const goals = storage.goals.get(userId) || [];
  const filtered = goals.filter(g => g.id !== goalId);

  if (filtered.length === goals.length) {
    return res.status(404).json({ success: false, error: 'Goal not found' });
  }

  storage.goals.set(userId, filtered);

  res.json({ success: true, message: 'Goal deleted' });
});

export default router;
