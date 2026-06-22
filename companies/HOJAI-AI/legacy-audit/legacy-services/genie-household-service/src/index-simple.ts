/**
 * GENIE Household Service - Simplified
 * Port: 4720
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4720', 10);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

interface Household {
  id: string;
  name: string;
  members: string[];
  createdAt: Date;
}

interface Task {
  id: string;
  householdId: string;
  title: string;
  assignedTo?: string;
  frequency: string;
  status: string;
  dueDate?: Date;
}

const households = new Map<string, Household>();
const tasks = new Map<string, Task[]>();

// Health
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'genie-household', version: '1.0.0', uptime: process.uptime() });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', (req: Request, res: Response) => {
  res.json({ status: 'ready' });
});

app.get('/metrics', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  res.send('service_up 1\n');
});

// Households
app.post('/api/households', (req: Request, res: Response) => {
  const { name, members } = req.body;

  const household: Household = {
    id: uuidv4(),
    name,
    members: members || [],
    createdAt: new Date(),
  };

  households.set(household.id, household);
  res.status(201).json({ success: true, household });
});

app.get('/api/households', (req: Request, res: Response) => {
  res.json({ count: households.size, households: Array.from(households.values()) });
});

app.get('/api/households/:id', (req: Request, res: Response) => {
  const household = households.get(req.params.id);
  if (!household) return res.status(404).json({ error: 'Not found' });
  res.json(household);
});

// Tasks
app.post('/api/tasks', (req: Request, res: Response) => {
  const { householdId, title, assignedTo, frequency } = req.body;

  const task: Task = {
    id: uuidv4(),
    householdId,
    title,
    assignedTo,
    frequency: frequency || 'once',
    status: 'pending',
  };

  const householdTasks = tasks.get(householdId) || [];
  householdTasks.push(task);
  tasks.set(householdId, householdTasks);

  res.status(201).json({ success: true, task });
});

app.get('/api/households/:id/tasks', (req: Request, res: Response) => {
  const householdTasks = tasks.get(req.params.id) || [];
  res.json({ count: householdTasks.length, tasks: householdTasks });
});

app.patch('/api/tasks/:id/complete', (req: Request, res: Response) => {
  for (const [hhId, hhTasks] of tasks.entries()) {
    const task = hhTasks.find(t => t.id === req.params.id);
    if (task) {
      task.status = 'completed';
      res.json({ success: true, task });
      return;
    }
  }
  res.status(404).json({ error: 'Task not found' });
});

app.listen(PORT, () => {
  console.log(`\n🏠 GENIE Household Service (${PORT})\n`);
});

export default app;