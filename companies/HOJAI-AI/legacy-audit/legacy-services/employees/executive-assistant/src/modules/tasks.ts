/**
 * Tasks Module - Task Management
 *
 * Handles creating, organizing, and managing tasks
 */

import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  Subtask,
  Assignee,
  ChecklistItem,
  ApiResponse
} from '../types.js';

const router = Router();

// ============================================================================
// IN-MEMORY STORE (Mock Implementation)
// In production, use MongoDB or a task management store
// ============================================================================

const tasks: Map<string, Task> = new Map();

// ============================================================================
// HELPERS
// ============================================================================

function generateTaskId(): string {
  return `task_${Date.now()}_${uuid().split('-')[0]}`;
}

function generateSubtaskId(): string {
  return `st_${uuid().split('-')[0]}`;
}

function generateChecklistId(): string {
  return `cl_${uuid().split('-')[0]}`;
}

function parseDate(dateStr: string): Date {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return date;
}

function validateTaskInput(input: CreateTaskInput): void {
  if (!input.title?.trim()) {
    throw new Error('Title is required');
  }
}

function serializeTask(task: Task): Task {
  return {
    ...task,
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    startDate: task.startDate ? new Date(task.startDate) : undefined,
    completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt)
  };
}

function getUserId(req: Request): string {
  return (req.headers['x-user-id'] as string) || 'default-user';
}

function getTenantId(req: Request): string {
  return (req.headers['x-tenant-id'] as string) || 'default';
}

function calculateProgress(task: Task): number {
  if (!task.checklist || task.checklist.length === 0) {
    return task.status === 'completed' ? 100 : 0;
  }

  const completed = task.checklist.filter(item => item.isChecked).length;
  return Math.round((completed / task.checklist.length) * 100);
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/tasks
 * Create a new task
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const input: CreateTaskInput = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    validateTaskInput(input);

    const subtasks: Subtask[] = (input.subtasks || []).map(st => ({
      id: generateSubtaskId(),
      title: st.title,
      isCompleted: false
    }));

    const assignees: Assignee[] = (input.assignees || []).map(a => ({
      userId: a.userId,
      email: a.email || `user_${a.userId}@example.com`,
      name: a.name,
      role: a.role || 'assignee'
    }));

    const checklist: ChecklistItem[] = (input.checklist || []).map(cl => ({
      id: generateChecklistId(),
      text: cl.text,
      isChecked: false,
      assignedTo: cl.assignedTo
    }));

    const task: Task = {
      id: generateTaskId(),
      userId,
      tenantId,
      title: input.title.trim(),
      description: input.description?.trim(),
      status: 'pending',
      priority: input.priority || 'medium',
      dueDate: input.dueDate ? parseDate(input.dueDate) : undefined,
      startDate: input.startDate ? parseDate(input.startDate) : undefined,
      estimatedMinutes: input.estimatedMinutes,
      actualMinutes: undefined,
      progress: calculateProgress({ checklist } as Task),
      tags: input.tags || [],
      folder: input.folder,
      project: input.project,
      subtasks,
      linkedEvents: [],
      linkedNotes: [],
      linkedEmails: [],
      assignees,
      checklist,
      dependencies: [],
      attachments: [],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    tasks.set(task.id, task);

    const response: ApiResponse<Task> = {
      success: true,
      data: serializeTask(task),
      message: 'Task created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create task';
    res.status(400).json({ success: false, error: message });
  }
});

