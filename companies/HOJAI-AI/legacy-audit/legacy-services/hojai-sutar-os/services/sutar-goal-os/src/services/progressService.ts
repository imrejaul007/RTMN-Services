// ============================================================================
// SUTAR GoalOS - Progress Service
// ============================================================================

import type {
  Goal,
  GoalAnalytics,
  Progress,
  Milestone,
  OKRSet,
} from '../types/index.js';
import { GoalStatus as GoalStatusEnum, MilestoneStatus as MilestoneStatusEnum } from '../types/index.js';
import { GoalService } from './goalService.js';
import { OKRService } from './okrService.js';

interface MilestoneService {
  getByGoal(goalId: string): Promise<Milestone[]>;
}

export class ProgressService {
  private goalService: GoalService;
  private okrService: OKRService;
  private milestoneService?: MilestoneService;

  constructor(goalService: GoalService, okrService: OKRService, milestoneService?: MilestoneService) {
    this.goalService = goalService;
    this.okrService = okrService;
    this.milestoneService = milestoneService;
  }

  /**
   * Calculate overall progress for a goal
   */
  async calculateProgress(goal: Goal): Promise<Progress> {
    const now = new Date().toISOString();

    // Base progress from goal itself
    let currentProgress = goal.progress.current;
    let targetProgress = goal.progress.target;

    // Include child goals progress
    if (goal.childGoalIds.length > 0) {
      let childProgressSum = 0;
      let childCount = 0;

      for (const childId of goal.childGoalIds) {
        const child = await this.goalService.get(childId);
        if (child) {
          childProgressSum += child.progress.percentage;
          childCount++;
        }
      }

      if (childCount > 0) {
        const avgChildProgress = childProgressSum / childCount;
        currentProgress = (currentProgress + avgChildProgress) / 2;
        targetProgress = 100;
      }
    }

    // Include milestones progress
    if (this.milestoneService) {
      const milestones = await this.milestoneService.getByGoal(goal.id);
      if (milestones.length > 0) {
        const completedMilestones = milestones.filter(m => m.status === MilestoneStatusEnum.COMPLETED).length;
        const milestoneProgress = (completedMilestones / milestones.length) * 100;
        currentProgress = (currentProgress + milestoneProgress) / 2;
      }
    }

    // Include OKR progress
    const okrSets = await this.okrService.getByGoal(goal.id);
    if (okrSets.length > 0) {
      const avgOKRProgress = okrSets.reduce((sum, okr) => sum + okr.overallProgress, 0) / okrSets.length;
      currentProgress = (currentProgress + avgOKRProgress) / 2;
    }

    // Calculate percentage
    const percentage = targetProgress > 0 ? Math.min(100, Math.round((currentProgress / targetProgress) * 100)) : 0;

    // Determine trend
    const history = this.goalService.getProgressHistory(goal.id);
    const trend = this.calculateTrend(history);

    return {
      current: Math.round(currentProgress),
      target: targetProgress,
      percentage,
      trend,
      lastUpdated: now,
    };
  }

  /**
   * Calculate trend based on progress history
   */
  private calculateTrend(history: Array<{ date: string; progress: number }>): 'up' | 'down' | 'stable' {
    if (history.length < 2) return 'stable';

    const recent = history.slice(-5);
    if (recent.length < 2) return 'stable';

    const recentAvg = recent.slice(-2).reduce((sum, h) => sum + h.progress, 0) / 2;
    const olderAvg = recent.slice(0, 2).reduce((sum, h) => sum + h.progress, 0) / 2;

    const diff = recentAvg - olderAvg;

    if (diff > 2) return 'up';
    if (diff < -2) return 'down';
    return 'stable';
  }

