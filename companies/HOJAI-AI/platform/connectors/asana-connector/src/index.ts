/**
 * Asana Connector
 * Port: 4799
 * Asana project management integration
 */

import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4799', 10);
app.use(express.json());

interface AsanaTask { id: string; name: string; notes?: string; completed: boolean; due_on?: string; assignee?: string; projects: string[]; tags: string[]; created_at: string; modified_at: string; }
interface AsanaProject { id: string; name: string; notes?: string; color?: string; archived: boolean; due_date?: string; }
interface AsanaTeam { id: string; name: string; description?: string; }

const tasks = new Map<string, AsanaTask>();
const projectList = new Map<string, AsanaProject>();
const teams = new Map<string, AsanaTeam>();

app.use((req, _res, next) => { (req as any).requestId = uuidv4(); next(); });

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'asana-connector', connected: !!process.env.ASANA_ACCESS_TOKEN }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.get('/api/tasks', (req, res) => {
  const { project, assignee, completed } = req.query;
  let all = Array.from(tasks.values());
  if (project) all = all.filter(t => t.projects.includes(project as string));
  if (assignee) all = all.filter(t => t.assignee === assignee);
  if (completed !== undefined) all = all.filter(t => t.completed === (completed === 'true'));
  res.json({ success: true, data: { tasks: all, total: all.length } });
});

app.post('/api/tasks',requireAuth,  (req, res) => {
  const { name, notes, due_on, assignee, projects = [], tags = [] } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name required' });
  const task: AsanaTask = {
    id: `task_${Date.now()}`,
    name,
    notes,
    completed: false,
    due_on,
    assignee,
    projects,
    tags,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString()
  };
  tasks.set(task.id, task);
  res.status(201).json({ success: true, data: task });
});

app.patch('/api/tasks/:id',requireAuth,  (req, res) => {
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  Object.assign(task, req.body, { modified_at: new Date().toISOString() });
  res.json({ success: true, data: task });
});

app.get('/api/projects', (_req, res) => res.json({ success: true, data: { projects: Array.from(projectList.values()), total: projectList.size } }));

app.post('/api/projects',requireAuth,  (req, res) => {
  const { name, notes, color } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name required' });
  const project: AsanaProject = { id: `proj_${Date.now()}`, name, notes, color, archived: false };
  projectList.set(project.id, project);
  res.status(201).json({ success: true, data: project });
});

app.get('/api/teams', (_req, res) => res.json({ success: true, data: { teams: Array.from(teams.values()), total: teams.size } }));

// Observer
app.get('/api/observer/events/:userId', (req, res) => {
  const events = Array.from(tasks.values())
    .filter(t => t.assignee === req.params.userId)
    .map(t => ({ source: 'asana', type: 'task_updated', employeeId: req.params.userId, timestamp: t.modified_at, data: { task: t.name, completed: t.completed } }));
  res.json({ success: true, data: { events, total: events.length } });
});

const server = app.listen(PORT, () => console.log(`Asana Connector - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
