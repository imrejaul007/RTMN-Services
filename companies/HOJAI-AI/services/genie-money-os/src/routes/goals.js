const express = require('express');
const router = express.Router();

// In-memory goals data
const financialGoals = new Map();
const goalContributions = new Map();

// Goal templates
const goalTemplates = [
  { id: 'emergency-fund', name: 'Emergency Fund', icon: '🆘', description: '3-6 months of expenses', priority: 'high' },
  { id: 'debt-free', name: 'Debt Freedom', icon: '💳', description: 'Pay off all debt', priority: 'high' },
  { id: 'vacation', name: 'Dream Vacation', icon: '✈️', description: 'Save for your trip', priority: 'medium' },
  { id: 'home', name: 'Home Down Payment', icon: '🏠', description: '20% down payment', priority: 'high' },
  { id: 'car', name: 'New Car Fund', icon: '🚗', description: 'Save for car purchase', priority: 'medium' },
  { id: 'retirement', name: 'Retirement', icon: '🏖️', description: 'Long-term retirement savings', priority: 'high' },
  { id: 'education', name: 'Education', icon: '🎓', description: 'Degree or course funding', priority: 'medium' },
  { id: 'wedding', name: 'Wedding Fund', icon: '💒', description: 'Dream wedding savings', priority: 'medium' },
  { id: 'investment', name: 'Investment Portfolio', icon: '📈', description: 'Build investment wealth', priority: 'high' },
  { id: 'business', name: 'Business Capital', icon: '🚀', description: 'Startup or business funds', priority: 'medium' },
  { id: 'charity', name: 'Charitable Giving', icon: '❤️', description: 'Give back to causes', priority: 'low' },
  { id: 'custom', name: 'Custom Goal', icon: '⭐', description: 'Your unique goal', priority: 'custom' }
];

// Create financial goal
router.post('/:userId', (req, res) => {
  const { userId } = req.params;
  const { name, targetAmount, deadline, category, icon, priority, monthlyTarget, notes } = req.body;

  if (!name || !targetAmount) {
    return res.status(400).json({
      success: false,
      error: 'name and targetAmount are required'
    });
  }

  const goal = {
    id: `goal-${Date.now()}`,
    userId,
    name,
    targetAmount,
    currentAmount: 0,
    monthlyTarget: monthlyTarget || Math.round(targetAmount / 12),
    deadline: deadline || null,
    category: category || 'custom',
    icon: icon || '⭐',
    priority: priority || 'medium',
    notes: notes || '',
    createdAt: new Date().toISOString(),
    milestones: generateGoalMilestones(targetAmount),
    status: 'active',
    streak: 0,
    lastContribution: null
  };

  if (!financialGoals.has(userId)) {
    financialGoals.set(userId, []);
  }
  financialGoals.get(userId).push(goal);

  res.json({
    success: true,
    message: 'Financial goal created',
    data: {
      goal,
      projectedCompletion: calculateProjectedCompletion(goal),
      recommendation: generateGoalRecommendation(goal)
    }
  });
});

// Get all goals
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  const { status, priority } = req.query;

  let goals = financialGoals.get(userId) || [];

  if (status) {
    goals = goals.filter(g => g.status === status);
  }

  if (priority) {
    goals = goals.filter(g => g.priority === priority);
  }

  // Add progress to each goal
  const withProgress = goals.map(g => ({
    ...g,
    progress: Math.round((g.currentAmount / g.targetAmount) * 100),
    remaining: g.targetAmount - g.currentAmount,
    monthlyRequired: g.deadline ?
      Math.round((g.targetAmount - g.currentAmount) / getMonthsRemaining(g.deadline)) :
      g.monthlyTarget,
    onTrack: isGoalOnTrack(g),
    daysRemaining: g.deadline ? getDaysRemaining(g.deadline) : null,
    projectedCompletion: calculateProjectedCompletion(g)
  }));

  // Sort by priority and progress
  withProgress.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2, custom: 3 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.progress - b.progress;
  });

  res.json({
    success: true,
    data: {
      goals: withProgress,
      summary: {
        totalGoals: goals.length,
        activeGoals: goals.filter(g => g.status === 'active').length,
        completedGoals: goals.filter(g => g.status === 'completed').length,
        totalSaved: goals.reduce((sum, g) => sum + g.currentAmount, 0),
        totalTarget: goals.reduce((sum, g) => sum + g.targetAmount, 0)
      }
    }
  });
});

