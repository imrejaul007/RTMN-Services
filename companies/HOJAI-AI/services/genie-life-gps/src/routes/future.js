/**
 * Future Routes - Future Self Analysis
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * GET /future/self/:userId
 * Analyze future self projections
 */
router.get('/future/self/:userId', async (req, res) => {
  const { userId } = req.params;
  const { years } = req.query;
  const storage = req.app.locals.storage;

  const numYears = parseInt(years) || 5;
  const goals = storage.lifeGoals.get(userId) || [];

  // Calculate trajectory based on current goals
  const trajectory = calculateTrajectory(goals, numYears);

  // Generate future self projections
  const projections = {
    shortTerm: generateProjection(goals, 1),
    mediumTerm: generateProjection(goals, 3),
    longTerm: generateProjection(goals, numYears)
  };

  res.json({
    success: true,
    currentAge: 30, // Would come from user profile
    projections,
    trajectory,
    insights: generateInsights(goals, numYears)
  });
});

/**
 * GET /future/regrets/:userId
 * Identify potential future regrets
 */
router.get('/future/regrets/:userId', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  const goals = storage.lifeGoals.get(userId) || [];

  // Find gaps and potential regrets
  const regrets = identifyPotentialRegrets(goals);

  res.json({
    success: true,
    currentRegrets: regrets.current,
    potentialRegrets: regrets.potential,
    recommendations: regrets.recommendations
  });
});

/**
 * GET /future/scenarios/:userId
 * Generate future scenarios
 */
router.get('/future/scenarios/:userId', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  const goals = storage.lifeGoals.get(userId) || [];

  const scenarios = {
    ambitious: generateScenario(goals, 'ambitious'),
    realistic: generateScenario(goals, 'realistic'),
    minimal: generateScenario(goals, 'minimal')
  };

  res.json({
    success: true,
    scenarios,
    recommendation: generateScenarioRecommendation(goals)
  });
});

// Helper functions
function calculateTrajectory(goals, numYears) {
  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  let projectedCompletions = completedGoals.length;
  let currentRate = completedGoals.length / Math.max(1, (new Date() - new Date(completedGoals[0]?.createdAt || Date.now())) / (1000 * 60 * 60 * 24 * 365));

  // Project based on current trajectory
  const yearlyRate = currentRate || 0.5;
  projectedCompletions = Math.round(projectedCompletions + yearlyRate * numYears);

  return {
    projectedGoalsCompleted: Math.min(projectedCompletions, numYears * 5),
    yearlyRate: Math.round(yearlyRate * 10) / 10,
    onTrack: activeGoals.every(g => g.progress > 0),
    momentum: activeGoals.length > 0 ? 'building' : 'needs_stimulation'
  };
}

function generateProjection(goals, years) {
  const byCategory = {};
  const completed = goals.filter(g => g.status === 'completed').length;
  const active = goals.filter(g => g.status === 'active');

  // Project completion
  let projectedCompleted = completed;
  let remaining = active.length;
  const toComplete = Math.min(remaining, Math.ceil(active.length * years * 0.3));

  active.forEach((g, i) => {
    if (i < toComplete) {
      projectedCompleted += 1;
    }
  });

  return {
    years,
    projectedGoals: projectedCompleted,
    categories: byCategory,
    description: `In ${years} year${years > 1 ? 's' : ''}, you could have completed ${projectedCompleted} goals`,
    achievement: getAchievementLevel(projectedCompleted)
  };
}

function getAchievementLevel(goalCount) {
  if (goalCount >= 20) return { level: 'Legend', emoji: '🏆' };
  if (goalCount >= 10) return { level: 'High Achiever', emoji: '⭐' };
  if (goalCount >= 5) return { level: 'Good Progress', emoji: '👍' };
  if (goalCount >= 1) return { level: 'Getting Started', emoji: '🌱' };
  return { level: 'Set Some Goals', emoji: '🎯' };
}

