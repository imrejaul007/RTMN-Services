/**
 * Human Growth Engine — v1.0.0
 * =============================
 * Tracks personal growth: skills, habits, goals, values evolution:
 * - Growth metrics and tracking
 * - Habit formation and streaks
 * - Goal management
 * - Skills development
 * - Values and principles tracking
 * - Growth insights and summaries
 *
 * Port: 4895
 */

import express from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Services
import { GrowthTracker } from './services/growthTracker.js';

// Types
import type {
  GrowthCategory,
  Goal,
  Habit,
  Skill,
  GoalStatus,
  HabitStatus
} from './types/index.js';

// ── App Setup ────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// ── Storage ─────────────────────────────────────────────────────────────────

const growthTracker = new GrowthTracker();
const goals = new Map<string, Goal>();
const habits = new Map<string, Habit>();
const skills = new Map<string, Skill>();

// ── Request Schemas ───────────────────────────────────────────────────────────

const TrackProgressSchema = z.object({
  userId: z.string().min(1),
  category: z.enum(['skills', 'habits', 'health', 'faith', 'career', 'relationships', 'finance', 'creativity', 'knowledge', 'leadership']),
  name: z.string().min(1),
  value: z.number().min(1).max(10),
  note: z.string().optional()
});

const CreateGoalSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['skills', 'habits', 'health', 'faith', 'career', 'relationships', 'finance', 'creativity', 'knowledge', 'leadership']),
  priority: z.enum(['high', 'medium', 'low']),
  timeframe: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'long-term']),
  targetDate: z.string().optional()
});

const CreateHabitSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['skills', 'habits', 'health', 'faith', 'career', 'relationships', 'finance', 'creativity', 'knowledge', 'leadership']),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'custom']),
  customDays: z.array(z.number()).optional(),
  reminderTime: z.string().optional()
});

const GetSummarySchema = z.object({
  userId: z.string().min(1),
  period: z.enum(['week', 'month', 'year'])
});

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/growth/track
 * Track a growth data point
 */