// Get specific goal
router.get('/:userId/:goalId', (req, res) => {
  const { userId, goalId } = req.params;

  const goals = financialGoals.get(userId) || [];
  const goal = goals.find(g => g.id === goalId);

  if (!goal) {
    return res.status(404).json({
      success: false,
      error: 'Goal not found'
    });
  }

  const contributions = (goalContributions.get(goalId) || [])
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json({
    success: true,
    data: {
      ...goal,
      progress: Math.round((goal.currentAmount / goal.targetAmount) * 100),
      remaining: goal.targetAmount - goal.currentAmount,
      monthlyRequired: goal.deadline ?
        Math.round((goal.targetAmount - goal.currentAmount) / getMonthsRemaining(goal.deadline)) :
        goal.monthlyTarget,
      contributions: contributions.slice(0, 20),
      milestones: goal.milestones.map(m => ({
        ...m,
        achieved: goal.currentAmount >= m.amount
      }))
    }
  });
});

// Contribute to goal
router.post('/:userId/:goalId/contribute', (req, res) => {
  const { userId, goalId } = req.params;
  const { amount, date, notes } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Valid amount is required'
    });
  }

  const goals = financialGoals.get(userId) || [];
  const goal = goals.find(g => g.id === goalId);

  if (!goal) {
    return res.status(404).json({
      success: false,
      error: 'Goal not found'
    });
  }

  // Add contribution
  const contribution = {
    id: `contrib-${Date.now()}`,
    goalId,
    amount,
    date: date || new Date().toISOString(),
    notes: notes || '',
    balanceAfter: goal.currentAmount + amount
  };

  if (!goalContributions.has(goalId)) {
    goalContributions.set(goalId, []);
  }
  goalContributions.get(goalId).push(contribution);

  // Update goal
  goal.currentAmount += amount;
  goal.lastContribution = contribution.date;

  // Update streak
  updateContributionStreak(goal);

  // Check milestones
  const achievedMilestones = goal.milestones.filter(m =>
    goal.currentAmount >= m.amount && !m.achieved
  );
  achievedMilestones.forEach(m => m.achieved = true);
  achievedMilestones.forEach(m => m.achievedAt = new Date().toISOString());

  // Check if goal completed
  if (goal.currentAmount >= goal.targetAmount && goal.status === 'active') {
    goal.status = 'completed';
    goal.completedAt = new Date().toISOString();
  }

  res.json({
    success: true,
    message: goal.status === 'completed' ?
      `Congratulations! Goal "${goal.name}" completed!` :
      `Contribution of $${amount.toFixed(2)} recorded`,
    data: {
      contribution,
      goal: {
        id: goal.id,
        name: goal.name,
        currentAmount: goal.currentAmount,
        targetAmount: goal.targetAmount,
        progress: Math.round((goal.currentAmount / goal.targetAmount) * 100),
        status: goal.status,
        streak: goal.streak
      },
      achievedMilestones: achievedMilestones.length,
      nextMilestone: goal.milestones.find(m => goal.currentAmount < m.amount)
    }
  });
});

// Update goal
router.put('/:userId/:goalId', (req, res) => {
  const { userId, goalId } = req.params;
  const updates = req.body;

  const goals = financialGoals.get(userId) || [];
  const goal = goals.find(g => g.id === goalId);

  if (!goal) {
    return res.status(404).json({
      success: false,
      error: 'Goal not found'
    });
  }

  // Allow updating certain fields
  const allowedUpdates = ['name', 'targetAmount', 'deadline', 'monthlyTarget', 'priority', 'notes', 'icon'];
  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
      goal[field] = updates[field];
    }
  });

  goal.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'Goal updated',
    data: goal
  });
});

// Delete goal
router.delete('/:userId/:goalId', (req, res) => {
  const { userId, goalId } = req.params;

  const goals = financialGoals.get(userId) || [];
  const goalIndex = goals.findIndex(g => g.id === goalId);

  if (goalIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Goal not found'
    });
  }

  const deleted = goals.splice(goalIndex, 1)[0];

  res.json({
    success: true,
    message: `Goal "${deleted.name}" deleted`,
    data: { deleted }
  });
});

// Get goal templates
router.get('/templates/all', (req, res) => {
  res.json({
    success: true,
    data: goalTemplates
  });
});

