/**
 * Task Twin Service v1.0
 * Digital twin for task management
 * Port: 4893
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4893', 10);
app.use(express.json());

// In-memory storage
interface Task {
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

const tasks = new Map<string, Task>();
const delegationHistory: Array<{ from: string; to: string; taskId: string; timestamp: string }> = [];

// Middleware
app.use((req, _res, next) => {
  (req as any).requestId = uuidv4();
  next();
});

// Health
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'task-twin', version: '1.0.0', tasks: tasks.size });
});

app.get('/ready', (_req, res) => res.json({ ready: true }));

// List tasks
app.get('/api/tasks', (req, res) => {
  const { status, priority, assignee } = req.query;
  let all = Array.from(tasks.values());
  if (status) all = all.filter(t => t.status === status);
  if (priority) all = all.filter(t => t.priority === priority);
  if (assignee) all = all.filter(t => t.assignee === assignee);
  res.json({ success: true, data: { tasks: all, total: all.length } });
});

// Get task
app.get('/api/tasks/:id', (req, res) => {
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  res.json({ success: true, data: task });
});

// Create task
app.post('/api/tasks', (req, res) => {
  const { title, description, priority = 'medium', assignee, dueDate, tags = [], dependencies = [] } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'title required' });

  const task: Task = {
    id: `task_${Date.now()}`,
    title,
    description,
    status: 'pending',
    priority,
    assignee,
    dueDate,
    tags,
    dependencies,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  tasks.set(task.id, task);
  res.status(201).json({ success: true, data: task });
});

// Update task
app.patch('/api/tasks/:id', (req, res) => {
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

  const { title, description, status, priority, assignee, dueDate, tags } = req.body;
  if (title) task.title = title;
  if (description !== undefined) task.description = description;
  if (status) {
    task.status = status;
    if (status === 'completed') task.completedAt = new Date().toISOString();
  }
  if (priority) task.priority = priority;
  if (assignee !== undefined) task.assignee = assignee;
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (tags) task.tags = tags;
  task.updatedAt = new Date().toISOString();

  tasks.set(task.id, task);
  res.json({ success: true, data: task });
});

// Delegate task
app.post('/api/tasks/:id/delegate', (req, res) => {
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

  const { to, reason } = req.body;
  if (!to) return res.status(400).json({ success: false, error: 'to (assignee) required' });

  delegationHistory.push({
    from: task.assignee || 'unassigned',
    to,
    taskId: task.id,
    timestamp: new Date().toISOString()
  });

  task.assignee = to;
  task.delegator = task.assignee;
  task.updatedAt = new Date().toISOString();
  tasks.set(task.id, task);

  res.json({ success: true, data: { task, delegation: { from: task.delegator, to, reason } } });
});

// Get delegation history
app.get('/api/delegations', (req, res) => {
  const { taskId } = req.query;
  let history = [...delegationHistory];
  if (taskId) history = history.filter(d => d.taskId === taskId);
  res.json({ success: true, data: { history, total: history.length } });
});

// Task analytics
app.get('/api/analytics', (req, res) => {
  const all = Array.from(tasks.values());
  const byStatus = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 };
  const byPriority = { low: 0, medium: 0, high: 0, urgent: 0 };

  all.forEach(t => {
    byStatus[t.status]++;
    byPriority[t.priority]++;
  });

  const overdue = all.filter(t =>
    t.status !== 'completed' && t.status !== 'cancelled' &&
    t.dueDate && new Date(t.dueDate) < new Date()
  ).length;

  res.json({
    success: true,
    data: {
      total: all.length,
      byStatus,
      byPriority,
      overdue,
      completionRate: all.length > 0 ? (byStatus.completed / all.length) * 100 : 0
    }
  });
});

const server = app.listen(PORT, () => console.log(`Task Twin - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
