import { requireAuth } from '@rtmn/shared/auth';
/**
 * Goal Twin Service v1.0
 * Digital twin for employee goals and OKRs
 * Port: 4897
 */

import express, { type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: GoalCategory;
  type: GoalType;
  status: GoalStatus;
  priority: GoalPriority;
  progress: number;
  employeeId?: string;
  department?: string;
  startDate: string;
  targetDate: string;
  completedAt?: string;
  milestones: Milestone[];
  metrics: GoalMetric[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  completedAt?: string;
}

export interface GoalMetric {
  id: string;
  name: string;
  current: number;
  target: number;
  unit?: string;
  lastUpdated: string;
}

export type GoalCategory = 'personal' | 'team' | 'department' | 'company';
export type GoalType = 'okr' | 'kpi' | 'project' | 'task' | 'learning';
export type GoalStatus = 'draft' | 'active' | 'at_risk' | 'completed' | 'cancelled';
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';

export interface GoalCreate {
  title: string;
  description?: string;
  category?: GoalCategory;
  type?: GoalType;
  priority?: GoalPriority;
  employeeId?: string;
  department?: string;
  startDate: string;
  targetDate: string;
  milestones?: Omit<Milestone, 'id'>[];
  metrics?: Omit<GoalMetric, 'id' | 'lastUpdated'>[];
  metadata?: Record<string, any>;
}

export interface GoalUpdate {
  title?: string;
  description?: string;
  category?: GoalCategory;
  type?: GoalType;
  status?: GoalStatus;
  priority?: GoalPriority;
  progress?: number;
  employeeId?: string;
  department?: string;
  startDate?: string;
  targetDate?: string;
  metadata?: Record<string, any>;
}

// Create GoalTwin service
export function createGoalTwinService() {
  const goals: Map<string, Goal> = new Map();

  const app = express();
  app.use(express.json());

  // POST /api/goals - Create goal
  app.post('/api/goals',requireAuth,  (req: Request, res: Response) => {
    const { title, description, category, type, priority, employeeId, department, startDate, targetDate, milestones, metrics, metadata } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!startDate || !targetDate) {
      return res.status(400).json({ error: 'startDate and targetDate are required' });
    }

    const goal: Goal = {
      id: uuidv4(),
      title,
      description,
      category: category || 'personal',
      type: type || 'okr',
      status: 'draft',
      priority: priority || 'medium',
      progress: 0,
      employeeId,
      department,
      startDate,
      targetDate,
      milestones: (milestones || []).map(m => ({ ...m, id: uuidv4() })),
      metrics: (metrics || []).map(m => ({ ...m, id: uuidv4(), lastUpdated: new Date().toISOString() })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata
    };

    goals.set(goal.id, goal);
    return res.status(201).json(goal);
  });

  // GET /api/goals - List goals (MUST come before :id)
  app.get('/api/goals', (req: Request, res: Response) => {
    const { status, type, category, priority, employeeId, department } = req.query;
    let filtered = Array.from(goals.values());

    if (status) filtered = filtered.filter(g => g.status === status);
    if (type) filtered = filtered.filter(g => g.type === type);
    if (category) filtered = filtered.filter(g => g.category === category);
    if (priority) filtered = filtered.filter(g => g.priority === priority);
    if (employeeId) filtered = filtered.filter(g => g.employeeId === employeeId);
    if (department) filtered = filtered.filter(g => g.department === department);

    return res.status(200).json({ goals: filtered, total: filtered.length });
  });

  // GET /api/goals/analytics - Goal analytics
  app.get('/api/goals/analytics', (_req: Request, res: Response) => {
    const allGoals = Array.from(goals.values());

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let totalProgress = 0;

    allGoals.forEach(goal => {
      byStatus[goal.status] = (byStatus[goal.status] || 0) + 1;
      byType[goal.type] = (byType[goal.type] || 0) + 1;
      byCategory[goal.category] = (byCategory[goal.category] || 0) + 1;
      byPriority[goal.priority] = (byPriority[goal.priority] || 0) + 1;
      totalProgress += goal.progress;
    });

    return res.status(200).json({
      total: allGoals.length,
      byStatus,
      byType,
      byCategory,
      byPriority,
      avgProgress: allGoals.length > 0 ? totalProgress / allGoals.length : 0,
      completionRate: allGoals.length > 0
        ? ((byStatus['completed'] || 0) / allGoals.length) * 100
        : 0
    });
  });

  // GET /api/goals/:id - Get goal
  app.get('/api/goals/:id', (req: Request, res: Response) => {
    const goal = goals.get(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    return res.status(200).json(goal);
  });

  // PUT /api/goals/:id - Update goal
  app.put('/api/goals/:id',requireAuth,  (req: Request, res: Response) => {
    const goal = goals.get(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const updates = req.body;
    if (updates.title !== undefined) goal.title = updates.title;
    if (updates.description !== undefined) goal.description = updates.description;
    if (updates.category !== undefined) goal.category = updates.category;
    if (updates.type !== undefined) goal.type = updates.type;
    if (updates.status !== undefined) {
      goal.status = updates.status;
      if (updates.status === 'completed') {
        goal.completedAt = new Date().toISOString();
        goal.progress = 100;
      }
    }
    if (updates.priority !== undefined) goal.priority = updates.priority;
    if (updates.progress !== undefined) goal.progress = Math.min(100, Math.max(0, updates.progress));
    if (updates.employeeId !== undefined) goal.employeeId = updates.employeeId;
    if (updates.department !== undefined) goal.department = updates.department;
    if (updates.startDate !== undefined) goal.startDate = updates.startDate;
    if (updates.targetDate !== undefined) goal.targetDate = updates.targetDate;
    if (updates.metadata !== undefined) goal.metadata = updates.metadata;

    goal.updatedAt = new Date().toISOString();
    goals.set(goal.id, goal);
    return res.status(200).json(goal);
  });

  // DELETE /api/goals/:id - Delete goal
  app.delete('/api/goals/:id',requireAuth,  (req: Request, res: Response) => {
    if (!goals.has(req.params.id)) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    goals.delete(req.params.id);
    return res.status(204).send();
  });

  // POST /api/goals/:id/milestones - Add milestone
  app.post('/api/goals/:id/milestones',requireAuth,  (req: Request, res: Response) => {
    const goal = goals.get(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const { title, description, dueDate } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const milestone: Milestone = {
      id: uuidv4(),
      title,
      description,
      status: 'pending',
      dueDate
    };

    goal.milestones.push(milestone);
    goal.updatedAt = new Date().toISOString();
    goals.set(goal.id, goal);
    return res.status(201).json(milestone);
  });

  // PUT /api/goals/:id/milestones/:milestoneId - Update milestone
  app.put('/api/goals/:id/milestones/:milestoneId',requireAuth,  (req: Request, res: Response) => {
    const goal = goals.get(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const milestone = goal.milestones.find(m => m.id === req.params.milestoneId);
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    const { title, description, status, dueDate } = req.body;
    if (title !== undefined) milestone.title = title;
    if (description !== undefined) milestone.description = description;
    if (status !== undefined) {
      milestone.status = status;
      if (status === 'completed') milestone.completedAt = new Date().toISOString();
    }
    if (dueDate !== undefined) milestone.dueDate = dueDate;

    goal.updatedAt = new Date().toISOString();
    goals.set(goal.id, goal);
    return res.status(200).json(milestone);
  });

  // PUT /api/goals/:id/metrics/:metricId - Update metric
  app.put('/api/goals/:id/metrics/:metricId',requireAuth,  (req: Request, res: Response) => {
    const goal = goals.get(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const metric = goal.metrics.find(m => m.id === req.params.metricId);
    if (!metric) {
      return res.status(404).json({ error: 'Metric not found' });
    }

    const { current, target, unit } = req.body;
    if (current !== undefined) metric.current = current;
    if (target !== undefined) metric.target = target;
    if (unit !== undefined) metric.unit = unit;
    metric.lastUpdated = new Date().toISOString();

    // Auto-update goal progress based on metrics
    if (goal.metrics.length > 0) {
      const totalProgress = goal.metrics.reduce((sum, m) => {
        return sum + (m.target > 0 ? (m.current / m.target) * 100 : 0);
      }, 0);
      goal.progress = Math.min(100, Math.round(totalProgress / goal.metrics.length));
    }

    goal.updatedAt = new Date().toISOString();
    goals.set(goal.id, goal);
    return res.status(200).json(metric);
  });

  // GET /health - Health check
  app.get('/health', (_req: Request, res: Response) => {
    return res.status(200).json({
      status: 'healthy',
      service: 'goal-twin',
      timestamp: new Date().toISOString(),
      goals: goals.size
    });
  });

  return app;
}

export default createGoalTwinService;