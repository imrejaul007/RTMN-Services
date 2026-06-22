// ============================================================================
// SUTAR GoalOS - Goal Service (CRUD Operations)
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import type {
  Goal,
  GoalStatus,
  Priority,
  GoalCategory,
  Progress,
  CreateGoalRequest,
  UpdateGoalRequest,
  ListQueryOptions,
  PaginatedResponse,
  GoalStats,
} from '../types/index.js';
import {
  GoalStatus as GoalStatusEnum,
  Priority as PriorityEnum,
  GoalCategory as GoalCategoryEnum,
} from '../types/index.js';

export class GoalService {
  private goals: Map<string, Goal> = new Map();
  private progressHistory: Map<string, Array<{ date: string; progress: number }>> = new Map();

  /**
   * Create a new goal
   */
  async create(data: CreateGoalRequest): Promise<Goal> {
    const now = new Date().toISOString();
    const startDate = data.startDate || now;

    const goal: Goal = {
      id: uuidv4(),
      title: data.title,
      description: data.description,
      category: data.category,
      status: GoalStatusEnum.ACTIVE,
      priority: data.priority || PriorityEnum.MEDIUM,
      progress: {
        current: 0,
        target: 100,
        percentage: 0,
        trend: 'stable',
        lastUpdated: now,
      },
      deadline: data.deadline,
      startDate,
      childGoalIds: [],
      milestoneIds: [],
      okrIds: [],
      tags: data.tags || [],
      metadata: data.metadata,
      createdAt: now,
      updatedAt: now,
    };

    // If parent goal specified, add this goal as a child
    if (data.parentGoalId) {
      const parent = this.goals.get(data.parentGoalId);
      if (parent) {
        goal.parentGoalId = data.parentGoalId;
        parent.childGoalIds.push(goal.id);
        parent.updatedAt = now;
      }
    }

    // Initialize progress history
    this.progressHistory.set(goal.id, [{ date: now, progress: 0 }]);

    this.goals.set(goal.id, goal);
    return goal;
  }

  /**
   * Get a goal by ID
   */
  async get(id: string): Promise<Goal | null> {
    return this.goals.get(id) || null;
  }