  /**
   * Get comprehensive analytics for a goal
   */
  async getAnalytics(goal: Goal): Promise<GoalAnalytics> {
    const now = new Date();
    const analytics: GoalAnalytics = {
      goalId: goal.id,
      totalSubGoals: goal.childGoalIds.length,
      completedSubGoals: 0,
      completionRate: 0,
      averageProgress: goal.progress.percentage,
      onTrack: true,
      atRisk: false,
      overdueMilestones: 0,
      totalMilestones: 0,
      totalKeyResults: 0,
      krProgress: 0,
      trend: 'stable',
      historicalProgress: this.goalService.getProgressHistory(goal.id),
    };

    // Calculate sub-goal stats
    for (const childId of goal.childGoalIds) {
      const child = await this.goalService.get(childId);
      if (child) {
        if (child.status === GoalStatusEnum.COMPLETED) {
          analytics.completedSubGoals++;
        }
        analytics.averageProgress += child.progress.percentage;
      }
    }

    if (goal.childGoalIds.length > 0) {
      analytics.averageProgress = Math.round(analytics.averageProgress / (goal.childGoalIds.length + 1));
      analytics.completionRate = Math.round((analytics.completedSubGoals / goal.childGoalIds.length) * 100);
    }

    // Calculate milestone stats
    if (this.milestoneService) {
      const milestones = await this.milestoneService.getByGoal(goal.id);
      analytics.totalMilestones = milestones.length;
      analytics.overdueMilestones = milestones.filter(m =>
        m.status === MilestoneStatusEnum.OVERDUE ||
        (m.status !== MilestoneStatusEnum.COMPLETED && m.status !== MilestoneStatusEnum.SKIPPED && new Date(m.targetDate) < now)
      ).length;
    }

    // Calculate OKR stats
    const okrSets = await this.okrService.getByGoal(goal.id);
    for (const okr of okrSets) {
      analytics.totalKeyResults += okr.keyResults.length;
      analytics.krProgress += okr.overallProgress;
    }

    if (okrSets.length > 0) {
      analytics.krProgress = Math.round(analytics.krProgress / okrSets.length);
    }

    // Determine on-track status
    if (goal.deadline) {
      const deadline = new Date(goal.deadline);
      const daysRemaining = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const progressNeeded = 100 - goal.progress.percentage;
      const daysAvailable = Math.floor((deadline.getTime() - new Date(goal.startDate).getTime()) / (1000 * 60 * 60 * 24));
      const expectedProgress = daysAvailable > 0 ? ((daysAvailable - daysRemaining) / daysAvailable) * 100 : 0;

      // At risk if behind schedule by more than 10%
      if (goal.progress.percentage < expectedProgress - 10) {
        analytics.atRisk = true;
        analytics.onTrack = false;
      }

      // At risk if not enough time
      if (daysRemaining < 7 && goal.progress.percentage < 80) {
        analytics.atRisk = true;
        analytics.onTrack = false;
      }
    }

    // Calculate trend
    const trend = this.calculateTrend(analytics.historicalProgress);
    analytics.trend = trend === 'up' ? 'improving' : trend === 'down' ? 'declining' : 'stable';

    // Predict completion date
    if (goal.progress.percentage > 0 && goal.progress.percentage < 100) {
      const velocity = this.calculateVelocity(analytics.historicalProgress);
      if (velocity > 0) {
        const remainingProgress = 100 - goal.progress.percentage;
        const daysToComplete = Math.ceil(remainingProgress / velocity);
        const predictedDate = new Date(now.getTime() + daysToComplete * 24 * 60 * 60 * 1000);
        analytics.predictedCompletionDate = predictedDate.toISOString();
        analytics.velocity = velocity;
      }
    }

    return analytics;
  }

  /**
   * Calculate velocity (progress per day)
   */
  private calculateVelocity(history: Array<{ date: string; progress: number }>): number {
    if (history.length < 2) return 0;

    const sortedHistory = [...history].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const first = sortedHistory[0];
    const last = sortedHistory[sortedHistory.length - 1];

    const daysDiff = Math.max(1, Math.floor(
      (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24)
    ));

    const progressDiff = last.progress - first.progress;
    return progressDiff / daysDiff;
  }

  /**
   * Check if a goal is achieved
   */
  async isAchieved(goal: Goal): Promise<boolean> {
    // Check if progress is 100%
    if (goal.progress.percentage >= 100) return true;

    // Check if all child goals are completed
    if (goal.childGoalIds.length > 0) {
      const allChildrenCompleted = await Promise.all(
        goal.childGoalIds.map(id => this.goalService.get(id))
      );
      if (!allChildrenCompleted.every(child => child?.status === GoalStatusEnum.COMPLETED)) {
        return false;
      }
    }

    // Check if all milestones are completed
    if (this.milestoneService) {
      const milestones = await this.milestoneService.getByGoal(goal.id);
      if (milestones.length > 0) {
        const allMilestonesCompleted = milestones.every(m =>
          m.status === MilestoneStatusEnum.COMPLETED || m.status === MilestoneStatusEnum.SKIPPED
        );
        if (!allMilestonesCompleted) return false;
      }
    }

    // Check if all OKRs are achieved
    const okrSets = await this.okrService.getByGoal(goal.id);
    if (okrSets.length > 0) {
      const allOKRsAchieved = okrSets.every(okr => this.okrService.isAchieved(okr.id));
      if (!allOKRsAchieved) return false;
    }

    return true;
  }

  /**
   * Get progress summary for multiple goals
   */
  async getProgressSummary(goalIds: string[]): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    averageProgress: number;
    atRisk: number;
  }> {
    let completed = 0;
    let inProgress = 0;
    let atRisk = 0;
    let totalProgress = 0;

    for (const id of goalIds) {
      const goal = await this.goalService.get(id);
      if (goal) {
        if (goal.status === GoalStatusEnum.COMPLETED) completed++;
        else inProgress++;

        totalProgress += goal.progress.percentage;

        const analytics = await this.getAnalytics(goal);
        if (analytics.atRisk) atRisk++;
      }
    }

    return {
      total: goalIds.length,
      completed,
      inProgress,
      averageProgress: goalIds.length > 0 ? Math.round(totalProgress / goalIds.length) : 0,
      atRisk,
    };
  }
}