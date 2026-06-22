import { Task, TaskStatus, TaskPriority, TaskType, TaskResult } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import { createScopedLogger } from '../utils/logger.js';

const logger = createScopedLogger('taskManager');

export class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private taskQueue: string[] = [];

  createTask(
    type: TaskType,
    description: string,
    priority: TaskPriority,
    requiredCapabilities: string[]
  ): Task {
    const task: Task = {
      id: uuidv4(),
      type,
      description,
      priority,
      requiredCapabilities,
      assignedAgents: [],
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.tasks.set(task.id, task);
    this.enqueueTask(task.id);
    logger.info('Created new task', { taskId: task.id, type, priority });
    return task;
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getPendingTasks(): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.status === 'pending');
  }

  getTasksByStatus(status: TaskStatus): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.status === status);
  }

  getTasksByAgent(agentId: string): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.assignedAgents.includes(agentId));
  }

  assignAgentsToTask(taskId: string, agentIds: string[]): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.warn('Task not found for assignment', { taskId });
      return false;
    }

    if (task.status !== 'pending' && task.status !== 'assigned') {
      logger.warn('Cannot assign agents to task in status', { taskId, status: task.status });
      return false;
    }

    task.assignedAgents = [...new Set([...task.assignedAgents, ...agentIds])];
    task.status = 'assigned';
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);

    this.removeFromQueue(taskId);
    logger.info('Assigned agents to task', { taskId, agentIds });
    return true;
  }

  updateTaskStatus(taskId: string, status: TaskStatus): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.status = status;
    task.updatedAt = new Date().toISOString();

    if (status === 'completed' || status === 'failed') {
      task.completedAt = new Date().toISOString();
      this.removeFromQueue(taskId);
    }

    this.tasks.set(taskId, task);
    logger.info('Updated task status', { taskId, status });
    return true;
  }

  setTaskResult(taskId: string, result: TaskResult): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.result = result;
    task.status = result.score >= 0.5 ? 'completed' : 'failed';
    task.completedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();

    this.tasks.set(taskId, task);
    logger.info('Set task result', { taskId, score: result.score });
    return true;
  }

  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'completed') {
      logger.warn('Cannot cancel completed task', { taskId });
      return false;
    }

    task.status = 'cancelled';
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);
    this.removeFromQueue(taskId);

    logger.info('Cancelled task', { taskId });
    return true;
  }

  private enqueueTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // Insert based on priority
    const priorityOrder: Record<TaskPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    const taskPriority = priorityOrder[task.priority];
    let insertIndex = this.taskQueue.length;

    for (let i = 0; i < this.taskQueue.length; i++) {
      const queuedTask = this.tasks.get(this.taskQueue[i]);
      if (queuedTask && priorityOrder[queuedTask.priority] > taskPriority) {
        insertIndex = i;
        break;
      }
    }

    this.taskQueue.splice(insertIndex, 0, taskId);
    logger.debug('Enqueued task', { taskId, position: insertIndex });
  }

  private removeFromQueue(taskId: string): void {
    const index = this.taskQueue.indexOf(taskId);
    if (index !== -1) {
      this.taskQueue.splice(index, 1);
    }
  }

  getNextTask(): Task | undefined {
    while (this.taskQueue.length > 0) {
      const taskId = this.taskQueue[0];
      const task = this.tasks.get(taskId);
      if (task && task.status === 'pending') {
        return task;
      }
      this.taskQueue.shift();
    }
    return undefined;
  }

  getTaskQueue(): Task[] {
    return this.taskQueue
      .map(id => this.tasks.get(id))
      .filter((t): t is Task => t !== undefined);
  }

  getTaskStatistics(): {
    total: number;
    byStatus: Record<TaskStatus, number>;
    byPriority: Record<TaskPriority, number>;
    averageCompletionTime: number;
  } {
    const tasks = this.getAllTasks();
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.completedAt);

    let totalCompletionTime = 0;
    let completedCount = 0;

    for (const task of completedTasks) {
      if (task.completedAt) {
        const duration = new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime();
        totalCompletionTime += duration;
        completedCount++;
      }
    }

    const byStatus: Record<TaskStatus, number> = {
      pending: 0, assigned: 0, in_progress: 0, completed: 0, failed: 0, cancelled: 0,
    };
    const byPriority: Record<TaskPriority, number> = {
      low: 0, medium: 0, high: 0, critical: 0,
    };

    for (const task of tasks) {
      byStatus[task.status]++;
      byPriority[task.priority]++;
    }

    return {
      total: tasks.length,
      byStatus,
      byPriority,
      averageCompletionTime: completedCount > 0 ? totalCompletionTime / completedCount : 0,
    };
  }

  removeTask(taskId: string): boolean {
    const deleted = this.tasks.delete(taskId);
    if (deleted) {
      this.removeFromQueue(taskId);
      logger.info('Removed task', { taskId });
    }
    return deleted;
  }
}

export const taskManager = new TaskManager();