/**
 * GET /api/tasks
 * List all tasks for the user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const tenantId = getTenantId(req);
    const {
      status,
      priority,
      project,
      folder,
      tag,
      assignee,
      search,
      dueToday,
      overdue,
      upcoming,
      page = '1',
      limit = '20',
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    let filtered = Array.from(tasks.values()).filter(
      task => task.userId === userId && task.tenantId === tenantId
    );

    // Filter by status
    if (status) {
      filtered = filtered.filter(t => t.status === status);
    }

    // Filter by priority
    if (priority) {
      filtered = filtered.filter(t => t.priority === priority);
    }

    // Filter by project
    if (project) {
      filtered = filtered.filter(t => t.project === project);
    }

    // Filter by folder
    if (folder) {
      filtered = filtered.filter(t => t.folder === folder);
    }

    // Filter by tag
    if (tag) {
      filtered = filtered.filter(t => t.tags?.includes(tag as string));
    }

    // Filter by assignee
    if (assignee) {
      filtered = filtered.filter(t =>
        t.assignees?.some(a => a.userId === assignee)
      );
    }

    // Filter by due today
    if (dueToday === 'true') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      filtered = filtered.filter(t =>
        t.dueDate &&
        new Date(t.dueDate) >= today &&
        new Date(t.dueDate) < tomorrow &&
        t.status !== 'completed'
      );
    }

    // Filter by overdue
    if (overdue === 'true') {
      const now = new Date();
      filtered = filtered.filter(t =>
        t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== 'completed' &&
        t.status !== 'cancelled'
      );
    }

    // Filter by upcoming (next 7 days)
    if (upcoming === 'true') {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      filtered = filtered.filter(t =>
        t.dueDate &&
        new Date(t.dueDate) >= now &&
        new Date(t.dueDate) <= nextWeek &&
        t.status !== 'completed'
      );
    }

    // Search
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower) ||
        t.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
        t.project?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      // Priority sort
      if (sort === 'priority') {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        const comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
        return order === 'desc' ? -comparison : comparison;
      }

      // Due date sort
      if (sort === 'dueDate') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return order === 'desc' ? -1 : 1;
        if (!b.dueDate) return order === 'desc' ? 1 : -1;
        const comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        return order === 'desc' ? -comparison : comparison;
      }

      // Default sort
      const aVal = a[sort as keyof Task];
      const bVal = b[sort as keyof Task];

      if (aVal === undefined || bVal === undefined) return 0;

      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else if (aVal instanceof Date && bVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime();
      }

      return order === 'desc' ? -comparison : comparison;
    });

    // Stats
    const stats = {
      total: filtered.length,
      pending: filtered.filter(t => t.status === 'pending').length,
      inProgress: filtered.filter(t => t.status === 'in_progress').length,
      completed: filtered.filter(t => t.status === 'completed').length,
      overdue: filtered.filter(t =>
        t.dueDate &&
        new Date(t.dueDate) < new Date() &&
        t.status !== 'completed' &&
        t.status !== 'cancelled'
      ).length
    };

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const total = filtered.length;
    const totalPages = Math.ceil(total / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedTasks = filtered.slice(startIndex, startIndex + limitNum);

    // Get unique projects and folders
    const projects = [...new Set(filtered.filter(t => t.project).map(t => t.project!))];
    const folders = [...new Set(filtered.filter(t => t.folder).map(t => t.folder!))];
    const tags = [...new Set(filtered.flatMap(t => t.tags || []))];

    const response: ApiResponse<Task[]> = {
      success: true,
      data: paginatedTasks.map(serializeTask),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    };

    res.json({
      ...response,
      stats,
      meta: { projects, folders, tags }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list tasks';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/tasks/:id
 * Get a specific task
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const task = tasks.get(id);

    if (!task || task.userId !== userId || task.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const response: ApiResponse<Task> = {
      success: true,
      data: serializeTask(task)
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get task';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * PATCH /api/tasks/:id
 * Update a task
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const input: UpdateTaskInput = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const task = tasks.get(id);

    if (!task || task.userId !== userId || task.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Update fields
    if (input.title !== undefined) task.title = input.title.trim();
    if (input.description !== undefined) task.description = input.description?.trim();
    if (input.priority !== undefined) task.priority = input.priority;
    if (input.dueDate !== undefined) task.dueDate = input.dueDate ? parseDate(input.dueDate) : undefined;
    if (input.startDate !== undefined) task.startDate = input.startDate ? parseDate(input.startDate) : undefined;
    if (input.estimatedMinutes !== undefined) task.estimatedMinutes = input.estimatedMinutes;
    if (input.tags !== undefined) task.tags = input.tags;
    if (input.folder !== undefined) task.folder = input.folder;
    if (input.project !== undefined) task.project = input.project;
    if (input.status !== undefined) {
      task.status = input.status;
      if (input.status === 'completed') {
        task.completedAt = new Date();
      }
    }
    if (input.progress !== undefined) task.progress = Math.min(100, Math.max(0, input.progress));

    task.progress = calculateProgress(task);
    task.updatedAt = new Date();

    const response: ApiResponse<Task> = {
      success: true,
      data: serializeTask(task),
      message: 'Task updated successfully'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update task';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const task = tasks.get(id);

    if (!task || task.userId !== userId || task.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    tasks.delete(id);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Task deleted'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete task';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/tasks/:id/subtasks
 * Add a subtask
 */
