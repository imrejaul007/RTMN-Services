// ============================================================================
// SUTAR Agent Network - Performance Tracking Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { PerformanceMetrics, TaskAssignment, TaskStatus, TaskPriority } from '../types/index.js';

export class PerformanceTrackingService {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private taskAssignments: Map<string, TaskAssignment> = new Map();
  private metricsHistory: Map<string, PerformanceMetrics[]> = new Map();

  /**
   * Initialize metrics for an agent
   */
  initializeMetrics(agentId: string): PerformanceMetrics {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const metrics: PerformanceMetrics = {
      agentId,
      period: {
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString(),
      },
      tasks: {
        total: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        inProgress: 0,
        averageCompletionTime: 0,
      },
      quality: {
        averageRating: 5.0,
        totalRatings: 0,
        fiveStarRatings: 0,
        oneStarRatings: 0,
        repeatClients: 0,
      },
      efficiency: {
        averageResponseTime: 0,
        uptimePercentage: 100,
        taskCompletionRate: 0,
        errorRate: 0,
      },
      revenue: {
        totalEarnings: 0,
        hourlyAverage: 0,
        totalHoursWorked: 0,
        tips: 0,
      },
      clientSatisfaction: {
        netPromoterScore: 0,
        satisfactionRate: 100,
        responseRate: 100,
      },
      trend: {
        ratingTrend: 0,
        taskTrend: 0,
        qualityTrend: 0,
      },
      rankings: {
        global: 0,
        category: {},
        skill: {},
      },
      updatedAt: now.toISOString(),
    };

    this.metrics.set(agentId, metrics);
    return metrics;
  }

