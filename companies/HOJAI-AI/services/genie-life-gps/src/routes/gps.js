/**
 * GPS Routes - Next Best Action and Navigation
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * GET /gps/next/:userId
 * Get next best action recommendations
 */
router.get('/gps/next/:userId', async (req, res) => {
  const { userId } = req.params;
  const { focus } = req.query;
  const storage = req.app.locals.storage;

  const goals = storage.lifeGoals.get(userId) || [];

  // Generate next best actions based on goals
  const actions = [];

  // Find active goals and suggest next steps
  goals.filter(g => g.status === 'active').forEach(goal => {
    const progress = goal.progress || 0;

    if (progress < 25) {
      actions.push({
        goalId: goal.id,
        goalTitle: goal.title,
        goalCategory: goal.category,
        priority: goal.targetDate ? calculateUrgency(goal.targetDate) : 5,
        action: `Start working on "${goal.title}"`,
        actionType: 'start',
        suggestion: getStarterSuggestion(goal)
      });
    } else if (progress < 75) {
      actions.push({
        goalId: goal.id,
        goalTitle: goal.title,
        goalCategory: goal.category,
        priority: 8,
        action: `Continue "${goal.title}" (${progress}% complete)`,
        actionType: 'continue',
        suggestion: getMidpointSuggestion(goal)
      });
    } else {
      actions.push({
        goalId: goal.id,
        goalTitle: goal.title,
        goalCategory: goal.category,
        priority: 9,
        action: `Finish "${goal.title}" (${progress}% complete)`,
        actionType: 'finish',
        suggestion: getFinisherSuggestion(goal)
      });
    }
  });

  // Sort by priority
  actions.sort((a, b) => b.priority - a.priority);

  // Add general recommendations
  if (actions.length === 0) {
    actions.push({
      goalId: null,
      goalTitle: 'Set new goals',
      goalCategory: 'personal',
      priority: 10,
      action: 'Define your next adventure',
      actionType: 'inspire',
      suggestion: 'What would make the next 6 months meaningful?'
    });
  }

  // Filter by focus if specified
  const filtered = focus
    ? actions.filter(a => a.goalCategory === focus)
    : actions;

  res.json({
    success: true,
    recommendations: filtered.slice(0, 5),
    totalActions: filtered.length
  });
});

/**
 * GET /gps/where/:userId
 * Get current position on life map
 */
router.get('/gps/where/:userId', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  const goals = storage.lifeGoals.get(userId) || [];

  // Calculate position in each life area
  const areas = {
    career: calculateAreaProgress(goals, 'career'),
    health: calculateAreaProgress(goals, 'health'),
    finance: calculateAreaProgress(goals, 'finance'),
    relationships: calculateAreaProgress(goals, 'relationships'),
    personal: calculateAreaProgress(goals, 'personal'),
    adventure: calculateAreaProgress(goals, 'adventure'),
    contribution: calculateAreaProgress(goals, 'contribution')
  };

  // Find strongest and weakest areas
  const sorted = Object.entries(areas).sort((a, b) => b[1] - a[1]);
  const strongest = sorted[0];
  const needsAttention = sorted[sorted.length - 1];

  res.json({
    success: true,
    position: {
      overall: Math.round(Object.values(areas).reduce((a, b) => a + b, 0) / Object.keys(areas).length),
      areas,
      strongest: { area: strongest[0], progress: strongest[1] },
      needsAttention: { area: needsAttention[0], progress: needsAttention[1] }
    },
    insights: [
      areas.career < 30 ? 'Consider setting more career goals' : null,
      areas.health < 30 ? 'Your health goals might need attention' : null,
      areas.relationships < 30 ? 'Relationships are important - consider setting goals here' : null
    ].filter(Boolean)
  });
});

/**
 * GET /gps/route/:userId
 * Get recommended route to goal
 */
router.get('/gps/route/:userId/:goalId', async (req, res) => {
  const { userId, goalId } = req.params;
  const storage = req.app.locals.storage;

  const goals = storage.lifeGoals.get(userId) || [];
  const goal = goals.find(g => g.id === goalId);

  if (!goal) {
    return res.status(404).json({ success: false, error: 'Goal not found' });
  }

  // Generate route with milestones
  const route = {
    goal: goal.title,
    category: goal.category,
    currentProgress: goal.progress || 0,
    steps: generateRouteSteps(goal),
    estimatedCompletion: estimateCompletion(goal),
    barriers: identifyBarriers(goal)
  };

  res.json({ success: true, route });
});

