/**
 * GoalOS — Persistent Objectives (Phase 13 of the 40-phase plan).
 *
 * Tracks OKRs / goals with key results.
 * v0.1: CRUD, decompose (goal → key results), progress tracking.
 * v0.2 will back this with PostgreSQL.
 *
 * Port: 4297
 * Auth: none on GET, Bearer on POST/PATCH/DELETE
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

const PORT = Number(process.env.PORT || 4297);
const REQUIRE_AUTH = process.env.HOJAI_GOALOS_REQUIRE_AUTH !== 'false';
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

function requireAuth(req, res, next) {
  if (!REQUIRE_AUTH) return next();
  const key = req.headers.authorization?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── In-memory store ─────────────────────────────────────

const goals = new Map();

function computeProgress(goal) {
  if (!goal.keyResults?.length) return 0;
  const sum = goal.keyResults.reduce((s, kr) => s + (kr.value || 0), 0);
  return Math.round(sum / goal.keyResults.length);
}

// ── Health ──────────────────────────────────────────────

app.get('/api/v1/health', (_req, res) => res.json({
  status: 'ok', service: 'goalos', version: '0.1.0', port: PORT, goals: goals.size
}));

// ── Goals CRUD ─────────────────────────────────────────

app.get('/api/v1/goals', (req, res) => {
  let items = [...goals.values()];
  const { status, owner, limit = 50 } = req.query;
  if (status) items = items.filter(g => g.status === status);
  if (owner) items = items.filter(g => g.owner === owner);
  const items2 = items.slice(0, Number(limit));
  res.json({ items: items2.map(g => ({ ...g, progress: computeProgress(g) })), total: items.length });
});

app.post('/api/v1/goals', requireAuth, (req, res) => {
  const { title, description, owner, dueDate, status = 'in-progress', keyResults = [] } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title is required' });
  const id = `g-${randomUUID().slice(0, 8)}`;
  const goal = {
    id, title, description: description || '',
    owner: owner || 'unassigned', status,
    dueDate: dueDate || null,
    createdAt: new Date().toISOString(),
    keyResults: keyResults.map((kr, i) => ({
      id: `kr-${id}-${i}`,
      text: typeof kr === 'string' ? kr : (kr.text || `KR ${i + 1}`),
      done: false, value: 0
    }))
  };
  goals.set(id, goal);
  res.status(201).json({ ...goal, progress: computeProgress(goal) });
});

app.get('/api/v1/goals/:id', (req, res) => {
  const g = goals.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'goal not found' });
  res.json({ ...g, progress: computeProgress(g) });
});

app.patch('/api/v1/goals/:id', requireAuth, (req, res) => {
  const g = goals.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'goal not found' });
  const { title, description, status, dueDate, owner } = req.body || {};
  if (title !== undefined) g.title = title;
  if (description !== undefined) g.description = description;
  if (status !== undefined) g.status = status;
  if (dueDate !== undefined) g.dueDate = dueDate;
  if (owner !== undefined) g.owner = owner;
  res.json({ ...g, progress: computeProgress(g) });
});

app.delete('/api/v1/goals/:id', requireAuth, (req, res) => {
  if (!goals.has(req.params.id)) return res.status(404).json({ error: 'goal not found' });
  goals.delete(req.params.id);
  res.json({ deleted: true, id: req.params.id });
});

// ── Decompose ─────────────────────────────────────────

/**
 * Auto-decompose a goal into 3-5 key results.
 * v0.1 uses keyword heuristics; v0.2 will use an LLM.
 */
app.post('/api/v1/goals/:id/decompose', requireAuth, (req, res) => {
  const g = goals.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'goal not found' });
  const text = `${g.title} ${g.description || ''}`.toLowerCase();
  const krTemplates = [];
  if (/(launch|ship|release|publish|deploy)/.test(text)) {
    krTemplates.push('Final release cut with all features merged and tested');
    krTemplates.push('Deployed to at least 5 production users');
  }
  if (/(revenue|gmv|sales|monetiz)/.test(text)) {
    krTemplates.push('Quarterly revenue target met');
    krTemplates.push('Customer acquisition cost below benchmark');
  }
  if (/(user|active|customer|signup)/.test(text)) {
    krTemplates.push('Monthly active users target met');
    krTemplates.push('Activation rate above 60%');
  }
  if (/(team|hiring|engineer)/.test(text)) {
    krTemplates.push('Core engineering team fully staffed');
  }
  if (/(market|federat|nexha|partner)/.test(text)) {
    krTemplates.push('Partnership agreements signed with target count');
    krTemplates.push('First revenue from new market');
  }
  if (krTemplates.length === 0) {
    krTemplates.push('Achieve primary objective as defined in title');
    krTemplates.push('Measure baseline and demonstrate measurable improvement');
    krTemplates.push('Report progress to stakeholders');
  }
  g.keyResults = krTemplates.slice(0, 5).map((text, i) => ({
    id: `kr-${g.id}-auto-${i}`, text, done: false, value: 0
  }));
  res.json({ ...g, progress: computeProgress(g), decomposed: true });
});

// ── Key Result progress ────────────────────────────────

app.post('/api/v1/goals/:id/key-results/:krId/progress', requireAuth, (req, res) => {
  const g = goals.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'goal not found' });
  const kr = g.keyResults.find(k => k.id === req.params.krId);
  if (!kr) return res.status(404).json({ error: 'key result not found' });
  const { value } = req.body || {};
  if (value == null) return res.status(400).json({ error: 'value is required' });
  kr.value = Math.max(0, Math.min(100, Number(value)));
  if (kr.value >= 100) kr.done = true;
  res.json({ ...g, progress: computeProgress(g) });
});

// ── Start ─────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log(`[goalos] listening on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });

export default app;
