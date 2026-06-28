/**
 * Linear Connector
 * Port: 4798
 * Linear issue tracking integration
 */

import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4798', 10);
app.use(express.json());

interface LinearIssue { id: string; identifier: string; title: string; description?: string; state: string; priority: number; assignee?: string; labels: string[]; team: string; dueDate?: string; createdAt: string; updatedAt: string; }
interface LinearProject { id: string; name: string; description?: string; icon?: string; state: string; members: string[]; }
interface LinearCycle { id: string; name: string; startsAt: string; endsAt: string; status: 'active' | 'upcoming' | 'completed'; }

const issues = new Map<string, LinearIssue>();
const projects = new Map<string, LinearProject>();
const cycles = new Map<string, LinearCycle>();

app.use((req, _res, next) => { (req as any).requestId = uuidv4(); next(); });

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'linear-connector', connected: !!process.env.LINEAR_API_KEY }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.get('/api/issues', (req, res) => {
  const { team, state, assignee, priority } = req.query;
  let all = Array.from(issues.values());
  if (team) all = all.filter(i => i.team === team);
  if (state) all = all.filter(i => i.state === state);
  if (assignee) all = all.filter(i => i.assignee === assignee);
  if (priority) all = all.filter(i => i.priority === Number(priority));
  res.json({ success: true, data: { issues: all, total: all.length } });
});

app.post('/api/issues',requireAuth,  (req, res) => {
  const { title, description, team, assignee, priority = 0, labels = [] } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'title required' });
  const num = issues.size + 1;
  const issue: LinearIssue = {
    id: `issue_${Date.now()}`,
    identifier: `${team || 'TRI'}-${num}`,
    title,
    description,
    state: 'Backlog',
    priority,
    assignee,
    labels,
    team: team || 'TRI',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  issues.set(issue.id, issue);
  res.status(201).json({ success: true, data: issue });
});

app.patch('/api/issues/:id',requireAuth,  (req, res) => {
  const issue = issues.get(req.params.id);
  if (!issue) return res.status(404).json({ success: false, error: 'Issue not found' });
  Object.assign(issue, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: issue });
});

app.get('/api/projects', (_req, res) => res.json({ success: true, data: { projects: Array.from(projects.values()), total: projects.size } }));

app.post('/api/projects',requireAuth,  (req, res) => {
  const { name, description, members = [] } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name required' });
  const project: LinearProject = { id: `proj_${Date.now()}`, name, description, state: 'Active', members };
  projects.set(project.id, project);
  res.status(201).json({ success: true, data: project });
});

app.get('/api/cycles', (_req, res) => res.json({ success: true, data: { cycles: Array.from(cycles.values()), total: cycles.size } }));

// Observer
app.get('/api/observer/events/:userId', (req, res) => {
  const { days = 7 } = req.query;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(days));
  const events = Array.from(issues.values())
    .filter(i => i.assignee === req.params.userId && new Date(i.updatedAt) >= cutoff)
    .map(i => ({ source: 'linear', type: 'issue_updated', employeeId: req.params.userId, timestamp: i.updatedAt, data: { issue: i.identifier, title: i.title, state: i.state } }));
  res.json({ success: true, data: { events, total: events.length } });
});

const server = app.listen(PORT, () => console.log(`Linear Connector - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