// Helper functions
function calculateUrgency(targetDate) {
  if (!targetDate) return 5;

  const daysUntil = Math.ceil((new Date(targetDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return 10;
  if (daysUntil < 7) return 9;
  if (daysUntil < 30) return 7;
  return 5;
}

function calculateAreaProgress(goals, area) {
  const areaGoals = goals.filter(g => g.category === area);
  if (areaGoals.length === 0) return 50; // Default middle

  const total = areaGoals.reduce((sum, g) => sum + (g.progress || 0), 0);
  return Math.round(total / areaGoals.length);
}

function getStarterSuggestion(goal) {
  const suggestions = {
    career: 'Break this into weekly tasks. What\'s the first step?',
    health: 'Start with a small habit. 10 minutes counts!',
    finance: 'What\'s one expense you could reduce this week?',
    relationships: 'Schedule one call or meeting this week.',
    personal: 'What would make you proud to say "I did this"?',
    adventure: 'What\'s one new experience you could try this month?',
    contribution: 'Who could you help this week?'
  };
  return suggestions[goal.category] || 'Take the first step today.';
}

function getMidpointSuggestion(goal) {
  const suggestions = {
    career: 'Review your progress. What\'s working? What\'s blocking you?',
    health: 'Track your metrics. What\'s improved?',
    finance: 'Check your numbers. On track?',
    relationships: 'When was the last time you connected with key people?',
    personal: 'What have you learned so far?',
    adventure: 'What\'s the next milestone on this journey?',
    contribution: 'How is your impact growing?'
  };
  return suggestions[goal.category] || 'Keep going! Momentum builds progress.';
}

function getFinisherSuggestion(goal) {
  const suggestions = {
    career: 'You\'re almost there! What\'s the final push?',
    health: 'Final stretch! What\'s one more habit to lock in?',
    finance: 'So close! What\'s the last piece?',
    relationships: 'Complete the connection. Send that message.',
    personal: 'Almost there! Don\'t stop now.',
    adventure: 'This will be an amazing story. Finish it!',
    contribution: 'Your impact is almost complete!'
  };
  return suggestions[goal.category] || 'You\'re so close! Finish strong.';
}

function generateRouteSteps(goal) {
  const steps = [];
  const remaining = 100 - (goal.progress || 0);
  const milestones = goal.milestones || [];

  // Generate 5-7 steps
  for (let i = 1; i <= Math.min(7, Math.ceil(remaining / 15)); i++) {
    steps.push({
      step: i,
      title: `Phase ${i}`,
      targetProgress: Math.min(100, (goal.progress || 0) + (i * remaining / Math.ceil(remaining / 15))),
      action: getStepAction(goal.category, i),
      isNext: i === 1
    });
  }

  return steps;
}

function getStepAction(category, step) {
  const actions = {
    career: ['Research & plan', 'Build foundation', 'Develop skills', 'Take action', 'Evaluate & iterate', 'Scale up', 'Complete'],
    health: ['Start habit', 'Track consistently', 'Build routine', 'Challenge yourself', 'Optimize', 'Maintain', 'Complete'],
    finance: ['Calculate baseline', 'Cut expenses', 'Increase income', 'Invest', 'Optimize', 'Build wealth', 'Complete'],
    relationships: ['Reach out', 'Schedule meetups', 'Deepen connection', 'Create shared experiences', 'Strengthen bond', 'Maintain', 'Complete'],
    personal: ['Define vision', 'Start learning', 'Practice consistently', 'Get feedback', 'Refine', 'Master', 'Complete'],
    adventure: ['Research options', 'Plan journey', 'Take first step', 'Embrace experience', 'Adapt & learn', 'Complete adventure', 'Reflect'],
    contribution: ['Identify cause', 'Start small', 'Build impact', 'Grow reach', 'Create systems', 'Scale impact', 'Complete']
  };

  const categoryActions = actions[category] || actions.personal;
  return categoryActions[step - 1] || `Step ${step}`;
}

function estimateCompletion(goal) {
  if (!goal.targetDate) {
    return 'Date not set';
  }

  const daysUntil = Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return 'Overdue';
  if (daysUntil === 0) return 'Due today';
  return `${daysUntil} days remaining`;
}

function identifyBarriers(goal) {
  const barriers = [];

  if ((goal.progress || 0) < 50 && !goal.milestones?.length) {
    barriers.push('No milestones set - consider breaking into smaller steps');
  }

  if (!goal.targetDate) {
    barriers.push('No deadline set - add a target date for accountability');
  }

  if (!goal.why) {
    barriers.push('"Why" not defined - having a clear purpose increases success by 3x');
  }

  return barriers;
}

export default router;
