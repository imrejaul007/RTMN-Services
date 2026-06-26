/**
 * 24x7 Execution Engine - Port: 4761
 * Manages continuous task execution and sleep/wake cycles
 */

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4761', 10);
app.use(express.json());

interface Task { id: string; employeeId: string; description: string; priority: 'critical' | 'high' | 'normal' | 'low'; status: 'queued' | 'executing' | 'completed' | 'failed'; scheduledFor?: string; createdAt: string; }
interface SleepSchedule { employeeId: string; mode: 'sleep' | 'standby' | 'active'; timezone: string; }
const tasks = new Map<string, Task>();
const schedules = new Map<string, SleepSchedule>();

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'execution-engine-24x7', version: '1.0.0', timestamp: new Date().toISOString() }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.post('/api/queue', (req: Request, res: Response) => {
  const { employeeId, description, priority, scheduledFor } = req.body;
  const task: Task = { id: `t_${Date.now()}`, employeeId, description, priority: priority || 'normal', status: 'queued', scheduledFor, createdAt: new Date().toISOString() };
  tasks.set(task.id, task);
  res.status(201).json({ success: true, data: task });
});

app.get('/api/queue/:employeeId', (req, res) => {
  const empTasks = Array.from(tasks.values()).filter(t => t.employeeId === req.params.employeeId);
  res.json({ success: true, data: { tasks: empTasks, total: empTasks.length } });
});

app.post('/api/queue/:taskId/execute', (req, res) => {
  const task = tasks.get(req.params.taskId);
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  task.status = 'executing';
  setTimeout(() => { task.status = 'completed'; }, 100); // Simulate execution
  res.json({ success: true, data: { status: 'executing', taskId: task.id } });
});

app.get('/api/schedule/:employeeId', (req, res) => {
  const schedule = schedules.get(req.params.employeeId) || { employeeId: req.params.employeeId, mode: 'active', timezone: 'UTC' };
  res.json({ success: true, data: schedule });
});

app.post('/api/schedule/:employeeId/mode', (req, res) => {
  const { mode } = req.body;
  schedules.set(req.params.employeeId, { employeeId: req.params.employeeId, mode: mode || 'active', timezone: 'UTC' });
  res.json({ success: true, data: { mode, employeeId: req.params.employeeId } });
});

const server = app.listen(PORT, () => console.log(`24x7 Execution Engine - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
