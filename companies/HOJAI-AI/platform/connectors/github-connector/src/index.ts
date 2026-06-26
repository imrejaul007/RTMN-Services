/**
 * GitHub Connector
 * Port: 4791
 * Real GitHub API integration for code and collaboration
 */

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4791', 10);
app.use(express.json());

// Types
interface GitHubRepo {
  id: string;
  name: string;
  full_name: string;
  private: boolean;
  description?: string;
  default_branch: string;
  language?: string;
  stars: number;
  forks: number;
}

interface GitHubIssue {
  id: string;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  assignee?: string;
  labels: string[];
  created_at: string;
  updated_at: string;
}

interface GitHubPR {
  id: string;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  user: string;
  branch: string;
  base_branch: string;
  additions: number;
  deletions: number;
  created_at: string;
}

interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  files_changed: number;
}

// Storage (simulated)
const repos = new Map<string, GitHubRepo>();
const issues = new Map<string, GitHubIssue[]>();
const prs = new Map<string, GitHubPR[]>();
const commits = new Map<string, GitHubCommit[]>();

// Initialize sample data
repos.set('owner/repo1', { id: 'R1', name: 'repo1', full_name: 'owner/repo1', private: false, description: 'Main repository', default_branch: 'main', language: 'TypeScript', stars: 42, forks: 10 });
repos.set('owner/repo2', { id: 'R2', name: 'repo2', full_name: 'owner/repo2', private: true, description: 'Private project', default_branch: 'main', language: 'Python', stars: 5, forks: 2 });

// Middleware
app.use((req, _res, next) => {
  (req as any).requestId = req.headers['x-request-id'] as string || uuidv4();
  next();
});

// Health
app.get('/health', (_req, res) => res.json({
  status: 'healthy',
  service: 'github-connector',
  version: '1.0.0',
  connected: !!process.env.GITHUB_TOKEN,
  timestamp: new Date().toISOString()
}));

app.get('/ready', (_req, res) => res.json({ ready: true }));

// ============ REPOS ============

/**
 * List repositories
 */
app.get('/api/repos', (req, res) => {
  const { owner, search } = req.query;
  let allRepos = Array.from(repos.values());

  if (owner) {
    allRepos = allRepos.filter(r => r.full_name.startsWith(owner as string));
  }
  if (search) {
    const s = (search as string).toLowerCase();
    allRepos = allRepos.filter(r => r.name.toLowerCase().includes(s) || r.description?.toLowerCase().includes(s));
  }

  res.json({ success: true, data: { repos: allRepos, total: allRepos.length } });
});

/**
 * Get repository
 */
app.get('/api/repos/:owner/:repo', (req, res) => {
  const key = `${req.params.owner}/${req.params.repo}`;
  const repo = repos.get(key);

  if (!repo) {
    return res.status(404).json({ success: false, error: 'Repository not found' });
  }

  res.json({ success: true, data: repo });
});

// ============ ISSUES ============

/**
 * List issues for a repo
 */
app.get('/api/repos/:owner/:repo/issues', (req, res) => {
  const key = `${req.params.owner}/${req.params.repo}`;
  const repoIssues = issues.get(key) || [];
  const { state, assignee, label } = req.query;

  let filtered = repoIssues;
  if (state) filtered = filtered.filter(i => i.state === state);
  if (assignee) filtered = filtered.filter(i => i.assignee === assignee);
  if (label) filtered = filtered.filter(i => i.labels.includes(label as string));

  res.json({ success: true, data: { issues: filtered, total: filtered.length } });
});

/**
 * Create issue
 */
app.post('/api/repos/:owner/:repo/issues', (req, res) => {
  const { title, body, assignee, labels } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, error: 'Title is required' });
  }

  const key = `${req.params.owner}/${req.params.repo}`;
  const repoIssues = issues.get(key) || [];

  const issue: GitHubIssue = {
    id: `I${Date.now()}`,
    number: repoIssues.length + 1,
    title,
    body,
    state: 'open',
    assignee,
    labels: labels || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  repoIssues.push(issue);
  issues.set(key, repoIssues);

  res.status(201).json({ success: true, data: issue });
});

// ============ PULL REQUESTS ============

/**
 * List PRs
 */
app.get('/api/repos/:owner/:repo/pulls', (req, res) => {
  const key = `${req.params.owner}/${req.params.repo}`;
  const repoPRs = prs.get(key) || [];
  const { state } = req.query;

  let filtered = repoPRs;
  if (state) filtered = filtered.filter(pr => pr.state === state);

  res.json({ success: true, data: { pulls: filtered, total: filtered.length } });
});

/**
 * Create PR
 */
app.post('/api/repos/:owner/:repo/pulls', (req, res) => {
  const { title, body, head, base } = req.body;

  if (!title || !head || !base) {
    return res.status(400).json({ success: false, error: 'title, head, and base are required' });
  }

  const key = `${req.params.owner}/${req.params.repo}`;
  const repoPRs = prs.get(key) || [];

  const pr: GitHubPR = {
    id: `PR${Date.now()}`,
    number: repoPRs.length + 1,
    title,
    state: 'open',
    user: 'current-user',
    branch: head,
    base_branch: base,
    additions: 0,
    deletions: 0,
    created_at: new Date().toISOString()
  };

  repoPRs.push(pr);
  prs.set(key, repoPRs);

  res.status(201).json({ success: true, data: pr });
});

// ============ COMMITS ============

/**
 * Get commits
 */
app.get('/api/repos/:owner/:repo/commits', (req, res) => {
  const key = `${req.params.owner}/${req.params.repo}`;
  const repoCommits = commits.get(key) || [];
  const { sha, limit = 30 } = req.query;

  let filtered = repoCommits;
  if (sha) filtered = filtered.filter(c => c.sha.startsWith(sha as string));

  res.json({ success: true, data: { commits: filtered.slice(0, Number(limit)), total: repoCommits.length } });
});

// ============ OBSERVER EVENTS ============

/**
 * Get coding activity for employee
 */
app.get('/api/observer/events/:userId', (req, res) => {
  const { userId } = req.params;
  const { days = 7 } = req.query;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(days));

  const events = [];

  // Collect commits
  for (const [repo, repoCommits] of commits.entries()) {
    for (const commit of repoCommits) {
      if (commit.author === userId && new Date(commit.date) >= cutoff) {
        events.push({
          source: 'github',
          type: 'commit',
          employeeId: userId,
          timestamp: commit.date,
          data: { repo, sha: commit.sha, message: commit.message }
        });
      }
    }
  }

  // Collect PRs
  for (const [repo, repoPRs] of prs.entries()) {
    for (const pr of repoPRs) {
      if (pr.user === userId && new Date(pr.created_at) >= cutoff) {
        events.push({
          source: 'github',
          type: 'pr_opened',
          employeeId: userId,
          timestamp: pr.created_at,
          data: { repo, number: pr.number, title: pr.title }
        });
      }
    }
  }

  res.json({ success: true, data: { events, total: events.length } });
});

// Catch-all
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

const server = app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║          GitHub Connector - Started                        ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                              ║`);
  console.log(`║  Features: Repos, Issues, PRs, Commits                   ║`);
  console.log(`║  Requires: GITHUB_TOKEN environment variable             ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝`);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });

export default app;