function generateInsights(goals, numYears) {
  const insights = [];

  const byCategory = {};
  goals.forEach(g => {
    byCategory[g.category] = (byCategory[g.category] || 0) + 1;
  });

  const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  if (categories.length < 3) {
    insights.push({
      type: 'opportunity',
      message: 'You have goals in few life areas. Consider setting goals in relationships, health, or contribution too.'
    });
  }

  if (categories[0] && categories[0][1] > 5) {
    insights.push({
      type: 'focus',
      message: `You're focusing heavily on ${categories[0][0]}. Balance is important.`
    });
  }

  const completed = goals.filter(g => g.status === 'completed').length;
  if (completed > goals.length * 0.5) {
    insights.push({
      type: 'success',
      message: 'Great completion rate! Keep setting new goals.'
    });
  }

  insights.push({
    type: 'vision',
    message: `Your ${numYears}-year vision will be shaped by the goals you set today.`
  });

  return insights;
}

function identifyPotentialRegrets(goals) {
  const regrets = {
    current: [],
    potential: [],
    recommendations: []
  };

  // Check for missing life areas
  const categories = goals.map(g => g.category);
  const lifeAreas = ['career', 'health', 'relationships', 'personal', 'finance'];

  lifeAreas.forEach(area => {
    if (!categories.includes(area)) {
      regrets.potential.push({
        area,
        regret: `In 10 years, you might regret not investing in ${area}`,
        probability: 'medium'
      });
      regrets.recommendations.push({
        area,
        action: `Set one goal in ${area} this month`
      });
    }
  });

  // Check stagnant goals
  goals.filter(g => g.status === 'active').forEach(g => {
    const daysSinceUpdate = Math.floor((Date.now() - new Date(g.updatedAt)) / (1000 * 60 * 60 * 24));
    if (daysSinceUpdate > 30) {
      regrets.potential.push({
        goal: g.title,
        regret: `You started "${g.title}" but never finished it`,
        probability: 'high'
      });
    }
  });

  return regrets;
}

function generateScenario(goals, type) {
  let multiplier, title, description;

  switch (type) {
    case 'ambitious':
      multiplier = 2;
      title = 'Ambitious Scenario';
      description = 'You accelerate your efforts and achieve more than expected';
      break;
    case 'minimal':
      multiplier = 0.3;
      title = 'Minimal Scenario';
      description = 'You maintain current pace with minimal changes';
      break;
    default:
      multiplier = 1;
      title = 'Realistic Scenario';
      description = 'You continue at current pace with steady progress';
  }

  const completed = goals.filter(g => g.status === 'completed').length;
  const projected = Math.round((completed + goals.filter(g => g.status === 'active').length) * multiplier);

  return {
    type,
    title,
    description,
    projectedGoals: projected,
    outcomes: generateOutcomes(goals, type)
  };
}

function generateOutcomes(goals, type) {
  const outcomes = [];

  if (type === 'ambitious') {
    outcomes.push('Master new skills in your field');
    outcomes.push('Achieve financial milestones earlier');
    outcomes.push('Build stronger relationships');
    outcomes.push('Create lasting impact');
  } else if (type === 'minimal') {
    outcomes.push('Maintain current status quo');
    outcomes.push('Miss some opportunities');
    outcomes.push('Regret inaction');
  } else {
    outcomes.push('Steady professional growth');
    outcomes.push('Gradual financial progress');
    outcomes.push('Maintained relationships');
    outcomes.push('Moderate achievements');
  }

  return outcomes;
}

function generateScenarioRecommendation(goals) {
  const active = goals.filter(g => g.status === 'active').length;
  const completed = goals.filter(g => g.status === 'completed').length;

  if (active > 5) {
    return 'Focus on completing current goals before adding more. Quality over quantity.';
  }

  if (completed > active) {
    return 'Great momentum! Add more ambitious goals to stretch yourself.';
  }

  return 'Balance is key. Complete current goals while planning the next big thing.';
}

export default router;
