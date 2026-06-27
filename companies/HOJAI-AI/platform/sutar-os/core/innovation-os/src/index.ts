/**
 * Innovation OS - Production Implementation
 * Ideas, pilots, R&D tracking, innovation pipeline
 * Port: 4865
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4865;
const START_TIME = Date.now();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Types
interface Idea {
  id: string;
  title: string;
  description: string;
  category: 'product' | 'process' | 'technology' | 'marketing' | 'operations';
  status: 'idea' | 'under_review' | 'approved' | 'pilot' | 'scale' | 'deployed' | 'archived' | 'rejected';
  impact: number;
  effort: number;
  roi: number;
  submittedBy: string;
  votes: { userId: string; vote: number; comment?: string }[];
  comments: { id: string; userId: string; text: string; createdAt: string }[];
  pilotMetrics?: { users: number; revenue: number; satisfaction: number };
  timeline: { stage: string; date: string; notes?: string }[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface InnovationGoal {
  id: string;
  title: string;
  target: number;
  current: number;
  metric: string;
  deadline: string;
}

// In-memory store
const ideas = new Map<string, Idea>();
const goals = new Map<string, InnovationGoal>();
const categories = ['product', 'process', 'technology', 'marketing', 'operations'];

// Validation
const CreateIdeaSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(10),
  category: z.enum(['product', 'process', 'technology', 'marketing', 'operations']),
  submittedBy: z.string(),
  tags: z.array(z.string()).optional(),
});

// Health
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'innovation-os', uptime: Math.floor((Date.now() - START_TIME) / 1000), ideas: ideas.size });
});

app.get('/ready', (_req: Request, res: Response) => {
  res.json({ ready: true });
});

// List ideas
app.get('/api/ideas', (req: Request, res: Response) => {
  const { status, category, submittedBy, sort = 'votes', limit = 50 } = req.query;

  let result = Array.from(ideas.values());

  if (status) result = result.filter(i => i.status === status);
  if (category) result = result.filter(i => i.category === category);
  if (submittedBy) result = result.filter(i => i.submittedBy === submittedBy);

  // Sort
  if (sort === 'votes') result.sort((a, b) => b.votes.reduce((s, v) => s + v.vote, 0) - a.votes.reduce((s, v) => s + v.vote, 0));
  else if (sort === 'impact') result.sort((a, b) => b.impact - a.impact);
  else if (sort === 'roi') result.sort((a, b) => b.roi - a.roi);
  else if (sort === 'newest') result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ total: result.length, ideas: result.slice(0, Number(limit)) });
});

// Get idea
app.get('/api/ideas/:id', (req: Request, res: Response) => {
  const idea = ideas.get(req.params.id);
  if (!idea) return res.status(404).json({ error: 'Idea not found' });
  res.json(idea);
});

// Create idea
app.post('/api/ideas', (req: Request, res: Response) => {
  try {
    const data = CreateIdeaSchema.parse(req.body);
    const id = uuidv4();
    const now = new Date().toISOString();

    const idea: Idea = {
      id, title: data.title, description: data.description, category: data.category,
      status: 'under_review', impact: 0, effort: 0, roi: 0,
      submittedBy: data.submittedBy, votes: [], comments: [],
      tags: data.tags || [],
      timeline: [{ stage: 'submitted', date: now }],
      createdAt: now, updatedAt: now,
    };

    ideas.set(id, idea);
    res.status(201).json(idea);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues });
    res.status(500).json({ error: err.message });
  }
});

// Update idea
app.put('/api/ideas/:id', (req: Request, res: Response) => {
  const idea = ideas.get(req.params.id);
  if (!idea) return res.status(404).json({ error: 'Idea not found' });

  const { title, description, category, status, impact, effort, roi, tags } = req.body;

  if (title) idea.title = title;
  if (description) idea.description = description;
  if (category) idea.category = category;
  if (impact) idea.impact = impact;
  if (effort) idea.effort = effort;
  if (roi) idea.roi = roi;
  if (tags) idea.tags = tags;

  if (status && status !== idea.status) {
    idea.status = status;
    idea.timeline.push({ stage: status, date: new Date().toISOString() });
  }

  idea.updatedAt = new Date().toISOString();
  res.json(idea);
});

// Vote on idea
app.post('/api/ideas/:id/vote', (req: Request, res: Response) => {
  const idea = ideas.get(req.params.id);
  if (!idea) return res.status(404).json({ error: 'Idea not found' });

  const { userId, vote, comment } = req.body;
  if (!userId || vote === undefined) return res.status(400).json({ error: 'userId and vote required' });

  const existingVote = idea.votes.findIndex(v => v.userId === userId);
  if (existingVote >= 0) {
    idea.votes[existingVote].vote = vote;
    if (comment) idea.votes[existingVote].comment = comment;
  } else {
    idea.votes.push({ userId, vote, comment });
  }

  idea.updatedAt = new Date().toISOString();
  res.json({ totalVotes: idea.votes.reduce((s, v) => s + v.vote, 0), voteCount: idea.votes.length });
});

// Comment on idea
app.post('/api/ideas/:id/comments', (req: Request, res: Response) => {
  const idea = ideas.get(req.params.id);
  if (!idea) return res.status(404).json({ error: 'Idea not found' });

  const { userId, text } = req.body;
  if (!userId || !text) return res.status(400).json({ error: 'userId and text required' });

  const comment = { id: uuidv4(), userId, text, createdAt: new Date().toISOString() };
  idea.comments.push(comment);
  idea.updatedAt = new Date().toISOString();
  res.status(201).json(comment);
});

// Update pilot metrics
app.put('/api/ideas/:id/pilot', (req: Request, res: Response) => {
  const idea = ideas.get(req.params.id);
  if (!idea) return res.status(404).json({ error: 'Idea not found' });
  if (idea.status !== 'pilot') return res.status(400).json({ error: 'Idea must be in pilot status' });

  const { users, revenue, satisfaction } = req.body;
  idea.pilotMetrics = { users: users || 0, revenue: revenue || 0, satisfaction: satisfaction || 0 };
  idea.updatedAt = new Date().toISOString();
  res.json(idea);
});

// Goals
app.get('/api/goals', (_req: Request, res: Response) => {
  res.json({ goals: Array.from(goals.values()) });
});

app.post('/api/goals', (req: Request, res: Response) => {
  const { title, target, metric, deadline } = req.body;
  if (!title || !target || !metric) return res.status(400).json({ error: 'title, target, metric required' });

  const goal: InnovationGoal = { id: uuidv4(), title, target, current: 0, metric, deadline: deadline || '' };
  goals.set(goal.id, goal);
  res.status(201).json(goal);
});

app.put('/api/goals/:id', (req: Request, res: Response) => {
  const goal = goals.get(req.params.id);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });

  const { current, target } = req.body;
  if (current !== undefined) goal.current = current;
  if (target !== undefined) goal.target = target;
  res.json(goal);
});

// Leaderboard
app.get('/api/leaderboard', (req: Request, res: Response) => {
  const { category, limit = 10 } = req.query;

  let result = Array.from(ideas.values());
  if (category) result = result.filter(i => i.category === category);

  result.sort((a, b) => {
    const scoreA = a.votes.reduce((s, v) => s + v.vote, 0) + a.impact * 10 + a.roi;
    const scoreB = b.votes.reduce((s, v) => s + v.vote, 0) + b.impact * 10 + b.roi;
    return scoreB - scoreA;
  });

  res.json({
    leaderboard: result.slice(0, Number(limit)).map((idea, i) => ({
      rank: i + 1,
      id: idea.id,
      title: idea.title,
      score: idea.votes.reduce((s, v) => s + v.vote, 0) + idea.impact * 10 + idea.roi,
      votes: idea.votes.reduce((s, v) => s + v.vote, 0),
      impact: idea.impact,
      status: idea.status,
    })),
  });
});

// Statistics
app.get('/api/stats', (_req: Request, res: Response) => {
  const all = Array.from(ideas.values());

  res.json({
    total: all.length,
    byStatus: {
      ideas: all.filter(i => i.status === 'idea' || i.status === 'under_review').length,
      approved: all.filter(i => i.status === 'approved').length,
      pilot: all.filter(i => i.status === 'pilot').length,
      scale: all.filter(i => i.status === 'scale' || i.status === 'deployed').length,
    },
    byCategory: categories.reduce((acc, cat) => ({ ...acc, [cat]: all.filter(i => i.category === cat).length }), {}),
    topVoted: all.sort((a, b) => b.votes.reduce((s, v) => s + v.vote, 0) - a.votes.reduce((s, v) => s + v.vote, 0))[0]?.title || 'N/A',
    avgImpact: all.length > 0 ? Math.round(all.reduce((s, i) => s + i.impact, 0) / all.length) : 0,
  });
});

app.use((err: any, _req: Request, res: Response, _next: unknown) => {
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => console.log(`[innovation-os] listening on :${PORT}`));
export default app;
