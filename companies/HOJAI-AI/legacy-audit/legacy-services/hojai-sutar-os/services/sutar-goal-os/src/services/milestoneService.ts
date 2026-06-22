// ============================================================================
// SUTAR GoalOS - Milestone Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import type {
  Milestone,
  MilestoneStatus,
  Progress,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
} from '../types/index.js';
import { MilestoneStatus as MilestoneStatusEnum } from '../types/index.js';

export class MilestoneService {
  private milestones: Map<string, Milestone> = new Map();
  private milestonesByGoal: Map<string, Set<string>> = new Map();

  /**
   * Create a new milestone
   */
  async create(goalId: string, data: CreateMilestoneRequest): Promise<Milestone> {
    const now = new Date().toISOString();

    const milestone: Milestone = {
      id: uuidv4(),
      goalId,
      title: data.title,
      description: data.description,
      targetDate: data.targetDate,
      status: MilestoneStatusEnum.PENDING,
      progress: {
        current: 0,
        target: 100,
        percentage: 0,
        trend: 'stable',
        lastUpdated: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.milestones.set(milestone.id, milestone);

    // Add to goal's milestone set
    if (!this.milestonesByGoal.has(goalId)) {
      this.milestonesByGoal.set(goalId, new Set());
    }
    this.milestonesByGoal.get(goalId)!.add(milestone.id);

    return milestone;
  }

  /**
   * Get a milestone by ID
   */
  async get(id: string): Promise<Milestone | null> {
    return this.milestones.get(id) || null;
  }

  /**
   * Get milestones for a goal
   */
  async getByGoal(goalId: string): Promise<Milestone[]> {
    const milestoneIds = this.milestonesByGoal.get(goalId);
    if (!milestoneIds) return [];

    const milestones: Milestone[] = [];
    for (const id of milestoneIds) {
      const milestone = this.milestones.get(id);
      if (milestone) {
        milestones.push(milestone);
      }
    }

    // Sort by target date
    return milestones.sort((a, b) =>
      new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    );
  }

  /**
   * Update a milestone
   */
  async update(id: string, data: UpdateMilestoneRequest): Promise<Milestone | null> {
    const milestone = this.milestones.get(id);
    if (!milestone) return null;

    const now = new Date().toISOString();

    if (data.title !== undefined) milestone.title = data.title;
    if (data.description !== undefined) milestone.description = data.description;
    if (data.targetDate !== undefined) milestone.targetDate = data.targetDate;

    if (data.status !== undefined) {
      milestone.status = data.status;
      if (data.status === MilestoneStatusEnum.COMPLETED) {
        milestone.completedAt = now;
        milestone.progress.current = 100;
        milestone.progress.percentage = 100;
      }
    }

    if (data.progress !== undefined) {
      milestone.progress = {
        ...milestone.progress,
        ...data.progress,
        lastUpdated: now,
      };

      // Auto-complete if progress reaches 100%
      if (milestone.progress.percentage >= 100 && milestone.status !== MilestoneStatusEnum.COMPLETED) {
        milestone.status = MilestoneStatusEnum.COMPLETED;
        milestone.completedAt = now;
      }
    }

    // Check for overdue status
    if (milestone.status !== MilestoneStatusEnum.COMPLETED &&
        milestone.status !== MilestoneStatusEnum.SKIPPED &&
        new Date(milestone.targetDate) < new Date()) {
      milestone.status = MilestoneStatusEnum.OVERDUE;
    }

    milestone.updatedAt = now;
    this.milestones.set(id, milestone);
    return milestone;
  }

  /**
   * Delete a milestone
   */
  async delete(id: string): Promise<boolean> {
    const milestone = this.milestones.get(id);
    if (!milestone) return false;

    // Remove from goal's milestone set
    const goalMilestones = this.milestonesByGoal.get(milestone.goalId);
    if (goalMilestones) {
      goalMilestones.delete(id);
    }

    return this.milestones.delete(id);
  }

  /**
   * Update milestone progress
   */
  async updateProgress(id: string, current: number, target: number = 100): Promise<Milestone | null> {
    const milestone = this.milestones.get(id);
    if (!milestone) return null;

    const now = new Date().toISOString();
    const percentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

    // Determine trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    const progressDiff = current - milestone.progress.current;
    if (progressDiff > 5) trend = 'up';
    else if (progressDiff < -5) trend = 'down';

    milestone.progress = {
      current,
      target,
      percentage,
      trend,
      lastUpdated: now,
    };

    // Auto-complete if progress reaches 100%
    if (percentage >= 100 && milestone.status !== MilestoneStatusEnum.COMPLETED) {
      milestone.status = MilestoneStatusEnum.COMPLETED;
      milestone.completedAt = now;
    }

    milestone.updatedAt = now;
    this.milestones.set(id, milestone);
    return milestone;
  }

  /**
   * Get overdue milestones
   */
  async getOverdue(): Promise<Milestone[]> {
    const now = new Date();
    const overdue: Milestone[] = [];

    for (const milestone of this.milestones.values()) {
      if (milestone.status !== MilestoneStatusEnum.COMPLETED &&
          milestone.status !== MilestoneStatusEnum.SKIPPED &&
          new Date(milestone.targetDate) < now) {
        overdue.push(milestone);
      }
    }

    return overdue;
  }

  /**
   * Get upcoming milestones (within N days)
   */
  async getUpcoming(goalId: string, withinDays: number = 7): Promise<Milestone[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

    const milestones = await this.getByGoal(goalId);
    return milestones.filter(m =>
      m.status !== MilestoneStatusEnum.COMPLETED &&
      m.status !== MilestoneStatusEnum.SKIPPED &&
      new Date(m.targetDate) >= now &&
      new Date(m.targetDate) <= cutoff
    );
  }

  /**
   * Calculate overall milestone progress for a goal
   */
  async calculateOverallProgress(goalId: string): Promise<{
    completed: number;
    total: number;
    percentage: number;
    overdue: number;
  }> {
    const milestones = await this.getByGoal(goalId);
    const completed = milestones.filter(m => m.status === MilestoneStatusEnum.COMPLETED).length;
    const overdue = milestones.filter(m => m.status === MilestoneStatusEnum.OVERDUE).length;

    return {
      completed,
      total: milestones.length,
      percentage: milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0,
      overdue,
    };
  }
}