router.post('/:id/subtasks', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    if (!title?.trim()) {
      return res.status(400).json({ success: false, error: 'Subtask title is required' });
    }

    const task = tasks.get(id);

    if (!task || task.userId !== userId || task.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const subtask: Subtask = {
      id: generateSubtaskId(),
      title: title.trim(),
      isCompleted: false
    };

    task.subtasks = task.subtasks || [];
    task.subtasks.push(subtask);
    task.progress = calculateProgress(task);
    task.updatedAt = new Date();

    const response: ApiResponse<{ subtask: Subtask; task: Task }> = {
      success: true,
      data: { subtask, task: serializeTask(task) },
      message: 'Subtask added'
    };

    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add subtask';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * PATCH /api/tasks/:id/subtasks/:subtaskId
 * Update a subtask
 */
router.patch('/:id/subtasks/:subtaskId', async (req: Request, res: Response) => {
  try {
    const { id, subtaskId } = req.params;
    const { title, isCompleted } = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const task = tasks.get(id);

    if (!task || task.userId !== userId || task.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const subtask = task.subtasks?.find(st => st.id === subtaskId);

    if (!subtask) {
      return res.status(404).json({ success: false, error: 'Subtask not found' });
    }

    if (title !== undefined) subtask.title = title.trim();
    if (isCompleted !== undefined) {
      subtask.isCompleted = isCompleted;
      if (isCompleted) {
        subtask.completedAt = new Date();
      }
    }

    task.progress = calculateProgress(task);
    task.updatedAt = new Date();

    const response: ApiResponse<Task> = {
      success: true,
      data: serializeTask(task),
      message: 'Subtask updated'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update subtask';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/tasks/:id/subtasks/:subtaskId
 * Delete a subtask
 */
router.delete('/:id/subtasks/:subtaskId', async (req: Request, res: Response) => {
  try {
    const { id, subtaskId } = req.params;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const task = tasks.get(id);

    if (!task || task.userId !== userId || task.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const subtaskIndex = task.subtasks?.findIndex(st => st.id === subtaskId);

    if (subtaskIndex === undefined || subtaskIndex === -1) {
      return res.status(404).json({ success: false, error: 'Subtask not found' });
    }

    task.subtasks!.splice(subtaskIndex, 1);
    task.progress = calculateProgress(task);
    task.updatedAt = new Date();

    const response: ApiResponse<Task> = {
      success: true,
      data: serializeTask(task),
      message: 'Subtask deleted'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete subtask';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/tasks/:id/checklist
 * Add checklist item
 */
router.post('/:id/checklist', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { text, assignedTo } = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    if (!text?.trim()) {
      return res.status(400).json({ success: false, error: 'Checklist item text is required' });
    }

    const task = tasks.get(id);

    if (!task || task.userId !== userId || task.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const item: ChecklistItem = {
      id: generateChecklistId(),
      text: text.trim(),
      isChecked: false,
      assignedTo
    };

    task.checklist = task.checklist || [];
    task.checklist.push(item);
    task.progress = calculateProgress(task);
    task.updatedAt = new Date();

    const response: ApiResponse<Task> = {
      success: true,
      data: serializeTask(task),
      message: 'Checklist item added'
    };

    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add checklist item';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * PATCH /api/tasks/:id/checklist/:itemId
 * Toggle/check a checklist item
 */
router.patch('/:id/checklist/:itemId', async (req: Request, res: Response) => {
  try {
    const { id, itemId } = req.params;
    const { isChecked, text } = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const task = tasks.get(id);

    if (!task || task.userId !== userId || task.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const item = task.checklist?.find(cl => cl.id === itemId);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Checklist item not found' });
    }

    if (text !== undefined) item.text = text.trim();
    if (isChecked !== undefined) {
      item.isChecked = isChecked;
      if (isChecked) {
        item.completedAt = new Date();
      }
    }

    task.progress = calculateProgress(task);
    task.updatedAt = new Date();

    const response: ApiResponse<Task> = {
      success: true,
      data: serializeTask(task)
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update checklist item';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/tasks/:id/complete
 * Mark task as completed
 */
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const task = tasks.get(id);

    if (!task || task.userId !== userId || task.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    task.status = 'completed';
    task.progress = 100;
    task.completedAt = new Date();
    task.updatedAt = new Date();

    const response: ApiResponse<Task> = {
      success: true,
      data: serializeTask(task),
      message: 'Task completed'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete task';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/tasks/:id/start
 * Start working on task
 */
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const task = tasks.get(id);

    if (!task || task.userId !== userId || task.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    task.status = 'in_progress';
    task.startDate = task.startDate || new Date();
    task.updatedAt = new Date();

    const response: ApiResponse<Task> = {
      success: true,
      data: serializeTask(task),
      message: 'Task started'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start task';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/tasks/bulk-complete
 * Complete multiple tasks
 */
router.post('/bulk-complete', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ success: false, error: 'IDs array is required' });
    }

    const completed: string[] = [];
    const notFound: string[] = [];

    ids.forEach(id => {
      const task = tasks.get(id);
      if (task && task.userId === userId && task.tenantId === tenantId) {
        task.status = 'completed';
        task.progress = 100;
        task.completedAt = new Date();
        task.updatedAt = new Date();
        completed.push(id);
      } else {
        notFound.push(id);
      }
    });

    res.json({
      success: true,
      message: `${completed.length} tasks completed`,
      data: { completed, notFound }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bulk complete';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/tasks/:id/assign
 * Assign task to user
 */
router.post('/:id/assign', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId: assigneeUserId, email, name, role = 'assignee' } = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    if (!assigneeUserId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const task = tasks.get(id);

    if (!task || task.userId !== userId || task.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Check if already assigned
    if (task.assignees?.some(a => a.userId === assigneeUserId)) {
      return res.status(400).json({ success: false, error: 'User already assigned' });
    }

    const assignee: Assignee = {
      userId: assigneeUserId,
      email: email || `user_${assigneeUserId}@example.com`,
      name,
      role
    };

    task.assignees = task.assignees || [];
    task.assignees.push(assignee);
    task.updatedAt = new Date();

    const response: ApiResponse<Task> = {
      success: true,
      data: serializeTask(task),
      message: 'User assigned'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to assign user';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/tasks/:id/assign/:assigneeId
 * Remove assignee from task
 */
router.delete('/:id/assign/:assigneeId', async (req: Request, res: Response) => {
  try {
    const { id, assigneeId } = req.params;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const task = tasks.get(id);

    if (!task || task.userId !== userId || task.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const assigneeIndex = task.assignees?.findIndex(a => a.userId === assigneeId);

    if (assigneeIndex === undefined || assigneeIndex === -1) {
      return res.status(404).json({ success: false, error: 'Assignee not found' });
    }

    task.assignees!.splice(assigneeIndex, 1);
    task.updatedAt = new Date();

    const response: ApiResponse<Task> = {
      success: true,
      data: serializeTask(task),
      message: 'Assignee removed'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove assignee';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