// Get goal progress timeline
router.get('/:userId/:goalId/timeline', (req, res) => {
  const { userId, goalId } = req.params;

  const goals = financialGoals.get(userId) || [];
  const goal = goals.find(g => g.id === goalId);

  if (!goal) {
    return res.status(404).json({
      success: false,
      error: 'Goal not found'
    });
  }

  const contributions = goalContributions.get(goalId) || [];
  const timeline = [];

  // Starting point
  timeline.push({
    date: goal.createdAt,
    event: 'Goal Created',
    amount: 0,
    balance: 0
  });

  // Add contributions
  contributions.forEach(c => {
    timeline.push({
      date: c.date,
      event: 'Contribution',
      amount: c.amount,
      balance: c.balanceAfter
    });
  });

  // Add milestones
  goal.milestones.forEach(m => {
    if (goal.currentAmount >= m.amount) {
      timeline.push({
        date: m.achievedAt || goal.createdAt,
        event: m.label,
        amount: m.amount,
        balance: m.amount
      });
    }
  });

  // Sort by date
  timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

  res.json({
    success: true,
    data: {
      goal: { id: goal.id, name: goal.name, target: goal.targetAmount },
      timeline,
      statistics: {
        totalContributions: contributions.length,
        averageContribution: contributions.length ?
          contributions.reduce((sum, c) => sum + c.amount, 0) / contributions.length : 0,
        longestStreak: goal.streak,
        monthsActive: getMonthsSince(goal.createdAt)
      }
    }
  });
});

// Get all milestones across goals
router.get('/:userId/milestones', (req, res) => {
  const { userId } = req.params;

  const goals = financialGoals.get(userId) || [];

  const allMilestones = [];
  goals.forEach(goal => {
    goal.milestones.forEach(m => {
      allMilestones.push({
        goalId: goal.id,
        goalName: goal.name,
        goalIcon: goal.icon,
        ...m
      });
    });
  });

  const upcoming = allMilestones
    .filter(m => !m.achieved)
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 5);

  const recent = allMilestones
    .filter(m => m.achieved)
    .sort((a, b) => new Date(b.achievedAt) - new Date(a.achievedAt))
    .slice(0, 5);

  res.json({
    success: true,
    data: {
      upcoming,
      recent,
      totalAchieved: allMilestones.filter(m => m.achieved).length,
      totalPending: allMilestones.filter(m => !m.achieved).length
    }
  });
});

// Helper functions
function generateGoalMilestones(targetAmount) {
  const milestones = [
    { amount: targetAmount * 0.10, label: '10% - Getting Started', achieved: false },
    { amount: targetAmount * 0.25, label: '25% - Quarter Way', achieved: false },
    { amount: targetAmount * 0.50, label: '50% - Halfway There', achieved: false },
    { amount: targetAmount * 0.75, label: '75% - Almost Done', achieved: false },
    { amount: targetAmount, label: '100% - Goal Achieved!', achieved: false }
  ];
  return milestones;
}

function calculateProjectedCompletion(goal) {
  if (!goal.deadline) {
    const monthsNeeded = Math.ceil((goal.targetAmount - goal.currentAmount) / goal.monthlyTarget);
    const projectedDate = new Date();
    projectedDate.setMonth(projectedDate.getMonth() + monthsNeeded);
    return projectedDate.toISOString();
  }

  return goal.deadline;
}

function isGoalOnTrack(goal) {
  if (!goal.deadline) return null;

  const monthsRemaining = getMonthsRemaining(goal.deadline);
  const amountRemaining = goal.targetAmount - goal.currentAmount;
  const requiredMonthly = amountRemaining / monthsRemaining;

  return requiredMonthly <= goal.monthlyTarget * 1.2; // Within 20% of target
}

function getMonthsRemaining(deadline) {
  const target = new Date(deadline);
  const now = new Date();
  return Math.max(0, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()));
}

function getDaysRemaining(deadline) {
  const target = new Date(deadline);
  const now = new Date();
  return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
}

function getMonthsSince(startDate) {
  const start = new Date(startDate);
  const now = new Date();
  return Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
}

function updateContributionStreak(goal) {
  const contributions = goalContributions.get(goal.id) || [];
  const lastContrib = contributions[contributions.length - 2]; // Last before current

  if (!lastContrib) {
    goal.streak = 1;
    return;
  }

  const lastDate = new Date(lastContrib.date);
  const thisDate = new Date();
  const daysSince = Math.floor((thisDate - lastDate) / (1000 * 60 * 60 * 24));

  if (daysSince <= 35) { // Roughly monthly
    goal.streak++;
  } else {
    goal.streak = 1;
  }
}

function generateGoalRecommendation(goal) {
  const recommendations = [];

  if (goal.currentAmount === 0) {
    recommendations.push('Start with a small initial contribution to build momentum');
  }

  if (goal.deadline) {
    const monthsRemaining = getMonthsRemaining(goal.deadline);
    const required = (goal.targetAmount - goal.currentAmount) / monthsRemaining;
    if (required > goal.monthlyTarget * 1.5) {
      recommendations.push(`Consider increasing monthly contributions to $${Math.round(required)} to meet your deadline`);
    }
  }

  recommendations.push('Set up automatic transfers to stay consistent');
  recommendations.push('Celebrate small milestones to stay motivated');

  return recommendations;
}

module.exports = router;