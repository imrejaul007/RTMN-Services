// ============================================================================
// SUTAR Agent Network - Task Routing Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  Task,
  TaskMatch,
  TaskStatus,
  TaskPriority,
  AgentCapability,
  Agent,
  TaskRoutingRequest,
} from '../types/index.js';
import { skillMatchingService, MatchResult } from './SkillMatchingService.js';
import { performanceTrackingService } from './PerformanceTrackingService.js';

export class TaskRoutingService {
  private tasks: Map<string, Task> = new Map();
  private taskMatches: Map<string, TaskMatch[]> = new Map();
  private routingHistory: Map<string, { timestamp: string; taskId: string; agentId: string }[]> = new Map();

  /**
   * Create a new task
   */
  createTask(data: TaskRoutingRequest): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: `task-${uuidv4()}`,
      title: data.title,
      description: data.description,
      requirements: {
        capabilities: data.requirements.capabilities,
        skills: data.requirements.skills,
        minExperience: data.requirements.minExperience,
        certifications: data.requirements.certifications,
      },
      priority: data.priority,
      budget: data.budget,
      deadline: data.deadline,
      estimatedDuration: data.estimatedDuration,
      teamRequired: data.teamRequired,
      maxTeamSize: data.maxTeamSize,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(task.id, task);
    return task;
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(status?: TaskStatus): Task[] {
    let tasks = Array.from(this.tasks.values());
    if (status) {
      tasks = tasks.filter(t => t.status === status);
    }
    return tasks.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get tasks for agent
   */
  getTasksForAgent(agentId: string): Task[] {
    return Array.from(this.tasks.values())
      .filter(t => t.assignedAgentId === agentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Update task
   */
  updateTask(taskId: string, updates: Partial<Task>): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) {
      return undefined;
    }

    const updatedTask: Task = {
      ...task,
      ...updates,
      id: task.id,
      createdAt: task.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.tasks.set(taskId, updatedTask);
    return updatedTask;
  }

  /**
   * Find best agents for task
   */
  findBestAgents(
    taskId: string,
    agents: Agent[],
    limit: number = 5
  ): TaskMatch[] {
    const task = this.tasks.get(taskId);
    if (!task) {
      return [];
    }

    const matchResults = skillMatchingService.matchAgentsToTask(agents, {
      requiredCapabilities: task.requirements.capabilities,
      requiredSkills: task.requirements.skills,
      maxHourlyRate: task.budget?.max,
    });

    const taskMatches: TaskMatch[] = matchResults.slice(0, limit).map(result => ({
      taskId,
      agentId: result.agent.id,
      agent: result.agent,
      score: result.score,
      reasons: result.reasons,
      estimatedCompletionTime: this.estimateCompletionTime(task, result.agent),
      proposedRate: this.calculateProposedRate(task, result.agent),
      availability: result.agent.status,
      confidence: result.confidence,
    }));

    this.taskMatches.set(taskId, taskMatches);
    return taskMatches;
  }

  /**
   * Estimate completion time based on task and agent
   */
  private estimateCompletionTime(task: Task, agent: Agent): number {
    if (task.estimatedDuration) {
      return task.estimatedDuration;
    }

    // Base estimate: 60 minutes per capability + 30 minutes per skill
    const baseTime =
      task.requirements.capabilities.length * 60 + task.requirements.skills.length * 30;

    // Adjust based on agent experience (assume profile lookup)
    const experienceFactor = 0.8; // Experienced agents work faster

    return Math.round(baseTime * experienceFactor);
  }

  /**
   * Calculate proposed rate for agent on task
   */
  private calculateProposedRate(task: Task, agent: Agent): number {
    if (agent.hourlyRate) {
      return agent.hourlyRate;
    }

    // Calculate based on task complexity and budget
    const complexity =
      task.requirements.capabilities.length + task.requirements.skills.length;
    const baseRate = 50; // Minimum rate
    const complexityRate = complexity * 10;

    if (task.budget?.max) {
      return Math.min(task.budget.max, baseRate + complexityRate);
    }

    return baseRate + complexityRate;
  }

  /**
   * Assign task to agent
   */
  assignTaskToAgent(taskId: string, agentId: string): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) {
      return undefined;
    }

    task.assignedAgentId = agentId;
    task.status = 'assigned';
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);

    // Record assignment in performance tracking
    performanceTrackingService.recordTaskAssignment({
      taskId,
      agentId,
      priority: task.priority,
      estimatedDuration: task.estimatedDuration,
    });

    // Record in routing history
    this.recordRoutingDecision(taskId, agentId);

