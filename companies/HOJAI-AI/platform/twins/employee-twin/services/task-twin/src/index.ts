import { requireAuth } from '@rtmn/shared/auth';
/**
 * Task Twin Service v1.0
 * Digital twin for task management with delegation support
 * Port: 4893
 */

import express, { type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  delegator?: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  dependencies: string[];
}

export interface TaskCreate {
  title: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  delegator?: string;
  dueDate?: string;
  tags?: string[];
  dependencies?: string[];
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  dueDate?: string;
  tags?: string[];
  dependencies?: string[];
}

// Create TaskTwin service
export function createTaskTwinService() {
  // In-memory storage (instance-level to allow testing)
  const tasks: Map<string, Task> = new Map();

  const app = express();
  app.use(express.json());

  // POST /api/tasks - Create task
  app.post('/api/tasks',requireAuth,  (req: Request, res: Response) => {
    const { title, description, status, priority, assignee, delegator, dueDate, tags, dependencies } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const task: Task = {
      id: uuidv4(),
      title,
      description,
      status: status || 'pending',
      priority: priority || 'medium',
      assignee,
      delegator,
      dueDate,
      completedAt: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: tags || [],
      dependencies: dependencies || []
    };

    tasks.set(task.id, task);
    return res.status(201).json(task);
  });

  // GET /api/tasks - List tasks (MUST come before :id route)
  app.get('/api/tasks', (req: Request, res: Response) => {
    const { status, assignee, priority, tags } = req.query;
    let filtered = Array.from(tasks.values());

    if (status) {
      filtered = filtered.filter(t => t.status === status);
    }
    if (assignee) {
      filtered = filtered.filter(t => t.assignee === assignee);
    }
    if (priority) {
      filtered = filtered.filter(t => t.priority === priority);
    }
    if (tags) {
      const tagList = (tags as string).split(',');
      filtered = filtered.filter(t => tagList.some(tag => t.tags.includes(tag)));
    }

    return res.status(200).json({ tasks: filtered, total: filtered.length });
  });

  // GET /api/tasks/analytics - Task analytics (MUST come before :id route)
  app.get('/api/tasks/analytics', (_req: Request, res: Response) => {
    const allTasks = Array.from(tasks.values());

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let completedCount = 0;

    allTasks.forEach(task => {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
      if (task.status === 'completed') completedCount++;
    });

    return res.status(200).json({
      total: allTasks.length,
      byStatus,
      byPriority,
      completionRate: allTasks.length > 0 ? (completedCount / allTasks.length) * 100 : 0
    });
  });

  // POST /api/tasks/bulk-update - Bulk update (MUST come before :id route)
  app.post('/api/tasks/bulk-update',requireAuth,  (req: Request, res: Response) => {
    const { taskIds, updates } = req.body;

    if (!taskIds || taskIds.length === 0) {
      return res.status(400).json({ error: 'taskIds array is required' });
    }

    const updatedTasks: Task[] = [];
    taskIds.forEach((id: string) => {
      const task = tasks.get(id);
      if (task) {
        if (updates.title !== undefined) task.title = updates.title;
        if (updates.status !== undefined) {
          task.status = updates.status;
          if (updates.status === 'completed') {
            task.completedAt = new Date().toISOString();
          }
        }
        if (updates.priority !== undefined) task.priority = updates.priority;
        if (updates.assignee !== undefined) task.assignee = updates.assignee;
        if (updates.dueDate !== undefined) task.dueDate = updates.dueDate;
        task.updatedAt = new Date().toISOString();
        tasks.set(task.id, task);
        updatedTasks.push(task);
      }
    });

    return res.status(200).json({ updated: updatedTasks.length, tasks: updatedTasks });
  });

  // GET /api/tasks/:id - Get task
  app.get('/api/tasks/:id', (req: Request, res: Response) => {
    const task = tasks.get(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    return res.status(200).json(task);
  });

  // PUT /api/tasks/:id - Update task
  app.put('/api/tasks/:id',requireAuth,  (req: Request, res: Response) => {
    const task = tasks.get(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { title, description, status, priority, assignee, dueDate, tags, dependencies } = req.body;

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) {
      task.status = status;
      if (status === 'completed') {
        task.completedAt = new Date().toISOString();
      }
    }
    if (priority !== undefined) task.priority = priority;
    if (assignee !== undefined) task.assignee = assignee;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (tags !== undefined) task.tags = tags;
    if (dependencies !== undefined) task.dependencies = dependencies;
    task.updatedAt = new Date().toISOString();

    tasks.set(task.id, task);
    return res.status(200).json(task);
  });

  // DELETE /api/tasks/:id - Delete task
  app.delete('/api/tasks/:id',requireAuth,  (req: Request, res: Response) => {
    if (!tasks.has(req.params.id)) {
      return res.status(404).json({ error: 'Task not found' });
    }
    tasks.delete(req.params.id);
    return res.status(204).send();
  });

  // POST /api/tasks/:id/delegate - Delegate task
  app.post('/api/tasks/:id/delegate',requireAuth,  (req: Request, res: Response) => {
    const task = tasks.get(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { newAssignee, reason } = req.body;
    if (!newAssignee) {
      return res.status(400).json({ error: 'newAssignee is required' });
    }

    task.delegator = task.assignee || undefined;
    task.assignee = newAssignee;
    task.updatedAt = new Date().toISOString();

    tasks.set(task.id, task);
    return res.status(200).json(task);
  });

  // GET /health - Health check
  app.get('/health', (_req: Request, res: Response) => {
    return res.status(200).json({
      status: 'healthy',
      service: 'task-twin',
      timestamp: new Date().toISOString(),
      tasks: tasks.size
    });
  });

  return app;
}

// Start server if run directly
const PORT = parseInt(process.env.PORT || '4893', 10);
const server = createTaskTwinService().listen(PORT, () => {
  console.log(`Task Twin - Port ${PORT}`);
});

export default server;
