// founder-os-product (4266) - Founder operating system.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const SERVICE = 'founder-os-product';
const PORT = parseInt(process.env.PORT || '4266', 10);

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const ok = (data) => ({ ok: true, ...data });
const fail = (msg) => ({ ok: false, error: msg });

const founders = new Map();   // fId -> { id, name, email, company, stage, created }
const goals = new Map();      // gId -> { id, founder_id, title, description, timeframe, status, created }
const okrs = new Map();       // oId -> { id, goal_id, objective, key_results[], progress_pct }
const todos = new Map();      // tId -> { id, founder_id, title, priority, due_date, status, related_goal_id, created }
const journals = new Map();   // jId -> { id, founder_id, title, body, mood, created }
const advisors = new Map();   // aId -> { id, founder_id, name, expertise, contact, notes }
const decisions = new Map();  // dId -> { id, founder_id, title, context, decision, reasoning, made_at }
const retros = new Map();     // rId -> { id, founder_id, period, went_well[], to_improve[], learnings[] }

// Seed
(function seed() {
  const fId = uuid();
  founders.set(fId, { id: fId, name: 'Jane Founder', email: 'jane@startup.example',
    company: 'E2E Startup', stage: 'seed', created: new Date().toISOString() });
  const gId = uuid();
  goals.set(gId, { id: gId, founder_id: fId, title: 'Reach product-market fit',
    description: 'Get to repeatable sales', timeframe: 'Q3-Q4 2026', status: 'in-progress', created: new Date().toISOString() });
  okrs.set(uuid(), { id: uuid(), goal_id: gId,
    objective: 'Achieve PMF signals',
    key_results: [
      { text: 'NPS > 50', progress: 75 },
      { text: '40% organic signup rate', progress: 60 },
      { text: '10 customer interviews/wk', progress: 100 }
    ], progress_pct: 78 });
  todos.set(uuid(), { id: uuid(), founder_id: fId, title: 'Review funnel metrics', priority: 'high',
    due_date: '2026-06-25', status: 'open', related_goal_id: gId, created: new Date().toISOString() });
  advisors.set(uuid(), { id: uuid(), founder_id: fId, name: 'Sam Mentor', expertise: 'product',
    contact: 'sam@example.com', notes: 'Bi-weekly calls' });
})();

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE, port: PORT,
  endpoints: ['/api/founders', '/api/goals', '/api/okrs', '/api/todos', '/api/journals', '/api/advisors', '/api/decisions', '/api/retros']
})));

// Founders
app.get('/api/founders', (_req, res) => res.json(ok({ founders: [...founders.values()] })));
app.post('/api/founders', (req, res) => {
  const { name, email, company, stage = 'idea' } = req.body || {};
  if (!name || !email) return res.status(400).json(fail('name + email required'));
  const id = uuid();
  const f = { id, name, email, company: company || null, stage, created: new Date().toISOString() };
  founders.set(id, f);
  res.status(201).json(ok({ founder: f }));
});

// Goals
app.get('/api/goals', (req, res) => {
  let list = [...goals.values()];
  if (req.query.founder_id) list = list.filter(g => g.founder_id === req.query.founder_id);
  if (req.query.status) list = list.filter(g => g.status === req.query.status);
  res.json(ok({ goals: list }));
});
app.post('/api/goals', (req, res) => {
  const { founder_id, title, description = '', timeframe, status = 'open' } = req.body || {};
  if (!founder_id || !title) return res.status(400).json(fail('founder_id + title required'));
  if (!founders.has(founder_id)) return res.status(400).json(fail('founder_id invalid'));
  const id = uuid();
  const g = { id, founder_id, title, description, timeframe: timeframe || null, status, created: new Date().toISOString() };
  goals.set(id, g);
  res.status(201).json(ok({ goal: g }));
});
app.patch('/api/goals/:id', (req, res) => {
  const g = goals.get(req.params.id);
  if (!g) return res.status(404).json(fail('goal not found'));
  ['title', 'description', 'timeframe', 'status'].forEach(k => { if (req.body[k] !== undefined) g[k] = req.body[k]; });
  goals.set(g.id, g);
  res.json(ok({ goal: g }));
});

// OKRs (linked to goal)
app.get('/api/okrs', (req, res) => {
  let list = [...okrs.values()];
  if (req.query.goal_id) list = list.filter(o => o.goal_id === req.query.goal_id);
  res.json(ok({ okrs: list }));
});
app.post('/api/okrs', (req, res) => {
  const { goal_id, objective, key_results = [] } = req.body || {};
  if (!goal_id || !objective) return res.status(400).json(fail('goal_id + objective required'));
  if (!goals.has(goal_id)) return res.status(400).json(fail('goal_id invalid'));
  const id = uuid();
  const krs = key_results.map(kr => ({ text: kr.text || '', progress: kr.progress || 0 }));
  const avg = krs.length ? krs.reduce((s, kr) => s + kr.progress, 0) / krs.length : 0;
  const o = { id, goal_id, objective, key_results: krs, progress_pct: +avg.toFixed(1) };
  okrs.set(id, o);
  res.status(201).json(ok({ okr: o }));
});