  /**
   * List goals with filtering and pagination
   */
  async list(options: ListQueryOptions = {}): Promise<PaginatedResponse<Goal>> {
    let goals = Array.from(this.goals.values());

    // Apply filters
    if (options.status) {
      goals = goals.filter(g => g.status === options.status);
    }
    if (options.priority) {
      goals = goals.filter(g => g.priority === options.priority);
    }
    if (options.category) {
      goals = goals.filter(g => g.category === options.category);
    }
    if (options.parentGoalId) {
      goals = goals.filter(g => g.parentGoalId === options.parentGoalId);
    }
    if (options.tags && options.tags.length > 0) {
      goals = goals.filter(g => options.tags!.some(tag => g.tags.includes(tag)));
    }

    // Sort by priority and created date
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    goals.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = goals.length;
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    return {
      items: goals.slice(offset, offset + limit),
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Update a goal
   */
  async update(id: string, data: UpdateGoalRequest): Promise<Goal | null> {
    const goal = this.goals.get(id);
    if (!goal) return null;

    const now = new Date().toISOString();

    // Update fields
    if (data.title !== undefined) goal.title = data.title;
    if (data.description !== undefined) goal.description = data.description;
    if (data.category !== undefined) goal.category = data.category;
    if (data.status !== undefined) {
      goal.status = data.status;
      if (data.status === GoalStatusEnum.COMPLETED || data.status === GoalStatusEnum.FAILED) {
        goal.completedAt = now;
      }
    }
    if (data.priority !== undefined) goal.priority = data.priority;
    if (data.deadline !== undefined) goal.deadline = data.deadline;
    if (data.tags !== undefined) goal.tags = data.tags;
    if (data.metadata !== undefined) goal.metadata = data.metadata;

    // Update progress if provided
    if (data.progress) {
      const history = this.progressHistory.get(id) || [];
      history.push({ date: now, progress: data.progress.current || goal.progress.current });
      this.progressHistory.set(id, history);

      goal.progress = {
        ...goal.progress,
        ...data.progress,
        lastUpdated: now,
      };

      // Calculate percentage
      if (goal.progress.target > 0) {
        goal.progress.percentage = Math.min(100, Math.round((goal.progress.current / goal.progress.target) * 100));
      }

      // Determine trend
      if (history.length >= 2) {
        const recent = history.slice(-5);
        const avgRecent = recent.slice(-2).reduce((sum, h) => sum + h.progress, 0) / 2;
        const olderAvg = recent.slice(0, 2).reduce((sum, h) => sum + h.progress, 0) / 2;
        if (avgRecent > olderAvg + 2) {
          goal.progress.trend = 'up';
        } else if (avgRecent < olderAvg - 2) {
          goal.progress.trend = 'down';
        } else {
          goal.progress.trend = 'stable';
        }
      }
    }

    goal.updatedAt = now;
    this.goals.set(id, goal);
    return goal;
  }

  /**
   * Delete a goal
   */
  async delete(id: string): Promise<boolean> {
    const goal = this.goals.get(id);
    if (!goal) return false;

    // Remove from parent's child goals
    if (goal.parentGoalId) {
      const parent = this.goals.get(goal.parentGoalId);
      if (parent) {
        parent.childGoalIds = parent.childGoalIds.filter(cid => cid !== id);
        parent.updatedAt = new Date().toISOString();
      }
    }

    // Delete child goals recursively
    for (const childId of goal.childGoalIds) {
      await this.delete(childId);
    }

    // Clean up progress history
    this.progressHistory.delete(id);

    return this.goals.delete(id);
  }

  /**
   * Add a milestone reference to a goal
   */
  addMilestone(goalId: string, milestoneId: string): void {
    const goal = this.goals.get(goalId);
    if (goal && !goal.milestoneIds.includes(milestoneId)) {
      goal.milestoneIds.push(milestoneId);
      goal.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Add an OKR reference to a goal
   */
  addOKR(goalId: string, okrId: string): void {
    const goal = this.goals.get(goalId);
    if (goal && !goal.okrIds.includes(okrId)) {
      goal.okrIds.push(okrId);
      goal.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Add a child goal reference
   */
  addChildGoal(parentId: string, childId: string): void {
    const parent = this.goals.get(parentId);
    if (parent && !parent.childGoalIds.includes(childId)) {
      parent.childGoalIds.push(childId);
      parent.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Get goal statistics
   */
  getStats(): GoalStats {
    const goals = Array.from(this.goals.values());

    const stats: GoalStats = {
      total: goals.length,
      byStatus: {
        [GoalStatusEnum.ACTIVE]: 0,
        [GoalStatusEnum.PAUSED]: 0,
        [GoalStatusEnum.COMPLETED]: 0,
        [GoalStatusEnum.FAILED]: 0,
        [GoalStatusEnum.CANCELLED]: 0,
      },
      byPriority: {
        [PriorityEnum.CRITICAL]: 0,
        [PriorityEnum.HIGH]: 0,
        [PriorityEnum.MEDIUM]: 0,
        [PriorityEnum.LOW]: 0,
      },
      byCategory: {
        [GoalCategoryEnum.FINANCIAL]: 0,
        [GoalCategoryEnum.OPERATIONAL]: 0,
        [GoalCategoryEnum.GROWTH]: 0,
        [GoalCategoryEnum.CUSTOMER]: 0,
        [GoalCategoryEnum.INTERNAL]: 0,
        [GoalCategoryEnum.COMPLIANCE]: 0,
        [GoalCategoryEnum.INNOVATION]: 0,
        [GoalCategoryEnum.OTHER]: 0,
      },
      averageProgress: 0,
      completedThisPeriod: 0,
      overdueGoals: 0,
    };

    const now = new Date();
    const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

    for (const goal of goals) {
      stats.byStatus[goal.status]++;
      stats.byPriority[goal.priority]++;
      stats.byCategory[goal.category]++;

      // Check overdue
      if (goal.deadline && new Date(goal.deadline) < now && goal.status === GoalStatusEnum.ACTIVE) {
        stats.overdueGoals++;
      }

      // Completed in period
      if (goal.completedAt && new Date(goal.completedAt) >= periodStart) {
        stats.completedThisPeriod++;
      }
    }

    // Calculate average progress
    if (goals.length > 0) {
      stats.averageProgress = Math.round(
        goals.reduce((sum, g) => sum + g.progress.percentage, 0) / goals.length
      );
    }

    return stats;
  }

  /**
   * Get progress history for a goal
   */
  getProgressHistory(goalId: string): Array<{ date: string; progress: number }> {
    return this.progressHistory.get(goalId) || [];
  }

  /**
   * Get root goals (goals without parent)
   */
  getRootGoals(): Goal[] {
    return Array.from(this.goals.values()).filter(g => !g.parentGoalId);
  }

  /**
   * Get goal hierarchy (root to leaves)
   */
  getGoalHierarchy(goalId: string): Goal[] {
    const hierarchy: Goal[] = [];
    let current = this.goals.get(goalId);

    while (current) {
      hierarchy.push(current);
      current = current.parentGoalId ? this.goals.get(current.parentGoalId) : undefined;
    }

    return hierarchy.reverse();
  }

  /**
   * Get all descendant goals
   */
  getDescendants(goalId: string): Goal[] {
    const descendants: Goal[] = [];
    const goal = this.goals.get(goalId);

    if (!goal) return descendants;

    const collectDescendants = (id: string) => {
      const g = this.goals.get(id);
      if (g) {
        for (const childId of g.childGoalIds) {
          descendants.push(this.goals.get(childId)!);
          collectDescendants(childId);
        }
      }
    };

    collectDescendants(goalId);
    return descendants;
  }
}