app.post('/api/growth/track', async (req, res) => {
  try {
    const { userId, category, name, value, note } = TrackProgressSchema.parse(req.body);

    const metric = growthTracker.track(userId, category, name, value, note);

    res.json({
      success: true,
      metric,
      trend: growthTracker.calculateTrend(metric)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[human-growth]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /api/growth/:userId
 * Get all growth metrics for user
 */
app.get('/api/growth/:userId', (req, res) => {
  const { userId } = req.params;
  const { category } = req.query;

  let metrics = growthTracker.getAllForUser(userId);

  if (category) {
    metrics = metrics.filter(m => m.category === category);
  }

  const withTrends = metrics.map(m => ({
    ...m,
    trend: growthTracker.calculateTrend(m)
  }));

  res.json({
    success: true,
    metrics: withTrends,
    count: metrics.length
  });
});

/**
 * GET /api/growth/:userId/:category/:name
 * Get specific metric
 */
app.get('/api/growth/:userId/:category/:name', (req, res) => {
  const { userId, category, name } = req.params;

  const metric = growthTracker.get(userId, category as GrowthCategory, decodeURIComponent(name));

  if (!metric) {
    return res.status(404).json({ success: false, error: 'Metric not found' });
  }

  res.json({
    success: true,
    metric,
    trend: growthTracker.calculateTrend(metric)
  });
});

/**
 * POST /api/goals
 * Create a new goal
 */
app.post('/api/goals', async (req, res) => {
  try {
    const data = CreateGoalSchema.parse(req.body);

    const goal: Goal = {
      id: uuidv4(),
      userId: data.userId,
      title: data.title,
      description: data.description || '',
      category: data.category,
      status: 'active',
      priority: data.priority,
      timeframe: data.timeframe,
      progress: 0,
      milestones: [],
      createdAt: new Date().toISOString(),
      targetDate: data.targetDate,
      relatedHabits: [],
      relatedSkills: []
    };

    goals.set(goal.id, goal);

    res.json({
      success: true,
      goal
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[human-growth]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /api/goals/:userId
 * Get all goals for user
 */
app.get('/api/goals/:userId', (req, res) => {
  const { userId } = req.params;
  const { status, category } = req.query;

  let userGoals = Array.from(goals.values()).filter(g => g.userId === userId);

  if (status) {
    userGoals = userGoals.filter(g => g.status === status);
  }
  if (category) {
    userGoals = userGoals.filter(g => g.category === category);
  }

  res.json({
    success: true,
    goals: userGoals,
    count: userGoals.length
  });
});

/**
 * PATCH /api/goals/:goalId
 * Update goal progress
 */
app.patch('/api/goals/:goalId', async (req, res) => {
  try {
    const { goalId } = req.params;
    const { progress, status, note } = req.body;

    const goal = goals.get(goalId);
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    if (progress !== undefined) {
      goal.progress = Math.min(100, Math.max(0, progress));
      if (goal.progress === 100) {
        goal.status = 'completed';
        goal.completedAt = new Date().toISOString();
      }
    }

    if (status) {
      goal.status = status as GoalStatus;
    }

    goals.set(goalId, goal);

    res.json({
      success: true,
      goal
    });
  } catch (error) {
    console.error('[human-growth]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * POST /api/habits
 * Create a new habit
 */
app.post('/api/habits', async (req, res) => {
  try {
    const data = CreateHabitSchema.parse(req.body);

    const habit: Habit = {
      id: uuidv4(),
      userId: data.userId,
      name: data.name,
      description: data.description,
      category: data.category,
      frequency: data.frequency,
      customDays: data.customDays,
      status: 'active',
      currentStreak: 0,
      bestStreak: 0,
      totalCompletions: 0,
      completionRate: 0,
      reminderTime: data.reminderTime,
      createdAt: new Date().toISOString(),
      history: []
    };

    habits.set(habit.id, habit);

    res.json({
      success: true,
      habit
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[human-growth]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * POST /api/habits/:habitId/complete
 * Complete a habit for today
 */
app.post('/api/habits/:habitId/complete', async (req, res) => {
  try {
    const { habitId } = req.params;
    const { note } = req.body;

    const habit = habits.get(habitId);
    if (!habit) {
      return res.status(404).json({ success: false, error: 'Habit not found' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if already completed today
    const todayCompletion = habit.history.find(h => h.date === today);
    if (todayCompletion?.completed) {
      return res.json({
        success: true,
        habit,
        message: 'Already completed today'
      });
    }

    // Update streak
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const yesterdayCompleted = habit.history.find(h => h.date === yesterday);

    if (habit.frequency === 'daily') {
      if (yesterdayCompleted?.completed || habit.currentStreak === 0) {
        habit.currentStreak++;
      } else {
        habit.currentStreak = 1;
      }
    } else {
      habit.currentStreak++;
    }

    habit.bestStreak = Math.max(habit.bestStreak, habit.currentStreak);
    habit.totalCompletions++;
    habit.history.push({ date: today, completed: true, note });

    // Calculate completion rate
    const recent = habit.history.slice(-30);
    habit.completionRate = (recent.filter(h => h.completed).length / recent.length) * 100;

    habits.set(habitId, habit);

    res.json({
      success: true,
      habit,
      streak: habit.currentStreak
    });
  } catch (error) {
    console.error('[human-growth]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /api/habits/:userId
 * Get all habits for user
 */
app.get('/api/habits/:userId', (req, res) => {
  const { userId } = req.params;
  const { status } = req.query;

  let userHabits = Array.from(habits.values()).filter(h => h.userId === userId);

  if (status) {
    userHabits = userHabits.filter(h => h.status === status);
  }

  res.json({
    success: true,
    habits: userHabits,
    count: userHabits.length
  });
});

/**
 * POST /api/summary
 * Generate growth summary
 */
app.post('/api/summary', async (req, res) => {
  try {
    const { userId, period } = GetSummarySchema.parse(req.body);

    const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const summary = growthTracker.generateSummary(userId, periodDays);

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[human-growth]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /api/stats/:userId
 * Get growth statistics
 */
app.get('/api/stats/:userId', (req, res) => {
  const { userId } = req.params;

  const userMetrics = growthTracker.getAllForUser(userId);
  const userGoals = Array.from(goals.values()).filter(g => g.userId === userId);
  const userHabits = Array.from(habits.values()).filter(h => h.userId === userId);

  const completedGoals = userGoals.filter(g => g.status === 'completed').length;
  const activeHabits = userHabits.filter(h => h.status === 'active').length;
  const topStreak = userHabits.reduce((max, h) => Math.max(max, h.bestStreak), 0);

  res.json({
    success: true,
    stats: {
      totalMetrics: userMetrics.length,
      totalGoals: userGoals.length,
      completedGoals,
      activeHabits,
      longestStreak: topStreak,
      topGrowthAreas: userMetrics
        .map(m => ({ name: m.name, trend: growthTracker.calculateTrend(m) }))
        .filter(m => m.trend === 'improving')
        .slice(0, 5)
    }
  });
});

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'human-growth-engine',
    port: process.env.PORT || 4895,
    version: '1.0.0',
    capabilities: [
      'growth-tracking',
      'habit-management',
      'goal-management',
      'growth-summaries',
      'streak-tracking'
    ],
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /ready
 */
app.get('/ready', (req, res) => {
  res.json({
    ready: true,
    services: {
      growthTracker: true,
      goalStorage: true,
      habitStorage: true
    },
    timestamp: new Date().toISOString()
  });
});

// ── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4895;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║            HUMAN GROWTH ENGINE v1.0.0                    ║
║                                                                ║
║  📈  Personal Growth & Development                          ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                               ║
║                                                                ║
║  Capabilities:                                                 ║
║  • Growth metrics & tracking                                 ║
║  • Habit formation & streaks                                  ║
║  • Goal management                                           ║
║  • Growth insights                                           ║
║  • Progress summaries                                        ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('[human-growth] Shutting down...');
  server.close(() => process.exit(0));
});

export default app;
