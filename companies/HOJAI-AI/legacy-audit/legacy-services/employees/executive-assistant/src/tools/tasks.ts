/**
 * Executive Assistant - Tasks Tool
 * Version: 1.0.0 | Date: June 2, 2026
 * Purpose: Task management tool for creating, tracking, and completing tasks
 */

import { z } from 'zod';
import type { Tool, ToolResult } from '../../core/src/BaseAgent.js';

// ============================================================================
// Task Data Store (In-Memory)
// ============================================================================

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  assignee?: string;
  creator: string;
  tags?: string[];
  subtasks: SubTask[];
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

class TaskStore {
  private tasks: Map<string, Task> = new Map();

  createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'subtasks' | 'status'>): Task {
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const newTask: Task = {
      ...task,
      id,
      status: 'pending',
      subtasks: [],
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, newTask);
    return newTask;
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getTasksByCreator(creator: string): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.creator === creator);
  }

  getTasksByAssignee(assignee: string): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.assignee === assignee);
  }

  getTasksByStatus(status: Task['status']): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.status === status);
  }

  getTasksByPriority(priority: Task['priority']): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.priority === priority);
  }

  getOverdueTasks(): Task[] {
    const now = new Date();
    return Array.from(this.tasks.values()).filter(task => {
      if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') {
        return false;
      }
      return task.dueDate < now;
    });
  }

  getTasksDueSoon(hours = 24): Task[] {
    const now = new Date();
    const soon = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return Array.from(this.tasks.values()).filter(task => {
      if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') {
        return false;
      }
      return task.dueDate >= now && task.dueDate <= soon;
    });
  }

  getSubtasks(parentId: string): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.parentId === parentId);
  }

  updateTask(id: string, updates: Partial<Task>): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const updated: Task = {
      ...task,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    this.tasks.set(id, updated);
    return updated;
  }

  completeTask(id: string): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const updated: Task = {
      ...task,
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.set(id, updated);
    return updated;
  }

  deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  addSubtask(parentId: string, title: string): SubTask | undefined {
    const parent = this.tasks.get(parentId);
    if (!parent) return undefined;

    const subtask: SubTask = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      title,
      completed: false,
      createdAt: new Date(),
    };

    parent.subtasks.push(subtask);
    parent.updatedAt = new Date();
    this.tasks.set(parentId, parent);

    return subtask;
  }

  toggleSubtask(parentId: string, subtaskId: string): SubTask | undefined {
    const parent = this.tasks.get(parentId);
    if (!parent) return undefined;

    const subtask = parent.subtasks.find(s => s.id === subtaskId);
    if (!subtask) return undefined;

    subtask.completed = !subtask.completed;
    parent.updatedAt = new Date();
    this.tasks.set(parentId, parent);

    return subtask;
  }

  deleteSubtask(parentId: string, subtaskId: string): boolean {
    const parent = this.tasks.get(parentId);
    if (!parent) return false;

    const index = parent.subtasks.findIndex(s => s.id === subtaskId);
    if (index === -1) return false;

    parent.subtasks.splice(index, 1);
    parent.updatedAt = new Date();
    this.tasks.set(parentId, parent);

    return true;
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }
}

const taskStore = new TaskStore();

// ============================================================================
// Parameter Schemas
// ============================================================================

const CreateTaskSchema = z.object({
  title: z.string().min(1).describe('Task title'),
  description: z.string().optional().describe('Task description'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('Task priority'),
  dueDate: z.string().optional().describe('Due date in ISO 8601 format'),
  assignee: z.string().optional().describe('Task assignee'),
  creator: z.string().describe('Task creator'),
  tags: z.array(z.string()).optional().describe('Task tags'),
  subtasks: z.array(z.object({
    title: z.string().min(1),
  })).optional().describe('Initial subtasks'),
});

const UpdateTaskSchema = z.object({
  taskId: z.string().describe('Task ID to update'),
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  assignee: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  tags: z.array(z.string()).optional(),
});

const GetTasksSchema = z.object({
  creator: z.string().optional(),
  assignee: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  overdue: z.boolean().optional(),
  dueSoon: z.number().optional(),
  limit: z.number().min(1).max(100).optional(),
});

const CompleteTaskSchema = z.object({
  taskId: z.string().describe('Task ID to complete'),
});

const DeleteTaskSchema = z.object({
  taskId: z.string().describe('Task ID to delete'),
});

const AddSubtaskSchema = z.object({
  parentTaskId: z.string().describe('Parent task ID'),
  title: z.string().min(1).describe('Subtask title'),
});

const ToggleSubtaskSchema = z.object({
  taskId: z.string().describe('Task ID'),
  subtaskId: z.string().describe('Subtask ID to toggle'),
});

const DeleteSubtaskSchema = z.object({
  taskId: z.string().describe('Task ID'),
  subtaskId: z.string().describe('Subtask ID to delete'),
});

// ============================================================================
// Tool Implementations
// ============================================================================

async function createTaskHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = CreateTaskSchema.parse(params);

    const task = taskStore.createTask({
      title: args.title,
      description: args.description,
      priority: args.priority || 'medium',
      dueDate: args.dueDate ? new Date(args.dueDate) : undefined,
      assignee: args.assignee,
      creator: args.creator,
      tags: args.tags,
    });

    // Add initial subtasks if provided
    if (args.subtasks && args.subtasks.length > 0) {
      for (const subtask of args.subtasks) {
        taskStore.addSubtask(task.id, subtask.title);
      }
    }

    return {
      success: true,
      data: {
        taskId: task.id,
        task: formatTask(task),
        message: `Task "${task.title}" created successfully`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create task',
    };
  }
}

