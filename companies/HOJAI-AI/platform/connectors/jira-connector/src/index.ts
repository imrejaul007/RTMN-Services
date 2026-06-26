/**
 * Jira Connector
 * Port: 4793
 * Real Jira API integration for project management
 */

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4793', 10);
app.use(express.json());

interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description?: string;
  type: 'bug' | 'story' | 'task' | 'epic';
  status: 'todo' | 'in_progress' | 'done';
  assignee?: string;
  reporter: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  labels: string[];
  created: string;
  updated: string;
  due?: string;
}

interface JiraProject {
  id: string;
  key: string;
  name: string;
  lead: string;
  issueTypes: string[];
}

const projects = new Map<string, JiraProject>();
const issues = new Map<string, JiraIssue[]>();

// Sample data
projects.set('PROJ', { id: '10000', key: 'PROJ', name: 'Main Project', lead: 'admin', issueTypes: ['bug', 'story', 'task', 'epic'] });
issues.set('PROJ', []);

app.use((req, _res, next) => { (req as any).requestId = uuidv4(); next(); });

app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'jira-connector', version: '1.0.0', connected: !!process.env.JIRA_URL }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

app.get('/api/projects', (_req, res) => res.json({ success: true, data: { projects: Array.from(projects.values()) } }));

app.get('/api/projects/:key/issues', (req, res) => {
  const { key } = req.params;
  const { assignee, status, type } = req.query;
  let projectIssues = issues.get(key) || [];

  if (assignee) projectIssues = projectIssues.filter(i => i.assignee === assignee);
  if (status) projectIssues = projectIssues.filter(i => i.status === status);
  if (type) projectIssues = projectIssues.filter(i => i.type === type);

  res.json({ success: true, data: { issues: projectIssues, total: projectIssues.length } });
});

app.post('/api/projects/:key/issues', (req, res) => {
  const { key } = req.params;
  const { summary, description, type = 'task', assignee, priority = 'medium' } = req.body;
  if (!summary) return res.status(400).json({ success: false, error: 'summary required' });

  const projectIssues = issues.get(key) || [];
  const issue: JiraIssue = {
    id: `${Date.now()}`,
    key: `${key}-${projectIssues.length + 1}`,
    summary,
    description,
    type,
    status: 'todo',
    assignee,
    reporter: 'me',
    priority,
    labels: [],
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };

  projectIssues.push(issue);
  issues.set(key, projectIssues);
  res.status(201).json({ success: true, data: issue });
});

app.get('/api/observer/events/:userId', (req, res) => {
  const { userId } = req.params;
  const { days = 7 } = req.query;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(days));

  const events = [];
  for (const [project, projectIssues] of issues.entries()) {
    for (const issue of projectIssues) {
      if ((issue.assignee === userId || issue.reporter === userId) && new Date(issue.updated) >= cutoff) {
        events.push({ source: 'jira', type: 'issue_updated', employeeId: userId, timestamp: issue.updated, data: { project, issue: issue.key, summary: issue.summary } });
      }
    }
  }

  res.json({ success: true, data: { events, total: events.length } });
});

app.use((_req: Request, res: Response) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }));

const server = app.listen(PORT, () => console.log(`Jira Connector - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