    return task;
  }

  /**
   * Assign task to team
   */
  assignTaskToTeam(taskId: string, teamId: string): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) {
      return undefined;
    }

    task.assignedTeamId = teamId;
    task.status = 'assigned';
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);

    return task;
  }

  /**
   * Start task
   */
  startTask(taskId: string): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) {
      return undefined;
    }

    task.status = 'in_progress';
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);

    return task;
  }

  /**
   * Complete task
   */
  completeTask(taskId: string): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) {
      return undefined;
    }

    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);

    // Record completion in performance tracking
    if (task.assignedAgentId) {
      const assignments = performanceTrackingService.getTaskAssignments(task.assignedAgentId);
      const assignment = assignments.find(a => a.taskId === taskId);
      if (assignment) {
        performanceTrackingService.completeTask(assignment.id, {
          quality: 5, // Default quality
        });
      }
    }

    return task;
  }

  /**
   * Fail task
   */
  failTask(taskId: string): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) {
      return undefined;
    }

    task.status = 'failed';
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);

    return task;
  }

  /**
   * Cancel task
   */
  cancelTask(taskId: string): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) {
      return undefined;
    }

    task.status = 'cancelled';
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);

    return task;
  }

  /**
   * Record routing decision
   */
  private recordRoutingDecision(taskId: string, agentId: string): void {
    const decision = {
      timestamp: new Date().toISOString(),
      taskId,
      agentId,
    };

    if (!this.routingHistory.has(agentId)) {
      this.routingHistory.set(agentId, []);
    }

    const history = this.routingHistory.get(agentId)!;
    history.push(decision);

    // Keep last 100 decisions per agent
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get routing history for agent
   */
  getRoutingHistory(agentId: string): Array<{ timestamp: string; taskId: string }> {
    return (this.routingHistory.get(agentId) || []).map(h => ({
      timestamp: h.timestamp,
      taskId: h.taskId,
    }));
  }

  /**
   * Get task matches
   */
  getTaskMatches(taskId: string): TaskMatch[] {
    return this.taskMatches.get(taskId) || [];
  }

  /**
   * Auto-route task to best available agent
   */
  autoRouteTask(taskId: string, agents: Agent[]): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) {
      return undefined;
    }

    const matches = this.findBestAgents(taskId, agents, 1);
    if (matches.length > 0 && matches[0].availability === 'available') {
      return this.assignTaskToAgent(taskId, matches[0].agentId);
    }

    return undefined;
  }

  /**
   * Get pending tasks
   */
  getPendingTasks(): Task[] {
    return this.getAllTasks('pending');
  }

  /**
   * Get tasks by priority
   */
  getTasksByPriority(priority: TaskPriority): Task[] {
    return Array.from(this.tasks.values())
      .filter(t => t.priority === priority)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  /**
   * Get task statistics
   */
  getTaskStatistics(): {
    totalTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageCompletionTime: number;
    topCapabilities: Array<{ capability: string; count: number }>;
  } {
    const tasks = Array.from(this.tasks.values());
    const capabilityCounts: Map<string, number> = new Map();

    tasks.forEach(task => {
      task.requirements.capabilities.forEach(cap => {
        capabilityCounts.set(cap, (capabilityCounts.get(cap) || 0) + 1);
      });
    });

    const completedTasks = tasks.filter(t => t.status === 'completed');
    const totalCompletionTime = completedTasks.reduce(
      (sum, t) =>
        sum +
        (t.completedAt && t.createdAt
          ? new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()
          : 0),
      0
    );

    return {
      totalTasks: tasks.length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      inProgressTasks: tasks.filter(t => t.status === 'in_progress').length,
      completedTasks: completedTasks.length,
      failedTasks: tasks.filter(t => t.status === 'failed').length,
      averageCompletionTime:
        completedTasks.length > 0
          ? totalCompletionTime / completedTasks.length / (1000 * 60)
          : 0,
      topCapabilities: Array.from(capabilityCounts.entries())
        .map(([capability, count]) => ({ capability, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  /**
   * Delete task
   */
  deleteTask(taskId: string): boolean {
    this.taskMatches.delete(taskId);
    return this.tasks.delete(taskId);
  }

  /**
   * Get agent workload
   */
  getAgentWorkload(agentId: string): {
    assignedTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    estimatedHoursRemaining: number;
  } {
    const tasks = this.getTasksForAgent(agentId);
    const assignedTasks = tasks.filter(t => t.status === 'assigned').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const estimatedHoursRemaining = tasks
      .filter(t => t.status === 'assigned' || t.status === 'in_progress')
      .reduce((sum, t) => sum + (t.estimatedDuration || 60) / 60, 0);

    return {
      assignedTasks,
      inProgressTasks,
      completedTasks,
      estimatedHoursRemaining,
    };
  }

  /**
   * Find agents with capacity
   */
  findAgentsWithCapacity(
    agents: Agent[],
    maxTasks: number = 3
  ): Agent[] {
    return agents.filter(agent => {
      const workload = this.getAgentWorkload(agent.id);
      return (
        agent.status === 'available' &&
        workload.assignedTasks + workload.inProgressTasks < maxTasks
      );
    });
  }

  /**
   * Requeue task for routing
   */
  requeueTask(taskId: string): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) {
      return undefined;
    }

    task.assignedAgentId = undefined;
    task.assignedTeamId = undefined;
    task.status = 'pending';
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);

    return task;
  }

  /**
   * Export task data
   */
  exportTask(taskId: string): Record<string, unknown> | undefined {
    const task = this.tasks.get(taskId);
    if (!task) {
      return undefined;
    }

    const matches = this.getTaskMatches(taskId);

    return {
      ...task,
      matches,
      exportDate: new Date().toISOString(),
    };
  }
}

// Singleton instance
export const taskRoutingService = new TaskRoutingService();