async function updateTaskHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = UpdateTaskSchema.parse(params);
    const updates: Partial<Task> = {};

    if (args.title) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.priority) updates.priority = args.priority;
    if (args.dueDate) updates.dueDate = new Date(args.dueDate);
    if (args.assignee !== undefined) updates.assignee = args.assignee;
    if (args.status) updates.status = args.status;
    if (args.tags) updates.tags = args.tags;

    const task = taskStore.updateTask(args.taskId, updates);

    if (!task) {
      return {
        success: false,
        error: `Task with ID "${args.taskId}" not found`,
      };
    }

    return {
      success: true,
      data: {
        taskId: task.id,
        task: formatTask(task),
        message: `Task "${task.title}" updated successfully`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update task',
    };
  }
}

async function getTasksHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetTasksSchema.parse(params);
    let tasks: Task[];

    if (args.overdue) {
      tasks = taskStore.getOverdueTasks();
    } else if (args.dueSoon) {
      tasks = taskStore.getTasksDueSoon(args.dueSoon);
    } else if (args.creator) {
      tasks = taskStore.getTasksByCreator(args.creator);
    } else if (args.assignee) {
      tasks = taskStore.getTasksByAssignee(args.assignee);
    } else if (args.status) {
      tasks = taskStore.getTasksByStatus(args.status);
    } else if (args.priority) {
      tasks = taskStore.getTasksByPriority(args.priority);
    } else {
      tasks = taskStore.getAllTasks();
    }

    // Filter by additional criteria
    if (args.status && !args.overdue && !args.dueSoon) {
      tasks = tasks.filter(t => t.status === args.status);
    }
    if (args.priority) {
      tasks = tasks.filter(t => t.priority === args.priority);
    }

    const limit = args.limit || 20;
    const result = tasks.slice(0, limit);

    return {
      success: true,
      data: {
        tasks: result.map(formatTask),
        count: result.length,
        total: tasks.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get tasks',
    };
  }
}

async function completeTaskHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = CompleteTaskSchema.parse(params);
    const task = taskStore.completeTask(args.taskId);

    if (!task) {
      return {
        success: false,
        error: `Task with ID "${args.taskId}" not found`,
      };
    }

    return {
      success: true,
      data: {
        taskId: task.id,
        task: formatTask(task),
        message: `Task "${task.title}" marked as completed`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete task',
    };
  }
}

async function deleteTaskHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = DeleteTaskSchema.parse(params);
    const task = taskStore.getTask(args.taskId);

    if (!task) {
      return {
        success: false,
        error: `Task with ID "${args.taskId}" not found`,
      };
    }

    taskStore.deleteTask(args.taskId);

    return {
      success: true,
      data: {
        taskId: args.taskId,
        message: `Task "${task.title}" deleted successfully`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete task',
    };
  }
}

async function addSubtaskHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = AddSubtaskSchema.parse(params);
    const subtask = taskStore.addSubtask(args.parentTaskId, args.title);

    if (!subtask) {
      return {
        success: false,
        error: `Parent task with ID "${args.parentTaskId}" not found`,
      };
    }

    const parent = taskStore.getTask(args.parentTaskId);

    return {
      success: true,
      data: {
        subtaskId: subtask.id,
        parentTaskId: args.parentTaskId,
        subtask: {
          id: subtask.id,
          title: subtask.title,
          completed: subtask.completed,
        },
        message: `Subtask added to task "${parent?.title}"`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add subtask',
    };
  }
}

async function toggleSubtaskHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = ToggleSubtaskSchema.parse(params);
    const subtask = taskStore.toggleSubtask(args.taskId, args.subtaskId);

    if (!subtask) {
      return {
        success: false,
        error: `Subtask with ID "${args.subtaskId}" not found in task "${args.taskId}"`,
      };
    }

    return {
      success: true,
      data: {
        taskId: args.taskId,
        subtaskId: args.subtaskId,
        completed: subtask.completed,
        message: subtask.completed ? 'Subtask marked as completed' : 'Subtask marked as pending',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle subtask',
    };
  }
}