  /**
   * Get metrics for an agent
   */
  getMetrics(agentId: string): PerformanceMetrics | undefined {
    return this.metrics.get(agentId);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Update metrics for an agent
   */
  updateMetrics(agentId: string, updates: Partial<PerformanceMetrics>): PerformanceMetrics | undefined {
    let metrics = this.metrics.get(agentId);
    if (!metrics) {
      metrics = this.initializeMetrics(agentId);
    }

    const updatedMetrics: PerformanceMetrics = {
      ...metrics,
      ...updates,
      agentId: metrics.agentId,
      updatedAt: new Date().toISOString(),
    };

    this.metrics.set(agentId, updatedMetrics);
    return updatedMetrics;
  }

  /**
   * Record task assignment
   */
  recordTaskAssignment(data: {
    taskId: string;
    agentId: string;
    teamId?: string;
    priority: TaskPriority;
    estimatedDuration?: number;
  }): TaskAssignment {
    const assignment: TaskAssignment = {
      id: `assignment-${uuidv4()}`,
      taskId: data.taskId,
      agentId: data.agentId,
      teamId: data.teamId,
      status: 'assigned',
      priority: data.priority,
      assignedAt: new Date().toISOString(),
      estimatedDuration: data.estimatedDuration,
    };

    this.taskAssignments.set(assignment.id, assignment);

    // Update metrics
    const metrics = this.metrics.get(data.agentId) || this.initializeMetrics(data.agentId);
    metrics.tasks.total += 1;
    metrics.tasks.inProgress += 1;
    this.metrics.set(data.agentId, metrics);

    return assignment;
  }

  /**
   * Start task
   */
  startTask(assignmentId: string): TaskAssignment | undefined {
    const assignment = this.taskAssignments.get(assignmentId);
    if (!assignment) {
      return undefined;
    }

    assignment.status = 'in_progress';
    assignment.startedAt = new Date().toISOString();
    this.taskAssignments.set(assignmentId, assignment);

    return assignment;
  }

  /**
   * Complete task
   */
  completeTask(
    assignmentId: string,
    data: {
      quality: number;
      feedback?: string;
      actualDuration?: number;
    }
  ): TaskAssignment | undefined {
    const assignment = this.taskAssignments.get(assignmentId);
    if (!assignment) {
      return undefined;
    }

    const metrics = this.metrics.get(assignment.agentId);
    if (metrics) {
      metrics.tasks.completed += 1;
      metrics.tasks.inProgress -= 1;

      if (data.actualDuration) {
        // Update average completion time
        const totalTime =
          metrics.tasks.averageCompletionTime * (metrics.tasks.completed - 1) + data.actualDuration;
        metrics.tasks.averageCompletionTime = totalTime / metrics.tasks.completed;
      }

      // Update quality metrics
      if (data.quality) {
        const totalRating = metrics.quality.averageRating * metrics.quality.totalRatings + data.quality;
        metrics.quality.totalRatings += 1;
        metrics.quality.averageRating = totalRating / metrics.quality.totalRatings;

        if (data.quality === 5) {
          metrics.quality.fiveStarRatings += 1;
        } else if (data.quality === 1) {
          metrics.quality.oneStarRatings += 1;
        }
      }

      this.metrics.set(assignment.agentId, metrics);
    }

    assignment.status = 'completed';
    assignment.completedAt = new Date().toISOString();
    assignment.quality = data.quality;
    assignment.feedback = data.feedback;
    assignment.actualDuration = data.actualDuration;
    this.taskAssignments.set(assignmentId, assignment);

    return assignment;
  }

  /**
   * Fail task
   */
  failTask(assignmentId: string, feedback?: string): TaskAssignment | undefined {
    const assignment = this.taskAssignments.get(assignmentId);
    if (!assignment) {
      return undefined;
    }

    const metrics = this.metrics.get(assignment.agentId);
    if (metrics) {
      metrics.tasks.failed += 1;
      metrics.tasks.inProgress -= 1;
      this.metrics.set(assignment.agentId, metrics);
    }

    assignment.status = 'failed';
    assignment.completedAt = new Date().toISOString();
    assignment.feedback = feedback;
    this.taskAssignments.set(assignmentId, assignment);

    return assignment;
  }

  /**
   * Cancel task
   */
  cancelTask(assignmentId: string): TaskAssignment | undefined {
    const assignment = this.taskAssignments.get(assignmentId);
    if (!assignment) {
      return undefined;
    }

    const metrics = this.metrics.get(assignment.agentId);
    if (metrics) {
      metrics.tasks.cancelled += 1;
      metrics.tasks.inProgress -= 1;
      this.metrics.set(assignment.agentId, metrics);
    }

    assignment.status = 'cancelled';
    assignment.completedAt = new Date().toISOString();
    this.taskAssignments.set(assignmentId, assignment);

    return assignment;
  }

  /**
   * Record earnings
   */
  recordEarnings(
    agentId: string,
    data: {
      amount: number;
      hoursWorked?: number;
      isTip?: boolean;
    }
  ): void {
    let metrics = this.metrics.get(agentId);
    if (!metrics) {
      metrics = this.initializeMetrics(agentId);
    }

    if (data.isTip) {
      metrics.revenue.tips += data.amount;
    } else {
      metrics.revenue.totalEarnings += data.amount;
      if (data.hoursWorked) {
        metrics.revenue.totalHoursWorked += data.hoursWorked;
        metrics.revenue.hourlyAverage =
          metrics.revenue.totalEarnings / metrics.revenue.totalHoursWorked;
      }
    }

    this.metrics.set(agentId, metrics);
  }

  /**
   * Record response time
   */
  recordResponseTime(agentId: string, responseTimeSeconds: number): void {
    const metrics = this.metrics.get(agentId);
    if (!metrics) {
      return;
    }

    const totalResponseTime =
      metrics.efficiency.averageResponseTime * (metrics.tasks.total - 1) + responseTimeSeconds;
    metrics.efficiency.averageResponseTime = totalResponseTime / metrics.tasks.total;
    this.metrics.set(agentId, metrics);
  }

  /**
   * Update efficiency metrics
   */
  updateEfficiencyMetrics(agentId: string): void {
    const metrics = this.metrics.get(agentId);
    if (!metrics) {
      return;
    }

    if (metrics.tasks.total > 0) {
      metrics.efficiency.taskCompletionRate =
        (metrics.tasks.completed / metrics.tasks.total) * 100;
      metrics.efficiency.errorRate = (metrics.tasks.failed / metrics.tasks.total) * 100;
    }

    this.metrics.set(agentId, metrics);
  }

  /**
   * Calculate trend data
   */
  calculateTrends(agentId: string): void {
    const metrics = this.metrics.get(agentId);
    if (!metrics) {
      return;
    }

    // Get historical data
    const history = this.metricsHistory.get(agentId) || [];
    if (history.length >= 2) {
      const previousMetrics = history[history.length - 2];

      // Rating trend
      metrics.trend.ratingTrend = metrics.quality.averageRating - previousMetrics.quality.averageRating;

      // Task trend
      const currentTaskRate = metrics.tasks.completed / Math.max(1, metrics.tasks.total);
      const previousTaskRate = previousMetrics.tasks.completed / Math.max(1, previousMetrics.tasks.total);
      metrics.trend.taskTrend = currentTaskRate - previousTaskRate;

      // Quality trend
      metrics.trend.qualityTrend = metrics.efficiency.taskCompletionRate - previousMetrics.efficiency.taskCompletionRate;
    }

    this.metrics.set(agentId, metrics);
  }

  /**
   * Update rankings
   */
  updateRankings(agentId: string, rankings: {
    global?: number;
    category?: Record<string, number>;
    skill?: Record<string, number>;
  }): void {
    const metrics = this.metrics.get(agentId);
    if (!metrics) {
      return;
    }

    if (rankings.global !== undefined) {
      metrics.rankings.global = rankings.global;
    }
    if (rankings.category) {
      metrics.rankings.category = { ...metrics.rankings.category, ...rankings.category };
    }
    if (rankings.skill) {
      metrics.rankings.skill = { ...metrics.rankings.skill, ...rankings.skill };
    }

    this.metrics.set(agentId, metrics);
  }

  /**
   * Save metrics to history
   */
  saveToHistory(agentId: string): void {
    const metrics = this.metrics.get(agentId);
    if (!metrics) {
      return;
    }

    if (!this.metricsHistory.has(agentId)) {
      this.metricsHistory.set(agentId, []);
    }

    const history = this.metricsHistory.get(agentId)!;
    history.push({ ...metrics });

    // Keep last 12 months of history
    if (history.length > 12) {
      history.shift();
    }

    this.metricsHistory.set(agentId, history);
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(agentId: string): PerformanceMetrics[] {
    return this.metricsHistory.get(agentId) || [];
  }

  /**
   * Get task assignments for an agent
   */
  getTaskAssignments(agentId: string, status?: TaskStatus): TaskAssignment[] {
    let assignments = Array.from(this.taskAssignments.values()).filter(
      a => a.agentId === agentId
    );

    if (status) {
      assignments = assignments.filter(a => a.status === status);
    }

    return assignments.sort(
      (a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
    );
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(agentId: string): {
    metrics: PerformanceMetrics | undefined;
    recentTasks: TaskAssignment[];
    historyLength: number;
    performanceScore: number;
  } {
    const metrics = this.metrics.get(agentId);
    const recentTasks = this.getTaskAssignments(agentId).slice(0, 10);
    const history = this.metricsHistory.get(agentId) || [];

    // Calculate overall performance score
    let performanceScore = 0;
    if (metrics) {
      performanceScore =
        metrics.quality.averageRating * 20 + // 0-100 from rating
        metrics.efficiency.taskCompletionRate * 0.5 + // 0-50 from completion rate
        (100 - metrics.efficiency.errorRate) * 0.3; // 0-30 from error rate
    }

    return {
      metrics,
      recentTasks,
      historyLength: history.length,
      performanceScore: Math.min(100, performanceScore),
    };
  }

  /**
   * Get top performers
   */
  getTopPerformers(limit: number = 10): Array<{ agentId: string; score: number }> {
    return Array.from(this.metrics.values())
      .map(m => ({
        agentId: m.agentId,
        score:
          m.quality.averageRating * 20 +
          m.efficiency.taskCompletionRate * 0.5 +
          (100 - m.efficiency.errorRate) * 0.3,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get agent comparison
   */
  compareAgents(agentIds: string[]): Record<string, PerformanceMetrics | undefined> {
    const comparison: Record<string, PerformanceMetrics | undefined> = {};
    agentIds.forEach(id => {
      comparison[id] = this.metrics.get(id);
    });
    return comparison;
  }

  /**
   * Reset metrics for agent
   */
  resetMetrics(agentId: string): PerformanceMetrics {
    this.metrics.delete(agentId);
    return this.initializeMetrics(agentId);
  }

  /**
   * Delete metrics
   */
  deleteMetrics(agentId: string): boolean {
    this.metricsHistory.delete(agentId);
    return this.metrics.delete(agentId);
  }
}

// Singleton instance
export const performanceTrackingService = new PerformanceTrackingService();
