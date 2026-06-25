/**
 * GoalOS SDK - Persistent objectives and goal tracking for AI agents
 *
 * Goals decompose into tasks, track progress, and persist state across sessions.
 */

export type GoalStatus = 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type GoalPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  status: GoalStatus;
  priority: GoalPriority;
  createdAt: string;
  updatedAt: string;
  deadline?: string;
  progress: number; // 0-100
  tasks: Task[];
  parentGoalId?: string;
  agentId?: string;
  metadata?: Record<string, unknown>;
}

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
  completedAt?: string;
  subtasks?: Task[];
  dependencies?: string[]; // Task IDs that must complete first
}

export interface GoalProgress {
  goalId: string;
  progress: number;
  completedTasks: number;
  totalTasks: number;
  estimatedCompletion?: string;
}

export interface GoalFilter {
  status?: GoalStatus;
  priority?: GoalPriority;
  agentId?: string;
  parentGoalId?: string;
  deadlineBefore?: string;
  deadlineAfter?: string;
}

class GoalOS {
  private goals: Map<string, Goal> = new Map();
  private storageKey: string;

  constructor(options?: { storageKey?: string }) {
    this.storageKey = options?.storageKey || 'hojai-goals';
    this.load();
  }

  private load() {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        this.goals = new Map(Object.entries(parsed));
      }
    }
  }

  private save() {
    if (typeof localStorage !== 'undefined') {
      const obj = Object.fromEntries(this.goals);
      localStorage.setItem(this.storageKey, JSON.stringify(obj));
    }
  }

  /**
   * Create a new goal
   */
  createGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'progress' | 'tasks'>): Goal {
    const now = new Date().toISOString();
    const newGoal: Goal = {
      ...goal,
      id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
      progress: 0,
      tasks: []
    };
    this.goals.set(newGoal.id, newGoal);
    this.save();
    return newGoal;
  }

  /**
   * Get a goal by ID
   */
  getGoal(id: string): Goal | undefined {
    return this.goals.get(id);
  }

  /**
   * List goals with optional filtering
   */
  listGoals(filter?: GoalFilter): Goal[] {
    let goals = Array.from(this.goals.values());

    if (filter) {
      if (filter.status) goals = goals.filter(g => g.status === filter.status);
      if (filter.priority) goals = goals.filter(g => g.priority === filter.priority);
      if (filter.agentId) goals = goals.filter(g => g.agentId === filter.agentId);
      if (filter.parentGoalId) goals = goals.filter(g => g.parentGoalId === filter.parentGoalId);
    }

    return goals.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Update a goal
   */
  updateGoal(id: string, updates: Partial<Goal>): Goal | undefined {
    const goal = this.goals.get(id);
    if (!goal) return undefined;

    const updated = {
      ...goal,
      ...updates,
      id: goal.id,
      createdAt: goal.createdAt,
      updatedAt: new Date().toISOString()
    };

    // Recalculate progress
    updated.progress = this.calculateProgress(updated);

    this.goals.set(id, updated);
    this.save();
    return updated;
  }

  /**
   * Add a task to a goal
   */
  addTask(goalId: string, task: Omit<Task, 'id' | 'status'>): Task | undefined {
    const goal = this.goals.get(goalId);
    if (!goal) return undefined;

    const newTask: Task = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending'
    };

    goal.tasks.push(newTask);
    goal.progress = this.calculateProgress(goal);
    goal.updatedAt = new Date().toISOString();

    this.goals.set(goalId, goal);
    this.save();
    return newTask;
  }

  /**
   * Update a task's status
   */
  updateTask(goalId: string, taskId: string, updates: Partial<Task>): Task | undefined {
    const goal = this.goals.get(goalId);
    if (!goal) return undefined;

    const taskIndex = goal.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return undefined;

    goal.tasks[taskIndex] = { ...goal.tasks[taskIndex], ...updates };
    goal.progress = this.calculateProgress(goal);
    goal.updatedAt = new Date().toISOString();

    this.goals.set(goalId, goal);
    this.save();
    return goal.tasks[taskIndex];
  }

  /**
   * Complete a task
   */
  completeTask(goalId: string, taskId: string): Task | undefined {
    return this.updateTask(goalId, taskId, {
      status: 'done',
      completedAt: new Date().toISOString()
    });
  }

  /**
   * Delete a goal
   */
  deleteGoal(id: string): boolean {
    const deleted = this.goals.delete(id);
    if (deleted) this.save();
    return deleted;
  }

  /**
   * Get goal progress
   */
  getProgress(goalId: string): GoalProgress | undefined {
    const goal = this.goals.get(goalId);
    if (!goal) return undefined;

    const completedTasks = goal.tasks.filter(t => t.status === 'done').length;

    return {
      goalId,
      progress: goal.progress,
      completedTasks,
      totalTasks: goal.tasks.length
    };
  }

  /**
   * Get active goals for an agent
   */
  getActiveGoalsForAgent(agentId: string): Goal[] {
    return this.listGoals({ agentId, status: 'active' });
  }

  /**
   * Calculate progress based on completed tasks
   */
  private calculateProgress(goal: Goal): number {
    if (goal.tasks.length === 0) return goal.progress;
    const completed = goal.tasks.filter(t => t.status === 'done').length;
    return Math.round((completed / goal.tasks.length) * 100);
  }

  /**
   * Clear all goals (use with caution)
   */
  clear(): void {
    this.goals.clear();
    this.save();
  }
}

// Singleton instance
let instance: GoalOS | null = null;

export function createGoalOS(options?: { storageKey?: string }): GoalOS {
  return new GoalOS(options);
}

export function getGoalOS(): GoalOS {
  if (!instance) {
    instance = new GoalOS();
  }
  return instance;
}

export default GoalOS;