async function deleteSubtaskHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = DeleteSubtaskSchema.parse(params);
    const deleted = taskStore.deleteSubtask(args.taskId, args.subtaskId);

    if (!deleted) {
      return {
        success: false,
        error: `Subtask with ID "${args.subtaskId}" not found in task "${args.taskId}"`,
      };
    }

    return {
      success: true,
      data: {
        taskId: args.taskId,
        subtaskId: args.subtaskId,
        message: 'Subtask deleted successfully',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete subtask',
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTask(task: Task): Record<string, unknown> {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate?.toISOString(),
    assignee: task.assignee,
    creator: task.creator,
    tags: task.tags,
    subtasks: task.subtasks.map(s => ({
      id: s.id,
      title: s.title,
      completed: s.completed,
    })),
    subtaskCount: task.subtasks.length,
    completedSubtasks: task.subtasks.filter(s => s.completed).length,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    completedAt: task.completedAt?.toISOString(),
  };
}

// ============================================================================
// Task Tools Export
// ============================================================================

export const taskTools: Tool[] = [
  {
    name: 'create_task',
    description: 'Create a new task with title, description, priority, due date, and subtasks',
    parameters: [
      { name: 'title', description: 'Task title', schema: z.string().min(1) },
      { name: 'description', description: 'Task description (optional)', schema: z.string().optional() },
      { name: 'priority', description: 'Task priority (optional, default: medium)', schema: z.enum(['low', 'medium', 'high', 'urgent']).optional() },
      { name: 'dueDate', description: 'Due date in ISO 8601 format (optional)', schema: z.string().optional() },
      { name: 'assignee', description: 'Task assignee (optional)', schema: z.string().optional() },
      { name: 'creator', description: 'Task creator', schema: z.string() },
      { name: 'tags', description: 'Task tags (optional)', schema: z.array(z.string()).optional() },
      { name: 'subtasks', description: 'Initial subtasks (optional)', schema: z.array(z.object({ title: z.string().min(1) })).optional() },
    ],
    execute: createTaskHandler,
  },
  {
    name: 'update_task',
    description: 'Update an existing task',
    parameters: [
      { name: 'taskId', description: 'Task ID to update', schema: z.string() },
      { name: 'title', description: 'New title (optional)', schema: z.string().optional() },
      { name: 'description', description: 'New description (optional)', schema: z.string().optional() },
      { name: 'priority', description: 'New priority (optional)', schema: z.enum(['low', 'medium', 'high', 'urgent']).optional() },
      { name: 'dueDate', description: 'New due date (optional)', schema: z.string().optional() },
      { name: 'assignee', description: 'New assignee (optional)', schema: z.string().optional() },
      { name: 'status', description: 'New status (optional)', schema: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional() },
      { name: 'tags', description: 'New tags (optional)', schema: z.array(z.string()).optional() },
    ],
    execute: updateTaskHandler,
  },
  {
    name: 'get_tasks',
    description: 'Get tasks with various filters',
    parameters: [
      { name: 'creator', description: 'Filter by creator (optional)', schema: z.string().optional() },
      { name: 'assignee', description: 'Filter by assignee (optional)', schema: z.string().optional() },
      { name: 'status', description: 'Filter by status (optional)', schema: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional() },
      { name: 'priority', description: 'Filter by priority (optional)', schema: z.enum(['low', 'medium', 'high', 'urgent']).optional() },
      { name: 'overdue', description: 'Get only overdue tasks (optional)', schema: z.boolean().optional() },
      { name: 'dueSoon', description: 'Get tasks due within N hours (optional)', schema: z.number().optional() },
      { name: 'limit', description: 'Max results (optional)', schema: z.number().min(1).max(100).optional() },
    ],
    execute: getTasksHandler,
  },
  {
    name: 'complete_task',
    description: 'Mark a task as completed',
    parameters: [
      { name: 'taskId', description: 'Task ID to complete', schema: z.string() },
    ],
    execute: completeTaskHandler,
  },
  {
    name: 'delete_task',
    description: 'Delete a task',
    parameters: [
      { name: 'taskId', description: 'Task ID to delete', schema: z.string() },
    ],
    execute: deleteTaskHandler,
  },
  {
    name: 'add_subtask',
    description: 'Add a subtask to a task',
    parameters: [
      { name: 'parentTaskId', description: 'Parent task ID', schema: z.string() },
      { name: 'title', description: 'Subtask title', schema: z.string().min(1) },
    ],
    execute: addSubtaskHandler,
  },
  {
    name: 'toggle_subtask',
    description: 'Toggle a subtask completion status',
    parameters: [
      { name: 'taskId', description: 'Parent task ID', schema: z.string() },
      { name: 'subtaskId', description: 'Subtask ID to toggle', schema: z.string() },
    ],
    execute: toggleSubtaskHandler,
  },
  {
    name: 'delete_subtask',
    description: 'Delete a subtask from a task',
    parameters: [
      { name: 'taskId', description: 'Parent task ID', schema: z.string() },
      { name: 'subtaskId', description: 'Subtask ID to delete', schema: z.string() },
    ],
    execute: deleteSubtaskHandler,
  },
];

// Export the store for testing
export { TaskStore, taskStore };