// Todos
app.get('/api/todos', (req, res) => {
  let list = [...todos.values()];
  if (req.query.founder_id) list = list.filter(t => t.founder_id === req.query.founder_id);
  if (req.query.status) list = list.filter(t => t.status === req.query.status);
  res.json(ok({ todos: list }));
});
app.post('/api/todos', (req, res) => {
  const { founder_id, title, priority = 'medium', due_date = null, related_goal_id = null } = req.body || {};
  if (!founder_id || !title) return res.status(400).json(fail('founder_id + title required'));
  if (!founders.has(founder_id)) return res.status(400).json(fail('founder_id invalid'));
  const id = uuid();
  const t = { id, founder_id, title, priority, due_date, related_goal_id, status: 'open', created: new Date().toISOString() };
  todos.set(id, t);
  res.status(201).json(ok({ todo: t }));
});
app.patch('/api/todos/:id', (req, res) => {
  const t = todos.get(req.params.id);
  if (!t) return res.status(404).json(fail('todo not found'));
  if (req.body.status) t.status = req.body.status;
  if (req.body.priority) t.priority = req.body.priority;
  todos.set(t.id, t);
  res.json(ok({ todo: t }));
});

// Journals
app.get('/api/journals', (req, res) => {
  let list = [...journals.values()];
  if (req.query.founder_id) list = list.filter(j => j.founder_id === req.query.founder_id);
  res.json(ok({ journals: list }));
});
app.post('/api/journals', (req, res) => {
  const { founder_id, title, body, mood = 'neutral' } = req.body || {};
  if (!founder_id || !body) return res.status(400).json(fail('founder_id + body required'));
  if (!founders.has(founder_id)) return res.status(400).json(fail('founder_id invalid'));
  const id = uuid();
  const j = { id, founder_id, title: title || 'Untitled', body, mood, created: new Date().toISOString() };
  journals.set(id, j);
  res.status(201).json(ok({ journal: j }));
});

// Advisors
app.get('/api/advisors', (req, res) => {
  let list = [...advisors.values()];
  if (req.query.founder_id) list = list.filter(a => a.founder_id === req.query.founder_id);
  res.json(ok({ advisors: list }));
});
app.post('/api/advisors', (req, res) => {
  const { founder_id, name, expertise, contact, notes = '' } = req.body || {};
  if (!founder_id || !name) return res.status(400).json(fail('founder_id + name required'));
  if (!founders.has(founder_id)) return res.status(400).json(fail('founder_id invalid'));
  const id = uuid();
  const a = { id, founder_id, name, expertise: expertise || 'general', contact: contact || null, notes };
  advisors.set(id, a);
  res.status(201).json(ok({ advisor: a }));
});

// Decisions (decision log)
app.get('/api/decisions', (req, res) => {
  let list = [...decisions.values()];
  if (req.query.founder_id) list = list.filter(d => d.founder_id === req.query.founder_id);
  res.json(ok({ decisions: list }));
});
app.post('/api/decisions', (req, res) => {
  const { founder_id, title, context, decision, reasoning } = req.body || {};
  if (!founder_id || !title || !decision) return res.status(400).json(fail('founder_id + title + decision required'));
  if (!founders.has(founder_id)) return res.status(400).json(fail('founder_id invalid'));
  const id = uuid();
  const d = { id, founder_id, title, context: context || '', decision, reasoning: reasoning || '', made_at: new Date().toISOString() };
  decisions.set(id, d);
  res.status(201).json(ok({ decision: d }));
});

// Retrospectives
app.get('/api/retros', (req, res) => {
  let list = [...retros.values()];
  if (req.query.founder_id) list = list.filter(r => r.founder_id === req.query.founder_id);
  res.json(ok({ retros: list }));
});
app.post('/api/retros', (req, res) => {
  const { founder_id, period, went_well = [], to_improve = [], learnings = [] } = req.body || {};
  if (!founder_id || !period) return res.status(400).json(fail('founder_id + period required'));
  if (!founders.has(founder_id)) return res.status(400).json(fail('founder_id invalid'));
  const id = uuid();
  const r = { id, founder_id, period, went_well, to_improve, learnings, created: new Date().toISOString() };
  retros.set(id, r);
  res.status(201).json(ok({ retro: r }));
});

app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));
