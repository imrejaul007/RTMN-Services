/**
 * Goals Routes - Life goals management
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Goal categories
const GOAL_CATEGORIES = {
  career: 'Career & Professional',
  health: 'Health & Fitness',
  finance: 'Finance & Wealth',
  relationships: 'Relationships & Family',
  personal: 'Personal Growth',
  adventure: 'Adventure & Experiences',
  contribution: 'Contribution & Impact'
};

/**
 * POST /goals/life
 * Set a life goal
 */
router.post('/goals/life', async (req, res) => {
  const { userId, title, category, targetDate, milestones, why } = req.body;
  const storage = req.app.locals.storage;

  if (!userId || !title) {
    return res.status(400).json({ success: false, error: 'userId and title required' });
  }

  if (!storage.lifeGoals.has(userId)) {
    storage.lifeGoals.set(userId, []);
  }

  const goal = {
    id: uuidv4(),
    userId,
    title,
    category: category || 'personal',
    targetDate,
    milestones: milestones || [],
    why: why || '',
    progress: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null
  };

  storage.lifeGoals.get(userId).push(goal);

  res.json({ success: true, goal });
});

/**
 * GET /goals/life/:userId
 * Get all life goals
 */
router.get('/goals/life/:userId', async (req, res) => {
  const { userId } = req.params;
  const { status, category } = req.query;
  const storage = req.app.locals.storage;

  let goals = storage.lifeGoals.get(userId) || [];

  if (status) {
    goals = goals.filter(g => g.status === status);
  }

  if (category) {
    goals = goals.filter(g => g.category === category);
  }

  // Sort by priority and deadline
  goals.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'active' ? -1 : 1;
    }
    return new Date(a.targetDate || 9999999999999) - new Date(b.targetDate || 9999999999999);
  });

  res.json({
    success: true,
    goals,
    categories: GOAL_CATEGORIES,
    count: goals.length
  });
});

/**
 * PUT /goals/life/:userId/:goalId
 * Update life goal
 */
router.put('/goals/life/:userId/:goalId', async (req, res) => {
  const { userId, goalId } = req.params;
  const updates = req.body;
  const storage = req.app.locals.storage;

  const goals = storage.lifeGoals.get(userId) || [];
  const index = goals.findIndex(g => g.id === goalId);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Goal not found' });
  }

  goals[index] = { ...goals[index], ...updates, updatedAt: new Date().toISOString() };
  storage.lifeGoals.set(userId, goals);

  res.json({ success: true, goal: goals[index] });
});

/**
 * POST /goals/life/:userId/:goalId/progress
 * Update goal progress
 */
router.post('/goals/life/:userId/:goalId/progress', async (req, res) => {
  const { userId, goalId } = req.params;
  const { progress, note } = req.body;
  const storage = req.app.locals.storage;

  const goals = storage.lifeGoals.get(userId) || [];
  const index = goals.findIndex(g => g.id === goalId);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Goal not found' });
  }

  const oldProgress = goals[index].progress;
  goals[index].progress = Math.min(100, Math.max(0, progress));
  goals[index].updatedAt = new Date().toISOString();

  // Check for completion
  if (goals[index].progress >= 100 && goals[index].status === 'active') {
    goals[index].status = 'completed';
    goals[index].completedAt = new Date().toISOString();

    // Record milestone
    if (!storage.milestones.has(userId)) {
      storage.milestones.set(userId, []);
    }
    storage.milestones.get(userId).push({
      id: uuidv4(),
      type: 'goal_completed',
      goalId,
      goalTitle: goals[index].title,
      timestamp: new Date().toISOString()
    });
  }

  storage.lifeGoals.set(userId, goals);

  res.json({
    success: true,
    goal: goals[index],
    progress: goals[index].progress,
    leveledUp: goals[index].progress >= 100
  });
});

/**
 * GET /goals/vision/:userId
 * Get life vision (all goals combined)
 */
router.get('/goals/vision/:userId', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  const goals = storage.lifeGoals.get(userId) || [];

  // Calculate vision completeness
  const byCategory = {};
  goals.forEach(g => {
    if (!byCategory[g.category]) {
      byCategory[g.category] = { total: 0, completed: 0 };
    }
    byCategory[g.category].total += 1;
    if (g.status === 'completed') {
      byCategory[g.category].completed += 1;
    }
  });

  // Calculate overall progress
  const totalProgress = goals.length > 0
    ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
    : 0;

  res.json({
    success: true,
    vision: {
      totalGoals: goals.length,
      completedGoals: goals.filter(g => g.status === 'completed').length,
      overallProgress: totalProgress,
      byCategory,
      nextGoal: goals.find(g => g.status === 'active'),
      recommendedNext: goals.filter(g => g.status === 'active').slice(0, 3)
    }
  });
});

/**
 * DELETE /goals/life/:userId/:goalId
 * Delete life goal
 */
router.delete('/goals/life/:userId/:goalId', async (req, res) => {
  const { userId, goalId } = req.params;
  const storage = req.app.locals.storage;

  const goals = storage.lifeGoals.get(userId) || [];
  const filtered = goals.filter(g => g.id !== goalId);

  if (filtered.length === goals.length) {
    return res.status(404).json({ success: false, error: 'Goal not found' });
  }

  storage.lifeGoals.set(userId, filtered);

  res.json({ success: true, message: 'Goal deleted' });
});

export default router;
